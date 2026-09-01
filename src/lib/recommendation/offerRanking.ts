// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — orchestrateur (récupération des données + classement)
//
// À partir d'un EAN + d'une quantité + de la localisation de l'acheteur, on
//   1. récupère toutes les offres éligibles (produits actifs de cet EAN) ;
//   2. calcule les données réelles nécessaires à chaque critère, en RÉUTILISANT
//      les mécanismes existants de la plateforme :
//        • prix selon quantité   → getEffectiveUnitPrice()  (cartOptimizer)
//        • frais de livraison     → computeDeliveryFee()      (cartOptimizer)
//        • qualité fournisseur    → seller_profiles.avg_rating + certifications
//        • fraîcheur              → product_lots.expiry_date
//        • proximité              → organisations.city / region / country
//   3. récupère les poids configurés par l'admin (platform_settings) ;
//   4. délègue le calcul du score final à scoreOffers() (pur) ;
//   5. renvoie les offres classées par score décroissant + le détail du calcul.
//
// Performances (§16) : la récupération (`fetchOfferRankingDataset`) est séparée
// du classement (`rankOfferDataset`, sans réseau). L'UI charge les données UNE
// fois par recherche puis re-classe localement à chaque changement de quantité.
// Toutes les tables annexes sont chargées en lot (`.in(...)`) — 6 requêtes au
// total, indépendantes du nombre d'offres.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabase';
import {
  computeDeliveryFee,
  fetchDeliveryConfigs,
  getEffectiveUnitPrice,
  type DeliveryConfig,
} from '../cartOptimizer';
import { calculateProximityDistance, type GeoLocation } from './proximity';
import { calculateSupplierQualityScore } from './supplierQuality';
import { freshnessDaysFromLots } from './freshness';
import { scoreOffers, type OfferScoreBreakdown, type RankableOffer } from './scoring';
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  PLATFORM_SETTINGS_WEIGHT_COLUMNS,
  weightsFromPlatformSettings,
  type RecommendationWeights,
} from './weights';

// ── Types publics ───────────────────────────────────────────────────────────

export interface PriceTierLite {
  qty_min: number;
  unit_price: number;
}

/** Données d'affichage d'une offre, transportées jusqu'au résultat classé. */
export interface OfferData {
  productId: string;
  ean: string | null;
  productName: string;
  sellerId: string;
  sellerName: string;
  sellerCity: string | null;
  sellerRegion: string | null;
  moq: number;
  estimatedLeadDays: number;
  priceTiers: PriceTierLite[];
  /** Note fournisseur affichable (0–5) : seller_profiles.avg_rating. */
  sellerRating: number;
  sellerReviewCount: number;
  certificationCount: number;
  /** Prix unitaire réellement applicable à la quantité demandée (MAD). */
  unitPrice: number;
  /** unitPrice × quantité. */
  lineSubtotal: number;
  /** Frais de livraison réellement applicables à cette commande (MAD). */
  deliveryCost: number;
  isFreeDelivery: boolean;
  /** Coût total estimé (produits + livraison). */
  landedTotal: number;
  /** Jours avant péremption du lot le plus proche (null = inconnu). */
  freshnessDays: number | null;
  /** Rang de proximité 0–3 (null = indéterminable). */
  proximityRank: number | null;
}

export interface RankedOffer {
  rank: number; // 1 = meilleure offre
  offer: OfferData;
  /** Détail transparent du calcul (scores normalisés, poids, score final). */
  breakdown: OfferScoreBreakdown<OfferData>;
}

export interface RankOffersResult {
  ean: string;
  quantity: number;
  weights: RecommendationWeights;
  ranked: RankedOffer[];
}

export interface RankParams {
  quantity: number;
  /** Localisation de l'acheteur (activeOrg) — pour le critère proximité. */
  buyerLocation?: GeoLocation | null;
  /** Poids à utiliser ; défaut = ceux du dataset (lus depuis platform_settings). */
  weights?: RecommendationWeights;
  /** Injection de l'horloge (tests). */
  now?: Date;
}

// ── Dataset brut (résultat de la phase "récupération") ───────────────────────

interface RawProduct {
  id: string;
  name: string;
  ean: string | null;
  seller_org_id: string;
  moq: number | null;
  estimated_lead_days: number | null;
  avg_rating: number | null;
  review_count: number | null;
  certifications: string[] | null;
  price_tiers: PriceTierLite[] | null;
}

interface SellerOrgInfo {
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
}

interface SellerProfileInfo {
  avgRating: number;
  reviewCount: number;
  certs: string[];
}

interface LotInfo {
  expiry_date: string | null;
  qty_available: number | null;
  active: boolean | null;
}

export interface OfferRankingDataset {
  ean: string;
  products: RawProduct[];
  orgMap: Map<string, SellerOrgInfo>;
  profileMap: Map<string, SellerProfileInfo>;
  deliveryConfigs: Map<string, DeliveryConfig>;
  lotsByProduct: Map<string, LotInfo[]>;
  /** Poids lus depuis platform_settings au moment de la récupération. */
  weights: RecommendationWeights;
}

// ── Lecture des poids configurés (platform_settings) ─────────────────────────

export async function fetchRecommendationWeights(): Promise<RecommendationWeights> {
  const cols = Object.values(PLATFORM_SETTINGS_WEIGHT_COLUMNS).join(', ');
  const { data, error } = await supabase
    .from('platform_settings')
    .select(cols)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_RECOMMENDATION_WEIGHTS };
  return weightsFromPlatformSettings(data as unknown as Record<string, unknown>);
}

// ── Phase 1 — récupération (réseau) ─────────────────────────────────────────

export async function fetchOfferRankingDataset(
  ean: string,
): Promise<OfferRankingDataset> {
  const empty: OfferRankingDataset = {
    ean,
    products: [],
    orgMap: new Map(),
    profileMap: new Map(),
    deliveryConfigs: new Map(),
    lotsByProduct: new Map(),
    weights: { ...DEFAULT_RECOMMENDATION_WEIGHTS },
  };

  const [{ data: productsRaw }, weights] = await Promise.all([
    supabase
      .from('products')
      .select(
        `id, name, ean, seller_org_id, moq, estimated_lead_days,
         avg_rating, review_count, certifications,
         price_tiers (qty_min, unit_price)`,
      )
      .eq('ean', ean)
      .eq('status', 'active'),
    fetchRecommendationWeights(),
  ]);

  const products = (productsRaw ?? []) as RawProduct[];
  empty.weights = weights;
  if (products.length === 0) return empty;

  const sellerIds = [...new Set(products.map((p) => p.seller_org_id))];
  const productIds = products.map((p) => p.id);

  const [sellerOrgs, sellerProfiles, deliveryConfigs, lots] = await Promise.all([
    supabase
      .from('organisations')
      .select('id, name, city, region, country')
      .in('id', sellerIds),
    supabase
      .from('seller_profiles')
      .select('organisation_id, avg_rating, review_count, certifications')
      .in('organisation_id', sellerIds),
    fetchDeliveryConfigs(sellerIds),
    supabase
      .from('product_lots')
      .select('product_id, expiry_date, qty_available, active')
      .in('product_id', productIds),
  ]);

  const orgMap = new Map<string, SellerOrgInfo>();
  for (const o of (sellerOrgs.data ?? []) as Array<Record<string, unknown>>) {
    orgMap.set(o.id as string, {
      name: (o.name as string) ?? '—',
      city: (o.city as string) ?? null,
      region: (o.region as string) ?? null,
      country: (o.country as string) ?? null,
    });
  }

  const profileMap = new Map<string, SellerProfileInfo>();
  for (const p of (sellerProfiles.data ?? []) as Array<Record<string, unknown>>) {
    profileMap.set(p.organisation_id as string, {
      avgRating: Number(p.avg_rating ?? 0) || 0,
      reviewCount: Number(p.review_count ?? 0) || 0,
      certs: (p.certifications as string[]) ?? [],
    });
  }

  const lotsByProduct = new Map<string, LotInfo[]>();
  for (const l of (lots.data ?? []) as Array<Record<string, unknown>>) {
    const key = l.product_id as string;
    if (!lotsByProduct.has(key)) lotsByProduct.set(key, []);
    lotsByProduct.get(key)!.push({
      expiry_date: (l.expiry_date as string) ?? null,
      qty_available: (l.qty_available as number) ?? null,
      active: (l.active as boolean) ?? null,
    });
  }

  return { ean, products, orgMap, profileMap, deliveryConfigs, lotsByProduct, weights };
}

// ── Phase 2 — classement (pur, sans réseau) ────────────────────────────────

export function rankOfferDataset(
  ds: OfferRankingDataset,
  params: RankParams,
): RankOffersResult {
  const now = params.now ?? new Date();
  const quantity = Math.max(1, Math.floor(params.quantity || 1));
  const weights = params.weights ?? ds.weights;
  const buyerLocation = params.buyerLocation ?? null;

  const rankable: RankableOffer<OfferData>[] = [];

  for (const p of ds.products) {
    const tiers = (p.price_tiers ?? []).slice();
    const unitPrice = getEffectiveUnitPrice(tiers, quantity);
    if (!(unitPrice > 0)) continue; // pas de prix exploitable → offre non éligible

    const lineSubtotal = unitPrice * quantity;
    const cfg = ds.deliveryConfigs.get(p.seller_org_id) ?? null;
    const deliveryCost = computeDeliveryFee(cfg, lineSubtotal);

    const org = ds.orgMap.get(p.seller_org_id) ?? null;
    const profile = ds.profileMap.get(p.seller_org_id) ?? null;

    // Qualité fournisseur : note vendeur (seller_profiles) + certifications ;
    // à défaut de profil vendeur on retombe sur les données produit.
    const certCount = (profile?.certs.length ?? 0) || (p.certifications?.length ?? 0);
    const supplierQuality = calculateSupplierQualityScore({
      avgRating: profile?.avgRating ?? p.avg_rating,
      reviewCount: profile?.reviewCount ?? p.review_count,
      certificationCount: certCount,
    });

    const freshnessDays = freshnessDaysFromLots(ds.lotsByProduct.get(p.id), now);

    const proximityRank = calculateProximityDistance(
      buyerLocation,
      org ? { city: org.city, region: org.region, country: org.country } : null,
    );

    const offer: OfferData = {
      productId: p.id,
      ean: p.ean,
      productName: p.name,
      sellerId: p.seller_org_id,
      sellerName: org?.name ?? '—',
      sellerCity: org?.city ?? null,
      sellerRegion: org?.region ?? null,
      moq: p.moq ?? 1,
      estimatedLeadDays: p.estimated_lead_days ?? 3,
      priceTiers: tiers,
      sellerRating: profile?.avgRating ?? (Number(p.avg_rating ?? 0) || 0),
      sellerReviewCount:
        profile?.reviewCount ?? (Number(p.review_count ?? 0) || 0),
      certificationCount: certCount,
      unitPrice,
      lineSubtotal,
      deliveryCost,
      isFreeDelivery: deliveryCost === 0,
      landedTotal: lineSubtotal + deliveryCost,
      freshnessDays,
      proximityRank,
    };

    rankable.push({
      id: p.id,
      values: {
        price: unitPrice,
        delivery: deliveryCost,
        supplierQuality,
        freshness: freshnessDays,
        proximity: proximityRank,
      },
      payload: offer,
    });
  }

  const breakdowns = scoreOffers(rankable, weights);
  const ranked: RankedOffer[] = breakdowns.map((b, i) => ({
    rank: i + 1,
    offer: b.payload,
    breakdown: b,
  }));

  return { ean: ds.ean, quantity, weights, ranked };
}

// ── Convenience — récupération + classement en un appel ─────────────────────

export interface RankProductOffersParams extends RankParams {
  ean: string;
}

export async function rankProductOffers(
  params: RankProductOffersParams,
): Promise<RankOffersResult> {
  const ds = await fetchOfferRankingDataset(params.ean);
  return rankOfferDataset(ds, params);
}

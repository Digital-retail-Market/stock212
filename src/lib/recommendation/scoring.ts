// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — normalisation des critères + score global multi-critères
//
// Coeur de l'algorithme, 100 % pur (aucune dépendance Supabase / réseau) afin
// d'être testable unitairement.
//
// Principe :
//  1. chaque critère brut (prix MAD, jours, note…) est normalisé sur [0, 1]
//     PAR RAPPORT AU GROUPE d'offres comparé (même produit / même recherche) ;
//  2. le score final = Σ (scoreNormalisé_i × poids_i) où les poids sont exprimés
//     en pourcentage et somment à 100 → le score final est directement sur 0–100.
// ─────────────────────────────────────────────────────────────────────────────

import {
  normalizeWeightsToFractions,
  type RecommendationCriterion,
  type RecommendationWeights,
} from './weights';

/** Sens de préférence d'un critère. */
export type CriterionDirection = 'lower_is_better' | 'higher_is_better';

export const CRITERION_DIRECTION: Record<RecommendationCriterion, CriterionDirection> = {
  price: 'lower_is_better',
  delivery: 'lower_is_better',
  supplierQuality: 'higher_is_better',
  freshness: 'higher_is_better',
  proximity: 'lower_is_better', // valeur = distance / rang de proximité
};

/**
 * Valeurs BRUTES d'une offre pour les 5 critères.
 * `null` = donnée indisponible pour cette offre (ex. aucun lot avec date de
 * péremption, localisation acheteur ou vendeur inconnue). Voir la règle de
 * traitement des valeurs manquantes plus bas.
 */
export interface OfferCriteriaValues {
  /** Prix unitaire réellement applicable à la quantité demandée (MAD). */
  price: number;
  /** Coût de livraison réellement applicable à la commande (MAD). */
  delivery: number;
  /** Score qualité fournisseur (échelle libre, "plus haut = mieux"). */
  supplierQuality: number;
  /** Nombre de jours restants avant péremption du lot proposé. */
  freshness: number | null;
  /** Distance / rang de proximité ("plus bas = mieux"). */
  proximity: number | null;
}

export interface RankableOffer<T = unknown> {
  id: string;
  values: OfferCriteriaValues;
  /** Charge utile transportée telle quelle jusqu'au résultat (offre d'origine). */
  payload: T;
}

export interface OfferScoreBreakdown<T = unknown> {
  offerId: string;
  /** Scores normalisés sur [0, 1] par critère (transparence / debug). */
  scores: Record<RecommendationCriterion, number>;
  /** Poids effectivement appliqués, en pourcentage (recopie de la config admin). */
  weights: RecommendationWeights;
  /** Score global sur 0–100 (décroissant = meilleur classement). */
  finalScore: number;
  payload: T;
}

// ── Constantes de traitement des cas limites ─────────────────────────────────

/**
 * Score attribué quand un critère NE PERMET PAS de départager les offres :
 * soit toutes les offres ont exactement la même valeur, soit il n'y a qu'une
 * seule offre. Dans ce cas on ne peut pas (et il ne faut pas) pénaliser :
 * on évite la division par zéro et on donne la note maximale à tout le monde
 * (règle explicite du document fonctionnel §5).
 */
export const SCORE_WHEN_INDISTINGUISHABLE = 1;

/**
 * Score attribué à une offre dont la valeur du critère est INCONNUE (`null`)
 * alors que d'autres offres du groupe ont, elles, une valeur.
 * Choix : score neutre 0,5 → l'offre n'est ni récompensée ni pénalisée pour
 * une donnée absente (cohérent avec §10 : une offre ne doit jamais être exclue,
 * et avec §19 : stratégie de repli explicite). La valeur manquante est par
 * ailleurs exclue du calcul du min / max du groupe.
 */
export const SCORE_WHEN_MISSING = 0.5;

/**
 * Normalise une liste de valeurs brutes sur [0, 1] selon le sens du critère.
 *
 * - `lower_is_better` : score = (max − v) / (max − min)
 * - `higher_is_better` : score = (v − min) / (max − min)
 * - min / max calculés uniquement sur les valeurs NON nulles ;
 * - valeur `null` → `SCORE_WHEN_MISSING` ;
 * - max === min (ou 0/1 valeur exploitable) → `SCORE_WHEN_INDISTINGUISHABLE`
 *   pour toutes les offres (pas de division par zéro).
 *
 * Retourne un tableau de la même longueur / dans le même ordre que `values`.
 */
export function normalizeValues(
  values: Array<number | null>,
  direction: CriterionDirection,
): number[] {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v));

  if (present.length <= 1) {
    // 0 ou 1 valeur exploitable → critère non discriminant.
    return values.map((v) =>
      v == null || !Number.isFinite(v) ? SCORE_WHEN_MISSING : SCORE_WHEN_INDISTINGUISHABLE,
    );
  }

  const min = Math.min(...present);
  const max = Math.max(...present);
  const span = max - min;

  if (span === 0) {
    // Toutes les offres identiques sur ce critère → note max pour tout le monde.
    return values.map((v) =>
      v == null || !Number.isFinite(v) ? SCORE_WHEN_MISSING : SCORE_WHEN_INDISTINGUISHABLE,
    );
  }

  return values.map((v) => {
    if (v == null || !Number.isFinite(v)) return SCORE_WHEN_MISSING;
    const score = direction === 'lower_is_better' ? (max - v) / span : (v - min) / span;
    // Clamp défensif (les valeurs manquantes exclues du min/max ne peuvent pas
    // sortir de [0,1], mais on protège contre toute imprécision flottante).
    return clamp01(score);
  });
}

/**
 * Calcule le score global de chaque offre et renvoie la liste TRIÉE par score
 * final décroissant (meilleure offre en tête).
 *
 * @param offers   offres à classer (au moins 1).
 * @param weights  poids en pourcentage issus de la config admin (somme ≈ 100).
 */
export function scoreOffers<T>(
  offers: RankableOffer<T>[],
  weights: RecommendationWeights,
): OfferScoreBreakdown<T>[] {
  if (offers.length === 0) return [];

  const fractions = normalizeWeightsToFractions(weights);

  // Normalisation critère par critère, sur l'ensemble du groupe.
  const perCriterionScores: Record<RecommendationCriterion, number[]> = {
    price: normalizeValues(
      offers.map((o) => o.values.price),
      CRITERION_DIRECTION.price,
    ),
    delivery: normalizeValues(
      offers.map((o) => o.values.delivery),
      CRITERION_DIRECTION.delivery,
    ),
    supplierQuality: normalizeValues(
      offers.map((o) => o.values.supplierQuality),
      CRITERION_DIRECTION.supplierQuality,
    ),
    freshness: normalizeValues(
      offers.map((o) => o.values.freshness),
      CRITERION_DIRECTION.freshness,
    ),
    proximity: normalizeValues(
      offers.map((o) => o.values.proximity),
      CRITERION_DIRECTION.proximity,
    ),
  };

  const breakdowns: OfferScoreBreakdown<T>[] = offers.map((offer, i) => {
    const scores: Record<RecommendationCriterion, number> = {
      price: perCriterionScores.price[i],
      delivery: perCriterionScores.delivery[i],
      supplierQuality: perCriterionScores.supplierQuality[i],
      freshness: perCriterionScores.freshness[i],
      proximity: perCriterionScores.proximity[i],
    };

    // Σ scoreNormalisé × fraction de poids → [0, 1], puis ×100 pour l'affichage.
    const finalScore =
      100 *
      (scores.price * fractions.price +
        scores.delivery * fractions.delivery +
        scores.supplierQuality * fractions.supplierQuality +
        scores.freshness * fractions.freshness +
        scores.proximity * fractions.proximity);

    return {
      offerId: offer.id,
      scores,
      weights: { ...weights },
      finalScore: round2(finalScore),
      payload: offer.payload,
    };
  });

  // Tri stable : score final décroissant, puis prix croissant, puis id (déterministe).
  return breakdowns.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    const pa = offerPriceById(offers, a.offerId);
    const pb = offerPriceById(offers, b.offerId);
    if (pa !== pb) return pa - pb;
    return a.offerId < b.offerId ? -1 : a.offerId > b.offerId ? 1 : 0;
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function offerPriceById<T>(offers: RankableOffer<T>[], id: string): number {
  const o = offers.find((x) => x.id === id);
  return o ? o.values.price : Number.POSITIVE_INFINITY;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

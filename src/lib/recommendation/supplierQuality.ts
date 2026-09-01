// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — critère « Qualité du fournisseur »
//
// Le document fonctionnel (§9) demande de combiner :
//   • la note moyenne donnée par les acheteurs ;
//   • les certifications du fournisseur.
//
// Données réutilisées (aucune donnée inventée) :
//   • seller_profiles.avg_rating   (0–5, agrégat des product_reviews / vendor_reviews)
//   • seller_profiles.review_count (fiabilité de la note)
//   • seller_profiles.certifications (text[])  — à défaut products.certifications
//
// La fonction renvoie une valeur BRUTE "plus haut = mieux" ; la normalisation
// sur [0,1] est faite plus tard par scoring.ts, relativement au groupe d'offres.
// Logique volontairement isolée ici pour être ajustable sans toucher au reste.
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplierQualityInput {
  /** Note moyenne acheteurs sur 5 (seller_profiles.avg_rating). */
  avgRating: number | null | undefined;
  /** Nombre d'avis (seller_profiles.review_count). */
  reviewCount: number | null | undefined;
  /** Nombre de certifications déclarées par le fournisseur. */
  certificationCount: number | null | undefined;
}

// Pondération interne du sous-score qualité (documentée, modifiable ici).
const RATING_WEIGHT = 0.8; // la note acheteurs pèse 80 % du sous-score
const CERT_WEIGHT = 0.2; // les certifications 20 %
const CERT_COUNT_FOR_FULL_MARKS = 3; // 3 certifications ou plus = plein pot sur ce volet
const MAX_RATING = 5;

/**
 * Quand un fournisseur n'a encore reçu aucun avis, `avg_rating` vaut 0 et ne
 * reflète pas une "mauvaise" qualité mais une absence d'information. On applique
 * alors une note neutre (milieu d'échelle) pour ne pas le pénaliser à tort.
 */
const NEUTRAL_RATING_WHEN_NO_REVIEWS = 2.5;

/**
 * Calcule un score qualité fournisseur comparable (échelle ~0 → 5).
 *
 * score = 5 × ( RATING_WEIGHT × noteNormalisée + CERT_WEIGHT × certifsNormalisées )
 *
 * - noteNormalisée   = rating / 5  (ou 0,5 si aucun avis)
 * - certifsNormalisées = min(nbCertifs, 3) / 3
 */
export function calculateSupplierQualityScore(input: SupplierQualityInput): number {
  const reviewCount = toNonNegInt(input.reviewCount);
  const rawRating = toNumber(input.avgRating);

  const effectiveRating =
    reviewCount > 0 && rawRating > 0 ? rawRating : NEUTRAL_RATING_WHEN_NO_REVIEWS;

  const ratingNorm = clamp01(effectiveRating / MAX_RATING);

  const certCount = toNonNegInt(input.certificationCount);
  const certNorm = clamp01(certCount / CERT_COUNT_FOR_FULL_MARKS);

  const combined = RATING_WEIGHT * ratingNorm + CERT_WEIGHT * certNorm;
  return round2(MAX_RATING * combined);
}

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toNonNegInt(v: unknown): number {
  const n = Math.floor(toNumber(v));
  return n > 0 ? n : 0;
}
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

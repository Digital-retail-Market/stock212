// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — poids des critères (configuration administrable)
//
// Les poids NE SONT PAS codés en dur dans l'algorithme : ils sont stockés dans
// la table singleton `platform_settings` (colonnes `reco_weight_*`) et modifiables
// depuis AdminSettings › onglet « Recommandation ».
//
// La source de vérité est le backend (contrainte CHECK sur `platform_settings`,
// cf. migration 050). Cette validation est dupliquée ici pour le feedback UI et
// pour garder l'algorithme robuste si la config lue est incohérente.
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationCriterion =
  | 'price'
  | 'delivery'
  | 'supplierQuality'
  | 'freshness'
  | 'proximity';

export const RECOMMENDATION_CRITERIA: RecommendationCriterion[] = [
  'price',
  'delivery',
  'supplierQuality',
  'freshness',
  'proximity',
];

/** Poids exprimés en pourcentage (leur somme doit valoir 100). */
export interface RecommendationWeights {
  price: number;
  delivery: number;
  supplierQuality: number;
  freshness: number;
  proximity: number;
}

/** Poids par défaut du document fonctionnel (35 / 20 / 20 / 15 / 10 = 100). */
export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  price: 35,
  delivery: 20,
  supplierQuality: 20,
  freshness: 15,
  proximity: 10,
};

/**
 * Tolérance sur la somme des poids. On accepte les valeurs décimales
 * (ex. 35.5 + 19.5 + …) donc on compare la somme à 100 à 0,01 près pour
 * absorber les erreurs d'arrondi flottant.
 */
export const WEIGHT_SUM_TOLERANCE = 0.01;

export interface WeightValidationResult {
  valid: boolean;
  /** Messages d'erreur prêts à afficher (français). */
  errors: string[];
  /** Somme effective des poids fournis (utile pour l'affichage « Total : X % »). */
  sum: number;
}

const CRITERION_LABELS_FR: Record<RecommendationCriterion, string> = {
  price: 'Prix produit',
  delivery: 'Coût livraison',
  supplierQuality: 'Qualité fournisseur',
  freshness: 'Fraîcheur produit',
  proximity: 'Proximité géographique',
};

/**
 * Valide un jeu de poids.
 *  - chaque poids doit être un nombre fini ;
 *  - aucun poids négatif ;
 *  - la somme doit être égale à 100 % (à WEIGHT_SUM_TOLERANCE près).
 *
 * Accepte un objet partiel / non typé (ex. saisie brute d'un formulaire) afin de
 * pouvoir signaler précisément les valeurs non numériques.
 */
export function validateRecommendationWeights(
  input: Partial<Record<RecommendationCriterion, unknown>> | null | undefined,
): WeightValidationResult {
  const errors: string[] = [];
  let sum = 0;

  if (input == null || typeof input !== 'object') {
    return { valid: false, errors: ['Configuration des poids absente ou invalide.'], sum: 0 };
  }

  for (const criterion of RECOMMENDATION_CRITERIA) {
    const raw = (input as Record<string, unknown>)[criterion];
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`« ${CRITERION_LABELS_FR[criterion]} » : valeur non numérique.`);
      continue;
    }
    if (value < 0) {
      errors.push(`« ${CRITERION_LABELS_FR[criterion]} » : le poids ne peut pas être négatif.`);
      continue;
    }
    sum += value;
  }

  // On ne teste la somme que si toutes les valeurs individuelles sont valides,
  // sinon `sum` est partielle et le message serait trompeur.
  if (errors.length === 0 && Math.abs(sum - 100) > WEIGHT_SUM_TOLERANCE) {
    errors.push(
      `La somme des poids doit être égale à 100 % (actuellement ${round2(sum)} %).`,
    );
  }

  return { valid: errors.length === 0, errors, sum: round2(sum) };
}

/** Convertit des poids en pourcentage (somme = 100) en fractions (somme = 1). */
export function normalizeWeightsToFractions(
  weights: RecommendationWeights,
): RecommendationWeights {
  const total =
    weights.price +
    weights.delivery +
    weights.supplierQuality +
    weights.freshness +
    weights.proximity;
  // Garde-fou : si la somme n'est pas 100 (config héritée douteuse), on
  // renormalise sur le total réel pour que le score final reste sur 0–100.
  const divisor = total > 0 ? total : 1;
  return {
    price: weights.price / divisor,
    delivery: weights.delivery / divisor,
    supplierQuality: weights.supplierQuality / divisor,
    freshness: weights.freshness / divisor,
    proximity: weights.proximity / divisor,
  };
}

// ── Correspondance avec les colonnes de `platform_settings` ───────────────────

export const PLATFORM_SETTINGS_WEIGHT_COLUMNS: Record<RecommendationCriterion, string> = {
  price: 'reco_weight_price',
  delivery: 'reco_weight_delivery',
  supplierQuality: 'reco_weight_supplier_quality',
  freshness: 'reco_weight_freshness',
  proximity: 'reco_weight_proximity',
};

/** Lit les poids depuis une ligne `platform_settings` (retombe sur les défauts). */
export function weightsFromPlatformSettings(
  row: Record<string, unknown> | null | undefined,
): RecommendationWeights {
  if (!row) return { ...DEFAULT_RECOMMENDATION_WEIGHTS };
  const read = (col: string, fallback: number) => {
    const v = row[col];
    return typeof v === 'number' && Number.isFinite(v) ? v : Number(v ?? fallback) || fallback;
  };
  return {
    price: read('reco_weight_price', DEFAULT_RECOMMENDATION_WEIGHTS.price),
    delivery: read('reco_weight_delivery', DEFAULT_RECOMMENDATION_WEIGHTS.delivery),
    supplierQuality: read(
      'reco_weight_supplier_quality',
      DEFAULT_RECOMMENDATION_WEIGHTS.supplierQuality,
    ),
    freshness: read('reco_weight_freshness', DEFAULT_RECOMMENDATION_WEIGHTS.freshness),
    proximity: read('reco_weight_proximity', DEFAULT_RECOMMENDATION_WEIGHTS.proximity),
  };
}

/** Transforme des poids en patch `{ reco_weight_*: number }` pour un `update()`. */
export function weightsToPlatformSettingsPatch(
  weights: RecommendationWeights,
): Record<string, number> {
  return {
    reco_weight_price: weights.price,
    reco_weight_delivery: weights.delivery,
    reco_weight_supplier_quality: weights.supplierQuality,
    reco_weight_freshness: weights.freshness,
    reco_weight_proximity: weights.proximity,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

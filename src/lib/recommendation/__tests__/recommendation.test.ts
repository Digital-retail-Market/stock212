import { describe, it, expect } from 'vitest';

import {
  scoreOffers,
  normalizeValues,
  SCORE_WHEN_INDISTINGUISHABLE,
  SCORE_WHEN_MISSING,
  type RankableOffer,
  type OfferCriteriaValues,
  type OfferScoreBreakdown,
} from '../scoring';
import {
  validateRecommendationWeights,
  normalizeWeightsToFractions,
  DEFAULT_RECOMMENDATION_WEIGHTS,
  type RecommendationWeights,
} from '../weights';
import { calculateSupplierQualityScore } from '../supplierQuality';
import { calculateProximityDistance, PROXIMITY_RANK } from '../proximity';
import { freshnessDaysFromLots } from '../freshness';

// ── Helpers ─────────────────────────────────────────────────────────────────

const BASE: OfferCriteriaValues = {
  price: 10,
  delivery: 0,
  supplierQuality: 4,
  freshness: 100,
  proximity: 1,
};

function mkOffer(id: string, values: Partial<OfferCriteriaValues>): RankableOffer<{ id: string }> {
  return { id, values: { ...BASE, ...values }, payload: { id } };
}

function byId(
  list: OfferScoreBreakdown<{ id: string }>[],
  id: string,
): OfferScoreBreakdown<{ id: string }> {
  const found = list.find((b) => b.offerId === id);
  if (!found) throw new Error(`offer ${id} absent du résultat`);
  return found;
}

const priceHeavy: RecommendationWeights = {
  price: 70,
  delivery: 10,
  supplierQuality: 8,
  freshness: 7,
  proximity: 5,
};

// ── Test 1 — configuration par défaut (35 / 20 / 20 / 15 / 10) ───────────────

describe('Test 1 — configuration par défaut', () => {
  // A = moins cher, loin, qualité moyenne, produit frais
  // B = un peu plus cher, proche, excellente qualité, livraison gratuite
  // C = prix intermédiaire, fraîcheur faible (lot bientôt périmé)
  const offers = [
    mkOffer('A', { price: 10, delivery: 40, supplierQuality: 3, freshness: 90, proximity: 3 }),
    mkOffer('B', { price: 12, delivery: 0, supplierQuality: 5, freshness: 60, proximity: 0 }),
    mkOffer('C', { price: 11, delivery: 20, supplierQuality: 3.5, freshness: 8, proximity: 2 }),
  ];

  it('le score final respecte finalScore = Σ scoreNormalisé × poids', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    const a = byId(res, 'A');

    // Normalisations attendues pour A :
    // prix (bas=mieux, min10 max12)      → 1
    // livraison (bas=mieux, min0 max40)  → 0
    // qualité (haut=mieux, min3 max5)    → 0
    // fraîcheur (haut=mieux, min8 max90) → 1
    // proximité (bas=mieux, min0 max3)   → 0
    expect(a.scores.price).toBeCloseTo(1, 5);
    expect(a.scores.delivery).toBeCloseTo(0, 5);
    expect(a.scores.supplierQuality).toBeCloseTo(0, 5);
    expect(a.scores.freshness).toBeCloseTo(1, 5);
    expect(a.scores.proximity).toBeCloseTo(0, 5);

    // finalScore A = 1·35 + 0·20 + 0·20 + 1·15 + 0·10 = 50
    expect(a.finalScore).toBeCloseTo(50, 2);
  });

  it('classe B en tête (ses atouts compensent son prix), A puis C', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res.map((r) => r.offerId)).toEqual(['B', 'A', 'C']);
    // B ≈ 59.51, A = 50, C ≈ 35.83
    expect(res[0].finalScore).toBeGreaterThan(res[1].finalScore);
    expect(res[1].finalScore).toBeGreaterThan(res[2].finalScore);
  });

  it('recopie les poids configurés dans le détail (transparence)', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res[0].weights).toEqual(DEFAULT_RECOMMENDATION_WEIGHTS);
  });
});

// ── Test 2 — changement des poids ───────────────────────────────────────────

describe('Test 2 — le classement suit les poids configurés', () => {
  const offers = [
    mkOffer('A', { price: 10, delivery: 40, supplierQuality: 3, freshness: 90, proximity: 3 }),
    mkOffer('B', { price: 12, delivery: 0, supplierQuality: 5, freshness: 60, proximity: 0 }),
    mkOffer('C', { price: 11, delivery: 20, supplierQuality: 3.5, freshness: 8, proximity: 2 }),
  ];

  it('avec les poids par défaut, B est premier', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res[0].offerId).toBe('B');
  });

  it('quand le prix devient dominant, l’offre la moins chère (A) repasse devant', () => {
    const res = scoreOffers(offers, priceHeavy);
    expect(res[0].offerId).toBe('A');
    // le classement a bien changé par rapport au défaut
    const def = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS).map((r) => r.offerId);
    expect(res.map((r) => r.offerId)).not.toEqual(def);
  });
});

// ── Test 3 — livraison gratuite ─────────────────────────────────────────────

describe('Test 3 — la livraison gratuite améliore le score de livraison', () => {
  const offers = [
    mkOffer('free', { delivery: 0, freshness: null, proximity: null }),
    mkOffer('paid', { delivery: 50, freshness: null, proximity: null }),
  ];

  it('l’offre en livraison gratuite obtient le score de livraison maximal', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(byId(res, 'free').scores.delivery).toBe(1);
    expect(byId(res, 'paid').scores.delivery).toBe(0);
  });

  it('toutes conditions égales par ailleurs, elle est classée première', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res[0].offerId).toBe('free');
    expect(byId(res, 'free').finalScore).toBeGreaterThan(byId(res, 'paid').finalScore);
  });
});

// ── Test 4 — fournisseur mieux noté ────────────────────────────────────────

describe('Test 4 — un fournisseur beaucoup mieux noté peut dépasser une offre moins chère', () => {
  const offers = [
    mkOffer('cheap', { price: 10, supplierQuality: 2 }),
    mkOffer('rated', { price: 11, supplierQuality: 5 }),
  ];

  it('avec les poids par défaut, l’offre la moins chère reste devant', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res[0].offerId).toBe('cheap');
  });

  it('quand la qualité fournisseur est fortement pondérée, l’offre mieux notée passe devant', () => {
    const qualityHeavy: RecommendationWeights = {
      price: 30, delivery: 10, supplierQuality: 40, freshness: 10, proximity: 10,
    };
    const res = scoreOffers(offers, qualityHeavy);
    expect(res[0].offerId).toBe('rated');
    expect(byId(res, 'rated').finalScore).toBeGreaterThan(byId(res, 'cheap').finalScore);
  });
});

// ── Test 5 — fraîcheur ─────────────────────────────────────────────────────

describe('Test 5 — une offre proche de la péremption n’est jamais exclue', () => {
  const offers = [
    mkOffer('expiring', { price: 5, freshness: 2 }),
    mkOffer('fresh', { price: 10, freshness: 200 }),
    mkOffer('mid', { price: 10, freshness: 100 }),
  ];

  it('l’offre bientôt périmée obtient le pire score de fraîcheur mais reste dans les résultats', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res).toHaveLength(3);
    const exp = byId(res, 'expiring');
    expect(exp.scores.freshness).toBe(0);
    expect(exp.scores.freshness).toBeLessThan(byId(res, 'fresh').scores.freshness);
  });

  it('elle peut malgré tout être classée première si son avantage prix compense', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res[0].offerId).toBe('expiring');
  });
});

// ── Test 6 — proximité ─────────────────────────────────────────────────────

describe('Test 6 — un fournisseur plus proche obtient un meilleur score de proximité', () => {
  const buyer = { city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA' };

  it('calculateProximityDistance range les localisations par proximité', () => {
    expect(calculateProximityDistance(buyer, { city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA' }))
      .toBe(PROXIMITY_RANK.SAME_CITY);
    expect(calculateProximityDistance(buyer, { city: 'Mohammedia', region: 'Casablanca-Settat', country: 'MA' }))
      .toBe(PROXIMITY_RANK.SAME_REGION);
    expect(calculateProximityDistance(buyer, { city: 'Tanger', region: 'Tanger-Tétouan', country: 'MA' }))
      .toBe(PROXIMITY_RANK.SAME_COUNTRY);
    expect(calculateProximityDistance(buyer, { city: 'Paris', region: 'Île-de-France', country: 'FR' }))
      .toBe(PROXIMITY_RANK.DIFFERENT_COUNTRY);
    expect(calculateProximityDistance(buyer, { city: null, region: null, country: 'MA' })).toBeNull();
  });

  it('l’offre du fournisseur le plus proche est mieux classée', () => {
    const near = calculateProximityDistance(buyer, { city: 'Casablanca', region: 'Casablanca-Settat', country: 'MA' });
    const far = calculateProximityDistance(buyer, { city: 'Tanger', region: 'Tanger-Tétouan', country: 'MA' });
    const offers = [
      mkOffer('near', { proximity: near }),
      mkOffer('far', { proximity: far }),
    ];
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(byId(res, 'near').scores.proximity).toBeGreaterThan(byId(res, 'far').scores.proximity);
    expect(res[0].offerId).toBe('near');
  });
});

// ── Test 7 — valeurs identiques (pas de division par zéro) ──────────────────

describe('Test 7 — toutes les offres identiques sur un critère', () => {
  const offers = [
    mkOffer('X', {}),
    mkOffer('Y', {}),
    mkOffer('Z', {}),
  ];

  it('aucun score n’est NaN et chaque critère non discriminant vaut la note maximale', () => {
    const res = scoreOffers(offers, DEFAULT_RECOMMENDATION_WEIGHTS);
    expect(res).toHaveLength(3);
    for (const b of res) {
      for (const key of ['price', 'delivery', 'supplierQuality', 'freshness', 'proximity'] as const) {
        expect(Number.isNaN(b.scores[key])).toBe(false);
        expect(b.scores[key]).toBe(SCORE_WHEN_INDISTINGUISHABLE);
      }
      expect(b.finalScore).toBeCloseTo(100, 5);
    }
  });

  it('normalizeValues gère une liste constante sans division par zéro', () => {
    expect(normalizeValues([7, 7, 7], 'lower_is_better')).toEqual([1, 1, 1]);
    expect(normalizeValues([0, 0], 'higher_is_better')).toEqual([1, 1]);
  });

  it('normalizeValues attribue un score neutre aux valeurs manquantes', () => {
    // 3 valeurs présentes + 1 manquante : la manquante = neutre, exclue du min/max
    const scores = normalizeValues([10, 20, 30, null], 'lower_is_better');
    expect(scores[0]).toBeCloseTo(1, 5); // 10 = meilleur
    expect(scores[2]).toBeCloseTo(0, 5); // 30 = pire
    expect(scores[3]).toBe(SCORE_WHEN_MISSING);
  });
});

// ── Test 8 — poids invalides (le back-end doit refuser) ─────────────────────

describe('Test 8 — validation des poids', () => {
  it('refuse une somme supérieure à 100', () => {
    const r = validateRecommendationWeights({ price: 35, delivery: 20, supplierQuality: 20, freshness: 15, proximity: 20 });
    expect(r.valid).toBe(false);
    expect(r.sum).toBe(110);
  });

  it('refuse une somme inférieure à 100', () => {
    const r = validateRecommendationWeights({ price: 35, delivery: 20, supplierQuality: 20, freshness: 15, proximity: 5 });
    expect(r.valid).toBe(false);
  });

  it('refuse un poids négatif', () => {
    const r = validateRecommendationWeights({ price: -5, delivery: 25, supplierQuality: 30, freshness: 30, proximity: 20 });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/négatif/i);
  });

  it('refuse une valeur non numérique', () => {
    const r = validateRecommendationWeights({ price: 'abc', delivery: 25, supplierQuality: 20, freshness: 15, proximity: 25 } as never);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/non numérique/i);
  });

  it('accepte des valeurs décimales dont la somme fait 100', () => {
    const r = validateRecommendationWeights({ price: 35.5, delivery: 19.5, supplierQuality: 20, freshness: 15, proximity: 10 });
    expect(r.valid).toBe(true);
    expect(r.sum).toBe(100);
  });

  it('accepte la configuration par défaut', () => {
    expect(validateRecommendationWeights(DEFAULT_RECOMMENDATION_WEIGHTS).valid).toBe(true);
  });

  it('normalizeWeightsToFractions convertit des pourcentages en fractions sommant à 1', () => {
    const f = normalizeWeightsToFractions(DEFAULT_RECOMMENDATION_WEIGHTS);
    const sum = f.price + f.delivery + f.supplierQuality + f.freshness + f.proximity;
    expect(sum).toBeCloseTo(1, 10);
    expect(f.price).toBeCloseTo(0.35, 10);
  });
});

// ── Modules auxiliaires ────────────────────────────────────────────────────

describe('calculateSupplierQualityScore', () => {
  it('récompense une meilleure note et plus de certifications', () => {
    const low = calculateSupplierQualityScore({ avgRating: 2, reviewCount: 10, certificationCount: 0 });
    const high = calculateSupplierQualityScore({ avgRating: 5, reviewCount: 40, certificationCount: 3 });
    expect(high).toBeGreaterThan(low);
  });

  it('applique une note neutre quand le fournisseur n’a aucun avis (donnée absente, pas "mauvais")', () => {
    const noReviews = calculateSupplierQualityScore({ avgRating: 0, reviewCount: 0, certificationCount: 0 });
    const badButRated = calculateSupplierQualityScore({ avgRating: 1, reviewCount: 20, certificationCount: 0 });
    expect(noReviews).toBeGreaterThan(badButRated);
  });
});

describe('freshnessDaysFromLots', () => {
  const now = new Date(2026, 0, 1); // 1er janvier 2026, minuit heure locale

  it('retourne les jours restants du lot servable le plus proche de la péremption', () => {
    const days = freshnessDaysFromLots(
      [
        { expiry_date: '2026-03-01', qty_available: 5, active: true },
        { expiry_date: '2026-01-31', qty_available: 10, active: true },
      ],
      now,
    );
    expect(days).toBe(30);
  });

  it('ignore les lots inactifs ou sans stock', () => {
    const days = freshnessDaysFromLots(
      [
        { expiry_date: '2026-01-05', qty_available: 0, active: true },
        { expiry_date: '2026-01-10', qty_available: 5, active: false },
        { expiry_date: '2026-02-20', qty_available: 5, active: true },
      ],
      now,
    );
    expect(days).toBe(50);
  });

  it('retourne null quand aucune date de péremption n’est exploitable (donnée manquante, pas d’exclusion)', () => {
    expect(freshnessDaysFromLots([], now)).toBeNull();
    expect(freshnessDaysFromLots(null, now)).toBeNull();
    expect(freshnessDaysFromLots([{ expiry_date: null, qty_available: 5, active: true }], now)).toBeNull();
  });

  it('peut retourner une valeur négative pour un lot déjà périmé (offre toujours classable)', () => {
    const days = freshnessDaysFromLots([{ expiry_date: '2025-12-20', qty_available: 5, active: true }], now);
    expect(days).toBeLessThan(0);
  });
});

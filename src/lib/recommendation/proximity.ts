// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — critère « Proximité géographique »
//
// ⚠️ Donnée manquante identifiée (§19) : le projet ne stocke AUCUNE coordonnée
// géographique (pas de latitude/longitude sur `organisations`, pas de table de
// géocodage, pas de service de distance). Les seules informations disponibles
// sont `organisations.city`, `organisations.region` et `organisations.country`
// (mêmes colonnes côté acheteur et côté vendeur).
//
// Stratégie de repli explicite et cohérente avec le modèle existant : on
// convertit la proximité en un RANG discret ("plus bas = mieux") :
//   0 = même ville            (délais / risques transport minimaux)
//   1 = même région
//   2 = même pays
//   3 = pays différent
//   null = impossible à déterminer (ville ET région inconnues d'un côté)
//          → traité comme "donnée manquante" par scoring.ts (score neutre).
//
// Le jour où des coordonnées seront disponibles, il suffira de remplacer cette
// fonction par un calcul de distance réel (Haversine) sans toucher au reste.
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoLocation {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export const PROXIMITY_RANK = {
  SAME_CITY: 0,
  SAME_REGION: 1,
  SAME_COUNTRY: 2,
  DIFFERENT_COUNTRY: 3,
} as const;

/** Rang de proximité entre l'acheteur et le vendeur ("plus bas = mieux"). */
export function calculateProximityDistance(
  buyer: GeoLocation | null | undefined,
  seller: GeoLocation | null | undefined,
): number | null {
  if (!buyer || !seller) return null;

  const bCity = norm(buyer.city);
  const sCity = norm(seller.city);
  const bRegion = norm(buyer.region);
  const sRegion = norm(seller.region);
  const bCountry = norm(buyer.country);
  const sCountry = norm(seller.country);

  if (bCity && sCity && bCity === sCity) return PROXIMITY_RANK.SAME_CITY;
  if (bRegion && sRegion && bRegion === sRegion) return PROXIMITY_RANK.SAME_REGION;

  // Ni ville ni région exploitables d'un côté → indéterminable.
  if (!bCity && !bRegion) return null;
  if (!sCity && !sRegion) return null;

  if (bCountry && sCountry) {
    return bCountry === sCountry
      ? PROXIMITY_RANK.SAME_COUNTRY
      : PROXIMITY_RANK.DIFFERENT_COUNTRY;
  }

  // Pays inconnu d'un côté mais ville/région connues et différentes :
  // on suppose "même pays, autre ville" (cas le plus fréquent sur un marché national).
  return PROXIMITY_RANK.SAME_COUNTRY;
}

const DIACRITICS = /[̀-ͯ]/g;

function norm(v: string | null | undefined): string {
  return (v ?? '')
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(DIACRITICS, ''); // retire les accents : "Salé" == "Sale"
}

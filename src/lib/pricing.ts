// ─────────────────────────────────────────────────────────────────────────────
// Calcul de prix — source unique (remplace les copies locales de `basePrice`).
//
// Deux notions distinctes, à ne pas confondre :
//   • lowestTierPrice()   → prix du palier le plus bas (affichage « à partir de X »)
//   • getEffectiveUnitPrice() → prix réellement applicable à une quantité donnée
//     (ré-exporté depuis cartOptimizer, seul endroit où il était défini)
// ─────────────────────────────────────────────────────────────────────────────

export { getEffectiveUnitPrice } from './cartOptimizer';

export interface PriceTierLike {
  qty_min: number;
  unit_price: number;
}

/**
 * Prix unitaire du plus petit palier (qty_min le plus faible).
 * `null` si aucun palier. Utilisé pour l'accroche « à partir de … » des cartes
 * catalogue / destockage.
 */
export function lowestTierPrice(tiers: PriceTierLike[] | null | undefined): number | null {
  if (!tiers || tiers.length === 0) return null;
  return [...tiers].sort((a, b) => a.qty_min - b.qty_min)[0].unit_price;
}

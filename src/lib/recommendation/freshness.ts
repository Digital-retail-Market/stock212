// ─────────────────────────────────────────────────────────────────────────────
// Recommandation — critère « Fraîcheur du produit »
//
// Fraîcheur = nombre de jours restants avant la date de péremption du lot
// proposé (§10). Plus il reste de jours, meilleure sera la note.
//
// Source : table `product_lots` (colonnes `expiry_date`, `qty_available`,
// `active`). Un produit peut avoir plusieurs lots : on retient le lot
// "servable" dont la péremption est la PLUS PROCHE (logique FIFO : c'est ce
// lot-là qui partira en premier), ce qui donne l'estimation de fraîcheur la
// plus prudente.
//
// ⚠️ IMPORTANT (§10 / §19) : un produit proche de la péremption N'EST PAS exclu.
// Il obtient simplement une valeur de fraîcheur faible → un score de fraîcheur
// faible. Si aucun lot n'a de date de péremption exploitable, on renvoie `null`
// (donnée manquante → score neutre côté scoring.ts), jamais une exclusion.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductLotLike {
  expiry_date?: string | null;
  qty_available?: number | null;
  active?: boolean | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Jours restants avant péremption du lot le plus urgent parmi les lots
 * "servables" (actifs et avec du stock). `null` si aucune date exploitable.
 *
 * Peut renvoyer une valeur négative si le lot le plus proche est déjà périmé :
 * c'est voulu (l'offre reste classable, avec la pire note de fraîcheur du groupe).
 */
export function freshnessDaysFromLots(
  lots: ProductLotLike[] | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!lots || lots.length === 0) return null;

  const nowMs = startOfDay(now);
  let soonestMs: number | null = null;

  for (const lot of lots) {
    if (lot.active === false) continue;
    if (lot.qty_available != null && lot.qty_available <= 0) continue;
    if (!lot.expiry_date) continue;

    const t = parseExpiryToLocalStartOfDay(lot.expiry_date);
    if (t == null) continue;

    if (soonestMs == null || t < soonestMs) soonestMs = t;
  }

  if (soonestMs == null) return null;
  return Math.round((soonestMs - nowMs) / MS_PER_DAY);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Parse une date de péremption en minuit HEURE LOCALE pour comparer des
 * journées calendaires sans décalage de fuseau. Gère les `date` Postgres
 * (`YYYY-MM-DD`) comme les timestamps ISO complets.
 */
function parseExpiryToLocalStartOfDay(raw: string): number | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return startOfDay(new Date(parsed));
}

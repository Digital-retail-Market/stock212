/**
 * Stock212 — Seed « Promotions & Déstockage » pour la page /best-deals
 *   • Onglet "En promotion"  → products.is_on_promotion = true
 *   • Onglet "Déstockage"    → promotions actives, ends_at dans les 48 h
 *
 *   node scripts/seed-promos.mjs <service_role_key>
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  const env = {};
  try {
    for (const l of readFileSync(join(__dir, '../.env'), 'utf8').split('\n')) {
      const t = l.trim(); if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i < 0) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}
const env = loadEnv();
const URL = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.argv[2] || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ACCESS_TOKEN;
if (!URL || !KEY) { console.error('❌  URL + clé service_role requis'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

const HOURS = (h) => new Date(Date.now() + h * 3600_000).toISOString();

// Photo par mot-clé du nom produit (Pexels, libres de droits) → cartes avec image
const IMG = [
  [/huile d'olive|olive/i, 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=600'],
  [/huile|tournesol|friture|soja/i, 'https://images.pexels.com/photos/33260/olive-oil-oil-bottle-glass.jpg?auto=compress&cs=tinysrgb&w=600'],
  [/farine|semoule|blé/i, 'https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/sucre/i, 'https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/riz|lentille|pois|haricot/i, 'https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/couscous|p[aâ]tes|spaghetti|coquillette|vermicelle/i, 'https://images.pexels.com/photos/128408/pexels-photo-128408.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/th[eé]/i, 'https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/caf[eé]/i, 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/lait|cr[eè]me|yaourt/i, 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/eau/i, 'https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/cola|jus|nectar|boisson/i, 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/sardine|thon|maquereau|pilchard|poisson/i, 'https://images.pexels.com/photos/4553031/pexels-photo-4553031.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/tomate|concentr|petits pois|haricots verts|mac[eé]doine|olives/i, 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/beurre|smen/i, 'https://images.pexels.com/photos/531334/pexels-photo-531334.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/fromage|edam|mozzarella|gouda/i, 'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/biscuit|gaufrette|madeleine|petit-beurre/i, 'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/chocolat|cacao/i, 'https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/merguez|kefta|escalope|cordon|viande hach/i, 'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/frites|surgel|l[eé]gumes wok|feuillet[eé]e|pains bri/i, 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/[eé]pice|ras el hanout|cumin|paprika|curcuma|poivre|safran/i, 'https://images.pexels.com/photos/1340116/pexels-photo-1340116.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/confiture|miel|tartiner|amlou/i, 'https://images.pexels.com/photos/33260/honey-sweet-syrup-organic.jpg?auto=compress&cs=tinysrgb&w=600'],
  [/levure|bicarbonate|am[eé]liorant/i, 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=600'],
  [/vaisselle|lessive|javel|nettoyant|d[eé]graissant|savon|gel douche|shampoing/i, 'https://images.pexels.com/photos/4239146/pexels-photo-4239146.jpeg?auto=compress&cs=tinysrgb&w=600'],
];
const DEFAULT_IMG = 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=600';
const imgFor = (name) => (IMG.find(([re]) => re.test(name)) ?? [null, DEFAULT_IMG])[1];

async function setImages(list, label) {
  let n = 0;
  for (const p of list) {
    const { error } = await sb.from('products').update({ images: [imgFor(p.name)] }).eq('id', p.id);
    if (!error) n++;
  }
  console.log(`  ✓ ${n}/${list.length} images posées (${label})`);
}

console.log(`\n🏷️  Seed promotions & déstockage → ${URL}\n`);

// ── 1. Onglet "En promotion" : marque ~10 produits du marché MA en promo ──────
const { data: pool } = await sb
  .from('products')
  .select('id, name, seller_org_id, ean')
  .like('ean', '612%')
  .eq('status', 'active')
  .limit(60);

const rows = pool ?? [];
// un produit par EAN de marque (évite 4 lignes identiques du même article)
const byEan = new Map();
for (const p of rows) if (!byEan.has(p.ean)) byEan.set(p.ean, p);
const uniques = [...byEan.values()];

const promoPicks = uniques.slice(0, 10);
const { error: e1 } = await sb
  .from('products')
  .update({ is_on_promotion: true })
  .in('id', promoPicks.map((p) => p.id));
console.log(e1 ? `  ✖ promo flag: ${e1.message}` : `  ✓ ${promoPicks.length} produits passés "en promotion"`);
await setImages(promoPicks, 'en promotion');

// ── 2. Onglet "Déstockage" : promotions actives qui expirent < 48 h ───────────
const destockPicks = uniques.slice(10, 18);
const promoRows = destockPicks.map((p, i) => {
  const pct = [10, 15, 20, 25, 30][i % 5];
  return {
    seller_org_id: p.seller_org_id,
    name: `Déstockage ${p.name} · −${pct}%`,
    promo_type: 'percentage',
    discount_value: pct,
    application: 'specific_products',
    product_ids: [p.id],
    min_qty: 1,
    starts_at: HOURS(-1),
    ends_at: HOURS(12 + i * 4), // 12 h → 40 h : tous dans la fenêtre 48 h
    active: true,
    stackable: false,
  };
});

// idempotent : on efface les déstockages de démo précédents avant de réinsérer
await sb.from('promotions').delete().like('name', 'Déstockage %');
const { data: ins, error: e2 } = await sb.from('promotions').insert(promoRows).select('id');
console.log(e2 ? `  ✖ promotions: ${e2.message}` : `  ✓ ${ins?.length ?? 0} offres de déstockage (expirent dans 12–40 h)`);
await setImages(destockPicks, 'déstockage');

// ── Contrôle ────────────────────────────────────────────────────────────────
const { count: nPromo } = await sb.from('products').select('*', { count: 'exact', head: true }).eq('is_on_promotion', true).eq('status', 'active');
const { count: nDestock } = await sb.from('promotions').select('*', { count: 'exact', head: true })
  .eq('active', true).gte('ends_at', HOURS(0)).lte('ends_at', HOURS(48));
console.log(`\n──────────────────────────────`);
console.log(`  Onglet "En promotion" : ${nPromo} produits`);
console.log(`  Onglet "Déstockage"   : ${nDestock} offres`);
console.log(`  → /best-deals\n`);

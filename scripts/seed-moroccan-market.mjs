/**
 * Stock212 — Seed « Marché marocain » (fournisseurs multiples + offres concurrentes)
 *
 * Injecte dans la base HÉBERGÉE :
 *   • 8 fournisseurs fictifs (8 villes / 8 régions) + 1 acheteur de test
 *   • 11 produits de référence, 38 offres concurrentes (prix, livraison, note,
 *     certifications, fraîcheur, localisation) — pour exercer l'algo de reco.
 *
 * Utilise l'Auth Admin API + PostgREST avec la clé service_role
 * (contourne le RLS). 100 % synthétique. Idempotent (UUID fixes + upsert).
 *
 * Lancement :
 *   SUPABASE_SERVICE_ROLE_KEY dans .env  (ou SUPABASE_ACCESS_TOKEN),
 *   ou en argument :  node scripts/seed-moroccan-market.mjs <service_role_key>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(__dir, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}

const env = loadEnv();
const URL = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const KEY =
  process.argv[2] ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_ACCESS_TOKEN;

if (!URL || !KEY) {
  console.error('\n❌  VITE_SUPABASE_URL et une clé service_role sont requis.\n');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ─── Jeu de données ──────────────────────────────────────────────────────────

const OID = (n) => `00000000-0000-0000-0000-2000000000${n}`; // organisations
const MID = (n) => `00000000-0000-0000-0000-3000000000${n}`; // organisation_members
const UID = (n) => `00000000-0000-0000-0000-1000000000${n}`; // auth.users (id imposé)

const VENDORS = [
  { n: '50', email: 'mkt-lesieur@stock212.test',     person: 'Nabil Cherkaoui',
    name: 'Lesieur Cristal Distribution', sub_type: 'Fabricant',
    address: 'Rue Ibn Al Ouannane, Aïn Sebaâ', city: 'Casablanca', postal: '20250', region: 'Casablanca-Settat',
    profile: { certifications: ['ONSSA', 'ISO 22000', 'HACCP'], accepted_payment_terms: ['prepayment', '30_days'], default_prep_days: 2, avg_rating: 4.8, review_count: 210 },
    delivery: { delivery_mode: 'free_above_threshold', flat_rate_mad: 40, free_threshold_mad: 1000, notes: 'Franco de port dès 1 000 MAD' } },
  { n: '51', email: 'mkt-savola@stock212.test',      person: 'Imane Ouazzani',
    name: 'Savola Maroc Négoce', sub_type: 'Importateur / Exportateur',
    address: 'Bd Chefchaouni, Aïn Sebaâ', city: 'Casablanca', postal: '20580', region: 'Casablanca-Settat',
    profile: { certifications: ['ONSSA'], accepted_payment_terms: ['prepayment', '15_days', '30_days'], default_prep_days: 3, avg_rating: 4.3, review_count: 56 },
    delivery: { delivery_mode: 'flat_rate', flat_rate_mad: 45, free_threshold_mad: null, notes: 'Forfait national' } },
  { n: '52', email: 'mkt-atlasgros@stock212.test',   person: 'Reda Bennani',
    name: 'AtlasGros Rabat', sub_type: 'Grossiste',
    address: 'Zone Industrielle Takaddoum', city: 'Rabat', postal: '10000', region: 'Rabat-Salé-Kénitra',
    profile: { certifications: ['ONSSA', 'Halal'], accepted_payment_terms: ['prepayment', '30_days', '60_days'], default_prep_days: 3, avg_rating: 4.5, review_count: 88 },
    delivery: { delivery_mode: 'free_above_threshold', flat_rate_mad: 35, free_threshold_mad: 1500, notes: 'Franco dès 1 500 MAD' } },
  { n: '53', email: 'mkt-fesgros@stock212.test',     person: 'Khalid Alaoui',
    name: 'Fès Épicerie en Gros', sub_type: 'Grossiste',
    address: 'Quartier Industriel Sidi Brahim', city: 'Fès', postal: '30000', region: 'Fès-Meknès',
    profile: { certifications: [], accepted_payment_terms: ['prepayment'], default_prep_days: 4, avg_rating: 4.0, review_count: 23 },
    delivery: { delivery_mode: 'flat_rate', flat_rate_mad: 30, free_threshold_mad: null, notes: 'Forfait, livraison régionale rapide' } },
  { n: '54', email: 'mkt-souss@stock212.test',       person: 'Fatima Zahra Idrissi',
    name: 'Souss Distribution Agadir', sub_type: 'Distributeur',
    address: 'Zone Industrielle Ait Melloul', city: 'Agadir', postal: '80000', region: 'Souss-Massa',
    profile: { certifications: ['ONSSA'], accepted_payment_terms: ['prepayment', '30_days'], default_prep_days: 3, avg_rating: 4.4, review_count: 47 },
    delivery: { delivery_mode: 'flat_rate', flat_rate_mad: 25, free_threshold_mad: null, notes: 'Forfait Sud' } },
  { n: '55', email: 'mkt-argan@stock212.test',       person: 'Latifa Ait Baha',
    name: 'Coopérative Argan & Terroir', sub_type: 'Coopérative',
    address: 'Route de Taroudant, Ouled Teima', city: 'Marrakech', postal: '40000', region: 'Marrakech-Safi',
    profile: { certifications: ['Bio AB', 'Ecocert', 'ONSSA'], accepted_payment_terms: ['prepayment'], default_prep_days: 5, avg_rating: 4.9, review_count: 15 },
    delivery: { delivery_mode: 'free_always', flat_rate_mad: 0, free_threshold_mad: null, notes: 'Livraison offerte (coopérative)' } },
  { n: '56', email: 'mkt-nordtrading@stock212.test', person: 'Tariq Berrada',
    name: 'Nord Trading Tanger', sub_type: 'Importateur / Exportateur',
    address: 'Zone Franche Tanger Med', city: 'Tanger', postal: '90000', region: 'Tanger-Tétouan',
    profile: { certifications: ['ONSSA'], accepted_payment_terms: ['prepayment', '15_days'], default_prep_days: 4, avg_rating: 4.2, review_count: 34 },
    delivery: { delivery_mode: 'percentage', flat_rate_mad: 0, free_threshold_mad: null, percentage_rate: 0.04, min_charge_mad: 20, max_charge_mad: 60, notes: '4 % du montant, min 20 / max 60 MAD' } },
  { n: '57', email: 'mkt-oriental@stock212.test',    person: 'Samir Lahlou',
    name: 'Oriental Foods Oujda', sub_type: 'Distributeur',
    address: 'Bd Mohammed VI, Sidi Yahya', city: 'Oujda', postal: '60000', region: 'Oriental',
    profile: { certifications: [], accepted_payment_terms: ['prepayment'], default_prep_days: 5, avg_rating: 3.9, review_count: 9 },
    delivery: { delivery_mode: 'flat_rate', flat_rate_mad: 35, free_threshold_mad: null, notes: 'Forfait, hub Oriental' } },
];

const BUYER = {
  n: '58', email: 'mkt-riad-buyer@stock212.test', person: 'Yassine Sabri',
  name: 'Restaurant Le Riad (test)', sub_type: 'Restaurant',
  address: 'Rue Talaa Kbira, Médina', city: 'Fès', postal: '30000', region: 'Fès-Meknès',
  profile: { credit_limit: 40000, default_payment_terms: '30_days', interest_categories: ['Épicerie sèche', 'Conserves', 'Boissons'] },
};

// [ vendorN, ean, nom, description, catégorie, moq, pack, temp, shelf, certs[], nutri, note, avis,
//   [[q,u],[q,u],[q,u]], lotJours|null, lotQté|null ]
const OFFERS = [
  // 1 · Huile de table tournesol 5L
  ['50','6119000000011','Huile de table tournesol 5L','Huile végétale de tournesol raffinée, bidon 5L','Épicerie sèche',4,1,'ambient',540,['ONSSA','ISO 22000'],'C',4.8,64,[[1,188],[20,178],[100,168]],null,null],
  ['51','6119000000011','Huile de table tournesol 5L','Huile de tournesol pure première pression, bidon 5L','Épicerie sèche',4,1,'ambient',540,['ONSSA'],'C',4.2,21,[[1,180],[20,172],[100,163]],null,null],
  ['53','6119000000011','Huile de table tournesol 5L','Huile de tournesol, bidon 5L — dépôt Fès','Épicerie sèche',4,1,'ambient',540,[],'C',4.0,12,[[1,184],[20,176],[100,166]],60,300],
  ['57','6119000000011','Huile de table tournesol 5L','Huile de tournesol économique, bidon 5L','Épicerie sèche',4,1,'ambient',540,[],'C',3.9,8,[[1,172],[20,165],[100,156]],null,null],
  // 2 · Farine de blé tendre T55 25kg
  ['52','6119000000028','Farine de blé tendre T55 25kg','Farine T55 tous usages, sac 25kg','Épicerie sèche',2,1,'ambient',365,['ONSSA','Halal'],null,4.5,33,[[1,238],[10,228],[50,216]],null,null],
  ['53','6119000000028','Farine de blé tendre T55 25kg','Farine boulangère T55, sac 25kg','Épicerie sèche',2,1,'ambient',365,[],null,4.0,17,[[1,228],[10,219],[50,208]],null,null],
  ['54','6119000000028','Farine de blé tendre T55 25kg','Farine T55, sac 25kg — dépôt Agadir','Épicerie sèche',2,1,'ambient',365,['ONSSA'],null,4.4,19,[[1,242],[10,232],[50,220]],null,null],
  ['57','6119000000028','Farine de blé tendre T55 25kg','Farine T55 premier prix, sac 25kg','Épicerie sèche',2,1,'ambient',365,[],null,3.8,6,[[1,221],[10,213],[50,202]],null,null],
  // 3 · Sucre granulé blanc 50kg
  ['51','6119000000035','Sucre granulé blanc 50kg','Sucre cristallisé raffiné, sac 50kg','Épicerie sèche',1,1,'ambient',730,['ONSSA'],null,4.3,25,[[1,612],[10,596],[40,578]],null,null],
  ['52','6119000000035','Sucre granulé blanc 50kg','Sucre blanc cristallisé, sac 50kg','Épicerie sèche',1,1,'ambient',730,['ONSSA','Halal'],null,4.5,29,[[1,598],[10,585],[40,566]],null,null],
  ['54','6119000000035','Sucre granulé blanc 50kg','Sucre cristallisé, sac 50kg — dépôt Souss','Épicerie sèche',1,1,'ambient',730,['ONSSA'],null,4.4,14,[[1,625],[10,610],[40,590]],null,null],
  // 4 · Thé vert Gunpowder 3505 1kg
  ['52','6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert de Chine roulé qualité 3505, sachet 1kg','Boissons',12,1,'ambient',720,['ONSSA','Halal'],null,4.5,40,[[1,95],[24,89],[96,82]],null,null],
  ['53','6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505, sachet 1kg','Boissons',12,1,'ambient',720,[],null,4.0,15,[[1,92],[24,87],[96,80]],null,null],
  ['56','6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505 import, sachet 1kg','Boissons',12,1,'ambient',720,['ONSSA'],null,4.2,22,[[1,98],[24,92],[96,85]],null,null],
  ['57','6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505 premier prix, sachet 1kg','Boissons',12,1,'ambient',720,[],null,3.9,7,[[1,88],[24,83],[96,76]],null,null],
  // 5 · Café moulu robusta 1kg
  ['53','6119000000059','Café moulu robusta 1kg','Café robusta torréfié moulu, sachet valve 1kg','Boissons',6,1,'ambient',365,[],null,4.0,10,[[1,74],[12,70],[48,64]],null,null],
  ['54','6119000000059','Café moulu robusta 1kg','Café robusta moulu, sachet 1kg — dépôt Agadir','Boissons',6,1,'ambient',365,['ONSSA'],null,4.4,18,[[1,79],[12,74],[48,68]],null,null],
  ['57','6119000000059','Café moulu robusta 1kg','Café robusta moulu économique, sachet 1kg','Boissons',6,1,'ambient',365,[],null,3.9,6,[[1,69],[12,65],[48,59]],null,null],
  // 6 · Lait UHT demi-écrémé 1L x12  (lots : 75 / 45 / 22 jours)
  ['50','6119000000066','Lait UHT demi-écrémé 1L x12','Lait demi-écrémé longue conservation, carton 12x1L','Produits laitiers',6,12,'ambient',90,['ONSSA','ISO 22000','HACCP'],'B',4.8,52,[[1,138],[20,132],[80,124]],75,900],
  ['52','6119000000066','Lait UHT demi-écrémé 1L x12','Lait UHT demi-écrémé, carton 12x1L','Produits laitiers',6,12,'ambient',90,['ONSSA','Halal'],'B',4.5,31,[[1,132],[20,126],[80,119]],45,1200],
  ['54','6119000000066','Lait UHT demi-écrémé 1L x12','Lait UHT demi-écrémé, carton 12x1L — déstockage','Produits laitiers',6,12,'ambient',90,['ONSSA'],'B',4.3,12,[[1,129],[20,123],[80,116]],22,1500],
  // 7 · Eau minérale plate 1,5L x6
  ['51','6119000000073','Eau minérale plate 1,5L x6','Eau minérale naturelle plate, pack 6x1,5L','Boissons',12,6,'ambient',365,['ONSSA'],null,4.2,27,[[1,28],[50,26],[200,24]],null,null],
  ['52','6119000000073','Eau minérale plate 1,5L x6','Eau de source plate, pack 6x1,5L','Boissons',12,6,'ambient',365,['ONSSA','Halal'],null,4.5,44,[[1,27],[50,25],[200,23]],null,null],
  ['53','6119000000073','Eau minérale plate 1,5L x6','Eau minérale plate, pack 6x1,5L — dépôt Fès','Boissons',12,6,'ambient',365,[],null,4.0,13,[[1,27],[50,25],[200,24]],90,480],
  ['54','6119000000073','Eau minérale plate 1,5L x6','Eau minérale plate, pack 6x1,5L','Boissons',12,6,'ambient',365,['ONSSA'],null,4.4,20,[[1,26],[50,24],[200,22]],null,null],
  // 8 · Sardines à l'huile végétale 125g x50
  ['51','6119000000080','Sardines à l\'huile végétale 125g x50','Sardines entières à l\'huile végétale, colis 50 boîtes 125g','Conserves',24,50,'ambient',1460,['ONSSA'],'B',4.2,30,[[1,560],[4,535],[20,505]],400,900],
  ['54','6119000000080','Sardines à l\'huile végétale 125g x50','Sardines à l\'huile végétale, colis 50x125g — Agadir','Conserves',24,50,'ambient',1460,['ONSSA'],'B',4.4,41,[[1,520],[4,498],[20,470]],90,1400],
  ['56','6119000000080','Sardines à l\'huile végétale 125g x50','Sardines à l\'huile végétale import/export, colis 50x125g','Conserves',24,50,'ambient',1460,['ONSSA'],'B',4.2,19,[[1,545],[4,520],[20,492]],260,700],
  // 9 · Double concentré de tomate 800g x12
  ['52','6119000000097','Double concentré de tomate 800g x12','Concentré de tomate 28% boîte 800g, carton de 12','Conserves',6,12,'ambient',900,['ONSSA','Halal'],'B',4.5,26,[[1,148],[10,141],[40,132]],null,null],
  ['53','6119000000097','Double concentré de tomate 800g x12','Double concentré de tomate 800g, carton de 12','Conserves',6,12,'ambient',900,[],'B',4.0,11,[[1,142],[10,136],[40,128]],120,360],
  ['57','6119000000097','Double concentré de tomate 800g x12','Concentré de tomate 800g premier prix, carton 12','Conserves',6,12,'ambient',900,[],'B',3.9,7,[[1,136],[10,130],[40,122]],null,null],
  // 10 · Couscous moyen 10kg
  ['52','6119000000103','Couscous moyen 10kg','Semoule de blé dur précuite, grain moyen, sac 10kg','Épicerie sèche',2,1,'ambient',540,['ONSSA','Halal'],'B',4.5,35,[[1,118],[10,112],[40,104]],null,null],
  ['53','6119000000103','Couscous moyen 10kg','Couscous moyen précuit, sac 10kg — dépôt Fès','Épicerie sèche',2,1,'ambient',540,[],'B',4.0,16,[[1,112],[10,107],[40,100]],null,null],
  ['54','6119000000103','Couscous moyen 10kg','Couscous moyen précuit, sac 10kg','Épicerie sèche',2,1,'ambient',540,['ONSSA'],'B',4.4,21,[[1,121],[10,115],[40,106]],null,null],
  ['57','6119000000103','Couscous moyen 10kg','Couscous moyen économique, sac 10kg','Épicerie sèche',2,1,'ambient',540,[],'B',3.9,9,[[1,108],[10,103],[40,96]],null,null],
  // 11 · Huile d'argan alimentaire 1L
  ['52','6119000000110','Huile d\'argan alimentaire 1L','Huile d\'argan alimentaire torréfiée, bouteille 1L','Épicerie sèche',3,1,'ambient',540,['ONSSA'],null,4.4,18,[[1,780],[6,740],[24,700]],null,null],
  ['55','6119000000110','Huile d\'argan alimentaire 1L','Huile d\'argan alimentaire bio pressée à froid, 1L','Épicerie sèche',3,1,'ambient',540,['Bio AB','Ecocert','ONSSA'],null,4.9,15,[[1,690],[6,660],[24,630]],300,200],
  ['56','6119000000110','Huile d\'argan alimentaire 1L','Huile d\'argan alimentaire, bouteille 1L (export)','Épicerie sèche',3,1,'ambient',540,['ONSSA'],null,4.2,12,[[1,720],[6,690],[24,655]],140,150],
];

const EAN_REFS = [
  ['6119000000011','Huile de table tournesol 5L','Huile végétale de tournesol raffinée, bidon 5L','Épicerie sèche','ambient',5000,'g',['ONSSA'],'C',1,540],
  ['6119000000028','Farine de blé tendre T55 25kg','Farine T55 tous usages, sac 25kg','Épicerie sèche','ambient',25000,'g',['ONSSA'],null,1,365],
  ['6119000000035','Sucre granulé blanc 50kg','Sucre cristallisé raffiné, sac 50kg','Épicerie sèche','ambient',50000,'g',['ONSSA'],null,1,730],
  ['6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert de Chine roulé qualité 3505, sachet 1kg','Boissons','ambient',1000,'g',['ONSSA'],null,1,720],
  ['6119000000059','Café moulu robusta 1kg','Café robusta torréfié moulu, sachet valve 1kg','Boissons','ambient',1000,'g',[],null,1,365],
  ['6119000000066','Lait UHT demi-écrémé 1L x12','Lait demi-écrémé longue conservation, carton 12x1L','Produits laitiers','ambient',12000,'g',['ONSSA'],'B',12,90],
  ['6119000000073','Eau minérale plate 1,5L x6','Eau minérale naturelle plate, pack 6x1,5L','Boissons','ambient',9000,'g',['ONSSA'],null,6,365],
  ['6119000000080','Sardines à l\'huile végétale 125g x50','Sardines entières à l\'huile végétale, colis 50x125g','Conserves','ambient',125,'g',['ONSSA'],'B',50,1460],
  ['6119000000097','Double concentré de tomate 800g x12','Concentré de tomate 28%, boîte 800g, carton de 12','Conserves','ambient',800,'g',['ONSSA'],'B',12,900],
  ['6119000000103','Couscous moyen 10kg','Semoule de blé dur précuite, grain moyen, sac 10kg','Épicerie sèche','ambient',10000,'g',['ONSSA'],'B',1,540],
  ['6119000000110','Huile d\'argan alimentaire 1L','Huile d\'argan alimentaire pressée à froid, bouteille 1L','Épicerie sèche','ambient',1000,'g',['ONSSA'],null,1,540],
];

// ─── Helpers ────────────────────────────────────────────────────────────────

let ERRORS = 0;
function chk(label, error) {
  if (error) { ERRORS++; console.log(`  ✖ ${label}: ${error.message || error}`); }
  else console.log(`  ✓ ${label}`);
}

async function ensureAuthUser(id, email, full_name) {
  // Création avec id imposé ; si déjà présent → on récupère l'id réel.
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, email, password: 'Test1234!', email_confirm: true, user_metadata: { full_name } }),
  });
  if (res.ok) { const d = await res.json(); return d.id; }
  const body = await res.text();
  if (res.status === 422 || /already|registered|exists/i.test(body)) {
    const q = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    const list = await q.json();
    const found = (list.users || []).find((u) => u.email === email);
    if (found) return found.id;
  }
  throw new Error(`auth user ${email}: HTTP ${res.status} ${body.slice(0, 160)}`);
}

const catMap = new Map();
async function loadCategories() {
  const { data } = await sb.from('categories').select('id, name');
  for (const c of data || []) catMap.set(c.name, c.id);
}
const catId = (name) => catMap.get(name) ?? null;

// ─── Exécution ──────────────────────────────────────────────────────────────

console.log(`\n🇲🇦  Seed marché marocain → ${URL}\n`);
await loadCategories();
console.log(`  (${catMap.size} catégories chargées)\n`);

console.log('👤  Comptes, organisations, profils, livraison...');
for (const v of [...VENDORS, BUYER]) {
  const isBuyer = v === BUYER;
  let uid;
  try {
    uid = await ensureAuthUser(UID(v.n), v.email, v.person);
  } catch (e) { chk(`user ${v.email}`, e); continue; }

  await sb.from('profiles').upsert(
    { id: uid, full_name: v.person, preferred_lang: 'fr', preferred_currency: 'MAD', gdpr_consent: true, onboarding_done: true },
    { onConflict: 'id' },
  );

  const { error: eo } = await sb.from('organisations').upsert({
    id: OID(v.n), name: v.name, org_type: isBuyer ? 'buyer' : 'seller', sub_type: v.sub_type,
    country: 'MA', address_line1: v.address, city: v.city, postal_code: v.postal, region: v.region,
    validation_status: 'active',
  }, { onConflict: 'id' });

  const { error: em } = await sb.from('organisation_members').upsert(
    { id: MID(v.n), organisation_id: OID(v.n), user_id: uid, team_role: 'owner', active: true },
    { onConflict: 'organisation_id,user_id' },
  );

  let ep;
  if (isBuyer) {
    ({ error: ep } = await sb.from('buyer_profiles').upsert(
      { organisation_id: OID(v.n), credit_limit: v.profile.credit_limit, default_payment_terms: v.profile.default_payment_terms, interest_categories: v.profile.interest_categories },
      { onConflict: 'organisation_id' },
    ));
  } else {
    ({ error: ep } = await sb.from('seller_profiles').upsert(
      { organisation_id: OID(v.n), ...v.profile }, { onConflict: 'organisation_id' },
    ));
    const { error: ed } = await sb.from('vendor_delivery_config').upsert(
      { seller_org_id: OID(v.n), ...v.delivery }, { onConflict: 'seller_org_id' },
    );
    if (ed) chk(`delivery ${v.name}`, ed);
  }
  chk(`${v.name} (${v.city})`, eo || em || ep);
}

console.log('\n📦  Offres (produits + paliers + lots)...');
let created = 0, skipped = 0;
for (const o of OFFERS) {
  const [vn, ean, name, desc, cat, moq, pack, temp, shelf, certs, nutri, rating, reviews, tiers, lotDays, lotQty] = o;
  const orgId = OID(vn);

  const { data: exist } = await sb.from('products').select('id').eq('seller_org_id', orgId).eq('ean', ean).maybeSingle();
  if (exist) { skipped++; continue; }

  const pid = randomUUID();
  const { error: epr } = await sb.from('products').insert({
    id: pid, seller_org_id: orgId, name, short_description: desc, category_id: catId(cat), ean, status: 'active',
    moq, pack_size: pack, temperature: temp, shelf_life_days: shelf, origin_country: 'MA', currency: 'MAD',
    stock_qty: moq * 60, estimated_lead_days: 3, certifications: certs, nutri_score: nutri,
    avg_rating: rating, review_count: reviews,
  });
  if (epr) { chk(`produit ${name} / ${vn}`, epr); continue; }

  const { error: eti } = await sb.from('price_tiers').insert(
    tiers.map(([qty_min, unit_price]) => ({ product_id: pid, qty_min, unit_price })),
  );
  if (eti) chk(`paliers ${name} / ${vn}`, eti);

  if (lotDays != null) {
    const d = new Date(Date.now() + lotDays * 86400000).toISOString().slice(0, 10);
    const { error: elo } = await sb.from('product_lots').insert({
      product_id: pid, lot_number: `LOT-${d.replace(/-/g, '').slice(0, 6)}-${pid.slice(0, 4).toUpperCase()}`,
      qty_available: lotQty, expiry_date: d, active: true,
    });
    if (elo) chk(`lot ${name} / ${vn}`, elo);
  }
  created++;
}
console.log(`  → ${created} offres créées, ${skipped} déjà présentes`);

console.log('\n🏷️   Références EAN plateforme...');
{
  const rows = EAN_REFS.map(([ean, name, sd, cat, temp, nw, wu, certs, nutri, ps, sl]) => ({
    ean, name, short_description: sd, category_id: catId(cat), temperature: temp,
    net_weight: nw, weight_unit: wu, certifications: certs, nutri_score: nutri,
    pack_size: ps, shelf_life_days: sl, origin_country: 'MA',
    manufacturer_name: 'Marché MA (démo)', status: 'active', source: 'platform',
  }));
  const { error } = await sb.from('ean_references').upsert(rows, { onConflict: 'ean' });
  chk(`${rows.length} références EAN`, error);
}

// ─── Contrôle ──────────────────────────────────────────────────────────────
const q = async (sel, filt) => {
  let r = sb.from(sel).select('*', { count: 'exact', head: true });
  if (filt) r = filt(r);
  const { count } = await r;
  return count ?? 0;
};
const nOffers = await q('products', (r) => r.like('ean', '611900000%'));
const nRefs = await q('ean_references', (r) => r.like('ean', '611900000%'));
const { data: distinct } = await sb.from('products').select('ean').like('ean', '611900000%');
const nProd = new Set((distinct || []).map((x) => x.ean)).size;

console.log('\n' + '─'.repeat(60));
console.log(`✅  Terminé — ${ERRORS} erreur(s).`);
console.log(`   Fournisseurs   : 8 (+ 1 acheteur test « Restaurant Le Riad », Fès)`);
console.log(`   Offres         : ${nOffers}   (attendu 38)`);
console.log(`   Produits       : ${nProd}   (attendu 11)`);
console.log(`   Références EAN  : ${nRefs}   (attendu 11)`);
console.log(`\n   App → /buyer/compare → « Huile de table tournesol » (EAN 6119000000011)\n`);
process.exit(ERRORS > 0 ? 1 : 0);

/**
 * Stock212 — Seed « Marché marocain » V2 (grand catalogue multi-marques)
 *
 * Modèle :
 *   • ~105 produits GÉNÉRIQUES répartis sur ~22 catégories FMCG ;
 *   • chaque générique est décliné en 2 à 3 MARQUES → 1 EAN par (générique×marque) ;
 *   • chaque EAN de marque est distribué par 2 à 4 FOURNISSEURS (offres concurrentes).
 *   → le Comparateur compare les fournisseurs d'un même EAN de marque ;
 *   → prix / livraison / note / certifs / fraîcheur / ville varient d'une offre à l'autre.
 *
 * 100 % synthétique. Idempotent (UUID fixes, EAN déterministes `612…`, pré-check + upsert).
 * Complémentaire du premier seed (EAN `6119…`).
 *
 *   node scripts/seed-moroccan-market-v2.mjs <service_role_key>
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
    for (const line of readFileSync(join(__dir, '../.env'), 'utf8').split('\n')) {
      const t = line.trim(); if (!t || t.startsWith('#')) continue;
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
const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ─── PRNG déterministe ──────────────────────────────────────────────────────
const hash32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rngFor = (seed) => mulberry32(hash32(seed));
const round2 = (n) => Math.round(n * 100) / 100;
const pickK = (arr, k, seed) => { const r = rngFor(seed); return [...arr].sort(() => r() - 0.5).slice(0, k); };

// ─── Fournisseurs (8 existants + 12 nouveaux) ──────────────────────────────
const OID = (n) => `00000000-0000-0000-0000-2000000000${n}`;
const MID = (n) => `00000000-0000-0000-0000-3000000000${n}`;
const UID = (n) => `00000000-0000-0000-0000-1000000000${n}`;
const FLAT = (m) => ({ delivery_mode: 'flat_rate', flat_rate_mad: m, free_threshold_mad: null });
const FREE_AB = (m, t) => ({ delivery_mode: 'free_above_threshold', flat_rate_mad: m, free_threshold_mad: t });
const FREE_ALWAYS = { delivery_mode: 'free_always', flat_rate_mad: 0, free_threshold_mad: null };
const PCT = (r, mn, mx) => ({ delivery_mode: 'percentage', flat_rate_mad: 0, free_threshold_mad: null, percentage_rate: r, min_charge_mad: mn, max_charge_mad: mx });
const ALL_DRY = ['oil', 'flour', 'sugar', 'rice', 'pasta', 'spice', 'spread', 'biscuit', 'choco', 'yeast'];

const SELLERS = [
  { n: '50', name: 'Lesieur Cristal Distribution', city: 'Casablanca', region: 'Casablanca-Settat', sub: 'Fabricant', pf: 1.00, rating: 4.8, reviews: 210, certs: ['ONSSA', 'ISO 22000', 'HACCP'], del: FREE_AB(40, 1000), dom: ['oil', 'spread'] },
  { n: '51', name: 'Savola Maroc Négoce', city: 'Casablanca', region: 'Casablanca-Settat', sub: 'Importateur / Exportateur', pf: 1.01, rating: 4.3, reviews: 56, certs: ['ONSSA'], del: FLAT(45), dom: ['oil', 'sugar', 'flour', 'rice', 'pasta', 'drink', 'water'] },
  { n: '52', name: 'AtlasGros Rabat', city: 'Rabat', region: 'Rabat-Salé-Kénitra', sub: 'Grossiste', pf: 1.00, rating: 4.5, reviews: 88, certs: ['ONSSA', 'Halal'], del: FREE_AB(35, 1500), dom: [...ALL_DRY, 'drink', 'water', 'dairy', 'canned', 'fish'] },
  { n: '53', name: 'Fès Épicerie en Gros', city: 'Fès', region: 'Fès-Meknès', sub: 'Grossiste', pf: 0.99, rating: 4.0, reviews: 23, certs: [], del: FLAT(30), dom: [...ALL_DRY, 'drink', 'water', 'canned'] },
  { n: '54', name: 'Souss Distribution Agadir', city: 'Agadir', region: 'Souss-Massa', sub: 'Distributeur', pf: 0.98, rating: 4.4, reviews: 47, certs: ['ONSSA'], del: FLAT(25), dom: ['oil', 'flour', 'sugar', 'rice', 'pasta', 'drink', 'water', 'canned', 'fish'] },
  { n: '55', name: 'Coopérative Argan & Terroir', city: 'Marrakech', region: 'Marrakech-Safi', sub: 'Coopérative', pf: 0.97, rating: 4.9, reviews: 15, certs: ['Bio AB', 'Ecocert', 'ONSSA'], del: FREE_ALWAYS, dom: ['oil', 'spread', 'spice'] },
  { n: '56', name: 'Nord Trading Tanger', city: 'Tanger', region: 'Tanger-Tétouan', sub: 'Importateur / Exportateur', pf: 1.00, rating: 4.2, reviews: 34, certs: ['ONSSA'], del: PCT(0.04, 20, 60), dom: ['canned', 'fish', 'drink', 'biscuit', 'choco', 'rice', 'pasta'] },
  { n: '57', name: 'Oriental Foods Oujda', city: 'Oujda', region: 'Oriental', sub: 'Distributeur', pf: 1.01, rating: 3.9, reviews: 9, certs: [], del: FLAT(35), dom: [...ALL_DRY, 'drink', 'canned', 'cleanhome'] },
  { n: '59', name: 'Grossisterie Chaouia', city: 'Settat', region: 'Casablanca-Settat', sub: 'Grossiste', pf: 0.99, rating: 4.3, reviews: 61, certs: ['ONSSA'], del: FLAT(30), dom: [...ALL_DRY, 'drink', 'water', 'canned', 'fish', 'dairy'] },
  { n: '60', name: 'Meknès Foods', city: 'Meknès', region: 'Fès-Meknès', sub: 'Distributeur', pf: 0.97, rating: 4.1, reviews: 28, certs: [], del: FLAT(28), dom: [...ALL_DRY, 'drink', 'canned'] },
  { n: '61', name: 'Gharb Distribution', city: 'Kénitra', region: 'Rabat-Salé-Kénitra', sub: 'Grossiste', pf: 1.00, rating: 4.4, reviews: 73, certs: ['ONSSA', 'Halal'], del: FREE_AB(35, 1200), dom: [...ALL_DRY, 'drink', 'water', 'canned', 'fish', 'dairy', 'cleanhome'] },
  { n: '62', name: 'Safi Marée & Conserves', city: 'Safi', region: 'Marrakech-Safi', sub: 'Fabricant', pf: 0.94, rating: 4.6, reviews: 54, certs: ['ONSSA', 'HACCP', 'MSC'], del: FLAT(30), dom: ['fish', 'canned'] },
  { n: '63', name: 'Tadla AgroGros', city: 'Béni Mellal', region: 'Béni Mellal-Khénifra', sub: 'Coopérative', pf: 0.98, rating: 4.5, reviews: 22, certs: ['ONSSA', 'Bio AB'], del: FREE_ALWAYS, dom: ['oil', 'spread', 'spice', 'flour', 'pasta', 'rice'] },
  { n: '64', name: 'Détergence Pro Maroc', city: 'Casablanca', region: 'Casablanca-Settat', sub: 'Fabricant', pf: 0.96, rating: 4.2, reviews: 40, certs: ['ISO 9001'], del: FREE_AB(45, 1000), dom: ['cleanhome', 'cleanbody', 'hygiene'] },
  { n: '65', name: 'EmballagePlus', city: 'Casablanca', region: 'Casablanca-Settat', sub: 'Fabricant', pf: 1.02, rating: 4.0, reviews: 33, certs: ['ISO 9001'], del: FLAT(40), dom: ['packaging', 'hygiene'] },
  { n: '66', name: 'Nord Froid Tétouan', city: 'Tétouan', region: 'Tanger-Tétouan', sub: 'Spécialiste chaîne du froid', pf: 1.03, rating: 4.7, reviews: 58, certs: ['ONSSA', 'HACCP'], del: FLAT(50), dom: ['frozen', 'meat', 'dairy', 'cheese', 'butter'] },
  { n: '67', name: 'Doukkala Lait', city: 'El Jadida', region: 'Casablanca-Settat', sub: 'Fabricant', pf: 0.95, rating: 4.6, reviews: 91, certs: ['ONSSA', 'ISO 22000'], del: FREE_AB(35, 900), dom: ['dairy', 'butter', 'cheese'] },
  { n: '68', name: 'Oriental Distrib Nador', city: 'Nador', region: 'Oriental', sub: 'Distributeur', pf: 1.01, rating: 3.8, reviews: 12, certs: [], del: FLAT(38), dom: [...ALL_DRY, 'drink', 'canned', 'cleanhome'] },
  { n: '69', name: 'Marrakech Épices & Terroir', city: 'Marrakech', region: 'Marrakech-Safi', sub: 'Coopérative', pf: 0.97, rating: 4.8, reviews: 26, certs: ['Bio AB', 'Ecocert', 'ONSSA'], del: FREE_ALWAYS, dom: ['spice', 'spread', 'oil'] },
  { n: '70', name: 'Atlas Boissons', city: 'Casablanca', region: 'Casablanca-Settat', sub: 'Distributeur', pf: 0.98, rating: 4.4, reviews: 80, certs: ['ONSSA'], del: FREE_AB(40, 1500), dom: ['drink', 'water'] },
];
const NEW_NS = ['59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70'];
const PERSONS = { 59: 'Hicham Ziani', 60: 'Sara El Amrani', 61: 'Mounir Bouchta', 62: 'Rania Sqalli', 63: 'Abdellah Ouhadi', 64: 'Ilham Naciri', 65: 'Otmane Belrhiti', 66: 'Widad Aattar', 67: 'Jamal Doukkali', 68: 'Soufiane Rmiki', 69: 'Kenza El Glaoui', 70: 'Anas Tahiri' };
const ADDR = { 59: 'Quartier Industriel', 60: 'Zone Industrielle Mejat', 61: 'Zone Industrielle Bir Rami', 62: 'Zone Portuaire', 63: 'Route de Fkih Ben Salah', 64: 'Zone Industrielle Sidi Bernoussi', 65: 'Zone Industrielle Moulay Rachid', 66: 'Zone Industrielle Martil', 67: 'Zone Industrielle El Jadida', 68: 'Zone Industrielle Selouane', 69: 'Sidi Ghanem', 70: 'Zone Industrielle Aïn Sebaâ' };

// ─── Domaine → catégorie / température / nutri / marques ────────────────────
const CAT_OF = { oil: 'Huiles alimentaires', flour: 'Farines', sugar: 'Sucre', rice: 'Riz et legumineuses', pasta: 'Pates et Couscous', spice: 'Epices', spread: 'Confitures, Miel et Pates à tartiner', drink: 'Boissons et Jus', water: 'Eaux minerales et de table', dairy: 'Produits laitiers', butter: 'Beurre', cheese: 'Fromages', fish: 'Conserves poissons', canned: 'Conserves fruits et légumes', biscuit: 'Biscuiterie et Confiserie', choco: 'Chocolat professionnel', yeast: 'Levure et améliorants', meat: 'Viandes', frozen: 'Surgelés', cleanhome: 'Nettoyage maison, linge et vaisselle', cleanbody: 'Nettoyage corporel', hygiene: 'Hygiène', packaging: 'Emballages' };
const TEMP_OF = { butter: 'refrigerated', cheese: 'refrigerated', meat: 'frozen', frozen: 'frozen' };
const NUTRI_OF = { oil: 'D', sugar: 'E', flour: 'A', rice: 'A', pasta: 'B', spread: 'D', drink: 'D', dairy: 'B', butter: 'E', cheese: 'D', fish: 'B', canned: 'B', biscuit: 'D', choco: 'E' };
const PERISH = new Set(['dairy', 'butter', 'cheese', 'meat', 'frozen']);

// Pool de marques par domaine (démo — marques marocaines plausibles + génériques)
const BRAND_POOL = {
  oil: ['Lesieur', 'Afia', 'Oued Souss', 'Al Horra', 'Huilor'],
  flour: ['Tria', 'Samine', 'Dari', 'Al Wadifa'],
  sugar: ['Cosumar', 'Sucrunion'],
  rice: ['Tilda', 'Manar', 'Basmati Gold', 'Riz Aicha'],
  pasta: ['Tria', 'Dari', 'Panzani', 'Alimenta'],
  spice: ['La Perle', 'Épices du Souk', 'Ras Dar', 'Zwina'],
  spread: ['Aïcha', 'Marrakech', 'Les Doukkala', 'Terroir'],
  drink: ['Coca-Cola', "Pom's", 'Valpina', 'Marrakech Cola', 'Carrion'],
  water: ['Sidi Ali', 'Aïn Saïss', 'Oulmès', 'Bahia', 'Ciel'],
  dairy: ['Centrale Danone', 'Jaouda', 'Jibal', 'Chergui'],
  butter: ['Président', 'Jibal', 'Copag', 'Doukkala'],
  cheese: ['La Vache qui rit', 'Jibal', 'Doukkala', 'Président'],
  fish: ['Aïcha', 'Titus', 'Joséda', 'Robinson', 'Al Manar'],
  canned: ['Aïcha', 'Zine', 'Conserves de Meknès', 'Delassus'],
  biscuit: ['Bimo', 'Excelo', "Henry's", 'Merendina'],
  choco: ['Aiguebelle', 'Barry', 'Cémoi'],
  yeast: ['Rafiaa', 'Nirvana', 'Jaya'],
  meat: ['Koutoubia', 'Dislog Meat', 'Zalagh', 'Aïn Sebaâ Volaille'],
  frozen: ['Findus', 'Gel Frais', 'McCain', 'Aïcha Surgelés'],
  cleanhome: ['Tide', 'Ariel', 'Omo', 'Star', 'Isis'],
  cleanbody: ['Dove', 'Lux', 'Taous', 'Nivea'],
  hygiene: ['Zina', 'Fine', 'Softy', 'Sopalin'],
  packaging: ['Mafopac', 'GreenPack', 'EmballageMaroc'],
};
const BRAND_MULT = [1.06, 1.0, 0.94, 0.9, 0.88]; // premium → premier prix, selon rang dans le pool

// Catalogue générique : [domaine, nom, moq, pack, shelfDays, prixBaseUnitaireMAD]
const CATALOG = [
  ['oil', 'Huile d\'olive vierge extra 5L', 2, 1, 540, 480], ['oil', 'Huile de tournesol 5L', 4, 1, 540, 175], ['oil', 'Huile de grignons d\'olive 5L', 4, 1, 540, 260], ['oil', 'Huile de friture HORECA 25L', 1, 1, 365, 950], ['oil', 'Huile de soja raffinée 10L', 2, 1, 365, 340],
  ['flour', 'Farine de blé T55 25kg', 2, 1, 365, 220], ['flour', 'Farine pâtissière T45 25kg', 2, 1, 365, 245], ['flour', 'Farine complète 10kg', 3, 1, 365, 130], ['flour', 'Semoule de blé dur fine 25kg', 2, 1, 365, 210],
  ['sugar', 'Sucre granulé blanc 50kg', 1, 1, 730, 600], ['sugar', 'Sucre en morceaux 5kg x4', 4, 4, 730, 210], ['sugar', 'Sucre glace 1kg x10', 6, 10, 540, 180], ['sugar', 'Sucre roux 1kg x10', 6, 10, 540, 220],
  ['rice', 'Riz long grain 25kg', 1, 1, 720, 430], ['rice', 'Riz basmati 20kg', 1, 1, 720, 520], ['rice', 'Lentilles blondes 25kg', 1, 1, 720, 560], ['rice', 'Pois chiches 25kg', 1, 1, 720, 540], ['rice', 'Haricots blancs 25kg', 1, 1, 720, 520],
  ['pasta', 'Couscous moyen 10kg', 2, 1, 540, 110], ['pasta', 'Spaghetti n°5 500g x24', 6, 24, 720, 145], ['pasta', 'Coquillettes 500g x24', 6, 24, 720, 135], ['pasta', 'Vermicelle cheveux d\'ange 250g x40', 6, 40, 540, 160],
  ['spice', 'Ras el hanout 1kg', 6, 1, 540, 120], ['spice', 'Cumin moulu 1kg', 6, 1, 540, 95], ['spice', 'Paprika doux 1kg', 6, 1, 540, 90], ['spice', 'Curcuma moulu 1kg', 6, 1, 540, 85], ['spice', 'Poivre noir moulu 1kg', 6, 1, 540, 210], ['spice', 'Safran filaments 10g', 6, 1, 540, 380],
  ['spread', 'Confiture abricot 370g x12', 6, 12, 720, 95], ['spread', 'Miel toutes fleurs 1kg x6', 3, 6, 900, 480], ['spread', 'Pâte à tartiner cacao-noisette 3kg', 2, 1, 365, 210], ['spread', 'Amlou aux amandes 500g x6', 3, 6, 365, 260],
  ['drink', 'Cola 33cl x24', 6, 24, 365, 130], ['drink', 'Jus d\'orange 1L x12', 6, 12, 300, 145], ['drink', 'Boisson gazeuse citron 1,5L x6', 6, 6, 365, 90], ['drink', 'Thé vert Gunpowder 1kg', 12, 1, 720, 92], ['drink', 'Café moulu robusta 1kg', 6, 1, 365, 74], ['drink', 'Nectar abricot 1L x12', 6, 12, 300, 150],
  ['water', 'Eau plate 1,5L x6', 12, 6, 365, 26], ['water', 'Eau plate 0,5L x12', 12, 12, 365, 30], ['water', 'Eau gazeuse 1L x6', 12, 6, 365, 42], ['water', 'Bonbonne eau 5L x4', 6, 4, 365, 55],
  ['dairy', 'Lait UHT demi-écrémé 1L x12', 6, 12, 90, 130], ['dairy', 'Lait UHT entier 1L x12', 6, 12, 90, 138], ['dairy', 'Yaourt nature brassé 110g x16', 12, 16, 30, 85], ['dairy', 'Lait en poudre écrémé 25kg', 1, 1, 540, 1450], ['dairy', 'Crème UHT 1L x12', 6, 12, 120, 190],
  ['butter', 'Beurre doux plaquette 250g x40', 2, 40, 120, 620], ['butter', 'Beurre pâtissier tourage 1kg x10', 2, 10, 120, 720], ['butter', 'Smen beurre fermenté 1kg x6', 3, 6, 180, 380],
  ['cheese', 'Fromage fondu 16 portions x24', 4, 24, 180, 260], ['cheese', 'Edam bloc 3kg', 2, 1, 120, 195], ['cheese', 'Mozzarella pizza 2,5kg', 2, 1, 90, 175], ['cheese', 'Gouda tranches 1kg x10', 3, 10, 90, 290],
  ['fish', 'Sardines à l\'huile végétale 125g x50', 24, 50, 1460, 520], ['fish', 'Sardines à l\'huile d\'olive 125g x50', 24, 50, 1460, 640], ['fish', 'Thon listao à l\'huile 160g x48', 24, 48, 1460, 780], ['fish', 'Maquereaux sauce tomate 200g x24', 12, 24, 1095, 360], ['fish', 'Pilchards 425g x24', 12, 24, 1095, 420],
  ['canned', 'Double concentré de tomate 800g x12', 6, 12, 900, 140], ['canned', 'Tomates pelées 400g x24', 6, 24, 900, 180], ['canned', 'Petits pois carottes 800g x12', 6, 12, 900, 165], ['canned', 'Haricots verts extra-fins 800g x12', 6, 12, 900, 195], ['canned', 'Macédoine de légumes 800g x12', 6, 12, 900, 150], ['canned', 'Olives vertes dénoyautées 5kg', 2, 1, 540, 210],
  ['biscuit', 'Biscuits sablés vrac 4kg', 2, 1, 240, 180], ['biscuit', 'Gaufrettes vanille 2kg', 3, 1, 240, 95], ['biscuit', 'Petit-beurre 200g x40', 6, 40, 300, 260], ['biscuit', 'Madeleines longues x60', 4, 60, 120, 175],
  ['choco', 'Chocolat noir 55% pistoles 5kg', 2, 1, 365, 460], ['choco', 'Chocolat lait couverture 5kg', 2, 1, 365, 490], ['choco', 'Cacao poudre non sucré 1kg x10', 3, 10, 540, 380], ['choco', 'Pâte à glacer brune 5kg', 2, 1, 365, 320],
  ['yeast', 'Levure boulangère sèche 500g x20', 3, 20, 540, 320], ['yeast', 'Levure chimique 100g x50', 4, 50, 540, 210], ['yeast', 'Améliorant de panification 10kg', 2, 1, 365, 280], ['yeast', 'Bicarbonate alimentaire 1kg x12', 4, 12, 720, 120],
  ['meat', 'Merguez surgelées 2kg', 4, 1, 180, 190], ['meat', 'Kefta boulettes surgelées 2,5kg', 4, 1, 180, 210], ['meat', 'Escalope de dinde surgelée 2kg', 4, 1, 240, 175], ['meat', 'Cordon bleu volaille 2kg x5', 2, 5, 240, 320], ['meat', 'Viande hachée 15% surgelée 2kg', 4, 1, 180, 230],
  ['frozen', 'Frites 9mm 2,5kg x4', 2, 4, 365, 210], ['frozen', 'Légumes wok 2,5kg', 3, 1, 365, 150], ['frozen', 'Pâte feuilletée 230g x10', 3, 10, 240, 130], ['frozen', 'Petits pains briochés surgelés x60', 3, 60, 180, 160],
  ['cleanhome', 'Liquide vaisselle 5L x4', 2, 4, 900, 220], ['cleanhome', 'Lessive poudre 15kg', 2, 1, 900, 260], ['cleanhome', 'Eau de javel 2L x9', 4, 9, 365, 95], ['cleanhome', 'Nettoyant sol 5L x4', 2, 4, 900, 180], ['cleanhome', 'Dégraissant cuisine 750ml x12', 3, 12, 900, 240],
  ['cleanbody', 'Savon liquide mains 5L x4', 2, 4, 900, 210], ['cleanbody', 'Gel douche 5L x4', 2, 4, 900, 240], ['cleanbody', 'Shampoing 5L x4', 2, 4, 900, 260], ['cleanbody', 'Savon de Marseille 300g x48', 3, 48, 1095, 320],
  ['hygiene', 'Papier hygiénique 2 plis x96', 2, 96, 1825, 380], ['hygiene', 'Essuie-tout maxi x18', 4, 18, 1825, 260], ['hygiene', 'Serviettes cocktail x9000', 1, 9000, 1825, 220], ['hygiene', 'Gants nitrile M x1000', 2, 1000, 1095, 290],
  ['packaging', 'Barquette alu 1000ml x400', 2, 400, 1825, 340], ['packaging', 'Sac kraft 2kg x1000', 2, 1000, 1825, 180], ['packaging', 'Film étirable 45cmx300m x6', 4, 6, 1825, 260], ['packaging', 'Gobelet carton 24cl x2000', 2, 2000, 1825, 310], ['packaging', 'Boîte pizza 33cm x100', 4, 100, 1825, 190],
];

// ─── Helpers DB ────────────────────────────────────────────────────────────
let ERRORS = 0;
const note = (l, e) => { if (e) { ERRORS++; console.log(`  ✖ ${l}: ${(e.message || e).toString().slice(0, 140)}`); } };
async function chunkedInsert(table, rows, size = 400) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + size));
    note(`${table}[${i}..${i + size}]`, error);
  }
}
const userCache = new Map();
async function primeUsers() {
  for (let page = 1; ; page++) {
    const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200&page=${page}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const d = await r.json();
    for (const u of d.users || []) userCache.set(u.email, u.id);
    if (!d.users || d.users.length < 200) break;
  }
}
async function ensureUser(id, email, full_name) {
  if (userCache.has(email)) return userCache.get(email);
  const r = await fetch(`${URL}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, email, password: 'Test1234!', email_confirm: true, user_metadata: { full_name } }) });
  if (r.ok) { const d = await r.json(); userCache.set(email, d.id); return d.id; }
  const b = await r.text();
  if (r.status === 422 || /already|registered|exists/i.test(b)) { await primeUsers(); if (userCache.has(email)) return userCache.get(email); }
  throw new Error(`user ${email}: ${r.status} ${b.slice(0, 120)}`);
}

// ─── Run ───────────────────────────────────────────────────────────────────
console.log(`\n🇲🇦  Seed marché MA V2 — multi-marques → ${URL}\n`);

const { data: cats } = await sb.from('categories').select('id, name');
const catId = (n) => (cats || []).find((c) => c.name === n)?.id ?? null;

// 1) Marques : upsert le pool complet puis récupère les ids
const allBrandNames = [...new Set(Object.values(BRAND_POOL).flat())];
await sb.from('brands').upsert(allBrandNames.map((name) => ({ name })), { onConflict: 'name' }).then(({ error }) => note('brands', error));
const { data: brandRows } = await sb.from('brands').select('id, name');
const brandId = (n) => (brandRows || []).find((b) => b.name === n)?.id ?? null;
console.log(`  ✓ ${allBrandNames.length} marques dans le pool`);

// 2) Fournisseurs nouveaux
console.log('\n👤  Fournisseurs (12 nouveaux)...');
await primeUsers();
for (const s of SELLERS.filter((x) => NEW_NS.includes(x.n))) {
  let uid;
  try { uid = await ensureUser(UID(s.n), `mkt-v2-${s.n}@stock212.test`, PERSONS[s.n]); } catch (e) { note(`user ${s.n}`, e); continue; }
  await sb.from('profiles').upsert({ id: uid, full_name: PERSONS[s.n], preferred_lang: 'fr', preferred_currency: 'MAD', gdpr_consent: true, onboarding_done: true }, { onConflict: 'id' });
  const { error: eo } = await sb.from('organisations').upsert({ id: OID(s.n), name: s.name, org_type: 'seller', sub_type: s.sub, country: 'MA', address_line1: ADDR[s.n], city: s.city, postal_code: '00000', region: s.region, validation_status: 'active' }, { onConflict: 'id' });
  const { error: em } = await sb.from('organisation_members').upsert({ id: MID(s.n), organisation_id: OID(s.n), user_id: uid, team_role: 'owner', active: true }, { onConflict: 'organisation_id,user_id' });
  const { error: ep } = await sb.from('seller_profiles').upsert({ organisation_id: OID(s.n), certifications: s.certs, accepted_payment_terms: ['prepayment', '30_days'], default_prep_days: 3, avg_rating: s.rating, review_count: s.reviews }, { onConflict: 'organisation_id' });
  const { error: ed } = await sb.from('vendor_delivery_config').upsert({ seller_org_id: OID(s.n), ...s.del, notes: 'V2' }, { onConflict: 'seller_org_id' });
  note(`${s.name} (${s.city})`, eo || em || ep || ed);
}

// 3) Génération : générique → marques → fournisseurs
const { data: existRows } = await sb.from('products').select('seller_org_id, ean').like('ean', '612%');
const existSet = new Set((existRows || []).map((r) => `${r.seller_org_id}|${r.ean}`));

console.log('\n📦  Génération : 2–3 marques par produit, 2–4 fournisseurs par marque...');
const products = [], tiers = [], lots = [], eanRefs = [];
let gi = 0, nBrandedEans = 0, nOffers = 0;

for (const [dom, gname, moq, pack, shelf, base] of CATALOG) {
  gi++;
  const cat = CAT_OF[dom], temp = TEMP_OF[dom] || 'ambient', nutri = NUTRI_OF[dom] || null;
  const pool = BRAND_POOL[dom] || [];
  const candidates = SELLERS.filter((s) => s.dom.includes(dom));
  if (pool.length < 2 || candidates.length < 2) continue;

  const nBrands = 2 + Math.floor(rngFor('nb|' + gname)() * Math.min(2, pool.length - 1)); // 2..3
  const brands = pickK(pool, nBrands, 'br|' + gname);

  brands.forEach((brand) => {
    const bi = pool.indexOf(brand) + 1;
    const ean = '612' + String(gi).padStart(3, '0') + String(bi).padStart(2, '0') + '00000';
    const bmult = BRAND_MULT[Math.min(bi - 1, BRAND_MULT.length - 1)];
    const dispName = `${brand} ${gname}`;
    nBrandedEans++;

    eanRefs.push({ ean, name: dispName, short_description: dispName, category_id: catId(cat), brand_id: brandId(brand), temperature: temp, weight_unit: 'g', certifications: ['ONSSA'], nutri_score: nutri, pack_size: pack, shelf_life_days: shelf, origin_country: 'MA', manufacturer_name: `${brand} (démo)`, status: 'active', source: 'platform' });

    const k = 2 + Math.floor(rngFor(`k|${ean}`)() * Math.min(3, candidates.length - 1)); // 2..4
    const chosen = pickK(candidates, k, `pick|${ean}`);
    const shortLot = chosen[Math.floor(rngFor(`sl|${ean}`)() * chosen.length)].n;

    for (const s of chosen) {
      if (existSet.has(`${OID(s.n)}|${ean}`)) continue;
      const r = rngFor(`px|${ean}|${s.n}`);
      const unit = round2(base * bmult * s.pf * (0.955 + r() * 0.09));
      const q2 = base >= 300 ? 5 : 10, q3 = q2 * 4;
      const pid = randomUUID();
      products.push({ id: pid, seller_org_id: OID(s.n), name: dispName, short_description: `${dispName} — ${s.city}`, category_id: catId(cat), brand_id: brandId(brand), ean, status: 'active', moq, pack_size: pack, temperature: temp, shelf_life_days: shelf, origin_country: 'MA', currency: 'MAD', stock_qty: moq * (40 + Math.floor(r() * 80)), estimated_lead_days: 1 + Math.floor(r() * 6), certifications: s.certs, nutri_score: nutri, avg_rating: s.rating, review_count: s.reviews });
      tiers.push({ product_id: pid, qty_min: 1, unit_price: unit }, { product_id: pid, qty_min: q2, unit_price: round2(unit * 0.94) }, { product_id: pid, qty_min: q3, unit_price: round2(unit * 0.87) });
      if (PERISH.has(dom)) {
        const days = s.n === shortLot ? 12 + Math.floor(rngFor(`sd|${ean}|${s.n}`)() * 16) : 25 + Math.floor(rngFor(`ld|${ean}|${s.n}`)() * 200);
        const d = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        lots.push({ product_id: pid, lot_number: `LOT-${d.replace(/-/g, '').slice(0, 6)}-${pid.slice(0, 4).toUpperCase()}`, qty_available: moq * 30, expiry_date: d, active: true });
      }
      nOffers++;
    }
  });
}

console.log(`  → ${CATALOG.length} génériques · ${nBrandedEans} EAN de marque · ${nOffers} offres · ${tiers.length} paliers · ${lots.length} lots`);
await sb.from('ean_references').upsert(eanRefs, { onConflict: 'ean' }).then(({ error }) => note('ean_references', error));
await chunkedInsert('products', products);
await chunkedInsert('price_tiers', tiers);
await chunkedInsert('product_lots', lots);

// ─── Contrôle ──────────────────────────────────────────────────────────────
const cnt = async (t, f) => { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count ?? 0; };
const tot = await cnt('products', (q) => q.or('ean.like.6119%,ean.like.612%'));
const { data: de } = await sb.from('products').select('ean, brand_id, seller_org_id').like('ean', '612%');
console.log('\n' + '─'.repeat(60));
console.log(`✅  V2 terminé — ${ERRORS} erreur(s).`);
console.log(`   Offres marché MA (6119 + 612)      : ${tot}`);
console.log(`   EAN de marque V2 distincts         : ${new Set((de || []).map((x) => x.ean)).size}`);
console.log(`   Marques V2 utilisées               : ${new Set((de || []).map((x) => x.brand_id)).size}`);
console.log(`   Fournisseurs V2 actifs             : ${new Set((de || []).map((x) => x.seller_org_id)).size}`);
console.log(`\n   App → /buyer/compare → ex. « Lesieur Huile de tournesol », « Sidi Ali Eau plate », « Koutoubia Merguez »…\n`);
process.exit(ERRORS ? 1 : 0);

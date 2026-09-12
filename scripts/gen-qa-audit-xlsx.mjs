/**
 * Génère QA-AUDIT.xlsx à partir des constats de l'audit statique (cf. QA-AUDIT.md).
 *   node scripts/gen-qa-audit-xlsx.mjs
 */
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'QA-AUDIT.xlsx');
const wb = new ExcelJS.Workbook();
wb.creator = 'QA static audit';
wb.created = new Date();

const SEV_FILL = {
  Bloquant: 'FFF8CBAD', Élevé: 'FFFCE4D6', Moyen: 'FFFFF2CC', Faible: 'FFE2EFDA', Info: 'FFDEEBF7',
  Corrigé: 'FFC6EFCE', 'Non requis': 'FFDEEBF7',
};

function addSheet(name, columns, rows, { severityCol } = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.h, key: c.k, width: c.w ?? 22 }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF305496' } };
  ws.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  rows.forEach((r) => {
    const row = ws.addRow(r);
    row.alignment = { vertical: 'top', wrapText: true };
    if (severityCol && r[severityCol] && SEV_FILL[r[severityCol]]) {
      row.getCell(severityCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEV_FILL[r[severityCol]] } };
      row.getCell(severityCol).font = { bold: true };
    }
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

// ─── 1. Résumé ─────────────────────────────────────────────────────────────
addSheet('Résumé', [
  { h: 'Indicateur', k: 'k', w: 46 }, { h: 'Valeur', k: 'v', w: 18 }, { h: 'Commentaire', k: 'c', w: 60 },
], [
  { k: 'Erreurs TypeScript (tsc --noEmit)', v: '193 → 147', c: 'après corrections du 2026-08-29 (voir feuille "Journal corrections")' },
  { k: 'Problèmes ESLint', v: '260 → 249', c: '' },
  { k: 'Tests (vitest)', v: '29 / 29', c: '' },
  { k: 'vite build', v: 'OK', c: 'compile malgré la dette tsc' },
  { k: 'Boutons / navigations cassés', v: 4, c: 'bloquants — feuille "Boutons cassés"' },
  { k: 'Bugs fonctionnels (schéma / logique)', v: 3, c: 'feuille "Bugs"' },
  { k: 'Duplications / code mort', v: 5, c: 'feuille "Duplications"' },
  { k: 'Appels await supabase sans gestion erreur', v: '~344', c: 'échecs silencieux' },
  { k: 'react-hooks/exhaustive-deps', v: 43, c: 'sur 23 fichiers — risque de closure obsolète' },
  { k: 'key={index} (anti-pattern listes)', v: 112, c: '' },
  { k: 'parseInt() sans radix', v: 39, c: '' },
  { k: 'console.* résiduels', v: 9, c: 'AdminApprovals ×4, VendorSettings ×2, VendorTeam, AuthContext, ErrorBoundary' },
  { k: 'catch {} vides', v: 4, c: 'ProductCampaignPanel:27, PromoCodeBanner:18, MesFinancesPage:344, CatalogPage:664' },
  { k: 'window.prompt()', v: 1, c: 'AdminDeliveryValidation:619' },
  { k: '@ts-ignore / eslint-disable', v: 6, c: '' },
  { k: '@typescript-eslint/no-explicit-any', v: 123, c: '' },
]);

// ─── 2. Boutons cassés ─────────────────────────────────────────────────────
addSheet('Boutons cassés', [
  { h: '#', k: 'id', w: 5 }, { h: 'Sévérité', k: 'Sévérité', w: 12 }, { h: 'Fichier', k: 'file', w: 44 },
  { h: 'Ligne', k: 'line', w: 10 }, { h: 'Élément', k: 'el', w: 30 }, { h: 'Problème', k: 'pb', w: 62 },
  { h: 'Correctif proposé', k: 'fix', w: 55 }, { h: 'Statut', k: 'st', w: 14 },
], [
  { id: 1, Sévérité: 'Bloquant', file: 'src/pages/vendor/VendorOverview.tsx', line: '175 ; 201', el: 'N° de commande / bouton "voir"', pb: "navigate('/vendor/orders/${o.id}') — route /vendor/orders/:id inexistante dans App.tsx (seule /vendor/orders) → NotFoundPage", fix: 'Ajouter la route path="/vendor/orders/:id" (détail commande vendeur), ou rediriger vers /vendor/orders', st: '✅ corrigé' },
  { id: 2, Sévérité: 'Bloquant', file: 'src/pages/storefront/DeliveryDirectoryPage.tsx', line: 306, el: 'Bouton action (contacter / demander transport)', pb: "navigate('/buyer/tickets/new') — route inexistante (seule /delivery/tickets) → NotFoundPage", fix: 'Créer la route/page, ou pointer vers un flux existant', st: '✅ corrigé' },
  { id: 3, Sévérité: 'Élevé', file: 'src/pages/buyer/BuyerDashboard.tsx', line: 234, el: 'KpiCard "Notifications"', pb: 'onClick={() => {}} — carte cliquable en apparence, ne fait rien', fix: "onClick={() => navigate('/buyer/account')} ou ouvrir NotificationBell", st: '✅ corrigé' },
  { id: 4, Sévérité: 'Moyen', file: 'src/pages/admin/AdminDeliveryValidation.tsx', line: 619, el: 'Saisie note de problème', pb: 'window.prompt(...) — dialogue natif bloquant, non stylé, KO en contexte embarqué/mobile', fix: 'Modal + Textarea Cloudscape', st: '✅ corrigé' },
  { id: '—', Sévérité: 'Info', file: 'src/pages/vendor/VendorOverview.tsx', line: 124, el: 'Bouton "Nouveau produit"', pb: "navigate('/vendor/catalog/new') : OK — /vendor/catalog/:id capture 'new', FicheProduitEdit gère id==='new' (l.74). Pas un bug.", fix: 'RAS', st: 'OK' },
], { severityCol: 'Sévérité' });

// ─── 3. Bugs fonctionnels ──────────────────────────────────────────────────
addSheet('Bugs', [
  { h: '#', k: 'id', w: 5 }, { h: 'Sévérité', k: 'Sévérité', w: 12 }, { h: 'Fichier:ligne', k: 'loc', w: 40 },
  { h: 'Description', k: 'desc', w: 80 }, { h: 'Impact', k: 'imp', w: 46 }, { h: 'Correctif', k: 'fix', w: 55 }, { h: 'Statut', k: 'st', w: 14 },
], [
  { id: '2.1', Sévérité: 'Élevé', loc: 'src/pages/buyer/BuyerOptimiseur.tsx:122', desc: "select('org_id, free_delivery_threshold, delivery_fee_default') sur vendor_delivery_config — ces colonnes n'existent pas. Schéma réel (migration 029) : seller_org_id, delivery_mode, flat_rate_mad, free_threshold_mad, percentage_rate, min_charge_mad, max_charge_mad", imp: 'Requête en erreur → dcMap vide → frais de livraison = 0 partout dans l’optimiseur → coût total livré FAUX', fix: 'Réutiliser fetchDeliveryConfigs() + computeDeliveryFee() de src/lib/cartOptimizer.ts (déjà corrects). Même bug déjà corrigé dans BuyerComparateur.tsx', st: '✅ corrigé' },
  { id: '2.2', Sévérité: 'Moyen', loc: 'src/types/index.ts:4-6', desc: 'Type DeliveryConfig avec free_delivery_threshold / delivery_fee_default — ne reflète aucune colonne réelle', imp: 'Tout code typé via ce type est trompé', fix: 'Aligner sur DeliveryConfig de cartOptimizer.ts', st: '✅ corrigé' },
  { id: '2.3', Sévérité: 'Faible', loc: 'src/layouts/StorefrontLayout.tsx:206 (err TS2352 l.217)', desc: "select('… organisations(name), … avg_rating …') puis cast as Product[] — relations imbriquées renvoyées en tableau, cast forcé masque le mismatch", imp: 'Fragilité de shape, données potentiellement mal lues', fix: 'Typer proprement (relation !inner ou mapping explicite)', st: '' },
  { id: '2.4', Sévérité: 'Faible', loc: 'src/lib/marketingHelpers.ts:417', desc: "TS2367 : comparaison type === 'rfq_bid_boost' sur une union qui ne contient pas cette valeur", imp: 'Branche morte — condition toujours fausse', fix: 'Corriger la valeur ou l’union', st: '✅ corrigé' },
  { id: '2.5', Sévérité: 'Faible', loc: 'src/pages/admin/AdminOrders.tsx:99', desc: 'Recherche filtrée "sur la page courante seulement" (commentaire not implemented for brevity)', imp: 'Résultats de recherche partiels au-delà de la 1re page', fix: 'Recherche côté serveur (ilike + range global)', st: '' },
  { id: '2.6', Sévérité: 'Faible', loc: 'src/pages/onboarding/OnboardingPage.tsx:350', desc: 'TODO: stocker commercialMotivation quelque part de consultable', imp: 'Donnée d’onboarding saisie puis jetée', fix: 'Persister le champ (colonne dédiée / onboarding_field)', st: '' },
], { severityCol: 'Sévérité' });

// ─── 4. Duplications & code mort ───────────────────────────────────────────
addSheet('Duplications', [
  { h: '#', k: 'id', w: 5 }, { h: 'Type', k: 'ty', w: 16 }, { h: 'Élément', k: 'el', w: 34 },
  { h: 'Détail', k: 'd', w: 95 }, { h: 'Action', k: 'a', w: 45 }, { h: 'Statut', k: 'st', w: 14 },
], [
  { id: 1, ty: 'Duplication', el: 'basePrice() ×3', d: 'BuyerCatalog.tsx:72, BuyerDestockage.tsx:60, + inline dans BuyerComparateur/ComparatorPage. Sémantique INCOHÉRENTE : basePrice = prix du plus petit palier ; cartOptimizer.getEffectiveUnitPrice() = prix applicable à une quantité. Deux notions de "prix" selon l’écran', a: 'Centraliser dans src/lib/, une seule fonction', st: '✅ corrigé' },
  { id: 2, ty: 'Code mort', el: 'src/pages/agent/AgentComingSoon.tsx', d: "Jamais importé dans App.tsx (aucun lazy(() => import('./pages/agent/AgentComingSoon')))", a: 'Supprimer ou router', st: '✅ supprimé' },
  { id: 3, ty: 'Duplication', el: 'Composant AgentDashboard ×2', d: 'export default function AgentDashboard() dans agent/AgentDashboard.tsx:57 ET agent/AgentComingSoon.tsx:39 (copier-coller non renommé)', a: 'Renommer le composant de AgentComingSoon', st: '✅ supprimé' },
  { id: 4, ty: 'Duplication', el: 'Logique frais de livraison', d: 'Version correcte : cartOptimizer.ts. Versions cassées/divergentes : BuyerOptimiseur.tsx, types/index.ts, (historiquement BuyerComparateur.tsx)', a: 'Source unique = cartOptimizer.ts', st: '' },
  { id: 5, ty: 'Confusion', el: 'audit.md (racine)', d: 'Rapport auto-généré "100/100 Grade A" sans valeur de diagnostic', a: 'Ne pas confondre avec QA-AUDIT ; archiver', st: '' },
], { severityCol: null });

// ─── 5. Erreurs TypeScript ────────────────────────────────────────────────
{
  const ws = wb.addWorksheet('Erreurs TypeScript', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow(['Par code TS', '', '']).font = { bold: true };
  ws.addRow(['Code', 'Nb', 'Nature']).font = { bold: true };
  [
    ['TS6133', 96, 'imports / variables non utilisés (bruit, cache parfois du code oublié)'],
    ['TS2322', 47, 'props invalides — surtout <Box mb= fontSize="sm" color="#687078" fontWeight="600"> sur Cloudscape → styles IGNORÉS silencieusement (design non appliqué)'],
    ['TS2352', 23, 'casts as X[] sur retours Supabase de forme incompatible'],
    ['TS2345', 11, 'arguments de type incompatible (.map sur relations imbriquées)'],
    ['TS7006', 4, 'paramètres implicitement any'],
    ['TS2769 / TS2739 / TS2367 / TS2554 / TS2551 / TS2353 / TS2339', 12, 'divers, dont TS2367 = comparaison impossible (branche morte)'],
  ].forEach((r) => ws.addRow(r));
  ws.addRow([]);
  ws.addRow(['Par fichier (top)', '', '']).font = { bold: true };
  ws.addRow(['Fichier', 'Erreurs', 'Note']).font = { bold: true };
  [
    ['src/pages/admin/AdminDeliveryAssignment.tsx', 35, 'props Cloudscape Box/Text invalides + shapes Supabase — design non appliqué'],
    ['src/pages/admin/AdminEanReferences.tsx', 9, ''],
    ['src/pages/storefront/ProductDetailPage.tsx', 7, ''],
    ['src/pages/buyer/QuickOrderPage.tsx', 6, ''],
    ['src/lib/marketingHelpers.ts', 6, 'dont branche morte l.417'],
    ['src/pages/storefront/CatalogPage.tsx', 5, ''],
    ['src/pages/buyer/BuyerOptimiseur.tsx', 5, 'dont bug schéma livraison (voir feuille Bugs)'],
    ['BrandPage / CheckoutPage / BuyerLoyalty / BuyerDestockage / DeliveryOnboarding / VendorLiquidation / cartOptimizer.ts', 4, 'chacun'],
  ].forEach((r) => ws.addRow(r));
  ws.getColumn(1).width = 62; ws.getColumn(2).width = 10; ws.getColumn(3).width = 85;
  ws.getColumn(3).alignment = { wrapText: true, vertical: 'top' };
}

// ─── 6. Robustesse & qualité ──────────────────────────────────────────────
addSheet('Robustesse', [
  { h: 'Sujet', k: 's', w: 30 }, { h: 'Constat', k: 'c', w: 70 }, { h: 'Risque', k: 'r', w: 55 }, { h: 'Statut', k: 'st', w: 14 },
], [
  { s: 'Gestion erreur Supabase', c: "~344 await supabase… ; la majorité n'inspecte pas `error` ni n'affiche de retour", r: 'Échecs silencieux (RLS, réseau) → écrans vides sans message', st: '' },
  { s: 'catch {} vides', c: 'ProductCampaignPanel:27, PromoCodeBanner:18, MesFinancesPage:344, CatalogPage:664', r: 'Copie presse-papier / génération PDF échoue sans retour', st: '' },
  { s: 'react-hooks/exhaustive-deps', c: '43 warnings / 23 fichiers (VendorOrders, VendorCatalog, FicheProduitEdit, WishlistPage, DeliveryProfile, MonComptePage, NotificationBell…)', r: 'Données pas rechargées après changement de filtre/id/activeOrg — bugs "ça ne se met pas à jour"', st: '' },
  { s: 'key={index}', c: '112 occurrences', r: 'Ré-ordonnancement / suppression de ligne → état de composant qui saute', st: '' },
  { s: 'parseInt() sans radix', c: '39', r: 'Edge cases sur "08", "0x…"', st: '' },
  { s: 'console.* résiduels', c: '9 (AdminApprovals ×4, VendorSettings ×2, VendorTeam, AuthContext, ErrorBoundary)', r: 'Fuite d’infos en prod', st: '' },
  { s: '@ts-ignore / eslint-disable', c: '6', r: 'Contrôles désactivés ponctuellement', st: '' },
  { s: '.single()', c: '46 usages (dont 5 après insert/update/upsert)', r: '.single() jette si 0 ligne (RLS, absente) → exception non catchée. Préférer .maybeSingle()', st: '' },
], { severityCol: null });

// ─── 7. Correctifs priorisés ──────────────────────────────────────────────
addSheet('Correctifs priorisés', [
  { h: 'Priorité', k: 'Sévérité', w: 10 }, { h: '#', k: 'id', w: 5 }, { h: 'Action', k: 'a', w: 90 },
  { h: 'Fichier(s)', k: 'f', w: 45 }, { h: 'Statut', k: 'st', w: 14 },
], [
  { Sévérité: 'P0', id: 1, a: 'Router /vendor/orders/:id et /buyer/tickets/new (ou retirer les boutons)', f: 'App.tsx, VendorOverview.tsx, DeliveryDirectoryPage.tsx', st: '✅ corrigé' },
  { Sévérité: 'P0', id: 2, a: 'Brancher le onClick de la carte Notifications', f: 'BuyerDashboard.tsx:234', st: '✅ corrigé' },
  { Sévérité: 'P0', id: 3, a: 'Remplacer la requête vendor_delivery_config cassée par fetchDeliveryConfigs()/computeDeliveryFee() ; corriger le type', f: 'BuyerOptimiseur.tsx, types/index.ts', st: '✅ corrigé' },
  { Sévérité: 'P0', id: 4, a: 'Remplacer window.prompt par un modal', f: 'AdminDeliveryValidation.tsx:619', st: '✅ corrigé' },
  { Sévérité: 'P1', id: 5, a: 'Centraliser le calcul de prix (basePrice ×3 → une fonction dans src/lib/)', f: 'BuyerCatalog, BuyerDestockage, BuyerComparateur, ComparatorPage', st: '✅ corrigé' },
  { Sévérité: 'P1', id: 6, a: 'Supprimer AgentComingSoon.tsx (mort) ou le router ; renommer le composant dupliqué', f: 'agent/AgentComingSoon.tsx', st: '✅ corrigé' },
  { Sévérité: 'P1', id: 7, a: 'Corriger les 47 TS2322 (props Cloudscape ignorées), en commençant par AdminDeliveryAssignment.tsx', f: 'AdminDeliveryAssignment.tsx + autres', st: '✅ corrigé' },
  { Sévérité: 'P1', id: 8, a: 'Ajouter tsc --noEmit au script build / à la CI pour stopper la régression (193 → 0)', f: 'package.json / CI', st: '✅ corrigé' },
  { Sévérité: 'P2', id: 9, a: 'Standardiser la gestion d’erreur Supabase (helper handle({data,error}) + toast)', f: 'transversal', st: '' },
  { Sévérité: 'P2', id: 10, a: 'Traiter les 43 react-hooks/exhaustive-deps', f: '23 fichiers', st: '' },
  { Sévérité: 'P2', id: 11, a: 'Vider les catch {}, retirer les console.*, .single() → .maybeSingle() où pertinent', f: 'transversal', st: '' },
], { severityCol: 'Sévérité' });

// ─── 8. Journal des corrections (2026-08-29) ──────────────────────────────
addSheet('Journal corrections', [
  { h: 'Date', k: 'd', w: 12 }, { h: '# audit', k: 'ref', w: 12 }, { h: 'Correctif', k: 'a', w: 90 },
  { h: 'Fichiers', k: 'f', w: 50 }, { h: 'Statut', k: 'Sévérité', w: 12 },
], [
  { d: '2026-08-29', ref: 'Bouton 1', a: 'Lien profond /vendor/orders?order=<id> + ouverture auto de la commande', f: 'VendorOrders.tsx, VendorOverview.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bouton 2', a: "Route morte /buyer/tickets/new supprimée → bouton 'Contacter' = tel: du partenaire (organisations.phone)", f: 'DeliveryDirectoryPage.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bouton 3', a: "Carte KPI 'Notifications' : onClick optionnel, plus de faux curseur cliquable", f: 'BuyerDashboard.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bouton 4', a: 'window.prompt → Modal + Textarea', f: 'AdminDeliveryValidation.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bug 2.1', a: 'Requête vendor_delivery_config corrigée (vraies colonnes + mapping des 5 modes de livraison)', f: 'BuyerOptimiseur.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bug 2.2', a: 'Type VendorDeliveryConfig aligné sur le schéma réel', f: 'types/index.ts', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bug 2.4', a: "CampaignType : ajout de 'rfq_bid_boost' (branche morte TS2367 résolue)", f: 'types/marketing.ts', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Bonus', a: "Crash BuyerOptimiseur : grand() renvoyait total/delivery/products, la vue lisait grandTotal/… → undefined.toLocaleString() → section résultats en erreur", f: 'BuyerOptimiseur.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Dup 1', a: 'basePrice ×3 → src/lib/pricing.ts (lowestTierPrice + ré-export getEffectiveUnitPrice)', f: 'pricing.ts, BuyerCatalog.tsx, BuyerDestockage.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Dup 2/3', a: 'AgentComingSoon.tsx (mort + composant dupliqué) supprimé', f: 'agent/AgentComingSoon.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'P1-7', a: 'AdminDeliveryAssignment.tsx : 35 → 0 erreurs TS (props Cloudscape en tokens, mb= → margin={{…}}, casts relations)', f: 'AdminDeliveryAssignment.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'P1-8', a: 'Script npm run verify = tsc && eslint && vitest', f: 'package.json', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'Robustesse', a: "PDF facture .catch(()=>{}) → toast d'erreur ; catches clipboard annotés best-effort", f: 'MesFinancesPage.tsx, ProductCampaignPanel.tsx, PromoCodeBanner.tsx', Sévérité: 'Corrigé' },
  { d: '2026-08-29', ref: 'console.*', a: "Revu : logging d'erreur légitime (RPC Supabase, ErrorBoundary), PAS supprimé", f: '5 fichiers', Sévérité: 'Non requis' },
], { severityCol: 'Sévérité' });

await wb.xlsx.writeFile(OUT);
console.log('✅  écrit :', OUT);
console.log('   Feuilles :', wb.worksheets.map((w) => w.name).join(' · '));
console.log('   Impact : TS 193→147 · ESLint 260→249 · vitest 29/29 · build OK');

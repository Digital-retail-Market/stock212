# Stock212 — Plan d'optimisation & de simplification

_2026-08-29 · fondé sur `QA-AUDIT.md` + relevé de code (`src/` = 150 fichiers, 91 pages)._

L'audit a montré des symptômes (193 erreurs TS, 260 ESLint, boutons cassés, requêtes
sur colonnes inexistantes, logique dupliquée). Ce document vise les **causes
structurelles**. Les 3 leviers 1–3 traitent ~70 % de la dette.

---

## Résumé — les 3 gros leviers

| Levier | Symptôme audit | Gain |
|---|---|---|
| **1. Un seul design system** | 47 `TS2322` (props Chakra sur composants Cloudscape), 2 systèmes UI complets + 2 libs d'icônes | −1 dépendance majeure, design cohérent, bundle allégé, fin d'une classe entière de bugs |
| **2. Couche d'accès aux données** | 281 `supabase.from()` dans 98 fichiers, ~344 sans gestion d'erreur, 3 requêtes sur des colonnes qui n'existent pas, 123 `any` | fin des schémas fantômes, erreurs remontées à l'UI, types réels |
| **3. Fusionner les features « sourcing »** | 5 modules compare/optimize qui se recouvrent + le nouveau moteur de reco | 1 parcours acheteur au lieu de 3, 1 algo au lieu de 4 |

---

## Levier 1 — Consolider sur **Cloudscape**, retirer Chakra

**Constat.** 48 fichiers importent `@chakra-ui/react`, 55 importent
`@cloudscape-design/components`, **0 les deux** : l'app est coupée en deux à
50/50. S'y ajoutent `@emotion/react`+`styled`, `framer-motion@6` (obsolète),
`lucide-react` **et** `react-icons` (deux libs d'icônes), `stylis-plugin-rtl`.
Les 47 `TS2322` viennent quasi tous de props Chakra (`fontSize="sm"`,
`color="#687078"`, `mb={2}`) posées sur des composants Cloudscape → **styles
silencieusement ignorés**.

**Pourquoi Cloudscape** : c'est le socle des espaces admin/vendeur/livreur
(tables, filtres, formulaires), il porte le RTL et les design-tokens nativement,
et l'`AdminSettings` / layouts structurants sont déjà dessus.

**Plan.**
1. Geler Chakra : lint rule `no-restricted-imports` sur `@chakra-ui/*` pour les
   nouveaux fichiers.
2. Créer `src/components/ui/` : ~10 primitives (`PageHeader`, `Card`, `Stat`,
   `Money`, `Rating`, `TempBadge`, `EmptyState`…) en Cloudscape — elles absorbent
   les usages Chakra les plus fréquents.
3. Migrer par domaine, dans l'ordre du trafic : `storefront/` → `buyer/` →
   marketing. ~4–6 pages/jour, mécanique.
4. Retirer `@chakra-ui/react`, `@emotion/*`, `framer-motion`, `react-icons`,
   `stylis-plugin-rtl` (garder `lucide-react` seul). `emotionCache.ts`,
   `PageTransition.tsx` supprimés.

**Effort** ~2–3 semaines · **Impact** très élevé (bugs + bundle + vélocité).

---

## Levier 2 — Couche d'accès aux données typée

**Constat.** `src/types/supabase.ts` (types générés, **4473 lignes**) **existe
déjà** mais le code l'ignore : il caste en `as any` / `as X[]` (23 `TS2352`,
123 `no-explicit-any`). D'où des requêtes sur des colonnes fantômes
(`vendor_delivery_config.org_id`, `organisations.avg_rating`) qui échouent en
silence, et ~344 appels sans lecture de `error`.

**Plan.**
1. `npm scripts` : `db:types` = `supabase gen types typescript ... > src/types/supabase.ts` (le garder à jour).
2. `src/lib/db/` : un module par domaine (`orders.ts`, `catalog.ts`,
   `delivery.ts`, `settings.ts`…) exposant des fonctions typées
   (`listVendorOrders(orgId): Promise<Order[]>`). Les composants n'appellent plus
   `supabase.from()` directement.
3. Un helper unique `unwrap({ data, error }, ctx)` → log + `throw`/toast. Brancher
   sur `@tanstack/react-query` (déjà en dépendance, peu utilisé) pour cache +
   états loading/error gratuits.
4. Interdire `supabase.from(` hors de `src/lib/db/` (lint).

**Effort** ~2 semaines (incrémental, domaine par domaine) · **Impact** très élevé.

---

## Levier 3 — Un seul module « sourcing »

**Constat.** Fonctionnalités qui se chevauchent :

| Fichier | Rôle |
|---|---|
| `pages/storefront/ComparatorPage.tsx` (`/compare`) | comparaison manuelle de 4 fiches |
| `pages/buyer/BuyerComparateur.tsx` (`/buyer/compare`) | comparaison multi-vendeurs d'un EAN |
| `pages/buyer/BuyerOptimiseur.tsx` (`/buyer/optimizer`) | optimisation panier multi-EAN |
| `contexts/ComparatorContext.tsx` | liste de comparaison (localStorage) |
| `lib/cartOptimizer.ts` (~750 l.) | prix/quantité, livraison, consolidation |
| `lib/recommendation/` (nouveau) | score multi-critères |

3 calculs de « prix effectif » différents y coexistaient (cf. `basePrice` ×3,
déjà centralisé). `BuyerOptimiseur` embarquait sa propre logique de livraison
cassée.

**Plan.** Un module `src/lib/sourcing/` construit sur `lib/recommendation` +
`lib/pricing` + `computeDeliveryFee` :
- `rankOffers(ean, qty, buyerLoc)` — déjà fait
- `optimizeBasket(lines, buyerLoc)` — réécrit `cartOptimizer` par-dessus `rankOffers`
- une page `/buyer/sourcing` avec 2 onglets (comparer un produit / optimiser un
  panier). `ComparatorPage` reste pour la comparaison de fiches marketing.
- `ComparatorContext` → un simple hook `useCompareList()`.

**Effort** ~1 semaine · **Impact** élevé (−2 pages, −1 algo, cohérence du classement).

---

## Levier 4 — Routing en configuration

**Constat.** `App.tsx` = **1202 lignes, 93 routes**, chaque route ré-emballe à la
main `<RequireOnboarding><RequireBuyer><StorefrontLayout>…`. Bugs trouvés :
routes manquantes (`/vendor/orders/:id`, `/buyer/tickets/new`).

**Plan.**
- Routes **imbriquées** par layout (`<Route element={<BuyerLayout/>}>` + enfants),
  gardes en `loader`/wrapper unique.
- Table de routes en données → un test qui vérifie que **chaque `navigate('/…')`
  du code matche une route déclarée** (aurait attrapé les 2 boutons cassés).
- `App.tsx` tombe à ~150 lignes.

**Effort** ~3–4 jours · **Impact** moyen-élevé (prévention de régressions).

---

## Levier 5 — Verrou CI anti-régression

**Constat.** `npm run typecheck` / `lint` échouent ; `vite build` ne lance pas
`tsc` → la dette grossit sans alerte. `npm run verify` a été ajouté.

**Plan.**
- CI : `npm run verify` bloquant sur les PR.
- Fichier `.ts-error-baseline` (compte actuel : **147**). CI échoue si le nombre
  **augmente**. On le fait décroître (`TS6133` = imports inutilisés, ~96, se
  purgent en une passe `eslint --fix` + `organize-imports`).
- Objectif : 147 → 0 en ~2 semaines de fond, puis `tsc` strict dans `build`.

**Effort** faible (1 j setup) + fond · **Impact** élevé (durable).

---

## Levier 6 — Simplifier le schéma

- **`platform_settings`** : ~**60 colonnes** sur un singleton (identité, commerce,
  livraison, notif, sécurité, reco…). → regrouper en JSONB par section
  (`settings.commerce`, `settings.delivery`…) **ou** table clé/valeur
  `platform_settings(key, value jsonb)`. `AdminSettings` déjà en onglets → mapping
  1:1.
- **`categories`** : 50 lignes avec quasi-doublons (`Boissons` / `Boissons et
  Jus`, `Fruits & Légumes` / `Fruits et Legumes`, `Conserves` / `Conserves
  poissons` / `Conserves fruits et légumes`, `Surgelés` / `Produits surgelés`).
  → migration de fusion + `parent_id` propre → ~25 catégories, filtres du
  catalogue lisibles.
- **`DeliveryConfig`** : un seul type partagé (`cartOptimizer`), supprimer
  `VendorDeliveryConfig` de `types/index.ts` une fois les usages migrés.

**Effort** ~3 jours · **Impact** moyen (lisibilité, requêtes catalogue).

---

## Levier 7 — Bundle & perf

- `@react-pdf/renderer` → chunk **~1,4 Mo**. Il est déjà en `lazy`, mais tous les
  `lib/pdf/*Doc.tsx` sont tirés ensemble : les charger **à la demande**
  (`import()` au clic « Télécharger »), pas au montage de la page.
- `manualChunks` Rollup : séparer `cloudscape`, `pdf`, `supabase` (avert. « chunks
  > 500 kB » au build).
- Retirer `react-icons` (doublon de `lucide-react`) : −~300 Ko.
- Catalogue : la recherche `ilike('%q%')` sans debounce serveur + `range` large
  (fenêtre 600) → passer par une **fonction SQL / vue** `search_products` (déjà un
  index GIN `idx_products_fts` en base, inutilisé).

**Effort** ~2–3 jours · **Impact** moyen (temps de chargement).

---

## Quick wins (< 1 jour chacun)

| Action | Détail |
|---|---|
| Purge imports inutilisés | `eslint --fix` + plugin `unused-imports` → ~96 `TS6133` en une passe |
| Supprimer `audit.md` (racine) | rapport auto « 100/100 » sans valeur, prête à confusion avec `QA-AUDIT` |
| `parseInt(x)` → `parseInt(x, 10)` | 39 occurrences, codemod |
| `key={index}` | 112 occurrences ; prioriser les listes ré-ordonnables/supprimables |
| `.single()` → `.maybeSingle()` | là où 0 ligne est un cas normal (46 usages à trier) |
| Nettoyer `.bolt/` | restes de scaffolding |

---

## Séquencement proposé

| Sprint | Contenu |
|---|---|
| **S1** | Levier 5 (CI + baseline) · quick wins (imports, `audit.md`, `parseInt`) · Levier 4 (routing + test navigate) |
| **S2–S3** | Levier 2 (couche `lib/db/` + react-query) domaine par domaine |
| **S3–S5** | Levier 1 (migration Cloudscape, primitives `ui/`) |
| **S5** | Levier 3 (module `sourcing`) · Levier 6 (schéma) · Levier 7 (bundle) |

Chaque levier est **indépendant** et livrable seul. Commencer par le S1 : peu de
risque, et le verrou CI empêche la dette de regonfler pendant le reste.

# Stock212 — Audit QA de la plateforme

_Généré le 2026-08-29 · audit **statique** du code (`src/`, `supabase/`)._

---

## ✅ Corrections appliquées (2026-08-29)

| # audit | Correctif | Fichiers |
|---|---|---|
| Bouton 1 | Lien profond `/vendor/orders?order=<id>` + ouverture auto de la commande | `VendorOrders.tsx`, `VendorOverview.tsx` |
| Bouton 2 | Route morte `/buyer/tickets/new` supprimée → bouton « Contacter » = `tel:` du partenaire (colonne `organisations.phone`) | `DeliveryDirectoryPage.tsx` |
| Bouton 3 | Carte KPI « Notifications » : `onClick` rendu optionnel, plus de faux curseur cliquable | `BuyerDashboard.tsx` |
| Bouton 4 | `window.prompt` → `Modal` + `Textarea` | `AdminDeliveryValidation.tsx` |
| Bug 2.1 | Requête `vendor_delivery_config` corrigée (vraies colonnes + mapping des 5 modes) | `BuyerOptimiseur.tsx` |
| Bug 2.2 | Type `VendorDeliveryConfig` aligné sur le schéma réel | `types/index.ts` |
| Bug 2.4 | `CampaignType` : ajout de `'rfq_bid_boost'` (branche morte `TS2367` résolue) | `types/marketing.ts` |
| **Bonus** | **Crash BuyerOptimiseur** : `grand()` renvoyait `total/delivery/products`, la vue lisait `grandTotal/…` → `undefined.toLocaleString()` → section résultats en erreur. Corrigé. | `BuyerOptimiseur.tsx` |
| Dup 1 | `basePrice` ×3 → `src/lib/pricing.ts` (`lowestTierPrice` + ré-export `getEffectiveUnitPrice`) | `pricing.ts`, `BuyerCatalog.tsx`, `BuyerDestockage.tsx` |
| Dup 2/3 | `AgentComingSoon.tsx` (mort, composant dupliqué) **supprimé** | — |
| TS P1-7 | `AdminDeliveryAssignment.tsx` : **35 → 0 erreurs** (props Cloudscape `Box`/`Text`/`Button` corrigées : `fontSize`/`color`/`fontWeight` en tokens, `mb=` → `margin={{…}}`, casts de relations) | `AdminDeliveryAssignment.tsx` |
| P1-8 | Script `npm run verify` = `tsc && eslint && vitest` | `package.json` |
| Robustesse | PDF facture : `.catch(() => {})` → toast d'erreur ; catches clipboard annotés « best-effort » | `MesFinancesPage.tsx`, `ProductCampaignPanel.tsx`, `PromoCodeBanner.tsx` |

**Impact mesuré** : erreurs TypeScript **193 → 147** · ESLint **260 → 249** · `vitest` **29/29** · `vite build` ✅ · 0 nouvelle erreur introduite.

**Revu et non modifié** (le constat d'audit était faible) : les `console.error` listés sont du **logging d'erreur légitime** (RPC Supabase, `ErrorBoundary`), pas des `console.log` de debug — à router vers un logger plus tard, pas à supprimer.

**Restant** : ~147 erreurs TS surtout `TS6133` (imports inutilisés) et `TS2352` (casts `as X[]` sur retours Supabase) réparties sur ~60 fichiers ; bugs 2.3 / 2.5 / 2.6 ; P2 (exhaustive-deps, `.single()` → `.maybeSingle()`, `key={index}`).

---

## Méthode & périmètre

- Analyse statique : lecture du code, `tsc`, `eslint`, recherches de motifs.
- **Non couvert** : parcours cliqué dans l'app en cours d'exécution (pas de serveur
  lancé), erreurs runtime réelles (échecs API / refus RLS), rendu visuel.
  → « bouton qui ne marche pas » = handler vide, navigation vers une route
  inexistante, colonne SQL absente, ou style ignoré silencieusement.
- Base de données : instance **hébergée** `lubgbnmrpwlhgtpvuqjs`.

## Résumé chiffré

| Indicateur | Valeur |
|---|---|
| Erreurs TypeScript (`tsc --noEmit`) | **193** |
| Problèmes ESLint | **260** (210 erreurs, 50 warnings) |
| `npm run typecheck` / `npm run lint` | ❌ échouent (dette pré-existante — `vite build` n'exécute pas `tsc`) |
| `vite build` | ✅ passe |
| Boutons / navigations cassés | **4** (bloquants) |
| Bugs fonctionnels (schéma / logique) | **3** |
| Duplications / code mort | **5** |
| `console.*` résiduels | 9 · `catch {}` vides | 4 · `window.prompt` | 1 |
| Appels `await supabase` sans gestion d'erreur | ~344 |
| `react-hooks/exhaustive-deps` (risque de closure obsolète) | 43, sur 23 fichiers |
| `key={index}` (anti-pattern listes) | 112 occurrences |
| `parseInt()` sans radix | 39 |
| `@typescript-eslint/no-explicit-any` | 123 |

---

## 🔴 1. Boutons & navigations cassés

| # | Fichier:ligne | Élément | Problème | Correctif |
|---|---|---|---|---|
| 1 | `src/pages/vendor/VendorOverview.tsx:175` et `:201` | Numéro de commande + bouton « voir » | `navigate('/vendor/orders/${o.id}')` — **la route `/vendor/orders/:id` n'existe pas** dans `App.tsx` (seule `/vendor/orders` est définie) → tombe sur `NotFoundPage`. | Ajouter la route `path="/vendor/orders/:id"` (page détail commande vendeur) ou rediriger vers `/vendor/orders`. |
| 2 | `src/pages/storefront/DeliveryDirectoryPage.tsx:306` | Bouton d'action (contacter / demander un transport) | `navigate('/buyer/tickets/new')` — **route inexistante** (seule `/delivery/tickets` existe) → `NotFoundPage`. | Créer la route/page, ou pointer vers un flux existant. |
| 3 | `src/pages/buyer/BuyerDashboard.tsx:234` | `KpiCard` « Notifications » | `onClick={() => {}}` — la carte paraît cliquable mais **ne fait rien**. | `onClick={() => navigate('/buyer/account')}` ou ouvrir le panneau `NotificationBell`. |
| 4 | `src/pages/admin/AdminDeliveryValidation.tsx:619` | Saisie d'une note de problème | `window.prompt(...)` — **dialogue bloquant natif**, pas de style, KO en contexte embarqué / mobile. | Remplacer par un `Modal` + `Textarea` Cloudscape. |

> ℹ️ `navigate('/vendor/catalog/new')` (`VendorOverview.tsx:124`) est **OK** : `/vendor/catalog/:id` capture `new`, et `FicheProduitEdit` gère `id === 'new'` (ligne 74).

---

## 🟠 2. Bugs fonctionnels

### 2.1 — `BuyerOptimiseur.tsx` : mauvaises colonnes `vendor_delivery_config`
`src/pages/buyer/BuyerOptimiseur.tsx:122`
```js
.select('org_id, free_delivery_threshold, delivery_fee_default')
```
Ces colonnes **n'existent pas**. Le schéma réel (`migration 029`) est :
`seller_org_id, delivery_mode, flat_rate_mad, free_threshold_mad, percentage_rate, min_charge_mad, max_charge_mad`.
→ la requête renvoie une erreur, `dcMap` reste vide, **les frais de livraison sont traités comme 0** dans tout l'optimiseur de panier. Le calcul de « coût total livré » est donc faux.
**Correctif** : réutiliser `fetchDeliveryConfigs()` + `computeDeliveryFee()` de `src/lib/cartOptimizer.ts` (déjà écrits et corrects). Même bug avait été corrigé dans `BuyerComparateur.tsx`.

### 2.2 — Type `DeliveryConfig` erroné dans `src/types/index.ts:4-6`
```ts
free_delivery_threshold: number;
delivery_fee_default: number;
```
Ne reflète aucune colonne réelle → tout code s'appuyant sur ce type est trompé. Aligner sur `DeliveryConfig` de `cartOptimizer.ts`.

### 2.3 — `StorefrontLayout.tsx:206` : `select` fragile + cast forcé
`.select('… organisations(name), … avg_rating …')` puis `as Product[]` (erreur `TS2352` ligne 217). Les relations imbriquées reviennent en tableau ; le cast masque le problème. À typer proprement (relation `!inner` ou mapping explicite).

---

## 🟡 3. Duplications & code mort

| # | Élément | Détail |
|---|---|---|
| 1 | **`basePrice()` réécrit 3×** | `src/pages/buyer/BuyerCatalog.tsx:72`, `src/pages/buyer/BuyerDestockage.tsx:60`, + inline dans `BuyerComparateur.tsx` / `ComparatorPage.tsx`. Sémantique **incohérente** : `basePrice` = prix du plus petit palier ; `cartOptimizer.getEffectiveUnitPrice()` = prix applicable à une quantité (tri décroissant). Deux notions de « prix » coexistent selon l'écran. → centraliser dans `src/lib/` et n'exposer qu'une fonction. |
| 2 | **`AgentComingSoon.tsx` — fichier mort** | Jamais importé dans `App.tsx` (aucun `lazy(() => import('./pages/agent/AgentComingSoon'))`). À supprimer ou router. |
| 3 | **Nom de composant dupliqué** | `export default function AgentDashboard()` dans **deux** fichiers : `agent/AgentDashboard.tsx:57` **et** `agent/AgentComingSoon.tsx:39`. Copier-coller non renommé. |
| 4 | **Logique frais de livraison dupliquée** | Version correcte : `cartOptimizer.ts`. Versions cassées/divergentes : `BuyerOptimiseur.tsx`, `types/index.ts`, (historiquement `BuyerComparateur.tsx`). |
| 5 | **`audit.md`** (racine) | Rapport auto-généré « 100/100 Grade A » sans valeur de diagnostic — à ne pas confondre avec ce fichier. |

---

## 🔵 4. Erreurs TypeScript (193)

`npm run typecheck` échoue. `vite build` ne lançant pas `tsc`, la dette n'est pas visible en CI.

**Par code :**

| Code | Nb | Nature |
|---|---|---|
| `TS6133` | 96 | imports / variables déclarés non utilisés (bruit, mais cache parfois du code oublié) |
| `TS2322` | 47 | **props invalides** — surtout `<Box mb={…} fontSize="sm" color="#687078" fontWeight="600">` sur Cloudscape `Box`, qui **n'accepte pas ces valeurs** → styles **silencieusement ignorés** (le rendu ne correspond pas au design) |
| `TS2352` | 23 | casts `as X[]` sur des retours Supabase de forme incompatible (masquent des bugs de shape) |
| `TS2345` | 11 | arguments de type incompatible (`.map()` sur relations imbriquées) |
| `TS7006` | 4 | paramètres implicitement `any` |
| autres | 12 | `TS2769`, `TS2739`, `TS2367` (comparaison impossible), `TS2554`, `TS2551`, `TS2353`, `TS2339` |

**Fichiers les plus touchés :**

| Fichier | Erreurs |
|---|---|
| `src/pages/admin/AdminDeliveryAssignment.tsx` | **35** (props Cloudscape `Box`/`Text` invalides + shapes Supabase) |
| `src/pages/admin/AdminEanReferences.tsx` | 9 |
| `src/pages/storefront/ProductDetailPage.tsx` | 7 |
| `src/pages/buyer/QuickOrderPage.tsx` · `src/lib/marketingHelpers.ts` | 6 |
| `src/pages/storefront/CatalogPage.tsx` · `src/pages/buyer/BuyerOptimiseur.tsx` | 5 |
| `BrandPage`, `CheckoutPage`, `BuyerLoyalty`, `BuyerDestockage`, `DeliveryOnboarding`, `VendorLiquidation`, `cartOptimizer.ts` | 4 chacun |

`marketingHelpers.ts:417` — `TS2367` : comparaison `type === 'rfq_bid_boost'` sur une union qui **ne contient pas** cette valeur → branche morte.

---

## ⚪ 5. Robustesse & qualité

| Sujet | Constat | Risque |
|---|---|---|
| Gestion d'erreur Supabase | ~344 `await supabase…` ; la majorité **n'inspecte pas `error`** ni n'affiche de retour utilisateur | échecs silencieux (RLS, réseau) → écrans vides sans message |
| `catch {}` vides | `ProductCampaignPanel.tsx:27`, `PromoCodeBanner.tsx:18`, `MesFinancesPage.tsx:344`, `CatalogPage.tsx:664` | copie presse-papier / génération PDF échoue sans aucun retour |
| `react-hooks/exhaustive-deps` | 43 warnings / 23 fichiers (`VendorOrders`, `VendorCatalog`, `FicheProduitEdit`, `WishlistPage`, `DeliveryProfile`, `MonComptePage`, `NotificationBell`…) | données pas rechargées après changement de dépendance (filtre, id, `activeOrg`) — bugs « ça ne se met pas à jour » |
| `key={index}` | 112 occurrences | ré-ordonnancement / suppression de ligne → état de composant qui « saute » |
| `parseInt()` sans radix | 39 | edge cases sur saisies type `"08"`, `"0x…"` |
| `console.*` résiduels | 9 (`AdminApprovals.tsx` ×4, `VendorSettings.tsx` ×2, `VendorTeam.tsx`, `AuthContext.tsx`, `ErrorBoundary.tsx`) | fuite d'infos en prod |
| `@ts-ignore` / `eslint-disable` | 6 | contrôles désactivés ponctuellement — à revoir |
| `.single()` | 46 usages (dont 5 après `insert/update/upsert`) | `.single()` **jette** si 0 ligne (RLS qui bloque, ligne absente) → exception non catchée. Préférer `.maybeSingle()` quand 0 est possible |
| `AdminOrders.tsx:99` | recherche « sur la page courante seulement » (commentaire `not implemented for brevity`) | résultats de recherche partiels au-delà de la 1ʳᵉ page |
| `OnboardingPage.tsx:350` | `TODO: stocker commercialMotivation` | donnée d'onboarding saisie puis **jetée** |

---

## Recommandations priorisées

**P0 — corriger tout de suite (fonctionnel visible)**
1. Router `/vendor/orders/:id` (bouton #1) et `/buyer/tickets/new` (bouton #2), ou retirer les boutons.
2. `BuyerDashboard.tsx:234` — brancher le `onClick` de la carte Notifications.
3. `BuyerOptimiseur.tsx` — remplacer la requête `vendor_delivery_config` cassée par `fetchDeliveryConfigs()`/`computeDeliveryFee()` (bug 2.1) ; corriger le type (bug 2.2).
4. Remplacer `window.prompt` (`AdminDeliveryValidation.tsx:619`) par un modal.

**P1 — dette structurante**
5. Centraliser le calcul de prix (`basePrice` ×3 → une fonction dans `src/lib/`).
6. Supprimer `AgentComingSoon.tsx` (mort) ou le router ; renommer le composant dupliqué.
7. Corriger les 47 `TS2322` (props Cloudscape ignorées) en commençant par `AdminDeliveryAssignment.tsx` — le design n'est actuellement pas appliqué.
8. Ajouter `tsc --noEmit` au script `build` / à la CI pour stopper la régression (193 → 0 progressivement).

**P2 — fiabilité**
9. Standardiser la gestion d'erreur Supabase (helper `handle({data,error})` + toast).
10. Traiter les 43 `exhaustive-deps`.
11. Vider les `catch {}`, retirer les `console.*`, `.single()` → `.maybeSingle()` où pertinent.

---

_Ce fichier ne modifie rien. Chaque correctif peut être traité indépendamment._

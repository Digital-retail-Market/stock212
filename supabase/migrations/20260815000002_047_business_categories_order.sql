-- Migration 047 — Classe les types d'activité (business_categories) par
-- importance au sein de chaque rôle, comme les champs d'onboarding
-- (migration 045). Reste modifiable par l'admin via /admin/business-categories
-- (flèches de réordonnancement ajoutées côté UI).

ALTER TABLE business_categories
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- ─── Acheteur — segments par volume d'achat FMCG typique, du plus courant/
-- gros volume au plus marginal ────────────────────────────────────────────────
UPDATE business_categories SET display_order = 0  WHERE actor_type = 'buyer' AND name = 'Supermarché';
UPDATE business_categories SET display_order = 1  WHERE actor_type = 'buyer' AND name = 'Grossiste';
UPDATE business_categories SET display_order = 2  WHERE actor_type = 'buyer' AND name = 'Distributeur';
UPDATE business_categories SET display_order = 3  WHERE actor_type = 'buyer' AND name = 'Distributeur National';
UPDATE business_categories SET display_order = 4  WHERE actor_type = 'buyer' AND name = 'Distributeur Régional';
UPDATE business_categories SET display_order = 5  WHERE actor_type = 'buyer' AND name = 'Restaurant';
UPDATE business_categories SET display_order = 6  WHERE actor_type = 'buyer' AND name = 'Hôtel';
UPDATE business_categories SET display_order = 7  WHERE actor_type = 'buyer' AND name = 'Alimentation générale';
UPDATE business_categories SET display_order = 8  WHERE actor_type = 'buyer' AND name = 'Institutionnel';
UPDATE business_categories SET display_order = 9  WHERE actor_type = 'buyer' AND name = 'Café';
UPDATE business_categories SET display_order = 10 WHERE actor_type = 'buyer' AND name = 'Café salon de thé';
UPDATE business_categories SET display_order = 11 WHERE actor_type = 'buyer' AND name = 'Café glacier';
UPDATE business_categories SET display_order = 12 WHERE actor_type = 'buyer' AND name = 'Pâtisserie';
UPDATE business_categories SET display_order = 13 WHERE actor_type = 'buyer' AND name = 'Bureau de tabac';
UPDATE business_categories SET display_order = 14 WHERE actor_type = 'buyer' AND name = 'E-commerce';
UPDATE business_categories SET display_order = 15 WHERE actor_type = 'buyer' AND name = 'Industriel local';
UPDATE business_categories SET display_order = 16 WHERE actor_type = 'buyer' AND name = 'Importateur';
UPDATE business_categories SET display_order = 17 WHERE actor_type = 'buyer' AND name = 'Intermédiaire';
UPDATE business_categories SET display_order = 18 WHERE actor_type = 'buyer' AND name = 'Artisan';

-- ─── Vendeur — mêmes principes (producteurs/distributeurs structurés d'abord,
-- profils de niche ensuite), pour rester cohérent dans le même écran admin ───
UPDATE business_categories SET display_order = 0  WHERE actor_type = 'seller' AND name = 'Fabricant';
UPDATE business_categories SET display_order = 1  WHERE actor_type = 'seller' AND name = 'Industriel local';
UPDATE business_categories SET display_order = 2  WHERE actor_type = 'seller' AND name = 'Distributeur National';
UPDATE business_categories SET display_order = 3  WHERE actor_type = 'seller' AND name = 'Distributeur Régional';
UPDATE business_categories SET display_order = 4  WHERE actor_type = 'seller' AND name = 'Distributeur';
UPDATE business_categories SET display_order = 5  WHERE actor_type = 'seller' AND name = 'Grossiste';
UPDATE business_categories SET display_order = 6  WHERE actor_type = 'seller' AND name = 'Importateur';
UPDATE business_categories SET display_order = 7  WHERE actor_type = 'seller' AND name = 'Importateur / Exportateur';
UPDATE business_categories SET display_order = 8  WHERE actor_type = 'seller' AND name = 'Intermédiaire';
UPDATE business_categories SET display_order = 9  WHERE actor_type = 'seller' AND name = 'Coopérative';
UPDATE business_categories SET display_order = 10 WHERE actor_type = 'seller' AND name = 'Marque de distributeur';
UPDATE business_categories SET display_order = 11 WHERE actor_type = 'seller' AND name = 'Courtier';
UPDATE business_categories SET display_order = 12 WHERE actor_type = 'seller' AND name = 'Artisan';

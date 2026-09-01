-- Migration 049 — Catalogue de catégories produit (vendeur → "Ajouter un
-- produit") aligné sur la taxonomie validée (fichier "Produits potentiels").
-- Deux correctifs :
--  1. La table `categories` n'avait jamais eu de policy d'écriture admin —
--     /admin/categories existait déjà mais tout INSERT/UPDATE/DELETE y
--     échouait silencieusement (RLS). Même classe de bug que
--     business_categories (migration 043) et org_subtypes.
--  2. La taxonomie manquante est ajoutée. Deux catégories existantes qui
--     correspondent exactement à un nom de la nouvelle taxonomie sont
--     repositionnées (même id conservé, donc aucune référence produit
--     cassée) plutôt que dupliquées : "Épicerie sèche" (sous-catégorie de
--     Food → racine) et "Produits laitiers" (sous-catégorie de Food →
--     sous-catégorie de "Produits frais"). Le reste de l'arbre existant
--     (Food/Non-Food et leurs autres branches) n'est pas touché — l'admin
--     peut réorganiser ensuite depuis /admin/categories, désormais
--     fonctionnel.

-- ─── 1. Policy d'écriture admin (pattern déjà utilisé pour org_subtypes /
-- business_categories / onboarding_field_definitions) ──────────────────────
DROP POLICY IF EXISTS "categories_admin_write" ON categories;
CREATE POLICY "categories_admin_write" ON categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- ─── 2. Taxonomie ────────────────────────────────────────────────────────────
DO $$
DECLARE
  epicerie_id   uuid;
  frais_id      uuid;
  surgeles_id   uuid;
  parapharma_id uuid;
  nettoyage_id  uuid;
BEGIN
  -- Repositionne "Épicerie sèche" en racine (conserve son id)
  UPDATE categories SET parent_id = NULL, display_order = 3
    WHERE name = 'Épicerie sèche' AND parent_id IS NOT NULL;
  SELECT id INTO epicerie_id FROM categories WHERE name = 'Épicerie sèche' AND parent_id IS NULL LIMIT 1;
  IF epicerie_id IS NULL THEN
    INSERT INTO categories (name, parent_id, display_order) VALUES ('Épicerie sèche', NULL, 3)
      RETURNING id INTO epicerie_id;
  END IF;

  -- Nouvelle racine "Produits frais"
  SELECT id INTO frais_id FROM categories WHERE name = 'Produits frais' AND parent_id IS NULL LIMIT 1;
  IF frais_id IS NULL THEN
    INSERT INTO categories (name, parent_id, display_order) VALUES ('Produits frais', NULL, 4)
      RETURNING id INTO frais_id;
  END IF;
  -- Repositionne "Produits laitiers" sous "Produits frais" (conserve son id)
  UPDATE categories SET parent_id = frais_id, display_order = 1
    WHERE name = 'Produits laitiers' AND parent_id IS DISTINCT FROM frais_id;

  -- Autres racines
  SELECT id INTO surgeles_id FROM categories WHERE name = 'Produits surgelés' AND parent_id IS NULL LIMIT 1;
  IF surgeles_id IS NULL THEN
    INSERT INTO categories (name, parent_id, display_order) VALUES ('Produits surgelés', NULL, 5)
      RETURNING id INTO surgeles_id;
  END IF;

  SELECT id INTO parapharma_id FROM categories WHERE name = 'Parapharmacie' AND parent_id IS NULL LIMIT 1;
  IF parapharma_id IS NULL THEN
    INSERT INTO categories (name, parent_id, display_order) VALUES ('Parapharmacie', NULL, 6)
      RETURNING id INTO parapharma_id;
  END IF;

  SELECT id INTO nettoyage_id FROM categories WHERE name = 'Nettoyage' AND parent_id IS NULL LIMIT 1;
  IF nettoyage_id IS NULL THEN
    INSERT INTO categories (name, parent_id, display_order) VALUES ('Nettoyage', NULL, 7)
      RETURNING id INTO nettoyage_id;
  END IF;

  -- Racines sans sous-catégorie (sélectionnables directement)
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, NULL, v.display_order FROM (VALUES
    ('Papeterie et fournitures bureau', 8),
    ('Batteries',                       9),
    ('Petits électroménager',           10),
    ('Téléphones et Accessoires',       11),
    ('Autres - à spécifier',            12)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id IS NULL);

  -- Sous-catégories "Épicerie sèche"
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, epicerie_id, v.display_order FROM (VALUES
    ('Sucre', 1), ('Huiles alimentaires', 2), ('Conserves fruits et légumes', 3),
    ('Conserves poissons', 4), ('Charcuterie', 5), ('Pates et Couscous', 6),
    ('Farines', 7), ('Riz et legumineuses', 8), ('Biscuiterie et Confiserie', 9),
    ('Boissons et Jus', 10), ('Eaux minerales et de table', 11), ('Levure et améliorants', 12),
    ('Chocolat professionnel', 13), ('Confitures, Miel et Pates à tartiner', 14),
    ('Epices', 15), ('Autres - à spécifier', 16)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = epicerie_id);

  -- Sous-catégories "Produits frais" (Produits laitiers déjà repositionné ci-dessus)
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, frais_id, v.display_order FROM (VALUES
    ('Beurre', 2), ('Fromages', 3), ('Dattes', 4)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = frais_id);

  -- Sous-catégories "Produits surgelés"
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, surgeles_id, v.display_order FROM (VALUES
    ('Poissons', 1), ('Fruits et Legumes', 2), ('Viandes', 3), ('Glaces', 4)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = surgeles_id);

  -- Sous-catégories "Parapharmacie"
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, parapharma_id, v.display_order FROM (VALUES
    ('Compléments alimentaires', 1), ('Produits paramédical', 2)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = parapharma_id);

  -- Sous-catégories "Nettoyage"
  INSERT INTO categories (name, parent_id, display_order)
  SELECT v.name, nettoyage_id, v.display_order FROM (VALUES
    ('Nettoyage maison, linge et vaisselle', 1), ('Nettoyage corporel', 2), ('Cosmétique et crèmes', 3)
  ) AS v(name, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = nettoyage_id);
END;
$$;

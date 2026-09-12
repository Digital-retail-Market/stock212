-- Migration 043 — Rend la liste "Type d'activité" vendeur (business_categories,
-- actor_type = 'seller') gérable par l'admin, et ajoute les nouveaux types de
-- sourcing identifiés (Industriel local, Distributeur National/Régional,
-- Intermédiaire). L'onboarding et la fiche vendeur (VendorBoutique) lisent déjà
-- cette table dynamiquement — aucune valeur n'est codée en dur dans le code.

-- ── Policies d'écriture réservées aux admins (seule une policy SELECT existait) ──
DROP POLICY IF EXISTS "biz_cats_admin_write" ON business_categories;
CREATE POLICY "biz_cats_admin_write" ON business_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- ── Nouveaux types d'activité vendeur (on garde les existants) ──────────────────
INSERT INTO business_categories (actor_type, name)
SELECT v.actor_type, v.name
FROM (VALUES
  ('seller', 'Industriel local'),
  ('seller', 'Importateur'),
  ('seller', 'Distributeur National'),
  ('seller', 'Distributeur Régional'),
  ('seller', 'Intermédiaire')
) AS v(actor_type, name)
WHERE NOT EXISTS (
  SELECT 1 FROM business_categories bc
  WHERE bc.actor_type = v.actor_type AND bc.name = v.name
);

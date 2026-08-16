-- Migration 040 — Nouveaux types d'activité Acheteur (commerces de détail /
-- restauration) pour le sélecteur "Type d'activité" de l'étape 2 onboarding

INSERT INTO business_categories (actor_type, name)
SELECT v.actor_type, v.name
FROM (VALUES
  ('buyer', 'Alimentation générale'),
  ('buyer', 'Bureau de tabac'),
  ('buyer', 'Café glacier'),
  ('buyer', 'Café salon de thé'),
  ('buyer', 'Pâtisserie')
) AS v(actor_type, name)
WHERE NOT EXISTS (
  SELECT 1 FROM business_categories bc
  WHERE bc.actor_type = v.actor_type AND bc.name = v.name
);

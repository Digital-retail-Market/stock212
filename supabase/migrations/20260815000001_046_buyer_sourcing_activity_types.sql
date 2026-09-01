-- Migration 046 — Mêmes types de sourcing que côté vendeur (migration 043),
-- ajoutés cette fois aux types d'activité Acheteur (business_categories,
-- actor_type = 'buyer'). Un acheteur B2B FMCG peut lui-même être un
-- distributeur/grossiste/intermédiaire qui réachète pour redistribuer.
-- La policy d'écriture admin (biz_cats_admin_write, migration 043) couvre
-- déjà toute la table, donc ces catégories sont modifiables depuis
-- /admin/business-categories sans changement de code supplémentaire.

INSERT INTO business_categories (actor_type, name)
SELECT v.actor_type, v.name
FROM (VALUES
  ('buyer', 'Industriel local'),
  ('buyer', 'Importateur'),
  ('buyer', 'Distributeur National'),
  ('buyer', 'Distributeur Régional'),
  ('buyer', 'Intermédiaire')
) AS v(actor_type, name)
WHERE NOT EXISTS (
  SELECT 1 FROM business_categories bc
  WHERE bc.actor_type = v.actor_type AND bc.name = v.name
);

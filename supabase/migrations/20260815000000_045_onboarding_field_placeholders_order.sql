-- Migration 045 — Ajoute des suggestions de saisie (placeholder) aux champs
-- d'onboarding et reclasse les champs vendeur par ordre d'importance au sein
-- de chaque section (obligatoire puis les plus utiles au matching acheteur
-- en premier). Le champ reste modifiable par l'admin comme le reste de la
-- définition (AdminOnboardingFields).

ALTER TABLE onboarding_field_definitions
  ADD COLUMN IF NOT EXISTS placeholder text;

-- ─── Vendeur — Informations légales (étape 2) ──────────────────────────────────
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Ferme Bio Atlas SARL', display_order = 0 WHERE role = 'vendeur' AND field_key = 'org_name';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 12 Rue Ibnou Sina, Quartier Industriel', display_order = 1 WHERE role = 'vendeur' AND field_key = 'address';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Casablanca', display_order = 2 WHERE role = 'vendeur' AND field_key = 'city';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Casablanca-Settat', display_order = 3 WHERE role = 'vendeur' AND field_key = 'region';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 0522 12 34 56', display_order = 4 WHERE role = 'vendeur' AND field_key = 'phone';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 20000', display_order = 5 WHERE role = 'vendeur' AND field_key = 'postal_code';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 001234567000089', display_order = 6 WHERE role = 'vendeur' AND field_key = 'ice';

-- ─── Vendeur — Identité complémentaire ──────────────────────────────────────────
-- Réordonné : nom commercial puis chaîne de contact (référent → téléphone →
-- email) avant l'ancienneté, moins utile pour être recontacté rapidement.
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Atlas Bio (si différent de la raison sociale)', display_order = 0 WHERE role = 'vendeur' AND field_key = 'trade_name';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Sara Benali', display_order = 1 WHERE role = 'vendeur' AND field_key = 'contact_referent';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 06 12 34 56 78', display_order = 2 WHERE role = 'vendeur' AND field_key = 'contact_phone';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : contact@atlasbio.ma', display_order = 3 WHERE role = 'vendeur' AND field_key = 'contact_email';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 5', display_order = 4 WHERE role = 'vendeur' AND field_key = 'years_active';

-- ─── Vendeur — Activité & catalogue ─────────────────────────────────────────────
-- Réordonné : ce qui est vendu et où avant les conditions commerciales, puis
-- les informations secondaires (marques, exclusivité, site web) en dernier.
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Épicerie sèche, boissons, hygiène', display_order = 0 WHERE role = 'vendeur' AND field_key = 'product_categories';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Casablanca-Settat, Rabat-Salé-Kénitra', display_order = 1 WHERE role = 'vendeur' AND field_key = 'delivery_zones';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 10', display_order = 2 WHERE role = 'vendeur' AND field_key = 'default_moq';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 3', display_order = 3 WHERE role = 'vendeur' AND field_key = 'default_prep_days';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 500', display_order = 4 WHERE role = 'vendeur' AND field_key = 'default_franco_eur';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 500 palettes/mois ou 2000 m² d''entrepôt', display_order = 5 WHERE role = 'vendeur' AND field_key = 'production_capacity';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : marque propre, distribution Danone, Lesieur...', display_order = 6 WHERE role = 'vendeur' AND field_key = 'brands_represented';
UPDATE onboarding_field_definitions SET display_order = 7 WHERE role = 'vendeur' AND field_key = 'exclusive_distribution';
UPDATE onboarding_field_definitions SET placeholder = 'https://www.votre-site.ma', display_order = 8 WHERE role = 'vendeur' AND field_key = 'website';

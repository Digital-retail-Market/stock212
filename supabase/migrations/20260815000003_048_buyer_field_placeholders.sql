-- Migration 048 — Suggestions de saisie (placeholder) pour les champs
-- d'onboarding Acheteur, sur le même principe que le vendeur (migration 045).
-- Reste modifiable par l'admin depuis /admin/onboarding-fields.

-- ─── Informations légales ───────────────────────────────────────────────────
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Supermarché Al Amal SARL'   WHERE role = 'acheteur' AND field_key = 'org_name';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 45 Avenue Hassan II'         WHERE role = 'acheteur' AND field_key = 'address';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Rabat'                       WHERE role = 'acheteur' AND field_key = 'city';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Rabat-Salé-Kénitra'          WHERE role = 'acheteur' AND field_key = 'region';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 0537 12 34 56'               WHERE role = 'acheteur' AND field_key = 'phone';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : RC 123456'                   WHERE role = 'acheteur' AND field_key = 'siret';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : IF 45678901'                 WHERE role = 'acheteur' AND field_key = 'vat_number';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 001234567000089'             WHERE role = 'acheteur' AND field_key = 'ice';

-- ─── Contact commercial ─────────────────────────────────────────────────────
UPDATE onboarding_field_definitions SET placeholder = 'Ex : Karim Idrissi'               WHERE role = 'acheteur' AND field_key = 'contact_referent';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 06 12 34 56 78'              WHERE role = 'acheteur' AND field_key = 'contact_phone';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : achats@alamal.ma'            WHERE role = 'acheteur' AND field_key = 'contact_email';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 05 22 98 76 54'              WHERE role = 'acheteur' AND field_key = 'phone_secondary';
UPDATE onboarding_field_definitions SET placeholder = 'https://www.votre-site.ma'        WHERE role = 'acheteur' AND field_key = 'website';

-- ─── Activité ────────────────────────────────────────────────────────────────
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 8'                           WHERE role = 'acheteur' AND field_key = 'years_active';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 3'                           WHERE role = 'acheteur' AND field_key = 'points_of_sale';
UPDATE onboarding_field_definitions SET placeholder = 'Ex : 250'                         WHERE role = 'acheteur' AND field_key = 'store_surface_m2';

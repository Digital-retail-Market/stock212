-- Migration 041 — Champs d'onboarding personnalisables par l'admin
-- (couche additive : les champs "core" du formulaire restent hardcodés,
-- ce système ne gère que des champs additionnels stockés en JSONB)

-- ─── onboarding_field_definitions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_field_definitions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role           text NOT NULL CHECK (role IN ('acheteur','vendeur','livreur','commercial')),
  section        text NOT NULL DEFAULT 'Informations complémentaires',
  field_key      text NOT NULL,
  label          text NOT NULL,
  field_type     text NOT NULL CHECK (field_type IN (
    'text','number','email','url','select','multiselect','boolean','textarea','document'
  )),
  options        jsonb,
  required       boolean NOT NULL DEFAULT false,
  enabled        boolean NOT NULL DEFAULT true,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, field_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_field_defs_role ON onboarding_field_definitions (role);

ALTER TABLE onboarding_field_definitions ENABLE ROW LEVEL SECURITY;

-- Lecture publique des champs actifs (le formulaire d'onboarding doit pouvoir
-- les afficher avant même la création de l'organisation)
DROP POLICY IF EXISTS "onboarding_field_defs_read_enabled_auth" ON onboarding_field_definitions;
CREATE POLICY "onboarding_field_defs_read_enabled_auth" ON onboarding_field_definitions
  FOR SELECT TO authenticated USING (enabled = true);

DROP POLICY IF EXISTS "onboarding_field_defs_read_enabled_anon" ON onboarding_field_definitions;
CREATE POLICY "onboarding_field_defs_read_enabled_anon" ON onboarding_field_definitions
  FOR SELECT TO anon USING (enabled = true);

-- Écriture (et lecture des champs désactivés) réservée aux admins,
-- même pattern que content_items / org_subtypes (migration 032)
DROP POLICY IF EXISTS "onboarding_field_defs_admin_all" ON onboarding_field_definitions;
CREATE POLICY "onboarding_field_defs_admin_all" ON onboarding_field_definitions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true));

-- ─── custom_fields sur les tables de profils existantes ─────────────────────
-- Stocke les valeurs des champs additionnels sous la forme { "field_key": valeur }.
-- Les colonnes "core" existantes ne sont pas touchées.
ALTER TABLE buyer_profiles       ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE seller_profiles      ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE delivery_profiles    ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Le rôle Commercial ne crée pas d'organisation propre (voir OnboardingPage.tsx) :
-- sa demande d'adhésion vit sur organisation_members, donc ses champs
-- additionnels y sont stockés également.
ALTER TABLE organisation_members ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

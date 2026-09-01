-- Migration 039 — Documents justificatifs des certifications qualité vendeur
-- (upload facultatif lors de l'onboarding ISO 22000 / ISO 9001)

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS iso22000_doc_url text,
  ADD COLUMN IF NOT EXISTS iso9001_doc_url  text;

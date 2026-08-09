-- Migration 037 — Champs onboarding Acheteur (fiche Fiche_Acheteur_060826, validée client)

ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS contact_referent  text,
  ADD COLUMN IF NOT EXISTS contact_email     text,
  ADD COLUMN IF NOT EXISTS contact_phone     text,
  ADD COLUMN IF NOT EXISTS phone_secondary   text,
  ADD COLUMN IF NOT EXISTS website           text,
  ADD COLUMN IF NOT EXISTS years_active      integer,
  ADD COLUMN IF NOT EXISTS points_of_sale    integer,
  ADD COLUMN IF NOT EXISTS store_surface_m2  numeric(10,2),
  ADD COLUMN IF NOT EXISTS delivery_zone     text;

ALTER TABLE buyer_delivery_addresses
  ADD COLUMN IF NOT EXISTS instructions text;

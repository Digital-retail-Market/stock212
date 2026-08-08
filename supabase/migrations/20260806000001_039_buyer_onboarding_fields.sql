-- ============================================================================
-- 039 — Champs acheteur validés (Fiche_Acheteur_060826.xlsx)
-- ============================================================================
-- Aligne buyer_profiles avec la fiche d'onboarding acheteur validée par
-- l'équipe (colonnes "À garder" du fichier). Section 5 (paiement/crédit) et
-- plusieurs champs légaux (RC, Patente, IF, CNSS, Code postal, Nom
-- commercial, Forme juridique, Type d'établissement) ont été explicitement
-- retirés du formulaire acheteur dans cette même fiche — leurs colonnes
-- existantes ne sont pas supprimées (elles restent utiles pour
-- vendeur/transporteur), seul le formulaire acheteur ne les affiche plus.
-- ============================================================================

ALTER TABLE buyer_profiles
  ADD COLUMN IF NOT EXISTS contact_name          text,
  ADD COLUMN IF NOT EXISTS contact_email         text,
  ADD COLUMN IF NOT EXISTS contact_phone         text,
  ADD COLUMN IF NOT EXISTS website               text,
  ADD COLUMN IF NOT EXISTS years_active          integer,
  ADD COLUMN IF NOT EXISTS outlet_count          integer,
  ADD COLUMN IF NOT EXISTS store_surface         text,
  ADD COLUMN IF NOT EXISTS delivery_zone         text,
  ADD COLUMN IF NOT EXISTS delivery_address      text,
  ADD COLUMN IF NOT EXISTS delivery_instructions text;

-- Téléphone fixe secondaire (Section 1 de la fiche, "Téléphone 2 (Fixe)",
-- optionnel) — sur organisations plutôt que buyer_profiles car conceptuellement
-- un second numéro de l'organisation, au même titre que `phone` (migration 031).
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS phone_2 text;
-- Migration 050 — Poids de l'algorithme de recommandation des offres
--
-- Ajoute à la table singleton `platform_settings` les 5 poids configurables par
-- l'administrateur pour le classement multi-critères des offres fournisseurs
-- (prix / livraison / qualité fournisseur / fraîcheur / proximité).
--
-- Le BACKEND est la source de vérité : une contrainte CHECK garantit que
--   • aucun poids n'est négatif ;
--   • la somme des 5 poids vaut 100 (arrondi à 0,01 près pour tolérer les
--     valeurs décimales du type 35,5 + 19,5 + …).
-- Toute mise à jour (via AdminSettings) violant ces règles est rejetée par
-- Postgres, indépendamment de la validation front-end.
--
-- La politique RLS d'UPDATE réservée aux admins existe déjà
-- (`platform_settings_admin_update`, migration 024) — rien à ajouter ici.
--
-- Toutes les instructions sont idempotentes.

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS reco_weight_price            numeric(6,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS reco_weight_delivery         numeric(6,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS reco_weight_supplier_quality numeric(6,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS reco_weight_freshness        numeric(6,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS reco_weight_proximity        numeric(6,2) NOT NULL DEFAULT 10;

-- Rattrape d'éventuelles lignes existantes dont les colonnes seraient NULL
-- (ne devrait pas arriver avec DEFAULT + NOT NULL, sécurité ceinture/bretelles).
UPDATE platform_settings SET
  reco_weight_price            = COALESCE(reco_weight_price, 35),
  reco_weight_delivery         = COALESCE(reco_weight_delivery, 20),
  reco_weight_supplier_quality = COALESCE(reco_weight_supplier_quality, 20),
  reco_weight_freshness        = COALESCE(reco_weight_freshness, 15),
  reco_weight_proximity        = COALESCE(reco_weight_proximity, 10)
WHERE reco_weight_price IS NULL
   OR reco_weight_delivery IS NULL
   OR reco_weight_supplier_quality IS NULL
   OR reco_weight_freshness IS NULL
   OR reco_weight_proximity IS NULL;

ALTER TABLE platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_reco_weights_valid;

ALTER TABLE platform_settings
  ADD CONSTRAINT platform_settings_reco_weights_valid CHECK (
    reco_weight_price            >= 0 AND
    reco_weight_delivery         >= 0 AND
    reco_weight_supplier_quality >= 0 AND
    reco_weight_freshness        >= 0 AND
    reco_weight_proximity        >= 0 AND
    round(
      (reco_weight_price
        + reco_weight_delivery
        + reco_weight_supplier_quality
        + reco_weight_freshness
        + reco_weight_proximity)::numeric,
      2
    ) = 100
  );

COMMENT ON COLUMN platform_settings.reco_weight_price IS
  'Poids du critère "prix produit" dans le score de recommandation (%). Somme des 5 poids = 100.';
COMMENT ON COLUMN platform_settings.reco_weight_delivery IS
  'Poids du critère "coût de livraison" dans le score de recommandation (%).';
COMMENT ON COLUMN platform_settings.reco_weight_supplier_quality IS
  'Poids du critère "qualité fournisseur" dans le score de recommandation (%).';
COMMENT ON COLUMN platform_settings.reco_weight_freshness IS
  'Poids du critère "fraîcheur produit" dans le score de recommandation (%).';
COMMENT ON COLUMN platform_settings.reco_weight_proximity IS
  'Poids du critère "proximité géographique" dans le score de recommandation (%).';

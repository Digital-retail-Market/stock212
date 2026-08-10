-- ============================================================================
-- 037 — Module Agent Commercial (Modèle A) — backend manquant
-- ============================================================================
-- Le frontend (AgentDashboard.tsx, AgentQuoteCreate.tsx, VendorTeam.tsx)
-- appelle des colonnes, tables et fonctions RPC qui n'existaient dans aucune
-- migration commitée. Cette migration les crée pour que le module soit
-- réellement exécutable de bout en bout (candidature → approbation → CRM
-- léger → devis → commission), conformément au cahier des charges section 7.1
-- (Modèle A — agent rattaché à un vendeur unique).
-- ============================================================================

-- ─── 1. organisation_members.commission_rate ───────────────────────────────
-- Taux de commission (%) défini par le vendeur pour un membre 'sales_rep'.
ALTER TABLE organisation_members
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2)
    CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100));

-- ─── 1.bis profiles.phone ───────────────────────────────────────────────────
-- Référencé par VendorTeam.tsx (fiche membre) et MonComptePage.tsx mais
-- absent de la table profiles d'origine. Ajout de sécurité, sans impact.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- ─── 2. agent_portfolio ─────────────────────────────────────────────────────
-- Lien entre un agent (sa ligne organisation_members chez le vendeur qu'il
-- représente) et les organisations acheteuses qu'il gère.
CREATE TABLE IF NOT EXISTS agent_portfolio (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_member_id        uuid NOT NULL REFERENCES organisation_members(id) ON DELETE CASCADE,
  buyer_organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  added_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_member_id, buyer_organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_portfolio_member ON agent_portfolio (agent_member_id);
CREATE INDEX IF NOT EXISTS idx_agent_portfolio_buyer  ON agent_portfolio (buyer_organisation_id);

ALTER TABLE agent_portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_portfolio_select_own" ON agent_portfolio;
CREATE POLICY "agent_portfolio_select_own" ON agent_portfolio FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.id = agent_portfolio.agent_member_id AND om.user_id = auth.uid()
    )
  );

-- ─── 3. agent_activities ────────────────────────────────────────────────────
-- CRM léger : appels, visites, relances, devis notés par l'agent pour un
-- acheteur de son portefeuille.
CREATE TABLE IF NOT EXISTS agent_activities (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_member_id        uuid NOT NULL REFERENCES organisation_members(id) ON DELETE CASCADE,
  buyer_organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  activity_type          text NOT NULL CHECK (activity_type IN ('appel','visite','email','devis','autre')),
  note                   text,
  next_action_label      text,
  next_action_date       date,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_activities_member ON agent_activities (agent_member_id);
CREATE INDEX IF NOT EXISTS idx_agent_activities_buyer  ON agent_activities (buyer_organisation_id);

ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_activities_select_own" ON agent_activities;
CREATE POLICY "agent_activities_select_own" ON agent_activities FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.id = agent_activities.agent_member_id AND om.user_id = auth.uid()
    )
  );

-- Note : les écritures (insert) passent exclusivement par la fonction
-- add_agent_activity() ci-dessous (SECURITY DEFINER), donc pas de policy
-- INSERT ouverte ici — elle resterait inutile et élargirait la surface RLS.

-- ============================================================================
-- 4. Fonctions RPC
-- ============================================================================

-- get_agent_membership()
-- Retourne le rattachement actif de l'utilisateur courant en tant qu'agent
-- (Modèle A : un seul vendeur actif à la fois).
CREATE OR REPLACE FUNCTION get_agent_membership()
RETURNS TABLE (
  agent_member_id  uuid,
  vendor_org_id    uuid,
  vendor_name      text,
  commission_rate  numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.id, om.organisation_id, o.name, om.commission_rate
  FROM organisation_members om
  JOIN organisations o ON o.id = om.organisation_id
  WHERE om.user_id = auth.uid()
    AND om.team_role = 'sales_rep'
    AND om.active = true
  ORDER BY om.joined_at DESC
  LIMIT 1;
$$;

-- get_agent_portfolio()
-- Portefeuille d'acheteurs de l'agent courant, avec compteur d'activités.
CREATE OR REPLACE FUNCTION get_agent_portfolio()
RETURNS TABLE (
  buyer_organisation_id uuid,
  name                  text,
  org_type              text,
  validation_status     text,
  activity_count        bigint,
  added_at              timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mem AS (
    SELECT om.id FROM organisation_members om
    WHERE om.user_id = auth.uid() AND om.team_role = 'sales_rep' AND om.active = true
    ORDER BY om.joined_at DESC LIMIT 1
  )
  SELECT
    ap.buyer_organisation_id,
    o.name,
    o.org_type,
    o.validation_status,
    COUNT(aa.id) AS activity_count,
    ap.added_at
  FROM agent_portfolio ap
  JOIN organisations o ON o.id = ap.buyer_organisation_id
  LEFT JOIN agent_activities aa
    ON aa.buyer_organisation_id = ap.buyer_organisation_id
   AND aa.agent_member_id = ap.agent_member_id
  WHERE ap.agent_member_id = (SELECT id FROM mem)
  GROUP BY ap.buyer_organisation_id, o.name, o.org_type, o.validation_status, ap.added_at
  ORDER BY ap.added_at DESC;
$$;

-- get_agent_activities(limit_count)
-- Historique récent des activités de l'agent courant, toutes organisations
-- de son portefeuille confondues.
CREATE OR REPLACE FUNCTION get_agent_activities(limit_count int DEFAULT 20)
RETURNS TABLE (
  id                     uuid,
  buyer_organisation_id  uuid,
  buyer_name             text,
  activity_type          text,
  note                   text,
  next_action_label      text,
  next_action_date       date,
  created_at             timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mem AS (
    SELECT om.id FROM organisation_members om
    WHERE om.user_id = auth.uid() AND om.team_role = 'sales_rep' AND om.active = true
    ORDER BY om.joined_at DESC LIMIT 1
  )
  SELECT aa.id, aa.buyer_organisation_id, o.name, aa.activity_type,
         aa.note, aa.next_action_label, aa.next_action_date, aa.created_at
  FROM agent_activities aa
  JOIN organisations o ON o.id = aa.buyer_organisation_id
  WHERE aa.agent_member_id = (SELECT id FROM mem)
  ORDER BY aa.created_at DESC
  LIMIT limit_count;
$$;

-- add_agent_activity(...)
-- Enregistre une activité de suivi commercial pour l'agent courant. Vérifie
-- que l'acheteur ciblé fait bien partie de son portefeuille.
CREATE OR REPLACE FUNCTION add_agent_activity(
  buyer_org_id          uuid,
  p_activity_type       text,
  p_note                text DEFAULT NULL,
  p_next_action_label   text DEFAULT NULL,
  p_next_action_date    date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_member_id uuid;
  v_activity_id     uuid;
BEGIN
  SELECT om.id INTO v_agent_member_id
  FROM organisation_members om
  WHERE om.user_id = auth.uid() AND om.team_role = 'sales_rep' AND om.active = true
  ORDER BY om.joined_at DESC LIMIT 1;

  IF v_agent_member_id IS NULL THEN
    RAISE EXCEPTION 'Aucun rattachement agent actif pour cet utilisateur';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM agent_portfolio ap
    WHERE ap.agent_member_id = v_agent_member_id AND ap.buyer_organisation_id = buyer_org_id
  ) THEN
    RAISE EXCEPTION 'Cet acheteur ne fait pas partie de votre portefeuille';
  END IF;

  INSERT INTO agent_activities (
    agent_member_id, buyer_organisation_id, activity_type, note,
    next_action_label, next_action_date
  ) VALUES (
    v_agent_member_id, buyer_org_id, p_activity_type, p_note,
    p_next_action_label, p_next_action_date
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- add_buyer_to_agent_portfolio(buyer_org_id)
-- Rattache un acheteur déjà inscrit au portefeuille de l'agent courant.
CREATE OR REPLACE FUNCTION add_buyer_to_agent_portfolio(buyer_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_member_id uuid;
BEGIN
  SELECT om.id INTO v_agent_member_id
  FROM organisation_members om
  WHERE om.user_id = auth.uid() AND om.team_role = 'sales_rep' AND om.active = true
  ORDER BY om.joined_at DESC LIMIT 1;

  IF v_agent_member_id IS NULL THEN
    RAISE EXCEPTION 'Aucun rattachement agent actif pour cet utilisateur';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organisations o WHERE o.id = buyer_org_id AND o.org_type = 'buyer') THEN
    RAISE EXCEPTION 'Organisation acheteuse introuvable';
  END IF;

  INSERT INTO agent_portfolio (agent_member_id, buyer_organisation_id)
  VALUES (v_agent_member_id, buyer_org_id)
  ON CONFLICT (agent_member_id, buyer_organisation_id) DO NOTHING;
END;
$$;

-- search_buyer_organisations(search_query)
-- Recherche d'acheteurs déjà inscrits, pour l'ajout au portefeuille agent.
CREATE OR REPLACE FUNCTION search_buyer_organisations(search_query text)
RETURNS TABLE (
  id      uuid,
  name    text,
  city    text,
  country text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.city, o.country
  FROM organisations o
  WHERE o.org_type = 'buyer'
    AND o.validation_status = 'active'
    AND o.name ILIKE '%' || search_query || '%'
  ORDER BY o.name
  LIMIT 10;
$$;

-- get_agent_month_summary(period_start)
-- CA réalisé, commission calculée et nouveaux comptes du mois pour l'agent
-- courant. Règle : commission = somme des commandes du mois passées par les
-- acheteurs du portefeuille auprès du vendeur représenté × taux défini par
-- ce vendeur (cahier des charges, section 7.1).
CREATE OR REPLACE FUNCTION get_agent_month_summary(period_start date)
RETURNS TABLE (
  revenue_achieved       numeric,
  commission_amount      numeric,
  new_accounts_achieved  bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mem AS (
    SELECT om.id AS agent_member_id, om.organisation_id AS vendor_org_id,
           COALESCE(om.commission_rate, 0) AS commission_rate
    FROM organisation_members om
    WHERE om.user_id = auth.uid() AND om.team_role = 'sales_rep' AND om.active = true
    ORDER BY om.joined_at DESC LIMIT 1
  ),
  revenue AS (
    SELECT COALESCE(SUM(ord.total_ttc), 0) AS total
    FROM orders ord
    JOIN mem ON ord.seller_org_id = mem.vendor_org_id
    WHERE ord.buyer_org_id IN (
      SELECT ap.buyer_organisation_id FROM agent_portfolio ap WHERE ap.agent_member_id = mem.agent_member_id
    )
    AND ord.created_at >= period_start
    AND ord.status <> 'cancelled'
  ),
  new_accounts AS (
    SELECT COUNT(*) AS n
    FROM agent_portfolio ap
    JOIN mem ON ap.agent_member_id = mem.agent_member_id
    WHERE ap.added_at >= period_start
  )
  SELECT
    revenue.total,
    ROUND(revenue.total * (SELECT commission_rate FROM mem) / 100.0, 2),
    new_accounts.n
  FROM revenue, new_accounts;
$$;

-- get_agent_performance(p_agent_member_id, period_start)
-- Vue vendeur : performance d'un agent précis de son équipe. Restreint au
-- propriétaire/admin de l'organisation dont dépend cet agent.
CREATE OR REPLACE FUNCTION get_agent_performance(p_agent_member_id uuid, period_start date)
RETURNS TABLE (
  portfolio_count          bigint,
  activities_this_month    bigint,
  revenue_achieved         numeric,
  commission_amount        numeric,
  new_accounts_this_month  bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_org_id   uuid;
  v_commission_rate numeric;
BEGIN
  SELECT om.organisation_id, COALESCE(om.commission_rate, 0)
  INTO v_vendor_org_id, v_commission_rate
  FROM organisation_members om
  WHERE om.id = p_agent_member_id AND om.team_role = 'sales_rep';

  IF v_vendor_org_id IS NULL THEN
    RAISE EXCEPTION 'Agent introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organisation_members caller
    WHERE caller.organisation_id = v_vendor_org_id
      AND caller.user_id = auth.uid()
      AND caller.team_role IN ('owner','admin_seller')
      AND caller.active = true
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé à la performance de cet agent';
  END IF;

  RETURN QUERY
  WITH revenue AS (
    SELECT COALESCE(SUM(ord.total_ttc), 0) AS total
    FROM orders ord
    WHERE ord.seller_org_id = v_vendor_org_id
      AND ord.buyer_org_id IN (
        SELECT ap.buyer_organisation_id FROM agent_portfolio ap WHERE ap.agent_member_id = p_agent_member_id
      )
      AND ord.created_at >= period_start
      AND ord.status <> 'cancelled'
  )
  SELECT
    (SELECT COUNT(*) FROM agent_portfolio ap WHERE ap.agent_member_id = p_agent_member_id),
    (SELECT COUNT(*) FROM agent_activities aa
       WHERE aa.agent_member_id = p_agent_member_id AND aa.created_at >= period_start),
    revenue.total,
    ROUND(revenue.total * v_commission_rate / 100.0, 2),
    (SELECT COUNT(*) FROM agent_portfolio ap
       WHERE ap.agent_member_id = p_agent_member_id AND ap.added_at >= period_start)
  FROM revenue;
END;
$$;

-- get_organisation_members_with_profile(org_id)
-- Utilisée par VendorTeam.tsx pour afficher l'équipe (membres actifs +
-- demandes en attente) avec profil (nom, langue, téléphone). SECURITY
-- DEFINER car profiles est normalement restreint à son propre propriétaire.
CREATE OR REPLACE FUNCTION get_organisation_members_with_profile(org_id uuid)
RETURNS TABLE (
  id               uuid,
  organisation_id  uuid,
  user_id          uuid,
  team_role        text,
  active           boolean,
  joined_at        timestamptz,
  commission_rate  numeric,
  full_name        text,
  preferred_lang   text,
  phone            text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.id, om.organisation_id, om.user_id, om.team_role, om.active,
         om.joined_at, om.commission_rate, p.full_name, p.preferred_lang, p.phone
  FROM organisation_members om
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organisation_id = org_id
    AND EXISTS (
      SELECT 1 FROM organisation_members caller
      WHERE caller.organisation_id = org_id
        AND caller.user_id = auth.uid()
        AND caller.active = true
    )
  ORDER BY om.joined_at;
$$;

-- ─── 5. Droits d'exécution ──────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_agent_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_portfolio() TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_activities(int) TO authenticated;
GRANT EXECUTE ON FUNCTION add_agent_activity(uuid, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION add_buyer_to_agent_portfolio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_buyer_organisations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_month_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_performance(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organisation_members_with_profile(uuid) TO authenticated;
-- ============================================================================
-- 038 — Checkout transactionnel multi-vendeurs (place_multi_vendor_order)
-- ============================================================================
-- Remplace la boucle non-transactionnelle de CheckoutPage.tsx qui insérait
-- une commande + ses lignes par vendeur avec des appels Supabase séparés :
-- un échec au milieu de la boucle laissait des commandes déjà committées
-- pour les premiers vendeurs, sans marquer le panier converti, et sans
-- garantie de cohérence en cas de nouvel essai.
--
-- Cette fonction fait tout dans une seule transaction Postgres (le
-- comportement par défaut d'une fonction PL/pgSQL) : soit toutes les
-- commandes multi-vendeurs sont créées et le panier passe à 'converted',
-- soit rien n'est écrit du tout.
--
-- Bénéfice de sécurité additionnel : les prix ne sont plus envoyés par le
-- client. La fonction relit elle-même cart_items + price_tiers côté serveur
-- pour calculer chaque montant, donc un client qui altérerait les prix
-- avant l'appel n'a plus aucun effet.
-- ============================================================================

CREATE OR REPLACE FUNCTION place_multi_vendor_order(
  p_cart_id             uuid,
  p_payment_terms       text,
  p_payment_method      text,
  p_delivery_address    jsonb,
  p_billing_address     jsonb,
  p_delivery_preference text,
  p_delivery_method     text,
  p_carrier_org_id      uuid,
  p_notes               text
)
RETURNS TABLE (
  order_id       uuid,
  order_number   text,
  seller_org_id  uuid,
  total_ttc      numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_org_id uuid;
  v_seller       record;
  v_order_id     uuid;
  v_order_number text;
  v_subtotal     numeric;
  v_delivery_fee numeric;
  v_cfg          record;
  v_currency     text;
BEGIN
  -- ─── 1. Résolution + autorisation du panier ──────────────────────────────
  SELECT c.buyer_org_id INTO v_buyer_org_id
  FROM carts c
  WHERE c.id = p_cart_id AND c.status = 'active';

  IF v_buyer_org_id IS NULL THEN
    RAISE EXCEPTION 'Panier introuvable ou déjà validé';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organisation_members om
    WHERE om.organisation_id = v_buyer_org_id AND om.user_id = auth.uid() AND om.active = true
  ) THEN
    RAISE EXCEPTION 'Non autorisé à passer commande pour ce panier';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organisations o WHERE o.id = v_buyer_org_id AND o.validation_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Organisation en attente de validation, commande impossible';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = p_cart_id) THEN
    RAISE EXCEPTION 'Le panier est vide';
  END IF;

  -- ─── 2. Règles métier (MOQ, transporteur) ────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = p_cart_id AND ci.quantity < p.moq
  ) THEN
    RAISE EXCEPTION 'Certaines quantités ne respectent pas le MOQ requis';
  END IF;

  IF p_delivery_method = 'partner_carrier' AND p_carrier_org_id IS NULL THEN
    RAISE EXCEPTION 'Un transporteur partenaire doit être sélectionné';
  END IF;

  -- ─── 3. Une commande par vendeur présent dans le panier ──────────────────
  FOR v_seller IN
    SELECT DISTINCT p.seller_org_id AS sid
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = p_cart_id
  LOOP
    -- Sous-total recalculé côté serveur à partir des price_tiers réels
    -- (jamais depuis un prix envoyé par le client).
    SELECT
      COALESCE(SUM(ci.quantity * COALESCE(pt.unit_price, 0)), 0),
      MIN(p.currency)
    INTO v_subtotal, v_currency
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN LATERAL (
      SELECT unit_price FROM price_tiers
      WHERE product_id = ci.product_id AND qty_min <= ci.quantity
      ORDER BY qty_min DESC LIMIT 1
    ) pt ON true
    WHERE ci.cart_id = p_cart_id AND p.seller_org_id = v_seller.sid;

    -- Frais de livraison — même logique que computeDeliveryFee() côté client
    -- (src/lib/cartOptimizer.ts), rejouée ici pour ne pas dépendre du calcul
    -- envoyé par le navigateur.
    SELECT * INTO v_cfg FROM vendor_delivery_config vdc WHERE vdc.seller_org_id = v_seller.sid;

    v_delivery_fee := CASE
      WHEN p_delivery_method = 'buyer_managed' THEN 0
      WHEN v_cfg IS NULL THEN 0
      WHEN v_cfg.delivery_mode = 'free_always' THEN 0
      WHEN v_cfg.delivery_mode = 'negotiated' THEN 0
      WHEN v_cfg.delivery_mode = 'flat_rate' THEN v_cfg.flat_rate_mad
      WHEN v_cfg.delivery_mode = 'free_above_threshold' THEN
        CASE WHEN v_subtotal >= COALESCE(v_cfg.free_threshold_mad, 1000)
             THEN 0 ELSE v_cfg.flat_rate_mad END
      WHEN v_cfg.delivery_mode = 'percentage' THEN
        GREATEST(
          COALESCE(v_cfg.min_charge_mad, 0),
          LEAST(
            v_subtotal * COALESCE(v_cfg.percentage_rate, 0.05),
            COALESCE(v_cfg.max_charge_mad, v_subtotal * COALESCE(v_cfg.percentage_rate, 0.05))
          )
        )
      ELSE COALESCE(v_cfg.flat_rate_mad, 0)
    END;

    v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDDHH24MISS')
      || '-' || upper(substr(md5(random()::text), 1, 4));

    INSERT INTO orders (
      order_number, buyer_org_id, seller_org_id, status,
      total_ht, total_taxes, total_ttc, currency,
      payment_terms, payment_method, delivery_address, billing_address,
      delivery_preference, notes, cart_id, delivery_fee_mad,
      delivery_method, carrier_org_id
    ) VALUES (
      v_order_number, v_buyer_org_id, v_seller.sid, 'pending',
      round(v_subtotal, 2), round(v_subtotal * 0.2, 2), round(v_subtotal * 1.2, 2),
      COALESCE(v_currency, 'MAD'),
      p_payment_terms, p_payment_method, p_delivery_address, p_billing_address,
      p_delivery_preference, p_notes, p_cart_id, round(v_delivery_fee, 2),
      p_delivery_method,
      CASE WHEN p_delivery_method = 'partner_carrier' THEN p_carrier_org_id ELSE NULL END
    )
    RETURNING id INTO v_order_id;

    INSERT INTO order_lines (
      order_id, product_id, variant_id, product_name_snap,
      quantity, unit_price_ht, line_total_ht
    )
    SELECT
      v_order_id, ci.product_id, ci.variant_id, p.name, ci.quantity,
      COALESCE(pt.unit_price, 0),
      ci.quantity * COALESCE(pt.unit_price, 0)
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN LATERAL (
      SELECT unit_price FROM price_tiers
      WHERE product_id = ci.product_id AND qty_min <= ci.quantity
      ORDER BY qty_min DESC LIMIT 1
    ) pt ON true
    WHERE ci.cart_id = p_cart_id AND p.seller_org_id = v_seller.sid;

    order_id := v_order_id;
    order_number := v_order_number;
    seller_org_id := v_seller.sid;
    total_ttc := round(v_subtotal * 1.2, 2);
    RETURN NEXT;
  END LOOP;

  -- ─── 4. Panier marqué converti seulement si tout a réussi ────────────────
  UPDATE carts SET status = 'converted', updated_at = now() WHERE id = p_cart_id;
END;
$$;

GRANT EXECUTE ON FUNCTION place_multi_vendor_order(
  uuid, text, text, jsonb, jsonb, text, text, uuid, text
) TO authenticated;
-- ═══════════════════════════════════════════════════════════════════════════════
-- Seed : Marché marocain — fournisseurs multiples & offres concurrentes
-- Stock212
--
-- OBJECTIF
--   Peupler la plateforme avec un échantillon RÉALISTE mais 100 % FICTIF du
--   marché FMCG marocain : 8 fournisseurs répartis sur 8 villes + 11 produits
--   de référence, chacun proposé par 2 à 4 fournisseurs à des conditions
--   différentes (prix, livraison, note, certifications, fraîcheur, localisation).
--   → sert à exercer l'algorithme de recommandation multi-critères
--     (page « Comparateur d'offres » / lib/recommendation).
--
--   Aucune donnée n'est scrapée. Les raisons sociales, EAN (préfixe 611xxxxxxxxxx
--   non attribué), notes et adresses sont inventées pour la démo/les tests.
--
-- EXÉCUTION
--   supabase db reset            (rejoue tous les seeds)
--   ou :  psql "$DATABASE_URL" -f supabase/seeds/moroccan_market_offers.sql
--
--   Le script est IDEMPOTENT (UUID fixes + ON CONFLICT + gardes IF NOT EXISTS).
--
-- PLAGES D'UUID
--   users    00000000-0000-0000-0000-1000000000{50..58}
--   orgs     00000000-0000-0000-0000-2000000000{50..58}
--   members  00000000-0000-0000-0000-3000000000{50..58}
--   Mot de passe de tous les comptes : Test1234!
-- ═══════════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════════════
-- BLOC 1 — auth.users + auth.identities  (8 fournisseurs + 1 acheteur test)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user, deleted_at)
VALUES
  ('00000000-0000-0000-0000-100000000050','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-lesieur@stock212.test',  crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Nabil Cherkaoui"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000051','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-savola@stock212.test',   crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Imane Ouazzani"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000052','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-atlasgros@stock212.test', crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Reda Bennani"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000053','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-fesgros@stock212.test',   crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Khalid Alaoui"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000054','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-souss@stock212.test',     crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Fatima Zahra Idrissi"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000055','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-argan@stock212.test',     crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Latifa Ait Baha"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000056','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-nordtrading@stock212.test',crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Tariq Berrada"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000057','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-oriental@stock212.test',  crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Samir Lahlou"}'::jsonb,false,false,null),
  ('00000000-0000-0000-0000-100000000058','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mkt-riad-buyer@stock212.test',crypt('Test1234!',gen_salt('bf',10)),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Yassine Sabri"}'::jsonb,false,false,null)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
SELECT u.email, u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email', now(), now()
FROM auth.users u
WHERE u.email LIKE 'mkt-%@stock212.test'
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);


-- ══════════════════════════════════════════════════════════════════════════════
-- BLOC 2 — profiles, organisations, membres, profils métier, config livraison
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO profiles (id, full_name, preferred_lang, preferred_currency, gdpr_consent, onboarding_done, is_admin, created_at)
VALUES
  ('00000000-0000-0000-0000-100000000050','Nabil Cherkaoui',       'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000051','Imane Ouazzani',        'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000052','Reda Bennani',          'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000053','Khalid Alaoui',         'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000054','Fatima Zahra Idrissi',  'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000055','Latifa Ait Baha',       'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000056','Tariq Berrada',         'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000057','Samir Lahlou',          'fr','MAD',true,true,false,now()),
  ('00000000-0000-0000-0000-100000000058','Yassine Sabri',         'fr','MAD',true,true,false,now())
ON CONFLICT (id) DO UPDATE SET
  full_name          = EXCLUDED.full_name,
  preferred_currency = 'MAD',
  onboarding_done    = true;

INSERT INTO organisations (id, name, org_type, sub_type, country, address_line1, city, postal_code, region, validation_status, created_at)
VALUES
  ('00000000-0000-0000-0000-200000000050','Lesieur Cristal Distribution', 'seller','Fabricant',                 'MA','Rue Ibn Al Ouannane, Aïn Sebaâ',      'Casablanca','20250','Casablanca-Settat',      'active',now()),
  ('00000000-0000-0000-0000-200000000051','Savola Maroc Négoce',          'seller','Importateur / Exportateur',  'MA','Bd Chefchaouni, Aïn Sebaâ',           'Casablanca','20580','Casablanca-Settat',      'active',now()),
  ('00000000-0000-0000-0000-200000000052','AtlasGros Rabat',              'seller','Grossiste',                 'MA','Zone Industrielle Takaddoum',         'Rabat',     '10000','Rabat-Salé-Kénitra',     'active',now()),
  ('00000000-0000-0000-0000-200000000053','Fès Épicerie en Gros',         'seller','Grossiste',                 'MA','Quartier Industriel Sidi Brahim',     'Fès',       '30000','Fès-Meknès',             'active',now()),
  ('00000000-0000-0000-0000-200000000054','Souss Distribution Agadir',    'seller','Distributeur',              'MA','Zone Industrielle Ait Melloul',       'Agadir',    '80000','Souss-Massa',            'active',now()),
  ('00000000-0000-0000-0000-200000000055','Coopérative Argan & Terroir',  'seller','Coopérative',               'MA','Route de Taroudant, Ouled Teima',     'Marrakech', '40000','Marrakech-Safi',         'active',now()),
  ('00000000-0000-0000-0000-200000000056','Nord Trading Tanger',          'seller','Importateur / Exportateur',  'MA','Zone Franche Tanger Med',             'Tanger',    '90000','Tanger-Tétouan',         'active',now()),
  ('00000000-0000-0000-0000-200000000057','Oriental Foods Oujda',         'seller','Distributeur',              'MA','Bd Mohammed VI, Sidi Yahya',          'Oujda',     '60000','Oriental',               'active',now()),
  ('00000000-0000-0000-0000-200000000058','Restaurant Le Riad (test)',    'buyer', 'Restaurant',                'MA','Rue Talaa Kbira, Médina',             'Fès',       '30000','Fès-Meknès',             'active',now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO organisation_members (id, organisation_id, user_id, team_role, active, joined_at)
VALUES
  ('00000000-0000-0000-0000-300000000050','00000000-0000-0000-0000-200000000050','00000000-0000-0000-0000-100000000050','owner',true,now()),
  ('00000000-0000-0000-0000-300000000051','00000000-0000-0000-0000-200000000051','00000000-0000-0000-0000-100000000051','owner',true,now()),
  ('00000000-0000-0000-0000-300000000052','00000000-0000-0000-0000-200000000052','00000000-0000-0000-0000-100000000052','owner',true,now()),
  ('00000000-0000-0000-0000-300000000053','00000000-0000-0000-0000-200000000053','00000000-0000-0000-0000-100000000053','owner',true,now()),
  ('00000000-0000-0000-0000-300000000054','00000000-0000-0000-0000-200000000054','00000000-0000-0000-0000-100000000054','owner',true,now()),
  ('00000000-0000-0000-0000-300000000055','00000000-0000-0000-0000-200000000055','00000000-0000-0000-0000-100000000055','owner',true,now()),
  ('00000000-0000-0000-0000-300000000056','00000000-0000-0000-0000-200000000056','00000000-0000-0000-0000-100000000056','owner',true,now()),
  ('00000000-0000-0000-0000-300000000057','00000000-0000-0000-0000-200000000057','00000000-0000-0000-0000-100000000057','owner',true,now()),
  ('00000000-0000-0000-0000-300000000058','00000000-0000-0000-0000-200000000058','00000000-0000-0000-0000-100000000058','owner',true,now())
ON CONFLICT (id) DO NOTHING;

-- Profils vendeurs — note moyenne + certifications alimentent le critère « qualité fournisseur »
INSERT INTO seller_profiles (organisation_id, certifications, accepted_payment_terms, default_prep_days, avg_rating, review_count)
VALUES
  ('00000000-0000-0000-0000-200000000050',ARRAY['ONSSA','ISO 22000','HACCP'], ARRAY['prepayment','30_days'],           2, 4.8, 210),
  ('00000000-0000-0000-0000-200000000051',ARRAY['ONSSA'],                     ARRAY['prepayment','15_days','30_days'],  3, 4.3,  56),
  ('00000000-0000-0000-0000-200000000052',ARRAY['ONSSA','Halal'],             ARRAY['prepayment','30_days','60_days'],  3, 4.5,  88),
  ('00000000-0000-0000-0000-200000000053',ARRAY[]::text[],                    ARRAY['prepayment'],                      4, 4.0,  23),
  ('00000000-0000-0000-0000-200000000054',ARRAY['ONSSA'],                     ARRAY['prepayment','30_days'],            3, 4.4,  47),
  ('00000000-0000-0000-0000-200000000055',ARRAY['Bio AB','Ecocert','ONSSA'],  ARRAY['prepayment'],                     5, 4.9,  15),
  ('00000000-0000-0000-0000-200000000056',ARRAY['ONSSA'],                     ARRAY['prepayment','15_days'],            4, 4.2,  34),
  ('00000000-0000-0000-0000-200000000057',ARRAY[]::text[],                    ARRAY['prepayment'],                      5, 3.9,   9)
ON CONFLICT (organisation_id) DO NOTHING;

INSERT INTO buyer_profiles (organisation_id, credit_limit, default_payment_terms, interest_categories)
VALUES ('00000000-0000-0000-0000-200000000058', 40000.00, '30_days', ARRAY['Épicerie sèche','Conserves','Boissons'])
ON CONFLICT (organisation_id) DO NOTHING;

-- Politiques de livraison — alimentent le critère « coût de livraison »
-- (modes : flat_rate / free_above_threshold / percentage / free_always)
INSERT INTO vendor_delivery_config
  (seller_org_id, delivery_mode, flat_rate_mad, free_threshold_mad, percentage_rate, min_charge_mad, max_charge_mad, notes)
VALUES
  ('00000000-0000-0000-0000-200000000050','free_above_threshold', 40, 1000, NULL, NULL, NULL, 'Franco de port dès 1 000 MAD'),
  ('00000000-0000-0000-0000-200000000051','flat_rate',            45, NULL, NULL, NULL, NULL, 'Forfait national'),
  ('00000000-0000-0000-0000-200000000052','free_above_threshold', 35, 1500, NULL, NULL, NULL, 'Franco dès 1 500 MAD'),
  ('00000000-0000-0000-0000-200000000053','flat_rate',            30, NULL, NULL, NULL, NULL, 'Forfait, livraison régionale rapide'),
  ('00000000-0000-0000-0000-200000000054','flat_rate',            25, NULL, NULL, NULL, NULL, 'Forfait Sud'),
  ('00000000-0000-0000-0000-200000000055','free_always',           0, NULL, NULL, NULL, NULL, 'Livraison offerte (coopérative)'),
  ('00000000-0000-0000-0000-200000000056','percentage',            0, NULL, 0.04, 20,   60,  '4 % du montant, min 20 / max 60 MAD'),
  ('00000000-0000-0000-0000-200000000057','flat_rate',            35, NULL, NULL, NULL, NULL, 'Forfait, hub Oriental')
ON CONFLICT (seller_org_id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════════════════
-- BLOC 3 — produits + paliers de prix + lots (offres concurrentes par EAN)
-- ══════════════════════════════════════════════════════════════════════════════

-- Fonction utilitaire temporaire (schéma pg_temp → auto-supprimée en fin de
-- session). Crée une offre = 1 produit + 3 paliers de prix, et un lot optionnel
-- (p_lot_days = jours restants avant péremption). Idempotente : ne fait rien si
-- ce vendeur propose déjà cet EAN.
CREATE OR REPLACE FUNCTION pg_temp.seed_ma_add_offer(
  p_seller uuid, p_name text, p_desc text, p_cat_name text, p_ean text,
  p_moq int, p_pack int, p_temp text, p_shelf int, p_certs text[],
  p_nutri text, p_rating numeric, p_reviews int,
  p_u1 numeric, p_q2 int, p_u2 numeric, p_q3 int, p_u3 numeric,
  p_lot_days int DEFAULT NULL, p_lot_qty int DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE
  v_cat uuid;
  p     uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE seller_org_id = p_seller AND ean = p_ean) THEN
    RETURN;
  END IF;

  SELECT id INTO v_cat FROM categories WHERE name = p_cat_name LIMIT 1;

  INSERT INTO products (seller_org_id, name, short_description, category_id, ean, status,
    moq, pack_size, temperature, shelf_life_days, origin_country, currency,
    stock_qty, estimated_lead_days, certifications, nutri_score, avg_rating, review_count)
  VALUES (p_seller, p_name, p_desc, v_cat, p_ean, 'active',
    p_moq, p_pack, p_temp, p_shelf, 'MA', 'MAD',
    p_moq * 60, 2 + (random() * 3)::int, p_certs, p_nutri, p_rating, p_reviews)
  RETURNING id INTO p;

  INSERT INTO price_tiers (product_id, qty_min, unit_price) VALUES
    (p, 1, p_u1), (p, p_q2, p_u2), (p, p_q3, p_u3);

  IF p_lot_days IS NOT NULL THEN
    INSERT INTO product_lots (product_id, lot_number, qty_available, expiry_date, active)
    VALUES (p,
            'LOT-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || upper(left(md5(random()::text), 4)),
            p_lot_qty,
            (CURRENT_DATE + (p_lot_days || ' days')::interval)::date,
            true);
  END IF;
END;
$fn$;

DO $$
DECLARE
  v50 uuid := '00000000-0000-0000-0000-200000000050';
  v51 uuid := '00000000-0000-0000-0000-200000000051';
  v52 uuid := '00000000-0000-0000-0000-200000000052';
  v53 uuid := '00000000-0000-0000-0000-200000000053';
  v54 uuid := '00000000-0000-0000-0000-200000000054';
  v55 uuid := '00000000-0000-0000-0000-200000000055';
  v56 uuid := '00000000-0000-0000-0000-200000000056';
  v57 uuid := '00000000-0000-0000-0000-200000000057';
BEGIN
  -- ── 1 · Huile de table tournesol 5L ─────────────────────────────────────────
  -- v57 (Oujda) le moins cher mais mal noté / sans certif / loin de Fès ;
  -- v53 (Fès) proche du restaurant test ; v50 le mieux noté + certifié.
  PERFORM pg_temp.seed_ma_add_offer(v50,'Huile de table tournesol 5L','Huile végétale de tournesol raffinée, bidon 5L',      'Épicerie sèche','6119000000011', 4, 1,'ambient',540,ARRAY['ONSSA','ISO 22000'],'C',4.8,64, 188, 20, 178, 100, 168);
  PERFORM pg_temp.seed_ma_add_offer(v51,'Huile de table tournesol 5L','Huile de tournesol pure première pression, bidon 5L', 'Épicerie sèche','6119000000011', 4, 1,'ambient',540,ARRAY['ONSSA'],           'C',4.2,21, 180, 20, 172, 100, 163);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Huile de table tournesol 5L','Huile de tournesol, bidon 5L — dépôt Fès',            'Épicerie sèche','6119000000011', 4, 1,'ambient',540,ARRAY[]::text[],           'C',4.0,12, 184, 20, 176, 100, 166,  60, 300);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Huile de table tournesol 5L','Huile de tournesol économique, bidon 5L',             'Épicerie sèche','6119000000011', 4, 1,'ambient',540,ARRAY[]::text[],           'C',3.9, 8, 172, 20, 165, 100, 156);

  -- ── 2 · Farine de blé tendre T55 25kg ───────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v52,'Farine de blé tendre T55 25kg','Farine T55 tous usages, sac 25kg',      'Épicerie sèche','6119000000028', 2, 1,'ambient',365,ARRAY['ONSSA','Halal'],NULL,4.5,33, 238, 10, 228, 50, 216);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Farine de blé tendre T55 25kg','Farine boulangère T55, sac 25kg',       'Épicerie sèche','6119000000028', 2, 1,'ambient',365,ARRAY[]::text[],        NULL,4.0,17, 228, 10, 219, 50, 208);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Farine de blé tendre T55 25kg','Farine T55, sac 25kg — dépôt Agadir',   'Épicerie sèche','6119000000028', 2, 1,'ambient',365,ARRAY['ONSSA'],        NULL,4.4,19, 242, 10, 232, 50, 220);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Farine de blé tendre T55 25kg','Farine T55 premier prix, sac 25kg',     'Épicerie sèche','6119000000028', 2, 1,'ambient',365,ARRAY[]::text[],        NULL,3.8, 6, 221, 10, 213, 50, 202);

  -- ── 3 · Sucre granulé blanc 50kg ────────────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v51,'Sucre granulé blanc 50kg','Sucre cristallisé raffiné, sac 50kg',        'Épicerie sèche','6119000000035', 1, 1,'ambient',730,ARRAY['ONSSA'],        NULL,4.3,25, 612, 10, 596, 40, 578);
  PERFORM pg_temp.seed_ma_add_offer(v52,'Sucre granulé blanc 50kg','Sucre blanc cristallisé, sac 50kg',          'Épicerie sèche','6119000000035', 1, 1,'ambient',730,ARRAY['ONSSA','Halal'],NULL,4.5,29, 598, 10, 585, 40, 566);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Sucre granulé blanc 50kg','Sucre cristallisé, sac 50kg — dépôt Souss',  'Épicerie sèche','6119000000035', 1, 1,'ambient',730,ARRAY['ONSSA'],        NULL,4.4,14, 625, 10, 610, 40, 590);

  -- ── 4 · Thé vert Gunpowder 3505 1kg ─────────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v52,'Thé vert Gunpowder 3505 1kg','Thé vert de Chine roulé qualité 3505, sachet 1kg', 'Boissons','6119000000042',12, 1,'ambient',720,ARRAY['ONSSA','Halal'],NULL,4.5,40,  95, 24,  89, 96,  82);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505, sachet 1kg',             'Boissons','6119000000042',12, 1,'ambient',720,ARRAY[]::text[],        NULL,4.0,15,  92, 24,  87, 96,  80);
  PERFORM pg_temp.seed_ma_add_offer(v56,'Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505 import, sachet 1kg',       'Boissons','6119000000042',12, 1,'ambient',720,ARRAY['ONSSA'],        NULL,4.2,22,  98, 24,  92, 96,  85);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Thé vert Gunpowder 3505 1kg','Thé vert Gunpowder 3505 premier prix, sachet 1kg', 'Boissons','6119000000042',12, 1,'ambient',720,ARRAY[]::text[],        NULL,3.9, 7,  88, 24,  83, 96,  76);

  -- ── 5 · Café moulu robusta 1kg ──────────────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v53,'Café moulu robusta 1kg','Café robusta torréfié moulu, sachet valve 1kg',   'Boissons','6119000000059', 6, 1,'ambient',365,ARRAY[]::text[],NULL,4.0,10, 74, 12, 70, 48, 64);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Café moulu robusta 1kg','Café robusta moulu, sachet 1kg — dépôt Agadir',   'Boissons','6119000000059', 6, 1,'ambient',365,ARRAY['ONSSA'],NULL,4.4,18, 79, 12, 74, 48, 68);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Café moulu robusta 1kg','Café robusta moulu économique, sachet 1kg',       'Boissons','6119000000059', 6, 1,'ambient',365,ARRAY[]::text[],NULL,3.9, 6, 69, 12, 65, 48, 59);

  -- ── 6 · Lait UHT demi-écrémé 1L x12 ─────────────────────────────────────────
  -- v54 le moins cher MAIS lot proche péremption (22 j) → mauvaise note fraîcheur,
  -- sans être exclu ; v50 lot frais (75 j) + meilleure note ; v52 intermédiaire.
  PERFORM pg_temp.seed_ma_add_offer(v50,'Lait UHT demi-écrémé 1L x12','Lait demi-écrémé longue conservation, carton 12x1L','Produits laitiers','6119000000066', 6,12,'ambient',90,ARRAY['ONSSA','ISO 22000','HACCP'],'B',4.8,52, 138, 20, 132, 80, 124, 75, 900);
  PERFORM pg_temp.seed_ma_add_offer(v52,'Lait UHT demi-écrémé 1L x12','Lait UHT demi-écrémé, carton 12x1L',              'Produits laitiers','6119000000066', 6,12,'ambient',90,ARRAY['ONSSA','Halal'],        'B',4.5,31, 132, 20, 126, 80, 119, 45, 1200);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Lait UHT demi-écrémé 1L x12','Lait UHT demi-écrémé, carton 12x1L — déstockage', 'Produits laitiers','6119000000066', 6,12,'ambient',90,ARRAY['ONSSA'],                'B',4.3,12, 129, 20, 123, 80, 116, 22, 1500);

  -- ── 7 · Eau minérale plate 1,5L x6 ──────────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v51,'Eau minérale plate 1,5L x6','Eau minérale naturelle plate, pack 6x1,5L',  'Boissons','6119000000073',12, 6,'ambient',365,ARRAY['ONSSA'],        NULL,4.2,27, 28, 50, 26, 200, 24);
  PERFORM pg_temp.seed_ma_add_offer(v52,'Eau minérale plate 1,5L x6','Eau de source plate, pack 6x1,5L',           'Boissons','6119000000073',12, 6,'ambient',365,ARRAY['ONSSA','Halal'],NULL,4.5,44, 27, 50, 25, 200, 23);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Eau minérale plate 1,5L x6','Eau minérale plate, pack 6x1,5L — dépôt Fès', 'Boissons','6119000000073',12, 6,'ambient',365,ARRAY[]::text[],        NULL,4.0,13, 27, 50, 25, 200, 24, 90, 480);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Eau minérale plate 1,5L x6','Eau minérale plate, pack 6x1,5L',            'Boissons','6119000000073',12, 6,'ambient',365,ARRAY['ONSSA'],        NULL,4.4,20, 26, 50, 24, 200, 22);

  -- ── 8 · Sardines à l'huile végétale 125g x50 ───────────────────────────────
  -- Agadir (v54) hub de conserverie → le moins cher.
  PERFORM pg_temp.seed_ma_add_offer(v51,'Sardines à l''huile végétale 125g x50','Sardines entières à l''huile végétale, colis 50 boîtes 125g','Conserves','6119000000080',24,50,'ambient',1460,ARRAY['ONSSA'],'B',4.2,30, 560, 4, 535, 20, 505, 400, 900);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Sardines à l''huile végétale 125g x50','Sardines à l''huile végétale, colis 50x125g — Agadir',       'Conserves','6119000000080',24,50,'ambient',1460,ARRAY['ONSSA'],'B',4.4,41, 520, 4, 498, 20, 470,  90, 1400);
  PERFORM pg_temp.seed_ma_add_offer(v56,'Sardines à l''huile végétale 125g x50','Sardines à l''huile végétale import/export, colis 50x125g',  'Conserves','6119000000080',24,50,'ambient',1460,ARRAY['ONSSA'],'B',4.2,19, 545, 4, 520, 20, 492, 260, 700);

  -- ── 9 · Double concentré de tomate 800g x12 ────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v52,'Double concentré de tomate 800g x12','Concentré de tomate 28% boîte 800g, carton de 12','Conserves','6119000000097', 6,12,'ambient',900,ARRAY['ONSSA','Halal'],'B',4.5,26, 148, 10, 141, 40, 132);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Double concentré de tomate 800g x12','Double concentré de tomate 800g, carton de 12',    'Conserves','6119000000097', 6,12,'ambient',900,ARRAY[]::text[],        'B',4.0,11, 142, 10, 136, 40, 128, 120, 360);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Double concentré de tomate 800g x12','Concentré de tomate 800g premier prix, carton 12', 'Conserves','6119000000097', 6,12,'ambient',900,ARRAY[]::text[],        'B',3.9, 7, 136, 10, 130, 40, 122);

  -- ── 10 · Couscous moyen 10kg ───────────────────────────────────────────────
  PERFORM pg_temp.seed_ma_add_offer(v52,'Couscous moyen 10kg','Semoule de blé dur précuite, grain moyen, sac 10kg', 'Épicerie sèche','6119000000103', 2, 1,'ambient',540,ARRAY['ONSSA','Halal'],'B',4.5,35, 118, 10, 112, 40, 104);
  PERFORM pg_temp.seed_ma_add_offer(v53,'Couscous moyen 10kg','Couscous moyen précuit, sac 10kg — dépôt Fès',       'Épicerie sèche','6119000000103', 2, 1,'ambient',540,ARRAY[]::text[],        'B',4.0,16, 112, 10, 107, 40, 100);
  PERFORM pg_temp.seed_ma_add_offer(v54,'Couscous moyen 10kg','Couscous moyen précuit, sac 10kg',                   'Épicerie sèche','6119000000103', 2, 1,'ambient',540,ARRAY['ONSSA'],        'B',4.4,21, 121, 10, 115, 40, 106);
  PERFORM pg_temp.seed_ma_add_offer(v57,'Couscous moyen 10kg','Couscous moyen économique, sac 10kg',                'Épicerie sèche','6119000000103', 2, 1,'ambient',540,ARRAY[]::text[],        'B',3.9, 9, 108, 10, 103, 40,  96);

  -- ── 11 · Huile d'argan alimentaire 1L ──────────────────────────────────────
  -- La coopérative (v55) : la moins chère, la mieux notée, bio, livraison offerte.
  PERFORM pg_temp.seed_ma_add_offer(v52,'Huile d''argan alimentaire 1L','Huile d''argan alimentaire torréfiée, bouteille 1L','Épicerie sèche','6119000000110', 3, 1,'ambient',540,ARRAY['ONSSA'],                    NULL,4.4,18, 780, 6, 740, 24, 700);
  PERFORM pg_temp.seed_ma_add_offer(v55,'Huile d''argan alimentaire 1L','Huile d''argan alimentaire bio pressée à froid, 1L','Épicerie sèche','6119000000110', 3, 1,'ambient',540,ARRAY['Bio AB','Ecocert','ONSSA'],NULL,4.9,15, 690, 6, 660, 24, 630, 300, 200);
  PERFORM pg_temp.seed_ma_add_offer(v56,'Huile d''argan alimentaire 1L','Huile d''argan alimentaire, bouteille 1L (export)', 'Épicerie sèche','6119000000110', 3, 1,'ambient',540,ARRAY['ONSSA'],                    NULL,4.2,12, 720, 6, 690, 24, 655, 140, 150);
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- BLOC 4 — références EAN plateforme (pour la recherche du Comparateur)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  cat_epicerie  uuid;
  cat_boissons  uuid;
  cat_laitiers  uuid;
  cat_conserves uuid;
BEGIN
  SELECT id INTO cat_epicerie  FROM categories WHERE name = 'Épicerie sèche'    LIMIT 1;
  SELECT id INTO cat_boissons  FROM categories WHERE name = 'Boissons'          LIMIT 1;
  SELECT id INTO cat_laitiers  FROM categories WHERE name = 'Produits laitiers' LIMIT 1;
  SELECT id INTO cat_conserves FROM categories WHERE name = 'Conserves'         LIMIT 1;

  INSERT INTO ean_references
    (ean, name, short_description, category_id, temperature, net_weight, weight_unit,
     certifications, nutri_score, pack_size, shelf_life_days, origin_country,
     manufacturer_name, status, source)
  VALUES
    ('6119000000011','Huile de table tournesol 5L','Huile végétale de tournesol raffinée, bidon 5L',                 cat_epicerie,'ambient',5000,'g',ARRAY['ONSSA'],'C',1,540,'MA','Marché MA (démo)','active','platform'),
    ('6119000000028','Farine de blé tendre T55 25kg','Farine T55 tous usages, sac 25kg',                              cat_epicerie,'ambient',25000,'g',ARRAY['ONSSA'],NULL,1,365,'MA','Marché MA (démo)','active','platform'),
    ('6119000000035','Sucre granulé blanc 50kg','Sucre cristallisé raffiné, sac 50kg',                                cat_epicerie,'ambient',50000,'g',ARRAY['ONSSA'],NULL,1,730,'MA','Marché MA (démo)','active','platform'),
    ('6119000000042','Thé vert Gunpowder 3505 1kg','Thé vert de Chine roulé qualité 3505, sachet 1kg',                cat_boissons,'ambient',1000,'g',ARRAY['ONSSA'],NULL,1,720,'CN','Marché MA (démo)','active','platform'),
    ('6119000000059','Café moulu robusta 1kg','Café robusta torréfié moulu, sachet valve 1kg',                        cat_boissons,'ambient',1000,'g',ARRAY[]::text[],NULL,1,365,'MA','Marché MA (démo)','active','platform'),
    ('6119000000066','Lait UHT demi-écrémé 1L x12','Lait demi-écrémé longue conservation, carton 12x1L',              cat_laitiers,'ambient',12000,'g',ARRAY['ONSSA'],'B',12,90,'MA','Marché MA (démo)','active','platform'),
    ('6119000000073','Eau minérale plate 1,5L x6','Eau minérale naturelle plate, pack 6x1,5L',                        cat_boissons,'ambient',9000,'g',ARRAY['ONSSA'],NULL,6,365,'MA','Marché MA (démo)','active','platform'),
    ('6119000000080','Sardines à l''huile végétale 125g x50','Sardines entières à l''huile végétale, colis 50x125g',  cat_conserves,'ambient',125,'g',ARRAY['ONSSA'],'B',50,1460,'MA','Marché MA (démo)','active','platform'),
    ('6119000000097','Double concentré de tomate 800g x12','Concentré de tomate 28%, boîte 800g, carton de 12',       cat_conserves,'ambient',800,'g',ARRAY['ONSSA'],'B',12,900,'MA','Marché MA (démo)','active','platform'),
    ('6119000000103','Couscous moyen 10kg','Semoule de blé dur précuite, grain moyen, sac 10kg',                      cat_epicerie,'ambient',10000,'g',ARRAY['ONSSA'],'B',1,540,'MA','Marché MA (démo)','active','platform'),
    ('6119000000110','Huile d''argan alimentaire 1L','Huile d''argan alimentaire pressée à froid, bouteille 1L',      cat_epicerie,'ambient',1000,'g',ARRAY['ONSSA'],NULL,1,540,'MA','Marché MA (démo)','active','platform')
  ON CONFLICT (ean) DO NOTHING;
END $$;


-- ── Récapitulatif ────────────────────────────────────────────────────────────
DO $$
DECLARE n_off int; n_ean int;
BEGIN
  SELECT count(*) INTO n_off FROM products      WHERE ean LIKE '61190000001%';
  SELECT count(*) INTO n_ean FROM ean_references WHERE ean LIKE '61190000001%';
  RAISE NOTICE 'Seed marché MA : % offres fournisseurs sur % références produit (8 fournisseurs, 8 villes).', n_off, n_ean;
END $$;

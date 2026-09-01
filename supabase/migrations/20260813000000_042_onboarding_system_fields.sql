-- Migration 042 — Fait rentrer les champs "core" déjà en dur dans
-- OnboardingPage.tsx dans onboarding_field_definitions, pour que l'admin les
-- voie et les édite au même endroit que les champs personnalisés.
--
-- Champs volontairement NON migrés (restent hardcodés dans OnboardingPage.tsx) :
--  - Sélection du rôle (étape 1), consentement RGPD/CGU (étape 4) : cœur du
--    parcours, non spécifiques à un rôle.
--  - "Type d'activité" (sub_type) : ses options viennent de business_categories,
--    déjà géré par sa propre page admin (AdminBusinessCategories) — pas une
--    liste statique.
--  - "Pays" : valeur stockée ('MA') différente du libellé affiché ('Maroc'),
--    et lue ailleurs dans le code via une comparaison exacte (ex: devise
--    affichée sur BuyerDashboard) — la renommer depuis l'admin casserait ces
--    lectures.
--  - "Type de service" livreur (delivery_type) : contrainte CHECK en base +
--    comparaisons exactes ailleurs (AdminDeliveryValidation, etc.).
--  - "Modes de livraison proposés" et "Certifications & normes qualité" vendeur :
--    stockent des codes machine différents du libellé affiché (ex: 'seller_fleet'
--    → "Flotte propre"), lus ailleurs par comparaison exacte
--    (useDeliveryRouter, CheckoutPage, VendorOrders) — un renommage depuis
--    l'admin romprait ces comparaisons. Le système de champs personnalisés ne
--    gère pas encore les listes "valeur machine ≠ libellé affiché".
--  - Bloc "Conformité & agréments" vendeur (ONSSA/ISO22000/ISO9001/Halal/
--    traçabilité) et "Adresse de livraison différente" acheteur : champs
--    composites où un second champ n'apparaît que si le premier est coché —
--    non représentable par un champ isolé dans le modèle actuel.
--  - Recherche + sélection du vendeur représenté (rôle Commercial) : widget
--    de recherche spécialisé, pas un champ de formulaire classique.

ALTER TABLE onboarding_field_definitions
  ADD COLUMN IF NOT EXISTS storage_target   text,
  ADD COLUMN IF NOT EXISTS is_system_field  boolean NOT NULL DEFAULT false;

-- ─── Acheteur ────────────────────────────────────────────────────────────────
INSERT INTO onboarding_field_definitions
  (role, section, field_key, label, field_type, options, required, display_order, storage_target, is_system_field)
VALUES
  ('acheteur', 'Informations légales', 'org_name',   'Raison sociale', 'text', null, true,  0, 'organisations.name',          true),
  ('acheteur', 'Informations légales', 'address',    'Adresse',        'text', null, false, 1, 'organisations.address_line1', true),
  ('acheteur', 'Informations légales', 'city',       'Ville',          'text', null, false, 2, 'organisations.city',          true),
  ('acheteur', 'Informations légales', 'region',     'Région',         'text', null, false, 3, 'organisations.region',        true),
  ('acheteur', 'Informations légales', 'phone',      'Téléphone',      'text', null, false, 4, 'organisations.phone',         true),
  ('acheteur', 'Informations légales', 'siret',      'SIRET / RC',     'text', null, false, 5, 'organisations.siret',         true),
  ('acheteur', 'Informations légales', 'vat_number', 'N° TVA',         'text', null, false, 6, 'organisations.vat_number',    true),
  ('acheteur', 'Informations légales', 'ice',        'ICE',            'text', null, false, 7, 'organisations.ice',           true),

  ('acheteur', 'Catégories d''intérêt', 'interest_categories', 'Catégories de produits qui vous intéressent', 'multiselect',
    '["Boissons","Épicerie sèche","Produits laitiers","Hygiène","Entretien","Surgelés"]'::jsonb, false, 0,
    'buyer_profiles.interest_categories', true),

  ('acheteur', 'Contact commercial', 'contact_referent', 'Contact référent',     'text',  null, false, 0, 'buyer_profiles.contact_referent', true),
  ('acheteur', 'Contact commercial', 'contact_email',    'Email de contact',    'email', null, false, 1, 'buyer_profiles.contact_email',    true),
  ('acheteur', 'Contact commercial', 'contact_phone',    'Téléphone de contact','text',  null, false, 2, 'buyer_profiles.contact_phone',    true),
  ('acheteur', 'Contact commercial', 'phone_secondary',  'Téléphone 2',         'text',  null, false, 3, 'buyer_profiles.phone_secondary',  true),
  ('acheteur', 'Contact commercial', 'website',          'Site web',            'url',   null, false, 4, 'buyer_profiles.website',          true),

  ('acheteur', 'Activité', 'years_active',    'Ancienneté de l''activité', 'number', null, false, 0, 'buyer_profiles.years_active',     true),
  ('acheteur', 'Activité', 'points_of_sale',  'Points de vente',           'number', null, false, 1, 'buyer_profiles.points_of_sale',   true),
  ('acheteur', 'Activité', 'store_surface_m2','Surface magasin (m²)',      'number', null, false, 2, 'buyer_profiles.store_surface_m2', true)
ON CONFLICT (role, field_key) DO NOTHING;

-- ─── Vendeur ─────────────────────────────────────────────────────────────────
INSERT INTO onboarding_field_definitions
  (role, section, field_key, label, field_type, options, required, display_order, storage_target, is_system_field)
VALUES
  ('vendeur', 'Informations légales', 'org_name', 'Raison sociale', 'text', null, true,  0, 'organisations.name',          true),
  ('vendeur', 'Informations légales', 'address',  'Adresse',        'text', null, false, 1, 'organisations.address_line1', true),
  ('vendeur', 'Informations légales', 'city',     'Ville',          'text', null, false, 2, 'organisations.city',          true),
  ('vendeur', 'Informations légales', 'region',   'Région',         'text', null, false, 3, 'organisations.region',        true),
  ('vendeur', 'Informations légales', 'phone',    'Téléphone',      'text', null, false, 4, 'organisations.phone',         true),
  ('vendeur', 'Informations légales', 'postal_code', 'Code postal', 'text', null, false, 5, 'organisations.postal_code',   true),
  ('vendeur', 'Informations légales', 'ice',      'ICE',            'text', null, false, 6, 'organisations.ice',           true),

  ('vendeur', 'Identité complémentaire', 'trade_name',       'Nom commercial',              'text',  null, false, 0, 'seller_profiles.trade_name',       true),
  ('vendeur', 'Identité complémentaire', 'years_active',     'Ancienneté de l''entreprise',  'number',null, false, 1, 'seller_profiles.years_active',     true),
  ('vendeur', 'Identité complémentaire', 'contact_email',    'Email de contact',             'email', null, false, 2, 'seller_profiles.contact_email',    true),
  ('vendeur', 'Identité complémentaire', 'contact_referent', 'Contact référent',              'text',  null, false, 3, 'seller_profiles.contact_referent', true),
  ('vendeur', 'Identité complémentaire', 'contact_phone',    'Téléphone mobile du contact',   'text',  null, false, 4, 'seller_profiles.contact_phone',    true),

  ('vendeur', 'Activité & catalogue', 'product_categories',    'Catégories produits',                'text',   null, false, 0, 'seller_profiles.product_categories',    true),
  ('vendeur', 'Activité & catalogue', 'production_capacity',   'Capacité de production / stockage',  'text',   null, false, 1, 'seller_profiles.production_capacity',   true),
  ('vendeur', 'Activité & catalogue', 'brands_represented',    'Marques représentées',               'text',   null, false, 2, 'seller_profiles.brands_represented',    true),
  ('vendeur', 'Activité & catalogue', 'delivery_zones',        'Zones de livraison',                 'text',   null, false, 3, 'seller_profiles.delivery_zones',        true),
  ('vendeur', 'Activité & catalogue', 'exclusive_distribution','Exclusivité de distribution',        'boolean',null, false, 4, 'seller_profiles.exclusive_distribution',true),
  ('vendeur', 'Activité & catalogue', 'website',               'Site web',                           'url',    null, false, 5, 'seller_profiles.website',               true),
  ('vendeur', 'Activité & catalogue', 'default_prep_days',     'Délai de préparation moyen (jours)', 'number', null, false, 6, 'seller_profiles.default_prep_days',     true),
  ('vendeur', 'Activité & catalogue', 'default_moq',           'MOQ par défaut',                     'number', null, false, 7, 'seller_profiles.default_moq',           true),
  ('vendeur', 'Activité & catalogue', 'default_franco_eur',    'Seuil de gratuité livraison',        'number', null, false, 8, 'seller_profiles.default_franco_eur',    true)
ON CONFLICT (role, field_key) DO NOTHING;

-- ─── Livreur ─────────────────────────────────────────────────────────────────
INSERT INTO onboarding_field_definitions
  (role, section, field_key, label, field_type, options, required, display_order, storage_target, is_system_field)
VALUES
  ('livreur', 'Informations légales', 'org_name',    'Raison sociale', 'text', null, true,  0, 'organisations.name',          true),
  ('livreur', 'Informations légales', 'address',     'Adresse',        'text', null, false, 1, 'organisations.address_line1', true),
  ('livreur', 'Informations légales', 'city',        'Ville',          'text', null, false, 2, 'organisations.city',          true),
  ('livreur', 'Informations légales', 'region',      'Région',         'text', null, false, 3, 'organisations.region',        true),
  ('livreur', 'Informations légales', 'phone',       'Téléphone',      'text', null, false, 4, 'organisations.phone',         true),
  ('livreur', 'Informations légales', 'postal_code', 'Code postal',    'text', null, false, 5, 'organisations.postal_code',   true),
  ('livreur', 'Informations légales', 'siret',       'SIRET / RC',     'text', null, false, 6, 'organisations.siret',         true),
  ('livreur', 'Informations légales', 'vat_number',  'N° TVA',         'text', null, false, 7, 'organisations.vat_number',    true),
  ('livreur', 'Informations légales', 'ice',         'ICE',            'text', null, false, 8, 'organisations.ice',           true),
  ('livreur', 'Informations légales', 'rc',          'RC',             'text', null, false, 9, 'organisations.rc',            true),
  ('livreur', 'Informations légales', 'if_number',   'IF',             'text', null, false, 10,'organisations.if_number',     true),
  ('livreur', 'Informations légales', 'patente',     'Patente',        'text', null, false, 11,'organisations.patente',       true),
  ('livreur', 'Informations légales', 'cnss',        'CNSS',           'text', null, false, 12,'organisations.cnss',          true),

  ('livreur', 'Profil transporteur', 'delivery_phone', 'Téléphone dispatch',     'text',       null, false, 0, 'delivery_profiles.phone',                true),
  ('livreur', 'Profil transporteur', 'fleet_size',      'Taille de flotte',      'number',     null, false, 1, 'delivery_profiles.fleet_size',           true),
  ('livreur', 'Profil transporteur', 'vehicle_types',   'Types de véhicules',    'multiselect',
    '["Camion","Fourgon","Camionnette","Moto"]'::jsonb, false, 2, 'delivery_profiles.vehicle_types', true),
  ('livreur', 'Profil transporteur', 'base_rate',       'Tarif indicatif par tournée (MAD)', 'number', null, false, 3, 'delivery_profiles.base_rate', true),
  ('livreur', 'Profil transporteur', 'max_weight_kg',   'Charge maximale (kg)',  'number',     null, false, 4, 'delivery_capabilities.max_weight_kg', true),
  ('livreur', 'Profil transporteur', 'max_volume_m3',   'Volume max (m³)',       'number',     null, false, 5, 'delivery_capabilities.max_volume_m3', true),
  ('livreur', 'Profil transporteur', 'ambient',         'Température ambiante',  'boolean',    null, false, 6, 'delivery_capabilities.ambient', true),
  ('livreur', 'Profil transporteur', 'cold_chain',      'Réfrigéré',             'boolean',    null, false, 7, 'delivery_capabilities.cold_chain', true),
  ('livreur', 'Profil transporteur', 'frozen',          'Surgelé',               'boolean',    null, false, 8, 'delivery_capabilities.frozen', true),
  ('livreur', 'Profil transporteur', 'fragile',         'Marchandise fragile',   'boolean',    null, false, 9, 'delivery_capabilities.fragile', true),
  ('livreur', 'Profil transporteur', 'last_mile',       'Livraison dernier km',  'boolean',    null, false, 10,'delivery_capabilities.last_mile', true)
ON CONFLICT (role, field_key) DO NOTHING;

-- ─── Commercial ──────────────────────────────────────────────────────────────
INSERT INTO onboarding_field_definitions
  (role, section, field_key, label, field_type, options, required, display_order, storage_target, is_system_field)
VALUES
  ('commercial', 'Informations légales', 'full_name', 'Nom complet', 'text', null, true,  0, 'profiles.full_name', true),
  ('commercial', 'Informations légales', 'phone',     'Téléphone',   'text', null, false, 1, 'profiles.phone',     true)
ON CONFLICT (role, field_key) DO NOTHING;

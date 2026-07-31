import { useEffect, useState } from 'react';
import {
  Box, Button, Flex, FormControl, FormLabel, Heading, Input,
  Text, VStack, HStack, SimpleGrid, Checkbox, Tag, TagLabel,
  Select, Textarea, Alert, AlertIcon, Wrap, WrapItem,
} from '@chakra-ui/react';
import { Package, ShoppingBag, Truck, CheckCircle, Briefcase, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { OrgType, BusinessCategory } from '../../types';

// Le Commercial ne crée pas d'organisation propre (contrairement aux 3 autres rôles) :
// il rejoint celle d'un vendeur existant, en attente d'approbation par ce vendeur.
type OnboardingRole = OrgType | 'commercial';

const CERTIF_OPTIONS = [
  { value: 'HACCP',       label: 'HACCP' },
  { value: 'ISO 22000',   label: 'ISO 22000' },
  { value: 'IFS Food',    label: 'IFS Food' },
  { value: 'BRC/BRCGS',  label: 'BRC/BRCGS' },
  { value: 'FSSC 22000',  label: 'FSSC 22000' },
  { value: 'Bio',         label: 'Bio / Organic' },
  { value: 'Halal',       label: 'Halal' },
  { value: 'Kasher',      label: 'Kasher' },
  { value: 'Fairtrade',   label: 'Fairtrade' },
  { value: 'ECOCERT',     label: 'ECOCERT' },
  { value: 'GlobalG.A.P', label: 'GlobalG.A.P.' },
  { value: 'ONSSA',       label: 'ONSSA (MA)' },
];

const PAYMENT_OPTIONS = [
  { value: 'prepayment', label: 'Prépaiement' },
  { value: '30_days',    label: '30 jours' },
  { value: '45_days',    label: '45 jours' },
  { value: '60_days',    label: '60 jours' },
  { value: '90_days',    label: '90 jours' },
  { value: 'wire',       label: 'Virement' },
  { value: 'cheque',     label: 'Chèque' },
];

const ROLE_CARDS = [
  {
    type: 'buyer' as OnboardingRole,
    label: 'Acheteur',
    desc: 'Restaurant, Supermarché, Distributeur, Grossiste…',
    icon: ShoppingBag,
    color: 'blue',
  },
  {
    type: 'seller' as OnboardingRole,
    label: 'Fournisseur',
    desc: 'Fabricant, Importateur, Grossiste, Artisan…',
    icon: Package,
    color: 'blue',
  },
  {
    type: 'delivery' as OnboardingRole,
    label: 'Transporteur',
    desc: 'Société logistique, Indépendant, Flotte interne…',
    icon: Truck,
    color: 'blue',
  },
  {
    type: 'commercial' as OnboardingRole,
    label: 'Commercial',
    desc: 'Vous représentez un vendeur déjà présent sur la plateforme',
    icon: Briefcase,
    color: 'purple',
  },
];

// Indicateur d'étape horizontal
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <HStack spacing={0} w="full">
      {Array.from({ length: total }).map((_, i) => (
        <Box key={i} flex={1} position="relative">
          <Box
            h="3px"
            bg={i < current ? 'blue.700' : 'gray.200'}
            transition="background 0.2s"
          />
          {i < total - 1 && (
            <Box w="full" h="3px" position="absolute" top={0} right={0} />
          )}
        </Box>
      ))}
    </HStack>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);

  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [orgName, setOrgName] = useState('');
  const [subType, setSubType] = useState('');
  const [country, setCountry] = useState('FR');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [region, setRegion] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [ice, setIce] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [patente, setPatente] = useState('');
  const [cnss, setCnss] = useState('');
  const [ifNumber, setIfNumber] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [defaultPrepDays, setDefaultPrepDays] = useState('3');
  const [sellerDescription, setSellerDescription] = useState('');
  const [sellerWebsite, setSellerWebsite] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [deliveryType, setDeliveryType] = useState('independent');
  const [maxWeight, setMaxWeight] = useState('');
  const [coldChain, setColdChain] = useState(false);
  const [buyerInterests, setBuyerInterests] = useState<string[]>([]);
  const [buyerCreditLimit, setBuyerCreditLimit] = useState('');
  const [buyerPaymentTerm, setBuyerPaymentTerm] = useState('30_days');
  const [bankBic, setBankBic] = useState('');
  const [defaultMoq, setDefaultMoq] = useState('');
  const [defaultFrancoEur, setDefaultFrancoEur] = useState('');
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);
  const [incoterms, setIncoterms] = useState<string[]>([]);
  const [exportCountries, setExportCountries] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [fleetSize, setFleetSize] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [maxVolume, setMaxVolume] = useState('');
  const [ambient, setAmbient] = useState(true);
  const [frozen, setFrozen] = useState(false);
  const [fragile, setFragile] = useState(false);
  const [lastMile, setLastMile] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);

  // Spécifique au rôle Commercial
  const [commercialFullName, setCommercialFullName] = useState('');
  const [commercialPhone, setCommercialPhone] = useState('');
  const [commercialMotivation, setCommercialMotivation] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorSearchResults, setVendorSearchResults] = useState<
    { id: string; name: string; city: string | null; country: string | null }[]
  >([]);
  const [vendorSearching, setVendorSearching] = useState(false);
  const [selectedVendorOrgId, setSelectedVendorOrgId] = useState('');
  const [selectedVendorName, setSelectedVendorName] = useState('');

  const totalSteps = 4;

  const STEP_LABELS = [
    'Profil',
    'Informations légales',
    'Activité',
    'Validation',
  ];

  useEffect(() => {
    supabase
      .from('business_categories')
      .select('*')
      .eq('active', true)
      .then(({ data }) => {
        if (data) setBusinessCategories(data as BusinessCategory[]);
      });
  }, []);

  const filteredCategories = businessCategories.filter(
    (c) => c.actor_type === selectedRole
  );

  // Recherche de vendeurs actifs (pour le rôle Commercial), débouncée
  useEffect(() => {
    if (selectedRole !== 'commercial' || vendorSearchQuery.trim().length < 2) {
      setVendorSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setVendorSearching(true);
      const { data } = await supabase.rpc('search_seller_organisations', {
        search_query: vendorSearchQuery.trim(),
      });
      setVendorSearchResults(
        (data as { id: string; name: string; city: string | null; country: string | null }[]) ?? []
      );
      setVendorSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [vendorSearchQuery, selectedRole]);

  async function handleComplete() {
    if (!user || !selectedRole) return;
    setLoading(true);
    setError('');
    try {
      // --- Branche Commercial : pas d'organisation propre, demande d'adhésion
      // en attente d'approbation par le vendeur choisi ---
      if (selectedRole === 'commercial') {
        if (!selectedVendorOrgId) throw new Error('Veuillez sélectionner un vendeur à représenter.');

        const { error: profileErr } = await supabase
          .from('profiles')
          .update({
            full_name: commercialFullName,
            phone: commercialPhone || null,
            onboarding_done: true,
            gdpr_consent: gdprConsent,
          })
          .eq('id', user.id);
        if (profileErr) throw profileErr;

        // Demande en attente : active = false tant que le vendeur n'a pas approuvé.
        // Le taux de commission sera défini par le vendeur au moment de l'approbation.
        const { error: memberErr } = await supabase.from('organisation_members').insert({
          organisation_id: selectedVendorOrgId,
          user_id: user.id,
          team_role: 'sales_rep',
          active: false,
        });
        if (memberErr) throw memberErr;

        // TODO: stocker `commercialMotivation` quelque part de consultable par le vendeur
        // (ex. colonne dédiée ou table de demandes) une fois l'écran d'approbation construit.

        window.location.replace('/pending-approval');
        return;
      }

      // --- Branche Acheteur / Fournisseur / Transporteur : création d'organisation ---
      const orgId = crypto.randomUUID();

      const { error: orgErr } = await supabase
        .from('organisations')
        .insert({
          id: orgId,
          name: orgName,
          org_type: selectedRole,
          sub_type: subType || null,
          siret: siret || null,
          vat_number: vatNumber || null,
          country,
          city: city || null,
          postal_code: postalCode || null,
          address_line1: addressLine1 || null,
          region: region || null,
          phone: orgPhone || null,
          ice: ice || null,
          rc: rcNumber || null,
          patente: patente || null,
          cnss: cnss || null,
          if_number: ifNumber || null,
          validation_status: 'pending',
        });

      if (orgErr) throw orgErr;

      const { error: memberErr } = await supabase.from('organisation_members').insert({
        organisation_id: orgId,
        user_id: user.id,
        team_role: 'owner',
      });
      if (memberErr) throw memberErr;

      const org = { id: orgId };

      if (selectedRole === 'buyer') {
        await supabase.from('buyer_profiles').insert({
          organisation_id: org.id,
          interest_categories: buyerInterests,
          default_payment_terms: buyerPaymentTerm,
          credit_limit: buyerCreditLimit ? parseFloat(buyerCreditLimit) : null,
        });
      } else if (selectedRole === 'seller') {
        await supabase.from('seller_profiles').insert({
          organisation_id: org.id,
          bank_iban: bankIban || null,
          bank_bic: bankBic || null,
          certifications,
          accepted_payment_terms: paymentTerms,
          default_prep_days: defaultPrepDays ? parseInt(defaultPrepDays) : 3,
          description: sellerDescription || null,
          website: sellerWebsite || null,
          default_moq: defaultMoq ? parseInt(defaultMoq) : null,
          default_franco_eur: defaultFrancoEur ? parseFloat(defaultFrancoEur) : null,
          default_delivery_methods: deliveryMethods,
          default_incoterms: incoterms,
          default_export_countries: exportCountries
            ? exportCountries.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        });
      } else if (selectedRole === 'delivery') {
        await supabase.from('delivery_profiles').insert({
          organisation_id: org.id,
          delivery_type: deliveryType,
          phone: deliveryPhone || null,
          fleet_size: fleetSize ? parseInt(fleetSize) : null,
          vehicle_types: vehicleTypes,
          base_rate: baseRate ? parseFloat(baseRate) : null,
        });
        await supabase.from('delivery_capabilities').insert({
          organisation_id: org.id,
          max_weight_kg: maxWeight ? parseFloat(maxWeight) : null,
          max_volume_m3: maxVolume ? parseFloat(maxVolume) : null,
          cold_chain: coldChain,
          ambient,
          frozen,
          fragile,
          last_mile: lastMile,
        });
      }

      await supabase
        .from('profiles')
        .update({ onboarding_done: true, gdpr_consent: gdprConsent })
        .eq('id', user.id);

      const dest =
        selectedRole === 'seller' ? '/vendor' :
        selectedRole === 'delivery' ? '/delivery' :
        '/buyer';
      window.location.replace(dest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du dossier');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={4}>
      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" p={8} w="full" maxW="580px">

        {/* Logo */}
        <HStack spacing={2} mb={6}>
          <Flex w={7} h={7} bg="blue.900" rounded="sm" align="center" justify="center">
            <Package size={15} color="white" />
          </Flex>
          <Text fontWeight="800" fontSize="sm" color="gray.900" letterSpacing="-0.01em">Stock212</Text>
        </HStack>

        {/* En-tête étape */}
        <VStack spacing={1} mb={5} align="start">
          <HStack spacing={2} align="center">
            <Text fontSize="10px" color="gray.400" fontWeight="600" textTransform="uppercase"
              letterSpacing="0.08em">
              Étape {step}/{totalSteps}
            </Text>
            <Text fontSize="10px" color="blue.600" fontWeight="600" textTransform="uppercase"
              letterSpacing="0.08em">
              — {STEP_LABELS[step - 1]}
            </Text>
          </HStack>
          <Heading size="sm" color="gray.900" fontWeight="700" letterSpacing="-0.01em">
            Dossier d'inscription professionnelle
          </Heading>
        </VStack>

        {/* Barre de progression */}
        <StepIndicator current={step} total={totalSteps} />

        <Box mt={7}>
          {error && (
            <Alert status="error" rounded="sm" mb={4} fontSize="sm">
              <AlertIcon />{error}
            </Alert>
          )}

          {/* Étape 1 — Sélection du rôle */}
          {step === 1 && (
            <VStack spacing={4}>
              <Text fontWeight="600" color="gray.700" fontSize="sm" alignSelf="start">
                Quel est votre rôle dans la chaîne d'approvisionnement ?
              </Text>
              <SimpleGrid columns={1} spacing={2} w="full">
                {ROLE_CARDS.map(({ type, label, desc, icon: Icon, color }) => (
                  <Box
                    key={type}
                    border="1px"
                    borderColor={selectedRole === type ? `${color}.500` : 'gray.200'}
                    bg={selectedRole === type ? `${color}.50` : 'white'}
                    rounded="md"
                    p={4}
                    cursor="pointer"
                    onClick={() => setSelectedRole(type)}
                    transition="all 0.1s"
                    _hover={{ borderColor: `${color}.400` }}
                  >
                    <HStack spacing={4}>
                      <Flex
                        w={9} h={9}
                        bg={selectedRole === type ? `${color}.100` : 'gray.50'}
                        border="1px"
                        borderColor={selectedRole === type ? `${color}.300` : 'gray.200'}
                        rounded="sm"
                        align="center" justify="center"
                        flexShrink={0}
                      >
                        <Icon size={17} color={selectedRole === type
                          ? `var(--chakra-colors-${color}-700)`
                          : 'var(--chakra-colors-gray-500)'} />
                      </Flex>
                      <Box flex={1}>
                        <Text fontWeight="600" color="gray.800" fontSize="sm">{label}</Text>
                        <Text fontSize="xs" color="gray.500" lineHeight={1.4}>{desc}</Text>
                      </Box>
                      {selectedRole === type && (
                        <CheckCircle size={17} color="var(--chakra-colors-blue-600)" />
                      )}
                    </HStack>
                  </Box>
                ))}
              </SimpleGrid>
            </VStack>
          )}

          {/* Étape 2 — Informations légales (ou identité simplifiée pour Commercial) */}
          {step === 2 && selectedRole === 'commercial' && (
            <VStack spacing={4}>
              <Text fontWeight="600" color="gray.700" fontSize="sm" alignSelf="start">
                Vos informations
              </Text>
              <FormControl isRequired>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">
                  Nom complet
                </FormLabel>
                <Input value={commercialFullName} onChange={(e) => setCommercialFullName(e.target.value)}
                  placeholder="Mohamed Alami" rounded="sm" fontSize="sm" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">
                  Téléphone
                </FormLabel>
                <Input value={commercialPhone} onChange={(e) => setCommercialPhone(e.target.value)}
                  placeholder="+212 6 00 00 00 00" rounded="sm" fontSize="sm" fontFamily="mono" />
              </FormControl>
            </VStack>
          )}
          {step === 2 && selectedRole !== 'commercial' && (
            <VStack spacing={4}>
              <Text fontWeight="600" color="gray.700" fontSize="sm" alignSelf="start">
                Informations légales de votre organisation
              </Text>
              <FormControl isRequired>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">
                  Raison sociale
                </FormLabel>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mon Entreprise SAS" rounded="sm" fontSize="sm" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">
                  Type d'activité
                </FormLabel>
                <Select value={subType} onChange={(e) => setSubType(e.target.value)}
                  rounded="sm" placeholder="Sélectionner..." fontSize="sm">
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
              </FormControl>
              <HStack w="full" spacing={3}>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">Pays</FormLabel>
                  <Select value={country} onChange={(e) => setCountry(e.target.value)}
                    rounded="sm" fontSize="sm">
                    <option value="FR">France</option>
                    <option value="BE">Belgique</option>
                    <option value="CH">Suisse</option>
                    <option value="MA">Maroc</option>
                    <option value="DZ">Algérie</option>
                    <option value="TN">Tunisie</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">Code postal</FormLabel>
                  <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="75001" rounded="sm" fontSize="sm" />
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">Ville</FormLabel>
                <Input value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris" rounded="sm" fontSize="sm" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                  textTransform="uppercase" letterSpacing="0.05em">Adresse</FormLabel>
                <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="12 rue du Commerce" rounded="sm" fontSize="sm" />
              </FormControl>
              <HStack w="full" spacing={3}>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">Région</FormLabel>
                  <Input value={region} onChange={(e) => setRegion(e.target.value)}
                    placeholder="Casablanca-Settat" rounded="sm" fontSize="sm" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">Téléphone</FormLabel>
                  <Input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+212 5 00 00 00 00" rounded="sm" fontSize="sm" fontFamily="mono" />
                </FormControl>
              </HStack>
              <HStack w="full" spacing={3}>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">SIRET / RC</FormLabel>
                  <Input value={siret} onChange={(e) => setSiret(e.target.value)}
                    placeholder="12345678901234" rounded="sm" fontSize="sm" fontFamily="mono" />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.05em">N° TVA</FormLabel>
                  <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="FR12345678901" rounded="sm" fontSize="sm" fontFamily="mono" />
                </FormControl>
              </HStack>

              {/* Champs légaux spécifiques Maroc, affichés seulement si pertinent */}
              {country === 'MA' && (
                <>
                  <Text fontSize="xs" color="gray.400" alignSelf="start" mt={1}>
                    Identifiants administratifs marocains (optionnels à ce stade)
                  </Text>
                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">ICE</FormLabel>
                      <Input value={ice} onChange={(e) => setIce(e.target.value)}
                        placeholder="001234567000012" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">RC</FormLabel>
                      <Input value={rcNumber} onChange={(e) => setRcNumber(e.target.value)}
                        placeholder="123456" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>
                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">IF</FormLabel>
                      <Input value={ifNumber} onChange={(e) => setIfNumber(e.target.value)}
                        placeholder="12345678" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">Patente</FormLabel>
                      <Input value={patente} onChange={(e) => setPatente(e.target.value)}
                        placeholder="12345678" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>
                  {selectedRole !== 'buyer' && (
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">CNSS</FormLabel>
                      <Input value={cnss} onChange={(e) => setCnss(e.target.value)}
                        placeholder="1234567" rounded="sm" fontSize="sm" fontFamily="mono" maxW="200px" />
                    </FormControl>
                  )}
                </>
              )}
            </VStack>
          )}

          {/* Étape 3 — Informations spécifiques au rôle */}
          {step === 3 && (
            <VStack spacing={4}>
              <Text fontWeight="600" color="gray.700" fontSize="sm" alignSelf="start">
                Informations complémentaires
              </Text>
              {selectedRole === 'buyer' && (
                <>
                  <Text fontSize="sm" color="gray.500" alignSelf="start" lineHeight={1.6}>
                    Sélectionnez les catégories de produits qui vous intéressent :
                  </Text>
                  <SimpleGrid columns={2} spacing={2} w="full">
                    {['Boissons', 'Épicerie sèche', 'Produits laitiers', 'Hygiène', 'Entretien', 'Surgelés'].map((cat) => (
                      <Checkbox
                        key={cat}
                        isChecked={buyerInterests.includes(cat)}
                        onChange={(e) =>
                          setBuyerInterests(
                            e.target.checked
                              ? [...buyerInterests, cat]
                              : buyerInterests.filter((i) => i !== cat)
                          )
                        }
                        colorScheme="blue"
                        size="sm"
                      >
                        <Text fontSize="sm" color="gray.700">{cat}</Text>
                      </Checkbox>
                    ))}
                  </SimpleGrid>

                  <FormControl mt={2}>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Condition de paiement souhaitée
                    </FormLabel>
                    <Select value={buyerPaymentTerm} onChange={(e) => setBuyerPaymentTerm(e.target.value)}
                      rounded="sm" fontSize="sm">
                      <option value="prepayment">Comptant / Prépaiement</option>
                      <option value="30_days">30 jours</option>
                      <option value="60_days">60 jours</option>
                      <option value="90_days">90 jours</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Plafond de crédit souhaité <Text as="span" fontWeight="400" textTransform="none">(optionnel, MAD)</Text>
                    </FormLabel>
                    <Input value={buyerCreditLimit} onChange={(e) => setBuyerCreditLimit(e.target.value)}
                      type="number" placeholder="Ex : 50000" rounded="sm" fontSize="sm" fontFamily="mono" />
                  </FormControl>
                </>
              )}
              {selectedRole === 'seller' && (
                <VStack spacing={5} w="full">

                  {/* Description boutique */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Présentation de votre activité
                    </FormLabel>
                    <Textarea
                      value={sellerDescription}
                      onChange={(e) => setSellerDescription(e.target.value)}
                      placeholder="Décrivez votre activité, vos points forts, vos marchés cibles… (visible sur votre boutique)"
                      rounded="sm" fontSize="sm" rows={3}
                      maxLength={1000}
                    />
                    <Text fontSize="11px" color="gray.400" mt={1}>
                      {sellerDescription.length}/1000 — Affiché publiquement sur votre vitrine Stock212.
                    </Text>
                  </FormControl>

                  {/* Site web */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Site web <Text as="span" fontWeight="400" textTransform="none">(optionnel)</Text>
                    </FormLabel>
                    <Input
                      value={sellerWebsite}
                      onChange={(e) => setSellerWebsite(e.target.value)}
                      placeholder="https://www.votre-site.com"
                      rounded="sm" fontSize="sm"
                    />
                  </FormControl>

                  {/* IBAN / BIC */}
                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        IBAN <Text as="span" fontWeight="400" textTransform="none">(optionnel)</Text>
                      </FormLabel>
                      <Input value={bankIban} onChange={(e) => setBankIban(e.target.value)}
                        placeholder="FR76..." rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        BIC <Text as="span" fontWeight="400" textTransform="none">(optionnel)</Text>
                      </FormLabel>
                      <Input value={bankBic} onChange={(e) => setBankBic(e.target.value)}
                        placeholder="BNPAFRPP" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>

                  {/* Certifications */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Certifications & normes qualité
                    </FormLabel>
                    <Text fontSize="11px" color="gray.400" mb={2}>
                      Renforcez la confiance des acheteurs. Cochez les certifications obtenues.
                    </Text>
                    <SimpleGrid columns={2} spacing={2}>
                      {CERTIF_OPTIONS.map(({ value, label }) => (
                        <Checkbox
                          key={value}
                          isChecked={certifications.includes(value)}
                          onChange={(e) =>
                            setCertifications(e.target.checked
                              ? [...certifications, value]
                              : certifications.filter(c => c !== value)
                            )
                          }
                          colorScheme="blue" size="sm"
                        >
                          <Text fontSize="sm" color="gray.700">{label}</Text>
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                    {certifications.length > 0 && (
                      <Wrap spacing={1} mt={2}>
                        {certifications.map(c => (
                          <WrapItem key={c}>
                            <Tag size="sm" colorScheme="green" rounded="md" variant="subtle">
                              <TagLabel fontSize="10px" fontWeight="600">{c}</TagLabel>
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    )}
                  </FormControl>

                  {/* Conditions de paiement */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Conditions de paiement acceptées
                    </FormLabel>
                    <SimpleGrid columns={2} spacing={2}>
                      {PAYMENT_OPTIONS.map(({ value, label }) => (
                        <Checkbox
                          key={value}
                          isChecked={paymentTerms.includes(value)}
                          onChange={(e) =>
                            setPaymentTerms(e.target.checked
                              ? [...paymentTerms, value]
                              : paymentTerms.filter(t => t !== value)
                            )
                          }
                          colorScheme="blue" size="sm"
                        >
                          <Text fontSize="sm" color="gray.700">{label}</Text>
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>

                  {/* Délai de préparation */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Délai de préparation moyen (jours ouvrés)
                    </FormLabel>
                    <HStack spacing={3} align="center">
                      <Input
                        value={defaultPrepDays}
                        onChange={(e) => setDefaultPrepDays(e.target.value)}
                        type="number" min={0} max={90}
                        placeholder="3"
                        rounded="sm" fontSize="sm" fontFamily="mono"
                        w="100px"
                      />
                      <Text fontSize="xs" color="gray.400">jours entre la commande et l'expédition</Text>
                    </HStack>
                  </FormControl>

                  {/* MOQ / Franco de livraison */}
                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        MOQ par défaut
                      </FormLabel>
                      <Input value={defaultMoq} onChange={(e) => setDefaultMoq(e.target.value)}
                        type="number" placeholder="Ex : 10" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        Seuil de gratuité livraison (€)
                      </FormLabel>
                      <Input value={defaultFrancoEur} onChange={(e) => setDefaultFrancoEur(e.target.value)}
                        type="number" placeholder="Ex : 500" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>

                  {/* Modes de livraison */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Modes de livraison proposés
                    </FormLabel>
                    <SimpleGrid columns={2} spacing={2}>
                      {[
                        { value: 'seller_fleet', label: 'Flotte propre' },
                        { value: 'third_party', label: 'Transporteur tiers' },
                        { value: 'pickup', label: 'Retrait entrepôt' },
                      ].map(({ value, label }) => (
                        <Checkbox
                          key={value}
                          isChecked={deliveryMethods.includes(value)}
                          onChange={(e) =>
                            setDeliveryMethods(e.target.checked
                              ? [...deliveryMethods, value]
                              : deliveryMethods.filter(v => v !== value)
                            )
                          }
                          colorScheme="blue" size="sm"
                        >
                          <Text fontSize="sm" color="gray.700">{label}</Text>
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>

                  {/* Incoterms */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Incoterms acceptés <Text as="span" fontWeight="400" textTransform="none">(optionnel)</Text>
                    </FormLabel>
                    <SimpleGrid columns={4} spacing={2}>
                      {['EXW', 'FOB', 'CIF', 'DDP'].map((value) => (
                        <Checkbox
                          key={value}
                          isChecked={incoterms.includes(value)}
                          onChange={(e) =>
                            setIncoterms(e.target.checked
                              ? [...incoterms, value]
                              : incoterms.filter(v => v !== value)
                            )
                          }
                          colorScheme="blue" size="sm"
                        >
                          <Text fontSize="sm" color="gray.700">{value}</Text>
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>

                  {/* Zones d'export */}
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Pays de livraison / export <Text as="span" fontWeight="400" textTransform="none">(optionnel, séparés par virgule)</Text>
                    </FormLabel>
                    <Input value={exportCountries} onChange={(e) => setExportCountries(e.target.value)}
                      placeholder="MA, FR, ES" rounded="sm" fontSize="sm" />
                  </FormControl>

                  <Alert status="info" rounded="sm" fontSize="xs">
                    <AlertIcon />
                    Ces informations seront affichées sur votre boutique. Vous pourrez les compléter et les modifier à tout moment depuis votre espace vendeur.
                  </Alert>
                </VStack>
              )}
              {selectedRole === 'delivery' && (
                <VStack spacing={4} w="full" align="stretch">
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Type de service
                    </FormLabel>
                    <Select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}
                      rounded="sm" fontSize="sm">
                      <option value="logistics_company">Société de logistique</option>
                      <option value="independent">Indépendant</option>
                      <option value="internal_fleet">Flotte interne</option>
                    </Select>
                  </FormControl>

                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        Téléphone dispatch
                      </FormLabel>
                      <Input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)}
                        placeholder="+212 5 00 00 00 00" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        Taille de flotte
                      </FormLabel>
                      <Input value={fleetSize} onChange={(e) => setFleetSize(e.target.value)}
                        type="number" placeholder="Ex : 5" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Types de véhicules
                    </FormLabel>
                    <SimpleGrid columns={2} spacing={2}>
                      {['Camion', 'Fourgon', 'Camionnette', 'Moto'].map((v) => (
                        <Checkbox
                          key={v}
                          isChecked={vehicleTypes.includes(v)}
                          onChange={(e) =>
                            setVehicleTypes(e.target.checked
                              ? [...vehicleTypes, v]
                              : vehicleTypes.filter(x => x !== v)
                            )
                          }
                          colorScheme="blue" size="sm"
                        >
                          <Text fontSize="sm" color="gray.700">{v}</Text>
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>

                  <HStack w="full" spacing={3}>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        Charge maximale (kg)
                      </FormLabel>
                      <Input value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)}
                        type="number" placeholder="Ex : 1000" rounded="sm" fontSize="sm"
                        fontFamily="mono" />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                        textTransform="uppercase" letterSpacing="0.05em">
                        Volume max (m³)
                      </FormLabel>
                      <Input value={maxVolume} onChange={(e) => setMaxVolume(e.target.value)}
                        type="number" placeholder="Ex : 20" rounded="sm" fontSize="sm" fontFamily="mono" />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Tarif indicatif par tournée <Text as="span" fontWeight="400" textTransform="none">(MAD, optionnel)</Text>
                    </FormLabel>
                    <Input value={baseRate} onChange={(e) => setBaseRate(e.target.value)}
                      type="number" placeholder="Ex : 300" rounded="sm" fontSize="sm" fontFamily="mono" maxW="200px" />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Types de transport pris en charge
                    </FormLabel>
                    <SimpleGrid columns={2} spacing={2}>
                      <Checkbox isChecked={ambient} onChange={(e) => setAmbient(e.target.checked)}
                        colorScheme="blue" size="sm">
                        <Text fontSize="sm" color="gray.700">Température ambiante</Text>
                      </Checkbox>
                      <Checkbox isChecked={coldChain} onChange={(e) => setColdChain(e.target.checked)}
                        colorScheme="blue" size="sm">
                        <Text fontSize="sm" color="gray.700">Réfrigéré</Text>
                      </Checkbox>
                      <Checkbox isChecked={frozen} onChange={(e) => setFrozen(e.target.checked)}
                        colorScheme="blue" size="sm">
                        <Text fontSize="sm" color="gray.700">Surgelé</Text>
                      </Checkbox>
                      <Checkbox isChecked={fragile} onChange={(e) => setFragile(e.target.checked)}
                        colorScheme="blue" size="sm">
                        <Text fontSize="sm" color="gray.700">Marchandise fragile</Text>
                      </Checkbox>
                      <Checkbox isChecked={lastMile} onChange={(e) => setLastMile(e.target.checked)}
                        colorScheme="blue" size="sm">
                        <Text fontSize="sm" color="gray.700">Livraison dernier km</Text>
                      </Checkbox>
                    </SimpleGrid>
                  </FormControl>
                </VStack>
              )}
              {selectedRole === 'commercial' && (
                <VStack spacing={4} w="full" align="stretch">
                  <Text fontSize="sm" color="gray.500" lineHeight={1.6}>
                    Recherchez le vendeur que vous représentez sur la plateforme.
                    Votre demande lui sera envoyée pour approbation.
                  </Text>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Vendeur
                    </FormLabel>
                    {selectedVendorOrgId ? (
                      <HStack bg="purple.50" rounded="md" px={3} py={2} justify="space-between">
                        <Text fontSize="sm" fontWeight="medium" color="purple.800">
                          {selectedVendorName}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => { setSelectedVendorOrgId(''); setSelectedVendorName(''); }}
                        >
                          Changer
                        </Button>
                      </HStack>
                    ) : (
                      <Box position="relative">
                        <Input
                          value={vendorSearchQuery}
                          onChange={(e) => setVendorSearchQuery(e.target.value)}
                          placeholder="Rechercher un vendeur par nom..."
                          rounded="sm" fontSize="sm"
                        />
                        {vendorSearchQuery.trim().length >= 2 && (
                          <Box position="absolute" top="100%" left={0} right={0} bg="white"
                            border="1px" borderColor="gray.200" rounded="md" mt={1} zIndex={10} shadow="md">
                            {vendorSearching ? (
                              <Box p={3} textAlign="center"><Text fontSize="xs" color="gray.400">Recherche…</Text></Box>
                            ) : vendorSearchResults.length === 0 ? (
                              <Box p={3}><Text fontSize="xs" color="gray.400">Aucun vendeur trouvé.</Text></Box>
                            ) : (
                              vendorSearchResults.map((v) => (
                                <HStack
                                  key={v.id}
                                  px={3} py={2}
                                  cursor="pointer"
                                  _hover={{ bg: 'gray.50' }}
                                  onClick={() => {
                                    setSelectedVendorOrgId(v.id);
                                    setSelectedVendorName(v.name);
                                    setVendorSearchQuery('');
                                    setVendorSearchResults([]);
                                  }}
                                >
                                  <Search size={13} color="#9CA3AF" />
                                  <Text fontSize="sm">{v.name}</Text>
                                  <Text fontSize="xs" color="gray.400">
                                    {[v.city, v.country].filter(Boolean).join(', ')}
                                  </Text>
                                </HStack>
                              ))
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.600" fontWeight="600"
                      textTransform="uppercase" letterSpacing="0.05em">
                      Message au vendeur <Text as="span" fontWeight="400" textTransform="none">(optionnel)</Text>
                    </FormLabel>
                    <Textarea
                      value={commercialMotivation}
                      onChange={(e) => setCommercialMotivation(e.target.value)}
                      placeholder="Présentez-vous brièvement au vendeur..."
                      rounded="sm" fontSize="sm" rows={3}
                    />
                  </FormControl>
                </VStack>
              )}
            </VStack>
          )}

          {/* Étape 4 — Consentement RGPD */}
          {step === 4 && (
            <VStack spacing={5}>
              <Box bg="gray.50" border="1px" borderColor="gray.200" rounded="md" p={5}>
                <Text fontWeight="700" color="gray.800" mb={2} fontSize="sm">
                  Consentement RGPD et CGV professionnelles
                </Text>
                <Text fontSize="sm" color="gray.600" lineHeight={1.7}>
                  Stock212 collecte et traite vos données personnelles et professionnelles
                  pour le fonctionnement de la plateforme B2B. Vos données ne sont jamais
                  revendues à des tiers. Vous disposez d'un droit d'accès, de rectification
                  et de suppression conformément au RGPD.
                </Text>
              </Box>
              <Checkbox
                isChecked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                colorScheme="blue"
                size="sm"
                alignItems="start"
              >
                <Text fontSize="sm" color="gray.700" lineHeight={1.6}>
                  J'accepte le traitement de mes données conformément à la politique de
                  confidentialité et aux Conditions Générales d'Utilisation de Stock212.
                </Text>
              </Checkbox>
              {selectedRole === 'delivery' && (
                <Alert status="info" rounded="sm" fontSize="sm">
                  <AlertIcon />
                  Votre profil transporteur sera activé après vérification de votre dossier
                  par notre équipe (délai : 48h ouvrées).
                </Alert>
              )}
            </VStack>
          )}
        </Box>

        {/* Navigation entre étapes */}
        <HStack justify="space-between" mt={7}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            isDisabled={step === 1}
            color="gray.500"
            rounded="md"
            fontSize="sm"
          >
            Retour
          </Button>
          {step < totalSteps ? (
            <Button
              colorScheme="blue"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
              isDisabled={
                (step === 1 && !selectedRole) ||
                (step === 2 && selectedRole === 'commercial' && !commercialFullName) ||
                (step === 2 && selectedRole !== 'commercial' && !orgName)
              }
              rounded="md"
              bg="blue.800"
              _hover={{ bg: 'blue.700' }}
              fontSize="sm"
              fontWeight="600"
            >
              Continuer
            </Button>
          ) : (
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleComplete}
              isLoading={loading}
              isDisabled={!gdprConsent || (selectedRole === 'commercial' && !selectedVendorOrgId)}
              loadingText="Envoi en cours..."
              rounded="md"
              bg="blue.800"
              _hover={{ bg: 'blue.700' }}
              fontSize="sm"
              fontWeight="600"
            >
              Soumettre mon dossier
            </Button>
          )}
        </HStack>
      </Box>
    </Flex>
  );
}

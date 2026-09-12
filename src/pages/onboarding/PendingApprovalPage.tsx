// @ts-nocheck
import { useEffect, useState } from 'react';
import { Box, Flex, Heading, Text, VStack, HStack, Button } from '@chakra-ui/react';
import { Package, Clock, Phone, CheckCircle, Mail, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function PendingApprovalPage() {
  const { profile, activeOrg, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Cas Commercial : pas d'organisation propre, donc `activeOrg` classique ne
  // reflète pas sa situation (sa ligne organisation_members est active=false
  // tant que le vendeur n'a pas approuvé). On vérifie ce cas séparément.
  const [pendingVendorName, setPendingVendorName] = useState<string | null>(null);
  const [checkingCommercial, setCheckingCommercial] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc('get_my_pending_sales_rep_request')
      .then(({ data }) => {
        const row = (data as { vendor_org_id: string; vendor_name: string }[])?.[0];
        setPendingVendorName(row?.vendor_name ?? null);
        setCheckingCommercial(false);
      });
  }, [user?.id]);

  // Redirection automatique : si l'organisation est déjà active (ou si la
  // demande Commercial a été approuvée entre-temps), on ne reste pas figé
  // sur cette page — on renvoie vers le bon espace sans attendre une
  // navigation manuelle de l'utilisateur.
  useEffect(() => {
    if (checkingCommercial) return; // attendre la vérification du cas Commercial

    if (activeOrg?.validation_status === 'active') {
      const dest =
        activeOrg.org_type === 'seller' ? '/vendor' :
        activeOrg.org_type === 'delivery' ? '/delivery' :
        '/buyer';
      navigate(dest, { replace: true });
      return;
    }

    // Commercial approuvé entre-temps : plus de demande en attente, mais une
    // organisation active est apparue (celle du vendeur qui vient d'approuver).
    if (!pendingVendorName && activeOrg?.org_type === 'seller' && activeOrg.validation_status === 'active') {
      navigate('/vendor', { replace: true });
    }
  }, [checkingCommercial, pendingVendorName, activeOrg, navigate]);

  const isCommercial = !activeOrg && !!pendingVendorName;

  const orgTypeLabel =
    activeOrg?.org_type === 'seller'   ? 'fournisseur' :
    activeOrg?.org_type === 'delivery' ? 'transporteur' :
    activeOrg?.org_type === 'buyer'    ? 'acheteur' :
    isCommercial ? 'commercial' : null;

  if (checkingCommercial) {
    return (
      <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={4}>
        <Text fontSize="sm" color="gray.400">Chargement…</Text>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" bg="gray.50" align="center" justify="center" p={4}>
      <Box bg="white" border="1px" borderColor="gray.200" rounded="md" p={8} w="full" maxW="520px">

        {/* Logo */}
        <HStack spacing={2} mb={8}>
          <Flex w={7} h={7} bg="blue.900" rounded="sm" align="center" justify="center">
            <Package size={15} color="white" />
          </Flex>
          <Text fontWeight="800" fontSize="sm" color="gray.900" letterSpacing="-0.01em">
            Stock212
          </Text>
        </HStack>

        {/* Icône statut */}
        <Flex
          w={14} h={14} bg="amber.50" border="1px" borderColor="amber.200"
          rounded="full" align="center" justify="center" mb={5}
          style={{ background: '#fffbeb', borderColor: '#fde68a' }}
        >
          <Clock size={26} color="#d97706" />
        </Flex>

        <VStack spacing={2} align="start" mb={6}>
          <Heading size="sm" color="gray.900" fontWeight="700" letterSpacing="-0.01em">
            Dossier reçu — validation en cours
          </Heading>
          {isCommercial ? (
            <Text fontSize="sm" color="gray.500">
              Bonjour{profile?.full_name ? ` ${profile.full_name}` : ''}, votre demande pour
              rejoindre <Text as="span" fontWeight="600" color="gray.700">{pendingVendorName}</Text>{' '}
              en tant que <Text as="span" fontWeight="600" color="gray.700">commercial</Text> a bien été envoyée.
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.500">
              Bonjour{profile?.full_name ? ` ${profile.full_name}` : ''}, votre dossier{' '}
              {orgTypeLabel && <Text as="span" fontWeight="600" color="gray.700">{orgTypeLabel}</Text>}{' '}
              {activeOrg?.name ? `« ${activeOrg.name} »` : ''} a bien été soumis.
            </Text>
          )}
        </VStack>

        {/* Étapes de validation */}
        <VStack spacing={3} align="stretch" mb={7}>
          <HStack spacing={3} p={3} bg="green.50" rounded="md" border="1px" borderColor="green.100">
            <Flex w={7} h={7} bg="green.100" rounded="full" align="center" justify="center" flexShrink={0}>
              <CheckCircle size={15} color="#16a34a" />
            </Flex>
            <Box>
              <Text fontSize="xs" fontWeight="700" color="green.800">
                {isCommercial ? 'Demande envoyée' : 'Dossier soumis'}
              </Text>
              <Text fontSize="11px" color="green.600">Vos informations ont bien été reçues</Text>
            </Box>
          </HStack>

          {isCommercial ? (
            <HStack spacing={3} p={3} bg="purple.50" rounded="md" border="1px" borderColor="purple.100">
              <Flex w={7} h={7} bg="purple.100" rounded="full" align="center" justify="center" flexShrink={0}>
                <Briefcase size={15} color="#7c3aed" />
              </Flex>
              <Box>
                <Text fontSize="xs" fontWeight="700" color="purple.800">Approbation du vendeur</Text>
                <Text fontSize="11px" color="purple.600">
                  {pendingVendorName} doit approuver votre demande depuis son espace pour activer votre accès
                </Text>
              </Box>
            </HStack>
          ) : (
            <HStack spacing={3} p={3} bg="blue.50" rounded="md" border="1px" borderColor="blue.100">
              <Flex w={7} h={7} bg="blue.100" rounded="full" align="center" justify="center" flexShrink={0}>
                <Phone size={15} color="#1d4ed8" />
              </Flex>
              <Box>
                <Text fontSize="xs" fontWeight="700" color="blue.800">Appel commercial</Text>
                <Text fontSize="11px" color="blue.600">
                  Un de nos commerciaux va vous contacter sous 24–48h ouvrées pour valider votre profil
                </Text>
              </Box>
            </HStack>
          )}

          <HStack spacing={3} p={3} bg="gray.50" rounded="md" border="1px" borderColor="gray.200">
            <Flex w={7} h={7} bg="gray.100" rounded="full" align="center" justify="center" flexShrink={0}>
              <CheckCircle size={15} color="#9ca3af" />
            </Flex>
            <Box>
              <Text fontSize="xs" fontWeight="700" color="gray.500">Accès activé</Text>
              <Text fontSize="11px" color="gray.400">
                {isCommercial
                  ? "Une fois approuvé par le vendeur, vous aurez accès à son espace"
                  : 'Une fois validé, vous aurez accès à toutes les fonctionnalités de la plateforme'}
              </Text>
            </Box>
          </HStack>
        </VStack>

        {/* Contact */}
        <Box p={4} bg="gray.50" rounded="md" border="1px" borderColor="gray.200" mb={6}>
          <Text fontSize="xs" fontWeight="700" color="gray.500" textTransform="uppercase"
            letterSpacing="0.06em" mb={2}>
            Une question ?
          </Text>
          <HStack spacing={2}>
            <Mail size={13} color="#6b7280" />
            <Text fontSize="sm" color="gray.600">
              Contactez-nous à{' '}
              <Text as="a" href="mailto:commercial@stock212.com" color="blue.600" fontWeight="600">
                commercial@stock212.com
              </Text>
            </Text>
          </HStack>
        </Box>

        <Button
          variant="ghost"
          size="sm"
          color="gray.400"
          fontSize="xs"
         onClick={async () => { await signOut(); navigate('/auth'); }}
          w="full"
        >
          Se déconnecter
        </Button>

      </Box>
    </Flex>
  );
}

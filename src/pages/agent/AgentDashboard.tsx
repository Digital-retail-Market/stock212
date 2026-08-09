import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Text, VStack, HStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, FormControl, FormLabel,
  Select, Textarea, Input, useToast, Divider, Progress,
} from '@chakra-ui/react';
import { Package, LogOut, Phone, MapPin, FileText, Clock, Plus, UserPlus, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AgentMembership {
  agent_member_id: string;
  vendor_org_id: string;
  vendor_name: string;
  commission_rate: number | null;
}

interface PortfolioOrg {
  buyer_organisation_id: string;
  name: string;
  org_type: string;
  validation_status: string;
  activity_count: number;
  added_at: string;
}

interface ActivityRow {
  id: string;
  buyer_organisation_id: string;
  buyer_name: string | null;
  activity_type: 'visite' | 'appel' | 'email' | 'devis' | 'autre';
  note: string | null;
  next_action_label: string | null;
  next_action_date: string | null;
  created_at: string;
}

interface BuyerSearchResult {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  appel:  { label: 'Appel',  icon: Phone,    color: 'blue' },
  visite: { label: 'Visite', icon: MapPin,   color: 'purple' },
  email:  { label: 'Email',  icon: FileText, color: 'gray' },
  devis:  { label: 'Devis',  icon: FileText, color: 'green' },
  autre:  { label: 'Autre',  icon: Clock,    color: 'orange' },
};

// Tableau de bord Agent Commercial v2 : portefeuille d'acheteurs recrutés/gérés
// pour le compte du vendeur qui a désigné cet agent (organisation_members.team_role = 'sales_rep').
export default function AgentDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const activityModal = useDisclosure();
  const recruitModal = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [membership, setMembership] = useState<AgentMembership | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioOrg[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [revenueAchieved, setRevenueAchieved] = useState(0);
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [newAccountsAchieved, setNewAccountsAchieved] = useState(0);

  // modal activité
  const [activeOrgId, setActiveOrgId] = useState('');
  const [formType, setFormType] = useState<ActivityRow['activity_type']>('appel');
  const [formNotes, setFormNotes] = useState('');
  const [formNextAction, setFormNextAction] = useState('');
  const [formNextDate, setFormNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // modal recrutement
  const [recruitQuery, setRecruitQuery] = useState('');
  const [recruitResults, setRecruitResults] = useState<BuyerSearchResult[]>([]);
  const [recruitSearching, setRecruitSearching] = useState(false);
  const [recruiting, setRecruiting] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError('');

    const { data: membershipRows, error: membershipErr } = await supabase.rpc('get_agent_membership');
    if (membershipErr) {
      setLoadError(membershipErr.message);
      setLoading(false);
      return;
    }
    const m = (membershipRows as AgentMembership[])?.[0] ?? null;
    setMembership(m);

    if (!m) {
      // pas (encore) désigné agent par un vendeur
      setPortfolio([]);
      setActivities([]);
      setRevenueAchieved(0);
      setCommissionAmount(0);
      setNewAccountsAchieved(0);
      setLoading(false);
      return;
    }

    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [portfolioRes, activitiesRes, summaryRes] = await Promise.all([
      supabase.rpc('get_agent_portfolio'),
      supabase.rpc('get_agent_activities', { limit_count: 20 }),
      supabase.rpc('get_agent_month_summary', { period_start: periodStart }),
    ]);

    const firstError = portfolioRes.error || activitiesRes.error || summaryRes.error;
    if (firstError) setLoadError(firstError.message);

    setPortfolio((portfolioRes.data as PortfolioOrg[]) ?? []);
    setActivities((activitiesRes.data as ActivityRow[]) ?? []);

    const summary = (summaryRes.data as Array<{
      revenue_achieved: number; commission_amount: number; new_accounts_achieved: number;
    }>)?.[0];
    setRevenueAchieved(summary?.revenue_achieved ?? 0);
    setCommissionAmount(summary?.commission_amount ?? 0);
    setNewAccountsAchieved(summary?.new_accounts_achieved ?? 0);

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return activities.filter((a) => {
      const d = new Date(a.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [activities]);

  const dueActionsCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return activities.filter((a) => a.next_action_date && a.next_action_date <= today).length;
  }, [activities]);

  function openActivityModal(orgId: string) {
    setActiveOrgId(orgId);
    setFormType('appel');
    setFormNotes('');
    setFormNextAction('');
    setFormNextDate('');
    activityModal.onOpen();
  }

  async function handleSubmitActivity() {
    if (!activeOrgId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('add_agent_activity', {
        buyer_org_id: activeOrgId,
        p_activity_type: formType,
        p_note: formNotes || null,
        p_next_action_label: formNextAction || null,
        p_next_action_date: formNextDate || null,
      });
      if (error) throw error;
      activityModal.onClose();
      await load();
      toast({ title: 'Activité enregistrée', status: 'success', duration: 2500 });
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecruitSearch() {
    if (!recruitQuery.trim()) return;
    setRecruitSearching(true);
    setRecruitResults([]);
    const { data, error } = await supabase.rpc('search_buyer_organisations', {
      search_query: recruitQuery.trim(),
    });
    if (error) {
      toast({ title: 'Erreur de recherche', description: error.message, status: 'error', duration: 4000 });
    } else {
      setRecruitResults((data as BuyerSearchResult[]) ?? []);
    }
    setRecruitSearching(false);
  }

  async function handleAddToPortfolio(buyerOrgId: string) {
    setRecruiting(true);
    try {
      const { error } = await supabase.rpc('add_buyer_to_agent_portfolio', { buyer_org_id: buyerOrgId });
      if (error) throw error;
      toast({ title: 'Acheteur ajouté à votre portefeuille', status: 'success', duration: 2500 });
      recruitModal.onClose();
      setRecruitQuery('');
      setRecruitResults([]);
      await load();
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setRecruiting(false);
    }
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Flex bg="white" borderBottom="1px" borderColor="gray.100" px={{ base: 4, md: 8 }} py={4} align="center" justify="space-between">
        <HStack spacing={2.5}>
          <Flex w={8} h={8} bg="blue.800" rounded="sm" align="center" justify="center">
            <Package size={16} color="white" />
          </Flex>
          <Box>
            <Text fontWeight="800" fontSize="md" color="gray.900" lineHeight={1}>Stock212</Text>
            <Text fontSize="10px" color="gray.400" textTransform="uppercase" letterSpacing="0.06em">
              Espace Agent Commercial
            </Text>
          </Box>
        </HStack>
        <HStack spacing={3}>
          <Text fontSize="sm" color="gray.600" display={{ base: 'none', sm: 'block' }}>
            {profile?.full_name ?? 'Agent'}
          </Text>
          <Button size="sm" variant="outline" leftIcon={<LogOut size={14} />} onClick={signOut}>
            Déconnexion
          </Button>
        </HStack>
      </Flex>

      <Box maxW="1100px" mx="auto" px={{ base: 4, md: 8 }} py={8}>
        <Flex justify="space-between" align="start" mb={6} flexWrap="wrap" gap={3}>
          <Box>
            <Text fontSize="xl" fontWeight="700" color="gray.900" mb={1}>
              Bonjour {profile?.full_name ?? ''}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {membership
                ? `Vous représentez ${membership.vendor_name}.`
                : "Votre portefeuille de comptes et votre suivi commercial."}
            </Text>
          </Box>
          {membership && (
            <HStack>
              <Button size="sm" variant="outline" leftIcon={<UserPlus size={14} />} onClick={recruitModal.onOpen}>
                Recruter un acheteur
              </Button>
              <Button size="sm" colorScheme="blue" leftIcon={<FileText size={14} />} onClick={() => navigate('/agent/quotes')}>
                Nouveau devis
              </Button>
            </HStack>
          )}
        </Flex>

        {!loading && loadError && (
          <Box bg="red.50" border="1px" borderColor="red.200" rounded="md" p={4} mb={5}>
            <Text fontSize="sm" color="red.700" fontWeight="medium">Erreur de chargement</Text>
            <Text fontSize="sm" color="red.600">{loadError}</Text>
          </Box>
        )}

        {loading ? (
          <Flex justify="center" py={16}><Spinner color="blue.500" /></Flex>
        ) : !membership ? (
          <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={10} textAlign="center">
            <Text fontSize="sm" color="gray.500">
              Vous n'êtes actuellement désigné agent commercial par aucun vendeur.
              Un vendeur doit d'abord vous ajouter à son équipe avec le rôle « Commercial ».
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" spacing={8}>
            {/* KPI */}
            <HStack spacing={4} flexWrap="wrap">
              {[
                { label: 'Comptes dans le portefeuille', value: portfolio.length, color: 'blue' },
                { label: 'Activités ce mois-ci', value: thisMonthCount, color: 'purple' },
                { label: 'Actions à faire', value: dueActionsCount, color: 'orange' },
                { label: 'Commission générée (ce mois)', value: `${commissionAmount.toLocaleString('fr-FR')} MAD`, color: 'green' },
              ].map((kpi) => (
                <Box key={kpi.label} bg="white" border="1px" borderColor="gray.100" rounded="md" p={5} flex={1} minW="200px">
                  <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>{kpi.label}</Text>
                  <Text fontSize="2xl" fontWeight="800" color={`${kpi.color}.600`}>{kpi.value}</Text>
                </Box>
              ))}
            </HStack>

            {/* Commission détail */}
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5}>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={4}>Commission — mois en cours</Text>
              <Flex justify="space-between" mb={1.5}>
                <Text fontSize="xs" color="gray.500">
                  CA généré chez {membership.vendor_name} (acheteurs de votre portefeuille)
                </Text>
                <Text fontSize="xs" fontWeight="medium" color="gray.700">
                  {revenueAchieved.toLocaleString('fr-FR')} MAD
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text fontSize="xs" color="gray.500">
                  Taux de commission {membership.commission_rate != null ? `(${membership.commission_rate}%)` : '(non défini par le vendeur)'}
                </Text>
                <Text fontSize="sm" fontWeight="700" color="green.600">
                  {commissionAmount.toLocaleString('fr-FR')} MAD
                </Text>
              </Flex>
            </Box>

            {/* Portefeuille */}
            <Box>
              <Flex justify="space-between" align="center" mb={3}>
                <Text fontSize="sm" fontWeight="700" color="gray.700">Mon portefeuille</Text>
              </Flex>
              {portfolio.length === 0 ? (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={8} textAlign="center">
                  <Text fontSize="sm" color="gray.400">
                    Aucun acheteur dans votre portefeuille pour l'instant.
                  </Text>
                  <Button mt={3} size="sm" leftIcon={<UserPlus size={14} />} onClick={recruitModal.onOpen}>
                    Recruter un premier acheteur
                  </Button>
                </Box>
              ) : (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
                  <Table size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Organisation</Th>
                        <Th>Statut</Th>
                        <Th>Activités</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {portfolio.map((org) => (
                        <Tr key={org.buyer_organisation_id}>
                          <Td fontWeight="medium" color="gray.800">{org.name}</Td>
                          <Td>
                            <Badge colorScheme={org.validation_status === 'active' ? 'green' : 'gray'} fontSize="10px">
                              {org.validation_status}
                            </Badge>
                          </Td>
                          <Td fontSize="sm" color="gray.500">{org.activity_count}</Td>
                          <Td textAlign="right">
                            <Button
                              size="xs"
                              leftIcon={<Plus size={12} />}
                              onClick={() => openActivityModal(org.buyer_organisation_id)}
                            >
                              Activité
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>

            {/* Activité récente */}
            <Box>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>Activité récente</Text>
              {activities.length === 0 ? (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={8} textAlign="center">
                  <Text fontSize="sm" color="gray.400">Aucune activité enregistrée pour l'instant.</Text>
                </Box>
              ) : (
                <VStack align="stretch" spacing={0} bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
                  {activities.map((a, i) => {
                    const cfg = TYPE_LABELS[a.activity_type];
                    const Icon = cfg.icon;
                    return (
                      <Box key={a.id}>
                        {i > 0 && <Divider />}
                        <Flex px={4} py={3} gap={3} align="start">
                          <Flex w={8} h={8} bg={`${cfg.color}.50`} rounded="md" align="center" justify="center" flexShrink={0}>
                            <Icon size={14} />
                          </Flex>
                          <Box flex={1}>
                            <HStack spacing={2}>
                              <Text fontSize="sm" fontWeight="medium" color="gray.800">{a.buyer_name ?? '—'}</Text>
                              <Badge colorScheme={cfg.color} fontSize="9px">{cfg.label}</Badge>
                            </HStack>
                            {a.note && <Text fontSize="xs" color="gray.500" mt={0.5}>{a.note}</Text>}
                            {a.next_action_label && (
                              <Text fontSize="xs" color="orange.600" mt={0.5}>
                                Prochaine action : {a.next_action_label}
                                {a.next_action_date && ` — ${a.next_action_date}`}
                              </Text>
                            )}
                          </Box>
                          <Text fontSize="10px" color="gray.300" flexShrink={0}>
                            {new Date(a.created_at).toLocaleDateString('fr-FR')}
                          </Text>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </Box>
          </VStack>
        )}
      </Box>

      {/* Modal — nouvelle activité */}
      <Modal isOpen={activityModal.isOpen} onClose={activityModal.onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Nouvelle activité</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Type</FormLabel>
                <Select size="sm" value={formType} onChange={(e) => setFormType(e.target.value as ActivityRow['activity_type'])}>
                  <option value="appel">Appel</option>
                  <option value="visite">Visite</option>
                  <option value="email">Email</option>
                  <option value="devis">Devis</option>
                  <option value="autre">Autre</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Notes</FormLabel>
                <Textarea size="sm" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Détails de l'échange..." />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Prochaine action</FormLabel>
                <Input size="sm" value={formNextAction} onChange={(e) => setFormNextAction(e.target.value)} placeholder="Ex : rappeler pour confirmer la commande" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Date de rappel</FormLabel>
                <Input size="sm" type="date" value={formNextDate} onChange={(e) => setFormNextDate(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={activityModal.onClose}>Annuler</Button>
            <Button size="sm" colorScheme="blue" onClick={handleSubmitActivity} isLoading={submitting}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal — recruter un acheteur existant */}
      <Modal
        isOpen={recruitModal.isOpen}
        onClose={() => { recruitModal.onClose(); setRecruitQuery(''); setRecruitResults([]); }}
        isCentered
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Recruter un acheteur</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">
                  Rechercher un acheteur déjà inscrit sur la plateforme
                </FormLabel>
                <HStack>
                  <Input
                    size="sm"
                    value={recruitQuery}
                    onChange={(e) => setRecruitQuery(e.target.value)}
                    placeholder="Nom de l'entreprise"
                  />
                  <Button size="sm" leftIcon={<Search size={14} />} onClick={handleRecruitSearch} isLoading={recruitSearching}>
                    Rechercher
                  </Button>
                </HStack>
              </FormControl>

              {recruitResults.length > 0 && (
                <VStack align="stretch" spacing={2}>
                  {recruitResults.map((r) => (
                    <Flex key={r.id} justify="space-between" align="center" p={2} border="1px" borderColor="gray.100" rounded="md">
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">{r.name}</Text>
                        <Text fontSize="xs" color="gray.500">{[r.city, r.country].filter(Boolean).join(', ')}</Text>
                      </Box>
                      <Button size="xs" colorScheme="blue" isLoading={recruiting} onClick={() => handleAddToPortfolio(r.id)}>
                        Ajouter
                      </Button>
                    </Flex>
                  ))}
                </VStack>
              )}

              {recruitResults.length === 0 && recruitQuery && !recruitSearching && (
                <Text fontSize="xs" color="gray.400">Aucun acheteur trouvé pour « {recruitQuery} ».</Text>
              )}

              <Divider />
              <Text fontSize="xs" color="gray.400">
                L'acheteur que vous cherchez n'a pas encore de compte ? La création d'un nouveau compte acheteur depuis cet espace arrive prochainement.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="ghost" onClick={recruitModal.onClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

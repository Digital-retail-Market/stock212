import { useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Text, VStack, HStack, Button, Table, Thead, Tbody, Tr, Th, Td,
  Badge, Spinner, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, FormControl, FormLabel,
  Select, Textarea, Input, useToast, Divider,
} from '@chakra-ui/react';
import { Package, LogOut, Phone, MapPin, FileText, Clock, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PortfolioOrg {
  organisation_id: string;
  name: string;
  org_type: 'buyer' | 'seller' | 'delivery';
  validation_status: string;
}

interface ActivityRow {
  id: string;
  organisation_id: string;
  type: 'call' | 'visit' | 'note' | 'follow_up';
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  organisationName?: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  call:      { label: 'Appel',   icon: Phone,    color: 'blue' },
  visit:     { label: 'Visite',  icon: MapPin,   color: 'purple' },
  note:      { label: 'Note',    icon: FileText, color: 'gray' },
  follow_up: { label: 'Relance', icon: Clock,    color: 'orange' },
};

// Tableau de bord Agent Commercial : portefeuille de comptes assignés
// (via agent_portfolios) et suivi CRM léger (agent_activities).
export default function AgentDashboard() {
  const { user, profile, signOut } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioOrg[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const [activeOrgId, setActiveOrgId] = useState('');
  const [formType, setFormType] = useState<ActivityRow['type']>('call');
  const [formNotes, setFormNotes] = useState('');
  const [formNextAction, setFormNextAction] = useState('');
  const [formNextDate, setFormNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    setLoadError('');

    const [portfolioRes, activitiesRes] = await Promise.all([
      supabase
        .from('agent_portfolios')
        .select('organisation_id, organisations(name, org_type, validation_status)')
        .eq('agent_id', user.id),
      supabase
        .from('agent_activities')
        .select('id, organisation_id, type, notes, next_action, next_action_date, created_at, organisations(name)')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const firstError = portfolioRes.error || activitiesRes.error;
    if (firstError) setLoadError(firstError.message);

    const orgs = ((portfolioRes.data as any[]) ?? []).map((row) => ({
      organisation_id: row.organisation_id,
      name: row.organisations?.name ?? '—',
      org_type: row.organisations?.org_type ?? 'buyer',
      validation_status: row.organisations?.validation_status ?? '—',
    })) as PortfolioOrg[];
    setPortfolio(orgs);

    const acts = ((activitiesRes.data as any[]) ?? []).map((row) => ({
      ...row,
      organisationName: row.organisations?.name ?? '—',
    })) as ActivityRow[];
    setActivities(acts);

    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  const activityCountByOrg = useMemo(() => {
    const map = new Map<string, number>();
    activities.forEach((a) => map.set(a.organisation_id, (map.get(a.organisation_id) ?? 0) + 1));
    return map;
  }, [activities]);

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
    setFormType('call');
    setFormNotes('');
    setFormNextAction('');
    setFormNextDate('');
    onOpen();
  }

  async function handleSubmitActivity() {
    if (!user || !activeOrgId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('agent_activities').insert({
        agent_id: user.id,
        organisation_id: activeOrgId,
        type: formType,
        notes: formNotes || null,
        next_action: formNextAction || null,
        next_action_date: formNextDate || null,
      });
      if (error) throw error;
      onClose();
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

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Flex
        bg="white"
        borderBottom="1px"
        borderColor="gray.100"
        px={{ base: 4, md: 8 }}
        py={4}
        align="center"
        justify="space-between"
      >
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
        <Text fontSize="xl" fontWeight="700" color="gray.900" mb={1}>
          Bonjour {profile?.full_name ?? ''}
        </Text>
        <Text fontSize="sm" color="gray.500" mb={6}>
          Votre portefeuille de comptes et votre suivi commercial.
        </Text>

        {!loading && loadError && (
          <Box bg="red.50" border="1px" borderColor="red.200" rounded="md" p={4} mb={5}>
            <Text fontSize="sm" color="red.700" fontWeight="medium">Erreur de chargement</Text>
            <Text fontSize="sm" color="red.600">{loadError}</Text>
          </Box>
        )}

        {loading ? (
          <Flex justify="center" py={16}><Spinner color="blue.500" /></Flex>
        ) : (
          <VStack align="stretch" spacing={8}>
            {/* KPI */}
            <HStack spacing={4} flexWrap="wrap">
              {[
                { label: 'Comptes dans le portefeuille', value: portfolio.length, color: 'blue' },
                { label: 'Activités ce mois-ci', value: thisMonthCount, color: 'purple' },
                { label: 'Actions à faire', value: dueActionsCount, color: 'orange' },
              ].map((kpi) => (
                <Box key={kpi.label} bg="white" border="1px" borderColor="gray.100" rounded="md" p={5} flex={1} minW="200px">
                  <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>{kpi.label}</Text>
                  <Text fontSize="2xl" fontWeight="800" color={`${kpi.color}.600`}>{kpi.value}</Text>
                </Box>
              ))}
            </HStack>

            {/* Portefeuille */}
            <Box>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>Mon portefeuille</Text>
              {portfolio.length === 0 ? (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={8} textAlign="center">
                  <Text fontSize="sm" color="gray.400">
                    Aucun compte ne vous est encore assigné. Un admin doit d'abord vous affecter des clients.
                  </Text>
                </Box>
              ) : (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
                  <Table size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Organisation</Th>
                        <Th>Type</Th>
                        <Th>Statut</Th>
                        <Th>Activités</Th>
                        <Th />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {portfolio.map((org) => (
                        <Tr key={org.organisation_id}>
                          <Td fontWeight="medium" color="gray.800">{org.name}</Td>
                          <Td>
                            <Badge colorScheme={org.org_type === 'seller' ? 'purple' : 'blue'} fontSize="10px">
                              {org.org_type === 'seller' ? 'Vendeur' : 'Acheteur'}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge colorScheme={org.validation_status === 'active' ? 'green' : 'gray'} fontSize="10px">
                              {org.validation_status}
                            </Badge>
                          </Td>
                          <Td fontSize="sm" color="gray.500">
                            {activityCountByOrg.get(org.organisation_id) ?? 0}
                          </Td>
                          <Td textAlign="right">
                            <Button
                              size="xs"
                              leftIcon={<Plus size={12} />}
                              onClick={() => openActivityModal(org.organisation_id)}
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
                    const cfg = TYPE_LABELS[a.type];
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
                              <Text fontSize="sm" fontWeight="medium" color="gray.800">{a.organisationName}</Text>
                              <Badge colorScheme={cfg.color} fontSize="9px">{cfg.label}</Badge>
                            </HStack>
                            {a.notes && <Text fontSize="xs" color="gray.500" mt={0.5}>{a.notes}</Text>}
                            {a.next_action && (
                              <Text fontSize="xs" color="orange.600" mt={0.5}>
                                Prochaine action : {a.next_action}
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
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Nouvelle activité</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel fontSize="xs" color="gray.600">Type</FormLabel>
                <Select size="sm" value={formType} onChange={(e) => setFormType(e.target.value as ActivityRow['type'])}>
                  <option value="call">Appel</option>
                  <option value="visit">Visite</option>
                  <option value="note">Note</option>
                  <option value="follow_up">Relance</option>
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
            <Button size="sm" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button size="sm" colorScheme="blue" onClick={handleSubmitActivity} isLoading={submitting}>
              Enregistrer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

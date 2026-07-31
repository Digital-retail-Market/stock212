import { useEffect, useState } from 'react';
import {
  Box, Flex, Heading, Text, Select, FormControl, FormLabel, Input,
  Button, Table, Thead, Tbody, Tr, Th, Td, Spinner, useToast,
} from '@chakra-ui/react';
import { Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AgentOption { id: string; full_name: string | null }
interface TargetRow {
  id: string;
  agent_id: string;
  period_month: string;
  revenue_target: number;
  new_accounts_target: number;
  agentName?: string;
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Écran admin : fixer un objectif mensuel (CA cible, nouveaux comptes) par agent commercial.
export default function AdminAgentTargets() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);

  const [selectedAgent, setSelectedAgent] = useState('');
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [revenueTarget, setRevenueTarget] = useState('0');
  const [accountsTarget, setAccountsTarget] = useState('0');

  async function load() {
    setLoading(true);
    setLoadError('');
    const [agentsRes, targetsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('is_agent', true).order('full_name'),
      supabase.from('agent_targets').select('id, agent_id, period_month, revenue_target, new_accounts_target').order('period_month', { ascending: false }),
    ]);
    const firstError = agentsRes.error || targetsRes.error;
    if (firstError) setLoadError(firstError.message);

    const agentList = (agentsRes.data as AgentOption[]) ?? [];
    setAgents(agentList);
    const nameById = new Map(agentList.map((a) => [a.id, a.full_name ?? a.id.slice(0, 8)]));
    const rows = ((targetsRes.data as any[]) ?? []).map((r) => ({ ...r, agentName: nameById.get(r.agent_id) ?? '—' })) as TargetRow[];
    setTargets(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Pré-remplit le formulaire si un objectif existe déjà pour cet agent + ce mois.
  useEffect(() => {
    if (!selectedAgent) return;
    const periodDate = `${monthValue}-01`;
    const existing = targets.find((t) => t.agent_id === selectedAgent && t.period_month === periodDate);
    setRevenueTarget(existing ? String(existing.revenue_target) : '0');
    setAccountsTarget(existing ? String(existing.new_accounts_target) : '0');
  }, [selectedAgent, monthValue, targets]);

  async function handleSave() {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_targets')
        .upsert(
          {
            agent_id: selectedAgent,
            period_month: `${monthValue}-01`,
            revenue_target: Number(revenueTarget) || 0,
            new_accounts_target: Number(accountsTarget) || 0,
          },
          { onConflict: 'agent_id,period_month' }
        );
      if (error) throw error;
      toast({ title: 'Objectif enregistré', status: 'success', duration: 2500 });
      await load();
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Flex align="center" gap={2} mb={1}>
        <Target size={18} color="#0d1f38" />
        <Heading size="md" color="gray.900">Objectifs commerciaux</Heading>
      </Flex>
      <Text fontSize="sm" color="gray.500" mb={6}>
        Fixe un objectif mensuel (chiffre d'affaires, nouveaux comptes) pour chaque agent commercial.
      </Text>

      {!loading && loadError && (
        <Box bg="red.50" border="1px" borderColor="red.200" rounded="md" p={4} mb={5}>
          <Text fontSize="sm" color="red.700" fontWeight="medium">Erreur de chargement</Text>
          <Text fontSize="sm" color="red.600">{loadError}</Text>
        </Box>
      )}

      {!loading && agents.length === 0 && (
        <Box bg="orange.50" border="1px" borderColor="orange.200" rounded="md" p={4} mb={5}>
          <Text fontSize="sm" color="orange.800">Aucun agent commercial trouvé.</Text>
        </Box>
      )}

      {loading ? (
        <Flex justify="center" py={16}><Spinner color="blue.500" /></Flex>
      ) : (
        <>
          <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5} mb={8}>
            <Flex gap={4} flexWrap="wrap" align="end">
              <FormControl maxW="240px">
                <FormLabel fontSize="xs" color="gray.600">Agent</FormLabel>
                <Select size="sm" placeholder="Choisir un agent..." value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_name ?? a.id.slice(0, 8)}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel fontSize="xs" color="gray.600">Mois</FormLabel>
                <Input size="sm" type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel fontSize="xs" color="gray.600">CA cible (MAD)</FormLabel>
                <Input size="sm" type="number" value={revenueTarget} onChange={(e) => setRevenueTarget(e.target.value)} />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel fontSize="xs" color="gray.600">Nouveaux comptes</FormLabel>
                <Input size="sm" type="number" value={accountsTarget} onChange={(e) => setAccountsTarget(e.target.value)} />
              </FormControl>
              <Button size="sm" colorScheme="blue" isDisabled={!selectedAgent} isLoading={saving} onClick={handleSave}>
                Enregistrer
              </Button>
            </Flex>
          </Box>

          <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>Objectifs définis</Text>
          {targets.length === 0 ? (
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={6} textAlign="center">
              <Text fontSize="sm" color="gray.400">Aucun objectif défini pour l'instant.</Text>
            </Box>
          ) : (
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Agent</Th>
                    <Th>Mois</Th>
                    <Th isNumeric>CA cible</Th>
                    <Th isNumeric>Nouveaux comptes</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {targets.map((t) => (
                    <Tr key={t.id}>
                      <Td fontSize="sm">{t.agentName}</Td>
                      <Td fontSize="sm">{new Date(t.period_month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</Td>
                      <Td isNumeric fontSize="sm">{t.revenue_target.toLocaleString('fr-FR')} MAD</Td>
                      <Td isNumeric fontSize="sm">{t.new_accounts_target}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

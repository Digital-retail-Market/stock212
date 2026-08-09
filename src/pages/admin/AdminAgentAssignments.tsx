import { useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Heading, Text, Input, InputGroup, InputLeftElement,
  Table, Thead, Tbody, Tr, Th, Td, Select, Badge, Spinner,
  Tabs, TabList, Tab, useToast,
} from '@chakra-ui/react';
import { Search, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AgentOption { id: string; full_name: string | null }
interface OrgRow {
  id: string;
  name: string;
  org_type: 'buyer' | 'seller' | 'delivery';
  validation_status: string;
}
interface PortfolioRow { id: string; agent_id: string; organisation_id: string }

// Écran admin : décide quel agent commercial suit quelle organisation.
// Alimente ensuite le portefeuille affiché côté dashboard agent.
export default function AdminAgentAssignments() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // organisation_id en cours de sauvegarde
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  async function load() {
    setLoading(true);
    const [agentsRes, orgsRes, portfolioRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('is_agent', true).order('full_name'),
      supabase.from('organisations').select('id, name, org_type, validation_status').in('org_type', ['buyer', 'seller']).order('name'),
      supabase.from('agent_portfolios').select('id, agent_id, organisation_id'),
    ]);
    setAgents((agentsRes.data as AgentOption[]) ?? []);
    setOrgs((orgsRes.data as OrgRow[]) ?? []);
    setPortfolio((portfolioRes.data as PortfolioRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const assignedAgentByOrg = useMemo(() => {
    const map = new Map<string, PortfolioRow>();
    portfolio.forEach((p) => map.set(p.organisation_id, p));
    return map;
  }, [portfolio]);

  const filteredOrgs = orgs.filter((o) => {
    if (typeFilter !== 'all' && o.org_type !== typeFilter) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Modèle simplifié : un client a au plus un agent affecté à la fois
  // (la table autorise techniquement plusieurs agents par organisation,
  // mais cet écran ne gère qu'une affectation unique pour rester simple).
  async function handleAssign(orgId: string, agentId: string) {
    setSaving(orgId);
    try {
      const existing = assignedAgentByOrg.get(orgId);

      if (agentId === '') {
        if (existing) {
          const { error } = await supabase.from('agent_portfolios').delete().eq('id', existing.id);
          if (error) throw error;
        }
      } else if (existing) {
        const { error } = await supabase
          .from('agent_portfolios')
          .update({ agent_id: agentId })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agent_portfolios')
          .insert({ agent_id: agentId, organisation_id: orgId });
        if (error) throw error;
      }
      await load();
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Box>
      <Flex align="center" gap={2} mb={1}>
        <Briefcase size={18} color="#0d1f38" />
        <Heading size="md" color="gray.900">Affectation des comptes aux agents</Heading>
      </Flex>
      <Text fontSize="sm" color="gray.500" mb={6}>
        Choisis quel agent commercial suit chaque organisation. Un client sans agent affecté n'apparaît dans le portefeuille de personne.
      </Text>

      {!loading && agents.length === 0 && (
        <Box bg="orange.50" border="1px" borderColor="orange.200" rounded="md" p={4} mb={5}>
          <Text fontSize="sm" color="orange.800">
            Aucun agent commercial trouvé. Crée d'abord un compte avec le rôle agent (<code>is_agent = true</code>) pour pouvoir faire des affectations.
          </Text>
        </Box>
      )}

      <Flex gap={3} mb={4} flexWrap="wrap" align="center">
        <InputGroup maxW="280px">
          <InputLeftElement pointerEvents="none">
            <Search size={14} color="#9CA3AF" />
          </InputLeftElement>
          <Input
            placeholder="Rechercher une organisation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="sm"
            bg="white"
          />
        </InputGroup>
        <Tabs
          size="sm"
          index={['all', 'buyer', 'seller'].indexOf(typeFilter)}
          onChange={(i) => setTypeFilter((['all', 'buyer', 'seller'] as const)[i])}
        >
          <TabList>
            <Tab>Tous</Tab>
            <Tab>Acheteurs</Tab>
            <Tab>Vendeurs</Tab>
          </TabList>
        </Tabs>
      </Flex>

      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner color="blue.500" />
        </Flex>
      ) : (
        <Box bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Organisation</Th>
                <Th>Type</Th>
                <Th>Statut</Th>
                <Th>Agent affecté</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredOrgs.map((org) => {
                const current = assignedAgentByOrg.get(org.id);
                return (
                  <Tr key={org.id}>
                    <Td fontWeight="medium" color="gray.800">{org.name}</Td>
                    <Td>
                      <Badge colorScheme={org.org_type === 'seller' ? 'purple' : 'blue'} fontSize="10px">
                        {org.org_type === 'seller' ? 'Vendeur' : 'Acheteur'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          org.validation_status === 'active' ? 'green'
                          : org.validation_status === 'pending' ? 'yellow' : 'red'
                        }
                        fontSize="10px"
                      >
                        {org.validation_status}
                      </Badge>
                    </Td>
                    <Td>
                      <Select
                        size="sm"
                        maxW="220px"
                        value={current?.agent_id ?? ''}
                        onChange={(e) => handleAssign(org.id, e.target.value)}
                        isDisabled={saving === org.id || agents.length === 0}
                        bg="white"
                      >
                        <option value="">Non affecté</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name ?? a.id.slice(0, 8)}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </Tr>
                );
              })}
              {filteredOrgs.length === 0 && (
                <Tr>
                  <Td colSpan={4}>
                    <Text py={6} textAlign="center" color="gray.400" fontSize="sm">
                      Aucune organisation trouvée
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

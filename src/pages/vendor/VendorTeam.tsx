import { useEffect, useState } from 'react';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  Badge,
  Box,
  Modal,
  FormField,
  Input,
  Select,
  Alert,
  StatusIndicator,
  KeyValuePairs,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { OrgMember } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  admin_seller: 'Admin vendeur',
  catalog_manager: 'Gestionnaire catalogue',
  marketing_manager: 'Responsable marketing',
  sales_rep: 'Commercial',
  delivery_coordinator: 'Coordinateur livraison',
  member: 'Membre',
};

interface MemberWithProfile extends OrgMember {
  profiles?: { full_name: string | null; preferred_lang: string; phone?: string | null };
  auth_user?: { email: string };
  commission_rate?: number | null;
}

export default function VendorTeam() {
  const { activeOrg, user } = useAuth();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteCommissionRate, setInviteCommissionRate] = useState('');
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // approbation/refus d'une demande en attente (ex. Commercial via onboarding)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [approveCommissionDraft, setApproveCommissionDraft] = useState<Record<string, string>>({});

  async function approveRequest(m: MemberWithProfile) {
    const rateStr = approveCommissionDraft[m.id] ?? '';
    if (rateStr && !isValidCommissionRate(rateStr)) {
      setError('Le taux de commission doit être un nombre entre 0 et 100.');
      return;
    }
    setProcessingRequestId(m.id);
    setError('');
    const { error: err } = await supabase
      .from('organisation_members')
      .update({
        active: true,
        commission_rate: rateStr.trim() !== '' ? Number(rateStr) : null,
      })
      .eq('id', m.id);
    setProcessingRequestId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(`${m.profiles?.full_name ?? 'Le commercial'} a été approuvé.`);
    fetchMembers();
  }

  async function declineRequest(m: MemberWithProfile) {
    setProcessingRequestId(m.id);
    setError('');
    const { error: err } = await supabase
      .from('organisation_members')
      .delete()
      .eq('id', m.id);
    setProcessingRequestId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(`Demande de ${m.profiles?.full_name ?? '—'} refusée.`);
    fetchMembers();
  }

  // édition inline du taux de commission dans le tableau
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editingCommissionValue, setEditingCommissionValue] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);

  // modal performance agent
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceMember, setPerformanceMember] = useState<MemberWithProfile | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  interface AgentPerformance {
    portfolio_count: number;
    activities_this_month: number;
    revenue_achieved: number;
    commission_amount: number;
    new_accounts_this_month: number;
  }
  const [performanceData, setPerformanceData] = useState<AgentPerformance | null>(null);

  async function openPerformance(m: MemberWithProfile) {
    setPerformanceMember(m);
    setShowPerformance(true);
    setPerformanceLoading(true);
    setPerformanceData(null);
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const { data, error } = await supabase.rpc('get_agent_performance', {
      p_agent_member_id: m.id,
      period_start: periodStart,
    });
    if (!error) {
      setPerformanceData(((data as AgentPerformance[]) ?? [])[0] ?? null);
    }
    setPerformanceLoading(false);
  }

  async function fetchMembers() {
    if (!activeOrg) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_organisation_members_with_profile', {
      org_id: activeOrg.id,
    });
    if (error) {
      console.error('get_organisation_members_with_profile', error);
      setMembers([]);
      setLoading(false);
      return;
    }
    const mapped = ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
      ...row,
      profiles: {
        full_name: row.full_name as string | null,
        preferred_lang: row.preferred_lang as string,
        phone: row.phone as string | null,
      },
    })) as MemberWithProfile[];
    setMembers(mapped.filter((m) => m.active));
    setPendingRequests(mapped.filter((m) => !m.active));
    setLoading(false);
  }

  useEffect(() => { fetchMembers(); }, [activeOrg]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedUserId(null);
    setError('');
    const { data, error: err } = await supabase.rpc('search_profiles_by_name', {
      search_query: searchQuery.trim(),
    });
    if (err) {
      setError(`Erreur de recherche : ${err.message}`);
    } else {
      setSearchResults((data as { id: string; full_name: string | null }[]) ?? []);
    }
    setSearching(false);
  }

  function isValidCommissionRate(value: string): boolean {
    if (value.trim() === '') return true; // optionnel
    const n = Number(value);
    return !Number.isNaN(n) && n >= 0 && n <= 100;
  }

  async function handleInvite() {
    if (!activeOrg || !selectedUserId) return;
    if (inviteRole === 'sales_rep' && !isValidCommissionRate(inviteCommissionRate)) {
      setError('Le taux de commission doit être un nombre entre 0 et 100.');
      return;
    }
    setInviting(true);
    setError('');
    setSuccess('');
    const { error: err } = await supabase.from('organisation_members').insert({
      organisation_id: activeOrg.id,
      user_id: selectedUserId,
      team_role: inviteRole,
      active: true,
      commission_rate:
        inviteRole === 'sales_rep' && inviteCommissionRate.trim() !== ''
          ? Number(inviteCommissionRate)
          : null,
    });
    if (err) {
      setError(err.code === '23505' ? 'Cet utilisateur est déjà membre de votre organisation.' : err.message);
    } else {
      const name = searchResults.find((r) => r.id === selectedUserId)?.full_name ?? selectedUserId;
      setSuccess(`${name} ajouté avec le rôle ${ROLE_LABELS[inviteRole]}.`);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUserId(null);
      setInviteRole('member');
      setInviteCommissionRate('');
      fetchMembers();
    }
    setInviting(false);
  }

  async function handleRemove(memberId: string) {
    await supabase
      .from('organisation_members')
      .update({ active: false })
      .eq('id', memberId);
    fetchMembers();
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    // si on change un membre pour qu'il ne soit plus commercial, on efface son taux de commission
    const patch: { team_role: string; commission_rate?: null } =
      newRole !== 'sales_rep' ? { team_role: newRole, commission_rate: null } : { team_role: newRole };
    await supabase
      .from('organisation_members')
      .update(patch)
      .eq('id', memberId);
    fetchMembers();
  }

  function startEditCommission(m: MemberWithProfile) {
    setEditingCommissionId(m.id);
    setEditingCommissionValue(m.commission_rate != null ? String(m.commission_rate) : '');
  }

  async function saveCommission(memberId: string) {
    if (!isValidCommissionRate(editingCommissionValue)) return;
    setSavingCommission(true);
    await supabase
      .from('organisation_members')
      .update({
        commission_rate: editingCommissionValue.trim() === '' ? null : Number(editingCommissionValue),
      })
      .eq('id', memberId);
    setSavingCommission(false);
    setEditingCommissionId(null);
    fetchMembers();
  }

  return (
    <SpaceBetween size="l">
      {error && <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" dismissible onDismiss={() => setSuccess('')}>{success}</Alert>}

      {pendingRequests.length > 0 && (
        <Table
          items={pendingRequests}
          trackBy="id"
          header={
            <Header variant="h2" counter={`(${pendingRequests.length})`}>
              Demandes en attente
            </Header>
          }
          columnDefinitions={[
            {
              id: 'name',
              header: 'Candidat',
              cell: (m: MemberWithProfile) => m.profiles?.full_name ?? m.user_id,
            },
            {
              id: 'role',
              header: 'Rôle demandé',
              cell: (m: MemberWithProfile) => (
                <Badge color="grey">{ROLE_LABELS[m.team_role] ?? m.team_role}</Badge>
              ),
            },
            {
              id: 'phone',
              header: 'Téléphone',
              cell: (m: MemberWithProfile) => m.profiles?.phone ?? '—',
            },
            {
              id: 'requested',
              header: 'Demandé le',
              cell: (m: MemberWithProfile) => new Date(m.joined_at).toLocaleDateString('fr-FR'),
            },
            {
              id: 'commission',
              header: 'Commission à l\'approbation (%)',
              cell: (m: MemberWithProfile) =>
                m.team_role === 'sales_rep' ? (
                  <Input
                    value={approveCommissionDraft[m.id] ?? ''}
                    onChange={({ detail }) =>
                      setApproveCommissionDraft((prev) => ({ ...prev, [m.id]: detail.value }))
                    }
                    type="number"
                    placeholder="Ex: 5"
                  />
                ) : (
                  <Box color="text-body-secondary">—</Box>
                ),
              minWidth: 160,
            },
            {
              id: 'actions',
              header: 'Actions',
              cell: (m: MemberWithProfile) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="primary"
                    loading={processingRequestId === m.id}
                    onClick={() => approveRequest(m)}
                  >
                    Approuver
                  </Button>
                  <Button
                    variant="normal"
                    loading={processingRequestId === m.id}
                    onClick={() => declineRequest(m)}
                  >
                    Refuser
                  </Button>
                </SpaceBetween>
              ),
            },
          ]}
        />
      )}

      <Table
        header={
          <Header
            variant="h1"
            counter={`(${members.length})`}
            actions={
              <Button variant="primary" onClick={() => setShowInvite(true)}>
                + Inviter un membre
              </Button>
            }
          >
            Gestion de l'équipe
          </Header>
        }
        loading={loading}
        loadingText="Chargement..."
        trackBy="id"
        items={members}
        columnDefinitions={[
          {
            id: 'name',
            header: 'Membre',
            cell: (m: MemberWithProfile) => m.profiles?.full_name ?? m.user_id,
          },
          {
            id: 'role',
            header: 'Rôle',
            cell: (m: MemberWithProfile) => (
              <Badge color={m.team_role === 'owner' ? 'red' : m.team_role === 'admin_seller' ? 'blue' : 'grey'}>
                {ROLE_LABELS[m.team_role] ?? m.team_role}
              </Badge>
            ),
          },
          {
            id: 'commission',
            header: 'Commission',
            cell: (m: MemberWithProfile) => {
              if (m.team_role !== 'sales_rep') {
                return <Box color="text-body-secondary">—</Box>;
              }
              if (editingCommissionId === m.id) {
                return (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Input
                      value={editingCommissionValue}
                      onChange={({ detail }) => setEditingCommissionValue(detail.value)}
                      type="number"
                      inputMode="decimal"
                      placeholder="Ex: 5"
                    />
                    <Button
                      variant="primary"
                      loading={savingCommission}
                      onClick={() => saveCommission(m.id)}
                      disabled={!isValidCommissionRate(editingCommissionValue)}
                    >
                      OK
                    </Button>
                    <Button variant="link" onClick={() => setEditingCommissionId(null)}>
                      Annuler
                    </Button>
                  </SpaceBetween>
                );
              }
              return (
                <Button variant="inline-link" onClick={() => startEditCommission(m)}>
                  {m.commission_rate != null ? `${m.commission_rate}%` : 'Définir…'}
                </Button>
              );
            },
            minWidth: 160,
          },
          {
            id: 'joined',
            header: 'Membre depuis',
            cell: (m: MemberWithProfile) => new Date(m.joined_at).toLocaleDateString('fr-FR'),
          },
          {
            id: 'status',
            header: 'Statut',
            cell: () => (
              <StatusIndicator type="success">Actif</StatusIndicator>
            ),
          },
          {
            id: 'change_role',
            header: 'Modifier le rôle',
            cell: (m: MemberWithProfile) =>
              m.team_role !== 'owner' && m.user_id !== user?.id ? (
                <Select
                  selectedOption={{ value: m.team_role, label: ROLE_LABELS[m.team_role] ?? m.team_role }}
                  onChange={({ detail }) => handleRoleChange(m.id, detail.selectedOption.value ?? m.team_role)}
                  options={Object.entries(ROLE_LABELS)
                    .filter(([k]) => k !== 'owner')
                    .map(([value, label]) => ({ value, label }))}
                />
              ) : (
                <Box color="text-body-secondary">—</Box>
              ),
            minWidth: 200,
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (m: MemberWithProfile) => (
              <SpaceBetween direction="horizontal" size="xs">
                {m.team_role === 'sales_rep' && (
                  <Button variant="inline-link" onClick={() => openPerformance(m)}>
                    Performance
                  </Button>
                )}
                {m.team_role !== 'owner' && m.user_id !== user?.id && (
                  <Button variant="inline-link" onClick={() => handleRemove(m.id)}>
                    Retirer
                  </Button>
                )}
              </SpaceBetween>
            ),
          },
        ]}
        empty={
          <Box textAlign="center" color="inherit">
            <b>Aucun membre</b>
          </Box>
        }
      />

      <Modal
        visible={showInvite}
        onDismiss={() => {
          setShowInvite(false);
          setError('');
          setSuccess('');
          setSearchResults([]);
          setSelectedUserId(null);
          setSearchQuery('');
          setInviteCommissionRate('');
        }}
        header="Ajouter un membre"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowInvite(false)}>Annuler</Button>
              <Button variant="primary" loading={inviting} onClick={handleInvite} disabled={!selectedUserId}>
                Ajouter au compte
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <FormField
            label="Rechercher par nom complet"
            description="L'utilisateur doit déjà avoir un compte sur la plateforme."
          >
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={searchQuery}
                onChange={({ detail }) => setSearchQuery(detail.value)}
                placeholder="Ex: Mohamed Alami"
              />
              <Button onClick={handleSearch} loading={searching} iconName="search">
                Rechercher
              </Button>
            </SpaceBetween>
          </FormField>

          {searchResults.length > 0 && (
            <FormField label="Résultats">
              <SpaceBetween size="xs">
                {searchResults.map((r) => (
                  <Box
                    key={r.id}
                    padding="s"
                    color={selectedUserId === r.id ? 'text-status-info' : 'inherit'}
                  >
                    <Button
                      variant={selectedUserId === r.id ? 'primary' : 'normal'}
                      onClick={() => setSelectedUserId(r.id)}
                    >
                      {r.full_name ?? r.id}
                    </Button>
                  </Box>
                ))}
              </SpaceBetween>
            </FormField>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <Box color="text-body-secondary">Aucun utilisateur trouvé pour « {searchQuery} ».</Box>
          )}

          <FormField label="Rôle à attribuer">
            <Select
              selectedOption={{ value: inviteRole, label: ROLE_LABELS[inviteRole] }}
              onChange={({ detail }) => {
                const newRole = detail.selectedOption.value ?? 'member';
                setInviteRole(newRole);
                if (newRole !== 'sales_rep') setInviteCommissionRate('');
              }}
              options={Object.entries(ROLE_LABELS)
                .filter(([k]) => k !== 'owner')
                .map(([value, label]) => ({ value, label }))}
            />
          </FormField>

          {inviteRole === 'sales_rep' && (
            <FormField
              label="Taux de commission (%)"
              description="Optionnel à ce stade — peut aussi être défini plus tard depuis le tableau."
              errorText={
                inviteCommissionRate && !isValidCommissionRate(inviteCommissionRate)
                  ? 'Doit être un nombre entre 0 et 100.'
                  : undefined
              }
            >
              <Input
                value={inviteCommissionRate}
                onChange={({ detail }) => setInviteCommissionRate(detail.value)}
                type="number"
                inputMode="decimal"
                placeholder="Ex: 5"
              />
            </FormField>
          )}
        </SpaceBetween>
      </Modal>

      {/* Modal performance agent */}
      <Modal
        visible={showPerformance}
        onDismiss={() => setShowPerformance(false)}
        header={`Performance — ${performanceMember?.profiles?.full_name ?? 'Agent'}`}
        size="medium"
        footer={
          <Box float="right">
            <Button variant="link" onClick={() => setShowPerformance(false)}>Fermer</Button>
          </Box>
        }
      >
        {performanceLoading ? (
          <Box textAlign="center" padding="l">Chargement…</Box>
        ) : !performanceData ? (
          <Box color="text-status-inactive">Aucune donnée disponible.</Box>
        ) : (
          <KeyValuePairs
            columns={2}
            items={[
              { label: 'Acheteurs dans le portefeuille', value: String(performanceData.portfolio_count) },
              { label: 'Nouveaux comptes (ce mois)', value: String(performanceData.new_accounts_this_month) },
              { label: 'Activités enregistrées (ce mois)', value: String(performanceData.activities_this_month) },
              { label: 'CA généré (ce mois)', value: `${performanceData.revenue_achieved.toLocaleString('fr-FR')} MAD` },
              {
                label: `Commission due (${performanceMember?.commission_rate ?? '—'}%)`,
                value: `${performanceData.commission_amount.toLocaleString('fr-FR')} MAD`,
              },
            ]}
          />
        )}
      </Modal>
    </SpaceBetween>
  );
}

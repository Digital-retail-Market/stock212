import { useEffect, useState, useCallback } from 'react';
import {
  Table, Header, Button, SpaceBetween, StatusIndicator,
  Box, Badge, Modal, Alert, ColumnLayout, KeyValuePairs,
  Textarea, FormField, Link, Spinner,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';

interface PendingOrg {
  id: string;
  name: string;
  org_type: 'buyer' | 'seller' | 'delivery';
  sub_type: string | null;
  siret: string | null;
  vat_number: string | null;
  country: string;
  city: string | null;
  phone: string | null;
  ice: string | null;
  rc: string | null;
  patente: string | null;
  cnss: string | null;
  validation_status: string;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
}

interface OnboardingDocument {
  id: string;
  document_type: string;
  document_label: string | null;
  file_url: string;
  file_name: string | null;
  status: string;
  uploaded_at: string;
}

const ORG_TYPE_LABEL: Record<string, string> = {
  buyer: 'Acheteur',
  seller: 'Fournisseur',
  delivery: 'Transporteur',
};

// Nom du bucket Supabase Storage contenant les documents KYC.
// À ajuster si le bucket réel porte un autre nom.
const KYC_BUCKET = 'onboarding-documents';

export default function AdminApprovals() {
  const [items, setItems] = useState<PendingOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingOrg | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Email du propriétaire, chargé à la demande (RPC security definer)
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [ownerEmailLoading, setOwnerEmailLoading] = useState(false);

  // Documents KYC de l'organisation sélectionnée
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organisations')
      .select(`
        id, name, org_type, sub_type, siret, vat_number,
        country, city, phone, ice, rc, patente, cnss,
        validation_status, created_at,
        organisation_members!inner(
          team_role,
          profiles:profiles(full_name)
        )
      `)
      .eq('validation_status', 'pending')
      .eq('organisation_members.team_role', 'owner')
      .order('created_at', { ascending: true });

    if (error) {
      setAlert({ type: 'error', msg: `Erreur de chargement : ${error.message}` });
      setLoading(false);
      return;
    }

    if (data) {
      setItems(data.map((o: Record<string, unknown>) => {
        const member = Array.isArray(o.organisation_members)
          ? (o.organisation_members[0] as Record<string, unknown>) : null;
        const profile = member?.profiles as Record<string, unknown> | null;
        return {
          ...o,
          owner_name: (profile?.full_name as string) ?? null,
          owner_email: null,
        } as PendingOrg;
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Charge l'email du propriétaire + les documents KYC quand la sélection change
  useEffect(() => {
    if (!selected) {
      setOwnerEmail(null);
      setDocuments([]);
      setSignedUrls({});
      return;
    }

    let cancelled = false;

    setOwnerEmailLoading(true);
    supabase
      .rpc('get_pending_organisation_owner_email', { org_id: selected.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        setOwnerEmailLoading(false);
        if (error) {
          console.error('get_pending_organisation_owner_email', error);
          setOwnerEmail(null);
          return;
        }
        setOwnerEmail((data as string) ?? null);
      });

    setDocumentsLoading(true);
    supabase
      .from('onboarding_documents')
      .select('id, document_type, document_label, file_url, file_name, status, uploaded_at')
      .eq('organisation_id', selected.id)
      .order('uploaded_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (cancelled) return;
        setDocumentsLoading(false);
        if (error) {
          console.error('onboarding_documents', error);
          setDocuments([]);
          return;
        }
        const docs = (data as OnboardingDocument[]) ?? [];
        setDocuments(docs);

        // Génère une URL signée pour chaque document (bucket privé)
        const entries = await Promise.all(
          docs.map(async (doc) => {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from(KYC_BUCKET)
              .createSignedUrl(doc.file_url, 60 * 10); // valide 10 min
            if (signErr) {
              console.error('createSignedUrl', doc.file_url, signErr);
              return [doc.id, ''] as const;
            }
            return [doc.id, signed?.signedUrl ?? ''] as const;
          })
        );
        if (!cancelled) {
          setSignedUrls(Object.fromEntries(entries));
        }
      });

    return () => { cancelled = true; };
  }, [selected]);

  async function approve(org: PendingOrg) {
    setProcessing(true);
    const { error } = await supabase
      .from('organisations')
      .update({ validation_status: 'active' })
      .eq('id', org.id);
    setProcessing(false);
    if (error) { setAlert({ type: 'error', msg: error.message }); return; }
    setAlert({ type: 'success', msg: `« ${org.name} » approuvée avec succès.` });
    setSelected(null);
    load();
  }

  async function reject(org: PendingOrg) {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    const { error } = await supabase
      .from('organisations')
      .update({ validation_status: 'rejected' })
      .eq('id', org.id);
    setProcessing(false);
    setShowRejectModal(false);
    setRejectReason('');
    if (error) { setAlert({ type: 'error', msg: error.message }); return; }
    setAlert({ type: 'success', msg: `« ${org.name} » refusée.` });
    setSelected(null);
    load();
  }

  return (
    <SpaceBetween size="m">
      {alert && (
        <Alert
          type={alert.type}
          dismissible
          onDismiss={() => setAlert(null)}
        >
          {alert.msg}
        </Alert>
      )}

      <Table
        loading={loading}
        loadingText="Chargement des dossiers en attente…"
        items={items}
        selectedItems={selected ? [selected] : []}
        onSelectionChange={({ detail }) =>
          setSelected(detail.selectedItems[0] ?? null)
        }
        selectionType="single"
        header={
          <Header
            counter={`(${items.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="primary"
                  disabled={!selected || processing}
                  loading={processing}
                  onClick={() => selected && approve(selected)}
                >
                  Approuver
                </Button>
                <Button
                  variant="normal"
                  disabled={!selected || processing}
                  onClick={() => { setShowRejectModal(true); setRejectReason(''); }}
                >
                  Refuser
                </Button>
              </SpaceBetween>
            }
          >
            Dossiers en attente de validation
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Organisation',
            cell: (o) => o.name,
            sortingField: 'name',
          },
          {
            id: 'type',
            header: 'Type',
            cell: (o) => (
              <Badge color={
                o.org_type === 'seller' ? 'blue' :
                o.org_type === 'delivery' ? 'grey' : 'green'
              }>
                {ORG_TYPE_LABEL[o.org_type] ?? o.org_type}
              </Badge>
            ),
          },
          {
            id: 'owner',
            header: 'Propriétaire',
            cell: (o) => o.owner_name ?? '—',
          },
          {
            id: 'country',
            header: 'Pays',
            cell: (o) => o.country,
          },
          {
            id: 'siret',
            header: 'SIRET / RC',
            cell: (o) => o.siret ?? '—',
          },
          {
            id: 'submitted',
            header: 'Soumis le',
            cell: (o) =>
              new Date(o.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric',
              }),
            sortingField: 'created_at',
          },
          {
            id: 'status',
            header: 'Statut',
            cell: () => (
              <StatusIndicator type="pending">En attente</StatusIndicator>
            ),
          },
        ]}
        empty={
          <Box textAlign="center" color="inherit" padding="xl">
            <StatusIndicator type="success">
              Aucun dossier en attente de validation
            </StatusIndicator>
          </Box>
        }
      />

      {/* Détail de l'organisation sélectionnée */}
      {selected && (
        <Box padding="m" variant="awsui-key-label">
          <SpaceBetween size="l">
            <ColumnLayout columns={2} variant="text-grid">
              <KeyValuePairs
                columns={2}
                items={[
                  { label: 'Raison sociale', value: selected.name },
                  { label: 'Type',           value: ORG_TYPE_LABEL[selected.org_type] },
                  { label: 'Sous-type',      value: selected.sub_type ?? '—' },
                  { label: 'Propriétaire',   value: selected.owner_name ?? '—' },
                  {
                    label: 'Email propriétaire',
                    value: ownerEmailLoading
                      ? 'Chargement…'
                      : (ownerEmail ?? '—'),
                  },
                  { label: 'Téléphone',      value: selected.phone ?? '—' },
                  { label: 'SIRET / RC',     value: selected.siret ?? selected.rc ?? '—' },
                  { label: 'N° TVA',         value: selected.vat_number ?? '—' },
                  { label: 'ICE',            value: selected.ice ?? '—' },
                  { label: 'Patente',        value: selected.patente ?? '—' },
                  { label: 'CNSS',           value: selected.cnss ?? '—' },
                  { label: 'Pays',           value: selected.country },
                  { label: 'Ville',          value: selected.city ?? '—' },
                ]}
              />
            </ColumnLayout>

            {/* Documents KYC */}
            <Box>
              <Header variant="h3" counter={`(${documents.length})`}>
                Documents / pièces justificatives
              </Header>
              {documentsLoading ? (
                <Box padding="s"><Spinner /> Chargement des documents…</Box>
              ) : documents.length === 0 ? (
                <Box padding="s" color="text-status-inactive">
                  Aucun document soumis pour ce dossier.
                </Box>
              ) : (
                <Table
                  items={documents}
                  variant="embedded"
                  columnDefinitions={[
                    {
                      id: 'label',
                      header: 'Document',
                      cell: (d) => d.document_label || d.document_type,
                    },
                    {
                      id: 'file',
                      header: 'Fichier',
                      cell: (d) =>
                        signedUrls[d.id] ? (
                          <Link href={signedUrls[d.id]} external target="_blank">
                            {d.file_name || 'Télécharger'}
                          </Link>
                        ) : (
                          <Box color="text-status-inactive">Lien indisponible</Box>
                        ),
                    },
                    {
                      id: 'status',
                      header: 'Statut',
                      cell: (d) => (
                        <StatusIndicator
                          type={
                            d.status === 'approved' ? 'success' :
                            d.status === 'rejected' ? 'error' : 'pending'
                          }
                        >
                          {d.status === 'approved' ? 'Validé' :
                           d.status === 'rejected' ? 'Refusé' : 'En attente'}
                        </StatusIndicator>
                      ),
                    },
                    {
                      id: 'uploaded_at',
                      header: 'Soumis le',
                      cell: (d) =>
                        new Date(d.uploaded_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        }),
                    },
                  ]}
                />
              )}
            </Box>
          </SpaceBetween>
        </Box>
      )}

      {/* Modal refus */}
      <Modal
        visible={showRejectModal}
        onDismiss={() => setShowRejectModal(false)}
        header="Refuser le dossier"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowRejectModal(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                disabled={!rejectReason.trim() || processing}
                loading={processing}
                onClick={() => selected && reject(selected)}
              >
                Confirmer le refus
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning">
            Le dossier de <strong>{selected?.name}</strong> sera marqué comme refusé.
            L'utilisateur sera notifié lors de sa prochaine connexion.
          </Alert>
          <FormField label="Motif du refus" description="Ce motif sera affiché à l'utilisateur.">
            <Textarea
              value={rejectReason}
              onChange={({ detail }) => setRejectReason(detail.value)}
              placeholder="Ex : Documents insuffisants, informations manquantes…"
              rows={3}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

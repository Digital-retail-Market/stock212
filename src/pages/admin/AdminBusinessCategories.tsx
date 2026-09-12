import { useEffect, useState } from 'react';
import {
  SpaceBetween, Header, Container, ColumnLayout, Box, Table,
  Badge, Button, Modal, FormField, Input, Textarea,
  Flashbar, ButtonDropdown, TextFilter,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';

interface SubTypeRow {
  sub_type: string;
  org_type: string;
  count: number;
}

interface CategoryDef {
  id: string;
  name: string;
  actor_type: string;
  description: string | null;
  active: boolean;
  display_order: number;
}

const ORG_TYPE_COLOR: Record<string, 'blue' | 'green' | 'grey'> = {
  buyer:    'blue',
  seller:   'green',
  delivery: 'grey',
};

const ORG_TYPE_LABEL: Record<string, string> = {
  buyer: 'Acheteur', seller: 'Vendeur', delivery: 'Livreur',
};

export default function AdminBusinessCategories() {
  const [usedSubTypes, setUsedSubTypes]   = useState<SubTypeRow[]>([]);
  const [definitions, setDefinitions]     = useState<CategoryDef[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filterText, setFilterText]       = useState('');
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editDef, setEditDef]     = useState<CategoryDef | null>(null);
  const [form, setForm] = useState({ name: '', actor_type: 'buyer', description: '' });
  const [saving, setSaving]       = useState(false);

  async function load() {
    setLoading(true);
    const [orgRes, defRes] = await Promise.all([
      supabase.from('organisations').select('sub_type, org_type').not('sub_type', 'is', null),
      supabase.from('business_categories').select('*').order('actor_type').order('display_order').order('name'),
    ]);

    // Aggregate used sub_types
    const agg: Record<string, SubTypeRow> = {};
    ((orgRes.data ?? []) as Array<{ sub_type: string; org_type: string }>).forEach((o) => {
      const key = `${o.org_type}::${o.sub_type}`;
      if (!agg[key]) agg[key] = { sub_type: o.sub_type, org_type: o.org_type, count: 0 };
      agg[key].count++;
    });
    setUsedSubTypes(Object.values(agg).sort((a, b) => b.count - a.count));

    if (defRes.data) {
      setDefinitions(defRes.data as CategoryDef[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditDef(null);
    setForm({ name: '', actor_type: 'buyer', description: '' });
    setShowModal(true);
  }

  function openEdit(d: CategoryDef) {
    setEditDef(d);
    setForm({ name: d.name, actor_type: d.actor_type, description: d.description ?? '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name.trim(), actor_type: form.actor_type, description: form.description || null };
    let err;
    if (editDef) {
      ({ error: err } = await supabase.from('business_categories').update(payload).eq('id', editDef.id));
    } else {
      const siblings = definitions.filter((d) => d.actor_type === form.actor_type);
      const nextOrder = siblings.length ? Math.max(...siblings.map((d) => d.display_order)) + 1 : 0;
      ({ error: err } = await supabase.from('business_categories').insert({ ...payload, active: true, display_order: nextOrder }));
    }
    if (err) {
      setFlash({ type: 'error', msg: err.message });
    } else {
      setFlash({ type: 'success', msg: editDef ? 'Type modifié.' : 'Type créé.' });
      setShowModal(false);
      load();
    }
    setSaving(false);
  }

  async function moveDef(d: CategoryDef, dir: -1 | 1) {
    const siblings = definitions.filter((x) => x.actor_type === d.actor_type);
    const pos = siblings.findIndex((x) => x.id === d.id);
    const swapWith = siblings[pos + dir];
    if (!swapWith) return;

    const a = { id: d.id, display_order: swapWith.display_order };
    const b = { id: swapWith.id, display_order: d.display_order };
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from('business_categories').update({ display_order: a.display_order }).eq('id', a.id),
      supabase.from('business_categories').update({ display_order: b.display_order }).eq('id', b.id),
    ]);
    if (err1 || err2) {
      setFlash({ type: 'error', msg: (err1 ?? err2)?.message ?? 'Erreur de réordonnancement.' });
      return;
    }
    setDefinitions((prev) => prev.map((x) => {
      if (x.id === a.id) return { ...x, display_order: a.display_order };
      if (x.id === b.id) return { ...x, display_order: b.display_order };
      return x;
    }));
  }

  async function handleToggleActive(d: CategoryDef) {
    await supabase.from('business_categories').update({ active: !d.active }).eq('id', d.id);
    setFlash({ type: 'success', msg: `Type "${d.name}" ${d.active ? 'désactivé' : 'réactivé'}.` });
    load();
  }

  async function handleDelete(d: CategoryDef) {
    await supabase.from('business_categories').delete().eq('id', d.id);
    setFlash({ type: 'success', msg: `Type "${d.name}" supprimé.` });
    load();
  }

  const filteredUsed = usedSubTypes.filter((r) =>
    !filterText || r.sub_type.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <SpaceBetween size="l">
      <Header variant="h1">Types d'acteurs (sous-types)</Header>

      {flash && (
        <Flashbar items={[{ type: flash.type, content: flash.msg, id: '1', dismissible: true, onDismiss: () => setFlash(null) }]} />
      )}

      {/* ── Répartition en base ───────────────────────────────────── */}
      <Container header={<Header variant="h2">Répartition actuelle des sous-types</Header>}>
        <SpaceBetween size="m">
          <TextFilter
            filteringText={filterText}
            filteringPlaceholder="Filtrer…"
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
          <Table
            loading={loading}
            loadingText="Chargement…"
            items={filteredUsed}
            trackBy="sub_type"
            columnDefinitions={[
              {
                id: 'type',
                header: 'Catégorie d\'acteur',
                cell: (r) => <Badge color={ORG_TYPE_COLOR[r.org_type] ?? 'grey'}>{ORG_TYPE_LABEL[r.org_type] ?? r.org_type}</Badge>,
              },
              {
                id: 'sub_type',
                header: 'Sous-type',
                cell: (r) => <Box fontWeight="bold">{r.sub_type}</Box>,
              },
              {
                id: 'count',
                header: 'Organisations',
                cell: (r) => r.count,
              },
            ]}
            empty={<Box textAlign="center">Aucun sous-type renseigné dans les organisations</Box>}
          />
        </SpaceBetween>
      </Container>

      {/* ── Définitions officielles ───────────────────────────────── */}
      <Container
        header={
          <Header
            variant="h2"
            actions={<Button variant="primary" onClick={openCreate}>+ Nouveau type</Button>}
            description="Définissez les types autorisés — les vendeurs/acheteurs les voient pendant l'onboarding, dans l'ordre d'importance ci-dessous (flèches pour réordonner)."
          >
            Définitions officielles
          </Header>
        }
      >
        <Table
          loading={loading}
          items={definitions}
          trackBy="id"
          columnDefinitions={[
            {
              id: 'order',
              header: 'Importance',
              width: 100,
              cell: (d) => {
                const siblings = definitions.filter((x) => x.actor_type === d.actor_type);
                const idx = siblings.findIndex((x) => x.id === d.id);
                return (
                  <SpaceBetween direction="horizontal" size="xxs">
                    <Button variant="icon" iconName="angle-up" disabled={idx === 0} onClick={() => moveDef(d, -1)} ariaLabel="Monter" />
                    <Button variant="icon" iconName="angle-down" disabled={idx === siblings.length - 1} onClick={() => moveDef(d, 1)} ariaLabel="Descendre" />
                  </SpaceBetween>
                );
              },
            },
            {
              id: 'actor_type',
              header: 'Type d\'acteur',
              cell: (d) => <Badge color={ORG_TYPE_COLOR[d.actor_type] ?? 'grey'}>{ORG_TYPE_LABEL[d.actor_type] ?? d.actor_type}</Badge>,
            },
            {
              id: 'name',
              header: 'Nom',
              cell: (d) => <Box fontWeight="bold">{d.name}</Box>,
            },
            {
              id: 'description',
              header: 'Description',
              cell: (d) => d.description ?? <Box color="text-body-secondary">—</Box>,
              minWidth: 200,
            },
            {
              id: 'active',
              header: 'Statut',
              cell: (d) => <Badge color={d.active ? 'green' : 'grey'}>{d.active ? 'Actif' : 'Désactivé'}</Badge>,
            },
            {
              id: 'actions',
              header: '',
              cell: (d) => (
                <ButtonDropdown
                  items={[
                    { id: 'edit', text: 'Modifier' },
                    { id: 'toggle', text: d.active ? 'Désactiver' : 'Réactiver' },
                    { id: 'delete', text: 'Supprimer' },
                  ]}
                  onItemClick={({ detail: det }) => {
                    if (det.id === 'edit')   openEdit(d);
                    if (det.id === 'toggle') handleToggleActive(d);
                    if (det.id === 'delete') handleDelete(d);
                  }}
                >
                  Actions
                </ButtonDropdown>
              ),
            },
          ]}
          empty={
            <Box textAlign="center" color="inherit">
              <b>Aucune définition</b>
              <Box padding={{ bottom: 's' }} variant="p">
                Créez les types officiels (ex: GMS, Distributeur, Importateur…)
              </Box>
              <Button variant="primary" onClick={openCreate}>+ Nouveau type</Button>
            </Box>
          }
        />
      </Container>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editDef ? `Modifier — ${editDef.name}` : 'Nouveau type d\'acteur'}
        size="small"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button variant="primary" loading={saving} onClick={handleSave}>{editDef ? 'Enregistrer' : 'Créer'}</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Nom *" description="Ex: Distributeur, GMS, Importateur">
            <Input value={form.name} onChange={({ detail }) => setForm({ ...form, name: detail.value })} placeholder="Distributeur" />
          </FormField>
          <FormField label="Type d'acteur concerné">
            <ColumnLayout columns={3}>
              {(['buyer', 'seller', 'delivery'] as const).map((t) => (
                <Button
                  key={t}
                  variant={form.actor_type === t ? 'primary' : 'normal'}
                  onClick={() => setForm({ ...form, actor_type: t })}
                >
                  {ORG_TYPE_LABEL[t]}
                </Button>
              ))}
            </ColumnLayout>
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={({ detail }) => setForm({ ...form, description: detail.value })} rows={2} />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

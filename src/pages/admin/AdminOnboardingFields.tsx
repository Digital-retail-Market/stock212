import { useCallback, useEffect, useState } from 'react';
import {
  SpaceBetween, Header, Container, ColumnLayout, Box, Table,
  Badge, Button, Modal, FormField, Input, Select,
  Toggle, Flashbar, ButtonDropdown, Autosuggest, Alert,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';
import {
  FIELD_DEF_ROLE_LABEL, FIELD_TYPE_LABEL, FIELD_TYPES_WITH_OPTIONS,
  groupFieldDefsBySection, slugifyFieldKey,
  type FieldDefRole, type OnboardingFieldDefinition, type OnboardingFieldType,
} from '../../lib/onboardingFields';

const ROLES: FieldDefRole[] = ['acheteur', 'vendeur', 'livreur', 'commercial'];

const FIELD_TYPE_OPTIONS = (Object.keys(FIELD_TYPE_LABEL) as OnboardingFieldType[]).map((value) => ({
  value,
  label: FIELD_TYPE_LABEL[value],
}));

interface FormState {
  section: string;
  label: string;
  field_key: string;
  field_type: OnboardingFieldType;
  required: boolean;
  options: string[];
}

const EMPTY_FORM: FormState = {
  section: 'Informations complémentaires',
  label: '',
  field_key: '',
  field_type: 'text',
  required: false,
  options: [],
};

export default function AdminOnboardingFields() {
  const [role, setRole] = useState<FieldDefRole>('vendeur');
  const [defs, setDefs] = useState<OnboardingFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingDef, setEditingDef] = useState<OnboardingFieldDefinition | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldKeyTouched, setFieldKeyTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OnboardingFieldDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Garde-fou supplémentaire pour désactiver/supprimer un champ système
  // (is_system_field = true) — ces champs alimentent une colonne réelle
  // utilisée ailleurs dans la plateforme.
  const [systemGuardTarget, setSystemGuardTarget] = useState<
    { def: OnboardingFieldDefinition; action: 'disable' | 'delete' } | null
  >(null);
  const [systemGuardBusy, setSystemGuardBusy] = useState(false);

  const [showDisabled, setShowDisabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('onboarding_field_definitions')
      .select('*')
      .eq('role', role)
      .order('section', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) {
      setFlash({ type: 'error', msg: `Erreur de chargement : ${error.message}` });
      setDefs([]);
    } else {
      setDefs((data ?? []) as OnboardingFieldDefinition[]);
    }
    setLoading(false);
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const visibleDefs = showDisabled ? defs : defs.filter((d) => d.enabled);
  const sections = groupFieldDefsBySection(visibleDefs);
  const knownSections = Array.from(new Set(defs.map((d) => d.section)));
  const hiddenDisabledCount = defs.filter((d) => !d.enabled).length;

  function openCreate() {
    setEditingDef(null);
    setForm(EMPTY_FORM);
    setFieldKeyTouched(false);
    setShowModal(true);
  }

  function openEdit(def: OnboardingFieldDefinition) {
    setEditingDef(def);
    setForm({
      section: def.section,
      label: def.label,
      field_key: def.field_key,
      field_type: def.field_type,
      required: def.required,
      options: def.options ?? [],
    });
    setFieldKeyTouched(true);
    setShowModal(true);
  }

  function onLabelChange(value: string) {
    setForm((f) => ({
      ...f,
      label: value,
      field_key: fieldKeyTouched || editingDef ? f.field_key : slugifyFieldKey(value),
    }));
  }

  function updateOption(index: number, value: string) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));
  }

  function removeOption(index: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  }

  function moveOption(index: number, dir: -1 | 1) {
    setForm((f) => {
      const target = index + dir;
      if (target < 0 || target >= f.options.length) return f;
      const next = [...f.options];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, options: next };
    });
  }

  const needsOptions = FIELD_TYPES_WITH_OPTIONS.includes(form.field_type);
  const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
  const canSave =
    form.label.trim().length > 0 &&
    form.field_key.trim().length > 0 &&
    (!needsOptions || cleanOptions.length > 0);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);

    const payload = {
      role,
      section: form.section.trim() || 'Informations complémentaires',
      field_key: form.field_key.trim(),
      label: form.label.trim(),
      field_type: form.field_type,
      options: needsOptions ? cleanOptions : null,
      required: form.required,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingDef) {
      ({ error } = await supabase
        .from('onboarding_field_definitions')
        .update(payload)
        .eq('id', editingDef.id));
    } else {
      const sectionDefs = defs.filter((d) => d.section === payload.section);
      const nextOrder = sectionDefs.length
        ? Math.max(...sectionDefs.map((d) => d.display_order)) + 1
        : 0;
      ({ error } = await supabase
        .from('onboarding_field_definitions')
        .insert({ ...payload, display_order: nextOrder, enabled: true }));
    }

    setSaving(false);
    if (error) {
      setFlash({
        type: 'error',
        msg: error.code === '23505'
          ? `La clé technique "${payload.field_key}" existe déjà pour ce rôle.`
          : `Erreur : ${error.message}`,
      });
      return;
    }
    setFlash({ type: 'success', msg: editingDef ? 'Champ modifié.' : 'Champ créé.' });
    setShowModal(false);
    load();
  }

  async function performToggle(def: OnboardingFieldDefinition) {
    const { error } = await supabase
      .from('onboarding_field_definitions')
      .update({ enabled: !def.enabled, updated_at: new Date().toISOString() })
      .eq('id', def.id);
    if (error) {
      setFlash({ type: 'error', msg: error.message });
      return;
    }
    setDefs((prev) => prev.map((d) => (d.id === def.id ? { ...d, enabled: !d.enabled } : d)));
  }

  function toggleEnabled(def: OnboardingFieldDefinition) {
    // Désactiver un champ système passe par le garde-fou ; l'activer, et
    // désactiver/activer un champ personnalisé, restent immédiats.
    if (def.is_system_field && def.enabled) {
      setSystemGuardTarget({ def, action: 'disable' });
      return;
    }
    performToggle(def);
  }

  function requestDelete(def: OnboardingFieldDefinition) {
    if (def.is_system_field) {
      setSystemGuardTarget({ def, action: 'delete' });
    } else {
      setDeleteTarget(def);
    }
  }

  async function confirmSystemGuard() {
    if (!systemGuardTarget) return;
    setSystemGuardBusy(true);
    const { def, action } = systemGuardTarget;
    if (action === 'disable') {
      await performToggle(def);
    } else {
      const { error } = await supabase.from('onboarding_field_definitions').delete().eq('id', def.id);
      if (error) {
        setFlash({ type: 'error', msg: error.message });
        setSystemGuardBusy(false);
        return;
      }
      setFlash({ type: 'success', msg: `Champ "${def.label}" supprimé.` });
      load();
    }
    setSystemGuardBusy(false);
    setSystemGuardTarget(null);
  }

  async function moveField(def: OnboardingFieldDefinition, dir: -1 | 1) {
    const siblings = defs.filter((d) => d.section === def.section).sort((a, b) => a.display_order - b.display_order);
    const pos = siblings.findIndex((d) => d.id === def.id);
    const swapWith = siblings[pos + dir];
    if (!swapWith) return;

    const a = { id: def.id, display_order: swapWith.display_order };
    const b = { id: swapWith.id, display_order: def.display_order };
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from('onboarding_field_definitions').update({ display_order: a.display_order }).eq('id', a.id),
      supabase.from('onboarding_field_definitions').update({ display_order: b.display_order }).eq('id', b.id),
    ]);
    if (err1 || err2) {
      setFlash({ type: 'error', msg: (err1 ?? err2)?.message ?? 'Erreur de réordonnancement.' });
      return;
    }
    setDefs((prev) => prev.map((d) => {
      if (d.id === a.id) return { ...d, display_order: a.display_order };
      if (d.id === b.id) return { ...d, display_order: b.display_order };
      return d;
    }));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('onboarding_field_definitions')
      .delete()
      .eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setFlash({ type: 'error', msg: error.message });
      return;
    }
    setFlash({ type: 'success', msg: `Champ "${deleteTarget.label}" supprimé.` });
    setDeleteTarget(null);
    load();
  }

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="Tous les champs du formulaire d'onboarding pour ce rôle — champs système (badge « Champ système », migrés du code) et champs personnalisés ajoutés depuis cette page. Seuls l'inscription/mot de passe, le choix du rôle et le consentement RGPD restent gérés hors de cette liste."
      >
        Champs d'onboarding
      </Header>

      {flash && (
        <Flashbar items={[{ type: flash.type, content: flash.msg, id: '1', dismissible: true, onDismiss: () => setFlash(null) }]} />
      )}

      <Container>
        <ColumnLayout columns={4}>
          {ROLES.map((r) => (
            <Button
              key={r}
              variant={role === r ? 'primary' : 'normal'}
              onClick={() => setRole(r)}
            >
              {FIELD_DEF_ROLE_LABEL[r]}
            </Button>
          ))}
        </ColumnLayout>
      </Container>

      <SpaceBetween direction="horizontal" size="m" alignItems="center">
        <Box float="right">
          <Button variant="primary" onClick={openCreate}>+ Ajouter un champ</Button>
        </Box>
        <Toggle checked={showDisabled} onChange={({ detail }) => setShowDisabled(detail.checked)}>
          Afficher les champs désactivés aussi {hiddenDisabledCount > 0 && !showDisabled ? `(${hiddenDisabledCount} masqué${hiddenDisabledCount > 1 ? 's' : ''})` : ''}
        </Toggle>
      </SpaceBetween>

      {!loading && sections.length === 0 && (
        <Box textAlign="center" color="inherit" padding="xl">
          <b>Aucun champ {showDisabled ? '' : 'actif '}pour {FIELD_DEF_ROLE_LABEL[role]}</b>
          <Box padding={{ top: 's', bottom: 's' }} variant="p">
            Ajoutez un champ pour enrichir le formulaire d'onboarding de ce rôle.
          </Box>
          <Button variant="primary" onClick={openCreate}>+ Ajouter un champ</Button>
        </Box>
      )}

      {sections.map(({ section, fields }) => (
        <Container key={section} header={<Header variant="h2" counter={`(${fields.length})`}>{section}</Header>}>
          <Table
            loading={loading}
            items={fields}
            trackBy="id"
            variant="embedded"
            columnDefinitions={[
              {
                id: 'order',
                header: 'Ordre',
                width: 90,
                cell: (d: OnboardingFieldDefinition) => {
                  const idx = fields.indexOf(d);
                  return (
                    <SpaceBetween direction="horizontal" size="xxs">
                      <Button
                        variant="icon"
                        iconName="angle-up"
                        disabled={idx === 0}
                        onClick={() => moveField(d, -1)}
                        ariaLabel="Monter"
                      />
                      <Button
                        variant="icon"
                        iconName="angle-down"
                        disabled={idx === fields.length - 1}
                        onClick={() => moveField(d, 1)}
                        ariaLabel="Descendre"
                      />
                    </SpaceBetween>
                  );
                },
              },
              {
                id: 'label',
                header: 'Libellé',
                cell: (d) => (
                  <Box>
                    <SpaceBetween direction="horizontal" size="xs">
                      <Box fontWeight="bold">{d.label}</Box>
                      {d.is_system_field && <Badge color="blue">Champ système</Badge>}
                    </SpaceBetween>
                    <Box variant="small" color="text-body-secondary">{d.field_key}</Box>
                  </Box>
                ),
              },
              {
                id: 'type',
                header: 'Type',
                cell: (d) => FIELD_TYPE_LABEL[d.field_type] ?? d.field_type,
              },
              {
                id: 'options',
                header: 'Options',
                cell: (d) => d.options && d.options.length > 0
                  ? d.options.join(', ')
                  : <Box color="text-status-inactive">—</Box>,
                minWidth: 180,
              },
              {
                id: 'required',
                header: 'Obligatoire',
                cell: (d) => d.required
                  ? <Badge color="red">Obligatoire</Badge>
                  : <Badge color="grey">Optionnel</Badge>,
              },
              {
                id: 'status',
                header: 'Statut',
                cell: (d) => (
                  <Toggle checked={d.enabled} onChange={() => toggleEnabled(d)}>
                    {d.enabled ? 'Actif' : 'Inactif'}
                  </Toggle>
                ),
              },
              {
                id: 'actions',
                header: '',
                cell: (d) => (
                  <ButtonDropdown
                    items={[
                      { id: 'edit', text: 'Modifier' },
                      { id: 'delete', text: 'Supprimer' },
                    ]}
                    onItemClick={({ detail }) => {
                      if (detail.id === 'edit') openEdit(d);
                      if (detail.id === 'delete') requestDelete(d);
                    }}
                  >
                    Actions
                  </ButtonDropdown>
                ),
              },
            ]}
          />
        </Container>
      ))}

      {/* ── Modal création / édition ─────────────────────────────────────── */}
      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header={editingDef ? `Modifier — ${editingDef.label}` : `Nouveau champ — ${FIELD_DEF_ROLE_LABEL[role]}`}
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowModal(false)}>Annuler</Button>
              <Button variant="primary" loading={saving} disabled={!canSave} onClick={handleSave}>
                {editingDef ? 'Enregistrer' : 'Créer'}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Section" description="Regroupe ce champ avec d'autres à l'affichage. Reprenez une section existante ou tapez-en une nouvelle.">
            <Autosuggest
              value={form.section}
              onChange={({ detail }) => setForm((f) => ({ ...f, section: detail.value }))}
              options={knownSections.map((s) => ({ value: s }))}
              placeholder="Ex : Identité commerciale & contact"
              enteredTextLabel={(value) => `Nouvelle section : "${value}"`}
            />
          </FormField>

          <FormField label="Libellé *" description="Texte affiché à l'utilisateur pendant l'onboarding.">
            <Input value={form.label} onChange={({ detail }) => onLabelChange(detail.value)} placeholder="Ex : Ancienneté de l'entreprise" />
          </FormField>

          <FormField
            label="Clé technique *"
            description={editingDef
              ? "Non modifiable après création : elle sert de clé de stockage dans les dossiers déjà soumis."
              : "Générée automatiquement depuis le libellé. Vous pouvez l'ajuster avant la création."}
          >
            <Input
              value={form.field_key}
              disabled={!!editingDef}
              onChange={({ detail }) => { setFieldKeyTouched(true); setForm((f) => ({ ...f, field_key: slugifyFieldKey(detail.value) })); }}
              placeholder="anciennete_entreprise"
            />
          </FormField>

          <FormField label="Type de champ *">
            <Select
              selectedOption={{ value: form.field_type, label: FIELD_TYPE_LABEL[form.field_type] }}
              onChange={({ detail }) => setForm((f) => ({ ...f, field_type: detail.selectedOption.value as OnboardingFieldType }))}
              options={FIELD_TYPE_OPTIONS}
            />
          </FormField>

          <FormField label="Obligatoire">
            <Toggle checked={form.required} onChange={({ detail }) => setForm((f) => ({ ...f, required: detail.checked }))}>
              {form.required ? 'Champ obligatoire' : 'Champ optionnel'}
            </Toggle>
          </FormField>

          {needsOptions && (
            <FormField
              label="Options de la liste *"
              description="Valeurs proposées à l'utilisateur. Réordonnez avec les flèches."
            >
              <SpaceBetween size="xs">
                {form.options.map((opt, i) => (
                  <SpaceBetween key={i} direction="horizontal" size="xs" alignItems="center">
                    <Box>
                      <Button variant="icon" iconName="angle-up" disabled={i === 0} onClick={() => moveOption(i, -1)} ariaLabel="Monter l'option" />
                      <Button variant="icon" iconName="angle-down" disabled={i === form.options.length - 1} onClick={() => moveOption(i, 1)} ariaLabel="Descendre l'option" />
                    </Box>
                    <Input value={opt} onChange={({ detail }) => updateOption(i, detail.value)} placeholder={`Option ${i + 1}`} />
                    <Button variant="icon" iconName="close" onClick={() => removeOption(i)} ariaLabel="Retirer l'option" />
                  </SpaceBetween>
                ))}
                <Button
                  variant="normal"
                  iconName="add-plus"
                  onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
                >
                  Ajouter une option
                </Button>
                {needsOptions && cleanOptions.length === 0 && (
                  <Alert type="warning">Ajoutez au moins une option.</Alert>
                )}
              </SpaceBetween>
            </FormField>
          )}
        </SpaceBetween>
      </Modal>

      {/* ── Modal suppression ────────────────────────────────────────────── */}
      <Modal
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        header="Supprimer ce champ"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setDeleteTarget(null)}>Annuler</Button>
              <Button variant="primary" loading={deleting} onClick={handleDelete}>Supprimer définitivement</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning">
            <strong>{deleteTarget?.label}</strong> sera retiré du formulaire et de cette liste.
          </Alert>
          <Box>
            Les valeurs déjà soumises pour ce champ restent stockées dans les dossiers existants,
            mais son libellé ne pourra plus être résolu automatiquement dans les écrans d'approbation
            — la clé technique (<code>{deleteTarget?.field_key}</code>) sera affichée à la place.
            Pour garder les données lisibles sans perdre le champ, préférez le désactiver (statut
            « Inactif ») plutôt que de le supprimer.
          </Box>
        </SpaceBetween>
      </Modal>

      {/* ── Modal garde-fou champ système ────────────────────────────────── */}
      <Modal
        visible={!!systemGuardTarget}
        onDismiss={() => setSystemGuardTarget(null)}
        header={systemGuardTarget?.action === 'delete' ? 'Supprimer un champ système' : 'Désactiver un champ système'}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setSystemGuardTarget(null)}>Annuler</Button>
              <Button variant="primary" loading={systemGuardBusy} onClick={confirmSystemGuard}>
                {systemGuardTarget?.action === 'delete' ? 'Supprimer quand même' : 'Désactiver quand même'}
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="error">
            <strong>{systemGuardTarget?.def.label}</strong> est un champ système : il est lié au
            fonctionnement de la plateforme (validation admin, sécurité des données ou paiement).
          </Alert>
          <Box>
            {systemGuardTarget?.action === 'delete' ? (
              <>
                Le supprimer retire sa définition de cette liste — la colonne et les données déjà
                enregistrées restent intactes en base, mais son libellé ne sera plus résolu
                automatiquement (la clé technique <code>{systemGuardTarget?.def.field_key}</code> sera
                affichée à la place dans les écrans d'approbation).
              </>
            ) : (
              <>
                Le désactiver le retire du formulaire d'onboarding pour les nouvelles inscriptions.
                Les données déjà enregistrées restent inchangées.
              </>
            )}
            {' '}Cette donnée est potentiellement utilisée par d'autres pages de la plateforme —
            vérifiez son usage avant de continuer.
          </Box>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

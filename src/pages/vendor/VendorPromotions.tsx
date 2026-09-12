// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  Badge,
  TextFilter,
  Box,
  Modal,
  FormField,
  Input,
  Select,
  Toggle,
  Alert,
  StatusIndicator,
  Autosuggest,
  Multiselect,
  SegmentedControl,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Promotion } from '../../types';

// Noms de campagne suggérés — mélange calendrier commercial marocain et
// occasions génériques. Le vendeur peut aussi saisir son propre nom.
const PROMO_NAME_SUGGESTIONS = [
  'Promo Ramadan',
  'Promo Aïd Al-Fitr',
  'Promo Aïd Al-Adha',
  'Promo Achoura',
  'Promo Fête du Trône',
  'Promo Rentrée scolaire',
  "Soldes d'été",
  'Déstockage fin de série',
  'Vente flash 48h',
  'Offre nouveaux clients',
  "Promo fin d'année",
  'Promo volume gros clients',
];

interface VendorProductOption { id: string; name: string; ean: string | null }
interface CategoryOption { id: string; name: string; parent_id: string | null; display_order: number }

const EMPTY_FORM = {
  name: '',
  promo_type: 'percentage',
  discount_value: '',
  application: 'all_products',
  product_ids: [] as string[],
  category_id: '',
  min_qty: '1',
  starts_at: '',
  ends_at: '',
  stackable: false,
};

export default function VendorPromotions() {
  const { activeOrg } = useAuth();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [vendorProducts, setVendorProducts] = useState<VendorProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [campaignType, setCampaignType] = useState<'promotion' | 'destockage'>('promotion');

  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function fetchPromos() {
    if (!activeOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('seller_org_id', activeOrg.id)
      .order('created_at', { ascending: false });
    setPromos((data as Promotion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPromos(); }, [activeOrg]);

  // Produits et catégories du vendeur — chargés une fois pour peupler les
  // sélecteurs de portée (« Produits spécifiques » / « Catégorie »).
  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('products').select('id, name, ean')
      .eq('seller_org_id', activeOrg.id).eq('status', 'active').order('name')
      .then(({ data }) => setVendorProducts((data as VendorProductOption[]) ?? []));
    supabase.from('categories').select('id, name, parent_id, display_order')
      .eq('active', true).order('display_order')
      .then(({ data }) => setCategories((data as CategoryOption[]) ?? []));
  }, [activeOrg]);

  // Liste plate triée par groupe (racine puis ses sous-catégories), avec un
  // libellé "Parent — Enfant" pour lever l'ambiguïté entre sous-catégories homonymes.
  const categoryOptions = (() => {
    const roots = categories.filter((c) => !c.parent_id).sort((a, b) => a.display_order - b.display_order);
    const options: { value: string; label: string }[] = [];
    for (const root of roots) {
      options.push({ value: root.id, label: root.name });
      categories
        .filter((c) => c.parent_id === root.id)
        .sort((a, b) => a.display_order - b.display_order)
        .forEach((child) => options.push({ value: child.id, label: `${root.name} — ${child.name}` }));
    }
    return options;
  })();

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setCampaignType('promotion');
    setError('');
    setShowNew(true);
  }

  function selectCampaignType(type: 'promotion' | 'destockage') {
    setCampaignType(type);
    // Un déstockage cible toujours des produits précis — pas de sens sur tout le catalogue.
    if (type === 'destockage') {
      setForm((f) => ({ ...f, application: 'specific_products' }));
    }
  }

  const scopeMissing =
    (form.application === 'specific_products' && form.product_ids.length === 0) ||
    (form.application === 'category' && !form.category_id);

  async function handleCreate() {
    if (!activeOrg || !form.name || !form.discount_value || scopeMissing) return;
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.from('promotions').insert({
        seller_org_id: activeOrg.id,
        name: form.name,
        promo_type: form.promo_type,
        discount_value: parseFloat(form.discount_value),
        application: form.application,
        product_ids: form.application === 'specific_products' ? form.product_ids : [],
        category_id: form.application === 'category' ? form.category_id : null,
        min_qty: parseInt(form.min_qty) || 1,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        stackable: form.stackable,
        active: true,
      });
      if (err) throw err;
      setShowNew(false);
      setForm({ ...EMPTY_FORM });
      fetchPromos();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: Promotion) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id);
    fetchPromos();
  }

  const now = new Date();
  const filtered = promos.filter((p) =>
    !filterText || p.name.toLowerCase().includes(filterText.toLowerCase())
  );

  function promoStatus(promo: Promotion): 'success' | 'warning' | 'stopped' {
    if (!promo.active) return 'stopped';
    if (promo.ends_at && new Date(promo.ends_at) < now) return 'stopped';
    if (promo.starts_at && new Date(promo.starts_at) > now) return 'warning';
    return 'success';
  }

  // Une promotion apparaît dans l'onglet « Déstockage » de la vitrine acheteur si elle
  // cible des produits précis et se termine sous 48h (cf. storefront/BestDealsPage) —
  // sinon elle s'affiche comme une promotion standard.
  function isDestockage(promo: Promotion): boolean {
    if (!promo.ends_at || (promo.product_ids ?? []).length === 0) return false;
    const hoursLeft = (new Date(promo.ends_at).getTime() - now.getTime()) / 3_600_000;
    return hoursLeft > 0 && hoursLeft <= 48;
  }

  return (
    <SpaceBetween size="l">
      <Table
        header={
          <Header
            variant="h1"
            counter={`(${filtered.length})`}
            description="Créez des promotions classiques ou des campagnes de déstockage pour écouler du stock rapidement."
            actions={
              <Button variant="primary" onClick={openNew}>+ Nouvelle promotion</Button>
            }
          >
            Promotions
          </Header>
        }
        filter={
          <TextFilter
            filteringText={filterText}
            filteringPlaceholder="Nom de la promotion..."
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
        }
        loading={loading}
        loadingText="Chargement..."
        trackBy="id"
        items={filtered}
        columnDefinitions={[
          {
            id: 'name',
            header: 'Nom',
            cell: (p: Promotion) => p.name,
            sortingField: 'name',
          },
          {
            id: 'campaign',
            header: 'Campagne',
            cell: (p: Promotion) => (
              isDestockage(p)
                ? <Badge color="severity-high">🔥 Déstockage</Badge>
                : <Badge color="grey">Promotion</Badge>
            ),
          },
          {
            id: 'type',
            header: 'Remise',
            cell: (p: Promotion) => (
              <Badge color={p.promo_type === 'percentage' ? 'blue' : 'green'}>
                {p.promo_type === 'percentage' ? `${p.discount_value}%` : `${p.discount_value} MAD`}
              </Badge>
            ),
          },
          {
            id: 'application',
            header: 'Portée',
            cell: (p: Promotion) => {
              if (p.application === 'specific_products') {
                const n = (p.product_ids ?? []).length;
                return `${n} produit${n > 1 ? 's' : ''}`;
              }
              if (p.application === 'category') {
                return categoryOptions.find((c) => c.value === p.category_id)?.label ?? 'Catégorie';
              }
              return 'Tous produits';
            },
          },
          {
            id: 'validity',
            header: 'Validité',
            cell: (p: Promotion) => {
              const start = p.starts_at ? new Date(p.starts_at).toLocaleDateString('fr-FR') : '—';
              const end = p.ends_at ? new Date(p.ends_at).toLocaleDateString('fr-FR') : '—';
              return `${start} → ${end}`;
            },
          },
          {
            id: 'status',
            header: 'Statut',
            cell: (p: Promotion) => (
              <StatusIndicator type={promoStatus(p)}>
                {promoStatus(p) === 'success' ? 'Active' : promoStatus(p) === 'warning' ? 'À venir' : 'Inactive'}
              </StatusIndicator>
            ),
          },
          {
            id: 'active',
            header: 'Activer',
            cell: (p: Promotion) => (
              <Toggle checked={p.active} onChange={() => toggleActive(p)} />
            ),
          },
        ]}
        empty={
          <Box textAlign="center" color="inherit">
            <b>Aucune promotion</b>
            <Box variant="p" color="inherit">Créez votre première promotion.</Box>
            <Button variant="primary" onClick={openNew}>+ Créer</Button>
          </Box>
        }
      />

      <Modal
        visible={showNew}
        onDismiss={() => setShowNew(false)}
        header="Nouvelle promotion"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowNew(false)}>Annuler</Button>
              <Button variant="primary" loading={saving} disabled={scopeMissing} onClick={handleCreate}>Créer</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {error && <Alert type="error">{error}</Alert>}

          <FormField label="Type de campagne">
            <SegmentedControl
              selectedId={campaignType}
              onChange={({ detail }) => selectCampaignType(detail.selectedId as 'promotion' | 'destockage')}
              options={[
                { id: 'promotion', text: 'Promotion' },
                { id: 'destockage', text: '🔥 Déstockage' },
              ]}
            />
          </FormField>

          {campaignType === 'destockage' && (
            <Alert type="info">
              Un déstockage cible des produits précis et doit se terminer sous 48h pour
              apparaître dans l'onglet « Déstockage » de la vitrine acheteur.
            </Alert>
          )}

          <FormField label="Nom de la promotion *" description="Choisissez un nom suggéré ou saisissez le vôtre">
            <Autosuggest
              value={form.name}
              onChange={({ detail }) => setForm({ ...form, name: detail.value })}
              options={PROMO_NAME_SUGGESTIONS.map((n) => ({ value: n }))}
              enteredTextLabel={(v) => `Utiliser "${v}"`}
              placeholder="Ex: Promo Ramadan"
              filteringType="auto"
            />
          </FormField>

          <FormField label="Type de remise">
            <Select
              selectedOption={{
                value: form.promo_type,
                label: form.promo_type === 'percentage' ? 'Pourcentage (%)'
                     : form.promo_type === 'fixed' ? 'Montant fixe (MAD)' : 'Remise volume',
              }}
              onChange={({ detail }) => setForm({ ...form, promo_type: detail.selectedOption.value ?? 'percentage' })}
              options={[
                { value: 'percentage', label: 'Pourcentage (%)' },
                { value: 'fixed', label: 'Montant fixe (MAD)' },
                { value: 'volume', label: 'Remise volume' },
              ]}
            />
          </FormField>

          <FormField label={form.promo_type === 'percentage' ? 'Valeur de la remise (%)' : 'Montant de la remise (MAD)'}>
            <Input
              type="number"
              value={form.discount_value}
              onChange={({ detail }) => setForm({ ...form, discount_value: detail.value })}
              placeholder={form.promo_type === 'percentage' ? 'Ex: 10' : 'Ex: 50.00'}
            />
          </FormField>

          <FormField label="Application">
            <Select
              selectedOption={{
                value: form.application,
                label: form.application === 'all_products' ? 'Tous les produits'
                     : form.application === 'category' ? 'Catégorie' : 'Produits spécifiques',
              }}
              disabled={campaignType === 'destockage'}
              onChange={({ detail }) => setForm({
                ...form,
                application: detail.selectedOption.value ?? 'all_products',
                product_ids: [], category_id: '',
              })}
              options={[
                { value: 'all_products', label: 'Tous les produits' },
                { value: 'specific_products', label: 'Produits spécifiques' },
                { value: 'category', label: 'Catégorie' },
              ]}
            />
          </FormField>

          {form.application === 'specific_products' && (
            <FormField
              label="Produits ciblés *"
              description={vendorProducts.length === 0 ? 'Aucun produit actif dans votre catalogue.' : undefined}
              errorText={scopeMissing ? 'Sélectionnez au moins un produit.' : undefined}
            >
              <Multiselect
                selectedOptions={form.product_ids.map((id) => {
                  const p = vendorProducts.find((vp) => vp.id === id);
                  return { value: id, label: p?.name ?? id };
                })}
                options={vendorProducts.map((p) => ({ value: p.id, label: p.name, description: p.ean ?? undefined }))}
                onChange={({ detail }) => setForm({ ...form, product_ids: detail.selectedOptions.map((o) => o.value ?? '') })}
                placeholder="Choisir des produits..."
                filteringType="auto"
                empty="Aucun produit actif"
              />
            </FormField>
          )}

          {form.application === 'category' && (
            <FormField label="Catégorie ciblée *" errorText={scopeMissing ? 'Sélectionnez une catégorie.' : undefined}>
              <Select
                selectedOption={categoryOptions.find((c) => c.value === form.category_id) ?? null}
                options={categoryOptions}
                onChange={({ detail }) => setForm({ ...form, category_id: detail.selectedOption.value ?? '' })}
                placeholder="Choisir une catégorie..."
                filteringType="auto"
                empty="Aucune catégorie configurée"
              />
            </FormField>
          )}

          <FormField label="Quantité minimale">
            <Input type="number" value={form.min_qty} onChange={({ detail }) => setForm({ ...form, min_qty: detail.value })} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Date de début">
              <Input type="datetime-local" value={form.starts_at} onChange={({ detail }) => setForm({ ...form, starts_at: detail.value })} />
            </FormField>
            <FormField label="Date de fin">
              <Input type="datetime-local" value={form.ends_at} onChange={({ detail }) => setForm({ ...form, ends_at: detail.value })} />
            </FormField>
          </div>
          <FormField label="Cumulable avec d'autres promotions">
            <Toggle checked={form.stackable} onChange={({ detail }) => setForm({ ...form, stackable: detail.checked })}>
              {form.stackable ? 'Oui' : 'Non'}
            </Toggle>
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}

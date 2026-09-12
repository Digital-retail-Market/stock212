// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  Table, Header, Button, SpaceBetween, Badge, Box,
  ColumnLayout, Modal, TextFilter, Pagination,
  StatusIndicator, Container,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
type BuyerStatus = 'active' | 'inactive';
interface Buyer {
  id: string; company: string; ice: string | null;
  city: string | null; country: string;
  orders: number; ca_total: number; last_order: string | null;
  payment_pref: string | null;
  status: BuyerStatus;
}

function fmt(n: number) { return `${n.toLocaleString('fr-MA')} MAD`; }

// Un acheteur est considéré actif s'il a commandé dans les 60 derniers jours
const ACTIVE_THRESHOLD_DAYS = 60;

export default function VendorBuyers() {
  const { activeOrg } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);
  const pageSize = 8;

  useEffect(() => {
    if (!activeOrg) return;
    async function load() {
      setLoading(true);
      setError('');

      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          buyer_org_id, total_ttc, payment_terms, created_at,
          organisations!buyer_org_id(id, name, ice, city, country)
        `)
        .eq('seller_org_id', activeOrg!.id);

      if (err) { setError(err.message); setLoading(false); return; }

      // Regroupement par acheteur, calculé côté client à partir des vraies commandes
      const grouped = new Map<string, Buyer & { _lastOrderTs: number }>();
      const now = Date.now();

      for (const row of (data ?? []) as Array<{
        buyer_org_id: string;
        total_ttc: number;
        payment_terms: string | null;
        created_at: string;
        organisations: { id: string; name: string; ice: string | null; city: string | null; country: string } | null;
      }>) {
        const org = row.organisations;
        if (!org) continue;
        const existing = grouped.get(row.buyer_org_id);
        const orderTs = new Date(row.created_at).getTime();

        if (existing) {
          existing.orders += 1;
          existing.ca_total += row.total_ttc ?? 0;
          if (orderTs > existing._lastOrderTs) {
            existing._lastOrderTs = orderTs;
            existing.last_order = row.created_at;
            existing.payment_pref = row.payment_terms ?? existing.payment_pref;
          }
        } else {
          grouped.set(row.buyer_org_id, {
            id: row.buyer_org_id,
            company: org.name,
            ice: org.ice,
            city: org.city,
            country: org.country,
            orders: 1,
            ca_total: row.total_ttc ?? 0,
            last_order: row.created_at,
            payment_pref: row.payment_terms,
            status: 'active',
            _lastOrderTs: orderTs,
          });
        }
      }

      const buyersList: Buyer[] = Array.from(grouped.values()).map((b) => {
        const daysSinceLastOrder = (now - b._lastOrderTs) / 86400000;
        return {
          ...b,
          status: daysSinceLastOrder <= ACTIVE_THRESHOLD_DAYS ? 'active' : 'inactive',
        };
      });

      buyersList.sort((a, b) => b.ca_total - a.ca_total);
      setBuyers(buyersList);
      setLoading(false);
    }
    load();
  }, [activeOrg]);

  const filtered = buyers.filter((b) =>
    filter === '' ||
    b.company.toLowerCase().includes(filter.toLowerCase()) ||
    (b.ice ?? '').includes(filter) ||
    (b.city ?? '').toLowerCase().includes(filter.toLowerCase())
  );
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalCA = buyers.reduce((s, b) => s + b.ca_total, 0);
  const activeCount = buyers.filter((b) => b.status === 'active').length;

  return (
    <SpaceBetween size="l">

      {error && (
        <Box padding="s" color="text-status-error">
          Erreur de chargement : {error}
        </Box>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────── */}
      <ColumnLayout columns={3} variant="text-grid">
        <Box>
          <Box variant="awsui-key-label">Acheteurs totaux</Box>
          <Box variant="h1">{buyers.length}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">CA total portefeuille</Box>
          <Box variant="h1">{fmt(totalCA)}</Box>
        </Box>
        <Box>
          <Box variant="awsui-key-label">Acheteurs actifs (60j)</Box>
          <Box variant="h1" color="text-status-info">{activeCount}</Box>
        </Box>
      </ColumnLayout>

      {/* ── TABLE ACHETEURS ───────────────────────────────────────── */}
      <Table
        loading={loading}
        loadingText="Chargement des acheteurs…"
        header={
          <Header variant="h2" counter={`(${filtered.length})`}>
            Liste acheteurs
          </Header>
        }
        filter={
          <TextFilter
            filteringText={filter}
            filteringPlaceholder="Entreprise, ICE, ville…"
            onChange={({ detail }) => { setFilter(detail.filteringText); setCurrentPage(1); }}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.max(1, Math.ceil(filtered.length / pageSize))}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
          />
        }
        columnDefinitions={[
          { id: 'company', header: 'Entreprise', cell: (b) => (
            <Button variant="link" onClick={() => setSelectedBuyer(b)}>{b.company}</Button>
          ), width: 220 },
          { id: 'ice', header: 'ICE', cell: (b) => <Box variant="small">{b.ice ?? '—'}</Box> },
          { id: 'city', header: 'Ville', cell: (b) => b.city ?? '—' },
          { id: 'orders', header: 'Commandes', cell: (b) => b.orders },
          { id: 'ca', header: 'CA total', cell: (b) => <Box fontWeight="bold">{fmt(b.ca_total)}</Box> },
          { id: 'last', header: 'Dernière commande', cell: (b) => b.last_order ? new Date(b.last_order).toLocaleDateString('fr-MA') : '—' },
          { id: 'payment', header: 'Condition de paiement', cell: (b) => b.payment_pref ?? '—' },
          { id: 'status', header: 'Statut', cell: (b) => (
            <StatusIndicator type={b.status === 'active' ? 'success' : 'stopped'}>
              {b.status === 'active' ? 'Actif' : 'Inactif'}
            </StatusIndicator>
          )},
        ]}
        items={paginated}
        empty={
          <Box textAlign="center" color="inherit">
            <b>Aucun acheteur</b>
            <Box variant="p" color="inherit">Les acheteurs ayant commandé chez vous apparaîtront ici.</Box>
          </Box>
        }
      />

      {/* ── MODAL DETAIL ACHETEUR ─────────────────────────────────── */}
      {selectedBuyer && (
        <Modal
          visible
          size="medium"
          header={selectedBuyer.company}
          footer={
            <Box float="right">
              <Button variant="link" onClick={() => setSelectedBuyer(null)}>Fermer</Button>
            </Box>
          }
          onDismiss={() => setSelectedBuyer(null)}
        >
          <SpaceBetween size="m">
            <ColumnLayout columns={2}>
              <Box><Box variant="awsui-key-label">ICE</Box><Box>{selectedBuyer.ice ?? '—'}</Box></Box>
              <Box><Box variant="awsui-key-label">Ville</Box><Box>{selectedBuyer.city ?? '—'}</Box></Box>
              <Box><Box variant="awsui-key-label">Pays</Box><Box>{selectedBuyer.country}</Box></Box>
              <Box><Box variant="awsui-key-label">Condition de paiement</Box><Box>{selectedBuyer.payment_pref ?? '—'}</Box></Box>
            </ColumnLayout>
            <ColumnLayout columns={2} variant="text-grid">
              <Box>
                <Box variant="awsui-key-label">Commandes</Box>
                <Box variant="h2">{selectedBuyer.orders}</Box>
              </Box>
              <Box>
                <Box variant="awsui-key-label">CA total</Box>
                <Box variant="h2" color="text-status-success">{fmt(selectedBuyer.ca_total)}</Box>
              </Box>
            </ColumnLayout>
          </SpaceBetween>
        </Modal>
      )}
    </SpaceBetween>
  );
}

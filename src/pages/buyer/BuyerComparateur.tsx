import { useEffect, useState, useRef, useCallback, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SpaceBetween, Header, Button, Box, Input,
  FormField, Container, Spinner, Alert, Autosuggest, Flashbar,
} from '@cloudscape-design/components';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchOfferRankingDataset,
  rankOfferDataset,
  type OfferRankingDataset,
  type RankOffersResult,
  type RankedOffer,
} from '../../lib/recommendation';

interface EanRef {
  id: string; ean: string; name: string; images: string[];
  manufacturer_name: string | null; temperature: string;
}

// Libellés des critères pour l'affichage du détail de calcul (transparence §13).
const CRITERION_LABELS: { key: keyof RankedOffer['breakdown']['scores']; label: string }[] = [
  { key: 'price', label: 'Prix' },
  { key: 'delivery', label: 'Livraison' },
  { key: 'supplierQuality', label: 'Qualité fournisseur' },
  { key: 'freshness', label: 'Fraîcheur' },
  { key: 'proximity', label: 'Proximité' },
];

const PROXIMITY_LABELS: Record<number, string> = {
  0: 'Même ville', 1: 'Même région', 2: 'Même pays', 3: 'Pays différent',
};

function starRating(v: number) {
  if (!v) return '—';
  return '★'.repeat(Math.round(v)) + '☆'.repeat(5 - Math.round(v));
}

function fmtMad(n: number) {
  return `${n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}

export default function BuyerComparateur() {
  const { activeOrg } = useAuth();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery]   = useState(searchParams.get('ean') ?? searchParams.get('q') ?? '');
  const [suggestions, setSuggestions]   = useState<EanRef[]>([]);
  const [searching,   setSearching]     = useState(false);
  const [selectedRef, setSelectedRef]   = useState<EanRef | null>(null);
  const [dataset,     setDataset]       = useState<OfferRankingDataset | null>(null);
  const [result,      setResult]        = useState<RankOffersResult | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [qty,         setQty]           = useState(1);
  const [expandedId,  setExpandedId]    = useState<string | null>(null);
  const [cartMsg,     setCartMsg]       = useState('');
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Localisation de l'acheteur (pour le critère de proximité géographique).
  const buyerLocation = activeOrg
    ? { city: activeOrg.city, region: activeOrg.region, country: activeOrg.country }
    : null;

  const runSearchByEan = useCallback(async (ean: string) => {
    setLoadingOffers(true);
    setResult(null);
    setDataset(null);
    setExpandedId(null);

    // Référence produit (affichage de l'en-tête)
    const { data: ref } = await supabase
      .from('ean_references')
      .select('id, ean, name, images, manufacturer_name, temperature')
      .eq('ean', ean).eq('status', 'active').maybeSingle();
    if (ref) setSelectedRef(ref as EanRef);

    // Toutes les offres + données annexes, chargées en une passe.
    const ds = await fetchOfferRankingDataset(ean);
    setDataset(ds);
    setLoadingOffers(false);
  }, []);

  // Auto-run if ?ean= param provided
  useEffect(() => {
    const ean = searchParams.get('ean');
    if (ean) {
      setSearchQuery(ean);
      runSearchByEan(ean);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-classement LOCAL (sans requête) à chaque changement de quantité, de
  // dataset ou de localisation acheteur — cf. §16 (perf).
  useEffect(() => {
    if (!dataset) { setResult(null); return; }
    setResult(
      rankOfferDataset(dataset, { quantity: qty, buyerLocation }),
    );
  // buyerLocation est recréé à chaque rendu : on dépend de ses champs primitifs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, qty, activeOrg?.city, activeOrg?.region, activeOrg?.country]);

  // Autosuggest from ean_references
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    if (sugTimer.current) clearTimeout(sugTimer.current);
    setSearching(true);
    sugTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ean_references')
        .select('id, ean, name, images, manufacturer_name, temperature')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,ean.ilike.%${q}%`)
        .limit(10);
      setSuggestions((data ?? []) as EanRef[]);
      setSearching(false);
    }, 350);
    return () => { if (sugTimer.current) clearTimeout(sugTimer.current); };
  }, [searchQuery]);

  function selectRef(ref: EanRef) {
    setSelectedRef(ref);
    setSearchQuery(ref.name);
    setSuggestions([]);
    runSearchByEan(ref.ean);
  }

  async function addToCart(productId: string, moq: number, unitPrice: number) {
    if (!activeOrg) return;
    const { data: ex } = await supabase.from('cart_items').select('id, quantity')
      .eq('buyer_org_id', activeOrg.id).eq('product_id', productId).is('cart_id', null).maybeSingle();
    if (ex) {
      await supabase.from('cart_items').update({ quantity: ex.quantity + Math.max(moq, qty) }).eq('id', ex.id);
    } else {
      await supabase.from('cart_items').insert({
        buyer_org_id: activeOrg.id, product_id: productId,
        quantity: Math.max(moq, qty), unit_price: unitPrice, cart_id: null,
      });
    }
    setCartMsg('Ajouté au panier');
    setTimeout(() => setCartMsg(''), 3000);
  }

  const ranked = result?.ranked ?? [];
  const weights = result?.weights ?? dataset?.weights ?? null;
  const cheapestUnit = ranked.length
    ? Math.min(...ranked.map(r => r.offer.unitPrice))
    : null;

  return (
    <SpaceBetween size="m">
      {cartMsg && (
        <Flashbar items={[{ type: 'success', content: cartMsg, dismissible: true, onDismiss: () => setCartMsg('') }]} />
      )}

      <Header
        variant="h1"
        description="Classement des vendeurs par meilleur choix global : prix, livraison, qualité fournisseur, fraîcheur et proximité combinés — pas seulement le prix le plus bas."
      >
        Comparateur d'offres
      </Header>

      {/* Search bar */}
      <Container>
        <SpaceBetween size="m">
          <FormField
            label="Rechercher un produit"
            description="Saisissez le nom ou l'EAN pour voir tous les vendeurs proposant ce produit"
          >
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Autosuggest
                  value={searchQuery}
                  onChange={({ detail }) => { setSearchQuery(detail.value); setSelectedRef(null); setDataset(null); setResult(null); }}
                  onSelect={({ detail }) => {
                    const ref = suggestions.find(s => s.name === detail.value || s.ean === detail.value);
                    if (ref) selectRef(ref);
                  }}
                  options={suggestions.map(s => ({
                    value: s.name,
                    label: s.name,
                    description: [s.ean, s.manufacturer_name, s.temperature].filter(Boolean).join(' · '),
                  }))}
                  filteringType="manual"
                  statusType={searching ? 'loading' : 'finished'}
                  loadingText="Recherche…"
                  empty={searchQuery.length >= 2 ? 'Aucun produit trouvé dans le catalogue de référence' : ''}
                  placeholder="Ex: Coca-Cola 1,5L, 6111073111091…"
                  enteredTextLabel={v => `Rechercher "${v}"`}
                />
              </div>
              <Button
                variant="primary"
                onClick={() => { if (searchQuery.trim()) runSearchByEan(searchQuery.trim()); }}
                loading={loadingOffers}
              >
                Comparer
              </Button>
            </div>
          </FormField>

          {/* Quantity selector */}
          {ranked.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Box fontWeight="bold">Simuler pour une quantité :</Box>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 10, 50, 100, 200, 500].map(q => (
                  <button
                    key={q}
                    onClick={() => setQty(q)}
                    style={{
                      padding: '5px 14px', border: '1px solid',
                      borderColor: qty === q ? '#0972d3' : '#d1d5db',
                      background: qty === q ? '#eff6ff' : '#fff',
                      color: qty === q ? '#0972d3' : '#374151',
                      borderRadius: 6, fontWeight: qty === q ? 700 : 500,
                      fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {q}
                  </button>
                ))}
                <div style={{ width: 90 }}>
                  <Input
                    type="number"
                    value={String(qty)}
                    onChange={({ detail }) => setQty(Math.max(1, parseInt(detail.value) || 1))}
                    placeholder="Autre"
                  />
                </div>
              </div>
            </div>
          )}
        </SpaceBetween>
      </Container>

      {/* Selected product header */}
      {selectedRef && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f0f9ff',
            border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px' }}>
          {selectedRef.images?.[0] && (
            <img src={selectedRef.images[0]} alt={selectedRef.name}
              style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 6, background: '#fff' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f1b2d' }}>{selectedRef.name}</div>
            <div style={{ fontSize: 13, color: '#5f6b7a' }}>
              EAN : {selectedRef.ean}
              {selectedRef.manufacturer_name && ` · ${selectedRef.manufacturer_name}`}
              {` · ${selectedRef.temperature}`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#5f6b7a' }}>{ranked.length} vendeur{ranked.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingOffers && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="large" /></div>
      )}

      {/* No results */}
      {!loadingOffers && selectedRef && ranked.length === 0 && (
        <Alert type="warning" header="Aucun vendeur actif pour ce produit">
          Ce produit est dans le catalogue de référence mais aucun vendeur ne le propose actuellement
          (ou aucune offre n'a de tarif exploitable pour cette quantité).
        </Alert>
      )}

      {/* Poids appliqués (transparence) */}
      {ranked.length > 0 && weights && (
        <Box color="text-body-secondary" fontSize="body-s">
          Poids du classement (configurables par l'administrateur) :{' '}
          Prix {weights.price}% · Livraison {weights.delivery}% ·
          Qualité fournisseur {weights.supplierQuality}% · Fraîcheur {weights.freshness}% ·
          Proximité {weights.proximity}%
        </Box>
      )}

      {/* Comparison table */}
      {ranked.length > 0 && (
        <Container header={<Header variant="h2">Offres classées par score global</Header>}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f8f9fa' }}>
                  {['#', 'Score', 'Vendeur', `Prix × ${qty}`, 'Livraison', 'Fraîcheur', 'Proximité', 'Total estimé', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700,
                        color: '#374151', fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const o = r.offer;
                  const isBest = r.rank === 1;
                  const isCheapest = cheapestUnit != null && o.unitPrice === cheapestUnit;
                  const expanded = expandedId === o.productId;
                  return (
                    <Fragment key={o.productId}>
                      <tr
                        style={{ borderBottom: expanded ? 'none' : '1px solid #f3f4f6',
                          background: isBest ? '#f0fff4' : 'transparent' }}>
                        <td style={{ padding: '12px 12px', fontWeight: 800, color: '#0f1b2d' }}>{r.rank}</td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 800, fontSize: 16, color: isBest ? '#16a34a' : '#0f1b2d' }}>
                            {r.breakdown.finalScore.toFixed(1)}
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}> /100</span>
                          </div>
                          <button
                            onClick={() => setExpandedId(expanded ? null : o.productId)}
                            style={{ background: 'none', border: 'none', color: '#0972d3', fontSize: 11,
                              cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                          >
                            {expanded ? 'Masquer le détail' : 'Voir le détail'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 700, color: '#0f1b2d' }}>
                              {isBest && <span style={{ background: '#16a34a', color: '#fff', fontSize: 10,
                                  fontWeight: 800, padding: '1px 6px', borderRadius: 3, marginRight: 6 }}>MEILLEUR CHOIX</span>}
                              {isCheapest && !isBest && <span style={{ background: '#0972d3', color: '#fff', fontSize: 10,
                                  fontWeight: 800, padding: '1px 6px', borderRadius: 3, marginRight: 6 }}>PRIX LE PLUS BAS</span>}
                              {o.sellerName}
                            </div>
                            <div style={{ color: '#d97706', fontSize: 11 }}>
                              {starRating(o.sellerRating)}
                              {o.sellerReviewCount > 0 && <span style={{ color: '#6b7280' }}> ({o.sellerReviewCount})</span>}
                              {o.certificationCount > 0 && (
                                <span style={{ color: '#16a34a' }}> · {o.certificationCount} cert.</span>
                              )}
                            </div>
                            {qty < o.moq && <div style={{ fontSize: 10, color: '#dc2626' }}>MOQ {o.moq} non atteint</div>}
                          </div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: isCheapest ? '#16a34a' : '#0f1b2d' }}>
                            {fmtMad(o.unitPrice)}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>/ unité</div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          {o.isFreeDelivery
                            ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Gratuite</span>
                            : fmtMad(o.deliveryCost)}
                        </td>
                        <td style={{ padding: '12px 12px', color: '#374151' }}>
                          {o.freshnessDays == null
                            ? <span style={{ color: '#9ca3af' }}>n.c.</span>
                            : (
                              <span style={{ color: o.freshnessDays < 30 ? '#d97706' : '#374151', fontWeight: 600 }}>
                                {o.freshnessDays} j
                              </span>
                            )}
                        </td>
                        <td style={{ padding: '12px 12px', color: '#374151' }}>
                          {o.proximityRank == null
                            ? <span style={{ color: '#9ca3af' }}>n.c.</span>
                            : PROXIMITY_LABELS[o.proximityRank] ?? '—'}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f1b2d' }}>
                            {fmtMad(o.landedTotal)}
                            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>
                              {fmtMad(o.lineSubtotal)} + {o.isFreeDelivery ? '0' : fmtMad(o.deliveryCost)} livr.
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <Button
                            variant={isBest ? 'primary' : 'normal'}
                            onClick={() => addToCart(o.productId, o.moq, o.unitPrice)}
                          >
                            Ajouter
                          </Button>
                        </td>
                      </tr>

                      {expanded && (
                        <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                          <td colSpan={9} style={{ padding: '4px 12px 14px 12px' }}>
                            <div style={{ fontSize: 12, color: '#374151' }}>
                              <strong>Détail du score</strong> — score critère (0–1) × poids (%) :
                              <table style={{ marginTop: 6, borderCollapse: 'collapse' }}>
                                <tbody>
                                  {CRITERION_LABELS.map(({ key, label }) => {
                                    const s = r.breakdown.scores[key];
                                    const w = r.breakdown.weights[key];
                                    return (
                                      <tr key={key}>
                                        <td style={{ padding: '2px 12px 2px 0', color: '#6b7280' }}>{label}</td>
                                        <td style={{ padding: '2px 12px', fontFamily: 'monospace' }}>{s.toFixed(3)}</td>
                                        <td style={{ padding: '2px 12px', color: '#6b7280' }}>× {w}%</td>
                                        <td style={{ padding: '2px 12px', fontFamily: 'monospace', fontWeight: 700 }}>
                                          = {(s * w).toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '4px 12px 2px 0', fontWeight: 700 }}>Score global</td>
                                    <td colSpan={2} />
                                    <td style={{ padding: '4px 12px 2px 12px', fontFamily: 'monospace', fontWeight: 800 }}>
                                      {r.breakdown.finalScore.toFixed(2)} / 100
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              <div style={{ marginTop: 6, color: '#9ca3af', fontSize: 11 }}>
                                « n.c. » = donnée non disponible pour ce vendeur → score neutre (0,5) sur ce critère,
                                sans pénaliser ni avantager l'offre.
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recommendation note */}
          {ranked.length > 1 && (() => {
            const best = ranked[0].offer;
            const cheapest = [...ranked].sort((a, b) => a.offer.unitPrice - b.offer.unitPrice)[0].offer;
            if (best.productId === cheapest.productId) {
              return (
                <Box color="text-body-secondary" fontSize="body-s" padding={{ top: 'm' }}>
                  💡 <strong>{best.sellerName}</strong> offre à la fois le meilleur score global et le
                  prix le plus bas pour cette quantité.
                </Box>
              );
            }
            return (
              <Box color="text-body-secondary" fontSize="body-s" padding={{ top: 'm' }}>
                💡 <strong>{best.sellerName}</strong> arrive en tête malgré un prix supérieur à{' '}
                <strong>{cheapest.sellerName}</strong> ({fmtMad(best.unitPrice)} vs {fmtMad(cheapest.unitPrice)}) :
                ses avantages sur la livraison, la qualité, la fraîcheur et/ou la proximité compensent
                l'écart de prix selon les poids configurés.
              </Box>
            );
          })()}
        </Container>
      )}
    </SpaceBetween>
  );
}

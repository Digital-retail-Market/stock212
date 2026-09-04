import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  SpaceBetween, Header, Button, Box, Input, Select,
  Container, Spinner, Pagination, Checkbox,
  ExpandableSection, Alert, Flashbar,
} from '@cloudscape-design/components';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { addToCart as addToCartShared } from '../../lib/cart';
import { lowestTierPrice } from '../../lib/pricing';
import { useWishlist } from '../../hooks/useWishlist';
import { rankCatalogGroups, type CatalogGroupInput } from '../../lib/recommendation';

interface CatalogProduct {
  id: string; name: string; ean: string | null;
  images: string[]; temperature: string; moq: number;
  is_new: boolean; is_on_promotion: boolean; is_sponsored: boolean;
  certifications: string[]; short_description: string | null;
  avg_rating: number; review_count: number; seller_org_id: string;
  created_at: string;
  organisations: { id: string; name: string } | null;
  categories: { id: string; name: string } | null;
  brands: { id: string; name: string } | null;
  price_tiers: { qty_min: number; unit_price: number }[];
}

/**
 * Un « produit » du point de vue acheteur = un article (EAN) proposé par
 * potentiellement plusieurs fournisseurs. On regroupe les lignes `products`
 * par EAN : une carte = un produit, dont le fournisseur affiché (`representative`)
 * est celui recommandé par l'algorithme (prix, livraison, qualité fournisseur,
 * fraîcheur, proximité — cf. src/lib/recommendation) et non systématiquement
 * le moins cher. « Voir l'offre » mène directement à cette offre recommandée.
 */
interface GroupedProduct {
  key: string;            // ean ou, à défaut, id
  ean: string | null;
  representative: CatalogProduct; // offre recommandée du groupe (repli : la moins chère)
  offerCount: number;     // nombre de fournisseurs
  vendorNames: string[];
  minPrice: number | null;
  maxRating: number;
  totalReviews: number;
  newestAt: string;
  isNew: boolean;
  isPromo: boolean;
  isSponsored: boolean;
}
interface Category { id: string; name: string; parent_id: string | null }

const FETCH_WINDOW = 600; // lignes fournisseurs max récupérées avant regroupement

const TEMP_OPTIONS = [
  { label: 'Ambiant',    value: 'ambient'      },
  { label: 'Réfrigéré', value: 'refrigerated'  },
  { label: 'Frais',     value: 'fresh'         },
  { label: 'Congelé',   value: 'frozen'        },
];
const CERTIF_OPTIONS = ['Halal', 'Bio', 'ISO 22000', 'ONSSA', 'HACCP', 'Vegan', 'Sans gluten'];
const SORT_OPTIONS = [
  { label: 'Pertinence',      value: 'relevance' },
  { label: 'Prix croissant',  value: 'price_asc' },
  { label: 'Prix décroissant',value: 'price_desc'},
  { label: 'Mieux notés',     value: 'rating'    },
  { label: 'Nouveautés',      value: 'newest'    },
];
const PAGE_SIZE = 24;

function tempLabel(t: string) {
  return t === 'ambient' ? '🌡 Ambiant' : t === 'refrigerated' ? '❄ Réfrigéré'
       : t === 'frozen'  ? '🧊 Congelé' : '🌿 Frais';
}
function tempColor(t: string): React.CSSProperties['color'] {
  return t === 'ambient' ? '#854d0e' : t === 'refrigerated' ? '#075985'
       : t === 'frozen'  ? '#1e3a5f' : '#166534';
}
const basePrice = lowestTierPrice;
function starRating(avg: number) {
  return '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
}

export default function BuyerCatalog() {
  const navigate = useNavigate();
  const { activeOrg } = useAuth();
  const [searchParams] = useSearchParams();

  const [loading,    setLoading]    = useState(true);
  const [groups,     setGroups]     = useState<GroupedProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [windowFull, setWindowFull] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartMsg,    setCartMsg]    = useState('');

  // Filters
  const [search,        setSearch]        = useState(searchParams.get('q') ?? '');
  const [categoryId,    setCategoryId]    = useState(searchParams.get('cat') ?? '');
  const [temperatures,  setTemperatures]  = useState<string[]>([]);
  const [certifications,setCertifications]= useState<string[]>([]);
  const [onlyPromo,     setOnlyPromo]     = useState(false);
  const [onlyNew,       setOnlyNew]       = useState(false);
  const [sort,          setSort]          = useState('relevance');
  const [page,          setPage]          = useState(1);

  // Compare
  const [compareList, setCompareList] = useState<CatalogProduct[]>([]);
  const wishlist = useWishlist();

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, temperatures, certifications, onlyPromo, onlyNew, sort]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(loadProducts, search ? 350 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryId, temperatures, certifications, onlyPromo, onlyNew, sort, page]);

  async function loadCategories() {
    const { data } = await supabase
      .from('categories').select('id, name, parent_id')
      .order('name');
    setCategories((data ?? []) as Category[]);
  }

  async function loadProducts() {
    setLoading(true);
    let q = supabase
      .from('products')
      .select(`id, name, ean, images, temperature, moq,
        is_new, is_on_promotion, is_sponsored, created_at,
        certifications, short_description, avg_rating, review_count, seller_org_id,
        organisations!seller_org_id (id, name),
        categories (id, name),
        brands (id, name),
        price_tiers (qty_min, unit_price)`)
      .eq('status', 'active');

    if (search.trim())         q = q.or(`name.ilike.%${search.trim()}%,ean.ilike.%${search.trim()}%`);
    if (categoryId)            q = q.eq('category_id', categoryId);
    if (temperatures.length)   q = q.in('temperature', temperatures);
    if (onlyPromo)             q = q.eq('is_on_promotion', true);
    if (onlyNew)               q = q.eq('is_new', true);

    // On récupère une fenêtre large puis on regroupe par EAN côté client.
    q = q.order('is_sponsored', { ascending: false }).range(0, FETCH_WINDOW - 1);
    const { data } = await q;
    const rows = (data ?? []) as unknown as CatalogProduct[];
    setWindowFull(rows.length >= FETCH_WINDOW);

    // ── Regroupement par EAN (fallback id) ──────────────────────────────────
    const map = new Map<string, CatalogProduct[]>();
    for (const r of rows) {
      const key = r.ean?.trim() || `id:${r.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    let grouped: GroupedProduct[] = [...map.entries()].map(([key, offers]) => {
      const priced = [...offers].sort(
        (a, b) => (basePrice(a.price_tiers) ?? Infinity) - (basePrice(b.price_tiers) ?? Infinity),
      );
      const representative = priced[0];
      const prices = offers.map(o => basePrice(o.price_tiers)).filter((p): p is number => p != null);
      return {
        key,
        ean: representative.ean,
        representative,
        offerCount: offers.length,
        vendorNames: [...new Set(offers.map(o => o.organisations?.name).filter(Boolean) as string[])],
        minPrice: prices.length ? Math.min(...prices) : null,
        maxRating: Math.max(0, ...offers.map(o => o.avg_rating ?? 0)),
        totalReviews: offers.reduce((s, o) => s + (o.review_count ?? 0), 0),
        newestAt: offers.reduce((m, o) => (o.created_at > m ? o.created_at : m), ''),
        isNew: offers.some(o => o.is_new),
        isPromo: offers.some(o => o.is_on_promotion),
        isSponsored: offers.some(o => o.is_sponsored),
      };
    });

    // ── Tri des produits regroupés ─────────────────────────────────────────
    if (sort === 'price_asc')       grouped.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    else if (sort === 'price_desc') grouped.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    else if (sort === 'rating')     grouped.sort((a, b) => b.maxRating - a.maxRating);
    else if (sort === 'newest')     grouped.sort((a, b) => b.newestAt.localeCompare(a.newestAt));
    else                            grouped.sort((a, b) =>
                                      (Number(b.isSponsored) - Number(a.isSponsored)) ||
                                      (Number(b.isNew) - Number(a.isNew)) ||
                                      (b.offerCount - a.offerCount));

    setTotalCount(grouped.length);
    // Pagination des groupes côté client.
    grouped = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── Représentant du groupe = offre recommandée (prix, livraison, qualité
    // fournisseur, fraîcheur, proximité), pas systématiquement la moins chère.
    // Un seul lot de requêtes réseau pour toute la page (cf. rankCatalogGroups).
    if (grouped.length > 0) {
      const buyerLocation = activeOrg
        ? { city: activeOrg.city, region: activeOrg.region, country: activeOrg.country }
        : null;
      const rankInputs: CatalogGroupInput[] = grouped.map((g) => ({
        key: g.key,
        products: (map.get(g.key) ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          ean: o.ean,
          seller_org_id: o.seller_org_id,
          moq: o.moq,
          estimated_lead_days: null,
          avg_rating: o.avg_rating,
          review_count: o.review_count,
          certifications: o.certifications,
          price_tiers: o.price_tiers,
        })),
      }));
      const ranking = await rankCatalogGroups(rankInputs, { quantity: 1, buyerLocation });
      grouped = grouped.map((g) => {
        const bestId = ranking.get(g.key)?.ranked[0]?.offer.productId;
        const best = bestId ? map.get(g.key)?.find((o) => o.id === bestId) : null;
        return best ? { ...g, representative: best } : g;
      });
    }

    setGroups(grouped);
    setLoading(false);
  }

  async function addToCart(product: CatalogProduct) {
    if (!activeOrg) return;
    const price = basePrice(product.price_tiers);
    if (!price) return;
    const { error } = await addToCartShared({
      buyerOrgId: activeOrg.id,
      productId: product.id,
      quantity: product.moq,
      unitPrice: price,
    });
    if (error) {
      setCartMsg(`Erreur : ${error}`);
      setTimeout(() => setCartMsg(''), 4000);
      return;
    }
    setCartMsg(`${product.name.slice(0, 30)} ajouté au panier`);
    setTimeout(() => setCartMsg(''), 3000);
  }

  function toggleCompare(p: CatalogProduct) {
    setCompareList(prev =>
      prev.find(c => c.id === p.id)
        ? prev.filter(c => c.id !== p.id)
        : prev.length >= 4 ? prev : [...prev, p],
    );
  }

  function toggleTemp(v: string) {
    setTemperatures(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v]);
  }
  function toggleCertif(v: string) {
    setCertifications(prev => prev.includes(v) ? prev.filter(c => c !== v) : [...prev, v]);
  }

  const roots = categories.filter(c => !c.parent_id);
  const children = (pid: string) => categories.filter(c => c.parent_id === pid);

  return (
    <SpaceBetween size="m">
      {cartMsg && (
        <Flashbar items={[{ type: 'success', content: cartMsg, dismissible: true, onDismiss: () => setCartMsg('') }]} />
      )}

      <Header
        variant="h1"
        description={`${totalCount} produit${totalCount !== 1 ? 's' : ''}${windowFull ? '+ (affinez la recherche)' : ''} — chaque produit regroupe tous ses fournisseurs`}
      >
        Catalogue
      </Header>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <SpaceBetween size="s">
            {/* Catégories */}
            <Container>
              <SpaceBetween size="xs">
                <Box fontWeight="bold">Catégories</Box>
                <div
                  onClick={() => setCategoryId('')}
                  style={{ cursor: 'pointer', fontWeight: !categoryId ? 700 : 400,
                    color: !categoryId ? '#0972d3' : '#0f1b2d', fontSize: 13 }}
                >
                  Toutes
                </div>
                {roots.map(root => (
                  <ExpandableSection
                    key={root.id}
                    headerText={root.name}
                    variant="footer"
                    defaultExpanded={categoryId === root.id || children(root.id).some(c => c.id === categoryId)}
                  >
                    <SpaceBetween size="xxs">
                      <div onClick={() => setCategoryId(root.id)}
                        style={{ cursor: 'pointer', fontWeight: categoryId === root.id ? 700 : 400,
                          color: categoryId === root.id ? '#0972d3' : '#5f6b7a', fontSize: 13, paddingLeft: 4 }}>
                        Tous — {root.name}
                      </div>
                      {children(root.id).map(child => (
                        <div key={child.id} onClick={() => setCategoryId(child.id)}
                          style={{ cursor: 'pointer', fontWeight: categoryId === child.id ? 700 : 400,
                            color: categoryId === child.id ? '#0972d3' : '#5f6b7a', fontSize: 13, paddingLeft: 12 }}>
                          {child.name}
                        </div>
                      ))}
                    </SpaceBetween>
                  </ExpandableSection>
                ))}
              </SpaceBetween>
            </Container>

            {/* Conservation */}
            <Container>
              <SpaceBetween size="xs">
                <Box fontWeight="bold">Conservation</Box>
                {TEMP_OPTIONS.map(opt => (
                  <Checkbox key={opt.value} checked={temperatures.includes(opt.value)}
                    onChange={() => toggleTemp(opt.value)}>{opt.label}</Checkbox>
                ))}
              </SpaceBetween>
            </Container>

            {/* Certifications */}
            <Container>
              <SpaceBetween size="xs">
                <Box fontWeight="bold">Certifications</Box>
                {CERTIF_OPTIONS.map(c => (
                  <Checkbox key={c} checked={certifications.includes(c)}
                    onChange={() => toggleCertif(c)}>{c}</Checkbox>
                ))}
              </SpaceBetween>
            </Container>

            {/* Flags */}
            <Container>
              <SpaceBetween size="xs">
                <Box fontWeight="bold">Filtres rapides</Box>
                <Checkbox checked={onlyPromo} onChange={({ detail }) => setOnlyPromo(detail.checked)}>
                  En promotion
                </Checkbox>
                <Checkbox checked={onlyNew} onChange={({ detail }) => setOnlyNew(detail.checked)}>
                  Nouveautés
                </Checkbox>
              </SpaceBetween>
            </Container>

            {(categoryId || temperatures.length > 0 || certifications.length > 0 || onlyPromo || onlyNew) && (
              <Button variant="link" onClick={() => {
                setCategoryId(''); setTemperatures([]); setCertifications([]);
                setOnlyPromo(false); setOnlyNew(false);
              }}>
                Effacer tous les filtres
              </Button>
            )}
          </SpaceBetween>
        </div>

        {/* ── Main ────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SpaceBetween size="m">
            {/* Search + sort bar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Input value={search} type="search"
                  onChange={({ detail }) => setSearch(detail.value)}
                  placeholder="Nom du produit, EAN, marque…" />
              </div>
              <div style={{ width: 200 }}>
                <Select
                  selectedOption={SORT_OPTIONS.find(o => o.value === sort) ?? SORT_OPTIONS[0]}
                  options={SORT_OPTIONS}
                  onChange={({ detail }) => setSort(detail.selectedOption.value ?? 'relevance')}
                />
              </div>
            </div>

            {/* Compare bar */}
            {compareList.length > 0 && (
              <Alert
                type="info"
                header={`${compareList.length} produit${compareList.length > 1 ? 's' : ''} sélectionné${compareList.length > 1 ? 's' : ''} pour comparaison`}
                action={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/buyer/compare?ids=${compareList.map(p => p.id).join(',')}`)}
                    >
                      Comparer les prix
                    </Button>
                    <Button onClick={() => setCompareList([])}>Effacer</Button>
                  </SpaceBetween>
                }
              >
                {compareList.map(p => p.name).join(' · ')}
              </Alert>
            )}

            {/* Grid */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Spinner size="large" />
              </div>
            ) : groups.length === 0 ? (
              <Box textAlign="center" color="text-body-secondary" padding="xxxl">
                Aucun produit pour ces critères.
              </Box>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: 16,
              }}>
                {groups.map(g => (
                  <ProductCard
                    key={g.key}
                    group={g}
                    isComparing={compareList.some(c => c.id === g.representative.id)}
                    isFav={wishlist.has(g.representative.id)}
                    onCompare={() => toggleCompare(g.representative)}
                    onToggleFav={() => wishlist.toggle(g.representative.id)}
                    onAddToCart={() => addToCart(g.representative)}
                    onView={() => navigate(`/product/${g.representative.id}`)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  currentPageIndex={page}
                  pagesCount={Math.ceil(totalCount / PAGE_SIZE)}
                  onChange={({ detail }) => setPage(detail.currentPageIndex)}
                />
              </div>
            )}
          </SpaceBetween>
        </div>
      </div>
    </SpaceBetween>
  );
}

// ── Product card (un produit = un EAN, tous fournisseurs confondus) ─────────
function ProductCard({
  group, isComparing, isFav, onCompare, onToggleFav, onAddToCart, onView,
}: {
  group: GroupedProduct;
  isComparing: boolean;
  isFav: boolean;
  onCompare: () => void;
  onToggleFav: () => void;
  onAddToCart: () => void;
  onView: () => void;
}) {
  const product = group.representative;
  const price = group.minPrice;
  const multiVendor = group.offerCount > 1;
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `2px solid ${isComparing ? '#0972d3' : hover ? '#d1d5db' : '#e5e7eb'}`,
        borderRadius: 10,
        background: '#fff',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', background: '#f8f9fa', height: 160, overflow: 'hidden' }}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 36, color: '#d1d5db' }}>📦</div>
        }
        {/* Badges overlay */}
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {group.isSponsored && <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>SPONSORISÉ</span>}
          {group.isNew && <span style={{ background: '#0284c7', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>NOUVEAU</span>}
          {group.isPromo && <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>PROMO</span>}
        </div>
        {/* Temperature */}
        <div style={{ position: 'absolute', top: 6, right: 6, background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 4, fontSize: 10, fontWeight: 600, padding: '2px 6px', color: tempColor(product.temperature) }}>
          {tempLabel(product.temperature)}
        </div>
        {/* Favori */}
        <button
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={e => { e.stopPropagation(); onToggleFav(); }}
          style={{
            position: 'absolute', bottom: 6, left: 6,
            width: 26, height: 26, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', border: `1px solid ${isFav ? '#e11d48' : '#d1d5db'}`,
            cursor: 'pointer', padding: 0,
          }}
        >
          <Heart size={13} color={isFav ? '#e11d48' : '#9ca3af'} fill={isFav ? '#e11d48' : 'none'} />
        </button>
        {/* Compare checkbox */}
        <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onCompare(); }}
            style={{
              background: isComparing ? '#0972d3' : '#fff',
              color: isComparing ? '#fff' : '#5f6b7a',
              border: `1px solid ${isComparing ? '#0972d3' : '#d1d5db'}`,
              borderRadius: 4, fontSize: 10, fontWeight: 600,
              padding: '3px 7px', cursor: 'pointer',
            }}
          >
            {isComparing ? '✓ Comparé' : '⊕ Comparer'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Marque + nombre de fournisseurs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600, textTransform: 'uppercase',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.brands?.name ?? product.organisations?.name ?? '—'}
          </span>
          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: multiVendor ? '#eff6ff' : '#f3f4f6', color: multiVendor ? '#0972d3' : '#6b7280' }}>
            {group.offerCount} fournisseur{multiVendor ? 's' : ''}
          </span>
        </div>
        {/* Name */}
        <div
          onClick={onView}
          style={{ fontSize: 13, fontWeight: 700, color: '#0f1b2d', lineHeight: 1.3,
            cursor: 'pointer', display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {product.name}
        </div>
        {/* Rating (meilleure note parmi les fournisseurs) */}
        {group.totalReviews > 0 && (
          <div style={{ fontSize: 11, color: '#d97706' }}>
            {starRating(group.maxRating)} <span style={{ color: '#6b7280' }}>({group.totalReviews})</span>
          </div>
        )}
        {/* Certifications */}
        {product.certifications?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {product.certifications.slice(0, 3).map(c => (
              <span key={c} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                borderRadius: 3, fontSize: 10, fontWeight: 600, padding: '1px 5px' }}>{c}</span>
            ))}
          </div>
        )}
        {/* Prix mini + fourchette fournisseurs */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
          {price != null ? (
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f1b2d' }}>
                {multiVendor && <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>dès </span>}
                {price.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                {multiVendor
                  ? `${group.offerCount} offres · ${group.vendorNames.slice(0, 2).join(', ')}${group.vendorNames.length > 2 ? '…' : ''}`
                  : `à partir de ${product.moq} unité${product.moq > 1 ? 's' : ''}`}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic' }}>Sur devis</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 6 }}>
        <button
          onClick={onView}
          style={{
            flex: 1, background: '#0972d3', color: '#fff',
            border: 'none', borderRadius: 6, padding: '7px 0',
            fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}
        >
          Voir l’offre{multiVendor ? ' recommandée' : ''}
        </button>
        <button
          onClick={onAddToCart}
          disabled={!price}
          title="Ajouter la moins chère au panier"
          style={{
            background: price ? '#f3f4f6' : '#e5e7eb',
            color: price ? '#374151' : '#9ca3af',
            border: 'none', borderRadius: 6,
            padding: '7px 10px', fontWeight: 700, fontSize: 12,
            cursor: price ? 'pointer' : 'not-allowed',
          }}
        >
          + Panier
        </button>
      </div>
    </div>
  );
}

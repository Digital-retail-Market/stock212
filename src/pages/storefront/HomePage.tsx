import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Button, Flex, Heading, Text, VStack, HStack, Image, SimpleGrid, Skeleton } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronRight, ShieldCheck, Snowflake, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCatStyle } from '../../lib/categoryIcons';
import { getCategoryLabel } from '../../lib/categoryLabel';
import type { Category, Product, Brand } from '../../types';

// Catégories mises en avant en priorité — les plus restockées par épiceries,
// hôtels, restaurants, cafés, boulangeries/pâtisseries et traiteurs.
const PRIORITY_CATEGORIES = [
  'Boissons', 'Épicerie sèche', 'Produits laitiers', 'Boucherie & Charcuterie',
  'Fruits & Légumes', 'Surgelés', 'Emballages', 'Hygiène',
];

// Marques de référence dominantes sur le marché marocain FMCG
const DOMINANT_BRANDS = ['Aïcha', 'Koutoubia', 'Copag'];

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:        '#0d1f38',
  navyMid:     '#1a3558',
  amber:       '#c97d1a',
  amberLight:  '#fef3c7',
  amberBorder: '#fbbf24',
  red:         '#be1c1c',
  redLight:    '#fff1f1',
  redBorder:   '#fca5a5',
  green:       '#1a5c35',
  greenLight:  '#dcfce7',
  slate:       '#334155',
  muted:       '#64748b',
  border:      '#e2e8f0',
  bgAlt:       '#f8fafc',
  bgWarm:      '#fafaf9',
};

// ── Container ─────────────────────────────────────────────────────────────────
function Container({ children, py = 0 }: { children: React.ReactNode; py?: number }) {
  return <Box maxW="1400px" mx="auto" px={{ base: 4, md: 6 }} py={py}>{children}</Box>;
}

// ── Category tile — carré plein écran, libellé en surimpression ──────────────
function CategoryTile({ category, onClick, isMore }: {
  category?: Category; onClick: () => void; isMore?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { Icon, bg, color } = category ? getCatStyle(category.name) : { Icon: undefined, bg: C.bgAlt, color: C.navy };
  const label = category ? getCategoryLabel(category, i18n.language) : '';
  return (
    <Box position="relative" w="full" rounded="lg" overflow="hidden" cursor="pointer"
      onClick={onClick} role="group" minH="44px"
      style={{ aspectRatio: '1', background: isMore ? C.navy : bg }}
      _hover={{ transform: 'scale(1.02)' }} transition="transform 0.15s ease">
      {isMore ? (
        <Flex w="full" h="full" align="center" justify="center" direction="column" gap={1.5}>
          <ChevronRight size={26} color="white" />
          <Text color="white" fontWeight="700" fontSize={{ base: '10px', md: 'xs' }}>{t('common.seeAll')}</Text>
        </Flex>
      ) : (
        <>
          {category?.image_url ? (
            <Image src={category.image_url} alt={label} w="full" h="full" objectFit="cover"
              transition="transform 0.3s ease" _groupHover={{ transform: 'scale(1.08)' }} />
          ) : Icon ? (
            <Flex w="full" h="full" align="center" justify="center">
              <Icon size={36} color={color} />
            </Flex>
          ) : null}
          <Box position="absolute" inset={0} style={{
            background: 'linear-gradient(to top, rgba(13,31,56,0.80) 0%, rgba(13,31,56,0.05) 60%, transparent 100%)',
          }} />
          <Text position="absolute" bottom={2} insetStart={2.5} insetEnd={2} color="white" fontWeight="700"
            fontSize={{ base: '10px', md: 'xs' }} noOfLines={2} lineHeight={1.25}>
            {label}
          </Text>
        </>
      )}
    </Box>
  );
}

// ── Promo product card — simple, prix visible à tous ──────────────────────────
function PromoCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tiers = product.price_tiers?.slice().sort((a, b) => a.qty_min - b.qty_min) ?? [];
  const first = tiers[0];
  const isDestock = (product.stock_qty ?? 0) > 0 && (product.stock_qty ?? 0) <= 20;
  const badgeColor = isDestock ? C.red : C.amber;
  const badgeLabel = isDestock ? t('badges.destock') : t('badges.promo');
  return (
    <Box flexShrink={0} w={{ base: '158px', md: '192px' }} bg="white" rounded="lg"
      overflow="hidden" border="1px solid" borderColor={C.border}
      cursor="pointer" onClick={() => navigate(`/product/${product.id}`)}
      _hover={{ shadow: 'md', transform: 'translateY(-3px)', borderColor: C.amberBorder }}
      transition="all 0.2s ease" position="relative">
      <Box position="absolute" top={2} insetStart={2} zIndex={2}>
        <Box style={{ background: badgeColor }} rounded="sm" px={1.5} py={0.5}>
          <Text fontSize="8px" fontWeight="800" color="white">{badgeLabel}</Text>
        </Box>
      </Box>
      <Box h={{ base: '128px', md: '155px' }} overflow="hidden">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} w="full" h="full" objectFit="cover" />
        ) : (
          <Flex w="full" h="full" align="center" justify="center" style={{ background: C.bgAlt }}>
            <Text fontWeight="900" fontSize="4xl" lineHeight={1} userSelect="none" style={{ color: '#cbd5e1' }}>
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </Flex>
        )}
      </Box>
      <Box p={3}>
        <Text fontSize="9px" fontWeight="700" noOfLines={1} mb={0.5}
          textTransform="uppercase" letterSpacing="0.6px" style={{ color: C.amber }}>
          {product.organisations?.name ?? 'Vendeur'}
        </Text>
        <Text fontWeight="600" color="gray.800" fontSize="xs" noOfLines={2} mb={1.5} lineHeight={1.4}>
          {product.name}
        </Text>
        {first ? (
          <HStack spacing={1} align="baseline">
            <Text fontWeight="800" fontSize="md" lineHeight={1} style={{ color: C.navy }}>
              {first.unit_price.toFixed(2)}
            </Text>
            <Text fontSize="9px" style={{ color: C.muted }}>{product.currency}</Text>
          </HStack>
        ) : (
          <Text fontSize="xs" color="gray.400" fontStyle="italic">{t('common.onQuote')}</Text>
        )}
      </Box>
    </Box>
  );
}

// ── Market leader card — référence dominante, badge marque ───────────────────
function MarketLeaderCard({ product }: { product: Product & { brands?: { name: string } | null } }) {
  const navigate = useNavigate();
  const tiers = product.price_tiers?.slice().sort((a, b) => a.qty_min - b.qty_min) ?? [];
  const first = tiers[0];
  return (
    <Box flexShrink={0} w={{ base: '158px', md: '192px' }} bg="white" rounded="lg"
      overflow="hidden" border="1px solid" borderColor={C.border}
      cursor="pointer" onClick={() => navigate(`/product/${product.id}`)}
      _hover={{ shadow: 'md', transform: 'translateY(-3px)', borderColor: C.navyMid }}
      transition="all 0.2s ease" position="relative">
      {product.brands?.name && (
        <Box position="absolute" top={2} insetStart={2} zIndex={2}>
          <Box style={{ background: C.navy }} rounded="sm" px={1.5} py={0.5}>
            <Text fontSize="8px" fontWeight="800" color="white" textTransform="uppercase" letterSpacing="0.4px">
              {product.brands.name}
            </Text>
          </Box>
        </Box>
      )}
      <Box h={{ base: '128px', md: '155px' }} overflow="hidden">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} w="full" h="full" objectFit="cover" />
        ) : (
          <Flex w="full" h="full" align="center" justify="center" style={{ background: C.bgAlt }}>
            <Text fontWeight="900" fontSize="4xl" lineHeight={1} userSelect="none" style={{ color: '#cbd5e1' }}>
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </Flex>
        )}
      </Box>
      <Box p={3}>
        <Text fontSize="9px" fontWeight="700" noOfLines={1} mb={0.5}
          textTransform="uppercase" letterSpacing="0.6px" style={{ color: C.muted }}>
          {product.organisations?.name ?? 'Vendeur'}
        </Text>
        <Text fontWeight="600" color="gray.800" fontSize="xs" noOfLines={2} mb={1.5} lineHeight={1.4}>
          {product.name}
        </Text>
        {first && (
          <HStack spacing={1} align="baseline">
            <Text fontWeight="800" fontSize="md" lineHeight={1} style={{ color: C.navy }}>
              {first.unit_price.toFixed(2)}
            </Text>
            <Text fontSize="9px" style={{ color: C.muted }}>{product.currency}</Text>
          </HStack>
        )}
      </Box>
    </Box>
  );
}

// ── Bandeau de marques défilant en continu ────────────────────────────────────
function BrandMarquee({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;
  const doubled = [...brands, ...brands];
  return (
    <Box overflow="hidden" position="relative" w="full" py={{ base: 2, md: 4 }}
      sx={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}>
      <Flex w="max-content" gap={{ base: 8, md: 16 }}
        sx={{
          '@keyframes marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
          animation: 'marquee 32s linear infinite',
          '&:hover': { animationPlayState: 'paused' },
        }}>
        {doubled.map((b, i) => (
          <Flex key={`${b.id}-${i}`} align="center" justify="center" flexShrink={0}
            h={{ base: '56px', md: '72px' }} minW={{ base: '110px', md: '160px' }}>
            {b.logo_url ? (
              <Image src={b.logo_url} alt={b.name} h={{ base: '36px', md: '52px' }} w="auto" objectFit="contain"
                style={{ filter: 'grayscale(100%)', opacity: 0.55 }}
                _hover={{ filter: 'none', opacity: 1 }} transition="all 0.2s ease" />
            ) : (
              <Text fontWeight="800" fontSize={{ base: 'lg', md: '2xl' }} color="gray.300"
                _hover={{ color: C.slate }} transition="color 0.2s ease">
                {b.name}
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}

// ── Platform stat formatter ────────────────────────────────────────────────────
function fmtStat(n: number, fallback: string): string {
  if (n <= 0) return fallback;
  return `${n.toLocaleString('fr-FR')}+`;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [platformCounts, setPlatformCounts] = useState({ products: 0, vendors: 0, delivery: 0 });
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Product[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [marketLeaders, setMarketLeaders] = useState<Product[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('organisations').select('id', { count: 'exact', head: true }).eq('org_type', 'seller').eq('validation_status', 'active'),
      supabase.from('organisations').select('id', { count: 'exact', head: true }).eq('org_type', 'delivery').eq('validation_status', 'active'),
    ]).then(([prodRes, vendorRes, deliveryRes]) => {
      setPlatformCounts({
        products: prodRes.count ?? 0,
        vendors:  vendorRes.count ?? 0,
        delivery: deliveryRes.count ?? 0,
      });
    });

    supabase.from('categories')
      .select('id, name, name_i18n, icon, image_url, description, parent_id, display_order, active')
      .eq('active', true).order('display_order')
      .then(({ data }) => {
        const all = (data as Category[]) ?? [];
        setSubCategories(all.filter((c) => !!c.parent_id));
      });

    // Promotions + déstockage réunis dans un seul carrousel
    supabase.from('products').select('*, organisations(name), price_tiers(*)')
      .eq('status', 'active').or('is_on_promotion.eq.true,stock_qty.lte.20')
      .order('stock_qty', { ascending: true, nullsFirst: false })
      .limit(12)
      .then(({ data }) => { setPromos((data as Product[]) ?? []); setLoadingPromos(false); });

    // Références dominantes du marché marocain — marques leaders
    supabase.from('brands').select('id').in('name', DOMINANT_BRANDS)
      .then(({ data }) => {
        const ids = (data ?? []).map((b) => b.id);
        if (ids.length === 0) { setLoadingLeaders(false); return; }
        supabase.from('products').select('*, organisations(name), price_tiers(*), brands(name)')
          .eq('status', 'active').in('brand_id', ids).limit(12)
          .then(({ data: prodData }) => {
            setMarketLeaders((prodData as Product[]) ?? []);
            setLoadingLeaders(false);
          });
      });

    supabase.from('brands').select('*').limit(16)
      .then(({ data }) => setBrands((data as Brand[]) ?? []));
  }, []);

  // Sous-catégories triées : celles restockées par ce public en premier, le reste ensuite
  const orderedCategories = [...subCategories].sort((a, b) => {
    const ia = PRIORITY_CATEGORIES.indexOf(a.name);
    const ib = PRIORITY_CATEGORIES.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.display_order - b.display_order;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <Box bg="white">

      {/* ══════════════════════════════════════════════════════════════
          HERO — Dark navy split layout
      ══════════════════════════════════════════════════════════════ */}
      <Box position="relative" overflow="hidden"
        minH={{ base: '460px', md: '500px', lg: '560px' }} style={{ background: C.navy }}>
        <Box position="absolute" right={0} top={0} bottom={0}
          w={{ base: 'full', lg: '48%' }} opacity={{ base: 0.12, lg: 1 }}>
          <Image
            src="https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="" w="full" h="full" objectFit="cover" objectPosition="center" />
          <Box position="absolute" inset={0} style={{
            background: 'linear-gradient(to right, #0d1f38 0%, rgba(13,31,56,0.55) 35%, transparent 70%)',
          }} />
        </Box>
        <Box position="absolute" inset={0} opacity={0.03} style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }} />

        <Container>
          <Box py={{ base: 16, md: 20, lg: 24 }} maxW={{ lg: '56%' }} position="relative" zIndex={2}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}>
              <HStack spacing={3} mb={5} align="center">
                <Box w={8} h="2px" style={{ background: C.amber }} />
                <Text fontSize="10px" fontWeight="800" letterSpacing="3.5px"
                  textTransform="uppercase" style={{ color: C.amber }}>
                  {t('hero.eyebrow')}
                </Text>
              </HStack>
              <Heading color="white" fontWeight="900"
                fontSize={{ base: '32px', md: '42px', lg: '52px' }}
                lineHeight={1.05} letterSpacing="-0.025em" mb={5}>
                {t('hero.title1')}<br />{t('hero.title2')}<br />
                <Text as="span" style={{ color: C.amber }}>{t('hero.titleAccent')}</Text>
              </Heading>
              <Text fontSize={{ base: 'sm', md: 'md' }} lineHeight={1.85} maxW="440px" mb={8}
                style={{ color: 'rgba(203,213,225,0.82)' }}>
                {fmtStat(platformCounts.products, '10 000+')} produits,{' '}
                {fmtStat(platformCounts.vendors, '500+')} vendeurs vérifiés, prix qui baissent
                quand vous achetez plus, livraison qui garde le froid — en Europe &amp; Afrique.
              </Text>
              <VStack align="flex-start" spacing={3} mb={12}>
                <Button size="md" rounded="md" fontWeight="700" fontSize="sm"
                  rightIcon={<ArrowRight size={15} />} onClick={() => navigate('/catalog')}
                  style={{ background: C.amber, color: 'white', boxShadow: '0 4px 20px rgba(201,125,26,0.4)' }}
                  _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }} transition="all 0.18s"
                  minH="44px">
                  {t('hero.cta')}
                </Button>
                <Text as="button" type="button" onClick={() => navigate('/auth')}
                  fontSize="sm" fontWeight="600" textDecoration="underline"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                  _hover={{ color: 'white' }}>
                  {user ? t('hero.secondaryLogged') : t('hero.secondaryAnon')}
                </Text>
              </VStack>
              <Flex align="center" flexWrap="wrap" rowGap={4}>
                {[
                  { v: fmtStat(platformCounts.products, '10 000+'), l: 'Produits actifs' },
                  { v: fmtStat(platformCounts.vendors, '500+'),     l: 'Vendeurs vérifiés' },
                  { v: fmtStat(platformCounts.delivery, '200+'),    l: 'Livreurs partenaires' },
                  { v: '30+',                                        l: 'Pays couverts' },
                ].map(({ v, l }, i) => (
                  <Flex key={l} align="center">
                    {i > 0 && <Box flexShrink={0} w="1px" h="36px" mx={5}
                      style={{ background: 'rgba(255,255,255,0.12)' }} />}
                    <Box>
                      <Text fontWeight="900" fontSize="xl" color="white" lineHeight={1}>{v}</Text>
                      <Text fontSize="10px" fontWeight="500" mt={0.5}
                        style={{ color: 'rgba(148,163,184,0.8)' }}>{l}</Text>
                    </Box>
                  </Flex>
                ))}
              </Flex>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          PROMOTIONS & DÉSTOCKAGE — un seul carrousel, badge par carte
      ══════════════════════════════════════════════════════════════ */}
      {(loadingPromos || promos.length > 0) && (
        <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
          <Container>
            <Flex align="center" justify="space-between" mb={5}>
              <HStack spacing={3} align="center">
                <Heading size="md" fontWeight="800" style={{ color: C.navy }}>
                  {t('sections.promoDestock')}
                </Heading>
                <Box rounded="md" px={2.5} py={1} style={{ background: C.redLight, border: `1px solid ${C.redBorder}` }}>
                  <Text fontSize="10px" fontWeight="700" style={{ color: C.red }}>{t('sections.limitedQty')}</Text>
                </Box>
              </HStack>
              <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
                color={C.slate} _hover={{ color: C.amber, bg: 'transparent' }}
                rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/best-deals')}>
                {t('common.seeAll')}
              </Button>
            </Flex>
            <Flex gap={3} overflowX="auto" pb={1}
              style={{ scrollbarWidth: 'none' }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
              {loadingPromos
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} flexShrink={0} w="192px" rounded="lg" overflow="hidden"
                      border="1px solid" borderColor={C.border}>
                      <Skeleton h="155px" /><Box p={3}><Skeleton h="10px" mb={2} /><Skeleton h="10px" w="60%" /></Box>
                    </Box>
                  ))
                : promos.map((p) => <PromoCard key={p.id} product={p} />)}
            </Flex>
          </Container>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CATÉGORIES — carrés plein écran, toutes affichées
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Container>
          <Heading size="md" fontWeight="800" mb={5} style={{ color: C.navy }}>
            {t('categories.title')}
          </Heading>

          <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={{ base: 2, md: 4 }}>
            {orderedCategories.map((cat) => (
              <CategoryTile key={cat.id} category={cat} onClick={() => navigate(`/catalog?category=${cat.id}`)} />
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          RÉFÉRENCES DOMINANTES — marques leaders du marché marocain
      ══════════════════════════════════════════════════════════════ */}
      {(loadingLeaders || marketLeaders.length > 0) && (
        <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
          <Container>
            <Flex align="center" justify="space-between" mb={5}>
              <Heading size="md" fontWeight="800" style={{ color: C.navy }}>
                {t('sections.marketLeaders')}
              </Heading>
              <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
                color={C.slate} _hover={{ color: C.amber, bg: 'transparent' }}
                rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/catalog')}>
                {t('common.seeAll')}
              </Button>
            </Flex>
            <Flex gap={3} overflowX="auto" pb={1}
              style={{ scrollbarWidth: 'none' }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
              {loadingLeaders
                ? Array.from({ length: 6 }).map((_, i) => (
                    <Box key={i} flexShrink={0} w="192px" rounded="lg" overflow="hidden"
                      border="1px solid" borderColor={C.border}>
                      <Skeleton h="155px" /><Box p={3}><Skeleton h="10px" mb={2} /><Skeleton h="10px" w="60%" /></Box>
                    </Box>
                  ))
                : marketLeaders.map((p) => <MarketLeaderCard key={p.id} product={p} />)}
            </Flex>
          </Container>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          RÉASSURANCE — une ligne, pas une section
      ══════════════════════════════════════════════════════════════ */}
      <Box style={{ background: C.bgWarm }}>
        <Container>
          <Flex py={3} gap={0} align="center" justify="center" flexWrap="wrap">
            {[
              { Icon: ShieldCheck, label: t('trust.verified') },
              { Icon: Snowflake, label: t('trust.freshDelivery') },
              { Icon: TrendingDown, label: t('trust.bulkPrice') },
            ].map(({ Icon, label }, i) => (
              <Flex key={label} align="center">
                {i > 0 && <Box w="1px" h="14px" mx={5} style={{ background: C.border }} flexShrink={0} />}
                <Flex align="center" gap={2}>
                  <Icon size={14} color={C.amber} />
                  <Text fontSize="xs" fontWeight="600" style={{ color: C.slate }}>{label}</Text>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          MARQUES PARTENAIRES — bandeau défilant, dernière section avant le footer
      ══════════════════════════════════════════════════════════════ */}
      {brands.length > 0 && (
        <Box bg="white" py={7}>
          <Container>
            <Heading size="sm" fontWeight="800" mb={4} textAlign="center" style={{ color: C.muted }}>
              {t('sections.partnerBrands')}
            </Heading>
          </Container>
          <BrandMarquee brands={brands} />
        </Box>
      )}
    </Box>
  );
}

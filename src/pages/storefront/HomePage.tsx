// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Button, Flex, Heading, Text, VStack, HStack, Image, SimpleGrid, Skeleton, Badge, Icon, Accordion, AccordionItem, AccordionButton, AccordionPanel } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronRight, ShieldCheck, Snowflake, TrendingDown, Package, Truck, Globe, Zap, Clock, Star, CheckCircle, Award, Gift, Eye, Utensils, UtensilsCrossed, Coffee, Building2, Pill, Store, Building, BookOpen, Navigation, Handshake, ShoppingCart } from 'lucide-react';
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
const DOMINANT_BRANDS = ['Carolin', 'WC Net', 'Aquafresh'];

// Category image overrides
const CATEGORY_IMAGE_OVERRIDES: { [key: string]: string } = {
  'Hygiène': '/cleaning-product.jfif',
};

// ── PROFESSIONAL UNIFIED COLOR PALETTE ────────────────────────────────────────
const C = {
  // Primary Brand Colors
  primary:     '#0f172a',      // Deep navy - primary CTA, headers, anchors
  primaryLight:'#1e293b',      // Lighter navy for secondary elements
  primaryMid:  '#1a2332',      // Mid navy for gradients

  // Accent - vibrant but professional
  accent:      '#d97706',      // Warm amber - highlights, secondary CTA
  accentLight: '#fef3c7',      // Light amber background
  accentBorder:'#fbbf24',      // Amber border for hover states

  // Orange variants
  orange:      '#f97316',      // Bright orange for highlights
  orangeLight: '#fed7aa',      // Light orange background

  // Supporting Colors
  success:     '#059669',      // Teal-green for positive actions
  warning:     '#dc2626',      // Red for alerts/urgency (limited use)
  warningLight:'#fee2e2',      // Light red/pink background
  warningDark: '#b91c1c',      // Dark red for hover states
  warningBorder:'#fca5a5',     // Light red border
  info:        '#0891b2',      // Cyan for informational elements

  // Neutral Colors - professional grayscale
  text:        '#1f2937',      // Primary text
  textMuted:   '#6b7280',      // Secondary text
  textLight:   '#9ca3af',      // Tertiary text
  border:      '#e5e7eb',      // Borders and dividers
  divider:     '#f3f4f6',      // Light divider

  // Backgrounds
  bg:          '#ffffff',      // White background
  bgLight:     '#f9fafb',      // Off-white background
  bgAlt:       '#f3f4f6',      // Alternative light background
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
  const { Icon, bg, color } = category ? getCatStyle(category.name) : { Icon: undefined, bg: C.bgAlt, color: C.primary };
  const label = category ? getCategoryLabel(category, i18n.language) : '';
  return (
    <Box position="relative" w="full" rounded="lg" overflow="hidden" cursor="pointer"
      onClick={onClick} role="group" minH="44px"
      style={{ aspectRatio: '1', background: isMore ? C.primary : bg }}
      _hover={{ transform: 'scale(1.02)' }} transition="transform 0.15s ease">
      {isMore ? (
        <Flex w="full" h="full" align="center" justify="center" direction="column" gap={1.5}>
          <ChevronRight size={26} color="white" />
          <Text color="white" fontWeight="700" fontSize={{ base: '10px', md: 'xs' }}>{t('common.seeAll')}</Text>
        </Flex>
      ) : (
        <>
          {(CATEGORY_IMAGE_OVERRIDES[category?.name] || category?.image_url) ? (
            <Image src={CATEGORY_IMAGE_OVERRIDES[category?.name] || category?.image_url} alt={label} w="full" h="full" objectFit="cover"
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

// ── Stats Counter Card ─────────────────────────────────────────────────────────
function StatsCard({ icon: IconComponent, label, value, color = C.primary }: {
  icon: typeof Package; label: string; value: string | number; color?: string;
}) {
  return (
    <VStack spacing={2} align="center" justify="center" p={6} rounded="xl"
      border="2px solid" borderColor={color} bg={`${color}08`}>
      <Flex w={12} h={12} rounded="lg" align="center" justify="center" style={{ background: color }}>
        <IconComponent size={24} color="white" />
      </Flex>
      <Heading size="lg" fontWeight="800" style={{ color }}>{value}</Heading>
      <Text fontSize="sm" fontWeight="600" color={C.text} textAlign="center">{label}</Text>
    </VStack>
  );
}

// ── Flash Deal Banner ──────────────────────────────────────────────────────────
function FlashDealsCallout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('06:30:00');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const [h, m, s] = prev.split(':').map(Number);
        let secs = h * 3600 + m * 60 + s - 1;
        if (secs < 0) {
          secs = 23 * 3600 + 59 * 60 + 59; // Reset to 24 hours
        }
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const seconds = secs % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      position="relative"
      rounded="xl"
      overflow="hidden"
      cursor="pointer"
      onClick={() => navigate('/best-deals')}
      style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.accent} 100%)`,
        boxShadow: `0 12px 32px rgba(15,23,42,0.15)`,
      }}
      _hover={{ transform: 'scale(1.02)', boxShadow: `0 16px 40px rgba(220,38,38,0.6)` }}
      transition="all 0.3s ease"
      p={{ base: 6, md: 10 }}
    >
      <Flex align="center" justify="space-between" gap={4}>
        <VStack align="start" spacing={3} flex={1}>
          <HStack spacing={2} align="baseline">
            <Zap size={24} color="white" fill="white" />
            <Heading size="xl" color="white" fontWeight="900">🔥 {t('promotions.flashDeals')}</Heading>
            <Box rounded="full" bg="white" px={2.5} py={1} minW="fit-content">
              <Text fontSize="10px" fontWeight="800" style={{ color: '#dc2626' }}>⏱️ {timeLeft}</Text>
            </Box>
          </HStack>
          <Heading size="sm" color="white" fontWeight="700">{t('promotions.limitedTime')} · {t('promotions.upTo50')}</Heading>
          <Text color="white" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="500" opacity={0.95}>
            {t('promotions.endingToday')}
          </Text>
        </VStack>
        <Flex align="center" gap={2} color="white" fontWeight="800" fontSize={{ base: 'md', md: 'lg' }}>
          <Text display={{ base: 'none', md: 'block' }}>{t('promotions.shopNow')}</Text>
          <ArrowRight size={20} />
        </Flex>
      </Flex>
    </Box>
  );
}

// ── Feature Highlight Card ────────────────────────────────────────────────────
function FeatureCard({ icon: IconComponent, title, description, bgColor, accentColor }: {
  icon: typeof CheckCircle; title: string; description: string; bgColor: string; accentColor: string;
}) {
  return (
    <Box p={5} rounded="lg" border="1px solid" borderColor={C.border}
      bg={bgColor} _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
      transition="all 0.2s">
      <HStack spacing={3} mb={2}>
        <Flex w={10} h={10} rounded="lg" align="center" justify="center" style={{ background: accentColor }}>
          <IconComponent size={18} color="white" />
        </Flex>
        <Heading size="sm" fontWeight="700" color={C.primary}>{title}</Heading>
      </HStack>
      <Text fontSize="sm" color={C.text}>{description}</Text>
    </Box>
  );
}

// ── Process Step Card ──────────────────────────────────────────────────────────
function ProcessStep({ number, title, description, icon: IconComponent }: {
  number: number; title: string; description: string; icon: typeof Package;
}) {
  return (
    <VStack spacing={4} align="center" textAlign="center" p={6} rounded="lg"
      border="2px solid" borderColor={C.border} position="relative"
      _hover={{ shadow: 'lg', borderColor: C.accent }} transition="all 0.3s">
      <Flex w={16} h={16} rounded="full" align="center" justify="center"
        style={{ background: `linear-gradient(135deg, ${C.accent} 0%, ${C.primary} 100%)` }}>
        <Text fontWeight="800" fontSize="xl" color="white">{number}</Text>
      </Flex>
      <Flex w={12} h={12} rounded="lg" align="center" justify="center" bg={C.bgAlt}>
        <IconComponent size={24} color={C.accent} />
      </Flex>
      <VStack spacing={1}>
        <Heading size="md" fontWeight="700" color={C.primary}>{title}</Heading>
        <Text fontSize="sm" color={C.text}>{description}</Text>
      </VStack>
    </VStack>
  );
}

// ── Testimonial Card ───────────────────────────────────────────────────────────
function TestimonialCard({ name, role, company, text, stars = 5 }: {
  name: string; role: string; company: string; text: string; stars?: number;
}) {
  return (
    <Box p={6} rounded="lg" border="1px solid" borderColor={C.border} bg="white"
      _hover={{ shadow: 'md' }} transition="all 0.2s">
      <HStack spacing={1} mb={3}>
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} size={16} fill={C.accent} color={C.accent} />
        ))}
      </HStack>
      <Text fontSize="sm" color={C.text} mb={4} fontStyle="italic">
        "{text}"
      </Text>
      <Box borderTop="1px solid" borderColor={C.border} pt={4}>
        <Text fontWeight="700" fontSize="sm" color={C.primary}>{name}</Text>
        <Text fontSize="xs" color={C.textMuted}>{role} at {company}</Text>
      </Box>
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
  const badgeColor = isDestock ? C.warning : C.accent;
  const badgeLabel = isDestock ? t('badges.destock') : t('badges.promo');
  return (
    <Box flexShrink={0} w={{ base: '158px', md: '192px' }} bg="white" rounded="lg"
      overflow="hidden" border="1px solid" borderColor={C.border}
      cursor="pointer" onClick={() => navigate(`/product/${product.id}`)}
      _hover={{ shadow: 'md', transform: 'translateY(-3px)', borderColor: C.accentBorder }}
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
          textTransform="uppercase" letterSpacing="0.6px" style={{ color: C.accent }}>
          {product.organisations?.name ?? 'Vendeur'}
        </Text>
        <Text fontWeight="600" color="gray.800" fontSize="xs" noOfLines={2} mb={1.5} lineHeight={1.4}>
          {product.name}
        </Text>
        {first ? (
          <HStack spacing={1} align="baseline">
            <Text fontWeight="800" fontSize="md" lineHeight={1} style={{ color: C.primary }}>
              {first.unit_price.toFixed(2)}
            </Text>
            <Text fontSize="9px" style={{ color: C.textMuted }}>{product.currency}</Text>
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
      _hover={{ shadow: 'md', transform: 'translateY(-3px)', borderColor: C.primaryMid }}
      transition="all 0.2s ease" position="relative">
      {product.brands?.name && (
        <Box position="absolute" top={2} insetStart={2} zIndex={2}>
          <Box style={{ background: C.primary }} rounded="sm" px={1.5} py={0.5}>
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
          textTransform="uppercase" letterSpacing="0.6px" style={{ color: C.textMuted }}>
          {product.organisations?.name ?? 'Vendeur'}
        </Text>
        <Text fontWeight="600" color="gray.800" fontSize="xs" noOfLines={2} mb={1.5} lineHeight={1.4}>
          {product.name}
        </Text>
        {first && (
          <HStack spacing={1} align="baseline">
            <Text fontWeight="800" fontSize="md" lineHeight={1} style={{ color: C.primary }}>
              {first.unit_price.toFixed(2)}
            </Text>
            <Text fontSize="9px" style={{ color: C.textMuted }}>{product.currency}</Text>
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
                _hover={{ color: C.text }} transition="color 0.2s ease">
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
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const CAROUSEL_IMAGES = ['/hero-bg.jfif', '/image-2.jfif', '/image-3.jfif'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

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

    // New Arrivals — Recently added products
    supabase.from('products').select('*, organisations(name), price_tiers(*)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => { setNewArrivals((data as Product[]) ?? []); setLoadingNew(false); });

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

    // Seules les marques effectivement portées par un produit actif apparaissent
    // dans le bandeau — évite d'afficher des marques orphelines (ex. anciens
    // fournisseurs de démo retirés de la plateforme).
    supabase.from('products').select('brand_id').eq('status', 'active').not('brand_id', 'is', null)
      .then(({ data }) => {
        const brandIds = [...new Set((data ?? []).map((p) => p.brand_id))];
        if (brandIds.length === 0) return;
        supabase.from('brands').select('*').in('id', brandIds).limit(16)
          .then(({ data: brandData }) => setBrands((brandData as Brand[]) ?? []));
      });
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
    <Box bg={C.bg}>

      {/* ══════════════════════════════════════════════════════════════
          HERO — Rotating background images sliding right to left
      ══════════════════════════════════════════════════════════════ */}
      <Box position="relative" overflow="hidden"
        minH={{ base: '460px', md: '500px', lg: '560px' }}
        backgroundImage={`url('${CAROUSEL_IMAGES[currentImageIdx]}')`}
        backgroundSize="cover"
        backgroundPosition="center"
        backgroundAttachment="fixed"
        transition="background-image 0.8s ease-in-out"
        sx={{
          animation: 'slideIn 0.8s ease-in-out',
          '@keyframes slideIn': {
            '0%': { backgroundPosition: 'right center' },
            '100%': { backgroundPosition: 'center' },
          },
        }}>
        {/* Light overlay for text readability */}
        <Box position="absolute" inset={0}
          bg="linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 100%)" />

        {/* Hero Text Overlay */}
        <Flex position="absolute" inset={0} align="center" justify="flex-start" pl={{ base: 6, md: 12 }} pr={{ base: 6, md: 8 }}>
          <VStack spacing={8} align="start" maxW="3xl"
            bg="rgba(0, 0, 0, 0.3)" p={{ base: 6, md: 8 }} borderRadius="xl">
            {/* Eyebrow */}
            <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="800" color={C.accent} textTransform="uppercase" letterSpacing="3px">
              {t('hero.eyebrow')}
            </Text>

            {/* Main heading */}
            <Heading as="h1" fontSize={{ base: '32px', md: '52px' }} color="white" lineHeight={1.1} fontWeight="900" letterSpacing="-1px">
              {t('hero.title1')}<br />
              {t('hero.title2')}<br />
              <span style={{ color: C.accent }}>{t('hero.titleAccent')}</span>
            </Heading>

            {/* Description */}
            <Text fontSize={{ base: 'md', md: '2xl' }} color="white" lineHeight={1.8} maxW="2xl" fontWeight="500">
              {t('hero.description', {
                products: fmtStat(platformCounts.products, '43+'),
                vendors: fmtStat(platformCounts.vendors, '1+')
              })}
            </Text>

            {/* CTA Buttons */}
            <HStack spacing={4} mt={-4}>
              <Button bg={C.success} color="white" fontWeight="700" px={8} py={6} fontSize={{ base: 'sm', md: 'md' }}
                _hover={{ bg: '#128a45' }} transition="all 0.2s">
                {t('hero.cta')} →
              </Button>
              <Button bg="white" color={C.primary} fontWeight="700" px={8} py={6} fontSize={{ base: 'sm', md: 'md' }}
                _hover={{ bg: C.accentLight }} transition="all 0.2s">
                {user ? t('hero.secondaryLogged') : t('hero.secondaryAnon')}
              </Button>
            </HStack>
          </VStack>
        </Flex>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          KPI BAR — chiffres clés de la plateforme
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={C.bgAlt} py={{ base: 6, sm: 8, md: 10 }} mt={{ base: -5, md: -8 }} position="relative" zIndex={2}
        style={{ borderBottom: `1px solid ${C.divider}` }}>
        <Container>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 6, sm: 8, md: 10 }}>
            {[
              { icon: Package,     v: fmtStat(platformCounts.products, '10 000+'), l: t('stats.activeProducts') },
              { icon: ShieldCheck, v: fmtStat(platformCounts.vendors, '500+'),     l: t('stats.verifiedVendors') },
              { icon: Truck,       v: fmtStat(platformCounts.delivery, '200+'),    l: t('stats.deliveryPartners') },
            ].map(({ icon: Icon, v, l }) => (
              <Flex key={l} align="center" gap={{ base: 3, md: 4 }} direction={{ base: 'row' }}>
                <Flex w={{ base: 10, sm: 11, md: 14 }} h={{ base: 10, sm: 11, md: 14 }} rounded="full" align="center" justify="center"
                  flexShrink={0} style={{ background: C.primary }}>
                  <Icon size={{ base: 18, md: 22 }} color="white" />
                </Flex>
                <Box minW={0} flex={1}>
                  <Text fontWeight="900" fontSize={{ base: '20px', sm: '24px', md: '32px' }} style={{ color: C.primary }} lineHeight={1.2}>
                    {v}
                  </Text>
                  <Text fontSize={{ base: '10px', sm: 'xs', md: 'sm' }} fontWeight="600" mt={{ base: 0.5, md: 1 }} style={{ color: C.textMuted }} noOfLines={2}>
                    {l}
                  </Text>
                </Box>
              </Flex>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          FLASH DEALS CTA — Eye-catching banner
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={C.bg} py={8} style={{ borderBottom: `1px solid ${C.divider}` }}>
        <Container>
          <FlashDealsCallout />
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          PROMOTIONAL ACTION CARDS — Jumia-inspired carousel
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={C.bgLight} py={8} style={{ borderBottom: `1px solid ${C.divider}` }}>
        <Container>
          <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} spacing={{ base: 2, md: 3 }}>
            {[
              { icon: '⚡', title: t('promos.flashSale'), desc: t('promos.upTo50'), cta: t('promos.limitedTime'), bg: `linear-gradient(135deg, ${C.warning} 0%, ${C.primary} 100%)` },
              { icon: '🚚', title: t('promos.freeShipping'), desc: t('promos.onOrders'), cta: t('promos.todayOnly'), bg: `linear-gradient(135deg, ${C.accent} 0%, ${C.primary} 100%)` },
              { icon: '✨', title: t('promos.newArrivals'), desc: `${fmtStat(newArrivals.length, '500+')} ${t('common.products')}`, cta: t('promos.explore'), bg: `linear-gradient(135deg, ${C.accent} 0%, ${C.primaryLight} 100%)` },
              { icon: '💰', title: t('promos.bulkDiscounts'), desc: t('promos.volumeSavings'), cta: t('promos.seePrices'), bg: `linear-gradient(135deg, ${C.success} 0%, ${C.primary} 100%)` },
              { icon: '✅', title: t('promos.verifiedSellers'), desc: t('promos.trusted'), cta: t('promos.browse'), bg: `linear-gradient(135deg, ${C.info} 0%, ${C.primary} 100%)` },
              { icon: '🎁', title: t('promos.rewardsProgram'), desc: t('promos.earnPoints'), cta: t('promos.joinNow'), bg: `linear-gradient(135deg, ${C.primary} 0%, ${C.accent} 100%)` },
            ].map((card, i) => (
              <Box key={i} p={4} rounded="lg" style={{ background: card.bg }}
                cursor="pointer" _hover={{ transform: 'translateY(-3px)', shadow: 'md' }} transition="all 0.2s"
                onClick={() => navigate('/best-deals')}>
                <VStack spacing={2} align="center" textAlign="center" h="full" justify="center">
                  <Text fontSize="24px">{card.icon}</Text>
                  <Heading size="sm" color="white" fontWeight="800">{card.title}</Heading>
                  <Text fontSize="10px" color="white" opacity={0.9}>{card.desc}</Text>
                  <Text fontSize="9px" color="white" opacity={0.8} fontWeight="600">{card.cta}</Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          PROMOTIONAL VIDEO CAROUSEL — Auto-rotating featured videos
      ══════════════════════════════════════════════════════════════ */}
      {(() => {
        const [videoIdx, setVideoIdx] = useState(0);
        const videos = [
          { id: '0WToWtrcp_Q', title: 'Stock212 - B2B Marketplace' },
          { id: 'V9kxyPJ0Un4', title: 'Stock212 - Platform Overview' },
          { id: 'So7DQscUNIE', title: 'Stock212 - B2B Solutions' },
          { id: 'bFC5gG2Mhzs', title: 'Stock212 - FMCG Platform' },
          { id: 'sIR5hVMG730', title: 'Stock212 - Africa Commerce' },
        ];

        useEffect(() => {
          const interval = setInterval(() => {
            setVideoIdx((prev) => (prev + 1) % videos.length);
          }, 15000);
          return () => clearInterval(interval);
        }, []);

        return (
          <Box bg={C.bgLight} py={{ base: 8, md: 12 }} style={{ borderBottom: `1px solid ${C.border}` }}>
            <Container>
              <VStack spacing={6} align="stretch">
                <Box position="relative" w="full" style={{ aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videos[videoIdx].id}?autoplay=1&mute=1`}
                    title={videos[videoIdx].title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  />
                </Box>

                <Flex justify="center" gap={2}>
                  {videos.map((_, i) => (
                    <Box key={i} w={2.5} h={2.5} rounded="full"
                      bg={i === videoIdx ? C.accent : C.border} cursor="pointer"
                      onClick={() => setVideoIdx(i)} _hover={{ bg: i === videoIdx ? C.accent : C.textMuted }}
                      transition="all 0.2s" />
                  ))}
                </Flex>
              </VStack>
            </Container>
          </Box>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════
          MARQUES DISPONIBLES — Available brands carousel
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Container>
          <Heading size="sm" fontWeight="800" mb={6} textAlign="center" style={{ color: C.textMuted }}>
            {t('sections.availableBrands')}
          </Heading>
        </Container>
        <Box display="flex" overflowX="auto" gap={4} px={{ base: 4, md: 6 }} style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: '4px' },
          '&::-webkit-scrollbar-track': { background: C.bgAlt },
          '&::-webkit-scrollbar-thumb': { background: C.border, borderRadius: '2px' },
        }}>
          {[
            { name: 'Carolina', logo: '/logos/carolina.jfif' },
            { name: 'Cosumar', logo: '/logos/cosumar.jfif' },
            { name: 'Coca-Cola', logo: '/logos/coca.jfif' },
            { name: 'Nestlé', logo: '/logos/nestle.jfif' },
            { name: 'Pepsi', logo: '/logos/pepsi.jfif' },
            { name: 'Lipton', logo: '/logos/lipton.jfif' },
            { name: 'Central Lait', logo: '/logos/central lait.jfif' },
            { name: 'Afia', logo: '/logos/afia.jfif' },
            { name: 'Aïcha', logo: '/logos/aicha.jfif' },
            { name: 'Jamila', logo: '/logos/jamila.jfif' },
            { name: 'Bimo', logo: '/logos/bimo.jfif' },
            { name: 'Bellar', logo: '/logos/bellar.jfif' },
            { name: 'Oreo', logo: '/logos/oreo.jfif' },
            { name: 'Sidiali', logo: '/logos/sidiali.jfif' },
            { name: 'Cristale', logo: '/logos/cristale.jfif' },
            { name: 'Chergi', logo: '/logos/chergi.jfif' },
            { name: 'Aïn Saïss', logo: '/logos/ainsaiss.jfif' },
            { name: 'Jaouda', logo: '/logos/jaouda.jfif' },
          ].map((brand) => (
            <Box key={brand.name} flexShrink={0} w="140px">
              <Image src={brand.logo} alt={brand.name} h="80px" objectFit="contain"
                filter="grayscale(100%)" _hover={{ filter: 'grayscale(0%)', transform: 'scale(1.05)' }}
                transition="all 0.2s" cursor="pointer" />
            </Box>
          ))}
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          FEATURED PRODUCTS — Vibrant grid with attention-grabbing design
      ══════════════════════════════════════════════════════════════ */}
      {(loadingPromos || promos.length > 0) && (
        <Box bg={C.orangeLight} py={{ base: 5, md: 7 }} style={{
          borderBottom: `3px solid ${C.warning}`,
          borderTop: `4px solid ${C.primary}`
        }}>
          <Container>
            <Flex align="center" justify="space-between" mb={5} display={{ base: 'none', md: 'flex' }}>
              <HStack spacing={3} align="center">
                <Heading size="lg" fontWeight="900" style={{
                  background: `linear-gradient(135deg, ${C.warning} 0%, ${C.accent} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  ⭐ {t('sections.sponsored')}
                </Heading>
                <Box rounded="full" px={3} py={1.5} style={{
                  background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`,
                  border: `2px solid ${C.accent}`
                }}>
                  <Text fontSize="11px" fontWeight="800" style={{ color: C.accent }}>🔥 {t('sections.topRated')}</Text>
                </Box>
              </HStack>
              <Button size="sm" fontWeight="700" fontSize="sm"
                bg={C.warning} color="white" _hover={{ bg: C.warningDark }}
                rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/catalog')}>
                {t('common.seeAll')} →
              </Button>
            </Flex>
            <Heading size="md" fontWeight="900" style={{ color: C.warning }} mb={5} display={{ base: 'block', md: 'none' }}>
              ⭐ {t('sections.sponsored')}
            </Heading>
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={{ base: 2, md: 4 }}>
              {loadingPromos
                ? Array.from({ length: 10 }).map((_, i) => (
                    <Box key={i} rounded="lg" overflow="hidden" border="2px solid" borderColor={C.warning}>
                      <Skeleton h={{ base: '140px', md: '160px' }} /><Box p={2} bg="white"><Skeleton h="8px" mb={1} /><Skeleton h="8px" w="60%" /></Box>
                    </Box>
                  ))
                : promos.slice(0, 10).map((p) => <PromoCard key={p.id} product={p} />)}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PROMOTIONS & DÉSTOCKAGE — Carousel with more products
      ══════════════════════════════════════════════════════════════ */}
      {(loadingPromos || promos.length > 0) && (
        <Box bg={C.bgAlt} py={7} style={{
          borderBottom: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.warning}`
        }}>
          <Container>
            <Flex align="center" justify="space-between" mb={5}>
              <HStack spacing={3} align="center">
                <Heading size="md" fontWeight="800" style={{
                  background: `linear-gradient(135deg, ${C.warning} 0%, ${C.orange} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {t('sections.promoDestock')}
                </Heading>
                <Box rounded="md" px={2.5} py={1} style={{ background: C.warningLight, border: `1px solid ${C.warningBorder}` }}>
                  <Text fontSize="10px" fontWeight="700" style={{ color: C.warning }}>{t('sections.limitedQty')}</Text>
                </Box>
              </HStack>
              <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
                color={C.text} _hover={{ color: C.accent, bg: 'transparent' }}
                rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/best-deals')}>
                {t('common.seeAll')}
              </Button>
            </Flex>
            <Flex gap={3} overflowX="auto" pb={1}
              style={{ scrollbarWidth: 'none' }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
              {loadingPromos
                ? Array.from({ length: 8 }).map((_, i) => (
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
          PREMIUM OFFER BANNER — Special pricing offer
      ══════════════════════════════════════════════════════════════ */}
      <Box
        bg={`linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)`}
        py={{ base: 6, md: 10 }}
        rounded="xl"
        mx={{ base: 4, md: 6 }}
        my={8}
        position="relative"
        overflow="hidden"
        boxShadow="0 12px 32px rgba(124,58,237,0.4)"
      >
        <Box position="absolute" top={0} right={0} w="50%" h="full" opacity={0.15}>
          <Box position="absolute" top="-20%" right="-10%" w="400px" h="400px"
            rounded="full" style={{ background: 'white' }} />
        </Box>
        <Box position="absolute" bottom={0} left={0} w="30%" h="full" opacity={0.1}>
          <Box position="absolute" bottom="-15%" left="-5%" w="250px" h="250px"
            rounded="full" style={{ background: 'white' }} />
        </Box>
        <Container>
          <Flex align="center" justify="space-between" gap={6} position="relative" zIndex={2}>
            <VStack align="start" spacing={4} flex={1}>
              <Badge bg="white" color="#7c3aed" fontSize="xs" fontWeight="800" px={3} py={1} textTransform="uppercase">
                🎁 {t('promotions.limitedTime')}
              </Badge>
              <Heading size="xl" color="white" fontWeight="900" lineHeight={1.1}>
                {t('promotions.firstOrderSpecial')}
              </Heading>
              <HStack spacing={1} align="baseline">
                <Text color="white" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="900">15%</Text>
                <Text color="white" opacity={0.95} fontSize={{ base: 'sm', md: 'md' }} fontWeight="600">{t('promotions.off')} {t('promotions.firstOrderSpecial')}</Text>
              </HStack>
              <Text color="white" opacity={0.9} fontSize={{ base: 'xs', md: 'sm' }}>
                {t('promotions.newWholesaleBuyers')}
              </Text>
              <Button size="md" bg="white" color="#7c3aed" fontWeight="800"
                _hover={{ bg: '#f3f4f6', transform: 'translateY(-2px)' }}
                transition="all 0.2s" mt={2}
                rightIcon={<ArrowRight size={16} />}>
                Use Code: FIRST15
              </Button>
            </VStack>
            <Flex display={{ base: 'none', lg: 'flex' }} align="center" justify="center" w="200px" h="200px"
              rounded="full" bg="rgba(255,255,255,0.12)" flexShrink={0} border="2px solid" borderColor="rgba(255,255,255,0.2)">
              <Gift size={80} color="white" opacity={0.7} />
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          CATÉGORIES — deux lignes défilables horizontalement
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Container>
          <Flex align="center" justify="space-between" mb={5}>
            <Heading size="md" fontWeight="800" style={{ color: C.primary }}>
              {t('categories.title')}
            </Heading>
            <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
              color={C.text} _hover={{ color: C.accent, bg: 'transparent' }}
              rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/catalog')}>
              {t('common.seeAll')}
            </Button>
          </Flex>

          <Box
            display="grid"
            style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(2, 1fr)' }}
            sx={{
              gridAutoColumns: { base: '116px', sm: '138px', md: '160px' },
              '&::-webkit-scrollbar': { display: 'none' },
            }}
            gap={{ base: 2, md: 4 }}
            overflowX="auto"
            pb={1}
            scrollbarWidth="none"
          >
            {orderedCategories.map((cat) => (
              <CategoryTile key={cat.id} category={cat} onClick={() => navigate(`/catalog?category=${cat.id}`)} />
            ))}
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          RÉFÉRENCES DOMINANTES — Grid + Carousel for market leaders
      ══════════════════════════════════════════════════════════════ */}
      {(loadingLeaders || marketLeaders.length > 0) && (
        <>
          <Box bg="white" py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
            <Container>
              <Flex align="center" justify="space-between" mb={5}>
                <HStack spacing={3}>
                  <Heading size="md" fontWeight="800" style={{ color: C.primary }}>
                    {t('sections.marketLeaders')}
                  </Heading>
                  <Box rounded="md" px={2.5} py={1} style={{ background: `${C.accent}15`, border: `1px solid ${C.accentBorder}` }}>
                    <Text fontSize="10px" fontWeight="700" style={{ color: C.accent }}>Top Rated</Text>
                  </Box>
                </HStack>
                <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
                  color={C.text} _hover={{ color: C.accent, bg: 'transparent' }}
                  rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/catalog')}>
                  {t('common.seeAll')}
                </Button>
              </Flex>
              <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
                {loadingLeaders
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <Box key={i} rounded="lg" overflow="hidden" border="1px solid" borderColor={C.border}>
                        <Skeleton h="160px" /><Box p={3}><Skeleton h="10px" mb={2} /><Skeleton h="10px" w="60%" /></Box>
                      </Box>
                    ))
                  : marketLeaders.slice(0, 10).map((p) => <MarketLeaderCard key={p.id} product={p} />)}
              </SimpleGrid>
            </Container>
          </Box>

          {/* Carousel view for additional leaders */}
          <Box bg={C.bgAlt} py={7} style={{ borderBottom: `1px solid ${C.border}` }}>
            <Container>
              <Heading size="sm" fontWeight="800" mb={5} style={{ color: C.primary }}>
                {t('sections.marketLeaders')}
              </Heading>
              <Flex gap={3} overflowX="auto" pb={1}
                style={{ scrollbarWidth: 'none' }} sx={{ '&::-webkit-scrollbar': { display: 'none' } }}>
                {loadingLeaders
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <Box key={i} flexShrink={0} w="192px" rounded="lg" overflow="hidden"
                        border="1px solid" borderColor={C.border}>
                        <Skeleton h="155px" /><Box p={3}><Skeleton h="10px" mb={2} /><Skeleton h="10px" w="60%" /></Box>
                      </Box>
                    ))
                  : marketLeaders.slice(10).map((p) => <MarketLeaderCard key={p.id} product={p} />)}
              </Flex>
            </Container>
          </Box>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          NEW ARRIVALS — Latest products added to the platform
      ══════════════════════════════════════════════════════════════ */}
      {(loadingNew || newArrivals.length > 0) && (
        <Box bg="white" py={7} style={{
          borderBottom: `1px solid ${C.border}`,
          borderTop: `4px solid #0284c7`
        }}>
          <Container>
            <Flex align="center" justify="space-between" mb={5}>
              <HStack spacing={3}>
                <Heading size="md" fontWeight="800" style={{
                  background: `linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  🆕 {t('sections.partnerBrands')}
                </Heading>
                <Box rounded="md" px={2.5} py={1} style={{ background: '#e0f2fe', border: '1px solid #06b6d4' }}>
                  <Text fontSize="10px" fontWeight="700" style={{ color: '#0284c7' }}>{t('promotions.limitedTime')}</Text>
                </Box>
              </HStack>
              <Button variant="ghost" size="sm" fontWeight="600" fontSize="sm"
                color={C.text} _hover={{ color: C.accent, bg: 'transparent' }}
                rightIcon={<ChevronRight size={13} />} onClick={() => navigate('/catalog')}>
                {t('common.seeAll')}
              </Button>
            </Flex>
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing={4}>
              {loadingNew
                ? Array.from({ length: 10 }).map((_, i) => (
                    <Box key={i} rounded="lg" overflow="hidden" border="1px solid" borderColor={C.border}>
                      <Skeleton h="160px" /><Box p={3}><Skeleton h="10px" mb={2} /><Skeleton h="10px" w="60%" /></Box>
                    </Box>
                  ))
                : newArrivals.slice(0, 10).map((p) => <PromoCard key={p.id} product={p} />)}
            </SimpleGrid>
          </Container>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          WHO WE SERVE — Specific business segments with images
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={{ base: 6, md: 8 }} style={{
        borderBottom: `3px solid ${C.warning}`,
        borderTop: `4px solid ${C.accent}`
      }}>
        <Container>
          <VStack spacing={3} mb={8} textAlign="center" align="center">
            <Heading size="lg" fontWeight="900"
              style={{
                background: `linear-gradient(135deg, ${C.warning} 0%, ${C.accent} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
              🎯 {t('homepage.builtForProfessionals')}
            </Heading>
            <Text fontSize="sm" color={C.text} maxW="650px">
              {t('homepage.builtDesc')}
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 2, sm: 3, lg: 4 }} spacing={{ base: 3, md: 4 }}>
            {[
              { icon: ShoppingCart, title: t('homepage.groceryShops'), desc: t('homepage.retailEssentials'), img: 'https://images.pexels.com/photos/3962286/pexels-photo-3962286.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Utensils, title: t('homepage.bakeryPastry'), desc: t('homepage.freshDaily'), img: 'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: UtensilsCrossed, title: t('homepage.restaurants'), desc: t('homepage.bulkSupplies'), img: 'https://images.pexels.com/photos/1108117/pexels-photo-1108117.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Coffee, title: t('homepage.cafes'), desc: t('homepage.beverageSolutions'), img: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Building2, title: t('homepage.hotels'), desc: t('homepage.volumeOrders'), img: 'https://images.pexels.com/photos/3992816/pexels-photo-3992816.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Pill, title: t('homepage.parapharmacies'), desc: t('homepage.supplementsCosmetics'), img: 'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Store, title: t('homepage.supermarkets'), desc: t('homepage.highVolume'), img: 'https://images.pexels.com/photos/3962282/pexels-photo-3962282.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Truck, title: t('homepage.wholesalers'), desc: t('homepage.bulkDistribution'), img: 'https://images.pexels.com/photos/3961964/pexels-photo-3961964.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Building, title: t('homepage.healthcare'), desc: t('homepage.hospitalSupplies'), img: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: BookOpen, title: t('homepage.schools'), desc: t('homepage.institutionalCatering'), img: 'https://images.pexels.com/photos/3768000/pexels-photo-3768000.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Navigation, title: t('homepage.foodTrucks'), desc: t('homepage.mobileFoodService'), img: 'https://images.pexels.com/photos/2543269/pexels-photo-2543269.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { icon: Handshake, title: t('homepage.cooperatives'), desc: t('homepage.memberBasedBuying'), img: 'https://images.pexels.com/photos/4550745/pexels-photo-4550745.jpeg?auto=compress&cs=tinysrgb&w=600' },
            ].map(({ icon: IconComponent, title, desc, img }, i) => (
              <Box key={i} rounded="lg" overflow="hidden" bg="white"
                border="2px solid" borderColor={C.primary}
                _hover={{ shadow: 'xl', transform: 'translateY(-4px)' }}
                transition="all 0.2s" cursor="pointer" minH="280px" display="flex" flexDirection="column">
                <Box h="160px" w="full" overflow="hidden" position="relative" bg={C.bgAlt}>
                  <Image src={img} alt={title} w="full" h="full" objectFit="cover"
                    loading="lazy" onError={(e) => e.currentTarget.style.display = 'none'}
                    _hover={{ transform: 'scale(1.05)' }} transition="transform 0.3s" />
                  <Box position="absolute" inset={0} style={{
                    background: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, ${C.primary}40)`
                  }} />
                  <Flex position="absolute" top={4} left={4} w={10} h={10} rounded="lg" align="center" justify="center" bg="white" shadow="md">
                    <IconComponent size={24} color={C.primary} />
                  </Flex>
                </Box>
                <VStack spacing={1} p={4} flex={1} justify="flex-start">
                  <Text fontSize="sm" fontWeight="900" color={C.primary} textAlign="center">{title}</Text>
                  <Text fontSize="xs" fontWeight="500" color={C.textMuted} textAlign="center">{desc}</Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          FOR BUYERS — Dual Value Prop
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={9} style={{
        borderBottom: `1px solid ${C.border}`,
        borderTop: `4px solid ${C.success}`
      }}>
        <Container>
          <VStack spacing={2} mb={8} align="center" textAlign="center">
            <Badge bg={C.success} color="white" fontSize="xs" fontWeight="700" px={3} py={1}>
              {t('homepage.forProfessionalBuyers')}
            </Badge>
            <Heading size="lg" fontWeight="900" style={{
              background: `linear-gradient(135deg, ${C.success} 0%, #059669 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('homepage.forRetailers')}
            </Heading>
            <Text fontSize="sm" color={C.text} maxW="600px">
              {t('homepage.forRetailersDesc')}
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            <VStack align="start" spacing={4}>
              <Heading size="md" fontWeight="700" color={C.primary}>{t('homepage.stopUsingOneApp')}</Heading>
              <Text color={C.text} fontSize="sm">
                {t('homepage.stopDesc')}
              </Text>
              <VStack align="start" spacing={3} mt={2}>
                <HStack spacing={2}>
                  <CheckCircle size={16} color="#059669" />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.oneCatalog')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <CheckCircle size={16} color="#059669" />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.comparePrices')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <CheckCircle size={16} color="#059669" />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.trackOrders')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <CheckCircle size={16} color="#059669" />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.consolidateInvoicing')}</Text>
                </HStack>
              </VStack>
            </VStack>
            <VStack align="start" spacing={4}>
              <Heading size="md" fontWeight="700" color={C.primary}>{t('homepage.accessRealWholesale')}</Heading>
              <Text color={C.text} fontSize="sm">
                {t('homepage.accessDesc')}
              </Text>
              <VStack align="start" spacing={3} mt={2}>
                <HStack spacing={2}>
                  <TrendingDown size={16} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.bulkTiers')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <TrendingDown size={16} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.samePrice')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <TrendingDown size={16} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.noHiddenMarkups')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <TrendingDown size={16} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.directFromSellers')}</Text>
                </HStack>
              </VStack>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          FOR SELLERS — Dual section: Visibility + Destocking
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={C.bgAlt} py={9} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Container>
          <Heading size="lg" fontWeight="800" textAlign="center" mb={8} color={C.primary}>
            {t('homepage.forManufacturers')}
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
            <Box p={6} rounded="lg" bg="white" border="2px solid" borderColor={C.border}>
              <HStack spacing={3} mb={4}>
                <Flex w={10} h={10} rounded="lg" align="center" justify="center"
                  style={{ background: '#06b6d440' }}>
                  <Eye size={20} color="#06b6d4" />
                </Flex>
                <Heading size="md" fontWeight="700" color={C.primary}>{t('homepage.seeYourMarket')}</Heading>
              </HStack>
              <Text color={C.text} fontSize="sm" mb={4}>
                {t('homepage.seeYourMarketDesc')}
              </Text>
              <VStack align="start" spacing={2}>
                <HStack spacing={2}>
                  <Star size={14} fill={C.accent} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.referencingMap')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Star size={14} fill={C.accent} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.competitorTracked')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Star size={14} fill={C.accent} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.promotionExecution')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Star size={14} fill={C.accent} color={C.accent} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('homepage.newOpportunities')}</Text>
                </HStack>
              </VStack>
            </Box>
            <Box p={6} rounded="lg" bg="white" border="2px solid" borderColor={C.warningBorder}>
              <HStack spacing={3} mb={4}>
                <Flex w={10} h={10} rounded="lg" align="center" justify="center"
                  style={{ background: '#f5391640' }}>
                  <Zap size={20} color={C.warning} />
                </Flex>
                <Heading size="md" fontWeight="700" color={C.primary}>{t('destocking.title')}</Heading>
              </HStack>
              <Text color={C.text} fontSize="sm" mb={4}>
                {t('destocking.description')}
              </Text>
              <VStack align="start" spacing={2}>
                <HStack spacing={2}>
                  <Zap size={14} fill={C.warning} color={C.warning} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('destocking.oneClick')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Zap size={14} fill={C.warning} color={C.warning} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('destocking.automaticAlerts')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Zap size={14} fill={C.warning} color={C.warning} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('destocking.recoverValue')}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Zap size={14} fill={C.warning} color={C.warning} />
                  <Text fontSize="sm" fontWeight="500" color={C.primary}>{t('destocking.zeroWaste')}</Text>
                </HStack>
              </VStack>
            </Box>
          </SimpleGrid>
          <Box p={6} rounded="lg" bg={`linear-gradient(135deg, #dbeafe 0%, #fef3c7 100%)`}
            border="2px solid" borderColor={C.accentBorder}>
            <HStack spacing={3} mb={3}>
              <Flex w={10} h={10} rounded="lg" align="center" justify="center"
                style={{ background: C.primary }}>
                <Text fontWeight="800" fontSize="lg" color="white">0%</Text>
              </Flex>
              <Heading size="md" fontWeight="700" color={C.primary}>{t('commission.zeroCommission')}</Heading>
            </HStack>
            <Text color={C.text} fontSize="sm">
              {t('commission.description')}
            </Text>
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          SELLER RECRUITMENT CTA BANNER
      ══════════════════════════════════════════════════════════════ */}
      <Box
        bg={`linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)`}
        py={{ base: 8, md: 12 }}
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" top={-50} right={-50} w="300px" h="300px"
          rounded="full" opacity={0.1} style={{ background: 'white' }} />
        <Container>
          <Flex align="center" justify="space-between" gap={8} position="relative" zIndex={2}>
            <VStack align="start" spacing={4} flex={1}>
              <Badge bg="white" color="#7c3aed" fontSize="sm" fontWeight="700" px={3} py={1}>
                💼 {t('sellerCTA.title')}
              </Badge>
              <Heading size="lg" color="white" fontWeight="800">
                {t('sellerCTA.title')}
              </Heading>
              <Text color="white" opacity={0.95} fontSize={{ base: 'sm', md: 'md' }} fontWeight="500">
                {t('sellerCTA.description')}
              </Text>
              <Button size="md" bg="white" color="#7c3aed" fontWeight="700"
                _hover={{ bg: 'gray.100' }}>
                {t('sellerCTA.title')}
              </Button>
            </VStack>
            <Box display={{ base: 'none', md: 'block' }} textAlign="right">
              <VStack spacing={4} align="end">
                <HStack spacing={2}>
                  <Award size={24} color="white" />
                  <VStack spacing={0} align="start">
                    <Text fontWeight="700" color="white" fontSize="sm">{t('sellerCTA.verifiedBadge')}</Text>
                    <Text fontSize="xs" color="white" opacity={0.8}>{t('sellerCTA.fullCredibility')}</Text>
                  </VStack>
                </HStack>
                <HStack spacing={2}>
                  <Eye size={24} color="white" />
                  <VStack spacing={0} align="start">
                    <Text fontWeight="700" color="white" fontSize="sm">{t('sellerCTA.marketIntel')}</Text>
                    <Text fontSize="xs" color="white" opacity={0.8}>{t('sellerCTA.seeRealtime')}</Text>
                  </VStack>
                </HStack>
              </VStack>
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          THE CHALLENGE & SOLUTION — Deep dive (at bottom for engaged readers)
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={`linear-gradient(135deg, #fee2e2 0%, #fef3c7 100%)`} py={9}
        style={{ borderBottom: `3px solid ${C.warning}` }}>
        <Container>
          <VStack spacing={8} align="start">
            <VStack spacing={2} align="start">
              <Badge bg={C.warning} color="white" fontSize="xs" fontWeight="700" px={3} py={1}>
                {t('challenge.title')}
              </Badge>
              <Heading size="lg" fontWeight="900" color={C.warning}>
                {t('challenge.heading')}
              </Heading>
              <Text fontSize="md" color={C.text} maxW="600px">
                {t('challenge.description')}
              </Text>
            </VStack>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} w="full">
              <Box p={5} rounded="lg" bg="white" border="2px solid" borderColor={C.warningBorder}
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Heading size="sm" fontWeight="800" color={C.warning} mb={3}>👷 {t('challenge.supplier')}</Heading>
                <Text fontSize="sm" color={C.text}>
                  {t('challenge.supplierQuote')}
                </Text>
              </Box>
              <Box p={5} rounded="lg" bg="white" border="2px solid" borderColor={C.warningBorder}
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Heading size="sm" fontWeight="800" color={C.warning} mb={3}>🏢 {t('challenge.brand')}</Heading>
                <Text fontSize="sm" color={C.text}>
                  {t('challenge.brandQuote')}
                </Text>
              </Box>
              <Box p={5} rounded="lg" bg="white" border="2px solid" borderColor={C.warningBorder}
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <Heading size="sm" fontWeight="800" color={C.warning} mb={3}>🛒 {t('challenge.buyer')}</Heading>
                <Text fontSize="sm" color={C.text}>
                  {t('challenge.buyerQuote')}
                </Text>
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          OUR SOLUTION — How we fix it
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={`linear-gradient(135deg, #dcfce7 0%, #e0f2fe 100%)`} py={9}
        style={{ borderBottom: `3px solid ${C.success}` }}>
        <Container>
          <VStack spacing={8} align="start">
            <VStack spacing={2} align="start">
              <Badge bg={C.success} color="white" fontSize="xs" fontWeight="700" px={3} py={1}>
                ✅ {t('solution.title')}
              </Badge>
              <Heading size="lg" fontWeight="900" color={C.success}>
                {t('solution.heading')}
              </Heading>
              <Text fontSize="md" color={C.text} maxW="600px">
                {t('solution.description')}
              </Text>
            </VStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} w="full">
              <Box p={4} rounded="lg" bg="white" border="2px solid" borderColor={`${C.success}40`}
                _hover={{ shadow: 'md', borderColor: C.success }} transition="all 0.2s">
                <HStack spacing={3} mb={2}>
                  <Flex w={8} h={8} rounded="lg" align="center" justify="center"
                    style={{ background: '#10b98140' }}>
                    <CheckCircle size={18} color={C.success} />
                  </Flex>
                  <Heading size="xs" fontWeight="800" color={C.success}>{t('solution.truePricing')}</Heading>
                </HStack>
                <Text fontSize="sm" color={C.text}>{t('solution.truePricingDesc')}</Text>
              </Box>
              <Box p={4} rounded="lg" bg="white" border="2px solid" borderColor="#06b6d440"
                _hover={{ shadow: 'md', borderColor: '#06b6d4' }} transition="all 0.2s">
                <HStack spacing={3} mb={2}>
                  <Flex w={8} h={8} rounded="lg" align="center" justify="center"
                    style={{ background: '#06b6d440' }}>
                    <Truck size={18} color="#06b6d4" />
                  </Flex>
                  <Heading size="xs" fontWeight="800" color="#06b6d4">{t('solution.verifiedSellers')}</Heading>
                </HStack>
                <Text fontSize="sm" color={C.text}>{t('solution.verifiedSellersDesc')}</Text>
              </Box>
              <Box p={4} rounded="lg" bg="white" border="2px solid" borderColor="#f5951640"
                _hover={{ shadow: 'md', borderColor: '#f59516' }} transition="all 0.2s">
                <HStack spacing={3} mb={2}>
                  <Flex w={8} h={8} rounded="lg" align="center" justify="center"
                    style={{ background: '#f5951640' }}>
                    <Package size={18} color="#f59516" />
                  </Flex>
                  <Heading size="xs" fontWeight="800" color="#f59516">{t('solution.traceableLots')}</Heading>
                </HStack>
                <Text fontSize="sm" color={C.text}>{t('solution.traceableLotsDesc')}</Text>
              </Box>
              <Box p={4} rounded="lg" bg="white" border="2px solid" borderColor="#8b5cf640"
                _hover={{ shadow: 'md', borderColor: '#8b5cf6' }} transition="all 0.2s">
                <HStack spacing={3} mb={2}>
                  <Flex w={8} h={8} rounded="lg" align="center" justify="center"
                    style={{ background: '#8b5cf640' }}>
                    <Eye size={18} color="#8b5cf6" />
                  </Flex>
                  <Heading size="xs" fontWeight="800" color="#8b5cf6">{t('solution.marketIntel')}</Heading>
                </HStack>
                <Text fontSize="sm" color={C.text}>{t('solution.marketIntelDesc')}</Text>
              </Box>
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          CTA NEWSLETTER — Engagement section (just before footer)
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={`linear-gradient(135deg, ${C.primary} 0%, ${C.primaryLight} 100%)`} py={9}
        style={{ borderBottom: `3px solid ${C.accent}` }}>
        <Container>
          <VStack spacing={5} align="center" textAlign="center">
            <VStack spacing={2}>
              <Heading size="lg" color="white" fontWeight="800">
                {t('newsletter.title')}
              </Heading>
              <Text color="white" opacity={0.9} fontSize={{ base: 'sm', md: 'md' }}>
                {t('newsletter.description')}
              </Text>
            </VStack>
            <Flex maxW="400px" w="full" gap={2}>
              <input
                type="email"
                placeholder={t('newsletter.placeholder')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <Button size="sm" bg={C.accent} color="white" fontWeight="700"
                _hover={{ opacity: 0.9 }}>
                {t('newsletter.subscribe')}
              </Button>
            </Flex>
            <Text fontSize="xs" color="white" opacity={0.7}>
              {t('newsletter.noSpam')}
            </Text>
          </VStack>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — Process flow visualization (at bottom for engaged readers)
      ══════════════════════════════════════════════════════════════ */}
      <Box bg="white" py={9} style={{
        borderBottom: `1px solid ${C.border}`,
        borderTop: `4px solid ${C.primary}`
      }}>
        <Container>
          <VStack spacing={8} align="center" textAlign="center" mb={8}>
            <VStack spacing={3}>
              <Badge bg={C.primary} color={C.accent} fontSize="xs" fontWeight="700" px={3} py={1}>
                {t('process.title')}
              </Badge>
              <Heading size="lg" fontWeight="900" style={{
                background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryMid} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>{t('process.heading')}</Heading>
              <Text fontSize="md" color={C.text} maxW="600px">
                {t('process.description')}
              </Text>
            </VStack>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            <ProcessStep
              number={1}
              icon={Globe}
              title={t('process.step1')}
              description={t('process.step1Desc')}
            />
            <ProcessStep
              number={2}
              icon={ShieldCheck}
              title={t('process.step2')}
              description={t('process.step2Desc')}
            />
            <ProcessStep
              number={3}
              icon={Star}
              title={t('process.step3')}
              description={t('process.step3Desc')}
            />
            <ProcessStep
              number={4}
              icon={TrendingDown}
              title={t('process.step4')}
              description={t('process.step4Desc')}
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          KEY FEATURES — Why choose Stock212 (at bottom)
      ══════════════════════════════════════════════════════════════ */}
      <Box bg={C.bgLight} py={9} style={{
        borderBottom: `1px solid ${C.border}`,
        borderTop: `4px solid ${C.warning}`
      }}>
        <Container>
          <VStack spacing={3} mb={8} align="center" textAlign="center">
            <Badge bg={C.warning} color="white" fontSize="xs" fontWeight="700" px={3} py={1}>
              {t('features.title')}
            </Badge>
            <Heading size="lg" fontWeight="900" style={{
              background: `linear-gradient(135deg, ${C.warning} 0%, ${C.orange} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('features.heading')}
            </Heading>
            <Text fontSize="md" color={C.text} maxW="600px">
              {t('features.description')}
            </Text>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <FeatureCard
              icon={CheckCircle}
              title={t('features.verifiedSellers')}
              description={t('features.verifiedSellersDesc')}
              bgColor={`#10b98110`}
              accentColor="#10b981"
            />
            <FeatureCard
              icon={Snowflake}
              title={t('features.freshGuarantee')}
              description={t('features.freshGuaranteeDesc')}
              bgColor={`#06b6d410`}
              accentColor="#06b6d4"
            />
            <FeatureCard
              icon={TrendingDown}
              title={t('features.bulkDiscounts')}
              description={t('features.bulkDiscountsDesc')}
              bgColor={`#f5951610`}
              accentColor="#f59516"
            />
            <FeatureCard
              icon={Globe}
              title={t('features.wideNetwork')}
              description={t('features.wideNetworkDesc')}
              bgColor={`#8b5cf610`}
              accentColor="#8b5cf6"
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════════════════════
          RÉASSURANCE — une ligne, pas une section — dernière section avant le footer
          Masquée sur mobile : redondant juste au-dessus de la nav basse.
      ══════════════════════════════════════════════════════════════ */}
      <Box style={{ background: C.bgLight }} display={{ base: 'none', md: 'block' }}>
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
                  <Icon size={14} color={C.accent} />
                  <Text fontSize="xs" fontWeight="600" style={{ color: C.text }}>{label}</Text>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}

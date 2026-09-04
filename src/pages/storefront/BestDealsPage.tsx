import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Text, VStack, HStack, SimpleGrid,
  Badge, Image, Button, Tabs, TabList, Tab, TabPanels, TabPanel,
  Skeleton, useToast,
} from '@chakra-ui/react';
import { TrendingDown, Clock, ShoppingCart, Lock, ArrowRight, Package, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { addToCart as addToCartShared } from '../../lib/cart';
import { lowestTierPrice } from '../../lib/pricing';
import type { Product, Promotion, Organisation } from '../../types';

export default function BestDealsPage() {
  const navigate = useNavigate();
  const { activeOrg } = useAuth();
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [destockDeals, setDestockDeals] = useState<{ product: Product; promo: Promotion }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [promoRes, flashRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, organisations(name), price_tiers(*)')
          .eq('status', 'active')
          .eq('is_on_promotion', true)
          .limit(16),
        supabase
          .from('promotions')
          .select('*')
          .eq('active', true)
          .gte('ends_at', new Date().toISOString())
          .lte('ends_at', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()),
      ]);
      setPromoProducts((promoRes.data as Product[]) ?? []);

      // Déstockage : on rapatrie les produits ciblés par les promotions actives
      // pour les afficher en cartes (image + prix), comme l'onglet "En promotion".
      const flash = (flashRes.data as Promotion[]) ?? [];
      const pids = [...new Set(flash.flatMap((p) => p.product_ids ?? []))];
      let deals: { product: Product; promo: Promotion }[] = [];
      if (pids.length) {
        const { data: prods } = await supabase
          .from('products')
          .select('*, organisations(name), price_tiers(*)')
          .in('id', pids)
          .eq('status', 'active');
        const byId = new Map((prods as Product[] ?? []).map((p) => [p.id, p]));
        deals = flash
          .map((promo) => {
            const pid = (promo.product_ids ?? [])[0];
            const product = pid ? byId.get(pid) : undefined;
            return product ? { product, promo } : null;
          })
          .filter((d): d is { product: Product; promo: Promotion } => d !== null);
      }
      setDestockDeals(deals);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <VStack spacing={6} align="stretch">
      {/* Bannière accès restreint — remplace le gradient orange/red B2C */}
      {!activeOrg && (
        <Box
          bg="white"
          border="1px"
          borderColor="gray.200"
          rounded="md"
          p={4}
        >
          <Flex align="center" justify="space-between" gap={4} flexWrap="wrap">
            <HStack spacing={3}>
              <Flex
                w={8} h={8}
                bg="blue.50"
                border="1px" borderColor="blue.200"
                rounded="sm"
                align="center" justify="center"
                flexShrink={0}
              >
                <Lock size={15} color="var(--chakra-colors-blue-700)" />
              </Flex>
              <Box>
                <Text fontWeight="600" color="gray.800" fontSize="sm">
                  Accès réservé aux membres qualifiés
                </Text>
                <Text color="gray.500" fontSize="xs" lineHeight={1.5}>
                  Les conditions tarifaires sont visibles après qualification de votre dossier professionnel.
                </Text>
              </Box>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme="blue"
                rounded="md"
                rightIcon={<ArrowRight size={13} />}
                onClick={() => navigate('/auth')}
                bg="blue.800"
                _hover={{ bg: 'blue.700' }}
                fontSize="xs"
                fontWeight="600"
              >
                Déposer mon dossier
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="blue"
                rounded="md"
                fontSize="xs"
                onClick={() => navigate('/auth')}
              >
                Se connecter
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}

      <Tabs variant="line">
        <TabList borderBottom="2px" borderColor="gray.100">
          {/* En promotion → orange */}
          <Tab
            fontSize="sm" fontWeight="600" pb={3}
            color="gray.500"
            _selected={{ color: '#c2410c', borderColor: '#ea580c', fontWeight: '700' }}
            _hover={{ color: '#ea580c' }}
          >
            <HStack spacing={2}><TrendingDown size={13} /><Text>En promotion</Text></HStack>
          </Tab>
          {/* Déstockage → violet */}
          <Tab
            fontSize="sm" fontWeight="600" pb={3}
            color="gray.500"
            _selected={{ color: '#6d28d9', borderColor: '#7c3aed', fontWeight: '700' }}
            _hover={{ color: '#7c3aed' }}
          >
            <HStack spacing={2}>
              <Clock size={13} />
              <Text>Déstockage</Text>
              {destockDeals.length > 0 && (
                <Badge colorScheme="purple" rounded="sm" fontSize="10px">{destockDeals.length}</Badge>
              )}
            </HStack>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={5}>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} h="200px" rounded="md" />
                  ))
                : promoProducts.map((p) => (
                    <DealCard key={p.id} product={p} activeOrg={activeOrg} />
                  ))}
              {!loading && promoProducts.length === 0 && (
                <Box gridColumn="1/-1" textAlign="center" py={12} color="gray.400">
                  <Flex
                    w={12} h={12} bg="gray.50" border="1px" borderColor="gray.200"
                    rounded="md" align="center" justify="center" mx="auto" mb={3}
                  >
                    <Tag size={22} color="var(--chakra-colors-gray-400)" />
                  </Flex>
                  <Text fontSize="sm" color="gray.500" fontWeight="500">
                    Aucune offre promotionnelle active pour le moment.
                  </Text>
                </Box>
              )}
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0} pt={5}>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} h="200px" rounded="md" />
                  ))
                : destockDeals.map(({ product, promo }) => (
                    <DestockCard key={promo.id} product={product} promo={promo} activeOrg={activeOrg} />
                  ))}
              {!loading && destockDeals.length === 0 && (
                <Box gridColumn="1/-1" textAlign="center" py={12} color="gray.400">
                  <Flex
                    w={12} h={12} bg="gray.50" border="1px" borderColor="gray.200"
                    rounded="md" align="center" justify="center" mx="auto" mb={3}
                  >
                    <Clock size={22} color="var(--chakra-colors-gray-400)" />
                  </Flex>
                  <Text fontSize="sm" color="gray.500" fontWeight="500">
                    Aucune offre de déstockage en cours.
                  </Text>
                </Box>
              )}
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}

function DealCard({ product, activeOrg }: { product: Product; activeOrg: Organisation | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [addingToCart, setAddingToCart] = useState(false);
  const isAuthenticated = !!activeOrg;
  const bestPrice = product.price_tiers?.slice().sort((a, b) => a.qty_min - b.qty_min)[0];

  async function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeOrg || addingToCart) return;
    const price = lowestTierPrice(product.price_tiers);
    if (!price) return;
    setAddingToCart(true);
    const { error } = await addToCartShared({
      buyerOrgId: activeOrg.id,
      productId: product.id,
      quantity: product.moq,
      unitPrice: price,
    });
    if (error) {
      toast({ title: 'Erreur', description: error, status: 'error', duration: 4000, position: 'bottom-right' });
    } else {
      toast({ title: 'Ajouté au panier', description: product.name, status: 'success', duration: 2500, position: 'bottom-right' });
    }
    setAddingToCart(false);
  }

  return (
    <Box
      bg="white"
      rounded="md"
      overflow="hidden"
      border="1px"
      borderColor="gray.200"
      _hover={{ borderColor: 'blue.200', bg: 'blue.50' }}
      transition="border-color 0.15s, background 0.15s"
      cursor="pointer"
      onClick={() => navigate(`/product/${product.id}`)}
      position="relative"
    >
      {/* Badge promotion */}
      <Badge
        position="absolute" top={2} left={2}
        colorScheme="orange"
        rounded="sm"
        px={2} py={0.5}
        zIndex={1}
        fontSize="10px"
        fontWeight="700"
        textTransform="uppercase"
        letterSpacing="0.05em"
      >
        Promo
      </Badge>

      <Box h="150px" bg="gray.50" borderBottom="1px" borderColor="gray.100">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} w="full" h="full" objectFit="cover" />
        ) : (
          <Flex w="full" h="full" align="center" justify="center" bg="gray.50">
            <Package size={28} color="var(--chakra-colors-gray-300)" />
          </Flex>
        )}
      </Box>

      <Box p={3}>
        <Text fontSize="10px" color="gray.400" noOfLines={1} mb={0.5} textTransform="uppercase"
          letterSpacing="0.04em">
          {product.organisations?.name}
        </Text>
        <Text fontWeight="600" fontSize="sm" color="gray.800" noOfLines={2} mb={3} lineHeight={1.4}>
          {product.name}
        </Text>

        {isAuthenticated ? (
          <Flex justify="space-between" align="center">
            <Box>
              {bestPrice ? (
                <Text fontWeight="700" color="blue.800" fontSize="md" fontFamily="mono">
                  {bestPrice.unit_price.toFixed(2)} {product.currency}
                </Text>
              ) : (
                <Text fontSize="xs" color="gray.400" fontStyle="italic">Sur devis</Text>
              )}
            </Box>
            <Button
              size="xs"
              colorScheme="blue"
              rounded="sm"
              leftIcon={<ShoppingCart size={11} />}
              bg="blue.800"
              _hover={{ bg: 'blue.700' }}
              fontSize="10px"
              isLoading={addingToCart}
              isDisabled={!bestPrice}
              onClick={handleAddToCart}
            >
              Commander
            </Button>
          </Flex>
        ) : (
          <Box
            bg="gray.50"
            border="1px"
            borderColor="gray.200"
            rounded="sm"
            p={2.5}
            textAlign="center"
            cursor="pointer"
            onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
            _hover={{ bg: 'blue.50', borderColor: 'blue.200' }}
            transition="all 0.1s"
          >
            <HStack justify="center" spacing={1.5}>
              <Lock size={11} color="var(--chakra-colors-gray-500)" />
              <Text fontSize="11px" fontWeight="500" color="gray.600">
                Accéder aux conditions tarifaires
              </Text>
            </HStack>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function DestockCard({
  product, promo, activeOrg,
}: { product: Product; promo: Promotion; activeOrg: Organisation | null }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [addingToCart, setAddingToCart] = useState(false);
  const isAuthenticated = !!activeOrg;
  const bestPrice = product.price_tiers?.slice().sort((a, b) => a.qty_min - b.qty_min)[0];
  const discounted =
    bestPrice && promo.promo_type === 'percentage'
      ? bestPrice.unit_price * (1 - Number(promo.discount_value) / 100)
      : null;

  async function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    if (!activeOrg || !bestPrice || addingToCart) return;
    setAddingToCart(true);
    const { error } = await addToCartShared({
      buyerOrgId: activeOrg.id,
      productId: product.id,
      quantity: product.moq,
      unitPrice: discounted ?? bestPrice.unit_price,
    });
    if (error) {
      toast({ title: 'Erreur', description: error, status: 'error', duration: 4000, position: 'bottom-right' });
    } else {
      toast({ title: 'Ajouté au panier', description: product.name, status: 'success', duration: 2500, position: 'bottom-right' });
    }
    setAddingToCart(false);
  }

  return (
    <Box
      bg="white" rounded="md" overflow="hidden" border="1px" borderColor="gray.200"
      _hover={{ borderColor: 'purple.200', bg: 'purple.50' }}
      transition="border-color 0.15s, background 0.15s"
      cursor="pointer"
      onClick={() => navigate(`/product/${product.id}`)}
      position="relative"
    >
      {/* Badge déstockage */}
      <Badge
        position="absolute" top={2} left={2}
        colorScheme="purple" rounded="sm" px={2} py={0.5} zIndex={1}
        fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.05em"
      >
        Déstockage
      </Badge>

      <Box h="150px" bg="gray.50" borderBottom="1px" borderColor="gray.100">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} w="full" h="full" objectFit="cover" />
        ) : (
          <Flex w="full" h="full" align="center" justify="center" bg="gray.50">
            <Package size={28} color="var(--chakra-colors-gray-300)" />
          </Flex>
        )}
      </Box>

      <Box p={3}>
        <Text fontSize="10px" color="gray.400" noOfLines={1} mb={0.5} textTransform="uppercase"
          letterSpacing="0.04em">
          {product.organisations?.name}
        </Text>
        <Text fontWeight="600" fontSize="sm" color="gray.800" noOfLines={2} mb={2} lineHeight={1.4}>
          {product.name}
        </Text>

        {isAuthenticated ? (
          <Flex justify="space-between" align="center">
            <Box>
              {bestPrice ? (
                <HStack spacing={2} align="baseline">
                  <Text fontWeight="700" color="#6d28d9" fontSize="md" fontFamily="mono">
                    {(discounted ?? bestPrice.unit_price).toFixed(2)} {product.currency}
                  </Text>
                  {discounted != null && (
                    <Text fontSize="10px" color="gray.400" as="s" fontFamily="mono">
                      {bestPrice.unit_price.toFixed(2)}
                    </Text>
                  )}
                </HStack>
              ) : (
                <Text fontSize="xs" color="gray.400" fontStyle="italic">Sur devis</Text>
              )}
              <Text fontSize="10px" fontWeight="700" color="#6d28d9">
                −{promo.discount_value}%
              </Text>
            </Box>
            <Button
              size="xs" colorScheme="purple" rounded="sm"
              leftIcon={<ShoppingCart size={11} />}
              bg="#6d28d9" _hover={{ bg: '#5b21b6' }} fontSize="10px"
              isLoading={addingToCart}
              isDisabled={!bestPrice}
              onClick={handleAddToCart}
            >
              Commander
            </Button>
          </Flex>
        ) : (
          <Box
            bg="gray.50" border="1px" borderColor="gray.200" rounded="sm" p={2.5}
            textAlign="center" cursor="pointer"
            onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
            _hover={{ bg: 'purple.50', borderColor: 'purple.200' }}
            transition="all 0.1s"
          >
            <HStack justify="center" spacing={1.5}>
              <Lock size={11} color="var(--chakra-colors-gray-500)" />
              <Text fontSize="11px" fontWeight="500" color="gray.600">
                Accéder aux conditions tarifaires
              </Text>
            </HStack>
          </Box>
        )}
      </Box>
    </Box>
  );
}

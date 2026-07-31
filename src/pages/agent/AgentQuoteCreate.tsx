import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, Text, VStack, HStack, Button, Input, InputGroup,
  InputLeftElement, Select, Badge, Spinner, Table, Thead, Tbody,
  Tr, Th, Td, IconButton, Textarea, FormControl, FormLabel, useToast,
  Divider,
} from '@chakra-ui/react';
import { ArrowLeft, Search, Trash2, Package, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ClientOption { id: string; name: string }
interface ProductOption {
  id: string;
  name: string;
  images: string[] | null;
  seller_org_id: string;
}
interface QuoteLineDraft {
  product_id: string;
  name: string;
  quantity: number;
  requested_price: string; // texte pour l'input, converti au submit
}
interface RecentQuote {
  id: string;
  quote_number: string;
  status: string;
  requested_at: string;
  buyer_org_id: string;
  buyerName?: string;
}

// Permet à un agent de créer un devis au nom d'un de ses clients acheteurs,
// adressé au vendeur qu'il représente (organisation_members.team_role = 'sales_rep').
// Le vendeur n'est PAS choisi librement par l'agent : c'est celui pour lequel
// il a été désigné, afin d'éviter tout conflit d'intérêt (un agent commissionné
// par le vendeur A ne doit pas pouvoir créer de devis pour un vendeur B).
export default function AgentQuoteCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);

  const [clientId, setClientId] = useState('');

  // Vendeur représenté par l'agent — fixé, non modifiable depuis cet écran
  const [sellerId, setSellerId] = useState('');
  const [sellerName, setSellerName] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const [lines, setLines] = useState<QuoteLineDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    setLoadError('');

    const { data: membershipRows, error: membershipErr } = await supabase.rpc('get_agent_membership');
    if (membershipErr) {
      setLoadError(membershipErr.message);
      setLoading(false);
      return;
    }
    const membership = (membershipRows as Array<{
      agent_member_id: string; vendor_org_id: string; vendor_name: string; commission_rate: number | null;
    }>)?.[0];

    if (!membership) {
      setLoadError("Vous n'êtes actuellement désigné agent commercial par aucun vendeur.");
      setLoading(false);
      return;
    }
    setSellerId(membership.vendor_org_id);
    setSellerName(membership.vendor_name);

    const [portfolioRes, quotesRes] = await Promise.all([
      supabase.rpc('get_agent_portfolio'),
      supabase
        .from('quotes')
        .select('id, quote_number, status, requested_at, buyer_org_id')
        .eq('seller_org_id', membership.vendor_org_id)
        .order('requested_at', { ascending: false })
        .limit(10),
    ]);

    const firstError = portfolioRes.error || quotesRes.error;
    if (firstError) setLoadError(firstError.message);

    const buyerClients = ((portfolioRes.data as Array<{ buyer_organisation_id: string; name: string }>) ?? [])
      .map((row) => ({ id: row.buyer_organisation_id, name: row.name }));
    setClients(buyerClients);

    const nameById = new Map(buyerClients.map((c) => [c.id, c.name]));
    const quotes = ((quotesRes.data as any[]) ?? []).map((row) => ({
      ...row,
      buyerName: nameById.get(row.buyer_org_id) ?? '—',
    })) as RecentQuote[];
    setRecentQuotes(quotes);

    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  // Recherche de produits du vendeur représenté (débouncée)
  useEffect(() => {
    if (!sellerId || productSearch.trim().length < 2) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setProductLoading(true);
      const { data } = await supabase
        .from('products')
        .select('id, name, images, seller_org_id')
        .eq('seller_org_id', sellerId)
        .eq('status', 'active')
        .ilike('name', `%${productSearch}%`)
        .limit(8);
      setProductResults((data as ProductOption[]) ?? []);
      setProductLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, sellerId]);

  function addLine(p: ProductOption) {
    if (lines.some((l) => l.product_id === p.id)) return;
    setLines((prev) => [...prev, { product_id: p.id, name: p.name, quantity: 1, requested_price: '' }]);
    setProductSearch('');
    setProductResults([]);
  }

  function updateLineQty(productId: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.product_id === productId ? { ...l, quantity: Math.max(1, qty) } : l)));
  }

  function updateLinePrice(productId: string, price: string) {
    setLines((prev) => prev.map((l) => (l.product_id === productId ? { ...l, requested_price: price } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  }

  const canSubmit = clientId !== '' && sellerId !== '' && lines.length > 0 && !submitting;

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    try {
      const quoteNumber = `AG-${Date.now()}`;
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          buyer_org_id: clientId,
          seller_org_id: sellerId,
          status: 'new',
          requested_at: new Date().toISOString(),
          notes: notes || null,
        })
        .select('id')
        .single();
      if (quoteError) throw quoteError;

      const linesToInsert = lines.map((l) => ({
        quote_id: quote.id,
        product_id: l.product_id,
        product_description: l.name,
        quantity: l.quantity,
        requested_price: l.requested_price ? Number(l.requested_price) : null,
      }));
      const { error: linesError } = await supabase.from('quote_lines').insert(linesToInsert);
      if (linesError) throw linesError;

      // Trace ce devis comme une activité de suivi commercial pour l'agent
      await supabase.rpc('add_agent_activity', {
        buyer_org_id: clientId,
        p_activity_type: 'devis',
        p_note: `Devis ${quoteNumber} créé`,
        p_next_action_label: null,
        p_next_action_date: null,
      });

      toast({ title: 'Devis créé', description: quoteNumber, status: 'success', duration: 3000 });
      setClientId('');
      setLines([]);
      setNotes('');
      await load();
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const clientOptions = useMemo(
    () => clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>),
    [clients]
  );

  return (
    <Box minH="100vh" bg="gray.50">
      <Flex bg="white" borderBottom="1px" borderColor="gray.100" px={{ base: 4, md: 8 }} py={4} align="center" gap={3}>
        <IconButton
          aria-label="Retour"
          icon={<ArrowLeft size={16} />}
          size="sm"
          variant="ghost"
          onClick={() => navigate('/agent')}
        />
        <Box>
          <Text fontWeight="700" fontSize="md" color="gray.900">Nouveau devis</Text>
          <Text fontSize="xs" color="gray.400">
            {sellerName ? `Pour le compte de ${sellerName}` : "Au nom d'un client de mon portefeuille"}
          </Text>
        </Box>
      </Flex>

      <Box maxW="900px" mx="auto" px={{ base: 4, md: 8 }} py={8}>
        {!loading && loadError && (
          <Box bg="red.50" border="1px" borderColor="red.200" rounded="md" p={4} mb={5}>
            <Text fontSize="sm" color="red.700" fontWeight="medium">Erreur de chargement</Text>
            <Text fontSize="sm" color="red.600">{loadError}</Text>
          </Box>
        )}

        {!loading && !loadError && (
          <VStack align="stretch" spacing={6}>
            {clients.length === 0 && (
              <Box bg="orange.50" border="1px" borderColor="orange.200" rounded="md" p={4}>
                <Text fontSize="sm" color="orange.800">
                  Aucun client acheteur dans votre portefeuille. Recrutez d'abord un acheteur depuis votre tableau de bord.
                </Text>
              </Box>
            )}

            {/* Étape 1 — Client */}
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5}>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>1. Client</Text>
              <FormControl>
                <Select
                  size="sm"
                  placeholder="Sélectionner un client..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  isDisabled={clients.length === 0}
                >
                  {clientOptions}
                </Select>
              </FormControl>
            </Box>

            {/* Étape 2 — Vendeur (fixé, non modifiable) */}
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5}>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>2. Vendeur</Text>
              <HStack bg="blue.50" rounded="md" px={3} py={2}>
                <Text fontSize="sm" fontWeight="medium" color="blue.800">{sellerName}</Text>
                <Badge fontSize="9px" colorScheme="blue">Vous représentez ce vendeur</Badge>
              </HStack>
            </Box>

            {/* Étape 3 — Produits */}
            {sellerId && (
              <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5}>
                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>3. Produits</Text>
                <Box position="relative" mb={4}>
                  <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none"><Search size={13} color="#9CA3AF" /></InputLeftElement>
                    <Input
                      placeholder="Rechercher un produit de ce vendeur..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </InputGroup>
                  {(productLoading || productResults.length > 0) && productSearch.trim().length >= 2 && (
                    <Box position="absolute" top="100%" left={0} right={0} bg="white" border="1px" borderColor="gray.200" rounded="md" mt={1} zIndex={10} shadow="md">
                      {productLoading ? (
                        <Flex justify="center" py={3}><Spinner size="sm" /></Flex>
                      ) : (
                        productResults.map((p) => (
                          <HStack
                            key={p.id}
                            px={3} py={2}
                            cursor="pointer"
                            _hover={{ bg: 'gray.50' }}
                            onClick={() => addLine(p)}
                          >
                            <Package size={13} color="#9CA3AF" />
                            <Text fontSize="sm">{p.name}</Text>
                          </HStack>
                        ))
                      )}
                    </Box>
                  )}
                </Box>

                {lines.length === 0 ? (
                  <Text fontSize="sm" color="gray.400" textAlign="center" py={4}>
                    Aucun produit ajouté pour l'instant
                  </Text>
                ) : (
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Produit</Th>
                        <Th w="90px">Quantité</Th>
                        <Th w="140px">Prix souhaité</Th>
                        <Th w="40px" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {lines.map((l) => (
                        <Tr key={l.product_id}>
                          <Td fontSize="sm">{l.name}</Td>
                          <Td>
                            <Input
                              size="sm"
                              type="number"
                              min={1}
                              value={l.quantity}
                              onChange={(e) => updateLineQty(l.product_id, Number(e.target.value))}
                            />
                          </Td>
                          <Td>
                            <Input
                              size="sm"
                              type="number"
                              placeholder="Optionnel"
                              value={l.requested_price}
                              onChange={(e) => updateLinePrice(l.product_id, e.target.value)}
                            />
                          </Td>
                          <Td>
                            <IconButton
                              aria-label="Retirer"
                              icon={<Trash2 size={13} />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => removeLine(l.product_id)}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Box>
            )}

            {/* Notes + soumission */}
            <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={5}>
              <FormControl mb={4}>
                <FormLabel fontSize="xs" color="gray.600">Notes (optionnel)</FormLabel>
                <Textarea size="sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexte, conditions particulières..." />
              </FormControl>
              <Button
                colorScheme="blue"
                size="sm"
                w="full"
                isDisabled={!canSubmit}
                isLoading={submitting}
                onClick={handleSubmit}
              >
                Créer le devis
              </Button>
            </Box>

            {/* Devis récents */}
            <Box>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={3}>Devis récents</Text>
              {recentQuotes.length === 0 ? (
                <Box bg="white" border="1px" borderColor="gray.100" rounded="md" p={6} textAlign="center">
                  <Text fontSize="sm" color="gray.400">Aucun devis créé pour l'instant.</Text>
                </Box>
              ) : (
                <VStack align="stretch" spacing={0} bg="white" border="1px" borderColor="gray.100" rounded="md" overflow="hidden">
                  {recentQuotes.map((q, i) => (
                    <Box key={q.id}>
                      {i > 0 && <Divider />}
                      <Flex px={4} py={3} align="center" justify="space-between">
                        <HStack spacing={2}>
                          <FileText size={14} color="#9CA3AF" />
                          <Text fontSize="sm" fontWeight="medium" color="gray.800">{q.quote_number}</Text>
                          <Text fontSize="xs" color="gray.400">{q.buyerName}</Text>
                        </HStack>
                        <Badge fontSize="10px" colorScheme={q.status === 'new' ? 'blue' : 'gray'}>{q.status}</Badge>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        )}
      </Box>
    </Box>
  );
}

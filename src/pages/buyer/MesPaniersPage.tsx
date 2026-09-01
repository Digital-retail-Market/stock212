import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Flex, HStack, VStack, Text, Heading, Button, Input, SimpleGrid,
  Drawer, DrawerBody, DrawerHeader, DrawerContent, DrawerOverlay, DrawerCloseButton,
  useDisclosure, useToast, Badge, Textarea, IconButton, Skeleton,
  Spinner, Alert, AlertIcon, Divider, Tag, TagLabel, Progress,
} from '@chakra-ui/react';
import {
  ShoppingCart, Plus, Trash2, ArrowLeft, Upload, FileText,
  Download, Check, X, Sparkles, ArrowRight, TrendingDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CartCrossSellBlock } from '../../components/marketing/HomepageBlocks';
import {
  analyzeTemplateOptimization,
  applyTemplateOptimization,
  analyzeCartSplitDelivery,
  getEffectiveUnitPrice,
} from '../../lib/cartOptimizer';
import type { CartOptimizationAnalysis, CartSplitAnalysis } from '../../lib/cartOptimizer';

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  navy: '#0d1f38', navyMid: '#1a3558',
  amber: '#c97d1a', amberLight: '#fef3c7', amberBorder: '#fbbf24',
  slate: '#334155', muted: '#64748b',
  border: '#e2e8f0', bgAlt: '#f8fafc',
  green: '#1a5c35', greenLight: '#dcfce7',
  red: '#be1c1c', redLight: '#fff1f1',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface CartItem {
  item_id?: string;   // cart_items.id (UUID)
  ean: string;        // produit.ean réel
  name: string;
  qty: number;
  vendor?: string;
  product_id?: string;
  unit_price?: number; // prix unitaire résolu au moment de l'import CSV
}

// Ligne CSV après vérification contre le catalogue
type CsvStatus = 'ok' | 'not_found' | 'no_price';
interface CsvResolved {
  ean: string;
  qty: number;
  requestedVendor?: string;
  status: CsvStatus;
  productId?: string;
  name?: string;
  vendorName?: string;
  unitPrice?: number;
  offerCount?: number; // nb de fournisseurs pour cet EAN
}

function fmtMAD(n: number) {
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 }).format(n);
}

interface CartTemplate {
  id: string;
  name: string;
  items: CartItem[];
  lastUsed: string | null;
  usageCount: number;
  vendor?: string;
  isLocal?: boolean; // true = in-memory only (CSV import)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── CartOptimizerDrawer ───────────────────────────────────────────────────────
function CartOptimizerDrawer({
  isOpen, onClose, cart, onApplied,
}: {
  isOpen: boolean;
  onClose: () => void;
  cart: CartTemplate | null;
  onApplied: () => void;
}) {
  const toast = useToast({ position: 'top-right' });
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CartOptimizationAnalysis | null>(null);
  const [splitAnalysis, setSplitAnalysis] = useState<CartSplitAnalysis | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!isOpen || !cart || !cart.id || cart.isLocal) return;
    setAnalysis(null);
    setSplitAnalysis(null);
    setLoading(true);
    Promise.all([
      analyzeTemplateOptimization(cart.id),
      analyzeCartSplitDelivery(cart.id),
    ])
      .then(([priceAnalysis, split]) => {
        setAnalysis(priceAnalysis);
        setSplitAnalysis(split);
      })
      .catch((e) => toast({ status: 'error', title: 'Erreur analyse', description: e.message }))
      .finally(() => setLoading(false));
  }, [isOpen, cart?.id]);

  async function handleApply() {
    if (!cart || !analysis) return;
    setApplying(true);
    const { error } = await applyTemplateOptimization(cart.id, analysis.lines);
    if (error) {
      toast({ status: 'error', title: 'Erreur', description: error });
    } else {
      toast({
        status: 'success',
        title: `Panier optimisé — économie de ${fmtMAD(analysis.totalSaving)}`,
        description: `${analysis.linesWithAlternative} produit${analysis.linesWithAlternative !== 1 ? 's' : ''} remplacé${analysis.linesWithAlternative !== 1 ? 's' : ''} par des offres moins chères.`,
        duration: 5000,
      });
      onApplied();
      onClose();
    }
    setApplying(false);
  }

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton top={4} right={4} />
        <DrawerHeader style={{ borderBottom: `1px solid ${C.border}` }}>
          <HStack spacing={3}>
            <Box p={2} rounded="lg" style={{ background: C.greenLight }}>
              <Sparkles size={16} color={C.green} />
            </Box>
            <Box>
              <Text fontWeight="800" fontSize="sm" style={{ color: C.navy }}>
                Optimiser le panier
              </Text>
              <Text fontSize="xs" style={{ color: C.muted }}>
                {cart?.name}
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody pt={5}>
          {loading && (
            <Flex direction="column" align="center" justify="center" py={12} gap={4}>
              <Spinner size="xl" color="blue.500" thickness="3px" />
              <Text fontSize="sm" color={C.muted}>
                Analyse des prix en cours…
              </Text>
            </Flex>
          )}

          {!loading && analysis && (
            <VStack spacing={5} align="stretch">

              {/* Répartition livraisons */}
              {splitAnalysis && splitAnalysis.bundles.length > 0 && (
                <Box rounded="2xl" p={4} style={{ border: `1px solid ${C.border}`, background: 'white' }}>
                  <HStack mb={3} justify="space-between">
                    <Text fontSize="xs" fontWeight="700" textTransform="uppercase"
                      letterSpacing="wide" style={{ color: C.muted }}>
                      LIVRAISONS ({splitAnalysis.bundles.length} envoi{splitAnalysis.bundles.length > 1 ? 's' : ''})
                    </Text>
                    {splitAnalysis.totalDeliveryCost > 0 && (
                      <Text fontSize="xs" fontWeight="700" style={{ color: C.amber }}>
                        {fmtMAD(splitAnalysis.totalDeliveryCost)} estimé
                      </Text>
                    )}
                  </HStack>
                  <VStack spacing={2.5} align="stretch">
                    {splitAnalysis.bundles.map((b) => (
                      <Box key={b.sellerId}>
                        <Flex justify="space-between" align="center">
                          <HStack spacing={2}>
                            <Box w={2} h={2} rounded="full" flexShrink={0}
                              style={{ background: b.isFreeDelivery ? C.green : C.amber }} />
                            <Box>
                              <Text fontSize="xs" fontWeight="600" style={{ color: C.slate }}>
                                {b.sellerName}
                              </Text>
                              <Text fontSize="10px" style={{ color: C.muted }}>
                                {b.lineCount} ligne{b.lineCount > 1 ? 's' : ''} · {fmtMAD(b.productSubtotal)}
                              </Text>
                            </Box>
                          </HStack>
                          <VStack align="end" spacing={0}>
                            <Text fontSize="xs" fontWeight="700"
                              style={{ color: b.isFreeDelivery ? C.green : C.amber }}>
                              {b.isFreeDelivery ? 'Gratuite' : fmtMAD(b.deliveryCost)}
                            </Text>
                            {b.remainingToFreeDelivery != null && b.remainingToFreeDelivery > 0 && (
                              <Text fontSize="9px" style={{ color: C.muted }}>
                                +{fmtMAD(b.remainingToFreeDelivery)} pour offerte
                              </Text>
                            )}
                          </VStack>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                  <Divider my={3} />
                  <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" fontWeight="700" style={{ color: C.muted }}>Total livré estimé</Text>
                      <Text fontSize="10px" style={{ color: C.muted }}>
                        Produits {fmtMAD(splitAnalysis.totalProductCost)}
                        {splitAnalysis.totalDeliveryCost > 0 && ` + livraison ${fmtMAD(splitAnalysis.totalDeliveryCost)}`}
                      </Text>
                    </VStack>
                    <Text fontWeight="800" fontSize="md" style={{ color: C.navy }}>
                      {fmtMAD(splitAnalysis.totalLandedCost)}
                    </Text>
                  </Flex>
                </Box>
              )}

              {/* Résumé économie prix produits */}
              {analysis.totalSaving > 0 ? (
                <Box
                  rounded="2xl" p={5}
                  style={{ background: C.greenLight, border: `1px solid #86efac` }}
                >
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontSize="xs" fontWeight="700" style={{ color: C.green }}
                        textTransform="uppercase" letterSpacing="wide">
                        Économie potentielle
                      </Text>
                      <Text fontSize="3xl" fontWeight="900" style={{ color: C.green }} lineHeight={1.1} mt={1}>
                        {fmtMAD(analysis.totalSaving)}
                      </Text>
                      <Text fontSize="sm" style={{ color: C.green }} mt={1}>
                        -{analysis.savingPercent.toFixed(1)}% sur le total du panier
                      </Text>
                    </Box>
                    <VStack align="end" spacing={0}>
                      <Text fontSize="xs" style={{ color: C.muted }}>Actuel</Text>
                      <Text fontWeight="700" style={{ color: C.slate }}>{fmtMAD(analysis.currentTotal)}</Text>
                      <Text fontSize="xs" style={{ color: C.muted }} mt={1}>Optimisé</Text>
                      <Text fontWeight="800" fontSize="lg" style={{ color: C.green }}>
                        {fmtMAD(analysis.optimizedTotal)}
                      </Text>
                    </VStack>
                  </HStack>
                  <Progress
                    value={100 - analysis.savingPercent}
                    size="xs" mt={3} rounded="full"
                    colorScheme="green" bg="white"
                  />
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="10px" style={{ color: C.muted }}>
                      {analysis.linesWithAlternative} ligne{analysis.linesWithAlternative !== 1 ? 's' : ''} améliorable{analysis.linesWithAlternative !== 1 ? 's' : ''} sur {analysis.lines.length}
                    </Text>
                    <Text fontSize="10px" style={{ color: C.muted }}>
                      {analysis.lines.length - analysis.linesWithAlternative} déjà au meilleur prix
                    </Text>
                  </HStack>
                </Box>
              ) : (
                <Alert status="success" rounded="xl" fontSize="sm">
                  <AlertIcon />
                  Votre panier est déjà au meilleur prix disponible sur le catalogue.
                </Alert>
              )}

              {/* Lignes améliorables */}
              {analysis.lines.filter((l) => l.hasAlternative).length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase"
                    letterSpacing="wide" style={{ color: C.muted }} mb={3}>
                    SUBSTITUTIONS SUGGÉRÉES ({analysis.linesWithAlternative})
                  </Text>
                  <VStack spacing={3} align="stretch">
                    {analysis.lines.filter((l) => l.hasAlternative).map((line) => (
                      <Box
                        key={line.cartItemId}
                        rounded="xl" p={4}
                        style={{ border: `1px solid ${C.border}`, background: 'white' }}
                      >
                        <Text fontWeight="700" fontSize="sm" style={{ color: C.navy }} noOfLines={1}>
                          {line.productName}
                        </Text>
                        <Text fontSize="xs" fontFamily="mono" style={{ color: C.muted }} mb={3}>
                          EAN {line.ean} · {line.quantity} unités
                        </Text>
                        <HStack spacing={3} align="stretch">
                          {/* Actuel */}
                          <Box flex={1} rounded="lg" p={3}
                            style={{ background: C.bgAlt, border: `1px solid ${C.border}` }}>
                            <Text fontSize="10px" fontWeight="700" style={{ color: C.muted }}
                              textTransform="uppercase" mb={1}>Actuel</Text>
                            <Text fontSize="xs" fontWeight="600" style={{ color: C.slate }} noOfLines={1}>
                              {line.currentSellerName}
                            </Text>
                            <Text fontWeight="800" fontSize="sm" style={{ color: C.slate }}>
                              {fmtMAD(line.currentUnitPrice)} / u
                            </Text>
                            <Text fontSize="xs" style={{ color: C.muted }}>
                              = {fmtMAD(line.currentLineTotal)}
                            </Text>
                          </Box>

                          <Flex align="center" flexShrink={0}>
                            <Box
                              rounded="full" p={1.5}
                              style={{ background: C.greenLight }}
                            >
                              <ArrowRight size={12} color={C.green} />
                            </Box>
                          </Flex>

                          {/* Suggestion */}
                          <Box flex={1} rounded="lg" p={3}
                            style={{ background: C.greenLight, border: `1px solid #86efac` }}>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="10px" fontWeight="700" style={{ color: C.green }}
                                textTransform="uppercase">Suggéré</Text>
                              <Tag size="sm" colorScheme="green" rounded="full" fontSize="10px">
                                <TagLabel>-{fmtMAD(line.saving)}</TagLabel>
                              </Tag>
                            </HStack>
                            <Text fontSize="xs" fontWeight="600" style={{ color: C.green }} noOfLines={1}>
                              {line.cheaperSellerName}
                            </Text>
                            <Text fontWeight="800" fontSize="sm" style={{ color: C.green }}>
                              {fmtMAD(line.cheaperUnitPrice!)} / u
                            </Text>
                            <Text fontSize="xs" style={{ color: C.green }}>
                              = {fmtMAD(line.cheaperLineTotal!)}
                            </Text>
                          </Box>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Lignes déjà optimales */}
              {analysis.lines.filter((l) => !l.hasAlternative).length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="700" textTransform="uppercase"
                    letterSpacing="wide" style={{ color: C.muted }} mb={2}>
                    DÉJÀ AU MEILLEUR PRIX ({analysis.lines.filter((l) => !l.hasAlternative).length})
                  </Text>
                  <VStack spacing={1.5} align="stretch">
                    {analysis.lines.filter((l) => !l.hasAlternative).map((line) => (
                      <Flex key={line.cartItemId} justify="space-between" align="center"
                        px={4} py={2.5} rounded="lg"
                        style={{ background: C.bgAlt, border: `1px solid ${C.border}` }}>
                        <HStack spacing={2}>
                          <Check size={12} color={C.green} />
                          <Text fontSize="xs" style={{ color: C.slate }} noOfLines={1}>
                            {line.productName}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" fontWeight="700" style={{ color: C.slate }}>
                          {fmtMAD(line.currentLineTotal)}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* CTA */}
              {analysis.totalSaving > 0 && (
                <Box pt={2}>
                  <Button
                    w="full" size="lg" fontWeight="700" rounded="xl"
                    style={{ background: C.green, color: 'white' }}
                    leftIcon={<TrendingDown size={16} />}
                    _hover={{ opacity: 0.9 }}
                    isLoading={applying}
                    loadingText="Application en cours…"
                    onClick={handleApply}
                  >
                    Appliquer — économiser {fmtMAD(analysis.totalSaving)}
                  </Button>
                  <Text fontSize="xs" style={{ color: C.muted }} textAlign="center" mt={2}>
                    Les produits du panier seront remplacés par des équivalents moins chers (même EAN).
                  </Text>
                </Box>
              )}
            </VStack>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ── CartCard ──────────────────────────────────────────────────────────────────
function CartCard({ cart, onOrder, onDelete, onOptimize }: {
  cart: CartTemplate;
  onOrder: () => void;
  onDelete: () => void;
  onOptimize: () => void;
}) {
  return (
    <Box
      bg="white" rounded="2xl" overflow="hidden"
      style={{ border: `1px solid ${C.border}` }}
      _hover={{ shadow: 'md', borderColor: C.amberBorder }}
      transition="all 0.2s"
    >
      {/* Header */}
      <Box px={5} pt={5} pb={3} style={{ borderBottom: `1px solid ${C.border}` }}>
        <Flex justify="space-between" align="start">
          <Box flex={1} minW={0}>
            <Text fontWeight="800" fontSize="sm" style={{ color: C.navy }} noOfLines={1}>
              {cart.name}
            </Text>
            {cart.vendor && (
              <Text fontSize="11px" fontWeight="600" mt={0.5} style={{ color: C.amber }}>
                {cart.vendor}
              </Text>
            )}
          </Box>
          <HStack spacing={1}>
            <IconButton
              aria-label="Supprimer"
              icon={<Trash2 size={13} />}
              size="xs" variant="ghost"
              style={{ color: C.red }}
              _hover={{ bg: C.redLight }}
              onClick={e => { e.stopPropagation(); onDelete(); }}
            />
          </HStack>
        </Flex>
        <HStack spacing={3} mt={3}>
          <Badge variant="subtle" fontSize="10px" rounded="full" px={2}
            style={{ background: C.amberLight, color: '#92400e' }}>
            {cart.items.length} référence{cart.items.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="subtle" fontSize="10px" rounded="full" px={2}
            style={{ background: C.bgAlt, color: C.muted }}>
            {cart.usageCount} utilisation{cart.usageCount !== 1 ? 's' : ''}
          </Badge>
          {cart.lastUsed && (
            <Text fontSize="10px" style={{ color: C.muted }}>
              Dernière : {new Date(cart.lastUsed).toLocaleDateString('fr-FR')}
            </Text>
          )}
          {cart.isLocal && (
            <Badge fontSize="10px" rounded="full" px={2}
              style={{ background: '#ede9fe', color: '#4a1d96' }}>
              Non sauvegardé
            </Badge>
          )}
        </HStack>
      </Box>

      {/* Items preview */}
      <Box px={5} py={3}>
        {cart.items.length === 0 ? (
          <Text fontSize="xs" style={{ color: C.muted }} fontStyle="italic">
            Panier vide — ajoutez des produits depuis le catalogue
          </Text>
        ) : (
          <VStack spacing={1.5} align="stretch">
            {cart.items.slice(0, 3).map((item, i) => (
              <Flex key={i} justify="space-between" align="center">
                <HStack spacing={2}>
                  <Box w={1.5} h={1.5} rounded="full" style={{ background: C.amber }} flexShrink={0} />
                  <Text fontSize="xs" style={{ color: C.slate }} noOfLines={1}>{item.name}</Text>
                </HStack>
                <Text fontSize="11px" fontWeight="700" style={{ color: C.navy }}>{item.qty}U</Text>
              </Flex>
            ))}
            {cart.items.length > 3 && (
              <Text fontSize="11px" style={{ color: C.muted }} pl={3.5}>
                + {cart.items.length - 3} autre{cart.items.length - 3 > 1 ? 's' : ''}…
              </Text>
            )}
          </VStack>
        )}
      </Box>

      {/* CTA */}
      <Box px={5} pb={5} pt={2}>
        <VStack spacing={2} align="stretch">
          <Button
            w="full" size="sm" fontWeight="700" rounded="xl"
            style={{ background: C.navy, color: 'white' }}
            leftIcon={<ShoppingCart size={14} />}
            _hover={{ opacity: 0.9 }}
            isDisabled={cart.items.length === 0}
            onClick={onOrder}
          >
            Commander tout →
          </Button>
          {!cart.isLocal && cart.items.length > 0 && (
            <Button
              w="full" size="sm" fontWeight="600" rounded="xl" variant="outline"
              style={{ borderColor: C.green, color: C.green }}
              leftIcon={<Sparkles size={13} />}
              _hover={{ background: C.greenLight }}
              onClick={e => { e.stopPropagation(); onOptimize(); }}
            >
              Optimiser les prix
            </Button>
          )}
        </VStack>
      </Box>
    </Box>
  );
}

// ── CSV Drawer ─────────────────────────────────────────────────────────────────
function CsvDrawer({ isOpen, onClose, onImport }: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: CartItem[]) => Promise<void> | void;
}) {
  const toast = useToast();
  const [csvText, setCsvText] = useState('');
  const [resolved, setResolved] = useState<CsvResolved[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ligne brute : "ean, quantité, vendeur"  (séparateur , ou ;)
  function parseRaw(text: string): { ean: string; qty: number; vendor?: string }[] {
    return text.trim().split(/\r?\n/)
      .filter(l => l.trim() && !l.startsWith('#'))
      .map(line => {
        const [eanRaw, qtyRaw, vendor] = line.split(/[,;]/).map(s => s.trim());
        const ean = (eanRaw ?? '').replace(/\D/g, '');
        return { ean, qty: Math.max(1, parseInt(qtyRaw ?? '1', 10) || 1), vendor: vendor || undefined };
      })
      .filter(r => r.ean.length >= 8);
  }

  // Vérification : chaque EAN est résolu contre le catalogue (produit actif, prix, vendeur)
  const verify = useCallback(async (rows: { ean: string; qty: number; vendor?: string }[]) => {
    if (rows.length === 0) { setResolved([]); return; }
    setVerifying(true);
    const eans = [...new Set(rows.map(r => r.ean))];
    const { data } = await supabase
      .from('products')
      .select('id, name, ean, seller_org_id, organisations!seller_org_id(name), price_tiers(qty_min, unit_price)')
      .in('ean', eans)
      .eq('status', 'active');

    type Cand = {
      id: string; name: string; ean: string | null;
      organisations: { name: string } | null;
      price_tiers: { qty_min: number; unit_price: number }[] | null;
    };
    const byEan = new Map<string, Cand[]>();
    for (const p of (data ?? []) as unknown as Cand[]) {
      const k = p.ean ?? '';
      if (!byEan.has(k)) byEan.set(k, []);
      byEan.get(k)!.push(p);
    }

    const out: CsvResolved[] = rows.map(r => {
      const cands = byEan.get(r.ean) ?? [];
      if (cands.length === 0) return { ean: r.ean, qty: r.qty, requestedVendor: r.vendor, status: 'not_found' };
      // vendeur demandé → on privilégie le fournisseur qui correspond ; sinon le moins cher
      const wanted = r.vendor?.toLowerCase();
      const priced = cands
        .map(c => ({ c, price: getEffectiveUnitPrice(c.price_tiers ?? [], r.qty) }))
        .sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
      const chosen = (wanted
        && priced.find(x => (x.c.organisations?.name ?? '').toLowerCase().includes(wanted)))
        || priced[0];
      if (!(chosen.price > 0)) {
        return {
          ean: r.ean, qty: r.qty, requestedVendor: r.vendor, status: 'no_price',
          productId: chosen.c.id, name: chosen.c.name,
          vendorName: chosen.c.organisations?.name ?? '—', offerCount: cands.length,
        };
      }
      return {
        ean: r.ean, qty: r.qty, requestedVendor: r.vendor, status: 'ok',
        productId: chosen.c.id, name: chosen.c.name,
        vendorName: chosen.c.organisations?.name ?? '—',
        unitPrice: chosen.price, offerCount: cands.length,
      };
    });
    setResolved(out);
    setVerifying(false);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      verify(parseRaw(text));
    };
    reader.readAsText(file);
  }

  function handleTextChange(text: string) {
    setCsvText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => verify(parseRaw(text)), 350);
  }

  function reset() {
    setCsvText(''); setResolved([]);
    if (fileRef.current) fileRef.current.value = '';
  }

  const okItems: CartItem[] = resolved
    .filter(r => r.status === 'ok')
    .map(r => ({
      ean: r.ean, name: r.name ?? `EAN ${r.ean}`, qty: r.qty,
      vendor: r.vendorName, product_id: r.productId, unit_price: r.unitPrice,
    }));
  const nNotFound = resolved.filter(r => r.status === 'not_found').length;
  const nNoPrice = resolved.filter(r => r.status === 'no_price').length;

  async function handleConfirm() {
    if (!okItems.length) return;
    setSubmitting(true);
    try {
      await onImport(okItems);
      toast({
        title: `Panier créé — ${okItems.length} article${okItems.length > 1 ? 's' : ''} vérifié${okItems.length > 1 ? 's' : ''}`,
        description: nNotFound ? `${nNotFound} EAN ignoré${nNotFound > 1 ? 's' : ''} (introuvable${nNotFound > 1 ? 's' : ''})` : undefined,
        status: 'success', duration: 3500, position: 'top-right',
      });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const STATUS_UI: Record<CsvStatus, { color: string; bg: string; label: string }> = {
    ok:        { color: C.green, bg: C.greenLight, label: 'Vérifié' },
    not_found: { color: C.red,   bg: C.redLight,   label: 'EAN introuvable' },
    no_price:  { color: '#92400e', bg: C.amberLight, label: 'Sur devis' },
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton top={4} right={4} />
        <DrawerHeader style={{ borderBottom: `1px solid ${C.border}` }}>
          <HStack spacing={3}>
            <Box p={2} style={{ background: C.amberLight }} rounded="lg">
              <Upload size={16} color={C.amber} />
            </Box>
            <Box>
              <Text fontWeight="800" fontSize="sm" style={{ color: C.navy }}>Import CSV</Text>
              <Text fontSize="xs" style={{ color: C.muted }}>Format : ean, quantité, vendeur</Text>
            </Box>
          </HStack>
        </DrawerHeader>
        <DrawerBody pt={5}>
          <VStack spacing={5} align="stretch">
            <Box rounded="xl" p={4} style={{ background: C.bgAlt, border: `1px solid ${C.border}` }}>
              <HStack spacing={3}>
                <FileText size={18} color={C.muted} />
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="600" style={{ color: C.slate }}>Format attendu</Text>
                  <Text fontSize="11px" style={{ color: C.muted }} fontFamily="mono" mt={1}>
                    ean,quantite,vendeur
                  </Text>
                  <Text fontSize="11px" style={{ color: C.muted }} fontFamily="mono">
                    3045320094084,48,Al Manara
                  </Text>
                </Box>
              </HStack>
            </Box>

            <Box>
              <Text fontSize="11px" fontWeight="700" letterSpacing="0.8px"
                textTransform="uppercase" mb={2} style={{ color: C.muted }}>
                Glisser-déposer ou parcourir
              </Text>
              <Box
                rounded="xl" p={6} textAlign="center" cursor="pointer"
                style={{ border: `2px dashed ${C.border}`, background: C.bgAlt }}
                _hover={{ borderColor: C.amberBorder }}
                transition="border-color 0.15s"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={24} color={C.muted} style={{ margin: '0 auto 8px' }} />
                <Text fontSize="sm" style={{ color: C.slate }} fontWeight="600">
                  Sélectionner un fichier CSV
                </Text>
                <Text fontSize="xs" style={{ color: C.muted }} mt={0.5}>ou coller ci-dessous</Text>
              </Box>
              <input ref={fileRef} type="file" accept=".csv,.txt"
                style={{ display: 'none' }} onChange={handleFile} />
            </Box>

            <Box>
              <Text fontSize="11px" fontWeight="700" letterSpacing="0.8px"
                textTransform="uppercase" mb={2} style={{ color: C.muted }}>
                Ou saisir manuellement
              </Text>
              <Textarea
                value={csvText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder={'6119000000011,48,Lesieur\n6119000000073,20,Sidi Ali'}
                rows={6} fontSize="12px" fontFamily="mono" rounded="xl" resize="none"
                style={{ borderColor: C.border }}
                _focus={{ borderColor: C.navy, boxShadow: 'none' }}
              />
            </Box>

            {(verifying || resolved.length > 0) && (
              <Box rounded="xl" overflow="hidden" style={{ border: `1px solid ${C.border}` }}>
                <Flex px={4} py={2} justify="space-between" align="center"
                  style={{ background: C.bgAlt, borderBottom: `1px solid ${C.border}` }}>
                  <Text fontSize="11px" fontWeight="700" style={{ color: C.navy }}>
                    Vérification catalogue
                  </Text>
                  {verifying
                    ? <HStack spacing={1.5}><Spinner size="xs" /><Text fontSize="10px" style={{ color: C.muted }}>en cours…</Text></HStack>
                    : <HStack spacing={2} fontSize="10px" fontWeight="700">
                        <Text style={{ color: C.green }}>{okItems.length} ✓</Text>
                        {nNoPrice > 0 && <Text style={{ color: '#92400e' }}>{nNoPrice} sur devis</Text>}
                        {nNotFound > 0 && <Text style={{ color: C.red }}>{nNotFound} ✗</Text>}
                      </HStack>}
                </Flex>
                <VStack spacing={0} align="stretch" maxH="240px" overflowY="auto">
                  {resolved.map((r, i) => {
                    const ui = STATUS_UI[r.status];
                    return (
                      <Flex key={i} px={4} py={2.5} gap={3} align="center"
                        style={{ borderBottom: i < resolved.length - 1 ? `1px solid ${C.border}` : undefined }}>
                        {r.status === 'ok'
                          ? <Check size={14} color={C.green} style={{ flexShrink: 0 }} />
                          : <X size={14} color={ui.color} style={{ flexShrink: 0 }} />}
                        <Box flex={1} minW={0}>
                          <Text fontSize="xs" fontWeight="600" noOfLines={1}
                            style={{ color: r.status === 'ok' ? C.slate : C.muted }}>
                            {r.name ?? `EAN ${r.ean}`}
                          </Text>
                          <Text fontSize="10px" fontFamily="mono" style={{ color: C.muted }}>
                            {r.ean}{r.vendorName ? ` · ${r.vendorName}` : ''}
                            {r.offerCount && r.offerCount > 1 ? ` · ${r.offerCount} fourn.` : ''}
                          </Text>
                        </Box>
                        <HStack spacing={2} flexShrink={0}>
                          {r.status === 'ok' && r.unitPrice != null && (
                            <Text fontSize="xs" fontFamily="mono" style={{ color: C.navy }}>
                              {fmtMAD(r.unitPrice * r.qty)}
                            </Text>
                          )}
                          <Badge fontSize="9px" rounded="full" px={2}
                            style={{ background: ui.bg, color: ui.color }}>
                            {r.status === 'ok' ? `${r.qty}U` : ui.label}
                          </Badge>
                        </HStack>
                      </Flex>
                    );
                  })}
                </VStack>
              </Box>
            )}

            <Button
              isDisabled={okItems.length === 0 || verifying}
              isLoading={submitting}
              onClick={handleConfirm}
              size="lg" fontWeight="700" rounded="xl"
              style={{ background: okItems.length ? C.navy : undefined, color: okItems.length ? 'white' : undefined }}
              _hover={{ opacity: 0.9 }}
              leftIcon={<Check size={16} />}
            >
              Créer le panier ({okItems.length} article{okItems.length > 1 ? 's' : ''})
            </Button>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function MesPaniersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { activeOrg } = useAuth();

  const [carts, setCarts] = useState<CartTemplate[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);

  const { isOpen: isCsvOpen, onOpen: openCsv, onClose: closeCsv } = useDisclosure();
  const { isOpen: isOptimizerOpen, onOpen: openOptimizer, onClose: closeOptimizer } = useDisclosure();
  const [optimizerCart, setOptimizerCart] = useState<CartTemplate | null>(null);

  // ── Load templates from Supabase ───────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    if (!activeOrg) return;
    setDbLoading(true);
    const { data } = await supabase
      .from('carts')
      .select('id, name, order_count, last_ordered_at, cart_items(id, product_id, quantity, products(name, ean, organisations(name)))')
      .eq('buyer_org_id', activeOrg.id)
      .eq('is_template', true)
      .order('last_ordered_at', { ascending: false });

    const templates: CartTemplate[] = (data ?? []).map((c: any) => {
      const items: CartItem[] = (c.cart_items ?? []).map((ci: any) => ({
        item_id: ci.id,
        ean: ci.products?.ean ?? '',
        product_id: ci.product_id,
        name: ci.products?.name ?? 'Produit',
        qty: ci.quantity,
        vendor: ci.products?.organisations?.name,
      }));
      return {
        id: c.id,
        name: c.name ?? 'Sans nom',
        items,
        lastUsed: c.last_ordered_at,
        usageCount: c.order_count ?? 0,
        vendor: items[0]?.vendor,
      };
    });
    setCarts(prev => {
      // Keep local-only (CSV) carts, replace DB carts
      const locals = prev.filter(c => c.isLocal);
      return [...templates, ...locals];
    });
    setDbLoading(false);
  }, [activeOrg]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Create new template ────────────────────────────────────────────────────
  async function handleCreateNew() {
    if (!newName.trim() || !activeOrg) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('carts')
        .insert({
          buyer_org_id: activeOrg.id,
          status: 'active',
          is_template: true,
          name: newName.trim(),
          order_count: 0,
        })
        .select('id')
        .single();

      if (error) throw error;

      const newCart: CartTemplate = {
        id: (data as { id: string }).id,
        name: newName.trim(),
        items: [],
        lastUsed: null,
        usageCount: 0,
      };
      setCarts(prev => [newCart, ...prev]);
      setNewName('');
      setShowCreate(false);
      toast({ title: 'Panier créé', status: 'success', duration: 2000, position: 'top-right' });
    } catch (e) {
      toast({
        title: 'Erreur lors de la création',
        description: e instanceof Error ? e.message : '',
        status: 'error', duration: 3000, position: 'bottom-right',
      });
    } finally {
      setCreating(false);
    }
  }

  // ── Delete template ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (UUID_RE.test(id)) {
      await supabase.from('carts').delete().eq('id', id);
    }
    setCarts(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Panier supprimé', status: 'info', duration: 2000, position: 'top-right' });
  }

  // ── Order from template ────────────────────────────────────────────────────
  async function handleOrder(cart: CartTemplate) {
    if (!activeOrg) return;
    setOrdering(cart.id);
    try {
      if (cart.isLocal || !UUID_RE.test(cart.id) || cart.items.length === 0) {
        toast({
          title: `Panier "${cart.name}"`,
          description: 'Ce panier ne contient pas encore de produits du catalogue.',
          status: 'warning', duration: 3000, position: 'bottom-right',
        });
        return;
      }

      // Get or create active (non-template) cart
      const { data: activeCartRows } = await supabase
        .from('carts')
        .select('id')
        .eq('buyer_org_id', activeOrg.id)
        .eq('status', 'active')
        .eq('is_template', false)
        .order('created_at', { ascending: false })
        .limit(1);
      let activeCart: { id: string } | null = activeCartRows?.[0] ?? null;

      if (!activeCart) {
        const { data: newCart, error: cartErr } = await supabase
          .from('carts')
          .insert({ buyer_org_id: activeOrg.id, status: 'active', is_template: false })
          .select('id')
          .single();
        if (cartErr) throw cartErr;
        activeCart = newCart;
      }
      if (!activeCart) throw new Error('Impossible de créer le panier actif');

      // Load template cart items and copy to active cart
      const { data: templateItems } = await supabase
        .from('cart_items')
        .select('product_id, quantity, unit_price_computed')
        .eq('cart_id', cart.id);

      if (templateItems?.length) {
        await Promise.all(
          templateItems.map((item: any) =>
            supabase.from('cart_items').upsert(
              {
                cart_id: activeCart!.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price_computed: item.unit_price_computed,
              },
              { onConflict: 'cart_id,product_id' }
            )
          )
        );
        // Bump usage stats on template
        const newCount = (cart.usageCount ?? 0) + 1;
        await supabase
          .from('carts')
          .update({ order_count: newCount, last_ordered_at: new Date().toISOString() })
          .eq('id', cart.id);
        setCarts(prev =>
          prev.map(c => c.id === cart.id
            ? { ...c, usageCount: newCount, lastUsed: new Date().toISOString() }
            : c)
        );
      }

      toast({
        title: `Panier "${cart.name}" chargé`,
        description: `${cart.items.length} article${cart.items.length > 1 ? 's' : ''} ajouté${cart.items.length > 1 ? 's' : ''} au panier`,
        status: 'success', duration: 3000, position: 'top-right',
      });
      navigate('/checkout');
    } catch (e) {
      toast({
        title: 'Erreur lors du chargement du panier',
        description: e instanceof Error ? e.message : '',
        status: 'error', duration: 4000, isClosable: true, position: 'bottom-right',
      });
    } finally {
      setOrdering(null);
    }
  }

  // ── Optimize template ──────────────────────────────────────────────────────
  function handleOptimize(cart: CartTemplate) {
    setOptimizerCart(cart);
    openOptimizer();
  }

  // ── CSV import ────────────────────────────────────────────────────────────
  // Les lignes ont déjà été vérifiées contre le catalogue (product_id + prix réels) ;
  // on crée un vrai panier type en base → commandable comme n'importe quel panier.
  async function handleCSVImport(items: CartItem[]) {
    if (!activeOrg || items.length === 0) return;
    const name = `Import CSV — ${new Date().toLocaleDateString('fr-FR')}`;
    const { data: cart, error } = await supabase
      .from('carts')
      .insert({ buyer_org_id: activeOrg.id, status: 'active', is_template: true, name, order_count: 0 })
      .select('id')
      .single();
    if (error || !cart) {
      toast({ title: 'Erreur lors de la création du panier', description: error?.message, status: 'error', duration: 4000, position: 'bottom-right' });
      return;
    }
    const cartId = (cart as { id: string }).id;
    const { error: e2 } = await supabase.from('cart_items').insert(
      items
        .filter(it => it.product_id)
        .map(it => ({
          cart_id: cartId,
          product_id: it.product_id,
          quantity: it.qty,
          unit_price_computed: it.unit_price ?? null,
        })),
    );
    if (e2) {
      toast({ title: 'Erreur lors de l\'ajout des articles', description: e2.message, status: 'error', duration: 4000, position: 'bottom-right' });
      await supabase.from('carts').delete().eq('id', cartId);
      return;
    }
    setCarts(prev => [{
      id: cartId, name, items, lastUsed: null, usageCount: 0, vendor: items[0]?.vendor,
    }, ...prev]);
  }

  const isLoading = dbLoading && carts.length === 0;

  return (
    <VStack spacing={6} align="stretch">

      {/* Header */}
      <Flex align="flex-start" justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Button
            variant="ghost" size="xs" leftIcon={<ArrowLeft size={12} />}
            style={{ color: C.muted }} mb={1}
            onClick={() => navigate('/buyer')}
          >
            Tableau de bord
          </Button>
          <Heading size="lg" fontWeight="900" style={{ color: C.navy }}>Mes paniers</Heading>
          <Text fontSize="sm" style={{ color: C.muted }}>
            Commandes types et import en lot
          </Text>
        </Box>
        <HStack spacing={2}>
          <Button
            size="sm" variant="outline" rounded="full" fontWeight="600"
            leftIcon={<Upload size={14} />}
            style={{ borderColor: C.border, color: C.slate }}
            _hover={{ borderColor: C.navy, color: C.navy }}
            onClick={openCsv}
          >
            Import CSV
          </Button>
          <Button
            size="sm" fontWeight="700" rounded="full"
            style={{ background: C.navy, color: 'white' }}
            leftIcon={<Plus size={14} />} _hover={{ opacity: 0.9 }}
            onClick={() => setShowCreate(!showCreate)}
          >
            Nouveau panier
          </Button>
        </HStack>
      </Flex>

      {/* Création inline */}
      {showCreate && (
        <Box rounded="2xl" p={5} style={{ background: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
          <Text fontSize="sm" fontWeight="700" mb={3} style={{ color: '#92400e' }}>
            Nom du nouveau panier
          </Text>
          <HStack spacing={3}>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ex: Commande hebdo épicerie"
              rounded="xl" bg="white"
              style={{ borderColor: C.amberBorder }}
              _focus={{ borderColor: C.amber, boxShadow: 'none' }}
              onKeyDown={e => e.key === 'Enter' && handleCreateNew()}
            />
            <Button
              size="md" fontWeight="700" rounded="xl"
              style={{ background: C.navy, color: 'white' }}
              leftIcon={<Check size={14} />}
              isLoading={creating}
              onClick={handleCreateNew}
            >
              Créer
            </Button>
            <IconButton
              aria-label="Annuler" icon={<X size={16} />} size="md"
              variant="ghost" style={{ color: C.muted }}
              onClick={() => { setShowCreate(false); setNewName(''); }}
            />
          </HStack>
        </Box>
      )}

      {/* Info CSV */}
      <Box rounded="xl" p={4} style={{ background: C.bgAlt, border: `1px solid ${C.border}` }}>
        <HStack spacing={4} flexWrap="wrap" gap={3}>
          <HStack spacing={2}>
            <Upload size={16} color={C.amber} />
            <Text fontSize="sm" fontWeight="700" style={{ color: C.slate }}>Import CSV</Text>
          </HStack>
          <Text fontSize="sm" style={{ color: C.muted }} flex={1}>
            Importez votre fichier de commande (EAN, quantité, vendeur) pour créer un panier en 1 clic.
          </Text>
          <Button
            size="sm" variant="outline" fontWeight="600" rounded="full"
            leftIcon={<Download size={13} />}
            style={{ borderColor: C.border, color: C.slate }}
            _hover={{ borderColor: C.navy, color: C.navy }}
          >
            Télécharger le modèle
          </Button>
        </HStack>
      </Box>

      {/* Grid */}
      {isLoading ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {[1, 2, 3].map(i => <Skeleton key={i} height="260px" rounded="2xl" />)}
        </SimpleGrid>
      ) : carts.length === 0 ? (
        <Flex direction="column" align="center" py={16} gap={4}
          bg="white" rounded="2xl" style={{ border: `1px solid ${C.border}` }}>
          <Box p={5} rounded="full" style={{ background: C.bgAlt }}>
            <ShoppingCart size={36} color={C.border} />
          </Box>
          <Box textAlign="center">
            <Text fontWeight="700" style={{ color: C.slate }}>Aucun panier type</Text>
            <Text fontSize="sm" style={{ color: C.muted }} mt={1}>
              Créez des modèles de commande pour commander rapidement
            </Text>
          </Box>
          <HStack spacing={3}>
            <Button size="sm" fontWeight="700" rounded="full"
              style={{ background: C.navy, color: 'white' }}
              onClick={() => setShowCreate(true)}>
              Créer un panier
            </Button>
            <Button size="sm" variant="outline" rounded="full"
              style={{ borderColor: C.border, color: C.slate }}
              onClick={openCsv}>
              Importer CSV
            </Button>
          </HStack>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {carts.map(cart => (
            <Box key={cart.id} opacity={ordering === cart.id ? 0.6 : 1} transition="opacity 0.2s">
              <CartCard
                cart={cart}
                onOrder={() => handleOrder(cart)}
                onDelete={() => handleDelete(cart.id)}
                onOptimize={() => handleOptimize(cart)}
              />
            </Box>
          ))}
          {/* Add new card */}
          <Box
            rounded="2xl" p={6} cursor="pointer"
            style={{ border: `2px dashed ${C.border}`, background: 'white' }}
            _hover={{ borderColor: C.amberBorder, background: C.amberLight }}
            transition="all 0.18s"
            onClick={() => setShowCreate(true)}
          >
            <Flex direction="column" align="center" justify="center" h="full" minH="160px" gap={3}>
              <Box p={3} rounded="full" style={{ background: C.bgAlt }}>
                <Plus size={24} color={C.muted} />
              </Box>
              <Text fontWeight="700" fontSize="sm" style={{ color: C.slate }}>
                Nouveau panier type
              </Text>
            </Flex>
          </Box>
        </SimpleGrid>
      )}

      <CsvDrawer isOpen={isCsvOpen} onClose={closeCsv} onImport={handleCSVImport} />

      <CartOptimizerDrawer
        isOpen={isOptimizerOpen}
        onClose={closeOptimizer}
        cart={optimizerCart}
        onApplied={loadTemplates}
      />

      <CartCrossSellBlock
        cartProductIds={carts.flatMap(c =>
          c.items.map(i => i.product_id).filter((id): id is string => !!id)
        )}
      />
    </VStack>
  );
}

import { Box, Flex, Text, Badge } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, ShoppingCart, Tag, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';

const N = { navy: '#0d1f38', amber: '#c97d1a', muted: '#94a3b8' };

export default function MobileBottomNav({ onOpenCart }: { onOpenCart: () => void }) {
  const { t } = useTranslation();
  const loc = useLocation();
  const { user, profile, activeOrg } = useAuth();
  const { count: cartCount } = useCart();

  function accountPath() {
    if (!user) return '/auth';
    if (profile?.is_admin) return '/admin';
    if (!activeOrg) return '/buyer/account';
    if (activeOrg.org_type === 'seller') return '/vendor';
    if (activeOrg.org_type === 'delivery') return '/delivery';
    return '/buyer/account';
  }

  const items = [
    { key: 'home', label: t('bottomNav.home'), icon: Home, to: '/', exact: true },
    { key: 'catalog', label: t('bottomNav.catalog'), icon: LayoutGrid, to: '/catalog', exact: false },
    { key: 'cart', label: t('bottomNav.cart'), icon: ShoppingCart, to: null, exact: false, badge: cartCount },
    { key: 'promotions', label: t('bottomNav.promotions'), icon: Tag, to: '/best-deals', exact: false },
    { key: 'account', label: t('bottomNav.account'), icon: User, to: accountPath(), exact: false },
  ] as const;

  const showCart = activeOrg?.org_type !== 'delivery';

  return (
    <Box
      as="nav"
      position="fixed"
      bottom={0} left={0} right={0}
      zIndex={250}
      display={{ base: 'flex', md: 'none' }}
      bg="white"
      borderTop="1px solid"
      borderColor="gray.100"
      boxShadow="0 -2px 12px rgba(13,31,56,0.08)"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Flex w="full" h="58px">
        {items.map((item) => {
          if (item.key === 'cart' && !showCart) return null;
          const active = item.to ? (item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to)) : false;
          const Icon = item.icon;
          const content = (
            <Flex
              direction="column" align="center" justify="center" gap={0.5}
              w="full" h="full" minW="44px"
              color={active ? N.navy : N.muted}
              position="relative"
            >
              <Box position="relative">
                <Icon size={20} strokeWidth={active ? 2.4 : 2} color={active ? N.navy : N.muted} />
                {'badge' in item && item.badge! > 0 && (
                  <Badge
                    position="absolute" top="-6px" right="-8px"
                    bg={N.amber} color="white" rounded="full" fontSize="8px"
                    minW="14px" h="14px" lineHeight="14px" textAlign="center" px={0.5}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Box>
              <Text fontSize="9px" fontWeight={active ? '700' : '500'}>{item.label}</Text>
              {active && (
                <Box position="absolute" top={0} w="24px" h="2px" rounded="full" style={{ background: N.amber }} />
              )}
            </Flex>
          );
          if (item.key === 'cart') {
            return (
              <Box key={item.key} flex={1} as="button" onClick={onOpenCart} aria-label={item.label}>
                {content}
              </Box>
            );
          }
          return (
            <Box key={item.key} flex={1} as={Link} to={item.to!} aria-label={item.label}>
              {content}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

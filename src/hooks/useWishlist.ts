import { useCallback, useEffect, useState } from 'react';

// Wishlist / favoris acheteur — persistée en localStorage (ids de produits).
// Source unique : la page /buyer/wishlist et les boutons « cœur » du catalogue
// partagent ce hook. Synchronisé entre onglets via l'événement `storage`.

const WL_KEY = 's212_wishlist';
const EVT = 's212_wishlist_change';

export function readWishlist(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(WL_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids: string[]) {
  try {
    localStorage.setItem(WL_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* quota / mode privé : on ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(readWishlist);

  useEffect(() => {
    const sync = () => setIds(readWishlist());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string): boolean => {
    const current = readWishlist();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeWishlist(next);
    setIds(next);
    return next.includes(id); // true = ajouté, false = retiré
  }, []);

  const remove = useCallback((id: string) => {
    const next = readWishlist().filter((x) => x !== id);
    writeWishlist(next);
    setIds(next);
  }, []);

  const clear = useCallback((idsToRemove?: string[]) => {
    const next = idsToRemove
      ? readWishlist().filter((x) => !idsToRemove.includes(x))
      : [];
    writeWishlist(next);
    setIds(next);
  }, []);

  return { ids, count: ids.length, has, toggle, remove, clear };
}

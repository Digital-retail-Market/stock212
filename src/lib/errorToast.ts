import { useState, useCallback } from 'react';

/**
 * withErrorToast — point d'entrée unique pour la gestion d'erreurs sur les
 * pages acheteur.
 *
 * Le projet mélange deux librairies UI (Chakra sur la majorité des pages,
 * Cloudscape sur Catalogue/Comparateur/Déstockage/Optimiseur), donc ce
 * helper ne dépend d'aucune des deux : il prend en paramètre une fonction
 * "toast-like" (le `toast()` de Chakra fonctionne tel quel ; pour les pages
 * Cloudscape, utiliser le hook `useFlashToast()` ci-dessous qui expose la
 * même signature via un Flashbar).
 *
 * Avant ce fichier, chaque page gérait ses erreurs à la main : certaines les
 * affichaient dans un Flashbar « success » vert (BuyerDestockage), d'autres
 * les avalaient silencieusement (aucun retour visuel), d'autres dupliquaient
 * le même bloc try/catch/toast (CheckoutPage, ProductDetailPage).
 */

export type ToastStatus = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  status: ToastStatus;
  duration?: number;
}

export type ToastFn = (options: ToastOptions) => void;

export interface WithErrorToastOptions {
  /** Titre affiché en cas d'erreur. Défaut : "Une erreur est survenue". */
  errorTitle?: string;
  /** Si fourni, un toast de succès est déclenché après une exécution réussie. */
  successTitle?: string;
  successDescription?: string;
}

/**
 * Exécute `fn`, affiche un toast d'erreur standardisé si elle échoue
 * (message lisible extrait de l'exception), et optionnellement un toast de
 * succès si elle réussit. Retourne le résultat de `fn`, ou `undefined` en
 * cas d'échec — à vérifier par l'appelant si la suite du code en dépend.
 */
export async function withErrorToast<T>(
  toast: ToastFn,
  fn: () => Promise<T>,
  options: WithErrorToastOptions = {},
): Promise<T | undefined> {
  try {
    const result = await fn();
    if (options.successTitle) {
      toast({
        title: options.successTitle,
        description: options.successDescription,
        status: 'success',
        duration: 3000,
      });
    }
    return result;
  } catch (e) {
    toast({
      title: options.errorTitle ?? 'Une erreur est survenue',
      description: e instanceof Error ? e.message : 'Erreur inattendue, réessayez.',
      status: 'error',
      duration: 5000,
    });
    return undefined;
  }
}

/**
 * Adaptateur pour les pages Cloudscape (pas de useToast natif). Expose une
 * fonction `toast` compatible avec `withErrorToast`, et `flashItems` à
 * brancher directement sur un <Flashbar items={flashItems} />.
 *
 *   const { toast, flashItems } = useFlashToast();
 *   await withErrorToast(toast, () => addToCartShared(...), {
 *     successTitle: 'Ajouté au panier',
 *   });
 *   return <Flashbar items={flashItems} />;
 */
export function useFlashToast() {
  const [flashItems, setFlashItems] = useState
    { id: string; type: 'success' | 'error' | 'warning' | 'info'; content: string; dismissible: true; onDismiss: () => void }[]
  >([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const type = options.status === 'error' ? 'error' : options.status === 'warning' ? 'warning' : options.status === 'info' ? 'info' : 'success';
    const content = options.description ? `${options.title} — ${options.description}` : options.title;

    setFlashItems((items) => [
      ...items,
      { id, type, content, dismissible: true, onDismiss: () => setFlashItems((cur) => cur.filter((i) => i.id !== id)) },
    ]);

    const timeout = options.duration ?? (options.status === 'error' ? 5000 : 3000);
    setTimeout(() => setFlashItems((cur) => cur.filter((i) => i.id !== id)), timeout);
  }, []);

  return { toast, flashItems };
}
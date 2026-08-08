import { supabase } from './supabase';

/**
 * Point d'entrée unique pour ajouter un produit au panier.
 *
 * Corrige deux bugs qui coexistaient avant ce fichier :
 *  1. « Panier fantôme » — BuyerCatalog, BuyerComparateur et BuyerDestockage
 *     écrivaient dans cart_items avec `cart_id: null` et des colonnes
 *     (`buyer_org_id`, `unit_price`) qui n'existent pas sur cart_items.
 *     La table exige `cart_id NOT NULL` et la policy RLS d'insertion vérifie
 *     l'existence d'un panier via ce cart_id — ces inserts échouaient
 *     purement et simplement.
 *  2. Écrasement de quantité — ProductDetailPage utilisait un upsert sur
 *     (cart_id, product_id) avec la quantité brute, donc ajouter deux fois
 *     le même produit remplaçait la quantité au lieu de l'additionner.
 *
 * Toute page qui ajoute un produit au panier doit passer par cette fonction.
 */
export async function addToCart(params: {
  buyerOrgId: string;
  productId: string;
  quantity: number;
  unitPrice: number | null;
}): Promise<{ error: string | null }> {
  const { buyerOrgId, productId, quantity, unitPrice } = params;

  // 1. Récupère le panier actif du buyer, ou le crée s'il n'existe pas.
  const { data: cartRows, error: cartFetchError } = await supabase
    .from('carts')
    .select('id')
    .eq('buyer_org_id', buyerOrgId)
    .eq('status', 'active')
    .eq('is_template', false)
    .order('created_at', { ascending: false })
    .limit(1);

  if (cartFetchError) return { error: cartFetchError.message };

  let cartId: string | null = cartRows?.[0]?.id ?? null;

  if (!cartId) {
    const { data: newCart, error: cartCreateError } = await supabase
      .from('carts')
      .insert({ buyer_org_id: buyerOrgId })
      .select('id')
      .single();
    if (cartCreateError || !newCart) {
      return { error: cartCreateError?.message ?? 'Impossible de créer le panier' };
    }
    cartId = newCart.id;
  }

  // 2. Incrémente si l'article est déjà dans CE panier, sinon l'insère.
  const { data: existing, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) return { error: existingError.message };

  if (existing) {
    const { error: updateError } = await supabase
      .from('cart_items')
      .update({
        quantity: existing.quantity + quantity,
        ...(unitPrice !== null ? { unit_price_computed: unitPrice } : {}),
      })
      .eq('id', existing.id);
    if (updateError) return { error: updateError.message };
  } else {
    const { error: insertError } = await supabase.from('cart_items').insert({
      cart_id: cartId,
      product_id: productId,
      quantity,
      unit_price_computed: unitPrice,
    });
    if (insertError) return { error: insertError.message };
  }

  return { error: null };
}
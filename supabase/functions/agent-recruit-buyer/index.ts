// supabase/functions/agent-recruit-buyer/index.ts
//
// Permet à un agent commercial (organisation_members.team_role = 'sales_rep',
// active = true) de créer un compte pour un acheteur qui n'est pas encore
// inscrit sur la plateforme, et de le rattacher immédiatement à son
// portefeuille (agent_buyer_portfolio).
//
// Passe obligatoirement par une Edge Function car la création d'un compte
// utilisateur nécessite la clé service_role (API Admin GoTrue), qui ne doit
// jamais être exposée côté client. Le reste (organisation, organisation_members,
// buyer_profiles, portefeuille agent) est fait avec le même client service_role
// pour garantir une seule source de vérité et un rollback best-effort en cas
// d'échec partiel.
//
// Déploiement : supabase functions deploy agent-recruit-buyer
// Test local  : supabase functions serve agent-recruit-buyer

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecruitPayload {
  org_name: string;
  contact_full_name: string;
  contact_email: string;
  contact_phone?: string;
  city?: string;
  region?: string;
  address_line1?: string;
  country?: string; // défaut 'MA' (Maroc)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée' }, 405);
  }

  // ─── 1. Authentification de l'appelant ────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: "Authentification requise" }, 401);
  }
  const jwt = authHeader.replace('Bearer ', '');

  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !callerData?.user) {
    return jsonResponse({ error: "Session invalide" }, 401);
  }
  const callerId = callerData.user.id;

  // ─── 2. Vérifier que l'appelant est bien un agent actif ───────────────────
  const { data: membership, error: membershipErr } = await admin
    .from('organisation_members')
    .select('id, organisation_id, commission_rate')
    .eq('user_id', callerId)
    .eq('team_role', 'sales_rep')
    .eq('active', true)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipErr) {
    return jsonResponse({ error: membershipErr.message }, 500);
  }
  if (!membership) {
    return jsonResponse({ error: "Vous n'êtes actuellement désigné agent commercial par aucun vendeur." }, 403);
  }
  const agentMemberId = membership.id as string;

  // ─── 3. Valider le payload ─────────────────────────────────────────────────
  let payload: RecruitPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const orgName = payload.org_name?.trim();
  const contactFullName = payload.contact_full_name?.trim();
  const contactEmail = payload.contact_email?.trim().toLowerCase();

  if (!orgName || orgName.length < 2) {
    return jsonResponse({ error: "Le nom de l'entreprise est requis (2 caractères minimum)." }, 400);
  }
  if (!contactFullName) {
    return jsonResponse({ error: 'Le nom du contact est requis.' }, 400);
  }
  if (!contactEmail || !isValidEmail(contactEmail)) {
    return jsonResponse({ error: "L'email du contact est invalide." }, 400);
  }

  // ─── 4. Créer le compte utilisateur (invitation par email) ────────────────
  // inviteUserByEmail crée l'utilisateur ET lui envoie un email pour définir
  // son mot de passe — aucun mot de passe temporaire à gérer côté agent.
  // Le trigger on_auth_user_created (migration 001) crée automatiquement la
  // ligne `profiles` correspondante à partir de raw_user_meta_data.full_name.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(contactEmail, {
    data: { full_name: contactFullName },
  });

  if (inviteErr || !invited?.user) {
    const alreadyExists = inviteErr?.message?.toLowerCase().includes('already') ?? false;
    return jsonResponse(
      {
        error: alreadyExists
          ? 'Un compte existe déjà avec cet email. Utilisez la recherche « acheteur déjà inscrit » à la place.'
          : (inviteErr?.message ?? "Échec de la création du compte"),
      },
      alreadyExists ? 409 : 500,
    );
  }
  const newUserId = invited.user.id;

  // Petit utilitaire de nettoyage en cas d'échec après ce point : on ne peut
  // pas tout faire dans une seule transaction Postgres (auth.admin est une
  // API HTTP séparée), donc on fait un rollback best-effort du côté qu'on
  // contrôle si une étape suivante échoue.
  async function rollbackUser() {
    await admin.auth.admin.deleteUser(newUserId).catch(() => {});
  }

  // ─── 5. Créer l'organisation acheteuse ─────────────────────────────────────
  const { data: org, error: orgErr } = await admin
    .from('organisations')
    .insert({
      name: orgName,
      org_type: 'buyer',
      country: payload.country || 'MA',
      city: payload.city || null,
      region: payload.region || null,
      address_line1: payload.address_line1 || null,
      phone: payload.contact_phone || null,
      // Recrutement fait par un agent de terrain : on ne bloque pas l'acheteur
      // derrière une validation admin, contrairement à une inscription libre.
      validation_status: 'active',
    })
    .select('id')
    .single();

  if (orgErr || !org) {
    await rollbackUser();
    return jsonResponse({ error: orgErr?.message ?? "Échec de la création de l'organisation" }, 500);
  }

  // ─── 6. Rattacher l'utilisateur comme owner + créer buyer_profiles ─────────
  const { error: memberErr } = await admin.from('organisation_members').insert({
    organisation_id: org.id,
    user_id: newUserId,
    team_role: 'owner',
    active: true,
  });
  if (memberErr) {
    await admin.from('organisations').delete().eq('id', org.id);
    await rollbackUser();
    return jsonResponse({ error: memberErr.message }, 500);
  }

  await admin.from('buyer_profiles').insert({ organisation_id: org.id });

  // ─── 7. Ajouter au portefeuille de l'agent ─────────────────────────────────
  const { error: portfolioErr } = await admin.from('agent_buyer_portfolio').insert({
    agent_member_id: agentMemberId,
    buyer_organisation_id: org.id,
    status: 'active',
  });
  if (portfolioErr) {
    // L'acheteur est créé et fonctionnel ; seul le rattachement au
    // portefeuille a échoué. On ne défait pas le compte pour ça — on
    // remonte l'erreur pour que l'agent réessaie l'ajout au portefeuille.
    return jsonResponse(
      {
        warning: "Compte acheteur créé, mais l'ajout à votre portefeuille a échoué : " + portfolioErr.message,
        organisation_id: org.id,
        user_id: newUserId,
      },
      207,
    );
  }

  return jsonResponse({
    success: true,
    organisation_id: org.id,
    user_id: newUserId,
    message: `Compte créé pour ${orgName}. Un email a été envoyé à ${contactEmail} pour définir le mot de passe.`,
  });
});
import type { OrgType } from '../types';

// Le rôle Commercial ne crée pas d'organisation propre (voir OnboardingPage.tsx),
// donc il n'appartient pas à OrgType — on l'ajoute ici pour couvrir les 4 rôles
// de l'onboarding.
export type OnboardingRole = OrgType | 'commercial';

// ── Rôle de l'onboarding ↔ valeur stockée en base ──────────────────────────────
// Le front garde ses valeurs de rôle historiques (buyer/seller/delivery/commercial),
// la table onboarding_field_definitions utilise le libellé français attendu côté admin.
export type FieldDefRole = 'acheteur' | 'vendeur' | 'livreur' | 'commercial';

export const ROLE_TO_FIELD_DEF_ROLE: Record<OnboardingRole, FieldDefRole> = {
  buyer: 'acheteur',
  seller: 'vendeur',
  delivery: 'livreur',
  commercial: 'commercial',
};

export const FIELD_DEF_ROLE_LABEL: Record<FieldDefRole, string> = {
  acheteur: 'Acheteur',
  vendeur: 'Vendeur',
  livreur: 'Livreur',
  commercial: 'Commercial',
};

// ── Types de champ supportés ────────────────────────────────────────────────────
export type OnboardingFieldType =
  | 'text' | 'number' | 'email' | 'url'
  | 'select' | 'multiselect' | 'boolean' | 'textarea' | 'document';

export const FIELD_TYPE_LABEL: Record<OnboardingFieldType, string> = {
  text: 'Texte court',
  number: 'Numérique',
  email: 'Email',
  url: 'URL',
  select: 'Liste déroulante',
  multiselect: 'Case à cocher multiple',
  boolean: 'Oui / Non',
  textarea: 'Texte long',
  document: 'Document (upload)',
};

// Types pour lesquels l'admin doit fournir une liste d'options
export const FIELD_TYPES_WITH_OPTIONS: OnboardingFieldType[] = ['select', 'multiselect'];

export interface OnboardingFieldDefinition {
  id: string;
  role: FieldDefRole;
  section: string;
  field_key: string;
  label: string;
  field_type: OnboardingFieldType;
  options: string[] | null;
  required: boolean;
  enabled: boolean;
  display_order: number;
  // "table.column" (ex: "seller_profiles.contact_referent") pour un champ core
  // qui écrit dans une colonne dédiée d'une table existante, ou null pour un
  // champ personnalisé stocké dans profile.custom_fields sous field_key.
  storage_target: string | null;
  // true pour les champs core migrés depuis le code (non créés depuis l'admin) —
  // affiché avec un badge et un garde-fou supplémentaire avant désactivation/suppression.
  is_system_field: boolean;
  created_at: string;
  updated_at: string;
}

export function parseStorageTarget(target: string): { table: string; column: string } {
  const [table, column] = target.split('.');
  return { table, column };
}

// Nom de section réservé aux champs de l'étape 2 (informations légales /
// identité) — doit rester synchronisé avec la valeur utilisée dans le seed
// SQL (migration 042). Tout le reste retombe sur l'étape 3.
export const LEGAL_STEP_SECTION = 'Informations légales';

// Valeur stockée dans profile.custom_fields pour un champ donné
export type CustomFieldValue = string | string[] | boolean | null;

// Regroupe une liste de définitions par section, en préservant l'ordre de section
// d'apparition puis le display_order au sein de chaque section.
export function groupFieldDefsBySection(
  defs: OnboardingFieldDefinition[],
): { section: string; fields: OnboardingFieldDefinition[] }[] {
  const sections: { section: string; fields: OnboardingFieldDefinition[] }[] = [];
  const index: Record<string, number> = {};
  for (const def of defs) {
    if (!(def.section in index)) {
      index[def.section] = sections.length;
      sections.push({ section: def.section, fields: [] });
    }
    sections[index[def.section]].fields.push(def);
  }
  return sections;
}

// Génère une clé technique stable (snake_case, sans accents) à partir d'un libellé.
export function slugifyFieldKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Formatte une valeur de custom_fields pour un affichage humain (AdminApprovals).
export function formatCustomFieldValue(value: unknown, fieldType?: OnboardingFieldType): string {
  if (value === null || value === undefined || value === '') return '—';
  if (fieldType === 'boolean') return value === true ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

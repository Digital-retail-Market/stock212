import type { Category } from '../types';

export function getCategoryLabel(category: Pick<Category, 'name' | 'name_i18n'>, lang: string): string {
  const translated = category.name_i18n?.[lang];
  return translated && translated.trim().length > 0 ? translated : category.name;
}

import type { Category } from '../types';
import i18n from '../i18n';

export function getCategoryLabel(category: Pick<Category, 'name' | 'name_i18n'>, lang?: string): string {
  const language = lang || i18n.language || 'en';

  // First try database translations
  const translated = category.name_i18n?.[language];
  if (translated && translated.trim().length > 0) return translated;

  // Fallback to i18n translations
  const i18nKey = `categories.names.${category.name}`;
  try {
    const i18nTranslated = i18n.t(i18nKey, { lng: language });
    if (i18nTranslated && i18nTranslated !== i18nKey) return i18nTranslated;
  } catch (e) {
    // Fallback continues
  }

  // Try English as last resort
  if (language !== 'en') {
    try {
      const englishTranslated = i18n.t(i18nKey, { lng: 'en' });
      if (englishTranslated && englishTranslated !== i18nKey) return englishTranslated;
    } catch (e) {
      // Fallback continues
    }
  }

  // Default to original name
  return category.name;
}

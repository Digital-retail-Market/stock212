import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGS = ['en', 'fr', 'ar'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const LANG_STORAGE_KEY = 'stock212_lang';
export const RTL_LANGS: SupportedLang[] = ['ar'];

export function isRtl(lang: string): boolean {
  return RTL_LANGS.includes(lang as SupportedLang);
}

export function getInitialLang(): SupportedLang {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
  return (SUPPORTED_LANGS as readonly string[]).includes(stored ?? '') ? (stored as SupportedLang) : 'fr';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } },
  lng: getInitialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

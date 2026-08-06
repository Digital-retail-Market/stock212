import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getInitialLang, isRtl, LANG_STORAGE_KEY, type SupportedLang } from '../i18n';

interface LanguageContextValue {
  lang: SupportedLang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: SupportedLang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [lang, setLangState] = useState<SupportedLang>(getInitialLang());
  const dir = isRtl(lang) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((next: SupportedLang) => {
    setLangState(next);
    i18n.changeLanguage(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
    if (user) {
      supabase.from('profiles').update({ preferred_lang: next }).eq('id', user.id).then();
    }
  }, [i18n, user]);

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

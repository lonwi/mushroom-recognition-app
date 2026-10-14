import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';
import { settingsStore } from '../services/storage/settingsStore';

export type LanguageType = 'pl' | 'en';
export type TranslationParams = Record<string, string | number>;

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string, params?: TranslationParams) => string;
}

/** Replaces every `{name}` in `template`, not only the first one. */
export function interpolate(template: string, params: TranslationParams): string {
  return Object.entries(params).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value)),
    template,
  );
}

export function translate(language: LanguageType, path: string, params?: TranslationParams): string {
  const dict = language === 'en' ? en : pl;
  const keys = path.split('.');
  let current: unknown = dict;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  if (typeof current !== 'string') return path;
  return params ? interpolate(current, params) : current;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'pl',
  setLanguage: () => {},
  t: (key: string, params?: TranslationParams) => translate('pl', key, params),
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>('pl');

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await settingsStore.getLanguage();
      if (storedLang) setLanguageState(storedLang);
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback((lang: LanguageType) => {
    setLanguageState(lang);
    void settingsStore.setLanguage(lang);
  }, []);

  const t = useCallback(
    (path: string, params?: TranslationParams) => translate(language, path, params),
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

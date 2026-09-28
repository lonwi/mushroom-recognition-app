import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pl } from '../i18n/pl';
import { en } from '../i18n/en';

type LanguageType = 'pl' | 'en';
type TranslationsType = typeof pl;

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'pl',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageType>('pl');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('app_language');
        if (storedLang === 'pl' || storedLang === 'en') {
          setLanguageState(storedLang as LanguageType);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: LanguageType) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('app_language', lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  const t = (path: string): string => {
    const dict = language === 'en' ? en : pl;
    const keys = path.split('.');
    let current: any = dict;
    for (const key of keys) {
      if (current[key] !== undefined) {
        current = current[key];
      } else {
        return path;
      }
    }
    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ja } from '../locales/ja';
import { en } from '../locales/en';

type Language = 'ja' | 'en';
type Translations = typeof ja;

// Helper to access nested keys string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('ja');
  const [translations, setTranslations] = useState<Translations>(ja);

  useEffect(() => {
    const savedLang = localStorage.getItem('lquest_language') as Language;
    if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
      setLangState(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lquest_language', language);
    setTranslations(language === 'ja' ? ja : en);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
  };

  const t = (key: string): string => {
    return getNestedValue(translations, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

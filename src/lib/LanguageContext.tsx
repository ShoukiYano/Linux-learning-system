import React, { createContext, useContext, useEffect, useState } from 'react';
import { ja } from '../locales/ja';
import { en } from '../locales/en';

// 対応する言語の型定義
type Language = 'ja' | 'en';
// 翻訳データの型定義（日本語ファイルを基準とする）
type Translations = typeof ja;

/**
 * ネストされたオブジェクトからキーパスを使って値を取得するヘルパー関数
 * 例: getNestedValue(obj, 'nav.home') -> obj['nav']['home']
 * 
 * @param obj 翻訳データオブジェクト
 * @param path ドット区切りのキーパス
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path;
};

/**
 * LanguageContextType
 * 言語コンテキストが提供する値と関数の型定義
 */
interface LanguageContextType {
  /** 現在選択されている言語 ('ja' | 'en') */
  language: Language;
  /** 言語を変更する関数 */
  setLanguage: (lang: Language) => void;
  /** キーから翻訳テキストを取得する関数 (translate) */
  t: (key: string) => string;
}

// コンテキストの作成
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * LanguageProvider Component
 * 
 * アプリケーション全体に多言語対応機能を提供するプロバイダーコンポーネントです。
 * 選択された言語を管理し、Local Storageへの保存・復元も行います。
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<Language>('ja');     // 言語ステート
  const [translations, setTranslations] = useState<Translations>(ja); // 現在の翻訳データ

  // ==========================================
  // 副作用 (Side Effects)
  // ==========================================

  /**
   * 初回マウント時にLocal Storageから保存された言語設定を読み込む
   */
  useEffect(() => {
    const savedLang = localStorage.getItem('lquest_language') as Language;
    if (savedLang && (savedLang === 'ja' || savedLang === 'en')) {
      setLangState(savedLang);
    }
  }, []);

  /**
   * 言語が変更されたときに実行
   * 1. Local Storageに設定を保存
   * 2. 対応する翻訳データをセット
   */
  useEffect(() => {
    localStorage.setItem('lquest_language', language);
    setTranslations(language === 'ja' ? ja : en);
  }, [language]);

  /**
   * 言語切り替え関数
   * @param lang 切り替え先の言語コード
   */
  const setLanguage = (lang: Language) => {
    setLangState(lang);
  };

  /**
   * 翻訳関数 (t function)
   * 指定されたキーに対応するテキストを現在の言語データから取得します
   * 
   * @param key ドット区切りの翻訳キー (例: 'nav.dashboard')
   * @returns 翻訳されたテキスト (見つからない場合はキーをそのまま返す)
   */
  const t = (key: string): string => {
    return getNestedValue(translations, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * useLanguage Hook
 * 言語コンテキストを利用するためのカスタムフック
 * コンポーネント内で { t, language, setLanguage } = useLanguage() のようにして使用します
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

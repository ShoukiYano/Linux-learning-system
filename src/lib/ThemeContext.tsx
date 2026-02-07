import React, { createContext, useContext, useEffect, useState } from 'react';

// テーマの型定義
type Theme = 'light' | 'dark';

/**
 * ThemeContextType
 * テーマコンテキストが提供する値と関数の型定義
 */
interface ThemeContextType {
  /** 現在のテーマ ('light' | 'dark') */
  theme: Theme;
  /** テーマを直接指定して変更する関数 */
  setTheme: (theme: Theme) => void;
  /** テーマを切り替える関数 (Light <-> Dark) */
  toggleTheme: () => void;
}

// コンテキストの作成
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider Component
 * 
 * アプリケーション全体のテーマ（ダークモード/ライトモード）を管理するプロバイダーです。
 * HTMLのルート要素にクラスを付与することで、Tailwind CSSのダークモードを制御します。
 * 設定はLocal Storageに保存され、次回訪問時にも維持されます。
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // テーマの初期化：Local Storageから取得、なければ'dark'をデフォルトとする
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('lquest_theme') as Theme) || 'dark';
  });

  // ==========================================
  // 副作用 (Side Effects)
  // ==========================================

  /**
   * テーマが変更されたときに実行
   * 1. <html>要素のクラスを更新 (Tailwind CSS用)
   * 2. Local Storageに保存
   */
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark'); // 一旦削除
    root.classList.add(theme); // 新しいテーマクラスを追加
    localStorage.setItem('lquest_theme', theme); // 保存
  }, [theme]);

  /**
   * テーマを特定の値に設定する関数
   * @param newTheme 設定したいテーマ
   */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  /**
   * テーマをトグル切り替えする関数
   * Dark -> Light -> Dark ...
   */
  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 * テーマコンテキストを利用するためのカスタムフック
 * コンポーネント内で { theme, toggleTheme } = useTheme() のようにして使用します
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

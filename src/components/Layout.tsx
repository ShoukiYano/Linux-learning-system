import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Book, LayoutDashboard, Settings, LogOut, Award, Users, Menu, X, User, Shield, HelpCircle, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';

/**
 * LayoutProps
 * レイアウトコンポーネントのプロパティ
 */
interface LayoutProps {
  /** 
   * メインコンテンツとして表示する子要素
   * ReactRouterの<Outlet />やページコンポーネントが渡されます
   */
  children: React.ReactNode;
}

/**
 * SidebarItem Component
 * 
 * サイドバー（および将来的なメニュー）で使用する個別のナビゲーション項目
 * 現在のパスと一致する場合にアクティブスタイルを適用します
 */
const SidebarItem = ({ icon: Icon, label, to, active }: { icon: any, label: string, to: string, active: boolean }) => (
  <Link
    to={to}
    className={clsx(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      // アクティブ状態と非アクティブ状態でスタイルを切り替え
      active 
        ? "bg-primary-500/10 text-primary-600 dark:text-primary-400 border-l-4 border-primary-500" 
        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
    )}
  >
    <Icon size={20} className={clsx(active ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
    <span className="font-medium">{label}</span>
  </Link>
);

/**
 * Layout Component
 * 
 * アプリケーション全体の共通レイアウトを定義するコンポーネントです。
 * - デスクトップ用サイドバー
 * - モバイル用ボトムナビゲーション
 * - モバイル用フルスクリーンメニュー
 * - メインコンテンツエリア
 * などを管理・表示します。
 * 
 * @component
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  // フックの初期化
  const location = useLocation(); // 現在のURL情報を取得
  const navigate = useNavigate(); // ページ遷移用関数
  const { user, signOut, isAdmin } = useAuth(); // 認証情報とログアウト関数
  const { t } = useLanguage(); // 多言語対応用関数
  
  // モバイルメニューの開閉状態管理
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  /**
   * ログアウト処理を行う関数
   * 認証コンテキストの signOut を呼び出し、ログイン画面へリダイレクトします
   */
  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  /**
   * ナビゲーション項目の設定配列
   * アイコン、ラベル、遷移先パスを定義
   * 管理者権限(isAdmin)によって表示項目を動的に変更しています
   */
  const navItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
    { icon: Terminal, label: t('nav.missions'), path: '/missions' },
    { icon: Book, label: t('nav.dictionary'), path: '/dictionary' },
    { icon: Award, label: t('nav.ranking'), path: '/leaderboard' },
    { icon: HelpCircle, label: t('nav.help'), path: '/help' },
    { icon: MessageCircle, label: t('nav.community'), path: '/community' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
    // 管理者のみ表示するメニュー項目
    ...(isAdmin ? [
      { icon: Shield, label: '管理者', path: '/admin' },
      { icon: Settings, label: '設定', path: '/settings' },
      { icon: Settings, label: '管理ツール', path: '/admin/commands' },
    ] : [
      { icon: Settings, label: t('nav.settings'), path: '/settings' },
    ]),
  ];

  /**
   * ページ遷移時にモバイルメニューを自動的に閉じる副作用
   */
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      
      {/* ==========================================
          デスクトップ用サイドバー (Left Sidebar)
          lgサイズ以上でのみ表示 (hidden lg:flex)
          ========================================== */}
      <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-bg border-r border-slate-200 dark:border-dark-border flex-col shadow-sm dark:shadow-none">
        {/* ロゴエリア */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-white dark:text-dark-bg font-bold font-mono">
            &gt;_
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">LinuxMastery</span>
        </div>

        {/* ユーザープロファイル簡易表示エリア */}
        <div className="px-4 mb-6">
          <Link to="/profile" className="block bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-sm dark:shadow-none hover:border-primary-500 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'User'}</div>
              <div className="text-xs text-primary-600 dark:text-primary-400">Level {user?.level || 1}</div>
            </div>
          </Link>
        </div>

        {/* ナビゲーションメニューリスト */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              to={item.path}
              active={location.pathname.startsWith(item.path)}
            />
          ))}
        </nav>

        {/* ログアウトボタンエリア */}
        <div className="p-4 border-t border-slate-200 dark:border-dark-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ==========================================
          モバイル用ボトムナビゲーション (Bottom Nav)
          lgサイズ未満でのみ表示 (lg:hidden)
          ========================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe-area shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center px-2 py-2">
          {/* ダッシュボード */}
          <Link 
            to="/dashboard" 
            className={clsx(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
              location.pathname === '/dashboard' ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <LayoutDashboard size={24} strokeWidth={location.pathname === '/dashboard' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t('nav.dashboard')}</span>
          </Link>
          
          {/* ミッション（ターミナル） */}
          <Link 
            to="/missions" 
            className={clsx(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
              location.pathname.startsWith('/missions') ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <Terminal size={24} strokeWidth={location.pathname.startsWith('/missions') ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t('nav.missions')}</span>
          </Link>

          {/* ランキング */}
          <Link 
            to="/leaderboard" 
            className={clsx(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
              location.pathname.startsWith('/leaderboard') ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
             <Award size={24} strokeWidth={location.pathname.startsWith('/leaderboard') ? 2.5 : 2} />
             <span className="text-[10px] font-bold">{t('nav.ranking')}</span>
          </Link>

          {/* メニュー開閉ボタン */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className={clsx(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors flex-1",
              isMobileMenuOpen ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <Menu size={24} strokeWidth={isMobileMenuOpen ? 2.5 : 2} />
            <span className="text-[10px] font-bold">メニュー</span>
          </button>
        </div>
      </nav>

      {/* ==========================================
          モバイル用フルスクリーンメニューオーバーレイ
          isMobileMenuOpenがtrueのときのみ表示
          ========================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-white font-bold font-mono">
                &gt;_
              </div>
              <span className="font-bold text-lg dark:text-white">Menu</span>
            </div>
            {/* 閉じるボタン */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="p-4 space-y-6">
            {/* モバイルメニュー内プロファイルリンク */}
            <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-bold text-lg text-slate-900 dark:text-white">{user?.name || 'User'}</div>
                <div className="text-sm text-primary-600 dark:text-primary-400">Level {user?.level || 1}</div>
              </div>
            </Link>

            {/* モバイルメニュー内ナビゲーションリスト */}
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              <div className="border-t border-slate-200 dark:border-slate-800 my-2"></div>
              {/* モバイルメニュー内ログアウトボタン */}
              <button 
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          メインコンテンツエリア
          ========================================== */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-dark-bg relative pb-20 lg:pb-0">
        {children}
      </main>

    </div>
  );
};

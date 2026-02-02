import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Book, LayoutDashboard, Settings, LogOut, Award, Users, Menu, X, User, Shield, HelpCircle, MessageCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../lib/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const SidebarItem = ({ icon: Icon, label, to, active }: { icon: any, label: string, to: string, active: boolean }) => (
  <Link
    to={to}
    className={clsx(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-primary-500/10 text-primary-400 border-l-4 border-primary-500" 
        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
    )}
  >
    <Icon size={20} className={clsx(active ? "text-primary-400" : "text-slate-500 group-hover:text-slate-300")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'ダッシュボード', path: '/dashboard' },
    { icon: Terminal, label: 'ミッション', path: '/missions' },
    { icon: Book, label: 'コマンド辞書', path: '/dictionary' },
    { icon: Award, label: 'ランキング', path: '/leaderboard' },
    { icon: HelpCircle, label: 'ヘルプ', path: '/help' },
    { icon: MessageCircle, label: 'コミュニティ', path: '/community' },
    { icon: User, label: 'プロフィール', path: '/profile' },
    ...(isAdmin ? [
      { icon: Shield, label: '管理者', path: '/admin' },
      { icon: Settings, label: '管理ツール', path: '/admin/commands' },
    ] : [
      { icon: Settings, label: '設定', path: '/settings' },
    ]),
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-slate-100 flex font-sans">
      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-slate-800 rounded-md border border-slate-700"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-dark-bg border-r border-dark-border transform transition-transform duration-300 lg:transform-none flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-dark-bg font-bold font-mono">
            &gt;_
          </div>
          <span className="text-xl font-bold tracking-tight">LinuxMastery</span>
        </div>

        <div className="px-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{user?.name || 'User'}</div>
              <div className="text-xs text-primary-400">Level {user?.level || 1} • Intermediate</div>
            </div>
          </div>
        </div>

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

        <div className="p-4 border-t border-dark-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span>ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-dark-bg relative">
        {children}
      </main>
    </div>
  );
};

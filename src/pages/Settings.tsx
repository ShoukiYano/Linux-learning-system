import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useLanguage } from '../lib/LanguageContext';
import { db } from '../lib/supabase';
import { User, Monitor, Globe, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

type SettingsTab = 'account' | 'appearance' | 'preferences';

export const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Account State
  const [displayName, setDisplayName] = useState('');

  // Appearance State (Local Only for now, except theme)
  const [fontSize, setFontSize] = useState('medium');
  const [opacity, setOpacity] = useState(90);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name);
    }
    // Load local settings
    const savedFontSize = localStorage.getItem('lquest_font_size') || 'medium';
    const savedOpacity = localStorage.getItem('lquest_opacity') || '90';

    setFontSize(savedFontSize);
    setOpacity(parseInt(savedOpacity));
  }, [user]);

  const handleSaveAccount = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      await db.updateUser(user.id, { name: displayName });
      setMessage({ type: 'success', text: t('settings.successMsg') });
    } catch (e) {
      setMessage({ type: 'error', text: t('settings.errorMsg') });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppearance = () => {
    localStorage.setItem('lquest_font_size', fontSize);
    localStorage.setItem('lquest_opacity', opacity.toString());
    setMessage({ type: 'success', text: t('settings.successMsg') });
  };

  const handleSavePreferences = () => {
    setMessage({ type: 'success', text: t('settings.successMsg') });
  };

  const tabs = [
    { id: 'account', label: t('settings.account'), icon: User },
    { id: 'appearance', label: t('settings.appearance'), icon: Monitor },
    { id: 'preferences', label: t('settings.preferences'), icon: Globe },
  ];

  if (!user) {
    return (
        <Layout>
            <div className="flex h-screen items-center justify-center text-slate-400">{t('common.loading')}</div>
        </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('settings.title')}</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id as SettingsTab);
                        setMessage(null);
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between p-4 text-left transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-l-4 border-primary-500'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 border-l-4 border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <ChevronRight size={16} className={clsx("transition-transform", activeTab === tab.id ? "rotate-90" : "")} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 min-h-[500px] shadow-sm dark:shadow-none">
            {message && (
              <div className={clsx(
                "mb-6 p-4 rounded-lg flex items-center gap-2 text-sm font-bold",
                message.type === 'success' 
                  ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20" 
                  : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20"
              )}>
                {message.text}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6 animate-in fade-in cursor-default">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-4">{t('settings.account')}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('settings.displayName')}</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('settings.email')}</label>
                    <div className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed">
                      {user.email}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t('settings.emailNote')}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveAccount}
                    disabled={loading}
                    className={clsx(
                      "px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loading ? t('common.loading') : t('settings.saveAccount')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in cursor-default">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-4">{t('settings.appearance')}</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('settings.theme')}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                          "p-4 rounded-lg border-2 text-left transition-all",
                          theme === 'dark' 
                            ? "border-primary-500 bg-slate-800 shadow-md" 
                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500"
                        )}
                      >
                        <div className="w-full h-20 bg-slate-900 rounded mb-2 border border-slate-700"></div>
                        <span className={clsx("font-bold", theme === 'dark' ? "text-primary-500" : "text-slate-700 dark:text-slate-300")}>{t('settings.darkMode')}</span>
                      </button>
                      <button
                         onClick={() => setTheme('light')}
                         className={clsx(
                          "p-4 rounded-lg border-2 text-left transition-all",
                          theme === 'light'
                            ? "border-primary-500 bg-white shadow-md relative z-10"
                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500"
                         )}
                      >
                         <div className="w-full h-20 bg-slate-50 rounded mb-2 border border-slate-200"></div>
                         <span className={clsx("font-bold", theme === 'light' ? "text-primary-600" : "text-slate-700 dark:text-slate-300")}>{t('settings.lightMode')}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('settings.fontSize')}</label>
                    <div className="flex gap-2">
                        {['small', 'medium', 'large'].map((size) => (
                            <button
                                key={size}
                                onClick={() => setFontSize(size)}
                                className={clsx(
                                    "flex-1 py-2 px-4 rounded-lg border text-sm font-bold transition-all",
                                    fontSize === size
                                        ? "bg-primary-500 text-white border-primary-500"
                                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                            >
                                {t(`settings.${size}`)}
                            </button>
                        ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{t('settings.opacity')} ({opacity}%)</label>
                    <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={opacity} 
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>{t('settings.transparent')}</span>
                        <span>{t('settings.opaque')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveAppearance}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors"
                  >
                    {t('settings.saveAppearance')}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6 animate-in fade-in cursor-default">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-4">{t('settings.preferences')}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('settings.language')}</label>
                    <select
                        value={language}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onChange={(e) => setLanguage(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                    >
                        <option value="ja">日本語</option>
                        <option value="en">English (Beta)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors"
                  >
                    {t('settings.savePreferences')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { Search, ChevronRight, Command, Copy, Loader2 } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { clsx } from 'clsx';

interface CommandDetail {
  id: string;
  name: string;
  description: string;
  usage: string;
  example: string;
  category: string;
  tags?: string[];
  options?: string;
  difficulty?: string;
}

export const Dictionary = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [commands, setCommands] = useState<CommandDetail[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<CommandDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const { data, error } = await db.getCommands();
        if (error) throw error;
        if (data) {
          setCommands(data);
          // 初期選択
          if (data.length > 0) setSelectedCommand(data[0]);
        }
      } catch (err) {
        console.error('Error fetching dictionary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommands();
  }, []);

  const filteredDocs = commands.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) || 
    doc.description.toLowerCase().includes(search.toLowerCase()) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categoryLabels: { [key: string]: string } = {
    'File Ops': t('missionList.categories.File Ops'),
    'Process': 'Process Management', // TODO: Add to locales if needed, defaulting to English-like for now or map
    'Text Processing': t('missionList.categories.Text Processing'),
    'Admin': 'Admin',
    'Permissions': t('missionList.categories.Permissions'),
    'Network': t('missionList.categories.Network'),
    'System': 'System',
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-20 lg:pb-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">📚 {t('dictionary.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t('dictionary.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-500" size={20} />
          </div>
          <input
            type="text"
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all shadow-sm"
            placeholder={`${t('dictionary.search')} (e.g. ls, chmod, grep)`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>{t('dictionary.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Command List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc, i) => (
                  <div
                    key={doc.id || i}
                    onClick={() => setSelectedCommand(doc)}
                    className={clsx(
                      "p-4 rounded-lg border cursor-pointer transition-all shadow-sm",
                      selectedCommand?.id === doc.id
                        ? "bg-primary-50 dark:bg-primary-500/20 border-primary-500"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <code className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded text-primary-600 dark:text-primary-400 font-bold font-mono border border-slate-200 dark:border-slate-700">
                          {doc.name}
                        </code>
                        <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                          {categoryLabels[doc.category] || doc.category}
                        </span>
                        {doc.difficulty && (
                          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                            doc.difficulty === 'Easy' ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                            doc.difficulty === 'Medium' ? 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                            'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          )}>
                            {doc.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{doc.description}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {doc.tags?.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Command size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t('dictionary.noMatch')}</p>
                </div>
              )}
            </div>

            {/* Command Detail */}
            <div className="lg:col-span-1">
              {selectedCommand ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sticky top-8 shadow-sm">
                  <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">{selectedCommand.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{selectedCommand.description}</p>

                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('dictionary.example')}</h4>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded p-3 font-mono text-sm text-primary-600 dark:text-primary-400 mb-2 border border-slate-200 dark:border-slate-700">
                      {selectedCommand.usage}
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedCommand.usage)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-transparent"
                    >
                      {copied ? t('dictionary.copied') : t('dictionary.copy')}
                    </button>
                  </div>

                  {selectedCommand.options && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('dictionary.options')}</h4>
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
                        {selectedCommand.options}
                      </div>
                    </div>
                  )}

                  <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t('dictionary.category')}</h4>
                    <p className="text-primary-600 dark:text-primary-400 text-sm">
                      {categoryLabels[selectedCommand.category] || selectedCommand.category}
                    </p>
                  </div>

                  {selectedCommand.tags && selectedCommand.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('dictionary.relatedTags')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCommand.tags.map(tag => (
                          <span
                            key={tag}
                            onClick={() => setSearch(tag)}
                            className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-500/30 transition-colors border border-primary-100 dark:border-transparent"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-slate-400 shadow-sm">
                  <Command size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('dictionary.selectPrompt')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && (
          <div className="mt-8 text-center text-sm text-slate-500">
             {t('dictionary.showingCount').replace('{count}', filteredDocs.length.toString()).replace('{total}', commands.length.toString())}
          </div>
        )}
      </div>
    </Layout>
  );
};

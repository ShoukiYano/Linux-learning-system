import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { Search, BookOpen, ThumbsUp, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { clsx } from 'clsx';

export const HelpCenter = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserVotes();
    }
  }, [user]);

  useEffect(() => {
    filterArticles();
  }, [articles, searchTerm, selectedCategory]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await db.getHelpArticles();
      if (data) setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    try {
      const { data } = await db.getHelpArticleVotes(user.id);
      if (data) {
        setUserVotes(new Set(data.map((v: any) => v.article_id)));
      }
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const filterArticles = () => {
    let filtered = articles.filter(article => article.is_published);

    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    setFilteredArticles(filtered);
  };

  const handleHelpful = async (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    if (!user) {
      alert(t('common.loginRequired') || 'ログインが必要です');
      return;
    }

    try {
      const { data, voted } = await db.toggleHelpfulVote(articleId, user.id);
      
      // Update local state for immediate feedback
      setArticles(prev => prev.map(a => 
        a.id === articleId ? { ...a, helpful_count: data.helpful_count } : a
      ));
      
      if (voted) {
        setUserVotes(prev => new Set([...prev, articleId]));
      } else {
        setUserVotes(prev => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      }

      if (selectedArticle?.id === articleId) {
        setSelectedArticle((prev: any) => ({ ...prev, helpful_count: data.helpful_count }));
      }
    } catch (error) {
      console.error('Error updating helpful count:', error);
    }
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-white">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-slate-900 dark:text-white">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc text-slate-600 dark:text-slate-400 my-1">{line.replace('- ', '')}</li>;
      }
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <div key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
            {parts.map((part, index) => index % 2 === 1 ? <b key={index} className="text-slate-900 dark:text-white font-bold">{part}</b> : part)}
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{line}</p>;
    });
  };

  const categories = Array.from(new Set(articles.map(a => a.category)));

  if (loading) {
    return <Layout><div className="p-8 text-slate-500 dark:text-slate-400">{t('helpCenter.loading')}</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={32} className="text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('helpCenter.title')}</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400">{t('helpCenter.subtitle')}</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={t('helpCenter.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-12 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 shadow-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold transition-colors",
                selectedCategory === ''
                  ? 'bg-primary-600 dark:bg-primary-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              {t('helpCenter.categories.all')}
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-4 py-2 rounded-lg font-bold transition-colors",
                  selectedCategory === cat
                    ? 'bg-primary-600 dark:bg-primary-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map(article => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:border-primary-500/50 hover:shadow-lg transition-all group cursor-pointer shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{article.title}</h3>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent whitespace-nowrap">
                  {article.category}
                </span>
              </div>

              <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 overflow-hidden text-sm">
                {article.content.replace(/[#*]/g, '')}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={(e) => handleHelpful(e, article.id)}
                  className={clsx(
                    "flex items-center gap-2 text-sm transition-colors group/btn",
                    userVotes.has(article.id)
                      ? "text-primary-600 dark:text-primary-400 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                  )}
                >
                  <ThumbsUp 
                    size={16} 
                    className={clsx(
                      "group-hover/btn:scale-110 transition-transform",
                      userVotes.has(article.id) && "fill-primary-600/10 dark:fill-primary-400/10"
                    )} 
                  />
                  <span>{article.helpful_count || 0} {t('helpCenter.helpful')}</span>
                </button>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(article.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-lg">{t('helpCenter.noResults')}</p>
          </div>
        )}

        {/* Article Detail Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-1 block">
                    {selectedArticle.category}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedArticle.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1">
                <div className="prose dark:prose-invert max-w-none">
                  {renderContent(selectedArticle.content)}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <button
                  onClick={(e) => handleHelpful(e, selectedArticle.id)}
                  className={clsx(
                    "flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-md active:scale-95",
                    userVotes.has(selectedArticle.id)
                      ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20"
                      : "bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600"
                  )}
                >
                  <ThumbsUp size={18} className={userVotes.has(selectedArticle.id) ? "fill-primary-600/20" : ""} />
                  <span>
                    {selectedArticle.helpful_count || 0} {t('helpCenter.helpful')}
                    {userVotes.has(selectedArticle.id) && "済み"}
                  </span>
                </button>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(selectedArticle.created_at).toLocaleDateString('ja-JP')} 公開
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

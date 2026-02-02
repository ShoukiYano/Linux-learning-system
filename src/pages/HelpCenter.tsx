import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../lib/supabase';
import { Search, BookOpen, ThumbsUp } from 'lucide-react';

export const HelpCenter = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

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

  const categories = Array.from(new Set(articles.map(a => a.category)));

  if (loading) {
    return <Layout><div className="p-8">読み込み中...</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold">ヘルプセンター</h1>
          </div>
          <p className="text-slate-400">Linuxコマンドの使い方やトラブルシューティングについて</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3 text-slate-500" size={20} />
            <input
              type="text"
              placeholder="記事を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                selectedCategory === ''
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              すべて
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
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
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-primary-500 transition-colors group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold group-hover:text-primary-400 transition-colors">{article.title}</h3>
                <span className="px-2 py-1 bg-slate-700 text-xs font-bold rounded text-slate-300">
                  {article.category}
                </span>
              </div>

              <p className="text-slate-400 mb-4 line-clamp-3">{article.content}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <ThumbsUp size={16} />
                  {article.helpful_count || 0} 役に立った
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(article.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">該当する記事が見つかりません</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

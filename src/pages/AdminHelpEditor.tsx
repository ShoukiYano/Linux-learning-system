import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, Plus, BookOpenCheck } from 'lucide-react';

export const AdminHelpEditor = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    is_published: true,
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchArticles();
  }, [isAdmin]);

  const fetchArticles = async () => {
    try {
      const { data } = await db.getHelpArticles();
      if (data) setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim() || !formData.category.trim()) {
      alert('必須項目をすべて入力してください');
      return;
    }

    try {
      if (editingArticle) {
        await db.updateHelpArticle(editingArticle.id, formData);
      } else {
        await db.createHelpArticle({ ...formData, user_id: user?.id });
      }
      resetForm();
      fetchArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (article: any) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      is_published: article.is_published,
    });
    setShowForm(true);
  };

  const handleDelete = async (articleId: string) => {
    if (confirm('この記事を削除しますか？')) {
      try {
        // Delete方法がないため、updateを使用
        await db.updateHelpArticle(articleId, { is_published: false });
        fetchArticles();
      } catch (error) {
        console.error('Error deleting article:', error);
      }
    }
  };

  const togglePublish = async (article: any) => {
    try {
      await db.updateHelpArticle(article.id, { is_published: !article.is_published });
      fetchArticles();
    } catch (error) {
      console.error('Error updating article:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', category: '', is_published: true });
    setEditingArticle(null);
    setShowForm(false);
  };

  if (!isAdmin) return <div className="p-8">アクセス権限がありません</div>;
  if (loading) return <Layout><div className="p-8">読み込み中...</div></Layout>;

  const categories = Array.from(new Set(articles.map(a => a.category)));

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpenCheck size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold">ヘルプ記事管理</h1>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              新規作成
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">{editingArticle ? '記事を編集' : '新しい記事を作成'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">タイトル *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  placeholder="例: lsコマンドの使い方"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">カテゴリ *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  list="categories"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  placeholder="例: ファイル操作"
                  required
                />
                <datalist id="categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">本文 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 font-mono h-48"
                  placeholder="記事の内容を入力（マークダウン対応）..."
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_published" className="text-sm font-bold cursor-pointer">
                  公開する
                </label>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-700">
                <button
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  {editingArticle ? '更新' : '作成'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold">記事一覧（{articles.length}件）</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold">タイトル</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">ステータス</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">作成日</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">操作</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article, idx) => (
                  <tr key={article.id} className={idx % 2 === 0 ? 'bg-slate-800/50' : ''}>
                    <td className="px-6 py-4 font-bold">{article.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-700 text-xs font-bold rounded">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        article.is_published
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {article.is_published ? '公開中' : '下書き'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(article.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => togglePublish(article)}
                          title={article.is_published ? '非公開にする' : '公開する'}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            article.is_published
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {article.is_published ? '公開' : '非公開'}
                        </button>
                        <button
                          onClick={() => handleEdit(article)}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="p-2 text-red-400 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface MissionFormData {
  id?: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  xp: number;
  isLocked: boolean;
}

export const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [formData, setFormData] = useState<MissionFormData>({
    title: '',
    description: '',
    category: 'File Ops',
    difficulty: 'Easy',
    xp: 100,
    isLocked: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchMissions();
  }, [isAdmin]);

  const fetchMissions = async () => {
    const { data } = await db.getMissions();
    if (data) setMissions(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        // Update mission
        await db.supabase
          .from('missions')
          .update(formData)
          .eq('id', editingId);
      } else {
        // Create mission
        await db.supabase
          .from('missions')
          .insert([formData]);
      }
      
      setFormData({
        title: '',
        description: '',
        category: 'File Ops',
        difficulty: 'Easy',
        xp: 100,
        isLocked: false,
      });
      setEditingId(null);
      setShowForm(false);
      await fetchMissions();
    } catch (error) {
      console.error('Error saving mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (mission: any) => {
    setFormData(mission);
    setEditingId(mission.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このミッションを削除してもよろしいですか？')) {
      await db.supabase.from('missions').delete().eq('id', id);
      await fetchMissions();
    }
  };

  if (!isAdmin) {
    return <div className="p-8">アクセス権限がありません</div>;
  }

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">管理者ダッシュボード</h1>

        {/* Admin Tools Menu */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <Link to="/admin" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-bold text-sm">ミッション</h3>
          </Link>
          <Link to="/admin/commands" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">📖</div>
            <h3 className="font-bold text-sm">コマンド</h3>
          </Link>
          <Link to="/admin/learning-paths" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">🎓</div>
            <h3 className="font-bold text-sm">学習パス</h3>
          </Link>
          <Link to="/admin/help" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">❓</div>
            <h3 className="font-bold text-sm">ヘルプ</h3>
          </Link>
          <Link to="/admin/qa" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-bold text-sm">Q&A</h3>
          </Link>
          <Link to="/admin/maintenance" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">🔧</div>
            <h3 className="font-bold text-sm">メンテナンス</h3>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">ミッション管理</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) setEditingId(null);
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <Plus size={20} /> 新規ミッション作成
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingId ? 'ミッション編集' : 'ミッション作成'}</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    title: '',
                    description: '',
                    category: 'File Ops',
                    difficulty: 'Easy',
                    xp: 100,
                    isLocked: false,
                  });
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">タイトル</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">カテゴリ</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option>File Ops</option>
                    <option>Permissions</option>
                    <option>Network</option>
                    <option>Text Processing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">難易度</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                    <option>Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">XP 報酬</label>
                  <input
                    type="number"
                    value={formData.xp}
                    onChange={(e) => setFormData({ ...formData, xp: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                    min="10"
                    step="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 h-24"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isLocked"
                  checked={formData.isLocked}
                  onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isLocked" className="text-sm font-bold">ロック状態（ユーザーが実行できません）</label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  <Save size={20} /> {loading ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Missions Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold">ミッション一覧</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold">タイトル</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">難易度</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">XP</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">ロック</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">操作</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((mission, idx) => (
                  <tr key={mission.id} className={idx % 2 === 0 ? 'bg-slate-800/50' : ''}>
                    <td className="px-6 py-4">{mission.title}</td>
                    <td className="px-6 py-4">{mission.category}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-bold">
                        {mission.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">{mission.xp} XP</td>
                    <td className="px-6 py-4">
                      {mission.isLocked ? '🔒 ロック中' : '🔓 公開中'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(mission)}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(mission.id)}
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

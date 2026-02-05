import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, Book } from 'lucide-react';
import { clsx } from 'clsx';

interface CommandData {
  id?: string;
  name: string;
  description: string;
  usage: string;
  example: string;
  category: string;
  difficulty: string;
  options?: string;
  tags?: string | string[];
}

export const AdminCommandEditor = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [commands, setCommands] = useState<any[]>([]);
  const [formData, setFormData] = useState<CommandData>({
    name: '',
    description: '',
    usage: '',
    example: '',
    category: 'File Ops',
    difficulty: 'Easy',
    options: '',
    tags: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchCommands();
  }, [isAdmin]);

  const fetchCommands = async () => {
    const { data } = await db.getCommands();
    if (data) setCommands(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        name: formData.name,
        description: formData.description,
        usage: formData.usage,
        example: formData.example,
        category: formData.category,
        difficulty: formData.difficulty,
        options: formData.options,
        tags: typeof formData.tags === 'string' 
          ? formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
          : formData.tags
      };

      if (editingId) {
        await db.updateCommand(editingId, dataToSave);
      } else {
        await db.createCommand(dataToSave);
      }
      
      resetForm();
      await fetchCommands();
    } catch (error) {
      console.error('Error saving command:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (command: any) => {
    setFormData({
      name: command.name || '',
      description: command.description || '',
      usage: command.usage || '',
      example: command.example || '',
      category: command.category || 'File Ops',
      difficulty: command.difficulty || 'Easy',
      options: command.options || '',
      tags: Array.isArray(command.tags) ? command.tags.join(', ') : (command.tags || '')
    });
    setEditingId(command.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このコマンドを削除してもよろしいですか？')) {
      await db.deleteCommand(id);
      await fetchCommands();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      usage: '',
      example: '',
      category: 'File Ops',
      difficulty: 'Easy',
      options: '',
      tags: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (!isAdmin) return <div className="p-8">アクセス権限がありません</div>;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Book size={32} className="text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">コマンド辞典エディタ</h1>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showForm) resetForm();
            }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            <Plus size={20} /> 新規コマンド追加
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 mb-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{editingId ? 'コマンド編集' : 'コマンド追加'}</h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">コマンド名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">カテゴリ</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                  >
                    <option>File Ops</option>
                    <option>Permissions</option>
                    <option>Network</option>
                    <option>Text Processing</option>
                    <option>System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">難易度</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 h-20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">使用方法</label>
                  <input
                    type="text"
                    value={formData.usage}
                    onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">使用例</label>
                  <input
                    type="text"
                    value={formData.example}
                    onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">利用可能なオプション (例: -l: 詳細表示, -a: 全表示)</label>
                  <textarea
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 h-24"
                    placeholder="-l: 詳細情報を表示&#10;-a: 隠しファイルを含めて表示"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-200">タグ (カンマ区切り)</label>
                  <input
                    type="text"
                    value={typeof formData.tags === 'string' ? formData.tags : ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500"
                    placeholder="basic, file, search"
                  />
                </div>
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
                  onClick={resetForm}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-2 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Commands Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">コマンド一覧（{commands.length}件）</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">コマンド</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">説明</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">カテゴリ</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">難易度</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd, idx) => (
                  <tr key={cmd.id} className={clsx("hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors", idx % 2 === 0 ? 'bg-white dark:bg-slate-800/50' : 'bg-slate-50/30 dark:bg-slate-800/20')}>
                    <td className="px-6 py-4 font-mono font-bold text-primary-600 dark:text-primary-400">{cmd.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{cmd.description}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{cmd.category}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded text-sm font-bold">
                        {cmd.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cmd)}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(cmd.id)}
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

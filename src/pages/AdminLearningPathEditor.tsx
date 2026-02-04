import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, Plus, BookOpen } from 'lucide-react';

export const AdminLearningPathEditor = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [paths, setPaths] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPath, setEditingPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    estimated_hours: 10,
    order_index: 0,
  });

  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const { data: pathsData } = await db.getLearningPaths();
      const { data: missionsData } = await db.getMissions();
      if (pathsData) setPaths(pathsData);
      if (missionsData) setMissions(missionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('学習パス名を入力してください');
      return;
    }

    try {
      if (editingPath) {
        await db.updateLearningPath(editingPath.id, {
          ...formData,
          title: formData.name,
          user_id: user?.id
        });
      } else {
        await db.createLearningPath({
          ...formData,
          title: formData.name,
          missions: selectedMissions,
          user_id: user?.id,
        });
      }
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving path:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (path: any) => {
    setEditingPath(path);
    setFormData({
      name: path.name || path.title,
      description: path.description || '',
      difficulty: path.difficulty || path.level?.toLowerCase() || 'intermediate',
      estimated_hours: path.estimated_hours || 10,
      order_index: path.order_index || 0,
    });
    setSelectedMissions(path.missions || []);
    setShowForm(true);
  };

  const handleDelete = async (pathId: string) => {
    if (confirm('この学習パスを削除しますか？')) {
      try {
        await db.deleteLearningPath(pathId);
        fetchData();
      } catch (error) {
        console.error('Error deleting path:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', difficulty: 'intermediate', estimated_hours: 10, order_index: 0 });
    setSelectedMissions([]);
    setEditingPath(null);
    setShowForm(false);
  };

  const addMission = (missionId: string) => {
    if (!selectedMissions.includes(missionId)) {
      setSelectedMissions([...selectedMissions, missionId]);
    }
  };

  const removeMission = (missionId: string) => {
    setSelectedMissions(selectedMissions.filter(id => id !== missionId));
  };

  const moveMission = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedMissions.length) return;

    const newMissions = [...selectedMissions];
    [newMissions[index], newMissions[newIndex]] = [newMissions[newIndex], newMissions[index]];
    setSelectedMissions(newMissions);
  };

  if (!isAdmin) return <div className="p-8">アクセス権限がありません</div>;
  if (loading) return <Layout><div className="p-8">読み込み中...</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold">学習パス管理</h1>
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
            <h2 className="text-2xl font-bold mb-6">{editingPath ? '編集' : '新規作成'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">学習パス名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  placeholder="例: Bashスクリプト基礎"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 h-24"
                  placeholder="このコースについての説明を入力..."
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">難易度</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="beginner">初級</option>
                    <option value="intermediate">中級</option>
                    <option value="advanced">上級</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">推定学習時間（時間）</label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">表示順 (小さい順)</label>
                  <input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3">ミッション管理 (ドラッグ＆ドロップではなく、ボタンで並べ替え)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Available Missions */}
                  <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                    <h3 className="font-bold mb-2 text-slate-400">利用可能なミッション</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                       {missions
                        .filter(m => !selectedMissions.includes(m.id))
                        .map(mission => (
                          <div key={mission.id} className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-700">
                            <span className="text-sm truncate mr-2">{mission.title}</span>
                            <button
                              type="button"
                              onClick={() => addMission(mission.id)}
                              className="text-primary-400 hover:text-white"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Selected Missions */}
                  <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                    <h3 className="font-bold mb-2 text-primary-400">選択中のミッション (上から順に表示)</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {selectedMissions.length === 0 && <p className="text-sm text-slate-500">ミッションが選択されていません</p>}
                      {selectedMissions.map((missionId, index) => {
                        const mission = missions.find(m => m.id === missionId);
                        if (!mission) return null;
                        return (
                          <div key={missionId} className="flex items-center justify-between p-2 bg-slate-800 rounded border border-primary-500/30">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="bg-primary-500/20 text-primary-400 text-xs font-bold px-2 py-0.5 rounded">{index + 1}</span>
                              <span className="text-sm truncate">{mission.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveMission(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMission(index, 'down')}
                                disabled={index === selectedMissions.length - 1}
                                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMission(missionId)}
                                className="p-1 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-700">
                <button
                  type="submit"
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                >
                  {editingPath ? '更新' : '作成'}
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

        {/* Paths Table */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold">学習パス一覧（{paths.length}個）</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold">順序</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">名前</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">難易度</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">推定時間</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">説明</th>
                  <th className="px-6 py-3 text-left text-sm font-bold">操作</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((path, idx) => (
                  <tr key={path.id} className={idx % 2 === 0 ? 'bg-slate-800/50' : ''}>
                    <td className="px-6 py-4 font-bold text-slate-400">#{path.order_index}</td>
                    <td className="px-6 py-4 font-bold">{path.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        path.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        path.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {path.difficulty === 'beginner' ? '初級' :
                         path.difficulty === 'intermediate' ? '中級' : '上級'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{path.estimated_hours}時間</td>
                    <td className="px-6 py-4 text-sm text-slate-400 truncate max-w-xs">{path.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(path)}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(path.id)}
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

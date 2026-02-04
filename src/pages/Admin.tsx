import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { ValidationType, ValidationParams } from '../types';

interface MissionStepFormData {
  id?: string;
  title: string;
  instruction: string;
  hint: string;
  validationType: ValidationType;
  validationParams: ValidationParams;
}

interface FileEntry {
  path: string;
  content: string;
}

interface MissionFormData {
  id?: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  xp: number;
  isLocked: boolean;
  orderIndex: number; // Added orderIndex
  steps: MissionStepFormData[];
  initialFileSystem: FileEntry[];
}

const emptyStep: MissionStepFormData = {
  title: '',
  instruction: '',
  hint: '',
  validationType: 'command_match',
  validationParams: { command: '' },
};

const initialFormData: MissionFormData = {
  title: '',
  description: '',
  category: 'File Ops',
  difficulty: 'Easy',
  xp: 100,
  isLocked: false,
  orderIndex: 0, // Initialize
  steps: [],
  initialFileSystem: [],
};

export const Admin = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [formData, setFormData] = useState<MissionFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

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
      let missionId = editingId;

      if (editingId) {
        // Update mission
        const { title, description, category, difficulty, xp, isLocked, initialFileSystem, orderIndex } = formData;
        await db.supabase
          .from('missions')
          .update({ 
            title, 
            description, 
            category, 
            difficulty, 
            xp, 
            is_locked: isLocked,
            order_index: orderIndex, // Save orderIndex
            initial_filesystem: initialFileSystem // Save initial FS
          })
          .eq('id', editingId);
      } else {
        // Create mission
        const { title, description, category, difficulty, xp, isLocked, initialFileSystem, orderIndex } = formData;
        const { data } = await db.supabase
          .from('missions')
          .insert([{ 
            title, 
            description, 
            category, 
            difficulty, 
            xp, 
            is_locked: isLocked,
            order_index: orderIndex, // Save orderIndex
            initial_filesystem: initialFileSystem // Save initial FS
          }])
          .select()
          .single();
        if (data) missionId = data.id;
      }

      // Save steps
      if (missionId && formData.steps.length > 0) {
        await db.saveMissionSteps(missionId, formData.steps);
      }

      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      setActiveStepIndex(null);
      await fetchMissions();
    } catch (error) {
      console.error('Error saving mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (mission: any) => {
    // Load mission with steps
    const { data: steps } = await db.getMissionSteps(mission.id);
    const formattedSteps: MissionStepFormData[] = (steps || []).map((step: any) => ({
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      hint: step.hint || '',
      validationType: step.validation_type as ValidationType,
      validationParams: step.validation_params || {},
    }));

    setFormData({
      id: mission.id,
      title: mission.title,
      description: mission.description,
      category: mission.category,
      difficulty: mission.difficulty,
      xp: mission.xp,
      isLocked: mission.is_locked || false,
      orderIndex: mission.order_index || 0, // Load orderIndex
      steps: formattedSteps,
      initialFileSystem: mission.initial_filesystem || [], // Load initial FS
    });
    setEditingId(mission.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('このミッションを削除してもよろしいですか？')) {
      await db.supabase.from('missions').delete().eq('id', id);
      await fetchMissions();
    }
  };

  // Step management functions
  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { ...emptyStep }],
    });
    setActiveStepIndex(formData.steps.length);
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
    setActiveStepIndex(null);
  };

  const updateStep = (index: number, field: keyof MissionStepFormData, value: any) => {
    const newSteps = [...formData.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData({ ...formData, steps: newSteps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.steps.length) return;

    const newSteps = [...formData.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setFormData({ ...formData, steps: newSteps });
    setActiveStepIndex(newIndex);
  };

  // Initial FS management functionality
  const addFile = () => {
    setFormData({
      ...formData,
      initialFileSystem: [...formData.initialFileSystem, { path: '', content: '' }]
    });
  };

  const removeFile = (index: number) => {
    const newFs = formData.initialFileSystem.filter((_, i) => i !== index);
    setFormData({ ...formData, initialFileSystem: newFs });
  };

  const updateFile = (index: number, field: keyof FileEntry, value: string) => {
    const newFs = [...formData.initialFileSystem];
    newFs[index] = { ...newFs[index], [field]: value };
    setFormData({ ...formData, initialFileSystem: newFs });
  };

  const getValidationParamsUI = (step: MissionStepFormData, index: number) => {
    switch (step.validationType) {
      case 'command_match':
        return (
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-400">完全一致コマンド</label>
            <input
              type="text"
              value={step.validationParams.command || ''}
              onChange={(e) => updateStep(index, 'validationParams', { command: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white"
              placeholder="例: pwd"
            />
          </div>
        );
      case 'command_contains':
        return (
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-400">コマンドに含む文字列</label>
            <input
              type="text"
              value={step.validationParams.pattern || ''}
              onChange={(e) => updateStep(index, 'validationParams', { pattern: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white"
              placeholder="例: ls"
            />
          </div>
        );
      case 'output_contains':
        return (
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-400">出力に含む文字列</label>
            <input
              type="text"
              value={step.validationParams.pattern || ''}
              onChange={(e) => updateStep(index, 'validationParams', { pattern: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white"
              placeholder="例: /home/student"
            />
          </div>
        );
      case 'file_exists':
        return (
          <div>
            <label className="block text-xs font-bold mb-1 text-slate-400">存在確認するファイルパス</label>
            <input
              type="text"
              value={step.validationParams.filePath || ''}
              onChange={(e) => updateStep(index, 'validationParams', { filePath: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white"
              placeholder="例: /home/student/test.txt"
            />
          </div>
        );
      case 'file_content_match':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-400">対象ファイルパス</label>
              <input
                type="text"
                value={step.validationParams.filePath || ''}
                onChange={(e) => updateStep(index, 'validationParams', { 
                  ...step.validationParams,
                  filePath: e.target.value 
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white"
                placeholder="例: /home/student/hello.txt"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-400">期待するファイル内容</label>
              <textarea
                value={step.validationParams.fileContent || ''}
                onChange={(e) => updateStep(index, 'validationParams', { 
                  ...step.validationParams,
                  fileContent: e.target.value 
                })}
                className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2 text-sm text-white h-24 font-mono"
                placeholder="ファイルに含まれるべき正確な内容を入力してください"
              />
            </div>
          </div>
        );
      default:
        return null;
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
          <Link to="/admin/missions" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500 rounded-lg p-4 text-center transition-all transform hover:scale-105">
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
              if (showForm) {
                setEditingId(null);
                setFormData(initialFormData);
                setActiveStepIndex(null);
              }
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
                  setFormData(initialFormData);
                  setActiveStepIndex(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info Section */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <h3 className="text-lg font-bold mb-4 text-primary-400">📋 基本情報</h3>
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
                  
                  <div>
                    <label className="block text-sm font-bold mb-2">表示順序 (小さい順)</label>
                    <input
                      type="number"
                      value={formData.orderIndex}
                      onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-bold mb-2">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500 h-24"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="isLocked"
                    checked={formData.isLocked}
                    onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isLocked" className="text-sm font-bold">ロック状態（ユーザーが実行できません）</label>
                </div>
              </div>

              {/* Initial File System Section */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-primary-400">📁 初期ファイルシステム</h3>
                  <button
                    type="button"
                    onClick={addFile}
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
                  >
                    <Plus size={16} /> ファイル追加
                  </button>
                </div>

                {formData.initialFileSystem.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>初期ファイルが設定されていません。「ファイル追加」ボタンから追加できます。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.initialFileSystem.map((file, index) => (
                      <div key={index} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 mr-4">
                            <label className="block text-xs font-bold mb-1 text-slate-400">ファイルパス (例: documents/hello.txt)</label>
                            <input
                              type="text"
                              value={file.path}
                              onChange={(e) => updateFile(index, 'path', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white font-mono"
                              placeholder="path/to/file.txt"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-2 text-red-400 hover:bg-slate-700 rounded transition-colors mt-4"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-400">ファイル内容</label>
                          <textarea
                            value={file.content}
                            onChange={(e) => updateFile(index, 'content', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white h-24 font-mono whitespace-pre"
                            placeholder="ファイルの中身を入力..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Steps Section */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-primary-400">📝 ミッションステップ</h3>
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-1 bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded text-sm font-bold transition-colors"
                  >
                    <Plus size={16} /> ステップ追加
                  </button>
                </div>

                {formData.steps.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>ステップがありません。「ステップ追加」ボタンをクリックしてください。</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          activeStepIndex === index
                            ? 'border-primary-500 bg-slate-800'
                            : 'border-slate-700 bg-slate-800/50'
                        }`}
                      >
                        {/* Step Header */}
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50"
                          onClick={() => setActiveStepIndex(activeStepIndex === index ? null : index)}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical size={16} className="text-slate-500" />
                            <span className="bg-primary-500/20 text-primary-400 text-xs font-bold px-2 py-1 rounded">
                              Step {index + 1}
                            </span>
                            <span className="font-medium text-sm">
                              {step.title || '(タイトル未設定)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }}
                              disabled={index === formData.steps.length - 1}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeStep(index); }}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Step Details (Expanded) */}
                        {activeStepIndex === index && (
                          <div className="p-4 border-t border-slate-700 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold mb-1 text-slate-400">ステップタイトル</label>
                                <input
                                  type="text"
                                  value={step.title}
                                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white"
                                  placeholder="例: 現在地の確認"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold mb-1 text-slate-400">検証タイプ</label>
                                <select
                                  value={step.validationType}
                                  onChange={(e) => {
                                    updateStep(index, 'validationType', e.target.value as ValidationType);
                                    updateStep(index, 'validationParams', {});
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white"
                                >
                                  <option value="command_match">コマンド完全一致</option>
                                  <option value="command_contains">コマンド部分一致</option>
                                  <option value="output_contains">出力に文字含む</option>
                                  <option value="file_exists">ファイル存在確認</option>
                                  <option value="file_content_match">ファイル内容一致</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold mb-1 text-slate-400">指示内容</label>
                              <textarea
                                value={step.instruction}
                                onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white h-20"
                                placeholder="例: `pwd` コマンドを使用して、現在のディレクトリパスを確認してください。"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold mb-1 text-slate-400">ヒント（任意）</label>
                                <input
                                  type="text"
                                  value={step.hint}
                                  onChange={(e) => updateStep(index, 'hint', e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded py-2 px-3 text-sm text-white"
                                  placeholder="例: pwd はPrint Working Directoryの略です"
                                />
                              </div>
                              {getValidationParamsUI(step, index)}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  <Save size={20} /> {loading ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData(initialFormData);
                    setActiveStepIndex(null);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors"
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
                  <th className="px-6 py-3 text-left text-sm font-bold">順序</th>
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
                    <td className="px-6 py-4 font-bold text-slate-400">#{mission.order_index}</td>
                    <td className="px-6 py-4">{mission.title}</td>
                    <td className="px-6 py-4">{mission.category}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-bold">
                        {mission.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">{mission.xp} XP</td>
                    <td className="px-6 py-4">
                      {mission.is_locked ? '🔒 ロック中' : '🔓 公開中'}
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

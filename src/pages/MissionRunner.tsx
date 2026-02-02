import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { NanoEditor } from '../components/NanoEditor';
import { MISSIONS, INITIAL_FILE_SYSTEM } from '../constants';
import { FileSystemNode, CommandHistory, MissionStep, ValidationType, ValidationParams } from '../types';
import { ChevronLeft, Play, CheckCircle, HelpCircle, RotateCcw, FolderTree, BookOpen, Zap, Folder, File, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { executeCommand, resolvePath, writeFile } from '../utils/terminalLogic';

// 検証関数を生成するヘルパー
const createValidationFunction = (
  validationType: ValidationType,
  validationParams: ValidationParams
): (history: CommandHistory[], fs: FileSystemNode, cwd: string) => boolean => {
  switch (validationType) {
    case 'command_match':
      return (history) => history.some(h => h.command.trim() === validationParams.command);
    case 'command_contains':
      return (history) => history.some(h => h.command.includes(validationParams.pattern || ''));
    case 'output_contains':
      return (history) => history.some(h => 
        typeof h.output === 'string' && h.output.includes(validationParams.pattern || '')
      );
    case 'file_exists':
      // ファイル存在確認は現在のファイルシステム状態を見る必要があるため、
      // lsコマンドの出力チェックではなく、実際のfsをチェックするように変更推奨だが
      // 既存の互換性のため両方見れるようにする、あるいはfsをチェックする
      return (history, fs, cwd) => {
        // history check (legacy)
        const inHistory = history.some(h => 
          h.command.includes('ls') && 
          typeof h.output === 'string' && 
          h.output.includes(validationParams.filePath || '')
        );
        if (inHistory) return true;

        // actual fs check
        if (validationParams.filePath) {
           const node = resolvePath(fs, cwd, validationParams.filePath);
           return !!node;
        }
        return false;
      };
    case 'file_content_match':
      return (_history, fs, cwd) => {
        if (!validationParams.filePath || validationParams.fileContent === undefined) return false;
        const node = resolvePath(fs, cwd, validationParams.filePath);
        if (!node || node.type !== 'file' || typeof node.content !== 'string') return false;
        // 改行や空白の扱いを少し柔軟にする（trimして比較）
        return node.content.trim() === validationParams.fileContent.trim();
      };
    default:
      return () => false;
  }
};

const renderFileTree = (node: FileSystemNode, path: string, depth: number = 0): React.ReactNode[] => {
  const result: React.ReactNode[] = [];
  
  if (!node.children) return result;
  
  Object.entries(node.children).forEach(([name, child]: any) => {
    const fullPath = `${path}/${name}`;
    const isDir = child.type === 'directory';
    
    result.push(
      <div key={fullPath} className="text-xs">
        <div className="flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-700/50 transition-colors" style={{ marginLeft: `${depth * 12}px` }}>
          {isDir ? <Folder size={14} className="text-blue-400" /> : <File size={14} className="text-slate-300" />}
          <span className={isDir ? "text-blue-300 font-bold" : "text-slate-200"}>{name}{isDir ? '/' : ''}</span>
        </div>
        {isDir && renderFileTree(child, fullPath, depth + 1)}
      </div>
    );
  });
  
  return result;
};

interface MissionData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  xp: number;
  steps: MissionStep[];
}

export const MissionRunner = () => {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loadingMission, setLoadingMission] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fs, setFs] = useState<FileSystemNode>(() => {
    // 初期化時にLocalStorageから読み込み
    const savedFs = localStorage.getItem('lquest_fs');
    return savedFs ? JSON.parse(savedFs) : JSON.parse(JSON.stringify(INITIAL_FILE_SYSTEM));
  });
  const [cwd, setCwd] = useState(() => {
    return localStorage.getItem('lquest_cwd') || '/home/student';
  });
  const [commandLog, setCommandLog] = useState<CommandHistory[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'files'>('guide');
  const [startTime, setStartTime] = useState<number>(Date.now());
  
  // Nano Editor State
  const [showNano, setShowNano] = useState(false);
  const [nanoFile, setNanoFile] = useState('');
  const [nanoContent, setNanoContent] = useState('');

  // ミッションデータの取得
  useEffect(() => {
    const loadMission = async () => {
      setLoadingMission(true);
      
      // まずデータベースからミッションを取得
      const { data: dbMission } = await db.getMissionWithSteps(id || '');
      
      if (dbMission && dbMission.steps && dbMission.steps.length > 0) {
        // データベースからのミッション（ステップあり）
        const formattedSteps: MissionStep[] = dbMission.steps.map((step: any) => ({
          id: step.id,
          title: step.title,
          instruction: step.instruction,
          hint: step.hint,
          validationType: step.validation_type as ValidationType,
          validationParams: step.validation_params as ValidationParams,
          validation: createValidationFunction(
            step.validation_type as ValidationType,
            step.validation_params as ValidationParams
          ),
        }));

        setMission({
          id: dbMission.id,
          title: dbMission.title,
          description: dbMission.description,
          category: dbMission.category,
          difficulty: dbMission.difficulty,
          xp: dbMission.xp,
          steps: formattedSteps,
        });
      } else {
        // フォールバック: constants.tsのハードコードミッション
        const constantMission = MISSIONS.find(m => m.id === id);
        if (constantMission) {
          setMission({
            id: constantMission.id,
            title: constantMission.title,
            description: constantMission.description,
            category: constantMission.category,
            difficulty: constantMission.difficulty,
            xp: constantMission.xp,
            steps: constantMission.steps,
          });
        }
      }
      
      setLoadingMission(false);
    };

    loadMission();
    loadMission();
  }, [id]);

  // データ永続化: fs または cwd が変更されたら保存
  useEffect(() => {
    // デバウンス処理（頻繁な書き込み防止）
    const timer = setTimeout(() => {
      localStorage.setItem('lquest_fs', JSON.stringify(fs));
      localStorage.setItem('lquest_cwd', cwd);
    }, 500);
    return () => clearTimeout(timer);
  }, [fs, cwd]);

  const currentStep = mission?.steps[currentStepIndex];

  const handleCommand = (cmd: string, output: string) => {
    // Nano起動チェック
    if (output.startsWith('__NANO__')) {
      const filename = output.replace('__NANO__', '');
      setNanoFile(filename);
      
      // ファイル内容の読み込み
      const node = resolvePath(fs, cwd, filename);
      // 新規ファイルなら空、既存ならその内容
      const content = node && node.type === 'file' ? node.content || '' : '';
      setNanoContent(content);
      setShowNano(true);
      return;
    }

    const newCommand: CommandHistory = {
      command: cmd,
      output,
      timestamp: Date.now(),
      status: output.includes('error') || output.includes('cannot') ? 'error' : 'success',
      cwd: cwd 
    };
    setCommandLog(prev => [...prev, newCommand]);
  };

  const checkProgress = () => {
    if (!mission || !currentStep) return;

    // 検証関数を取得または生成
    let isValid = false;
    if (currentStep.validation) {
      // 関数ベースの検証（constants.ts由来）
      isValid = currentStep.validation(commandLog);
    } else if (currentStep.validationType && currentStep.validationParams) {
      // パラメータベースの検証（データベース由来）
      const validationFn = createValidationFunction(
        currentStep.validationType,
        currentStep.validationParams
      );
      isValid = validationFn(commandLog, fs, cwd);
    }

    if (isValid) {
      if (currentStepIndex < mission.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        setShowHint(false);
      } else {
        completeMission();
      }
    } else {
      alert("条件が満たされていません。もう一度試してください。");
    }
  };

  const completeMission = async () => {
    if (!mission) return;
    setIsCompleted(true);
    if (user?.id) {
      const elapsedTime = Date.now() - startTime;
      await db.completeMission(user.id, mission.id, mission.xp);
      await db.logActivity(user.id, {
        type: 'mission_completed',
        missionId: mission.id,
        description: `${mission.title} をクリア (${commandLog.length}コマンド, ${Math.round(elapsedTime / 1000)}秒)`
      });
    }
  };

  const resetMission = () => {
    setCurrentStepIndex(0);
    setFs(JSON.parse(JSON.stringify(INITIAL_FILE_SYSTEM)));
    setCommandLog([]);
    setShowHint(false);
    setCwd('/home/student');
    setStartTime(Date.now());
    // LocalStorageもクリア
    localStorage.removeItem('lquest_fs');
    localStorage.removeItem('lquest_cwd');
  };

  const handleNanoSave = (content: string) => {
    const newFs = writeFile(fs, cwd, nanoFile, content);
    setFs(newFs);
    setNanoContent(content); // Update local content
  };

  // カレントディレクトリのファイル一覧を取得
  const getCurrentFiles = () => {
    const currentDir = resolvePath(fs, cwd, '.');
    if (!currentDir || !currentDir.children) return [];
    
    return Object.entries(currentDir.children).map(([name, node]) => ({
      name,
      type: node.type,
      content: node.content,
      permissions: node.permissions,
    }));
  };

  const currentFiles = getCurrentFiles();

  // ローディング中
  if (loadingMission) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-primary-500" />
          <p className="text-slate-400">ミッションを読み込み中...</p>
        </div>
      </div>
    );
  }

  // ミッションが見つからない
  if (!mission) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">ミッションが見つかりません</h1>
          <Link to="/missions" className="text-primary-400 hover:underline">
            ミッション一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  // ステップがない
  if (mission.steps.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">このミッションにはまだステップがありません</h1>
          <p className="text-slate-400 mb-4">{mission.title}</p>
          <Link to="/missions" className="text-primary-400 hover:underline">
            ミッション一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const successRate = commandLog.length > 0 
      ? Math.round((commandLog.filter(c => c.status === 'success').length / commandLog.length) * 100)
      : 100;
    
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-primary-500/50 max-w-md w-full text-center shadow-2xl shadow-primary-500/20">
          <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-500 animate-pulse">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">🎉 MISSION CLEAR!</h1>
          <p className="text-slate-400 mb-8">{mission.title}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900 p-3 rounded-lg">
              <div className="text-xs text-slate-500">コマンド数</div>
              <div className="font-bold text-xl text-white">{commandLog.length}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg">
              <div className="text-xs text-slate-500">クリアタイム</div>
              <div className="font-bold text-xl text-white">{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg">
              <div className="text-xs text-slate-500">正確性</div>
              <div className="font-bold text-xl text-primary-400">{successRate}%</div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-xl mb-8 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-white">レベルアップ!</span>
              <span className="text-yellow-400 font-bold flex items-center gap-1"><Zap size={16}/> +{mission.xp} XP 獲得!</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 w-3/4"></div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/missions" className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors">
              ミッション一覧へ
            </Link>
            <Link to="/dashboard" className="flex-1 py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20">
              ダッシュボードへ &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-900 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/missions" className="text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">{mission.category}</span>
            <span className="font-bold text-sm">{mission.title}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-yellow-400 text-sm font-bold bg-yellow-400/10 px-3 py-1 rounded-full">
            <Zap size={14}/> {mission.xp} XP
          </div>
          <button 
            onClick={resetMission}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-blue-500"></div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Guide */}
        <div className="w-1/3 border-r border-slate-700 flex flex-col bg-slate-900">
          <div className="flex border-b border-slate-700">
            <button 
              onClick={() => setActiveTab('guide')}
              className={clsx("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'guide' ? "border-primary-500 text-primary-400 bg-slate-800" : "border-transparent text-slate-400 hover:text-slate-200")}
            >
              <BookOpen size={16} /> ガイド
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={clsx("flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'files' ? "border-primary-500 text-primary-400 bg-slate-800" : "border-transparent text-slate-400 hover:text-slate-200")}
            >
              <FolderTree size={16} /> ファイル
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'guide' ? (
              <>
                <div className="mb-6">
                  <div className="inline-block px-2 py-1 bg-primary-500/20 text-primary-400 text-xs font-bold rounded mb-2">
                    Step {currentStepIndex + 1} / {mission.steps.length}
                  </div>
                  <h2 className="text-lg font-bold mb-3">{currentStep?.title}</h2>
                  <p className="text-slate-300 leading-relaxed text-sm">
                    {currentStep?.instruction}
                  </p>
                </div>

                {showHint && currentStep?.hint && (
                  <div className="bg-primary-900/20 border border-primary-500/30 p-4 rounded-lg mb-6 animate-in">
                    <div className="flex items-center gap-2 text-primary-400 font-bold text-sm mb-2">
                      <HelpCircle size={16} /> ヒント
                    </div>
                    <p className="text-sm text-primary-200">{currentStep.hint}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!showHint && currentStep?.hint && (
                    <button
                      onClick={() => setShowHint(true)}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm font-medium text-slate-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <HelpCircle size={14} /> ヒントを表示
                    </button>
                  )}
                  <button
                    onClick={checkProgress}
                    className="flex-1 py-2 px-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    <Play size={14} /> 検証
                  </button>
                </div>
              </>
            ) : (
              <div>
                <h3 className="font-bold text-sm mb-4 text-white">📁 ファイルシステム</h3>
                <div className="space-y-1 text-xs font-mono bg-slate-800/30 p-3 rounded-lg max-h-96 overflow-y-auto">
                  {fs && renderFileTree(fs, '')}
                  {!fs?.children || Object.keys(fs.children).length === 0 && (
                    <div className="text-slate-500 text-center py-8">📭 ファイルなし</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Terminal & GUI */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex gap-0 min-h-0">
            {/* Terminal */}
            <div className="flex-1 border-r border-slate-700 overflow-hidden relative">
              <Terminal 
                fs={fs}
                setFs={setFs}
                onCommand={handleCommand} 
                onCwdChange={setCwd}
              />
              {showNano && (
                <div className="absolute inset-0 z-50">
                  <NanoEditor 
                    filename={nanoFile}
                    initialContent={nanoContent}
                    onSave={handleNanoSave}
                    onClose={() => setShowNano(false)}
                  />
                </div>
              )}
            </div>

            {/* GUI File Manager */}
            <div className="w-1/2 border-l border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
              <div className="h-8 border-b border-slate-700 flex items-center px-4 bg-slate-800 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-auto text-xs text-slate-500">File Manager</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-[#0f172a]">
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                  <span className="text-red-400">📍</span>
                  <span>{cwd}</span>
                </div>
                <div className="space-y-2">
                  {currentFiles.length > 0 ? (
                    currentFiles.map((file) => (
                      <div 
                        key={file.name} 
                        className={`p-3 rounded-lg border transition-all ${
                          file.type === 'directory'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-slate-700/30 border-slate-600/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {file.type === 'directory' ? (
                              <Folder size={16} className="text-yellow-400" />
                            ) : (
                              <File size={16} className="text-slate-400" />
                            )}
                            <span className={file.type === 'directory' ? 'text-blue-300 font-bold' : 'text-slate-200'}>
                              {file.name}
                            </span>
                          </div>
                          {file.type === 'file' && (
                            <span className="text-xs text-slate-500">{file.content?.length || 0} bytes</span>
                          )}
                        </div>
                        {file.type === 'file' && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Last modified: just now
                            </div>
                            {file.content && (
                              <div className="bg-slate-800/50 p-2 rounded text-xs truncate">
                                <span className="text-slate-500">内容: </span>
                                <span className="text-green-400">"{file.content}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-center py-8">📭 ディレクトリは空です</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Bar */}
          <div className="h-10 border-t border-slate-700 bg-slate-800/50 flex items-center px-4 text-xs text-slate-400 gap-6">
            <span>✓ コマンド実行: {commandLog.filter(c => c.status === 'success').length}</span>
            <span>✗ エラー: {commandLog.filter(c => c.status === 'error').length}</span>
            <span>📂 現在のパス: {cwd}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

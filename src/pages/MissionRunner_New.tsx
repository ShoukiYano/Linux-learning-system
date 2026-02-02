import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { MISSIONS, INITIAL_FILE_SYSTEM } from '../constants';
import { FileSystemNode, CommandHistory } from '../types';
import { ChevronLeft, Play, CheckCircle, HelpCircle, RotateCcw, FolderTree, BookOpen, Zap, Folder, File } from 'lucide-react';
import { clsx } from 'clsx';
import { db } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

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

export const MissionRunner = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const mission = MISSIONS.find(m => m.id === id) || MISSIONS[0];
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [fs, setFs] = useState<FileSystemNode>(JSON.parse(JSON.stringify(INITIAL_FILE_SYSTEM)));
  const [cwd, setCwd] = useState('/home/student');
  const [commandLog, setCommandLog] = useState<CommandHistory[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'files'>('guide');
  const [startTime, setStartTime] = useState<number>(Date.now());

  const currentStep = mission.steps[currentStepIndex];

  const handleCommand = (cmd: string, output: string) => {
    const newCommand: CommandHistory = {
      command: cmd,
      output,
      timestamp: Date.now(),
      status: output.includes('error') || output.includes('cannot') ? 'error' : 'success',
      cwd: '/'
    };
    setCommandLog(prev => [...prev, newCommand]);
  };

  const checkProgress = () => {
    if (currentStep && currentStep.validation(commandLog)) {
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
    setStartTime(Date.now());
  };

  if (isCompleted) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const successRate = Math.round((commandLog.filter(c => c.status === 'success').length / commandLog.length) * 100);
    
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
            <div className="flex-1 border-r border-slate-700 overflow-hidden">
              <Terminal 
                fs={fs} 
                setFs={setFs} 
                onCommand={handleCommand}
                onFsChange={setFs}
                onCwdChange={setCwd}
              />
            </div>

            {/* GUI File Manager - リアルタイム同期 */}
            <div className="w-1/2 border-l border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
              <div className="h-8 border-b border-slate-700 flex items-center px-4 bg-slate-800">
                <span className="text-xs font-bold text-slate-400">📂 File Manager (GUI) - リアルタイム同期</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                <div className="text-slate-500 mb-4">📍 {cwd}</div>
                <div className="space-y-1">
                  {(() => {
                    const currentDir = cwd === '/' ? fs : (function findDir(node: FileSystemNode, path: string): FileSystemNode | null {
                      const parts = path.split('/').filter(p => p);
                      let current = node;
                      for (const part of parts) {
                        if (current.children && current.children[part]) {
                          current = current.children[part];
                        } else {
                          return null;
                        }
                      }
                      return current;
                    })(fs, cwd);
                    
                    if (!currentDir || !currentDir.children) {
                      return <div className="text-slate-600">📭 ファイルなし</div>;
                    }
                    
                    return Object.entries(currentDir.children).map(([name, child]: any) => (
                      <div key={name} className="flex items-center gap-2 p-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors animate-pulse">
                        {child.type === 'directory' ? (
                          <>
                            <span className="text-blue-400">📁</span>
                            <span className="text-blue-300 font-bold">{name}/</span>
                          </>
                        ) : (
                          <>
                            <span>📄</span>
                            <span className="text-slate-200">{name}</span>
                          </>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Info Bar - 同期状況表示 */}
          <div className="h-10 border-t border-slate-700 bg-slate-800/50 flex items-center px-4 text-xs text-slate-400 gap-6 font-mono">
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> 成功: {commandLog.filter(c => c.status === 'success').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-400">✗</span> エラー: {commandLog.filter(c => c.status === 'error').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-400">📊</span> ファイル数: {fs?.children ? Object.keys(fs.children).length : 0}
            </span>
            <span className="flex items-center gap-1 ml-auto text-primary-400">
              🔄 リアルタイム同期中
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

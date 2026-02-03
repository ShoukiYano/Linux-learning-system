import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Folder, File, Clock, FileText, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { FileSystemNode } from '../types';
import { executeCommandLine, resolvePath, writeFile, CommandResult } from '../utils/terminalLogic';
import { INITIAL_FILE_SYSTEM } from '../constants';
import { NanoEditor } from '../components/NanoEditor';

interface CommandEntry {
  command: string;
  output: string;
  time: string;
  comment?: string;
}

// 初期ファイルシステム（デモ用にシンプルに）
const DEMO_INITIAL_FS: FileSystemNode = {
  name: 'root',
  type: 'directory',
  permissions: 'drwxr-xr-x',
  children: {
    'home': {
      name: 'home',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'guest': {
          name: 'guest',
          type: 'directory',
          permissions: 'drwxr-xr-x',
          children: {}
        }
      }
    }
  }
};

// サンプルコマンドとその説明
const SAMPLE_COMMANDS = [
  // 基本コマンド
  { cmd: 'ls -la', desc: '詳細情報を表示（隠しファイル含む）', category: 'basic' },
  { cmd: 'mkdir -p project/docs', desc: 'ディレクトリを階層作成', category: 'basic' },
  { cmd: 'touch project/docs/readme.md', desc: 'ファイルを作成', category: 'basic' },
  { cmd: 'cp -r project backup', desc: 'ディレクトリを再帰的にコピー', category: 'basic' },
  { cmd: 'rm -rf backup', desc: 'ディレクトリを強制削除', category: 'basic' },
  
  // テキスト処理 (Practical)
  { cmd: 'echo "Apple\nBanana\nApple" > fruits.txt', desc: '複数行テキストを作成', category: 'practical' },
  { cmd: 'sort fruits.txt', desc: 'テキストをソート', category: 'practical' },
  { cmd: 'uniq fruits.txt', desc: '重複行を削除', category: 'practical' },
  { cmd: 'grep -n "Apple" fruits.txt', desc: '行番号付きで検索', category: 'practical' },
  { cmd: 'wc -l fruits.txt', desc: '行数をカウント', category: 'practical' },
  { cmd: 'diff fruits.txt project/main.txt', desc: 'ファイルの差分を表示', category: 'practical' },

  // システム管理・情報 (General/System)
  { cmd: 'tree', desc: 'ディレクトリ構造をツリー表示', category: 'general' },
  { cmd: 'du -h', desc: 'ディスク使用量を表示', category: 'general' },
  { cmd: 'df -h', desc: 'ディスク空き容量を表示', category: 'general' },
  { cmd: 'ps', desc: '実行中のプロセスを表示', category: 'general' },
  { cmd: 'date', desc: '現在の日時を表示', category: 'general' },
  { cmd: 'whoami', desc: '現在のユーザーを表示', category: 'general' },
  { cmd: 'history', desc: 'コマンド履歴を表示', category: 'general' },
];

// ファイルサイズをフォーマット
const formatFileSize = (content: string | undefined): string => {
  const bytes = content?.length || 0;
  if (bytes === 0) return '0 bytes';
  return `${bytes} bytes`;
};

export const Demo = () => {
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [input, setInput] = useState('');
  const [fs, setFs] = useState<FileSystemNode>(() => {
    // 初期化時にLocalStorageから読み込み
    const savedFs = localStorage.getItem('lquest_demo_fs');
    return savedFs ? JSON.parse(savedFs) : JSON.parse(JSON.stringify(DEMO_INITIAL_FS));
  });
  const [cwd, setCwd] = useState(() => {
    return localStorage.getItem('lquest_demo_cwd') || '/home/guest';
  });
  const [activeCategory, setActiveCategory] = useState<'basic' | 'practical' | 'general'>('basic');
  const terminalRef = useRef<HTMLDivElement>(null);
  
  // Nano Editor State
  const [showNano, setShowNano] = useState(false);
  const [nanoFile, setNanoFile] = useState('');
  const [nanoContent, setNanoContent] = useState('');

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  // データ永続化: fs または cwd が変更されたら保存
  useEffect(() => {
    // デバウンス処理（頻繁な書き込み防止）
    const timer = setTimeout(() => {
      localStorage.setItem('lquest_demo_fs', JSON.stringify(fs));
      localStorage.setItem('lquest_demo_cwd', cwd);
    }, 500);
    return () => clearTimeout(timer);
  }, [fs, cwd]);

  const handleCommand = (cmd: string, comment?: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const timestamp = new Date().toLocaleTimeString('ja-JP');

    if (trimmed === 'clear') {
      setCommands([]);
      setInput('');
      return;
    }

    const result = executeCommandLine(
      trimmed,
      fs,
      cwd,
      (newFs: FileSystemNode) => setFs(newFs),
      (newCwd: string) => setCwd(newCwd)
    );
    
    const output = result.output;

    // Nano起動チェック
    if (output.startsWith('__NANO__')) {
      const filename = output.replace('__NANO__', '');
      setNanoFile(filename);
      
      let content = '';
      if (result.stdinContent !== undefined) {
          content = result.stdinContent;
      } else {
          // ファイル内容の読み込み
          const node = resolvePath(fs, cwd, filename);
          // 新規ファイルなら空、既存ならその内容
          content = node && node.type === 'file' ? node.content || '' : '';
      }
      setNanoContent(content);
      setShowNano(true);
      setInput('');
      return;
    }

    if (output !== '__CLEAR__') {
      setCommands(prev => [...prev, { 
        command: trimmed, 
        output, 
        time: timestamp,
        comment 
      }]);
    }
    setInput('');
  };

  const handleNanoSave = (content: string) => {
    const newFs = writeFile(fs, cwd, nanoFile, content);
    setFs(newFs);
    setNanoContent(content); // Update local content
  };

  const reset = () => {
    setCommands([]);
    setFs(JSON.parse(JSON.stringify(DEMO_INITIAL_FS)));
    setCwd('/home/guest');
    setInput('');
    // LocalStorageもクリア
    localStorage.removeItem('lquest_demo_fs');
    localStorage.removeItem('lquest_demo_cwd');
  };

  // 現在のディレクトリのファイル一覧を取得
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

  const files = getCurrentFiles();

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center text-black font-bold">&gt;_</div>
            <span className="font-bold text-xl">L-Quest Demo</span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
          >
            <RotateCcw size={16} />
            リセット
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="text-primary-400 text-sm font-bold tracking-wider mb-2">INTERACTIVE DEMO</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            完全同期デモ: <span className="text-primary-400">コマンド</span>と<span className="text-primary-400">GUI</span>が一体になる
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            左のターミナルでコマンドを実行すると、右のGUIウィンドウにリアルタイムで反映されます。
            これが「黒い画面恐怖症」を消す秘訣です。
          </p>
        </div>

        {/* Main Demo Area */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch mb-8">
          {/* CLI Terminal */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[500px] relative">
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-auto text-xs text-slate-500">guest@l-quest:~</div>
            </div>

            <div
              ref={terminalRef}
              className="flex-1 p-4 font-mono text-sm text-slate-300 overflow-y-auto bg-[#0c0c0c]"
            >
              {commands.map((cmd, idx) => (
                <div key={idx} className="mb-3">
                  {cmd.comment && (
                    <div className="text-slate-500 text-xs mb-1"># {cmd.comment}</div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-primary-500 font-bold">guest@l-quest:~$</span>
                    <span className="text-white">{cmd.command}</span>
                  </div>
                  {cmd.output && (
                    <div className="text-slate-400 whitespace-pre-wrap mt-1 pl-4">{cmd.output}</div>
                  )}
                </div>
              ))}

              <div className="flex gap-2 items-center">
                <span className="text-primary-500 font-bold">guest@l-quest:~$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCommand(input);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none text-white placeholder-slate-600"
                  placeholder="コマンドを入力..."
                  autoFocus
                />
              </div>
            </div>
            
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
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-auto text-xs text-slate-500">File Manager</div>
            </div>

            <div className="flex-1 p-4 bg-[#0f172a] overflow-auto">
              <div className="text-sm font-mono">
                {/* Current Path */}
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                  <span className="text-red-400">📍</span>
                  <span>{cwd}</span>
                </div>

                {/* Files List */}
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">📭 ディレクトリは空です</div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.name}
                        className={clsx(
                          'p-3 rounded-lg border transition-all',
                          file.type === 'directory'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-slate-700/30 border-slate-600/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {file.type === 'directory' ? (
                              <Folder size={16} className="text-yellow-400" />
                            ) : (
                              <FileText size={16} className="text-slate-400" />
                            )}
                            <span className={file.type === 'directory' ? 'text-blue-300 font-bold' : 'text-slate-200'}>
                              {file.name}
                            </span>
                          </div>
                          {file.type === 'file' && (
                            <span className="text-xs text-slate-500">{formatFileSize(file.content)}</span>
                          )}
                        </div>
                        
                        {/* File Details */}
                        {file.type === 'file' && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock size={12} />
                              Last modified: just now
                            </div>
                            {file.content && (
                              <div className="bg-slate-800/50 p-2 rounded text-xs">
                                <span className="text-slate-500">内容: </span>
                                <span className="text-green-400">"{file.content}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Commands */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold mb-4">試してみるコマンド</h3>
          
          {/* Category Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'basic', label: '基本コマンド', icon: '📚' },
              { id: 'practical', label: '実用コマンド', icon: '🛠️' },
              { id: 'general', label: '一般コマンド', icon: '💡' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary-500 text-black'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Commands Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SAMPLE_COMMANDS.filter(c => c.category === activeCategory).map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleCommand(cmd.cmd, cmd.desc)}
                className="group p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-primary-400 group-hover:translate-x-1 transition-transform" />
                  <span className="font-mono text-sm text-primary-400">$ {cmd.cmd}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 pl-5">{cmd.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-primary-500/10 border border-primary-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-3">💡 このデモについて</h3>
          <p className="text-slate-300 leading-relaxed">
            左のターミナルでコマンドを入力すると、右のGUIが同期して更新されます。
            この「完全同期」が、L-Questの最大の特徴です。
            黒い画面での操作結果が、ビジュアルで確認できるので、
            初心者でも直感的にLinuxの仕組みが理解できます。
          </p>
        </div>
      </div>
    </div>
  );
};

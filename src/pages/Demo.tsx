import React, { useState, useRef, useEffect } from 'react';
import { Terminal, RotateCcw, Play, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

export const Demo = () => {
  const [commands, setCommands] = useState<Array<{ command: string; output: string; time: string }>>([]);
  const [input, setInput] = useState('');
  const [fileSystem, setFileSystem] = useState<Record<string, any>>({
    home: {
      type: 'dir',
      children: {}
    }
  });
  const [currentDir, setCurrentDir] = useState('/home');
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const timestamp = new Date().toLocaleTimeString('ja-JP');
    let output = '';
    let newFS = { ...fileSystem };
    let newDir = currentDir;

    if (trimmed === 'mkdir project') {
      output = '✓ Created directory: project';
      newFS.home.children = { ...newFS.home.children, project: { type: 'dir', children: {} } };
    } else if (trimmed === 'cd project') {
      output = '✓ Changed directory to: project';
      newDir = '/home/project';
    } else if (trimmed === 'ls' || trimmed === 'ls -la') {
      const dir = currentDir === '/home/project' ? newFS.home.children.project : newFS.home;
      const items = Object.entries(dir.children || {})
        .map(([name, item]: any) => `${item.type === 'dir' ? '📁' : '📄'} ${name}`)
        .join('\n');
      output = items || '(empty directory)';
    } else if (trimmed === 'touch main.txt') {
      output = '✓ Created file: main.txt';
      const dir = currentDir === '/home/project' ? newFS.home.children.project : newFS.home;
      if (dir.children) {
        dir.children.main = { type: 'file', content: '' };
      }
    } else if (trimmed.startsWith('echo') && trimmed.includes('>')) {
      output = '✓ File content updated';
      const parts = trimmed.split('>');
      const content = parts[0].replace('echo "', '').replace('"', '').trim();
      const fileName = parts[1].trim();
      const dir = currentDir === '/home/project' ? newFS.home.children.project : newFS.home;
      if (dir.children) {
        dir.children[fileName] = { type: 'file', content };
      }
    } else if (trimmed === 'pwd') {
      output = newDir;
    } else if (trimmed === 'clear') {
      setCommands([]);
      return;
    } else if (trimmed === 'help') {
      output = `利用可能なコマンド:
  mkdir <dir>    - ディレクトリを作成
  cd <dir>       - ディレクトリに移動
  ls [-la]       - ファイル一覧を表示
  touch <file>   - ファイルを作成
  echo "text" > <file> - ファイルに内容を追加
  pwd            - 現在のディレクトリを表示
  clear          - 画面をクリア
  help           - ヘルプを表示`;
    } else {
      output = `コマンドが見つかりません: ${trimmed}`;
    }

    setCommands([...commands, { command: cmd, output, time: timestamp }]);
    setFileSystem(newFS);
    setCurrentDir(newDir);
    setInput('');
  };

  const reset = () => {
    setCommands([]);
    setFileSystem({ home: { type: 'dir', children: {} } });
    setCurrentDir('/home');
    setInput('');
  };

  const sampleCommand = 'mkdir project';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* CLI Terminal */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-auto text-xs text-slate-500">Interactive Terminal</div>
            </div>

            <div
              ref={terminalRef}
              className="flex-1 p-6 font-mono text-sm text-slate-300 overflow-y-auto bg-[#0f172a]"
            >
              <div className="mb-4 text-emerald-400">
                Welcome to L-Quest Interactive Demo<br/>
                Type 'help' for available commands.
              </div>

              {commands.map((cmd, idx) => (
                <div key={idx} className="mb-4">
                  <div className="text-slate-500 text-xs mb-1">{cmd.time}</div>
                  <div className="mb-1">
                    <span className="text-primary-500">guest@l-quest:$</span> {cmd.command}
                  </div>
                  <div className="text-slate-400 whitespace-pre-wrap mb-2">{cmd.output}</div>
                </div>
              ))}

              <div className="flex items-center">
                <span className="text-primary-500">guest@l-quest:$</span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      executeCommand(input);
                    }
                  }}
                  className="flex-1 ml-2 bg-transparent outline-none text-white placeholder-slate-600"
                  placeholder="コマンドを入力..."
                  autoFocus
                />
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>

          {/* File System / GUI Display */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="ml-auto text-xs text-slate-500">File Manager (GUI)</div>
            </div>

            <div className="flex-1 p-6 bg-[#0f172a] overflow-auto">
              <div className="text-sm font-mono">
                <div className="text-slate-500 mb-4">📍 {currentDir}</div>

                <div className="space-y-3">
                  {currentDir === '/home' && fileSystem.home.children && (
                    <>
                      {Object.entries(fileSystem.home.children).map(([name, item]: any) => (
                        <div
                          key={name}
                          className={clsx(
                            'p-3 rounded-lg border transition-all',
                            item.type === 'dir'
                              ? 'bg-blue-500/10 border-blue-500/30 cursor-pointer hover:bg-blue-500/20'
                              : 'bg-slate-700/30 border-slate-600/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {item.type === 'dir' ? '📁' : '📄'} <span className="text-slate-200">{name}</span>
                            </span>
                            {item.type === 'file' && item.content && (
                              <span className="text-xs text-slate-500">{item.content.length} bytes</span>
                            )}
                          </div>
                          {item.type === 'file' && item.content && (
                            <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
                              💬 {item.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {currentDir === '/home/project' && fileSystem.home.children?.project?.children && (
                    <>
                      {Object.entries(fileSystem.home.children.project.children).map(([name, item]: any) => (
                        <div key={name} className="p-3 rounded-lg border bg-slate-700/30 border-slate-600/30">
                          <div className="flex items-center justify-between">
                            <span>📄 <span className="text-slate-200">{name}</span></span>
                            {item.content && <span className="text-xs text-slate-500">{item.content.length} bytes</span>}
                          </div>
                          {item.content && (
                            <div className="mt-2 text-xs text-slate-400 bg-slate-800/50 p-2 rounded">
                              💬 {item.content}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {(!fileSystem.home.children || Object.keys(fileSystem.home.children).length === 0) &&
                    currentDir === '/home' && (
                      <div className="text-slate-500 text-center py-12">📭 ファイルなし</div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Commands */}
        <div className="mt-12 bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <h3 className="text-lg font-bold mb-6">試してみるサンプルコマンド</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'mkdir project',
              'cd project',
              'touch main.txt',
              'echo "Hello Linux" > main.txt',
              'ls -la',
              'pwd',
            ].map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(cmd);
                  setTimeout(() => {
                    executeCommand(cmd);
                  }, 100);
                }}
                className="group p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-left"
              >
                <div className="font-mono text-sm text-primary-400 group-hover:text-primary-300">$ {cmd}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {cmd === 'mkdir project' && 'プロジェクトディレクトリを作成'}
                  {cmd === 'cd project' && 'プロジェクトフォルダに移動'}
                  {cmd === 'touch main.txt' && 'ファイルを新規作成'}
                  {cmd === 'echo "Hello Linux" > main.txt' && 'ファイルに内容を追加'}
                  {cmd === 'ls -la' && 'ファイル一覧を表示'}
                  {cmd === 'pwd' && '現在のディレクトリを表示'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-12 bg-primary-500/10 border border-primary-500/30 rounded-2xl p-8">
          <h3 className="text-lg font-bold mb-4">💡 このデモについて</h3>
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

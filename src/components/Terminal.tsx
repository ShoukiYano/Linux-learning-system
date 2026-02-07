import React, { useState, useEffect, useRef } from 'react';
import { CommandHistory, FileSystemNode } from '../types';
import { executeCommandLine, resolvePath, CommandResult } from '../utils/terminalLogic';
import { INITIAL_FILE_SYSTEM } from '../constants';
import { clsx } from 'clsx';
import { ErrorTranslator } from './ErrorTranslator';
import { VirtualKeyboard } from './VirtualKeyboard';

interface TerminalProps {
  fs?: FileSystemNode;
  setFs?: (fs: FileSystemNode) => void;
  onCommand?: (cmd: string, output: string, result: CommandResult) => void;
  onFsChange?: (fs: FileSystemNode) => void;
  onCwdChange?: (cwd: string) => void;
  fileSystem?: FileSystemNode;
  className?: string;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  fs = INITIAL_FILE_SYSTEM,
  setFs = () => {},
  onCommand = () => {},
  onFsChange = () => {},
  onCwdChange = () => {},
  fileSystem,
  className 
}) => {
  const [history, setHistory] = useState<CommandHistory[]>([
    { command: '', output: 'Welcome to L-Quest Interactive Mode!\nType "help" to see available commands.', timestamp: Date.now(), status: 'success', cwd: '/home/student' }
  ]);
  const [cwd, setCwdLocal] = useState('/home/student');
  const [oldPwd, setOldPwd] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
      // keep view at bottom when typing causes resize
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [input]);

  // Notify parent when fs or cwd changes
  useEffect(() => {
    onFsChange(fs);
  }, [fs, onFsChange]);
// ... existing effects ...
  useEffect(() => {
    onCwdChange(cwd);
  }, [cwd, onCwdChange]);

  // Scroll to bottom on history change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);
// ... existing setCwd ...
  const setCwd = (newCwd: string) => {
    if (newCwd !== cwd) setOldPwd(cwd);
    setCwdLocal(newCwd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault(); // フォーカス移動を防ぐ

      if (!input.trim()) return;
// ... (rest of Tab logic is fine, no changes needed inside) ...
      const args = input.split(' ');
      const lastArg = args[args.length - 1];
      
      // コマンド自体の補完（最初の引数）またはファイルパスの補完
      // 今回は簡易的に、ファイルパス補完のみ、またはコマンドリストからの補完を実装
      
      // パスの解析
      const lastSlashIndex = lastArg.lastIndexOf('/');
      let searchPath = '';
      let searchPrefix = lastArg;

      if (lastSlashIndex !== -1) {
        searchPath = lastArg.substring(0, lastSlashIndex);
        searchPrefix = lastArg.substring(lastSlashIndex + 1);
        if (searchPath === '') searchPath = '/'; // ルート直下の場合
      } else {
        searchPath = '.'; // カレントディレクトリ
      }

      // 検索対象のディレクトリノードを取得
      const targetDir = resolvePath(fs, cwd, searchPath);

      if (targetDir && targetDir.type === 'directory' && targetDir.children) {
        const candidates = Object.keys(targetDir.children).filter(name => 
          name.startsWith(searchPrefix)
        );

        if (candidates.length === 1) {
          // 候補が1つの場合は補完
          const completion = candidates[0];
          const newPath = lastSlashIndex !== -1 
            ? `${searchPath === '/' ? '' : searchPath}/${completion}`
            : completion;
            
          // ディレクトリならスラッシュを付加
          const isDir = targetDir.children[completion].type === 'directory';
          const finalCompletion = isDir ? `${newPath}/` : newPath;

          const newArgs = [...args];
          newArgs[newArgs.length - 1] = finalCompletion;
          setInput(newArgs.join(' '));
        } else if (candidates.length > 1) {
          // 候補が複数の場合は共通部分まで補完するか、候補を表示したいが、
          // ここではシンプルに、コンソールに出力する（擬似的なTab連打挙動）
          // 実際には history に候補を表示するのが親切
          const commonPrefix = candidates.reduce((prefix, current) => {
            let i = 0;
            while (i < prefix.length && i < current.length && prefix[i] === current[i]) {
              i++;
            }
            return prefix.substring(0, i);
          },candidates[0]);
          
          if (commonPrefix.length > searchPrefix.length) {
              // 共通部分までは補完
            const newPath = lastSlashIndex !== -1 
              ? `${searchPath === '/' ? '' : searchPath}/${commonPrefix}`
              : commonPrefix;
            
            const newArgs = [...args];
            newArgs[newArgs.length - 1] = newPath;
            setInput(newArgs.join(' '));
          } else {
             // 候補を表示
             // 現在の入力行の下に候補を表示し、新しいプロンプトを表示する
             const candidatesStr = candidates.join('  ');
             setHistory(prev => [
               ...prev,
               { command: input, output: candidatesStr, timestamp: Date.now(), status: 'success', cwd }
             ]);
          }
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent newline in textarea
      if (isExecuting) return;

      const cmdTrimmed = input.trim();
      if (!cmdTrimmed) {
        setHistory(prev => [...prev, { command: '', output: '', timestamp: Date.now(), status: 'success', cwd }]);
        setInput('');
        return;
      }
// ... (rest of Enter logic is fine) ...
      const result = executeCommandLine(
        cmdTrimmed,
        fs,
        cwd,
        (newFs: FileSystemNode) => setFs(newFs),
        (newCwd: string) => setCwd(newCwd),
        oldPwd,
        history
      );
      
      const output = result.output;
      
      if (output === '__CLEAR__') {
        setHistory([]);
        setInput('');
        return;
      }
      
      const newEntry: CommandHistory = {
        command: cmdTrimmed,
        output: result.isAsync ? 'Starting...' : output,
        timestamp: Date.now(),
        status: (output.includes('error') || output.includes('cannot') || output.includes('No such') || output.includes('command not found')) ? 'error' : 'success',
        cwd
      };

      setHistory(prev => [...prev, newEntry]);
      const entryId = history.length + 1; // Approximate ID for updating

      if (result.isAsync) {
        setIsExecuting(true);
        const startTime = Date.now();
        const duration = 5000; // 5 seconds
        const typeStr = result.asyncType === 'zip' ? 'adding' : 'inflating';
        const actionStr = result.asyncType === 'zip' ? 'deflated' : 'extracted';

        const timer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
          
          let simulatedOutput = result.asyncType === 'unzip' ? `Archive:  ${cmdTrimmed.split(' ')[1]}\n` : '';
          result.asyncTargets?.forEach(target => {
            simulatedOutput += `  ${typeStr}: ${target}${result.asyncType === 'zip' && target.endsWith('/') ? '/' : ''} (${actionStr} ${progress}%)\n`;
          });

          setHistory(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]) {
              updated[updated.length - 1].output = simulatedOutput.trim();
            }
            return updated;
          });

          if (progress >= 100) {
            clearInterval(timer);
            setIsExecuting(false);
            if (onCommand) onCommand(cmdTrimmed, simulatedOutput.trim(), result);
            
            // Apply changes to FS and CWD after operation completes
            if (result.newFs) setFs(result.newFs);
            if (result.newCwd) setCwd(result.newCwd);
            
            // Re-focus input after a tick
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }, 100);
      } else {
        if (onCommand) onCommand(cmdTrimmed, output, result);
      }
      setInput('');
    }
  };

  // ... (Virtual Keyboard Handler Wrappers) ...

  const handleVirtualKey = (key: string) => {
    setInput(prev => prev + key);
    inputRef.current?.focus();
  };

  const handleVirtualBS = () => {
    setInput(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleVirtualEnter = () => {
    const event = {
        key: 'Enter',
        preventDefault: () => {},
    } as React.KeyboardEvent;
    
    handleKeyDown(event);
    inputRef.current?.focus();
  };

  const handleVirtualLeft = () => {
    if (inputRef.current) {
      const pos = inputRef.current.selectionStart || 0;
      if (pos > 0) {
        inputRef.current.setSelectionRange(pos - 1, pos - 1);
        inputRef.current.focus();
      }
    }
  };

  const handleVirtualRight = () => {
    if (inputRef.current) {
      const pos = inputRef.current.selectionStart || 0;
      if (pos < input.length) {
        inputRef.current.setSelectionRange(pos + 1, pos + 1);
        inputRef.current.focus();
      }
    }
  };

  const handleVirtualNav = () => {
    inputRef.current?.focus();
  };

  const handleVirtualTab = () => {
    const event = {
        key: 'Tab',
        preventDefault: () => {},
    } as React.KeyboardEvent;
    
    handleKeyDown(event);
    inputRef.current?.focus();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div 
      className={clsx("bg-slate-50 dark:bg-[#0c0c0c] font-mono text-sm p-4 pb-0 flex flex-col transition-colors", className)}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="text-slate-400 dark:text-slate-500 mb-2 text-xs">Last login: {new Date().toDateString()} on tty1</div>
        
        {history.map((entry, i) => (
            <div key={i} className="mb-2">
            {entry.command !== undefined && (
                <div className="flex gap-2 flex-nowrap">
                <span className="text-primary-600 dark:text-primary-500 font-bold whitespace-nowrap shrink-0">student@l-quest:{entry.cwd}$</span>
                <span className="text-slate-800 dark:text-slate-100">{entry.command}</span>
                </div>
            )}
            {entry.output && (
                <div className={clsx("whitespace-pre-wrap mt-1", entry.status === 'error' ? "text-red-500 dark:text-red-400" : "text-slate-600 dark:text-slate-300")}>
                {entry.output}
                </div>
            )}
            {entry.status === 'error' && entry.output && (
                <ErrorTranslator command={entry.command} output={typeof entry.output === 'string' ? entry.output : ''} />
            )}
            </div>
        ))}

        <div className="flex gap-2 items-start flex-nowrap mb-4">
            <span className="text-primary-600 dark:text-primary-500 font-bold whitespace-nowrap shrink-0 pt-[2px]">student@l-quest:{cwd}$</span>
            <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            inputMode={isMobile ? 'none' : 'text'}
            rows={1}
            className={clsx(
                "bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 flex-1 caret-primary-500 resize-none overflow-hidden",
                isExecuting && "opacity-50 cursor-not-allowed"
            )}
            autoFocus
            autoComplete="off"
            spellCheck="false"
            />
        </div>
        <div ref={bottomRef} />
      </div>

       {/* Mobile Virtual Keyboard */}
       <div className="lg:hidden mt-auto -mx-4">
        <VirtualKeyboard
          onKeyPress={handleVirtualKey}
          onBS={handleVirtualBS}
          onEnter={handleVirtualEnter}
          onTab={handleVirtualTab}
          onUp={handleVirtualNav}
          onDown={handleVirtualNav}
          onLeft={handleVirtualLeft}
          onRight={handleVirtualRight}
        />
      </div>
    </div>
  );
};

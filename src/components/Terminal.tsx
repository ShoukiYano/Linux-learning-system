import React, { useState, useEffect, useRef } from 'react';
import { CommandHistory, FileSystemNode } from '../types';
import { executeCommandLine, resolvePath, CommandResult } from '../utils/terminalLogic';
import { INITIAL_FILE_SYSTEM } from '../constants';
import { clsx } from 'clsx';
import { ErrorTranslator } from './ErrorTranslator';
import { VirtualKeyboard } from './VirtualKeyboard';

/**
 * Terminal Component
 * 
 * ターミナルエミュレータのメインコンポーネントです。
 * コマンド入力の受け付け、実行、履歴の表示、ファイルシステムの操作を行います。
 * モバイル対応として、カスタム描画による入力欄と仮想キーボードの統合も行っています。
 * 
 * @component
 */
interface TerminalProps {
  /** 現在のファイルシステムの状態 */
  fs?: FileSystemNode;
  /** ファイルシステムを更新するための関数 */
  setFs?: (fs: FileSystemNode) => void;
  /** コマンド実行後に呼び出されるコールバック関数 */
  onCommand?: (cmd: string, output: string, result: CommandResult) => void;
  /** ファイルシステムが変更されたときに親に通知するコールバック */
  onFsChange?: (fs: FileSystemNode) => void;
  /** カレントディレクトリが変更されたときに親に通知するコールバック */
  onCwdChange?: (cwd: string) => void;
  /** 初期ファイルシステム（オプション） */
  fileSystem?: FileSystemNode;
  /** 追加のCSSクラス名 */
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
  // ==========================================
  // 状態管理 (State Management)
  // ==========================================

  /**
   * コマンド履歴とその実行結果を保持するステート
   * @type {CommandHistory[]}
   */
  const [history, setHistory] = useState<CommandHistory[]>([
    { command: '', output: 'Welcome to L-Quest Interactive Mode!\nType "help" to see available commands.', timestamp: Date.now(), status: 'success', cwd: '/home/student' }
  ]);

  /** 
   * 現在の作業ディレクトリ (Current Working Directory)
   * 初期値は '/home/student'
   */
  const [cwd, setCwdLocal] = useState('/home/student');

  /** 
   * 直前の作業ディレクトリ (Old PWD) - 'cd -' コマンドで使用
   */
  const [oldPwd, setOldPwd] = useState<string | undefined>(undefined);

  /** 
   * 現在入力中のコマンド文字列
   */
  const [input, setInput] = useState('');

  /** 
   * コマンド実行中かどうかを管理するフラグ
   * (非同期コマンド実行中の二重送信防止用)
   */
  const [isExecuting, setIsExecuting] = useState(false);

  /**
   * 入力中のカーソル位置 (0オリジン)
   * カスタム描画のためにJS側で管理が必要
   */
  const [cursorPos, setCursorPos] = useState(0);

  /** モバイル端末かどうかを判定するフラグ */
  const [isMobile, setIsMobile] = useState(false);

  // DOM参照
  const inputRef = useRef<HTMLInputElement>(null); // 非表示の入力要素への参照
  const bottomRef = useRef<HTMLDivElement>(null); // 自動スクロール用の最下部要素への参照

  // ==========================================
  // 副作用 (Side Effects / useEffect)
  // ==========================================

  /**
   * ファイルシステム(fs)が変更されたら親コンポーネントに通知する
   * 親側で状態を同期するために必要
   */
  useEffect(() => {
    onFsChange(fs);
  }, [fs, onFsChange]);

  /**
   * カレントディレクトリ(cwd)が変更されたら親コンポーネントに通知する
   */
  useEffect(() => {
    onCwdChange(cwd);
  }, [cwd, onCwdChange]);

  /**
   * 履歴(history)が更新されたら、自動的に一番下までスクロールする
   * 常に最新の出力が見えるようにするため
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  /**
   * 画面サイズを監視してモバイルモード判定を行う
   * 幅が1024px未満の場合をモバイルとする
   */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile(); // 初回実行
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile); // クリーンアップ
  }, []);

  // ==========================================
  // ヘルパー関数 (Helper Functions)
  // ==========================================

  /**
   * カレントディレクトリを更新し、直前のパス(OLD PWD)を保存するラッパー関数
   * @param newCwd 新しいディレクトリパス
   */
  const setCwd = (newCwd: string) => {
    if (newCwd !== cwd) setOldPwd(cwd);
    setCwdLocal(newCwd);
  };

  /**
   * 入力欄の内容が変更されたときの処理
   * 入力値とカーソル位置をステートに反映させる
   * @param e 入力イベント
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  /**
   * 入力欄でカーソル移動や選択が行われたときの処理
   * カーソル位置をステートに同期させる
   * @param e イベント
   */
  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPos(e.currentTarget.selectionStart || 0);
  };

  // ==========================================
  // イベントハンドラ (Event Handlers)
  // ==========================================

  /**
   * 物理キーボードのキー押下イベントを処理するメインハンドラ
   * Tab補完とEnterでのコマンド実行を制御
   * 
   * @param e キーボードイベント
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // --- Tabキー: コマンド/ファイル名補完 ---
    if (e.key === 'Tab') {
      e.preventDefault(); // ブラウザのフォーカス移動をキャンセル

      if (!input.trim()) return;

      // 入力をスペースで分割し、最後の部分（補完対象）を取得
      const args = input.split(' ');
      const lastArg = args[args.length - 1];
      
      // コマンド自体の補完（最初の引数）またはファイルパスの補完
      // 今回は簡易的に、ファイルパス補完のみ、またはコマンドリストからの補完を実装
      
      // パスの解析: ディレクトリ部分と検索プレフィックスに分離
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

      // 候補の検索
      if (targetDir && targetDir.type === 'directory' && targetDir.children) {
        const candidates = Object.keys(targetDir.children).filter(name => 
          name.startsWith(searchPrefix)
        );

        if (candidates.length === 1) {
          // 候補が1つだけの場合 -> 確定して補完
          const completion = candidates[0];
          const newPath = lastSlashIndex !== -1 
            ? `${searchPath === '/' ? '' : searchPath}/${completion}`
            : completion;
            
          // ディレクトリなら末尾にスラッシュを付加
          const isDir = targetDir.children[completion].type === 'directory';
          const finalCompletion = isDir ? `${newPath}/` : newPath;

          const newArgs = [...args];
          newArgs[newArgs.length - 1] = finalCompletion;
          setInput(newArgs.join(' ')); // 入力欄を更新
        } else if (candidates.length > 1) {
          // 候補が複数の場合 -> 共通部分まで補完するか、候補一覧を表示
          // 共通部分の抽出処理
          const commonPrefix = candidates.reduce((prefix, current) => {
            let i = 0;
            while (i < prefix.length && i < current.length && prefix[i] === current[i]) {
              i++;
            }
            return prefix.substring(0, i);
          },candidates[0]);
          
          if (commonPrefix.length > searchPrefix.length) {
            // 共通部分があればそこまで補完
            const newPath = lastSlashIndex !== -1 
              ? `${searchPath === '/' ? '' : searchPath}/${commonPrefix}`
              : commonPrefix;
            
            const newArgs = [...args];
            newArgs[newArgs.length - 1] = newPath;
            setInput(newArgs.join(' '));
          } else {
             // 共通部分がなければ候補一覧を履歴に出力（擬似的なTab連打挙動）
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

    // --- Enterキー: コマンド実行 ---
    if (e.key === 'Enter') {
      e.preventDefault(); // 改行入力を防ぐ
      if (isExecuting) return; // 実行中は受け付けない

      const cmdTrimmed = input.trim();
      
      // 空行の場合はプロンプトだけ履歴に残して終了
      if (!cmdTrimmed) {
        setHistory(prev => [...prev, { command: '', output: '', timestamp: Date.now(), status: 'success', cwd }]);
        setInput('');
        return;
      }

      // コマンド解析と実行 (terminalLogic.tsの関数を使用)
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
      
      // 'clear'コマンドの特別処理
      if (output === '__CLEAR__') {
        setHistory([]);
        setInput('');
        return;
      }
      
      // 履歴に追加する新しいエントリを作成
      const newEntry: CommandHistory = {
        command: cmdTrimmed,
        output: result.isAsync ? 'Starting...' : output,
        timestamp: Date.now(),
        // エラーっぽい出力が含まれていればstatusをerrorにする（赤文字表示のため）
        status: (output.includes('error') || output.includes('cannot') || output.includes('No such') || output.includes('command not found')) ? 'error' : 'success',
        cwd
      };

      setHistory(prev => [...prev, newEntry]);
      // const entryId = history.length + 1; // Approximate ID for updating // この行は不要なので削除

      // --- 非同期コマンドの実行シミュレーション (zip/unzipなど) ---
      if (result.isAsync) {
        setIsExecuting(true);
        const startTime = Date.now();
        const duration = 5000; // 5秒間処理
        const typeStr = result.asyncType === 'zip' ? 'adding' : 'inflating';
        const actionStr = result.asyncType === 'zip' ? 'deflated' : 'extracted';

        const timer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
          
          // 進捗状況のテキストを生成
          let simulatedOutput = result.asyncType === 'unzip' ? `Archive:  ${cmdTrimmed.split(' ')[1]}\n` : '';
          result.asyncTargets?.forEach(target => {
            simulatedOutput += `  ${typeStr}: ${target}${result.asyncType === 'zip' && target.endsWith('/') ? '/' : ''} (${actionStr} ${progress}%)\n`;
          });

          // 履歴の最新エントリの出力を更新
          setHistory(prev => {
            const updated = [...prev];
            if (updated[updated.length - 1]) {
              updated[updated.length - 1].output = simulatedOutput.trim();
            }
            return updated;
          });

          // 完了時の処理
          if (progress >= 100) {
            clearInterval(timer);
            setIsExecuting(false);
            if (onCommand) onCommand(cmdTrimmed, simulatedOutput.trim(), result);
            
            // 処理完了後にFSやCWDの変更を適用
            if (result.newFs) setFs(result.newFs);
            if (result.newCwd) setCwd(result.newCwd);
            
            // 少し待ってからフォーカスを戻す
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }, 100);
      } else {
        // 同期コマンドの場合
        if (onCommand) onCommand(cmdTrimmed, output, result);
      }
      
      // 入力をリセット
      setInput('');
      setCursorPos(0); 
    }
  };

  // ==========================================
  // 仮想キーボードハンドラ (Virtual Keyboard Handlers)
  // ==========================================

  /**
   * 文字キーが押されたときの処理
   * 現在のカーソル位置に文字を挿入する
   * @param key 入力された文字
   */
  const handleVirtualKey = (key: string) => {
    // 文字列の挿入処理: [カーソル前] + [新文字] + [カーソル後]
    const newVal = input.slice(0, cursorPos) + key + input.slice(cursorPos);
    setInput(newVal);
    
    // カーソルを進める
    const newPos = cursorPos + 1;
    setCursorPos(newPos);
    
    // 非表示のinput要素とも同期する（フォーカス維持のため）
    if (inputRef.current) {
      inputRef.current.value = newVal;
      inputRef.current.setSelectionRange(newPos, newPos);
      inputRef.current.focus();
    }
  };

  /**
   * バックスペース(BS)が押されたときの処理
   * カーソル直前の文字を削除する
   */
  const handleVirtualBS = () => {
    if (cursorPos === 0) {
        inputRef.current?.focus();
        return; // 先頭なら何もしない
    }
    // 文字列の削除処理: [カーソル-1まで] + [カーソル以降]
    const newVal = input.slice(0, cursorPos - 1) + input.slice(cursorPos);
    setInput(newVal);
    
    // カーソルを戻す
    const newPos = cursorPos - 1;
    setCursorPos(newPos);
    
    // input要素の同期
    if (inputRef.current) {
        inputRef.current.value = newVal;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
    }
  };

  /**
   * Enterキーが押されたときの処理
   * 物理キーボードのEnterイベントハンドラを再利用
   */
  const handleVirtualEnter = () => {
    const event = {
        key: 'Enter',
        preventDefault: () => {},
    } as React.KeyboardEvent;
    
    handleKeyDown(event);
    inputRef.current?.focus();
  };

  /**
   * 左矢印キーが押されたときの処理
   * カーソルを左に移動
   */
  const handleVirtualLeft = () => {
    if (cursorPos > 0) {
      const newPos = cursorPos - 1;
      setCursorPos(newPos);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }
  };

  /**
   * 右矢印キーが押されたときの処理
   * カーソルを右に移動
   */
  const handleVirtualRight = () => {
    if (cursorPos < input.length) {
      const newPos = cursorPos + 1;
      setCursorPos(newPos);
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }
  };

  /**
   * 上下キーが押されたときの処理（現状はフォーカスのみ）
   * 将来的にはコマンド履歴呼び出しに使用可能
   */
  const handleVirtualNav = () => {
    inputRef.current?.focus(); // 現状はフォーカスを維持するのみ
  };

  /**
   * Tabキーが押されたときの処理
   * 物理キーボードのTabイベントハンドラを再利用
   */
  const handleVirtualTab = () => {
    const event = {
        key: 'Tab',
        preventDefault: () => {},
    } as React.KeyboardEvent;
    
    handleKeyDown(event);
    inputRef.current?.focus();
  };

  return (
    <div 
      className={clsx("bg-slate-50 dark:bg-[#0c0c0c] font-mono text-sm p-4 pb-0 flex flex-col transition-colors", className)}
      // どこをクリックしてもinputにフォーカスが当たるようにする
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto">
        {/* ウェルカムメッセージ的な最終ログイン日時 */}
        <div className="text-slate-400 dark:text-slate-500 mb-2 text-xs">Last login: {new Date().toDateString()} on tty1</div>
        
        {/* コマンド履歴のレンダリング */}
        {history.map((entry, i) => (
            <div key={i} className="mb-2">
            {entry.command !== undefined && (
                // コマンドライン: プロンプトとコマンドを表示
                <div className="break-all whitespace-pre-wrap"> {/* Changed from flex to block layout */}
                <span className="text-primary-600 dark:text-primary-500 font-bold mr-2">student@l-quest:{entry.cwd}$</span>
                <span className="text-slate-800 dark:text-slate-100">{entry.command}</span>
                </div>
            )}
            {entry.output && (
                // コマンド出力: エラーなら赤字、成功なら通常色
                <div className={clsx("whitespace-pre-wrap break-all mt-1", entry.status === 'error' ? "text-red-500 dark:text-red-400" : "text-slate-600 dark:text-slate-300")}>
                {entry.output}
                </div>
            )}
            {/* エラーの場合、AIによるエラー解説を表示 */}
            {entry.status === 'error' && entry.output && (
                <ErrorTranslator command={entry.command} output={typeof entry.output === 'string' ? entry.output : ''} />
            )}
            </div>
        ))}

        {/* 現在のアクティブな入力行 (Custom Rendering) */}
        {/* プロンプトと入力を一体化して表示し、自然な折り返しを実現 */}
        <div className="relative mb-4 break-all whitespace-pre-wrap">
            <span className="text-primary-600 dark:text-primary-500 font-bold mr-2">student@l-quest:{cwd}$</span>
            
            {/* 入力内容のカスタム描画: カーソル位置の前・カーソル・後で分割表示 */}
            <span className="text-slate-800 dark:text-slate-100">
                {input.slice(0, cursorPos)}
                {/* カーソル: 点滅アニメーション付きのブロック */}
                <span className="bg-slate-500/50 dark:bg-slate-400/50 animate-pulse text-slate-900 dark:text-slate-50 inline-block min-w-[0.5em] align-middle">
                    {input[cursorPos] || '\u00A0'}
                </span>
                {input.slice(cursorPos + 1)}
            </span>

            {/* 
              非表示のInput要素
              - 実際のキー入力受け付けとIME制御を担当
              - ユーザーには見えないが、フォーカスはここにある
              - inputMode='none'にすることでモバイルキーボードを抑制(カスタムキーボード使用時)
            */}
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onSelect={handleInputSelect}
                onKeyDown={handleKeyDown}
                disabled={isExecuting}
                inputMode={isMobile ? 'none' : 'text'}
                className="absolute opacity-0 inset-0 w-full h-full cursor-default"
                autoFocus
                autoComplete="off"
            />
        </div>
        
        {/* 自動スクロール用アンカー */}
        <div ref={bottomRef} />
      </div>

       {/* モバイル版仮想キーボード (lgサイズ未満で表示) */}
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

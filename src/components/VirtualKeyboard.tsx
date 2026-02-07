import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Delete, CornerDownLeft } from 'lucide-react';

/**
 * VirtualKeyboardProps
 * 仮想キーボードコンポーネントが受け取るプロパティの定義
 */
interface VirtualKeyboardProps {
  /** 文字キーが押されたときのコールバック関数 (引数: 入力された文字) */
  onKeyPress: (key: string) => void;
  /** Backspaceキーが押されたときのコールバック関数 */
  onBS: () => void;
  /** Enterキーが押されたときのコールバック関数 */
  onEnter: () => void;
  /** Tabキーが押されたときのコールバック関数 */
  onTab: () => void;
  /** 上矢印キーが押されたときのコールバック関数 */
  onUp: () => void;
  /** 下矢印キーが押されたときのコールバック関数 */
  onDown: () => void;
  /** 左矢印キーが押されたときのコールバック関数 */
  onLeft: () => void;
  /** 右矢印キーが押されたときのコールバック関数 */
  onRight: () => void;
}

/**
 * VirtualKeyboard Component
 * 
 * モバイル端末向けに画面上に表示される仮想キーボードです。
 * 物理キーボードがない環境でもターミナル操作を行えるようにします。
 * QWERTY配列に準拠し、Shiftキーによる記号入力もサポートしています。
 * 
 * @component
 */
export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onKeyPress,
  onBS,
  onEnter,
  onTab,
  onUp,
  onDown,
  onLeft,
  onRight
}) => {
  // ==========================================
  // 状態管理 (State Management)
  // ==========================================

  /**
   * Shiftキーが押されているかどうかを管理するステート
   * trueの場合、アルファベットは大文字になり、数字キーは記号になります
   */
  const [isShift, setIsShift] = useState(false);

  /**
   * Shiftキー押下時のキーマッピング定義
   * キー(通常時) -> 値(Shift時) の対応表
   */
  const shiftMap: { [key: string]: string } = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '-': '~', // User requested - to ~ (チルダ)
    '[': '{', ']': '}',
    ';': ':', "'": '"',
    ',': '<', '.': '>', '/': '?'
  };

  // ==========================================
  // ヘルパー関数 (Helper Functions)
  // ==========================================

  /**
   * キーのラベルを取得する関数
   * Shift状態に応じて、表示する文字を切り替えます
   * 
   * @param key 基本となる文字（小文字や数字）
   * @returns Shift状態を考慮した文字（大文字や記号）
   */
  const getLabel = (key: string) => {
    if (isShift) {
      if (shiftMap[key]) return shiftMap[key]; // 記号の場合
      return key.toUpperCase(); // アルファベットの場合
    }
    return key;
  };

  /**
   * キーがクリックされたときのハンドラ
   * Shift状態を考慮した文字を親のonKeyPressに渡します
   * 
   * @param key クリックされたキーの基本文字
   */
  const handleKeyClick = (key: string) => {
    onKeyPress(getLabel(key));
  };

  // ==========================================
  // サブコンポーネント (Sub Components)
  // ==========================================

  /**
   * 個別のキーボタンを表示するコンポーネント
   * スタイルやクリック時の挙動を共通化しています
   */
  const KeyButton = ({ 
    label, 
    onClick, 
    className, 
    isAction = false, 
    isControl = false 
  }: { 
    label: React.ReactNode, 
    onClick: () => void, 
    className?: string, 
    isAction?: boolean, // Enter, Backspace などのアクションキー用スタイル
    isControl?: boolean // Shift, Ctrl, Esc, Tab, Arrows などの制御キー用スタイル
  }) => (
    <button
      onClick={(e) => {
        // イベントの伝播を防ぎ、親のフォーカス制御などを阻害しないようにする
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "flex items-center justify-center rounded m-[1px] active:bg-slate-700 select-none touch-manipulation",
        // 基本スタイル
        "h-10 text-lg font-mono font-bold transition-colors",
        // 色の条件分岐: アクション/制御キーは青系、通常キーは緑系
        isAction || isControl ? "text-cyan-400 border border-slate-700 bg-slate-800/50" : "text-green-500 border border-slate-800 bg-slate-900",
        // 個別クラスの上書き
        className || "flex-1"
      )}
    >
      {label}
    </button>
  );

  /**
   * スペースキー専用コンポーネント
   * 横幅を広く取るため個別に定義
   */
  const SpaceKey = () => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onKeyPress(" ");
      }}
      className="flex items-center justify-center rounded m-[1px] active:bg-slate-700 select-none touch-manipulation h-10 text-sm font-bold text-green-500 border border-slate-700 bg-slate-900 col-span-3 transition-colors"
    >
      SPACE
    </button>
  );

  return (
    <div className="w-full bg-[#050505] p-1 pb-2 select-none">
      {/* 
        キーボードレイアウト
        各行(Row)ごとにflexコンテナでラップして配置配置
      */}

      {/* Row 1: ESC, 数字キー(1-0), ハイフン, Backspace */}
      <div className="flex w-full mb-1">
        <KeyButton label="ESC" onClick={() => {}} isControl className="w-10 text-[10px]" />
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
        {/* Backspaceはアイコンを使用 */}
        <KeyButton label={<Delete size={18} />} onClick={onBS} isAction className="w-10" />
      </div>

      {/* Row 2: TAB, Q-P, カッコ */}
      <div className="flex w-full mb-1">
        <KeyButton label="TAB" onClick={onTab} isControl className="w-10 text-[10px]" />
        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
      </div>

      {/* Row 3: CTRL, A-L, セミコロン, クォート, ENTER */}
      <div className="flex w-full mb-1">
        <KeyButton label="CTRL" onClick={() => {}} isControl className="w-12 text-[10px]" />
        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
        <KeyButton label="ENTER" onClick={onEnter} isAction className="w-14 text-[10px]" />
      </div>

      {/* Row 4: SHIFT, Z-M, 記号, SHIFT */}
      <div className="flex w-full mb-1">
        <KeyButton 
          label="SHIFT" 
          onClick={() => setIsShift(!isShift)} 
          isControl 
          className={clsx("w-14 text-[10px]", isShift && "bg-slate-700 text-cyan-300")}
        />
        {['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
        <KeyButton 
          label="SHIFT" 
          onClick={() => setIsShift(!isShift)} 
          isControl 
          className={clsx("w-14 text-[10px]", isShift && "bg-slate-700 text-cyan-300")}
        />
      </div>

      {/* Row 5: ALT, CMD, SPACE, 矢印キー */}
      <div className="flex w-full justify-between px-1">
        <div className="flex gap-1 w-1/4">
          <KeyButton label="ALT" onClick={() => {}} isControl className="text-[10px]" />
          <KeyButton label="CMD" onClick={() => {}} isControl className="text-[10px]" />
        </div>
        
        {/* スペースキー */}
        <div className="flex-1 px-2">
            <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onKeyPress(" ");
            }}
            className="w-full h-10 flex items-center justify-center rounded bg-slate-900 border border-slate-700 text-green-500 font-bold active:bg-slate-800"
            >
            SPACE
            </button>
        </div>

        {/* 矢印キー (逆T字レイアウトっぽく配置) */}
        <div className="flex gap-1 items-center">
            <KeyButton label={<ArrowLeft size={16}/>} onClick={onLeft} isControl className="w-10" />
            <div className="flex flex-col gap-[2px]">
                <KeyButton label={<ArrowUp size={12}/>} onClick={onUp} isControl className="h-[19px] w-10" />
                <KeyButton label={<ArrowDown size={12}/>} onClick={onDown} isControl className="h-[19px] w-10" />
            </div>
            <KeyButton label={<ArrowRight size={16}/>} onClick={onRight} isControl className="w-10" />
        </div>
      </div>
    </div>
  );
};

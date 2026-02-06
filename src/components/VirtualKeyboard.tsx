import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Delete, CornerDownLeft } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBS: () => void;
  onEnter: () => void;
  onTab: () => void;
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
}

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
  const [isShift, setIsShift] = useState(false);

  const shiftMap: { [key: string]: string } = {
    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
    '-': '~', // User requested - to ~
    '[': '{', ']': '}',
    ';': ':', "'": '"',
    ',': '<', '.': '>', '/': '?'
  };

  const getLabel = (key: string) => {
    if (isShift) {
      if (shiftMap[key]) return shiftMap[key];
      return key.toUpperCase();
    }
    return key;
  };

  const handleKeyClick = (key: string) => {
    onKeyPress(getLabel(key));
  };

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
    isAction?: boolean, // Enter, Backspace
    isControl?: boolean // Shift, Ctrl, Esc, Tab, Arrows
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "flex items-center justify-center rounded m-[1px] active:bg-slate-700 select-none touch-manipulation",
        // Base structure
        "h-10 text-lg font-mono font-bold transition-colors",
        // Colors
        isAction || isControl ? "text-cyan-400 border border-slate-700 bg-slate-800/50" : "text-green-500 border border-slate-800 bg-slate-900",
        // Sizing override
        className || "flex-1"
      )}
    >
      {label}
    </button>
  );

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
      {/* Row 1: ESC, 1-0, -, BS */}
      <div className="flex w-full mb-1">
        <KeyButton label="ESC" onClick={() => {}} isControl className="w-10 text-[10px]" />
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
        <KeyButton label={<Delete size={18} />} onClick={onBS} isAction className="w-10" />
      </div>

      {/* Row 2: TAB, Q-P, [, ] */}
      <div className="flex w-full mb-1">
        <KeyButton label="TAB" onClick={onTab} isControl className="w-10 text-[10px]" />
        {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
      </div>

      {/* Row 3: CTRL, A-L, ;, ', ENTER */}
      <div className="flex w-full mb-1">
        <KeyButton label="CTRL" onClick={() => {}} isControl className="w-12 text-[10px]" />
        {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"].map(k => (
          <KeyButton key={k} label={getLabel(k)} onClick={() => handleKeyClick(k)} />
        ))}
        <KeyButton label="ENTER" onClick={onEnter} isAction className="w-14 text-[10px]" />
      </div>

      {/* Row 4: SHIFT, Z-M, ,, ., /, SHIFT */}
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

      {/* Row 5: ALT, CMD, SPACE, Arrows */}
      <div className="flex w-full justify-between px-1">
        <div className="flex gap-1 w-1/4">
          <KeyButton label="ALT" onClick={() => {}} isControl className="text-[10px]" />
          <KeyButton label="CMD" onClick={() => {}} isControl className="text-[10px]" />
        </div>
        
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

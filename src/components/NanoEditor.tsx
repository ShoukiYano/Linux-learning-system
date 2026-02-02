import React, { useState, useEffect, useRef } from 'react';

interface NanoEditorProps {
  filename: string;
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export const NanoEditor: React.FC<NanoEditorProps> = ({
  filename,
  initialContent,
  onSave,
  onClose
}) => {
  const [content, setContent] = useState(initialContent);
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea on mount
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+O: Write Out (Save)
    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      onSave(content);
      setMessage(`[ Wrote ${content.split('\n').length} lines ]`);
      setTimeout(() => setMessage(''), 2000);
    }

    // Ctrl+X: Exit
    if (e.ctrlKey && e.key === 'x') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c0c0c] text-white font-mono text-sm relative z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-slate-200 text-black">
        <div className="flex-1 text-center font-bold">GNU nano 6.2</div>
        <div className="flex-1 text-center">{filename || 'New Buffer'}</div>
        <div className="flex-1 text-right text-xs">Modified</div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 w-full h-full bg-transparent text-slate-100 p-2 border-none outline-none resize-none font-mono leading-relaxed"
          spellCheck="false"
        />
      </div>

      {/* Message Area */}
      <div className="h-6 px-2 flex items-center bg-[#0c0c0c] text-slate-100">
        {message}
      </div>

      {/* Footer / Help */}
      <div className="grid grid-cols-6 gap-x-2 gap-y-1 px-2 py-1 bg-[#0c0c0c] text-xs">
        <div><span className="font-bold">^G</span> Get Help</div>
        <div><span className="font-bold">^O</span> Write Out</div>
        <div><span className="font-bold">^W</span> Where Is</div>
        <div><span className="font-bold">^K</span> Cut Text</div>
        <div><span className="font-bold">^J</span> Justify</div>
        <div><span className="font-bold">^C</span> Cur Pos</div>
        
        <div><span className="font-bold">^X</span> Exit</div>
        <div><span className="font-bold">^R</span> Read File</div>
        <div><span className="font-bold">^\</span> Replace</div>
        <div><span className="font-bold">^U</span> Uncut Text</div>
        <div><span className="font-bold">^T</span> To Spell</div>
        <div><span className="font-bold">^_</span> Go To Line</div>
      </div>
    </div>
  );
};

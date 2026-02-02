import React, { useState, useEffect, useRef } from 'react';
import { CommandHistory, FileSystemNode } from '../types';
import { executeCommand } from '../utils/terminalLogic';
import { INITIAL_FILE_SYSTEM } from '../constants';
import { clsx } from 'clsx';

interface TerminalProps {
  fs?: FileSystemNode;
  setFs?: (fs: FileSystemNode) => void;
  onCommand?: (cmd: string, output: string) => void;
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
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Notify parent when fs or cwd changes
  useEffect(() => {
    onFsChange(fs);
  }, [fs, onFsChange]);

  useEffect(() => {
    onCwdChange(cwd);
  }, [cwd, onCwdChange]);

  // Scroll to bottom on history change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Wrapper for setCwd to also call callback
  const setCwd = (newCwd: string) => {
    setCwdLocal(newCwd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmdTrimmed = input.trim();
      if (!cmdTrimmed) {
        setHistory(prev => [...prev, { command: '', output: '', timestamp: Date.now(), status: 'success', cwd }]);
        setInput('');
        return;
      }

      if (cmdTrimmed === 'clear') {
        setHistory([]);
        setInput('');
        return;
      }

      // Parse command with quote support
      const parseCommand = (str: string) => {
        const args: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ' ' && !inQuotes) {
            if (current) {
              args.push(current);
              current = '';
            }
          } else {
            current += char;
          }
        }
        
        if (current) {
          args.push(current);
        }
        
        return args;
      };
      
      const args = parseCommand(cmdTrimmed);
      const cmd = args[0];
      const cmdArgs = args.slice(1);
      
      const output = executeCommand(cmd, cmdArgs, fs, cwd, setFs, setCwd);
      
      // Handle clear command output
      if (output === '__CLEAR__') {
        setHistory([]);
        setInput('');
        return;
      }
      
      const newEntry: CommandHistory = {
        command: cmdTrimmed,
        output,
        timestamp: Date.now(),
        status: output.includes('error') || output.includes('cannot') ? 'error' : 'success',
        cwd
      };

      setHistory(prev => [...prev, newEntry]);
      setInput('');
      if (onCommand) onCommand(cmdTrimmed, output);
    }
  };

  return (
    <div 
      className={clsx("bg-[#0c0c0c] font-mono text-sm p-4 overflow-y-auto flex flex-col", className)}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="text-slate-400 mb-2 text-xs">Last login: {new Date().toDateString()} on tty1</div>
      
      {history.map((entry, i) => (
        <div key={i} className="mb-2">
          {entry.command && (
            <div className="flex gap-2">
              <span className="text-primary-500 font-bold">student@l-quest:{entry.cwd}$</span>
              <span className="text-slate-100">{entry.command}</span>
            </div>
          )}
          {entry.output && (
            <div className={clsx("whitespace-pre-wrap mt-1", entry.status === 'error' ? "text-red-400" : "text-slate-300")}>
              {entry.output}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2 items-center">
        <span className="text-primary-500 font-bold">student@l-quest:{cwd}$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-slate-100 flex-1 caret-primary-500"
          autoFocus
          autoComplete="off"
          spellCheck="false"
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

export interface User {
  id: string;
  name: string;
  email: string;
  level: number;
  xp: number;
  streak: number;
  avatarUrl?: string;
  role: 'user' | 'admin';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: 'File Ops' | 'Permissions' | 'Network' | 'Text Processing';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  xp: number;
  isLocked: boolean;
  isCompleted: boolean;
  steps: MissionStep[];
}

export interface MissionStep {
  id: string;
  title: string;
  instruction: string;
  hint?: string;
  validation: (history: CommandHistory[]) => boolean;
  initialFileSystem?: FileSystemNode;
}

export interface CommandHistory {
  command: string;
  output: string | React.ReactNode;
  timestamp: number;
  status: 'success' | 'error';
  cwd: string;
}

export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string; // For files
  children?: { [key: string]: FileSystemNode }; // For directories
  permissions?: string; // e.g., "drwxr-xr-x"
  owner?: string;
}

export interface CommandDoc {
  name: string;
  description: string;
  usage: string;
  category: string;
  tags: string[];
}

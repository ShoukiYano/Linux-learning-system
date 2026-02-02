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

// 検証タイプの定義
export type ValidationType = 'command_match' | 'command_contains' | 'output_contains' | 'file_exists' | 'file_content_match';

export interface ValidationParams {
  command?: string;      // command_match用: 完全一致するコマンド
  pattern?: string;      // command_contains, output_contains用: 含まれるべきパターン
  filePath?: string;     // file_exists用: 存在確認するファイルパス
  fileContent?: string;  // file_content_match用: ファイルに含まれるべき内容
}

export interface MissionStep {
  id: string;
  title: string;
  instruction: string;
  hint?: string;
  // 従来の関数ベース検証（constants.ts用）
  validation?: (history: CommandHistory[]) => boolean;
  // データベース用の検証設定
  validationType?: ValidationType;
  validationParams?: ValidationParams;
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

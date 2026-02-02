import { Mission, CommandDoc, FileSystemNode } from './types';

export const MOCK_USER = {
  id: 'u1',
  name: 'Yuki Tanaka',
  email: 'yuki.linux@example.com',
  level: 12,
  xp: 1240,
  streak: 12,
  role: 'user' as const,
};

export const INITIAL_FILE_SYSTEM: FileSystemNode = {
  name: 'root',
  type: 'directory',
  permissions: 'drwxr-xr-x',
  children: {
    'home': {
      name: 'home',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'student': {
          name: 'student',
          type: 'directory',
          permissions: 'drwxr-xr-x',
          children: {
            'documents': {
              name: 'documents',
              type: 'directory',
              permissions: 'drwxr-xr-x',
              children: {
                'notes.txt': { name: 'notes.txt', type: 'file', content: 'Linux is awesome.', permissions: '-rw-r--r--' }
              }
            },
            'secret_file.txt': { name: 'secret_file.txt', type: 'file', content: 'Top Secret', permissions: '-rw-r--r--' }
          }
        }
      }
    }
  }
};

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: '迷宮からの脱出 (Escape the Maze)',
    description: 'ディレクトリ構造の基本概念を理解し、正しいパスを指定して迷路のような階層から脱出せよ。',
    category: 'File Ops',
    difficulty: 'Beginner',
    xp: 100,
    isLocked: false,
    isCompleted: false,
    steps: [
      {
        id: 's1',
        title: '現在地の確認',
        instruction: '`pwd` コマンドを使用して、現在のディレクトリパスを確認してください。',
        validation: (history) => history.some(h => h.command.trim() === 'pwd'),
      },
      {
        id: 's2',
        title: '一覧表示',
        instruction: '`ls` コマンドを使用して、現在のディレクトリにあるファイルを表示してください。',
        validation: (history) => history.some(h => h.command.trim() === 'ls' || h.command.trim() === 'ls -la'),
      }
    ]
  },
  {
    id: 'm2',
    title: 'ファイル作成の儀 (Creation Ritual)',
    description: '空のファイルを作成し、タイムスタンプを更新する。基本中の基本をマスター。',
    category: 'File Ops',
    difficulty: 'Beginner',
    xp: 150,
    isLocked: false,
    isCompleted: true,
    steps: []
  },
  {
    id: 'm3',
    title: '絶対権限の支配者 (Permission Master)',
    description: 'ファイル権限を操作し、特定のユーザーのみアクセス可能にせよ。',
    category: 'Permissions',
    difficulty: 'Intermediate',
    xp: 300,
    isLocked: true,
    isCompleted: false,
    steps: []
  }
];

export const COMMAND_DOCS: CommandDoc[] = [
  { name: 'ls', description: 'ディレクトリ内のファイル一覧を表示', usage: 'ls -la', category: 'File Ops', tags: ['basic', 'list'] },
  { name: 'cd', description: '現在のディレクトリを変更 (移動)', usage: 'cd /var/www', category: 'File Ops', tags: ['basic', 'navigation'] },
  { name: 'grep', description: 'ファイル内の文字列検索と表示', usage: 'grep "error" log.txt', category: 'Text Processing', tags: ['search', 'regex'] },
  { name: 'chmod', description: 'ファイルやディレクトリの権限変更', usage: 'chmod 755 script.sh', category: 'Permissions', tags: ['security', 'admin'] },
  { name: 'ps', description: '現在実行中のプロセスを表示', usage: 'ps aux | grep nginx', category: 'Process', tags: ['system', 'monitor'] },
  { name: 'sudo', description: '管理者 (root) 権限でコマンドを実行', usage: 'sudo apt update', category: 'Admin', tags: ['root', 'security'] },
];

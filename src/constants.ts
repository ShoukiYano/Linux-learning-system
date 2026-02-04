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
    'bin': {
      name: 'bin',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'bash': { name: 'bash', type: 'file', permissions: '-rwxr-xr-x', content: '' },
        'ls': { name: 'ls', type: 'file', permissions: '-rwxr-xr-x', content: '' },
        'cp': { name: 'cp', type: 'file', permissions: '-rwxr-xr-x', content: '' },
        'mv': { name: 'mv', type: 'file', permissions: '-rwxr-xr-x', content: '' },
        'rm': { name: 'rm', type: 'file', permissions: '-rwxr-xr-x', content: '' },
        'cat': { name: 'cat', type: 'file', permissions: '-rwxr-xr-x', content: '' }
      }
    },
    'etc': {
      name: 'etc',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'passwd': { name: 'passwd', type: 'file', permissions: '-rw-r--r--', content: 'root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:Student:/home/student:/bin/bash' },
        'group': { name: 'group', type: 'file', permissions: '-rw-r--r--', content: 'root:x:0:\nstudent:x:1000:' },
        'os-release': { name: 'os-release', type: 'file', permissions: '-rw-r--r--', content: 'NAME="L-Quest Linux"\nVERSION="1.0"\nID=lquest\nPRETTY_NAME="L-Quest Linux 1.0"' },
        'shadow': { name: 'shadow', type: 'file', permissions: '-rw-r-----', content: 'root:$6$...\nstudent:$6$...' },
        'hostname': { name: 'hostname', type: 'file', permissions: '-rw-r--r--', content: 'l-quest-svr' },
        'hosts': { name: 'hosts', type: 'file', permissions: '-rw-r--r--', content: '127.0.0.1\tlocalhost' }
      }
    },
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
            }
          }
        }
      }
    },
    'root': {
      name: 'root',
      type: 'directory',
      permissions: 'drwx------',
      children: {}
    },
    'tmp': {
      name: 'tmp',
      type: 'directory',
      permissions: 'drwxrwxrwt',
      children: {}
    },
    'usr': {
      name: 'usr',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'bin': {
          name: 'bin',
          type: 'directory',
          permissions: 'drwxr-xr-x',
          children: {
            'python3': { name: 'python3', type: 'file', permissions: '-rwxr-xr-x', content: '' }
          }
        },
        'lib': { name: 'lib', type: 'directory', permissions: 'drwxr-xr-x', children: {} },
        'local': {
            name: 'local',
            type: 'directory',
            permissions: 'drwxr-xr-x',
            children: {
                'bin': { name: 'bin', type: 'directory', permissions: 'drwxr-xr-x', children: {} }
            }
        },
        'share': { name: 'share', type: 'directory', permissions: 'drwxr-xr-x', children: {} }
      }
    },
    'var': {
      name: 'var',
      type: 'directory',
      permissions: 'drwxr-xr-x',
      children: {
        'log': {
          name: 'log',
          type: 'directory',
          permissions: 'drwxr-xr-x',
          children: {
            'syslog': { name: 'syslog', type: 'file', permissions: '-rw-r-----', content: 'May 10 10:00:01 l-quest systemd[1]: Started Session 1 of user student.' },
            'auth.log': { name: 'auth.log', type: 'file', permissions: '-rw-r-----', content: 'May 10 10:00:00 l-quest sshd[1234]: Accepted publickey for student' }
          }
        },
        'www': {
          name: 'www',
          type: 'directory',
          permissions: 'drwxr-xr-x',
          children: {
            'html': {
               name: 'html',
               type: 'directory',
               permissions: 'drwxr-xr-x',
               children: {
                   'index.html': { name: 'index.html', type: 'file', permissions: '-rw-r--r--', content: '<html><body>Welcome to L-Quest!</body></html>' }
               }
            }
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

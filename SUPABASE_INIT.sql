-- =============================================
-- テーブル初期化スクリプト
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. users テーブルの作成（もまだない場合）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. missions テーブルの作成
CREATE TABLE IF NOT EXISTS public.missions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Expert')),
  xp INTEGER NOT NULL DEFAULT 100,
  is_locked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. user_missions テーブルの作成
CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, mission_id)
);

-- 4. activities テーブルの作成
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  mission_id TEXT REFERENCES public.missions(id),
  command TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. commands テーブル（コマンド辞典）
CREATE TABLE IF NOT EXISTS public.commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  usage TEXT NOT NULL,
  example TEXT,
  category TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. learning_paths テーブル（学習パス/コース）
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  estimated_hours INTEGER,
  created_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. path_missions テーブル（学習パスとミッションの関連付け）
CREATE TABLE IF NOT EXISTS public.path_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  UNIQUE(path_id, mission_id)
);

-- 8. help_articles テーブル（ヘルプセンター）
CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. qa_posts テーブル（Q&A）
CREATE TABLE IF NOT EXISTS public.qa_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  views INTEGER DEFAULT 0,
  votes INTEGER DEFAULT 0,
  is_solved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. qa_answers テーブル（Q&A回答）
CREATE TABLE IF NOT EXISTS public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.qa_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON public.user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON public.user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_commands_category ON public.commands(category);
CREATE INDEX IF NOT EXISTS idx_commands_name ON public.commands(name);
CREATE INDEX IF NOT EXISTS idx_learning_paths_level ON public.learning_paths(level);
CREATE INDEX IF NOT EXISTS idx_path_missions_path_id ON public.path_missions(path_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category);
CREATE INDEX IF NOT EXISTS idx_qa_posts_user_id ON public.qa_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_post_id ON public.qa_answers(post_id);

-- 12. サンプルミッションデータを挿入
INSERT INTO public.missions (id, title, description, category, difficulty, xp, is_locked) 
VALUES 
  ('m1', 'ファイル操作の基本', 'ls, cd, pwd コマンドを学ぶ', 'File Ops', 'Easy', 100, false),
  ('m2', '権限管理入門', 'chmod, chown コマンドを理解する', 'Permissions', 'Medium', 150, false),
  ('m3', 'ネットワーク基礎', 'ping, ifconfig などの使い方', 'Network', 'Medium', 150, false),
  ('m4', 'テキスト処理', 'grep, sed, awk の基本', 'Text Processing', 'Hard', 200, false),
  ('m5', 'シェルスクリプト入門', 'Bash スクリプトの基本', 'File Ops', 'Hard', 250, true)
ON CONFLICT (id) DO NOTHING;

-- 13. サンプルコマンドデータを挿入
INSERT INTO public.commands (name, description, usage, example, category, difficulty) 
VALUES 
  ('ls', 'ファイルとディレクトリをリスト表示', 'ls [オプション] [ディレクトリ]', 'ls -la /home', 'File Ops', 'Easy'),
  ('cd', 'ディレクトリを変更', 'cd [ディレクトリ]', 'cd /home/user', 'File Ops', 'Easy'),
  ('pwd', '現在のディレクトリパスを表示', 'pwd', 'pwd', 'File Ops', 'Easy'),
  ('mkdir', 'ディレクトリを作成', 'mkdir [ディレクトリ名]', 'mkdir mydir', 'File Ops', 'Easy'),
  ('rm', 'ファイルまたはディレクトリを削除', 'rm [オプション] [ファイル]', 'rm -rf mydir', 'File Ops', 'Medium'),
  ('chmod', 'ファイルのアクセス権限を変更', 'chmod [権限] [ファイル]', 'chmod 755 script.sh', 'Permissions', 'Medium'),
  ('chown', 'ファイルの所有者を変更', 'chown [ユーザー:グループ] [ファイル]', 'chown user:group file.txt', 'Permissions', 'Hard'),
  ('grep', 'テキスト検索', 'grep [パターン] [ファイル]', 'grep "error" log.txt', 'Text Processing', 'Medium'),
  ('sed', 'ストリーム編集', 'sed [コマンド] [ファイル]', 'sed "s/old/new/" file.txt', 'Text Processing', 'Hard'),
  ('awk', 'テキスト処理', 'awk [パターン] [ファイル]', 'awk "{print $1}" file.txt', 'Text Processing', 'Hard')
ON CONFLICT (name) DO NOTHING;

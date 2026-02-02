-- =============================================
-- ミッションステップテーブル追加スクリプト
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. mission_steps テーブルの作成
CREATE TABLE IF NOT EXISTS public.mission_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id TEXT NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  hint TEXT,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('command_match', 'command_contains', 'output_contains', 'file_exists')),
  validation_params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mission_id, order_index)
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_mission_steps_mission_id ON public.mission_steps(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_steps_order ON public.mission_steps(mission_id, order_index);

-- 3. サンプルステップデータを挿入（既存のm1ミッション用）
INSERT INTO public.mission_steps (mission_id, order_index, title, instruction, hint, validation_type, validation_params)
VALUES 
  ('m1', 0, '現在地の確認', '`pwd` コマンドを使用して、現在のディレクトリパスを確認してください。', 'pwd はPrint Working Directoryの略です', 'command_match', '{"command": "pwd"}'),
  ('m1', 1, '一覧表示', '`ls` コマンドを使用して、現在のディレクトリにあるファイルを表示してください。', 'ls はlistの略です。-la オプションで詳細表示', 'command_contains', '{"pattern": "ls"}')
ON CONFLICT (mission_id, order_index) DO UPDATE SET
  title = EXCLUDED.title,
  instruction = EXCLUDED.instruction,
  hint = EXCLUDED.hint,
  validation_type = EXCLUDED.validation_type,
  validation_params = EXCLUDED.validation_params;

-- 4. RLSポリシーの設定
ALTER TABLE public.mission_steps ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "Anyone can view mission steps" ON public.mission_steps
  FOR SELECT USING (true);

-- 管理者のみ作成・更新・削除可能
CREATE POLICY "Admins can manage mission steps" ON public.mission_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

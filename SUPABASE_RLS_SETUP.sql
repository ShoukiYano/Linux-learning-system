-- =============================================
-- RLS ポリシー設定スクリプト
-- Supabase SQL Editor で実行してください
-- =============================================

-- 1. users テーブルの RLS ポリシー
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 新規登録時: 誰でも INSERT 可能
CREATE POLICY "Allow users to create their own account"
ON public.users
FOR INSERT
WITH CHECK (true);

-- SELECT: 自分のレコードと公開データを閲覧
CREATE POLICY "Users can view own and public data"
ON public.users
FOR SELECT
USING (auth.uid() = id OR is_public = true);

-- UPDATE: 自分のレコードのみ更新
CREATE POLICY "Users can update their own data"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- DELETE: 自分のレコードのみ削除
CREATE POLICY "Users can delete their own data"
ON public.users
FOR DELETE
USING (auth.uid() = id);

-- 2. missions テーブルの RLS ポリシー
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "Missions are publicly readable"
ON public.missions
FOR SELECT
USING (true);

-- 管理者のみ INSERT
CREATE POLICY "Admins can create missions"
ON public.missions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 管理者のみ UPDATE
CREATE POLICY "Admins can update missions"
ON public.missions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 管理者のみ DELETE
CREATE POLICY "Admins can delete missions"
ON public.missions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. user_missions テーブルの RLS ポリシー
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- 自分のレコードを閲覧
CREATE POLICY "Users can view their own missions"
ON public.user_missions
FOR SELECT
USING (user_id = auth.uid());

-- 自分のミッション進捗を INSERT
CREATE POLICY "Users can create their own mission progress"
ON public.user_missions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 自分のミッション進捗を UPDATE
CREATE POLICY "Users can update their own mission progress"
ON public.user_missions
FOR UPDATE
USING (user_id = auth.uid());

-- 4. activities テーブルの RLS ポリシー
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 自分のアクティビティを閲覧
CREATE POLICY "Users can view their own activities"
ON public.activities
FOR SELECT
USING (user_id = auth.uid());

-- 自分のアクティビティを INSERT
CREATE POLICY "Users can create their own activities"
ON public.activities
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 5. users テーブルに role カラムがなければ追加
ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE public.users ADD COLUMN is_public BOOLEAN DEFAULT false;

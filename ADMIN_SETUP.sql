-- =============================================
-- 管理者ユーザーのセットアップ
-- Supabase SQL Editor で実行してください
-- 注: user_id は実際のユーザーIDに置き換えてください
-- =============================================

-- 新規登録したユーザーを管理者に昇格させる
UPDATE public.users 
SET role = 'admin' 
WHERE id = '11111111-1111-1111-1111-111111111111'; -- ← あなたのユーザーIDに置き換え

-- または、メールアドレスで管理者に昇格
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'admin@example.com'; -- ← あなたのメールアドレスに置き換え

-- 管理者かどうかを確認
SELECT id, name, email, role FROM public.users WHERE role = 'admin';

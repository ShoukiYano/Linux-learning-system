# Supabase セットアップガイド

このガイドでは、Supabase をこのプロジェクトに統合するための手順を説明します。

## 1. Supabase プロジェクトの作成

1. [Supabase 公式サイト](https://supabase.com) にアクセスしてサインアップ
2. 新規プロジェクトを作成し、プロジェクト URL と API キーを取得

## 2. 環境変数の設定

`.env` ファイルを作成し、以下を設定します:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. データベーススキーマの作成

Supabase のダッシュボードで、SQL エディタを開き以下のテーブルを作成してください:

### Users テーブル
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  role VARCHAR DEFAULT 'user',
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Missions テーブル
```sql
CREATE TABLE missions (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  difficulty VARCHAR,
  xp INTEGER,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### User Missions テーブル
```sql
CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id VARCHAR NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);
```

### Activities テーブル
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  mission_id VARCHAR,
  command VARCHAR,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. Row Level Security (RLS) と 権限設定

セキュリティのため、以下のコマンドを実行して RLS ポリシーを設定します。

Supabase SQL Editor で `SUPABASE_RLS_SETUP.sql` の内容を実行してください。

または、手動で以下を実行:

```sql
-- Users テーブルの RLS ポリシー
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 全員が自分のアカウントを作成可能
CREATE POLICY "Allow users to create their own account"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Missions テーブルの RLS ポリシー
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- 全員がミッションを閲覧可能
CREATE POLICY "Missions are publicly readable"
ON public.missions
FOR SELECT
USING (true);

-- 管理者のみミッションを作成可能
CREATE POLICY "Admins can create missions"
ON public.missions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 管理者のみミッションを編集・削除可能
CREATE POLICY "Admins can update missions"
ON public.missions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete missions"
ON public.missions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## 5. サンプルデータの挿入

`SUPABASE_INIT.sql` を実行してサンプルミッションをを作成します。

## 6. 管理者アカウントのセットアップ

`ADMIN_SETUP.sql` を実行して、管理者ユーザーを作成します:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## 7. npm パッケージのインストール

```bash
npm install
```

## 8. アプリケーション起動

```bash
npm run dev
```

## トラブルシューティング

### RLS エラー: "row violates row-level security policy"
- `SUPABASE_RLS_SETUP.sql` を実行して RLS ポリシーが正しく設定されているか確認
- Supabase ダッシュボードで Authentication セッティングを確認

### 認証エラー
- API キーが正しいか確認
- 環境変数が正しく読み込まれているか確認

### データベースエラー
- テーブル構造が正しいか確認
- RLS ポリシーが適切に設定されているか確認

### 依存関係エラー
```bash
rm -rf node_modules package-lock.json
npm install
```

## 参考リンク
- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Supabase JS クライアント](https://supabase.com/docs/reference/javascript/introduction)
- [React での Supabase 統合](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

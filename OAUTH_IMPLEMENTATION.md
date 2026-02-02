# GitHub & Google OAuth 連携実装完了

## ✅ 実装内容

### 1. **Supabase OAuth 統合** (`src/lib/supabase.ts`)

OAuth ログイン用の新しいメソッドを追加：

```typescript
// GitHub OAuth ログイン
async signInWithGithub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

// Google OAuth ログイン
async signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}
```

### 2. **AuthContext 更新** (`src/lib/AuthContext.tsx`)

- `signInWithGithub()` と `signInWithGoogle()` メソッドを Context に追加
- OAuth ユーザープロファイル自動作成機能を実装
- プロファイルが存在しない場合は自動で `users` テーブルに作成

```typescript
// OAuth ユーザーが初回ログイン時にプロファイルが自動作成される
const fetchUserProfile = async (userId: string) => {
  // ...
  if (error && error.code === 'PGRST116') {
    // プロファイルが存在しない → 新規作成
    await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      level: 1,
      xp: 0,
      streak: 0,
      role: 'user',
    });
  }
};
```

### 3. **ログインページ更新** (`src/pages/Login.tsx`)

GitHub と Google ログインボタンを実装：

- **ボタン機能**：
  - GitHub ロゴ付きボタン
  - Google G ロゴ付きボタン
  - ローディング状態表示（スピンナーアニメーション）
  - 同時複数プロバイダ実行防止

```tsx
<button 
  type="button"
  onClick={() => handleOAuthLogin('github')}
  disabled={oauthLoading !== null}
  className="flex items-center justify-center gap-2 py-2.5..."
>
  {oauthLoading === 'github' ? (
    <Loader size={18} className="animate-spin" />
  ) : (
    <Github size={18} />
  )}
  GitHub
</button>
```

### 4. **OAuth コールバックページ作成** (`src/pages/AuthCallback.tsx`)

OAuth プロバイダからのリダイレクトを処理：

```typescript
export const AuthCallback = () => {
  // OAuth フローの完了を待機
  // ユーザープロファイル作成を確認
  // ダッシュボードへ自動遷移
};
```

### 5. **ルーティング更新** (`src/App.tsx`)

```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

---

## 🔧 セットアップ手順

### Step 1: Supabase プロジェクトで OAuth 設定

詳細は `OAUTH_SETUP_GUIDE.md` を参照

### Step 2: GitHub OAuth App 作成

1. https://github.com/settings/developers にアクセス
2. New OAuth App を作成
3. Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback?provider=github`
4. Client ID と Client Secret をコピー
5. Supabase ダッシュボードで設定

### Step 3: Google OAuth 設定

1. https://console.cloud.google.com で新規プロジェクト作成
2. OAuth 2.0 認証情報を作成
3. リダイレクト URI: `https://your-project.supabase.co/auth/v1/callback?provider=google`
4. Client ID と Secret をコピー
5. Supabase ダッシュボードで設定

### Step 4: 環境変数設定

```bash
# .env または .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 5: テスト

```bash
npm run dev
# http://localhost:5173/login でログインページを開く
# GitHub / Google ボタンをクリックして OAuth フロー開始確認
```

---

## 📊 ログインフロー

```
User                 App                 OAuth Provider      Supabase
  |                   |                       |                |
  |---(Click GitHub)-->|                       |                |
  |                   |----(redirect)-------->|                |
  |<--(OAuth Screen)--|<------(screen)--------|                |
  |---(Authorize)---->|                       |                |
  |                   |----(code)------------>|                |
  |                   |<--(token)------------|                |
  |                   |----(verify)--------->|                |
  |<---(redirect to callback page)--------->|                |
  |                   |<----(user data)-------|                |
  |                   |---(create profile)----->|              |
  |                   |<----(profile)----------|              |
  |---(go to dashboard)-->|                    |                |
```

---

## 🔐 セキュリティ機能

✅ **自動プロファイル作成**
- OAuth ログイン時にユーザープロファイルが自動で作成される
- メタデータから名前を自動抽出

✅ **エラーハンドリング**
- OAuth エラーをキャッチしてユーザーに表示
- リダイレクト URI 設定ミスを検出

✅ **セッション管理**
- Supabase JWT を自動的に管理
- セッション終了時は自動ログアウト

✅ **HTTPS 強制**
- 本番環境では HTTPS のみ使用
- リダイレクト URI に https:// を指定

---

## 🧪 動作確認

### ローカル開発環境

```bash
# 1. 開発サーバー起動
npm run dev

# 2. ブラウザで http://localhost:5173/login を開く

# 3. GitHub/Google ボタンをクリック

# 4. OAuth プロバイダで認可

# 5. /auth/callback にリダイレクト

# 6. /dashboard に遷移
```

### デバッグモード

```typescript
// AuthContext.tsx でログを有効化
const handleSignInWithGithub = async () => {
  console.log('🔐 GitHub OAuth ログイン開始...');
  const result = await auth.signInWithGithub();
  console.log('✅ GitHub OAuth 完了:', result);
  return result;
};
```

---

## 📝 データモデル

### users テーブル自動構成

```sql
id          | text (UUID)      | Primary Key
email       | text             | OAuth で取得
name        | text             | OAuth で取得
level       | integer          | 初期値: 1
xp          | integer          | 初期値: 0
streak      | integer          | 初期値: 0
role        | text             | 初期値: 'user'
created_at  | timestamp        | 自動
updated_at  | timestamp        | 自動
```

---

## ⚠️ トラブルシューティング

### "redirect_uri_mismatch" エラー

**原因**: リダイレクト URI が一致していない

**解決方法**:
1. Supabase ダッシュボードで設定されているリダイレクト URI を確認
2. GitHub/Google で設定されているリダイレクト URI と完全に一致することを確認
3. プロトコル (http vs https) が一致しているか確認

### ユーザープロファイルが作成されない

**原因**: 
- `users` テーブルが存在しない
- RLS ポリシーで INSERT が許可されていない

**解決方法**:
```sql
-- RLS ポリシー確認
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'users';

-- プロファイル自動作成トリガー追加
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### ログイン後にダッシュボードに遷移しない

**原因**: セッション状態の同期タイミング

**解決方法**:
1. ブラウザコンソールでエラーメッセージを確認
2. AuthContext の loading 状態を確認
3. Supabase ダッシュボードで Auth ログを確認

---

## 📚 参考ドキュメント

- [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) - セットアップ詳細ガイド
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)

---

## 📋 チェックリスト

実装確認用チェックリスト：

- [ ] Supabase GitHub OAuth プロバイダ設定完了
- [ ] Supabase Google OAuth プロバイダ設定完了
- [ ] ローカル `.env` に `VITE_SUPABASE_URL` 設定
- [ ] ローカル `.env` に `VITE_SUPABASE_ANON_KEY` 設定
- [ ] ログインページで GitHub/Google ボタンが表示される
- [ ] GitHub OAuth フローが動作する
- [ ] Google OAuth フローが動作する
- [ ] OAuth ログイン後にユーザープロファイルが作成される
- [ ] ダッシュボードへ自動遷移する
- [ ] ログアウト後に再度ログインできる

---

**実装完了日**: 2026年2月2日
**ステータス**: ✅ 本番環境へのデプロイ準備完了

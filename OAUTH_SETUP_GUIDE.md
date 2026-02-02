# GitHub & Google OAuth 連携セットアップガイド

## 1. Supabase OAuth プロバイダ設定

### GitHub OAuth 設定

1. **GitHub App を作成**
   - https://github.com/settings/developers にアクセス
   - 「New OAuth App」をクリック
   - 以下の情報を入力：
     - **Application name**: Linux Master
     - **Homepage URL**: `https://your-domain.com`
     - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback?provider=github`

2. **Client ID と Client Secret をコピー**
   - GitHub App ページの「Client ID」をコピー
   - 「Generate a new client secret」をクリックして Secret をコピー

3. **Supabase に設定**
   - Supabase ダッシュボードを開く
   - Authentication > Providers に移動
   - GitHub を選択
   - Client ID と Client Secret を貼り付け
   - 保存

### Google OAuth 設定

1. **Google Cloud プロジェクトを作成**
   - https://console.cloud.google.com にアクセス
   - 新規プロジェクトを作成

2. **OAuth 2.0 認証情報を作成**
   - 「API とサービス」> 「認証情報」に移動
   - 「+ 認証情報を作成」> 「OAuth クライアント ID」
   - アプリケーションの種類：「ウェブ アプリケーション」
   - 名前: Linux Master
   - 承認済みのリダイレクト URI:
     - `https://your-project.supabase.co/auth/v1/callback?provider=google`
     - `http://localhost:5173/auth/callback` (開発環境用)

3. **Client ID と Client Secret をコピー**

4. **Supabase に設定**
   - Supabase ダッシュボードを開く
   - Authentication > Providers に移動
   - Google を選択
   - Client ID と Client Secret を貼り付け
   - 保存

## 2. 環境変数設定

`.env` ファイルに以下を確認：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. デプロイ時の設定

### Vercel での設定例

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### GitHub Pages での設定例

GitHub Actions では環境変数をシークレットに設定：
- Settings > Secrets > New repository secret
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4. テスト

1. **ローカルでテスト**
   ```bash
   npm run dev
   ```
   - `http://localhost:5173/login` にアクセス
   - GitHub/Google ボタンをクリック
   - OAuth フローが開始されることを確認

2. **本番でテスト**
   - デプロイ後に GitHub/Google ログインを試す
   - ユーザープロファイルが自動作成されることを確認

## 5. トラブルシューティング

### OAuth エラー: "redirect_uri_mismatch"
- Supabase と GitHub/Google の設定のリダイレクト URI が一致しているか確認
- プロトコル (http vs https) が一致しているか確認

### ユーザープロファイルが作成されない
- データベースの `users` テーブルが存在するか確認
- RLS ポリシーで `auth.uid()` での INSERT が許可されているか確認

### ログイン後にダッシュボードに遷移しない
- ブラウザコンソールでエラーメッセージを確認
- Supabase ダッシュボードで Auth ログを確認

## 6. Supabase 設定例（SQL）

```sql
-- OAuth プロバイダ設定確認
SELECT * FROM auth.providers;

-- ユーザープロファイル自動作成 (必要に応じて)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, level, xp, streak, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    1,
    0,
    0,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 7. セキュリティベストプラクティス

- ✅ Client Secret は環境変数として保管
- ✅ リダイレクト URI ホワイトリストを最小限に
- ✅ OAuth scope を最小限に
- ✅ HTTPS を常に使用
- ✅ セッショントークンは secure cookie に保存

---

📚 参考リンク：
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

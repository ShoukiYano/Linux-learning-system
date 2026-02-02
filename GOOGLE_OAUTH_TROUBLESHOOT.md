# Google OAuth 連携 - エラー解決ガイド

## ❌ エラー内容

```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

**エラーの意味**: Supabase で Google OAuth プロバイダが有効になっていない、または設定が不完全です。

---

## ✅ 解決手順

### Step 1: Supabase ダッシュボードを開く

1. https://supabase.com にログイン
2. 該当プロジェクトを選択

### Step 2: Google OAuth プロバイダを有効化

1. **Authentication** > **Providers** をクリック
2. **Google** を検索またはスクロール
3. **Enable** ボタンをクリック

### Step 3: Google OAuth 認証情報を取得

#### Option A: Google Cloud Console で作成（推奨）

1. https://console.cloud.google.com にアクセス
2. 新規プロジェクトを作成 または 既存プロジェクトを選択
3. **API とサービス** > **認証情報** をクリック
4. **+ 認証情報を作成** > **OAuth クライアント ID** をクリック
5. **アプリケーションの種類**: 「ウェブ アプリケーション」を選択
6. **名前**: 「Linux Master」など を入力
7. **承認済みのリダイレクト URI** に以下を追加：

```
https://wxgsxvmhkprtexuwgiun.supabase.co/auth/v1/callback?provider=google
```

⚠️ **重要**: URL は正確に入力してください（Supabase プロジェクト ID が必要）

8. **作成** をクリック
9. **Client ID** と **Client Secret** をコピー

### Step 4: Supabase に認証情報を入力

1. Supabase ダッシュボード > **Authentication** > **Providers** > **Google**
2. 以下を入力：
   - **Authorized Client IDs** (または **Client ID**): Google から取得したクライアント ID
   - **Client Secret**: Google から取得したシークレット

3. **Save** をクリック

### Step 5: ローカルテスト

1. 開発サーバーを再起動：
```bash
npm run dev
```

2. http://localhost:5173/login にアクセス
3. **Google でログイン** ボタンをクリック
4. Google ログイン画面が表示されることを確認

---

## 🔍 よくあるエラーと対処法

### ❌ "redirect_uri_mismatch"

**原因**: リダイレクト URI が Google と Supabase で一致していない

**解決方法**:
1. Google Cloud Console の OAuth クライアント設定を確認
2. 承認済みリダイレクト URI に以下の形式で登録：
   ```
   https://[SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback?provider=google
   ```
3. `[SUPABASE_PROJECT_ID]` を自分のプロジェクト ID に置き換え

### ❌ "invalid_client"

**原因**: Client ID または Client Secret が正しくない

**解決方法**:
1. Google から取得した Client ID/Secret を確認（コピペ時に空白がないか確認）
2. Supabase に正確に入力し直す
3. プロバイダ設定を保存

### ❌ "disabled_client"

**原因**: Google Cloud プロジェクトで OAuth が無効

**解決方法**:
1. Google Cloud Console > **API とサービス** > **ライブラリ**
2. 「Google+ API」を検索
3. **有効にする** をクリック

---

## 📝 Google Cloud Console での設定確認

### 正しい設定例

| 項目 | 値 |
|------|-----|
| **アプリケーションの種類** | ウェブ アプリケーション |
| **名前** | Linux Master |
| **承認済みリダイレクト URI** | `https://wxgsxvmhkprtexuwgiun.supabase.co/auth/v1/callback?provider=google` |

### 認証情報の確認

```bash
# .env ファイルで確認（デプロイ時に必要）
VITE_SUPABASE_URL=https://wxgsxvmhkprtexuwgiun.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🧪 デバッグモード

### ブラウザコンソールでエラーをチェック

1. DevTools を開く (F12)
2. **Console** タブで Google ログインクリック後のエラーを確認
3. `signInWithGoogle()` の戻り値をログで確認

```typescript
// AuthContext.tsx でデバッグ用ログを追加
const handleSignInWithGoogle = async () => {
  console.log('🔐 Google OAuth ログイン開始...');
  const result = await auth.signInWithGoogle();
  console.log('📊 Google OAuth 結果:', result);
  if (result.error) {
    console.error('❌ エラー:', result.error);
  }
  return result;
};
```

### Supabase ダッシュボードのAuth ログ

1. Supabase > **Authentication** > **Users** 
2. 右側の **Auth Requests** タブでリアルタイムログを確認
3. エラーメッセージから原因を特定

---

## ✅ 動作確認チェックリスト

- [ ] Google Cloud Console で OAuth クライアント作成完了
- [ ] Client ID をコピー
- [ ] Client Secret をコピー
- [ ] Supabase で Google プロバイダを **Enable** 
- [ ] Client ID を Supabase に入力
- [ ] Client Secret を Supabase に入力
- [ ] 承認済みリダイレクト URI が正確に設定
- [ ] ローカルで Google ログイン画面が表示される
- [ ] Google で認可してもエラーが出ない
- [ ] ログイン後にダッシュボードに遷移

---

## 📱 本番環境デプロイ

### Vercel の場合

1. **Project Settings** > **Environment Variables**
2. 以下を追加：
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
3. デプロイ再実行

### その他のホスティング

1. 本番 Supabase > Authentication > Providers > Google で以下を設定：
   ```
   https://your-production-domain.com/auth/callback
   ```
2. Google Cloud Console で本番用リダイレクト URI を追加：
   ```
   https://your-production-domain.com/auth/callback?provider=google
   ```

---

## 🚨 セキュリティポイント

⚠️ **絶対にしてはいけないこと**:
- Client Secret をコードに直接記述
- Client Secret を GitHub にコミット
- リダイレクト URI に本番 URL 以外を登録

✅ **推奨事項**:
- Client Secret は環境変数で管理
- 開発環境と本番環境で別々の OAuth アプリを作成
- リダイレクト URI を必要最小限に

---

## 📞 追加サポート

エラーが解決しない場合：

1. **Supabase ドキュメント**:
   https://supabase.com/docs/guides/auth/social-login/auth-google

2. **Google OAuth ドキュメント**:
   https://developers.google.com/identity/protocols/oauth2

3. **Supabase Discord コミュニティ**:
   https://discord.supabase.io

---

**最終確認**: このガイド完了後、Google ログインボタンをクリックして Google ログイン画面が表示されれば成功です！

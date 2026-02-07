### README更新中...

# L-Quest: Linux Mastery Platform

React + TypeScript + Tailwind CSS で構築された、Linux学習プラットフォームのフロントエンドアプリケーションです。

## 🚀 セットアップ手順

このプロジェクトは **Vite** と **Docker** を使用して動作するように構成されています。

### 1. ソースツリー

```
project-root/
├── src/                  <-- 新規作成して以下を移動
│   ├── components/       <-- 移動
│   ├── pages/            <-- 移動
│   ├── utils/            <-- 移動
│   ├── App.tsx           <-- 移動
│   ├── constants.ts      <-- 移動
│   ├── index.tsx         <-- 移動
│   └── types.ts          <-- 移動
├── index.html            <-- ルートに配置 (今回更新されたものを使用)
├── package.json          <-- ルートに配置
├── vite.config.ts        <-- ルートに配置
├── Dockerfile            <-- ルートに配置
├── docker-compose.yml    <-- ルートに配置
└── metadata.json         <-- ルートに配置
```

### 2. 起動方法 (Dockerを使用する場合) - 推奨

Docker環境がある場合、以下のコマンドだけで環境構築と起動が完了します。

```bash
# コンテナのビルドと起動
docker-compose up --build
```

起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

### 3. 起動方法 (ローカルのNode.jsを使用する場合)

Dockerを使用せず、ローカルのNode.js環境で動かす場合の手順です。

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

起動後、ターミナルに表示されるURL（通常は [http://localhost:3000](http://localhost:3000)）にアクセスしてください。

## 🛠 技術スタック

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN configuration via index.html)
- **Routing**: React Router DOM
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## 🔐 Supabase 統合

このプロジェクトは **Supabase** を使用してバックエンド機能を提供します。

### セットアップ

詳細は [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) を参照してください。

1. Supabase プロジェクトを作成
2. 環境変数を設定（`.env` ファイル）
3. SQL スキーマを実行
4. アプリケーションを起動

### 環境変数

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📚 主な機能

- ✅ **ユーザー認証**: Supabase Auth を使用したサインアップ・ログイン
- ✅ **ミッションシステム**: 段階的なLinux学習ミッション
- ✅ **対話型ターミナル**: コマンド実行と即座のフィードバック
- ✅ **プログレストラッキング**: XPとレベルシステム
- ✅ **ランキング**: ユーザーのスコアに基づくリーダーボード
- ✅ **コマンド辞書**: 1000+ のLinuxコマンドのリファレンス
- ✅ **ユーザープロフィール**: 学習統計とアクティビティログ
- ✅ **ダッシュボード**: リアルタイムの進捗表示
- ✅ **管理者ページ**: ミッション作成・編集・削除機能

## 👨‍💼 管理者機能

管理者ユーザーは `/admin` ページからミッションを作成・編集・削除できます。

### 管理者の設定手順

1. **新規登録** でアカウントを作成
2. Supabase SQL Editor で以下を実行:
   ```sql
   UPDATE public.users 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```
3. ダッシュボードの「管理者」メニューからミッションを管理

詳細は [ADMIN_SETUP.sql](./ADMIN_SETUP.sql) を参照。

## 📝 ファイル構造

```
src/
├── components/
│   ├── Layout.tsx          # メインレイアウト
│   └── Terminal.tsx        # 対話型ターミナル
├── pages/
│   ├── Landing.tsx         # ランディングページ
│   ├── Login.tsx           # ログイン/新規登録
│   ├── Dashboard.tsx       # ダッシュボード
│   ├── MissionList.tsx     # ミッション一覧
│   ├── MissionRunner.tsx   # ミッション実行
│   ├── Dictionary.tsx      # コマンド辞書
│   ├── Profile.tsx         # ユーザープロフィール
│   └── Leaderboard.tsx     # ランキング
├── lib/
│   ├── supabase.ts         # Supabase クライアント
│   └── AuthContext.tsx     # 認証コンテキスト
├── utils/
│   └── terminalLogic.ts    # ターミナルロジック
├── App.tsx                 # メインアプリケーション
├── index.tsx               # エントリーポイント
├── constants.ts            # 定数・テストデータ
└── types.ts                # TypeScript型定義
```

## 🎯 ユースケース

1. **初心者向け学習**: Linux コマンドの基本から学習
2. **実務スキルアップ**: 実践的なシステム管理スキルの習得
3. **ゲーミフィケーション**: ミッション完了でXP獲得、レベルアップ
4. **競争型学習**: ランキングで他ユーザーと競争

## 📝 開発メモ

- **Tailwind CSS**: `index.html` 内の `<script>` タグで設定されています。`tailwind.config.js` ファイルを作成する必要はありません。
- **Supabase**: このプロジェクトは Supabase と完全に統合されています。セットアップ後、すべてのユーザーデータ、ミッション、アクティビティがクラウドに保存されます。

## 🚀 本番環境へのデプロイ

### Vercel へのデプロイ（推奨）

```bash
vercel
```

### その他のホスティングサービス

```bash
npm run build
```

`dist/` フォルダの内容を任意のホスティングサービスにアップロードしてください。

## 📞 トラブルシューティング

### Supabase 接続エラー

1. 環境変数が正しいか確認
2. Supabase プロジェクトが起動しているか確認
3. RLS (Row Level Security) ポリシーを確認

### ターミナルが動作しない

1. `terminalLogic.ts` を確認
2. ブラウザコンソールでエラーメッセージを確認

## 📄 ライセンス

MIT License

## 👨‍💻 サポート

問題が発生した場合は、GitHub Issues で報告してください。

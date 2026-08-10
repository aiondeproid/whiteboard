# 電子掲示板（編集アプリ）

工場向けデジタル掲示板の編集アプリ。部（総務課・品質管理・製造・試作）ごとに PDF 資料を追加・削除・公開/非公開切り替えできる。ボードを作成すると参加コードが発行され、表示アプリ側でそのコードを入力するとボードに viewer として参加し、公開中の資料を閲覧できる。

表示アプリは別リポジトリで開発・デプロイしているが、Supabase プロジェクトはこのアプリと共有している。要件の詳細は [`電子掲示板_MVP要件.md`](./電子掲示板_MVP要件.md) を参照。

## セットアップ

```bash
npm install
```

`.env.local` に Supabase の接続情報を設定する:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 開発サーバー

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くとルート (`/`) は `/edit` にリダイレクトされる。

## 実装メモ

ファイルごとの実装ログは [`docs/edit-app-notes.md`](./docs/edit-app-notes.md) を参照。

## Next.js について

このリポジトリの Next.js は学習データにある一般的な Next.js と互換性のない破壊的変更を含むバージョンを使用している。フレームワーク周りのコードを書く前に `node_modules/next/dist/docs/` を確認すること（詳細は [`AGENTS.md`](./AGENTS.md)）。

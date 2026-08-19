# 電子掲示板（編集アプリ）

工場向けデジタル掲示板の編集アプリ。部（総務課・品質管理・製造・試作）ごとに PDF 資料を追加・削除・公開/非公開切り替えできる。社内共有の単一ボードを、サインアップした複数の編集アカウントが共同編集する。表示アプリ側は参加コードを入力するとボードに viewer として参加し、公開中の資料を閲覧できる。

表示アプリは別リポジトリで開発・デプロイしているが、Supabase プロジェクトはこのアプリと共有している。

## デモ

- URL: [https://whiteboard-sigma-six.vercel.app](https://whiteboard-sigma-six.vercel.app)
- デモアカウント:
  - メールアドレス: `aiondeproid+test1@gmail.com`
  - パスワード: `aiondeproidtest`

## 要件定義

MVP の要件定義は [`電子掲示板_MVP要件.md`](./電子掲示板_MVP要件.md) にまとめている。主な決定事項:

- 編集アプリ（資料管理）と表示アプリ（閲覧専用）を別アプリとして分離し、Supabase プロジェクトを共有する
- ボードは社内で 1 つだけ。編集アカウントはサインアップ（メール確認）するだけで自動的にそのボードの editor になり、表示アカウントは参加コードで viewer として参加する
- 編集者は複数アカウント可（ボード新規作成の導線はない）
- 部（総務課・品質管理・製造・試作）は固定 4 件で、MVP では追加・削除・改名を行わない
- 手書き・注釈・リアルタイム同期・全画面表示はスコープ外

## 機能

- メール/パスワードによるログイン・新規登録（Supabase Auth）。登録済みユーザーは自動でボードの editor になる
- 参加コードの表示（viewer 向け）
- 部（総務課・品質管理・製造・試作）ごとの資料一覧
- PDF 資料の追加（Supabase Storage へアップロード）
- 資料の表示/非表示切り替え
- 資料の削除（Storage・DB 両方から）
- 資料のプレビュー（署名付き URL 経由でブラウザ内蔵の PDF ビューアを利用）

## 使用技術

| 種別 | 技術 |
|------|------|
| フレームワーク | [Next.js](https://nextjs.org/) 16 (App Router, Turbopack) |
| UI | [React](https://react.dev/) 19、[Tailwind CSS](https://tailwindcss.com/) 4 |
| 言語 | TypeScript |
| Lint | ESLint (`eslint-config-next`) |

## 使用外部 API / サービス

- [Supabase](https://supabase.com/)
  - **Auth**: メール/パスワード認証
  - **Postgres**: ボード・資料メタデータの保存、Row Level Security による編集者/閲覧者の権限分離
  - **Storage**: PDF ファイルの保管（非公開バケット、署名付き URL で配信）

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

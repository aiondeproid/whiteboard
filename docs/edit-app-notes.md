# 編集アプリ 実装メモ

`電子掲示板_MVP要件.md` の要件に沿って `/edit` 配下を実装していくときの、ファイルごとの説明ログ。

## src/lib/types.ts

`Department` / `Board` / `Document` の共有型定義。`supabase/migrations/0001_init.sql` のテーブル定義（departments / boards / documents）に対応させただけの、素の型。

## src/lib/supabase/dal.ts

認証チェックとDB問い合わせをまとめた DAL（Data Access Layer）。Next.js の認証ガイドが推奨するパターンに沿って、ページ側で個別に認証チェックを書かずに済むようにしている。

- `getUser()`: 現在のログインユーザーを返す（未ログインなら `null`）。`react` の `cache()` で1リクエスト内はメモ化。
- `requireUser()`: `getUser()` して未ログインなら `/edit/login` にリダイレクト。
- `getEditorBoard()`: ログイン確認した上で、自分が `editor` になっているボードを1件返す（社内共有の単一ボードを複数 editor で編集する前提。ユーザーごとに別ボードは持たない）。
- `getDepartments()`: 部（総務課・品質管理・製造・試作の固定4件）を取得。
- `getDepartmentBySlug(slug)`: スラッグから部を検索。
- `getDocuments(boardId, departmentId)`: 指定ボード・部の資料一覧を取得。

`import "server-only"` を先頭に入れて、クライアント側に誤って混入しないようにしてある。

## src/app/edit/login/actions.ts

ログイン画面用のサーバーアクション2つ。

- `login(prevState, formData)`: メール・パスワードで `signInWithPassword`。失敗したらエラーメッセージを返し、成功したら `/edit` にリダイレクト。
- `signup(prevState, formData)`: `signUp` で新規登録。パスワードは8文字未満ならエラー。メール確認が必要な設定の場合はセッションが返ってこないので、その場合は「確認メールを送信しました」のメッセージを返すだけでリダイレクトしない。

## src/app/edit/login/page.tsx

ログイン/新規登録フォームのクライアントコンポーネント。`useActionState` でログイン・登録どちらのモードかを切り替えつつ、同じフォームUIを使い回す。エラー・メッセージを表示。

## src/app/edit/actions.ts

- `joinBoardAsEditor(prevState, formData)`: フォームの編集者招待コードを受け取り、DB側のSQL関数 `join_board_as_editor` を `rpc()` 経由で呼ぶだけ。唯一の共有ボードに `editor` として参加する（招待コードが正しければ何度呼んでも同じボードに紐づく）。成功したら `revalidatePath("/edit")` で再描画（リダイレクトはしない）。
- `signOut()`: セッションを切って `/edit/login` にリダイレクト。

## src/app/edit/layout.tsx

`/edit` 配下（ログインページ含む）を包むヘッダー。`getUser()` でログイン有無だけ確認し（`requireUser()` は使わない。ログインページ自体もこのlayout配下に来るのでリダイレクトループを避けるため）、ログイン中なら `getEditorBoard()` でボード名・表示用参加コード（viewer向け）・編集者招待コード（editor向け）を表示。ログイン中は「ログアウト」ボタンを表示。

## src/app/edit/join-as-editor-form.tsx

`joinBoardAsEditor` サーバーアクションを `useActionState` で呼ぶだけの、編集者招待コード入力フォーム（クライアントコンポーネント）。エラー表示と送信中の disabled 制御のみ。

## src/app/edit/page.tsx

`/edit` のホーム画面（既存のスタブ `EditHome` を置き換え）。

- `requireUser()` でログイン確認（未ログインなら `/edit/login` へリダイレクト）。
- `getEditorBoard()` で自分がまだ editor になっていなければ「編集者として参加」の説明文 + `JoinAsEditorForm`（編集者招待コード入力）を表示。単一の共有ボードなので、ボードを新規作成する導線はない。
- editor になっていれば `getDepartments()` で固定4部を取得し、部ごとのリンクをグリッド表示（画面フロー 3「資料ホーム: 4部から選択」）。リンク先は `/edit/{slug}`。

## src/lib/supabase/dal.ts — getDocumentPreviewUrl 追加

`documents` バケットは非公開（`public: false`）なので、アップロード済みPDFをそのまま `<a href>` では開けない。`createSignedUrl(path, 300)` で5分だけ有効な閲覧用URLを発行し、それを返す関数を追加。失敗時は `null` を返す（呼び出し側でプレビューリンクを出さない）。

用途: `/edit/[dept]` の資料一覧で、各行に「プレビュー」リンク（`target="_blank"`）を出し、ブラウザ内蔵のPDFビューアで確認できるようにする。

## src/app/edit/[dept]/actions.ts

資料一覧ページの裏側処理（サーバーアクション）3つ。すべて部のスラッグ（例: `general_affairs`）を第一引数として受け取る（フォームの `.bind()` で先に固定してから使う）。

- `addDocument(deptSlug, prevState, formData)`: タイトルとPDFファイルを受け取り、まずファイル形式チェック（`application/pdf` 以外はエラー）。OKなら Supabase Storage の `documents` バケットに `{boardId}/{departmentId}/{ランダムID}.pdf` というパスでアップロードし、成功したら `documents` テーブルに1行追加。DB登録に失敗したらアップロード済みファイルを削除して整合性を保つ。最後に `revalidatePath` でページを再描画。
- `toggleVisible(deptSlug, documentId, visible)`: 指定した資料の `visible` フラグを更新するだけ。
- `deleteDocument(deptSlug, documentId, storagePath)`: 保管庫のファイルとDBの行を両方削除。

## src/app/edit/[dept]/page.tsx

`/edit/{dept}` の本体（サーバーコンポーネント）。

- URLの `dept` パラメータを部一覧と照合し、存在しなければ404（`notFound()`）。
- ボードが無ければ `/edit` にリダイレクト（先にボードを作ってもらう）。
- `getDocuments()` で一覧を取得し、各資料について `getDocumentPreviewUrl()` を並行実行してプレビュー用の一時リンクを用意。
- 一覧を表示: タイトル、プレビューリンク（新しいタブ）、表示/非表示切り替えボタン、削除ボタン。切り替え・削除はそれぞれ小さな `<form>` に紐づけたサーバーアクションで、JavaScriptが読み込まれる前でも動く（プログレッシブエンハンスメント）。
- 上部に `AddDocumentForm` を配置。

## src/app/edit/[dept]/add-document-form.tsx

資料追加フォームのクライアントコンポーネント。タイトル入力・PDFファイル選択・送信ボタンのみ。`useActionState` で `addDocument`（部のスラッグを`.bind()`で固定済み）を呼び、エラー表示と送信中の disabled 制御を行う。

## 単一ボード化（2026-08-19）

社内利用のため「編集者ごとに別ボードを作成」をやめ、社内共有の単一ボードを複数 editor で共同編集する運用に変更（`supabase/migrations/0002_single_board.sql`）。

- `board_members_one_editor_per_board`（1ボード1編集者制約）を撤廃。
- `boards.owner_id` を廃止。所有者ではなく editor 全員がボードを管理する（更新 RLS は `board_role(id) = 'editor'`、削除ポリシーはアプリからは無し）。
- `boards.editor_invite_code` を追加。viewer 用の `join_code`（表示アプリがそのまま使い続ける、変更なし）とは別コードにして、表示用コードだけでは編集権限を取れないようにした。
- `create_board(name)` RPC を廃止し、`join_board_as_editor(code)` RPC に置き換え。ボード新規作成という概念自体をなくし、既存の唯一のボードに editor として参加するだけにした。
- 本番の Supabase にはデモ・テストデータしか無かったため、マイグレーション内で `boards`/`board_members`/`documents`（と対応する `storage.objects` 行）を一度クリアしてから単一ボードを作り直した。

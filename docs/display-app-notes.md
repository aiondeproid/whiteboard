# 表示アプリ 実装メモ

`電子掲示板_MVP要件.md` の要件に沿って `/display` 配下を実装していくときの、ファイルごとの説明ログ。

## src/lib/supabase/dal.ts — requireUser にリダイレクト先を追加

`requireUser()` は元々 `/edit/login` 固定でリダイレクトしていたが、表示アプリ用に `requireUser(redirectTo = "/edit/login")` として引数化。表示アプリ側では `requireUser("/display/login")` を渡す。`react` の `cache()` は引数ごとにメモ化されるので、`/edit` と `/display` で別々にキャッシュされる。

## src/lib/supabase/dal.ts — getMemberBoard 追加

`getEditorBoard()` は `role = 'editor'` 限定だが、表示アプリは editor・viewer どちらのメンバーでも資料を見られてよいので、role を絞らない `getMemberBoard()` を追加。中身はほぼ同じクエリ。

## src/app/display/login/actions.ts, page.tsx

`src/app/edit/login/` と同じログイン/新規登録フォーム。差分はリダイレクト先が `/display`（`/edit` ではなく）なのと、見出しの文言のみ。

## src/app/display/actions.ts

- `joinBoard(prevState, formData)`: 参加コードを受け取り、DB側のSQL関数 `join_board_with_code` を `rpc()` 経由で呼ぶ。viewerとしての `board_members` 登録はSQL関数側の仕事（既に編集アプリの `create_board` と同じ関数を使い回している）。成功したら `revalidatePath("/display")`。
- `signOut()`: セッションを切って `/display/login` にリダイレクト。

## src/app/display/join-board-form.tsx

`joinBoard` サーバーアクションを `useActionState` で呼ぶだけの、参加コード入力フォーム（クライアントコンポーネント）。

## src/app/display/layout.tsx

`/display` 配下を包むヘッダー。`getUser()` でログイン有無だけ確認し、ログイン中なら `getMemberBoard()` でボード名を表示。ログイン中は「ログアウト」ボタンを表示。編集アプリの layout と同じ構造。

## src/app/display/page.tsx

`/display` のホーム画面（スタブを置き換え）。

- `requireUser("/display/login")` でログイン確認。
- `getMemberBoard()` でボードが無ければ「ボードに参加」の説明文 + `JoinBoardForm` を表示（要件の画面フロー 2「参加コード入力」に相当）。
- ボードがあれば `getDepartments()` で固定4部を取得し、`/edit/page.tsx` と同じグリッドUIで部ごとのリンクを表示（画面フロー 3「資料ホーム: 4部から選択」）。リンク先は `/display/{slug}`。

## src/lib/supabase/dal.ts — getVisibleDocuments 追加

編集アプリの `getDocuments()` はボードの全資料を返す（editor向けRLSポリシーが全件許可しているので、editorアカウントなら非表示分も含めて返る）。表示アプリは常に `visible = true` だけを見せたいので、クエリ側で明示的に `.eq("visible", true)` する `getVisibleDocuments()` を追加。RLS（viewerロールなら非表示行はそもそも見えない）だけに頼らず、アプリ層でも二重にフィルタする形。

## src/app/display/[dept]/page.tsx

`/display/{dept}` の本体（サーバーコンポーネント）。`/edit/[dept]/page.tsx` の閲覧専用版。

- URLの `dept` パラメータを部一覧と照合し、存在しなければ404（`notFound()`）。
- `getMemberBoard()` でボードメンバーか確認、未参加なら `/display` にリダイレクト。
- `getVisibleDocuments()` で表示可能な資料のみ取得し、`getDocumentPreviewUrl()` で署名付きプレビューURLを並行取得。
- 一覧表示のみ（追加・削除・表示切替のフォームは無し）。資料名がそのままリンクになっており、クリックでブラウザ内蔵PDFビューアが開く新しいタブが開く（要件の画面フロー4・5相当。ページ送り操作等のカスタムPDFビューアはまだ無し — ブラウザ標準ビューアに委ねている）。

**既知の挙動（編集アプリと共通）**: 部のスラッグチェックが認証チェックより先に走るため、未ログイン状態で `/display/{dept}` に直接アクセスすると（`departments` テーブルのRLSが `authenticated` ロール必須のため）ログイン画面へのリダイレクトではなく404になる。`/edit/{dept}` も同じ順序で同じ挙動なので、今回新しく入れた問題ではない。UX的に気になるなら両アプリまとめて認証チェックを先に持ってくる改修が必要（未着手）。

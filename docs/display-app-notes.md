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
- 一覧表示のみ（追加・削除・表示切替のフォームは無し）。資料名は `/display/{dept}/{docId}` へのリンク（画面フロー4相当）。署名付きURLはここでは発行しない — ビューア側のページで必要になった時に取得する。

**既知の挙動（編集アプリと共通）**: 部のスラッグチェックが認証チェックより先に走るため、未ログイン状態で `/display/{dept}` に直接アクセスすると（`departments` テーブルのRLSが `authenticated` ロール必須のため）ログイン画面へのリダイレクトではなく404になる。`/edit/{dept}` も同じ順序で同じ挙動なので、今回新しく入れた問題ではない。UX的に気になるなら両アプリまとめて認証チェックを先に持ってくる改修が必要（未着手）。

## PDF ビューア（画面フロー5）

`react-pdf`（10.4.1）+ 同梱と合わせた `pdfjs-dist`（5.4.296、バージョンを完全一致させて `package.json` に直接固定）を追加。react-pdf は内部で `pdfjs-dist` に依存しているが、バージョンが厳密一致していないと実行時に警告/不整合が出るため、直接依存としても同じバージョンを固定している。

### src/lib/supabase/dal.ts — getDocumentPreviewUrl に expiresInSeconds 追加、getVisibleDocument 追加

- `getDocumentPreviewUrl(storagePath, expiresInSeconds = 300)`: 第2引数化。編集アプリのプレビューは即クリックされる想定で従来通り5分のままだが、表示アプリのビューアはキオスクで長時間開きっぱなしになり得る（pdf.jsはスクロール時にページ範囲を都度fetchし直す）ため、ビューアのルートからは3600秒を渡す。
- `getVisibleDocument(boardId, departmentId, documentId)`: ボード・部・`visible=true` に絞った単一資料取得。URLの `docId` を推測されても、非表示資料や他ボードの資料は取得できない。

### src/app/display/[dept]/[docId]/page.tsx

サーバーコンポーネント。部・ボードメンバーシップ・資料の存在確認（`getVisibleDocument`）をした上で、署名付きURLを発行し `PdfViewerLoader` に渡す。戻るリンクとタイトル見出しのみ。

### src/app/display/[dept]/[docId]/pdf-viewer-loader.tsx

`"use client"` の薄いラッパー。App Router では `next/dynamic` の `ssr: false` はサーバーコンポーネントの中では使えない制約があるため、ここでクライアントコンポーネント境界を作って `dynamic(() => import("./pdf-viewer"), { ssr: false })` している。

### src/app/display/[dept]/[docId]/pdf-viewer.tsx

実際の `react-pdf` の `<Document>`/`<Page>`。`pdfjs.GlobalWorkerOptions.workerSrc` を `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` で設定（Turbopackがこのパターンをアセットとして解決してくれる。追加の `next.config.ts` 設定は不要だった）。前へ/次へボタンとページ番号表示、縮小/拡大ボタン（`MIN_SCALE`〜`MAX_SCALE` の範囲）を実装。`renderTextLayer` / `renderAnnotationLayer` は両方 `false`（テキスト選択・注釈は要件外なので、CSSインポートや余計な処理を増やさない判断）。全画面表示は要件のスコープ外なので実装していない。

**未確認事項**: `npm run build` は通り、pdf.jsワーカーの解決も本番ビルドで確認済みだが、実際にログイン→参加コード入力→PDFクリックまでの一連の操作をブラウザで通しで確認できていない（テスト用のSupabaseアカウント・実PDFが手元にない）。ユーザー側でブラウザ確認が必要。

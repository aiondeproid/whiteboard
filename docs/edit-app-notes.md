# 編集アプリ 実装メモ

`電子掲示板_MVP要件.md` の要件に沿って `/edit` 配下を実装していくときの、ファイルごとの説明ログ。

## src/lib/types.ts

`Department` / `Board` / `Document` の共有型定義。`supabase/migrations/0001_init.sql` のテーブル定義（departments / boards / documents）に対応させただけの、素の型。

## src/lib/supabase/dal.ts

認証チェックとDB問い合わせをまとめた DAL（Data Access Layer）。Next.js の認証ガイドが推奨するパターンに沿って、ページ側で個別に認証チェックを書かずに済むようにしている。

- `getUser()`: 現在のログインユーザーを返す（未ログインなら `null`）。`react` の `cache()` で1リクエスト内はメモ化。
- `requireUser()`: `getUser()` して未ログインなら `/edit/login` にリダイレクト。
- `getEditorBoard()`: ログイン確認した上で、SQL関数 `join_board_as_editor` を `rpc()` 経由で呼び、唯一の共有ボードに `editor` として参加させてからそのボードを返す（招待コード不要。認証済みなら誰でも何回呼んでも同じボードに editor として紐づく。ユーザーごとに別ボードは持たない）。
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

- `signOut()`: セッションを切って `/edit/login` にリダイレクト。

## src/app/edit/layout.tsx

`/edit` 配下（ログインページ含む）を包むヘッダー。`getUser()` でログイン有無だけ確認し（`requireUser()` は使わない。ログインページ自体もこのlayout配下に来るのでリダイレクトループを避けるため）、ログイン中なら `getEditorBoard()` でボード名・参加コード（viewer向け）を表示。ログイン中は「ログアウト」ボタンを表示。

## src/app/edit/page.tsx

`/edit` のホーム画面（既存のスタブ `EditHome` を置き換え）。

- `requireUser()` でログイン確認（未ログインなら `/edit/login` へリダイレクト）。
- `getEditorBoard()` を呼んで自分を editor として唯一の共有ボードに参加させる（招待コード不要、フォームなし）。
- `getDepartments()` で固定4部を取得し、部ごとのリンクをグリッド表示（画面フロー 3「資料ホーム: 4部から選択」）。リンク先は `/edit/{slug}`。

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
- `getEditorBoard()` で唯一の共有ボードを取得（editor参加も同時に済む。ボードが存在しない設定不備なら例外で落ちる）。
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

## 編集者招待コード廃止（2026-08-19）

編集者招待コードは不要と判断し撤廃（`supabase/migrations/0003_remove_editor_invite_code.sql`）。サインアップ自体を編集者の入口とみなし、認証済みユーザーは全員自動でボードの editor になる。

- `boards.editor_invite_code` 列を削除。
- `join_board_as_editor(code)` RPC を引数無しの `join_board_as_editor()` に置き換え。唯一のボードを探して呼び出しユーザーを editor として `board_members` に upsert するだけ（招待コードの照合が無くなった）。
- `getEditorBoard()` がこの RPC を直接呼ぶようになったため、`/edit` 側の「未参加なら招待コード入力フォームを出す」という分岐と `JoinAsEditorForm` コンポーネント・`joinBoardAsEditor` サーバーアクションを削除。

## 表示予約（2026-10-14）

資料ごとに表示開始日・終了日（どちらも任意、日付単位、終了日当日まで表示）を設定できるようにした（`supabase/migrations/0004_display_schedule.sql`）。

- `documents.display_start` / `display_end`（`date`、NULL は無期限）を追加。開始日 ≤ 終了日の CHECK 制約付き。
- viewer 向け RLS「viewer can view visible documents」を作り直し、`visible = true` に加えて日本時間の今日が期間内であることを条件にした。表示アプリ（別リポジトリ）はコード変更なしで期間外の資料が見えなくなる。
- 手動の表示/非表示（`visible`）はそのまま残し、期間と AND で効く（非表示にすれば期間内でも出ない）。
- `src/lib/schedule.ts`: 日本時間の今日（`todayInTokyo()`）と、一覧に出す状態（掲載中 / 予約中 / 掲載終了 / 非表示）を判定する `getDisplayStatus()`。
- `src/app/edit/[dept]/actions.ts`: `parseSchedule()` で日付形式と前後関係を検証。`addDocument` が期間も保存するようになり、既存資料の期間変更用に `updateSchedule(deptSlug, documentId, prevState, formData)` を追加。
- 期間の入力は `<input type="date">`（ブラウザ標準のカレンダー）。UI は下の「ピン留め・ラベル・差し替え・一括削除」節の `document-settings.tsx` にまとめた。
- `/edit/[dept]` の一覧に状態バッジ（期間があれば「予約中 10/20〜10/31」のように併記）を追加。

## ピン留め・重要度ラベル・NEW・PDF差し替え・掲載終了の一括削除（2026-10-14）

`supabase/migrations/0005_pin_category_display_view.sql`

- `documents.pinned`（boolean、既定 false）: ピン留め。編集画面の一覧は `pinned desc, created_at desc` で並べる（`getDocuments()`）。
- `documents.category`（`urgent` / `notice` / `routine` / NULL）: 重要度ラベル「緊急 / 周知 / 定期」。表示名と色は `src/lib/category.ts` の `CATEGORIES`。
- ビュー `display_documents`（`security_invoker = true` なので RLS は呼び出しユーザーの権限で効く）: `documents` の全列に `is_new` を足したもの。NEW は表示開始日（未設定なら登録日、どちらも日本時間）から3日間。**表示アプリ側は `documents` の代わりにこのビューを読み、`order by pinned desc, created_at desc` で並べ、`category` / `is_new` でバッジを出す改修が必要**（このリポジトリには表示アプリが無いので未対応）。
- `src/lib/schedule.ts`: ビューと同じ NEW 判定の `isNew()` を追加（編集画面でも NEW を表示）。

`src/app/edit/[dept]/actions.ts` に追加:

- `togglePinned(deptSlug, documentId, pinned)`
- `updateDocumentSettings(deptSlug, documentId, prevState, formData)`: 表示期間とラベルをまとめて保存（旧 `updateSchedule` を置き換え）。
- `replaceDocumentFile(deptSlug, documentId, prevState, formData)`: タイトル・期間・ラベルはそのままに PDF だけ差し替え。新しいパスにアップロード → `storage_path` 更新 → 旧ファイル削除の順で、途中で失敗しても資料が壊れないようにしている。
- `deleteEndedDocuments(deptSlug)`: 表示終了日が今日（日本時間）より前の資料を、その部の分だけ Storage・DB ともに一括削除。

UI:

- `src/app/edit/[dept]/document-settings.tsx`: 各資料行の折りたたみ「期間・ラベル・PDFを編集」パネル。`DateRangeInputs` / `CategorySelect` は追加フォームでも使い回す。
- `src/app/edit/[dept]/delete-ended-button.tsx`: 掲載終了の資料があるときだけ出る一括削除ボタン（`confirm()` で確認）。
- 一覧の各行: ラベル・NEW・状態バッジ、ピン留めボタン。ピン留め中の行は枠を色付け。

## 通し番号と掲示履歴（2026-10-14）

`supabase/migrations/0007_serial_no_and_history.sql`

- `documents.serial_no`: ボード全体（部をまたいだ1本）の通し番号。`assign_document_serial_no` トリガーが登録時に `max + 1` で採番する（ボード単位の advisory lock で同時登録の重複を防止）。クライアントから指定・変更しても無視される。`(board_id, serial_no)` にユニーク制約。既存行は登録順に採番済み。
- `documents.deleted_at`: 論理削除。「削除」「掲載終了の一括削除」は行も PDF ファイルも消さずに `deleted_at` を立てるだけになった。viewer 向け RLS と `display_documents` ビューは削除済みを除外する（表示アプリ側の変更不要）。ビューには `serial_no` 列も追加。
- 0006 で `authenticated` への GRANT を明示（新しい Supabase は public テーブルを自動 GRANT しないため）。

アプリ側:

- `getDocuments()` は `deleted_at is null` のみ。新たに `getDocumentHistory(boardId)`（削除済み含む全件、通し番号の新しい順）と、署名付きURLをまとめて発行する `getDocumentPreviewUrls(paths)` を追加。
- `src/lib/schedule.ts`: `getEffectivePeriod()` — 履歴に出す実際の表示期間。開始は表示開始日（未設定なら登録日）、終了は表示終了日と削除日の早いほう（どちらも無ければ「継続中」）。
- `/edit/history`（`src/app/edit/history/`）: 掲示履歴。No.・ラベル・タイトル（PDF を開くリンク）・部・表示期間・状態（削除済み含む）を表で表示。`?dept=slug` で部の絞り込み。削除済みは `restoreDocument` で「一覧に戻す」ことができる。
- 部の資料一覧に `No.` を表示。資料ホームに「掲示履歴を見る」リンク。
- PDF 差し替え時の旧ファイルは従来どおり削除する（版の履歴は持たない）。

## 掲示履歴の CSV 出力（2026-10-14）

- `src/app/edit/history/export/route.ts`: `GET /edit/history/export`（`?dept=slug` で部の絞り込み、履歴ページと同じ）。列は No.・タイトル・部・ラベル・表示開始日・表示終了日（`getEffectivePeriod()` の実際の期間）・状態・ピン留め・登録日時・削除日時（日本時間）。
- Excel でダブルクリックして開いても文字化けしないよう UTF-8 BOM + CRLF。全フィールドをダブルクォートで囲み、`=` `+` `-` `@` で始まる値には `'` を前置して数式として実行されないようにしている（CSV インジェクション対策）。
- ファイル名は `掲示履歴[_部名]_YYYYMMDD.csv`（`filename*` で UTF-8 指定、古いブラウザ向けに `history.csv` をフォールバック）。
- 履歴ページ右上に「CSVでダウンロード」ボタン（絞り込み中はその部だけ）。状態の表示名は `getHistoryStatusLabel()` として `src/lib/schedule.ts` に移し、ページと CSV で共通化。

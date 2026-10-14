-- 資料の表示予約: 表示開始日・終了日（どちらも任意、日付単位、終了日を含む）。
-- 判定は日本時間の「今日」で行う。viewer 向け RLS で期間外を弾くので、
-- 表示アプリ側（別リポジトリ）のコード変更なしで予約が反映される。

alter table documents
  add column if not exists display_start date,
  add column if not exists display_end date;

alter table documents
  drop constraint if exists documents_display_range_check;

alter table documents
  add constraint documents_display_range_check
  check (display_start is null or display_end is null or display_start <= display_end);

drop policy if exists "viewer can view visible documents" on documents;

create policy "viewer can view visible documents"
  on documents for select
  using (
    board_role(board_id) = 'viewer'
    and visible = true
    and (display_start is null or display_start <= (now() at time zone 'Asia/Tokyo')::date)
    and (display_end is null or display_end >= (now() at time zone 'Asia/Tokyo')::date)
  );

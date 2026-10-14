-- ピン留め・重要度ラベル・表示アプリ向けビュー。

alter table documents
  add column if not exists pinned boolean not null default false,
  add column if not exists category text;

alter table documents
  drop constraint if exists documents_category_check;

alter table documents
  add constraint documents_category_check
  check (category is null or category in ('urgent', 'notice', 'routine'));

-- 表示アプリ（別リポジトリ）向け。RLS は呼び出しユーザーの権限で効く（security_invoker）ので、
-- viewer には期間内かつ visible な資料だけが返る。
-- is_new: 表示開始日（未設定なら登録日）から3日間（当日含む）は true。
-- 推奨の並び順: order by pinned desc, created_at desc
create or replace view display_documents
with (security_invoker = true)
as
select
  d.id,
  d.board_id,
  d.department_id,
  d.title,
  d.storage_path,
  d.visible,
  d.display_start,
  d.display_end,
  d.pinned,
  d.category,
  d.created_at,
  d.updated_at,
  (now() at time zone 'Asia/Tokyo')::date
    - coalesce(d.display_start, (d.created_at at time zone 'Asia/Tokyo')::date)
    < 3 as is_new
from documents d;

grant select on display_documents to authenticated;

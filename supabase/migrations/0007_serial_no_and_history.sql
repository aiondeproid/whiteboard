-- 掲示履歴: 資料に掲示板全体の通し番号を自動採番し、削除は論理削除にして
-- 履歴（PDF ファイル含む）を残す。

alter table documents
  add column if not exists serial_no integer,
  add column if not exists deleted_at timestamptz;

-- 既存行は登録順に採番
update documents d
set serial_no = numbered.rn
from (
  select id, row_number() over (partition by board_id order by created_at, id) as rn
  from documents
) numbered
where d.id = numbered.id and d.serial_no is null;

alter table documents alter column serial_no set not null;

create unique index if not exists documents_board_serial_no_idx
  on documents (board_id, serial_no);

-- 採番はトリガーで行い、クライアントからの指定・変更は無視する。
-- 同じボードへの同時登録で番号が重複しないよう、ボード単位でロックを取ってから max + 1。
create or replace function assign_document_serial_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.serial_no := old.serial_no;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('documents_serial_no:' || new.board_id::text));
  select coalesce(max(serial_no), 0) + 1 into new.serial_no
  from documents
  where board_id = new.board_id;
  return new;
end;
$$;

drop trigger if exists documents_assign_serial_no on documents;
create trigger documents_assign_serial_no
  before insert or update on documents
  for each row execute function assign_document_serial_no();

create index if not exists documents_board_deleted_idx
  on documents (board_id, deleted_at);

-- 削除済みは viewer から見えなくする（表示アプリ側の変更は不要）。
drop policy if exists "viewer can view visible documents" on documents;

create policy "viewer can view visible documents"
  on documents for select
  using (
    board_role(board_id) = 'viewer'
    and visible = true
    and deleted_at is null
    and (display_start is null or display_start <= (now() at time zone 'Asia/Tokyo')::date)
    and (display_end is null or display_end >= (now() at time zone 'Asia/Tokyo')::date)
  );

-- 表示アプリ向けビューにも通し番号を追加（create or replace view は末尾への列追加のみ可）。
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
    between 0 and 2 as is_new,
  d.serial_no
from documents d
where d.deleted_at is null;

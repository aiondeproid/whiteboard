-- 社内利用のため「編集者ごとに別ボード」をやめ、単一の共有ボードを複数編集者で
-- 共同編集する運用に変更する。
--
-- 本番の boards/board_members/documents にはデモ・テストデータしか入っていないため、
-- 一度クリアしてから唯一のボードを作り直す。

-- ---------------------------------------------------------------------------
-- 1. 「1ボードにつき編集者は1人まで」の制約を撤廃
-- ---------------------------------------------------------------------------

drop index if exists board_members_one_editor_per_board;

-- ---------------------------------------------------------------------------
-- 2. boards: owner_id を廃止（所有者ではなく editor 全員がボードを管理する）、
--    編集者用の招待コードを追加。viewer 用の join_code とは別物にして、
--    表示アプリ用に配布する join_code だけでは編集権限を取れないようにする。
-- ---------------------------------------------------------------------------

drop policy if exists "owner can update board" on boards;
drop policy if exists "owner can delete board" on boards;

alter table boards drop column if exists owner_id;
alter table boards add column if not exists editor_invite_code text unique;

-- ---------------------------------------------------------------------------
-- 3. 既存データ（デモ・テストのみ）をクリアして単一ボードを作成
--
-- storage.objects は SQL から直接 DELETE できない（Storage API 経由のみ許可）
-- ため、デモPDFの実ファイルはここではクリアしない。board_members ごと消える
-- ので旧ボードの storage RLS 経由でのアクセスはできなくなり、実害のない
-- 孤立ファイルとして残るだけ（気になる場合は後で Storage ダッシュボードから
-- 個別に削除する）。
-- ---------------------------------------------------------------------------

delete from documents;
delete from board_members;
delete from boards;

do $$
declare
  v_board_id uuid;
  v_join_code text;
  v_editor_code text;
begin
  loop
    v_join_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from boards where join_code = v_join_code);
  end loop;

  loop
    v_editor_code := upper(substr(md5(random()::text), 1, 6));
    exit when v_editor_code <> v_join_code
      and not exists (select 1 from boards where editor_invite_code = v_editor_code);
  end loop;

  insert into boards (name, join_code, editor_invite_code)
  values ('社内掲示板', v_join_code, v_editor_code)
  returning id into v_board_id;

  raise notice 'created single board % (join_code=%, editor_invite_code=%)',
    v_board_id, v_join_code, v_editor_code;
end $$;

-- ---------------------------------------------------------------------------
-- 4. create_board RPC を廃止し、編集者招待コードで参加する RPC を追加
-- ---------------------------------------------------------------------------

drop function if exists create_board(text);

create or replace function join_board_as_editor(p_code text)
returns boards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board boards;
begin
  select * into v_board from boards where editor_invite_code = upper(p_code);

  if not found then
    raise exception 'invalid editor invite code';
  end if;

  insert into board_members (board_id, user_id, role)
  values (v_board.id, auth.uid(), 'editor')
  on conflict (board_id, user_id) do update set role = 'editor';

  return v_board;
end;
$$;

revoke execute on function join_board_as_editor(text) from public;
grant execute on function join_board_as_editor(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS: boards の更新は editor 全員に許可。削除ポリシーは無し
--    （唯一のボードなのでアプリ経由の削除は想定しない）。
-- ---------------------------------------------------------------------------

create policy "editor can update board"
  on boards for update
  using (board_role(id) = 'editor');

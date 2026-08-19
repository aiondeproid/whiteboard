-- 編集者招待コードを廃止し、サインアップ（メール確認）自体をゲートとして
-- 認証済みユーザー全員が自動的に唯一の共有ボードの editor になれるようにする。

drop function if exists join_board_as_editor(text);

create or replace function join_board_as_editor()
returns boards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board boards;
begin
  select * into v_board from boards limit 1;

  if not found then
    raise exception 'no board exists';
  end if;

  insert into board_members (board_id, user_id, role)
  values (v_board.id, auth.uid(), 'editor')
  on conflict (board_id, user_id) do update set role = 'editor';

  return v_board;
end;
$$;

revoke execute on function join_board_as_editor() from public;
grant execute on function join_board_as_editor() to authenticated;

alter table boards drop column if exists editor_invite_code;

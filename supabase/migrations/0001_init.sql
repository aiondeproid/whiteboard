-- 電子掲示板 MVP: boards / board_members / departments / documents + RLS
-- Run via `supabase db push` or paste into the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0
);

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists board_members (
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- MVP requirement: at most one editor per board.
create unique index if not exists board_members_one_editor_per_board
  on board_members (board_id)
  where role = 'editor';

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  department_id uuid not null references departments(id),
  title text not null,
  storage_path text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_board_department_idx
  on documents (board_id, department_id);

insert into departments (slug, name, sort_order) values
  ('general_affairs', '総務課', 1),
  ('quality_control', '品質管理', 2),
  ('manufacturing', '製造', 3),
  ('prototyping', '試作', 4)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on documents;
create trigger documents_set_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer to avoid recursive RLS on board_members)
-- ---------------------------------------------------------------------------

create or replace function is_board_member(p_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from board_members
    where board_id = p_board_id and user_id = auth.uid()
  );
$$;

create or replace function board_role(p_board_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from board_members
  where board_id = p_board_id and user_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Board creation / join-code redemption (server-side only, security definer)
-- ---------------------------------------------------------------------------

create or replace function create_board(p_name text)
returns boards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board boards;
  v_code text;
begin
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from boards where join_code = v_code);
  end loop;

  insert into boards (name, owner_id, join_code)
  values (p_name, auth.uid(), v_code)
  returning * into v_board;

  insert into board_members (board_id, user_id, role)
  values (v_board.id, auth.uid(), 'editor');

  return v_board;
end;
$$;

create or replace function join_board_with_code(p_code text)
returns boards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board boards;
begin
  select * into v_board from boards where join_code = upper(p_code);

  if not found then
    raise exception 'invalid join code';
  end if;

  insert into board_members (board_id, user_id, role)
  values (v_board.id, auth.uid(), 'viewer')
  on conflict (board_id, user_id) do nothing;

  return v_board;
end;
$$;

revoke execute on function create_board(text) from public;
revoke execute on function join_board_with_code(text) from public;
grant execute on function create_board(text) to authenticated;
grant execute on function join_board_with_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table boards enable row level security;
alter table board_members enable row level security;
alter table departments enable row level security;
alter table documents enable row level security;

create policy "members can view their boards"
  on boards for select
  using (is_board_member(id));

create policy "owner can update board"
  on boards for update
  using (owner_id = auth.uid());

create policy "owner can delete board"
  on boards for delete
  using (owner_id = auth.uid());

create policy "members can view board membership"
  on board_members for select
  using (is_board_member(board_id));

create policy "editor can remove viewers"
  on board_members for delete
  using (board_role(board_id) = 'editor' and role = 'viewer');

create policy "authenticated users can read departments"
  on departments for select
  using (auth.role() = 'authenticated');

create policy "editor can view all documents"
  on documents for select
  using (board_role(board_id) = 'editor');

create policy "viewer can view visible documents"
  on documents for select
  using (board_role(board_id) = 'viewer' and visible = true);

create policy "editor can insert documents"
  on documents for insert
  with check (board_role(board_id) = 'editor');

create policy "editor can update documents"
  on documents for update
  using (board_role(board_id) = 'editor');

create policy "editor can delete documents"
  on documents for delete
  using (board_role(board_id) = 'editor');

-- ---------------------------------------------------------------------------
-- Storage: private "documents" bucket, path = "{board_id}/{department_id}/{filename}"
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "board members can read document files"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and is_board_member((storage.foldername(name))[1]::uuid)
  );

create policy "editor can upload document files"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and board_role((storage.foldername(name))[1]::uuid) = 'editor'
  );

create policy "editor can update document files"
  on storage.objects for update
  using (
    bucket_id = 'documents'
    and board_role((storage.foldername(name))[1]::uuid) = 'editor'
  );

create policy "editor can delete document files"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and board_role((storage.foldername(name))[1]::uuid) = 'editor'
  );

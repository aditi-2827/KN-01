-- Reset: drop-first so this script can be re-run cleanly.
-- Run once in the Supabase SQL editor. Safe because the app has no data yet —
-- if you already have synced rows, remove the two DROP lines below instead.

drop table if exists public.notes;
drop table if exists public.folders;

create table public.folders (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  name text not null default 'Untitled',
  parent_id text references public.folders(id) on delete set null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index folders_owner_idx on public.folders (owner_id);
create index folders_updated_idx on public.folders (updated_at);

create table public.notes (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  folder_id text references public.folders(id) on delete set null,
  kind text not null default 'note',
  title text not null default '',
  content text not null default '',
  created_at text not null,
  updated_at timestamptz not null default now(),
  review_count integer not null default 0,
  last_reviewed_at text,
  pinned boolean not null default false,
  deleted boolean not null default false
);

create index notes_owner_idx on public.notes (owner_id);
create index notes_updated_idx on public.notes (updated_at);

alter table public.notes enable row level security;
alter table public.folders enable row level security;

-- Notes: full CRUD confined to the row owner.
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (owner_id = auth.uid());
drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (owner_id = auth.uid());
drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (owner_id = auth.uid());

-- Folders: same confinement.
drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select using (owner_id = auth.uid());
drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert with check (owner_id = auth.uid());
drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete using (owner_id = auth.uid());
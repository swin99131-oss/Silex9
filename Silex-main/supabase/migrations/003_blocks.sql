create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "blocks_read_own" on public.blocks for select
  using (auth.uid() = blocker_id);
create policy "blocks_insert_own" on public.blocks for insert
  with check (auth.uid() = blocker_id);
create policy "blocks_delete_own" on public.blocks for delete
  using (auth.uid() = blocker_id);

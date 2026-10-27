-- Grove: synced tables (SPEC-v2 section 10).
-- Run once in the Supabase SQL editor. Safe to run again: it only creates what is missing.
--
-- Every table is keyed by (user_id, id) and protected by Row Level Security:
-- a signed-in user can only see and change rows where user_id = auth.uid().
-- updated_at is the device's time of the change; the newest wins per row,
-- here and on every device. synced_at is the server's time of the last write;
-- devices pull rows with synced_at after their last pull.

-- ---------- shared trigger ----------

create or replace function public.grove_touch() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- A stale write never replaces a newer row. The kept row is marked as
    -- changed, so the device that sent the stale copy pulls the winner back.
    if new.updated_at < old.updated_at then
      old.synced_at := now();
      return old;
    end if;
    new.user_id := old.user_id;
  end if;
  new.synced_at := now();
  return new;
end;
$$;

-- ---------- tables ----------

create table if not exists public.arcs (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          uuid not null,
  name        text not null,
  season      text not null check (season in ('winter', 'spring', 'summer', 'autumn')),
  look        text not null check (look in ('journal', 'greenhouse', 'night')),
  start_date  date not null,
  length_days integer not null check (length_days between 1 and 3650),
  threshold   integer not null check (threshold between 0 and 100),
  created_at  timestamptz not null,
  frozen_at   timestamptz,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.habits (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          uuid not null,
  arc_id      uuid not null,
  name        text not null,
  detail      text,
  sort_order  integer not null,
  created_on  date not null,
  archived_on date,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.day_logs (
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id                  uuid not null,
  arc_id              uuid not null,
  date                date not null,
  completed_habit_ids text[] not null default '{}',
  mood                text check (mood in ('great', 'good', 'okay', 'low', 'rough')),
  updated_at          timestamptz not null,
  synced_at           timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.visitors_found (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         uuid not null,
  arc_id     uuid not null,
  visitor_id text not null,
  found_on   date not null,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row per user; its id is the user's id.
create table if not exists public.settings (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         uuid not null,
  auto_night boolean not null,
  haptics    boolean not null,
  sounds     boolean not null,
  motion     boolean not null,
  nudge      boolean not null,
  recap      boolean not null,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id),
  check (id = user_id)
);

-- ---------- indexes, triggers, row level security ----------

do $$
declare
  t text;
begin
  foreach t in array array['arcs', 'habits', 'day_logs', 'visitors_found', 'settings'] loop
    execute format('create index if not exists %I on public.%I (user_id, synced_at)', t || '_user_synced', t);

    execute format('drop trigger if exists grove_touch on public.%I', t);
    execute format('create trigger grove_touch before insert or update on public.%I for each row execute function public.grove_touch()', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);
    execute format('drop policy if exists "own rows: delete" on public.%I', t);
    execute format('create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

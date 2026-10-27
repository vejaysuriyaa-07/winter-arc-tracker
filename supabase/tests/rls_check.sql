-- Grove: Row Level Security check. Run in the Supabase SQL editor after
-- 0001_grove.sql. It makes two throwaway users, writes rows as the first,
-- then checks that the second can neither see, change, delete nor forge them.
-- Everything it creates is removed at the end. The last result is a table
-- with one row per check; every "passed" should be true.

-- Clean up anything left by an earlier run.
delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-00000000000a', 'rls-check-a@example.invalid', 'authenticated', 'authenticated'),
       ('00000000-0000-4000-8000-00000000000b', 'rls-check-b@example.invalid', 'authenticated', 'authenticated');

drop table if exists pg_temp.rls_results;
create temp table rls_results (n serial, check_name text, passed boolean);
grant all on rls_results to authenticated, anon;
grant usage on sequence rls_results_n_seq to authenticated, anon;

-- ---------- act as user A: write one row in every table ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', false);

insert into public.arcs (user_id, id, name, season, look, start_date, length_days, threshold, created_at, updated_at)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'A arc', 'winter', 'journal', '2026-10-01', 90, 80, now(), now());
insert into public.habits (user_id, id, arc_id, name, sort_order, created_on, updated_at)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000a1', 'Read', 0, '2026-10-01', now());
insert into public.day_logs (user_id, id, arc_id, date, completed_habit_ids, updated_at)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a1', '2026-10-01', '{00000000-0000-4000-8000-0000000000a2}', now());
insert into public.visitors_found (user_id, id, arc_id, visitor_id, found_on, updated_at)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-0000000000a1', 'winter-robin', '2026-10-03', now());
insert into public.settings (user_id, id, auto_night, haptics, sounds, motion, nudge, recap, updated_at)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a', true, true, true, true, false, false, now());

insert into rls_results (check_name, passed)
select 'A sees its own rows in all 5 tables',
  (select count(*) from public.arcs) = 1 and (select count(*) from public.habits) = 1 and (select count(*) from public.day_logs) = 1
  and (select count(*) from public.visitors_found) = 1 and (select count(*) from public.settings) = 1;

-- A stale write (older updated_at) does not replace the newer row.
update public.arcs set name = 'stale', updated_at = now() - interval '1 day' where id = '00000000-0000-4000-8000-0000000000a1';
insert into rls_results (check_name, passed)
select 'a stale write keeps the newer row', (select name from public.arcs where id = '00000000-0000-4000-8000-0000000000a1') = 'A arc';

-- ---------- act as user B ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', false);

insert into rls_results (check_name, passed)
select 'B sees none of A''s rows',
  (select count(*) from public.arcs) + (select count(*) from public.habits) + (select count(*) from public.day_logs)
  + (select count(*) from public.visitors_found) + (select count(*) from public.settings) = 0;

with u as (update public.arcs set name = 'hacked' returning 1)
insert into rls_results (check_name, passed) select 'B cannot update A''s arcs', count(*) = 0 from u;
with u as (update public.habits set name = 'hacked' returning 1)
insert into rls_results (check_name, passed) select 'B cannot update A''s habits', count(*) = 0 from u;
with u as (update public.day_logs set mood = 'rough' returning 1)
insert into rls_results (check_name, passed) select 'B cannot update A''s day_logs', count(*) = 0 from u;
with u as (update public.visitors_found set visitor_id = 'x' returning 1)
insert into rls_results (check_name, passed) select 'B cannot update A''s visitors_found', count(*) = 0 from u;
with u as (update public.settings set sounds = false returning 1)
insert into rls_results (check_name, passed) select 'B cannot update A''s settings', count(*) = 0 from u;

with d as (delete from public.arcs returning 1)
insert into rls_results (check_name, passed) select 'B cannot delete A''s arcs', count(*) = 0 from d;
with d as (delete from public.habits returning 1)
insert into rls_results (check_name, passed) select 'B cannot delete A''s habits', count(*) = 0 from d;
with d as (delete from public.day_logs returning 1)
insert into rls_results (check_name, passed) select 'B cannot delete A''s day_logs', count(*) = 0 from d;
with d as (delete from public.visitors_found returning 1)
insert into rls_results (check_name, passed) select 'B cannot delete A''s visitors_found', count(*) = 0 from d;
with d as (delete from public.settings returning 1)
insert into rls_results (check_name, passed) select 'B cannot delete A''s settings', count(*) = 0 from d;

-- B cannot write a row that claims to be A's.
do $$
begin
  begin
    insert into public.arcs (user_id, id, name, season, look, start_date, length_days, threshold, created_at, updated_at)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000b1', 'forged', 'winter', 'journal', '2026-10-01', 90, 80, now(), now());
    insert into rls_results (check_name, passed) values ('B cannot insert rows as A', false);
  exception when insufficient_privilege then
    insert into rls_results (check_name, passed) values ('B cannot insert rows as A', true);
  end;
end;
$$;

-- ---------- signed out (anon) sees nothing ----------
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  begin
    perform 1 from public.arcs;
    insert into rls_results (check_name, passed) values ('signed out cannot read', false);
  exception when insufficient_privilege then
    insert into rls_results (check_name, passed) values ('signed out cannot read', true);
  end;
end;
$$;

-- ---------- back as the owner: A's rows are intact, then clean up ----------
reset role;
select set_config('request.jwt.claims', '', false);

insert into rls_results (check_name, passed)
select 'A''s rows are untouched',
  (select name from public.arcs where id = '00000000-0000-4000-8000-0000000000a1') = 'A arc'
  and (select count(*) from public.habits where user_id = '00000000-0000-4000-8000-00000000000a') = 1
  and (select mood from public.day_logs where id = '00000000-0000-4000-8000-0000000000a3') is null
  and (select sounds from public.settings where user_id = '00000000-0000-4000-8000-00000000000a');

delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');

insert into rls_results (check_name, passed)
select 'deleting a user removes their rows', (select count(*) from public.arcs where user_id = '00000000-0000-4000-8000-00000000000a') = 0;

select check_name, passed from rls_results order by n;

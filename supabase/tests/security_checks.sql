-- ════════════════════════════════════════════════════════════════════════════════════════════
--  Security checks · run in Supabase → SQL Editor after the migrations and admin setup.
--
--  It pretends to be each kind of visitor and tries what they should and shouldn't be able to do,
--  straight against the database (no website involved). Every change it makes is undone.
--
--  Before running, create three accounts on the website and confirm their emails:
--    • one you leave PENDING, • one you APPROVE in the admin area, • your ADMIN account.
--  Put their emails in the three lines marked ▶ below. Every row of the result should say ok = true.
-- ════════════════════════════════════════════════════════════════════════════════════════════

drop table if exists pg_temp.who, pg_temp.rls_results;
create temp table who (label text primary key, id uuid);
create temp table rls_results (n serial, check_name text, expected text, actual text, ok boolean);

insert into who select 'pending',  id from auth.users where email = 'PENDING-STUDENT@example.com';   -- ▶
insert into who select 'approved', id from auth.users where email = 'APPROVED-STUDENT@example.com';  -- ▶
insert into who select 'admin',    id from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';  -- ▶

grant select on who to anon, authenticated;
grant select, insert on rls_results to anon, authenticated;
grant usage on sequence rls_results_n_seq to anon, authenticated;

do $$ begin
  if (select count(*) from who) < 3 then
    raise exception 'Fill in all three email addresses at the top first (one or more were not found).';
  end if;
end $$;

-- ── a visitor who is not signed in ──
set role anon;
do $$
declare n int;
begin
  select count(*) into n from public.questions where access <> 'public';
  insert into rls_results (check_name, expected, actual, ok) values ('anon: read protected questions', '0 rows', n || ' rows', n = 0);
  select count(*) into n from public.doctors where access <> 'public';
  insert into rls_results (check_name, expected, actual, ok) values ('anon: read protected doctors', '0 rows', n || ' rows', n = 0);
  begin
    select count(*) into n from public.profiles;
    insert into rls_results (check_name, expected, actual, ok) values ('anon: read accounts', 'refused', n || ' rows', false);
  exception when insufficient_privilege then
    insert into rls_results (check_name, expected, actual, ok) values ('anon: read accounts', 'refused', 'refused', true);
  end;
end $$;
reset role;

-- ── a PENDING student ──
select set_config('request.jwt.claims', json_build_object('sub', (select id from who where label = 'pending'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.questions where access <> 'public';
  insert into rls_results (check_name, expected, actual, ok) values ('pending: read protected questions', '0 rows', n || ' rows', n = 0);
  select count(*) into n from public.doctors where access <> 'public';
  insert into rls_results (check_name, expected, actual, ok) values ('pending: read protected doctors', '0 rows', n || ' rows', n = 0);
  select count(*) into n from public.profiles;
  insert into rls_results (check_name, expected, actual, ok) values ('pending: sees only own account', '1 row', n || ' rows', n = 1);

  begin
    update public.profiles set status = 'approved' where id = (select auth.uid());
    get diagnostics n = row_count;
    insert into rls_results (check_name, expected, actual, ok) values ('pending: approve self by update', 'refused', n || ' rows changed', n = 0);
  exception when insufficient_privilege then
    insert into rls_results (check_name, expected, actual, ok) values ('pending: approve self by update', 'refused', 'refused', true);
  end;

  begin
    perform public.set_account_status((select auth.uid()), 'approved');
    insert into rls_results (check_name, expected, actual, ok) values ('pending: approve self by function', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('pending: approve self by function', 'refused', 'refused', true);
  end;

  begin
    insert into public.admins (user_id) values ((select auth.uid()));
    insert into rls_results (check_name, expected, actual, ok) values ('pending: make self admin', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('pending: make self admin', 'refused', 'refused', true);
  end;

  begin
    insert into public.question_progress (question_key, note) values ('surgery/test', 'x');
    insert into rls_results (check_name, expected, actual, ok) values ('pending: save study notes', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('pending: save study notes', 'refused', 'refused', true);
  end;
end $$;
reset role;

-- ── an APPROVED student ──
select set_config('request.jwt.claims', json_build_object('sub', (select id from who where label = 'approved'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.doctors;
  insert into rls_results (check_name, expected, actual, ok) values ('approved: read doctors', 'all rows', n || ' rows', n > 0);
  select count(*) into n from public.profiles;
  insert into rls_results (check_name, expected, actual, ok) values ('approved: sees only own account', '1 row', n || ' rows', n = 1);
  select count(*) into n from public.question_progress where user_id <> (select auth.uid());
  insert into rls_results (check_name, expected, actual, ok) values ('approved: read other students'' notes', '0 rows', n || ' rows', n = 0);

  begin
    insert into public.question_progress (question_key, note) values ('surgery/test', 'x');
    raise exception using errcode = 'U0001';  -- undo the test write
  exception
    when sqlstate 'U0001' then
      insert into rls_results (check_name, expected, actual, ok) values ('approved: save own study notes', 'allowed', 'allowed', true);
    when others then
      insert into rls_results (check_name, expected, actual, ok) values ('approved: save own study notes', 'allowed', sqlerrm, false);
  end;

  begin
    insert into public.question_progress (user_id, question_key) values ((select id from who where label = 'pending'), 'surgery/test');
    insert into rls_results (check_name, expected, actual, ok) values ('approved: write another student''s notes', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('approved: write another student''s notes', 'refused', 'refused', true);
  end;

  begin
    perform public.set_account_status((select id from who where label = 'pending'), 'approved');
    insert into rls_results (check_name, expected, actual, ok) values ('approved: approve someone else', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('approved: approve someone else', 'refused', 'refused', true);
  end;
end $$;
reset role;

-- ── the ADMIN ──
select set_config('request.jwt.claims', json_build_object('sub', (select id from who where label = 'admin'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  insert into rls_results (check_name, expected, actual, ok) values ('admin: sees all accounts', 'more than 1', n || ' rows', n > 1);

  begin
    perform public.set_account_status((select auth.uid()), 'rejected');
    insert into rls_results (check_name, expected, actual, ok) values ('admin: change own status', 'refused', 'allowed', false);
  exception when others then
    insert into rls_results (check_name, expected, actual, ok) values ('admin: change own status', 'refused', 'refused', true);
  end;

  begin
    perform public.set_account_status((select id from who where label = 'approved'), 'rejected', 'test');
    raise exception using errcode = 'U0001';  -- undo
  exception
    when sqlstate 'U0001' then
      insert into rls_results (check_name, expected, actual, ok) values ('admin: revoke a student', 'allowed', 'allowed', true);
    when others then
      insert into rls_results (check_name, expected, actual, ok) values ('admin: revoke a student', 'allowed', sqlerrm, false);
  end;
end $$;
reset role;

select check_name, expected, actual, ok from rls_results order by n;

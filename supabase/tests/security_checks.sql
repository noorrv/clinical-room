-- ════════════════════════════════════════════════════════════════════════════════════════════
--  Security checks · run in Supabase → SQL Editor after the migrations and admin setup.
--
--  It pretends to be each kind of visitor and tries what they should and shouldn't be able to do,
--  straight against the database (no website involved). Every change it makes is undone.
--
--  Fill in the emails on the three lines marked ▶ (the approved one is optional: leave it as is
--  to skip those checks). Every row of the result should say ok = true.
-- ════════════════════════════════════════════════════════════════════════════════════════════

select set_config('test.pending',  coalesce((select id::text from auth.users where email = 'PENDING-STUDENT@example.com'), ''), false);   -- ▶ pending account
select set_config('test.admin',    coalesce((select id::text from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com'), ''), false);  -- ▶ your admin account
select set_config('test.approved', coalesce((select id::text from auth.users where email = 'APPROVED-STUDENT@example.com'), ''), false); -- ▶ optional
select set_config('test.results', '', false);

do $$ begin
  if current_setting('test.pending') = '' or current_setting('test.admin') = '' then
    raise exception 'Put the pending and admin email addresses on the lines marked ▶ first (one was not found).';
  end if;
end $$;

-- results are collected in a session setting (test.results), so they survive switching roles

-- ── a visitor who is not signed in ──
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
declare n int;
begin
  select count(*) into n from public.questions where access <> 'public';
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read protected questions', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.doctors where access <> 'public';
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read protected doctors', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  begin
    select count(*) into n from public.profiles;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read accounts', 'refused', n || ' rows', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when insufficient_privilege then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read accounts', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
  begin
    perform public.set_account_status(current_setting('test.pending')::uuid, 'approved');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: approve an account', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: approve an account', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
end $$;
reset role;

-- ── the PENDING student ──
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.pending'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.questions where access <> 'public';
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: read protected questions', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.doctors where access <> 'public';
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: read protected doctors', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.profiles;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: sees only own account', '1 row', n || ' rows', coalesce((n = 1)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.admins;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: sees the admins list', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);

  begin
    update public.profiles set status = 'approved' where id = (select auth.uid());
    get diagnostics n = row_count;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: approve self by editing account', 'refused', n || ' rows changed', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  exception when insufficient_privilege then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: approve self by editing account', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.set_account_status((select auth.uid()), 'approved');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: approve self by function', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: approve self by function', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.admins (user_id) values ((select auth.uid()));
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: make self admin', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: make self admin', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.question_progress (question_key, note) values ('surgery/security-test', 'x');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: save study notes', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: save study notes', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  select count(*) into n from public.question_progress;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: read study notes', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
end $$;
reset role;

-- ── an APPROVED student (optional) ──
select set_config('request.jwt.claims',
  case when current_setting('test.approved') = '' then ''
       else json_build_object('sub', current_setting('test.approved'), 'role', 'authenticated')::text end, false);
set role authenticated;
do $$
declare n int;
begin
  if current_setting('test.approved') = '' then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: (no approved test account given)', '-', '-', coalesce((null)::text, 'skipped')) || E'\n', false);
    return;
  end if;

  select count(*) into n from public.doctors;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: read doctors', 'all rows', n || ' rows', coalesce((n > 0)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.profiles;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: sees only own account', '1 row', n || ' rows', coalesce((n = 1)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.question_progress where user_id <> (select auth.uid());
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: read other students'' notes', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);

  begin
    insert into public.question_progress (question_key, note) values ('surgery/security-test', 'x');
    raise exception using errcode = 'U0001';  -- undo the test write
  exception
    when sqlstate 'U0001' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: save own study notes', 'allowed', 'allowed', coalesce((true)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: save own study notes', 'allowed', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.question_progress (user_id, question_key) values (current_setting('test.pending')::uuid, 'surgery/security-test');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another student''s notes', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another student''s notes', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.set_account_status(current_setting('test.pending')::uuid, 'approved');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: approve someone else', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: approve someone else', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
end $$;
reset role;

-- ── the ADMIN ──
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: sees all accounts', 'more than 1', n || ' rows', coalesce((n > 1)::text, 'skipped')) || E'\n', false);
  select count(*) into n from public.doctors;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: read doctors', 'all rows', n || ' rows', coalesce((n > 0)::text, 'skipped')) || E'\n', false);

  begin
    perform public.set_account_status((select auth.uid()), 'rejected');
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: change own status', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: change own status', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.set_account_status(current_setting('test.pending')::uuid, 'rejected', 'security test');
    raise exception using errcode = 'U0001';  -- undo
  exception
    when sqlstate 'U0001' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: reject a student', 'allowed', 'allowed', coalesce((true)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: reject a student', 'allowed', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  begin
    update public.profiles set status = 'approved' where id = current_setting('test.pending')::uuid;
    get diagnostics n = row_count;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: edit accounts directly (must use the function)', 'refused', n || ' rows changed', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  exception when insufficient_privilege then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: edit accounts directly (must use the function)', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
end $$;
reset role;
select set_config('request.jwt.claims', '', false);

-- ── results ──
select split_part(line, '|', 1) as check_name,
       split_part(line, '|', 2) as expected,
       split_part(line, '|', 3) as actual,
       split_part(line, '|', 4) as ok
  from string_to_table(rtrim(current_setting('test.results'), E'\n'), E'\n') with ordinality as t(line, n)
 order by n;

-- ════════════════════════════════════════════════════════════════════════════════════════════
--  Security checks · run in Supabase → SQL Editor after all migrations (including the admin dashboard one) and admin setup.
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
    raise exception 'The pending or admin email address was not found in auth.users. Check the lines marked ▶.';
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
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: make self admin', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: make self admin', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.question_progress (question_key, note) values ('surgery/security-test', 'x');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: save study notes', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: save study notes', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.questions (specialty_id, id, title, type) values ('surgery', 'security-test', 'x', 'case');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: add a question', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: add a question', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.announcements (title) values ('security test');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: post a notice', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: post a notice', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.admin_student_overview();
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: view student progress', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: view student progress', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  select count(*) into n from public.admin_activity;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: read the activity log', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);

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
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another student''s notes', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another student''s notes', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  select count(*) into n from public.questions where status = 'draft';
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: see draft questions', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);

  begin
    insert into public.doctors (specialty_id, id, name) values ('surgery', 'security-test', 'x');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: add a doctor', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: add a doctor', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    update public.doctors set name = 'x' where specialty_id = 'surgery' and id = 'walaa' returning 1 into strict n;
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: edit a doctor', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: edit a doctor', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.admin_student_detail(current_setting('test.pending')::uuid);
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: view another student''s progress', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: view another student''s progress', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform public.set_account_status(current_setting('test.pending')::uuid, 'approved');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: approve someone else', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
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
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: change own status', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
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
    insert into public.questions (specialty_id, id, title, type) values ('surgery', 'security-test', 'Security test', 'case');
    update public.questions set status = 'published' where specialty_id = 'surgery' and id = 'security-test';
    raise exception using errcode = 'U0001';  -- undo
  exception
    when sqlstate 'U0001' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: add a draft question and publish it', 'allowed', 'allowed', coalesce((true)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: add a draft question and publish it', 'allowed', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  begin
    insert into public.announcements (id, title) values ('00000000-0000-0000-0000-00000000c0de', 'Security test');
    update public.announcements set published = false where id = '00000000-0000-0000-0000-00000000c0de';
    delete from public.announcements where id = '00000000-0000-0000-0000-00000000c0de';
    raise exception using errcode = 'U0001';  -- undo
  exception
    when sqlstate 'U0001' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: post, unpublish and delete a notice', 'allowed', 'allowed', coalesce((true)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: post, unpublish and delete a notice', 'allowed', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  select count(*) into n from public.admin_activity;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: read the activity log', 'allowed', n || ' rows', coalesce((n >= 0)::text, 'skipped')) || E'\n', false);

  begin
    select count(*) into n from public.admin_student_overview();
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: view student progress', 'allowed', n || ' students', coalesce((n >= 1)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: view student progress', 'allowed', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  begin
    perform 1 where public.admin_student_detail(current_setting('test.pending')::uuid)::text ilike '%"note%';
    get diagnostics n = row_count;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: progress never includes notes', 'no notes', case when n = 0 then 'no notes' else 'notes found' end, coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  exception when others then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: progress never includes notes', 'no notes', sqlerrm, coalesce((false)::text, 'skipped')) || E'\n', false);
  end;

  begin
    delete from public.specialties where id = 'surgery';
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: delete a specialty that still has doctors', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'admin: delete a specialty that still has doctors', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
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

-- ── notifications (content_updates, notification_reads) ──
-- signed out: no feed, no read state
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.content_updates;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read the notification feed', 'refused', n || ' rows', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when insufficient_privilege then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read the notification feed', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
  begin
    select count(*) into n from public.notification_reads;
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read notification read state', 'refused', n || ' rows', coalesce((false)::text, 'skipped')) || E'\n', false);
  exception when insufficient_privilege then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'anon: read notification read state', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
end $$;
reset role;

-- pending: sees no feed and cannot post to it
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.pending'), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.content_updates;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: read the notification feed', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
  begin
    insert into public.content_updates (kind, title) values ('updated', 'security test');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: post a notification', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'pending: post a notification', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
end $$;
reset role;

-- approved student (optional): reads the feed, but cannot post to it or touch anyone else's read state
select set_config('request.jwt.claims', json_build_object('sub', nullif(current_setting('test.approved'), ''), 'role', 'authenticated')::text, false);
set role authenticated;
do $$
declare n int;
begin
  if current_setting('test.approved') = '' then
    perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: notification checks', 'run', 'skipped (no approved email)', 'skipped') || E'\n', false);
    return;
  end if;
  begin
    insert into public.content_updates (kind, title) values ('updated', 'security test');
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: post a notification', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: post a notification', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
  begin
    insert into public.notification_reads (user_id, seen_at) values (current_setting('test.admin')::uuid, now());
    raise exception using errcode = 'U0002';  -- undo
  exception
    when sqlstate 'U0002' then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another account''s read state', 'refused', 'allowed', coalesce((false)::text, 'skipped')) || E'\n', false);
    when others then
      perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: write another account''s read state', 'refused', 'refused', coalesce((true)::text, 'skipped')) || E'\n', false);
  end;
  select count(*) into n from public.notification_reads where user_id <> current_setting('test.approved')::uuid;
  perform set_config('test.results', current_setting('test.results') || concat_ws('|', 'approved: read another account''s read state', '0 rows', n || ' rows', coalesce((n = 0)::text, 'skipped')) || E'\n', false);
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

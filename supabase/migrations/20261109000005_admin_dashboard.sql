-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · stage 1 of the admin dashboard
--
--  Adds, without deleting or renaming anything:
--    1. explicit table permissions (removes Supabase's broad defaults)
--    2. Draft / Published for questions, Published on/off for announcements
--    3. admin-only add / edit / delete rules on content
--    4. specialties can no longer be deleted while they hold content
--    5. an automatic admin activity log
--    6. admin-only student progress functions that never return private notes
--
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. permissions: start from nothing, grant only what's used ───────────────────────────

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles, public.admins to authenticated;

grant select on public.specialties, public.doctors, public.topics, public.questions,
                public.question_doctors, public.question_topics, public.announcements to anon, authenticated;
-- writes are granted but every one is checked by an admin-only rule below
grant insert, update, delete on public.specialties, public.doctors, public.topics, public.questions,
                public.question_doctors, public.question_topics, public.announcements to authenticated;

grant select, insert, update, delete on public.question_progress, public.recent_views,
                public.study_sessions, public.mock_results, public.study_days to authenticated;

-- tables created later start with no access for the website, until granted on purpose
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;


-- ─────────────────────────── 2. drafts and published notices ───────────────────────────

alter table public.questions
  add column status text not null default 'draft' check (status in ('draft', 'published'));
comment on column public.questions.status is 'draft: only admins see it; published: visible according to access.';

alter table public.announcements
  add column published boolean not null default true;

-- students and guests see only published questions and notices; admins see everything
drop policy "questions: readable" on public.questions;
create policy "questions: readable" on public.questions
  for select to anon, authenticated
  using ((status = 'published' and (access = 'public' or private.is_approved())) or private.is_admin());

drop policy "announcements: readable" on public.announcements;
create policy "announcements: readable" on public.announcements
  for select to anon, authenticated
  using ((published and (access = 'public' or private.is_approved())) or private.is_admin());

-- keep questions.updated_at honest
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger questions_touch_updated_at
  before update on public.questions
  for each row execute function private.touch_updated_at();


-- ─────────────────────────── 3. admin-only writes on content ───────────────────────────

do $$
declare t text;
begin
  foreach t in array array['specialties', 'doctors', 'topics', 'questions', 'question_doctors', 'question_topics', 'announcements'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_admin())', t || ': admins add', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())', t || ': admins edit', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_admin())', t || ': admins delete', t);
  end loop;
end $$;


-- ─────────────────────────── 4. safe deletes for specialties ───────────────────────────
-- Previously deleting a specialty silently deleted every doctor, topic and question in it.
-- Now it is refused while anything still belongs to it.

do $$
declare r record;
begin
  for r in
    select conrelid::regclass as tbl, conname
      from pg_constraint
     where contype = 'f' and confrelid = 'public.specialties'::regclass
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.doctors   add constraint doctors_specialty_id_fkey   foreign key (specialty_id) references public.specialties (id) on delete restrict;
alter table public.topics    add constraint topics_specialty_id_fkey    foreign key (specialty_id) references public.specialties (id) on delete restrict;
alter table public.questions add constraint questions_specialty_id_fkey foreign key (specialty_id) references public.specialties (id) on delete restrict;


-- ─────────────────────────── 5. admin activity log ───────────────────────────
-- Filled by the database itself on every change, whoever makes it (the dashboard or Table Editor).

create table public.admin_activity (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      uuid references auth.users (id) on delete set null,
  action     text not null check (action in ('created', 'updated', 'deleted', 'published', 'unpublished', 'status')),
  entity     text not null,
  entity_key text not null,
  summary    text
);
create index admin_activity_at_idx on public.admin_activity (at desc);

alter table public.admin_activity enable row level security;
grant select on public.admin_activity to authenticated;
create policy "admin_activity: admins read" on public.admin_activity
  for select to authenticated
  using (private.is_admin());

create function private.log_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  r     jsonb;
  o     jsonb;
  act   text;
  label text;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then o := to_jsonb(old); end if;

  label := coalesce(r ->> 'title', r ->> 'name', r ->> 'full_name', r ->> 'id');

  if tg_op = 'INSERT' then
    act := 'created';
  elsif tg_op = 'DELETE' then
    act := 'deleted';
  elsif tg_table_name = 'questions' and (o ->> 'status') is distinct from (r ->> 'status') then
    act := case when r ->> 'status' = 'published' then 'published' else 'unpublished' end;
  elsif tg_table_name = 'announcements' and (o ->> 'published') is distinct from (r ->> 'published') then
    act := case when (r ->> 'published')::boolean then 'published' else 'unpublished' end;
  elsif tg_table_name = 'profiles' then
    if (o ->> 'status') is not distinct from (r ->> 'status') then
      return null;
    end if;
    act := 'status';
    label := label || ' → ' || (r ->> 'status');
  else
    act := 'updated';
  end if;

  insert into public.admin_activity (actor, action, entity, entity_key, summary)
  values ((select auth.uid()), act, tg_table_name,
          concat_ws('/', r ->> 'specialty_id', coalesce(r ->> 'id', r ->> 'user_id')),
          left(label, 200));
  return null;
end;
$$;
revoke all on function private.log_activity() from public, anon, authenticated;

create trigger log_activity after insert or update or delete on public.specialties   for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.doctors       for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.topics        for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.questions     for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.announcements for each row execute function private.log_activity();
create trigger log_activity after insert or update of status on public.profiles      for each row execute function private.log_activity();


-- ─────────────────────────── 6. student progress for admins, never notes ───────────────────────────
-- Progress rows also hold private notes, so admins get these functions instead of table access.

create function public.admin_student_overview()
returns table (
  id               uuid,
  full_name        text,
  email            text,
  status           public.account_status,
  created_at       timestamptz,
  reviewed_at      timestamptz,
  last_active      timestamptz,
  questions_worked integer,
  mastered         integer,
  needs_revision   integer,
  goal_days        integer,
  mock_exams       integer
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can view student progress.' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name, p.email, p.status, p.created_at, p.reviewed_at,
         greatest(
           (select max(q.updated_at) from public.question_progress q where q.user_id = p.id),
           (select max(v.viewed_at)  from public.recent_views v      where v.user_id = p.id),
           (select max(s.last_at)    from public.study_sessions s    where s.user_id = p.id)
         ),
         (select count(*)::int from public.question_progress q where q.user_id = p.id and q.status <> 'not-started'),
         (select count(*)::int from public.question_progress q where q.user_id = p.id and q.status = 'mastered'),
         (select count(*)::int from public.question_progress q where q.user_id = p.id and q.status = 'needs-revision'),
         (select count(*)::int from public.study_days d        where d.user_id = p.id and cardinality(d.question_keys) >= 5),
         (select count(*)::int from public.mock_results m      where m.user_id = p.id)
    from public.profiles p
   order by p.created_at desc;
end;
$$;

create function public.admin_student_detail(student uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only an administrator can view student progress.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object('question_key', q.question_key, 'status', q.status,
                                          'bookmarked', q.bookmarked, 'updated_at', q.updated_at)
                       order by q.updated_at desc)
        from public.question_progress q where q.user_id = student), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', cardinality(d.question_keys)) order by d.day desc)
        from public.study_days d where d.user_id = student), '[]'::jsonb),
    'mocks', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.at, 'scope', m.scope, 'stations', m.stations) order by m.at desc)
        from public.mock_results m where m.user_id = student), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('question_key', v.question_key, 'viewed_at', v.viewed_at) order by v.viewed_at desc)
        from (select question_key, viewed_at from public.recent_views
               where user_id = student order by viewed_at desc limit 20) v), '[]'::jsonb),
    'sessions', (select count(*) from public.study_sessions s where s.user_id = student)
  );
end;
$$;

revoke all on function public.admin_student_overview() from public, anon;
revoke all on function public.admin_student_detail(uuid) from public, anon;
grant execute on function public.admin_student_overview() to authenticated;
grant execute on function public.admin_student_detail(uuid) to authenticated;

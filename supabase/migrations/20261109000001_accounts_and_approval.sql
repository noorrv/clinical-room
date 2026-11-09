-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · accounts, manual approval, protected content and study data
--
--  Every table has Row Level Security on. The website only ever holds the public key, so these
--  rules are the real protection: a pending or rejected account gets nothing back, even when it
--  talks to the database directly.
--
--  Run once in Supabase → SQL Editor (or `supabase db push`). Safe to read top to bottom.
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Helpers live in their own schema, which the public API does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.account_status as enum ('pending', 'approved', 'rejected');
create type public.content_access as enum ('approved', 'public');


-- ─────────────────────────────────────────── accounts ───────────────────────────────────────────

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text not null check (char_length(full_name) between 2 and 100),
  email              text not null,
  email_confirmed_at timestamptz,
  status             public.account_status not null default 'pending',
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid references auth.users (id) on delete set null,
  review_note        text check (review_note is null or char_length(review_note) <= 500)
);
create index profiles_status_created_idx on public.profiles (status, created_at desc);
comment on table public.profiles is 'One row per student. Created by trigger as pending; only set_account_status() changes status.';

-- Admins are a separate list, so nothing a student can touch ever grants admin rights.
-- There is deliberately no way to write to this table from the website: add admins in the SQL editor.
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- ─────────────────────────────────────────── checks ───────────────────────────────────────────
-- security definer so they can read profiles/admins whatever the caller's own access is.
-- They are looked up on every request, so approving or revoking takes effect at once.

create function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create function private.is_approved()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'approved'
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_approved() from public;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_approved() to anon, authenticated;


-- ──────────────────────────────────── new accounts: always pending ────────────────────────────────────

create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  display_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100);
begin
  if char_length(display_name) < 2 then
    display_name := 'Unnamed student';
  end if;
  -- status is not taken from anything the visitor sent: every account starts pending.
  insert into public.profiles (id, full_name, email, email_confirmed_at, status)
  values (new.id, display_name, coalesce(new.email, ''), new.email_confirmed_at, 'pending');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- keep the email and its confirmation in step with Supabase Auth
create function private.sync_user_email()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = coalesce(new.email, ''),
         email_confirmed_at = new.email_confirmed_at
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email, email_confirmed_at on auth.users
  for each row execute function private.sync_user_email();

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.sync_user_email() from public, anon, authenticated;


-- ─────────────────────────────── the one way to change a status ───────────────────────────────

create function public.set_account_status(
  target     uuid,
  new_status public.account_status,
  note       text default null
)
returns public.profiles
language plpgsql security definer
set search_path = ''
as $$
declare
  me     uuid := (select auth.uid());
  result public.profiles;
begin
  if me is null or not private.is_admin() then
    raise exception 'Only an administrator can change account status.' using errcode = '42501';
  end if;
  if target = me then
    raise exception 'Administrators cannot change their own status.' using errcode = '42501';
  end if;
  if new_status = 'approved' and not exists (
    select 1 from public.profiles where id = target and email_confirmed_at is not null
  ) then
    raise exception 'This student has not confirmed their email address yet.' using errcode = '22023';
  end if;

  update public.profiles
     set status      = new_status,
         reviewed_at = now(),
         reviewed_by = me,
         review_note = case when new_status = 'rejected' then nullif(left(btrim(coalesce(note, '')), 500), '') end
   where id = target
  returning * into result;

  if not found then
    raise exception 'No account with that id.' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke all on function public.set_account_status(uuid, public.account_status, text) from public, anon;
grant execute on function public.set_account_status(uuid, public.account_status, text) to authenticated;


-- ─────────────────────────────────────────── content ───────────────────────────────────────────
-- Edited by you in the Supabase dashboard (which bypasses these rules). Readable by approved
-- students and admins; a row marked access = 'public' is readable by anyone.

create table public.specialties (
  id          text primary key check (id in ('medicine', 'surgery', 'obgyn', 'paediatrics')),
  description text not null default '',
  access      public.content_access not null default 'approved'
);

create table public.doctors (
  specialty_id text not null references public.specialties (id) on delete cascade,
  id           text not null check (id ~ '^[a-z0-9-]+$'),
  name         text not null,
  role         text,
  note         text,
  sort         integer not null default 0,
  access       public.content_access not null default 'approved',
  created_at   timestamptz not null default now(),
  primary key (specialty_id, id)
);

create table public.topics (
  specialty_id text not null references public.specialties (id) on delete cascade,
  id           text not null check (id ~ '^[a-z0-9-]+$'),
  name         text not null,
  description  text,
  sort         integer not null default 0,
  access       public.content_access not null default 'approved',
  created_at   timestamptz not null default now(),
  primary key (specialty_id, id)
);

create table public.questions (
  specialty_id     text not null references public.specialties (id) on delete cascade,
  id               text not null check (id ~ '^[a-z0-9-]+$'),
  title            text not null,
  type             text not null check (type in ('station', 'case', 'viva', 'procedure', 'other')),
  scenario         text,
  question         text,
  model_answer     text,
  history          text,
  examination      text,
  investigations   text,
  management       text,
  key_points       text[] not null default '{}',
  examiner_expects text[] not null default '{}',
  steps            text[] not null default '{}',
  minutes          integer check (minutes is null or minutes between 1 and 60),
  source           text,
  sort             integer not null default 0,
  access           public.content_access not null default 'approved',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (specialty_id, id)
);

create table public.question_doctors (
  specialty_id text not null,
  question_id  text not null,
  doctor_id    text not null,
  primary key (specialty_id, question_id, doctor_id),
  foreign key (specialty_id, question_id) references public.questions (specialty_id, id) on delete cascade,
  foreign key (specialty_id, doctor_id) references public.doctors (specialty_id, id) on delete cascade
);

create table public.question_topics (
  specialty_id text not null,
  question_id  text not null,
  topic_id     text not null,
  primary key (specialty_id, question_id, topic_id),
  foreign key (specialty_id, question_id) references public.questions (specialty_id, id) on delete cascade,
  foreign key (specialty_id, topic_id) references public.topics (specialty_id, id) on delete cascade
);


-- ───────────────────────────────────── each student's study record ─────────────────────────────────────

create table public.question_progress (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_key    text not null check (question_key ~ '^[a-z]+/[a-z0-9-]+$'),
  status          text not null default 'not-started'
                  check (status in ('not-started', 'in-progress', 'needs-revision', 'mastered')),
  bookmarked      boolean not null default false,
  note            text not null default '' check (char_length(note) <= 20000),
  note_updated_at timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (user_id, question_key)
);

create table public.recent_views (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question_key text not null check (question_key ~ '^[a-z]+/[a-z0-9-]+$'),
  viewed_at    timestamptz not null default now(),
  primary key (user_id, question_key)
);

create table public.study_sessions (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) <= 40),
  started_at timestamptz not null,
  last_at    timestamptz not null,
  viewed     text[] not null default '{}',
  changes    jsonb not null default '[]',
  primary key (user_id, id)
);

create table public.mock_results (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id       text not null check (char_length(id) <= 40),
  at       timestamptz not null,
  scope    text not null,
  stations jsonb not null default '[]',
  primary key (user_id, id)
);


-- ─────────────────────────────────────────── privileges ───────────────────────────────────────────
-- Start from nothing, then grant only what the rules below allow.

revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles, public.admins to authenticated;
grant select on public.specialties, public.doctors, public.topics, public.questions,
                public.question_doctors, public.question_topics to anon, authenticated;
grant select, insert, update, delete on public.question_progress, public.recent_views,
                public.study_sessions, public.mock_results to authenticated;


-- ─────────────────────────────────────── Row Level Security ───────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.admins            enable row level security;
alter table public.specialties       enable row level security;
alter table public.doctors           enable row level security;
alter table public.topics            enable row level security;
alter table public.questions         enable row level security;
alter table public.question_doctors  enable row level security;
alter table public.question_topics   enable row level security;
alter table public.question_progress enable row level security;
alter table public.recent_views      enable row level security;
alter table public.study_sessions    enable row level security;
alter table public.mock_results      enable row level security;

-- accounts: read your own row, admins read all. No insert/update/delete policies at all.
create policy "profiles: read own, admins read all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

create policy "admins: see whether you are one" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- content: public rows for anyone, the rest for approved students and admins
create policy "specialties: readable" on public.specialties
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());

create policy "doctors: readable" on public.doctors
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());

create policy "topics: readable" on public.topics
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());

create policy "questions: readable" on public.questions
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());

-- links are visible exactly when their question is (the subquery obeys the questions rule)
create policy "question_doctors: follow the question" on public.question_doctors
  for select to anon, authenticated
  using (exists (select 1 from public.questions q
                 where q.specialty_id = question_doctors.specialty_id and q.id = question_doctors.question_id));

create policy "question_topics: follow the question" on public.question_topics
  for select to anon, authenticated
  using (exists (select 1 from public.questions q
                 where q.specialty_id = question_topics.specialty_id and q.id = question_topics.question_id));

-- study data: your own rows, and only while approved
create policy "question_progress: own, approved" on public.question_progress
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "recent_views: own, approved" on public.recent_views
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "study_sessions: own, approved" on public.study_sessions
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "mock_results: own, approved" on public.mock_results
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());


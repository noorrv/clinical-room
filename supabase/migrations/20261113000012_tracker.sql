-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · the student's own tracker: topic marks, subject goals and study time
--
--  Adds, without deleting or renaming anything:
--    1. topic_marks: a student marks a topic as "studying" or "completed" by hand
--       (kept apart from the automatic progress worked out from their questions)
--    2. subject_goals: a target number of questions to complete in a subject, per week, per
--       month, or in total
--    3. study_days.seconds_studied: time from the study timer, added to the day it was spent
--
--  Same rule as the rest of the study record: own rows only, and only while approved.
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. topic marks ───────────────────────────

create table public.topic_marks (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  specialty_id text not null,
  topic_id     text not null,
  state        text not null check (state in ('studying', 'completed')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, specialty_id, topic_id),
  foreign key (specialty_id, topic_id) references public.topics (specialty_id, id) on delete cascade
);
comment on table public.topic_marks is 'A student''s own mark on a topic (studying or completed), separate from automatic progress.';


-- ─────────────────────────── 2. subject goals ───────────────────────────

create table public.subject_goals (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  specialty_id text not null,
  subject_id   text not null,
  target       integer not null check (target between 1 and 2000),
  period       text not null check (period in ('week', 'month', 'total')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, specialty_id, subject_id),
  foreign key (specialty_id, subject_id) references public.subjects (specialty_id, id) on delete cascade
);
comment on table public.subject_goals is 'How many questions a student aims to complete in a subject, per week, per month or in total.';


-- ─────────────────────────── 3. study time per day ───────────────────────────

alter table public.study_days
  add column seconds_studied integer not null default 0 check (seconds_studied between 0 and 86400);
comment on column public.study_days.seconds_studied is 'Time from the study timer spent on this day, in seconds.';


-- ─────────────────────────── rules ───────────────────────────

grant select, insert, update, delete on public.topic_marks, public.subject_goals to authenticated;
alter table public.topic_marks   enable row level security;
alter table public.subject_goals enable row level security;

create policy "topic_marks: own, approved" on public.topic_marks
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "subject_goals: own, approved" on public.subject_goals
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

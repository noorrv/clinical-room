-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · where each student stopped, in each list
--
--  Adds one table, without changing anything else:
--    study_position: one row per student per list they were reading (for now, a topic's
--    questions: scope 'topic:surgery/appendix'), with the question they were on, its place in
--    the list, the page, the filter in use and when. "Continue studying" reopens exactly there.
--
--  Same rule as the rest of the study record: own rows only, and only while approved.
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table public.study_position (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope        text not null check (scope ~ '^[a-z]+:[a-z]+/[a-z0-9-]+$' and char_length(scope) <= 120),
  specialty_id text not null references public.specialties (id) on delete cascade,
  topic_id     text,
  question_key text check (question_key is null or question_key ~ '^[a-z]+/[a-z0-9-]+$'),
  list_index   integer not null default 0 check (list_index between 0 and 5000),
  page         integer not null default 1 check (page between 1 and 1000),
  filter       text not null default 'all' check (filter in ('all', 'easy', 'moderate', 'difficult', 'bookmarked')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, scope),
  -- a topic that is removed takes its saved positions with it
  foreign key (specialty_id, topic_id) references public.topics (specialty_id, id) on delete cascade
);
comment on table public.study_position is 'Where each student stopped in each list (a topic''s questions), for Continue studying.';

create index study_position_recent_idx on public.study_position (user_id, updated_at desc);

grant select, insert, update, delete on public.study_position to authenticated;
alter table public.study_position enable row level security;

create policy "study_position: own, approved" on public.study_position
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

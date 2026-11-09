-- The Clinical Room · study streak: which questions each student worked on, per calendar day.
-- A day counts toward the streak when it holds 5 or more questions. Own rows only, approved only.

create table public.study_days (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day           date not null,
  question_keys text[] not null default '{}' check (cardinality(question_keys) <= 500),
  primary key (user_id, day)
);

grant select, insert, update, delete on public.study_days to authenticated;
alter table public.study_days enable row level security;

create policy "study_days: own, approved" on public.study_days
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

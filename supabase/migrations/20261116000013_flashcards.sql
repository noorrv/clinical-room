-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · flashcards: each student's own spaced-repetition schedule
--
--  A flashcard IS a question: nothing here copies a question or its answer. Cards point at the
--  existing questions table, so a question an admin publishes later is a new card for every
--  student, and a deleted question takes its cards and history with it.
--
--  Adds, without deleting or renaming anything:
--    1. flashcard_reviews: one row per student per question once they first rate it, with its
--       FSRS memory state (state, stability, difficulty, repetitions, lapses, interval, due date)
--    2. flashcard_review_logs: every rating, never edited (students may add and read their own)
--    3. flashcard_sessions: the student's one open study session, so it can be resumed
--
--  Same rule as the rest of the study record: own rows only, and only while approved.
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. the schedule ───────────────────────────

create table public.flashcard_reviews (
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  specialty_id     text not null,
  question_id      text not null,
  state            text not null check (state in ('learning', 'review', 'relearning')),
  stability        double precision not null check (stability >= 0),
  difficulty       double precision not null check (difficulty between 0 and 10),
  repetitions      integer not null default 0 check (repetitions >= 0),
  lapses           integer not null default 0 check (lapses >= 0),
  learning_steps   integer not null default 0 check (learning_steps >= 0),
  interval_days    double precision not null default 0 check (interval_days >= 0),
  next_review_at   timestamptz not null,
  last_reviewed_at timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, specialty_id, question_id),
  foreign key (specialty_id, question_id) references public.questions (specialty_id, id) on delete cascade
);
comment on table public.flashcard_reviews is 'Each student''s FSRS schedule for a question they have rated as a flashcard. No question content is copied.';

create index flashcard_reviews_due_idx on public.flashcard_reviews (user_id, next_review_at);


-- ─────────────────────────── 2. the history ───────────────────────────

create table public.flashcard_review_logs (
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id                text not null check (char_length(id) <= 40),
  specialty_id      text not null,
  question_id       text not null,
  rating            smallint not null check (rating between 1 and 4),  -- 1 again, 2 hard, 3 good, 4 easy
  reviewed_at       timestamptz not null,
  state_before      text not null check (state_before in ('new', 'learning', 'review', 'relearning')),
  previous_interval double precision not null default 0,                -- days
  next_interval     double precision not null default 0,                -- days
  retrievability    double precision check (retrievability is null or retrievability between 0 and 1),
  stability         double precision,
  difficulty        double precision,
  duration_ms       integer check (duration_ms is null or duration_ms between 0 and 86400000),
  primary key (user_id, id),
  foreign key (specialty_id, question_id) references public.questions (specialty_id, id) on delete cascade
);
comment on table public.flashcard_review_logs is 'Every flashcard rating a student has made. Added and read by the student, never edited.';

create index flashcard_review_logs_recent_idx on public.flashcard_review_logs (user_id, reviewed_at desc);


-- ─────────────────────────── 3. the open session ───────────────────────────

create table public.flashcard_sessions (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  session    jsonb not null check (pg_column_size(session) <= 200000),
  updated_at timestamptz not null default now()
);
comment on table public.flashcard_sessions is 'The student''s current flashcard session (filters, card order, position, what was rated or skipped), for resuming.';


-- ─────────────────────────── rules ───────────────────────────

grant select, insert, update, delete on public.flashcard_reviews, public.flashcard_sessions to authenticated;
grant select, insert on public.flashcard_review_logs to authenticated;

alter table public.flashcard_reviews     enable row level security;
alter table public.flashcard_review_logs enable row level security;
alter table public.flashcard_sessions    enable row level security;

create policy "flashcard_reviews: own, approved" on public.flashcard_reviews
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "flashcard_sessions: own, approved" on public.flashcard_sessions
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

-- the history: read and add your own; there is no update or delete rule, so it can't be rewritten
create policy "flashcard_review_logs: read own, approved" on public.flashcard_review_logs
  for select to authenticated
  using (user_id = (select auth.uid()) and private.is_approved());

create policy "flashcard_review_logs: add own, approved" on public.flashcard_review_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_approved());

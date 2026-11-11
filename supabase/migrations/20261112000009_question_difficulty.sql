-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · question difficulty
--
--  Adds one optional column, so topic pages can list questions from easy to hard:
--    questions.difficulty  1 = easy, 2 = medium, 3 = hard, empty = not rated (overviews, references)
--
--  Nothing else changes: no rows are touched, and the existing access rules on questions
--  (approved-only reading, admin-only writes, activity log) already cover the new column.
--  Run once in Supabase → SQL Editor. Then run supabase/seed/difficulty.sql.
-- ════════════════════════════════════════════════════════════════════════════════════════════

alter table public.questions
  add column difficulty smallint check (difficulty between 1 and 3);

comment on column public.questions.difficulty is 'How hard the question is: 1 easy, 2 medium, 3 hard; empty = not rated.';

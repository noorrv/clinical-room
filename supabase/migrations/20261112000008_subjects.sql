-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · subjects: the level between a specialty and its topics
--
--  Students now browse by subject (Surgery → Hepatobiliary system → Gallbladder) instead of by
--  doctor. Adds, without deleting or renaming anything:
--    1. subjects: a specialty's systems and areas, in board order
--    2. topics.subject_id: an optional link from a topic to its subject
--    3. the same rules as topics: approved-only reading (or public), admin-only writes, activity log
--
--  Questions, answers, doctors and every existing link between them are untouched.
--  Run once in Supabase → SQL Editor. Then run supabase/seed/subjects.sql.
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table public.subjects (
  specialty_id text not null references public.specialties (id) on delete restrict,
  id           text not null check (id ~ '^[a-z0-9-]+$'),
  name         text not null,
  description  text,
  sort         integer not null default 0,
  access       public.content_access not null default 'approved',
  created_at   timestamptz not null default now(),
  primary key (specialty_id, id)
);
comment on table public.subjects is 'A system or area within a specialty (e.g. Hepatobiliary system), shown as a node on the specialty''s board.';

alter table public.topics add column subject_id text;
alter table public.topics
  add constraint topics_subject_fkey foreign key (specialty_id, subject_id)
  references public.subjects (specialty_id, id) on delete set null (subject_id);
comment on column public.topics.subject_id is 'The subject this topic belongs to; empty = not yet filed.';

alter table public.subjects enable row level security;
grant select on public.subjects to anon, authenticated;
grant insert, update, delete on public.subjects to authenticated;

create policy "subjects: readable" on public.subjects
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());
create policy "subjects: admins add" on public.subjects for insert to authenticated with check (private.is_admin());
create policy "subjects: admins edit" on public.subjects for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "subjects: admins delete" on public.subjects for delete to authenticated using (private.is_admin());

create trigger log_activity after insert or update or delete on public.subjects for each row execute function private.log_activity();

-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · notifications
--
--  Adds, without deleting or renaming anything:
--    1. content_updates: one row each time something reaches students
--         • 'added'        a question is published for the first time (written by the database)
--         • 'updated'      an admin chose "Notify students about this change" when saving (with a note)
--         • 'announcement' an announcement is published (written by the database)
--    2. notification_reads: when each student last cleared their notifications
--    3. a one-time backfill so what is already published appears in the feed
--
--  Students only ever see rows for questions and announcements that are currently published.
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. the feed ───────────────────────────

create table public.content_updates (
  id              bigint generated always as identity primary key,
  at              timestamptz not null default now(),
  kind            text not null check (kind in ('added', 'updated', 'announcement')),
  specialty_id    text,
  question_id     text,
  announcement_id text,
  title           text not null check (char_length(title) <= 300),
  note            text check (char_length(note) <= 280),
  -- a removed question takes its notifications with it
  foreign key (specialty_id, question_id) references public.questions (specialty_id, id) on delete cascade
);
create index content_updates_at_idx on public.content_updates (at desc);

alter table public.content_updates enable row level security;
grant select, insert on public.content_updates to authenticated;

create policy "content_updates: approved students read what is published" on public.content_updates
  for select to authenticated
  using (
    private.is_admin()
    or (
      private.is_approved()
      and (
        (question_id is not null and exists (
          select 1 from public.questions q
          where q.specialty_id = content_updates.specialty_id and q.id = content_updates.question_id and q.status = 'published'))
        or (announcement_id is not null and exists (
          select 1 from public.announcements a
          where a.id::text = content_updates.announcement_id and a.published))
      )
    )
  );

-- the editor's "Notify students about this change" writes an 'updated' row; only admins may
create policy "content_updates: admins add" on public.content_updates
  for insert to authenticated
  with check (private.is_admin() and kind = 'updated');


-- written by the database when a question is first published or an announcement goes live
create function private.note_content_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'questions' then
    if new.status = 'published'
       and (tg_op = 'INSERT' or old.status is distinct from 'published')
       and not exists (select 1 from public.content_updates u
                       where u.kind = 'added' and u.specialty_id = new.specialty_id and u.question_id = new.id) then
      insert into public.content_updates (kind, specialty_id, question_id, title)
      values ('added', new.specialty_id, new.id, left(new.title, 300));
    end if;
  elsif tg_table_name = 'announcements' then
    if new.published
       and (tg_op = 'INSERT' or not old.published)
       and not exists (select 1 from public.content_updates u
                       where u.kind = 'announcement' and u.announcement_id = new.id::text) then
      insert into public.content_updates (kind, announcement_id, title)
      values ('announcement', new.id::text, left(new.title, 300));
    end if;
  end if;
  return null;
end;
$$;
revoke all on function private.note_content_update() from public, anon, authenticated;

create trigger note_content_update after insert or update of status on public.questions
  for each row execute function private.note_content_update();
create trigger note_content_update after insert or update of published on public.announcements
  for each row execute function private.note_content_update();


-- ─────────────────────────── 2. read state ───────────────────────────

create table public.notification_reads (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);

alter table public.notification_reads enable row level security;
grant select, insert, update on public.notification_reads to authenticated;

create policy "notification_reads: own, approved" on public.notification_reads
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());


-- ─────────────────────────── 3. backfill what is already published ───────────────────────────
-- Publishing touches updated_at, so it stands in for the publish time.

insert into public.content_updates (at, kind, specialty_id, question_id, title)
select coalesce(q.updated_at, q.created_at), 'added', q.specialty_id, q.id, left(q.title, 300)
from public.questions q
where q.status = 'published';

insert into public.content_updates (at, kind, announcement_id, title)
select a.created_at, 'announcement', a.id::text, left(a.title, 300)
from public.announcements a
where a.published;

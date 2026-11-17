-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · flashcard reminders by browser push
--
--  Adds, without deleting or renaming anything:
--    1. push_subscriptions: each browser a student allowed to receive reminders (the address the
--       browser's push service gave it, and its two public encryption keys)
--    2. reminder_prefs: whether reminders are on, the daily time in the student's own timezone,
--       quiet hours, and which reminders (cards due, a daily nudge)
--    3. reminder_log: which reminders were sent, so nobody gets the same one twice in a day
--
--  The reminders are sent by the send-reminders Edge Function, run every 15 minutes by pg_cron
--  (see the setup steps). It uses the service-role key, which lives only in Supabase.
--  Students may manage their own subscriptions and settings while approved, and read their log.
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table public.push_subscriptions (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 300),
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  primary key (user_id, endpoint)
);
comment on table public.push_subscriptions is 'Browsers a student allowed to receive flashcard reminders.';

create table public.reminder_prefs (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  enabled        boolean not null default false,
  daily_time     time not null default '19:00',
  timezone       text not null default 'UTC' check (char_length(timezone) <= 64),
  quiet_start    time,                     -- no reminders from here …
  quiet_end      time,                     -- … until here (may cross midnight)
  due_reminders  boolean not null default true,   -- "You have N flashcards due"
  daily_reminder boolean not null default false,  -- a nudge even when nothing is due
  min_due        integer not null default 1 check (min_due between 1 and 500),
  updated_at     timestamptz not null default now()
);
comment on table public.reminder_prefs is 'A student''s reminder settings, in their own timezone.';

create table public.reminder_log (
  user_id   uuid not null references auth.users (id) on delete cascade,
  sent_on   date not null,          -- the student's local date
  sent_at   timestamptz not null default now(),
  due_count integer not null default 0,
  delivered integer not null default 0,
  primary key (user_id, sent_on)
);
comment on table public.reminder_log is 'One row per reminder day per student, written by the send-reminders function.';

create index reminder_prefs_enabled_idx on public.reminder_prefs (enabled) where enabled;

grant select, insert, update, delete on public.push_subscriptions, public.reminder_prefs to authenticated;
grant select on public.reminder_log to authenticated;

alter table public.push_subscriptions enable row level security;
alter table public.reminder_prefs     enable row level security;
alter table public.reminder_log       enable row level security;

create policy "push_subscriptions: own, approved" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

create policy "reminder_prefs: own, approved" on public.reminder_prefs
  for all to authenticated
  using (user_id = (select auth.uid()) and private.is_approved())
  with check (user_id = (select auth.uid()) and private.is_approved());

-- the log is written only by the function (service role); students may read their own
create policy "reminder_log: read own" on public.reminder_log
  for select to authenticated
  using (user_id = (select auth.uid()));

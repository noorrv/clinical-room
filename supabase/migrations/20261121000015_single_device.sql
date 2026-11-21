-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · one device per account
--
--  Adds one table and two functions. Nothing existing is changed or deleted.
--    active_sessions   one row per student: the id of the device that signed in last
--    claim_device(t)   called when a device signs in: it becomes the active device
--    device_ok(t)      true while that device is still the active one (or no device is recorded yet)
--  The site signs a device out when device_ok returns false. Admin accounts are exempt in the app.
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table public.active_sessions (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  device_token text not null,
  updated_at   timestamptz not null default now()
);
comment on table public.active_sessions is 'The device that signed in last, per student. Older devices are signed out by the app.';

alter table public.active_sessions enable row level security;
grant select on public.active_sessions to authenticated;

-- a student may read only their own row (this also lets the realtime update reach them); writes go through claim_device
create policy "active_sessions: read own" on public.active_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create function public.claim_device(p_token text)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.active_sessions (user_id, device_token, updated_at)
  values ((select auth.uid()), p_token, now())
  on conflict (user_id) do update set device_token = excluded.device_token, updated_at = now();
$$;

create function public.device_ok(p_token text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select s.device_token = p_token from public.active_sessions s where s.user_id = (select auth.uid())),
    true
  );
$$;

revoke all on function public.claim_device(text) from public, anon;
revoke all on function public.device_ok(text) from public, anon;
grant execute on function public.claim_device(text) to authenticated;
grant execute on function public.device_ok(text) to authenticated;

-- lets the site hear about a new sign-in at once instead of waiting for the next check
alter publication supabase_realtime add table public.active_sessions;

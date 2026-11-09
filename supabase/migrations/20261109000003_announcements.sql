-- The Clinical Room · notices for the homepage gazette.
-- Written by you in Table Editor. Notices are public by default (everyone sees them);
-- set access = 'approved' for one only signed-in, approved students should see.

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  body       text check (body is null or char_length(body) <= 400),
  pinned     boolean not null default false,
  access     public.content_access not null default 'public',
  created_at timestamptz not null default now()
);
create index announcements_order_idx on public.announcements (pinned desc, created_at desc);

grant select on public.announcements to anon, authenticated;
alter table public.announcements enable row level security;

create policy "announcements: readable" on public.announcements
  for select to anon, authenticated
  using (access = 'public' or private.is_approved() or private.is_admin());

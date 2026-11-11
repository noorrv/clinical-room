-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · clinical approaches and practice cases
--
--  Adds, without deleting or renaming anything:
--    1. approaches: a written clinical approach (study-sheet markup), one per presenting complaint
--    2. cases: a playable case belonging to an approach, stored whole as JSON for the case game
--    3. the same rules as questions: Draft / Published, access = 'approved' or 'public',
--       admin-only writes, updated_at kept honest, changes in the admin activity log,
--       and a specialty can't be deleted while it holds approaches
--
--  Run once in Supabase → SQL Editor, after the earlier migrations.
--  Then run supabase/seed/approach-jaundice.sql to add the jaundice approach and its first case.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. tables ───────────────────────────

create table public.approaches (
  specialty_id text not null references public.specialties (id) on delete restrict,
  id           text not null check (id ~ '^[a-z0-9-]+$'),
  title        text not null,
  summary      text not null default '',
  sheet        text not null default '',
  sort         integer not null default 0,
  access       public.content_access not null default 'approved',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (specialty_id, id)
);
comment on table public.approaches is 'A clinical approach to a presenting complaint; sheet is study-sheet markup, read like a recorded answer.';
comment on column public.approaches.status is 'draft: only admins see it; published: visible according to access.';

create table public.cases (
  specialty_id text not null,
  id           text not null check (id ~ '^[a-z0-9-]+$'),
  approach_id  text not null,
  number       text not null default '',
  title        text not null,
  data         jsonb not null check (jsonb_typeof(data) = 'object'),
  sort         integer not null default 0,
  access       public.content_access not null default 'approved',
  status       text not null default 'draft' check (status in ('draft', 'published')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (specialty_id, id),
  foreign key (specialty_id, approach_id) references public.approaches (specialty_id, id) on delete cascade
);
comment on table public.cases is 'A playable case for the case game. data holds the patient, choices, results, checkpoints and scoring, in the shape the game reads.';
comment on column public.cases.status is 'draft: only admins see it; published: visible according to access.';

create index cases_approach_idx on public.cases (specialty_id, approach_id);


-- ─────────────────────────── 2. who can read and write ───────────────────────────

alter table public.approaches enable row level security;
alter table public.cases      enable row level security;

grant select on public.approaches, public.cases to anon, authenticated;
-- writes are granted but every one is checked by an admin-only rule below
grant insert, update, delete on public.approaches, public.cases to authenticated;

create policy "approaches: readable" on public.approaches
  for select to anon, authenticated
  using ((status = 'published' and (access = 'public' or private.is_approved())) or private.is_admin());

-- a case is readable only while its approach is readable too
create policy "cases: readable" on public.cases
  for select to anon, authenticated
  using (
    private.is_admin()
    or (
      status = 'published'
      and (access = 'public' or private.is_approved())
      and exists (
        select 1 from public.approaches a
         where a.specialty_id = cases.specialty_id and a.id = cases.approach_id
           and a.status = 'published' and (a.access = 'public' or private.is_approved())
      )
    )
  );

do $$
declare t text;
begin
  foreach t in array array['approaches', 'cases'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_admin())', t || ': admins add', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())', t || ': admins edit', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_admin())', t || ': admins delete', t);
  end loop;
end $$;


-- ─────────────────────────── 3. updated_at and the activity log ───────────────────────────

create trigger approaches_touch_updated_at before update on public.approaches for each row execute function private.touch_updated_at();
create trigger cases_touch_updated_at      before update on public.cases      for each row execute function private.touch_updated_at();

-- the log already records questions being published; approaches and cases now count the same way
create or replace function private.log_activity()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  r     jsonb;
  o     jsonb;
  act   text;
  label text;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then o := to_jsonb(old); end if;

  label := coalesce(r ->> 'title', r ->> 'name', r ->> 'full_name', r ->> 'id');

  if tg_op = 'INSERT' then
    act := 'created';
  elsif tg_op = 'DELETE' then
    act := 'deleted';
  elsif tg_table_name in ('questions', 'approaches', 'cases') and (o ->> 'status') is distinct from (r ->> 'status') then
    act := case when r ->> 'status' = 'published' then 'published' else 'unpublished' end;
  elsif tg_table_name = 'announcements' and (o ->> 'published') is distinct from (r ->> 'published') then
    act := case when (r ->> 'published')::boolean then 'published' else 'unpublished' end;
  elsif tg_table_name = 'profiles' then
    if (o ->> 'status') is not distinct from (r ->> 'status') then
      return null;
    end if;
    act := 'status';
    label := label || ' → ' || (r ->> 'status');
  else
    act := 'updated';
  end if;

  insert into public.admin_activity (actor, action, entity, entity_key, summary)
  values ((select auth.uid()), act, tg_table_name,
          concat_ws('/', r ->> 'specialty_id', coalesce(r ->> 'id', r ->> 'user_id')),
          left(label, 200));
  return null;
end;
$$;
revoke all on function private.log_activity() from public, anon, authenticated;

create trigger log_activity after insert or update or delete on public.approaches for each row execute function private.log_activity();
create trigger log_activity after insert or update or delete on public.cases      for each row execute function private.log_activity();

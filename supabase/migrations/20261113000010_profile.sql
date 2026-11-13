-- ════════════════════════════════════════════════════════════════════════════════════════════
--  The Clinical Room · student profile: picture and name
--
--  Adds, without deleting or renaming anything:
--    1. profiles.avatar_kind / avatar_preset / avatar_path: an illustrated avatar or an uploaded photo
--    2. update_my_profile(): the only way a student edits their own profile, and only these columns
--       (status, email and review fields stay out of reach; profiles still has no update rule)
--    3. a private Storage bucket "avatars": each student may only touch files in their own folder
--       ({user id}/avatar.webp), and only while approved; admins may read them
--
--  Run once in Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────── 1. picture columns ───────────────────────────

alter table public.profiles
  add column avatar_kind   text check (avatar_kind in ('preset', 'upload')),
  add column avatar_preset text check (avatar_preset is null or avatar_preset ~ '^[a-z0-9-]{1,40}$'),
  add column avatar_path   text check (avatar_path is null or char_length(avatar_path) <= 200);

comment on column public.profiles.avatar_kind is 'preset: one of the site''s illustrated avatars; upload: a photo in the avatars bucket; empty: the default avatar.';


-- ─────────────────────────── 2. editing your own profile ───────────────────────────

create function public.update_my_profile(
  new_full_name     text,
  new_avatar_kind   text,
  new_avatar_preset text,
  new_avatar_path   text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not (private.is_approved() or private.is_admin()) then
    raise exception 'Your account must be approved to edit your profile';
  end if;
  if new_full_name is null or char_length(btrim(new_full_name)) not between 2 and 100 then
    raise exception 'Your name must be between 2 and 100 characters';
  end if;
  if new_avatar_kind is not null and new_avatar_kind not in ('preset', 'upload') then
    raise exception 'Unknown picture type';
  end if;
  -- an uploaded photo must live in the student's own folder
  if new_avatar_kind = 'upload' and (new_avatar_path is null or split_part(new_avatar_path, '/', 1) <> me::text) then
    raise exception 'That photo is not in your folder';
  end if;

  update public.profiles
     set full_name     = btrim(new_full_name),
         avatar_kind   = new_avatar_kind,
         avatar_preset = case when new_avatar_kind = 'preset' then new_avatar_preset end,
         avatar_path   = case when new_avatar_kind = 'upload' then new_avatar_path end
   where id = me;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;


-- ─────────────────────────── 3. the avatars bucket ───────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "avatars: read own, admins read all" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin()));

create policy "avatars: add to own folder, approved" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (private.is_approved() or private.is_admin()));

create policy "avatars: replace own, approved" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (private.is_approved() or private.is_admin()))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (private.is_approved() or private.is_admin()));

create policy "avatars: remove own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

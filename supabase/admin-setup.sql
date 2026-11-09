-- ════════════════════════════════════════════════════════════════════════════════════════════
--  Make yourself the administrator (run once, in Supabase → SQL Editor).
--
--  1. Register on the website with your own email address and click the confirmation link.
--  2. Replace YOUR-EMAIL@example.com below (3 places) with that address.
--  3. Run this script. It adds you to the admins list and approves your own account.
--
--  This can only be done here, in the dashboard: the website has no way to create admins.
-- ════════════════════════════════════════════════════════════════════════════════════════════

insert into public.admins (user_id)
select id from auth.users where email = 'YOUR-EMAIL@example.com'
on conflict (user_id) do nothing;

update public.profiles
   set status = 'approved', reviewed_at = now()
 where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');

select p.full_name, p.email, p.status, (a.user_id is not null) as is_admin
  from public.profiles p
  left join public.admins a on a.user_id = p.id
 where p.email = 'YOUR-EMAIL@example.com';

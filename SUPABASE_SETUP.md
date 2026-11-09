# Switching on accounts (Supabase setup)

The website code is ready. These steps happen in your Supabase dashboard and take about 15 minutes.
Do them in order.

## 1. Add your keys to the project

1. In Supabase, open **Project Settings → API** (or **API Keys**).
2. In the project folder, copy `.env.example` to a new file named `.env.local`.
3. Fill in:
   - `VITE_SUPABASE_URL`: the **Project URL**
   - `VITE_SUPABASE_ANON_KEY`: the **anon public** key (or the **publishable** key)
4. Restart `npm run dev`.

**Never** use the `service_role` or secret key. The site refuses to start if one is pasted in.
`.env.local` is ignored by git, so it never gets committed.

## 2. Auth settings

In **Authentication → Sign In / Providers → Email**:

- **Enable Email provider**: on
- **Confirm email**: on
- **Minimum password length**: 8

In **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` for now (your real address once the site is online)
- **Redirect URLs**: add `http://localhost:5173/**` (and later `https://your-domain/**`)

## 3. Create the database

In **SQL Editor**, open a new query, paste each file's contents, and run them in this order:

1. `supabase/migrations/20261109000001_accounts_and_approval.sql`: accounts, approval, content and study tables, and all security rules
2. `supabase/migrations/20261109000002_seed_specialties_and_doctors.sql`: the four specialties and the 34 doctors

Each one should finish with "Success. No rows returned".

## 4. Make yourself the administrator

1. Open the site, choose **Create an account**, register with your own email, and click the confirmation link in the email.
2. In **SQL Editor**, open `supabase/admin-setup.sql`, replace `YOUR-EMAIL@example.com` (3 places) with your email, and run it.
3. The result should show your name with `status = approved` and `is_admin = true`.
4. Sign in on the site. The account menu (the avatar, top right) now has **Registrations (admin)**.

## 5. Check the security (recommended)

1. Register two more test accounts and confirm both emails.
2. In the admin area, approve one of them and leave the other pending.
3. In **SQL Editor**, open `supabase/tests/security_checks.sql`, put the three emails at the top, and run it.
4. Every row of the result should say `ok = true`. If any says `false`, stop and ask before going further.

## How it works

- **New registrations** are always created as **pending** by the database itself. Nothing a visitor sends can change that.
- **Pending and rejected accounts** can sign in but only see their status screen. The database returns no questions, doctors, notes or progress to them, even if they bypass the website.
- **Approving, rejecting, revoking and restoring** go through one database function that checks you're an admin and refuses changes to your own account.
- **Admins** can only be added in the SQL Editor (step 4), never from the website.
- **Students' progress, bookmarks and notes** are saved to their account. Anything a student had saved in their browser before accounts existed is moved into their account the first time they sign in after approval.
- **Content** (doctors, topics, questions) is edited in **Table Editor**. See `src/content/README.md` for the columns.

# Flashcard reminders: setup

The reminders are sent by this Edge Function, run every 15 minutes by `pg_cron`. Nothing is
scheduled in the browser. Do these once, in order, in the Supabase dashboard.

1. **Run the migration** `supabase/migrations/20261117000014_push_reminders.sql` in the SQL Editor.
2. **Switch on the extensions:** Database → Extensions → enable `pg_cron` and `pg_net`.
3. **Add the secrets:** Edge Functions → Secrets → add each line of the local file
   `supabase/functions/.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
   `CRON_SECRET`). Set `VAPID_SUBJECT` to a contact address, written `mailto:you@…`.
   That file is git-ignored: never commit it, and never put the private key in the website.
4. **Deploy the function:** Edge Functions → Deploy a new function → name it
   `send-reminders` → paste `index.ts` → turn **off** "Enforce JWT verification" (the schedule
   proves itself with `CRON_SECRET` instead) → Deploy.
5. **Schedule it:** run the local file `supabase/seed/push-cron.sql` in the SQL Editor
   (git-ignored, as it holds `CRON_SECRET`).

To check: Integrations → Cron → `send-flashcard-reminders` shows a run every 15 minutes, and
Edge Functions → send-reminders → Logs shows answers like `{"checked":1,"sent":0,…}`.

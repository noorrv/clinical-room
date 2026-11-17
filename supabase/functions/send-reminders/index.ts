// The Clinical Room · send-reminders (Supabase Edge Function, Deno)
//
// Run every 15 minutes by pg_cron. For each approved student with reminders on, it checks the
// time where they are: once their daily reminder time has come (and they are not in their quiet
// hours), it counts their due flashcards and sends one push notification for the day to every
// browser they allowed. Nothing is scheduled in the browser, so reminders arrive with the site
// closed.
//
// Secrets (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (a mailto: or https: contact), CRON_SECRET. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. The service-role key never leaves here.

import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';

const SITE = 'https://clinical-room.vercel.app';
const CATCH_UP_MINUTES = 180; // a missed run still sends, but never hours late

interface Prefs {
  user_id: string;
  daily_time: string;
  timezone: string;
  quiet_start: string | null;
  quiet_end: string | null;
  due_reminders: boolean;
  daily_reminder: boolean;
  min_due: number;
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** The student's local date (YYYY-MM-DD) and minutes past midnight, in their timezone. */
function localNow(tz: string, now: Date): { date: string; mins: number } {
  let zone = tz;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, mins: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Inside the quiet hours (which may run past midnight). */
function quiet(p: Prefs, mins: number): boolean {
  if (!p.quiet_start || !p.quiet_end) return false;
  const a = minutes(p.quiet_start);
  const b = minutes(p.quiet_end);
  if (a === b) return false;
  return a < b ? mins >= a && mins < b : mins >= a || mins < b;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Not allowed', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const now = new Date();
  const summary = { checked: 0, sent: 0, delivered: 0, removed: 0, skipped: 0 };

  const { data: prefs, error } = await db.from('reminder_prefs').select('user_id, daily_time, timezone, quiet_start, quiet_end, due_reminders, daily_reminder, min_due').eq('enabled', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!prefs?.length) return Response.json(summary);

  // only approved students (the approval system decides, as everywhere else)
  const { data: ok } = await db.from('profiles').select('id').eq('status', 'approved').in('id', prefs.map((p) => p.user_id));
  const approved = new Set((ok ?? []).map((r) => r.id));

  for (const p of prefs as Prefs[]) {
    summary.checked++;
    if (!approved.has(p.user_id)) continue;
    const { date, mins } = localNow(p.timezone, now);
    const since = mins - minutes(p.daily_time);
    if (since < 0 || since > CATCH_UP_MINUTES || quiet(p, mins)) {
      summary.skipped++;
      continue;
    }

    const { count: due } = await db
      .from('flashcard_reviews')
      .select('question_id', { count: 'exact', head: true })
      .eq('user_id', p.user_id)
      .lte('next_review_at', now.toISOString());
    const n = due ?? 0;

    let title = '';
    let body = '';
    if (p.due_reminders && n >= p.min_due) {
      title = n === 1 ? '1 flashcard is due' : `${n} flashcards are due`;
      body = 'A few minutes now keeps them fresh. Open The Clinical Room to review them.';
    } else if (p.daily_reminder) {
      title = 'Time for today’s study';
      body = n ? `${n} ${n === 1 ? 'card is' : 'cards are'} due, and new cards are waiting.` : 'New cards are waiting in your flashcards.';
    } else {
      summary.skipped++;
      continue; // nothing to say yet; a later run may find cards due
    }

    // claim today's reminder first, so two overlapping runs can't both send it
    const { error: claim } = await db.from('reminder_log').insert({ user_id: p.user_id, sent_on: date, due_count: n });
    if (claim) {
      summary.skipped++;
      continue;
    }

    const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', p.user_id);
    let delivered = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url: `${SITE}/flashcards?status=due`, tag: 'flashcards-due' }),
          { TTL: 6 * 3600, urgency: 'normal' },
        );
        delivered++;
        await db.from('push_subscriptions').update({ last_ok_at: now.toISOString() }).eq('endpoint', s.endpoint);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // the browser unsubscribed or the address expired: forget it
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          summary.removed++;
        }
      }
    }
    await db.from('reminder_log').update({ delivered }).eq('user_id', p.user_id).eq('sent_on', date);
    summary.sent++;
    summary.delivered += delivered;
  }

  return Response.json(summary);
});

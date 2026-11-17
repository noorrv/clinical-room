import { supabase } from '../lib/supabase';
import { VAPID_PUBLIC_KEY } from './config';

/*
  Browser push for flashcard reminders: what this browser can do, and turning reminders on and
  off. Permission is asked for only from the reminders panel, after the student presses Enable.
  The reminders themselves are sent by the send-reminders function on Supabase's servers.
*/

export type PushSupport =
  | 'ok'
  | 'unsupported' // no service workers or push in this browser
  | 'ios-install' // iPhone or iPad Safari: works only from the Home Screen
  | 'insecure'; // not https (or localhost)

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'ok';
}

export const permission = (): NotificationPermission | 'unsupported' => ('Notification' in window ? Notification.permission : 'unsupported');

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

/** This browser's current subscription, if it has one. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Asks for permission (the student pressed Enable), subscribes this browser and saves it. */
export async function enablePush(): Promise<'on' | 'denied' | 'failed'> {
  const asked = await Notification.requestPermission();
  if (asked !== 'granted') return 'denied';
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) as BufferSource }));
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 300) }, { onConflict: 'endpoint' });
    if (error) throw error;
    return 'on';
  } catch {
    return 'failed';
  }
}

/** Stops reminders on this browser and forgets its subscription. */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Shows a sample reminder straight away, through the service worker, to check it works. */
export async function showSample(due: number): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg || Notification.permission !== 'granted') return false;
  await reg.showNotification(due ? `${due} flashcards are due` : 'Reminders are on', {
    body: due ? 'This is how your reminder will look.' : 'You’ll hear from The Clinical Room when cards are due.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: 'flashcards-sample',
    data: { url: '/flashcards?status=due' },
  });
  return true;
}

/* ───────────────────────── settings ───────────────────────── */

export interface ReminderPrefs {
  enabled: boolean;
  daily_time: string; // "19:00"
  timezone: string;
  quiet_start: string | null;
  quiet_end: string | null;
  due_reminders: boolean;
  daily_reminder: boolean;
  min_due: number;
}

export const DEFAULT_PREFS: ReminderPrefs = {
  enabled: false,
  daily_time: '19:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  quiet_start: '22:00',
  quiet_end: '07:00',
  due_reminders: true,
  daily_reminder: false,
  min_due: 1,
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export async function loadPrefs(): Promise<ReminderPrefs | null> {
  const { data, error } = await supabase.from('reminder_prefs').select('enabled, daily_time, timezone, quiet_start, quiet_end, due_reminders, daily_reminder, min_due').maybeSingle();
  if (error) throw error;
  return data ? { ...data, daily_time: hhmm(data.daily_time)!, quiet_start: hhmm(data.quiet_start), quiet_end: hhmm(data.quiet_end) } : null;
}

export async function savePrefs(p: ReminderPrefs): Promise<void> {
  const { error } = await supabase.from('reminder_prefs').upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

import { useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { leaveGuest, useGuestFlag } from '../auth/guest';
import { contentLoadedFor, setRemoteContent } from '../content';
import { supabase } from '../lib/supabase';
import {
  currentState,
  dirty,
  EMPTY,
  LEGACY_KEY,
  loadFrom,
  onReset,
  switchRecord,
  switchToGuestRecord,
  type MockResult,
  type QuestionRecord,
  type Session,
  type Status,
  type StudyState,
} from './store';

/*
  Keeps the study record in step with Supabase for the signed-in, approved student.
  The database only accepts each student's own rows, and only while they are approved.
*/

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string | null) => (s ? Date.parse(s) : 0);

let attached: string | null = null;
let timer: number | undefined;
let flushing = false;

/* ── merging two copies of a record: the newer side wins, nothing is lost ── */

function merge(local: StudyState, other: StudyState, markLocalWins: boolean): StudyState {
  const questions = { ...other.questions };
  for (const [k, q] of Object.entries(local.questions)) {
    const o = other.questions[k];
    if (!o || q.updatedAt > o.updatedAt) {
      questions[k] = q;
      if (markLocalWins) dirty.questions.add(k);
    }
  }

  const recentMap = new Map(other.recent.map((r) => [r.key, r.at]));
  for (const r of local.recent) {
    if ((recentMap.get(r.key) ?? 0) < r.at) {
      recentMap.set(r.key, r.at);
      if (markLocalWins) dirty.recent.add(r.key);
    }
  }
  const recent = [...recentMap].map(([key, at]) => ({ key, at })).sort((a, b) => b.at - a.at).slice(0, 40);

  const sessionMap = new Map(other.sessions.map((s) => [s.id, s]));
  for (const s of local.sessions) {
    const o = sessionMap.get(s.id);
    if (!o || s.lastAt > o.lastAt) {
      sessionMap.set(s.id, s);
      if (markLocalWins) dirty.sessions.add(s.id);
    }
  }
  const sessions = [...sessionMap.values()].sort((a, b) => a.startedAt - b.startedAt).slice(-60);

  const mockMap = new Map(other.mocks.map((m) => [m.id, m]));
  for (const m of local.mocks) {
    if (!mockMap.has(m.id)) {
      mockMap.set(m.id, m);
      if (markLocalWins) dirty.mocks.add(m.id);
    }
  }
  const mocks = [...mockMap.values()].sort((a, b) => b.at - a.at).slice(0, 50);

  return { version: 1, questions, recent, sessions, mocks };
}

/* ── reading the server copy ── */

async function pull(): Promise<StudyState> {
  const [qp, rv, ss, mr] = await Promise.all([
    supabase.from('question_progress').select('question_key, status, bookmarked, note, note_updated_at, updated_at'),
    supabase.from('recent_views').select('question_key, viewed_at').order('viewed_at', { ascending: false }).limit(40),
    supabase.from('study_sessions').select('id, started_at, last_at, viewed, changes').order('started_at', { ascending: false }).limit(60),
    supabase.from('mock_results').select('id, at, scope, stations').order('at', { ascending: false }).limit(50),
  ]);
  const failed = [qp, rv, ss, mr].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const questions: Record<string, QuestionRecord> = {};
  for (const r of qp.data ?? []) {
    questions[r.question_key] = {
      status: r.status as Status,
      bookmarked: r.bookmarked,
      note: r.note,
      updatedAt: ms(r.updated_at),
      ...(r.note_updated_at ? { noteUpdatedAt: ms(r.note_updated_at) } : {}),
    };
  }
  return {
    version: 1,
    questions,
    recent: (rv.data ?? []).map((r) => ({ key: r.question_key, at: ms(r.viewed_at) })),
    sessions: (ss.data ?? []).map(
      (r): Session => ({ id: r.id, startedAt: ms(r.started_at), lastAt: ms(r.last_at), viewed: r.viewed ?? [], changes: r.changes ?? [] }),
    ),
    mocks: (mr.data ?? []).map((r): MockResult => ({ id: r.id, at: ms(r.at), scope: r.scope, stations: r.stations ?? [] })),
  };
}

/* ── saving what changed ── */

function scheduleFlush(delay = 800) {
  window.clearTimeout(timer);
  timer = window.setTimeout(flush, delay);
}

async function flush() {
  if (!attached || flushing) return;
  const s = currentState();
  const take = <T,>(set: Set<string>) => {
    const keys = [...set];
    set.clear();
    return keys as T[];
  };
  const qKeys = take<string>(dirty.questions);
  const rKeys = take<string>(dirty.recent);
  const sIds = take<string>(dirty.sessions);
  const mIds = take<string>(dirty.mocks);
  if (!qKeys.length && !rKeys.length && !sIds.length && !mIds.length) return;

  flushing = true;
  const user = attached;
  const jobs: Array<PromiseLike<{ error: unknown }>> = [];

  const qRows = qKeys.flatMap((k) => {
    const q = s.questions[k];
    return q
      ? [{ question_key: k, status: q.status, bookmarked: q.bookmarked, note: q.note, note_updated_at: q.noteUpdatedAt ? iso(q.noteUpdatedAt) : null, updated_at: iso(q.updatedAt || Date.now()) }]
      : [];
  });
  if (qRows.length) jobs.push(supabase.from('question_progress').upsert(qRows, { onConflict: 'user_id,question_key' }));

  const rRows = rKeys.flatMap((k) => {
    const r = s.recent.find((x) => x.key === k);
    return r ? [{ question_key: k, viewed_at: iso(r.at) }] : [];
  });
  if (rRows.length) jobs.push(supabase.from('recent_views').upsert(rRows, { onConflict: 'user_id,question_key' }));

  const sRows = sIds.flatMap((id) => {
    const x = s.sessions.find((y) => y.id === id);
    return x ? [{ id, started_at: iso(x.startedAt), last_at: iso(x.lastAt), viewed: x.viewed, changes: x.changes }] : [];
  });
  if (sRows.length) jobs.push(supabase.from('study_sessions').upsert(sRows, { onConflict: 'user_id,id' }));

  const mRows = mIds.flatMap((id) => {
    const m = s.mocks.find((y) => y.id === id);
    return m ? [{ id, at: iso(m.at), scope: m.scope, stations: m.stations }] : [];
  });
  if (mRows.length) jobs.push(supabase.from('mock_results').upsert(mRows, { onConflict: 'user_id,id' }));

  const results = await Promise.all(jobs);
  flushing = false;
  if (results.some((r) => r.error) && attached === user) {
    // keep the changes and try again shortly (offline, or the session was refreshing)
    qKeys.forEach((k) => dirty.questions.add(k));
    rKeys.forEach((k) => dirty.recent.add(k));
    sIds.forEach((k) => dirty.sessions.add(k));
    mIds.forEach((k) => dirty.mocks.add(k));
    scheduleFlush(10_000);
  } else if (dirty.questions.size || dirty.recent.size || dirty.sessions.size || dirty.mocks.size) {
    scheduleFlush();
  }
}

async function clearServerCopy() {
  if (!attached) return;
  const u = attached;
  dirty.questions.clear();
  dirty.recent.clear();
  dirty.sessions.clear();
  dirty.mocks.clear();
  await Promise.all(
    ['question_progress', 'recent_views', 'study_sessions', 'mock_results'].map((t) => supabase.from(t).delete().eq('user_id', u)),
  );
}

/* ── attaching an account ── */

async function attach(userId: string) {
  if (attached === userId) return;
  attached = userId;

  // this account's copy in this browser, plus anything saved here before accounts existed
  let local = loadFrom(`${LEGACY_KEY}:${userId}`);
  const legacy = loadFrom(LEGACY_KEY);
  const hadLegacy = Object.keys(legacy.questions).length + legacy.recent.length + legacy.sessions.length + legacy.mocks.length > 0;
  if (hadLegacy) local = merge(legacy, local, false);
  switchRecord(userId, local, () => scheduleFlush());
  onReset(() => void clearServerCopy());

  try {
    const server = await pull();
    if (attached !== userId) return;
    const merged = merge(currentState(), server, true);
    switchRecord(userId, merged, () => scheduleFlush());
    if (hadLegacy) {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
    }
    scheduleFlush(0);
  } catch {
    // offline or a hiccup: keep working locally and send everything next time
    if (attached === userId) {
      const s = currentState();
      Object.keys(s.questions).forEach((k) => dirty.questions.add(k));
      s.recent.forEach((r) => dirty.recent.add(r.key));
      s.sessions.forEach((x) => dirty.sessions.add(x.id));
      s.mocks.forEach((m) => dirty.mocks.add(m.id));
      scheduleFlush(15_000);
    }
  }
}

let guestAttached = false;

function detach() {
  guestAttached = false;
  if (attached === null) return;
  window.clearTimeout(timer);
  attached = null;
  onReset(null);
  switchRecord(null, EMPTY, null);
}

function attachGuest() {
  if (guestAttached) return;
  if (attached !== null) {
    window.clearTimeout(timer);
    attached = null;
    onReset(null);
  }
  guestAttached = true;
  switchToGuestRecord();
}

/** Mounted once in App: follows the account and attaches or detaches its study record. */
export function StudySync() {
  const { session, profile, isAdmin } = useAuth();
  const guest = useGuestFlag();
  const uid = session?.user.id ?? null;
  const allowed = Boolean(uid && (profile?.status === 'approved' || isAdmin));
  // what the loaded content was fetched as: the account, or a guest (open rows only)
  const contentOwner = allowed ? uid : guest ? 'guest' : null;

  useEffect(() => {
    // content belongs to one viewer: drop it when that changes
    const loaded = contentLoadedFor();
    if (loaded !== undefined && loaded !== contentOwner) setRemoteContent(null);

    if (allowed && uid) {
      guestAttached = false;
      if (guest) leaveGuest(); // a full account replaces guest browsing
      void attach(uid);
    } else if (guest) attachGuest();
    else detach();
  }, [uid, allowed, guest, contentOwner]);

  // try to send unsaved changes before the tab closes
  useEffect(() => {
    const send = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, []);

  return null;
}

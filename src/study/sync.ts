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
  type Position,
  type SubjectGoal,
  type TopicMark,
  clearDirty,
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
  const days: Record<string, string[]> = { ...(other.days ?? {}) };
  for (const [day, keys] of Object.entries(local.days ?? {})) {
    const have = new Set(days[day] ?? []);
    const extra = keys.filter((k) => !have.has(k));
    if (extra.length) {
      days[day] = [...(days[day] ?? []), ...extra];
      if (markLocalWins) dirty.days.add(day);
    }
  }

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

  const positions: Record<string, Position> = { ...(other.positions ?? {}) };
  for (const [scope, p] of Object.entries(local.positions ?? {})) {
    if (!positions[scope] || p.at > positions[scope].at) {
      positions[scope] = p;
      if (markLocalWins) dirty.positions.add(scope);
    }
  }

  // marks and goals: the newer change wins (a removal is a change too)
  const newer = <T extends { at: number }>(mine: Record<string, T> | undefined, theirs: Record<string, T> | undefined, set: Set<string>) => {
    const out: Record<string, T> = { ...(theirs ?? {}) };
    for (const [k, v] of Object.entries(mine ?? {})) {
      if (!out[k] || v.at > out[k].at) {
        out[k] = v;
        if (markLocalWins) set.add(k);
      }
    }
    return out;
  };
  const topicMarks = newer<TopicMark>(local.topicMarks, other.topicMarks, dirty.topicMarks);
  const goals = newer<SubjectGoal>(local.goals, other.goals, dirty.goals);

  // timed study only ever grows, so the larger figure for a day is the right one
  const seconds: Record<string, number> = { ...(other.seconds ?? {}) };
  for (const [day, n] of Object.entries(local.seconds ?? {})) {
    if (n > (seconds[day] ?? 0)) {
      seconds[day] = n;
      if (markLocalWins) dirty.seconds.add(day);
    }
  }

  return { version: 1, days, questions, recent, sessions, mocks, positions, topicMarks, goals, seconds };
}

/* ── reading the server copy ── */

async function pull(): Promise<StudyState> {
  const [sd, qp, rv, ss, mr, sp, tm, sg, sec] = await Promise.all([
    supabase.from('study_days').select('day, question_keys').order('day', { ascending: false }).limit(420),
    supabase.from('question_progress').select('question_key, status, bookmarked, note, note_updated_at, updated_at'),
    supabase.from('recent_views').select('question_key, viewed_at').order('viewed_at', { ascending: false }).limit(40),
    supabase.from('study_sessions').select('id, started_at, last_at, viewed, changes').order('started_at', { ascending: false }).limit(60),
    supabase.from('mock_results').select('id, at, scope, stations').order('at', { ascending: false }).limit(50),
    supabase.from('study_position').select('scope, specialty_id, topic_id, question_key, list_index, page, filter, updated_at').order('updated_at', { ascending: false }).limit(60),
    supabase.from('topic_marks').select('specialty_id, topic_id, state, updated_at'),
    supabase.from('subject_goals').select('specialty_id, subject_id, target, period, updated_at'),
    supabase.from('study_days').select('day, seconds_studied').gt('seconds_studied', 0).order('day', { ascending: false }).limit(420),
  ]);
  const failed = [qp, rv, ss, mr].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  // study_days arrives in a later migration: until it exists, streak days stay on this device
  const days: Record<string, string[]> = {};
  for (const r of sd.error ? [] : sd.data ?? []) days[r.day] = r.question_keys ?? [];

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
  // study_position arrives in migration 011: until it exists, positions stay on this device
  const positions: Record<string, Position> = {};
  for (const r of sp.error ? [] : sp.data ?? []) {
    positions[r.scope] = { scope: r.scope, specialty: r.specialty_id, topic: r.topic_id ?? '', key: r.question_key, index: r.list_index, page: r.page, filter: r.filter, at: ms(r.updated_at) };
  }

  // migration 012: until its tables exist, marks, goals and timed study stay on this device
  const topicMarks: Record<string, TopicMark> = {};
  for (const r of tm.error ? [] : tm.data ?? []) topicMarks[`${r.specialty_id}/${r.topic_id}`] = { state: r.state, at: ms(r.updated_at) };
  const goals: Record<string, SubjectGoal> = {};
  for (const r of sg.error ? [] : sg.data ?? []) goals[`${r.specialty_id}/${r.subject_id}`] = { target: r.target, period: r.period, at: ms(r.updated_at) };
  const seconds: Record<string, number> = {};
  for (const r of sec.error ? [] : sec.data ?? []) seconds[r.day] = r.seconds_studied;

  return {
    version: 1,
    days,
    positions,
    topicMarks,
    goals,
    seconds,
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
  const dKeys = take<string>(dirty.days);
  const qKeys = take<string>(dirty.questions);
  const rKeys = take<string>(dirty.recent);
  const sIds = take<string>(dirty.sessions);
  const mIds = take<string>(dirty.mocks);
  const pIds = take<string>(dirty.positions);
  const tIds = take<string>(dirty.topicMarks);
  const gIds = take<string>(dirty.goals);
  const secDays = take<string>(dirty.seconds);
  if (!dKeys.length && !qKeys.length && !rKeys.length && !sIds.length && !mIds.length && !pIds.length && !tIds.length && !gIds.length && !secDays.length) return;

  flushing = true;
  const user = attached;
  const jobs: Array<PromiseLike<{ error: unknown }>> = [];

  const dRows = dKeys.filter((d) => s.days[d]).map((d) => ({ day: d, question_keys: s.days[d] }));
  if (dRows.length) jobs.push(supabase.from('study_days').upsert(dRows, { onConflict: 'user_id,day' }));

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

  const pRows = pIds.flatMap((scope) => {
    const p = s.positions?.[scope];
    return p ? [{ scope, specialty_id: p.specialty, topic_id: p.topic || null, question_key: p.key, list_index: p.index, page: p.page, filter: p.filter, updated_at: iso(p.at) }] : [];
  });
  // positions are a convenience: if the table isn't there yet, don't hold up the rest of the record
  const posJob = pRows.length ? supabase.from('study_position').upsert(pRows, { onConflict: 'user_id,scope' }) : null;

  // marks, goals and timed study (migration 012) are saved on their own, like positions
  const extras: Array<PromiseLike<unknown>> = [];
  const split = (k: string) => [k.slice(0, k.indexOf('/')), k.slice(k.indexOf('/') + 1)];
  const markSet = tIds.flatMap((k) => (s.topicMarks?.[k]?.state ? [k] : []));
  const markGone = tIds.filter((k) => !s.topicMarks?.[k]?.state);
  if (markSet.length)
    extras.push(
      supabase.from('topic_marks').upsert(
        markSet.map((k) => ({ specialty_id: split(k)[0], topic_id: split(k)[1], state: s.topicMarks![k].state, updated_at: iso(s.topicMarks![k].at) })),
        { onConflict: 'user_id,specialty_id,topic_id' },
      ),
    );
  for (const k of markGone) extras.push(supabase.from('topic_marks').delete().eq('user_id', user).eq('specialty_id', split(k)[0]).eq('topic_id', split(k)[1]));
  const goalSet = gIds.filter((k) => (s.goals?.[k]?.target ?? 0) > 0);
  const goalGone = gIds.filter((k) => !((s.goals?.[k]?.target ?? 0) > 0));
  if (goalSet.length)
    extras.push(
      supabase.from('subject_goals').upsert(
        goalSet.map((k) => ({ specialty_id: split(k)[0], subject_id: split(k)[1], target: s.goals![k].target, period: s.goals![k].period, updated_at: iso(s.goals![k].at) })),
        { onConflict: 'user_id,specialty_id,subject_id' },
      ),
    );
  for (const k of goalGone) extras.push(supabase.from('subject_goals').delete().eq('user_id', user).eq('specialty_id', split(k)[0]).eq('subject_id', split(k)[1]));
  // only the time column: an existing day keeps its questions
  if (secDays.length) extras.push(supabase.from('study_days').upsert(secDays.map((day) => ({ day, seconds_studied: s.seconds?.[day] ?? 0 })), { onConflict: 'user_id,day' }));

  const [results] = await Promise.all([Promise.all(jobs), posJob, ...extras]);
  flushing = false;
  if (results.some((r) => r.error) && attached === user) {
    // keep the changes and try again shortly (offline, or the session was refreshing)
    dKeys.forEach((k) => dirty.days.add(k));
    qKeys.forEach((k) => dirty.questions.add(k));
    rKeys.forEach((k) => dirty.recent.add(k));
    sIds.forEach((k) => dirty.sessions.add(k));
    mIds.forEach((k) => dirty.mocks.add(k));
    pIds.forEach((k) => dirty.positions.add(k));
    scheduleFlush(10_000);
  } else if (dirty.days.size || dirty.questions.size || dirty.recent.size || dirty.sessions.size || dirty.mocks.size || dirty.positions.size || dirty.topicMarks.size || dirty.goals.size || dirty.seconds.size) {
    scheduleFlush();
  }
}

async function clearServerCopy() {
  if (!attached) return;
  const u = attached;
  clearDirty();
  await Promise.all(
    ['study_days', 'question_progress', 'recent_views', 'study_sessions', 'mock_results', 'study_position', 'topic_marks', 'subject_goals'].map((t) => supabase.from(t).delete().eq('user_id', u)),
  );
}

/* ── attaching an account ── */

async function attach(userId: string) {
  if (attached === userId) return;
  attached = userId;

  // this account's copy in this browser, plus anything saved here before accounts existed
  let local = loadFrom(`${LEGACY_KEY}:${userId}`);
  const legacy = loadFrom(LEGACY_KEY);
  const hadLegacy = Object.keys(legacy.days ?? {}).length + Object.keys(legacy.questions).length + legacy.recent.length + legacy.sessions.length + legacy.mocks.length > 0;
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
      Object.keys(s.days).forEach((d) => dirty.days.add(d));
      Object.keys(s.questions).forEach((k) => dirty.questions.add(k));
      s.recent.forEach((r) => dirty.recent.add(r.key));
      s.sessions.forEach((x) => dirty.sessions.add(x.id));
      s.mocks.forEach((m) => dirty.mocks.add(m.id));
      Object.keys(s.positions ?? {}).forEach((k) => dirty.positions.add(k));
      Object.keys(s.topicMarks ?? {}).forEach((k) => dirty.topicMarks.add(k));
      Object.keys(s.goals ?? {}).forEach((k) => dirty.goals.add(k));
      Object.keys(s.seconds ?? {}).forEach((k) => dirty.seconds.add(k));
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

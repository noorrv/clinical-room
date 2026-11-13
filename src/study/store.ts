import { useSyncExternalStore } from 'react';
import type { SpecialtyId } from '../content/types';

/*
  The student's study record, shared by every page. It lives in memory and in this browser
  (localStorage, one copy per account) so pages respond instantly, and every change is also
  saved to Supabase in the background (see sync.ts), so progress follows the student anywhere.
  Questions are keyed "specialty/questionId", so one record covers all specialties.
*/

export type Status = 'not-started' | 'in-progress' | 'needs-revision' | 'mastered';

export const STATUSES: Status[] = ['not-started', 'in-progress', 'needs-revision', 'mastered'];

export const STATUS_LABEL: Record<Status, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'needs-revision': 'Needs revision',
  mastered: 'Mastered',
};

export interface QuestionRecord {
  status: Status;
  bookmarked: boolean;
  note: string;
  updatedAt: number;
  noteUpdatedAt?: number;
}

export interface Session {
  id: string;
  startedAt: number;
  lastAt: number;
  /** question keys viewed in this session, in order, without repeats */
  viewed: string[];
  /** status changes made in this session */
  changes: Array<{ key: string; to: Status; at: number }>;
}

export interface MockStationResult {
  key: string;
  checked: number;
  total: number;
  rating?: 'pass' | 'borderline' | 'fail';
  secondsUsed: number;
  secondsAllowed: number;
}

export interface MockResult {
  id: string;
  at: number;
  scope: SpecialtyId | 'all';
  stations: MockStationResult[];
}

export type PositionFilter = 'all' | 'easy' | 'moderate' | 'difficult' | 'bookmarked';

/** Where the student stopped in one list (a topic's questions), for "Continue studying". */
export interface Position {
  /** 'topic:surgery/appendix' */
  scope: string;
  specialty: SpecialtyId;
  topic: string;
  /** the question they were on, "specialty/questionId" */
  key: string | null;
  /** its place in the topic, from 0 */
  index: number;
  page: number;
  filter: PositionFilter;
  at: number;
}

export interface StudyState {
  version: 1;
  /** local date (YYYY-MM-DD) → questions the student actually worked on that day (for the streak) */
  days: Record<string, string[]>;
  questions: Record<string, QuestionRecord>;
  recent: Array<{ key: string; at: number }>;
  sessions: Session[];
  mocks: MockResult[];
  /** scope → where the student stopped in that list */
  positions?: Record<string, Position>;
}

/** The old single-browser record, from before accounts. Moved into the first account that signs in. */
export const LEGACY_KEY = 'clinical-room:study:v1';
const SESSION_GAP = 30 * 60 * 1000;
export const EMPTY: StudyState = { version: 1, days: {}, questions: {}, recent: [], sessions: [], mocks: [], positions: {} };

/** localStorage key of the signed-in account's copy, or null when nobody is attached. */
let storageKey: string | null = null;

export function loadFrom(key: string): StudyState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StudyState;
    return parsed.version === 1 ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: StudyState = EMPTY;
const listeners = new Set<() => void>();

/** What changed since the last save to the server. */
export const dirty = {
  days: new Set<string>(),
  questions: new Set<string>(),
  recent: new Set<string>(),
  sessions: new Set<string>(),
  mocks: new Set<string>(),
  positions: new Set<string>(),
};
let onDirty: (() => void) | null = null;

function commit(next: StudyState) {
  state = next;
  if (storageKey) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep working for this visit */
    }
  }
  listeners.forEach((l) => l());
  onDirty?.();
}

/** Used by sync.ts: switch to an account's record (or to none), replacing what's in memory. */
export function switchRecord(userId: string | null, initial: StudyState, saveDirty: (() => void) | null) {
  storageKey = userId ? `${LEGACY_KEY}:${userId}` : null;
  onDirty = saveDirty;
  if (!userId) {
    dirty.days.clear();
    dirty.questions.clear();
    dirty.recent.clear();
    dirty.sessions.clear();
    dirty.mocks.clear();
    dirty.positions.clear();
  }
  commit(initial);
}

/** Used by sync.ts for guests: progress kept in this browser only (under the pre-accounts key,
    so it is moved into their account if they register and are approved). */
export function switchToGuestRecord() {
  storageKey = LEGACY_KEY;
  onDirty = null;
  dirty.days.clear();
  dirty.questions.clear();
  dirty.recent.clear();
  dirty.sessions.clear();
  dirty.mocks.clear();
  dirty.positions.clear();
  commit(loadFrom(LEGACY_KEY));
}

export const currentState = () => state;

if (typeof window !== 'undefined') {
  // keep tabs in step
  window.addEventListener('storage', (e) => {
    if (storageKey && e.key === storageKey) {
      state = loadFrom(storageKey);
      listeners.forEach((l) => l());
    }
  });
}

export function useStudy(): StudyState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => EMPTY,
  );
}

export const record = (s: StudyState, key: string): QuestionRecord =>
  s.questions[key] ?? { status: 'not-started', bookmarked: false, note: '', updatedAt: 0 };

/** The student's own calendar day for a moment, as YYYY-MM-DD (local time, not UTC). */
export function localDay(ms: number = Date.now()): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Count a question toward today's streak goal (once per question per day). */
function withDay(s: StudyState, key: string, now: number): Pick<StudyState, 'days'> {
  const day = localDay(now);
  const today = s.days[day] ?? [];
  if (today.includes(key)) return { days: s.days };
  dirty.days.add(day);
  // keep roughly a year and a bit of history
  const kept = Object.keys(s.days).sort().slice(-420);
  const days = Object.fromEntries(kept.map((d) => [d, s.days[d]]));
  days[day] = [...today, key];
  return { days };
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Current session, starting a new one after 30 minutes of inactivity. */
function touchSession(s: StudyState, now: number): { sessions: Session[]; current: Session } {
  const last = s.sessions[s.sessions.length - 1];
  if (last && now - last.lastAt < SESSION_GAP) {
    const current = { ...last, lastAt: now };
    return { sessions: [...s.sessions.slice(0, -1), current], current };
  }
  const current: Session = { id: uid(), startedAt: now, lastAt: now, viewed: [], changes: [] };
  return { sessions: [...s.sessions, current].slice(-60), current };
}

function withSession(s: StudyState, now: number, edit: (c: Session) => Session): Session[] {
  const { sessions, current } = touchSession(s, now);
  return [...sessions.slice(0, -1), edit(current)];
}

function setRecord(key: string, patch: Partial<QuestionRecord>, extra?: (s: StudyState, now: number) => Partial<StudyState>) {
  const now = Date.now();
  const prev = record(state, key);
  dirty.questions.add(key);
  const more = extra ? extra(state, now) : {};
  if (more.sessions) dirty.sessions.add(more.sessions[more.sessions.length - 1].id);
  commit({
    ...state,
    questions: { ...state.questions, [key]: { ...prev, ...patch, updatedAt: now } },
    ...more,
  });
}

export const study = {
  /** Opening a question: remember it, and start it if it hadn't been. */
  viewed(key: string) {
    const now = Date.now();
    const prev = record(state, key);
    const recent = [{ key, at: now }, ...state.recent.filter((r) => r.key !== key)].slice(0, 40);
    const sessions = withSession(state, now, (c) => ({
      ...c,
      viewed: c.viewed.includes(key) ? c.viewed : [...c.viewed, key],
    }));
    const questions =
      prev.status === 'not-started'
        ? { ...state.questions, [key]: { ...prev, status: 'in-progress' as Status, updatedAt: now } }
        : state.questions;
    if (prev.status === 'not-started') dirty.questions.add(key);
    dirty.recent.add(key);
    dirty.sessions.add(sessions[sessions.length - 1].id);
    commit({ ...state, recent, sessions, questions });
  },

  /** Marking a status by hand (not the automatic "in progress" on opening) counts toward the streak. */
  setStatus(key: string, status: Status) {
    setRecord(key, { status }, (s, now) => ({
      sessions: withSession(s, now, (c) => ({ ...c, changes: [...c.changes, { key, to: status, at: now }] })),
      ...(status !== 'not-started' ? withDay(s, key, now) : {}),
    }));
  },

  toggleBookmark(key: string) {
    setRecord(key, { bookmarked: !record(state, key).bookmarked });
  },

  /** Writing a note counts toward the streak too. */
  setNote(key: string, note: string) {
    setRecord(key, { note, noteUpdatedAt: Date.now() }, (s, now) => (note.trim() ? withDay(s, key, now) : {}));
  },

  saveMock(result: Omit<MockResult, 'id' | 'at'>) {
    const m: MockResult = { ...result, id: uid(), at: Date.now() };
    dirty.mocks.add(m.id);
    commit({ ...state, mocks: [m, ...state.mocks].slice(0, 50) });
    return m;
  },

  /** Remembers where the student is in a list; only the newest 60 lists are kept. */
  position(p: Omit<Position, 'at'>) {
    const prev = state.positions?.[p.scope];
    if (prev && prev.key === p.key && prev.page === p.page && prev.filter === p.filter && prev.index === p.index && Date.now() - prev.at < 60_000) return;
    const next: Position = { ...p, at: Date.now() };
    const kept = Object.values({ ...(state.positions ?? {}), [p.scope]: next })
      .sort((a, b) => b.at - a.at)
      .slice(0, 60);
    dirty.positions.add(p.scope);
    commit({ ...state, positions: Object.fromEntries(kept.map((x) => [x.scope, x])) });
  },

  /** Wipes everything (with the student's confirmation in the UI), here and on the server. */
  reset() {
    resetHandler?.();
    commit(EMPTY);
  },
};

let resetHandler: (() => void) | null = null;
/** sync.ts registers how to clear the server copy when the student resets their record. */
export function onReset(fn: (() => void) | null) {
  resetHandler = fn;
}

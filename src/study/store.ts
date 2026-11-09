import { useSyncExternalStore } from 'react';
import type { SpecialtyId } from '../content/types';

/*
  The student's study record, kept in this browser (localStorage) and shared by every page.
  Questions are keyed "specialty/questionId", so one record covers all specialties and each
  view can filter to one. The shape is plain JSON so it can move to a Supabase table later.
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

export interface StudyState {
  version: 1;
  questions: Record<string, QuestionRecord>;
  recent: Array<{ key: string; at: number }>;
  sessions: Session[];
  mocks: MockResult[];
}

const KEY = 'clinical-room:study:v1';
const SESSION_GAP = 30 * 60 * 1000;
const EMPTY: StudyState = { version: 1, questions: {}, recent: [], sessions: [], mocks: [] };

function load(): StudyState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StudyState;
    return parsed.version === 1 ? { ...EMPTY, ...parsed } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: StudyState = typeof window === 'undefined' ? EMPTY : load();
const listeners = new Set<() => void>();

function commit(next: StudyState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: keep working for this visit */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  // keep tabs in step
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
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
  commit({
    ...state,
    questions: { ...state.questions, [key]: { ...prev, ...patch, updatedAt: now } },
    ...(extra ? extra(state, now) : {}),
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
    commit({ ...state, recent, sessions, questions });
  },

  setStatus(key: string, status: Status) {
    setRecord(key, { status }, (s, now) => ({
      sessions: withSession(s, now, (c) => ({ ...c, changes: [...c.changes, { key, to: status, at: now }] })),
    }));
  },

  toggleBookmark(key: string) {
    setRecord(key, { bookmarked: !record(state, key).bookmarked });
  },

  setNote(key: string, note: string) {
    setRecord(key, { note, noteUpdatedAt: Date.now() });
  },

  saveMock(result: Omit<MockResult, 'id' | 'at'>) {
    const m: MockResult = { ...result, id: uid(), at: Date.now() };
    commit({ ...state, mocks: [m, ...state.mocks].slice(0, 50) });
    return m;
  },

  /** Wipes everything (with the student's confirmation in the UI). */
  reset() {
    commit(EMPTY);
  },
};

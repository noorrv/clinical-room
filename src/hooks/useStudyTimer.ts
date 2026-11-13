import { useCallback, useEffect, useRef, useState } from 'react';
import { study } from '../study/store';

export type TimerStatus = 'idle' | 'running' | 'paused';

interface TimerState {
  status: TimerStatus;
  /** Time banked from earlier running stretches, in ms. */
  accumulated: number;
  /** Wall-clock time the current running stretch began, or null. */
  startedAt: number | null;
}

const KEY = 'clinical-room:study-timer';
const IDLE: TimerState = { status: 'idle', accumulated: 0, startedAt: null };

function load(): TimerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return IDLE;
    const s = JSON.parse(raw) as TimerState;
    if (s.status === 'running' && typeof s.startedAt === 'number') return s;
    if (s.status === 'paused' && typeof s.accumulated === 'number') return { ...s, startedAt: null };
  } catch {
    /* storage unavailable or corrupted: start fresh */
  }
  return IDLE;
}

function save(s: TimerState) {
  try {
    if (s.status === 'idle') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode etc. — the timer still works for this visit */
  }
}

/**
 * Study timer driven by timestamps rather than tick counting, so it stays
 * accurate when the tab is throttled in the background and survives reloads.
 */
export function useStudyTimer() {
  const [state, setState] = useState<TimerState>(load);
  const [now, setNow] = useState(() => Date.now());
  const live = useRef(state);
  live.current = state;

  useEffect(() => save(state), [state]);

  // each running stretch is added to the student's study time for the day, when it ends
  const bank = () => {
    const s = live.current;
    if (s.status === 'running' && s.startedAt) study.addTime((Date.now() - s.startedAt) / 1000);
  };

  useEffect(() => {
    if (state.status !== 'running') return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [state.status]);

  const elapsed =
    state.accumulated + (state.status === 'running' && state.startedAt ? Math.max(0, now - state.startedAt) : 0);

  const start = useCallback(() => {
    setState((s) => (s.status === 'running' ? s : { status: 'running', accumulated: s.accumulated, startedAt: Date.now() }));
  }, []);

  const pause = useCallback(() => {
    bank();
    setState((s) =>
      s.status !== 'running' || !s.startedAt
        ? s
        : { status: 'paused', accumulated: s.accumulated + (Date.now() - s.startedAt), startedAt: null },
    );
  }, []);

  const stop = useCallback(() => {
    bank();
    setState(IDLE);
  }, []);

  return { status: state.status, elapsed, start, pause, resume: start, stop };
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')) as [string, string, string];
}

export function spokenDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? '' : 's'}`);
  if (h || m) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (!h) parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}

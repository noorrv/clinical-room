import { localDay } from './store';

/*
  The study streak. A day "counts" when the student worked on GOAL or more questions (marked a
  status by hand or wrote a note). Days follow the student's own calendar. One missed day per
  week (Monday to Sunday) is forgiven; a second one breaks the streak. Today never breaks it:
  it only joins the count once the goal is reached. Nothing before the account's creation counts.
*/

export const GOAL = 5;

export type DayState = 'met' | 'forgiven' | 'missed' | 'today' | 'future' | 'before';

export interface StreakInfo {
  current: number;
  best: number;
  today: number;
  goal: number;
  /** how yesterday went (null before the account existed) */
  yesterday: DayState | null;
  /** Monday … Sunday of this week */
  week: Array<{ day: string; label: string; state: DayState; count: number }>;
}

const parse = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};
const fmt = (d: Date) => localDay(d.getTime());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** the Monday that starts a date's week */
const weekOf = (d: Date) => fmt(addDays(d, -((d.getDay() + 6) % 7)));

export function computeStreak(days: Record<string, string[]>, signedUp: string | null, now: number = Date.now()): StreakInfo {
  const todayStr = localDay(now);
  const today = parse(todayStr);
  const count = (d: string) => days[d]?.length ?? 0;

  // start counting from the account's first day (or the earliest recorded day, if that's later)
  const recorded = Object.keys(days).sort()[0];
  const firstStr = signedUp ? localDay(Date.parse(signedUp)) : (recorded ?? todayStr);
  const first = parse(firstStr <= todayStr ? firstStr : todayStr);

  const states = new Map<string, DayState>();
  const forgivenWeeks = new Set<string>();
  let run = 0;
  let best = 0;

  for (let d = first; d <= today; d = addDays(d, 1)) {
    const key = fmt(d);
    const met = count(key) >= GOAL;
    if (key === todayStr && !met) {
      states.set(key, 'today'); // still time today: doesn't break the run
      break;
    }
    if (met) {
      run += 1;
      best = Math.max(best, run);
      states.set(key, 'met');
    } else if (run > 0 && !forgivenWeeks.has(weekOf(d))) {
      forgivenWeeks.add(weekOf(d));
      states.set(key, 'forgiven');
    } else {
      run = 0;
      states.set(key, 'missed');
    }
  }

  const monday = parse(weekOf(today));
  const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const week = LABELS.map((label, i) => {
    const d = addDays(monday, i);
    const key = fmt(d);
    const state: DayState = d > today ? 'future' : d < first ? 'before' : (states.get(key) ?? 'missed');
    return { day: key, label, state, count: count(key) };
  });

  const yesterday = states.get(fmt(addDays(today, -1))) ?? null;
  return { current: run, best, today: count(todayStr), goal: GOAL, yesterday, week };
}

import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

/*
  Flashcard scheduling with FSRS (ts-fsrs). A card is a question: these records hold only the
  student's memory of it (state, stability, difficulty, due date), never the question's text.

  The first rating of a new card uses the fixed starting intervals asked for: Again 5 minutes,
  Hard 30 minutes, Good 1 day, Easy 3 days. FSRS still sets the card's starting stability and
  difficulty from that rating, and every later review is pure FSRS at 90% target recall, so the
  schedule adapts to the student's own history.

  The student's ratings are about their recall. They never touch a question's own difficulty
  label (Easy, Moderate, Difficult), which stays separate.
*/

export type { CardState, CardRecord } from './categories';
import type { CardState, CardRecord } from './categories';

export type Rate = 1 | 2 | 3 | 4; // again, hard, good, easy

export const RATE_WORD: Record<Rate, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

/** One rating, kept for the student's history. */
export interface ReviewLogRecord {
  id: string;
  key: string;
  rating: Rate;
  at: number;
  stateBefore: CardState | 'new';
  prevInterval: number;
  nextInterval: number;
  retrievability: number | null;
  stability: number;
  difficulty: number;
  durationMs?: number;
}

const MIN = 60_000;
const DAY = 86_400_000;

/** Starting intervals for a card's very first rating. */
export const FIRST_INTERVAL: Record<Rate, number> = { 1: 5 * MIN, 2: 30 * MIN, 3: DAY, 4: 3 * DAY };

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['5m', '30m'],
  relearning_steps: ['10m'],
});

const STATE_TO_FSRS: Record<CardState, State> = { learning: State.Learning, review: State.Review, relearning: State.Relearning };
const STATE_FROM_FSRS: Record<number, CardState> = { [State.Learning]: 'learning', [State.Review]: 'review', [State.Relearning]: 'relearning' };
const GRADE: Record<Rate, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy };

function toFsrs(c: CardRecord): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.interval,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: STATE_TO_FSRS[c.state],
    last_review: new Date(c.lastReview),
  } as Card;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** How likely the student is to remember the card now (0–1); null for a card never rated. */
export function recall(card: CardRecord | null | undefined, now = Date.now()): number | null {
  if (!card) return null;
  try {
    return scheduler.retrievability(toFsrs(card), new Date(now));
  } catch {
    return null;
  }
}

/** The card after a rating, and the log of it. `card` is null for a question never rated. */
export function rate(key: string, card: CardRecord | null | undefined, rating: Rate, now = Date.now(), durationMs?: number): { card: CardRecord; log: ReviewLogRecord } {
  const base = card ? toFsrs(card) : createEmptyCard(new Date(now));
  const r = card ? recall(card, now) : null;
  const next = scheduler.next(base, new Date(now), GRADE[rating]).card;

  let due = next.due.getTime();
  let state = STATE_FROM_FSRS[next.state] ?? 'learning';
  let learningSteps = next.learning_steps;
  if (!card) {
    // the first rating: the fixed starting intervals; Good and Easy go straight to review
    due = now + FIRST_INTERVAL[rating];
    if (rating >= 3) {
      state = 'review';
      learningSteps = 0;
    } else {
      state = 'learning';
    }
  }
  const interval = Math.max(0, (due - now) / DAY);

  const record: CardRecord = {
    key,
    state,
    stability: next.stability,
    difficulty: next.difficulty,
    reps: next.reps,
    lapses: next.lapses,
    learningSteps,
    interval,
    due,
    lastReview: now,
    createdAt: card?.createdAt ?? now,
    at: now,
  };
  const log: ReviewLogRecord = {
    id: uid(),
    key,
    rating,
    at: now,
    stateBefore: card?.state ?? 'new',
    prevInterval: card?.interval ?? 0,
    nextInterval: interval,
    retrievability: r,
    stability: next.stability,
    difficulty: next.difficulty,
    ...(durationMs !== undefined ? { durationMs: Math.max(0, Math.round(durationMs)) } : {}),
  };
  return { card: record, log };
}

/** What each button would do, for its label ("Good · 1 day"). */
export function preview(key: string, card: CardRecord | null | undefined, now = Date.now()): Record<Rate, number> {
  const out = {} as Record<Rate, number>;
  for (const r of [1, 2, 3, 4] as Rate[]) out[r] = rate(key, card, r, now).card.due - now;
  return out;
}

/** "5 min", "30 min", "1 day", "3 days", "2 mo", "1.4 yr" */
export function spanWord(ms: number): string {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(ms / DAY);
  if (d < 31) return `${d} ${d === 1 ? 'day' : 'days'}`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')} yr`;
}

/* the card categories live on their own (no FSRS library), so any page can count cards cheaply */
export * from './categories';

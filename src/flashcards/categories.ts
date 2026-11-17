/*
  The student's flashcard records and their categories, without the FSRS library, so pages that
  only count cards (the header, the profile) don't download the scheduler.
*/

export type CardState = 'learning' | 'review' | 'relearning';
/** One student's schedule for one question ("specialty/questionId"). */
export interface CardRecord {
  key: string;
  state: CardState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  /** days between the last review and the due date */
  interval: number;
  due: number;
  lastReview: number;
  createdAt: number;
  /** when this record last changed (for syncing) */
  at: number;
}

/* ───────────────────────── categories ───────────────────────── */

export type Category = 'new' | 'learning' | 'due' | 'overdue' | 'difficult' | 'mastered';

export const MASTERED_STABILITY = 21; // days
export const DIFFICULT_AT = 7; // FSRS difficulty (1–10)

const endOfToday = (now: number) => {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};
const startOfToday = (now: number) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const isNew = (c: CardRecord | null | undefined) => !c;
export const isLearning = (c: CardRecord | null | undefined): c is CardRecord => !!c && (c.state === 'learning' || c.state === 'relearning');
/** due before the end of today (overdue ones included) */
export const isDue = (c: CardRecord | null | undefined, now = Date.now()): c is CardRecord => !!c && c.due <= endOfToday(now);
/** was due before today began */
export const isOverdue = (c: CardRecord | null | undefined, now = Date.now()): c is CardRecord => !!c && c.due < startOfToday(now);
export const isDifficult = (c: CardRecord | null | undefined): c is CardRecord => !!c && (c.difficulty >= DIFFICULT_AT || c.lapses >= 2);
export const isMastered = (c: CardRecord | null | undefined): c is CardRecord => !!c && c.state === 'review' && c.stability >= MASTERED_STABILITY;

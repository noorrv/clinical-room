import { record, type FlashFilters, type StudyState } from '../study/store';
import { placedQuestions, type Placed } from '../pages/profile/library';
import { isDifficult, isDue, isLearning, isMastered, isOverdue, type CardRecord } from './categories';

/*
  Which questions are flashcards, and the order a session takes them in. A flashcard is a
  published question as it is now (so newly published questions are new cards straight away),
  except a topic's overview and reference list, which aren't questions to recall.
*/

const NOT_CARDS = /^\s*(overview|references)\b/i;

/** Every question that can be a flashcard, with where it lives. */
export function deck(): Placed[] {
  return placedQuestions().filter((p) => !NOT_CARDS.test(p.q.title));
}

export type Status = NonNullable<FlashFilters['status']>;

export function matchesStatus(card: CardRecord | undefined, status: Status, now = Date.now()): boolean {
  switch (status) {
    case 'new':
      return !card;
    case 'due':
      return isDue(card, now);
    case 'learning':
      return isLearning(card);
    case 'difficult':
      return isDifficult(card);
    case 'mastered':
      return isMastered(card);
    default:
      return true;
  }
}

/** The cards that fit the filters, before any limit. */
export function filtered(all: Placed[], f: FlashFilters, st: StudyState, now = Date.now()): Placed[] {
  return all.filter((p) => {
    if (f.specialty && p.sp.id !== f.specialty) return false;
    if (f.subject && p.subjectId !== f.subject) return false;
    if (f.topic && `${p.sp.id}/${p.topicId}` !== f.topic) return false;
    if (f.bookmarked && !record(st, p.q.key).bookmarked) return false;
    return matchesStatus(st.cards?.[p.q.key], f.status ?? 'all', now);
  });
}

/**
 * A session's cards, in study order: overdue first (most overdue first), then due today, then
 * cards still being learned, then new cards in their topic order, then the rest by due date.
 */
export function buildQueue(all: Placed[], f: FlashFilters, st: StudyState, limit: number, now = Date.now()): string[] {
  const cards = st.cards ?? {};
  const rank = (p: Placed) => {
    const c = cards[p.q.key];
    if (isOverdue(c, now)) return 0;
    if (isDue(c, now)) return 1;
    if (isLearning(c)) return 2;
    if (!c) return 3;
    return 4;
  };
  return filtered(all, f, st, now)
    .map((p, i) => ({ p, i, r: rank(p), due: cards[p.q.key]?.due ?? 0 }))
    .sort((a, b) => a.r - b.r || (a.r === 3 ? a.i - b.i : a.due - b.due) || a.i - b.i)
    .slice(0, Math.max(1, limit))
    .map((x) => x.p.q.key);
}

/** Two filter sets ask for the same cards. */
export const sameFilters = (a: FlashFilters, b: FlashFilters) =>
  (a.specialty ?? '') === (b.specialty ?? '') &&
  (a.subject ?? '') === (b.subject ?? '') &&
  (a.topic ?? '') === (b.topic ?? '') &&
  Boolean(a.bookmarked) === Boolean(b.bookmarked) &&
  (a.status ?? 'all') === (b.status ?? 'all');

/** Filters read from a page address (?specialty=surgery&topic=surgery/appendix&bookmarked=1&status=due). */
export function filtersFrom(params: URLSearchParams): FlashFilters | null {
  const f: FlashFilters = {};
  const sp = params.get('specialty');
  const sub = params.get('subject');
  const top = params.get('topic');
  const st = params.get('status');
  if (sp && /^[a-z]+$/.test(sp)) f.specialty = sp as FlashFilters['specialty'];
  if (sub && /^[a-z0-9-]+$/.test(sub)) f.subject = sub;
  if (top && /^[a-z]+\/[a-z0-9-]+$/.test(top)) f.topic = top;
  if (params.get('bookmarked') === '1') f.bookmarked = true;
  if (st && ['due', 'new', 'learning', 'difficult', 'mastered', 'all'].includes(st)) f.status = st as Status;
  return Object.keys(f).length ? f : null;
}

/**
 * An answer with its examiner follow-up questions taken out, so the card can show them on their
 * own. They're the ":::tip Examiner follow-up: …" blocks the answers already use; nothing is
 * changed or lost, only shown in two parts.
 */
export function splitFollowUps(text: string): { main: string; followUps: string[] } {
  const lines = text.split('\n');
  const main: string[] = [];
  const followUps: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^:::\w+\s+.*follow[\s-]?up/i.test(lines[i])) {
      const block = [lines[i]];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') block.push(lines[i++]);
      block.push(':::');
      followUps.push(block.join('\n'));
    } else main.push(lines[i]);
  }
  return { main: main.join('\n').replace(/\n{3,}/g, '\n\n').trim(), followUps };
}

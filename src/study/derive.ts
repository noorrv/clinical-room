import { questionsOf, type QuestionRef, type Specialty } from '../content';
import { record, STATUSES, type Status, type StudyState } from './store';

/* Progress worked out from the study record, by specialty, topic, doctor or any list of questions. */

export interface Tally {
  total: number;
  counts: Record<Status, number>;
  /** share mastered, 0–1 */
  mastered: number;
  /** questions that have been worked on at least once */
  touched: number;
}

export function tally(qs: QuestionRef[], s: StudyState): Tally {
  const counts = Object.fromEntries(STATUSES.map((k) => [k, 0])) as Record<Status, number>;
  qs.forEach((q) => counts[record(s, q.key).status]++);
  const total = qs.length;
  return {
    total,
    counts,
    mastered: total ? counts.mastered / total : 0,
    touched: total - counts['not-started'],
  };
}

export interface GroupProgress {
  id: string;
  name: string;
  questions: QuestionRef[];
  tally: Tally;
}

export function byTopic(sp: Specialty, s: StudyState): GroupProgress[] {
  const qs = questionsOf(sp);
  return sp.topics.map((t) => {
    const items = qs.filter((q) => q.topicIds.includes(t.id));
    return { id: t.id, name: t.name, questions: items, tally: tally(items, s) };
  });
}

export function byDoctor(sp: Specialty, s: StudyState): GroupProgress[] {
  const qs = questionsOf(sp);
  return sp.doctors.map((d) => {
    const items = qs.filter((q) => q.doctorIds.includes(d.id));
    return { id: d.id, name: d.name, questions: items, tally: tally(items, s) };
  });
}

/** A topic counts as mastered when it has questions and every one is mastered. */
export const topicsMastered = (groups: GroupProgress[]) =>
  groups.filter((g) => g.tally.total > 0 && g.tally.counts.mastered === g.tally.total).length;

/** Weakest areas first: most questions needing revision, then lowest mastery among those worked on. */
export function weakest(groups: GroupProgress[]): GroupProgress[] {
  return groups
    .filter((g) => g.tally.counts['needs-revision'] > 0)
    .sort((a, b) => {
      const ra = a.tally.counts['needs-revision'] / a.tally.total;
      const rb = b.tally.counts['needs-revision'] / b.tally.total;
      return rb - ra || a.tally.mastered - b.tally.mastered;
    });
}

export function matches(q: QuestionRef, sp: Specialty, query: string): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  const hay = [
    q.title,
    q.scenario,
    q.question,
    ...q.topicIds.map((id) => sp.topics.find((x) => x.id === id)?.name),
    ...q.doctorIds.map((id) => sp.doctors.find((x) => x.id === id)?.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(t);
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

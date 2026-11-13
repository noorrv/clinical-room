import { allSpecialties, type QuestionRef, type Specialty } from '../../content';
import { specialtyArchive, topicPath } from '../archive/data';

/*
  Every published question once, with where it lives (specialty, subject, topic) and the address
  that opens it in its topic. Used by the student's bookmarks, tracker and goals.
*/

export interface Placed {
  q: QuestionRef;
  sp: Specialty;
  topicId: string;
  topicName: string;
  subjectId: string | null;
  subjectName: string | null;
  href: string;
}

export function placedQuestions(): Placed[] {
  const out: Placed[] = [];
  const seen = new Set<string>();
  for (const sp of allSpecialties()) {
    const subjects = new Map((sp.subjects ?? []).map((x) => [x.id, x.name]));
    for (const sec of specialtyArchive(sp).sections) {
      for (const q of sec.questions) {
        if (seen.has(q.key)) continue;
        seen.add(q.key);
        out.push({
          q,
          sp,
          topicId: sec.id,
          topicName: sec.name,
          subjectId: sec.subjectId ?? null,
          subjectName: sec.subjectId ? (subjects.get(sec.subjectId) ?? null) : null,
          href: `${topicPath(sp, sec.id)}#q-${encodeURIComponent(q.id)}`,
        });
      }
    }
  }
  return out;
}

/** The start of the current week (Monday) or month, or the beginning of time. */
export function periodStart(period: 'week' | 'month' | 'total', now = new Date()): number {
  if (period === 'total') return 0;
  const d = new Date(now.getFullYear(), now.getMonth(), period === 'month' ? 1 : now.getDate());
  if (period === 'week') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

import { allSpecialties, questionsOf, type QuestionRef, type Specialty } from '../../content';
import type { Subject } from '../../content/types';
import { record, type StudyState } from '../../study/store';
import { sheetText } from './StudySheet';

/*
  The archive is worked out from the content already loaded for the visitor (Row Level Security
  decides what that is). It is organised by subject and topic; doctors stay in the data (for
  admins) but are never part of what students browse or see.
*/

export const OTHER = 'other';

export interface Section {
  id: string; // topic id, or OTHER
  name: string;
  number: number;
  subjectId?: string;
  questions: QuestionRef[];
}

export interface Archive {
  sp: Specialty;
  sections: Section[];
  questions: QuestionRef[]; // each question once
}

/**
 * A specialty's questions by topic, whoever asked them. Questions in no known topic are
 * gathered as "Other questions". Topics with no questions are kept, so the boards can show them.
 */
export function specialtyArchive(sp: Specialty): Archive {
  const qs = questionsOf(sp);
  const order = new Map((sp.subjects ?? []).map((x, i) => [x.id, i]));
  const rank = (subjectId?: string) => (subjectId !== undefined && order.has(subjectId) ? order.get(subjectId)! : order.size);
  const sections: Section[] = sp.topics
    .map((t, i) => ({ t, i }))
    .sort((a, b) => rank(a.t.subjectId) - rank(b.t.subjectId) || a.i - b.i)
    .map(({ t }) => ({ id: t.id, name: t.name, number: 0, subjectId: t.subjectId, questions: qs.filter((q) => q.topicIds.includes(t.id)) }));
  // a topic id the content doesn't know (e.g. a private topic) also falls under "Other"
  const known = new Set(sp.topics.map((t) => t.id));
  const loose = qs.filter((q) => !q.topicIds.some((id) => known.has(id)));
  if (loose.length) sections.push({ id: OTHER, name: 'Other questions', number: 0, questions: loose });
  sections.forEach((s, i) => (s.number = i + 1));
  return { sp, sections, questions: qs };
}

/** "Reviewed" in the archive is the site-wide Mastered status, so it counts everywhere. */
export const isReviewed = (st: StudyState, key: string) => record(st, key).status === 'mastered';

export function sectionProgress(st: StudyState, s: { questions: QuestionRef[] }) {
  const done = s.questions.filter((q) => isReviewed(st, q.key)).length;
  return { done, total: s.questions.length, complete: s.questions.length > 0 && done === s.questions.length };
}

export const pad = (n: number) => String(n).padStart(2, '0');

/** The specialty's subject board. */
export const archivePath = (sp: Specialty) => `/specialties/${sp.slug}?tab=subjects`;
export const topicPath = (sp: Specialty, sectionId: string) => `/specialties/${sp.slug}/topics/${sectionId}`;

/* ───────────────────────── search ───────────────────────── */

/** Every piece of text a question holds, in reading order, with the label it sits under. */
export function questionTexts(q: QuestionRef): Array<{ label: string; text: string }> {
  const out: Array<{ label: string; text: string }> = [];
  const add = (label: string, v: string | string[] | undefined) => {
    if (!v) return;
    const text = Array.isArray(v) ? v.join(' · ') : v;
    if (text.trim()) out.push({ label, text });
  };
  add('Title', q.title);
  add('Scenario', q.scenario);
  add('Question', q.question);
  add('Model answer', q.modelAnswer && sheetText(q.modelAnswer));
  add('History', q.history);
  add('Examination', q.examination);
  add('Investigations', q.investigations);
  add('Management', q.management);
  add('Key points', q.keyPoints);
  add('Examiner expects', q.examinerExpects);
  add('Steps', q.steps);
  return out;
}

const norm = (s: string) => s.toLocaleLowerCase();

/** A short window of text around the first match. */
export function excerpt(text: string, term: string, radius = 70): string {
  const i = norm(text).indexOf(norm(term));
  if (i < 0) return text.slice(0, radius * 2) + (text.length > radius * 2 ? '…' : '');
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + term.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

export interface QuestionHit {
  sp: Specialty;
  q: QuestionRef;
  where: string; // the label of the field that matched
  snippet: string;
  /** The topic it sits in, for the link. */
  section: Section;
}

export interface SearchResults {
  subjects: Array<{ sp: Specialty; subject: Subject; count: number }>;
  topics: Array<{ sp: Specialty; section: Section }>;
  questions: QuestionHit[];
}

/** Searches subject and topic names and every word of every question and answer. */
export function searchArchives(term: string, only?: Specialty): SearchResults {
  const t = term.trim();
  const empty: SearchResults = { subjects: [], topics: [], questions: [] };
  if (t.length < 2) return empty;
  const needle = norm(t);
  const res: SearchResults = { subjects: [], topics: [], questions: [] };

  for (const sp of only ? [only] : allSpecialties()) {
    const a = specialtyArchive(sp);
    for (const sub of sp.subjects ?? [])
      if (norm(sub.name).includes(needle))
        res.subjects.push({ sp, subject: sub, count: a.sections.filter((x) => x.subjectId === sub.id).reduce((n, x) => n + x.questions.length, 0) });
    for (const sec of a.sections) if (norm(sec.name).includes(needle)) res.topics.push({ sp, section: sec });
    for (const sec of a.sections)
      for (const q of sec.questions) {
        if (res.questions.some((h) => h.q.key === q.key)) continue;
        const hit = questionTexts(q).find((f) => norm(f.text).includes(needle));
        if (hit) res.questions.push({ sp, q, where: hit.label, snippet: excerpt(hit.text, t), section: sec });
      }
  }
  return res;
}

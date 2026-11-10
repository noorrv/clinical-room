import { allSpecialties, questionsOf, type QuestionRef, type Specialty } from '../../content';
import type { Doctor } from '../../content/types';
import { record, type StudyState } from '../../study/store';

/*
  The doctor archives are worked out from the content already loaded for the visitor (Row Level
  Security decides what that is): no extra tables. A doctor's sections are the topics of the
  questions linked to them; questions with no topic are gathered as "Other questions".
*/

export const OTHER = 'other';

export interface Section {
  id: string; // topic id, or OTHER
  name: string;
  number: number;
  questions: QuestionRef[];
}

export interface Archive {
  sp: Specialty;
  doctor: Doctor;
  sections: Section[];
  questions: QuestionRef[]; // each question once
}

export function doctorArchive(sp: Specialty, doctorId: string): Archive | null {
  const doctor = sp.doctors.find((d) => d.id === doctorId);
  if (!doctor) return null;
  const qs = questionsOf(sp).filter((q) => q.doctorIds.includes(doctorId));
  const sections: Section[] = [];
  for (const t of sp.topics) {
    const items = qs.filter((q) => q.topicIds.includes(t.id));
    if (items.length) sections.push({ id: t.id, name: t.name, number: 0, questions: items });
  }
  // a topic id the content doesn't know (e.g. a private topic) also falls under "Other"
  const known = new Set(sp.topics.map((t) => t.id));
  const loose = qs.filter((q) => !q.topicIds.some((id) => known.has(id)));
  if (loose.length) sections.push({ id: OTHER, name: 'Other questions', number: 0, questions: loose });
  sections.forEach((s, i) => (s.number = i + 1));
  return { sp, doctor, sections, questions: qs };
}

/** "Reviewed" in the archive is the site-wide Mastered status, so it counts everywhere. */
export const isReviewed = (st: StudyState, key: string) => record(st, key).status === 'mastered';

export function sectionProgress(st: StudyState, s: { questions: QuestionRef[] }) {
  const done = s.questions.filter((q) => isReviewed(st, q.key)).length;
  return { done, total: s.questions.length, complete: s.questions.length > 0 && done === s.questions.length };
}

export const pad = (n: number) => String(n).padStart(2, '0');

export const archivePath = (sp: Specialty, doctorId: string) => `/specialties/${sp.slug}/doctors/${doctorId}`;
export const topicPath = (sp: Specialty, doctorId: string, sectionId: string) => `${archivePath(sp, doctorId)}/topics/${sectionId}`;

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
  add('Model answer', q.modelAnswer);
  add('History', q.history);
  add('Examination', q.examination);
  add('Investigations', q.investigations);
  add('Management', q.management);
  add('Key points', q.keyPoints);
  add('Examiner expects', q.examinerExpects);
  add('Steps', q.steps);
  add('Source', q.source);
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
  doctors: Doctor[];
  sectionFor: (doctorId: string) => string;
}

export interface SearchResults {
  doctors: Array<{ sp: Specialty; doctor: Doctor; count: number }>;
  topics: Array<{ sp: Specialty; doctor: Doctor; section: Section }>;
  questions: QuestionHit[];
}

/** Searches doctor names, topic names and every word of every question and answer. */
export function searchArchives(term: string, onlyDoctor?: { sp: Specialty; doctorId: string }): SearchResults {
  const t = term.trim();
  const empty: SearchResults = { doctors: [], topics: [], questions: [] };
  if (t.length < 2) return empty;
  const needle = norm(t);
  const res: SearchResults = { doctors: [], topics: [], questions: [] };

  for (const sp of onlyDoctor ? [onlyDoctor.sp] : allSpecialties()) {
    const doctors = onlyDoctor ? sp.doctors.filter((d) => d.id === onlyDoctor.doctorId) : sp.doctors;
    const archives = new Map(doctors.map((d) => [d.id, doctorArchive(sp, d.id)!]));

    for (const d of doctors) {
      const a = archives.get(d.id)!;
      if (!onlyDoctor && norm(d.name).includes(needle)) res.doctors.push({ sp, doctor: d, count: a.questions.length });
      for (const s of a.sections) if (norm(s.name).includes(needle)) res.topics.push({ sp, doctor: d, section: s });
    }

    for (const q of questionsOf(sp)) {
      const askedBy = doctors.filter((d) => q.doctorIds.includes(d.id));
      if (!askedBy.length) continue;
      const hit = questionTexts(q).find((f) => norm(f.text).includes(needle));
      if (!hit) continue;
      res.questions.push({
        sp,
        q,
        where: hit.label,
        snippet: excerpt(hit.text, t),
        doctors: askedBy,
        sectionFor: (doctorId) => archives.get(doctorId)?.sections.find((s) => s.questions.some((x) => x.key === q.key))?.id ?? OTHER,
      });
    }
  }
  return res;
}

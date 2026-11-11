import { supabase } from '../lib/supabase';
import type { Doctor, Question, QuestionType, SpecialtyContent, SpecialtyId, Subject, Topic } from './types';

/*
  Reads the content from Supabase. Row Level Security decides what comes back: approved students
  and admins get everything; anyone else only rows marked access = 'public'.
*/

const IDS: SpecialtyId[] = ['medicine', 'surgery', 'obgyn', 'paediatrics'];

interface QuestionRow {
  specialty_id: SpecialtyId;
  id: string;
  title: string;
  type: QuestionType;
  scenario: string | null;
  question: string | null;
  model_answer: string | null;
  history: string | null;
  examination: string | null;
  investigations: string | null;
  management: string | null;
  key_points: string[] | null;
  examiner_expects: string[] | null;
  steps: string[] | null;
  minutes: number | null;
  source: string | null;
}

/**
 * Students never see a doctor's name: a title that names one ("Additional questions Dr. Salah
 * might ask") reads "the examiner" instead. Only what the study pages display changes; the
 * stored title, and what admins see, stay exactly as written.
 */
export const maskNames = (title: string) => title.replace(/\b(?:Dr|Doctor|Prof)\.?\s+[A-Z][\p{L}'-]+/gu, 'the examiner').replace(/د\.\s*\S+/g, 'الفاحص');

const opt = <T,>(v: T | null | undefined) => (v === null || v === undefined ? undefined : v);
const optList = (v: string[] | null) => (v && v.length ? v : undefined);

export async function fetchContent(): Promise<Record<SpecialtyId, SpecialtyContent>> {
  const [sp, doc, top, qs, qd, qt] = await Promise.all([
    supabase.from('specialties').select('id, description'),
    supabase.from('doctors').select('specialty_id, id, name, role, note').order('sort').order('name'),
    // subject_id arrived with the subjects migration; until it has run, topics load without it
    supabase
      .from('topics')
      .select('specialty_id, id, name, description, subject_id')
      .order('sort')
      .order('name')
      .then((r) => (r.error ? supabase.from('topics').select('specialty_id, id, name, description').order('sort').order('name') : r)),
    // drafts stay in the admin dashboard; only published questions reach the study pages
    supabase.from('questions').select('*').eq('status', 'published').order('sort').order('title'),
    supabase.from('question_doctors').select('specialty_id, question_id, doctor_id'),
    supabase.from('question_topics').select('specialty_id, question_id, topic_id'),
  ]);
  // subjects are optional: a site without the subjects table yet still loads everything else
  const subs = await supabase.from('subjects').select('specialty_id, id, name, description').order('sort').order('name');
  const failed = [sp, doc, top, qs, qd, qt].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const out = Object.fromEntries(
    IDS.map((id) => [id, { id, description: '', doctors: [] as Doctor[], subjects: [] as Subject[], topics: [] as Topic[], questions: [] as Question[] }]),
  ) as Record<SpecialtyId, SpecialtyContent>;

  for (const s of sp.data ?? []) if (out[s.id as SpecialtyId]) out[s.id as SpecialtyId].description = s.description ?? '';
  for (const d of doc.data ?? []) out[d.specialty_id as SpecialtyId]?.doctors.push({ id: d.id, name: d.name, role: opt(d.role), note: opt(d.note) });
  for (const t of (top.data ?? []) as Array<{ specialty_id: string; id: string; name: string; description: string | null; subject_id?: string | null }>)
    out[t.specialty_id as SpecialtyId]?.topics.push({ id: t.id, name: t.name, description: opt(t.description), subjectId: opt(t.subject_id) });
  if (!subs.error)
    for (const s of subs.data ?? []) out[s.specialty_id as SpecialtyId]?.subjects?.push({ id: s.id, name: s.name, description: opt(s.description) });
  else if (import.meta.env.DEV) {
    // development preview of the boards before the subjects migration has run (never in production)
    const { PREVIEW_SUBJECTS, PREVIEW_TOPIC_SUBJECT } = await import('../dev/subjectsPreview');
    for (const id of IDS) {
      out[id].subjects = (PREVIEW_SUBJECTS[id] ?? []).map(([sid, name]) => ({ id: sid, name }));
      for (const t of out[id].topics) t.subjectId ??= PREVIEW_TOPIC_SUBJECT[t.id];
    }
  }

  const linksFor = (rows: Array<Record<string, string>> | null, key: string) => {
    const m = new Map<string, string[]>();
    for (const r of rows ?? []) {
      const k = `${r.specialty_id}/${r.question_id}`;
      m.set(k, [...(m.get(k) ?? []), r[key]]);
    }
    return m;
  };
  const docLinks = linksFor(qd.data as Array<Record<string, string>> | null, 'doctor_id');
  const topLinks = linksFor(qt.data as Array<Record<string, string>> | null, 'topic_id');

  for (const q of (qs.data ?? []) as QuestionRow[]) {
    const k = `${q.specialty_id}/${q.id}`;
    out[q.specialty_id]?.questions.push({
      id: q.id,
      title: maskNames(q.title),
      type: q.type,
      doctorIds: docLinks.get(k) ?? [],
      topicIds: topLinks.get(k) ?? [],
      scenario: opt(q.scenario),
      question: opt(q.question),
      modelAnswer: opt(q.model_answer),
      history: opt(q.history),
      examination: opt(q.examination),
      investigations: opt(q.investigations),
      management: opt(q.management),
      keyPoints: optList(q.key_points),
      examinerExpects: optList(q.examiner_expects),
      steps: optList(q.steps),
      minutes: opt(q.minutes),
      source: opt(q.source),
    });
  }
  return out;
}

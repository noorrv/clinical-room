import type { QuestionType, SpecialtyId } from '../../content/types';
import { supabase } from '../../lib/supabase';
import { friendlyError } from './ui';

/*
  Questions as the admin dashboard handles them: the database row (snake_case columns), the
  editor's form (plain strings; lists as one item per line), and saving with link changes.
*/

export type QStatus = 'draft' | 'published';

export interface QuestionRow {
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
  key_points: string[];
  examiner_expects: string[];
  steps: string[];
  minutes: number | null;
  source: string | null;
  sort: number;
  access: 'approved' | 'public';
  status: QStatus;
  created_at: string;
  updated_at: string;
}

export interface QuestionForm {
  specialty_id: SpecialtyId;
  id: string;
  title: string;
  type: QuestionType;
  scenario: string;
  question: string;
  model_answer: string;
  history: string;
  examination: string;
  investigations: string;
  management: string;
  key_points: string;
  examiner_expects: string;
  steps: string;
  minutes: string;
  source: string;
  sort: string;
  access: 'approved' | 'public';
  status: QStatus;
  doctorIds: string[];
  topicIds: string[];
}

export const TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'station', label: 'OSCE station' },
  { value: 'case', label: 'Clinical case' },
  { value: 'viva', label: 'Viva' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other question' },
];

export const TEXT_FIELDS = ['scenario', 'question', 'model_answer', 'history', 'examination', 'investigations', 'management'] as const;
export const LIST_FIELDS = ['key_points', 'examiner_expects', 'steps'] as const;

/** The study page's camelCase section keys, mapped to database columns. */
export const COLUMN_OF: Record<string, (typeof TEXT_FIELDS)[number] | (typeof LIST_FIELDS)[number]> = {
  scenario: 'scenario',
  question: 'question',
  modelAnswer: 'model_answer',
  history: 'history',
  examination: 'examination',
  investigations: 'investigations',
  management: 'management',
  keyPoints: 'key_points',
  examinerExpects: 'examiner_expects',
  steps: 'steps',
};

export const blankForm = (specialty: SpecialtyId): QuestionForm => ({
  specialty_id: specialty,
  id: '',
  title: '',
  type: 'station',
  scenario: '',
  question: '',
  model_answer: '',
  history: '',
  examination: '',
  investigations: '',
  management: '',
  key_points: '',
  examiner_expects: '',
  steps: '',
  minutes: '',
  source: '',
  sort: '0',
  access: 'approved',
  status: 'draft',
  doctorIds: [],
  topicIds: [],
});

export function toForm(r: QuestionRow, doctorIds: string[], topicIds: string[]): QuestionForm {
  return {
    specialty_id: r.specialty_id,
    id: r.id,
    title: r.title,
    type: r.type,
    scenario: r.scenario ?? '',
    question: r.question ?? '',
    model_answer: r.model_answer ?? '',
    history: r.history ?? '',
    examination: r.examination ?? '',
    investigations: r.investigations ?? '',
    management: r.management ?? '',
    key_points: (r.key_points ?? []).join('\n'),
    examiner_expects: (r.examiner_expects ?? []).join('\n'),
    steps: (r.steps ?? []).join('\n'),
    minutes: r.minutes == null ? '' : String(r.minutes),
    source: r.source ?? '',
    sort: String(r.sort ?? 0),
    access: r.access,
    status: r.status,
    doctorIds,
    topicIds,
  };
}

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** The columns to write, from the form. Empty text becomes null so the study page hides it. */
export function toColumns(f: QuestionForm) {
  const text = Object.fromEntries(TEXT_FIELDS.map((k) => [k, f[k].trim() || null]));
  const lists = Object.fromEntries(LIST_FIELDS.map((k) => [k, lines(f[k])]));
  return {
    title: f.title.trim(),
    type: f.type,
    ...text,
    ...lists,
    minutes: f.minutes.trim() ? parseInt(f.minutes, 10) : null,
    source: f.source.trim() || null,
    sort: parseInt(f.sort, 10) || 0,
    access: f.access,
    status: f.status,
  };
}

/** True when the given / answer sections hold anything at all. */
export const hasContent = (f: QuestionForm) => [...TEXT_FIELDS, ...LIST_FIELDS].some((k) => f[k].trim() !== '');

export interface Lookups {
  doctors: Array<{ specialty_id: SpecialtyId; id: string; name: string }>;
  topics: Array<{ specialty_id: SpecialtyId; id: string; name: string }>;
}

export async function loadLookups(): Promise<Lookups> {
  const [d, t] = await Promise.all([
    supabase.from('doctors').select('specialty_id, id, name').order('sort').order('name'),
    supabase.from('topics').select('specialty_id, id, name').order('sort').order('name'),
  ]);
  if (d.error || t.error) throw new Error(friendlyError(d.error ?? t.error));
  return { doctors: (d.data ?? []) as Lookups['doctors'], topics: (t.data ?? []) as Lookups['topics'] };
}

export async function loadQuestion(sp: string, id: string): Promise<QuestionForm | null> {
  const [q, qd, qt] = await Promise.all([
    supabase.from('questions').select('*').eq('specialty_id', sp).eq('id', id).maybeSingle(),
    supabase.from('question_doctors').select('doctor_id').eq('specialty_id', sp).eq('question_id', id),
    supabase.from('question_topics').select('topic_id').eq('specialty_id', sp).eq('question_id', id),
  ]);
  const failed = [q, qd, qt].find((r) => r.error);
  if (failed?.error) throw new Error(friendlyError(failed.error));
  if (!q.data) return null;
  return toForm(
    q.data as QuestionRow,
    (qd.data ?? []).map((r) => r.doctor_id),
    (qt.data ?? []).map((r) => r.topic_id),
  );
}

/**
 * Saves a question, then brings its examiner and topic links in line with the form
 * (adding and removing only what changed). Returns an error sentence, or null.
 */
export async function saveQuestion(f: QuestionForm, isNew: boolean, before?: { doctorIds: string[]; topicIds: string[] }): Promise<string | null> {
  const cols = toColumns(f);
  const res = isNew
    ? await supabase.from('questions').insert({ ...cols, specialty_id: f.specialty_id, id: f.id })
    : await supabase.from('questions').update(cols).eq('specialty_id', f.specialty_id).eq('id', f.id);
  if (res.error) return friendlyError(res.error);

  const was = before ?? { doctorIds: [], topicIds: [] };
  const diff = (now: string[], then: string[]) => ({ add: now.filter((x) => !then.includes(x)), remove: then.filter((x) => !now.includes(x)) });
  const d = diff(f.doctorIds, was.doctorIds);
  const t = diff(f.topicIds, was.topicIds);
  const base = { specialty_id: f.specialty_id, question_id: f.id };

  const jobs = [
    d.add.length ? supabase.from('question_doctors').insert(d.add.map((doctor_id) => ({ ...base, doctor_id }))) : null,
    d.remove.length ? supabase.from('question_doctors').delete().eq('specialty_id', f.specialty_id).eq('question_id', f.id).in('doctor_id', d.remove) : null,
    t.add.length ? supabase.from('question_topics').insert(t.add.map((topic_id) => ({ ...base, topic_id }))) : null,
    t.remove.length ? supabase.from('question_topics').delete().eq('specialty_id', f.specialty_id).eq('question_id', f.id).in('topic_id', t.remove) : null,
  ].filter(Boolean);
  const results = await Promise.all(jobs);
  const failed = results.find((r) => r && r.error);
  if (failed && failed.error) return `The question was saved, but its examiner or topic links weren’t: ${friendlyError(failed.error)}`;
  return null;
}

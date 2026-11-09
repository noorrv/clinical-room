import { specialties as homeCards } from '../data/homepage';
import medicine from './medicine';
import obgyn from './obgyn';
import paediatrics from './paediatrics';
import { placeholderContent, previewRequested } from './placeholder-preview';
import surgery from './surgery';
import type { Doctor, Question, SpecialtyContent, SpecialtyId, Topic } from './types';

/*
  The single registry every page reads from. Each specialty = its homepage card (title, short name,
  card points, address) + its content file + a small identity (accent colour and an archive mark),
  so the four dashboards share one design without looking identical.
*/

export interface SpecialtyIdentity {
  /** accent used for tabs, stamps and rules on this specialty's pages */
  accent: string;
  accentSoft: string;
  /** text and icons placed on the accent fill */
  onAccent: string;
  /** the accent used as text or lines on the ivory paper (darker when the fill is light) */
  ink: string;
  /** roman numeral used as the archive volume mark */
  volume: string;
}

const identities: Record<SpecialtyId, SpecialtyIdentity> = {
  medicine: { accent: '#6f1d1b', accentSoft: '#e9cfc6', onAccent: '#f7efdf', ink: '#6f1d1b', volume: 'I' },
  surgery: { accent: '#3b2330', accentSoft: '#ddcfd6', onAccent: '#f7efdf', ink: '#3b2330', volume: 'II' },
  obgyn: { accent: '#9a4f5a', accentSoft: '#f0d8d6', onAccent: '#f7efdf', ink: '#8a4250', volume: 'III' },
  // subtle light blue: plum text on the fill, a deeper dusty blue for text and lines on the paper
  paediatrics: { accent: '#bcd2e3', accentSoft: '#e1ebf3', onAccent: '#3b2330', ink: '#4a6d88', volume: 'IV' },
};

const files: Record<SpecialtyId, SpecialtyContent> = { medicine, surgery, obgyn, paediatrics };

export interface Specialty extends SpecialtyContent, SpecialtyIdentity {
  title: string;
  shortName: string;
  slug: string;
  points: string[];
  /** true while the development placeholder preview is on */
  isPreview: boolean;
}

/** A question with its specialty and a key that is unique across the whole site. */
export interface QuestionRef extends Question {
  specialtyId: SpecialtyId;
  key: string;
}

let cache: Specialty[] | null = null;

export function allSpecialties(): Specialty[] {
  if (cache) return cache;
  const preview = previewRequested();
  cache = homeCards.map((card) => {
    const fileContent = files[card.id];
    const useFixture = preview && fileContent.questions.length === 0;
    let content = useFixture ? placeholderContent(card.id) : fileContent;
    // the preview keeps any real doctors already added, linking its placeholder questions to them
    if (useFixture && fileContent.doctors.length) {
      const real = fileContent.doctors;
      content = {
        ...content,
        doctors: real,
        questions: content.questions.map((q, i) => ({ ...q, doctorIds: [real[i % Math.min(3, real.length)].id] })),
      };
    }
    return {
      ...content,
      ...identities[card.id],
      title: card.title,
      shortName: card.shortName,
      slug: card.href.replace(/^\/specialties\//, ''),
      points: card.points,
      isPreview: useFixture,
    };
  });
  return cache;
}

export function specialtyBySlug(slug: string | undefined): Specialty | undefined {
  return allSpecialties().find((s) => s.slug === slug);
}

export function specialtyById(id: SpecialtyId): Specialty {
  return allSpecialties().find((s) => s.id === id)!;
}

export const questionKey = (specialtyId: SpecialtyId, id: string) => `${specialtyId}/${id}`;

export function questionsOf(s: Specialty): QuestionRef[] {
  return s.questions.map((q) => ({ ...q, specialtyId: s.id, key: questionKey(s.id, q.id) }));
}

export function allQuestions(): QuestionRef[] {
  return allSpecialties().flatMap(questionsOf);
}

export function findQuestion(key: string): { specialty: Specialty; question: QuestionRef } | undefined {
  const [sid, qid] = key.split('/');
  const specialty = allSpecialties().find((s) => s.id === sid);
  const q = specialty?.questions.find((x) => x.id === qid);
  return specialty && q ? { specialty, question: { ...q, specialtyId: specialty.id, key } } : undefined;
}

export const topicName = (s: Specialty, id: string): string => s.topics.find((t: Topic) => t.id === id)?.name ?? id;
export const doctorName = (s: Specialty, id: string): string => s.doctors.find((d: Doctor) => d.id === id)?.name ?? id;

export const questionPath = (s: Specialty, qid: string) => `/specialties/${s.slug}/questions/${qid}`;

export const TYPE_LABEL: Record<Question['type'], string> = {
  station: 'OSCE station',
  case: 'Clinical case',
  viva: 'Viva',
  procedure: 'Procedure',
  other: 'Question',
};

export type { Doctor, Question, QuestionType, SpecialtyContent, SpecialtyId, Topic } from './types';

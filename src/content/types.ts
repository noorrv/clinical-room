/*
  The content model for every specialty. One shape for all of them: the dashboards, search,
  tracker and Mock OSCE are generated from this data, so adding a specialty or a question is a
  data change, never a new page. See src/content/README.md for how to fill it in.
*/

export type SpecialtyId = 'medicine' | 'surgery' | 'obgyn' | 'paediatrics';

/** What kind of question this is. The study page shows the sections that suit each type. */
export type QuestionType =
  | 'station' // an OSCE station: scenario, task, examiner checklist
  | 'case' // a long or short case: history, examination, investigations, management
  | 'viva' // examiner questions with model answers
  | 'procedure' // a practical skill, step by step
  | 'other';

export interface Doctor {
  id: string;
  name: string;
  /** e.g. "Consultant Surgeon". Optional. */
  role?: string;
  /** Anything students should know about this examiner's style. Optional. */
  note?: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
}

export interface Question {
  /** Unique within its specialty, used in the page address. Letters, numbers and dashes. */
  id: string;
  title: string;
  type: QuestionType;
  topicIds: string[];
  doctorIds: string[];

  /* Every section below is optional. Only the sections a question has are shown. */
  scenario?: string;
  question?: string;
  modelAnswer?: string;
  history?: string;
  examination?: string;
  investigations?: string;
  management?: string;
  keyPoints?: string[];
  /** What the examiner expects to hear or see. Also used as the Mock OSCE checklist. */
  examinerExpects?: string[];
  /** Steps for a procedure. */
  steps?: string[];
  /** Station time in minutes, for Mock OSCE. Defaults to the Mock OSCE setting. */
  minutes?: number;
  /** Where this came from (e.g. "Dr. Hassan, 2025 exam"). */
  source?: string;
}

export interface SpecialtyContent {
  id: SpecialtyId;
  /** Short description shown on the dashboard. Empty until written. */
  description: string;
  doctors: Doctor[];
  topics: Topic[];
  questions: Question[];
}

import type { PatientLook } from '../Patient';

/*
  A playable case, entirely as data: the engine knows nothing about jaundice. A new case (any
  specialty) is a new file of this shape.

  Facts: everything the student can discover (an answer, a sign, a result) has a fact id. Facts
  fill the patient chart and are what the differential board weighs for and against each
  diagnosis, so the board only ever shows evidence the student has actually found.

  Value of a choice: 'key' (+3), 'useful' (+1), 'low' (−1: costs a point and the consultant says
  why), 'harmful' (−3). Random clicking therefore loses points rather than gaining them.
*/

export type Value = 'key' | 'useful' | 'low' | 'harmful';

export type ChartSection = 'Presentation' | 'History' | 'Past history' | 'Drugs' | 'Social' | 'Family' | 'Examination' | 'Vital signs' | 'Results';

export interface Fact {
  id: string;
  section: ChartSection;
  /** How it reads in the chart and on the board: "Dark urine for 2 weeks". */
  text: string;
  /** A finding that points away from something is worth showing as a negative. */
  negative?: boolean;
}

export interface Choice {
  id: string;
  label: string;
  value: Value;
  /** What the student sees or hears when choosing it. */
  reply: string;
  replyBy: 'patient' | 'note' | 'consultant';
  facts?: string[];
  /** The consultant's comment: why it mattered, or why it didn't. */
  teach?: string;
}

export interface HistoryChoice extends Choice {
  group: 'Presenting illness' | 'Past history' | 'Drugs' | 'Social' | 'Family';
}

export interface ResultRow {
  name: string;
  value: string;
  unit?: string;
  range?: string;
  flag?: 'H' | 'L';
}

export interface Test extends Choice {
  category: 'Haematology' | 'Biochemistry' | 'Microbiology & serology' | 'Imaging' | 'Special';
  /** A lab table, or a written imaging report. */
  rows?: ResultRow[];
  report?: string;
  /** Best ordered after these tests: ordered earlier, it scores as 'useful' and the consultant says why. */
  after?: string[];
}

export interface Checkpoint {
  id: string;
  /** Asked once all these choices have been made (tests, or examination items). */
  when: string[];
  question: string;
  options: Array<{ text: string; correct?: boolean; explain: string }>;
  points: number;
}

export interface Diagnosis {
  id: string;
  name: string;
  for: string[];
  against: string[];
  /**
   * Board scoring: the answer, a reasonable alternative to keep, one the evidence rules out, or
   * 'open': fair to keep early and to strike once later results are back, so it scores neither way.
   */
  role: 'answer' | 'keep' | 'exclude' | 'open';
}

export interface Pick {
  id: string;
  text: string;
  correct?: boolean;
  explain: string;
}

export interface CaseData {
  id: string;
  number: string;
  title: string;
  approachId: string;
  patient: {
    name: string;
    age: number;
    sex: 'Male' | 'Female';
    complaint: string;
    look: PatientLook;
  };
  vitals: { heartRate: number; spo2: number };
  facts: Fact[];
  intro: Array<{ who: 'patient' | 'consultant' | 'note'; text: string }>;
  /** The first look at the patient: safety before cause. */
  firstLook: Choice[];
  history: HistoryChoice[];
  /** History questions before the examination opens. */
  minHistory: number;
  exam: Choice[];
  minExam: number;
  tests: Test[];
  checkpoints: Checkpoint[];
  differentials: Diagnosis[];
  /** The test results needed before the diagnosis can be made. */
  diagnosisNeeds: string[];
  diagnosis: { question: string; options: Pick[]; points: number };
  management: { question: string; options: Pick[]; points: number };
  hints: Partial<Record<Stage, string>>;
  /** Shown in the report: the reasoning, start to finish. */
  reasoning: string[];
  /** Sections of the written approach to revise, by what the student missed. */
  revise: Array<{ when: 'history' | 'exam' | 'tests' | 'interpretation' | 'differential' | 'diagnosis'; text: string }>;
  closing: string;
}

export const STAGES = ['patient', 'history', 'examination', 'investigations', 'differential', 'diagnosis'] as const;
export type Stage = (typeof STAGES)[number];

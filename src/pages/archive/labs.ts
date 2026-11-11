/*
  Laboratory reference values shown beside the lab terms of a recorded answer ("hypokalaemia",
  "lactate", "haemoglobin"…). One table for the whole site, so a term means the same thing on
  every page and a correction is made once.

  These are standard adult teaching ranges in SI units, with conventional units where they are
  commonly quoted. Laboratories differ slightly: every card says so.
*/

export type Dir = 'low' | 'high' | 'none';

export interface Band {
  label: string;
  /** null = open-ended */
  from: number | null;
  to: number | null;
}

export interface Lab {
  id: string;
  name: string;
  unit: string;
  /** The normal range. */
  low: number;
  high: number;
  /** Decimal places to print (5.0, not 5). */
  dp?: number;
  /** The span the bar draws. */
  scale: [number, number];
  /** Conventional units, e.g. "8.8–10.4 mg/dL". */
  alt?: string;
  /** Severity bands or thresholds worth knowing. */
  bands?: Band[];
  note?: string;
  /** Normal range differs by sex: shown as a line, the bar uses the first. */
  sexes?: string;
}

export interface LabHit {
  lab: Lab;
  dir: Dir;
  /** "Low potassium" */
  meaning?: string;
}

export const LABS: Record<string, Lab> = {
  k: {
    id: 'k',
    dp: 1,
    name: 'Potassium (K⁺)',
    unit: 'mmol/L',
    low: 3.5,
    high: 5.0,
    scale: [2, 7],
    bands: [
      { label: 'Mild hypokalaemia', from: 3.0, to: 3.4 },
      { label: 'Moderate', from: 2.5, to: 2.9 },
      { label: 'Severe', from: null, to: 2.5 },
      { label: 'Severe hyperkalaemia', from: 6.5, to: null },
    ],
  },
  na: {
    id: 'na',
    name: 'Sodium (Na⁺)',
    unit: 'mmol/L',
    low: 135,
    high: 145,
    scale: [115, 160],
    bands: [
      { label: 'Mild hyponatraemia', from: 130, to: 134 },
      { label: 'Moderate', from: 125, to: 129 },
      { label: 'Severe', from: null, to: 125 },
    ],
  },
  cl: { id: 'cl', name: 'Chloride (Cl⁻)', unit: 'mmol/L', low: 98, high: 106, scale: [85, 120] },
  ca: {
    id: 'ca',
    dp: 2,
    name: 'Calcium, adjusted (Ca²⁺)',
    unit: 'mmol/L',
    low: 2.2,
    high: 2.6,
    scale: [1.6, 3.2],
    alt: '8.8–10.4 mg/dL',
    bands: [{ label: 'Severe hypocalcaemia', from: null, to: 1.9 }],
  },
  hco3: {
    id: 'hco3',
    name: 'Bicarbonate (HCO₃⁻)',
    unit: 'mmol/L',
    low: 22,
    high: 26,
    scale: [10, 40],
    note: 'With blood pH: normal 7.35–7.45. Alkalosis: pH above 7.45; acidosis: below 7.35.',
  },
  lactate: {
    id: 'lactate',
    dp: 1,
    name: 'Lactate',
    unit: 'mmol/L',
    low: 0.5,
    high: 2.0,
    scale: [0, 6],
    bands: [
      { label: 'Raised', from: 2, to: 4 },
      { label: 'Severe (shock, ischaemia)', from: 4, to: null },
    ],
  },
  be: {
    id: 'be',
    name: 'Base excess',
    unit: 'mmol/L',
    low: -2,
    high: 2,
    scale: [-14, 6],
    note: 'A base deficit is a negative base excess.',
    bands: [
      { label: 'Mild deficit', from: -6, to: -2 },
      { label: 'Moderate', from: -10, to: -6 },
      { label: 'Severe', from: null, to: -10 },
    ],
  },
  hb: {
    id: 'hb',
    name: 'Haemoglobin (Hb)',
    unit: 'g/L',
    low: 130,
    high: 170,
    scale: [60, 200],
    sexes: 'Men 130–170 g/L (13–17 g/dL) · Women 120–150 g/L (12–15 g/dL)',
  },
  hct: {
    id: 'hct',
    name: 'Haematocrit (Hct)',
    unit: '%',
    low: 40,
    high: 50,
    scale: [20, 65],
    sexes: 'Men 40–50% · Women 36–46%',
  },
  plt: { id: 'plt', name: 'Platelets', unit: '× 10⁹/L', low: 150, high: 400, scale: [0, 600] },
  crp: { id: 'crp', name: 'C-reactive protein (CRP)', unit: 'mg/L', low: 0, high: 5, scale: [0, 50], note: 'Normal is below 5 mg/L.' },
  urea: { id: 'urea', dp: 1, name: 'Urea', unit: 'mmol/L', low: 2.5, high: 7.8, scale: [0, 20], alt: 'BUN 7–20 mg/dL' },
  bili: {
    id: 'bili',
    name: 'Bilirubin, total',
    unit: 'µmol/L',
    low: 3,
    high: 21,
    scale: [0, 80],
    alt: '0.2–1.2 mg/dL',
    note: 'Jaundice is usually visible above about 40–50 µmol/L.',
  },
  alp: { id: 'alp', name: 'Alkaline phosphatase (ALP)', unit: 'U/L', low: 30, high: 130, scale: [0, 400] },
  amylase: {
    id: 'amylase',
    name: 'Amylase',
    unit: 'U/L',
    low: 30,
    high: 110,
    scale: [0, 450],
    note: 'Upper limit varies by laboratory. More than 3 × the upper limit supports acute pancreatitis.',
  },
};

/** Terms in the text and the value each points to. Tried in order; the longest forms first. */
const RULES: Array<[RegExp, string, Dir, string?]> = [
  [/\bhypokal(a)?emia\b/i, 'k', 'low', 'Low potassium'],
  [/\bhyperkal(a)?emia\b/i, 'k', 'high', 'High potassium'],
  [/\bhyponatr(a)?emia\b/i, 'na', 'low', 'Low sodium'],
  [/\bhypernatr(a)?emia\b/i, 'na', 'high', 'High sodium'],
  [/\bhypochlor(a)?emia\b/i, 'cl', 'low', 'Low chloride'],
  [/\bhypocalc(a)?emia\b/i, 'ca', 'low', 'Low calcium'],
  [/\bhypercalc(a)?emia\b/i, 'ca', 'high', 'High calcium'],
  [/\bmetabolic alkalosis\b/i, 'hco3', 'high', 'Bicarbonate high, pH above 7.45'],
  [/\bmetabolic acidosis\b/i, 'hco3', 'low', 'Bicarbonate low, pH below 7.35'],
  [/\blactic acidosis\b/i, 'lactate', 'high', 'Raised lactate with acidosis'],
  [/\blactate\b/i, 'lactate', 'none'],
  [/\bbase deficit\b/i, 'be', 'low', 'Negative base excess'],
  [/\b[Hh](a)?emoglobin\b|\bHb\b/, 'hb', 'none'],
  [/\bh(a)?ematocrit\b/i, 'hct', 'none'],
  [/\bplatelet(s| count)?\b/i, 'plt', 'none'],
  [/\bCRP\b/, 'crp', 'none'],
  [/\burea\b/i, 'urea', 'none'],
  [/\bbilirubin\b/i, 'bili', 'none'],
  [/\bALP\b/, 'alp', 'none'],
  [/\bamylase\b/i, 'amylase', 'none'],
];

const ANY = new RegExp(RULES.map(([re]) => `(?:${re.source})`).join('|'), 'gi');

/** An invisible mark placed before the first mention of each lab value in an answer. */
export const FIRST = '\u2063';

const ruleFor = (word: string) => RULES.find(([re]) => new RegExp(`^(?:${re.source})$`, re.flags.replace('g', '')).test(word));

/**
 * Marks the first mention of each lab value in a whole answer, so only that one opens a card:
 * an answer that says "bilirubin" twenty times gets one underline, not twenty.
 */
export function markFirstLabs(text: string): string {
  const seen = new Set<string>();
  return text.replace(ANY, (word) => {
    const rule = ruleFor(word);
    if (!rule || seen.has(rule[1])) return word;
    seen.add(rule[1]);
    return FIRST + word;
  });
}

/** Splits text into plain runs and lab terms (only the mentions markFirstLabs marked). */
export function splitLabs(text: string): Array<string | { text: string; hit: LabHit }> {
  if (!text.includes(FIRST)) return [text];
  const out: Array<string | { text: string; hit: LabHit }> = [];
  const parts = text.split(FIRST);
  if (parts[0]) out.push(parts[0]);
  for (const part of parts.slice(1)) {
    ANY.lastIndex = 0;
    const m = ANY.exec(part);
    const rule = m && m.index === 0 ? ruleFor(m[0]) : undefined;
    if (!m || !rule) {
      if (part) out.push(part);
      continue;
    }
    out.push({ text: m[0], hit: { lab: LABS[rule[1]], dir: rule[2], meaning: rule[3] } });
    if (part.length > m[0].length) out.push(part.slice(m[0].length));
  }
  return out;
}

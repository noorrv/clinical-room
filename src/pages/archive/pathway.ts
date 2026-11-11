/*
  Clinical pathways: finding the stage-by-stage sequences already written in a recorded answer
  ("obstruction → raised pressure → ischaemia → …", or lines joined by a "↓"), so they can be
  shown as a pathway the student steps through. Nothing here changes the words: a chain is split
  only at its arrows, every stage keeps its original markup, and text around the chain is kept
  in order. An answer with no suitable chain renders exactly as before.
*/

export const ARROW_RE = /\s*(?:→|⟶|⇒)\s*/;
const ARROW_G = /→|⟶|⇒/g;
const DOWN = /^\s*[↓⬇]\s*$/;

/** A chain needs at least this many stages to become a pathway; shorter ones stay inline. */
export const MIN_STAGES = 4;
/** A "stage" longer than this is prose, not a stage: the paragraph is left as it is. */
const MAX_STAGE_WORDS = 14;

export interface Chain {
  /** "Progression" in "Progression: a → b → c". */
  lead?: string;
  stages: string[];
  /** Sentences before and after the chain in the same paragraph, kept in place. */
  before?: string;
  after?: string;
  vertical: boolean;
}

const words = (s: string) => plain(s).split(/\s+/).filter(Boolean).length;

/** The words of a piece of sheet markup, tags and bold marks removed. */
export function plain(s: string): string {
  return s.replace(/\[\[\w+:([^\]]+)\]\]/g, '$1').replace(/\*\*|\*/g, '');
}

/** Finds a pathway in one paragraph of an answer, or null when it should stay a paragraph. */
export function findChain(p: string): Chain | null {
  const lines = p.split('\n');

  // a vertical chain: stages on their own lines, each joined to the next by a "↓" line
  if (lines.filter((l) => DOWN.test(l)).length >= 2) {
    const stages: string[] = [];
    let cur: string[] = [];
    for (const l of lines) {
      if (DOWN.test(l)) {
        if (cur.length !== 1) return null;
        stages.push(cur[0].trim());
        cur = [];
      } else if (l.trim()) cur.push(l);
    }
    if (cur.length !== 1) return null;
    stages.push(cur[0].trim());
    if (stages.length < 3 || stages.some((s) => words(s) > 24)) return null;
    return { stages, vertical: true };
  }

  // a horizontal chain sits on one line, as one sentence among others
  if (lines.length !== 1) return null;
  const text = p.trim();
  if ((text.match(ARROW_G) ?? []).length < MIN_STAGES - 1) return null;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z[*])/);
  const at = sentences.findIndex((s) => (s.match(ARROW_G) ?? []).length >= MIN_STAGES - 1);
  if (at < 0) return null;
  const parts = sentences[at].split(ARROW_RE);
  let lead: string | undefined;
  const first = parts[0].match(/^(.{1,40}?):\s+(.+)$/);
  if (first && words(first[1]) <= 4) {
    lead = first[1];
    parts[0] = first[2];
  }
  const last = parts.length - 1;
  parts[last] = parts[last].replace(/\.\s*$/, '');
  const stages = parts.map((s) => s.trim());
  if (stages.some((s) => !s || words(s) > MAX_STAGE_WORDS)) return null;
  return {
    lead,
    stages,
    before: sentences.slice(0, at).join(' ') || undefined,
    after: sentences.slice(at + 1).join(' ') || undefined,
    vertical: false,
  };
}

/* ───────────── matching stages to the answer's own explanations ───────────── */

const STOP = new Set(
  'with from into that this than then they them their there which while when where what also only more most less such each other some very about after before during through between under over usually causes causing cause caused leads leading due may can will does have has been being both either within without against'.split(
    ' ',
  ),
);

/** Word stems, spelling-normalised (ischaemia = ischemia), for loose matching. */
export function stems(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of plain(s)
    .toLowerCase()
    .replace(/ae/g, 'e')
    .replace(/oe/g, 'e')
    .split(/[^a-z]+/)) {
    if (w.length < 4 || STOP.has(w)) continue;
    out.add(w.slice(0, 7));
  }
  return out;
}

/**
 * For each stage, the index of the explanation (a numbered step of the same answer) that it
 * summarises, or -1. Rare shared words count for more than common ones, and between equal
 * matches the one that keeps the steps in order wins.
 */
export function matchStages(stages: string[], explanations: string[], ignore: Set<string> = new Set()): number[] {
  const ex = explanations.map(stems);
  const n = ex.length;
  if (!n) return stages.map(() => -1);
  const df = new Map<string, number>();
  for (const set of ex) for (const s of set) df.set(s, (df.get(s) ?? 0) + 1);
  // a word no step uses is as telling as the rarest one
  const idf = (s: string) => Math.log(1 + n / Math.max(1, df.get(s) ?? 0));
  let prev = -1;
  return stages.map((stage) => {
    // the question's own subject ("obstruction" in a question about obstruction) tells nothing
    const st = [...stems(stage)].filter((s) => !ignore.has(s));
    const mass = st.reduce((a, s) => a + idf(s), 0);
    if (!mass) return -1;
    let best = -1;
    let bestScore = 0;
    let bestRaw = 0;
    ex.forEach((set, i) => {
      let raw = 0;
      for (const s of st) if (set.has(s)) raw += idf(s);
      // between equally good steps, the one after the last match keeps the order
      const score = i <= prev ? raw * 0.85 : raw;
      if (score > bestScore + 1e-9) {
        best = i;
        bestScore = score;
        bestRaw = raw;
      }
    });
    // the step must carry at least half of what the stage says, and more than a common word
    if (best < 0 || bestRaw / mass < 0.5 || bestRaw < Math.log(1 + 1.6)) return -1;
    prev = best;
    return best;
  });
}

/* ───────────── semantic colour of a stage ───────────── */

export type StageKind = 'art' | 'vein' | 'anat' | 'nerve' | 'warn' | 'pearl' | 'plain';

const KIND_RULES: Array<[StageKind, RegExp]> = [
  ['warn', /perforat|periton|sepsis|septic|shock|death|abscess|multi-?organ|emergenc|dehydrat|\baki\b|haemodynamic instab/i],
  ['art', /arter|isch(a)?em|gangren|necros|infarct|ha?emorrh|bleed/i],
  ['vein', /\bven(ous|ule)|congest|lymphat|portal/i],
  ['nerve', /nerve|neural|dermatom|referred pain|visceral pain/i],
  ['pearl', /pressure|distens|inflam|accumul|obstruct|oedema|edema|fibrin|collagen|bacteri|adhesion|secret|swell/i],
];

/** A stage's colour: the first coloured term it carries, else what its words describe. */
export function stageKind(stage: string): StageKind {
  const tag = stage.match(/\[\[(art|vein|anat|nerve|warn|pearl):/);
  if (tag) return tag[1] as StageKind;
  const t = plain(stage);
  for (const [k, re] of KIND_RULES) if (re.test(t)) return k;
  return 'plain';
}

/* ───────────── related questions elsewhere in the archive ───────────── */

export interface SheetLink {
  id: string;
  title: string;
  href: string;
  text?: string;
}

/** Stages of every chain in an answer's text (for spotting the same mechanism elsewhere). */
function chainStems(text: string): Set<string> {
  const out = new Set<string>();
  for (const para of text.split(/\n\s*\n/)) {
    const c = findChain(para.replace(/^:::\w*.*$|^:::$/gm, '').trim());
    if (c) for (const s of c.stages) for (const x of stems(s)) out.add(x);
  }
  return out;
}

/**
 * Questions worth following from a pathway: ones whose own pathway shares at least three
 * stages' words (the same mechanism told elsewhere), and, per stage, a question whose title
 * names that stage's distinctive word.
 */
export function relatedFor(stages: string[], links: SheetLink[]): { whole: SheetLink[]; perStage: SheetLink[][] } {
  if (!links.length) return { whole: [], perStage: stages.map(() => []) };
  const mine = new Set(stages.flatMap((s) => [...stems(s)]));
  const whole = links
    .map((l) => {
      let shared = 0;
      for (const s of chainStems(l.text ?? '')) if (mine.has(s)) shared++;
      return { l, shared };
    })
    .filter((x) => x.shared >= 3)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 2)
    .map((x) => x.l);

  // a title word that most titles share ("explain", "obstruction") says nothing
  const titleStems = links.map((l) => stems(l.title));
  const tdf = new Map<string, number>();
  for (const set of titleStems) for (const s of set) tdf.set(s, (tdf.get(s) ?? 0) + 1);
  const rare = (s: string) => (tdf.get(s) ?? 0) <= Math.max(2, links.length * 0.08);
  const taken = new Set(whole.map((l) => l.id));
  const perStage = stages.map((stage) => {
    const st = [...stems(stage)].filter((s) => s.length >= 5 && rare(s));
    return links.filter((l, i) => !taken.has(l.id) && st.some((s) => titleStems[i].has(s))).slice(0, 2);
  });
  return { whole, perStage };
}

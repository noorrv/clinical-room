import type { CaseData, Choice, Stage, Test } from './cases/types';
import { STAGES } from './cases/types';

/*
  The case engine: a reducer over plain data, so any case file plays the same way. Scores are
  worked out from what the student did (never stored), which keeps them honest when a saved
  game is reopened.
*/

export type Who = 'patient' | 'consultant' | 'note';
export type Tone = 'good' | 'bad' | 'neutral';

export interface Turn {
  who: Who;
  text: string;
  /** The consultant's comment on that choice. */
  teach?: string;
  tone?: Tone;
}

export interface GameState {
  v: 1;
  stage: Stage;
  reached: Stage[];
  intro: number;
  chosen: string[];
  /** Tests ordered before the ones they should follow. */
  early: string[];
  facts: string[];
  turn: Turn | null;
  answers: Record<string, number[]>;
  board: Record<string, 'pinned' | 'struck'>;
  /** The board as it stood when the student moved on to the diagnosis. */
  boardFinal: Record<string, 'pinned' | 'struck'> | null;
  dxTries: string[];
  mgTries: string[];
  hints: Stage[];
  lastResult: string | null;
  done: boolean;
}

export const POINTS = { key: 3, useful: 1, low: -1, harmful: -3 } as const;

export function initial(c: CaseData): GameState {
  return {
    v: 1,
    stage: 'patient',
    reached: ['patient'],
    intro: 0,
    chosen: [],
    early: [],
    facts: ['pc'],
    turn: { who: c.intro[0].who, text: c.intro[0].text },
    answers: {},
    board: {},
    boardFinal: null,
    dxTries: [],
    mgTries: [],
    hints: [],
    lastResult: null,
    done: false,
  };
}

export type Action =
  | { t: 'next-intro' }
  | { t: 'choose'; id: string }
  | { t: 'answer'; checkpoint: string; option: number }
  | { t: 'go'; stage: Stage }
  | { t: 'board'; id: string; mark: 'pinned' | 'struck' | null }
  | { t: 'diagnose'; id: string }
  | { t: 'manage'; id: string }
  | { t: 'hint' }
  | { t: 'show-result'; id: string }
  | { t: 'restart' };

export const allChoices = (c: CaseData): Choice[] => [...c.firstLook, ...c.history, ...c.exam, ...c.tests];
const findChoice = (c: CaseData, id: string) => allChoices(c).find((x) => x.id === id);

/** The checkpoint waiting for an answer, if any (asked in the order the case lists them). */
export function pendingCheckpoint(c: CaseData, s: GameState) {
  return c.checkpoints.find((k) => {
    const a = s.answers[k.id] ?? [];
    const solved = a.some((i) => k.options[i]?.correct);
    return !solved && k.when.every((w) => s.chosen.includes(w));
  });
}

export function canLeave(c: CaseData, s: GameState, stage: Stage): { ok: boolean; why?: string } {
  if (pendingCheckpoint(c, s)) return { ok: false, why: 'Answer the consultant’s question first.' };
  const n = (list: Choice[]) => list.filter((x) => s.chosen.includes(x.id)).length;
  switch (stage) {
    case 'patient':
      return s.intro >= c.intro.length - 1 ? { ok: true } : { ok: false, why: 'Hear the patient out first.' };
    case 'history':
      return n(c.history) >= c.minHistory ? { ok: true } : { ok: false, why: `Ask at least ${c.minHistory} questions first.` };
    case 'examination':
      return n(c.exam) >= c.minExam ? { ok: true } : { ok: false, why: `Examine at least ${c.minExam} things first.` };
    case 'investigations':
      return c.diagnosisNeeds.every((id) => s.chosen.includes(id)) ? { ok: true } : { ok: false, why: 'You need more results before deciding.' };
    case 'differential': {
      const marks = Object.keys(s.board).length;
      return marks >= 4 ? { ok: true } : { ok: false, why: 'Keep or strike at least four diagnoses first.' };
    }
    default:
      return { ok: true };
  }
}

const nextStage = (st: Stage): Stage | null => STAGES[STAGES.indexOf(st) + 1] ?? null;

export function reducer(c: CaseData) {
  return (s: GameState, a: Action): GameState => {
    switch (a.t) {
      case 'restart':
        return initial(c);

      case 'next-intro': {
        const i = Math.min(s.intro + 1, c.intro.length - 1);
        return { ...s, intro: i, turn: { who: c.intro[i].who, text: c.intro[i].text } };
      }

      case 'choose': {
        if (s.chosen.includes(a.id) || pendingCheckpoint(c, s)) return s;
        const ch = findChoice(c, a.id);
        if (!ch) return s;
        const test = ch as Test;
        const early = test.after?.some((id) => !s.chosen.includes(id)) ?? false;
        const value = early && ch.value === 'key' ? 'useful' : ch.value;
        const tone: Tone = value === 'key' ? 'good' : value === 'low' || value === 'harmful' ? 'bad' : 'neutral';
        const before = early ? ` Better after the ${test.after!.map((id) => findChoice(c, id)?.label.toLowerCase()).join(' and ')}.` : '';
        return {
          ...s,
          chosen: [...s.chosen, a.id],
          early: early ? [...s.early, a.id] : s.early,
          facts: [...s.facts, ...(ch.facts ?? []).filter((f) => !s.facts.includes(f))],
          turn: { who: ch.replyBy, text: ch.reply, teach: (ch.teach ?? '') + before || undefined, tone },
          lastResult: test.rows || test.report ? a.id : s.lastResult,
        };
      }

      case 'show-result':
        return { ...s, lastResult: a.id };

      case 'answer': {
        const k = c.checkpoints.find((x) => x.id === a.checkpoint);
        if (!k) return s;
        const prev = s.answers[k.id] ?? [];
        if (prev.some((i) => k.options[i]?.correct) || prev.includes(a.option)) return s;
        const opt = k.options[a.option];
        return {
          ...s,
          answers: { ...s.answers, [k.id]: [...prev, a.option] },
          turn: { who: 'consultant', text: opt.explain, tone: opt.correct ? 'good' : 'bad' },
        };
      }

      case 'go': {
        const target = a.stage;
        if (s.reached.includes(target)) return { ...s, stage: target };
        // moving forward: only from the furthest stage, and only when it's complete
        const furthest = s.reached[s.reached.length - 1];
        if (nextStage(furthest) !== target || !canLeave(c, s, furthest).ok) return s;
        const reached = [...s.reached, target];
        const hint = c.hints[target];
        return {
          ...s,
          stage: target,
          reached,
          boardFinal: target === 'diagnosis' ? { ...s.board } : s.boardFinal,
          turn: { who: 'consultant', text: STAGE_LINES[target] ?? hint ?? '' },
        };
      }

      case 'board': {
        const board = { ...s.board };
        if (a.mark) board[a.id] = a.mark;
        else delete board[a.id];
        return { ...s, board };
      }

      case 'diagnose': {
        if (diagnosisDone(c, s) || s.dxTries.includes(a.id)) return s;
        const opt = c.diagnosis.options.find((o) => o.id === a.id)!;
        const tries = [...s.dxTries, a.id];
        const giveUp = !opt.correct && tries.length >= 2;
        const right = c.diagnosis.options.find((o) => o.correct)!;
        return {
          ...s,
          dxTries: tries,
          turn: {
            who: 'consultant',
            text: opt.correct ? `Yes. ${opt.explain}` : giveUp ? `${opt.explain} The answer is ${right.text.toLowerCase()}: ${right.explain}` : `${opt.explain} Think again.`,
            tone: opt.correct ? 'good' : 'bad',
          },
        };
      }

      case 'manage': {
        if (!diagnosisDone(c, s) || managementDone(c, s) || s.mgTries.includes(a.id)) return s;
        const opt = c.management.options.find((o) => o.id === a.id)!;
        const tries = [...s.mgTries, a.id];
        const giveUp = !opt.correct && tries.length >= 2;
        const right = c.management.options.find((o) => o.correct)!;
        const finished = opt.correct || giveUp;
        return {
          ...s,
          mgTries: tries,
          done: finished,
          turn: {
            who: 'consultant',
            text: opt.correct ? `Exactly. ${opt.explain}` : giveUp ? `${opt.explain} What he needs: ${right.text.toLowerCase()}. ${right.explain}` : `${opt.explain} Think again.`,
            tone: opt.correct ? 'good' : 'bad',
          },
        };
      }

      case 'hint': {
        const text = c.hints[s.stage];
        if (!text) return s;
        return { ...s, hints: s.hints.includes(s.stage) ? s.hints : [...s.hints, s.stage], turn: { who: 'consultant', text } };
      }
    }
  };
}

const STAGE_LINES: Partial<Record<Stage, string>> = {
  history: 'Take a focused history. Every question should help you tell one cause from another.',
  examination: 'Now examine him. Think about what each sign would mean.',
  investigations: 'What will you send? Order what answers a question; every test has a cost.',
  differential: 'Lay out your differential. Keep what the evidence supports, strike what it rules out.',
  diagnosis: 'Commit. What is it, and what happens next?',
};

export const diagnosisDone = (c: CaseData, s: GameState) =>
  s.dxTries.some((id) => c.diagnosis.options.find((o) => o.id === id)?.correct) || s.dxTries.length >= 2;
export const managementDone = (c: CaseData, s: GameState) =>
  s.mgTries.some((id) => c.management.options.find((o) => o.id === id)?.correct) || s.mgTries.length >= 2;

/* ───────────── scoring ───────────── */

export interface ScoreLine {
  name: string;
  got: number;
  max: number;
}

function choiceScore(list: Choice[], s: GameState) {
  let got = 0;
  let max = 0;
  for (const x of list) {
    const p = POINTS[x.value];
    if (p > 0) max += p;
    if (!s.chosen.includes(x.id)) continue;
    got += s.early.includes(x.id) && x.value === 'key' ? POINTS.useful : p;
  }
  return { got: Math.max(0, got), max };
}

const tryScore = (tries: string[], correctId: string, points: number) => {
  const at = tries.indexOf(correctId);
  return at === 0 ? points : at === 1 ? Math.floor(points / 2) : 0;
};

export function score(c: CaseData, s: GameState): { lines: ScoreLine[]; got: number; max: number } {
  const lines: ScoreLine[] = [];
  const h = choiceScore([...c.firstLook, ...c.history], s);
  lines.push({ name: 'History and first look', ...h });
  lines.push({ name: 'Examination', ...choiceScore(c.exam, s) });
  lines.push({ name: 'Choice of investigations', ...choiceScore(c.tests, s) });

  let ig = 0;
  let im = 0;
  for (const k of c.checkpoints) {
    im += k.points;
    const a = s.answers[k.id] ?? [];
    const at = a.findIndex((i) => k.options[i]?.correct);
    ig += at === 0 ? k.points : at === 1 ? Math.floor(k.points / 2) : 0;
  }
  lines.push({ name: 'Interpretation', got: ig, max: im });

  const board = s.boardFinal ?? s.board;
  let bg = 0;
  let bm = 0;
  for (const d of c.differentials) {
    const m = board[d.id];
    if (d.role === 'answer') {
      bm += 3;
      bg += m === 'pinned' ? 3 : m === 'struck' ? -3 : 0;
    } else if (d.role === 'keep') {
      bm += 1;
      bg += m === 'pinned' ? 1 : 0;
    } else if (d.role === 'exclude') {
      bm += 1;
      bg += m === 'struck' ? 1 : m === 'pinned' ? -1 : 0;
    }
  }
  lines.push({ name: 'Differential diagnosis', got: Math.max(0, bg), max: bm });

  const dxRight = c.diagnosis.options.find((o) => o.correct)!.id;
  lines.push({ name: 'Diagnosis', got: tryScore(s.dxTries, dxRight, c.diagnosis.points), max: c.diagnosis.points });
  const mgRight = c.management.options.find((o) => o.correct)!.id;
  lines.push({ name: 'Management', got: tryScore(s.mgTries, mgRight, c.management.points), max: c.management.points });

  const got = lines.reduce((a, l) => a + l.got, 0);
  const max = lines.reduce((a, l) => a + l.max, 0);
  return { lines, got, max };
}

/** Key questions, signs and tests the student never reached for. */
export const missed = (c: CaseData, s: GameState) => allChoices(c).filter((x) => x.value === 'key' && !s.chosen.includes(x.id));
/** Choices that cost points. */
export const missteps = (c: CaseData, s: GameState) =>
  allChoices(c).filter((x) => s.chosen.includes(x.id) && (x.value === 'low' || x.value === 'harmful' || s.early.includes(x.id)));

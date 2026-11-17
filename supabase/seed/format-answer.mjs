// Turns a flat answer paragraph into the study-sheet markup the site already reads (StudySheet):
// headings, bullet and numbered lists, bold labels, coloured terms and bold doses.
// The words stay as written; only where they sit changes (and "term - detail" in a list becomes
// "term: detail", so the term is set in bold).

const ABBR = /\b(?:e\.g|i\.e|vs|approx|etc|cf|Dr|St|No|Fig)\.$/i;

/** Sentences, keeping abbreviations ("e.g.") and decimals intact. */
export function sentences(text) {
  const out = [];
  let cur = '';
  const parts = text.split(/(?<=[.?!])\s+(?=[A-Z(0-9"'“])/);
  for (const p of parts) {
    cur = cur ? `${cur} ${p}` : p;
    if (!ABBR.test(cur)) {
      out.push(cur.trim());
      cur = '';
    }
  }
  if (cur) out.push(cur.trim());
  return out;
}

/** Split on a separator only outside brackets. */
function splitTop(text, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && text.startsWith(sep, i)) {
      out.push(cur);
      cur = '';
      i += sep.length - 1;
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const stripEnd = (s) => s.replace(/[.;,]\s*$/, '').trim();
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "Label: …" at the start of a sentence (a short label, not a time like "10:30"). */
// up to ~70 characters, may hold a bracket ("High SAAG (≥1.1 g/dL, portal hypertension):"), no other colon
const LABEL = /^([A-Z(][^:]{1,70}?):\s+(.+)$/;

/** Items of a list: semicolons first; else commas when there are three or more short ones. */
function itemsOf(body) {
  const semi = splitTop(stripEnd(body), ';');
  if (semi.length >= 2) return semi;
  const comma = splitTop(stripEnd(body), ', ');
  if (comma.length >= 3 && comma.every((c) => c.length <= 90)) {
    // "a, b, and c" / "a, b or c": the last joiner belongs to the last item
    const last = comma.length - 1;
    comma[last] = comma[last].replace(/^(?:and|or)\s+/i, '');
    return comma;
  }
  return null;
}

/** "neutropenic sepsis - IV piperacillin…" → "neutropenic sepsis: IV piperacillin…" (the term in bold). */
const pairUp = (item) => {
  const m = item.match(/^([^:()]{2,40}?)\s+[-–]\s+(.+)$/);
  return m ? `${cap(m[1])}: ${m[2]}` : cap(item);
};

/* ───────────── coloured terms and bold doses ───────────── */

const TESTS = [
  '12-lead ECG', 'ECG', 'echocardiography', 'echocardiogram', 'echo', 'chest X-ray', 'CXR', 'X-ray', 'CT pulmonary angiography', 'CTPA', 'CT', 'MRI',
  'ultrasound', 'Doppler', 'ABG', 'troponin', 'BNP', 'NT-proBNP', 'CBC', 'FBC', 'U&E', 'LFTs', 'LFT', 'TFTs', 'TFT', 'blood cultures', 'blood culture', 'urinalysis',
  'urine culture', 'endoscopy', 'OGD', 'colonoscopy', 'ERCP', 'MRCP', 'EUS', 'biopsy', 'lumbar puncture', 'CSF analysis', 'D-dimer', 'HbA1c', 'serum lipase', 'lipase',
  'amylase', 'coagulation screen', 'INR', 'spirometry', 'peak flow', 'PEF', 'sputum culture', 'GeneXpert', 'ascitic tap', 'diagnostic paracentesis', 'SAAG', 'EEG',
  'angiography', 'coronary angiography', 'bone marrow biopsy', 'blood film', 'Coombs test', 'reticulocyte count',
];
const WARN = [
  'life-threatening', 'medical emergency', 'emergency', 'red flags', 'red flag', 'contraindicated', 'contraindications', 'contraindication', 'do not', 'never', 'avoid',
  'immediately', 'urgent', 'urgently', 'cardiac arrest', 'shock', 'sepsis',
];
const PEARL = ['most common', 'commonest', 'hallmark', 'pathognomonic', 'gold standard', 'first-line', 'first line', 'key'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (list) => new RegExp(`(?<![\\w\\[:-])(${[...list].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\w\\]-])`, 'g');
const TEST_RE = wordRe(TESTS);
const WARN_RE = new RegExp(wordRe(WARN).source, 'gi');
const PEARL_RE = new RegExp(wordRe(PEARL).source, 'gi');
// doses and thresholds: "500 micrograms", "10 mL", "≥6.5 mmol/L", "within 1 h"
const DOSE_RE = /(?<![\w*])((?:[<>≤≥]\s?)?\d+(?:[.,]\d+)?(?:\s?[-–]\s?\d+(?:[.,]\d+)?)?\s?(?:mg\/kg|micrograms|microgram|mcg|mg|g\/dL|g|mL\/kg|mL|L|units|unit|IU|mmol\/L|mmol|mEq\/L|%|bpm|mmHg|min|h|hours|days)\b)(?![\w*])/g;

/** Colour the terms once each per paragraph, and bold doses; never inside existing markup. */
export function decorate(text) {
  // protect what is already marked up
  const keep = [];
  let t = text.replace(/\[\[[^\]]+\]\]|\*\*[^*]+\*\*/g, (m) => `\u0000${keep.push(m) - 1}\u0000`);
  const seen = new Set();
  const once = (kind) => (m) => {
    const k = `${kind}:${m.toLowerCase()}`;
    if (seen.has(k)) return m;
    seen.add(k);
    return `\u0000${keep.push(`[[${kind}:${m}]]`) - 1}\u0000`;
  };
  t = t.replace(WARN_RE, once('warn')).replace(TEST_RE, once('test')).replace(PEARL_RE, once('pearl'));
  t = t.replace(DOSE_RE, (m) => `\u0000${keep.push(`**${m}**`) - 1}\u0000`);
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}

/* ───────────── the layout ───────────── */

export function formatAnswer(raw) {
  const text = raw.replace(/\s+/g, ' ').trim();
  const out = [];
  let para = [];
  const flush = () => {
    if (para.length) out.push(decorate(para.join(' ')));
    para = [];
  };

  // numbered steps written as "(1) … (2) …" anywhere in the answer
  const steps = text.split(/\s*\((\d{1,2})\)\s+/);
  if (steps.length >= 5) {
    const intro = steps[0].trim();
    if (intro) out.push(...formatSentences(intro));
    const items = [];
    for (let i = 1; i < steps.length; i += 2) items.push(steps[i + 1].trim());
    // a closing sentence after the last step stays its own paragraph
    const last = sentences(items[items.length - 1]);
    let tail = '';
    if (last.length > 1 && !LABEL.test(last[last.length - 1])) {
      tail = last.pop();
      items[items.length - 1] = last.join(' ');
    }
    out.push(items.map((it, n) => `${n + 1}. ${decorate(stripEnd(it))}`).join('\n'));
    if (tail) out.push(decorate(tail));
    return out.join('\n\n');
  }

  return formatSentences(text).join('\n\n');

  function formatSentences(t) {
    const blocks = [];
    const ss = sentences(t);
    const labelled = ss.filter((s) => LABEL.test(s)).length;
    for (const s of ss) {
      const m = s.match(LABEL);
      if (!m) {
        para.push(s);
        continue;
      }
      if (para.length) {
        blocks.push(decorate(para.join(' ')));
        para = [];
      }
      const [, label, body] = m;
      const items = itemsOf(body);
      if (labelled >= 2) {
        // several groups: each its own small heading
        blocks.push(`### ${label}`);
        blocks.push(items ? items.map((i) => `- ${decorate(pairUp(i))}`).join('\n') : decorate(cap(body)));
      } else if (items) {
        blocks.push(`**${label}:**`);
        blocks.push(items.map((i) => `- ${decorate(pairUp(i))}`).join('\n'));
      } else blocks.push(decorate(`**${label}:** ${body}`));
    }
    if (para.length) {
      // a run of three or more sentences reads better as separate short paragraphs
      if (para.length >= 3) blocks.push(...para.map((p) => decorate(p)));
      else blocks.push(decorate(para.join(' ')));
      para = [];
    }
    // a direct answer opens in bold: "Yes -", "No.", "Not necessarily."
    if (blocks[0]) blocks[0] = blocks[0].replace(/^(Yes|No|Not necessarily|Not always|Usually|Rarely)\b([.,:;]|\s[-–])/, '**$1**$2');
    return blocks;
  }
}

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
// capital first letter, also when the item opens with a coloured term: "[[warn:perforated]] bowel"
const cap = (s) => (!s ? s : s.startsWith('[[') ? s.replace(/^(\[\[\w+:)(.)/, (_, k, c) => k + c.toUpperCase()) : s.charAt(0).toUpperCase() + s.slice(1));

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

/* ───────────── long comma lists → bullets; investigations grouped ───────────── */

const plainOf = (t) => t.replace(/\[\[\w+:([^\]]+)\]\]/g, '$1').replace(/\*\*/g, '').toLowerCase();
// which group an investigation belongs to (checked in this order: "blood cultures" is microbiology,
// "LP if CT is safe" a special test)
const TEST_GROUPS = [
  ['Microbiology', /cultur|gram stain|sputum|swab|antigen|\bpcr\b|smear|malaria|widal|serolog|stool|\bgse\b|\bafb\b|genexpert|difficile|naat/],
  ['Special tests', /\blp\b|lumbar puncture|\beeg\b|endoscop|\bogd\b|colonoscop|sigmoidoscop|biopsy|bronchoscop|spirometr|nerve conduction|\bercp\b|\beus\b|aspiration|paracentesis|ascitic|pleural tap|cystoscop|holter|tilt.table|fnac/],
  ['Imaging', /x-ray|\bcxr\b|\baxr\b|\bct\b|ctpa|\bmri\b|mrcp|ultrasound|\bus\b|doppler|\becho|angiogra|\bscan\b|\bkub\b|\bivu\b|mammogra|dexa|cystogram|urethrogram|renogram/],
  ['Bedside', /\becg\b|urinalysis|dipstick|capillary glucose|pregnancy|hcg|peak flow|\bpef\b|bladder scan|vital signs|\bgue\b|urine output|bm\b/],
  ['Bloods', /\bcbc\b|\bfbc\b|u&e|urea|creatinine|electrolyte|sodium|potassium|\bna\b|\bk\+|\bcrp\b|\besr\b|\blft|glucose|hba1c|calcium|magnesium|phosphate|\babg\b|\bvbg\b|blood gas|\btft|\btsh\b|\bt4\b|troponin|\bbnp|ammonia|coagulation|\binr\b|\bpt\b|aptt|clotting|lipase|amylase|lactate|d-dimer|ferritin|\biron\b|\bb12\b|folate|cortisol|procalcitonin|drug level|toxicolog|paracetamol|salicylate|group and|cross-?match|lipid|albumin|bilirubin|\bck\b|urate|\bana\b|antibod|complement|\bldh\b|reticulocyte|blood film|haptoglobin|\bpsa\b|ca-?125|\bafp\b|serum|\blevels?\b|bloods?\b/],
];
const groupOf = (item) => TEST_GROUPS.find(([, re]) => re.test(plainOf(item)))?.[0];

const LEAD = /^(send|check|do|order|request|look for|ask about|includes?|including|causes include|consider)\s+/i;

// a clause with a verb is a sentence, not a list item ("Torsades … is the classic one")
const VERB = /\b(is|are|was|were|causes?|caused|potentiates?|means|suggests?|gives?|should|can|may|might|will|has|have|had|occurs?|leads?|makes?|becomes?|needs?|depends?)\b/i;
// a lead-in hiding in the first item: "In a woman with a breast lump also ask about duration"
const LEAD_IN = /^(.{3,}?\b(?:ask about|about|include|includes|including|such as|like|consider|check for|look for|determines|affects|influences))\s+(.+)$/i;

/**
 * The items of a run of text, or null when it isn't really a list: fewer than five items, an item
 * too long to read as one line, or clauses with verbs (prose). A lead-in caught in the first item
 * is returned separately.
 */
function listParts(text) {
  const items = splitTop(stripEnd(text), ';').flatMap((part) => splitTop(part, ', '));
  // an item's length is judged without its bracketed explanation, which can be long
  const core = (i) => plainOf(i).replace(/\([^()]*(\([^()]*\)[^()]*)*\)/g, '').trim();
  if (items.length < 5 || items.some((i) => core(i).length > 120 || plainOf(i).length > 260)) return null;
  if (items.filter((i) => VERB.test(plainOf(i))).length > items.length / 3) return null;
  const last = items.length - 1;
  items[last] = items[last].replace(/^(?:and|or)\s+/i, '');
  let lead = null;
  const first = items[0].match(LEAD_IN);
  if (first && plainOf(first[1]).split(/\s+/).length >= 2) {
    // "Causes include appendicolith" → lead-in "Causes include:", first item "Appendicolith"
    lead = first[1];
    items[0] = first[2];
  } else if (VERB.test(plainOf(items[0])) && items.length >= 5) {
    // the first part is a sentence that introduces the list: "In infants these signs are unreliable;
    // look for a bulging fontanelle, …" → lead-in "In infants these signs are unreliable. Look for:"
    lead = items.shift();
    // "… is a medical emergency: admit" → lead-in "… is a medical emergency", first step "admit"
    const colon = splitTop(lead, ': ');
    if (colon.length === 2) {
      lead = colon[0];
      items.unshift(colon[1]);
    }
    const verb = items[0].match(LEAD) ?? items[0].match(/^((?:but\s+)?(?:it|this|they)\s+(?:may|can|could)\s+(?:also\s+)?be)\s+/i);
    if (verb) {
      lead = `${stripEnd(lead)}. ${cap(verb[1].replace(/^but\s+/i, ''))}`;
      items[0] = items[0].slice(verb[0].length);
    }
  }
  return { lead, items: items.filter(Boolean).map((i) => cap(i)) };
}

/** Three or more clauses separated by semicolons ("Admit; take cultures; give antibiotics"): steps, as a list. */
function stepParts(text) {
  const parts = splitTop(stripEnd(text), ';');
  if (parts.length < 3 || parts.some((p) => plainOf(p).length > 200)) return null;
  return { lead: null, items: parts.map((p) => cap(p)) };
}

/** Five or more short items run together with commas or semicolons, outside brackets: the items, else null. */
function packedItems(sentence) {
  const parts = listParts(sentence);
  if (!parts) return null;
  return { lead: parts.lead, items: parts.items.map((i) => i.replace(LEAD, '')).filter(Boolean) };
}

/** A list laid out for study: grouped by kind when most items are investigations, else plain bullets. */
function listOf(items) {
  const groups = items.map(groupOf);
  if (items.length >= 5 && groups.filter(Boolean).length / items.length >= 0.6) {
    const order = ['Bedside', 'Bloods', 'Microbiology', 'Imaging', 'Special tests', 'Also'];
    const by = new Map(order.map((g) => [g, []]));
    items.forEach((it, n) => by.get(groups[n] ?? 'Also').push(it));
    return order
      .filter((g) => by.get(g).length)
      .map((g) => `### ${g}\n\n${by.get(g).map((i) => `- ${decorate(cap(i))}`).join('\n')}`)
      .join('\n\n');
  }
  return items.map((i) => `- ${decorate(pairUp(i))}`).join('\n');
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
        const packed = packedItems(s);
        if (!packed) {
          para.push(s);
          continue;
        }
        if (para.length) {
          blocks.push(decorate(para.join(' ')));
          para = [];
        }
        // the lead-in is bold as a whole, so no bold doses inside it
        if (packed.lead) blocks.push(`**${decorate(cap(packed.lead).replace(/\*\*/g, '')).replace(/\*\*/g, '').replace(/:$/, '')}:**`);
        blocks.push(listOf(packed.items));
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
        blocks.push(items ? listOf(items) : decorate(cap(body)));
      } else if (items) {
        blocks.push(`**${label}:**`);
        blocks.push(listOf(items));
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

/* ───────────── the last pass: no line left packed with a comma list ───────────── */

/** Top-level items of a run of text split on commas and semicolons (never inside brackets or [[terms]]). */
function topItems(text) {
  return splitTop(stripEnd(text), ';').flatMap((part) => splitTop(part, ', '));
}

/**
 * Runs over a finished answer (any author) and unpacks every line that still holds five or more
 * items in a row: a bullet "Label: a, b, c, …" becomes a small bold heading with its items listed
 * under it; a paragraph becomes its lead-in (if any) and a bulleted list. Tables, headings, box
 * markers and key-point lines are left as they are.
 */
export function unpack(markup) {
  const out = [];
  // a paragraph of several sentences is looked at one sentence at a time
  const lines = markup.split('\n').flatMap((line) => {
    const t = line.trim();
    if (!t || /^(\||#|:::|!\[|-\s|\d+\.\s|\*\*Key points)/.test(t)) return [line];
    const ss = sentences(t);
    if (ss.length < 2 || !ss.some((x) => listParts(x) || stepParts(x))) return [line];
    // keep plain sentences together; a packed one stands alone so it can become a list
    const parts = [];
    let run = [];
    for (const x of ss) {
      if (listParts(x) || stepParts(x)) {
        if (run.length) parts.push(run.join(' '), '');
        parts.push(x, '');
        run = [];
      } else run.push(x);
    }
    if (run.length) parts.push(run.join(' '));
    return parts;
  });
  let inTip = false;
  for (const line of lines) {
    const t = line.trim();
    // a tip box holds one piece of advice: leave it as written
    if (/^:::(tip|say)\b/.test(t)) inTip = true;
    else if (t === ':::') inTip = false;
    if (inTip || !t || /^(\||#|:::|!\[)/.test(t) || /^\*\*Key points:\*\*/.test(t)) {
      out.push(line);
      continue;
    }
    const bullet = t.match(/^(?:-|\d+\.)\s+(.*)$/);
    const body = bullet ? bullet[1] : t;
    // a lead-in ending in a colon, outside brackets: "**CNS:** …", "Common precipitants: …"
    const lead = body.match(/^(\*\*[^*]{1,60}?:\*\*|[A-Z(][^:[\]]{1,60}?:)\s+(.+)$/s);
    const rest = lead ? lead[2] : body;
    const parts = listParts(rest) ?? stepParts(rest);
    if (!parts) {
      out.push(line);
      continue;
    }
    const items = parts.items;
    const label = lead ? lead[1].replace(/\*\*/g, '').replace(/:$/, '').trim() : null;
    const list = items.map((i) => `- ${cap(i)}`).join('\n');
    const heads = [];
    if (label) heads.push(bullet ? `**${label}**` : `**${label}:**`);
    // a sentence that introduces the list stands above it in bold, ending in a colon
    if (parts.lead) heads.push(`**${cap(parts.lead).replace(/\*\*/g, '').replace(/[:.]$/, '')}:**`);
    out.push('', ...heads.flatMap((h) => [h, '']), list, '');
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "Label: rest" → "**Label:** rest", unless the colon sits inside a bracket ("Control BP (NICE: …"). */
export function boldLabel(text) {
  const m = text.match(/^([^:]{2,60}):\s+(.+)$/s);
  if (!m) return text;
  if ((m[1].match(/\(/g) ?? []).length !== (m[1].match(/\)/g) ?? []).length) return text;
  return `**${m[1]}:** ${m[2]}`;
}

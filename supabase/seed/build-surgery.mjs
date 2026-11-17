// Builds the Surgery question bank from the exam spreadsheet, for review and import.
//
// Reads  supabase/seed/content/surgery-sheets.json   (the spreadsheet's rows; git-ignored, protected)
//        supabase/seed/content/surgery-extra.mjs     (corrected answers and picture-station items; git-ignored)
// Writes src/dev/surgery-preview.json                (dev-only preview, ?preview-bank=1; git-ignored)
//        supabase/seed/content/surgery-review.md     (what goes where, for review; git-ignored)
//        supabase/seed/surgery-import.sql            (the import, as drafts; git-ignored)
//
// Questions already in Surgery are left out; follow-ups become toggles under their question;
// topics sit under the existing Surgery subjects plus four new ones. Run: node supabase/seed/build-surgery.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { decorate, formatAnswer } from './format-answer.mjs';
import { FIXES, PICTURES } from './content/surgery-extra.mjs';

const sheets = JSON.parse(readFileSync('supabase/seed/content/surgery-sheets.json', 'utf8'));
const [, ...raw] = sheets['Questions & Answers'];
const rows = raw.map(([no, area, type, question, answer, note]) => ({ no: no.trim(), area, type, question: question.trim(), answer: (FIXES[no.trim()] ?? answer).trim(), note: FIXES[no.trim()] ? '' : note }));

/* ───────────── where everything goes ───────────── */

// new subjects, after the existing eleven
const NEW_SUBJECTS = [
  ['trauma-burns', 'Trauma and burns', 12],
  ['neurosurgery', 'Neurosurgery and head injury', 13],
  ['orthopaedics', 'Orthopaedics', 14],
  ['colorectal', 'Colorectal surgery', 15],
];

// topic id → [subject, name, the spreadsheet questions it holds]; ids already in the database are reused
const TOPICS = {
  'sx-sutures': ['principles', 'Sutures, needles and wound closure', '1-11'],
  'sx-wounds': ['principles', 'Wounds, ulcers, sinuses and fistulas', '12-14 16 18-20 118'],
  'sx-bleeding-drains': ['principles', 'Bleeding and surgical drains', '15 17'],
  'sx-periop': ['principles', 'Perioperative care', '149-152 154'],
  'sx-imaging': ['principles', 'Imaging basics', '203 205 206'],
  'sx-burns': ['trauma-burns', 'Burns', '21-23'],
  'sx-atls': ['trauma-burns', 'ATLS: primary survey and airway', '24-31 36'],
  'sx-shock': ['trauma-burns', 'Shock and blood transfusion', '32-35'],
  'sx-chest-trauma': ['trauma-burns', 'Chest trauma and chest drains', '37-42'],
  'sx-abdo-trauma': ['trauma-burns', 'Abdominal and pelvic trauma', '43 45-47'],
  'sx-head-injury': ['neurosurgery', 'Head injury', '48-60 155 204'],
  'sx-neuro-anatomy': ['neurosurgery', 'Cranial nerves and the spine', '61-63'],
  'sx-goitre': ['thyroid', 'Goitre, nodules and thyrotoxicosis', '64-66 71 73-76'],
  'sx-thyroidectomy': ['thyroid', 'Thyroidectomy', '67-70'],
  'sx-neck-lumps': ['thyroid', 'Neck lumps and cervical lymph nodes', '72 77-79'],
  'sx-endocrine': ['thyroid', 'Parathyroid, adrenal and pancreatic tumours', '139-141'],
  'sx-breast-cancer': ['breast', 'Breast lumps and breast cancer', '80-85'],
  'sx-breast-benign': ['breast', 'Nipple discharge and mastitis', '86 87'],
  'sx-hernia': ['hernias', 'Hernias and the groin', '88-97'],
  appendix: ['appendix', null, '98 99'], // existing topic
  'sx-acute-abdomen': ['abdomen', 'Acute abdomen', '102 104-106 122 142 143'],
  'sx-abdo-masses': ['abdomen', 'Abdominal masses, ascites and the liver edge', '100 101 107 108'],
  'spleen-examination': ['spleen', null, '109'], // existing topic
  'sx-splenectomy': ['spleen', 'Splenectomy', '110 111'],
  'gallbladder-biliary-tract': ['hepatobiliary', null, '112 113 117 124'], // existing topic
  'sx-jaundice-liver': ['hepatobiliary', 'Jaundice, the liver and portal hypertension', '114-116 120 121 123'],
  'sx-pancreas': ['hepatobiliary', 'Pancreatitis', '103'],
  'hydatid-cyst-spleen': ['spleen', null, '119'], // existing topic
  'splenic-injury': ['spleen', null, '44'], // existing topic
  'intestinal-obstruction': ['intestinal-obstruction', null, '125-127 202'], // existing topic
  'sx-diverticular': ['colorectal', 'Diverticular disease and Meckel’s diverticulum', '128 129'],
  'sx-anorectal': ['colorectal', 'Anorectal conditions and rectal bleeding', '130-134'],
  'sx-colon-cancer': ['colorectal', 'Colon cancer, colitis and stomas', '135-138'],
  'sx-dvt': ['vascular', 'DVT, embolism and bed rest', '144-146'],
  'sx-vascular-exam': ['vascular', 'Pulses and lymphatic drainage', '147 148'],
  'sx-diabetic-foot': ['vascular', 'Diabetic foot and gangrene', '153'],
  'sx-uro-trauma': ['urology', 'Urological trauma and catheterisation', '156-158 183'],
  'sx-retention-prostate': ['urology', 'Retention, anuria and the prostate', '159 160 167'],
  'sx-stones-infection': ['urology', 'Stones and urinary infection', '161-164'],
  'sx-kidney-ureter': ['urology', 'The kidney, ureter and hydronephrosis', '165 166 174 181'],
  'sx-scrotum-penis': ['urology', 'Testis, scrotum and penis', '168-173'],
  'sx-uro-tumours': ['urology', 'Bladder, haematuria and urinary tumours', '175-180 182'],
  'sx-fractures': ['orthopaedics', 'Fractures and dislocations', '185-193 195 196'],
  'sx-joints': ['orthopaedics', 'Joints, tendons and bone tumours', '184 194 197-201'],
};
const EXISTING_TOPICS = new Set(Object.entries(TOPICS).filter(([, t]) => t[1] === null).map(([id]) => id));
const topicOf = new Map();
for (const [id, [, , spec]] of Object.entries(TOPICS))
  for (const part of spec.split(' ')) {
    const [a, b = a] = part.split('-').map(Number);
    for (let n = a; n <= b; n++) topicOf.set(n, id);
  }

// already in Surgery: left out (their non-duplicate follow-ups stand as questions of their own)
const DUPLICATES = {
  44: 'AAST grading of splenic injury (five grades)',
  98.1: 'What is McBurney’s point?',
  109: 'How do you differentiate an enlarged spleen from an enlarged kidney?',
  109.1: 'What are the two manoeuvres for splenic palpation?',
  119: 'Define hydatid cyst; Explain the life cycle of Echinococcus granulosus',
  125: 'What are the types of intestinal obstruction?; Explain the pathophysiology of intestinal obstruction.',
  125.4: 'Why do we insert a nasogastric tube in intestinal obstruction?',
  127: 'What are the causes of large bowel obstruction?',
};
// partly covered already, added in full as agreed
const PARTIAL = new Set(['98', '124', '129', '202', '125.1', '142', '143']);

/* ───────────── the answers ───────────── */

/** The spreadsheet's lines laid out like the rest of the site: "- " bullets, "A - Airway" steps, labelled lists. */
function layout(text) {
  const out = [];
  let list = [];
  const flush = () => {
    if (list.length) out.push(list.map((l) => `- ${decorate(l)}`).join('\n'));
    list = [];
  };
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const bullet = line.match(/^[-•]\s+(.+)$/);
    const step = line.match(/^([A-E])\s+[-–]\s+(.+)$/); // ATLS "A - Airway …"
    if (bullet) list.push(bullet[1].replace(/^([^:]{2,60}):\s+/, '**$1:** '));
    else if (step) list.push(`**${step[1]}:** ${step[2].replace(/\.$/, '')}`);
    else {
      flush();
      out.push(formatAnswer(line));
    }
  }
  flush();
  return out.join('\n\n');
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ───────────── difficulty (a draft for review) ───────────── */

function difficulty(q, answer) {
  const n = answer.length;
  if (/\b(manage|management|approach|treat|differentiate|differ|why|indications?|how do you|what do you do|prepare|complications)\b/i.test(q)) return n < 360 ? 2 : 3;
  if (/^(what is|what are|define|list|name|classify|which)\b/i.test(q) && n < 420) return 1;
  return 2;
}

/* ───────────── putting it together ───────────── */

const main = rows.filter((r) => r.type === 'Question');
const followsOf = new Map();
for (const r of rows.filter((r) => r.type.startsWith('Follow-up'))) {
  const parent = r.type.match(/Q(\d+)/)[1];
  (followsOf.get(parent) ?? followsOf.set(parent, []).get(parent)).push(r);
}

const questions = [];
const skipped = [];
const flagged = [];
const idOf = (no) => `sx-q${no.replace('.', '-').padStart(3, '0')}`;

for (const r of main) {
  const n = Number(r.no);
  const topic = topicOf.get(n);
  if (!topic) throw new Error(`No topic for spreadsheet question ${r.no}`);
  const follows = (followsOf.get(r.no) ?? []).filter((f) => {
    if (DUPLICATES[f.no]) skipped.push([f.no, f.question, DUPLICATES[f.no]]);
    return !DUPLICATES[f.no];
  });
  const make = (row, toggles) => {
    if (row.note) flagged.push([row.no, row.question, row.note]);
    for (const f of toggles) if (f.note) flagged.push([f.no, f.question, f.note]);
    const blocks = toggles.map((f) => `:::followup ${f.question}\n${layout(f.answer)}\n:::`);
    return {
      id: idOf(row.no),
      title: row.question,
      type: 'viva',
      topicIds: [topic],
      doctorIds: [],
      modelAnswer: [layout(row.answer), ...blocks].join('\n\n'),
      difficulty: difficulty(row.question, row.answer),
      _no: row.no,
    };
  };
  if (DUPLICATES[r.no]) {
    skipped.push([r.no, r.question, DUPLICATES[r.no]]);
    // its own follow-ups stand alone, in the same topic
    for (const f of follows) questions.push(make(f, []));
    continue;
  }
  questions.push(make(r, follows));
}

for (const p of PICTURES) questions.push({ id: p.id, title: p.title, type: 'viva', topicIds: [p.topic], doctorIds: [], modelAnswer: layout(p.answer), difficulty: difficulty(p.title, p.answer), _no: 'picture' });

const usedTopics = new Set(questions.map((q) => q.topicIds[0]));
const topicList = Object.entries(TOPICS)
  .filter(([id, t]) => t[1] !== null && usedTopics.has(id))
  .map(([id, [subjectId, name]], i) => ({ id, name, subjectId, sort: 200 + i }));
const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) throw new Error(`Duplicate id ${q.id}`);
  ids.add(q.id);
}

/* ───────────── preview, review sheet, import ───────────── */

const list = questions.map(({ _no, ...q }) => q);
writeFileSync('src/dev/surgery-preview.json', JSON.stringify({ subjects: NEW_SUBJECTS.map(([id, name]) => ({ id, name })), topics: topicList.map(({ sort, ...t }) => t), questions: list }, null, 1));

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' };
const count = (l) => list.filter((q) => q.difficulty === l).length;
const followCount = (list.map((q) => (q.modelAnswer.match(/:::followup/g) ?? []).length)).reduce((a, b) => a + b, 0);
let md = `# Surgery import: review sheet\n\nFrom \`Surgery_Exam_Questions_and_Answers.xlsx\` (${rows.length} rows). Built by \`supabase/seed/build-surgery.mjs\`.\n\n`;
md += `- **${list.length} questions** go in (${PICTURES.length} of them picture-station definitions written for this import), with **${followCount} follow-ups** as toggles.\n`;
md += `- Difficulty (draft): ${count(1)} easy · ${count(2)} moderate · ${count(3)} difficult.\n`;
md += `- **${skipped.length} left out** because Surgery already has them; **${PARTIAL.size}** that only partly overlap are added in full.\n`;
md += `- **${Object.keys(FIXES).length} answers corrected to standard teaching** where the spreadsheet asked for verification.\n- Everything is imported as a draft. No examiner names.\n\n`;
md += `## Corrected to standard teaching\n\n` + Object.keys(FIXES).map((no) => `- ${no}: ${rows.find((r) => r.no === no).question}`).join('\n') + '\n\n';
if (flagged.length) md += `## Still marked for checking\n\n` + flagged.map(([no, q, n]) => `- ${no}: ${q} — ${n}`).join('\n') + '\n\n';
md += `## Left out: already in Surgery\n\n| Row | Spreadsheet question | Already there as |\n|---|---|---|\n` + skipped.map(([no, q, t]) => `| ${no} | ${q} | ${t} |`).join('\n') + '\n\n';
md += `## Partly covered already, added in full\n\n` + [...PARTIAL].map((no) => `- ${no}: ${rows.find((r) => r.no === no).question}`).join('\n') + '\n\n';
md += `## Where everything goes\n\n`;
const subjectName = { principles: 'General surgical principles', abdomen: 'Abdomen', appendix: 'Appendix', 'intestinal-obstruction': 'Intestinal obstruction', hernias: 'Hernias', hepatobiliary: 'Hepatobiliary system', spleen: 'Spleen', breast: 'Breast', thyroid: 'Thyroid, head and neck', vascular: 'Vascular surgery', urology: 'Urology', ...Object.fromEntries(NEW_SUBJECTS.map(([id, n]) => [id, `${n} (new)`])) };
for (const [sid, name] of Object.entries(subjectName)) {
  const ts = Object.entries(TOPICS).filter(([id, t]) => t[0] === sid && usedTopics.has(id));
  if (!ts.length) continue;
  md += `### ${name}\n\n`;
  for (const [tid, t] of ts) {
    const qs = list.filter((q) => q.topicIds[0] === tid);
    md += `**${t[1] ?? `${tid} (existing topic)`}** (${qs.length})\n\n` + qs.map((q) => `- ${LEVEL[q.difficulty]}: ${q.title}${q.modelAnswer.includes(':::followup') ? ` _(+${q.modelAnswer.match(/:::followup/g).length} follow-up)_` : ''}`).join('\n') + '\n\n';
  }
}
writeFileSync('supabase/seed/content/surgery-review.md', md);

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- The Clinical Room · Surgery question bank (generated by build-surgery.mjs; git-ignored)\n-- Imports ${list.length} questions as DRAFTS. Existing questions and topics are not changed. Safe to run again.\n\nbegin;\n\n`;
sql += `insert into public.subjects (specialty_id, id, name, sort) values\n` + NEW_SUBJECTS.map(([id, name, sort]) => `  ('surgery', ${sq(id)}, ${sq(name)}, ${sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name;\n\n`;
sql += `-- the Thyroid subject now also holds neck lumps and lymph nodes\nupdate public.subjects set name = 'Thyroid, head and neck' where specialty_id = 'surgery' and id = 'thyroid';\n\n`;
sql += `insert into public.topics (specialty_id, id, name, subject_id, sort) values\n` + topicList.map((t) => `  ('surgery', ${sq(t.id)}, ${sq(t.name)}, ${sq(t.subjectId)}, ${t.sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
sql += `insert into public.questions (specialty_id, id, title, type, model_answer, difficulty, status, sort) values\n` + list.map((q, i) => `  ('surgery', ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.modelAnswer)}, ${q.difficulty}, 'draft', ${1000 + i})`).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, model_answer = excluded.model_answer, difficulty = excluded.difficulty;\n\n`;
sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + list.map((q) => `  ('surgery', ${sq(q.id)}, ${sq(q.topicIds[0])})`).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = 'surgery' group by status;\n`;
writeFileSync('supabase/seed/surgery-import.sql', sql);

console.log(JSON.stringify({ rows: rows.length, questions: list.length, followUps: followCount, topics: topicList.length, existingTopicsUsed: [...EXISTING_TOPICS].filter((t) => usedTopics.has(t)).length, skipped: skipped.length, flagged: flagged.length, easy: count(1), moderate: count(2), difficult: count(3) }));

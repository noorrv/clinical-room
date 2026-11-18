// Builds the Paediatrics question bank from the exam spreadsheet, for review and import.
//
// Reads  supabase/seed/content/paeds-sheets.json   (the spreadsheet's rows; git-ignored, protected)
//        supabase/seed/content/paeds-fixes.mjs     (guideline corrections; git-ignored)
// Writes src/dev/paediatrics-preview.json          (dev-only preview, ?preview-bank=1; git-ignored)
//        supabase/seed/content/paeds-review.md     (what goes where, for review; git-ignored)
//        supabase/seed/paeds-import.sql            (the import, as drafts; git-ignored)
//
// Follow-ups become toggles under their question; answers are laid out like the Medicine and Surgery
// banks (bullets, numbered steps, bold labels, coloured terms, no packed comma lists).
// Run: node supabase/seed/build-paeds.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { boldLabel, decorate, formatAnswer, unpack } from './format-answer.mjs';
import { ANSWERS, MARKUP, PATCHES } from './content/paeds-fixes.mjs';

const [, ...raw] = JSON.parse(readFileSync('supabase/seed/content/paeds-sheets.json', 'utf8'))['Q&A'];
const used = new Set();
const fixKey = (id) => id.replace('.', '_');
const rows = raw.map(([id, area, sub, question, parent, answer, note]) => {
  let a = ANSWERS[fixKey(id)] ?? answer;
  if (ANSWERS[fixKey(id)]) used.add(fixKey(id));
  for (const [from, to] of PATCHES[fixKey(id)] ?? []) {
    if (!a.includes(from)) throw new Error(`Fix for ${id} doesn't match: ${from.slice(0, 60)}`);
    a = a.replace(from, to);
    used.add(fixKey(id));
  }
  return { id, area, sub, question: question.trim(), parent: parent.trim(), answer: a.trim(), note };
});
const unused = [...Object.keys(PATCHES), ...Object.keys(ANSWERS)].filter((k) => !used.has(k));
if (unused.length) throw new Error(`Fixes for rows not found: ${unused.join(', ')}`);

/* ───────────── where everything goes ───────────── */

const NEW_SUBJECTS = [
  ['nephrology-fluids', 'Nephrology and fluids', 9],
  ['haematology-genetics', 'Haematology and genetics', 10],
];

const TOPICS = [
  ['pd-resp-distress', 'respiratory', 'Respiratory distress, oxygen and emergencies'],
  ['pd-pneumonia', 'respiratory', 'Pneumonia'],
  ['pd-bronchiolitis', 'respiratory', 'Bronchiolitis'],
  ['pd-asthma', 'respiratory', 'Asthma'],
  ['pd-cough-croup', 'respiratory', 'Cough, croup, pertussis and cystic fibrosis'],
  ['pd-gastroenteritis', 'gastroenterology', 'Gastroenteritis and dehydration'],
  ['pd-renal-fluids', 'nephrology-fluids', 'Fluids, electrolytes and the kidney'],
  ['pd-meningitis', 'neurology', 'Meningitis'],
  ['pd-seizures', 'neurology', 'Seizures and cerebral palsy'],
  ['pd-neonatal-jaundice', 'neonatology', 'Neonatal jaundice'],
  ['pd-neonatal-sepsis', 'neonatology', 'Neonatal sepsis, apnoea and fluids'],
  ['pd-preterm', 'neonatology', 'Prematurity, resuscitation and cyanosis'],
  ['pd-vaccines', 'growth-development', 'Vaccines'],
  ['pd-nutrition-growth', 'growth-development', 'Nutrition, growth and development'],
  ['pd-heart', 'cardiology', 'Heart failure and congenital heart disease'],
  ['pd-haematology', 'haematology-genetics', 'Anaemia, bleeding and sickle cell'],
  ['pd-down', 'haematology-genetics', 'Down syndrome'],
  ['pd-fever', 'infectious-diseases', 'Fever and infections'],
  ['pd-emergencies', 'emergencies', 'Emergency management'],
];

// spreadsheet sub-topic → topic
const BY_SUB = {
  Approach: 'pd-resp-distress', 'Respiratory distress': 'pd-resp-distress', Emergency: 'pd-resp-distress', Oxygen: 'pd-resp-distress',
  'Breath sounds': 'pd-resp-distress', Pneumothorax: 'pd-resp-distress', Pneumonia: 'pd-pneumonia', Bronchiolitis: 'pd-bronchiolitis',
  Asthma: 'pd-asthma', Cough: 'pd-cough-croup', Pertussis: 'pd-cough-croup', 'Croup and upper airway': 'pd-cough-croup',
  Gastroenteritis: 'pd-gastroenteritis', 'Renal and fluids': 'pd-renal-fluids', Meningitis: 'pd-meningitis', Seizures: 'pd-seizures',
  Neurology: 'pd-seizures', Jaundice: 'pd-neonatal-jaundice', 'Neonatal sepsis': 'pd-neonatal-sepsis', Preterm: 'pd-preterm',
  'Neonatal resuscitation': 'pd-preterm', Cyanosis: 'pd-preterm', Vaccines: 'pd-vaccines', Nutrition: 'pd-nutrition-growth',
  Growth: 'pd-nutrition-growth', Development: 'pd-nutrition-growth', 'Social history': 'pd-nutrition-growth',
  'Heart failure and CHD': 'pd-heart', 'Down syndrome': 'pd-down', Haematology: 'pd-haematology', 'Sickle cell': 'pd-haematology',
  'Acute phase': 'pd-fever', Fever: 'pd-fever', Immunology: 'pd-fever',
};
// rows whose sub-topic doesn't say where they belong
const BY_ID = {
  Q53: 'pd-cough-croup', Q54: 'pd-cough-croup', Q56: 'pd-pneumonia', Q143: 'pd-nutrition-growth', Q164: 'pd-haematology',
  Q202: 'pd-gastroenteritis', Q203: 'pd-renal-fluids', Q96: 'pd-renal-fluids',
};
// emergency questions also shown under Emergency management (the same question, not a copy)
const EMERGENCY = new Set(['Q5', 'Q35', 'Q49', 'Q55', 'Q73', 'Q88', 'Q91', 'Q112', 'Q130', 'Q141', 'Q165', 'Q170', 'Q174', 'Q179', 'Q189']);

/* ───────────── the answers ───────────── */

/** The spreadsheet's lines laid out for study: "•" bullets, "1." steps, labelled lines and lists. */
function layout(text) {
  const out = [];
  let list = [];
  let kind = null;
  const flush = () => {
    if (list.length) out.push(list.join('\n'));
    list = [];
    kind = null;
  };
  for (const line of text.split('\n').map((l) => l.trim())) {
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[•\-–]\s+(.+)$/);
    const step = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (bullet || step) {
      const k = bullet ? 'ul' : 'ol';
      if (kind && kind !== k) flush();
      kind = k;
      const body = boldLabel(bullet ? bullet[1] : step[2]);
      list.push(`${bullet ? '-' : `${step[1]}.`} ${decorate(body.replace(/[.;]\s*$/, ''))}`);
      continue;
    }
    flush();
    // "Grades:" / "Look for:" on its own line introduces the list below it
    if (/^[^.]{2,60}:$/.test(line)) out.push(`**${line}**`);
    else out.push(formatAnswer(line));
  }
  flush();
  return out.join('\n\n');
}

function difficulty(q, answer) {
  const n = answer.length;
  if (/\b(manage|management|approach|treat|treatment|differentiate|differ|why|indications?|how do you|what do you do|complications|order of)\b/i.test(q)) return n < 380 ? 2 : 3;
  if (/^(what is|what are|define|list|name|which|how many)\b/i.test(q) && n < 420) return 1;
  return 2;
}

/* ───────────── putting it together ───────────── */

const mains = rows.filter((r) => !r.parent);
const followsOf = new Map();
for (const r of rows.filter((r) => r.parent)) (followsOf.get(r.parent) ?? followsOf.set(r.parent, []).get(r.parent)).push(r);

const notes = [];
const questions = mains.map((r) => {
  const topic = BY_ID[r.id] ?? BY_SUB[r.sub];
  if (!topic) throw new Error(`No topic for ${r.id} (${r.sub})`);
  const follows = followsOf.get(r.id) ?? [];
  for (const x of [r, ...follows]) if (x.note) notes.push([x.id, x.question, x.note]);
  const blocks = follows.map((f) => `:::followup ${f.question}\n${layout(f.answer)}\n:::`);
  return {
    id: `pd-q${r.id.slice(1).padStart(3, '0')}`, // main questions have no dot: Q7 → pd-q007
    title: r.question,
    type: 'viva',
    topicIds: EMERGENCY.has(r.id) ? [topic, 'pd-emergencies'] : [topic],
    doctorIds: [],
    modelAnswer: unpack([MARKUP[r.id] ?? layout(r.answer), ...blocks].join('\n\n')),
    difficulty: difficulty(r.question, r.answer),
    _row: r.id,
  };
});
for (const [parent] of followsOf) if (!mains.some((m) => m.id === parent)) throw new Error(`Follow-up parent missing: ${parent}`);
const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) throw new Error(`Duplicate id ${q.id}`);
  ids.add(q.id);
}

/* ───────────── preview, review sheet, import ───────────── */

const list = questions.map(({ _row, ...q }) => q);
const usedTopics = new Set(list.flatMap((q) => q.topicIds));
const topicList = TOPICS.filter(([id]) => usedTopics.has(id)).map(([id, subjectId, name], i) => ({ id, name, subjectId, sort: 100 + i }));
writeFileSync('src/dev/paediatrics-preview.json', JSON.stringify({ subjects: NEW_SUBJECTS.map(([id, name]) => ({ id, name })), topics: topicList.map(({ sort, ...t }) => t), questions: list }, null, 1));

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' };
const count = (l) => list.filter((q) => q.difficulty === l).length;
const followCount = list.reduce((n, q) => n + (q.modelAnswer.match(/:::followup/g) ?? []).length, 0);
let md = `# Paediatrics import: review sheet\n\nFrom \`Paediatric_Exam_QA.xlsx\` (${rows.length} rows). Built by \`supabase/seed/build-paeds.mjs\`.\n\n`;
md += `- **${list.length} questions**, with **${followCount} follow-ups** as toggles; ${list.filter((q) => q.topicIds.includes('pd-emergencies')).length} also shown under Emergency management.\n`;
md += `- Difficulty (draft): ${count(1)} easy · ${count(2)} moderate · ${count(3)} difficult.\n`;
md += `- **${used.size} answers corrected** to BNFc, NICE, BTS, Resuscitation Council UK and WHO guidance; the vaccination schedule follows WHO.\n- Everything is imported as a draft. No examiner names.\n\n`;
md += `## Notes from the spreadsheet (for review; not shown to students)\n\n` + notes.map(([id, q, n]) => `- ${id}: ${q} — ${n}`).join('\n') + '\n\n## Where everything goes\n\n';
for (const t of topicList) {
  const qs = list.filter((q) => q.topicIds.includes(t.id));
  md += `**${t.name}** (${t.subjectId}, ${qs.length})\n\n` + qs.map((q) => `- ${LEVEL[q.difficulty]}: ${q.title}${q.modelAnswer.includes(':::followup') ? ` _(+${q.modelAnswer.match(/:::followup/g).length} follow-up)_` : ''}`).join('\n') + '\n\n';
}
writeFileSync('supabase/seed/content/paeds-review.md', md);

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- The Clinical Room · Paediatrics question bank (generated by build-paeds.mjs; git-ignored)\n-- Imports ${list.length} questions as DRAFTS into topics under the Paediatrics subjects. Safe to run again.\n\nbegin;\n\n`;
sql += `insert into public.subjects (specialty_id, id, name, sort) values\n` + NEW_SUBJECTS.map(([id, name, sort]) => `  ('paediatrics', ${sq(id)}, ${sq(name)}, ${sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name;\n\n`;
sql += `insert into public.topics (specialty_id, id, name, subject_id, sort) values\n` + topicList.map((t) => `  ('paediatrics', ${sq(t.id)}, ${sq(t.name)}, ${sq(t.subjectId)}, ${t.sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
sql += `insert into public.questions (specialty_id, id, title, type, model_answer, difficulty, status, sort) values\n` + list.map((q, i) => `  ('paediatrics', ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.modelAnswer)}, ${q.difficulty}, 'draft', ${i + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, model_answer = excluded.model_answer, difficulty = excluded.difficulty;\n\n`;
sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + list.flatMap((q) => q.topicIds.map((t) => `  ('paediatrics', ${sq(q.id)}, ${sq(t)})`)).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = 'paediatrics' group by status;\n`;
writeFileSync('supabase/seed/paeds-import.sql', sql);

console.log(JSON.stringify({ rows: rows.length, questions: list.length, followUps: followCount, topics: topicList.length, fixes: used.size, notes: notes.length, easy: count(1), moderate: count(2), difficult: count(3) }));

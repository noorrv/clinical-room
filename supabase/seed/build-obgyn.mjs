// Builds the OBGYN question bank from the exam spreadsheet, for review and import.
//
// Reads  supabase/seed/content/obgyn-sheets.json   (the spreadsheet's rows; git-ignored, protected)
//        supabase/seed/content/obgyn-fixes.mjs     (guideline corrections; git-ignored)
// Writes src/dev/obgyn-preview.json                (dev-only preview, ?preview-bank=1; git-ignored)
//        supabase/seed/content/obgyn-review.md     (what goes where, for review; git-ignored)
//        supabase/seed/obgyn-import.sql            (the import, as drafts; git-ignored)
//
// Each case is its own page ("case-…" topic) with its scenario at the top, under its subject,
// ordered by how often it was asked. The most asked cases are also listed together.
// Run: node supabase/seed/build-obgyn.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { boldLabel, decorate, formatAnswer, unpack } from './format-answer.mjs';
import { MARKUP, PATCHES } from './content/obgyn-fixes.mjs';

const [, ...raw] = JSON.parse(readFileSync('supabase/seed/content/obgyn-sheets.json', 'utf8'))['Question Bank'];

/* ───────────── the cases ───────────── */

const used = new Set();
const cases = new Map();
raw.forEach(([caseId, category, kind, topic, times, scenario, question, answer], row) => {
  let a = answer;
  for (const [from, to] of PATCHES[row] ?? []) {
    if (!a.includes(from)) throw new Error(`Fix for row ${row} (${caseId}) doesn't match: ${from.slice(0, 60)}`);
    a = a.replace(from, to);
    used.add(String(row));
  }
  if (!cases.has(caseId)) cases.set(caseId, { id: caseId, category, kind, topic: topic.trim(), times: Number(times) || 0, scenario: scenario.trim(), questions: [] });
  cases.get(caseId).questions.push({ question: question.trim(), answer: a.trim(), row });
});
const unused = Object.keys(PATCHES).filter((k) => !used.has(k));
if (unused.length) throw new Error(`Fixes for rows not found: ${unused.join(', ')}`);

/* ───────────── where everything goes ───────────── */

const NEW_SUBJECTS = [
  ['clinical-skills', 'Clinical skills (OSCE)', 8],
  ['most-asked', 'Most frequently asked', 0], // first on the board
];

const SUBJECT_OF = (id) =>
  /^SK-/.test(id) ? 'clinical-skills'
  : /^AN-/.test(id) ? 'antenatal-care'
  : /^EP-|^OB-13$/.test(id) ? 'obstetrics'
  : /^OB-(03|08|09|10|12)$/.test(id) ? 'labour-delivery'
  : /^OB-/.test(id) ? 'obstetric-emergencies'
  : /^GY-/.test(id) ? 'gynaecology'
  : /^CO-/.test(id) ? 'reproductive-medicine'
  : /^IN-/.test(id) ? 'infertility'
  : null;

// the 12 most asked cases, as the spreadsheet's overview lists them
const MOST_ASKED = ['OB-01', 'SK-05', 'OB-05', 'GY-04', 'SK-01', 'OB-03', 'SK-11', 'SK-08', 'SK-09', 'AN-01', 'GY-01', 'OB-06'];

/* ───────────── the answers ───────────── */

/** The spreadsheet's lines laid out for study: "•" bullets, "1)" steps, labelled lines; exam tips boxed. */
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
    const tip = line.match(/^Exam tip:\s*(.+)$/i);
    if (tip) {
      flush();
      out.push(`:::tip Exam tip\n${decorate(tip[1].charAt(0).toUpperCase() + tip[1].slice(1))}\n:::`);
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
    if (/^[^.]{2,70}:$/.test(line)) out.push(`**${line}**`);
    else out.push(formatAnswer(line));
  }
  flush();
  return out.join('\n\n');
}

function difficulty(q, answer) {
  const n = answer.length;
  if (/\b(manage|management|approach|treat|treatment|differentiate|differ|why|indications?|how (do|will) you|what next|step by step|complications|counsel)\b/i.test(q)) return n < 420 ? 2 : 3;
  if (/^(what is|what are|define|list|name|which|describe the types)\b/i.test(q) && n < 450) return 1;
  return 2;
}

/* ───────────── putting it together ───────────── */

const topicId = (caseId) => `case-${caseId.toLowerCase()}`;
const topics = [];
const questions = [];
const bySubject = new Map();
for (const c of cases.values()) {
  const subjectId = SUBJECT_OF(c.id);
  if (!subjectId) throw new Error(`No subject for ${c.id}`);
  (bySubject.get(subjectId) ?? bySubject.set(subjectId, []).get(subjectId)).push(c);
}
for (const [subjectId, list] of bySubject) {
  // most asked first within each subject (ties keep the spreadsheet's order)
  list.sort((a, b) => b.times - a.times);
  list.forEach((c, rank) => {
    topics.push({ id: topicId(c.id), name: c.topic, description: c.scenario, subjectId, sort: 100 + rank, _times: c.times });
    c.questions.forEach((q, n) => {
      questions.push({
        id: `ob-${c.id.toLowerCase().replace('-', '')}-${n + 1}`,
        title: q.question,
        type: 'viva',
        // shown under the question only where the page isn't the case's own (the most-asked list)
        scenario: c.scenario,
        topicIds: MOST_ASKED.includes(c.id) ? [topicId(c.id), 'ob-most-asked'] : [topicId(c.id)],
        doctorIds: [],
        modelAnswer: MARKUP[q.row] ?? unpack(layout(q.answer)),
        difficulty: difficulty(q.question, q.answer),
      });
    });
  });
}
topics.push({ id: 'ob-most-asked', name: 'The 12 most asked cases', description: null, subjectId: 'most-asked', sort: 1, _times: 0 });
for (const id of MOST_ASKED) if (!cases.has(id)) throw new Error(`Most-asked case missing: ${id}`);

/* ───────────── preview, review sheet, import ───────────── */

writeFileSync('src/dev/obgyn-preview.json', JSON.stringify({ subjects: NEW_SUBJECTS.map(([id, name]) => ({ id, name })), topics: topics.map(({ sort, _times, ...t }) => t), questions }, null, 1));

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' };
const count = (l) => questions.filter((q) => q.difficulty === l).length;
let md = `# OBGYN import: review sheet\n\nFrom \`OBGYN_OSCE_Question_Bank.xlsx\` (${raw.length} rows). Built by \`supabase/seed/build-obgyn.mjs\`.\n\n`;
md += `- **${cases.size} cases**, each its own page with its scenario, holding **${questions.length} questions**.\n`;
md += `- The 12 most asked cases (${questions.filter((q) => q.topicIds.includes('ob-most-asked')).length} questions) are also listed under Most frequently asked.\n`;
md += `- Difficulty (draft): ${count(1)} easy · ${count(2)} moderate · ${count(3)} difficult.\n- **${used.size} answers corrected** to RCOG, NICE, FSRH, BASHH and BSH guidance.\n- Everything is imported as a draft. No examiner names.\n\n## Where everything goes\n\n`;
for (const [subjectId, list] of bySubject) md += `### ${subjectId}\n\n` + list.map((c) => `- ${c.topic} (asked about ${c.times} times, ${c.questions.length} questions)`).join('\n') + '\n\n';
writeFileSync('supabase/seed/content/obgyn-review.md', md);

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- The Clinical Room · OBGYN question bank (generated by build-obgyn.mjs; git-ignored)\n-- Imports ${questions.length} questions in ${cases.size} cases as DRAFTS. Safe to run again.\n\nbegin;\n\n`;
sql += `insert into public.subjects (specialty_id, id, name, sort) values\n` + NEW_SUBJECTS.map(([id, name, sort]) => `  ('obgyn', ${sq(id)}, ${sq(name)}, ${sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, sort = excluded.sort;\n\n`;
sql += `insert into public.topics (specialty_id, id, name, description, subject_id, sort) values\n` + topics.map((t) => `  ('obgyn', ${sq(t.id)}, ${sq(t.name)}, ${t.description ? sq(t.description) : 'null'}, ${sq(t.subjectId)}, ${t.sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, description = excluded.description, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
sql += `insert into public.questions (specialty_id, id, title, type, scenario, model_answer, difficulty, status, sort) values\n` + questions.map((q, i) => `  ('obgyn', ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.scenario)}, ${sq(q.modelAnswer)}, ${q.difficulty}, 'draft', ${i + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, scenario = excluded.scenario, model_answer = excluded.model_answer, difficulty = excluded.difficulty;\n\n`;
sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + questions.flatMap((q) => q.topicIds.map((t) => `  ('obgyn', ${sq(q.id)}, ${sq(t)})`)).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = 'obgyn' group by status;\n`;
writeFileSync('supabase/seed/obgyn-import.sql', sql);

console.log(JSON.stringify({ rows: raw.length, cases: cases.size, questions: questions.length, topics: topics.length, fixes: used.size, easy: count(1), moderate: count(2), difficult: count(3) }));

// Builds the Paediatrics "Focused history" sheets, for review and import.
//
// Reads  supabase/seed/content/peds-history-*.mjs  (the written cases; git-ignored, protected)
// Writes src/dev/paediatrics-preview.json          (adds them to the dev preview, ?preview-bank=1; git-ignored)
//        supabase/seed/peds-history-import-N.sql    (the subject, topics and cases, published; git-ignored)
//
// Each case is one question whose answer is a history chart (:::patient, :::section …); its topic page shows it
// as a history sheet, and the subject has its own "Focused history" tab.
// Run: node supabase/seed/build-peds-history.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { PEDS_HISTORY1 } from './content/peds-history-1.mjs';
import { PEDS_HISTORY2 } from './content/peds-history-2.mjs';
import { PEDS_HISTORY3 } from './content/peds-history-3.mjs';
import { PEDS_HISTORY4 } from './content/peds-history-4.mjs';

const SPECIALTY = 'paediatrics';
const SOURCE = 'Focused history station';
const SUBJECT = { id: 'focused-history', name: 'Focused history', sort: 11 };

// topic id, name, description: in the order they appear in the tab
const TOPICS = [
  ['ph-dv', 'Diarrhoea and vomiting', 'A 14-month-old with diarrhoea and vomiting: red flags, dehydration, the DDx and the background.'],
  ['ph-fever', 'Fever', 'A 2-year-old with fever: finding the focus, the NICE traffic light, meningitis and Kawasaki disease.'],
  ['ph-wheeze', 'Cough and wheeze', 'A 3-year-old with recurrent wheeze: asthma vs viral wheeze, triggers, atopy and inhaler technique.'],
  ['ph-seizure', 'Seizure', 'An 18-month-old with a seizure and fever: the witness account, simple vs complex febrile seizure, meningitis.'],
  ['ph-jaundice', 'Neonatal jaundice', 'A 5-day-old with jaundice: timing, stool colour, blood groups, G6PD and the threshold chart.'],
  ['ph-pale', 'Pallor in a child', 'A 4-year-old with pallor: dietary history and cow\'s milk, thalassaemia and consanguinity, red flags for leukaemia.'],
  ['ph-stridor', 'Stridor', 'A 2-year-old with stridor and a barking cough: croup, foreign body, epiglottitis, severity and red flags.'],
  ['ph-recurchest', 'Recurrent respiratory infections', 'A 4-year-old with chronic wet cough and recurrent chest infections: cystic fibrosis, ciliary dyskinesia, immunodeficiency, TB.'],
  ['ph-cardiac', 'Infant with suspected congenital heart disease', 'A 3-month-old with tachypnoea and feeding difficulty: heart failure from a left-to-right shunt, red flags, maternal and family history.'],
  ['ph-vomit', 'Vomiting in an infant', 'A 5-week-old with vomiting after feeds: pyloric stenosis, bilious vomiting, reflux, dehydration and family history.'],
  ['ph-floppy', 'Poor feeding and hypotonia in a neonate', 'A 3-week-old with poor feeding, lethargy and hypotonia: neonatal sepsis, hypoglycaemia, metabolic disease, neuromuscular causes.'],
  ['ph-abdopain', 'Acute abdominal pain', 'A 9-year-old boy with acute abdominal pain: appendicitis, the pain-vomiting sequence, mimics, red flags and intussusception.'],
  ['ph-constip', 'Constipation', 'A 3-year-old with constipation: functional constipation and overflow, red flags for Hirschsprung disease, NICE treatment.'],
  ['ph-oedema', 'Periorbital and generalised oedema', 'A 4-year-old with periorbital swelling and oedema: nephrotic vs nephritic syndrome, complications, varicella status.'],
  ['ph-haematuria', 'Macroscopic haematuria', 'A 7-year-old with cola-coloured urine after a sore throat: post-streptococcal glomerulonephritis and the differential.'],
  ['ph-growth', 'Faltering growth', 'A 2-year-old with faltering growth: diet and mealtime history, malabsorption, parental heights, psychosocial factors.'],
];

const topicIds = new Set(TOPICS.map((t) => t[0]));
const seen = new Set();
const cases = [...PEDS_HISTORY1, ...PEDS_HISTORY2, ...PEDS_HISTORY3, ...PEDS_HISTORY4].map(([id, topicId, difficulty, title, answer], i) => {
  if (seen.has(id)) throw new Error(`Duplicate id ${id}`);
  seen.add(id);
  if (!topicIds.has(topicId)) throw new Error(`${id}: unknown topic ${topicId}`);
  if (!/^\s*:::patient\b/.test(answer)) throw new Error(`${id}: a history sheet starts with :::patient`);
  if (/ · /.test(answer)) throw new Error(`${id}: dot-separated list`);
  if (/\*\*\*/.test(answer)) throw new Error(`${id}: bold-italic markup`);
  const open = (answer.match(/^:::\w+/gm) ?? []).length;
  const close = (answer.match(/^:::$/gm) ?? []).length;
  if (open !== close) throw new Error(`${id}: unbalanced boxes`);
  if ((answer.match(/\{\{/g) ?? []).length !== (answer.match(/\}\}/g) ?? []).length) throw new Error(`${id}: unbalanced {{comments}}`);
  let cols = null;
  answer.split('\n').forEach((l, n) => {
    if (!l.startsWith('|')) return void (cols = null);
    const c = l.split('|').length;
    if (cols === null) cols = c;
    else if (c !== cols) throw new Error(`${id}: table columns differ on line ${n + 1}`);
  });
  return { id, title, type: 'viva', topicIds: [topicId], doctorIds: [], modelAnswer: answer.trim(), difficulty, source: SOURCE, _sort: 2000 + i };
});

/* ───────────── dev preview ───────────── */

const previewPath = 'src/dev/paediatrics-preview.json';
const preview = JSON.parse(readFileSync(previewPath, 'utf8'));
preview.subjects = (preview.subjects ?? []).filter((s) => s.id !== SUBJECT.id).concat({ id: SUBJECT.id, name: SUBJECT.name });
preview.topics = preview.topics.filter((t) => !topicIds.has(t.id)).concat(TOPICS.map(([id, name, description]) => ({ id, name, description, subjectId: SUBJECT.id })));
preview.questions = preview.questions.filter((q) => !q.id.startsWith('ph-')).concat(cases.map(({ _sort, ...q }) => q));
writeFileSync(previewPath, JSON.stringify(preview, null, 1));

/* ───────────── import (published: run after the cases are reviewed in the preview) ───────────── */

// split into parts of about 35 KB, because the SQL editor fails on very large scripts
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const row = (q) => `  (${sq(SPECIALTY)}, ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.modelAnswer)}, ${q.difficulty}, ${sq(SOURCE)}, 'published', ${q._sort})`;

function emit(list, prefix) {
  const chunks = [[]];
  let size = 0;
  for (const q of list) {
    const n = row(q).length;
    if (size + n > 35000 && chunks.at(-1).length) { chunks.push([]); size = 0; }
    chunks.at(-1).push(q);
    size += n;
  }
  return chunks.map((chunk, i) => {
    let sql = `-- The Clinical Room · Paediatrics "Focused history" sheets, part ${i + 1} of ${chunks.length} (generated by build-peds-history.mjs; git-ignored)\n-- ${chunk.length} ${chunk.length === 1 ? 'case' : 'cases'}, published. Run the parts in order. Safe to run again.\n\nbegin;\n\n`;
    if (i === 0) {
      sql += `insert into public.subjects (specialty_id, id, name, sort) values (${sq(SPECIALTY)}, ${sq(SUBJECT.id)}, ${sq(SUBJECT.name)}, ${SUBJECT.sort})\non conflict (specialty_id, id) do update set name = excluded.name;\n\n`;
      sql += `insert into public.topics (specialty_id, id, name, description, subject_id, sort) values\n` + TOPICS.map(([id, name, description], j) => `  (${sq(SPECIALTY)}, ${sq(id)}, ${sq(name)}, ${sq(description)}, ${sq(SUBJECT.id)}, ${j + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, description = excluded.description, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
    }
    sql += `insert into public.questions (specialty_id, id, title, type, model_answer, difficulty, source, status, sort) values\n` + chunk.map(row).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, model_answer = excluded.model_answer, difficulty = excluded.difficulty, source = excluded.source, status = excluded.status;\n\n`;
    sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + chunk.map((q) => `  (${sq(SPECIALTY)}, ${sq(q.id)}, ${sq(q.topicIds[0])})`).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect id, status from public.questions where specialty_id = ${sq(SPECIALTY)} and source = ${sq(SOURCE)} order by sort;\n`;
    writeFileSync(`supabase/seed/${prefix}-${i + 1}.sql`, sql);
    return Math.round(sql.length / 1024);
  });
}

// every case, and (for a later batch) just the cases added since the last import
const sizes = emit(cases, 'peds-history-import');
// NEW_FROM=ph-xxx-1 node supabase/seed/build-peds-history.mjs also writes peds-history-new-N.sql with only the cases from that id on
const NEW_FROM = process.env.NEW_FROM;
const newSizes = NEW_FROM && cases.some((q) => q.id === NEW_FROM) ? emit(cases.slice(cases.findIndex((q) => q.id === NEW_FROM)), 'peds-history-new') : [];

console.log(JSON.stringify({ cases: cases.length, topics: TOPICS.length, importKB: sizes, newKB: newSizes }));

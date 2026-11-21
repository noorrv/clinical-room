// Builds the Medicine "Clinical examination stations" (OSCE oral questions), for review and import.
//
// Reads  supabase/seed/content/med-stations-{1,2,3}.mjs  (the written stations; git-ignored, protected)
// Writes src/dev/medicine-preview.json                  (adds them to the dev preview, ?preview-bank=1; git-ignored)
//        supabase/seed/content/med-stations-review.md    (every question by station, for review; git-ignored)
//        supabase/seed/medicine-stations-import-N.sql     (the new subject, topics and questions, as DRAFTS)
//        supabase/seed/medicine-stations-publish.sql      (publishes them and links existing questions into the stations)
//
// Each new question's source is "Short-case oral question", which shows the "Short case" mark on the site.
// Run: node supabase/seed/build-medicine-stations.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { MED_STATIONS1 } from './content/med-stations-1.mjs';
import { MED_STATIONS2 } from './content/med-stations-2.mjs';
import { MED_STATIONS3 } from './content/med-stations-3.mjs';

const SPECIALTY = 'medicine';
const SOURCE = 'Short-case oral question';
const SUBJECT = { id: 'clinical-stations', name: 'Clinical examination stations', sort: 16 };

const TOPICS = [
  ['ms-general', 'General examination and the general look', 'A general examination in 4 to 6 minutes: pallor, cachexia, classic faces, vitiligo, bruising, and the signs of liver, heart and kidney disease.'],
  ['ms-hands', 'Hands, nails and the pulse', 'Clubbing, nail signs, tremor and other hand signs; the radial pulse, AF and anticoagulation.'],
  ['ms-legs', 'The lower limb: oedema, DVT and ulcers', 'Examining and grading oedema, unilateral vs bilateral causes, cellulitis vs DVT, managing DVT, ulcers, pulses and gangrene.'],
  ['ms-heart', 'The precordium and valve disease', 'Auscultation and heart sounds, systolic and diastolic murmurs, manoeuvres, valve replacement and devices.'],
  ['ms-hf', 'Heart failure and the JVP', 'The JVP, signs and diagnosis of heart failure, cardiac vs renal oedema, acute and long-term management.'],
  ['ms-chest', 'Chest examination: technique and sounds', 'Inspection, palpation and percussion, breath sounds, vocal resonance, crackles and wheeze, respiratory failure.'],
  ['ms-pleura', 'Pleural effusion, consolidation and collapse', 'Telling the dull chest apart, investigating an effusion and Light\'s criteria, causes, and pneumonia.'],
  ['ms-airways', 'COPD, asthma, bronchiectasis and ILD', 'COPD and its exacerbations, acute asthma, bronchiectasis, interstitial lung disease, sleep apnoea and PE.'],
  ['ms-abdo', 'The abdomen: ascites, liver and spleen', 'Distension and ascites, SAAG and paracentesis, SBP, liver span and hepatomegaly, splenomegaly, renal bruits.'],
  ['ms-liver', 'Jaundice and chronic liver disease', 'Looking for jaundice, its types and causes, acute vs chronic liver disease, encephalopathy, cirrhosis and portal hypertension.'],
  ['ms-kidney', 'Kidney disease, dialysis and fluid balance', 'Dialysis access, causes of CKD, AKI vs CKD, nephrotic syndrome, dialysis indications, hyperkalaemia and the urine bag.'],
  ['ms-neuro', 'Neurology, eyes, thyroid and endocrine', 'Reflexes, facial nerve, pupils and ptosis, consciousness and stroke, goitre and thyroid status, Addison\'s crisis.'],
  ['ms-blood', 'Anaemia, bleeding and the blood', 'Causes of anaemia, iron deficiency, thalassaemia, and the patient with bruises and petechiae.'],
  ['ms-history', 'Focused history stations', 'How to take a focused history, with worked cases from chest pain to back pain.'],
];

// existing (published) Medicine questions that already cover part of a station: linked in, not rewritten
const LINKS = {
  'ms-general': ['im-q006', 'im-q536', 'im-q063', 'im-q551'],
  'ms-hands': ['im-q089', 'im-q090', 'im-q578', 'im-q636', 'im-q637', 'im-q683', 'im-q681', 'im-q029', 'im-q278'],
  'ms-legs': ['im-q042', 'im-q487', 'im-q435', 'im-q374', 'im-q375', 'im-q376', 'im-q377'],
  'ms-heart': ['im-q395', 'im-q468'],
  'ms-hf': ['im-q177', 'im-q355', 'im-q356', 'im-q493', 'im-q595', 'im-q550', 'im-sc-nyha'],
  'ms-chest': ['im-q043', 'im-q044', 'im-q186', 'im-q263', 'im-q285', 'im-q520'],
  'ms-pleura': ['im-q138', 'im-q187', 'im-q608', 'im-q585', 'im-q384', 'im-q606', 'im-sc-curb65'],
  'ms-airways': ['im-q264', 'im-q265', 'im-q327', 'im-q009', 'im-q483', 'im-q408', 'im-q410', 'im-q566', 'im-q497', 'im-q400', 'im-sc-wells'],
  'ms-abdo': ['im-q213', 'im-q224', 'im-q225', 'im-q240', 'im-q602', 'im-q641', 'im-q647', 'im-q648', 'im-sc-saag'],
  'ms-liver': ['im-q179', 'im-q180', 'im-q423', 'im-q672', 'im-sc-childpugh'],
  'ms-kidney': ['im-q197', 'im-q205', 'im-q478'],
  'ms-neuro': ['im-q127', 'im-q133', 'im-q232', 'im-q397', 'im-q670', 'im-sc-gcs', 'im-sc-nihss'],
  'ms-blood': ['im-q107', 'im-q191', 'im-q640', 'im-q642', 'im-q331', 'im-q065'],
  'ms-history': [],
};

const topicIds = new Set(TOPICS.map((t) => t[0]));
const seen = new Set();
const questions = [...MED_STATIONS1, ...MED_STATIONS2, ...MED_STATIONS3].map(([id, topicId, difficulty, title, answer], i) => {
  if (seen.has(id)) throw new Error(`Duplicate id ${id}`);
  seen.add(id);
  if (!topicIds.has(topicId)) throw new Error(`${id}: unknown topic ${topicId}`);
  if (/ · /.test(answer)) throw new Error(`${id}: dot-separated list`);
  if (/\*\*\*/.test(answer)) throw new Error(`${id}: bold-italic markup`);
  if (/^#+ .*\*/m.test(answer)) throw new Error(`${id}: markup inside a heading`);
  const open = (answer.match(/^:::\w+/gm) ?? []).length;
  const close = (answer.match(/^:::$/gm) ?? []).length;
  if (open !== close) throw new Error(`${id}: unbalanced boxes`);
  let cols = null;
  answer.split('\n').forEach((l, n) => {
    if (!l.startsWith('|')) return void (cols = null);
    const c = l.split('|').length;
    if (cols === null) cols = c;
    else if (c !== cols) throw new Error(`${id}: table columns differ on line ${n + 1}`);
  });
  return { id, title, type: 'viva', topicIds: [topicId], doctorIds: [], modelAnswer: answer.trim(), difficulty, source: SOURCE, _sort: 1000 + i };
});
const followUps = questions.reduce((n, q) => n + (q.modelAnswer.match(/^:::followup /gm) ?? []).length, 0);

/* ───────────── dev preview ───────────── */

const previewPath = 'src/dev/medicine-preview.json';
const preview = JSON.parse(readFileSync(previewPath, 'utf8'));
preview.subjects = (preview.subjects ?? []).filter((s) => s.id !== SUBJECT.id).concat({ id: SUBJECT.id, name: SUBJECT.name });
preview.topics = preview.topics.filter((t) => !topicIds.has(t.id)).concat(TOPICS.map(([id, name, description]) => ({ id, name, description, subjectId: SUBJECT.id })));
preview.questions = preview.questions.filter((q) => !q.id.startsWith('ms-')).concat(questions.map(({ _sort, ...q }) => q));
writeFileSync(previewPath, JSON.stringify(preview, null, 1));

/* ───────────── review sheet ───────────── */

let md = `# Medicine clinical examination stations (review)\n\n${questions.length} main questions with ${followUps} follow-ups, in ${TOPICS.length} stations, plus ${Object.values(LINKS).flat().length} existing questions linked in. Imported as drafts; links are added when published.\n\n`;
for (const [id, name] of TOPICS) {
  md += `## ${name}\n\n` + questions.filter((q) => q.topicIds[0] === id).map((q) => `- **${q.id}** ${q.title}`).join('\n') + `\n\nLinked: ${LINKS[id].join(', ') || 'none'}\n\n`;
}
writeFileSync('supabase/seed/content/med-stations-review.md', md);

/* ───────────── import (drafts) ───────────── */

// split into parts of about 35 KB, because the SQL editor fails on very large scripts
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qRow = (q) => `  (${sq(SPECIALTY)}, ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.modelAnswer)}, ${q.difficulty}, ${sq(SOURCE)}, 'draft', ${q._sort})`;
const chunks = [[]];
let size = 0;
for (const q of questions) {
  const n = qRow(q).length;
  if (size + n > 35000 && chunks.at(-1).length) { chunks.push([]); size = 0; }
  chunks.at(-1).push(q);
  size += n;
}
const sizes = chunks.map((chunk, i) => {
  let sql = `-- The Clinical Room · Medicine "Clinical examination stations", part ${i + 1} of ${chunks.length} (generated by build-medicine-stations.mjs; git-ignored)\n-- ${chunk.length} questions as DRAFTS. Run the parts in order. Safe to run again.\n\nbegin;\n\n`;
  if (i === 0) {
    sql += `insert into public.subjects (specialty_id, id, name, sort) values (${sq(SPECIALTY)}, ${sq(SUBJECT.id)}, ${sq(SUBJECT.name)}, ${SUBJECT.sort})\non conflict (specialty_id, id) do update set name = excluded.name, sort = excluded.sort;\n\n`;
    sql += `insert into public.topics (specialty_id, id, name, description, subject_id, sort) values\n` + TOPICS.map(([id, name, description], j) => `  (${sq(SPECIALTY)}, ${sq(id)}, ${sq(name)}, ${sq(description)}, ${sq(SUBJECT.id)}, ${j + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, description = excluded.description, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
  }
  sql += `insert into public.questions (specialty_id, id, title, type, model_answer, difficulty, source, status, sort) values\n` + chunk.map(qRow).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, model_answer = excluded.model_answer, difficulty = excluded.difficulty, source = excluded.source;\n\n`;
  sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + chunk.map((q) => `  (${sq(SPECIALTY)}, ${sq(q.id)}, ${sq(q.topicIds[0])})`).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = ${sq(SPECIALTY)} and source = ${sq(SOURCE)} group by status;\n`;
  writeFileSync(`supabase/seed/medicine-stations-import-${i + 1}.sql`, sql);
  return Math.round(sql.length / 1024);
});

/* ───────────── publish (and link existing questions in) ───────────── */

let pub = `-- Publishes the Medicine clinical examination stations and links existing questions into them.\nbegin;\n\nupdate public.questions set status = 'published' where specialty_id = ${sq(SPECIALTY)} and source = ${sq(SOURCE)};\n\n`;
pub += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + Object.entries(LINKS).flatMap(([t, ids]) => ids.map((q) => `  (${sq(SPECIALTY)}, ${sq(q)}, ${sq(t)})`)).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect t.name, count(*) from public.question_topics qt join public.topics t on t.specialty_id = qt.specialty_id and t.id = qt.topic_id where t.subject_id = ${sq(SUBJECT.id)} group by t.name, t.sort order by t.sort;\n`;
writeFileSync('supabase/seed/medicine-stations-publish.sql', pub);

console.log(JSON.stringify({ questions: questions.length, followUps, stations: TOPICS.length, links: Object.values(LINKS).flat().length, importKB: sizes }));

// Builds the Surgery "Clinical examination stations" (short-case oral questions), for review and import.
//
// Reads  supabase/seed/content/stations-{1,2,3}.mjs     (the written stations; git-ignored, protected)
// Writes src/dev/surgery-preview.json                  (adds them to the dev preview, ?preview-bank=1; git-ignored)
//        supabase/seed/content/stations-review.md      (every question by station, for review; git-ignored)
//        supabase/seed/clinical-stations-import.sql     (the new subject, topics and questions, as DRAFTS)
//        supabase/seed/clinical-stations-publish.sql    (publishes them and links existing questions into the stations)
//
// Each new question's source is "Short-case oral question", which shows the "Short case" mark on the site.
// Run: node supabase/seed/build-clinical-stations.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { STATIONS1 } from './content/stations-1.mjs';
import { STATIONS2 } from './content/stations-2.mjs';
import { STATIONS3 } from './content/stations-3.mjs';

const SOURCE = 'Short-case oral question';
const SUBJECT = { id: 'clinical-stations', name: 'Clinical examination stations', sort: 17 };

const TOPICS = [
  ['cs-thyroid', 'Thyroid and neck swelling', 'Examine a thyroid or neck swelling and answer the examiner: retrosternal goitre, thyroid status and eye signs, after thyroidectomy, neck lumps.'],
  ['cs-hernia', 'Hernias and the groin', 'Examine a groin or incisional hernia: landmarks, cough impulse, reducibility, the occlusion test, complications and repair.'],
  ['cs-abdo', 'Abdominal examination', 'Exposure, inspection, scars and stomas, palpation of the liver and spleen, ascites and bowel sounds.'],
  ['cs-ruq', 'The jaundiced patient and right upper quadrant pain', 'Examining for jaundice, medical vs surgical jaundice, Murphy\'s sign, gallbladder pain and pancreatitis.'],
  ['cs-acute', 'Abdominal pain and intestinal obstruction', 'Right iliac fossa pain and appendicitis, upper GI bleeding, causes and X-rays of obstruction, abdominal pain in children.'],
  ['cs-vascular', 'Peripheral vascular and the hand', 'Lower and upper limb arteries, Buerger\'s and Allen\'s tests, ulnar and radial nerves, compartment and carpal tunnel syndromes.'],
  ['cs-urology', 'Kidneys, bladder and the urinary catheter', 'Examining the kidney, a suprapubic mass and retention, inserting a Foley catheter, renal and bladder trauma.'],
  ['cs-breast', 'Breast lump', 'Breast anatomy and what to do after examining a breast lump.'],
  ['cs-trauma', 'Trauma, burns and the chest drain', 'A bullet wound in the ER, shock classes, airway injury, the rule of nines and chest drains.'],
  ['cs-general', 'General examination and the post-operative patient', 'General examination, pain history, the post-operative patient, cannulas, drains and lumps.'],
];

// existing (published) questions that already cover part of a station: linked in, not rewritten
const LINKS = {
  'cs-thyroid': ['sx-q064', 'sx-q069', 'sx-q073', 'sx-q074', 'sx-q075', 'sx-q077', 'sx-q078', 'sx-f30', 'sx-f31', 'sx-f35', 'sx-f36', 'sx-f37', 'sx-f38', 'sx-f41'],
  'cs-hernia': ['sx-q088', 'sx-q090', 'sx-q091', 'sx-q092', 'sx-q093', 'sx-q095', 'sx-q096', 'sx-f46', 'sx-f47', 'sx-f48', 'sx-f49'],
  'cs-abdo': ['spx-1-demonstrate-palpation-of-the-spleen', 'spx-2-what-are-the-two-manoeuvres-for-splenic-palpat', 'spx-how-do-you-differentiate-an-enlarged-spleen-from', 'sx-q105', 'sx-q106', 'sx-q107', 'sx-q108', 'sx-q137', 'sx-f73', 'sx-f74'],
  'cs-ruq': ['murphy-technique', 'murphy-positive', 'murphy-instruction', 'murphy-finger-placement', 'murphy-which-hand', 'murphy-covered', 'other-signs', 'sx-q103', 'sx-q113', 'sx-q114', 'sx-q115', 'sx-q124', 'sx-f20', 'sx-f22', 'sx-f23'],
  'cs-acute': ['apx-17', 'apx-18', 'apx-19', 'apx-20', 'apx-32', 'sx-q098', 'obs-16', 'sx-q202', 'sx-f01', 'sx-q131'],
  'cs-vascular': ['sx-q147', 'sx-q191', 'sx-q198', 'sx-f75'],
  'cs-urology': ['sx-q156', 'sx-q157', 'sx-q158', 'sx-q159', 'sx-q183'],
  'cs-breast': ['sx-q080', 'sx-q081', 'sx-q085', 'sx-f43', 'sx-f44'],
  'cs-trauma': ['sx-q023', 'sx-q024', 'sx-q032', 'sx-q037', 'sx-q042'],
  'cs-general': ['sx-q017', 'sx-q033', 'sx-q149'],
};

const topicIds = new Set(TOPICS.map((t) => t[0]));
const seen = new Set();
const questions = [...STATIONS1, ...STATIONS2, ...STATIONS3].map(([id, topicId, difficulty, title, answer], i) => {
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

const previewPath = 'src/dev/surgery-preview.json';
const preview = JSON.parse(readFileSync(previewPath, 'utf8'));
preview.subjects = (preview.subjects ?? []).filter((s) => s.id !== SUBJECT.id).concat({ id: SUBJECT.id, name: SUBJECT.name });
preview.topics = preview.topics.filter((t) => !topicIds.has(t.id)).concat(TOPICS.map(([id, name, description]) => ({ id, name, description, subjectId: SUBJECT.id })));
preview.questions = preview.questions.filter((q) => !q.id.startsWith('cs-')).concat(questions.map(({ _sort, ...q }) => q));
writeFileSync(previewPath, JSON.stringify(preview, null, 1));

/* ───────────── review sheet ───────────── */

let md = `# Clinical examination stations (review)\n\n${questions.length} main questions with ${followUps} follow-ups, in ${TOPICS.length} stations, plus ${Object.values(LINKS).flat().length} existing questions linked in. Imported as drafts; links are added when published.\n\n`;
for (const [id, name] of TOPICS) {
  md += `## ${name}\n\n` + questions.filter((q) => q.topicIds[0] === id).map((q) => `- **${q.id}** ${q.title}`).join('\n') + `\n\nLinked: ${LINKS[id].join(', ')}\n\n`;
}
writeFileSync('supabase/seed/content/stations-review.md', md);

/* ───────────── import (drafts) ───────────── */

// split into parts of about 35 KB, because the SQL editor fails on very large scripts
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qRow = (q) => `  ('surgery', ${sq(q.id)}, ${sq(q.title)}, 'viva', ${sq(q.modelAnswer)}, ${q.difficulty}, ${sq(SOURCE)}, 'draft', ${q._sort})`;
const chunks = [[]];
let size = 0;
for (const q of questions) {
  const n = qRow(q).length;
  if (size + n > 35000 && chunks.at(-1).length) { chunks.push([]); size = 0; }
  chunks.at(-1).push(q);
  size += n;
}
const sizes = chunks.map((chunk, i) => {
  let sql = `-- The Clinical Room · Surgery "Clinical examination stations", part ${i + 1} of ${chunks.length} (generated by build-clinical-stations.mjs; git-ignored)\n-- ${chunk.length} questions as DRAFTS. Run the parts in order. Safe to run again.\n\nbegin;\n\n`;
  if (i === 0) {
    sql += `insert into public.subjects (specialty_id, id, name, sort) values ('surgery', ${sq(SUBJECT.id)}, ${sq(SUBJECT.name)}, ${SUBJECT.sort})\non conflict (specialty_id, id) do update set name = excluded.name, sort = excluded.sort;\n\n`;
    sql += `insert into public.topics (specialty_id, id, name, description, subject_id, sort) values\n` + TOPICS.map(([id, name, description], j) => `  ('surgery', ${sq(id)}, ${sq(name)}, ${sq(description)}, ${sq(SUBJECT.id)}, ${j + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, description = excluded.description, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
  }
  sql += `insert into public.questions (specialty_id, id, title, type, model_answer, difficulty, source, status, sort) values\n` + chunk.map(qRow).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, model_answer = excluded.model_answer, difficulty = excluded.difficulty, source = excluded.source;\n\n`;
  sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + chunk.map((q) => `  ('surgery', ${sq(q.id)}, ${sq(q.topicIds[0])})`).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = 'surgery' and source = ${sq(SOURCE)} group by status;\n`;
  writeFileSync(`supabase/seed/clinical-stations-import-${i + 1}.sql`, sql);
  return Math.round(sql.length / 1024);
});

/* ───────────── publish (and link existing questions in) ───────────── */

let pub = `-- Publishes the Clinical examination stations and links existing questions into them.\nbegin;\n\nupdate public.questions set status = 'published' where specialty_id = 'surgery' and source = ${sq(SOURCE)};\n\n`;
pub += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + Object.entries(LINKS).flatMap(([t, ids]) => ids.map((q) => `  ('surgery', ${sq(q)}, ${sq(t)})`)).join(',\n') + `\non conflict do nothing;\n\ncommit;\n\nselect t.name, count(*) from public.question_topics qt join public.topics t on t.specialty_id = qt.specialty_id and t.id = qt.topic_id where t.subject_id = ${sq(SUBJECT.id)} group by t.name, t.sort order by t.sort;\n`;
writeFileSync('supabase/seed/clinical-stations-publish.sql', pub);

console.log(JSON.stringify({ questions: questions.length, followUps, stations: TOPICS.length, links: Object.values(LINKS).flat().length, importKB: sizes }));

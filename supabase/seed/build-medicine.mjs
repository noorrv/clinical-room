// Builds the Internal Medicine question bank from the exam spreadsheet, for review and import.
// Run from the project folder:  node supabase/seed/build-medicine.mjs
//
// Reads  supabase/seed/content/im-sheets.json   (the spreadsheet's rows; git-ignored, protected)
// Writes src/dev/medicine-preview.json            (the development preview; git-ignored)
//        supabase/seed/content/medicine-review.md (the review sheet; git-ignored)
//        supabase/seed/medicine-import.sql        (the import, as drafts; git-ignored)
//
// What it does, as agreed:
//   • keeps answered questions only; leaves out the vague ones (confidence L, and questions about an
//     ECG or X-ray the spreadsheet doesn't include), and follow-ups that only make sense after them
//   • a question asked in several reports goes in once (the spreadsheet's repeat groups)
//   • follow-ups become toggles under the question they follow
//   • no sources and no examiner names
//   • each long case is its own page under a "Long cases" subject, its scenario at the top
//   • a draft difficulty for each question (1 easy, 2 moderate, 3 difficult), for review
//   • V answers (doses or numbers to check) are listed in the review sheet

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { decorate, formatAnswer } from './format-answer.mjs';

// clear, case-specific answers written in place of the spreadsheet's "Template" outlines (git-ignored)
const REWRITES_FILE = new URL('./content/medicine-rewrites.mjs', import.meta.url);
const REWRITES = existsSync(REWRITES_FILE) ? (await import(REWRITES_FILE.href)).REWRITES : {};

const sheets = JSON.parse(readFileSync('supabase/seed/content/im-sheets.json', 'utf8'));
const rowsOf = (name) => {
  const [h, ...rest] = sheets[name];
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, (r[i] ?? '').trim()])));
};
const all = rowsOf('All Questions');
const repeats = rowsOf('Repeated Questions');
const unusual = new Set(rowsOf('Unusual & Difficult').map((r) => r.ID));

/* ───────────── where each spreadsheet topic goes on the Medicine board ───────────── */

const NEW_SUBJECTS = [
  ['clinical-examination', 'Clinical examination', 11],
  ['history-taking', 'History taking and presentation', 12],
  ['oncology', 'Oncology', 13],
  ['toxicology-psychiatry', 'Toxicology and psychiatry', 14],
];

// a long case goes under the subject most of its questions are about (history and examination
// questions don't count); these two, all history and examination, are filed by hand
const CASE_SUBJECT_BY_HAND = { 25: 'haematology', 46: 'haematology' };
const subjectOfTopic = (t) => TOPICS[t]?.[0];

const TOPICS = {
  'Cardiology - Heart failure / pulmonary oedema': ['cardiology', 'heart-failure', 'Heart failure and pulmonary oedema'],
  'Cardiology - Chest pain / ACS / IHD': ['cardiology', 'chest-pain-acs', 'Chest pain, ACS and ischaemic heart disease'],
  'Cardiology - Arrhythmias / ECG': ['cardiology', 'arrhythmias-ecg', 'Arrhythmias and the ECG'],
  'Cardiology - Other (endocarditis, hypotension, signs)': ['cardiology', 'cardiac-signs', 'Endocarditis, hypotension and cardiac signs'],
  'Neurology - Other (LOC, encephalopathy, cranial nerves, cerebellar)': ['neurology', 'consciousness-cranial-nerves', 'Consciousness, encephalopathy, cranial nerves and the cerebellum'],
  'Neurology - Stroke': ['neurology', 'stroke', 'Stroke'],
  'Neurology - Facial nerve': ['neurology', 'facial-nerve', 'Facial nerve palsy'],
  'Endocrine - Diabetes mellitus (types, diagnosis, complications)': ['endocrinology', 'diabetes', 'Diabetes mellitus'],
  'Endocrine - DKA / HHS / hypoglycaemia': ['endocrinology', 'diabetic-emergencies', 'DKA, HHS and hypoglycaemia'],
  'Endocrine - Other (Addison, adrenal)': ['endocrinology', 'adrenal', 'Adrenal disease'],
  'Endocrine - Thyroid': ['endocrinology', 'thyroid', 'Thyroid disease'],
  'GI / Hepatology - Liver, ascites, jaundice, encephalopathy': ['hepatology', 'liver-disease', 'Liver disease, ascites, jaundice and encephalopathy'],
  'GI - Pancreatitis / biliary / ERCP / EUS': ['gastroenterology', 'pancreatobiliary', 'Pancreatitis, biliary disease, ERCP and EUS'],
  'GI - GI bleeding': ['gastroenterology', 'gi-bleeding', 'GI bleeding'],
  'GI - Other (diarrhoea, abdominal pain, vomiting)': ['gastroenterology', 'gi-symptoms', 'Diarrhoea, abdominal pain and vomiting'],
  'Respiratory - Pneumonia / cough / chest infection': ['respiratory', 'pneumonia', 'Pneumonia, cough and chest infection'],
  'Respiratory - Other (SOB approach, PE, fibrosis)': ['respiratory', 'breathlessness', 'Breathlessness, PE and pulmonary fibrosis'],
  'Respiratory - Asthma': ['respiratory', 'asthma', 'Asthma'],
  'Respiratory - Tuberculosis': ['respiratory', 'tuberculosis', 'Tuberculosis'],
  'Respiratory - COPD': ['respiratory', 'copd', 'COPD'],
  'Respiratory - Pleural effusion': ['respiratory', 'pleural-effusion', 'Pleural effusion'],
  'Haematology - Anaemia, bleeding, leukaemia, sickle cell, transfusion': ['haematology', 'haematology-core', 'Anaemia, bleeding, leukaemia, sickle cell and transfusion'],
  'Renal / Electrolytes - Hyperkalaemia, hypokalaemia, AKI': ['nephrology', 'potassium-aki', 'Potassium disorders and AKI'],
  'Rheumatology - RA': ['rheumatology', 'rheumatoid-arthritis', 'Rheumatoid arthritis'],
  'Rheumatology - SLE / alopecia': ['rheumatology', 'sle-alopecia', 'SLE and alopecia'],
  'Oncology - Cancer-specific / chemotherapy': ['oncology', 'cancers-chemotherapy', 'Cancers and chemotherapy'],
  'Oncology - Oncological emergencies / paraneoplastic / neutropenic fever': ['oncology', 'oncological-emergencies', 'Oncological emergencies and neutropenic fever'],
  'Infectious disease - Fever, typhoid, other': ['infectious-diseases', 'fever-infections', 'Fever, typhoid and other infections'],
  'Toxicology / Psychiatry': ['toxicology-psychiatry', 'poisoning-psychiatry', 'Poisoning and psychiatry'],
  'History taking & case presentation': ['history-taking', 'history-presentation', 'History taking and case presentation'],
  'Clinical examination - Chest auscultation': ['clinical-examination', 'chest-auscultation', 'Chest auscultation'],
  'Clinical examination - General look / face / pallor / jaundice': ['clinical-examination', 'general-look', 'General look, face, pallor and jaundice'],
  'Clinical examination - Limbs / abdomen / other': ['clinical-examination', 'limbs-abdomen', 'Limbs, abdomen and other signs'],
  'Clinical examination - Hand / nails / clubbing': ['clinical-examination', 'hands-nails', 'Hands, nails and clubbing'],
  Miscellaneous: ['infectious-diseases', 'fever-infections', 'Fever, typhoid and other infections'],
};

/* ───────────── which questions stay ───────────── */

const NEEDS_IMAGE = new Set(['Q046', 'Q115', 'Q118', 'Q571']); // "this ECG", "this X-ray": the picture isn't in the spreadsheet
// station questions about a finding the spreadsheet doesn't record, answered only with a template
const NO_FINDING = new Set(['Q117', 'Q404', 'Q458', 'Q495', 'Q552']);
const excluded = []; // [id, question, reason]
const byId = new Map(all.map((r) => [r.ID, r]));

// a question asked in several reports goes in once: the general (station) asking if there is one, else the first
const dupOf = new Map();
const groups = new Map();
for (const r of repeats) for (const id of r['Linked ID(s)'].match(/Q\d+/g) ?? []) (groups.get(r['Question (repeat group)']) ?? groups.set(r['Question (repeat group)'], new Set()).get(r['Question (repeat group)'])).add(id);
for (const [, ids] of groups) {
  const list = [...ids].filter((id) => byId.has(id)).sort((a, b) => +a.slice(1) - +b.slice(1));
  const station = list.find((id) => !byId.get(id)['Case context'].startsWith('[Long case]'));
  const keep = station ?? list[0];
  for (const id of list) if (id !== keep) dupOf.set(id, keep);
}

const isFollowUp = (r) => r['Sub-question / follow-up'].startsWith('Follow-up to:');
const vague = new Set();
for (const r of all) {
  if (r.Confidence === 'L') {
    vague.add(r.ID);
    excluded.push([r.ID, r['Exact question'], 'vague or unanswerable as reported (confidence L)']);
  } else if (NEEDS_IMAGE.has(r.ID)) {
    vague.add(r.ID);
    excluded.push([r.ID, r['Exact question'], 'refers to an ECG or X-ray that isn’t included']);
  } else if (NO_FINDING.has(r.ID)) {
    vague.add(r.ID);
    excluded.push([r.ID, r['Exact question'], 'asks for a finding the spreadsheet doesn’t record (template answer only)']);
  }
}

// a follow-up's parent: the question it names, asked just before it in the same report
function parentOf(r) {
  const named = r['Sub-question / follow-up'].replace(/^Follow-up to:\s*/, '').trim();
  const before = all.slice(0, all.indexOf(r)).reverse();
  return before.find((p) => p['Source report'] === r['Source report'] && !isFollowUp(p) && (p['Exact question'].startsWith(named.slice(0, 40)) || named.startsWith(p['Exact question'].slice(0, 40)))) ?? before.find((p) => p['Source report'] === r['Source report'] && !isFollowUp(p));
}

/* ───────────── cleaning the words ───────────── */

const clean = (q) =>
  q
    .replace(/\s*\(([^()]*?):\s*student[^()]*\)/gi, ' ($1)') // "(DM + unconscious: student said …)" → "(DM + unconscious)"
    .replace(/\s*\((?:student|asked|given to student|examiner|examiners)\b[^()]*\)/gi, '') // "(student: stroke)", "(examiner wanted dialysis)"
    .replace(/\s*\([^()]*\b(?:Dr|Doctor|Prof)\b\.?[^()]*\)/g, '') // "(Dr …; …)": no examiner names
    .replace(/\s+([?.!,])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
const bullets = (kp) =>
  kp
    .split('\n')
    .map((l) => l.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter((l) => l && !/^case[\s-]dependent\.?$/i.test(l)); // "Case-dependent" tells a student nothing
const answerText = (r) => {
  // the answer laid out for study: headings, lists, bold labels, coloured terms, bold doses
  const parts = [formatAnswer(r.Answer)];
  const kp = bullets(r['Key points']);
  if (kp.length) parts.push(':::remember Key points\n' + kp.map((k) => `- ${decorate(k)}`).join('\n') + '\n:::');
  return parts.join('\n\n');
};

/* ───────────── difficulty (a draft for review) ───────────── */

const EASY_TYPES = ['Definition', 'Knowledge / recall', 'Classification / types / enumeration'];
const HARD_TYPES = ['Management', 'Differential diagnosis', 'Clinical reasoning / "why" question', 'Mechanism / pathophysiology'];
function difficulty(r) {
  if (unusual.has(r.ID)) return 3;
  const len = r.Answer.length + r['Key points'].length;
  if (EASY_TYPES.includes(r["Question type"])) return len < 650 ? 1 : 2;
  if (HARD_TYPES.includes(r['Question type'])) return len < 360 ? 2 : 3;
  return 2;
}

/* ───────────── building the bank ───────────── */

// each long case's name and a short, clear scenario (no diagnosis), written from its notes and
// kept with the protected content: supabase/seed/content/medicine-cases.json, in the order the cases first appear
const CASES = JSON.parse(readFileSync('supabase/seed/content/medicine-cases.json', 'utf8'));

// the scenario as the students read it, without the report writer's notes about the exam itself
const cleanScenario = (t) =>
  t
    .replace(/\s*\((?:examiners?|as reported)[^)]*\)/gi, '')
    .replace(/;\s*(?:student|full (?:history|case|systemic|neuro)|questions began|examiners'?|general and respiratory exam|difficult exam|nothing else)[^;]*/gi, '')
    .replace(/^Questions mainly about the student's long case \((.*)\)$/i, (_, x) => x.replace(/\s*\/\s*/g, ', '))
    .replace(/^Case:\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

const caseIds = new Map(); // scenario → topic id
const topics = new Map(); // id → topic
const questions = new Map(); // spreadsheet id → question
const followUps = new Map(); // parent id → [rows]
const flagged = []; // V answers

function caseTopic(context) {
  const scenario = context.replace(/^\[Long case\]\s*/, '').trim();
  if (!caseIds.has(scenario)) {
    const n = caseIds.size + 1;
    const id = `long-case-${String(n).padStart(2, '0')}`;
    // a short label: the first clause or two of the scenario, which is shown in full on the page
    const written = CASES[n - 1];
    if (!written) throw new Error(`No name and scenario written for long case ${n}: ${scenario}`);
    const [name, clear] = written;
    caseIds.set(scenario, id);
    topics.set(id, { id, name, description: clear || cleanScenario(scenario), subjectId: '', sort: n });
  }
  return caseIds.get(scenario);
}

for (const r of all) {
  if (vague.has(r.ID)) continue;
  if (isFollowUp(r)) {
    const p = parentOf(r);
    if (!p || vague.has(p.ID)) {
      excluded.push([r.ID, r['Exact question'], `follow-up to a question left out (${p?.ID ?? 'unknown'})`]);
      continue;
    }
    const target = dupOf.get(p.ID) ?? p.ID;
    if (dupOf.has(r.ID)) {
      excluded.push([r.ID, r['Exact question'], `follow-up asked again in another report; kept once as ${dupOf.get(r.ID)}`]);
      continue;
    }
    (followUps.get(target) ?? followUps.set(target, []).get(target)).push(r);
    continue;
  }
  if (dupOf.has(r.ID)) {
    excluded.push([r.ID, r['Exact question'], `asked again in another report; kept once as ${dupOf.get(r.ID)}`]);
    continue;
  }
  const long = r['Case context'].startsWith('[Long case]');
  let topicId;
  if (long) topicId = caseTopic(r['Case context']);
  else {
    const t = TOPICS[r.Topic];
    if (!t) throw new Error(`No place on the board for topic: ${r.Topic}`);
    topicId = t[1];
    if (!topics.has(topicId)) topics.set(topicId, { id: topicId, name: t[2], subjectId: t[0], sort: 100 + Object.keys(TOPICS).indexOf(r.Topic) });
  }
  // a station's own setting ("Scenario: woman in ER with AF…", "Auscultate posterior chest (wheeze)") shows with its question
  const station = long ? '' : clean(r['Case context'].replace(/^\[[^\]]+\]\s*/, '').replace(/^Scenario:\s*/i, ''));
  questions.set(r.ID, {
    id: `im-${r.ID.toLowerCase()}`,
    title: REWRITES[r.ID]?.title ?? clean(r['Exact question']),
    type: 'viva',
    ...(station ? { scenario: station.charAt(0).toUpperCase() + station.slice(1) } : {}),
    topicIds: [topicId],
    doctorIds: [],
    modelAnswer: REWRITES[r.ID]?.answer ?? answerText(r),
    difficulty: difficulty(r),
    _row: r,
  });
}

// each long case under its system's subject, by the topics of its questions
for (const t of topics.values()) {
  if (!t.id.startsWith('long-case-')) continue;
  const n = Number(t.id.slice(-2));
  const tally = new Map();
  for (const q of questions.values()) {
    if (q.topicIds[0] !== t.id) continue;
    const sub = subjectOfTopic(q._row.Topic);
    if (!sub || sub === 'history-taking' || sub === 'clinical-examination') continue;
    tally.set(sub, (tally.get(sub) ?? 0) + 1);
  }
  const best = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
  t.subjectId = CASE_SUBJECT_BY_HAND[n] ?? best ?? 'infectious-diseases';
  t.sort = 1000 + n; // after the subject's own topics
}

// follow-ups as toggles under their question, in the order they were asked
for (const [pid, list] of followUps) {
  const q = questions.get(pid);
  if (!q) continue;
  // inside a follow-up its key points are a plain list: boxes can't sit inside boxes
  const followAnswer = (f) => {
    if (REWRITES[f.ID]) return REWRITES[f.ID].answer;
    const kp = bullets(f['Key points']);
    return [formatAnswer(f.Answer), ...(kp.length ? [`**Key points:** ${decorate(kp.join(' · '))}`] : [])].join('\n\n');
  };
  const blocks = list.map((f) => `:::followup ${clean(f['Exact question'])}\n${followAnswer(f)}\n:::`);
  q.modelAnswer += '\n\n' + blocks.join('\n\n');
  q._follow = list.map((f) => f.ID);
}

for (const q of questions.values()) {
  const rows = [q._row, ...(q._follow ?? []).map((id) => byId.get(id))];
  if (rows.some((r) => r.Confidence === 'V')) flagged.push([q.id, q.title, rows.filter((r) => r.Confidence === 'V').map((r) => r.ID).join(', ')]);
}

/* ───────────── writing the preview, the review sheet and the import ───────────── */

const list = [...questions.values()].map(({ _row, _follow, ...q }) => q);
const topicList = [...topics.values()].sort((a, b) => a.sort - b.sort);
// a new subject is only added when something is filed under it
const usedSubjects = new Set(topicList.map((t) => t.subjectId));
for (let i = NEW_SUBJECTS.length - 1; i >= 0; i--) if (!usedSubjects.has(NEW_SUBJECTS[i][0])) NEW_SUBJECTS.splice(i, 1);
const templates = list.filter((q) => /^Template/i.test(q.modelAnswer));
writeFileSync('src/dev/medicine-preview.json', JSON.stringify({ subjects: NEW_SUBJECTS.map(([id, name]) => ({ id, name })), topics: topicList.map(({ sort, ...t }) => t), questions: list }, null, 1));

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' };
const bySubject = new Map();
for (const t of topicList) (bySubject.get(t.subjectId) ?? bySubject.set(t.subjectId, []).get(t.subjectId)).push(t);
const count = (lvl) => list.filter((q) => q.difficulty === lvl).length;
const followCount = [...followUps.values()].reduce((n, l) => n + l.length, 0);
let md = `# Internal Medicine import: review sheet\n\nFrom \`IM_OSCE_Questions_with_Answers.xlsx\` (${all.length} rows). Built by \`supabase/seed/build-medicine.mjs\`.\n\n`;
md += `- **${list.length} questions** go in, with **${followCount} follow-ups** as toggles under them.\n`;
md += `- **${list.filter((q) => q.topicIds[0].startsWith('long-case-')).length}** of them sit in **${caseIds.size} long cases**, each its own page with its scenario at the top.\n`;
md += `- Difficulty (draft): ${count(1)} easy · ${count(2)} moderate · ${count(3)} difficult.\n`;
md += `- **${excluded.length} rows left out** (listed below).\n- **${flagged.length} questions have numbers or doses to check** (confidence V, listed below).\n- No sources and no examiner names are included. Everything is imported as a draft.\n\n`;
md += `## How difficulty was drafted\n\nThe 32 questions the spreadsheet flags as unusual or difficult are Difficult. Definitions, recall and enumeration are Easy (Moderate when the answer is long). Management, differential diagnosis, "why" and mechanism questions are Difficult (Moderate when the answer is short). Everything else is Moderate.\n\n`;
md += `## Long-case answers written as templates (${templates.length})\n\nThese answer \"how to present this for your patient\" rather than give one fixed answer (for example \"What did you find on examination?\"). They are kept, under their case's scenario. Say if you'd rather leave them out.\n\n` + templates.map((q) => `- ${q.title}`).join('\n') + '\n\n';
md += `## Answers with numbers or doses to check (V)\n\n| Question | Spreadsheet row |\n|---|---|\n` + flagged.map(([id, t, rows]) => `| ${t.replace(/\|/g, '/')} | ${rows} |`).join('\n') + '\n\n';
md += `## Left out\n\n| Row | Question | Why |\n|---|---|---|\n` + excluded.map(([id, t, why]) => `| ${id} | ${t.replace(/\|/g, '/')} | ${why} |`).join('\n') + '\n\n';
md += `## Where everything goes\n\n`;
for (const [sid, ts] of bySubject) {
  md += `### ${sid}\n\n`;
  for (const t of ts) {
    const qs = list.filter((q) => q.topicIds[0] === t.id);
    md += `**${t.name}** (${qs.length})${t.description ? `\n\n> ${t.description}` : ''}\n\n` + qs.map((q) => `- ${LEVEL[q.difficulty]}: ${q.title}${q.modelAnswer.includes(':::followup') ? ` _(+${(q.modelAnswer.match(/:::followup/g) ?? []).length} follow-up)_` : ''}`).join('\n') + '\n\n';
  }
}
writeFileSync('supabase/seed/content/medicine-review.md', md);

// the import: drafts, topics filed under their subjects; nothing else in the database is touched
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- The Clinical Room · Internal Medicine question bank (generated by build-medicine.mjs; git-ignored)\n-- Imports ${list.length} questions as DRAFTS into topics under the Medicine subjects. Safe to run again.\n\nbegin;\n\n`;
sql += `insert into public.subjects (specialty_id, id, name, sort) values\n` + NEW_SUBJECTS.map(([id, name, sort]) => `  ('medicine', ${sq(id)}, ${sq(name)}, ${sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name;\n\n`;
sql += `insert into public.topics (specialty_id, id, name, description, subject_id, sort) values\n` + topicList.map((t) => `  ('medicine', ${sq(t.id)}, ${sq(t.name)}, ${t.description ? sq(t.description) : 'null'}, ${sq(t.subjectId)}, ${t.sort})`).join(',\n') + `\non conflict (specialty_id, id) do update set name = excluded.name, description = excluded.description, subject_id = excluded.subject_id, sort = excluded.sort;\n\n`;
sql += `insert into public.questions (specialty_id, id, title, type, scenario, model_answer, difficulty, status, sort) values\n` + list.map((q, i) => `  ('medicine', ${sq(q.id)}, ${sq(q.title)}, 'viva', ${q.scenario ? sq(q.scenario) : 'null'}, ${sq(q.modelAnswer)}, ${q.difficulty}, 'draft', ${i + 1})`).join(',\n') + `\non conflict (specialty_id, id) do update set title = excluded.title, scenario = excluded.scenario, model_answer = excluded.model_answer, difficulty = excluded.difficulty;\n\n`;
sql += `insert into public.question_topics (specialty_id, question_id, topic_id) values\n` + list.map((q) => `  ('medicine', ${sq(q.id)}, ${sq(q.topicIds[0])})`).join(',\n') + `\non conflict do nothing;\n\n-- the long cases now sit under their subjects: the old \"Long cases\" subject is no longer used\ndelete from public.subjects where specialty_id = 'medicine' and id = 'long-cases' and not exists (select 1 from public.topics t where t.specialty_id = 'medicine' and t.subject_id = 'long-cases');\n\ncommit;\n\nselect status, count(*) from public.questions where specialty_id = 'medicine' group by status;\n`;
writeFileSync('supabase/seed/medicine-import.sql', sql);

console.log(JSON.stringify({ rows: all.length, questions: list.length, followUps: followCount, longCases: caseIds.size, topics: topicList.length, excluded: excluded.length, flagged: flagged.length, easy: count(1), moderate: count(2), difficult: count(3) }));

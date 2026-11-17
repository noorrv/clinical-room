// Writes supabase/seed/surgery-existing-fixes.sql (git-ignored) from the protected content file:
// clean titles for the older Surgery questions, and a fuller answer where one was too short.
// Run: node supabase/seed/build-surgery-fixes.mjs
import { writeFileSync } from 'node:fs';
import { ANSWERS, TITLES } from './content/surgery-existing-fixes.mjs';

const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `-- The Clinical Room · older Surgery questions: clean titles and one fuller answer (generated; git-ignored)\n-- Changes only the rows named here. Safe to run again.\n\nbegin;\n\n`;
for (const [id, title] of Object.entries(TITLES)) sql += `update public.questions set title = ${sq(title)} where specialty_id = 'surgery' and id = ${sq(id)};\n`;
for (const [id, { answer, difficulty }] of Object.entries(ANSWERS)) sql += `\nupdate public.questions set model_answer = ${sq(answer)}, difficulty = ${difficulty} where specialty_id = 'surgery' and id = ${sq(id)};\n`;
sql += `\ncommit;\n\nselect count(*) as numbered_titles_left from public.questions where specialty_id = 'surgery' and title ~ '^(Q?[0-9]+[.)] )';\n`;
writeFileSync('supabase/seed/surgery-existing-fixes.sql', sql);
console.log(JSON.stringify({ titles: Object.keys(TITLES).length, answers: Object.keys(ANSWERS).length }));

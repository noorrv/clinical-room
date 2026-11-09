# Adding content to The Clinical Room

The study material lives in **Supabase**, not in this folder, so it is only ever sent to approved
accounts. Edit it in Supabase → Table Editor. The dashboards, search, tracker and Mock OSCE are
built from these tables automatically. Nothing is invented: empty tables mean "not provided yet".

The four `.ts` files here are deliberately empty. Don't put questions or answers back in them:
anything in the code is downloadable by every visitor.

## The tables

| Table | One row per | Key columns |
|---|---|---|
| `specialties` | specialty (already filled) | `id`, `description` (shown under the dashboard title) |
| `doctors` | examiner | `specialty_id`, `id` (letters, numbers, dashes), `name`, optional `role`, `note`, `sort` |
| `topics` | topic | `specialty_id`, `id`, `name`, optional `description`, `sort` |
| `questions` | question | see below |
| `question_doctors` | link | `specialty_id`, `question_id`, `doctor_id` |
| `question_topics` | link | `specialty_id`, `question_id`, `topic_id` |

`specialty_id` is one of `medicine`, `surgery`, `obgyn`, `paediatrics`.

### questions

- `id`: unique within its specialty; used in the page address (letters, numbers, dashes).
- `title`: shown in lists and search.
- `type`: `station`, `case`, `viva`, `procedure` or `other`.
- Optional text: `scenario`, `question`, `model_answer`, `history`, `examination`,
  `investigations`, `management`, `source`.
- Optional lists (one item per line in the editor's array field): `key_points`,
  `examiner_expects` (also the Mock OSCE checklist), `steps` (for procedures).
- `minutes`: station time for Mock OSCE.
- `sort`: order within the specialty (lower first).

Only filled sections are shown. Link a question to its doctors and topics with rows in
`question_doctors` and `question_topics`; a question can have several of each.

## Who can see what

Every content table has an `access` column:

- `approved` (default): only approved students and the administrator can read the row.
- `public`: anyone can read it, signed in or not.

The database enforces this (Row Level Security), whatever the website does. Today every study
page also asks for an approved account; making a page public needs a small change to its route
as well, so ask when you're ready to open something up.

## Preview before content exists

While running `npm run dev`, add `?preview=placeholders` to any dashboard address to fill empty
specialties with clearly labelled placeholder text (your real doctors are kept). `?preview=off`
turns it off. The preview never runs on the built site.

## Adding a specialty later

Add its card to `src/data/homepage.ts`, an empty file here, one line each in `index.ts`
(`files` and `identities`), and allow its id in the `specialties` table's check.

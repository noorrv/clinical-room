# Adding content to The Clinical Room

Every specialty dashboard, the search, the tracker and Mock OSCE are generated from the four files
in this folder: `medicine.ts`, `surgery.ts`, `obgyn.ts`, `paediatrics.ts`. They are empty until
real content is added. Nothing is invented.

## What each file holds

```ts
const content: SpecialtyContent = {
  id: 'surgery',
  description: 'One or two sentences shown under the title on the dashboard.',
  doctors: [
    { id: 'dr-hassan', name: 'Dr. Hassan', role: 'Consultant Surgeon', note: 'Optional: examiner style' },
  ],
  topics: [
    { id: 'acute-abdomen', name: 'Acute abdomen' },
  ],
  questions: [
    {
      id: 'appendicitis-station',          // unique in this file; used in the page address
      title: 'Right iliac fossa pain',      // shown in lists and search
      type: 'station',                      // station | case | viva | procedure | other
      topicIds: ['acute-abdomen'],          // one or more topic ids from above
      doctorIds: ['dr-hassan'],             // one or more doctor ids from above

      // Every field below is optional. Only filled ones are shown.
      scenario: 'The clinical scenario as given to the candidate.',
      question: 'The task or question.',
      modelAnswer: 'Model answer.',
      history: 'History points.',
      examination: 'Examination points.',
      investigations: 'Investigations.',
      management: 'Management.',
      keyPoints: ['Important clinical point', 'Another point'],
      examinerExpects: ['What the examiner expects, one item each'], // also the Mock OSCE checklist
      steps: ['Step one', 'Step two'],      // for procedures
      minutes: 7,                           // station time for Mock OSCE
      source: 'Dr. Hassan, 2025',
    },
  ],
};
```

Line breaks in long text are kept. A question can belong to several topics and doctors.

## Preview before content exists

While running `npm run dev`, add `?preview=placeholders` to any dashboard address to fill empty
specialties with clearly labelled placeholder text. `?preview=off` turns it off. The preview never
runs on the built site.

## Adding a specialty later

Add its card to `src/data/homepage.ts`, a new file here, and one line each in `index.ts`
(`files` and `identities`). The dashboard, routes, search and tracker pick it up automatically.

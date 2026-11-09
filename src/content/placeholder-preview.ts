import type { SpecialtyContent, SpecialtyId } from './types';

/*
  DEVELOPMENT PREVIEW ONLY. Never shipped as real content.
  Lets you see a filled dashboard before real content exists: open any dashboard with
  ?preview=placeholders while running `npm run dev`. Every word here says "placeholder" on purpose,
  so it can never be mistaken for clinical material.
*/
export function placeholderContent(id: SpecialtyId): SpecialtyContent {
  const doctors = [1, 2, 3].map((n) => ({ id: `examiner-${n}`, name: `Examiner ${n} (placeholder)`, role: 'Role to be added' }));
  const topics = [1, 2, 3, 4].map((n) => ({ id: `topic-${n}`, name: `Topic ${n} (placeholder)` }));
  const types = ['station', 'case', 'viva', 'procedure'] as const;
  const questions = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const type = types[i % types.length];
    return {
      id: `placeholder-${n}`,
      title: `Placeholder ${type} ${n}`,
      type,
      topicIds: [topics[i % topics.length].id, ...(i % 3 === 0 ? [topics[(i + 1) % topics.length].id] : [])],
      doctorIds: [doctors[i % doctors.length].id],
      scenario: 'Placeholder scenario text. Replace with the real clinical scenario.',
      question: 'Placeholder question text. Replace with the real question.',
      modelAnswer: type === 'viva' ? 'Placeholder model answer.' : undefined,
      history: type === 'case' ? 'Placeholder history points.' : undefined,
      examination: type === 'case' || type === 'station' ? 'Placeholder examination points.' : undefined,
      investigations: type === 'case' ? 'Placeholder investigations.' : undefined,
      management: type === 'case' || type === 'station' ? 'Placeholder management.' : undefined,
      keyPoints: ['Placeholder key point one', 'Placeholder key point two'],
      examinerExpects: ['Placeholder checklist item one', 'Placeholder checklist item two', 'Placeholder checklist item three'],
      steps: type === 'procedure' ? ['Placeholder step one', 'Placeholder step two', 'Placeholder step three'] : undefined,
      minutes: 7,
      source: 'Placeholder source',
    };
  });
  return { id, description: 'Placeholder description. Replace with a short summary of this specialty.', doctors, topics, questions };
}

export function previewRequested(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const q = new URLSearchParams(window.location.search).get('preview');
    if (q === 'placeholders') sessionStorage.setItem('clinical-room:preview', '1');
    if (q === 'off') sessionStorage.removeItem('clinical-room:preview');
    return sessionStorage.getItem('clinical-room:preview') === '1';
  } catch {
    return false;
  }
}

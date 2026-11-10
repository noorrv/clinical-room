import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { specialtyBySlug, type Specialty } from '../content';
import type { Question } from '../content/types';
import { TopicPage } from '../pages/archive/TopicPage';
import entries from './gallbladder-preview.json';

/*
  DEVELOPMENT PREVIEW ONLY. Shows Dr. Salah's Gallbladder workbook, converted word for word by
  scripts/workbook-to-sheets.py, on the real topic page before anything is written to Supabase.
  The entries live only in memory here.
*/

const TOPIC = { id: 'gallbladder-biliary-tract', name: 'Gallbladder and Biliary Tract' };

export function SheetPreview() {
  const base = specialtyBySlug('surgery');
  const sp = useMemo<Specialty | null>(() => {
    if (!base) return null;
    const questions: Question[] = entries.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type as Question['type'],
      modelAnswer: e.model_answer,
      source: e.source,
      doctorIds: [e.doctor],
      topicIds: [e.topic],
    }));
    return { ...base, topics: [...base.topics.filter((t) => t.id !== TOPIC.id), TOPIC], questions: [...base.questions, ...questions] };
  }, [base]);
  if (!sp) return <Navigate to="/" replace />;
  return (
    <main id="main">
      <p style={{ margin: 0, padding: '8px 16px', background: '#40382f', color: '#faf6ec', font: '600 14px system-ui', textAlign: 'center' }}>
        Preview only: this content is not in the database yet.
      </p>
      <TopicPage sp={sp} />
    </main>
  );
}

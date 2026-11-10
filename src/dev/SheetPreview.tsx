import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { specialtyBySlug, type Specialty } from '../content';
import type { Question } from '../content/types';
import { TopicPage } from '../pages/archive/TopicPage';
import gallbladder from './gallbladder-preview.json';
import spleen from './spleen-preview.json';
import { Link, useParams } from 'react-router-dom';

/*
  DEVELOPMENT PREVIEW ONLY. Shows Dr. Salah's Gallbladder workbook, converted word for word by
  scripts/workbook-to-sheets.py, on the real topic page before anything is written to Supabase.
  The entries live only in memory here.
*/

type Entry = { id: string; title: string; type: string; model_answer: string; source: string; doctor: string; topic: string; topicName?: string };
const entries: Entry[] = [...(gallbladder as Entry[]), ...(spleen as Entry[])];
const TOPICS = [{ id: 'gallbladder-biliary-tract', name: 'Gallbladder and Biliary Tract' }];
for (const e of entries) if (e.topicName && !TOPICS.some((t) => t.id === e.topic)) TOPICS.push({ id: e.topic, name: e.topicName });

export function SheetPreview() {
  const base = specialtyBySlug('surgery');
  const { doctorId = 'salah', topicId } = useParams();
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
    const ids = new Set(questions.map((q) => q.id));
    return {
      ...base,
      topics: [...base.topics.filter((t) => !TOPICS.some((x) => x.id === t.id)), ...TOPICS],
      questions: [...base.questions.filter((q) => !ids.has(q.id)), ...questions],
    };
  }, [base]);
  if (!sp) return <Navigate to="/" replace />;
  return (
    <main id="main">
      <p style={{ margin: 0, padding: '8px 16px', background: '#40382f', color: '#faf6ec', font: '600 14px system-ui', textAlign: 'center' }}>
        Preview only, not in the database yet ·{' '}
        {TOPICS.map((t) => (
          <Link key={t.id} to={`/_preview/sheet/doctors/${doctorId}/topics/${t.id}`} style={{ color: '#faf6ec', margin: '0 6px', fontWeight: t.id === topicId ? 800 : 400 }}>
            {t.name}
          </Link>
        ))}
      </p>
      <TopicPage sp={sp} />
    </main>
  );
}

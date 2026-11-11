import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StudySheet } from '../archive/StudySheet';
import { doctorName, questionKey, questionPath, questionsOf, topicName, TYPE_LABEL, type Question, type Specialty } from '../../content';
import { record, study, useStudy } from '../../study/store';
import { useGuestBrowsing } from '../../auth/guest';
import { EmptyState, PreviewBanner, Ribbon, StatusPicker } from './ui';

/*
  The study page for one question, laid out as an open book: the left page is what the candidate
  is given, the right page is what a strong answer contains. Only sections the question has are
  shown, in an order that suits its type.
*/

export type Section = { key: keyof Question; label: string };

export const GIVEN: Section[] = [
  { key: 'scenario', label: 'Clinical scenario' },
  { key: 'question', label: 'Question' },
];

export const ANSWER_ORDER: Record<Question['type'], Section[]> = {
  station: [
    { key: 'examinerExpects', label: 'What the examiner expects' },
    { key: 'examination', label: 'Examination' },
    { key: 'management', label: 'Management' },
    { key: 'modelAnswer', label: 'Model answer' },
    { key: 'keyPoints', label: 'Important clinical points' },
  ],
  case: [
    { key: 'history', label: 'History' },
    { key: 'examination', label: 'Examination' },
    { key: 'investigations', label: 'Investigations' },
    { key: 'management', label: 'Management' },
    { key: 'keyPoints', label: 'Important clinical points' },
    { key: 'examinerExpects', label: 'What the examiner expects' },
    { key: 'modelAnswer', label: 'Model answer' },
  ],
  viva: [
    { key: 'modelAnswer', label: 'Model answer' },
    { key: 'keyPoints', label: 'Important clinical points' },
    { key: 'examinerExpects', label: 'What the examiner expects' },
  ],
  procedure: [
    { key: 'steps', label: 'Steps' },
    { key: 'keyPoints', label: 'Important points' },
    { key: 'examinerExpects', label: 'What the examiner expects' },
  ],
  other: [
    { key: 'modelAnswer', label: 'Model answer' },
    { key: 'history', label: 'History' },
    { key: 'examination', label: 'Examination' },
    { key: 'investigations', label: 'Investigations' },
    { key: 'management', label: 'Management' },
    { key: 'keyPoints', label: 'Important clinical points' },
    { key: 'examinerExpects', label: 'What the examiner expects' },
  ],
};

export function SectionBody({ value, ordered, sheet }: { value: unknown; ordered?: boolean; sheet?: boolean }) {
  // a model answer can carry study-sheet markup (titles, steps, tables, figures); plain text still reads as before
  if (sheet && typeof value === 'string') return <StudySheet text={value} />;
  if (Array.isArray(value)) {
    const List = ordered ? 'ol' : 'ul';
    return (
      <List className="book__list">
        {value.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </List>
    );
  }
  return <p className="book__text">{String(value)}</p>;
}

const has = (q: Question, k: keyof Question) => {
  const v = q[k];
  return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : false;
};

function Notes({ k }: { k: string }) {
  const st = useStudy();
  const saved = record(st, k).note;
  const [text, setText] = useState(saved);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timer = useRef<number>();

  useEffect(() => setText(record(st, k).note), [k]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onChange = (v: string) => {
    setText(v);
    setState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      study.setNote(k, v);
      setState('saved');
    }, 500);
  };

  return (
    <section className="notes" aria-labelledby={`notes-${k}`}>
      <div className="notes__head">
        <h2 id={`notes-${k}`} className="notes__title">
          My notes
        </h2>
        <span className="notes__state" aria-live="polite">
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
        </span>
      </div>
      <label className="visually-hidden" htmlFor={`note-${k}`}>
        Your notes on this question
      </label>
      <textarea id={`note-${k}`} className="notes__area" value={text} onChange={(e) => onChange(e.target.value)} placeholder="Write anything you want to remember about this question." rows={6} />
    </section>
  );
}

export function QuestionPage({ sp }: { sp: Specialty }) {
  const { qid = '' } = useParams();
  const st = useStudy();
  const guest = useGuestBrowsing();
  const list = questionsOf(sp);
  const index = list.findIndex((q) => q.id === qid);
  const q = list[index];
  const k = questionKey(sp.id, qid);

  const exists = !!q;
  // record the visit once per question (not on every re-render)
  useEffect(() => {
    if (exists) study.viewed(k);
  }, [k, exists]);

  if (!q && guest) {
    return (
      <EmptyState title="This page is for registered students">
        <p>
          Guests can see the open pages only. <Link to="/register">Create an account</Link> or{' '}
          <Link to={`/login?next=${encodeURIComponent(questionPath(sp, qid))}`}>sign in</Link> to read it.
        </p>
      </EmptyState>
    );
  }

  if (!q) {
    return (
      <EmptyState title="This question isn’t in the library">
        <p>
          It may have been renamed or removed. <Link to={`/specialties/${sp.slug}`}>Back to {sp.title}</Link>
        </p>
      </EmptyState>
    );
  }

  const r = record(st, k);
  const prev = list[index - 1];
  const next = list[index + 1];
  const given = [...GIVEN.filter((s) => has(q, s.key))];
  const answer = ANSWER_ORDER[q.type].filter((s) => has(q, s.key));

  return (
    <article className="qpage">
      <PreviewBanner sp={sp} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`/specialties/${sp.slug}`}>{sp.title}</Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{q.title}</span>
      </nav>

      <header className="qpage__head">
        <div>
          <p className="qpage__type">{TYPE_LABEL[q.type]}</p>
          <h1 className="qpage__title">{q.title}</h1>
          <p className="qpage__meta">
            {q.topicIds.length > 0 && (
              <>
                Topics:{' '}
                {q.topicIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link to={`/specialties/${sp.slug}?tab=topics&open=${id}`}>{topicName(sp, id)}</Link>
                  </span>
                ))}
              </>
            )}
            {q.doctorIds.length > 0 && (
              <>
                {q.topicIds.length > 0 && <span aria-hidden> · </span>}
                Examiner:{' '}
                {q.doctorIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link to={`/specialties/${sp.slug}?tab=doctors&open=${id}`}><bdi>{doctorName(sp, id)}</bdi></Link>
                  </span>
                ))}
              </>
            )}
          </p>
        </div>
        <button type="button" className={`bookmark${r.bookmarked ? ' is-on' : ''}`} aria-pressed={r.bookmarked} onClick={() => study.toggleBookmark(k)}>
          <Ribbon filled={r.bookmarked} />
          {r.bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </header>

      <div className="qpage__status">
        <span className="qpage__status-label">Status</span>
        <StatusPicker k={k} />
      </div>

      <div className="book">
        <section className="book__page book__page--left" aria-label="Given to the candidate">
          {given.length ? (
            given.map((s) => (
              <div key={s.key} className="book__section">
                <h2 className="book__h">{s.label}</h2>
                <SectionBody value={q[s.key]} />
              </div>
            ))
          ) : (
            <p className="book__missing">The scenario and question haven’t been added yet.</p>
          )}
        </section>
        <section className="book__page book__page--right" aria-label="The answer">
          {answer.length ? (
            answer.map((s) => (
              <div key={s.key} className="book__section">
                <h2 className="book__h">{s.label}</h2>
                <SectionBody value={q[s.key]} ordered={s.key === 'steps'} sheet={s.key === 'modelAnswer'} />
              </div>
            ))
          ) : (
            <p className="book__missing">The answer for this question hasn’t been added yet.</p>
          )}
        </section>
      </div>

      <Notes k={k} />

      <nav className="pager" aria-label="More questions">
        {prev ? (
          <Link className="pager__link" to={questionPath(sp, prev.id)}>
            <small>Previous</small>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="pager__link pager__link--next" to={questionPath(sp, next.id)}>
            <small>Next</small>
            {next.title}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}

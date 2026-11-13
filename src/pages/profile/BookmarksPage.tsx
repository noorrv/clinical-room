import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TYPE_LABEL } from '../../content';
import { record, study, useStudy } from '../../study/store';
import { MeNav } from './MeNav';
import { placedQuestions, type Placed } from './library';
import '../auth/auth.css';
import './profile.css';

/*
  Every question the student has bookmarked, across all specialties, with their own note. Filter
  by specialty, subject and topic (the filters stay in the address, so a filtered list can be
  bookmarked itself). Bookmarks and notes are private to the student.
*/

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' } as const;

/** Without an old written number ("Q9. "), as on the topic pages. */
const unnumbered = (title: string) => title.replace(/^\s*(?:Q\s*)?\d+\s*[.)]\s+/i, '');

export function BookmarksPage() {
  const st = useStudy();
  const [params, setParams] = useSearchParams();
  const spF = params.get('specialty') ?? '';
  const subF = params.get('subject') ?? '';
  const topF = params.get('topic') ?? '';
  const all = useMemo(() => placedQuestions(), []);
  const marked = useMemo(() => all.filter((p) => record(st, p.q.key).bookmarked), [all, st]);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    // narrower filters no longer apply when a wider one changes
    if (k === 'specialty') {
      next.delete('subject');
      next.delete('topic');
    }
    if (k === 'subject') next.delete('topic');
    setParams(next, { replace: true });
  };

  const inSp = marked.filter((p) => !spF || p.sp.id === spF);
  const inSub = inSp.filter((p) => !subF || p.subjectId === subF);
  const shown = inSub.filter((p) => !topF || p.topicId === topF);

  const specialties = uniq(marked.map((p) => [p.sp.id, p.sp.title]));
  const subjects = uniq(inSp.flatMap((p) => (p.subjectId ? [[p.subjectId, p.subjectName ?? p.subjectId]] : [])));
  const topics = uniq(inSub.map((p) => [p.topicId, p.topicName]));

  return (
    <div className="profile-page">
      <div className="profile container">
        <MeNav />
        <header className="me-head">
          <h1 className="me-head__title">Bookmarks</h1>
          <p className="me-head__intro">
            {marked.length ? `${marked.length} ${marked.length === 1 ? 'question' : 'questions'} saved, with your notes. Only you can see them.` : 'Questions you bookmark appear here, with your notes. Only you can see them.'}
          </p>
        </header>

        {marked.length > 0 && (
          <div className="me-filters" role="group" aria-label="Filter bookmarks">
            <Picker label="Specialty" value={spF} onChange={(v) => set('specialty', v)} options={specialties} />
            <Picker label="Subject" value={subF} onChange={(v) => set('subject', v)} options={subjects} disabled={!subjects.length} />
            <Picker label="Topic" value={topF} onChange={(v) => set('topic', v)} options={topics} />
          </div>
        )}

        {marked.length === 0 ? (
          <p className="me-empty">
            Nothing bookmarked yet. Tap the bookmark on any question to keep it here. <Link to="/#specialties">Choose a specialty</Link>
          </p>
        ) : shown.length === 0 ? (
          <p className="me-empty">No bookmarks match these filters.</p>
        ) : (
          <ul className="bm-list">
            {shown.map((p) => (
              <Bookmark key={p.q.key} p={p} note={record(st, p.q.key).note} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function uniq(pairs: string[][]): Array<[string, string]> {
  const m = new Map<string, string>();
  for (const [id, name] of pairs) if (!m.has(id)) m.set(id, name);
  return [...m].sort((a, b) => a[1].localeCompare(b[1]));
}

function Picker({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]>; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="me-picker">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Bookmark({ p, note }: { p: Placed; note: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note);
  const id = useId();
  useEffect(() => {
    if (!editing) setText(note);
  }, [note, editing]);

  return (
    <li className="bm">
      <div className="bm__main">
        <p className="bm__where">
          {p.sp.title}
          {p.subjectName ? ` · ${p.subjectName}` : ''} · {p.topicName}
        </p>
        <Link className="bm__title" to={p.href}>
          <bdi>{unnumbered(p.q.title)}</bdi>
        </Link>
        <p className="bm__meta">
          {TYPE_LABEL[p.q.type]}
          {p.q.difficulty ? ` · ${LEVEL[p.q.difficulty]}` : ''}
        </p>

        {editing ? (
          <div className="bm__note-edit">
            <label htmlFor={id} className="visually-hidden">
              Your note on this question
            </label>
            <textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} dir="auto" />
            <div className="bm__actions">
              <button
                type="button"
                className="auth-btn"
                onClick={() => {
                  study.setNote(p.q.key, text.trim());
                  setEditing(false);
                }}
              >
                Save note
              </button>
              <button type="button" className="auth-btn auth-btn--quiet" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : note ? (
          <p className="bm__note">
            <bdi>{note}</bdi>
          </p>
        ) : null}
      </div>
      {!editing && (
        <div className="bm__actions bm__actions--side">
          <button type="button" className="me-link" onClick={() => setEditing(true)}>
            {note ? 'Edit note' : 'Add a note'}
          </button>
          <button type="button" className="me-link me-link--quiet" onClick={() => study.toggleBookmark(p.q.key)} aria-label={`Remove the bookmark on ${p.q.title}`}>
            Remove
          </button>
        </div>
      )}
    </li>
  );
}

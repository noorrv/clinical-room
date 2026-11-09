import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { allQuestions, allSpecialties, findQuestion, questionPath, questionsOf, specialtyById, type QuestionRef, type Specialty } from '../../content';
import { byDoctor, byTopic, pct, tally, timeAgo, weakest, type GroupProgress } from '../../study/derive';
import { record, STATUS_LABEL, useStudy, type StudyState } from '../../study/store';
import { EmptyState, Ledger, PreviewBanner, QuestionRow, StatusLegend, StatusStamp } from './ui';

export type ViewMode = 'continue' | 'tracker' | 'bookmarks' | 'weak' | 'notes' | 'revision' | 'recent';

const TITLES: Record<ViewMode, string> = {
  continue: 'Continue studying',
  tracker: 'My tracker',
  bookmarks: 'Bookmarks',
  weak: 'Weak areas',
  notes: 'My notes',
  revision: 'Revision queue',
  recent: 'Recently viewed',
};

const INTRO: Record<ViewMode, string> = {
  continue: 'Pick up where you left off.',
  tracker: 'Your progress by specialty, topic and examiner, and your past study sessions.',
  bookmarks: 'Questions you’ve marked to come back to.',
  weak: 'Where most of your “needs revision” questions are.',
  notes: 'Everything you’ve written, question by question.',
  revision: 'Questions marked “needs revision”, longest-waiting first.',
  recent: 'Questions you’ve opened lately.',
};

function useScope(sp: Specialty) {
  const [params, setParams] = useSearchParams();
  const all = params.get('scope') === 'all';
  const questions = all ? allQuestions() : questionsOf(sp);
  const toggle = (
    <div className="scope" role="group" aria-label="Show">
      <button type="button" aria-pressed={!all} onClick={() => setParams({}, { replace: true })}>
        {sp.title}
      </button>
      <button type="button" aria-pressed={all} onClick={() => setParams({ scope: 'all' }, { replace: true })}>
        All specialties
      </button>
    </div>
  );
  return { all, questions, toggle };
}

function Rows({ items, all, extra }: { items: QuestionRef[]; all: boolean; extra?: (q: QuestionRef) => ReactNode }) {
  return (
    <ul className="qlist">
      {items.map((q) => (
        <QuestionRow key={q.key} q={q} sp={specialtyById(q.specialtyId)} showSpecialty={all} extra={extra?.(q)} />
      ))}
    </ul>
  );
}

function GroupTable({ title, groups }: { title: string; groups: GroupProgress[] }) {
  if (!groups.length) return null;
  return (
    <div className="gtable">
      <h3 className="gtable__title">{title}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Questions</th>
            <th scope="col">Mastered</th>
            <th scope="col">Needs revision</th>
            <th scope="col" className="gtable__bar">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id}>
              <th scope="row">{g.name}</th>
              <td>{g.tally.total}</td>
              <td>
                {g.tally.counts.mastered} <small>({pct(g.tally.mastered)})</small>
              </td>
              <td>{g.tally.counts['needs-revision']}</td>
              <td className="gtable__bar">
                <Ledger tally={g.tally} label={`${g.name} progress`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sessions({ st, all, sp }: { st: StudyState; all: boolean; sp: Specialty }) {
  const sessions = [...st.sessions]
    .reverse()
    .map((s) => ({
      ...s,
      viewed: all ? s.viewed : s.viewed.filter((k) => k.startsWith(`${sp.id}/`)),
      changes: all ? s.changes : s.changes.filter((c) => c.key.startsWith(`${sp.id}/`)),
    }))
    .filter((s) => s.viewed.length || s.changes.length)
    .slice(0, 12);
  if (!sessions.length) return <p className="muted">Your study sessions will be listed here.</p>;
  return (
    <ol className="sessions">
      {sessions.map((s) => {
        const minutes = Math.max(1, Math.round((s.lastAt - s.startedAt) / 60000));
        return (
          <li key={s.id} className="sessions__item">
            <details>
              <summary>
                <span className="sessions__date">
                  {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
                  {new Date(s.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="sessions__sum">
                  {minutes} min · {s.viewed.length} viewed · {s.changes.length} status {s.changes.length === 1 ? 'change' : 'changes'}
                </span>
              </summary>
              <ul className="sessions__list">
                {s.viewed.map((k) => {
                  const f = findQuestion(k);
                  if (!f) return null;
                  const last = [...s.changes].reverse().find((c) => c.key === k);
                  return (
                    <li key={k}>
                      <Link to={questionPath(f.specialty, f.question.id)}>{f.question.title}</Link>
                      {last && (
                        <>
                          {' '}
                          → <StatusStamp status={last.to} small />
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

export function StudyView({ sp, mode }: { sp: Specialty; mode: ViewMode }) {
  const st = useStudy();
  const { all, questions, toggle } = useScope(sp);
  const byKey = new Map(questions.map((q) => [q.key, q]));
  const noContent = questions.length === 0;

  let body: ReactNode;

  if (noContent) {
    body = (
      <EmptyState title={all ? 'No questions in the library yet' : `No ${sp.title} questions yet`}>
        <p>This page fills in as soon as questions are added and you start studying them.</p>
      </EmptyState>
    );
  } else if (mode === 'continue') {
    const recentOpen = st.recent
      .map((r) => byKey.get(r.key))
      .filter((q): q is QuestionRef => !!q)
      .filter((q) => {
        const s = record(st, q.key).status;
        return s === 'in-progress' || s === 'needs-revision';
      });
    const resume = recentOpen[0];
    const fresh = questions.filter((q) => record(st, q.key).status === 'not-started').slice(0, 5);
    body = (
      <>
        {resume ? (
          <div className="resume">
            <p className="resume__label">Where you left off</p>
            <Link className="resume__card" to={questionPath(specialtyById(resume.specialtyId), resume.id)}>
              <StatusStamp status={record(st, resume.key).status} />
              <span className="resume__title">{resume.title}</span>
              <span className="resume__go">Resume</span>
            </Link>
          </div>
        ) : (
          <p className="muted">Nothing in progress yet. Start with one of these.</p>
        )}
        {recentOpen.length > 1 && (
          <>
            <h2 className="view__h2">Also in progress</h2>
            <Rows items={recentOpen.slice(1, 6)} all={all} />
          </>
        )}
        {fresh.length > 0 && (
          <>
            <h2 className="view__h2">Not started yet</h2>
            <Rows items={fresh} all={all} />
          </>
        )}
      </>
    );
  } else if (mode === 'tracker') {
    const t = tally(questions, st);
    body = (
      <>
        <div className="tracker-sum">
          <p className="figures__big">
            {pct(t.mastered)}
            <span> mastered</span>
          </p>
          <Ledger tally={t} label="Progress" />
          <StatusLegend tally={t} />
        </div>
        {all ? (
          <GroupTable
            title="By specialty"
            groups={allSpecialties().map((s) => {
              const qs = questionsOf(s);
              return { id: s.id, name: s.title, questions: qs, tally: tally(qs, st) };
            })}
          />
        ) : (
          <>
            <GroupTable title="By topic" groups={byTopic(sp, st)} />
            <GroupTable title="By examiner" groups={byDoctor(sp, st)} />
          </>
        )}
        <h2 className="view__h2">Previous sessions</h2>
        <Sessions st={st} all={all} sp={sp} />
        {st.mocks.length > 0 && (
          <>
            <h2 className="view__h2">Mock OSCE results</h2>
            <ul className="mockhist">
              {st.mocks
                .filter((m) => all || m.scope === sp.id || m.scope === 'all')
                .slice(0, 8)
                .map((m) => {
                  const checked = m.stations.reduce((a, s) => a + s.checked, 0);
                  const total = m.stations.reduce((a, s) => a + s.total, 0);
                  return (
                    <li key={m.id}>
                      {new Date(m.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {m.stations.length}{' '}
                      {m.stations.length === 1 ? 'station' : 'stations'} · {total ? pct(checked / total) : '—'} of checklist
                    </li>
                  );
                })}
            </ul>
          </>
        )}
      </>
    );
  } else if (mode === 'bookmarks') {
    const items = questions.filter((q) => record(st, q.key).bookmarked);
    body = items.length ? <Rows items={items} all={all} /> : <p className="muted">No bookmarks yet. Use “Bookmark” on any question to keep it here.</p>;
  } else if (mode === 'notes') {
    const items = questions
      .filter((q) => record(st, q.key).note.trim())
      .sort((a, b) => (record(st, b.key).noteUpdatedAt ?? 0) - (record(st, a.key).noteUpdatedAt ?? 0));
    body = items.length ? (
      <Rows items={items} all={all} extra={(q) => <span className="qrow__note">{record(st, q.key).note}</span>} />
    ) : (
      <p className="muted">No notes yet. Notes you write on a question are collected here.</p>
    );
  } else if (mode === 'revision') {
    const items = questions
      .filter((q) => record(st, q.key).status === 'needs-revision')
      .sort((a, b) => record(st, a.key).updatedAt - record(st, b.key).updatedAt);
    body = items.length ? (
      <Rows items={items} all={all} extra={(q) => <span className="qrow__when">Marked {timeAgo(record(st, q.key).updatedAt)}</span>} />
    ) : (
      <p className="muted">Nothing to revise. Mark a question “Needs revision” and it joins this queue.</p>
    );
  } else if (mode === 'recent') {
    const items = st.recent.map((r) => byKey.get(r.key)).filter((q): q is QuestionRef => !!q);
    body = items.length ? (
      <Rows items={items} all={all} extra={(q) => <span className="qrow__when">Opened {timeAgo(st.recent.find((r) => r.key === q.key)!.at)}</span>} />
    ) : (
      <p className="muted">Questions you open will appear here.</p>
    );
  } else {
    // weak areas
    const groups = all
      ? allSpecialties().flatMap((s) => byTopic(s, st).map((g) => ({ ...g, name: `${g.name} (${s.shortName})`, id: `${s.id}-${g.id}` })))
      : [...byTopic(sp, st), ...byDoctor(sp, st).map((g) => ({ ...g, name: `${g.name} (examiner)`, id: `d-${g.id}` }))];
    const weak = weakest(groups);
    const needs = questions.filter((q) => record(st, q.key).status === 'needs-revision');
    body = weak.length ? (
      <>
        <GroupTable title={all ? 'Weakest topics' : 'Weakest topics and examiners'} groups={weak.slice(0, 8)} />
        <h2 className="view__h2">{STATUS_LABEL['needs-revision']}</h2>
        <Rows items={needs} all={all} />
      </>
    ) : (
      <p className="muted">No weak areas yet. They appear when you mark questions “Needs revision”.</p>
    );
  }

  return (
    <section className="view">
      <PreviewBanner sp={sp} />
      <header className="view__head">
        <div>
          <h1 className="view__title">{TITLES[mode]}</h1>
          <p className="view__intro">{INTRO[mode]}</p>
        </div>
        {toggle}
      </header>
      {body}
    </section>
  );
}

import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SpecialtyArt } from '../../components/art/SpecialtyArt';
import { questionsOf, type QuestionRef, type Specialty } from '../../content';
import { byDoctor, byTopic, matches, pct, tally, topicsMastered, type GroupProgress } from '../../study/derive';
import { useStudy } from '../../study/store';
import { useGuestBrowsing } from '../../auth/guest';
import { archivePath } from '../archive/data';
import { EmptyState, Ledger, PreviewBanner, QuestionRow, StatusLegend } from './ui';

type Tab = 'doctors' | 'topics';

export function Masthead({ sp, children }: { sp: Specialty; children?: ReactNode }) {
  return (
    <header className="masthead">
      <div className="masthead__art" aria-hidden>
        <div className="masthead__halftone">
          <SpecialtyArt id={sp.id} />
        </div>
      </div>
      <div className="masthead__text">
        <p className="masthead__vol">Volume {sp.volume} of the library</p>
        <h1 className="masthead__title">{sp.title}</h1>
        {sp.description ? (
          <p className="masthead__desc">{sp.description}</p>
        ) : (
          <p className="masthead__desc">{sp.points.join(' · ')}</p>
        )}
        {children}
      </div>
    </header>
  );
}

function Drawer({ g, sp, open, kind, query, to }: { g: GroupProgress; sp: Specialty; open: boolean; kind: string; query: string; to?: string }) {
  const shown = g.questions.filter((q) => matches(q, sp, query));
  // an examiner's name opens their illustrated archive; while searching, matches still list here
  if (to && query.trim() === '') {
    return (
      <div className="drawer" id={`${kind}-${g.id}`}>
        <Link className="drawer__head" to={to}>
          <bdi className="drawer__name">{g.name}</bdi>
          <span className="drawer__count">
            {g.tally.total} {g.tally.total === 1 ? 'question' : 'questions'} · {pct(g.tally.mastered)} mastered
          </span>
          <Ledger tally={g.tally} label={`${g.name} progress`} />
          <span className="drawer__chev drawer__chev--go" aria-hidden />
        </Link>
      </div>
    );
  }
  return (
    <details className="drawer" open={open || (query.trim() !== '' && shown.length > 0)} id={`${kind}-${g.id}`}>
      <summary className="drawer__head">
        <bdi className="drawer__name">{g.name}</bdi>
        <span className="drawer__count">
          {g.tally.total} {g.tally.total === 1 ? 'question' : 'questions'} · {pct(g.tally.mastered)} mastered
        </span>
        <Ledger tally={g.tally} label={`${g.name} progress`} />
        <span className="drawer__chev" aria-hidden />
      </summary>
      {shown.length ? (
        <ul className="qlist">
          {shown.map((q) => (
            <QuestionRow key={q.key} q={q} sp={sp} />
          ))}
        </ul>
      ) : (
        <p className="drawer__none">{g.tally.total ? 'No questions here match your search.' : 'No questions linked yet.'}</p>
      )}
    </details>
  );
}

export function DashboardHome({ sp }: { sp: Specialty }) {
  const st = useStudy();
  const guest = useGuestBrowsing();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'topics' ? 'topics' : 'doctors';
  const open = params.get('open');
  const query = params.get('q') ?? '';

  const qs = useMemo(() => questionsOf(sp), [sp]);
  const all = tally(qs, st);
  const topics = byTopic(sp, st);
  const doctors = byDoctor(sp, st);
  const groups = tab === 'doctors' ? doctors : topics;
  const linkedField = tab === 'doctors' ? 'doctorIds' : 'topicIds';
  const loose: QuestionRef[] = qs.filter((q) => q[linkedField].length === 0);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'tab') next.delete('open');
    setParams(next, { replace: true });
  };

  const results = query.trim() ? qs.filter((q) => matches(q, sp, query)) : [];
  const groupHits = query.trim()
    ? [...topics.map((t) => ({ ...t, kind: 'topics' as Tab })), ...doctors.map((d) => ({ ...d, kind: 'doctors' as Tab }))].filter((g) =>
        g.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];

  return (
    <>
      <PreviewBanner sp={sp} />
      <Masthead sp={sp} />

      {/* figures */}
      <section className="figures" aria-label="Your progress in this specialty">
        <div className="figures__progress">
          <p className="figures__big">
            {pct(all.mastered)}
            <span> mastered</span>
          </p>
          <Ledger tally={all} label="Overall progress" />
          <StatusLegend tally={all} />
        </div>
        <dl className="figures__nums">
          <div>
            <dt>Total questions</dt>
            <dd>{all.total}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>
              {all.counts.mastered}
              <small> mastered</small>
            </dd>
          </div>
          <div>
            <dt>Topics mastered</dt>
            <dd>
              {topicsMastered(topics)}
              <small> of {sp.topics.length}</small>
            </dd>
          </div>
        </dl>
      </section>

      {/* search */}
      <form className="dsearch" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={`dsearch-${sp.id}`} className="dsearch__label">
          Search {sp.title}
        </label>
        <input
          id={`dsearch-${sp.id}`}
          type="search"
          placeholder="Questions, topics or doctors"
          value={query}
          onChange={(e) => setParam('q', e.target.value || null)}
          autoComplete="off"
        />
      </form>

      {query.trim() && (
        <section className="results" aria-live="polite" aria-label="Search results">
          {groupHits.length > 0 && (
            <ul className="results__groups">
              {groupHits.map((g) => (
                <li key={`${g.kind}-${g.id}`}>
                  <Link to={`?tab=${g.kind}&open=${g.id}`} onClick={() => setParam('q', null)}>
                    {g.name} <small>{g.kind === 'topics' ? 'Topic' : 'Examiner'}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {results.length ? (
            <ul className="qlist">
              {results.map((q) => (
                <QuestionRow key={q.key} q={q} sp={sp} />
              ))}
            </ul>
          ) : (
            <p className="results__none">No questions match “{query.trim()}”.</p>
          )}
        </section>
      )}

      {/* browse tabs */}
      <section className="browse" aria-label="Browse questions">
        <div className="tabs" role="tablist" aria-label="Browse by">
          {(
            [
              ['doctors', 'Browse by doctor'],
              ['topics', 'Browse by topic'],
            ] as Array<[Tab, string]>
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              className={`tabs__tab tabs__tab--${t}`}
              onClick={() => setParam('tab', t)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tabs__panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {groups.length === 0 && loose.length === 0 ? (
            guest ? (
              <EmptyState title={`Nothing in ${sp.title} is open to guests yet`}>
                <p>
                  The full {sp.title} library is for registered students. <Link to="/register">Create an account</Link> or{' '}
                  <Link to={`/login?next=${encodeURIComponent(`/specialties/${sp.slug}`)}`}>sign in</Link> to open it.
                </p>
              </EmptyState>
            ) : (
              <EmptyState title={tab === 'doctors' ? 'No examiners in this volume yet' : 'No topics in this volume yet'}>
                <p>
                  {sp.title} questions, {tab === 'doctors' ? 'examiners' : 'topics'} and study material will appear here as soon as they’re added.
                </p>
              </EmptyState>
            )
          ) : (
            <div className={`drawers${groups.length >= 8 ? ' drawers--grid' : ''}`}>
              {groups.map((g) => (
                <Drawer key={g.id} g={g} sp={sp} open={open === g.id} kind={tab} query={query} to={tab === 'doctors' ? archivePath(sp, g.id) : undefined} />
              ))}
              {loose.length > 0 && (
                <Drawer
                  g={{ id: 'unlinked', name: tab === 'doctors' ? 'Not linked to an examiner' : 'Not linked to a topic', questions: loose, tally: tally(loose, st) }}
                  sp={sp}
                  open={open === 'unlinked'}
                  kind={tab}
                  query={query}
                />
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

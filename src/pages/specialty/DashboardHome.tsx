import { useMemo, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { SpecialtyArt } from '../../components/art/SpecialtyArt';
import { questionsOf, type Specialty } from '../../content';
import { byTopic, matches, pct, tally, topicsMastered } from '../../study/derive';
import { useStudy } from '../../study/store';
import { useGuestBrowsing } from '../../auth/guest';
import { useApproaches } from '../../content/approaches';
import { topicPath } from '../archive/data';
import { SubjectBoard } from './SubjectBoard';
import '../approach/approach.css';
import { EmptyState, Ledger, PreviewBanner, QuestionRow, StatusLegend } from './ui';

type Tab = 'subjects' | 'approaches';

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

export function DashboardHome({ sp }: { sp: Specialty }) {
  const st = useStudy();
  const guest = useGuestBrowsing();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  // old links (?tab=doctors, ?tab=topics) land on the subject board
  const tab: Tab = tabParam === 'approaches' ? 'approaches' : 'subjects';
  const approaches = useApproaches(sp.id);
  const open = params.get('open');
  const query = params.get('q') ?? '';

  const qs = useMemo(() => questionsOf(sp), [sp]);
  const all = tally(qs, st);
  const topics = byTopic(sp, st);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'tab') next.delete('open');
    setParams(next, { replace: true });
  };

  const results = query.trim() ? qs.filter((q) => matches(q, sp, query)) : [];
  const needle = query.trim().toLowerCase();
  const groupHits = needle
    ? [
        ...(sp.subjects ?? []).filter((x) => x.name.toLowerCase().includes(needle)).map((x) => ({ key: `s-${x.id}`, name: x.name, label: 'Subject', to: `?tab=subjects&subject=${x.id}` })),
        ...topics.filter((t) => t.name.toLowerCase().includes(needle)).map((t) => ({ key: `t-${t.id}`, name: t.name, label: 'Topic', to: topicPath(sp, t.id) })),
      ]
    : [];

  // an old ?tab=topics&open=<topic> link opens that topic's own page
  if (tabParam === 'topics' && open && sp.topics.some((t) => t.id === open)) return <Navigate to={topicPath(sp, open)} replace />;

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
          placeholder="Questions, subjects or topics"
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
                <li key={g.key}>
                  <Link to={g.to} onClick={() => setParam('q', null)}>
                    {g.name} <small>{g.label}</small>
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
              ['subjects', 'Browse by subject'],
              ['approaches', 'Browse by approach'],
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
          {tab === 'approaches' ? (
            approaches.data === undefined ? (
              <p className="approaches__wait">Opening the approaches…</p>
            ) : approaches.error ? (
              <EmptyState title="The approaches couldn’t be loaded">
                <p>Check your connection and reload the page. ({approaches.error})</p>
              </EmptyState>
            ) : approaches.data && approaches.data.length ? (
              <ul className="approaches">
                {approaches.data.map((a) => (
                  <li key={a.id}>
                    <Link className="approach-card" to={`/specialties/${sp.slug}/approaches/${a.id}`}>
                      <h3 className="approach-card__title">
                        {a.title}
                        {a.draft && <span className="approach-card__draft">Draft</span>}
                      </h3>
                      <p className="approach-card__summary">{a.summary}</p>
                      <p className="approach-card__meta">
                        Written approach{a.cases.length > 0 && ` · ${a.cases.length} ${a.cases.length === 1 ? 'case' : 'cases'} to practise`}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : guest ? (
              <EmptyState title={`${sp.title} approaches are for registered students`}>
                <p>
                  <Link to="/register">Create an account</Link> or{' '}
                  <Link to={`/login?next=${encodeURIComponent(`/specialties/${sp.slug}?tab=approaches`)}`}>sign in</Link> to open them.
                </p>
              </EmptyState>
            ) : (
              <EmptyState title={`No ${sp.title} approaches yet`}>
                <p>Clinical approaches for {sp.title}, each with a case to practise, will appear here as they’re added.</p>
              </EmptyState>
            )
          ) : qs.length === 0 && guest ? (
            <EmptyState title={`Nothing in ${sp.title} is open to guests yet`}>
              <p>
                The full {sp.title} library is for registered students. <Link to="/register">Create an account</Link> or{' '}
                <Link to={`/login?next=${encodeURIComponent(`/specialties/${sp.slug}`)}`}>sign in</Link> to open it.
              </p>
            </EmptyState>
          ) : (
            <SubjectBoard sp={sp} />
          )}
        </div>
      </section>
    </>
  );
}

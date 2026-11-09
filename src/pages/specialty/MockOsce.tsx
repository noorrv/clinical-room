import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { allQuestions, questionPath, questionsOf, specialtyById, TYPE_LABEL, type QuestionRef, type Specialty } from '../../content';
import { pct } from '../../study/derive';
import { record, study, useStudy, type MockStationResult } from '../../study/store';
import { EmptyState, PreviewBanner } from './ui';

/*
  Timed mock exam built only from questions that exist. Stations are drawn at random from the
  chosen pool; each runs against a countdown, then the student ticks the examiner's own checklist
  (or, when a question has none, gives an overall rating). The summary is saved to the tracker.
*/

type Pool = 'all' | 'revision' | 'unseen';
type Phase = 'setup' | 'station' | 'assess' | 'summary';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const checklistOf = (q: QuestionRef) => (q.examinerExpects?.length ? q.examinerExpects : q.keyPoints?.length ? q.keyPoints : q.steps ?? []);

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;

export function MockOsce({ sp }: { sp: Specialty }) {
  const st = useStudy();
  const [phase, setPhase] = useState<Phase>('setup');
  const [scope, setScope] = useState<'this' | 'all'>('this');
  const [pool, setPool] = useState<Pool>('all');
  const [count, setCount] = useState(5);
  const [minutes, setMinutes] = useState(7);
  const [stations, setStations] = useState<QuestionRef[]>([]);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<MockStationResult[]>([]);
  const [endsAt, setEndsAt] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [rating, setRating] = useState<MockStationResult['rating']>();
  const [revisionAdded, setRevisionAdded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const source = scope === 'all' ? allQuestions() : questionsOf(sp);
  const available = useMemo(
    () =>
      source.filter((q) => {
        const s = record(st, q.key).status;
        return pool === 'all' ? true : pool === 'revision' ? s === 'needs-revision' : s === 'not-started';
      }),
    [source, pool, st],
  );
  const n = Math.min(Math.max(1, count), available.length || 1);

  // countdown, from timestamps so it stays accurate in a background tab
  useEffect(() => {
    if (phase !== 'station') return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [phase]);

  const left = Math.ceil((endsAt - now) / 1000);
  useEffect(() => {
    if (phase === 'station' && left <= 0) toAssess();
  }, [left, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => headingRef.current?.focus(), [phase, current]);

  const begin = (i: number, list = stations) => {
    const q = list[i];
    const secs = (q.minutes ?? minutes) * 60;
    const t = Date.now();
    setCurrent(i);
    setStartedAt(t);
    setEndsAt(t + secs * 1000);
    setNow(t);
    setTicks(checklistOf(q).map(() => false));
    setRating(undefined);
    setPhase('station');
  };

  const start = () => {
    const picked = shuffle(available).slice(0, n);
    setStations(picked);
    setResults([]);
    setRevisionAdded(false);
    begin(0, picked);
  };

  function toAssess() {
    setPhase('assess');
  }

  const recordStation = () => {
    const q = stations[current];
    const allowed = Math.round((endsAt - startedAt) / 1000);
    const used = Math.min(allowed, Math.round((Math.min(Date.now(), endsAt) - startedAt) / 1000));
    const res: MockStationResult = {
      key: q.key,
      checked: ticks.filter(Boolean).length,
      total: ticks.length,
      rating: ticks.length ? undefined : rating,
      secondsUsed: phase === 'assess' ? Math.min(allowed, Math.round((Math.min(now, endsAt) - startedAt) / 1000)) : used,
      secondsAllowed: allowed,
    };
    const all = [...results, res];
    setResults(all);
    if (current + 1 < stations.length) begin(current + 1);
    else {
      study.saveMock({ scope: scope === 'all' ? 'all' : sp.id, stations: all });
      setPhase('summary');
    }
  };

  const score = (r: MockStationResult) => (r.total ? r.checked / r.total : r.rating === 'pass' ? 1 : r.rating === 'borderline' ? 0.5 : 0);
  const weak = results.filter((r) => score(r) < 0.6);

  /* ── setup ── */
  if (phase === 'setup') {
    return (
      <section className="mock">
        <PreviewBanner sp={sp} />
        <header className="view__head">
          <div>
            <h1 className="view__title">Mock OSCE</h1>
            <p className="view__intro">Timed stations drawn at random from your question bank, marked against the examiner’s checklist.</p>
          </div>
        </header>
        <form
          className="mock__setup"
          onSubmit={(e) => {
            e.preventDefault();
            if (available.length) start();
          }}
        >
          <fieldset>
            <legend>Questions from</legend>
            <label>
              <input type="radio" name="scope" checked={scope === 'this'} onChange={() => setScope('this')} /> {sp.title}
            </label>
            <label>
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} /> All specialties
            </label>
          </fieldset>
          <fieldset>
            <legend>Include</legend>
            <label>
              <input type="radio" name="pool" checked={pool === 'all'} onChange={() => setPool('all')} /> All questions
            </label>
            <label>
              <input type="radio" name="pool" checked={pool === 'revision'} onChange={() => setPool('revision')} /> Needs revision only
            </label>
            <label>
              <input type="radio" name="pool" checked={pool === 'unseen'} onChange={() => setPool('unseen')} /> Not started only
            </label>
          </fieldset>
          <div className="mock__nums">
            <label>
              Stations
              <input type="number" min={1} max={Math.max(1, available.length)} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
              <small>{available.length} available</small>
            </label>
            <label>
              Minutes per station
              <input type="number" min={1} max={30} value={minutes} onChange={(e) => setMinutes(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
              <small>Used when a question has no time of its own</small>
            </label>
          </div>
          {available.length ? (
            <button type="submit" className="btn-ink">
              Start {n} {n === 1 ? 'station' : 'stations'}
            </button>
          ) : (
            <EmptyState title="No stations to draw from">
              <p>
                {source.length === 0
                  ? 'Mock OSCE uses real questions only, and none have been added here yet.'
                  : 'No questions match this choice. Try “All questions”.'}
              </p>
            </EmptyState>
          )}
        </form>
      </section>
    );
  }

  const q = stations[current];
  const qsp = specialtyById(q?.specialtyId ?? sp.id);

  /* ── a station ── */
  if (phase === 'station') {
    const total = Math.round((endsAt - startedAt) / 1000);
    return (
      <section className="mock mock--live">
        <div className="mock__bar">
          <span className="mock__count">
            Station {current + 1} of {stations.length}
          </span>
          <span className={`mock__timer${left <= 60 ? ' is-low' : ''}`} role="timer" aria-label={`${Math.max(0, left)} seconds left`}>
            {mmss(Math.max(0, left))}
          </span>
        </div>
        <div className="mock__track" aria-hidden>
          <span style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
        </div>
        <article className="mock__station">
          <p className="qpage__type">{TYPE_LABEL[q.type]}</p>
          <h1 className="qpage__title" tabIndex={-1} ref={headingRef}>
            {q.title}
          </h1>
          {q.scenario && (
            <>
              <h2 className="book__h">Clinical scenario</h2>
              <p className="book__text">{q.scenario}</p>
            </>
          )}
          {q.question && (
            <>
              <h2 className="book__h">Task</h2>
              <p className="book__text">{q.question}</p>
            </>
          )}
          {!q.scenario && !q.question && <p className="book__missing">This station’s scenario hasn’t been added yet.</p>}
        </article>
        <div className="mock__actions">
          <button type="button" className="btn-ink" onClick={toAssess}>
            End station and mark it
          </button>
        </div>
      </section>
    );
  }

  /* ── self-assessment ── */
  if (phase === 'assess') {
    const items = checklistOf(q);
    const canNext = items.length > 0 || !!rating;
    return (
      <section className="mock">
        <div className="mock__bar">
          <span className="mock__count">
            Station {current + 1} of {stations.length}: mark yourself
          </span>
        </div>
        <h1 className="view__title" tabIndex={-1} ref={headingRef}>
          {q.title}
        </h1>
        {items.length ? (
          <fieldset className="checklist">
            <legend>Tick everything you covered</legend>
            {items.map((it, i) => (
              <label key={i}>
                <input type="checkbox" checked={ticks[i] ?? false} onChange={(e) => setTicks((t) => t.map((v, j) => (j === i ? e.target.checked : v)))} />
                {it}
              </label>
            ))}
            <p className="checklist__score">
              {ticks.filter(Boolean).length} of {items.length}
            </p>
          </fieldset>
        ) : (
          <fieldset className="checklist">
            <legend>This question has no examiner checklist yet. How did it go?</legend>
            {(['pass', 'borderline', 'fail'] as const).map((r) => (
              <label key={r}>
                <input type="radio" name="rating" checked={rating === r} onChange={() => setRating(r)} /> {r === 'pass' ? 'Clear pass' : r === 'borderline' ? 'Borderline' : 'Fail'}
              </label>
            ))}
          </fieldset>
        )}
        <div className="mock__actions">
          <button type="button" className="btn-ink" disabled={!canNext} onClick={recordStation}>
            {current + 1 < stations.length ? 'Next station' : 'See my results'}
          </button>
        </div>
      </section>
    );
  }

  /* ── summary ── */
  const checked = results.reduce((a, r) => a + r.checked, 0);
  const total = results.reduce((a, r) => a + r.total, 0);
  const overall = results.length ? results.reduce((a, r) => a + score(r), 0) / results.length : 0;
  return (
    <section className="mock">
      <header className="view__head">
        <div>
          <h1 className="view__title" tabIndex={-1} ref={headingRef}>
            Mock OSCE results
          </h1>
          <p className="view__intro">
            {results.length} {results.length === 1 ? 'station' : 'stations'} · overall {pct(overall)}
            {total > 0 && (
              <>
                {' '}
                · {checked} of {total} checklist items
              </>
            )}
          </p>
        </div>
      </header>
      <table className="gtable mock__table">
        <thead>
          <tr>
            <th scope="col">Station</th>
            <th scope="col">Score</th>
            <th scope="col">Time used</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const s = stations.find((x) => x.key === r.key)!;
            return (
              <tr key={r.key} className={score(r) < 0.6 ? 'is-weak' : undefined}>
                <th scope="row">
                  <Link to={questionPath(specialtyById(s.specialtyId), s.id)}>{s.title}</Link>
                </th>
                <td>{r.total ? `${r.checked} of ${r.total} (${pct(r.checked / r.total)})` : r.rating === 'pass' ? 'Clear pass' : r.rating === 'borderline' ? 'Borderline' : 'Fail'}</td>
                <td>
                  {mmss(r.secondsUsed)} of {mmss(r.secondsAllowed)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mock__actions">
        {weak.length > 0 && (
          <button
            type="button"
            className="btn-ghost"
            disabled={revisionAdded}
            onClick={() => {
              weak.forEach((r) => study.setStatus(r.key, 'needs-revision'));
              setRevisionAdded(true);
            }}
          >
            {revisionAdded ? 'Added to your revision queue' : `Add ${weak.length} weaker ${weak.length === 1 ? 'station' : 'stations'} to revision`}
          </button>
        )}
        <button type="button" className="btn-ink" onClick={() => setPhase('setup')}>
          New mock OSCE
        </button>
      </div>
      <p className="muted">
        Results are saved in <Link to={`/specialties/${qsp.slug}/tracker`}>My tracker</Link>.
      </p>
    </section>
  );
}

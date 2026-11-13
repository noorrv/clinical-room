import { useId, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { allSpecialties, specialtyById } from '../../content';
import type { SpecialtyId } from '../../content/types';
import { localDay, record, study, useStudy, type GoalPeriod, type StudyState } from '../../study/store';
import { topicPath } from '../archive/data';
import { MeNav } from './MeNav';
import { minutes, periodStart, placedQuestions, type Placed } from './library';
import '../auth/auth.css';
import './profile.css';

/*
  The student's tracker, in two clearly separate parts.

  Automatic: worked out from what they did. Questions worked on (marked or noted, each question
  once a day, the same count as the streak), questions marked reviewed, study sessions and their
  length, timed study, and active days, for this week, this month or all time.

  Manual: what they decided themselves. Topics marked "studying" or "completed", and goals of
  questions to complete per subject. A manual mark never changes the automatic figures, and the
  automatic figures never tick a manual mark.
*/

type Period = 'week' | 'month' | 'total';
const PERIOD_WORD: Record<Period, string> = { week: 'This week', month: 'This month', total: 'All time' };

function automatic(st: StudyState, from: number) {
  const fromDay = from ? localDay(from) : '';
  const days = Object.entries(st.days).filter(([d]) => d >= fromDay);
  const worked = new Set(days.flatMap(([, ks]) => ks));
  const sessions = st.sessions.filter((s) => s.startedAt >= from);
  // marked reviewed in the period and still reviewed now (unmarking takes it back off)
  const reviewed = new Set(sessions.flatMap((s) => s.changes.filter((c) => c.to === 'mastered' && c.at >= from && record(st, c.key).status === 'mastered').map((c) => c.key)));
  const sessionMin = Math.round(sessions.reduce((m, s) => m + Math.min(s.lastAt - s.startedAt, 4 * 3600e3), 0) / 60000);
  const timedMin = Math.round(
    Object.entries(st.seconds ?? {})
      .filter(([d]) => d >= fromDay)
      .reduce((n, [, s]) => n + s, 0) / 60,
  );
  const active = new Set([...days.filter(([, ks]) => ks.length).map(([d]) => d), ...sessions.map((s) => localDay(s.startedAt))]).size;
  return { worked: worked.size, reviewed: reviewed.size, sessions: sessions.length, sessionMin, timedMin, active };
}

export function TrackerPage() {
  const st = useStudy();
  const [period, setPeriod] = useState<Period>('week');
  const placed = useMemo(() => placedQuestions(), []);
  const auto = useMemo(() => automatic(st, periodStart(period)), [st, period]);
  const totals = useMemo(() => {
    const recs = placed.map((p) => record(st, p.q.key));
    return { total: placed.length, attempted: recs.filter((r) => r.status !== 'not-started').length, completed: recs.filter((r) => r.status === 'mastered').length };
  }, [placed, st]);
  const sessionsTrimmed = period !== 'week' && st.sessions.length >= 60;

  return (
    <div className="profile-page">
      <div className="profile container">
        <MeNav />
        <header className="me-head">
          <h1 className="me-head__title">Tracker</h1>
          <p className="me-head__intro">What you’ve done, counted for you, and what you’ve marked and aimed for yourself. The two are kept apart.</p>
        </header>

        <section className="profile-section" aria-labelledby="auto-title">
          <div className="me-section-head">
            <h2 id="auto-title" className="profile-section__title">
              Counted for you
            </h2>
            <div className="me-seg" role="group" aria-label="Period">
              {(['week', 'month', 'total'] as Period[]).map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>
                  {PERIOD_WORD[p]}
                </button>
              ))}
            </div>
          </div>
          <dl className="profile-stats">
            <Stat label="Questions worked on" value={auto.worked} />
            <Stat label="Marked reviewed" value={auto.reviewed} />
            <Stat label="Study sessions" value={auto.sessions} unit={auto.sessionMin ? minutes(auto.sessionMin) : undefined} />
            <Stat label="Timed with the study timer" value={auto.timedMin ? minutes(auto.timedMin) : '0 min'} />
            <Stat label="Days you studied" value={auto.active} />
          </dl>
          <p className="profile-note">
            Worked on counts each question once a day when you mark it or write a note on it, the same as your streak; opening a page doesn’t count. Sessions are worked out from your activity; the timer is counted on its own.
            {sessionsTrimmed ? ' Only your last 60 sessions are kept, so older sessions may be missing.' : ''}
          </p>
          <MonthGrid st={st} />
          <p className="me-totals">
            Overall: {totals.attempted} of {totals.total} questions attempted · {totals.completed} completed
          </p>
        </section>

        <section className="profile-section" aria-labelledby="manual-title">
          <h2 id="manual-title" className="profile-section__title">
            Marked by you
          </h2>
          <TopicMarks st={st} placed={placed} />
          <Goals st={st} placed={placed} />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit && <span> · {unit}</span>}
      </dd>
    </div>
  );
}

/** The last five weeks, a square a day, darker for more questions worked on. */
function MonthGrid({ st }: { st: StudyState }) {
  const cells = useMemo(() => {
    const out: Array<{ day: string; n: number; label: string }> = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 34);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const day = localDay(d.getTime());
      out.push({ day, n: st.days[day]?.length ?? 0, label: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) });
    }
    return out;
  }, [st.days]);
  const level = (n: number) => (n === 0 ? 0 : n < 3 ? 1 : n < 5 ? 2 : n < 10 ? 3 : 4);
  return (
    <figure className="cal">
      <figcaption className="week__title">The last five weeks</figcaption>
      <ol className="cal__grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <li key={`h${i}`} className="cal__head" aria-hidden>
            {d}
          </li>
        ))}
        {cells.map((c) => (
          <li key={c.day} className={`cal__cell cal__cell--${level(c.n)}`} title={`${c.label}: ${c.n} ${c.n === 1 ? 'question' : 'questions'}`}>
            <span className="visually-hidden">
              {c.label}: {c.n} {c.n === 1 ? 'question' : 'questions'}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/* ───────────────────────── manual: topics ───────────────────────── */

function TopicMarks({ st, placed }: { st: StudyState; placed: Placed[] }) {
  const topics = useMemo(() => {
    const m = new Map<string, { sp: SpecialtyId; id: string; name: string; specialty: string }>();
    for (const p of placed) m.set(`${p.sp.id}/${p.topicId}`, { sp: p.sp.id, id: p.topicId, name: p.topicName, specialty: p.sp.title });
    return m;
  }, [placed]);
  const marks = Object.entries(st.topicMarks ?? {}).filter(([k, v]) => v.state && topics.has(k));
  const studying = marks.filter(([, v]) => v.state === 'studying');
  const completed = marks.filter(([, v]) => v.state === 'completed');

  const row = ([k]: [string, unknown]) => {
    const t = topics.get(k)!;
    return (
      <li key={k}>
        <Link to={topicPath(specialtyById(t.sp), t.id)}>{t.name}</Link>
        <span className="me-muted"> · {t.specialty}</span>
        <button type="button" className="me-link me-link--quiet" onClick={() => study.markTopic(t.sp, t.id, null)} aria-label={`Remove your mark on ${t.name}`}>
          Remove
        </button>
      </li>
    );
  };

  return (
    <div className="marks">
      <div>
        <h3 className="marks__title">Studying now ({studying.length})</h3>
        {studying.length ? <ul className="marks__list">{studying.map(row)}</ul> : <p className="me-muted">Mark a topic as “studying” from its page.</p>}
      </div>
      <div>
        <h3 className="marks__title">Completed ({completed.length})</h3>
        {completed.length ? <ul className="marks__list">{completed.map(row)}</ul> : <p className="me-muted">Topics you mark as completed appear here.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── manual: goals ───────────────────────── */

const GOAL_WORD: Record<GoalPeriod, string> = { week: 'this week', month: 'this month', total: 'in total' };

/** Questions completed in a subject within the goal's period (each question once). */
function goalProgress(st: StudyState, keys: Set<string>, period: GoalPeriod): number {
  if (period === 'total') return [...keys].filter((k) => record(st, k).status === 'mastered').length;
  const from = periodStart(period);
  const done = new Set(st.sessions.filter((s) => s.lastAt >= from).flatMap((s) => s.changes.filter((c) => c.at >= from && c.to === 'mastered' && keys.has(c.key)).map((c) => c.key)));
  return [...done].filter((k) => record(st, k).status === 'mastered').length;
}

function Goals({ st, placed }: { st: StudyState; placed: Placed[] }) {
  const subjects = useMemo(() => {
    const m = new Map<string, { sp: SpecialtyId; id: string; name: string; specialty: string; keys: Set<string> }>();
    for (const p of placed) {
      if (!p.subjectId) continue;
      const k = `${p.sp.id}/${p.subjectId}`;
      if (!m.has(k)) m.set(k, { sp: p.sp.id, id: p.subjectId, name: p.subjectName ?? p.subjectId, specialty: p.sp.title, keys: new Set() });
      m.get(k)!.keys.add(p.q.key);
    }
    return m;
  }, [placed]);
  const goals = Object.entries(st.goals ?? {}).filter(([k, g]) => g.target > 0 && subjects.has(k));
  const [adding, setAdding] = useState(false);

  return (
    <div className="goals">
      <div className="me-section-head">
        <h3 className="marks__title">Goals</h3>
        {!adding && subjects.size > 0 && (
          <button type="button" className="me-link" onClick={() => setAdding(true)}>
            Set a goal
          </button>
        )}
      </div>
      {goals.length === 0 && !adding && <p className="me-muted">Aim for a number of questions to complete in a subject, per week, per month or in total.</p>}
      {goals.length > 0 && (
        <ul className="goal-list">
          {goals.map(([k, g]) => {
            const s = subjects.get(k)!;
            const done = goalProgress(st, s.keys, g.period);
            const pct = Math.min(100, Math.round((done / g.target) * 100));
            return (
              <li key={k} className="goal">
                <p className="goal__name">
                  {s.name} <span className="me-muted">· {s.specialty}</span>
                </p>
                <p className="goal__line">
                  {done} of {g.target} completed {GOAL_WORD[g.period]}
                  {done >= g.target ? ' · reached' : ''}
                </p>
                <span className="goal__bar" role="progressbar" aria-valuemin={0} aria-valuemax={g.target} aria-valuenow={Math.min(done, g.target)} aria-label={`${s.name} goal`}>
                  <span style={{ width: `${pct}%` }} />
                </span>
                <button type="button" className="me-link me-link--quiet" onClick={() => study.setGoal(s.sp, s.id, 0, g.period)} aria-label={`Remove the goal for ${s.name}`}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {adding && <GoalForm subjects={[...subjects.values()]} onDone={() => setAdding(false)} />}
    </div>
  );
}

function GoalForm({ subjects, onDone }: { subjects: Array<{ sp: SpecialtyId; id: string; name: string; specialty: string; keys: Set<string> }>; onDone: () => void }) {
  const ids = useId();
  const [subject, setSubject] = useState(subjects[0] ? `${subjects[0].sp}/${subjects[0].id}` : '');
  const [target, setTarget] = useState('10');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [error, setError] = useState('');
  const chosen = subjects.find((s) => `${s.sp}/${s.id}` === subject);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(target);
    if (!chosen) return;
    if (!Number.isInteger(n) || n < 1 || n > 2000) {
      setError('Choose a whole number from 1 to 2000.');
      return;
    }
    study.setGoal(chosen.sp, chosen.id, n, period);
    onDone();
  };

  return (
    <form className="goal-form" onSubmit={save} noValidate>
      <div className="me-picker">
        <label htmlFor={`${ids}-s`}>Subject</label>
        <select id={`${ids}-s`} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {allSpecialties().map((sp) => {
            const list = subjects.filter((s) => s.sp === sp.id);
            return list.length ? (
              <optgroup key={sp.id} label={sp.title}>
                {list.map((s) => (
                  <option key={s.id} value={`${s.sp}/${s.id}`}>
                    {s.name} ({s.keys.size})
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
      </div>
      <div className="me-picker">
        <label htmlFor={`${ids}-n`}>Questions to complete</label>
        <input id={`${ids}-n`} type="number" inputMode="numeric" min={1} max={2000} value={target} onChange={(e) => setTarget(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${ids}-e` : undefined} />
      </div>
      <div className="me-picker">
        <label htmlFor={`${ids}-p`}>Per</label>
        <select id={`${ids}-p`} value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)}>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="total">In total</option>
        </select>
      </div>
      {error && (
        <p className="auth-field__error" id={`${ids}-e`}>
          {error}
        </p>
      )}
      <div className="bm__actions">
        <button type="submit" className="auth-btn">
          Save goal
        </button>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

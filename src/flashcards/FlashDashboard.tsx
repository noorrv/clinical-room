import { useId, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { localDay, study, useStudy, type FlashFilters } from '../study/store';
import { timeAgo } from '../study/derive';
import { ArchiveRoom } from '../pages/archive/shared';
import { deck, filtered, filtersFrom, type Status } from './deck';
import { isDifficult, isDue, isLearning, isMastered, isOverdue } from './categories';
import { describe, PALETTE } from './FlashSession';
import { RATE_WORD, spanWord, type Rate } from './scheduler';
import './flashcards.css';

/*
  The flashcards page: how the student's cards stand (new, learning, due today, overdue,
  difficult, mastered), filters to choose which cards to study, how many, and a start (or a
  resume, when a session is open). Below, their study figures and recent reviews.

  The filters live in the page address, so a chosen set of cards can be returned to.
*/

const SIZES = [10, 20, 40];
const STATUS_WORD: Record<Status, string> = { all: 'All cards', due: 'Due today', new: 'New', learning: 'Learning', difficult: 'Difficult', mastered: 'Mastered' };
const unnumbered = (title: string) => title.replace(/^\s*(?:Q\s*)?\d+\s*[.)]\s+/i, '');
const DAY = 86_400_000;

export function FlashDashboard() {
  const st = useStudy();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const all = useMemo(() => deck(), []);
  const byKey = useMemo(() => new Map(all.map((p) => [p.q.key, p])), [all]);
  const f: FlashFilters = useMemo(() => filtersFrom(params) ?? {}, [params]);
  const status: Status = f.status ?? 'due';
  const size = params.get('limit') ?? '20';

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k === 'specialty') {
      next.delete('subject');
      next.delete('topic');
    }
    if (k === 'subject') next.delete('topic');
    setParams(next, { replace: true });
  };

  // the cards in scope (specialty, subject, topic, bookmarks), before the status filter
  const scope = useMemo(() => filtered(all, { ...f, status: 'all' }, st), [all, f, st]);
  const now = Date.now();
  const counts = useMemo(() => {
    const c = st.cards ?? {};
    const of = (fn: (k: string) => boolean) => scope.filter((p) => fn(p.q.key)).length;
    return {
      new: of((k) => !c[k]),
      learning: of((k) => isLearning(c[k])),
      due: of((k) => isDue(c[k], now)),
      overdue: of((k) => isOverdue(c[k], now)),
      difficult: of((k) => isDifficult(c[k])),
      mastered: of((k) => isMastered(c[k])),
    };
  }, [scope, st.cards, now]);
  const matching = useMemo(() => filtered(all, { ...f, status }, st), [all, f, status, st]);
  const howMany = size === 'all' ? matching.length : Math.min(Number(size) || 20, matching.length);

  const open = st.fcSession && !('closed' in st.fcSession) ? st.fcSession : null;
  const openDone = open ? open.rated.filter((k) => byKey.has(k)).length : 0;
  const openTotal = open ? open.queue.filter((k) => byKey.has(k)).length : 0;

  const start = () => {
    const q = new URLSearchParams();
    if (f.specialty) q.set('specialty', f.specialty);
    if (f.subject) q.set('subject', f.subject);
    if (f.topic) q.set('topic', f.topic);
    if (f.bookmarked) q.set('bookmarked', '1');
    q.set('status', status);
    q.set('limit', String(Math.max(1, howMany)));
    navigate(`/flashcards/session?${q}`);
  };

  // filter choices come from the questions themselves
  const specialties = uniq(all.map((p) => [p.sp.id, p.sp.title]));
  const inSp = all.filter((p) => !f.specialty || p.sp.id === f.specialty);
  const subjects = uniq(inSp.flatMap((p) => (p.subjectId ? [[p.subjectId, p.subjectName ?? p.subjectId]] : [])));
  const inSub = inSp.filter((p) => !f.subject || p.subjectId === f.subject);
  const topics = uniq(inSub.map((p) => [`${p.sp.id}/${p.topicId}`, p.topicName]));

  return (
    <ArchiveRoom className="da--plain fc-room" palette={PALETTE}>
      <div className="fc-wrap fc-wrap--wide">
        <header className="fc-dash-head">
          <h1 className="fc-dash-head__title">Flashcards</h1>
          <p className="fc-dash-head__intro">Every question in the library, as a card to recall. Your ratings set when each one comes back.</p>
        </header>

        {open && openDone < openTotal && (
          <section className="fc-resume" aria-label="Session in progress">
            <div>
              <p className="fc-resume__label">Session in progress</p>
              <p className="fc-resume__what">
                {describe(open.filters, byKey)} · {openDone} of {openTotal} rated
              </p>
            </div>
            <div className="fc-note__actions">
              <Link className="fc-btn fc-btn--solid" to="/flashcards/session">
                Resume session
              </Link>
              <button type="button" className="fc-btn" onClick={() => study.saveFlashSession(null)}>
                Close it
              </button>
            </div>
          </section>
        )}

        <section className="fc-panel" aria-labelledby="fc-choose">
          <h2 id="fc-choose" className="fc-panel__title">
            Choose your cards
          </h2>
          <div className="fc-filters" role="group" aria-label="Which cards">
            <Picker label="Specialty" value={f.specialty ?? ''} onChange={(v) => set('specialty', v)} options={specialties} />
            <Picker label="Subject" value={f.subject ?? ''} onChange={(v) => set('subject', v)} options={subjects} disabled={!subjects.length} />
            <Picker label="Topic" value={f.topic ?? ''} onChange={(v) => set('topic', v)} options={topics} />
            <label className="fc-check">
              <input type="checkbox" checked={Boolean(f.bookmarked)} onChange={(e) => set('bookmarked', e.target.checked ? '1' : null)} />
              Bookmarked only
            </label>
          </div>

          <ul className="fc-tiles" aria-label="Your cards here">
            {(
              [
                ['due', 'Due today', counts.due, counts.overdue ? `${counts.overdue} overdue` : 'none overdue'],
                ['new', 'New', counts.new, 'never studied'],
                ['learning', 'Learning', counts.learning, 'still settling in'],
                ['difficult', 'Difficult', counts.difficult, 'often forgotten'],
                ['mastered', 'Mastered', counts.mastered, 'held for 3+ weeks'],
                ['all', 'All cards', scope.length, 'in this choice'],
              ] as Array<[Status, string, number, string]>
            ).map(([id, label, n, sub]) => (
              <li key={id}>
                <button type="button" className="fc-tile" aria-pressed={status === id} onClick={() => set('status', id)}>
                  <span className="fc-tile__n">{n}</span>
                  <span className="fc-tile__label">{label}</span>
                  <span className="fc-tile__sub">{sub}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="fc-start">
            <div className="fc-sizes" role="group" aria-label="How many cards">
              <span className="fc-sizes__label">How many</span>
              {SIZES.map((n) => (
                <button key={n} type="button" aria-pressed={size === String(n)} onClick={() => set('limit', String(n))}>
                  {n}
                </button>
              ))}
              <button type="button" aria-pressed={size === 'all'} onClick={() => set('limit', 'all')}>
                All
              </button>
            </div>
            <button type="button" className="fc-btn fc-btn--solid fc-start__go" onClick={start} disabled={matching.length === 0}>
              {matching.length === 0 ? (status === 'due' ? 'Nothing due today' : 'No cards match') : `Study ${howMany} ${STATUS_WORD[status] === 'All cards' ? '' : `${STATUS_WORD[status].toLowerCase()} `}${howMany === 1 ? 'card' : 'cards'}`}
            </button>
          </div>
          {status === 'due' && matching.length === 0 && counts.new > 0 && (
            <p className="fc-hint">
              Nothing is due here.{' '}
              <button type="button" className="fc-linkbtn" onClick={() => set('status', 'new')}>
                Study new cards instead
              </button>
            </p>
          )}
        </section>

        <Stats byKey={byKey} />
      </div>
    </ArchiveRoom>
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
    <div className="fc-picker">
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

/* ───────────────────────── figures and history ───────────────────────── */

function Stats({ byKey }: { byKey: Map<string, { q: { title: string } }> }) {
  const st = useStudy();
  const logs = st.reviews ?? [];
  const month = useMemo(() => {
    const out: Array<{ day: string; n: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const day = localDay(Date.now() - i * DAY);
      out.push({ day, n: 0 });
    }
    const idx = new Map(out.map((d, i) => [d.day, i]));
    for (const l of logs) {
      const i = idx.get(localDay(l.at));
      if (i !== undefined) out[i].n++;
    }
    return out;
  }, [logs]);
  const total30 = month.reduce((n, d) => n + d.n, 0);
  const top = Math.max(4, ...month.map((d) => d.n));
  // recall: of the reviews of cards already studied before, the share not forgotten
  const seen = logs.filter((l) => l.stateBefore !== 'new');
  const recall = seen.length ? Math.round((seen.filter((l) => l.rating > 1).length / seen.length) * 100) : null;
  const byRating = ([1, 2, 3, 4] as Rate[]).map((r) => [r, logs.filter((l) => l.rating === r).length] as const);
  const studied = Object.keys(st.cards ?? {}).filter((k) => byKey.has(k)).length;

  return (
    <section className="fc-panel" aria-labelledby="fc-stats">
      <h2 id="fc-stats" className="fc-panel__title">
        Your study
      </h2>
      {logs.length === 0 ? (
        <p className="fc-hint">Your figures and review history appear here after your first rating.</p>
      ) : (
        <>
          <dl className="fc-figures">
            <div>
              <dt>Cards studied</dt>
              <dd>{studied}</dd>
            </div>
            <div>
              <dt>Reviews, last 30 days</dt>
              <dd>{total30}</dd>
            </div>
            <div>
              <dt>Recall on returning cards</dt>
              <dd>{recall === null ? '—' : `${recall}%`}</dd>
            </div>
          </dl>

          <figure className="fc-month">
            <figcaption className="fc-sub">Reviews a day, last 30 days</figcaption>
            <ol className="fc-month__bars">
              {month.map((d) => (
                <li key={d.day} title={`${new Date(`${d.day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${d.n}`}>
                  <span style={{ height: `${(d.n / top) * 100}%` }} />
                  <span className="visually-hidden">
                    {d.day}: {d.n} {d.n === 1 ? 'review' : 'reviews'}
                  </span>
                </li>
              ))}
            </ol>
          </figure>

          <div className="fc-split">
            <div>
              <p className="fc-sub">Your ratings</p>
              <ul className="fc-ratings">
                {byRating.map(([r, n]) => (
                  <li key={r} className={`fc-rate__btn--${r}`}>
                    <span className="fc-ratings__word">{RATE_WORD[r]}</span>
                    <span className="fc-ratings__bar">
                      <span style={{ width: `${logs.length ? (n / logs.length) * 100 : 0}%` }} />
                    </span>
                    <span className="fc-ratings__n">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="fc-sub">Recent reviews</p>
              <ol className="fc-history">
                {logs.slice(0, 12).map((l) => (
                  <li key={l.id}>
                    <span className={`fc-chip fc-rate__btn--${l.rating}`}>{RATE_WORD[l.rating]}</span>
                    <span className="fc-history__q">
                      <bdi>{byKey.get(l.key) ? unnumbered(byKey.get(l.key)!.q.title) : 'A question no longer published'}</bdi>
                    </span>
                    <span className="fc-history__when">
                      {timeAgo(l.at)} · next in {spanWord(l.nextInterval * DAY)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

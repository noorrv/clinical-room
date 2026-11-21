import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import '../auth/auth.css';

/*
  Who has been studying, and when. Reads admin_student_overview(), a database function that
  refuses anyone who isn't an admin. "Active" means the student did something that is saved:
  marked a question, opened a topic or question, or studied flashcards. Having the site open
  without touching anything doesn't count. The list refreshes itself every minute while open.
*/

interface Row {
  id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  last_active: string | null;
  questions_worked: number;
  mastered: number;
  needs_revision: number;
  goal_days: number;
  mock_exams: number;
}

type Band = 'now' | 'today' | 'week' | 'earlier' | 'never';
type Tab = 'all' | Band;

const NOW_MINUTES = 15;

// the tabs and totals are cumulative: "Today" includes anyone active now, "This week" includes today
const RANK: Record<Band, number> = { now: 0, today: 1, week: 2, earlier: 3, never: 4 };
const inTab = (band: Band, tab: Tab) => tab === 'all' || (tab === 'earlier' || tab === 'never' ? band === tab : RANK[band] <= RANK[tab]);

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'now', label: 'Active now' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'never', label: 'Never active' },
];

const SUM_LABEL: Partial<Record<Band, string>> = { now: 'Active now', today: 'Active today', week: 'Active this week', never: 'Never active' };

const BAND_LABEL: Record<Band, string> = {
  now: 'Active now',
  today: 'Today',
  week: 'This week',
  earlier: 'Earlier',
  never: 'Not yet',
};

function bandOf(iso: string | null, now: number): Band {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (now - t < NOW_MINUTES * 60_000) return 'now';
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  if (t >= midnight.getTime()) return 'today';
  if (now - t < 7 * 86_400_000) return 'week';
  return 'earlier';
}

function ago(iso: string | null, now: number): string {
  if (!iso) return 'Never';
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const exact = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

export function ActivityPage() {
  const { session } = useAuth();
  const me = session?.user.id;
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((t) => t.id === params.get('show')) ? (params.get('show') as Tab) : 'all';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_student_overview');
    setNow(Date.now());
    if (error) setLoadError('Student activity couldn’t be loaded. ' + error.message);
    else {
      setLoadError('');
      setRows(data as Row[]);
    }
  }, []);

  // load now, then every minute while the page is visible
  useEffect(() => {
    load();
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  const banded = useMemo(
    () =>
      (rows ?? [])
        .map((r) => ({ ...r, band: bandOf(r.last_active, now) }))
        .sort((a, b) => (b.last_active ?? '').localeCompare(a.last_active ?? '') || a.full_name.localeCompare(b.full_name)),
    [rows, now],
  );
  const count = (t: Tab) => banded.filter((r) => inTab(r.band, t)).length;
  const q = query.trim().toLowerCase();
  const shown = banded.filter((r) => inTab(r.band, tab) && (!q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)));

  return (
    <section className="view admin-view" aria-labelledby="admin-title">
      <header className="view__head">
        <div>
          <h1 id="admin-title" className="view__title">
            Activity
          </h1>
          <p className="view__intro">
            Who has been studying, and when. A student counts as active when they mark a question, open a topic or study flashcards. “Active now” means in the last {NOW_MINUTES} minutes.
          </p>
        </div>
      </header>

      <dl className="activity-sum" aria-label="Students by last activity">
        {(['now', 'today', 'week', 'never'] as Band[]).map((b) => (
          <div key={b} className={`activity-sum__item activity-sum__item--${b}`}>
            <dt>{SUM_LABEL[b]}</dt>
            <dd>{rows ? count(b) : '·'}</dd>
          </div>
        ))}
      </dl>

      <div className="admin-tools">
        <label className="visually-hidden" htmlFor="admin-search">
          Search by name or email
        </label>
        <input id="admin-search" type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="auth-btn auth-btn--quiet admin-refresh" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="admin-tabs activity-tabs" role="tablist" aria-label="Students by last activity">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`admin-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="admin-panel"
            className="admin-tab"
            onClick={() => setParams(t.id === 'all' ? {} : { show: t.id }, { replace: true })}
          >
            {t.label}
            <span className="admin-tab__count">{rows ? count(t.id) : '·'}</span>
          </button>
        ))}
      </div>

      <div className="admin-panel" role="tabpanel" id="admin-panel" aria-labelledby={`admin-tab-${tab}`}>
        {loadError && (
          <p className="auth-message auth-message--error" role="alert">
            {loadError}
          </p>
        )}
        {!rows && !loadError && (
          <p className="auth-text" role="status">
            Loading activity…
          </p>
        )}
        {rows && shown.length === 0 && (
          <p className="admin-empty">{q ? `No students match “${query.trim()}”.` : tab === 'now' ? 'Nobody has been active in the last 15 minutes.' : 'No students here.'}</p>
        )}
        {rows && shown.length > 0 && (
          <ul className="admin-list">
            {shown.map((r) => (
              <li key={r.id} className="admin-row activity-row">
                <div className="admin-row__who">
                  <span className="admin-row__name">
                    {r.full_name}
                    {r.id === me && <span className="admin-badge">You</span>}
                    {r.status !== 'approved' && <span className="admin-badge admin-badge--muted">{r.status === 'pending' ? 'Pending' : 'No access'}</span>}
                  </span>
                  <span className="admin-row__email">{r.email}</span>
                </div>
                <dl className="admin-row__dates">
                  <div>
                    <dt>Questions worked</dt>
                    <dd>{r.questions_worked}</dd>
                  </div>
                  <div>
                    <dt>Mastered</dt>
                    <dd>{r.mastered}</dd>
                  </div>
                  <div>
                    <dt>Study days</dt>
                    <dd>{r.goal_days}</dd>
                  </div>
                </dl>
                <p className="activity-when">
                  <span className={`activity-pill activity-pill--${r.band}`}>{BAND_LABEL[r.band]}</span>
                  <time dateTime={r.last_active ?? undefined} title={exact(r.last_active)}>
                    {r.last_active ? ago(r.last_active, now) : 'No activity yet'}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
        {rows && <p className="activity-foot">Updates every minute while this page is open. A study day is a day with five or more questions worked.</p>}
      </div>
    </section>
  );
}

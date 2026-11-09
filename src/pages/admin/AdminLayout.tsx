import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import '../specialty/specialty.css';
import './admin.css';

/*
  The administrator's room in the library: the same archive paper, index sidebar, masthead and
  ruled tables as the specialty dashboards, with its own burgundy ink. Every page inside it is
  checked twice: the route only opens for admins, and the database refuses non-admins anyway.
*/

const ADMIN_INK = {
  '--accent': '#5e1a1d',
  '--accent-soft': '#ead6cf',
  '--on-accent': '#f7efdf',
  '--accent-ink': '#5e1a1d',
} as CSSProperties;

export interface AdminCounts {
  pending: number;
  drafts: number;
}

const SECTIONS: Array<{ to: string; label: string; end?: boolean; count?: keyof AdminCounts }> = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/registrations', label: 'Registrations', count: 'pending' },
];

/** Shared with the pages inside, so a change on one page refreshes the badges in the index. */
export interface AdminOutletContext {
  refreshCounts: () => void;
}

export function AdminLayout() {
  const [counts, setCounts] = useState<AdminCounts>({ pending: 0, drafts: 0 });

  const refreshCounts = useCallback(async () => {
    const [p, d] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending').not('email_confirmed_at', 'is', null),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    ]);
    setCounts({ pending: p.count ?? 0, drafts: d.count ?? 0 });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  return (
    <div className="archive admin-archive" style={ADMIN_INK} data-specialty="admin">
      <div className="archive__grid container">
        <nav className="index" aria-label="Administration">
          <p className="index__head">
            <span className="index__vol">Admin</span> The Registrar
          </p>
          <ul className="index__list">
            {SECTIONS.map((s) => (
              <li key={s.to}>
                <NavLink end={s.end} to={s.to}>
                  {s.label}
                  {s.count && counts[s.count] > 0 ? <span className="index__count">{counts[s.count]}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="index__head index__head--sub">The library</p>
          <ul className="index__list">
            <li>
              <Link to="/">Back to the homepage</Link>
            </li>
          </ul>
        </nav>
        <main id="main" className="archive__main">
          <Outlet context={{ refreshCounts } satisfies AdminOutletContext} />
        </main>
      </div>
    </div>
  );
}

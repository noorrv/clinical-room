import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth, type AccountStatus, type Profile } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import '../auth/auth.css';
import type { AdminOutletContext } from './AdminLayout';

/*
  The administrator's ledger of registrations. Every change goes through the database function
  set_account_status(), which checks admin rights itself; this page can't grant anything on its own.
*/

type Tab = AccountStatus;
type Action = 'approve' | 'reject' | 'revoke' | 'restore';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const ACTION: Record<Action, { to: AccountStatus; title: string; button: string; body: string; note?: boolean; danger?: boolean }> = {
  approve: { to: 'approved', title: 'Approve this registration?', button: 'Approve', body: 'They will be able to open every study room straight away.' },
  reject: {
    to: 'rejected',
    title: 'Reject this registration?',
    button: 'Reject',
    body: 'They will see that their registration was not approved, with your note if you add one.',
    note: true,
    danger: true,
  },
  revoke: {
    to: 'rejected',
    title: 'Revoke this student’s access?',
    button: 'Revoke access',
    body: 'They lose access immediately. Their saved progress and notes are kept, in case you restore them later.',
    note: true,
    danger: true,
  },
  restore: { to: 'approved', title: 'Restore this student’s access?', button: 'Restore access', body: 'They will be able to open every study room again, with their saved progress.' },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function RegistrationsPage() {
  const { session } = useAuth();
  const { refreshCounts } = useOutletContext<AdminOutletContext>();
  const me = session?.user.id;
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['pending', 'approved', 'rejected'] as Tab[]).includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'pending';
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [pendingAction, setPendingAction] = useState<{ action: Action; profile: Profile } | null>(null);

  const load = useCallback(async () => {
    setLoadError('');
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) setLoadError('The registrations couldn’t be loaded. ' + error.message);
    else setRows(data as Profile[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const matches = (p: Profile) => !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  const groups = useMemo(() => {
    const all = rows ?? [];
    return {
      pending: all.filter((p) => p.status === 'pending' && p.email_confirmed_at),
      unconfirmed: all.filter((p) => p.status === 'pending' && !p.email_confirmed_at),
      approved: all.filter((p) => p.status === 'approved'),
      rejected: all.filter((p) => p.status === 'rejected'),
    };
  }, [rows]);

  const shown = groups[tab].filter(matches);

  const applied = (updated: Profile) => {
    setRows((rs) => (rs ?? []).map((r) => (r.id === updated.id ? updated : r)));
    refreshCounts();
  };

  return (
    <section className="view admin-view" aria-labelledby="admin-title">
        <header className="view__head">
          <div>
            <h1 id="admin-title" className="view__title">
              Registrations
            </h1>
            <p className="view__intro">Approve new students, revoke access, or restore it. Every decision is logged.</p>
          </div>
        </header>

        <div className="admin-tools">
          <label className="visually-hidden" htmlFor="admin-search">
            Search by name or email
          </label>
          <input id="admin-search" type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="button" className="auth-btn auth-btn--quiet admin-refresh" onClick={load}>
            Refresh
          </button>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Registrations by status">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`admin-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="admin-panel"
              className="admin-tab"
              onClick={() => setParams({ tab: t.id }, { replace: true })}
            >
              {t.label}
              <span className="admin-tab__count">{rows ? groups[t.id].length : '·'}</span>
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
              Loading registrations…
            </p>
          )}
          {rows && shown.length === 0 && (
            <p className="admin-empty">
              {q ? `No ${tab} accounts match “${query.trim()}”.` : tab === 'pending' ? 'No registrations are waiting for review.' : `No ${tab} accounts yet.`}
            </p>
          )}
          {rows && shown.length > 0 && (
            <ul className="admin-list">
              {shown.map((p) => (
                <li key={p.id} className="admin-row">
                  <div className="admin-row__who">
                    <span className="admin-row__name">
                      {p.full_name}
                      {p.id === me && <span className="admin-badge">You</span>}
                    </span>
                    <a className="admin-row__email" href={`mailto:${p.email}`}>
                      {p.email}
                    </a>
                  </div>
                  <dl className="admin-row__dates">
                    <div>
                      <dt>Registered</dt>
                      <dd>{fmt(p.created_at)}</dd>
                    </div>
                    {p.reviewed_at && (
                      <div>
                        <dt>{p.status === 'approved' ? 'Approved' : p.status === 'rejected' ? 'Rejected' : 'Reviewed'}</dt>
                        <dd>{fmt(p.reviewed_at)}</dd>
                      </div>
                    )}
                  </dl>
                  {p.review_note && <p className="admin-row__note">“{p.review_note}”</p>}
                  <div className="admin-row__actions">
                    {p.id === me ? (
                      <span className="admin-row__self">Your own account can’t be changed here.</span>
                    ) : p.status === 'pending' ? (
                      <>
                        <button type="button" className="admin-btn admin-btn--yes" onClick={() => setPendingAction({ action: 'approve', profile: p })}>
                          Approve
                        </button>
                        <button type="button" className="admin-btn admin-btn--no" onClick={() => setPendingAction({ action: 'reject', profile: p })}>
                          Reject
                        </button>
                      </>
                    ) : p.status === 'approved' ? (
                      <button type="button" className="admin-btn admin-btn--no" onClick={() => setPendingAction({ action: 'revoke', profile: p })}>
                        Revoke access
                      </button>
                    ) : (
                      <button type="button" className="admin-btn admin-btn--yes" onClick={() => setPendingAction({ action: 'restore', profile: p })}>
                        Restore access
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === 'pending' && groups.unconfirmed.length > 0 && (
            <details className="admin-unconfirmed">
              <summary>
                {groups.unconfirmed.length} {groups.unconfirmed.length === 1 ? 'registration hasn’t' : 'registrations haven’t'} confirmed an email address yet
              </summary>
              <p className="auth-text auth-text--quiet">These appear in the list above once they open the confirmation link. They can’t be approved before then.</p>
              <ul className="admin-mini">
                {groups.unconfirmed.filter(matches).map((p) => (
                  <li key={p.id}>
                    {p.full_name} · {p.email} · {fmt(p.created_at)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

      {pendingAction && <ConfirmDialog {...pendingAction} onClose={() => setPendingAction(null)} onDone={applied} />}
    </section>
  );
}

function ConfirmDialog({ action, profile, onClose, onDone }: { action: Action; profile: Profile; onClose: () => void; onDone: (p: Profile) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const spec = ACTION[action];

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const confirm = async () => {
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('set_account_status', {
      target: profile.id,
      new_status: spec.to,
      note: spec.note ? note : null,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    onDone(data as Profile);
    ref.current?.close();
  };

  return (
    <dialog ref={ref} className="admin-dialog" onClose={onClose} aria-labelledby="admin-dialog-title">
      <h2 id="admin-dialog-title">{spec.title}</h2>
      <p className="admin-dialog__who">
        <strong>{profile.full_name}</strong>
        <span>{profile.email}</span>
      </p>
      <p className="auth-text">{spec.body}</p>
      {spec.note && (
        <div className="auth-field">
          <label htmlFor="admin-note">Note to the student (optional)</label>
          <textarea id="admin-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please register with your university email address." />
        </div>
      )}
      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button type="button" className={`auth-btn${spec.danger ? ' admin-btn-danger' : ''}`} onClick={confirm} disabled={busy}>
          {busy ? 'Saving…' : spec.button}
        </button>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={() => ref.current?.close()} disabled={busy}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}

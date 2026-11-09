import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LanternBooks } from '../../components/art/WidgetArt';
import { allSpecialties } from '../../content';
import type { SpecialtyId } from '../../content/types';
import { supabase } from '../../lib/supabase';
import { timeAgo } from '../../study/derive';

/*
  Overview: real totals from Supabase, content per specialty, and the activity log the database
  keeps by itself. Nothing on this page is sample data.
*/

interface Activity {
  id: number;
  at: string;
  actor: string | null;
  action: 'created' | 'updated' | 'deleted' | 'published' | 'unpublished' | 'status';
  entity: string;
  entity_key: string;
  summary: string | null;
}

interface OverviewData {
  students: { pending: number; unconfirmed: number; approved: number; rejected: number };
  questions: Array<{ specialty_id: SpecialtyId; status: 'draft' | 'published' }>;
  doctors: Array<{ specialty_id: SpecialtyId }>;
  topics: Array<{ specialty_id: SpecialtyId }>;
  notices: { published: number; hidden: number };
  activity: Activity[];
  names: Record<string, string>;
}

const ENTITY: Record<string, string> = {
  questions: 'question',
  doctors: 'examiner',
  topics: 'topic',
  specialties: 'specialty',
  announcements: 'notice',
  profiles: 'registration',
};

function describe(a: Activity): string {
  const what = ENTITY[a.entity] ?? a.entity;
  const label = a.summary ? `“${a.summary}”` : '';
  if (a.entity === 'profiles') {
    if (a.action === 'created') return `New registration: ${a.summary ?? ''}`;
    const [name, status] = (a.summary ?? '').split(' → ');
    return `${name}’s account was ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : `set to ${status}`}`;
  }
  const verb = { created: 'Added', updated: 'Edited', deleted: 'Deleted', published: 'Published', unpublished: 'Unpublished', status: 'Changed' }[a.action];
  return `${verb} ${what} ${label}`.trim();
}

function who(a: Activity, names: Record<string, string>): string {
  if (a.actor) return names[a.actor] ?? 'an administrator';
  if (a.entity === 'profiles' && a.action === 'created') return 'self-registered';
  return 'Supabase dashboard';
}

async function load(): Promise<OverviewData> {
  const [profiles, questions, doctors, topics, notices, activity] = await Promise.all([
    supabase.from('profiles').select('id, full_name, status, email_confirmed_at'),
    supabase.from('questions').select('specialty_id, status'),
    supabase.from('doctors').select('specialty_id'),
    supabase.from('topics').select('specialty_id'),
    supabase.from('announcements').select('published'),
    supabase.from('admin_activity').select('*').order('at', { ascending: false }).limit(12),
  ]);
  const failed = [profiles, questions, doctors, topics, notices, activity].find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  const ps = profiles.data ?? [];
  const names = Object.fromEntries(ps.map((p) => [p.id, p.full_name]));
  return {
    students: {
      pending: ps.filter((p) => p.status === 'pending' && p.email_confirmed_at).length,
      unconfirmed: ps.filter((p) => p.status === 'pending' && !p.email_confirmed_at).length,
      approved: ps.filter((p) => p.status === 'approved').length,
      rejected: ps.filter((p) => p.status === 'rejected').length,
    },
    questions: (questions.data ?? []) as OverviewData['questions'],
    doctors: (doctors.data ?? []) as OverviewData['doctors'],
    topics: (topics.data ?? []) as OverviewData['topics'],
    notices: {
      published: (notices.data ?? []).filter((n) => n.published).length,
      hidden: (notices.data ?? []).filter((n) => !n.published).length,
    },
    activity: (activity.data ?? []) as Activity[],
    names,
  };
}

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setError('');
    load()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const perSpecialty = useMemo(() => {
    if (!data) return [];
    return allSpecialties().map((sp) => ({
      sp,
      doctors: data.doctors.filter((d) => d.specialty_id === sp.id).length,
      topics: data.topics.filter((t) => t.specialty_id === sp.id).length,
      published: data.questions.filter((q) => q.specialty_id === sp.id && q.status === 'published').length,
      drafts: data.questions.filter((q) => q.specialty_id === sp.id && q.status === 'draft').length,
    }));
  }, [data]);

  const total = (k: 'doctors' | 'topics' | 'published' | 'drafts') => perSpecialty.reduce((n, r) => n + r[k], 0);

  return (
    <section className="admin-overview" aria-labelledby="overview-title">
      <header className="masthead">
        <div className="masthead__art" aria-hidden>
          <div className="masthead__halftone">
            <LanternBooks />
          </div>
        </div>
        <div className="masthead__text">
          <p className="masthead__vol">The Registrar’s office</p>
          <h1 id="overview-title" className="masthead__title">
            Overview
          </h1>
          <p className="masthead__desc">Everything in the library at a glance, straight from the database.</p>
        </div>
      </header>

      {error && (
        <div className="admin-alert" role="alert">
          <p>The figures couldn’t be loaded: {error}</p>
          <button type="button" className="btn-ghost" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {!data && !error && (
        <p className="muted admin-loading" role="status">
          Counting the shelves…
        </p>
      )}

      {data && (
        <>
          <section className="figures" aria-label="Totals">
            <div>
              <p className="figures__big">
                {data.students.approved}
                <span> {data.students.approved === 1 ? 'approved student' : 'approved students'}</span>
              </p>
              <p className="admin-attention">
                {data.students.pending > 0 ? (
                  <Link to="/admin/registrations">
                    {data.students.pending} {data.students.pending === 1 ? 'registration is' : 'registrations are'} waiting for review
                  </Link>
                ) : (
                  'No registrations waiting for review.'
                )}
                {data.students.unconfirmed > 0 && (
                  <span className="muted"> · {data.students.unconfirmed} still to confirm their email</span>
                )}
              </p>
            </div>
            <dl className="figures__nums">
              <div>
                <dt>Questions</dt>
                <dd>
                  {total('published')} <small>published</small>
                </dd>
              </div>
              <div>
                <dt>Drafts</dt>
                <dd>{total('drafts')}</dd>
              </div>
              <div>
                <dt>Notices</dt>
                <dd>
                  {data.notices.published} <small>live</small>
                </dd>
              </div>
            </dl>
          </section>

          <div className="gtable">
            <h2 className="gtable__title">The library</h2>
            <table>
              <thead>
                <tr>
                  <th scope="col">Specialty</th>
                  <th scope="col">Examiners</th>
                  <th scope="col">Topics</th>
                  <th scope="col">Published questions</th>
                  <th scope="col">Drafts</th>
                </tr>
              </thead>
              <tbody>
                {perSpecialty.map((r) => (
                  <tr key={r.sp.id}>
                    <th scope="row">{r.sp.title}</th>
                    <td>{r.doctors}</td>
                    <td>{r.topics}</td>
                    <td>{r.published}</td>
                    <td>{r.drafts}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">All four specialties</th>
                  <td>{total('doctors')}</td>
                  <td>{total('topics')}</td>
                  <td>{total('published')}</td>
                  <td>{total('drafts')}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <dl className="admin-ledger-line">
            <div>
              <dt>Students</dt>
              <dd>
                {data.students.approved} approved · {data.students.pending} pending · {data.students.rejected} not approved
              </dd>
            </div>
            <div>
              <dt>Notices</dt>
              <dd>
                {data.notices.published} live · {data.notices.hidden} unpublished
              </dd>
            </div>
          </dl>

          <h2 className="view__h2">Recent activity</h2>
          {data.activity.length ? (
            <ol className="admin-activity">
              {data.activity.map((a) => (
                <li key={a.id}>
                  <span className={`admin-activity__mark admin-activity__mark--${a.action}`} aria-hidden />
                  <span className="admin-activity__what">
                    <bdi>{describe(a)}</bdi>
                  </span>
                  <span className="admin-activity__meta">
                    {who(a, data.names)} · <time dateTime={a.at}>{timeAgo(Date.parse(a.at))}</time>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Nothing has changed since the activity log was switched on. Changes appear here as you make them.</p>
          )}
        </>
      )}
    </section>
  );
}

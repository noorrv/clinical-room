import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { questionPath, specialtyById } from '../../content';
import type { SpecialtyId } from '../../content/types';
import { supabase } from '../../lib/supabase';
import type { AdminOutletContext } from './AdminLayout';
import { loadLookups, TYPE_OPTIONS, type Lookups, type QStatus, type QuestionRow } from './questionData';
import { AccessStamp, compare, ConfirmDelete, friendlyError, PAGE_SIZE, Pager, SortHeader, specialtyOptions, specialtyTitle, useNotify, useSort } from './ui';

/*
  Every question, drafts included: filter by specialty, topic, examiner, type and status; sort;
  publish or unpublish one at a time or in bulk; open the editor.
*/

type Row = Pick<QuestionRow, 'specialty_id' | 'id' | 'title' | 'type' | 'status' | 'access' | 'updated_at' | 'sort'>;
type SortKey = 'title' | 'specialty' | 'type' | 'status' | 'updated';

const keyOf = (r: { specialty_id: string; id: string }) => `${r.specialty_id}/${r.id}`;
const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((t) => [t.value, t.label]));

export function QuestionsPage() {
  const notify = useNotify();
  const { refreshCounts } = useOutletContext<AdminOutletContext>();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [lookups, setLookups] = useState<Lookups>({ doctors: [], topics: [] });
  const [docLinks, setDocLinks] = useState<Record<string, string[]>>({});
  const [topLinks, setTopLinks] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { sort, onSort } = useSort<SortKey>('updated');
  const [page, setPage] = useState(1);

  // filters live in the address, so a filtered list can be bookmarked or shared between tabs
  const q = params.get('q') ?? '';
  const sp = (params.get('specialty') ?? 'all') as 'all' | SpecialtyId;
  const topic = params.get('topic') ?? 'all';
  const doctor = params.get('doctor') ?? 'all';
  const status = (params.get('status') ?? 'all') as 'all' | QStatus;
  const type = params.get('type') ?? 'all';
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === 'all') next.delete(k);
    else next.set(k, v);
    if (k === 'specialty') {
      next.delete('topic');
      next.delete('doctor');
    }
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const [r, qd, qt, lk] = await Promise.all([
        supabase.from('questions').select('specialty_id, id, title, type, status, access, updated_at, sort'),
        supabase.from('question_doctors').select('specialty_id, question_id, doctor_id'),
        supabase.from('question_topics').select('specialty_id, question_id, topic_id'),
        loadLookups(),
      ]);
      const failed = [r, qd, qt].find((x) => x.error);
      if (failed?.error) throw new Error(friendlyError(failed.error));
      const group = (list: Array<Record<string, string>>, col: string) => {
        const m: Record<string, string[]> = {};
        for (const x of list) (m[`${x.specialty_id}/${x.question_id}`] ??= []).push(x[col]);
        return m;
      };
      setRows((r.data ?? []) as Row[]);
      setDocLinks(group((qd.data ?? []) as Array<Record<string, string>>, 'doctor_id'));
      setTopLinks(group((qt.data ?? []) as Array<Record<string, string>>, 'topic_id'));
      setLookups(lk);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [q, sp, topic, doctor, status, type, sort.key, sort.dir]);

  const nameOf = (list: Lookups['doctors'], s: string, id: string) => list.find((x) => x.specialty_id === s && x.id === id)?.name ?? id;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => sp === 'all' || r.specialty_id === sp)
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => type === 'all' || r.type === type)
      .filter((r) => topic === 'all' || (topLinks[keyOf(r)] ?? []).includes(topic))
      .filter((r) => doctor === 'all' || (docLinks[keyOf(r)] ?? []).includes(doctor))
      .filter((r) => !needle || r.title.toLowerCase().includes(needle) || r.id.includes(needle))
      .sort((a, b) => {
        switch (sort.key) {
          case 'specialty':
            return compare(specialtyTitle(a.specialty_id), specialtyTitle(b.specialty_id), sort.dir) || compare(a.title, b.title, 'asc');
          case 'type':
            return compare(TYPE_LABEL[a.type], TYPE_LABEL[b.type], sort.dir);
          case 'status':
            return compare(a.status, b.status, sort.dir);
          case 'updated':
            return compare(b.updated_at, a.updated_at, sort.dir); // newest first by default
          default:
            return compare(a.title, b.title, sort.dir);
        }
      });
  }, [rows, q, sp, status, type, topic, doctor, topLinks, docLinks, sort]);

  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = (rows ?? []).filter((r) => selected.has(keyOf(r)));
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(keyOf(r)));

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  /** Sets the status of many questions, one request per specialty. */
  const setStatus = async (list: Row[], to: QStatus) => {
    setBusy(true);
    const bySp = new Map<string, string[]>();
    for (const r of list) bySp.set(r.specialty_id, [...(bySp.get(r.specialty_id) ?? []), r.id]);
    const results = await Promise.all([...bySp].map(([s, ids]) => supabase.from('questions').update({ status: to }).eq('specialty_id', s).in('id', ids)));
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) notify(friendlyError(failed.error), 'error');
    else notify(`${to === 'published' ? 'Published' : 'Moved to drafts'}: ${list.length} ${list.length === 1 ? 'question' : 'questions'}.`);
    await load();
    refreshCounts();
  };

  const topicsForFilter = lookups.topics.filter((t) => sp === 'all' || t.specialty_id === sp);
  const doctorsForFilter = lookups.doctors.filter((d) => sp === 'all' || d.specialty_id === sp);

  return (
    <section className="view admin-view" aria-labelledby="q-title">
      <header className="view__head">
        <div>
          <h1 id="q-title" className="view__title">
            Questions
          </h1>
          <p className="view__intro">Drafts are seen only by you. Publish a question to show it to students (and to guests, if it’s open to them).</p>
        </div>
        <div className="admin-head-actions">
          <Link className="btn-ink admin-linkbtn" to={`/admin/questions/new${sp !== 'all' ? `?specialty=${sp}` : ''}`}>
            New question
          </Link>
        </div>
      </header>

      <div className="admin-toolbar" role="search">
        <label className="visually-hidden" htmlFor="q-search">
          Search questions
        </label>
        <input id="q-search" type="search" placeholder="Search by title" value={q} onChange={(e) => setParam('q', e.target.value)} />
        <label>
          Specialty
          <select value={sp} onChange={(e) => setParam('specialty', e.target.value)}>
            <option value="all">All specialties</option>
            {specialtyOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setParam('topic', e.target.value)}>
            <option value="all">All topics</option>
            {topicsForFilter.map((t) => (
              <option key={keyOf(t)} value={t.id}>
                {t.name}
                {sp === 'all' ? ` (${specialtyTitle(t.specialty_id)})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Examiner
          <select value={doctor} onChange={(e) => setParam('doctor', e.target.value)}>
            <option value="all">All examiners</option>
            {doctorsForFilter.map((d) => (
              <option key={keyOf(d)} value={d.id}>
                {d.name}
                {sp === 'all' ? ` (${specialtyTitle(d.specialty_id)})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setParam('type', e.target.value)}>
            <option value="all">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="all">Drafts and published</option>
            <option value="draft">Drafts</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      {selected.size > 0 && (
        <div className="admin-bulk" role="region" aria-label="Selected questions">
          <span>
            {selected.size} selected
          </span>
          <button type="button" className="btn-ink" disabled={busy} onClick={() => setStatus(selectedRows, 'published')}>
            Publish
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => setStatus(selectedRows, 'draft')}>
            Move to drafts
          </button>
          <button type="button" className="btn-ghost admin-danger-text" disabled={busy} onClick={() => setDeleting(selectedRows)}>
            Delete
          </button>
          <button type="button" className="admin-linklike" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {error && (
        <div className="admin-alert" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-ghost" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {!rows && !error && (
        <p className="muted admin-loading" role="status">
          Loading questions…
        </p>
      )}

      {rows &&
        (shown.length === 0 ? (
          <div className="empty">
            <p className="empty__title">{rows.length === 0 ? 'No questions yet' : 'No questions match these filters'}</p>
            <div className="empty__body">
              {rows.length === 0 ? (
                <p>
                  <Link to="/admin/questions/new">Write the first question</Link>.
                </p>
              ) : (
                <p>Try another search, or clear the filters.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="gtable">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="admin-check-col">
                    <input
                      type="checkbox"
                      aria-label="Select every question on this page"
                      checked={allOnPage}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          pageRows.forEach((r) => (allOnPage ? n.delete(keyOf(r)) : n.add(keyOf(r))));
                          return n;
                        })
                      }
                    />
                  </th>
                  <SortHeader label="Title" k="title" sort={sort} onSort={onSort} />
                  <SortHeader label="Specialty" k="specialty" sort={sort} onSort={onSort} />
                  <SortHeader label="Type" k="type" sort={sort} onSort={onSort} />
                  <SortHeader label="Status" k="status" sort={sort} onSort={onSort} />
                  <SortHeader label="Updated" k="updated" sort={sort} onSort={onSort} />
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const k = keyOf(r);
                  const docs = (docLinks[k] ?? []).map((id) => nameOf(lookups.doctors, r.specialty_id, id));
                  const tops = (topLinks[k] ?? []).map((id) => nameOf(lookups.topics, r.specialty_id, id));
                  return (
                    <tr key={k} className={selected.has(k) ? 'is-selected' : undefined}>
                      <td className="admin-check-col">
                        <input type="checkbox" aria-label={`Select ${r.title}`} checked={selected.has(k)} onChange={() => toggle(k)} />
                      </td>
                      <th scope="row">
                        <Link className="admin-title-link" to={`/admin/questions/edit/${r.specialty_id}/${r.id}`}>
                          <bdi>{r.title}</bdi>
                        </Link>
                        <span className="admin-table-sub">
                          {[tops.length ? tops.join(', ') : 'No topic', docs.length ? docs.join(', ') : 'No examiner'].join(' · ')}
                        </span>
                      </th>
                      <td>{specialtyTitle(r.specialty_id)}</td>
                      <td>{TYPE_LABEL[r.type]}</td>
                      <td>
                        <span className={`admin-pill admin-pill--${r.status}`}>{r.status === 'draft' ? 'Draft' : 'Published'}</span>{' '}
                        {r.status === 'published' && <AccessStamp access={r.access} />}
                      </td>
                      <td>
                        <time dateTime={r.updated_at}>{new Date(r.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" disabled={busy} onClick={() => setStatus([r], r.status === 'draft' ? 'published' : 'draft')}>
                            {r.status === 'draft' ? 'Publish' : 'Unpublish'}
                          </button>
                          {r.status === 'published' && (
                            <Link className="admin-rowlink" to={questionPath(specialtyById(r.specialty_id), r.id)}>
                              View
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="admin-table-note">
              Showing {shown.length === rows.length ? `all ${rows.length}` : `${shown.length} of ${rows.length}`} questions. Click a title to edit it.
            </p>
          </div>
        ))}
      <Pager page={page} total={shown.length} onPage={setPage} />

      {deleting && (
        <ConfirmDelete
          title={deleting.length === 1 ? 'Delete this question?' : `Delete ${deleting.length} questions?`}
          body={
            <>
              {deleting.length === 1 ? (
                <p>
                  <strong>
                    <bdi>{deleting[0].title}</bdi>
                  </strong>{' '}
                  ({specialtyTitle(deleting[0].specialty_id)})
                </p>
              ) : (
                <p>The {deleting.length} selected questions will be deleted.</p>
              )}
              <p>Their examiner and topic links go with them. Students’ saved progress on them is no longer shown. This can’t be undone.</p>
            </>
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const bySp = new Map<string, string[]>();
            for (const r of deleting) bySp.set(r.specialty_id, [...(bySp.get(r.specialty_id) ?? []), r.id]);
            const results = await Promise.all([...bySp].map(([s, ids]) => supabase.from('questions').delete().eq('specialty_id', s).in('id', ids)));
            const failed = results.find((r) => r.error);
            if (failed?.error) return friendlyError(failed.error);
            notify(`Deleted ${deleting.length} ${deleting.length === 1 ? 'question' : 'questions'}.`);
            await load();
            refreshCounts();
            return null;
          }}
        />
      )}
    </section>
  );
}

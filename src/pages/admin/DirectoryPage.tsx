import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { SpecialtyId } from '../../content/types';
import { supabase } from '../../lib/supabase';
import type { AdminOutletContext } from './AdminLayout';
import {
  ACCESS_OPTIONS,
  AccessStamp,
  compare,
  ConfirmDelete,
  Dialog,
  friendlyError,
  ID_PATTERN,
  PAGE_SIZE,
  Pager,
  SelectField,
  slugify,
  SortHeader,
  specialtyOptions,
  specialtyTitle,
  TextField,
  useNotify,
  useSort,
} from './ui';

/*
  Examiners and topics: the same list and forms, configured per kind. Both are keyed by
  specialty + a short web address (id), and both link to questions through a link table.
*/

type Kind = 'doctors' | 'topics';

interface Row {
  specialty_id: SpecialtyId;
  id: string;
  name: string;
  role?: string | null;
  note?: string | null;
  description?: string | null;
  sort: number;
  access: 'approved' | 'public';
  created_at: string;
}

const CONFIG = {
  doctors: {
    title: 'Examiners',
    noun: 'examiner',
    intro: 'The doctors students are examined by. Each belongs to one specialty and can be linked to its questions.',
    link: { table: 'question_doctors', column: 'doctor_id' },
    extra: [
      { key: 'role', label: 'Role', hint: 'Optional, e.g. Consultant Surgeon.', multiline: false },
      { key: 'note', label: 'Note for students', hint: 'Optional: anything worth knowing about this examiner’s style.', multiline: true },
    ],
    fallbackId: 'examiner',
  },
  topics: {
    title: 'Topics',
    noun: 'topic',
    intro: 'Subjects within a specialty, used to group questions on the dashboards and in search.',
    link: { table: 'question_topics', column: 'topic_id' },
    extra: [{ key: 'description', label: 'Description', hint: 'Optional: a line explaining what the topic covers.', multiline: true }],
    fallbackId: 'topic',
  },
} as const;

type SortKey = 'name' | 'specialty' | 'linked' | 'access' | 'sort';

interface FormState {
  specialty_id: SpecialtyId;
  id: string;
  name: string;
  role: string;
  note: string;
  description: string;
  sort: string;
  access: 'approved' | 'public';
}

const randomTail = () => Math.random().toString(36).slice(2, 6);

export function DirectoryPage({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind];
  const notify = useNotify();
  const { refreshCounts } = useOutletContext<AdminOutletContext>();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [links, setLinks] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [spFilter, setSpFilter] = useState<'all' | SpecialtyId>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'approved' | 'public'>('all');
  const { sort, onSort } = useSort<SortKey>('name');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setError('');
    const [r, l] = await Promise.all([
      supabase.from(kind).select('*').order('name'),
      supabase.from(cfg.link.table).select(`specialty_id, ${cfg.link.column}`),
    ]);
    if (r.error || l.error) {
      setError(friendlyError(r.error ?? l.error));
      return;
    }
    setRows(r.data as Row[]);
    const counts: Record<string, number> = {};
    for (const x of (l.data ?? []) as unknown as Array<Record<string, string>>) {
      const k = `${x.specialty_id}/${x[cfg.link.column]}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    setLinks(counts);
  }, [kind, cfg.link.table, cfg.link.column]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  useEffect(() => setPage(1), [query, spFilter, accessFilter, sort.key, sort.dir]);

  const linkedOf = (r: Row) => links[`${r.specialty_id}/${r.id}`] ?? 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => spFilter === 'all' || r.specialty_id === spFilter)
      .filter((r) => accessFilter === 'all' || r.access === accessFilter)
      .filter((r) => !q || [r.name, r.id, r.role ?? '', r.description ?? ''].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => {
        switch (sort.key) {
          case 'specialty':
            return compare(specialtyTitle(a.specialty_id), specialtyTitle(b.specialty_id), sort.dir) || compare(a.name, b.name, 'asc');
          case 'linked':
            return compare(linkedOf(a), linkedOf(b), sort.dir);
          case 'access':
            return compare(a.access, b.access, sort.dir);
          case 'sort':
            return compare(a.sort, b.sort, sort.dir);
          default:
            return compare(a.name, b.name, sort.dir);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, links, query, spFilter, accessFilter, sort]);

  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const afterChange = async (message: string) => {
    notify(message);
    await load();
    refreshCounts();
  };

  return (
    <section className="view admin-view" aria-labelledby="dir-title">
      <header className="view__head">
        <div>
          <h1 id="dir-title" className="view__title">
            {cfg.title}
          </h1>
          <p className="view__intro">{cfg.intro}</p>
        </div>
        <button type="button" className="btn-ink" onClick={() => setEditing('new')}>
          Add {cfg.noun}
        </button>
      </header>

      <div className="admin-toolbar" role="search">
        <label className="visually-hidden" htmlFor={`${kind}-q`}>
          Search {cfg.title.toLowerCase()}
        </label>
        <input id={`${kind}-q`} type="search" placeholder={`Search ${cfg.title.toLowerCase()} by name`} value={query} onChange={(e) => setQuery(e.target.value)} />
        <label>
          Specialty
          <select value={spFilter} onChange={(e) => setSpFilter(e.target.value as 'all' | SpecialtyId)}>
            <option value="all">All specialties</option>
            {specialtyOptions().map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Who can see it
          <select value={accessFilter} onChange={(e) => setAccessFilter(e.target.value as 'all' | 'approved' | 'public')}>
            <option value="all">Everyone and students</option>
            <option value="approved">Students only</option>
            <option value="public">Open to guests</option>
          </select>
        </label>
      </div>

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
          Loading {cfg.title.toLowerCase()}…
        </p>
      )}

      {rows && (
        <>
          {shown.length === 0 ? (
            <div className="empty">
              <p className="empty__title">{rows.length === 0 ? `No ${cfg.title.toLowerCase()} yet` : `No ${cfg.title.toLowerCase()} match these filters`}</p>
              <div className="empty__body">
                {rows.length === 0 ? (
                  <button type="button" className="btn-ink" onClick={() => setEditing('new')}>
                    Add the first {cfg.noun}
                  </button>
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
                    <SortHeader label="Name" k="name" sort={sort} onSort={onSort} />
                    <SortHeader label="Specialty" k="specialty" sort={sort} onSort={onSort} />
                    <SortHeader label="Questions" k="linked" sort={sort} onSort={onSort} />
                    <SortHeader label="Visibility" k="access" sort={sort} onSort={onSort} />
                    <SortHeader label="Order" k="sort" sort={sort} onSort={onSort} />
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={`${r.specialty_id}/${r.id}`}>
                      <th scope="row">
                        <bdi>{r.name}</bdi>
                        {r.role && <span className="admin-table-sub">{r.role}</span>}
                      </th>
                      <td>{specialtyTitle(r.specialty_id)}</td>
                      <td className="admin-count">{linkedOf(r)}</td>
                      <td>
                        <AccessStamp access={r.access} />
                      </td>
                      <td className="admin-count">{r.sort}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button type="button" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
                            Edit
                          </button>
                          <button type="button" className="is-danger" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="admin-table-note">
                Showing {shown.length === rows.length ? `all ${rows.length}` : `${shown.length} of ${rows.length}`} {cfg.title.toLowerCase()}.
              </p>
            </div>
          )}
          <Pager page={page} total={shown.length} onPage={setPage} />
        </>
      )}

      {editing && (
        <EntityForm
          kind={kind}
          row={editing === 'new' ? null : editing}
          linked={editing === 'new' ? 0 : linkedOf(editing)}
          existing={rows ?? []}
          defaultSpecialty={spFilter === 'all' ? 'medicine' : spFilter}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            afterChange(msg);
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          title={`Delete this ${cfg.noun}?`}
          body={
            <>
              <p>
                <strong>
                  <bdi>{deleting.name}</bdi>
                </strong>{' '}
                ({specialtyTitle(deleting.specialty_id)})
              </p>
              {linkedOf(deleting) > 0 ? (
                <p>
                  It is linked to {linkedOf(deleting)} {linkedOf(deleting) === 1 ? 'question' : 'questions'}. Those questions stay, but they will no longer list this {cfg.noun}.
                </p>
              ) : (
                <p>It isn’t linked to any questions.</p>
              )}
              <p>This can’t be undone.</p>
            </>
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            const { error: err } = await supabase.from(kind).delete().eq('specialty_id', deleting.specialty_id).eq('id', deleting.id);
            if (err) return friendlyError(err);
            afterChange(`Deleted “${deleting.name}”.`);
            return null;
          }}
        />
      )}
    </section>
  );
}

function EntityForm({
  kind,
  row,
  linked,
  existing,
  defaultSpecialty,
  onClose,
  onSaved,
}: {
  kind: Kind;
  row: Row | null;
  linked: number;
  existing: Row[];
  defaultSpecialty: SpecialtyId;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const cfg = CONFIG[kind];
  const isNew = !row;
  const [f, setF] = useState<FormState>(() => ({
    specialty_id: row?.specialty_id ?? defaultSpecialty,
    id: row?.id ?? '',
    name: row?.name ?? '',
    role: row?.role ?? '',
    note: row?.note ?? '',
    description: row?.description ?? '',
    sort: String(row?.sort ?? 0),
    access: row?.access ?? 'approved',
  }));
  const [idTouched, setIdTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  // suggest a web address from the name until the admin edits it themselves
  const onName = (v: string) => {
    setF((s) => ({ ...s, name: v, id: isNew && !idTouched ? slugify(v) : s.id }));
  };

  const validate = (v: FormState) => {
    const e: Partial<Record<keyof FormState, string>> = {};
    const name = v.name.trim();
    if (!name) e.name = 'Please enter a name.';
    else if (name.length > 120) e.name = 'Please keep the name under 120 characters.';
    // an empty web address is fine: one is made from the name (or generated) on save
    if (isNew && v.id && !ID_PATTERN.test(v.id)) e.id = 'Use only lowercase letters, numbers and dashes.';
    const moved = !isNew && v.specialty_id !== row.specialty_id;
    if ((isNew || moved) && existing.some((x) => x.specialty_id === v.specialty_id && x.id === (isNew ? v.id : row!.id))) {
      e.id = `There is already a ${cfg.noun} with this web address in ${specialtyTitle(v.specialty_id)}.`;
    }
    if (!/^-?\d+$/.test(v.sort.trim())) e.sort = 'Use a whole number (lower numbers come first).';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSaveError('');
    let next = f;
    // no web address yet: make one from the name, or generate one (names with no Latin letters, e.g. Arabic)
    if (isNew && !f.id && f.name.trim()) {
      next = { ...f, id: slugify(f.name) || `${cfg.fallbackId}-${randomTail()}` };
      setF(next);
    }
    const e = validate(next);
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload: Record<string, unknown> = {
      name: next.name.trim(),
      sort: parseInt(next.sort, 10),
      access: next.access,
    };
    if (kind === 'doctors') {
      payload.role = next.role.trim() || null;
      payload.note = next.note.trim() || null;
    } else {
      payload.description = next.description.trim() || null;
    }

    setBusy(true);
    const res = isNew
      ? await supabase.from(kind).insert({ ...payload, specialty_id: next.specialty_id, id: next.id })
      : await supabase
          .from(kind)
          .update({ ...payload, specialty_id: next.specialty_id })
          .eq('specialty_id', row.specialty_id)
          .eq('id', row.id);
    setBusy(false);
    if (res.error) {
      setSaveError(friendlyError(res.error));
      return;
    }
    onSaved(isNew ? `Added “${payload.name}”.` : `Saved “${payload.name}”.`);
  };

  return (
    <Dialog title={isNew ? `Add ${cfg.noun}` : `Edit ${cfg.noun}`} onClose={onClose}>
      <form className="admin-form" onSubmit={submit} noValidate>
        <TextField label="Name" value={f.name} onChange={onName} error={errors.name} required dir="auto" maxLength={120} />
        <div className="admin-form__row">
          <SelectField
            label="Specialty"
            value={f.specialty_id}
            onChange={(v) => set('specialty_id', v)}
            options={specialtyOptions()}
            disabled={!isNew && linked > 0}
            hint={!isNew && linked > 0 ? `Linked to ${linked} ${linked === 1 ? 'question' : 'questions'}, so it stays in this specialty.` : undefined}
          />
          <SelectField label="Who can see it" value={f.access} onChange={(v) => set('access', v)} options={ACCESS_OPTIONS} />
        </div>
        {cfg.extra.map((x) => (
          <TextField
            key={x.key}
            label={x.label}
            value={f[x.key as 'role' | 'note' | 'description']}
            onChange={(v) => set(x.key as 'role' | 'note' | 'description', v)}
            hint={x.hint}
            multiline={x.multiline}
            dir="auto"
          />
        ))}
        <div className="admin-form__row">
          <TextField
            label="Web address"
            value={f.id}
            onChange={(v) => {
              setIdTouched(true);
              set('id', v.toLowerCase());
            }}
            error={errors.id}
            disabled={!isNew}
            hint={isNew ? 'Used in page links. Leave empty to have one made for you. Can’t be changed later.' : 'Can’t be changed, so existing links keep working.'}
          />
          <TextField label="Order" value={f.sort} onChange={(v) => set('sort', v)} error={errors.sort} hint="Lower numbers are listed first." />
        </div>
        {saveError && (
          <p className="auth-message auth-message--error" role="alert">
            {saveError}
          </p>
        )}
        <div className="auth-actions">
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Saving…' : isNew ? `Add ${cfg.noun}` : 'Save changes'}
          </button>
          <button type="button" className="auth-btn auth-btn--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}

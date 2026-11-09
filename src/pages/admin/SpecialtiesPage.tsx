import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { allSpecialties } from '../../content';
import type { SpecialtyId } from '../../content/types';
import { supabase } from '../../lib/supabase';
import type { AdminOutletContext } from './AdminLayout';
import { ACCESS_OPTIONS, AccessStamp, Dialog, friendlyError, SelectField, TextField, useNotify } from './ui';

/*
  The four specialties. Each has its own artwork, colours and page in the website itself, so here
  they are edited, not added or removed: the description under the dashboard title and who can see it.
*/

interface SpecialtyRow {
  id: SpecialtyId;
  description: string;
  access: 'approved' | 'public';
}

interface Counts {
  doctors: number;
  topics: number;
  published: number;
  drafts: number;
}

export function SpecialtiesPage() {
  const notify = useNotify();
  const { refreshCounts } = useOutletContext<AdminOutletContext>();
  const [rows, setRows] = useState<SpecialtyRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SpecialtyRow | null>(null);

  const load = useCallback(async () => {
    setError('');
    const [s, d, t, q] = await Promise.all([
      supabase.from('specialties').select('id, description, access'),
      supabase.from('doctors').select('specialty_id'),
      supabase.from('topics').select('specialty_id'),
      supabase.from('questions').select('specialty_id, status'),
    ]);
    const failed = [s, d, t, q].find((r) => r.error);
    if (failed?.error) {
      setError(friendlyError(failed.error));
      return;
    }
    setRows(s.data as SpecialtyRow[]);
    const c: Record<string, Counts> = {};
    for (const sp of allSpecialties()) {
      c[sp.id] = {
        doctors: (d.data ?? []).filter((x) => x.specialty_id === sp.id).length,
        topics: (t.data ?? []).filter((x) => x.specialty_id === sp.id).length,
        published: (q.data ?? []).filter((x) => x.specialty_id === sp.id && x.status === 'published').length,
        drafts: (q.data ?? []).filter((x) => x.specialty_id === sp.id && x.status === 'draft').length,
      };
    }
    setCounts(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="view admin-view" aria-labelledby="sp-title">
      <header className="view__head">
        <div>
          <h1 id="sp-title" className="view__title">
            Specialties
          </h1>
          <p className="view__intro">The four volumes of the library. Edit each one’s description and who can see it.</p>
        </div>
      </header>

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
          Loading specialties…
        </p>
      )}

      {rows && (
        <div className="gtable">
          <table>
            <thead>
              <tr>
                <th scope="col">Specialty</th>
                <th scope="col">Description</th>
                <th scope="col">Examiners</th>
                <th scope="col">Topics</th>
                <th scope="col">Questions</th>
                <th scope="col">Visibility</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {allSpecialties().map((sp) => {
                const row = rows.find((r) => r.id === sp.id);
                const c = counts[sp.id];
                return (
                  <tr key={sp.id}>
                    <th scope="row">
                      <span className="admin-vol">{sp.volume}</span> {sp.title}
                    </th>
                    <td className="admin-desc-cell">{row?.description ? row.description : <span className="muted">No description yet; the card points are shown instead.</span>}</td>
                    <td className="admin-count">{c?.doctors ?? 0}</td>
                    <td className="admin-count">{c?.topics ?? 0}</td>
                    <td className="admin-count">
                      {c?.published ?? 0}
                      {c?.drafts ? <span className="admin-table-sub">+{c.drafts} drafts</span> : null}
                    </td>
                    <td>{row ? <AccessStamp access={row.access} /> : <span className="muted">Missing in database</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        {row && (
                          <button type="button" onClick={() => setEditing(row)} aria-label={`Edit ${sp.title}`}>
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="admin-table-note">
            Specialties can’t be added or removed here: each one has its own artwork, colours and page in the website. A specialty also can’t be deleted in the database while it still has examiners, topics or questions.
          </p>
        </div>
      )}

      {editing && (
        <SpecialtyForm
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            notify(msg);
            await load();
            refreshCounts();
          }}
        />
      )}
    </section>
  );
}

function SpecialtyForm({ row, onClose, onSaved }: { row: SpecialtyRow; onClose: () => void; onSaved: (msg: string) => void }) {
  const sp = allSpecialties().find((s) => s.id === row.id)!;
  const [description, setDescription] = useState(row.description ?? '');
  const [access, setAccess] = useState(row.access);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (description.length > 600) {
      setError('Please keep the description under 600 characters.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.from('specialties').update({ description: description.trim(), access }).eq('id', row.id);
    setBusy(false);
    if (err) setError(friendlyError(err));
    else onSaved(`Saved ${sp.title}.`);
  };

  return (
    <Dialog title={`Edit ${sp.title}`} onClose={onClose}>
      <form className="admin-form" onSubmit={submit} noValidate>
        <TextField
          label="Description"
          value={description}
          onChange={setDescription}
          multiline
          rows={4}
          hint="One or two sentences shown under the title on this specialty’s dashboard. Leave empty to show the card’s points instead."
          maxLength={600}
        />
        <SelectField
          label="Who can see the specialty’s description"
          value={access}
          onChange={setAccess}
          options={ACCESS_OPTIONS}
          hint="Its questions, examiners and topics each have their own visibility."
        />
        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-actions">
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="auth-btn auth-btn--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}

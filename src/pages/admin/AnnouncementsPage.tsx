import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { ACCESS_OPTIONS, AccessStamp, ConfirmDelete, Dialog, friendlyError, SelectField, TextField, useNotify } from './ui';

/*
  The notices on the homepage board. Write one, pin it to the top, hide it without deleting it,
  or delete it. The board shows the newest four published notices, pinned ones first, and
  students are notified when a notice is published. Only admins can change these (the database
  refuses anyone else).
*/

interface Notice {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  access: 'approved' | 'public';
  published: boolean;
  created_at: string;
}

type Draft = Pick<Notice, 'title' | 'body' | 'pinned' | 'access' | 'published'>;

const TITLE_MAX = 120;
const BODY_MAX = 400;
const ON_BOARD = 4;

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function AnnouncementsPage() {
  const notify = useNotify();
  const [rows, setRows] = useState<Notice[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Notice | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    const { data, error: err } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, access, published, created_at')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (err) setError(friendlyError(err));
    else setRows(data as Notice[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quick = async (n: Notice, change: Partial<Draft>, done: string) => {
    setBusy(n.id);
    const { error: err } = await supabase.from('announcements').update(change).eq('id', n.id);
    setBusy(null);
    if (err) notify(friendlyError(err));
    else {
      notify(done);
      await load();
    }
  };

  // which published notices the board shows right now: pinned first, then newest
  const shownOnBoard = new Set((rows ?? []).filter((r) => r.published).slice(0, ON_BOARD).map((r) => r.id));

  return (
    <section className="view admin-view" aria-labelledby="an-title">
      <header className="view__head">
        <div>
          <h1 id="an-title" className="view__title">
            Announcements
          </h1>
          <p className="view__intro">Notices on the homepage board. The board shows the newest {ON_BOARD} published ones, pinned notices first. Students are notified when one is published.</p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn-ink admin-linkbtn" onClick={() => setEditing('new')}>
            Write a notice
          </button>
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
          Loading announcements…
        </p>
      )}

      {rows && rows.length === 0 && (
        <div className="admin-empty">
          <p>No notices yet. Write one to put it on the homepage board.</p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="gtable">
          <table>
            <thead>
              <tr>
                <th scope="col">Notice</th>
                <th scope="col">Status</th>
                <th scope="col">Visibility</th>
                <th scope="col">Written</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <th scope="row" className="admin-notice-cell">
                    <span className="admin-notice-title">
                      {n.pinned && <span className="admin-pill admin-pill--pinned">Pinned</span>} <bdi>{n.title}</bdi>
                    </span>
                    {n.body && (
                      <span className="admin-table-sub">
                        <bdi>{n.body}</bdi>
                      </span>
                    )}
                  </th>
                  <td>
                    <span className={`admin-pill admin-pill--${n.published ? 'published' : 'draft'}`}>{n.published ? 'Published' : 'Hidden'}</span>
                    {n.published && !shownOnBoard.has(n.id) && <span className="admin-table-sub">Not on the board: {ON_BOARD} newer notices fill it</span>}
                  </td>
                  <td>
                    <AccessStamp access={n.access} />
                  </td>
                  <td className="admin-date">{when(n.created_at)}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => setEditing(n)} aria-label={`Edit ${n.title}`}>
                        Edit
                      </button>
                      <button type="button" disabled={busy === n.id} onClick={() => quick(n, { pinned: !n.pinned }, n.pinned ? 'Unpinned.' : 'Pinned to the top of the board.')}>
                        {n.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button type="button" disabled={busy === n.id} onClick={() => quick(n, { published: !n.published }, n.published ? 'Hidden from the board.' : 'Published on the board.')}>
                        {n.published ? 'Hide' : 'Publish'}
                      </button>
                      <button type="button" className="is-danger" onClick={() => setDeleting(n)} aria-label={`Delete ${n.title}`}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <NoticeForm
          notice={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            notify(msg);
            await load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          title="Delete this notice?"
          body={
            <p>
              “<bdi>{deleting.title}</bdi>” will be removed from the board and from this list. This can’t be undone. To take it down but keep it, choose Hide instead.
            </p>
          }
          onConfirm={async () => {
            const { error: err } = await supabase.from('announcements').delete().eq('id', deleting.id);
            if (err) return friendlyError(err);
            notify('Notice deleted.');
            await load();
            return null;
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  );
}

function NoticeForm({ notice, onClose, onSaved }: { notice: Notice | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [pinned, setPinned] = useState<'yes' | 'no'>(notice?.pinned ? 'yes' : 'no');
  const [access, setAccess] = useState<'approved' | 'public'>(notice?.access ?? 'public');
  const [published, setPublished] = useState<'yes' | 'no'>(notice ? (notice.published ? 'yes' : 'no') : 'yes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [titleError, setTitleError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setTitleError('Give the notice a title.');
      return;
    }
    setTitleError('');
    const row: Draft = { title: t, body: body.trim() || null, pinned: pinned === 'yes', access, published: published === 'yes' };
    setBusy(true);
    const { error: err } = notice ? await supabase.from('announcements').update(row).eq('id', notice.id) : await supabase.from('announcements').insert(row);
    setBusy(false);
    if (err) setError(friendlyError(err));
    else onSaved(notice ? 'Notice saved.' : row.published ? 'Notice published on the board.' : 'Notice saved as hidden.');
  };

  return (
    <Dialog title={notice ? 'Edit notice' : 'Write a notice'} onClose={onClose}>
      <form className="admin-form" onSubmit={submit} noValidate>
        <TextField label="Title" value={title} onChange={setTitle} required maxLength={TITLE_MAX} error={titleError} hint={`Up to ${TITLE_MAX} characters. ${title.length}/${TITLE_MAX}`} dir="auto" />
        <TextField label="Message" value={body} onChange={setBody} multiline rows={4} maxLength={BODY_MAX} hint={`Optional, up to ${BODY_MAX} characters. ${body.length}/${BODY_MAX}`} dir="auto" />
        <SelectField
          label="Show on the board"
          value={published}
          onChange={setPublished}
          options={[
            { value: 'yes', label: 'Yes, publish it' },
            { value: 'no', label: 'No, keep it hidden for now' },
          ]}
          hint="Students are notified when a notice is published."
        />
        <SelectField
          label="Position"
          value={pinned}
          onChange={setPinned}
          options={[
            { value: 'no', label: 'In date order' },
            { value: 'yes', label: 'Pinned to the top' },
          ]}
        />
        <SelectField label="Who can see it" value={access} onChange={setAccess} options={ACCESS_OPTIONS} />
        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}
        <div className="auth-actions">
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Saving…' : notice ? 'Save changes' : published === 'yes' ? 'Publish notice' : 'Save notice'}
          </button>
          <button type="button" className="auth-btn auth-btn--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}

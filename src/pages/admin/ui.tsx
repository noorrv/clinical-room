import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { allSpecialties } from '../../content';
import type { SpecialtyId } from '../../content/types';

/*
  Small parts shared by every admin page, built from the archive's own classes:
  a dialog, toast notices, sortable headings, a pager and form fields.
*/

/* ───────────────────────── notices (toasts) ───────────────────────── */

type Tone = 'ok' | 'error';
interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((text: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 8000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="admin-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <p key={t.id} className={`admin-toast admin-toast--${t.tone}`}>
            {t.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useNotify = () => useContext(ToastContext);

/** Turns a Supabase error into a sentence an administrator can act on. */
export function friendlyError(err: { message?: string; code?: string } | null | undefined): string {
  const m = err?.message ?? '';
  if (err?.code === '23505' || /duplicate key/i.test(m)) return 'Something with that web address already exists here. Choose a different one.';
  if (err?.code === '23503' || /foreign key/i.test(m)) return 'This is still linked to other content, so it can’t be changed that way.';
  if (err?.code === '42501' || /permission denied|row-level security/i.test(m)) return 'The database refused this: only an administrator can make this change.';
  if (err?.code === '23514' || /check constraint/i.test(m)) return 'One of the values isn’t allowed. Please check the form.';
  if (/failed to fetch|network/i.test(m)) return 'We couldn’t reach the database. Check your connection and try again.';
  return m || 'Something went wrong. Please try again.';
}

/* ───────────────────────── dialog ───────────────────────── */

export function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`admin-dialog admin-form-dialog${wide ? ' admin-form-dialog--wide' : ''}`} onClose={onClose} aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}

/** "Are you sure?" with what the action affects, and a red confirm button. */
export function ConfirmDelete({
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="auth-text admin-confirm-body">{body}</div>
      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}
      <div className="auth-actions">
        <button
          type="button"
          className="auth-btn admin-btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const err = await onConfirm();
            setBusy(false);
            if (err) setError(err);
            else onClose();
          }}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" className="auth-btn auth-btn--quiet" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}

/* ───────────────────────── form fields ───────────────────────── */

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  multiline,
  rows = 3,
  disabled,
  dir,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  dir?: 'auto';
  maxLength?: number;
}) {
  const id = useId();
  const described = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div className={`auth-field admin-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={described} disabled={disabled} dir={dir} maxLength={maxLength} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={described} disabled={disabled} dir={dir} maxLength={maxLength} />
      )}
      {hint && !error && (
        <p className="auth-field__hint" id={`${id}-h`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="auth-field__error" id={`${id}-e`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="auth-field admin-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled} aria-describedby={hint ? `${id}-h` : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="auth-field__hint" id={`${id}-h`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export const ACCESS_OPTIONS: Array<{ value: 'approved' | 'public'; label: string }> = [
  { value: 'approved', label: 'Approved students only' },
  { value: 'public', label: 'Everyone, including guests' },
];

export const specialtyOptions = (): Array<{ value: SpecialtyId; label: string }> => allSpecialties().map((s) => ({ value: s.id, label: s.title }));
export const specialtyTitle = (id: string) => allSpecialties().find((s) => s.id === id)?.title ?? id;

/** A web-address-safe id from a name; empty when the name has no Latin letters (e.g. Arabic). */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^dr\.?\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const ID_PATTERN = /^[a-z0-9-]+$/;

/* ───────────────────────── list tools ───────────────────────── */

export type SortDir = 'asc' | 'desc';

export function SortHeader<K extends string>({ label, k, sort, onSort }: { label: string; k: K; sort: { key: K; dir: SortDir }; onSort: (k: K) => void }) {
  const active = sort.key === k;
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="admin-sort" onClick={() => onSort(k)}>
        {label}
        <span aria-hidden className="admin-sort__arrow">
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '△'}
        </span>
      </button>
    </th>
  );
}

export function useSort<K extends string>(initial: K) {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir: 'asc' });
  const onSort = (k: K) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));
  return { sort, onSort };
}

export function compare(a: string | number, b: string | number, dir: SortDir): number {
  const r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? r : -r;
}

export const PAGE_SIZE = 25;

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <nav className="admin-pager" aria-label="Pages">
      <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button type="button" className="btn-ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </nav>
  );
}

export function AccessStamp({ access }: { access: 'approved' | 'public' }) {
  return <span className={`admin-pill admin-pill--${access}`}>{access === 'public' ? 'Open to guests' : 'Students only'}</span>;
}

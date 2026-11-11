import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { questionPath, TYPE_LABEL, type QuestionRef, type Specialty, topicName } from '../../content';
import type { Tally } from '../../study/derive';
import { record, STATUS_LABEL, STATUSES, study, type Status, useStudy } from '../../study/store';

/* Small shared pieces of the archive design: status stamps, ledger bars, question rows, empty states. */

export function StatusStamp({ status, small = false }: { status: Status; small?: boolean }) {
  return <span className={`stamp stamp--${status}${small ? ' stamp--small' : ''}`}>{STATUS_LABEL[status]}</span>;
}

/** Four-part bar: mastered, needs revision, in progress, not started. */
export function Ledger({ tally, label }: { tally: Tally; label: string }) {
  const order: Status[] = ['mastered', 'needs-revision', 'in-progress', 'not-started'];
  return (
    <div className="ledger" role="img" aria-label={`${label}: ${order.map((s) => `${tally.counts[s]} ${STATUS_LABEL[s].toLowerCase()}`).join(', ')}`}>
      {tally.total === 0 ? (
        <span className="ledger__empty" />
      ) : (
        order.map((s) =>
          tally.counts[s] ? <span key={s} className={`ledger__seg ledger__seg--${s}`} style={{ flexGrow: tally.counts[s] } as CSSProperties} /> : null,
        )
      )}
    </div>
  );
}

export function StatusLegend({ tally }: { tally: Tally }) {
  return (
    <ul className="legend">
      {(['mastered', 'needs-revision', 'in-progress', 'not-started'] as Status[]).map((s) => (
        <li key={s}>
          <span className={`legend__key ledger__seg--${s}`} aria-hidden />
          {STATUS_LABEL[s]} <strong>{tally.counts[s]}</strong>
        </li>
      ))}
    </ul>
  );
}

/** One question in any list: status, title, type, where it belongs, and whether it is bookmarked. */
export function QuestionRow({ q, sp, showSpecialty = false, extra }: { q: QuestionRef; sp: Specialty; showSpecialty?: boolean; extra?: ReactNode }) {
  const st = useStudy();
  const r = record(st, q.key);
  return (
    <li className="qrow">
      <Link className="qrow__link" to={questionPath(sp, q.id)}>
        <StatusStamp status={r.status} small />
        <span className="qrow__main">
          <span className="qrow__title">{q.title}</span>
          <span className="qrow__meta">
            {showSpecialty && <>{sp.shortName} · </>}
            {TYPE_LABEL[q.type]}
            {q.topicIds.length > 0 && <> · {q.topicIds.map((id) => topicName(sp, id)).join(', ')}</>}
          </span>
          {extra}
        </span>
        {r.bookmarked && (
          <span className="qrow__mark" aria-label="Bookmarked">
            <Ribbon />
          </span>
        )}
      </Link>
    </li>
  );
}

export function Ribbon({ filled = true }: { filled?: boolean }) {
  return (
    <svg width="16" height="22" viewBox="0 0 16 22" aria-hidden focusable="false">
      <path d="M2 1 H14 V21 L8 16 L2 21 Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <svg className="empty__mark" viewBox="0 0 80 56" aria-hidden focusable="false">
        <path d="M6 12 H34 L40 6 H74 V50 H6 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 18 H74" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M18 30 H62 M18 37 H54" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
      <p className="empty__title">{title}</p>
      {children && <div className="empty__body">{children}</div>}
    </div>
  );
}

/** Radio group of the four statuses, used on the question page. */
export function StatusPicker({ k }: { k: string }) {
  const st = useStudy();
  const current = record(st, k).status;
  return (
    <fieldset className="picker">
      <legend className="visually-hidden">Status</legend>
      {STATUSES.map((s) => (
        <label key={s} className={`picker__opt picker__opt--${s}${current === s ? ' is-on' : ''}`}>
          <input type="radio" name={`status-${k}`} value={s} checked={current === s} onChange={() => study.setStatus(k, s)} />
          {STATUS_LABEL[s]}
        </label>
      ))}
    </fieldset>
  );
}

export function PreviewBanner({ sp }: { sp: Specialty }) {
  if (!sp.isPreview) return null;
  return (
    <p className="preview-banner" role="note">
      Development preview: everything below is placeholder text, not real content. Add real questions in
      <code> src/content/{sp.id}.ts</code>, or open with <code>?preview=off</code>.
    </p>
  );
}

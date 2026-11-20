/*
  The small gold star on questions that come up again and again in the OSCE finals. A question
  carries it when its source is FINALS_SOURCE (set by the import, so no new column is needed).
  The star is drawn here, not borrowed, and it says what it means to screen readers and on hover.
*/

export const FINALS_SOURCE = 'Frequently asked in OSCE finals';

const LABEL = 'Frequently asked in OSCE finals';

export function isFinals(q: { source?: string | null }): boolean {
  return q.source === FINALS_SOURCE;
}

export function FinalsMark() {
  return (
    <span className="da-finals" title={LABEL}>
      <svg className="da-finals__star" viewBox="0 0 16 16" width="13" height="13" aria-hidden focusable="false">
        <path d="M8 1.2l1.95 4.1 4.5.55-3.3 3.1.85 4.45L8 11.25 3.99 13.4l.86-4.45-3.3-3.1 4.5-.55z" />
      </svg>
      <span className="da-finals__text" aria-hidden>Finals</span>
      <span className="visually-hidden">{LABEL}</span>
    </span>
  );
}

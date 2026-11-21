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

/*
  The "Short case" mark: questions from the clinical examination (short-case oral) collection, the kind an
  examiner asks at the bedside. Same shape as the Finals mark, in sage, with a small stethoscope.
*/

export const SHORT_CASE_SOURCE = 'Short-case oral question';

const SHORT_LABEL = 'Short-case oral question: asked at the bedside in clinical examination stations';

export function isShortCase(q: { source?: string | null }): boolean {
  return q.source === SHORT_CASE_SOURCE;
}

export function ShortCaseMark() {
  return (
    <span className="da-finals da-finals--short" title={SHORT_LABEL}>
      <svg className="da-finals__star" viewBox="0 0 16 16" width="13" height="13" aria-hidden focusable="false">
        <path d="M4 1.5v4a3 3 0 0 0 6 0v-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7 8.5v2.2a3.3 3.3 0 0 0 6.6 0V9.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="13.6" cy="7.6" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="da-finals__text" aria-hidden>Short case</span>
      <span className="visually-hidden">{SHORT_LABEL}</span>
    </span>
  );
}

/** Whichever source mark a question carries (Finals or Short case), or nothing. */
export function SourceMark({ q }: { q: { source?: string | null } }) {
  if (isFinals(q)) return <FinalsMark />;
  if (isShortCase(q)) return <ShortCaseMark />;
  return null;
}

import { useId, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { plain, relatedFor, stageKind, type SheetLink } from './pathway';
import './pathway.css';

/*
  A clinical pathway: a sequence of stages (a mechanism, a disease's progression, a cycle) shown
  as connected nodes the student can step through. Each stage keeps its original words; a stage
  that summarises one of the answer's own numbered steps opens that step in place, and stages
  can point to related questions elsewhere in the archive.

  Every stage is always listed in order, so the pathway still reads as the original sequence if
  nothing is ever pressed. Reusable anywhere: it only needs the stages and a way to render
  inline text.
*/

export interface PathwayExplanation {
  /** "Step 5" */
  label: string;
  body: ReactNode;
}

interface Props {
  title?: string;
  stages: string[];
  /** For each stage, its explanation, or null. */
  explanations?: Array<PathwayExplanation | null>;
  /** Other questions to link from the pathway (the current one left out). */
  links?: SheetLink[];
  renderInline: (text: string) => ReactNode;
}

/** A stage's words in bold; for a long stage only its lead-in before a colon. */
function StageLabel({ text, renderInline }: { text: string; renderInline: Props['renderInline'] }) {
  const head = text.match(/^([^:]{2,48}):\s+(.+)$/);
  if (head && plain(head[1]).split(/\s+/).length <= 6 && plain(text).split(/\s+/).length > 5)
    return (
      <>
        <strong>{renderInline(head[1])}:</strong> {renderInline(head[2])}
      </>
    );
  return <strong>{renderInline(text)}</strong>;
}

function Links({ label, items, whole }: { label: string; items: SheetLink[]; whole?: boolean }) {
  return (
    <div className={`pw__rel${whole ? ' pw__rel--whole' : ''}`}>
      <span className="pw__rel-label">{label}</span>
      <ul>
        {items.map((l) => (
          <li key={l.id}>
            <Link to={l.href}>{l.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClinicalPathway({ title, stages, explanations = [], links = [], renderInline }: Props) {
  const uid = useId();
  const [current, setCurrent] = useState(-1);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const related = useMemo(() => relatedFor(stages, links), [stages, links]);

  const hasMore = (i: number) => Boolean(explanations[i]) || related.perStage[i].length > 0;
  const expandable = stages.map((_, i) => i).filter(hasMore);
  const allOpen = expandable.length > 0 && expandable.every((i) => open.has(i));

  const toggle = (i: number) => {
    setCurrent(i);
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  // guided progression: move to a stage and show its explanation, closing the one before
  const go = (i: number) => {
    setCurrent(i);
    if (!allOpen) setOpen(new Set(hasMore(i) ? [i] : []));
    document.getElementById(`${uid}-s${i}`)?.focus({ preventScroll: true });
  };

  const name = title || 'Sequence';

  return (
    <figure className="pw" aria-label={`${name}: ${stages.length} stages`}>
      <figcaption className="pw__head">
        <span className="pw__title">{renderInline(name)}</span>
        <span className="pw__count" aria-live="polite">
          {current >= 0 ? `Stage ${current + 1} of ${stages.length}` : `${stages.length} stages`}
        </span>
        <span className="pw__controls">
          <button type="button" className="pw__btn" onClick={() => go(Math.max(0, current - 1))} disabled={current <= 0}>
            Previous
          </button>
          <button type="button" className="pw__btn" onClick={() => go(current + 1)} disabled={current >= stages.length - 1}>
            {current < 0 ? 'Start' : 'Next'}
          </button>
          {expandable.length > 0 && (
            <button type="button" className="pw__btn pw__btn--quiet" aria-pressed={allOpen} onClick={() => setOpen(allOpen ? new Set() : new Set(expandable))}>
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </span>
      </figcaption>

      <ol className="pw__list">
        {stages.map((s, i) => {
          const more = hasMore(i);
          const isOpen = more && open.has(i);
          const ex = explanations[i];
          const label = (
            <>
              <span className="pw__dot" aria-hidden>
                {i + 1}
              </span>
              <span className="pw__label">
                <StageLabel text={s} renderInline={renderInline} />
              </span>
              {more && <span className="pw__chev" aria-hidden />}
            </>
          );
          return (
            <li key={i} className={`pw__stage pw--${stageKind(s)}${current === i ? ' is-current' : ''}${isOpen ? ' is-open' : ''}`}>
              {more ? (
                <button
                  type="button"
                  id={`${uid}-s${i}`}
                  className="pw__node"
                  aria-expanded={isOpen}
                  aria-controls={`${uid}-m${i}`}
                  aria-current={current === i ? 'step' : undefined}
                  onClick={() => toggle(i)}
                >
                  {label}
                </button>
              ) : (
                <div id={`${uid}-s${i}`} className="pw__node pw__node--still" tabIndex={-1} aria-current={current === i ? 'step' : undefined}>
                  {label}
                </div>
              )}
              {more && (
                <div id={`${uid}-m${i}`} className="pw__more" hidden={!isOpen}>
                  {ex && (
                    <div className="pw__ex">
                      <span className="pw__from">{ex.label}</span> {ex.body}
                    </div>
                  )}
                  {related.perStage[i].length > 0 && <Links label="Related" items={related.perStage[i]} />}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {related.whole.length > 0 && <Links label="The same mechanism, explained" items={related.whole} whole />}
    </figure>
  );
}

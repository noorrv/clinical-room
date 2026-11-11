import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Band, LabHit } from './labs';
import './labs.css';

/*
  A lab term in a recorded answer ("hypokalaemia", "lactate") that opens a small card with its
  normal range drawn as a bar: low, normal and high zones, the side this term points to marked.
  The word itself is unchanged and reads normally if the card is never opened.
*/

const fmt = (n: number, dp = 0) => n.toFixed(dp).replace('-', '−');

function bandText(b: Band, unit: string, dp?: number) {
  if (b.from === null) return `below ${fmt(b.to!, dp)} ${unit}`;
  if (b.to === null) return `${fmt(b.from, dp)} ${unit} and above`;
  return `${fmt(b.from, dp)}–${fmt(b.to, dp)} ${unit}`;
}

function RangeBar({ hit }: { hit: LabHit }) {
  const { lab, dir } = hit;
  const [a, b] = lab.scale;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - a) / (b - a)) * 100))}%`;
  return (
    <div className={`lab-bar lab-bar--${dir}`} aria-hidden>
      <div className="lab-bar__track">
        <span className="lab-bar__zone lab-bar__zone--low" style={{ width: pct(lab.low) }} />
        <span
          className="lab-bar__zone lab-bar__zone--ok"
          style={{
            left: pct(lab.low),
            width: `calc(${pct(lab.high)} - ${pct(lab.low)})`,
          }}
        />
        <span className="lab-bar__zone lab-bar__zone--high" style={{ left: pct(lab.high), right: 0 }} />
      </div>
      <div className="lab-bar__ticks">
        <span style={{ left: pct(lab.low) }}>{fmt(lab.low, lab.dp)}</span>
        <span style={{ left: pct(lab.high) }}>{fmt(lab.high, lab.dp)}</span>
      </div>
      <div className="lab-bar__names">
        <span>Low</span>
        <span>Normal</span>
        <span>High</span>
      </div>
    </div>
  );
}

export function LabTerm({ hit, children }: { hit: LabHit; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    up: boolean;
  } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  const { lab, dir, meaning } = hit;

  // place the card under the word, kept inside the screen; above it when there is no room below
  const place = () => {
    if (!btn.current || !card.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = card.current.offsetWidth;
    const h = card.current.offsetHeight;
    const up = r.bottom + h + 12 > window.innerHeight && r.top > h + 12;
    const left = Math.max(10, Math.min(r.left, window.innerWidth - w - 10));
    setPos({ top: up ? r.top - h - 8 : r.bottom + 8, left, up });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'pointerdown' && (card.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setOpen(false);
      if (e.type === 'keydown') btn.current?.focus();
    };
    // the card follows its word while the page scrolls (once a frame), and closes when the word leaves the screen
    let frame = 0;
    const follow = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = btn.current?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
        else place();
      });
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
      window.removeEventListener('scroll', follow);
      window.removeEventListener('resize', follow);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`lab-term lab-term--${dir}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setPos(null);
          setOpen((o) => !o);
        }}
      >
        {children}
        <span className="visually-hidden"> (normal range)</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={card}
            id={id}
            role="dialog"
            aria-label={`${lab.name}: normal range`}
            className={`lab-card${pos?.up ? ' is-up' : ''}`}
            style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
          >
            <p className="lab-card__name">{lab.name}</p>
            {meaning && <p className="lab-card__meaning">{meaning}</p>}
            <RangeBar hit={hit} />
            <dl className="lab-card__rows">
              <div>
                <dt>Normal</dt>
                <dd>
                  {lab.low === 0 && lab.id === 'crp' ? `below ${fmt(lab.high, lab.dp)}` : `${fmt(lab.low, lab.dp)}–${fmt(lab.high, lab.dp)}`}{' '}
                  {lab.unit}
                  {lab.alt && <span className="lab-card__alt"> ({lab.alt})</span>}
                </dd>
              </div>
              {lab.sexes && (
                <div>
                  <dt>By sex</dt>
                  <dd>{lab.sexes}</dd>
                </div>
              )}
              {lab.bands?.map((b) => (
                <div key={b.label}>
                  <dt>{b.label}</dt>
                  <dd>{bandText(b, lab.unit, lab.dp)}</dd>
                </div>
              ))}
            </dl>
            {lab.note && <p className="lab-card__note">{lab.note}</p>}
            <p className="lab-card__foot">Typical adult values; check your laboratory’s own ranges.</p>
          </div>,
          document.body,
        )}
    </>
  );
}

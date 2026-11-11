import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useContinueStudying } from '../hooks/useContinueStudying';
import { useLoopsInView } from '../lib/motion';
import { Pause, Play } from './Icons';
import './ContinueCard.css';

/*
  "Continue studying": a navy damask card on textured paper. The student's last opened question
  (live, from their synced study record) with its topic progress and a button straight back to it.
  The clip sits on the card as a die-cut paper sticker beside a handwritten line that writes itself
  word by word; one control pauses both, and both rest under reduced motion.
*/

/** An original damask repeat, drawn once and used as the card's woven ground. */
const DAMASK = (() => {
  const half = `
    <path d="M0 -44 C15 -31 21 -9 0 22" />
    <path d="M0 -22 C8 -16 10 -5 3 3 C0 6 -2 3 0 0" />
    <path d="M5 21 C21 27 36 19 38 4 C40 -9 29 -15 23 -9 C18 -4 23 3 28 0" />
    <path d="M7 -30 C19 -45 32 -45 38 -37 C29 -37 19 -33 7 -30 Z" fill="currentColor" fill-opacity=".55" />
    <path d="M0 22 C2 33 7 41 15 47 C10 49 4 47 0 43" />
    <path d="M24 -18 C30 -22 36 -20 38 -15" />
    <circle cx="31" cy="31" r="2.4" fill="currentColor" />
    <circle cx="12" cy="-48" r="1.8" fill="currentColor" />`;
  const motif = `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${half}<g transform="scale(-1 1)">${half}</g></g>`;
  const at = (x: number, y: number) => `<g transform="translate(${x} ${y})">${motif}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="200" viewBox="0 0 140 200" color="#2b3b69">${at(70, 100)}${at(0, 0)}${at(140, 0)}${at(0, 200)}${at(140, 200)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

function ago(ms: number, now: number) {
  const m = Math.round((now - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'yesterday';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function ContinueStudyingCard() {
  const c = useContinueStudying();
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [paused, setPaused] = useState(reduce);
  const [now, setNow] = useState(() => Date.now());
  const video = useRef<HTMLVideoElement>(null);
  const card = useRef<HTMLElement>(null);
  // the clip stops decoding while the card is off-screen, and plays again when it comes back
  const [onScreen, setOnScreen] = useState(true);
  useLoopsInView(card, setOnScreen);

  // keep "12 min ago" honest
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused || !onScreen) v.pause();
    else v.play().catch(() => undefined);
  }, [paused, onScreen]);

  return (
    <section ref={card} className={`info ct${paused ? ' ct--paused' : ''}`} aria-labelledby="continue-title" style={{ '--ct-damask': DAMASK } as CSSProperties}>
      <div className="ct__head">
        <h2 id="continue-title" className="card-title ct__title">
          Continue Studying
        </h2>
        <button type="button" className="ct__pause" aria-pressed={paused} aria-label={paused ? 'Play the animation' : 'Pause the animation'} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>

      <div className="ct__inner">
      <div className="ct__stage">
        <figure className="ct-sticker" aria-hidden>
          <span className="ct-sticker__cut">
            <video ref={video} src="/media/what-like-its-hard.mp4" poster="/media/what-like-its-hard.jpg" muted loop playsInline autoPlay={!paused} preload="auto" />
          </span>
        </figure>
        <p className="ct-quote" aria-label="What, like it’s hard?">
          <span className="ct-quote__line" aria-hidden>
            <span className="ct-word ct-word--1">What,</span>
          </span>
          <span className="ct-quote__line" aria-hidden>
            <span className="ct-word ct-word--2">like</span> <span className="ct-word ct-word--3">it’s</span>
          </span>
          <span className="ct-quote__line" aria-hidden>
            <span className="ct-word ct-word--4">HARD?</span>
          </span>
          <svg className="ct-quote__swash" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden>
            <path d="M2 9 C26 3 48 12 70 7 C86 3.5 100 5 118 2" vectorEffect="non-scaling-stroke" pathLength={1} />
          </svg>
        </p>
      </div>

      {c.state === 'loading' && (
        <div className="ct__body" aria-busy="true">
          <p className="ct__kicker">Finding where you stopped…</p>
          <span className="ct__skeleton" />
        </div>
      )}

      {c.state === 'resume' && (
        <div className="ct__body">
          <p className="ct__kicker">Last opened · {ago(c.at, now)}</p>
          <h3 className="ct__q">
            <bdi>{c.title}</bdi>
          </h3>
          <p className="ct__meta">
            {[c.topic, c.specialty].filter(Boolean).map((part, i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <bdi>{part}</bdi>
              </span>
            ))}
          </p>
          {c.total > 0 && (
            <div className="ct__bar" role="progressbar" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.done} aria-label={`Reviewed in ${c.topic ?? 'this topic'}`}>
              <span style={{ width: `${(c.done / c.total) * 100}%` }} />
            </div>
          )}
          <div className="ct__foot">
            <span className="ct__count">
              {c.done} of {c.total} reviewed{c.topic ? ' in this topic' : ''}
            </span>
            <Link className="ct__resume" to={c.href}>
              Resume <Play size={14} />
            </Link>
          </div>
        </div>
      )}

      {c.state === 'start' && (
        <div className="ct__body">
          <p className="ct__kicker">Start here · newest in the library</p>
          <h3 className="ct__q">
            <bdi>{c.title}</bdi>
          </h3>
          <p className="ct__meta">
            <bdi>{c.detail}</bdi>
          </p>
          <div className="ct__foot">
            <span className="ct__count">Nothing opened yet</span>
            <Link className="ct__resume" to={c.href}>
              Open topic <Play size={14} />
            </Link>
          </div>
        </div>
      )}

      {c.state === 'empty' && (
        <div className="ct__body">
          <p className="ct__kicker">Nothing opened yet</p>
          <h3 className="ct__q">Pick a specialty to begin</h3>
          <div className="ct__foot">
            <span className="ct__count">Your place is kept as you study</span>
            <a className="ct__resume" href="#specialties">
              Choose <Play size={14} />
            </a>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

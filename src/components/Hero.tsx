import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { rng } from './art/shared';
import { ArrowRight, Pause, Play } from './Icons';
import './Hero.css';

/*
  The hero is the client's "Your OSCE Guide" illustration brought to life without redrawing it.

  The full image is the base. Each element is the same image cropped to that element's box and laid
  exactly over the original, so it can move on its own. Under every moving crop sits a patch of the
  artwork's own plain purple paper, so when a piece swings the original never shows through. Crops and
  patches fade out at their edges, so they melt into the paper around them. Hanging pieces turn about
  the top of their string.
*/

const IMG = '/hero/osce-guide.webp';
const W = 1774;
const H = 887;

type Box = [x: number, y: number, w: number, h: number];
type Motion = 'swing' | 'float' | 'rock' | 'wave' | 'settle' | 'parallax' | 'still';
type InnerMotion = 'beat' | 'spin' | 'flicker';

interface Inner {
  box: Box;
  motion: InnerMotion;
  /** flame glow centre, image px */
  glow?: [number, number];
}

interface Piece {
  id: string;
  label: string;
  box: Box;
  motion: Motion;
  /** suspension point, image px */
  pivot?: [number, number];
  amp?: number;
  dur?: number;
  delay?: number;
  inner?: Inner[];
  /** touches the top edge: don't fade the string away */
  top?: boolean;
}

const PIECES: Piece[] = [
  { id: 'moon', label: 'moon', box: [28, 0, 170, 248], motion: 'swing', pivot: [118, 0], amp: 2.2, dur: 7.8, top: true },
  {
    id: 'candle-l', label: 'candle', box: [258, 30, 182, 366], motion: 'swing', pivot: [352, 30], amp: 0.8, dur: 9.2, delay: -2,
    inner: [{ box: [337, 34, 40, 58], motion: 'flicker', glow: [357, 62] }],
  },
  {
    id: 'star', label: 'star', box: [546, 0, 124, 220], motion: 'swing', pivot: [607, 0], amp: 2.4, dur: 8.4, delay: -3, top: true,
    inner: [{ box: [550, 102, 116, 116], motion: 'spin' }],
  },
  {
    id: 'heart', label: 'heart', box: [784, 0, 198, 404], motion: 'swing', pivot: [876, 0], amp: 1.2, dur: 8.8, delay: -1, top: true,
    inner: [{ box: [792, 210, 180, 192], motion: 'beat' }],
  },
  { id: 'house-t', label: 'house', box: [1046, 0, 130, 230], motion: 'swing', pivot: [1110, 0], amp: 3, dur: 6.4, delay: -4, top: true },
  { id: 'bird', label: 'bird', box: [1284, 0, 168, 242], motion: 'float', pivot: [1365, 0], amp: 2, dur: 7.2, delay: -2.5, top: true },
  { id: 'pudding-t', label: 'pudding', box: [1486, 0, 280, 272], motion: 'swing', pivot: [1640, 0], amp: 1.2, dur: 9.6, delay: -5, top: true },
  { id: 'nut-l', label: 'nutcracker', box: [6, 310, 132, 362], motion: 'parallax' },
  { id: 'steth', label: 'stethoscope', box: [278, 278, 304, 314], motion: 'float', pivot: [430, 300], amp: 1.2, dur: 9.4, delay: -1.5 },
  { id: 'forceps', label: 'forceps', box: [1168, 278, 344, 340], motion: 'float', pivot: [1330, 270], amp: 2.4, dur: 8.2, delay: -3.5 },
  { id: 'nut-r', label: 'nutcracker', box: [1634, 310, 136, 362], motion: 'parallax' },
  { id: 'horse', label: 'rocking horse', box: [210, 516, 156, 210], motion: 'rock', pivot: [286, 516], amp: 3, dur: 5.8, delay: -2 },
  { id: 'mushroom', label: 'toadstool', box: [80, 616, 140, 218], motion: 'swing', pivot: [150, 616], amp: 3.2, dur: 6.8, delay: -1 },
  { id: 'bow', label: 'green bow', box: [352, 692, 292, 176], motion: 'wave', pivot: [498, 700], amp: 1.4, dur: 7.4, delay: -2 },
  { id: 'pudding-b', label: 'pudding', box: [720, 602, 316, 250], motion: 'settle', pivot: [878, 846], amp: 0.6, dur: 10.4, delay: -4 },
  {
    id: 'candle-b', label: 'candle', box: [1052, 556, 186, 331], motion: 'swing', pivot: [1150, 556], amp: 0.8, dur: 9.8, delay: -6,
    inner: [{ box: [1130, 560, 40, 58], motion: 'flicker', glow: [1150, 590] }],
  },
  { id: 'house-b', label: 'house', box: [1386, 596, 144, 210], motion: 'swing', pivot: [1455, 596], amp: 3, dur: 6.1, delay: -3 },
];

const TITLE: Box = [526, 398, 694, 98];

// sparkles near ornaments, image px
const SPARKLES: Array<[number, number, number]> = [
  [612, 150, 0], [1176, 120, 2.6], [176, 128, 5.1], [920, 300, 7.3], [1560, 168, 3.9], [470, 640, 6.2], [1460, 690, 1.4],
];

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

const DUST = (() => {
  const r = rng(29);
  return Array.from({ length: 16 }, () => ({
    x: `${(2 + r() * 94).toFixed(1)}%`,
    y: `${(6 + r() * 86).toFixed(1)}%`,
    dur: `${(16 + r() * 14).toFixed(1)}s`,
    delay: `${(-r() * 30).toFixed(1)}s`,
  }));
})();

/** Crop of the artwork for a box, as CSS background. */
function crop([x, y, w, h]: Box): CSSProperties {
  return {
    backgroundImage: `url(${IMG})`,
    backgroundSize: `${(W / w) * 100}% ${(H / h) * 100}%`,
    backgroundPosition: `${(x / (W - w)) * 100}% ${(y / (H - h)) * 100}%`,
  };
}

/** Position a box inside a parent box (or the whole stage). */
function place([x, y, w, h]: Box, parent: Box = [0, 0, W, H]): CSSProperties {
  const [px, py, pw, ph] = parent;
  return { left: pct(x - px, pw), top: pct(y - py, ph), width: pct(w, pw), height: pct(h, ph) };
}

function origin(box: Box, p?: [number, number]): string {
  const [x, y, w, h] = box;
  const [ox, oy] = p ?? [x + w / 2, y + h / 2];
  return `${pct(ox - x, w)} ${pct(oy - y, h)}`;
}

function PieceView({ piece }: { piece: Piece }) {
  const style: CSSProperties = {
    ...place(piece.box),
    ['--amp' as string]: `${piece.amp ?? 1}deg`,
    ['--dur' as string]: `${piece.dur ?? 8}s`,
    ['--delay' as string]: `${piece.delay ?? 0}s`,
    ['--origin' as string]: origin(piece.box, piece.pivot),
  };
  return (
    <div className={`hp hp--${piece.motion}${piece.top ? ' hp--top' : ''}`} style={style} data-piece={piece.id}>
      <div className="hp__patch" />
      <div className="hp__nudge">
        <div className="hp__move">
          <div className="hp__art" style={crop(piece.box)} />
          {piece.inner?.map((inner, i) => (
            <div key={i} className={`hp-in hp-in--${inner.motion}`} style={place(inner.box, piece.box)}>
              {inner.motion !== 'flicker' && <div className="hp__patch" />}
              <div className="hp-in__art" style={crop(inner.box)} />
              {inner.glow && (
                <span
                  className="hp-glow"
                  style={{
                    left: pct(inner.glow[0] - inner.box[0], inner.box[2]),
                    top: pct(inner.glow[1] - inner.box[1], inner.box[3]),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Hover: an ornament answers the pointer once; the stage leans a touch for the nutcrackers' parallax.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    const nudge = (e: PointerEvent) => {
      if (reduce.matches) return;
      const piece = (e.target as HTMLElement).closest<HTMLElement>('[data-piece]');
      if (!piece || piece.classList.contains('is-nudged')) return;
      piece.classList.add('is-nudged');
      window.setTimeout(() => piece.classList.remove('is-nudged'), 1600);
    };

    let raf = 0;
    const lean = (e: PointerEvent) => {
      if (reduce.matches || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--lx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        el.style.setProperty('--ly', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    const reset = () => {
      el.style.setProperty('--lx', '0');
      el.style.setProperty('--ly', '0');
    };

    el.addEventListener('pointerover', nudge);
    el.addEventListener('pointermove', lean);
    el.addEventListener('pointerleave', reset);
    return () => {
      el.removeEventListener('pointerover', nudge);
      el.removeEventListener('pointermove', lean);
      el.removeEventListener('pointerleave', reset);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className={`hero${paused ? ' is-paused' : ''}`} aria-labelledby="hero-title">
      <div className="hero__frame">
        <div className="hero__stage" ref={stage}>
          <div
            className="hero__base"
            role="img"
            aria-label="Your OSCE Guide: a stethoscope, an anatomical heart and surgical forceps among hanging Christmas ornaments, candles, puddings and two nutcrackers on purple paper"
          />
          <div className="hero__layers" aria-hidden>

          {PIECES.map((p) => (
            <PieceView key={p.id} piece={p} />
          ))}

          {/* golden dust drifting across the paper */}
          <div className="hero__dust">
            {DUST.map((d, i) => (
              <span key={i} style={{ left: d.x, top: d.y, animationDuration: d.dur, animationDelay: d.delay }} />
            ))}
          </div>

          {/* rare sparkles beside the ornaments */}
          {SPARKLES.map(([x, y, d], i) => (
            <span key={i} className="hero__sparkle" style={{ left: pct(x, W), top: pct(y, H), animationDelay: `${d}s` }} />
          ))}

          {/* the title: shimmer and glow on hover, then the season's greeting */}
          <div
              className="hero__title-zone"
              style={place(TITLE)}
              onPointerUp={(e) => {
                // touch has no hover: a tap reveals the greeting, a second tap brings the title back
                if (e.pointerType !== 'mouse') e.currentTarget.classList.toggle('is-revealed');
              }}
            >
            <div className="hp__patch" />
            <div className="hero__title-art" style={crop(TITLE)} />
            <div className="hero__title-glow" style={crop(TITLE)} />
            <div className="hero__title-shine" style={crop(TITLE)} />
            <span className="hero__greeting">
              Merry Christmas, Doctors
            </span>
          </div>

          </div>

          <a className="btn-primary hero__cta" href="#specialties">
            Explore Specialties
            <ArrowRight size={20} />
          </a>

          <button
            type="button"
            className="hero__pause"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? 'Play the illustration’s animation' : 'Pause the illustration’s animation'}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>

      <div className="visually-hidden">
        <h1 id="hero-title">Your OSCE Guide</h1>
        <p>
          Master your OSCE, one station at a time: a complete, illustrated guide for clinical exams — stations, cases,
          examiner questions, and a study tracker to keep you on track.
        </p>
      </div>
    </section>
  );
}

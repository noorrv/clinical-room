import { memo } from 'react';
import type { DayState } from '../../study/streak';
import { useArtIds } from './shared';

/*
  A hand-coloured botanical lily, as in an old seed catalogue plate. It grows with the day's study:
  stage 0 is a sprout, 1–2 a leafy stem, 3 a bud, 4 a swelling blush bud, 5 the open flower.
  "wilted" is the same plant drooping and browned, for a missed day.
*/

const INK = '#3b2a1c';
const LEAF = '#5f7d47';
const LEAF_DARK = '#3f5a2e';

type Stage = 0 | 1 | 2 | 3 | 4 | 5;

const HEIGHT: Record<Stage, number> = { 0: 14, 1: 58, 2: 92, 3: 120, 4: 128, 5: 132 };
const LEAVES: Record<Stage, number> = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 6, 5: 6 };

function Leaf({ x, y, side, len, wilt = false }: { x: number; y: number; side: 1 | -1; len: number; wilt?: boolean }) {
  const droop = wilt ? 14 : 0;
  const d = `M0 0 C${len * 0.25} ${-len * 0.12 + droop * 0.4} ${len * 0.62} ${-len * 0.2 + droop} ${len} ${-len * 0.42 + droop * 1.6} C${len * 0.6} ${-len * 0.02 + droop} ${len * 0.3} ${len * 0.1 + droop * 0.3} 0 0 Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${side} 1)`}>
      <path d={d} fill={wilt ? '#9a8452' : LEAF} stroke={INK} strokeWidth="0.7" />
      <path d={`M1 0 C${len * 0.4} ${-len * 0.1 + droop * 0.5} ${len * 0.7} ${-len * 0.22 + droop} ${len * 0.95} ${-len * 0.4 + droop * 1.5}`} fill="none" stroke={wilt ? '#6e5a34' : LEAF_DARK} strokeWidth="0.6" />
      {[0.3, 0.5, 0.7].map((t) => (
        <path key={t} d={`M${len * t} ${-len * 0.16 * t * 2 + droop * t} l${len * 0.06} ${len * 0.07}`} fill="none" stroke={wilt ? '#6e5a34' : LEAF_DARK} strokeWidth="0.4" opacity="0.8" />
      ))}
    </g>
  );
}

function Bloom({ x, y, gid }: { x: number; y: number; gid: string }) {
  const angles = [-150, -100, -55, -10, 35, 80];
  return (
    <g transform={`translate(${x} ${y})`}>
      {angles.map((a, i) => (
        <g key={a} transform={`rotate(${a + 90})`}>
          <path d="M0 0 C-7 -7 -8.5 -22 -2 -33 Q2 -37 5 -31 C8 -22 6 -8 0 0 Z" fill={`url(#${gid})`} stroke={INK} strokeWidth="0.7" />
          <path d="M0 -2 C1 -12 1 -22 1.5 -31" fill="none" stroke="#b9485f" strokeWidth="0.6" opacity="0.7" />
          {/* engraved shading and the lily's freckles */}
          <path d={i % 2 ? 'M-4 -10 l2 -3 M-4.5 -15 l2 -3 M-4 -20 l2 -3' : 'M3 -10 l-1.5 -3 M3.5 -15 l-1.5 -3 M3 -20 l-1.5 -3'} stroke={INK} strokeWidth="0.35" opacity="0.5" />
          <circle cx="-1.5" cy="-9" r="0.8" fill="#7d2033" />
          <circle cx="1.8" cy="-12" r="0.7" fill="#7d2033" />
          <circle cx="0" cy="-15.5" r="0.6" fill="#7d2033" />
        </g>
      ))}
      {/* stamens */}
      {[-40, -15, 10, 35, 60].map((a) => (
        <g key={a} transform={`rotate(${a - 10})`}>
          <path d="M0 0 C1 -6 0 -12 0 -17" fill="none" stroke="#7f8a4a" strokeWidth="0.6" />
          <ellipse cx="0" cy="-18" rx="1.1" ry="2.2" fill="#a4532a" stroke={INK} strokeWidth="0.3" />
        </g>
      ))}
      <circle r="2.2" fill="#6e8a45" stroke={INK} strokeWidth="0.4" />
    </g>
  );
}

function Bud({ x, y, open, gid }: { x: number; y: number; open: boolean; gid: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-8)`}>
      <path
        d={open ? 'M0 0 C-7 -6 -7 -22 0 -32 C7 -22 7 -6 0 0 Z' : 'M0 0 C-5 -5 -5 -18 0 -26 C5 -18 5 -5 0 0 Z'}
        fill={open ? `url(#${gid})` : '#87a05f'}
        stroke={INK}
        strokeWidth="0.7"
      />
      <path d={open ? 'M0 -1 C-2 -12 -1 -24 0 -31 M0 -1 C3 -12 3 -22 1 -30' : 'M0 -1 C-1 -10 -1 -18 0 -25'} fill="none" stroke={INK} strokeWidth="0.45" opacity="0.6" />
    </g>
  );
}

export const LilyPlant = memo(function LilyPlant({ stage, wilted = false }: { stage: Stage; wilted?: boolean }) {
  const id = useArtIds('lily');
  const s: Stage = wilted ? 5 : stage;
  const h = HEIGHT[s];
  const base = 196;
  const top = base - h;
  // a wilted stem arches over; a living one stands with a gentle S
  const stem = wilted
    ? `M60 ${base} C57 ${base - 60} 64 ${top + 4} 86 ${top + 34}`
    : `M60 ${base} C57 ${base - h * 0.35} 64 ${base - h * 0.7} 60 ${top}`;
  const leaves = Array.from({ length: LEAVES[s] }, (_, i) => ({
    y: base - 14 - i * (h - 34) / Math.max(1, LEAVES[s]),
    side: (i % 2 ? -1 : 1) as 1 | -1,
    len: 30 - i * 2.2,
  }));

  return (
    <svg viewBox="0 0 120 200" className="lily-svg" aria-hidden>
      <defs>
        <radialGradient id={id('petal')} cx="0" cy="0" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={wilted ? '#8e6a48' : '#c94a65'} />
          <stop offset="0.45" stopColor={wilted ? '#b38f64' : '#ea93a3'} />
          <stop offset="1" stopColor={wilted ? '#d2b98c' : '#fdf1ea'} />
        </radialGradient>
        <radialGradient id={id('bud')} cx="0" cy="-14" r="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2b7c0" />
          <stop offset="1" stopColor="#9db071" />
        </radialGradient>
      </defs>

      {/* a little mound of soil with engraved hatching */}
      <path d="M22 196 Q60 178 98 196 Z" fill="#8a6a45" stroke={INK} strokeWidth="0.7" />
      {[34, 44, 54, 64, 74, 84].map((x) => (
        <path key={x} d={`M${x} 195 l4 -6`} stroke={INK} strokeWidth="0.4" opacity="0.5" />
      ))}

      {s === 0 ? (
        <g>
          <path d="M60 190 C60 186 60 184 60 182" stroke={LEAF_DARK} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M60 184 C55 180 51 181 49 184 C53 186 57 186 60 184 Z" fill={LEAF} stroke={INK} strokeWidth="0.6" />
          <path d="M60 183 C65 178 70 179 72 182 C67 185 63 185 60 183 Z" fill={LEAF} stroke={INK} strokeWidth="0.6" />
        </g>
      ) : (
        <>
          <path d={stem} fill="none" stroke={wilted ? '#7b6638' : LEAF_DARK} strokeWidth="2.6" strokeLinecap="round" />
          <path d={stem} fill="none" stroke={wilted ? '#a58b55' : '#7f9b5b'} strokeWidth="1" strokeLinecap="round" />
          {leaves.map((l, i) => (
            <Leaf key={i} x={wilted ? 60 + (i * 2) : 60} y={l.y} side={l.side} len={l.len} wilt={wilted} />
          ))}
          {s === 3 && <Bud x={60} y={top + 2} open={false} gid={id('bud')} />}
          {s === 4 && <Bud x={60} y={top + 2} open gid={id('bud')} />}
          {s === 5 &&
            (wilted ? (
              // the spent flower hangs its head below the bend in the stem
              <g transform={`translate(88 ${top + 46}) rotate(18) scale(0.78 0.5)`}>
                <Bloom x={0} y={0} gid={id('petal')} />
              </g>
            ) : (
              <Bloom x={60} y={top - 6} gid={id('petal')} />
            ))}
        </>
      )}
    </svg>
  );
});

/** A tiny lily for one day of the week row. */
export function MiniLily({ state }: { state: DayState }) {
  return (
    <svg viewBox="0 0 24 34" className={`mini-lily mini-lily--${state}`} aria-hidden>
      <path d="M5 33 Q12 29 19 33 Z" fill={state === 'future' || state === 'before' ? 'none' : '#8a6a45'} stroke={INK} strokeWidth="0.6" opacity={state === 'future' || state === 'before' ? 0.35 : 1} />
      {state === 'met' && (
        <>
          <path d="M12 32 C11 24 13 18 12 12" stroke={LEAF_DARK} strokeWidth="1.3" fill="none" />
          <path d="M12 24 C15 22 18 22 19 20 C16 21 14 22 12 24 Z" fill={LEAF} stroke={INK} strokeWidth="0.4" />
          {[-60, -20, 20, 60, 100, -100].map((a) => (
            <path key={a} d="M0 0 C-2 -2 -2.5 -6 0 -9 C2.5 -6 2 -2 0 0 Z" transform={`translate(12 11) rotate(${a})`} fill="#ec9aaa" stroke={INK} strokeWidth="0.4" />
          ))}
          <circle cx="12" cy="11" r="1.2" fill="#a4532a" />
        </>
      )}
      {(state === 'missed' || state === 'forgiven') && (
        <>
          <path d="M12 32 C11 25 13 20 17 18" stroke={state === 'missed' ? '#7b6638' : '#8a8a5a'} strokeWidth="1.3" fill="none" />
          {[130, 160, 190].map((a) => (
            <path key={a} d="M0 0 C-2 -2 -2.5 -6 0 -9 C2.5 -6 2 -2 0 0 Z" transform={`translate(17 18) rotate(${a})`} fill={state === 'missed' ? '#a58456' : '#d8cfae'} stroke={INK} strokeWidth="0.4" />
          ))}
        </>
      )}
      {state === 'today' && (
        <>
          <path d="M12 32 C11 26 13 22 12 17" stroke={LEAF_DARK} strokeWidth="1.3" fill="none" />
          <path d="M12 17 C10 15 10 11 12 8 C14 11 14 15 12 17 Z" fill="#87a05f" stroke={INK} strokeWidth="0.4" />
        </>
      )}
      {state === 'future' && <path d="M12 31 L12 28" stroke={INK} strokeWidth="0.6" opacity="0.35" />}
    </svg>
  );
}

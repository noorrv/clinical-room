import { memo } from 'react';
import { PaintFilter, Snow, firPath, lancet, rng, useArtIds } from './shared';

const W = 1600;
const H = 720;
const FLOOR = 472;

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
}

const windows: Win[] = [
  { x: 610, y: 210, w: 44, h: 150 },
  { x: 700, y: 172, w: 62, h: 200 },
  { x: 838, y: 118, w: 92, h: 262 },
  { x: 1000, y: 52, w: 176, h: 338 },
  { x: 1248, y: 104, w: 104, h: 282 },
  { x: 1420, y: 150, w: 70, h: 230 },
];

const trees = [
  { x: 772, h: 165, w: 110 },
  { x: 900, h: 238, w: 150 },
  { x: 1088, h: 344, w: 222 },
  { x: 1300, h: 270, w: 168 },
  { x: 1446, h: 300, w: 176 },
];

function Candle({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  const w = 6.5 * s;
  const h = 24 * s;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <circle className="hall-glow" style={{ animationDelay: `${delay.toFixed(2)}s` }} cx="0" cy={-4 * s} r={30 * s} fill="url(#hallCandleGlow)" />
      <rect x={-w / 2} y="0" width={w} height={h} rx={w * 0.3} fill="url(#hallWax)" />
      <path d={`M${-w / 2} ${2 * s} q${w * 0.2} ${5 * s} ${w * 0.35} 0 q${w * 0.25} ${7 * s} ${w * 0.45} 0`} stroke="#fff6dc" strokeWidth={1.1 * s} fill="none" opacity="0.8" />
      <path d={`M0 ${-11 * s} C${3.4 * s} ${-6 * s} ${2.6 * s} ${-1 * s} 0 ${-0.4 * s} C${-2.6 * s} ${-1 * s} ${-3.4 * s} ${-6 * s} 0 ${-11 * s} Z`} fill="#ffcf62" />
      <ellipse cx="0" cy={-3.4 * s} rx={1.1 * s} ry={2.4 * s} fill="#fffbe8" />
    </g>
  );
}

export const HeroHall = memo(function HeroHall() {
  const id = useArtIds('hall');
  const r = rng(7);

  // Floating candles: denser and smaller toward the far wall
  const candles = Array.from({ length: 74 }, () => {
    const x = r() * W;
    const y = 20 + r() * 400;
    const far = x > 640 && y > 120 ? 0.55 : 1;
    return { x, y, s: (0.55 + r() * 0.75) * far, delay: r() * 4 };
  });

  // Tree lights
  const lights = trees.flatMap((t, ti) => {
    const lr = rng(40 + ti);
    return Array.from({ length: Math.round(t.h / 9) }, () => {
      const v = lr();
      const yy = FLOOR - t.h * 0.92 + v * t.h * 0.86;
      const spread = (t.w / 2) * (0.15 + v * 0.8);
      return { x: t.x + (lr() * 2 - 1) * spread, y: yy, r: 1.4 + lr() * 2.1 };
    });
  });

  // Table plates & table candles
  const nearTable = (t: number) => ({ x: -40 + (900 - -40) * t, y: 618 - (618 - 466) * t, s: 1 - t * 0.78 });
  const rightTable = (t: number) => ({ x: 1640 - (1640 - 1130) * t, y: 650 - (650 - 474) * t, s: 1 - t * 0.75 });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="An empty candlelit Gothic study hall with tall arched windows, decorated fir trees and long wooden tables" className="art-svg">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a170a" />
          <stop offset="0.35" stopColor="#8a4214" />
          <stop offset="0.62" stopColor="#d4842e" />
          <stop offset="0.66" stopColor="#8a4616" />
          <stop offset="1" stopColor="#3a1a0a" />
        </linearGradient>
        <radialGradient id={id('bloom')} cx="0.66" cy="0.32" r="0.55">
          <stop offset="0" stopColor="#ffe1a0" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#f0a24a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f0a24a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e3010" />
          <stop offset="0.6" stopColor="#c47028" />
          <stop offset="1" stopColor="#8e4818" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.5" stopColor="#ffe9b4" />
          <stop offset="1" stopColor="#f2b75e" />
        </linearGradient>
        <linearGradient id={id('ray')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2c8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('fir')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d6a3a" />
          <stop offset="1" stopColor="#1c3a22" />
        </linearGradient>
        <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8581e" />
          <stop offset="0.5" stopColor="#6a3212" />
          <stop offset="1" stopColor="#2c1408" />
        </linearGradient>
        <linearGradient id={id('tableTop')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6e3410" />
          <stop offset="1" stopColor="#c87632" />
        </linearGradient>
        <linearGradient id={id('scrim')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b0c06" stopOpacity="0.92" />
          <stop offset="0.3" stopColor="#1b0c06" stopOpacity="0.62" />
          <stop offset="0.52" stopColor="#1b0c06" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('base')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.7" stopColor="#1b0c06" stopOpacity="0" />
          <stop offset="1" stopColor="#1b0c06" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="hallCandleGlow">
          <stop offset="0" stopColor="#ffdc7e" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffb447" stopOpacity="0.38" />
          <stop offset="1" stopColor="#ffb447" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hallWax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff3d2" />
          <stop offset="0.6" stopColor="#f3d79a" />
          <stop offset="1" stopColor="#c9964a" />
        </linearGradient>
        <filter id={id('blur')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <PaintFilter id={id('paint')} scale={4} freq={0.022} />
      </defs>

      {/* Atmosphere */}
      <rect width={W} height={H} fill={`url(#${id('sky')})`} />

      <g filter={`url(#${id('paint')})`}>
        {/* Back wall */}
        <path d={`M560 ${FLOOR} L560 120 Q900 30 1600 20 L1600 ${FLOOR} Z`} fill={`url(#${id('wall')})`} />
        {/* Vault ribs */}
        <g stroke="#3e1d0b" strokeWidth="9" fill="none" opacity="0.75">
          <path d="M560 140 Q760 -20 980 40" />
          <path d="M790 120 Q980 -40 1210 30" />
          <path d="M1210 40 Q1400 -30 1600 30" />
          <path d="M980 40 Q1090 -60 1210 40" />
        </g>
        <g stroke="#e7a75a" strokeWidth="2" fill="none" opacity="0.35">
          <path d="M565 138 Q760 -16 980 44" />
          <path d="M1214 44 Q1400 -24 1600 34" />
        </g>

        {/* Windows */}
        {windows.map((wn, i) => (
          <g key={i}>
            <path d={lancet(wn.x - 8, wn.y - 8, wn.w + 16, wn.h + 14)} fill="#4a220c" />
            <path d={lancet(wn.x, wn.y, wn.w, wn.h)} fill={`url(#${id('glass')})`} />
            <g stroke="#7a4219" strokeWidth={Math.max(2, wn.w / 26)} opacity="0.85">
              <line x1={wn.x + wn.w / 2} y1={wn.y + wn.w * 0.35} x2={wn.x + wn.w / 2} y2={wn.y + wn.h} />
              {wn.w > 80 && <line x1={wn.x + wn.w / 4} y1={wn.y + wn.w * 0.6} x2={wn.x + wn.w / 4} y2={wn.y + wn.h} />}
              {wn.w > 80 && <line x1={wn.x + (wn.w * 3) / 4} y1={wn.y + wn.w * 0.6} x2={wn.x + (wn.w * 3) / 4} y2={wn.y + wn.h} />}
              {Array.from({ length: Math.floor(wn.h / 46) }, (_, k) => (
                <line key={k} x1={wn.x} x2={wn.x + wn.w} y1={wn.y + wn.w * 0.7 + k * 46} y2={wn.y + wn.w * 0.7 + k * 46} />
              ))}
            </g>
            <circle cx={wn.x + wn.w / 2} cy={wn.y + wn.w * 0.42} r={wn.w * 0.16} fill="none" stroke="#7a4219" strokeWidth={Math.max(1.5, wn.w / 36)} />
          </g>
        ))}

        {/* Columns */}
        {[580, 676, 790, 960, 1210, 1392, 1530].map((cx, i) => (
          <g key={i}>
            <rect x={cx - 16} y={60 + i * 4} width="32" height={FLOOR - 60} fill="#4d240e" />
            <rect x={cx - 16} y={60 + i * 4} width="7" height={FLOOR - 60} fill="#c27a3a" opacity="0.45" />
            <rect x={cx - 22} y={FLOOR - 26} width="44" height="26" fill="#3a1a09" />
          </g>
        ))}

        {/* Portraits */}
        {[
          [728, 382, 34, 44],
          [1190, 400, 30, 40],
          [1366, 396, 36, 48],
        ].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill="#d2a650" />
            <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="#5c3418" />
            <ellipse cx={x + w / 2} cy={y + h * 0.42} rx={w * 0.18} ry={h * 0.16} fill="#c58b5a" opacity="0.7" />
          </g>
        ))}

        {/* Garland and wreaths */}
        <path d="M560 262 Q640 300 700 262 Q760 302 830 258 Q900 300 980 250 Q1100 296 1200 252 Q1300 296 1390 256 Q1470 292 1600 252" stroke="#2b4a26" strokeWidth="15" fill="none" strokeLinecap="round" />
        <path d="M560 258 Q640 294 700 258 Q760 296 830 254 Q900 294 980 246 Q1100 290 1200 248 Q1300 290 1390 252 Q1470 286 1600 248" stroke="#4f7a3e" strokeWidth="4" fill="none" opacity="0.8" />
        {Array.from({ length: 46 }, (_, i) => {
          const x = 570 + i * 22.5;
          const phase = ((x - 560) % 140) / 140;
          const y = 260 + Math.sin(phase * Math.PI) * 26;
          return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 2.6} fill={i % 3 === 0 ? '#b3282d' : '#f3cf72'} />;
        })}
        {[676, 1210, 1392].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy="200" r="20" fill="none" stroke="#2f5a2c" strokeWidth="9" />
            <circle cx={cx} cy="200" r="20" fill="none" stroke="#6a9a4a" strokeWidth="2" strokeDasharray="3 7" />
            <path d={`M${cx - 7} 216 l7 6 7 -6 -3 12 -4 -6 -4 6 z`} fill="#b3282d" />
          </g>
        ))}
      </g>

      {/* Light falling through the windows */}
      <g filter={`url(#${id('blur')})`} opacity="0.9">
        <polygon points="1000,120 1176,120 1260,640 820,640" fill={`url(#${id('ray')})`} />
        <polygon points="838,180 930,180 960,600 700,600" fill={`url(#${id('ray')})`} opacity="0.7" />
        <polygon points="1248,170 1352,170 1460,600 1180,600" fill={`url(#${id('ray')})`} opacity="0.7" />
      </g>
      <rect width={W} height={H} fill={`url(#${id('bloom')})`} />

      <g filter={`url(#${id('paint')})`}>
        {/* Floor */}
        <path d={`M0 ${FLOOR + 10} L1600 ${FLOOR - 4} L1600 ${H} L0 ${H} Z`} fill={`url(#${id('floor')})`} />

        {/* Trees */}
        {trees.map((t, i) => (
          <g key={i}>
            <rect x={t.x - 6} y={FLOOR - 16} width="12" height="18" fill="#3a1a0a" />
            <path d={firPath(t.x, FLOOR - 8, t.h, t.w, 6)} fill={`url(#${id('fir')})`} />
            <path d={firPath(t.x - t.w * 0.06, FLOOR - 8, t.h * 0.97, t.w * 0.55, 6)} fill="#5b8a48" opacity="0.28" />
          </g>
        ))}
      </g>

      {/* Tree lights + stars (crisp, unfiltered) */}
      <g>
        {lights.map((l, i) => (
          <g key={i}>
            <circle cx={l.x} cy={l.y} r={l.r * 3} fill="#ffcf6a" opacity="0.18" />
            <circle cx={l.x} cy={l.y} r={l.r} fill={i % 5 === 0 ? '#ff9a7a' : '#fff0b8'} />
          </g>
        ))}
        {trees.map((t, i) => {
          const s = 0.5 + t.h / 500;
          const top = FLOOR - 8 - t.h - 6;
          return (
            <g key={i} transform={`translate(${t.x} ${top}) scale(${s})`}>
              <circle r="22" fill="#ffd36e" opacity="0.28" />
              <path d="M0 -14 L3.6 -4.4 L13.6 -4.4 L5.6 1.8 L8.6 11.6 L0 5.6 L-8.6 11.6 L-5.6 1.8 L-13.6 -4.4 L-3.6 -4.4 Z" fill="#f2c252" />
            </g>
          );
        })}
      </g>

      {/* Tables */}
      <g filter={`url(#${id('paint')})`}>
        <path d="M-40 560 L900 460 L900 470 L-40 650 Z" fill={`url(#${id('tableTop')})`} />
        <path d="M-40 650 L900 470 L900 478 L-40 690 Z" fill="#371808" />
        <path d="M1640 590 L1130 468 L1130 478 L1640 690 Z" fill={`url(#${id('tableTop')})`} />
        <path d="M1640 690 L1130 478 L1130 486 L1640 724 Z" fill="#371808" />
        <path d="M-40 650 L900 470" stroke="#f0b35e" strokeWidth="2" opacity="0.55" />
        <path d="M1640 690 L1130 478" stroke="#f0b35e" strokeWidth="2" opacity="0.55" />
      </g>
      <g>
        {Array.from({ length: 11 }, (_, i) => {
          const t = i / 11;
          const p = nearTable(t);
          return (
            <g key={`n${i}`}>
              <ellipse cx={p.x + 60 * p.s} cy={p.y + 6 * p.s} rx={22 * p.s} ry={6.5 * p.s} fill="#e0b660" />
              <ellipse cx={p.x + 60 * p.s} cy={p.y + 5 * p.s} rx={14 * p.s} ry={3.8 * p.s} fill="#b8862e" />
              {i % 2 === 0 && <Candle x={p.x + 104 * p.s} y={p.y - 22 * p.s} s={p.s * 0.9} delay={i * 0.37} />}
            </g>
          );
        })}
        {Array.from({ length: 9 }, (_, i) => {
          const t = i / 9;
          const p = rightTable(t);
          return (
            <g key={`r${i}`}>
              <ellipse cx={p.x - 70 * p.s} cy={p.y + 6 * p.s} rx={22 * p.s} ry={6.5 * p.s} fill="#e0b660" />
              <ellipse cx={p.x - 70 * p.s} cy={p.y + 5 * p.s} rx={14 * p.s} ry={3.8 * p.s} fill="#b8862e" />
              {i % 2 === 1 && <Candle x={p.x - 112 * p.s} y={p.y - 22 * p.s} s={p.s * 0.9} delay={i * 0.41} />}
            </g>
          );
        })}
      </g>

      {/* Foreground fir, cropped by the frame */}
      <g filter={`url(#${id('paint')})`}>
        <path d={firPath(1640, 760, 760, 420, 7)} fill="#13281a" />
        <path d={firPath(1620, 760, 740, 220, 7)} fill="#2a4a2c" opacity="0.5" />
      </g>

      {/* Floating candles */}
      <g>
        {candles.map((c, i) => (
          <Candle key={i} {...c} />
        ))}
      </g>

      <Snow seed={11} count={140} width={W} height={H - 120} minR={0.7} maxR={2} color="#fff4d8" opacity={[0.25, 0.8]} />

      {/* Warm glaze to unify the palette */}
      <rect width={W} height={H} fill="#ff9a3c" opacity="0.1" style={{ mixBlendMode: 'soft-light' }} />

      {/* Legibility scrims for the headline area */}
      <rect width={W} height={H} fill={`url(#${id('scrim')})`} />
      <rect width={W} height={H} fill={`url(#${id('base')})`} />
    </svg>
  );
});

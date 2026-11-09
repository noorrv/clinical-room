import { memo, type ReactNode } from 'react';
import type { SpecialtyId } from '../../data/homepage';
import { rng, useArtIds } from './shared';

/*
  The four specialty pictures share one ornate, inked frame: an apricot ground with halftone
  dots, an ogee window in the centre that looks out onto each specialty's scene, ribbons and a
  butterfly above, and a dusty-blue oval on each side holding a small emblem. Bold ink lines,
  flat retro colour, halftone shading.
*/

const VB = '0 0 400 262';
const INK = '#1c1512';
const CREAM = '#f4e7c9';
const BLUE = '#8ea6c2';

// ogee window, outer and inner (scene clip)
const WINDOW_OUTER = 'M128 238 V112 C128 84 150 70 172 62 C188 56 196 46 200 32 C204 46 212 56 228 62 C250 70 272 84 272 112 V238 Z';
const WINDOW_INNER = 'M135 232 V113 C135 88 155 76 175 69 C189 63 197 55 200 44 C203 55 211 63 225 69 C245 76 265 88 265 113 V232 Z';

/** A fat crescent opening to the right: both arcs share end points 0.9R above and below centre. */
function crescent(cx: number, cy: number, R: number) {
  const h = R * 0.9;
  return `M${cx} ${cy - h} A${R} ${R} 0 1 0 ${cx} ${cy + h} A${R * 0.98} ${R * 0.98} 0 0 1 ${cx} ${cy - h} Z`;
}

const ink = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Stars({ seed, count, box }: { seed: number; count: number; box: [number, number, number, number] }) {
  const r = rng(seed);
  const [x0, y0, w, h] = box;
  return (
    <g fill={CREAM}>
      {Array.from({ length: count }, (_, i) => {
        const x = x0 + r() * w;
        const y = y0 + r() * h;
        const s = 0.6 + r() * 1.4;
        return i % 4 === 0 ? (
          <path key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * 0.9).toFixed(2)})`} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" />
        ) : (
          <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(s * 0.55).toFixed(2)} opacity={0.6 + r() * 0.4} />
        );
      })}
    </g>
  );
}

/** Shared ornate frame. `scene` is drawn in window space and clipped to the ogee opening. */
function OrnateFrame({ prefix, scene, left, right, sky }: { prefix: string; scene: ReactNode; left: ReactNode; right: ReactNode; sky: [string, string] }) {
  const id = useArtIds(prefix);
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMid slice" className="art-svg" aria-hidden>
      <defs>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e39e6c" />
          <stop offset="0.55" stopColor="#efbb8c" />
          <stop offset="1" stopColor="#f5d3a8" />
        </linearGradient>
        <radialGradient id={id('vignette')} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#7a3a1a" stopOpacity="0" />
          <stop offset="1" stopColor="#7a3a1a" stopOpacity="0.35" />
        </radialGradient>
        <pattern id={id('dots')} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="0.9" fill="#8a3f1c" />
        </pattern>
        <pattern id={id('dotsDark')} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2" cy="2" r="0.8" fill={INK} />
        </pattern>
        <radialGradient id={id('halftoneMask')} cx="0.5" cy="0.5" r="0.7">
          <stop offset="0.45" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </radialGradient>
        <mask id={id('edges')}>
          <rect width="400" height="262" fill={`url(#${id('halftoneMask')})`} />
        </mask>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <clipPath id={id('win')}>
          <path d={WINDOW_INNER} />
        </clipPath>
      </defs>

      {/* ground: warm screen-print gradient, halftone towards the edges */}
      <rect width="400" height="262" fill={`url(#${id('ground')})`} />
      <rect width="400" height="262" fill={`url(#${id('dots')})`} opacity="0.32" mask={`url(#${id('edges')})`} />
      <rect width="400" height="262" fill={`url(#${id('vignette')})`} />

      {/* side ovals with their emblems */}
      {[
        { cx: 84, node: left },
        { cx: 316, node: right },
      ].map(({ cx, node }) => (
        <g key={cx}>
          <ellipse cx={cx + 3} cy="164" rx="28" ry="58" fill={INK} opacity="0.25" />
          <ellipse cx={cx} cy="160" rx="28" ry="58" fill={BLUE} {...ink} strokeWidth="3" />
          <ellipse cx={cx} cy="160" rx="22.5" ry="51" fill="none" stroke={CREAM} strokeWidth="1.2" />
          <path d={`M${cx} 104 v-8 M${cx - 4} 98 h8`} {...ink} strokeWidth="1.6" fill="none" />
          <g transform={`translate(${cx} 160) scale(0.9)`}>{node}</g>
          <path d={`M${cx - 10} 226 q10 10 20 0`} fill="none" {...ink} strokeWidth="1.6" />
        </g>
      ))}

      {/* window: drop shadow, frame, scene, inner gilt line */}
      <path d={WINDOW_OUTER} fill={INK} opacity="0.28" transform="translate(4 5)" />
      <path d={WINDOW_OUTER} fill={INK} />
      <g clipPath={`url(#${id('win')})`}>
        <rect x="128" y="30" width="144" height="210" fill={`url(#${id('sky')})`} />
        {scene}
        {/* halftone shading inside the window */}
        <rect x="128" y="160" width="144" height="80" fill={`url(#${id('dotsDark')})`} opacity="0.16" />
      </g>
      <path d={WINDOW_INNER} fill="none" stroke="#e3b857" strokeWidth="1.4" />

      {/* urn under the window */}
      <g transform="translate(200 240)" {...ink} strokeWidth="2">
        <path d="M-16 -4 Q0 12 16 -4 Z" fill="#e3b857" />
        <path d="M-6 6 L-8 14 H8 L6 6" fill="#c98a3a" />
        <path d="M-10 -4 Q0 -10 10 -4" fill="none" />
      </g>

      {/* ribbons */}
      <g fill="none" strokeLinecap="round">
        {['M196 30 C160 12 118 20 96 40 C88 48 92 60 104 58 C110 57 108 50 102 52', 'M204 30 C240 12 282 20 304 40 C312 48 308 60 296 58 C290 57 292 50 298 52'].map((d) => (
          <g key={d}>
            <path d={d} stroke={INK} strokeWidth="9" />
            <path d={d} stroke={CREAM} strokeWidth="5" />
          </g>
        ))}
        {['M104 58 C98 68 104 78 98 88', 'M296 58 C302 68 296 78 302 88'].map((d) => (
          <g key={d}>
            <path d={d} stroke={INK} strokeWidth="6" />
            <path d={d} stroke={CREAM} strokeWidth="2.6" />
          </g>
        ))}
      </g>

      {/* butterfly */}
      <g transform="translate(200 26)" {...ink} strokeWidth="1.8">
        <path d="M0 0 C-6 -14 -24 -16 -26 -6 C-27 2 -12 4 0 0 Z" fill="#c4473a" />
        <path d="M0 0 C6 -14 24 -16 26 -6 C27 2 12 4 0 0 Z" fill="#c4473a" />
        <path d="M0 2 C-6 6 -18 14 -14 20 C-10 24 -3 12 0 2 Z" fill="#6f7a3c" />
        <path d="M0 2 C6 6 18 14 14 20 C10 24 3 12 0 2 Z" fill="#6f7a3c" />
        <circle cx="-15" cy="-7" r="2.6" fill={CREAM} strokeWidth="1" />
        <circle cx="15" cy="-7" r="2.6" fill={CREAM} strokeWidth="1" />
        <path d="M0 -6 V10" strokeWidth="3" />
        <path d="M0 -6 Q-4 -14 -8 -16 M0 -6 Q4 -14 8 -16" fill="none" strokeWidth="1.2" />
      </g>

      {/* scattered sparkles on the ground */}
      {[
        [118, 58], [282, 58], [62, 82], [338, 82], [114, 212], [286, 212],
      ].map(([x, y], i) => (
        <path key={i} transform={`translate(${x} ${y})`} d="M0 -6 L1.4 -1.4 L6 0 L1.4 1.4 L0 6 L-1.4 1.4 L-6 0 L-1.4 -1.4 Z" fill={CREAM} stroke={INK} strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ───────────────────────── emblems (drawn around 0,0, inside an oval ~50 x 106) ───────────────────────── */

const Heart = () => (
  <g {...ink} strokeWidth="2">
    <path d="M0 22 C-14 12 -20 2 -18 -8 C-16 -16 -8 -18 -2 -12 C2 -18 12 -18 16 -10 C20 -2 12 12 0 22 Z" fill="#c4473a" />
    <path d="M-2 -12 C-4 -22 2 -28 8 -28 M6 -14 C8 -22 14 -24 16 -22" fill="none" />
    <path d="M-8 -4 Q-10 2 -6 8" stroke={CREAM} strokeWidth="1.4" fill="none" />
  </g>
);

const Stethoscope = () => (
  <g {...ink} fill="none" strokeWidth="2.2">
    <path d="M-10 -30 V-12 C-10 0 10 0 10 -12 V-30" />
    <path d="M0 -3 V14 C0 26 14 26 14 14 V8" />
    <circle cx="14" cy="3" r="5.5" fill={CREAM} />
    <circle cx="-10" cy="-31" r="2" fill={INK} />
    <circle cx="10" cy="-31" r="2" fill={INK} />
  </g>
);

const Scalpel = () => (
  <g {...ink} strokeWidth="2" transform="rotate(-30)">
    <rect x="-3" y="-4" width="6" height="34" rx="2" fill="#e3b857" />
    <path d="M-3 -4 L-3 -18 Q0 -32 3 -18 L3 -4 Z" fill={CREAM} />
    <path d="M-3 4 H3 M-3 12 H3 M-3 20 H3" strokeWidth="1" />
  </g>
);

const Scissors = () => (
  <g {...ink} strokeWidth="2">
    <circle cx="-8" cy="20" r="7" fill={CREAM} />
    <circle cx="8" cy="20" r="7" fill={CREAM} />
    <path d="M-4 14 L10 -28 L2 8 Z" fill={CREAM} />
    <path d="M4 14 L-10 -28 L-2 8 Z" fill={CREAM} />
    <circle cx="0" cy="4" r="1.6" fill={INK} />
  </g>
);

const Lily = () => (
  <g {...ink} strokeWidth="1.8">
    <path d="M0 34 C0 18 2 6 0 -6" fill="none" stroke="#3f5a2e" strokeWidth="2.4" />
    <path d="M0 22 C8 18 14 22 16 28 C10 30 4 28 0 22 Z" fill="#6f7a3c" />
    <path d="M0 -6 C-4 -20 -14 -24 -18 -18 C-12 -16 -8 -10 -6 -2 Z" fill={CREAM} />
    <path d="M0 -6 C4 -20 14 -24 18 -18 C12 -16 8 -10 6 -2 Z" fill={CREAM} />
    <path d="M0 -6 C-3 -18 0 -30 0 -30 C0 -30 3 -18 0 -6 Z" fill="#fbf2dc" />
    <path d="M0 -6 L-4 -16 M0 -6 L4 -16" strokeWidth="1" />
    <circle cx="-4" cy="-17" r="1.4" fill="#c98a3a" strokeWidth="0.6" />
    <circle cx="4" cy="-17" r="1.4" fill="#c98a3a" strokeWidth="0.6" />
  </g>
);

const MoonStar = () => (
  <g {...ink} strokeWidth="2">
    <path d={crescent(6, -6, 20)} fill="#f3d27a" />
    <path d="M10 18 L12 24 L18 26 L12 28 L10 34 L8 28 L2 26 L8 24 Z" fill={CREAM} strokeWidth="1.2" />
  </g>
);

const Teddy = () => (
  <g {...ink} strokeWidth="1.8">
    <circle cx="-9" cy="-24" r="5" fill="#c98a52" />
    <circle cx="9" cy="-24" r="5" fill="#c98a52" />
    <circle cx="0" cy="-15" r="12" fill="#d79c62" />
    <ellipse cx="0" cy="-10" rx="5" ry="4" fill={CREAM} />
    <circle cx="0" cy="-12" r="1.4" fill={INK} />
    <circle cx="-4.5" cy="-18" r="1.3" fill={INK} stroke="none" />
    <circle cx="4.5" cy="-18" r="1.3" fill={INK} stroke="none" />
    <ellipse cx="0" cy="14" rx="14" ry="17" fill="#d79c62" />
    <ellipse cx="0" cy="16" rx="7" ry="9" fill={CREAM} />
    <circle cx="-11" cy="27" r="5" fill="#c98a52" />
    <circle cx="11" cy="27" r="5" fill="#c98a52" />
    <path d="M-6 -2 L0 2 L6 -2 L4 4 L0 2 L-4 4 Z" fill="#c4473a" strokeWidth="1.2" />
  </g>
);

const Rattle = () => (
  <g {...ink} strokeWidth="2">
    <rect x="-3" y="0" width="6" height="30" rx="3" fill="#e3b857" />
    <circle cx="0" cy="-14" r="15" fill="#c4473a" />
    <path d="M-15 -14 H15" stroke={CREAM} strokeWidth="2" />
    <circle cx="-6" cy="-22" r="2" fill={CREAM} strokeWidth="0.8" />
    <circle cx="6" cy="-6" r="2" fill={CREAM} strokeWidth="0.8" />
    <circle cx="0" cy="34" r="4" fill="#8ea6c2" />
  </g>
);

/* ───────────────────────── window scenes (drawn in frame space, x 128–272, y 30–240) ───────────────────────── */

const MoonAt = ({ x, y, r = 12 }: { x: number; y: number; r?: number }) => (
  <path d={crescent(x, y, r)} fill="#f3d27a" stroke={INK} strokeWidth="1.6" />
);

const MedicineScene = (
  <g>
    <Stars seed={3} count={22} box={[132, 44, 136, 80]} />
    <MoonAt x={236} y={78} r={11} />
    {/* hills */}
    <path d="M128 182 Q170 150 214 166 Q246 176 272 160 V240 H128 Z" fill="#2f4a3c" {...ink} strokeWidth="2" />
    <path d="M128 206 Q180 186 272 200 V240 H128 Z" fill="#3f5f45" {...ink} strokeWidth="2" />
    {/* winding path */}
    <path d="M198 240 C190 222 214 214 204 198 C198 190 206 182 202 176" stroke={CREAM} strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* infirmary */}
    <g {...ink} strokeWidth="2">
      <rect x="168" y="134" width="64" height="38" fill={CREAM} />
      <path d="M164 136 L200 116 L236 136 Z" fill="#c4473a" />
      <rect x="191" y="98" width="18" height="38" fill={CREAM} />
      <path d="M188 100 L200 84 L212 100 Z" fill="#c4473a" />
      <path d="M200 84 V74" />
      {/* rod of Asclepius weathervane */}
      <path d="M200 70 V60" strokeWidth="1.6" />
      <path d="M197 70 C203 68 197 65 203 63" fill="none" strokeWidth="1" />
      <rect x="196" y="106" width="8" height="10" fill="#f3d27a" />
      {[174, 186, 208, 220].map((x) => (
        <rect key={x} x={x} y="144" width="7" height="10" fill="#f3d27a" />
      ))}
      <path d="M196 172 V158 Q200 152 204 158 V172" fill="#f3d27a" />
    </g>
    {/* cypress trees */}
    {[150, 252].map((x) => (
      <path key={x} d={`M${x} 178 C${x - 8} 160 ${x - 4} 140 ${x} 128 C${x + 4} 140 ${x + 8} 160 ${x} 178 Z`} fill="#24382c" {...ink} strokeWidth="1.8" />
    ))}
  </g>
);

const SurgeryScene = (
  <g>
    {/* tiled theatre wall */}
    <g stroke="#3f6a6c" strokeWidth="0.8" opacity="0.7">
      {Array.from({ length: 10 }, (_, i) => (
        <line key={`h${i}`} x1="128" x2="272" y1={60 + i * 16} y2={60 + i * 16} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={`v${i}`} y1="30" y2="240" x1={132 + i * 16} x2={132 + i * 16} />
      ))}
    </g>
    {/* lamp arm and light cone */}
    <path d="M200 30 V54" {...ink} strokeWidth="3" />
    <polygon points="180,82 220,82 262,200 138,200" fill="#fff3c8" opacity="0.22" />
    <g {...ink} strokeWidth="2.2">
      <ellipse cx="200" cy="70" rx="34" ry="16" fill="#cfd8d4" />
      <ellipse cx="200" cy="74" rx="27" ry="11" fill="#fff6d4" />
      {[-15, -5, 5, 15].map((dx) => (
        <circle key={dx} cx={200 + dx} cy="74" r="3.2" fill={CREAM} strokeWidth="1" />
      ))}
    </g>
    {/* draped table */}
    <g {...ink} strokeWidth="2">
      <path d="M134 186 L266 186 L262 214 L138 214 Z" fill="#5f9a96" />
      <path d="M138 214 L130 240 M262 214 L270 240" />
      <path d="M150 186 Q156 202 150 214 M196 186 Q202 202 196 214 M242 186 Q248 202 242 214" fill="none" strokeWidth="1.2" />
      <path d="M134 186 Q200 176 266 186" fill="none" stroke={CREAM} strokeWidth="2" />
    </g>
    {/* instrument tray */}
    <g {...ink} strokeWidth="1.8">
      <path d="M160 168 H240 L234 178 H166 Z" fill="#cfd8d4" />
      <path d="M174 170 L194 160 M200 172 L222 160" strokeWidth="2.2" />
      <circle cx="172" cy="171" r="2.6" fill={CREAM} strokeWidth="1" />
      <circle cx="226" cy="164" r="2.2" fill={CREAM} strokeWidth="1" />
    </g>
  </g>
);

const ObgynScene = (
  <g>
    {/* star-papered nursery wall */}
    <g fill="#f3d27a" opacity="0.5">
      {Array.from({ length: 24 }, (_, i) => {
        const x = 136 + (i % 6) * 26 + (Math.floor(i / 6) % 2) * 13;
        const y = 54 + Math.floor(i / 6) * 34;
        return <path key={i} transform={`translate(${x} ${y})`} d="M0 -3 L0.8 -0.8 L3 0 L0.8 0.8 L0 3 L-0.8 0.8 L-3 0 L-0.8 -0.8 Z" />;
      })}
    </g>
    {/* hanging mobile */}
    <g {...ink} strokeWidth="1.4" fill="none">
      <path d="M200 30 V72" />
      <path d="M170 76 Q200 64 230 76" strokeWidth="2" />
      <path d="M172 76 V98 M200 70 V104 M228 76 V96" />
    </g>
    <path transform="translate(172 104)" d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill="#f3d27a" stroke={INK} strokeWidth="1.4" />
    <MoonAt x={200} y={112} r={9} />
    <path transform="translate(228 102)" d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z" fill="#f3d27a" stroke={INK} strokeWidth="1.4" />
    {/* lamp glow */}
    <circle cx="200" cy="180" r="70" fill="#ffd98a" opacity="0.14" />
    {/* cradle on rockers */}
    <g {...ink} strokeWidth="2">
      <path d="M152 162 Q200 142 248 162 L240 206 Q200 220 160 206 Z" fill="#d9a35f" />
      <path d="M156 172 Q200 156 244 172 M158 186 Q200 172 242 186 M160 198 Q200 186 240 198" fill="none" strokeWidth="1.1" />
      <path d="M150 162 Q154 136 178 132 Q196 132 200 148" fill="#c98a3a" />
      <path d="M160 160 Q200 150 240 160 Q236 168 200 170 Q164 168 160 160 Z" fill="#c4473a" />
      <path d="M150 226 Q200 240 250 226" fill="none" strokeWidth="3" />
      <path d="M168 210 L162 228 M232 210 L238 228" />
      <circle cx="184" cy="152" r="6" fill="#f2c9ac" />
    </g>
  </g>
);

const PaediatricsScene = (
  <g>
    <Stars seed={9} count={14} box={[132, 44, 136, 60]} />
    {/* kite */}
    <g {...ink} strokeWidth="1.8">
      <path d="M232 62 L246 80 L232 104 L218 80 Z" fill="#c4473a" />
      <path d="M232 62 V104 M218 80 H246" strokeWidth="1" />
      <path d="M232 104 C226 120 238 132 230 148" fill="none" strokeWidth="1.2" />
      {[116, 130, 142].map((y, i) => (
        <path key={y} transform={`translate(${i % 2 ? 236 : 228} ${y})`} d="M-4 -3 L4 3 M-4 3 L4 -3" stroke={i % 2 ? '#f3d27a' : CREAM} strokeWidth="2.4" />
      ))}
    </g>
    {/* tree with swing */}
    <g {...ink} strokeWidth="2">
      <path d="M150 240 C154 200 150 170 160 140 L170 140 C166 172 170 204 168 240 Z" fill="#5a3a24" />
      <path d="M160 142 C176 132 196 130 214 136" fill="none" strokeWidth="5" stroke="#5a3a24" />
      <path d="M160 142 C176 132 196 130 214 136" fill="none" strokeWidth="1.2" />
      <path d="M128 132 C126 104 150 90 168 98 C176 82 204 84 210 102 C226 102 234 118 224 132 C210 144 150 146 128 132 Z" fill="#3f5f45" />
      <path d="M140 122 Q156 112 170 120 M180 110 Q196 102 208 112" fill="none" stroke="#6f8a52" strokeWidth="1.4" />
      <path d="M186 136 V196 M206 136 V196" strokeWidth="1.4" />
      <rect x="180" y="194" width="32" height="7" rx="2" fill="#c98a3a" />
    </g>
    {/* meadow with tiny flowers */}
    <path d="M128 214 Q200 198 272 212 V240 H128 Z" fill="#4f7350" {...ink} strokeWidth="2" />
    {[[146, 222], [170, 228], [228, 220], [252, 228], [210, 230]].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="2.4" fill={i % 2 ? CREAM : '#f2b8c6'} stroke={INK} strokeWidth="0.8" />
      </g>
    ))}
  </g>
);

const SCENES: Record<SpecialtyId, { scene: ReactNode; left: ReactNode; right: ReactNode; sky: [string, string] }> = {
  medicine: { scene: MedicineScene, left: <Heart />, right: <Stethoscope />, sky: ['#1d2a4a', '#3c4f7c'] },
  surgery: { scene: SurgeryScene, left: <Scalpel />, right: <Scissors />, sky: ['#1f3f44', '#2f5a5c'] },
  obgyn: { scene: ObgynScene, left: <Lily />, right: <MoonStar />, sky: ['#2b3a62', '#46598a'] },
  paediatrics: { scene: PaediatricsScene, left: <Teddy />, right: <Rattle />, sky: ['#2c3b66', '#d58a6a'] },
};

export const SpecialtyArt = memo(function SpecialtyArt({ id }: { id: SpecialtyId }) {
  const s = SCENES[id];
  return <OrnateFrame prefix={id.slice(0, 3)} {...s} />;
});

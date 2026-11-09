/*
  Engraved header illustrations: the IV stand that stands in for the T of "The",
  the antique bell, and the evergreen garland on the header's bottom rule.
  Line work in deep plum, brass and red, with fine hatching for shade.
*/

const PLUM = '#3b2330';
const BRASS = '#b88d4c';
const BRASS_LIGHT = '#e3c58a';
const RED = '#a8302a';
const NEEDLE = '#3f5a2c';
const NEEDLE_LIGHT = '#6e8a45';

/** Fine parallel hatching clipped to a shape, for engraved shading. */
function Hatch({ id, d, gap = 2.2, angle = -35, width = 0.45, opacity = 0.55 }: { id: string; d: string; gap?: number; angle?: number; width?: number; opacity?: number }) {
  return (
    <>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`} stroke={PLUM} strokeWidth={width} opacity={opacity}>
        {Array.from({ length: 110 }, (_, i) => (
          <line key={i} x1={-80 + i * gap} y1="-120" x2={-80 + i * gap} y2="220" transform={`rotate(${angle} 60 60)`} />
        ))}
      </g>
    </>
  );
}

function Sprig({ x, y, angle, scale = 1, flip = false }: { x: number; y: number; angle: number; scale?: number; flip?: boolean }) {
  const needles = Array.from({ length: 9 }, (_, i) => i);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${flip ? -scale : scale} ${scale})`} strokeLinecap="round">
      <path d="M0 0 C8 -1 16 -1 26 0" stroke={PLUM} strokeWidth="0.9" fill="none" />
      {needles.map((i) => (
        <g key={i}>
          <path d={`M${3 + i * 2.6} 0 l${2.6} -5.2`} stroke={i % 2 ? NEEDLE_LIGHT : NEEDLE} strokeWidth="1.3" />
          <path d={`M${3 + i * 2.6} 0 l${2.6} 5.2`} stroke={i % 2 ? NEEDLE : NEEDLE_LIGHT} strokeWidth="1.3" />
        </g>
      ))}
    </g>
  );
}

/**
 * "Th" drawn as one IV set, in em units (1em = 100) against the wordmark's line box
 * (EB Garamond 600: ascender 15, cap 20, x-height 43, baseline 86).
 *  - T: the stand. The crossbar is raised like an illuminated initial; the pole runs down to the rule.
 *  - h: the giving set. The bag hangs from the crossbar at the top of the h's ascender, the drip
 *    chamber and line drop as its stem, and a Y-site branch arches over at x-height and comes down as
 *    the right leg. A roller clamp and a connector cap sit on the baseline like serifs.
 */
export function IvT({ className }: { className?: string }) {
  const STEM = 88; // x of the h's stem
  const bag = 'M72 -22 Q72 -27 77 -27 H99 Q104 -27 104 -22 V18 Q104 28 95 30 H81 Q72 28 72 18 Z';
  const fluid = 'M72 -2 H104 V18 Q104 28 95 30 H81 Q72 28 72 18 Z';
  const LEG = STEM + 36; // x of the h's right leg
  const leg = `M${STEM} 62 C${STEM + 2} 50 ${STEM + 10} 42 ${STEM + 20} 42 C${LEG - 4} 42 ${LEG} 48 ${LEG} 57 V82`;
  const POLE_X = 34;
  const tube = (d: string, key?: string) => (
    <g key={key} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* plum like the letters, with a glassy highlight so it still reads as tubing */}
      <path d={d} stroke={PLUM} strokeWidth="10.5" />
      <path d={d} stroke="#6a4656" strokeWidth="5" opacity="0.55" />
      <path d={d} stroke="#f4e9cf" strokeWidth="1.3" opacity="0.85" transform="translate(-2 0)" />
    </g>
  );
  return (
    <svg className={className} viewBox="0 -50 138 196" aria-hidden focusable="false">
      <defs>
        <linearGradient id="ivBrass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7d5a28" />
          <stop offset="0.42" stopColor={BRASS_LIGHT} />
          <stop offset="1" stopColor="#7d5a28" />
        </linearGradient>
        <linearGradient id="ivBrassH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRASS_LIGHT} />
          <stop offset="1" stopColor="#8a6430" />
        </linearGradient>
        <linearGradient id="ivGlass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ece0c2" />
          <stop offset="0.5" stopColor="#fbf6e8" />
          <stop offset="1" stopColor="#d8c7a0" />
        </linearGradient>
      </defs>

      {/* ── T: the stand ── */}
      <Sprig x={POLE_X - 1} y={118} angle={-150} scale={1.25} />
      <Sprig x={POLE_X + 1} y={119} angle={-30} scale={1.25} flip />
      <Sprig x={POLE_X - 1} y={127} angle={-172} scale={1.05} />
      <Sprig x={POLE_X + 1} y={127} angle={-8} scale={1.05} flip />
      <Sprig x={POLE_X} y={112} angle={-118} scale={0.9} />
      <Sprig x={POLE_X} y={112} angle={-62} scale={0.9} flip />

      {/* the pole is drawn to y 100; CSS continues it to the header's rule at any width */}
      <rect x={POLE_X - 6} y="-38" width="12" height="140" fill="url(#ivBrass)" stroke={PLUM} strokeWidth="1.5" />
      <path d={`M${POLE_X - 3.4} -36 V102`} stroke="#f3dfae" strokeWidth="1.3" opacity="0.55" />
      {[8, 52].map((y) => (
        <g key={y}>
          <rect x={POLE_X - 8.6} y={y} width="17.2" height="5" rx="1.6" fill={BRASS} stroke={PLUM} strokeWidth="1.1" />
          <path d={`M${POLE_X - 7} ${y + 1.4} H${POLE_X + 7}`} stroke="#f3dfae" strokeWidth="0.8" opacity="0.6" />
        </g>
      ))}

      <rect x="2" y="-40" width="100" height="10" rx="2.4" fill="url(#ivBrassH)" stroke={PLUM} strokeWidth="1.5" />
      <path d="M5 -37.6 H99" stroke="#f6e6bd" strokeWidth="1" opacity="0.6" />
      <Hatch id="ivBarShade" d="M2 -34 H102 V-30 H2 Z" gap={1.6} angle={-60} width={0.35} opacity={0.45} />
      <circle cx={POLE_X} cy="-45" r="4.6" fill={BRASS_LIGHT} stroke={PLUM} strokeWidth="1.3" />
      <path d={`M${POLE_X - 3} -40.5 L${POLE_X} -42 L${POLE_X + 3} -40.5`} stroke={PLUM} strokeWidth="1" fill="none" />
      <path d="M4 -30 Q0 -22 7 -20.5" stroke={PLUM} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ── h: the giving set, hanging from the crossbar ── */}
      <path d={`M${STEM} -30 V-27.4`} stroke={PLUM} strokeWidth="2" strokeLinecap="round" />
      <path d={`M${STEM - 2} -27.4 L${STEM - 6} -25 M${STEM + 2} -27.4 L${STEM + 6} -25`} stroke={PLUM} strokeWidth="1.3" />

      {/* bag: the top of the h's ascender */}
      <path d={bag} fill="url(#ivGlass)" stroke={PLUM} strokeWidth="1.8" />
      <path d={fluid} fill="#e7d3a0" opacity="0.9" />
      <Hatch id="ivBagShade" d={bag} gap={1.7} angle={-40} width={0.42} opacity={0.4} />
      <Hatch id="ivFluidShade" d="M94 -2 H104 V18 Q104 28 95 30 H94 Z" gap={1.3} angle={20} width={0.4} opacity={0.45} />
      <path d="M72 -2 H104" stroke={PLUM} strokeWidth="1" opacity="0.75" />
      <rect x="77" y="-21" width="22" height="13" rx="1.5" fill="#fdf8ec" stroke={PLUM} strokeWidth="0.9" />
      <path d="M80 -16.6 H96 M80 -13 H92" stroke={PLUM} strokeWidth="0.7" />
      <path d="M76 -22 V18" stroke="#fffaf0" strokeWidth="2" opacity="0.85" strokeLinecap="round" />
      {[6, 14, 22].map((y) => (
        <path key={y} d={`M100 ${y} H104`} stroke={PLUM} strokeWidth="0.8" />
      ))}

      {/* port and drip chamber, the upper stem */}
      <path d={`M${STEM - 3} 30 V34 H${STEM + 3} V30`} fill="#ece0c2" stroke={PLUM} strokeWidth="1.1" />
      <rect x={STEM - 5.5} y="34" width="11" height="16" rx="3.4" fill="url(#ivGlass)" stroke={PLUM} strokeWidth="1.2" />
      <path d={`M${STEM - 3.6} 44 H${STEM + 3.6}`} stroke={PLUM} strokeWidth="0.7" />
      <circle cx={STEM} cy="40" r="1.4" fill="#e7d3a0" stroke={PLUM} strokeWidth="0.5" />

      {/* the line: stem down to the baseline, and the Y-site branch as the arch and right leg */}
      {tube(leg, 'leg')}
      {tube(`M${STEM} 50 V82`, 'stem')}
      {/* Y-site junction */}
      <rect x={STEM - 6} y="56" width="12" height="9" rx="2.6" fill="url(#ivGlass)" stroke={PLUM} strokeWidth="1.1" />
      <path d={`M${STEM - 3.4} 60.5 H${STEM + 3.4}`} stroke={PLUM} strokeWidth="0.6" />

      {/* serif feet on the baseline: roller clamp on the stem, connector cap on the leg */}
      <rect x={STEM - 8} y="80" width="16" height="6.8" rx="1.6" fill="url(#ivBrass)" stroke={PLUM} strokeWidth="1.1" />
      <circle cx={STEM} cy="83.6" r="1.6" fill={BRASS_LIGHT} stroke={PLUM} strokeWidth="0.6" />
      <path d={`M${LEG - 7.5} 86.6 L${LEG - 6} 79.6 H${LEG + 6} L${LEG + 7.5} 86.6 Z`} fill={RED} stroke={PLUM} strokeWidth="1.1" strokeLinejoin="round" />

      {/* bow over the greenery at the foot of the stand */}
      <g transform={`translate(${POLE_X} 113)`} stroke={PLUM} strokeWidth="1" strokeLinejoin="round">
        <path d="M0 0 C-7 -9 -18 -8 -17 0 C-16 6 -6 4 0 0 Z" fill={RED} />
        <path d="M0 0 C7 -9 18 -8 17 0 C16 6 6 4 0 0 Z" fill={RED} />
        <path d="M-10 -3 C-7 -1.6 -3.6 -0.8 -1.2 -0.4 M10 -3 C7 -1.6 3.6 -0.8 1.2 -0.4" fill="none" strokeWidth="0.6" />
        <path d="M-1.2 1.2 L-7.6 19 L-3.8 16.6 L-1.4 21 Z M1.2 1.2 L7.6 19 L3.8 16.6 L1.4 21 Z" fill={RED} />
        <ellipse rx="3.2" ry="2.8" fill="#c4473a" />
      </g>
      {[
        [POLE_X - 15, 121],
        [POLE_X + 15, 122],
        [POLE_X - 11, 130],
        [POLE_X + 12, 131],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.4" fill={RED} stroke={PLUM} strokeWidth="0.6" />
          <circle cx={x - 0.8} cy={y - 0.8} r="0.7" fill="#f1a08a" />
        </g>
      ))}
    </svg>
  );
}

export function SearchGlass({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <circle cx="13" cy="13" r="8.6" fill="none" stroke={PLUM} strokeWidth="2.2" />
      <circle cx="13" cy="13" r="6.4" fill="none" stroke={PLUM} strokeWidth="0.6" opacity="0.6" />
      <path d="M8.6 10.4 Q10 7.8 13 7.4" stroke={PLUM} strokeWidth="0.9" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M19.4 19.4 L27.5 27.5" stroke={PLUM} strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

export function AntiqueBell({ size = 36 }: { size?: number }) {
  const body = 'M16 9 C10.5 9 9 13.5 9 18 C9 21 8 22.5 6 24 H26 C24 22.5 23 21 23 18 C23 13.5 21.5 9 16 9 Z';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <defs>
        <linearGradient id="bellBrass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6430" />
          <stop offset="0.4" stopColor={BRASS_LIGHT} />
          <stop offset="1" stopColor="#8a6430" />
        </linearGradient>
      </defs>
      <path d={body} fill="url(#bellBrass)" stroke={PLUM} strokeWidth="1.1" strokeLinejoin="round" />
      <Hatch id="bellShade" d="M19 9.5 C22 11 23 15 23 18 C23 21 24 22.5 26 24 H18 Z" gap={1.3} angle={-20} width={0.35} opacity={0.5} />
      <path d="M8.5 22.6 H23.5" stroke={PLUM} strokeWidth="0.7" />
      <circle cx="16" cy="26.4" r="2" fill={BRASS} stroke={PLUM} strokeWidth="0.9" />
      <path d="M16 9 V7" stroke={PLUM} strokeWidth="1.2" />
      {/* little red bow */}
      <g transform="translate(16 5.6)" stroke={PLUM} strokeWidth="0.6" strokeLinejoin="round">
        <path d="M0 0 C-3 -3.6 -7 -3 -6.4 0.2 C-5.8 2.6 -2.4 1.6 0 0 Z" fill={RED} />
        <path d="M0 0 C3 -3.6 7 -3 6.4 0.2 C5.8 2.6 2.4 1.6 0 0 Z" fill={RED} />
        <path d="M-0.6 0.6 L-3 5 M0.6 0.6 L3 5" stroke={RED} strokeWidth="1.3" strokeLinecap="round" />
        <circle r="1.2" fill="#c4473a" />
      </g>
    </svg>
  );
}

export function MenuLines({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false" strokeLinecap="round">
      {[9, 16, 23].map((y) => (
        <g key={y}>
          <path d={`M5 ${y} H27`} stroke={PLUM} strokeWidth="2.6" />
          <path d={`M7 ${y - 0.6} H25`} stroke="#c9b58c" strokeWidth="0.5" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

export function CloseLines({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false" strokeLinecap="round">
      <path d="M8 8 L24 24 M24 8 L8 24" stroke={PLUM} strokeWidth="2.6" />
    </svg>
  );
}

/** Evergreen sprays, berries and a red bow, sitting on the header's bottom rule. */
export function Garland({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 56" aria-hidden focusable="false">
      {/* left spray */}
      <Sprig x={108} y={30} angle={180} scale={1.6} />
      <Sprig x={100} y={26} angle={198} scale={1.35} />
      <Sprig x={102} y={34} angle={164} scale={1.25} />
      <Sprig x={78} y={28} angle={190} scale={1.05} />
      {/* right spray */}
      <Sprig x={112} y={30} angle={0} scale={1.6} />
      <Sprig x={120} y={26} angle={-18} scale={1.35} />
      <Sprig x={118} y={34} angle={16} scale={1.25} />
      <Sprig x={142} y={28} angle={-10} scale={1.05} />
      {/* berries */}
      {[
        [84, 22], [90, 37], [96, 20], [124, 20], [130, 37], [136, 22], [74, 33], [146, 33],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.8" fill={RED} stroke={PLUM} strokeWidth="0.6" />
          <circle cx={x - 0.9} cy={y - 0.9} r="0.8" fill="#f1a08a" />
        </g>
      ))}
      {/* bow */}
      <g transform="translate(110 28)" stroke={PLUM} strokeWidth="1" strokeLinejoin="round">
        <path d="M0 0 C-8 -11 -22 -10 -21 -1 C-20 6 -8 5 0 0 Z" fill={RED} />
        <path d="M0 0 C8 -11 22 -10 21 -1 C20 6 8 5 0 0 Z" fill={RED} />
        <path d="M-12 -4 C-9 -2 -5 -1 -2 -0.5 M12 -4 C9 -2 5 -1 2 -0.5" fill="none" strokeWidth="0.6" />
        <path d="M-1.5 1.5 L-9 22 L-4.5 19 L-2 24 Z M1.5 1.5 L9 22 L4.5 19 L2 24 Z" fill={RED} />
        <ellipse rx="3.6" ry="3.2" fill="#c4473a" />
      </g>
    </svg>
  );
}

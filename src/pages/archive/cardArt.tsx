/*
  Original vintage Christmas-card illustrations for the examiners' title cards: holly and ribbon,
  a snowy cottage, ornaments in line, a pomegranate branch, a wreath, a letterpress fir, plus the
  postcard furniture (stamp, postmark, wax seal). Colours come from the card's colourway.
*/

export interface Colours {
  paper: string;
  ink: string;
  red: string;
  green: string;
  cream: string;
  sky: string;
  gold: string;
}

const f = (n: number) => n.toFixed(1);

/** A spiky holly leaf along +x. */
function hollyD(l: number, w: number) {
  return (
    `M0 0 Q${f(l * 0.1)} ${f(-w * 0.95)} ${f(l * 0.28)} ${f(-w)} Q${f(l * 0.36)} ${f(-w * 0.45)} ${f(l * 0.52)} ${f(-w * 1.02)} ` +
    `Q${f(l * 0.6)} ${f(-w * 0.45)} ${f(l * 0.76)} ${f(-w * 0.9)} Q${f(l * 0.84)} ${f(-w * 0.4)} ${l} 0 ` +
    `Q${f(l * 0.84)} ${f(w * 0.4)} ${f(l * 0.76)} ${f(w * 0.9)} Q${f(l * 0.6)} ${f(w * 0.45)} ${f(l * 0.52)} ${f(w * 1.02)} ` +
    `Q${f(l * 0.36)} ${f(w * 0.45)} ${f(l * 0.28)} ${f(w)} Q${f(l * 0.1)} ${f(w * 0.95)} 0 0 Z`
  );
}

function Holly({ x, y, a, l = 46, c }: { x: number; y: number; a: number; l?: number; c: Colours }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={hollyD(l, l * 0.3)} fill={c.green} />
      <path d={`M2 0 L${l - 4} 0`} stroke={c.cream} strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

function Berries({ x, y, r = 5, c }: { x: number; y: number; r?: number; c: Colours }) {
  const pts: Array<[number, number]> = [
    [0, 0],
    [r * 1.9, r * 0.5],
    [r * 0.8, r * 1.8],
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      {pts.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r={r} fill={c.red} />
          <circle cx={px - r * 0.35} cy={py - r * 0.35} r={r * 0.28} fill="#fff" fillOpacity="0.55" />
        </g>
      ))}
    </g>
  );
}

function Bow({ x, y, s = 1, c, tails = true }: { x: number; y: number; s?: number; c: Colours; tails?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={c.red}>
      <path d="M0 0 C-14 -22 -44 -26 -46 -10 C-48 6 -20 8 0 0 Z" />
      <path d="M0 0 C14 -22 44 -26 46 -10 C48 6 20 8 0 0 Z" />
      <path d="M-38 -12 C-28 -10 -14 -6 -4 -2" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M38 -12 C28 -10 14 -6 4 -2" fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      {tails && (
        <>
          <path d="M-3 2 C-10 18 -22 34 -34 46 L-26 50 C-14 38 -4 22 2 4 Z" />
          <path d="M3 2 C8 20 16 36 30 48 L36 42 C24 32 14 18 6 2 Z" />
        </>
      )}
      <ellipse cx="0" cy="0" rx="7" ry="6" />
      <ellipse cx="0" cy="0" rx="7" ry="6" fill="#000" fillOpacity="0.15" />
    </g>
  );
}

/** Holly cluster with a red bow; `flowing` adds the long ribbon that drifts across the card. */
export function HollyRibbon({ c, flowing = false }: { c: Colours; flowing?: boolean }) {
  return (
    <svg viewBox="0 0 300 210" className="xc-art__svg" aria-hidden>
      {flowing && (
        <path d="M128 66 C170 40 210 96 250 74 C272 62 286 52 300 48" fill="none" stroke={c.red} strokeWidth="10" strokeLinecap="butt" />
      )}
      {flowing && <path d="M0 120 C30 104 60 88 96 78" fill="none" stroke={c.red} strokeWidth="10" />}
      <Holly x={112} y={96} a={150} l={66} c={c} />
      <Holly x={118} y={98} a={200} l={58} c={c} />
      <Holly x={126} y={96} a={110} l={70} c={c} />
      <Holly x={132} y={96} a={60} l={62} c={c} />
      <Holly x={136} y={98} a={20} l={64} c={c} />
      <Holly x={124} y={92} a={250} l={40} c={c} />
      <Holly x={196} y={138} a={-160} l={48} c={c} />
      <Holly x={200} y={140} a={-20} l={50} c={c} />
      <Berries x={118} y={104} r={6} c={c} />
      <Berries x={146} y={120} r={5.5} c={c} />
      <Berries x={96} y={130} r={5} c={c} />
      <Berries x={194} y={132} r={5} c={c} />
      <Bow x={126} y={74} s={1.05} c={c} />
    </svg>
  );
}

function Fir({ x, y, h, c }: { x: number; y: number; h: number; c: Colours }) {
  const tiers = [0, 0.3, 0.58];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-h * 0.04} y={-h * 0.08} width={h * 0.08} height={h * 0.1} fill="#5a3b2a" />
      {tiers.map((t, i) => {
        const top = -h + t * h;
        const wdt = h * (0.42 - i * 0.1);
        const base = top + h * 0.44;
        return (
          <g key={i}>
            <path d={`M0 ${f(top)} L${f(wdt)} ${f(base)} L${f(-wdt)} ${f(base)} Z`} fill={c.green} />
            <path d={`M0 ${f(top)} L${f(wdt * 0.55)} ${f(top + h * 0.22)} Q0 ${f(top + h * 0.14)} ${f(-wdt * 0.6)} ${f(top + h * 0.24)} Z`} fill={c.cream} />
          </g>
        );
      })}
    </g>
  );
}

/** A snowy cottage under a winter sky, with fir trees and chimney smoke. */
export function Cottage({ c, moon = false }: { c: Colours; moon?: boolean }) {
  const snow = Array.from({ length: 34 }, (_, i) => [(i * 73) % 300, (i * 41) % 150, 0.8 + ((i * 7) % 3) * 0.5]);
  return (
    <svg viewBox="0 0 300 190" className="xc-art__svg" aria-hidden>
      <rect width="300" height="160" fill={c.sky} />
      {moon ? <circle cx="214" cy="58" r="17" fill="#f2d36a" /> : <path d="M60 30 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" fill="#f2d36a" />}
      {!moon && <path d="M68 36 C110 18 150 22 176 34" fill="none" stroke="#e98b6d" strokeWidth="3" strokeLinecap="round" opacity="0.8" />}
      <path d="M0 122 L34 100 L62 112 L104 82 L142 106 L186 86 L226 108 L264 92 L300 106 V160 H0 Z" fill="#e4e7e2" />
      <path d="M104 82 L118 96 L108 98 L124 108 L142 106 Z M186 86 L198 98 L190 100 L210 108 Z M264 92 L276 102 L268 104 L284 106 Z" fill="#b8c3bf" />
      <Fir x={34} y={152} h={70} c={c} />
      <Fir x={58} y={150} h={46} c={c} />
      <Fir x={236} y={152} h={82} c={c} />
      <Fir x={268} y={150} h={52} c={c} />
      {/* the cottage */}
      <rect x="96" y="108" width="84" height="44" fill="#a8442f" />
      <rect x="180" y="118" width="40" height="34" fill="#93392a" />
      <path d="M88 112 L138 72 L188 112 Z" fill={c.cream} />
      <path d="M138 72 L188 112 L180 112 L138 80 Z" fill="#000" fillOpacity="0.08" />
      <path d="M176 120 H226 L222 112 H180 Z" fill={c.cream} />
      <rect x="150" y="70" width="10" height="20" fill="#93392a" />
      <rect x="148" y="66" width="14" height="5" rx="2" fill={c.cream} />
      <path d="M155 64 C150 54 162 46 156 36 C151 28 160 20 156 10" fill="none" stroke={c.cream} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" />
      {[
        [106, 118],
        [154, 118],
        [190, 126],
      ].map(([wx, wy]) => (
        <g key={wx}>
          <rect x={wx} y={wy} width="16" height="13" fill="#f2c94c" />
          <path d={`M${wx + 8} ${wy} V${wy + 13} M${wx} ${wy + 6.5} H${wx + 16}`} stroke="#7a3022" strokeWidth="1.5" />
        </g>
      ))}
      <rect x="130" y="124" width="14" height="28" fill="#5c2a20" />
      <circle cx="132" cy="130" r="5" fill="none" stroke={c.green} strokeWidth="3" />
      <path d="M0 152 C50 140 110 160 170 148 C220 140 260 146 300 150 V190 H0 Z" fill={c.cream} />
      <path d="M190 160 C230 156 266 158 300 162" fill="none" stroke="#000" strokeOpacity="0.06" strokeWidth="6" />
      <g fill="#fff">
        {snow.map(([sx, sy, r], i) => (
          <circle key={i} cx={sx} cy={sy} r={r} opacity="0.85" />
        ))}
      </g>
    </svg>
  );
}

/** Bauble, acorn with a bow and a snowflake, drawn in cream line. */
export function Ornaments({ c }: { c: Colours }) {
  const flake = Array.from({ length: 6 }, (_, i) => i * 60);
  return (
    <svg viewBox="0 0 300 130" className="xc-art__svg" aria-hidden>
      <defs>
        <clipPath id="xc-bauble">
          <circle cx="58" cy="76" r="32" />
        </clipPath>
      </defs>
      <g fill="none" stroke={c.cream} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="58" cy="76" r="32" />
        <rect x="50" y="38" width="16" height="8" rx="2" />
        <path d="M54 38 C54 30 62 30 62 38" />
        <g clipPath="url(#xc-bauble)" strokeWidth="1.6">
          {[-40, -24, -8, 8, 24, 40].map((d) => (
            <path key={`a${d}`} d={`M${58 + d - 40} 36 L${58 + d + 40} 116 M${58 + d + 40} 36 L${58 + d - 40} 116`} />
          ))}
        </g>
        <path d="M128 64 C128 46 172 46 172 64 Z" />
        <path d="M132 58 L168 58 M136 52 L164 52 M140 60 L146 50 M150 60 L156 50 M160 60 L165 52" strokeWidth="1.4" />
        <path d="M134 64 C134 92 150 108 150 108 C150 108 166 92 166 64" />
        <path d="M150 46 V40" />
        {flake.map((a) => (
          <g key={a} transform={`translate(242 76) rotate(${a})`}>
            <path d="M0 0 V-34 M0 -16 L-8 -24 M0 -16 L8 -24 M0 -26 L-6 -32 M0 -26 L6 -32" />
          </g>
        ))}
        <path d="M242 68 L249 72 L249 80 L242 84 L235 80 L235 72 Z" />
      </g>
      <g transform="translate(150 40)" fill="none" stroke={c.red} strokeWidth="2.6" strokeLinecap="round">
        <path d="M0 0 C-12 -16 -38 -18 -38 -6 C-38 6 -14 6 0 0 C14 6 38 6 38 -6 C38 -18 12 -16 0 0 Z" />
        <path d="M-2 2 C-12 20 -30 30 -44 52 M2 2 C14 22 30 30 46 56" />
      </g>
    </svg>
  );
}

/** A pomegranate branch: whole fruit, a cut half, flowers and long leaves. */
export function Pomegranate({ c }: { c: Colours }) {
  const leaf = (x: number, y: number, a: number, l: number) => (
    <g transform={`translate(${x} ${y}) rotate(${a})`} key={`${x}-${y}-${a}`}>
      <path d={`M0 0 C${l * 0.3} ${-l * 0.2} ${l * 0.7} ${-l * 0.16} ${l} 0 C${l * 0.7} ${l * 0.16} ${l * 0.3} ${l * 0.2} 0 0 Z`} fill={c.green} />
      <path d={`M2 0 L${l - 6} 0`} stroke={c.cream} strokeOpacity="0.4" strokeWidth="1.2" />
    </g>
  );
  const seeds: Array<[number, number]> = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 * 3.1;
    const r = 6 + (i % 5) * 3.6;
    seeds.push([Math.cos(a) * r, Math.sin(a) * r * 0.9]);
  }
  return (
    <svg viewBox="0 0 300 220" className="xc-art__svg" aria-hidden>
      <path d="M20 30 C80 50 120 90 150 130 C170 156 190 170 210 176" fill="none" stroke="#5a3b2a" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M120 92 C150 70 190 60 236 52" fill="none" stroke="#5a3b2a" strokeWidth="2.6" strokeLinecap="round" />
      {[leaf(40, 38, -40, 54), leaf(60, 46, 40, 60), leaf(96, 70, -60, 50), leaf(110, 84, 30, 64), leaf(160, 72, -30, 48), leaf(200, 60, 20, 52), leaf(150, 132, 60, 46), leaf(176, 160, -10, 56)]}
      {/* whole fruit */}
      <g transform="translate(92 158)">
        <circle r="34" fill={c.red} />
        <path d="M-8 -32 L-12 -44 L-4 -38 L0 -48 L4 -38 L12 -44 L8 -32 Z" fill={c.red} />
        <path d="M-20 -14 C-24 -4 -22 8 -14 16" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
        <path d="M-2 -10 C12 -2 18 14 12 28" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="6" />
      </g>
      {/* cut half */}
      <g transform="translate(222 140) rotate(-14)">
        <ellipse rx="32" ry="30" fill={c.red} />
        <ellipse rx="26" ry="24" fill="#f1dcc2" />
        <path d="M0 -24 V24 M-24 0 H24 M-17 -17 L17 17 M17 -17 L-17 17" stroke="#e9c9a6" strokeWidth="2" />
        {seeds.map(([sx, sy], i) => (
          <ellipse key={i} cx={sx} cy={sy} rx="3" ry="2.4" fill={i % 3 ? '#9e1f2b' : '#c23a45'} />
        ))}
      </g>
      {/* flowers */}
      {[
        [236, 50, 20],
        [24, 28, -30],
      ].map(([fx, fy, fa]) => (
        <g key={fx} transform={`translate(${fx} ${fy}) rotate(${fa})`}>
          <path d="M-6 0 C-8 -10 -6 -18 0 -22 C6 -18 8 -10 6 0 Z" fill={c.red} />
          <path d="M0 -20 C-14 -30 -22 -24 -18 -16 C-12 -22 -6 -22 0 -20 C6 -22 12 -22 18 -16 C22 -24 14 -30 0 -20 Z" fill={c.red} />
          <circle cx="0" cy="-22" r="3" fill={c.gold} />
        </g>
      ))}
    </svg>
  );
}

/** A small wreath of holly with a red bow. */
export function Wreath({ c }: { c: Colours }) {
  const n = 16;
  return (
    <svg viewBox="0 0 140 140" className="xc-art__svg" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 360;
        const r = (a * Math.PI) / 180;
        return <Holly key={i} x={70 + Math.cos(r) * 40} y={70 + Math.sin(r) * 40} a={a + 100 + (i % 2) * 30} l={30} c={c} />;
      })}
      {[20, 110, 200, 290].map((a) => {
        const r = (a * Math.PI) / 180;
        return <Berries key={a} x={66 + Math.cos(r) * 40} y={66 + Math.sin(r) * 40} r={4} c={c} />;
      })}
      <Bow x={70} y={112} s={0.55} c={c} />
    </svg>
  );
}

/** A letterpress fir tree: one colour, pressed into the card with a pale bite. */
export function PressTree({ c }: { c: Colours }) {
  const tree = (
    <g fill="none" stroke={c.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M100 30 L70 78 H86 L58 120 H78 L46 166 H154 L122 120 H142 L114 78 H130 Z" />
      <path d="M92 166 V184 H108 V166" />
      <path d="M100 6 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 Z" fill={c.ink} />
      {[
        [92, 96],
        [116, 106],
        [80, 148],
        [104, 140],
        [124, 152],
        [104, 70],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.5" fill={c.ink} />
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 200 200" className="xc-art__svg" aria-hidden>
      <g transform="translate(1.5 1.5)" opacity="0.6" style={{ filter: 'blur(0.6px)' }}>
        <g stroke="#fff">{tree}</g>
      </g>
      {tree}
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={20 + ((i * 47) % 160)} cy={14 + ((i * 29) % 170)} r="2" fill={c.ink} opacity="0.5" />
      ))}
    </svg>
  );
}

/** Embossed laurel branches that curl round the name on the invitation card. */
export function Laurel({ c }: { c: Colours }) {
  // a cubic stem from the bottom centre up the left side; leaves sit in pairs along its tangent
  const P = [
    [150, 200],
    [64, 194],
    [22, 132],
    [44, 28],
  ];
  const at = (t: number) => {
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const d = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
    return {
      x: k.reduce((s2, w, i) => s2 + w * P[i][0], 0),
      y: k.reduce((s2, w, i) => s2 + w * P[i][1], 0),
      a: (Math.atan2(d.reduce((s2, w, i) => s2 + w * P[i][1], 0), d.reduce((s2, w, i) => s2 + w * P[i][0], 0)) * 180) / Math.PI,
    };
  };
  const leaf = 'M0 0 C4 -5 12 -6 17 0 C12 6 4 5 0 0 Z';
  const branch = (flip: boolean) => (
    <g transform={flip ? 'translate(300 0) scale(-1 1)' : undefined}>
      <path d={`M${P[0][0]} ${P[0][1]} C${P[1][0]} ${P[1][1]} ${P[2][0]} ${P[2][1]} ${P[3][0]} ${P[3][1]}`} fill="none" stroke={c.ink} strokeWidth="1.6" />
      {Array.from({ length: 15 }, (_, i) => {
        const t = 0.08 + (i / 14) * 0.9;
        const p = at(t);
        const s2 = 1 - t * 0.35;
        return (
          <g key={i}>
            <path d={leaf} fill={c.ink} transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a - 38)}) scale(${f(s2)})`} />
            <path d={leaf} fill={c.ink} transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.a + 38)}) scale(${f(s2)})`} />
          </g>
        );
      })}
      {[0.3, 0.62].map((t) => {
        const p = at(t);
        return <circle key={t} cx={p.x + 6} cy={p.y + 2} r="2.6" fill={c.ink} />;
      })}
    </g>
  );
  return (
    <svg viewBox="0 0 300 210" className="xc-art__svg xc-art__svg--emboss" aria-hidden>
      {branch(false)}
      {branch(true)}
    </svg>
  );
}

/* ───────────── postcard furniture ───────────── */

export function Stamp({ c, motif }: { c: Colours; motif: 'tree' | 'wreath' | 'bauble' }) {
  const holes = [];
  for (let i = 0; i <= 10; i++) holes.push([i * 8, 0], [i * 8, 96]);
  for (let i = 1; i < 12; i++) holes.push([0, i * 8], [80, i * 8]);
  return (
    <svg viewBox="-4 -4 88 104" className="xc-stamp" aria-hidden>
      <rect x="0" y="0" width="80" height="96" fill="#fffaf0" />
      {holes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={c.paper} />
      ))}
      <rect x="8" y="8" width="64" height="80" fill={c.sky} />
      <rect x="8" y="8" width="64" height="80" fill="none" stroke={c.red} strokeWidth="1.5" />
      {motif === 'tree' && (
        <g transform="translate(40 76)">
          <path d="M0 -54 L16 -26 H8 L22 -2 H-22 L-8 -26 H-16 Z" fill={c.green} />
          {[
            [-6, -30],
            [7, -16],
            [-10, -8],
            [4, -40],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={c.red} />
          ))}
          <path d="M0 -60 l2 4 4 0 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 0 Z" fill="#f2c94c" />
        </g>
      )}
      {motif === 'wreath' && (
        <g transform="translate(40 50)">
          <circle r="18" fill="none" stroke={c.green} strokeWidth="8" strokeDasharray="5 2" />
          <circle cx="-12" cy="-10" r="2.6" fill={c.red} />
          <circle cx="14" cy="6" r="2.6" fill={c.red} />
          <path d="M0 16 l-10 8 M0 16 l10 8" stroke={c.red} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {motif === 'bauble' && (
        <g transform="translate(40 52)">
          <circle r="16" fill={c.red} />
          <rect x="-5" y="-21" width="10" height="6" fill="#f2c94c" />
          <path d="M-14 -4 H14 M-15 4 H15" stroke="#f2c94c" strokeWidth="2" />
        </g>
      )}
      <text x="14" y="22" fontSize="9" fontFamily="'Special Elite', monospace" fill={c.ink}>
        NOËL
      </text>
      <text x="58" y="84" fontSize="9" fontFamily="'Special Elite', monospace" fill={c.ink}>
        25
      </text>
    </svg>
  );
}

export function Postmark({ c, top, bottom }: { c: Colours; top: string; bottom: string }) {
  return (
    <svg viewBox="0 0 170 90" className="xc-postmark" aria-hidden>
      <defs>
        <path id="xc-pm-top" d="M14 45 A31 31 0 0 1 76 45" />
        <path id="xc-pm-bot" d="M10 45 A35 35 0 0 0 80 45" />
      </defs>
      <g fill="none" stroke={c.red} strokeOpacity="0.75">
        <circle cx="45" cy="45" r="38" strokeWidth="2" />
        <circle cx="45" cy="45" r="25" strokeWidth="1.2" />
        <path d="M90 28 C104 22 116 34 130 28 S156 22 168 28 M90 42 C104 36 116 48 130 42 S156 36 168 42 M90 56 C104 50 116 62 130 56 S156 50 168 56" strokeWidth="1.8" />
      </g>
      <g fill={c.red} fillOpacity="0.8" fontFamily="'Special Elite', monospace">
        <text fontSize="8.5" letterSpacing="1">
          <textPath href="#xc-pm-top" startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="8.5" letterSpacing="1">
          <textPath href="#xc-pm-bot" startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
        <text x="45" y="43" fontSize="9" textAnchor="middle">
          DEC
        </text>
        <text x="45" y="54" fontSize="11" textAnchor="middle">
          25
        </text>
      </g>
    </svg>
  );
}

/** A red wax seal pressed with the doctor's initial. */
export function Seal({ c, letter }: { c: Colours; letter: string }) {
  return (
    <svg viewBox="0 0 80 80" className="xc-seal" aria-hidden>
      <path d="M40 4 C50 2 54 8 62 10 C72 14 70 22 76 30 C80 40 74 46 76 54 C76 66 66 68 60 74 C52 80 44 76 36 78 C26 78 22 70 14 66 C6 60 8 52 4 44 C2 34 8 28 10 20 C14 10 22 10 30 6 C34 4 36 4 40 4 Z" fill={c.red} />
      <circle cx="40" cy="40" r="24" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="3" />
      <circle cx="40" cy="40" r="24" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1" transform="translate(-1 -1)" />
      <text x="40" y="49" textAnchor="middle" fontSize="26" fontFamily="'IM Fell English', 'Amiri', serif" fill="#000" fillOpacity="0.28">
        {letter}
      </text>
      <text x="39" y="48" textAnchor="middle" fontSize="26" fontFamily="'IM Fell English', 'Amiri', serif" fill="#fff" fillOpacity="0.28">
        {letter}
      </text>
    </svg>
  );
}

/** Ribbon loops for the corners of the looping-ribbon frame. */
export function RibbonCorner({ c, className }: { c: Colours; className: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <path d="M10 70 C10 40 18 20 40 14 C62 8 70 30 52 38 C34 46 26 22 44 12 C56 6 66 8 74 10" fill="none" stroke={c.red} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 70 C14 44 22 24 40 18" fill="none" stroke={c.red} strokeWidth="1" strokeOpacity="0.6" />
    </svg>
  );
}

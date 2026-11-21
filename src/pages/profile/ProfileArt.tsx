import type { ReactElement } from 'react';

/*
  Painted pieces for the profile card, drawn here (no outside pictures): a small pastoral scene
  seen through an arched window, and a folk vine that sits under the name.
*/

/** Rolling hills, two cypresses, a cottage and a field of poppies under a soft sky. */
export function Meadow() {
  return (
    <svg className="meadow" viewBox="0 0 600 230" preserveAspectRatio="xMidYMax slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id="mw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9c4d2" />
          <stop offset="0.65" stopColor="#dfe7e2" />
          <stop offset="1" stopColor="#f1ecd9" />
        </linearGradient>
        <linearGradient id="mw-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6bb63" />
          <stop offset="1" stopColor="#7f9a45" />
        </linearGradient>
        {/* a little paper grain over everything, so it reads as paint rather than vector */}
        <filter id="mw-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.15  0 0 0 -2.2 0.95" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <g>
        <rect width="600" height="230" fill="url(#mw-sky)" />

        {/* clouds */}
        <g fill="#fbf8ef">
          <ellipse cx="120" cy="62" rx="46" ry="17" />
          <ellipse cx="150" cy="50" rx="30" ry="18" />
          <ellipse cx="96" cy="54" rx="22" ry="13" />
          <ellipse cx="430" cy="44" rx="54" ry="16" />
          <ellipse cx="462" cy="34" rx="30" ry="16" />
          <ellipse cx="402" cy="36" rx="22" ry="12" />
          <ellipse cx="300" cy="84" rx="30" ry="8" opacity="0.8" />
        </g>
        <g fill="#e3e6e0" opacity="0.9">
          <ellipse cx="128" cy="72" rx="40" ry="6" />
          <ellipse cx="436" cy="54" rx="46" ry="5" />
        </g>

        {/* far hills */}
        <path d="M0 150 C70 122 130 128 190 138 S300 112 360 124 S500 112 600 134 V230 H0Z" fill="#a7b99a" />
        {/* middle hill with the cottage */}
        <path d="M0 168 C90 140 170 146 250 156 S420 128 600 152 V230 H0Z" fill="#8fa75e" />
        <g transform="translate(430 120)">
          <path d="M0 22 L24 4 L48 22Z" fill="#c98a3a" stroke="#6b4a22" strokeWidth="1" strokeLinejoin="round" />
          <rect x="4" y="21" width="40" height="22" fill="#f4ecd9" stroke="#6b4a22" strokeWidth="1" />
          <rect x="10" y="27" width="8" height="7" fill="#7f9aa6" />
          <rect x="30" y="27" width="8" height="7" fill="#7f9aa6" />
          <rect x="21" y="31" width="6" height="12" fill="#8a4a2c" />
          <circle cx="-10" cy="34" r="10" fill="#5f7d3f" />
          <circle cx="58" cy="36" r="8" fill="#6b8846" />
        </g>
        {/* cypresses on the ridge */}
        <g fill="#3f5532">
          <ellipse cx="190" cy="132" rx="5" ry="19" />
          <ellipse cx="206" cy="138" rx="4" ry="14" />
          <ellipse cx="520" cy="134" rx="4.5" ry="16" />
        </g>

        {/* near meadow, brushed grass, poppies and daisies */}
        <path d="M0 192 C110 170 220 176 320 186 S500 170 600 182 V230 H0Z" fill="url(#mw-near)" />
        <g stroke="#c5d483" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
          <path d="M40 214 l4 -10 M70 222 l-3 -9 M120 210 l3 -9 M180 220 l-4 -10 M240 212 l4 -9 M300 222 l-3 -10 M360 208 l3 -9 M420 220 l-4 -10 M480 210 l4 -9 M540 218 l-3 -9 M575 206 l3 -8" />
        </g>
        <g fill="#c8452d">
          <circle cx="58" cy="206" r="3.6" />
          <circle cx="96" cy="216" r="3" />
          <circle cx="150" cy="200" r="2.6" />
          <circle cx="212" cy="214" r="3.4" />
          <circle cx="262" cy="202" r="2.4" />
          <circle cx="338" cy="214" r="3.2" />
          <circle cx="396" cy="200" r="2.6" />
          <circle cx="452" cy="212" r="3.6" />
          <circle cx="506" cy="200" r="2.4" />
          <circle cx="556" cy="214" r="3" />
        </g>
        <g fill="#fbf4e6">
          <circle cx="80" cy="200" r="1.8" />
          <circle cx="130" cy="220" r="1.6" />
          <circle cx="190" cy="206" r="1.8" />
          <circle cx="288" cy="212" r="1.6" />
          <circle cx="372" cy="220" r="1.8" />
          <circle cx="430" cy="204" r="1.6" />
          <circle cx="530" cy="208" r="1.8" />
        </g>
      </g>
      <rect width="600" height="230" filter="url(#mw-grain)" opacity="0.45" />
    </svg>
  );
}

/** A folk vine with a tulip in the middle, used as a divider under the name. */
export function VineDivider() {
  const leaves = [
    [40, 14, -30],
    [62, 16, 28],
    [84, 13, -26],
    [136, 13, 206],
    [158, 16, 152],
    [180, 14, 210],
  ] as const;
  return (
    <svg className="vine" viewBox="0 0 220 30" aria-hidden focusable="false">
      <path d="M14 16 C50 8 80 22 104 15 M116 15 C140 22 170 8 206 16" fill="none" stroke="#5f7342" strokeWidth="1.3" strokeLinecap="round" />
      {leaves.map(([x, y, a]) => (
        <ellipse key={`${x}`} cx="0" cy="0" rx="6.5" ry="2.6" fill="#8fa36a" transform={`translate(${x} ${y}) rotate(${a})`} />
      ))}
      <circle cx="14" cy="16" r="2" fill="#d9714f" />
      <circle cx="206" cy="16" r="2" fill="#d9714f" />
      {/* the tulip */}
      <path d="M110 24 C104 20 102 12 104 6 C107 9 109 10 110 13 C111 10 113 9 116 6 C118 12 116 20 110 24Z" fill="#c8452d" />
      <path d="M110 24 C108 18 108 12 110 8 C112 12 112 18 110 24Z" fill="#e3876a" />
    </svg>
  );
}

/* ───────── the streak garden: one flower for each day studied, bare soil for the rest ───────── */

const STEM = '#5f7342';
const LEAF = '#8fa36a';

function Stem({ top, lean = 0 }: { top: number; lean?: number }) {
  return (
    <>
      <path d={`M20 58 C${20 + lean} 46 ${20 - lean} ${top + 10} 20 ${top}`} fill="none" stroke={STEM} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="14" cy="44" rx="6" ry="2.4" fill={LEAF} transform="rotate(-30 14 44)" />
      <ellipse cx="26" cy="38" rx="6" ry="2.4" fill={LEAF} transform="rotate(30 26 38)" />
    </>
  );
}

const ring = (n: number, r: number, cx: number, cy: number) =>
  Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), (a * 180) / Math.PI + 90] as const;
  });

/** Seven flowers, a different one each day of the week the student studied. */
const FLOWERS: Array<{ name: string; draw: () => ReactElement }> = [
  {
    name: 'tulip',
    draw: () => (
      <>
        <Stem top={18} />
        <path d="M20 26 C13 23 12 14 13 8 C16 11 18 12 20 15 C22 12 24 11 27 8 C28 14 27 23 20 26Z" fill="#c8452d" />
        <path d="M20 26 C18 20 18 14 20 10 C22 14 22 20 20 26Z" fill="#e3876a" />
      </>
    ),
  },
  {
    name: 'daisy',
    draw: () => (
      <>
        <Stem top={18} lean={2} />
        {ring(10, 6.5, 20, 14).map(([x, y, a], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2.2" ry="4.6" fill="#fffaf0" stroke="#d8cdb6" strokeWidth="0.5" transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <circle cx="20" cy="14" r="3.6" fill="#e2b13c" />
      </>
    ),
  },
  {
    name: 'poppy',
    draw: () => (
      <>
        <Stem top={20} lean={-2} />
        {ring(4, 5, 20, 15).map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" fill={i % 2 ? '#d9573c' : '#c8452d'} />
        ))}
        <circle cx="20" cy="15" r="2.8" fill="#2f2620" />
      </>
    ),
  },
  {
    name: 'bluebell',
    draw: () => (
      <>
        <path d="M20 58 C20 40 22 22 28 10" fill="none" stroke={STEM} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="13" cy="46" rx="6" ry="2.4" fill={LEAF} transform="rotate(-40 13 46)" />
        {[
          [26, 16],
          [22, 25],
          [20, 34],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x - 4} ${y} C${x - 4} ${y - 6} ${x + 4} ${y - 6} ${x + 4} ${y} L${x + 5} ${y + 2} L${x + 2} ${y + 1} L${x} ${y + 3} L${x - 2} ${y + 1} L${x - 5} ${y + 2}Z`} fill="#7c8fc4" stroke="#55639a" strokeWidth="0.5" />
        ))}
      </>
    ),
  },
  {
    name: 'rose',
    draw: () => (
      <>
        <Stem top={20} lean={1} />
        <circle cx="20" cy="15" r="8" fill="#d97a8a" />
        <path d="M20 9 C25 9 27 14 24 17 C21 20 16 18 16 14 C16 11 19 10 21 12 C22 14 20 15 19 14" fill="none" stroke="#a84a5a" strokeWidth="1.1" strokeLinecap="round" />
      </>
    ),
  },
  {
    name: 'sunflower',
    draw: () => (
      <>
        <Stem top={18} lean={-1} />
        {ring(12, 7.5, 20, 13).map(([x, y, a], i) => (
          <ellipse key={i} cx={x} cy={y} rx="2.2" ry="4.4" fill="#e9b937" transform={`rotate(${a} ${x} ${y})`} />
        ))}
        <circle cx="20" cy="13" r="4.8" fill="#6b4a22" />
      </>
    ),
  },
  {
    name: 'lavender',
    draw: () => (
      <>
        <path d="M20 58 C20 44 19 28 20 10" fill="none" stroke={STEM} strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="14" cy="46" rx="6" ry="2" fill={LEAF} transform="rotate(-35 14 46)" />
        <ellipse cx="26" cy="42" rx="6" ry="2" fill={LEAF} transform="rotate(35 26 42)" />
        {[8, 12, 16, 20, 24, 28].map((y, i) => (
          <g key={y} fill={i % 2 ? '#9a7fbf' : '#b39ad1'}>
            <ellipse cx={17.4} cy={y} rx="2.4" ry="3" />
            <ellipse cx={22.6} cy={y + 1.5} rx="2.4" ry="3" />
          </g>
        ))}
      </>
    ),
  },
];

export type GardenDay = { day: string; label: string; questions: number; today: boolean };

function weekdayIndex(day: string) {
  return new Date(`${day}T12:00`).getDay();
}

/** One plot per day: a flower when the student studied, a bare mound of soil when they didn't. */
export function Garden({ days }: { days: GardenDay[] }) {
  return (
    <ol className="garden__bed">
      {days.map((d) => {
        const flower = FLOWERS[weekdayIndex(d.day)];
        const what = d.questions ? `${d.questions} ${d.questions === 1 ? 'question' : 'questions'}, a ${flower.name}` : 'no study';
        return (
          <li key={d.day} className={`garden__plot${d.questions ? ' is-bloom' : ''}${d.today ? ' is-today' : ''}`} title={`${d.label}: ${what}`}>
            <svg viewBox="0 0 40 64" aria-hidden focusable="false">
              {/* a strip of earth that joins its neighbours into one long bed */}
              <rect x="-0.5" y="57" width="41" height="7" fill="#7a5236" />
              <path d="M-0.5 57.5 H40.5" stroke="#93663f" strokeWidth="1.4" />
              {d.questions ? (
                flower.draw()
              ) : (
                <g fill="none" stroke="#8fa36a" strokeWidth="1.3" strokeLinecap="round">
                  <path d="M15 57 C15 54 14 52 12 50 M18 57 C18 53 19 51 20 49 M22 57 C23 54 25 52 27 51" />
                </g>
              )}
              <ellipse cx="20" cy="57.5" rx="9" ry="2" fill="#93663f" />
            </svg>
            <span className="visually-hidden">
              {d.label}: {what}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

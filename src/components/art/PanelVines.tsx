import { memo, useEffect, useRef } from 'react';
import { useArtIds } from './shared';

/**
 * Pomegranate branches growing in from the panel's top corners.
 * Drawn for the left corner; the right one is the same branch mirrored.
 *
 * Motion: a breeze, not a loop. Each gust lasts about four seconds (under the
 * five-second limit for unpausable movement) and plays once when the page loads
 * and again when the pointer moves onto the specialty cards. Leaves flutter on
 * their stalks, the branch sways from the corner and the fruit swings, then all
 * of it settles back to rest.
 */

type Leaf = [x: number, y: number, angle: number, scale: number, tone: number, turn: number];

// x, y = where the stalk meets the stem; angle 0 points right, 90 down.
// Leaves droop and cluster at the nodes; `turn` < 1 foreshortens a leaf turned away from us.
const LEAVES: Leaf[] = [
  // top node, by the corner
  [8, 10, 150, 0.9, 2, 0.8], [18, 16, 104, 0.8, 0, 0.6], [26, 14, 38, 1, 1, 1],
  // first side shoot cluster
  [44, 52, 128, 0.85, 0, 0.75], [60, 48, 72, 0.95, 2, 0.9], [78, 42, 18, 0.9, 1, 1], [92, 40, -14, 0.72, 0, 0.7],
  [70, 46, 112, 0.7, 1, 0.55],
  // main stem, descending
  [24, 96, 146, 1, 1, 0.95], [30, 112, 58, 0.92, 0, 0.85], [22, 140, 168, 0.8, 2, 0.6],
  [26, 160, 124, 0.96, 0, 0.9],
  // second side shoot cluster
  [46, 184, 96, 0.82, 2, 0.7], [60, 190, 40, 0.92, 1, 1], [76, 200, 12, 0.76, 0, 0.8], [66, 196, 128, 0.68, 2, 0.55],
  // lower stem
  [22, 230, 152, 0.94, 1, 0.9], [30, 252, 64, 0.86, 0, 0.8], [26, 280, 136, 0.82, 2, 0.75],
  [44, 300, 54, 0.8, 1, 0.9], [60, 306, 104, 0.66, 0, 0.6],
  [28, 338, 148, 0.78, 2, 0.8], [32, 362, 76, 0.72, 0, 0.7], [34, 392, 132, 0.66, 1, 0.75], [38, 410, 70, 0.56, 2, 0.6],
];

// [dark base, mid, light tip, vein]
const TONES = [
  ['#24391c', '#3d5c2b', '#6f8f45', '#a9bd7a'],
  ['#2e4521', '#4d6d33', '#86a356', '#bccb8a'],
  ['#1d3018', '#344f26', '#5e7c3b', '#98ad6c'],
];

/** A glossy lanceolate pomegranate leaf, 46 units long, stalk at the origin. */
function LeafShape({ tone, id }: { tone: number; id: (n: string) => string }) {
  const [, , , vein] = TONES[tone];
  return (
    <>
      <path d="M-7 0.6 L1 0" stroke="#4a3220" strokeWidth="1.6" strokeLinecap="round" />
      {/* lower half, in shade */}
      <path d="M0 0 C7 4.2 18 7 30 5.2 C37 4 42 1.8 46 0 Z" fill={`url(#${id(`lo${tone}`)})`} />
      {/* upper half, catching light */}
      <path d="M0 0 C7 -5 18 -7.6 30 -5.6 C37 -4.2 42 -1.8 46 0 Z" fill={`url(#${id(`hi${tone}`)})`} />
      {/* midrib and side veins */}
      <path d="M0.5 0 C14 -0.6 30 -0.4 45 0" stroke={vein} strokeWidth="0.9" fill="none" opacity="0.85" />
      <g stroke={vein} strokeWidth="0.45" fill="none" opacity="0.5">
        <path d="M8 -0.3 Q12 -3 15 -4.6 M16 -0.4 Q21 -3.4 24 -5 M25 -0.4 Q29 -3 32 -4.2 M33 -0.3 Q37 -2 39 -2.8" />
        <path d="M8 0.3 Q12 2.6 15 3.8 M16 0.4 Q21 3 24 4.4 M25 0.4 Q29 2.8 32 3.8 M33 0.3 Q37 1.8 39 2.4" />
      </g>
      {/* waxy sheen */}
      <path d="M9 -3.2 C17 -5.6 27 -5.4 36 -3" stroke="#f4f8e8" strokeWidth="1.1" fill="none" opacity="0.28" strokeLinecap="round" />
      {/* soft edge line */}
      <path d="M0 0 C7 -5 18 -7.6 30 -5.6 C37 -4.2 42 -1.8 46 0 C42 1.8 37 4 30 5.2 C18 7 7 4.2 0 0 Z" fill="none" stroke="#16240f" strokeWidth="0.4" opacity="0.5" />
    </>
  );
}

/** Ripe pomegranate, crown up, hanging from (0,0); r is the fruit radius. */
function Pomegranate({ r, id }: { r: number; id: (n: string) => string }) {
  const cy = r * 1.55; // stalk length to the fruit's centre
  const sepals = Array.from({ length: 6 }, (_, i) => -90 + (i - 2.5) * 26);
  return (
    <g>
      <path d={`M0 0 Q${r * 0.12} ${r * 0.3} 0 ${cy - r * 1.05}`} stroke="#4a3220" strokeWidth="1.6" fill="none" />
      {/* cast shadow */}
      <ellipse cx={r * 0.18} cy={cy + r * 0.2} rx={r * 1.02} ry={r * 0.96} fill="#2a0c06" opacity="0.18" filter={`url(#${id('soft')})`} />
      {/* crown neck */}
      <path d={`M${-r * 0.3} ${cy - r * 0.8} L${-r * 0.24} ${cy - r * 1.06} L${r * 0.24} ${cy - r * 1.06} L${r * 0.3} ${cy - r * 0.8} Z`} fill="#8e2a1a" />
      {/* body */}
      <ellipse cx="0" cy={cy} rx={r} ry={r * 0.94} fill={`url(#${id('pomBody')})`} />
      {/* ochre blush patches */}
      <g clipPath={`url(#${id('pomClip')})`} transform={`translate(0 ${cy}) scale(${r / 20})`}>
        <ellipse cx="8" cy="8" rx="9" ry="6" fill="#d9a050" opacity="0.22" transform="rotate(-30 8 8)" />
        <ellipse cx="-10" cy="10" rx="5" ry="3.4" fill="#c98a44" opacity="0.18" />
        {[
          [-6, -4], [4, -9], [10, 2], [-12, 4], [2, 12], [-3, 6], [12, -6], [-8, -11],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.55" fill="#5a120a" opacity="0.35" />
        ))}
        {/* terminator shadow */}
        <ellipse cx="6" cy="9" rx="20" ry="16" fill="#3a0806" opacity="0.28" />
      </g>
      {/* broad and sharp highlights */}
      <ellipse cx={-r * 0.38} cy={cy - r * 0.36} rx={r * 0.42} ry={r * 0.26} fill="#ffd2bc" opacity="0.32" transform={`rotate(-34 ${-r * 0.38} ${cy - r * 0.36})`} filter={`url(#${id('soft')})`} />
      <ellipse cx={-r * 0.46} cy={cy - r * 0.44} rx={r * 0.14} ry={r * 0.08} fill="#fff6ee" opacity="0.75" transform={`rotate(-34 ${-r * 0.46} ${cy - r * 0.44})`} />
      {/* calyx crown: inner shadow, then sepals */}
      <ellipse cx="0" cy={cy - r * 1.04} rx={r * 0.26} ry={r * 0.08} fill="#3a0806" />
      {sepals.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const bx = Math.cos(rad) * r * 0.24;
        const tipX = Math.cos(rad) * r * 0.58;
        const tipY = cy - r * 1.04 + Math.sin(rad) * r * 0.5;
        return (
          <path
            key={i}
            d={`M${bx - r * 0.07} ${cy - r * 1.02} L${tipX} ${tipY} L${bx + r * 0.07} ${cy - r * 1.02} Z`}
            fill={i % 2 ? '#a3341f' : '#8a2616'}
            stroke="#5a1209"
            strokeWidth="0.4"
          />
        );
      })}
    </g>
  );
}

const Branch = memo(function Branch() {
  const id = useArtIds('vine');
  return (
    <svg viewBox="-10 -10 180 430" className="panel-vine__svg" aria-hidden>
      <defs>
        {TONES.map(([base, mid, tip], t) => (
          <g key={t}>
            <linearGradient id={id(`hi${t}`)} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={mid} />
              <stop offset="1" stopColor={tip} />
            </linearGradient>
            <linearGradient id={id(`lo${t}`)} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={base} />
              <stop offset="1" stopColor={mid} />
            </linearGradient>
          </g>
        ))}
        <radialGradient id={id('pomBody')} cx="0.34" cy="0.3" r="0.78">
          <stop offset="0" stopColor="#ee7c5c" />
          <stop offset="0.32" stopColor="#c5402a" />
          <stop offset="0.72" stopColor="#8e1f14" />
          <stop offset="1" stopColor="#4f0d08" />
        </radialGradient>
        <clipPath id={id('pomClip')}>
          <ellipse cx="0" cy="0" rx="20" ry="18.8" />
        </clipPath>
        <linearGradient id={id('bark')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b2617" />
          <stop offset="1" stopColor="#6a4a2e" />
        </linearGradient>
        <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* whole branch sways from the corner it grows out of */}
      <g className="vine-sway">
        {/* stems, tapering, with a lit edge */}
        <g fill="none" strokeLinecap="round">
          <path d="M-12 -8 C30 18 34 80 26 140 C18 206 42 250 30 318 C24 362 32 392 38 418" stroke={`url(#${id('bark')})`} strokeWidth="5" />
          <path d="M-11 -9 C31 17 35 79 27 139" stroke="#a07a52" strokeWidth="1" opacity="0.45" />
          <path d="M28 58 C52 46 76 38 102 44" stroke="#4a3220" strokeWidth="2.6" />
          <path d="M24 174 C48 182 70 192 90 210" stroke="#4a3220" strokeWidth="2.3" />
          <path d="M30 290 C44 296 58 302 70 316" stroke="#4a3220" strokeWidth="1.9" />
        </g>

        {LEAVES.map(([x, y, a, s, t, turn], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s * 1.2} ${s * 1.2 * turn})`}>
            <g className="vine-leaf" style={{ animationDelay: `${(i % 7) * 70}ms`, animationDuration: `${3400 + (i % 5) * 160}ms` }}>
              <LeafShape tone={t} id={id} />
            </g>
          </g>
        ))}

        {/* fruit hangs from the side shoots and swings on its stalk */}
        <g transform="translate(102 44)">
          <g className="vine-fruit">
            <Pomegranate r={17} id={id} />
          </g>
        </g>
        <g transform="translate(90 210)">
          <g className="vine-fruit" style={{ animationDelay: '180ms', animationDuration: '3900ms' }}>
            <Pomegranate r={13} id={id} />
          </g>
        </g>

        {/* flower buds */}
        {[
          [70, 316, 4.2],
          [50, 24, 3.4],
          [10, 132, 3],
          [56, 200, 2.8],
          [18, 328, 2.8],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d={`M0 ${r * 0.6} L${-r * 0.5} ${r * 1.5} M0 ${r * 0.6} L${r * 0.5} ${r * 1.5}`} stroke="#6a3a22" strokeWidth="0.8" />
            <ellipse rx={r * 0.8} ry={r} fill="#c13a26" />
            <path d={`M${-r * 0.8} ${-r * 0.2} L0 ${-r * 1.4} L${r * 0.8} ${-r * 0.2}`} fill="#9a2a18" />
            <ellipse cx={-r * 0.28} cy={-r * 0.2} rx={r * 0.22} ry={r * 0.32} fill="#f4a088" opacity="0.6" />
          </g>
        ))}
      </g>
    </svg>
  );
});

const GUST_MS = 4300;
const COOLDOWN_MS = 1200;

export function PanelVines() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    const grid = host?.parentElement?.querySelector('.spec-grid');
    if (!host) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let busyUntil = 0;
    let timer = 0;

    const gust = () => {
      if (reduce.matches) return;
      const now = performance.now();
      if (now < busyUntil) return;
      busyUntil = now + GUST_MS + COOLDOWN_MS;
      host.classList.remove('is-breezing');
      void host.offsetWidth; // restart the animations
      host.classList.add('is-breezing');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => host.classList.remove('is-breezing'), GUST_MS);
    };

    const first = window.setTimeout(gust, 700);
    grid?.addEventListener('pointerenter', gust);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(timer);
      grid?.removeEventListener('pointerenter', gust);
    };
  }, []);

  return (
    <div className="panel-vines" ref={ref}>
      <div className="panel-vine panel-vine--left">
        <Branch />
      </div>
      <div className="panel-vine panel-vine--right">
        <Branch />
      </div>
    </div>
  );
}

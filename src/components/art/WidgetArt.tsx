import { memo } from 'react';
import { PaintFilter, Snow, firPath, lancet, rng, useArtIds } from './shared';

/* ───────────────────────── Lantern on a stack of books ───────────────────────── */
export const LanternBooks = memo(function LanternBooks() {
  const id = useArtIds('lan');
  return (
    <svg viewBox="0 0 240 220" className="art-svg" aria-hidden>
      <defs>
        <radialGradient id={id('glow')} cx="0.5" cy="0.42" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#f1a54a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#f1a54a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('glass')} cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.5" stopColor="#ffc965" />
          <stop offset="1" stopColor="#c87a2a" />
        </radialGradient>
        <linearGradient id={id('bronze')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a3a18" />
          <stop offset="0.4" stopColor="#d6a85a" />
          <stop offset="1" stopColor="#6a4520" />
        </linearGradient>
        <PaintFilter id={id('p')} scale={2.5} freq={0.05} />
      </defs>
      <circle className="lantern-glow" cx="122" cy="88" r="118" fill={`url(#${id('glow')})`} />
      <g filter={`url(#${id('p')})`}>
        {/* bottom book */}
        <rect x="6" y="172" width="206" height="34" rx="4" fill="#5a2216" />
        <rect x="6" y="170" width="206" height="5" rx="2" fill="#efe0c0" />
        {[30, 52, 176, 194].map((x) => (
          <rect key={x} x={x} y="176" width="5" height="30" fill="#c9a24a" />
        ))}
        <rect x="80" y="182" width="64" height="14" rx="2" fill="none" stroke="#c9a24a" strokeWidth="1.6" />
        {/* middle book */}
        <rect x="26" y="146" width="168" height="27" rx="4" fill="#294433" />
        <rect x="26" y="144" width="168" height="5" rx="2" fill="#f2e6c9" />
        {[44, 62, 160].map((x) => (
          <rect key={x} x={x} y="150" width="4" height="22" fill="#c9a24a" />
        ))}
        {/* top book */}
        <rect x="14" y="124" width="160" height="22" rx="4" fill="#7a4524" transform="rotate(-2 94 135)" />
        <rect x="14" y="122" width="160" height="4" rx="2" fill="#f5ead2" transform="rotate(-2 94 124)" />
        {/* lantern */}
        <rect x="90" y="112" width="64" height="12" rx="3" fill={`url(#${id('bronze')})`} />
        <path d="M96 112 L100 52 L144 52 L148 112 Z" fill={`url(#${id('glass')})`} />
        <g stroke="#6a4520" strokeWidth="3">
          <line x1="122" y1="52" x2="122" y2="112" />
          <line x1="100" y1="52" x2="97" y2="112" />
          <line x1="144" y1="52" x2="147" y2="112" />
        </g>
        <path d="M92 52 L152 52 L146 40 L98 40 Z" fill={`url(#${id('bronze')})`} />
        <path d="M100 40 Q122 16 144 40 Z" fill={`url(#${id('bronze')})`} />
        <circle cx="122" cy="16" r="9" fill="none" stroke="#b88a42" strokeWidth="3" />
        <rect x="119" y="22" width="6" height="8" fill="#b88a42" />
      </g>
      {/* flame */}
      <g className="lantern-flame">
        <path d="M122 70 C130 82 128 94 122 98 C116 94 114 82 122 70 Z" fill="#ffb73d" />
        <path d="M122 80 C126 88 125 94 122 96 C119 94 118 88 122 80 Z" fill="#fff8de" />
      </g>
      <rect x="120" y="96" width="4" height="12" fill="#f3e3c0" />
    </svg>
  );
});

/* ───────────────────────── Snowy village for the streak card ───────────────────────── */
export const SnowyVillage = memo(function SnowyVillage() {
  const id = useArtIds('vil');
  const houses = [
    { x: 150, w: 46, h: 40, roof: 30 },
    { x: 196, w: 38, h: 54, roof: 34 },
    { x: 236, w: 52, h: 36, roof: 28 },
  ];
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMaxYMax slice" className="art-svg" aria-hidden>
      <defs>
        <radialGradient id={id('glow')}>
          <stop offset="0" stopColor="#ffd77a" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
        <PaintFilter id={id('p')} scale={2.5} freq={0.05} />
      </defs>
      <g filter={`url(#${id('p')})`}>
        <path d="M120 200 L120 150 Q200 120 320 136 L320 200 Z" fill="#3d706b" opacity="0.6" />
        {/* tower */}
        <rect x="268" y="74" width="26" height="90" fill="#2a5753" />
        <path d="M262 76 L281 20 L300 76 Z" fill="#1c3e3b" />
        <path d="M262 76 L281 20 L288 40 L272 76 Z" fill="#edf4f0" />
        <path d={lancet(275, 92, 12, 18)} fill="#f6cf74" />
        {houses.map((h, i) => (
          <g key={i}>
            <rect x={h.x} y={170 - h.h} width={h.w} height={h.h} fill={i === 1 ? '#335f5b' : '#2a5450'} />
            <path d={`M${h.x - 5} ${172 - h.h} L${h.x + h.w / 2} ${170 - h.h - h.roof} L${h.x + h.w + 5} ${172 - h.h} Z`} fill="#edf4f0" />
            <circle cx={h.x + h.w / 2} cy={170 - h.h / 2} r="16" fill={`url(#${id('glow')})`} />
            <rect x={h.x + h.w / 2 - 9} y={170 - h.h + 10} width="7" height="9" fill="#f6cf74" />
            <rect x={h.x + h.w / 2 + 2} y={170 - h.h + 10} width="7" height="9" fill="#f6cf74" />
          </g>
        ))}
        {[132, 300, 312].map((x, i) => (
          <g key={i}>
            <path d={firPath(x, 182, 54 + i * 6, 30, 4)} fill="#1f4542" />
            <path d={firPath(x - 2, 180, 50 + i * 6, 20, 4)} fill="#edf4f0" opacity="0.5" />
          </g>
        ))}
        <path d="M100 200 Q180 166 320 176 L320 200 Z" fill="#edf4f0" />
      </g>
      <Snow seed={14} count={60} width={320} height={200} minR={0.6} maxR={1.8} />
    </svg>
  );
});

/* ───────────────────────── Anatomical heart (Continue Studying) ───────────────────────── */
export const AnatomicalHeart = memo(function AnatomicalHeart() {
  const id = useArtIds('hrt');
  return (
    <svg viewBox="0 0 140 130" className="art-svg" aria-hidden>
      <defs>
        <radialGradient id={id('body')} cx="0.38" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#e2856f" />
          <stop offset="0.55" stopColor="#b8473d" />
          <stop offset="1" stopColor="#7a2422" />
        </radialGradient>
        <PaintFilter id={id('p')} scale={2} freq={0.06} />
      </defs>
      <rect width="140" height="130" fill="#ecdcbc" />
      <g filter={`url(#${id('p')})`}>
        {/* vine branches */}
        <g stroke="#6b4a2e" fill="none" strokeLinecap="round">
          <path d="M-4 120 Q20 96 26 66 Q30 40 18 14" strokeWidth="3" />
          <path d="M26 66 Q10 58 2 44" strokeWidth="2" />
          <path d="M144 118 Q122 100 120 74 Q118 50 132 28" strokeWidth="3" />
          <path d="M120 74 Q134 70 142 58" strokeWidth="2" />
        </g>
        {[[12, 40], [6, 52], [20, 20], [130, 34], [138, 60], [124, 52]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="5" ry="2.6" fill="#7d8f5a" transform={`rotate(${i * 40} ${x} ${y})`} />
        ))}
        {/* great vessels */}
        <path d="M74 42 Q72 18 90 16 Q104 16 102 36" stroke="#b5463d" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M82 18 L80 6 M90 16 L91 4 M98 20 L102 9" stroke="#b5463d" strokeWidth="5" strokeLinecap="round" />
        <path d="M60 46 Q52 30 42 24" stroke="#8b4a66" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M108 46 L112 22" stroke="#6f4a6c" strokeWidth="8" strokeLinecap="round" />
        {/* body */}
        <path d="M70 118 C50 108 30 86 32 62 C34 44 48 38 60 42 C66 34 80 34 86 40 C98 34 114 44 112 62 C110 88 90 108 70 118 Z" fill={`url(#${id('body')})`} />
        <path d="M44 58 C46 50 54 46 60 48" stroke="#f3b49c" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        {/* coronary vessels */}
        <g stroke="#f1d6b8" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.9">
          <path d="M80 46 Q72 70 76 104" />
          <path d="M76 66 Q64 70 56 84" />
          <path d="M77 82 Q88 86 94 96" />
          <path d="M86 50 Q100 58 104 74" />
        </g>
        <g stroke="#5a1a1a" strokeWidth="1" fill="none" opacity="0.5">
          <path d="M81 47 Q73 71 77 105" />
        </g>
      </g>
    </svg>
  );
});

/* ───────────────────────── Bottom band: study still life (it sits on the page's striped cotton) ───────────────────────── */
export const StudyStillLife = memo(function StudyStillLife() {
  const id = useArtIds('sl');
  const r = rng(33);
  const leaves = Array.from({ length: 16 }, () => ({
    x: r() * 1600,
    y: 30 + r() * 280,
    a: r() * 360,
    s: 0.7 + r() * 0.8,
    c: ['#d7802f', '#c25a22', '#e3a944', '#a8441c'][Math.floor(r() * 4)],
  }));
  return (
    <svg viewBox="0 0 1600 340" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A study still life: stacked textbooks, a stethoscope, a cup of tea and wrapped gifts on green striped cotton" className="art-svg">
      <defs>
        <filter id={id('sh')} x="-10%" y="-10%" width="125%" height="130%">
          <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="#10170f" floodOpacity="0.45" />
        </filter>
        <PaintFilter id={id('p')} scale={4} freq={0.025} />
      </defs>
      {/* the cloth itself is the page's .fabric background, so the still life sits on the same continuous cotton */}

      <g filter={`url(#${id('sh')})`}>
      <g filter={`url(#${id('p')})`}>
        {/* textbook stack */}
        <g transform="translate(30 132) rotate(-6)">
          <rect x="0" y="120" width="300" height="52" rx="6" fill="#7a4a24" />
          <rect x="0" y="116" width="300" height="8" rx="3" fill="#f0e3c4" />
          <rect x="24" y="76" width="262" height="44" rx="6" fill="#6e2018" />
          <rect x="24" y="72" width="262" height="7" rx="3" fill="#f3e8cf" />
          <rect x="10" y="36" width="250" height="40" rx="6" fill="#2a3f5c" />
          <rect x="10" y="32" width="250" height="7" rx="3" fill="#f5ecd6" />
          {[40, 70, 230, 250].map((x) => (
            <rect key={x} x={x} y="124" width="6" height="48" fill="#c9a24a" />
          ))}
          {[60, 84, 250].map((x) => (
            <rect key={x} x={x} y="80" width="5" height="40" fill="#c9a24a" />
          ))}
          <rect x="110" y="88" width="90" height="18" rx="2" fill="none" stroke="#c9a24a" strokeWidth="2" />
          <rect x="44" y="44" width="6" height="32" fill="#e6c987" />
        </g>

      </g>
      </g>

      {/* stethoscope */}
      <g transform="translate(-170 6)" filter={`url(#${id('sh')})`}>
      <g fill="none" strokeLinecap="round">
        <path d="M820 300 Q760 300 770 250 Q780 200 850 214 Q920 228 900 280 Q884 316 830 290" stroke="#2b2421" strokeWidth="9" />
        <path d="M820 300 Q760 300 770 250 Q780 200 850 214 Q920 228 900 280 Q884 316 830 290" stroke="#5a4a42" strokeWidth="2.5" />
        <path d="M850 214 Q870 160 920 150 M850 214 Q880 170 940 168" stroke="#c9c2b6" strokeWidth="4" />
        <circle cx="922" cy="149" r="5" fill="#2b2421" stroke="none" />
        <circle cx="942" cy="168" r="5" fill="#2b2421" stroke="none" />
      </g>
      <g transform="translate(830 290)">
        <circle r="20" fill="#d7d1c6" />
        <circle r="14" fill="#a8a196" />
        <circle r="9" fill="#ece7dd" />
      </g>
      </g>

      {/* teacup */}
      <g filter={`url(#${id('sh')})`}>
      <g transform="translate(430 250)" filter={`url(#${id('p')})`}>
        <ellipse cx="0" cy="56" rx="60" ry="14" fill="#e7dcc6" />
        <path d="M-38 0 L-30 50 Q0 62 30 50 L38 0 Z" fill="#efe3c8" />
        <path d="M38 12 q26 2 20 22 q-6 14 -24 10" stroke="#efe3c8" strokeWidth="8" fill="none" />
        <path d="M-36 30 Q0 40 36 30" stroke="#82262a" strokeWidth="5" fill="none" />
        <ellipse cx="0" cy="0" rx="38" ry="9" fill="#e9d9b8" />
        <ellipse cx="0" cy="2" rx="32" ry="6" fill="#8a4a24" />
        <path d="M-34 16 Q0 26 34 16" stroke="#c9a24a" strokeWidth="3" fill="none" />
      </g>
      </g>
      <g className="steam" stroke="#fff2d8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
        <path d="M420 234 q-10 -16 0 -32 q10 -16 0 -32" />
        <path d="M442 230 q-10 -16 0 -32 q10 -16 0 -32" />
      </g>

      {/* ribbon */}
      <path d="M560 340 Q640 290 720 316 Q820 346 900 330 M1180 20 Q1240 60 1220 110 Q1200 160 1260 190" stroke="#c9a24a" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.9" />

      {/* gifts */}
      <g filter={`url(#${id('sh')})`}>
      <g filter={`url(#${id('p')})`}>
        <g transform="translate(1390 160) rotate(6)">
          <rect x="0" y="0" width="150" height="130" rx="4" fill="#efe1c2" />
          <rect x="66" y="0" width="18" height="130" fill="#82262a" />
          <rect x="0" y="56" width="150" height="18" fill="#82262a" />
          <path d="M75 0 q-40 -40 -50 -10 q10 20 50 10 q40 -40 50 -10 q-10 20 -50 10" fill="#a8302f" />
        </g>
        <g transform="translate(1260 220) rotate(-8)">
          <rect x="0" y="0" width="120" height="100" rx="4" fill="#82262a" />
          <rect x="52" y="0" width="16" height="100" fill="#f3e3c0" />
          <rect x="0" y="40" width="120" height="16" fill="#f3e3c0" />
          <path d="M60 0 q-30 -30 -40 -8 q8 16 40 8 q30 -30 40 -8 q-8 16 -40 8" fill="#f3e3c0" />
        </g>
        <g transform="translate(1520 60) rotate(14)">
          <rect x="0" y="0" width="110" height="90" rx="4" fill="#c9a24a" />
          <rect x="46" y="0" width="16" height="90" fill="#82262a" />
          <rect x="0" y="36" width="110" height="16" fill="#82262a" />
        </g>
      </g>
      </g>

      {/* holly sprig */}
      <g transform="translate(380 60) rotate(-20)" filter={`url(#${id('sh')})`}>
        <path d="M0 0 q20 -14 40 0 q-6 10 -2 20 q-18 -6 -38 -2 q4 -10 0 -18z" fill="#2f5a2c" />
        <path d="M34 4 q24 -10 40 8 q-8 8 -6 18 q-16 -8 -36 -4 q4 -10 2 -22z" fill="#3e6e36" />
        <circle cx="36" cy="6" r="6" fill="#b3282d" />
        <circle cx="44" cy="12" r="5" fill="#c8383a" />
        <circle cx="30" cy="12" r="5" fill="#a52226" />
      </g>

      {/* leaves */}
      {leaves.map((l, i) => (
        <path
          key={i}
          transform={`translate(${l.x.toFixed(0)} ${l.y.toFixed(0)}) rotate(${l.a.toFixed(0)}) scale(${l.s.toFixed(2)})`}
          d="M0 -16 C8 -10 12 -2 8 6 C6 12 2 14 0 18 C-2 14 -6 12 -8 6 C-12 -2 -8 -10 0 -16 Z M0 -14 L0 18"
          fill={l.c}
          stroke="#7a3412"
          strokeWidth="0.8"
        />
      ))}
    </svg>
  );
});

/* ───────────────────────── Torn parchment backing for the quote ───────────────────────── */
export const TornParchment = memo(function TornParchment() {
  const id = useArtIds('tp');
  const r = rng(52);
  const pts: string[] = [];
  const W = 520;
  const H = 230;
  const step = 14;
  for (let x = 6; x <= W - 6; x += step) pts.push(`${x},${(6 + r() * 10).toFixed(1)}`);
  for (let y = 10; y <= H - 10; y += step) pts.push(`${(W - 4 - r() * 12).toFixed(1)},${y}`);
  for (let x = W - 6; x >= 6; x -= step) pts.push(`${x},${(H - 4 - r() * 12).toFixed(1)}`);
  for (let y = H - 10; y >= 10; y -= step) pts.push(`${(4 + r() * 10).toFixed(1)},${y}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="torn-svg" aria-hidden>
      <defs>
        <radialGradient id={id('g')} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#fbf2de" />
          <stop offset="0.7" stopColor="#efdfbd" />
          <stop offset="1" stopColor="#d6b98a" />
        </radialGradient>
        <filter id={id('s')} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#2a0e06" floodOpacity="0.45" />
        </filter>
      </defs>
      <polygon points={pts.join(' ')} fill={`url(#${id('g')})`} filter={`url(#${id('s')})`} />
      <polygon points={pts.join(' ')} fill="none" stroke="#c7a571" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
});

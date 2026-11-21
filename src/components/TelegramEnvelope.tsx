/*
  The Telegram contact on the cloth: an arched cream card, painted with flat folk flowers, rising
  out of an open burgundy envelope. Hovering or focusing it draws the card further out; choosing it
  opens the channel. A small handwritten note beside it points the way.
*/

const GOLD = '#c39a3e';
const BERRY = '#6e2a3a';
const LEAF = '#5b6a35';
const LILAC = '#9fa3cc';

/** a flat six-petal flower, the kind printed on old folk cards */
function Daisy({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.36} ry={r * 0.6} fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.3} fill="#f3ead6" />
      <circle r={r * 0.17} fill={GOLD} />
    </g>
  );
}

/** a lilac bloom with a fringed top on a short stem with one leaf */
function Bloom({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path d="M0 0 C2 10 2 18 -2 28" stroke={LEAF} strokeWidth="1.6" fill="none" />
      <path d="M-1 16 C-9 12 -13 16 -14 21 C-8 22 -3 20 -1 16Z" fill={LEAF} />
      <path d="M-7 -2 L-9 -12 L-5 -7 L-3 -14 L0 -7 L3 -14 L5 -7 L9 -12 L7 -2 C4 2 -4 2 -7 -2Z" fill={LILAC} />
      <path d="M-5 0 C-3 3 3 3 5 0 L4 3 C2 5 -2 5 -4 3Z" fill={GOLD} />
    </g>
  );
}

/** a four-point star */
function Star({ x, y, s }: { x: number; y: number; s: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2Z" fill={GOLD} />;
}

/** a leafy sprig following the arch: a curved stem with paired leaves */
function Sprig({ flip = false }: { flip?: boolean }) {
  const leaves = [
    [22, 118, -30],
    [20, 100, -40],
    [22, 82, -50],
    [28, 65, -60],
    [37, 50, -70],
    [48, 37, -80],
  ];
  return (
    <g transform={flip ? 'translate(180 0) scale(-1 1)' : undefined}>
      <path d="M26 130 C14 96 22 58 58 30" stroke={LEAF} strokeWidth="1.8" fill="none" />
      {leaves.map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <path d="M0 0 C4 -4 10 -4 13 0 C10 4 4 4 0 0Z" fill={LEAF} transform="rotate(-35)" />
          <path d="M0 0 C4 -4 10 -4 13 0 C10 4 4 4 0 0Z" fill={LEAF} transform="rotate(35) scale(1 -1)" />
        </g>
      ))}
    </g>
  );
}

function CardArt({ handle }: { handle: string }) {
  return (
    <svg className="tg-env__card-art" viewBox="0 0 180 250" aria-hidden>
      <path d="M2 250 V90 A88 88 0 0 1 178 90 V250 Z" fill="#f3ead6" stroke="rgba(110,42,58,0.25)" strokeWidth="1.5" />
      <Sprig />
      <Sprig flip />
      {/* the sun */}
      <g transform="translate(90 40)">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d="M-3 -11 Q0 -21 3 -11Z" fill={GOLD} transform={`rotate(${i * (360 / 14)})`} />
        ))}
        <circle r="11.5" fill={GOLD} />
        <path d="M-5 1 Q0 5 5 1" stroke="#f3ead6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="-4" cy="-3" r="1.2" fill="#f3ead6" />
        <circle cx="4" cy="-3" r="1.2" fill="#f3ead6" />
      </g>
      <text x="90" y="80" textAnchor="middle" className="tg-env__kicker">
        find us on
      </text>
      <text x="90" y="107" textAnchor="middle" className="tg-env__name">
        Telegram
      </text>
      <text x="90" y="126" textAnchor="middle" className="tg-env__handle">
        @{handle}
      </text>
      <Star x={30} y={146} s={0.8} />
      <Star x={150} y={146} s={0.8} />
      <Bloom x={48} y={150} />
      <Bloom x={132} y={150} flip />
      <Daisy x={90} y={160} r={13} fill={BERRY} />
      <Daisy x={30} y={196} r={11} fill={BERRY} />
      <Daisy x={150} y={196} r={11} fill={BERRY} />
      <path d="M50 214 C70 200 110 200 130 214" stroke={LEAF} strokeWidth="1.6" fill="none" />
    </svg>
  );
}

export function TelegramEnvelope({ handle }: { handle: string }) {
  return (
    <div className="tg-env-wrap">
      <p className="tg-note" aria-hidden>
        <span>for contact</span>
        <svg viewBox="0 0 70 40" className="tg-note__arrow">
          <path d="M4 10 C22 2 46 6 60 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M51 25 L61 28 L62 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
      <a className="tg-env" href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer" aria-label={`Contact us on Telegram, @${handle} (opens Telegram)`}>
        {/* the envelope's back and open flap, behind the card */}
        <svg className="tg-env__back" viewBox="0 0 240 230" aria-hidden>
          <path d="M6 92 L120 18 L234 92Z" fill="#5a2230" />
          <path d="M14 92 L120 26 L226 92Z" fill="#652a38" />
          <rect x="6" y="90" width="228" height="134" rx="5" fill="#4d1c28" />
        </svg>
        <span className="tg-env__card">
          <CardArt handle={handle} />
        </span>
        {/* the envelope's front pocket, over the card */}
        <svg className="tg-env__front" viewBox="0 0 240 230" aria-hidden>
          <path d="M6 116 L120 176 L234 116 V219 a5 5 0 0 1 -5 5 H11 a5 5 0 0 1 -5 -5Z" fill="#7a3242" />
          <path d="M6 224 L104 168 M234 224 L136 168" stroke="rgba(30,8,14,0.35)" strokeWidth="1.5" />
          <path d="M6 116 L120 176 L234 116" fill="none" stroke="rgba(255,230,200,0.18)" strokeWidth="1.5" />
          <g transform="translate(120 176)">
            <circle r="14" fill={GOLD} />
            <circle r="11" fill="none" stroke="#a37c2c" strokeWidth="1.2" />
            <path d="M0 -7 L1.6 -1.6 L7 0 L1.6 1.6 L0 7 L-1.6 1.6 L-7 0 L-1.6 -1.6Z" fill="#f6e7c2" />
          </g>
        </svg>
      </a>
    </div>
  );
}

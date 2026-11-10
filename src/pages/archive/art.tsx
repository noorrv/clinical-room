import { memo } from 'react';

/*
  Original illustrations for the doctor archives, drawn in the spirit of a vintage illustrated
  presentation: soft lemons and blossoms, periwinkle ribbons, and gilt medical medallions.
*/

const INK = '#4c4a38';
const LEAF = '#4f5d3c';
const LEAF_LIGHT = '#6f7d4f';
const LEMON = '#f2bb4c';
const LEMON_DEEP = '#d99528';
const LEMON_LIGHT = '#fbe08a';
const PETAL = '#fff8ea';
const RIBBON = '#7486bd';
const RIBBON_DEEP = '#55669e';
const GOLD = '#c9923e';
const GOLD_DEEP = '#8f5d24';
const GOLD_LIGHT = '#f1cf86';

function Lemon({ x, y, a, s = 1 }: { x: number; y: number; a: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M-30 0 C-28 -19 -9 -24 4 -22 C21 -20 30 -9 32 0 C30 9 21 20 4 22 C-9 24 -28 19 -30 0 Z" fill={LEMON} stroke={LEMON_DEEP} strokeWidth="1.4" />
      <path d="M32 0 l6 -2 l-2 5 z" fill={LEMON_DEEP} />
      <ellipse cx="-6" cy="-9" rx="12" ry="5" fill={LEMON_LIGHT} opacity="0.75" />
      {[-14, -4, 6, 14].map((d) => (
        <circle key={d} cx={d} cy={6 + (d % 3)} r="0.9" fill={LEMON_DEEP} opacity="0.5" />
      ))}
    </g>
  );
}

function Leaf({ x, y, a, l = 44 }: { x: number; y: number; a: number; l?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={`M0 0 C${l * 0.3} ${-l * 0.32} ${l * 0.75} ${-l * 0.3} ${l} 0 C${l * 0.75} ${l * 0.3} ${l * 0.3} ${l * 0.32} 0 0 Z`} fill={LEAF} />
      <path d={`M2 0 L${l - 3} 0`} stroke={LEAF_LIGHT} strokeWidth="1.2" />
    </g>
  );
}

function Blossom({ x, y, r = 16, a = 0 }: { x: number; y: number; r?: number; a?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      {[0, 72, 144, 216, 288].map((p) => (
        <path key={p} transform={`rotate(${p})`} d={`M0 0 C${-r * 0.55} ${-r * 0.35} ${-r * 0.5} ${-r * 1.05} 0 ${-r * 1.1} C${r * 0.5} ${-r * 1.05} ${r * 0.55} ${-r * 0.35} 0 0 Z`} fill={PETAL} stroke="#d8cdaa" strokeWidth="1" />
      ))}
      <circle r={r * 0.22} fill={LEMON_DEEP} />
      {[0, 60, 120, 180, 240, 300].map((p) => (
        <circle key={p} cx={Math.cos((p * Math.PI) / 180) * r * 0.32} cy={Math.sin((p * Math.PI) / 180) * r * 0.32} r="1.2" fill="#a86f2b" />
      ))}
    </g>
  );
}

export function Star({ size = 14, color = '#c27a3e', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} className={className} aria-hidden>
      <path d="M0 -9 L2 -2.5 L9 -2 L3.5 2 L5.5 9 L0 5 L-5.5 9 L-3.5 2 L-9 -2 L-2 -2.5 Z" fill={color} />
    </svg>
  );
}

/** The large sprig beside the table of contents. */
export const LemonSprig = memo(function LemonSprig() {
  return (
    <svg viewBox="0 0 320 340" className="da-art" aria-hidden>
      <circle cx="170" cy="150" r="104" fill={LEMON_LIGHT} opacity="0.75" />
      <circle cx="62" cy="64" r="22" fill={LEMON_LIGHT} opacity="0.75" />
      <path d="M162 20 C168 70 160 110 150 160" stroke={LEAF} strokeWidth="5" fill="none" strokeLinecap="round" />
      <Leaf x={152} y={150} a={150} l={66} />
      <Leaf x={156} y={128} a={20} l={70} />
      <Leaf x={150} y={176} a={-160} l={58} />
      <Leaf x={160} y={96} a={-30} l={52} />
      <Blossom x={118} y={62} r={26} a={8} />
      <Blossom x={176} y={44} r={22} a={-20} />
      <Blossom x={210} y={92} r={20} a={30} />
      <Blossom x={96} y={112} r={18} a={-10} />
      <Lemon x={130} y={214} a={60} s={1.45} />
      <Lemon x={196} y={210} a={110} s={1.35} />
      <Lemon x={164} y={262} a={80} s={1.5} />
      <Blossom x={226} y={248} r={14} a={12} />
      <g transform="translate(46 196)">
        <path d="M0 -14 L4 -4 L14 -3 L6 3 L9 14 L0 8 L-9 14 L-6 3 L-14 -3 L-4 -4 Z" fill="#e8a94f" />
      </g>
      <g transform="translate(262 40) scale(0.7)">
        <path d="M0 -14 L4 -4 L14 -3 L6 3 L9 14 L0 8 L-9 14 L-6 3 L-14 -3 L-4 -4 Z" fill="#c27a3e" />
      </g>
      <g transform="translate(250 300) scale(0.6)">
        <path d="M0 -14 L4 -4 L14 -3 L6 3 L9 14 L0 8 L-9 14 L-6 3 L-14 -3 L-4 -4 Z" fill="#7e8aa8" />
      </g>
    </svg>
  );
});

/** A periwinkle ribbon bow with trailing tails, for frame corners. */
export function Bow({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 140 140" className={className} aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 52 C40 18 12 30 20 54 C26 72 52 66 70 52 Z" fill={RIBBON} stroke={RIBBON_DEEP} strokeWidth="2" />
        <path d="M70 52 C96 22 126 30 120 54 C114 72 88 66 70 52 Z" fill={RIBBON} stroke={RIBBON_DEEP} strokeWidth="2" />
        <path d="M66 56 C56 82 40 100 22 128 M76 56 C88 84 104 100 124 126" stroke={RIBBON} strokeWidth="11" />
        <path d="M66 56 C56 82 40 100 22 128 M76 56 C88 84 104 100 124 126" stroke={RIBBON_DEEP} strokeWidth="1.5" opacity="0.6" />
        <ellipse cx="71" cy="54" rx="9" ry="8" fill={RIBBON_DEEP} />
        <path d="M30 46 C38 52 48 54 60 52 M110 46 C102 52 92 54 80 52" stroke="#9eacd6" strokeWidth="2" />
      </g>
    </svg>
  );
}

/** Gilt oval locket with a caduceus, the archive's emblem. */
export function Locket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <circle cx="60" cy="12" r="8" fill="none" stroke={GOLD_DEEP} strokeWidth="4" />
      <ellipse cx="60" cy="82" rx="48" ry="60" fill={GOLD} stroke={GOLD_DEEP} strokeWidth="3" />
      <ellipse cx="60" cy="82" rx="40" ry="51" fill="none" stroke={GOLD_LIGHT} strokeWidth="2" strokeDasharray="2 4" />
      <ellipse cx="60" cy="82" rx="31" ry="41" fill="#b07a30" stroke={GOLD_DEEP} strokeWidth="2" />
      <g stroke={GOLD_LIGHT} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M60 50 V116" />
        <path d="M44 56 C52 52 56 60 60 58 C64 60 68 52 76 56" />
        <path d="M52 66 C66 72 66 80 52 86 C40 92 66 98 60 106" />
        <path d="M68 66 C54 72 54 80 68 86 C80 92 54 98 60 106" />
      </g>
      <circle cx="60" cy="48" r="3.4" fill={GOLD_LIGHT} />
    </svg>
  );
}

/** A stethoscope bell rendered like a porcelain bell with a blossom. */
export function StethoscopeBell({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={className} aria-hidden>
      <path d="M60 4 C56 14 56 22 60 28" stroke="#3f4a63" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M22 96 C22 52 36 30 60 30 C84 30 98 52 98 96 Z" fill="#8193c8" stroke={RIBBON_DEEP} strokeWidth="3" />
      <path d="M14 96 H106 C106 104 100 108 94 108 H26 C20 108 14 104 14 96 Z" fill="#6d7fb8" stroke={RIBBON_DEEP} strokeWidth="3" />
      <circle cx="60" cy="116" r="7" fill="#6d7fb8" stroke={RIBBON_DEEP} strokeWidth="2.5" />
      <path d="M36 54 C40 46 46 42 52 40" stroke="#b8c4e6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Blossom x={60} y={70} r={15} />
      <Leaf x={44} y={78} a={150} l={18} />
      <Leaf x={76} y={78} a={30} l={18} />
    </svg>
  );
}

/** An apothecary bottle with a paper label. */
export function Bottle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 140" className={className} aria-hidden>
      <rect x="38" y="6" width="24" height="16" rx="3" fill="#8a5a33" stroke={INK} strokeWidth="2" />
      <path d="M40 22 V36 C20 44 16 60 16 76 V118 C16 128 24 134 34 134 H66 C76 134 84 128 84 118 V76 C84 60 80 44 60 36 V22 Z" fill="#9db58f" stroke={INK} strokeWidth="2.5" opacity="0.95" />
      <path d="M26 70 C26 60 30 52 38 48" stroke="#d9e6cf" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="24" y="84" width="52" height="30" rx="3" fill="#fff6dd" stroke={INK} strokeWidth="1.5" />
      <path d="M32 94 H68 M32 102 H60" stroke={INK} strokeWidth="1.3" />
    </svg>
  );
}

/** A small anatomical heart medallion. */
export function HeartCharm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 120" className={className} aria-hidden>
      <path d="M44 22 C44 10 54 6 58 16 M62 18 C66 8 76 8 76 20" stroke="#7a2e2c" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M55 28 C30 14 8 32 14 58 C20 84 46 100 56 112 C66 100 92 84 98 58 C104 32 82 14 58 28 Z" fill="#c4554b" stroke="#7a2e2c" strokeWidth="3" />
      <path d="M40 42 C34 52 36 66 46 76 M70 40 C76 54 74 70 62 84" stroke="#e08a7c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M56 30 C52 50 58 70 54 96" stroke="#8e3430" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function SafetyPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} aria-hidden>
      <path d="M14 20 C14 10 24 8 30 14 L104 14 C112 14 114 26 104 26 L30 26 C24 32 14 30 14 20 Z" fill="none" stroke="#a5682f" strokeWidth="3.5" />
      <path d="M86 10 H112 C118 10 118 30 112 30 H86 Z" fill="#c98a45" stroke="#7c4a1e" strokeWidth="2" />
      <circle cx="22" cy="20" r="4" fill="none" stroke="#a5682f" strokeWidth="3" />
    </svg>
  );
}

/** Seal shown on a finished topic. */
export function CheckSeal({ className, label = 'Completed' }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={label}>
      <path d="M24 2 L29 7 L36 5 L38 12 L45 15 L42 22 L46 28 L40 32 L40 40 L32 40 L28 46 L22 42 L15 45 L12 38 L5 36 L7 29 L2 24 L7 18 L5 11 L12 9 L15 3 L22 6 Z" fill="#7d8f5c" />
      <path d="M15 24 L21 30 L33 18" stroke="#fff8ea" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Medallions used for topic panels, cycling through the set. */
export const CHARMS = [Locket, StethoscopeBell, Bottle, HeartCharm] as const;

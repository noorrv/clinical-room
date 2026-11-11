import { memo } from 'react';

/*
  Original illustrations for the doctor archives, drawn in the spirit of a vintage illustrated
  presentation: soft lemons and blossoms, periwinkle ribbons, and gilt medical medallions.
*/

const INK = '#4c4a38';
const LINE = '#2e3c6b'; // the navy ink of the hand-drawn lemon art
const LEAF = '#7f8c55';
const LEMON_LIGHT = '#fbe49c';
const PETAL = '#fffbf1';
const RIBBON_DEEP = '#55669e';
const GOLD = '#c9923e';
const GOLD_DEEP = '#8f5d24';
const GOLD_LIGHT = '#f1cf86';

/** A hand-drawn olive leaf: colour printed a touch off the navy line, with a midrib. */
function Leaf({ x, y, a, l = 44 }: { x: number; y: number; a: number; l?: number }) {
  const shape = `M0 0 C${l * 0.3} ${-l * 0.26} ${l * 0.72} ${-l * 0.24} ${l} 0 C${l * 0.72} ${l * 0.24} ${l * 0.3} ${l * 0.26} 0 0 Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={shape} fill={LEAF} transform={`translate(${l * 0.03} ${l * 0.03})`} />
      <path d={shape} fill="none" stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />
      <path d={`M1 0 L${l - 3} 0`} stroke={LINE} strokeWidth="0.8" />
    </g>
  );
}

/** A five-petal citrus blossom in white with navy linework. */
function Blossom({ x, y, r = 16, a = 0 }: { x: number; y: number; r?: number; a?: number }) {
  const petal = `M0 0 C${-r * 0.5} ${-r * 0.22} ${-r * 0.42} ${-r * 0.86} ${r * 0.04} ${-r} C${r * 0.4} ${-r * 0.84} ${r * 0.48} ${-r * 0.22} 0 0 Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      {[0, 72, 144, 216, 288].map((p) => (
        <path key={p} transform={`rotate(${p})`} d={petal} fill={PETAL} stroke={LINE} strokeWidth="1.1" strokeLinejoin="round" />
      ))}
      <circle r={r * 0.2} fill={LEMON_LIGHT} stroke={LINE} strokeWidth="0.9" />
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

/** The large hand-drawn lemon sprig beside the table of contents (public/textures/archive-sprig.svg). */
export const LemonSprig = memo(function LemonSprig() {
  return <img src="/textures/archive-sprig.svg" className="da-art" alt="" width={300} height={340} decoding="async" />;
});

/**
 * A hand-drawn ribbon bow in ink line: two loops drawn as fine double lines over a light wash of the
 * ribbon colour, a small knot and long tails that twist once and end in notched cuts. Drawn in a
 * 140 × 140 box with the knot near (71, 47); `ink`, `wash` and `paper` take any CSS colour.
 */
export function InkBowArt({ ink, wash, paper }: { ink: string; wash: string; paper: string }) {
  const ribbon = ['M66 44 C58 34 44 20 28 16 C16 13 8 22 12 32 C16 42 34 48 52 49 C58 49 63 48 66 47 Z', 'M75 44 C84 30 100 18 116 17 C129 16 134 27 128 35 C122 43 104 47 88 48 C82 48 78 47 75 46 Z', 'M66 50 C60 62 48 70 44 84 C40 98 54 104 48 118 C44 128 36 132 30 138 L38 139 C44 134 52 128 55 120 C60 106 48 99 52 86 C56 74 66 66 70 52 Z', 'M75 50 C84 62 98 70 100 84 C102 98 88 106 94 120 C98 128 106 132 113 137 L120 133 C112 130 104 126 101 118 C96 104 110 96 108 82 C106 68 90 60 79 49 Z'];
  return (
    <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
      {/* paper under the ribbon so the line reads over a patterned frame, then a light wash of colour */}
      <g fill={paper} stroke="none">
        {ribbon.map((d) => <path key={d} d={d} />)}
      </g>
      <g fill={wash} stroke="none" opacity="0.2">
        {ribbon.map((d) => <path key={d} d={d} />)}
      </g>
      {/* left loop: outer edge, a broken inner edge, the crease where it turns, and a smaller loop tucked under */}
      <path d="M66 44 C58 34 44 20 28 16 C16 13 8 22 12 32 C16 42 34 48 52 49 C58 49 63 48 66 47" strokeWidth="2" />
      <path d="M64 42 C56 34 42 25 30 23 C22 22 19 28 22 33" strokeWidth="1.1" />
      <path d="M14 24 C19 27 21 31 20 36" strokeWidth="1" />
      <path d="M66 46 C56 41 41 39 33 44 C28 48 33 54 45 53 C54 52 61 50 66 48" strokeWidth="1.4" />
      {/* right loop, drawn a little differently, as a hand would */}
      <path d="M75 44 C84 30 100 18 116 17 C129 16 134 27 128 35 C122 43 104 47 88 48 C82 48 78 47 75 46" strokeWidth="2" />
      <path d="M77 42 C86 33 100 25 112 24 C120 24 123 30 119 35" strokeWidth="1.1" />
      <path d="M128 22 C124 26 122 30 124 35" strokeWidth="1" />
      <path d="M75 46 C86 41 100 41 106 47 C110 52 103 57 92 55 C84 53 79 50 75 48" strokeWidth="1.4" />
      {/* long S-curved tails with notched ends */}
      <path d="M66 50 C60 62 48 70 44 84 C40 98 54 104 48 118 C44 128 36 132 30 138" strokeWidth="1.9" />
      <path d="M70 52 C66 66 56 74 52 86 C48 99 60 106 55 120 C52 128 44 134 38 139" strokeWidth="1.1" />
      <path d="M30 138 L35 134 L38 139" strokeWidth="1.2" />
      <path d="M75 50 C84 62 98 70 100 84 C102 98 88 106 94 120 C98 128 106 132 113 137" strokeWidth="1.9" />
      <path d="M79 49 C90 60 106 68 108 82 C110 96 96 104 101 118 C104 126 112 130 120 133" strokeWidth="1.1" />
      <path d="M113 137 L115 131 L120 133" strokeWidth="1.2" />
      {/* a small knot */}
      <path d="M65 42 C68 40 73 40 75 43 C77 47 75 51 71 52 C67 53 64 50 64 47 C64 45 64 43 65 42 Z" fill={paper} strokeWidth="1.8" />
      <path d="M67 45 C69 46 72 46 74 45" strokeWidth="0.9" />
    </g>
  );
}

/** The ink-line bow for frame corners, in the doctor's ribbon colours. */
export function Bow({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 140 140" className={className} aria-hidden style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <InkBowArt ink="var(--da-bow-deep, #55669e)" wash="var(--da-bow, #7486bd)" paper="var(--da-cream, #fdf3d9)" />
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

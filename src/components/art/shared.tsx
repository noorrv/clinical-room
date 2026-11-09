import { useId } from 'react';

/** Deterministic pseudo-random sequence so scattered details render identically every time. */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Unique, url()-safe ids for gradients and filters inside one SVG. */
export function useArtIds(prefix: string) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name: string) => `${prefix}${raw}${name}`;
}

/**
 * Hand-painted edge: displaces shapes slightly with low-frequency noise
 * so vector edges read as brushed rather than machine-cut.
 */
export function PaintFilter({ id, scale = 3, freq = 0.03, seed = 2 }: { id: string; scale?: number; freq?: number; seed?: number }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}

/** Pointed Gothic arch path, bottom-left origin at (x, y + h). */
export function lancet(x: number, y: number, w: number, h: number) {
  return `M${x} ${y + h} V${y + w * 0.75} Q${x} ${y + w * 0.12} ${x + w / 2} ${y} Q${x + w} ${y + w * 0.12} ${x + w} ${y + w * 0.75} V${y + h} Z`;
}

/** Layered fir tree with ragged tiers. */
export function firPath(cx: number, baseY: number, h: number, w: number, tiers = 5) {
  let d = '';
  const tierH = h / tiers;
  for (let i = 0; i < tiers; i++) {
    const top = baseY - h + i * tierH * 0.82;
    const bottom = top + tierH * 1.35;
    const half = (w / 2) * ((i + 1.2) / (tiers + 0.2));
    const jag = half / 3;
    d += `M${cx} ${top} L${cx - half * 0.55} ${bottom - tierH * 0.45} L${cx - half * 0.42} ${bottom - tierH * 0.5} L${cx - half} ${bottom} L${cx - half + jag} ${bottom - 5} L${cx - jag * 0.6} ${bottom + 2} L${cx} ${bottom - 4} L${cx + jag * 0.6} ${bottom + 2} L${cx + half - jag} ${bottom - 5} L${cx + half} ${bottom} L${cx + half * 0.42} ${bottom - tierH * 0.5} L${cx + half * 0.55} ${bottom - tierH * 0.45} Z `;
  }
  return d;
}

/** Scatter of snowflakes or motes. */
export function Snow({
  seed,
  count,
  width,
  height,
  minR = 0.6,
  maxR = 2.2,
  color = '#ffffff',
  opacity = [0.35, 0.95],
  y0 = 0,
}: {
  seed: number;
  count: number;
  width: number;
  height: number;
  minR?: number;
  maxR?: number;
  color?: string;
  opacity?: [number, number];
  y0?: number;
}) {
  const r = rng(seed);
  const flakes = Array.from({ length: count }, () => ({
    x: r() * width,
    y: y0 + r() * height,
    r: minR + r() * (maxR - minR),
    o: opacity[0] + r() * (opacity[1] - opacity[0]),
  }));
  return (
    <g fill={color}>
      {flakes.map((f, i) => (
        <circle key={i} cx={f.x.toFixed(1)} cy={f.y.toFixed(1)} r={f.r.toFixed(2)} opacity={f.o.toFixed(2)} />
      ))}
    </g>
  );
}

import type { CSSProperties } from 'react';

/*
  Each examiner's archive gets its own vintage palette and painted pattern. The palette is picked
  from the doctor's id, so a doctor always keeps the same look and no database column is needed.
  Patterns are drawn as small SVG tiles (painted edges, watercolour mottling, paper or linen grain)
  and repeated behind the page.
*/

export type PatternKind = 'wash' | 'ticking' | 'check' | 'gingham';

export interface Palette {
  id: string;
  name: string;
  pattern: PatternKind;
  ground: string; // the paper colour between stripes / checks
  paint: string; // the main painted colour
  paint2: string; // secondary line colour (ticking) or deeper wash
  ink: string; // headings, links
  muted: string; // secondary text
  kicker: string; // small capitals
  accent: string; // number discs, pager, buttons
  accentDeep: string; // disc rims, reviewed borders
  bar: string; // progress fill
  track: string; // progress track
  bow: string; // ribbon bows
  bowDeep: string;
}

export const PALETTES: Palette[] = [
  {
    id: 'amalfi',
    name: 'Amalfi wash',
    pattern: 'wash',
    ground: '#faf2e2',
    paint: '#8eaac6',
    paint2: '#6f8fb0',
    ink: '#2e3c6b',
    muted: '#56607e',
    kicker: '#8a4f2e',
    accent: '#f6d77a',
    accentDeep: '#c9923e',
    bar: '#f2bb4c',
    track: '#dfe6ef',
    bow: '#7486bd',
    bowDeep: '#55669e',
  },
  {
    id: 'garden',
    name: 'Garden party',
    pattern: 'wash',
    ground: '#f4cfd3',
    paint: '#7d9a5e',
    paint2: '#647f48',
    ink: '#3f5130',
    muted: '#5f6a4c',
    kicker: '#a04f5a',
    accent: '#f6d77a',
    accentDeep: '#b98a3a',
    bar: '#e9a3ab',
    track: '#e7ecd9',
    bow: '#d98c97',
    bowDeep: '#b0606d',
  },
  {
    id: 'ticking',
    name: 'Powder ticking',
    pattern: 'ticking',
    ground: '#c3d6e6',
    paint: '#fbe6b8',
    paint2: '#93aec2',
    ink: '#2f4a63',
    muted: '#58697a',
    kicker: '#9a6a2a',
    accent: '#fbe6b8',
    accentDeep: '#c79a4a',
    bar: '#e9b95a',
    track: '#dbe6ef',
    bow: '#7f9cbc',
    bowDeep: '#5c7a9b',
  },
  {
    id: 'parlour',
    name: 'Parlour check',
    pattern: 'check',
    ground: '#fbf2db',
    paint: '#b9cbd9',
    paint2: '#a3b8c9',
    ink: '#35506b',
    muted: '#5d6b78',
    kicker: '#9a5b34',
    accent: '#f3dc9a',
    accentDeep: '#c4954a',
    bar: '#e8b75a',
    track: '#e2e9ef',
    bow: '#8ea6c2',
    bowDeep: '#66809f',
  },
  {
    id: 'picnic',
    name: 'Picnic gingham',
    pattern: 'gingham',
    ground: '#f6f1e6',
    paint: '#7f9ebf',
    paint2: '#7f9ebf',
    ink: '#2f4866',
    muted: '#596779',
    kicker: '#8a4f2e',
    accent: '#f6d77a',
    accentDeep: '#c9923e',
    bar: '#f2bb4c',
    track: '#e1e8f0',
    bow: '#7486bd',
    bowDeep: '#55669e',
  },
  {
    id: 'terracotta',
    name: 'Terracotta check',
    pattern: 'check',
    ground: '#efe0c0',
    paint: '#d08a6f',
    paint2: '#c0745a',
    ink: '#4a2f22',
    muted: '#6e5646',
    kicker: '#a3502f',
    accent: '#ead5a6',
    accentDeep: '#b0705a',
    bar: '#c0624a',
    track: '#ece2cf',
    bow: '#7a8a6a',
    bowDeep: '#59684b',
  },
  {
    id: 'harvest',
    name: 'Harvest stripe',
    pattern: 'wash',
    ground: '#f4ead2',
    paint: '#e2a73c',
    paint2: '#c98a22',
    ink: '#5c3310',
    muted: '#76583c',
    kicker: '#a35c1a',
    accent: '#f5dfae',
    accentDeep: '#a35c1a',
    bar: '#c8450a',
    track: '#efe4cc',
    bow: '#a35c1a',
    bowDeep: '#7a4210',
  },
  {
    id: 'olive',
    name: 'Olive grove gingham',
    pattern: 'gingham',
    ground: '#f2ead9',
    paint: '#7f8a55',
    paint2: '#7f8a55',
    ink: '#3e4627',
    muted: '#646a4d',
    kicker: '#a06040',
    accent: '#f1d98f',
    accentDeep: '#b88a3a',
    bar: '#b85a28',
    track: '#e8e6d3',
    bow: '#b85a28',
    bowDeep: '#8a3f1a',
  },
  {
    id: 'sage',
    name: 'Sage ticking',
    pattern: 'ticking',
    ground: '#cdd8bd',
    paint: '#f5ead0',
    paint2: '#93a37a',
    ink: '#3d4a2f',
    muted: '#5e6750',
    kicker: '#946033',
    accent: '#f5e2a8',
    accentDeep: '#b88e45',
    bar: '#d9a441',
    track: '#e4e9d8',
    bow: '#c97e6a',
    bowDeep: '#a05a48',
  },
  {
    id: 'blush',
    name: 'Blush check',
    pattern: 'check',
    ground: '#fbf1e4',
    paint: '#e9b9b5',
    paint2: '#dca29e',
    ink: '#5a3a3a',
    muted: '#7a5d5a',
    kicker: '#9b5a4a',
    accent: '#f4dca0',
    accentDeep: '#c49a5a',
    bar: '#c97a6e',
    track: '#f1e2dc',
    bow: '#8aa07a',
    bowDeep: '#66805a',
  },
];

/*
  The same doctor always gets the same palette: a small stable hash of their id. The salt was
  chosen so the current examiners spread evenly over the palettes, with neighbours in a list
  rarely sharing one; doctors added later still get a fixed palette of their own.
*/
const SALT = '1921:';

export function paletteFor(doctorId: string): Palette {
  const key = SALT + doctorId;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return PALETTES[(h >>> 0) % PALETTES.length];
}

/* ───────────────────── painted pattern tiles ───────────────────── */

const W = 240;

/** Painted edges and watercolour blotches for whatever is drawn inside the group. */
const paint = (seed: number, wobble: number, blotch: number) => `
  <filter id="p" x="0" y="0" width="${W}" height="${W}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${wobble}" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="${seed + 5}" stitchTiles="stitch" result="m"/>
    <feColorMatrix in="m" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${blotch * 3} -${blotch * 1.25}" result="mw"/>
    <feComposite in="mw" in2="d" operator="in" result="mi"/>
    <feMerge><feMergeNode in="d"/><feMergeNode in="mi"/></feMerge>
  </filter>`;

/** Grain as a translucent speckle: noise turned into small dark flecks. */
const speckle = (seed: number, color: string, opacity: number) => `
  <filter id="s" x="0" y="0" width="${W}" height="${W}" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 1.45" result="a"/>
    <feFlood flood-color="${color}" flood-opacity="${opacity}"/>
    <feComposite in2="a" operator="in"/>
  </filter>`;

function tile(p: Palette): string {
  const { ground, paint: c1, paint2: c2 } = p;
  let defs = speckle(4, '#4a3a28', 0.16);
  let body = '';
  if (p.pattern === 'wash') {
    // wide painted stripes with soft wobbling edges, like watercolour or gouache on paper
    defs += paint(3, 7, 0.24);
    const stripes = [0, 60, 120, 180].map((x, i) => `<rect x="${x + 10}" y="-30" width="${i % 2 ? 34 : 32}" height="${W + 60}" fill="${c1}"/>`).join('');
    body = `<g filter="url(#p)">${stripes}</g>`;
  } else if (p.pattern === 'ticking') {
    // old mattress-ticking: cream bands each holding two fine painted lines
    defs += paint(7, 2.5, 0.18);
    const bands = [0, 80, 160]
      .map(
        (x) =>
          `<rect x="${x + 14}" y="-30" width="34" height="${W + 60}" fill="${c1}"/>` +
          `<rect x="${x + 22}" y="-30" width="5" height="${W + 60}" fill="${c2}"/>` +
          `<rect x="${x + 35}" y="-30" width="5" height="${W + 60}" fill="${c2}"/>`,
      )
      .join('');
    body = `<g filter="url(#p)">${bands}</g>`;
  } else if (p.pattern === 'check') {
    // large painted checks with hand-ruled edges
    defs += paint(11, 4, 0.18);
    const s = 60;
    let sq = '';
    for (let y = 0; y < W; y += s) for (let x = 0; x < W; x += s) if (((x + y) / s) % 2 === 0) sq += `<rect x="${x + 1}" y="${y + 1}" width="${s - 2}" height="${s - 2}" fill="${c1}"/>`;
    body = `<g filter="url(#p)">${sq}</g>`;
  } else {
    // woven gingham: translucent warp and weft bands cross into the darker squares, with a linen thread texture
    defs += paint(5, 1.5, 0.1);
    defs += `
      <filter id="w" x="0" y="0" width="${W}" height="${W}" filterUnits="userSpaceOnUse">
        <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed="9" stitchTiles="stitch" result="v"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.06 0.9" numOctaves="2" seed="10" stitchTiles="stitch" result="h"/>
        <feBlend in="v" in2="h" mode="multiply" result="vh"/>
        <feColorMatrix in="vh" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.3 0 0 0 0.85" result="threads"/>
        <feComposite in="threads" in2="SourceGraphic" operator="in" result="ti"/>
        <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="ti"/></feMerge>
      </filter>`;
    const s = 40;
    let bands = '';
    for (let i = 0; i < W; i += s * 2) {
      bands += `<rect x="${i}" y="0" width="${s}" height="${W}" fill="${c1}" fill-opacity="0.62"/>`;
      bands += `<rect x="0" y="${i}" width="${W}" height="${s}" fill="${c1}" fill-opacity="0.62"/>`;
    }
    body = `<g filter="url(#w)"><g filter="url(#p)">${bands}</g></g>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">` +
    `<defs>${defs}</defs>` +
    `<rect width="${W}" height="${W}" fill="${ground}"/>` +
    body +
    `<rect width="${W}" height="${W}" fill="#000" filter="url(#s)"/>` +
    `</svg>`
  );
}

const cache = new Map<string, string>();

/** The pattern tile as a CSS url(), cached per palette. */
export function patternUrl(p: Palette): string {
  let u = cache.get(p.id);
  if (!u) {
    u = `url("data:image/svg+xml,${encodeURIComponent(tile(p))}")`;
    cache.set(p.id, u);
  }
  return u;
}

/** The CSS custom properties that dress an archive page in a palette. */
export function paletteStyle(p: Palette): CSSProperties {
  return {
    '--da-ground': p.ground,
    '--da-pattern': patternUrl(p),
    '--da-olive': p.ink,
    '--da-olive-2': p.muted,
    '--da-brown': p.kicker,
    '--da-butter': p.accent,
    '--da-butter-2': p.accent,
    '--da-gold': p.accentDeep,
    '--da-lemon': p.bar,
    '--da-sage-2': p.track,
    '--da-ribbon': p.bowDeep,
    '--da-bow': p.bow,
    '--da-bow-deep': p.bowDeep,
  } as CSSProperties;
}

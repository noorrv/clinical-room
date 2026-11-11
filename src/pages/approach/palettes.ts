import type { CSSProperties } from 'react';
import type { Palette } from '../archive/palettes';

/*
  Colour palettes for the clinical approach pages, recorded exactly as supplied. Each approach
  takes one COMBINATION mixed from them (page ground, paper, ink and accent, plus a colour for
  each medical meaning), so approaches look related but no two neighbours look the same.

  Meanings, used for section panels, the contents list and coloured terms in the text:
    danger    emergencies, red flags          caution   warnings, key signs, "Important"
    info      investigations                  mech      mechanisms, pathophysiology
    calm      reassuring findings
  Text colours are the palette's own deep colours, or a palette colour darkened only as far as
  it needs to read on the paper (noted where that happens).
*/

export const SOURCE_PALETTES = {
  cherry: { cherry: '#943131', almond: '#d9bda6', seaFoam: '#bad2da' },
  lotus: { darkGreen: '#0a3323', moss: '#839958', beige: '#f7f4d5', rosyBrown: '#d3968c', midnightGreen: '#105666' },
  knit: { lightGold: '#f1d98f', smokeyRose: '#7f5b57' },
  meadow: {
    sand: '#e4cba9',
    skyBlue: '#7fc7cc',
    deepSea: '#092f33',
    moss: '#4b5b34',
    terracotta: '#af5031',
    cherryBlossom: '#fdaba5',
    redWine: '#980204',
    sunshine: '#ea8913',
  },
} as const;

const P = SOURCE_PALETTES;

export interface ApproachTheme {
  id: string;
  name: string;
  ground: string; // page background
  pattern: string; // the painted wash on the ground
  paper: string; // the reading page
  ink: string; // body text
  heading: string;
  muted: string;
  accent: string; // active tab, progress, buttons
  danger: string;
  info: string;
  mech: string;
  caution: string;
  calm: string;
}

export const APPROACH_THEMES: ApproachTheme[] = [
  {
    // the Meadow palette alone, every colour from it
    id: 'meadow',
    name: 'Meadow',
    ground: P.meadow.sand,
    pattern: P.meadow.skyBlue,
    paper: '#f8efe3', // sand, lightened for the reading page
    ink: P.meadow.deepSea,
    heading: P.meadow.deepSea,
    muted: P.meadow.moss,
    accent: P.meadow.terracotta,
    danger: P.meadow.redWine,
    info: '#2c6f78', // sky blue, deepened to read on paper
    mech: '#9d4f48', // cherry blossom, deepened to read on paper
    caution: '#9a5806', // sunshine, darkened to read on paper
    calm: P.meadow.moss,
  },
  {
    id: 'meadow-lotus',
    name: 'Meadow and lotus',
    ground: P.lotus.beige,
    pattern: P.meadow.sand,
    paper: '#fbf9ea', // beige, lifted
    ink: P.meadow.deepSea,
    heading: P.lotus.darkGreen,
    muted: P.meadow.moss,
    accent: P.meadow.terracotta,
    danger: P.meadow.redWine,
    info: P.lotus.midnightGreen,
    mech: P.knit.smokeyRose,
    caution: '#9a5806', // sunshine, darkened to read on paper
    calm: P.meadow.moss,
  },
  {
    id: 'cherry-seafoam',
    name: 'Cherry and sea foam',
    ground: '#edf3f5', // sea foam, lightened
    pattern: P.cherry.seaFoam,
    paper: '#fcf7f1', // almond, lightened
    ink: '#2e2422',
    heading: P.cherry.cherry,
    muted: P.knit.smokeyRose,
    accent: P.cherry.cherry,
    danger: P.cherry.cherry,
    info: P.meadow.deepSea,
    mech: P.knit.smokeyRose,
    caution: '#87670f', // light gold, darkened
    calm: P.meadow.moss,
  },
  {
    id: 'lotus-pond',
    name: 'Lotus pond',
    ground: P.lotus.beige,
    pattern: P.lotus.moss,
    paper: '#fbfaee',
    ink: P.lotus.darkGreen,
    heading: P.lotus.midnightGreen,
    muted: P.meadow.moss,
    accent: P.lotus.midnightGreen,
    danger: '#9a4a40', // rosy brown, deepened
    info: P.lotus.midnightGreen,
    mech: P.knit.smokeyRose,
    caution: '#87670f',
    calm: P.meadow.moss,
  },
  {
    id: 'knit-meadow',
    name: 'Knit stripe and meadow',
    ground: '#fbf4dc', // light gold, lightened
    pattern: P.knit.lightGold,
    paper: '#fffbef',
    ink: '#3e2c2a',
    heading: '#5e423f', // smokey rose, deepened
    muted: P.knit.smokeyRose,
    accent: P.meadow.terracotta,
    danger: P.meadow.redWine,
    info: '#2c6f78', // sky blue, deepened
    mech: P.knit.smokeyRose,
    caution: '#9a5806',
    calm: P.meadow.moss,
  },
];

/* ─────────────── page combinations: every page its own mix ───────────────

  The pages (topics, subject boards, approaches, questions, study views) each take one
  combination mixed from the four palettes: a light paper ground, the mid colour it is tinted
  from, and a deep pair for headings and accents. Eight grounds × ten deep pairs, interleaved so
  that page n and page n + 1 never share a ground or a pair, give forty distinct looks.
  Grounds are the palettes' light colours, lifted towards paper where they would be too strong
  to read on; the deep pairs are the palettes' own darks.
*/

interface Ground {
  name: string;
  ground: string;
  pattern: string;
}

interface Deep {
  name: string;
  heading: string;
  ink: string;
  accent: string;
  muted: string;
}

const GROUNDS: Ground[] = [
  { name: 'Beige', ground: P.lotus.beige, pattern: P.lotus.moss },
  { name: 'Sand', ground: '#ead6b8', pattern: P.meadow.sand }, // sand, lifted a little
  { name: 'Almond', ground: '#e6d2c0', pattern: P.cherry.almond }, // almond, lifted a little
  { name: 'Sea foam', ground: '#cfe0e5', pattern: P.cherry.seaFoam }, // sea foam, lifted a little
  { name: 'Light gold', ground: '#f4e2a8', pattern: P.knit.lightGold }, // light gold, lifted a little
  { name: 'Cherry blossom', ground: '#f6d2cb', pattern: P.meadow.cherryBlossom }, // blossom, lifted a little
  { name: 'Moss mist', ground: '#d9e0c3', pattern: P.lotus.moss }, // lotus moss, lifted
  { name: 'Sky', ground: '#c6e4e5', pattern: P.meadow.skyBlue }, // sky blue, lifted
];

const ROSY_DEEP = '#9a4a40'; // rosy brown, deepened to read on paper
const SUN_DEEP = '#9a5806'; // sunshine, darkened to read on paper

const DEEPS: Deep[] = [
  { name: 'deep sea and terracotta', heading: P.meadow.deepSea, ink: P.meadow.deepSea, accent: P.meadow.terracotta, muted: P.meadow.moss },
  { name: 'dark green and cherry', heading: P.lotus.darkGreen, ink: P.lotus.darkGreen, accent: P.cherry.cherry, muted: P.meadow.moss },
  { name: 'midnight green and rosy brown', heading: P.lotus.midnightGreen, ink: P.meadow.deepSea, accent: ROSY_DEEP, muted: P.knit.smokeyRose },
  { name: 'red wine and moss', heading: P.meadow.redWine, ink: '#2e2422', accent: P.meadow.moss, muted: P.knit.smokeyRose },
  { name: 'smokey rose and sunshine', heading: '#5e423f', ink: '#3e2c2a', accent: SUN_DEEP, muted: P.knit.smokeyRose },
  { name: 'cherry and midnight green', heading: P.cherry.cherry, ink: '#2e2422', accent: P.lotus.midnightGreen, muted: P.knit.smokeyRose },
  { name: 'moss and terracotta', heading: P.meadow.moss, ink: '#2b3320', accent: P.meadow.terracotta, muted: '#5f6a4c' },
  { name: 'deep sea and sunshine', heading: P.meadow.deepSea, ink: P.meadow.deepSea, accent: SUN_DEEP, muted: P.meadow.moss },
  { name: 'dark green and midnight green', heading: P.lotus.darkGreen, ink: P.lotus.darkGreen, accent: P.lotus.midnightGreen, muted: P.meadow.moss },
  { name: 'midnight green and cherry', heading: P.lotus.midnightGreen, ink: P.meadow.deepSea, accent: P.cherry.cherry, muted: P.meadow.moss },
];

/** Halfway from a colour towards warm white: the reading page laid on the ground. */
function lift(hex: string, by = 0.62): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number, to: number) => Math.round(((n >> shift) & 255) + (to - ((n >> shift) & 255)) * by);
  return `#${[ch(16, 255), ch(8, 253), ch(0, 246)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function mix(g: Ground, d: Deep, i: number): ApproachTheme {
  return {
    id: `page-${i}`,
    name: `${g.name} with ${d.name}`,
    ground: g.ground,
    pattern: g.pattern,
    paper: lift(g.ground),
    ink: d.ink,
    heading: d.heading,
    muted: d.muted,
    accent: d.accent,
    danger: d.accent === P.meadow.redWine || d.heading === P.meadow.redWine ? P.cherry.cherry : P.meadow.redWine,
    info: d.accent === P.lotus.midnightGreen ? P.meadow.deepSea : P.lotus.midnightGreen,
    mech: P.knit.smokeyRose,
    caution: SUN_DEEP,
    calm: P.meadow.moss,
  };
}

/** Forty combinations; neighbours in the list never share a ground or a deep pair. */
export const PAGE_THEMES: ApproachTheme[] = Array.from({ length: 40 }, (_, i) => mix(GROUNDS[i % GROUNDS.length], DEEPS[i % DEEPS.length], i));

function hashOf(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The combination at a position in an ordered list (topics in board order), so neighbours differ. */
export function pageThemeAt(index: number, offset = 0): ApproachTheme {
  const n = PAGE_THEMES.length;
  return PAGE_THEMES[(((index + offset) % n) + n) % n];
}

/** A page's own combination, fixed by its key, for pages with no natural order. */
export function pageTheme(key: string): ApproachTheme {
  return PAGE_THEMES[hashOf(key) % PAGE_THEMES.length];
}

/* ─────────────── each specialty's own colour, for its overview page ───────────────
   Obstetrics & Gynaecology in light pink, Paediatrics in light blue, Surgery in maroon red and
   Internal Medicine in sea foam with deep sea. The banner is the specialty's colour itself, with
   text chosen to read on it; accent stays dark enough to read as text on the paper. */

export interface SpecialtyTheme extends ApproachTheme {
  banner: string; // the overview banner, the active index entry, buttons
  onBanner: string; // text on the banner
}

const SPECIALTY_THEMES: Record<string, SpecialtyTheme> = {
  medicine: {
    ...mix(GROUNDS[3], DEEPS[0], 0),
    id: 'specialty-medicine',
    name: 'Sea foam and deep sea',
    ground: '#dde9ec', // sea foam, lifted
    paper: '#f1f6f7',
    heading: P.meadow.deepSea,
    accent: P.lotus.midnightGreen,
    banner: P.meadow.deepSea,
    onBanner: '#eef5f6',
  },
  surgery: {
    ...mix(GROUNDS[2], DEEPS[1], 0),
    id: 'specialty-surgery',
    name: 'Maroon red',
    ground: '#f1e2d6', // almond, lifted
    paper: '#faf3ec',
    ink: '#2e2422',
    heading: '#7d1e22', // red wine, deepened to maroon
    muted: P.knit.smokeyRose,
    accent: P.cherry.cherry,
    banner: '#7d1e22',
    onBanner: '#fbf2ea',
  },
  obgyn: {
    ...mix(GROUNDS[5], DEEPS[2], 0),
    id: 'specialty-obgyn',
    name: 'Light pink',
    ground: '#fbe1dc', // cherry blossom, lifted
    paper: '#fdf1ee',
    ink: '#3e2c2a',
    heading: '#8a3a3a', // rosy brown, deepened to read on pink
    muted: P.knit.smokeyRose,
    accent: ROSY_DEEP,
    banner: '#f6bdb6', // cherry blossom, softened
    onBanner: '#5e2b2b',
  },
  paediatrics: {
    ...mix(GROUNDS[7], DEEPS[9], 0),
    id: 'specialty-paediatrics',
    name: 'Light blue',
    ground: '#e3eff3', // sea foam and sky, lifted
    paper: '#f3f8f9',
    ink: P.meadow.deepSea,
    heading: P.lotus.midnightGreen,
    muted: '#3f6670',
    accent: P.lotus.midnightGreen,
    banner: '#b3d8e3', // sky blue and sea foam, light
    onBanner: '#0e3a48',
  },
};

/** A specialty's own colour, for its overview page and subject board. */
export function specialtyTheme(specialtyId: string): SpecialtyTheme {
  return SPECIALTY_THEMES[specialtyId] ?? { ...pageTheme(`board:${specialtyId}`), banner: pageTheme(`board:${specialtyId}`).accent, onBanner: '#fbf7ea' };
}

/** Approaches given a combination on purpose; any other takes its own by its id. */
const CHOSEN: Record<string, string> = { jaundice: 'meadow' };

export function themeFor(approachId: string): ApproachTheme {
  const id = CHOSEN[approachId];
  if (id) return APPROACH_THEMES.find((t) => t.id === id)!;
  return pageTheme(`approach:${approachId}`);
}

/** Where each specialty's topics start in the list, so two specialties don't open on the same look. */
export const SPECIALTY_OFFSET: Record<string, number> = { medicine: 0, surgery: 13, obgyn: 26, paediatrics: 7 };

/** The theme as the archive page frame's palette (background wash, headings, buttons). */
export function themePalette(t: ApproachTheme): Palette {
  return {
    id: `approach-${t.id}`,
    name: t.name,
    pattern: 'wash',
    ground: t.ground,
    paint: t.pattern,
    paint2: t.pattern,
    ink: t.heading,
    muted: t.muted,
    kicker: t.accent,
    // fills (number discs, the reveal button, done chips) are a pale wash of the accent with dark
    // text on them; the accent itself draws their rims
    accent: `color-mix(in srgb, ${t.accent} 32%, ${t.paper})`,
    accentDeep: t.accent,
    bar: t.accent,
    track: t.pattern,
    bow: t.accent,
    bowDeep: t.heading,
    paper: t.paper,
  };
}

/** The theme as CSS variables for the reader, its panels and the coloured terms. */
export function themeVars(t: ApproachTheme): CSSProperties {
  return {
    '--t-paper': t.paper,
    '--t-ink': t.ink,
    '--t-heading': t.heading,
    '--t-muted': t.muted,
    '--t-accent': t.accent,
    '--t-danger': t.danger,
    '--t-info': t.info,
    '--t-mech': t.mech,
    '--t-caution': t.caution,
    '--t-calm': t.calm,
    '--page-ground': t.ground,
  } as CSSProperties;
}

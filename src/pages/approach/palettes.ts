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

/** Approaches given a combination on purpose; any other takes one by its id, spread across the list. */
const CHOSEN: Record<string, string> = { jaundice: 'meadow' };

export function themeFor(approachId: string): ApproachTheme {
  const id = CHOSEN[approachId];
  if (id) return APPROACH_THEMES.find((t) => t.id === id)!;
  let h = 2166136261;
  for (const ch of approachId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return APPROACH_THEMES[Math.abs(h) % APPROACH_THEMES.length];
}

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
    accent: t.accent,
    accentDeep: t.heading,
    bar: t.accent,
    track: t.pattern,
    bow: t.accent,
    bowDeep: t.heading,
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
  } as CSSProperties;
}

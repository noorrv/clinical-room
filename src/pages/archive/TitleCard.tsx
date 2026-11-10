import type { CSSProperties } from 'react';
import type { Specialty } from '../../content';
import type { Doctor } from '../../content/types';
import { Cottage, HollyRibbon, Laurel, Ornaments, Pomegranate, Postmark, PressTree, RibbonCorner, Seal, Stamp, Wreath, type Colours } from './cardArt';
import type { Palette } from './palettes';

/*
  The examiner's title card, styled as a vintage Christmas card on textured paper. Each palette has
  its own card: layout, frame, colourway and illustration, so a doctor's page is recognisably theirs.
  The words on it are the archive's own: the specialty, "Examiner's archive", the name and role.
*/

type Layout = 'postcard' | 'greeting' | 'scene' | 'panel' | 'press' | 'botanical' | 'invitation';
type Frame = 'airmail' | 'candy' | 'holly' | 'ruled' | 'ribbon' | 'none';
type Art = 'holly' | 'hollyRibbon' | 'cottage' | 'cottageMoon' | 'ornaments' | 'wreath' | 'pomegranate' | 'press' | 'laurel';

interface CardSpec {
  layout: Layout;
  frame: Frame;
  art: Art;
  stamp?: 'tree' | 'wreath' | 'bauble';
  seal?: boolean;
  c: Colours;
  panel?: string; // the coloured inner panel of the 'panel' layout
}

const CLASSIC = { red: '#c8382d', green: '#3e5b47', cream: '#f7f1e3', gold: '#e2b04a' };

const CARDS: Record<string, CardSpec> = {
  amalfi: { layout: 'postcard', frame: 'airmail', art: 'holly', stamp: 'tree', c: { ...CLASSIC, paper: '#efe5cf', ink: '#2e3c6b', sky: '#cfdbe4' } },
  garden: { layout: 'greeting', frame: 'holly', art: 'hollyRibbon', c: { ...CLASSIC, paper: '#ece2cc', ink: '#3e5b47', sky: '#dfe6d6' } },
  ticking: { layout: 'scene', frame: 'candy', art: 'cottage', c: { ...CLASSIC, paper: '#eee4cd', ink: '#2f4a63', sky: '#8fa6ae' } },
  parlour: { layout: 'panel', frame: 'ribbon', art: 'ornaments', panel: '#3d5a40', c: { ...CLASSIC, red: '#d4502f', paper: '#ece2cb', ink: '#f7f1e3', sky: '#3d5a40' } },
  picnic: { layout: 'postcard', frame: 'ruled', art: 'wreath', stamp: 'bauble', c: { ...CLASSIC, paper: '#efe6d3', ink: '#2f4866', sky: '#d9e3ec' } },
  terracotta: { layout: 'press', frame: 'none', art: 'press', c: { ...CLASSIC, paper: '#f2cdcf', ink: '#5d80ae', sky: '#f2cdcf' } },
  harvest: { layout: 'botanical', frame: 'ruled', art: 'pomegranate', c: { ...CLASSIC, red: '#b3302c', green: '#3f5a43', paper: '#ede0c4', ink: '#2b2a22', sky: '#ede0c4' } },
  olive: { layout: 'invitation', frame: 'ruled', art: 'laurel', seal: true, c: { ...CLASSIC, red: '#8e2533', paper: '#cdd28f', ink: '#56632a', green: '#56632a', sky: '#cdd28f' } },
  sage: { layout: 'scene', frame: 'ruled', art: 'cottageMoon', c: { ...CLASSIC, paper: '#ece4cf', ink: '#3d4a2f', sky: '#7f958f' } },
  blush: { layout: 'botanical', frame: 'airmail', art: 'pomegranate', stamp: 'wreath', c: { ...CLASSIC, red: '#b3302c', paper: '#e9dcc8', ink: '#24356a', sky: '#e9dcc8' } },
};

function ArtFor({ art, c }: { art: Art; c: Colours }) {
  switch (art) {
    case 'holly':
      return <HollyRibbon c={c} />;
    case 'hollyRibbon':
      return <HollyRibbon c={c} flowing />;
    case 'cottage':
      return <Cottage c={c} />;
    case 'cottageMoon':
      return <Cottage c={c} moon />;
    case 'ornaments':
      return <Ornaments c={c} />;
    case 'wreath':
      return <Wreath c={c} />;
    case 'pomegranate':
      return <Pomegranate c={c} />;
    case 'press':
      return <PressTree c={c} />;
    case 'laurel':
      return <Laurel c={c} />;
  }
}

export function TitleCard({ sp, doctor, palette }: { sp: Specialty; doctor: Doctor; palette: Palette }) {
  const spec = CARDS[palette.id] ?? CARDS.amalfi;
  const { c } = spec;
  const style = {
    '--xc-paper': c.paper,
    '--xc-ink': c.ink,
    '--xc-red': c.red,
    '--xc-green': c.green,
    '--xc-cream': c.cream,
    '--xc-panel': spec.panel ?? c.paper,
  } as CSSProperties;

  const words = (
    <div className="xc-words">
      <p className="xc-kicker">{sp.title} · Examiner’s archive</p>
      <h1 className="xc-name">
        <bdi>{doctor.name}</bdi>
      </h1>
      {doctor.role && <p className="xc-role">{doctor.role}</p>}
    </div>
  );

  return (
    <header className="xc" data-layout={spec.layout} data-frame={spec.frame} data-card={palette.id} style={style}>
      {spec.frame === 'ribbon' &&
        (['tl', 'tr', 'bl', 'br'] as const).map((k) => <RibbonCorner key={k} c={c} className={`xc-corner xc-corner--${k}`} />)}
      <div className="xc-inner">
        <div className="xc-art">
          <ArtFor art={spec.art} c={c} />
        </div>
        {words}
        {spec.layout === 'postcard' && (
          <div className="xc-post" aria-hidden>
            <div className="xc-post__marks">
              <Postmark c={c} top="THE CLINICAL ROOM" bottom={sp.title.toUpperCase()} />
              {spec.stamp && <Stamp c={c} motif={spec.stamp} />}
            </div>
            <span className="xc-post__line" />
            <span className="xc-post__line" />
            <span className="xc-post__line" />
          </div>
        )}
        {spec.layout === 'botanical' && spec.stamp && (
          <div className="xc-corner-stamp" aria-hidden>
            <Stamp c={c} motif={spec.stamp} />
          </div>
        )}
        {spec.seal && (
          <div className="xc-seal-wrap" aria-hidden>
            <Seal c={c} />
          </div>
        )}
      </div>
    </header>
  );
}

import type { CSSProperties } from 'react';

/*
  A patient in the bed, drawn to fit the hospital room (same 1600 × 900 frame). Nothing is baked
  into the room: each case passes its own patient, and the clinical signs change how they look
  (yellow sclerae and skin in jaundice, pallor, a flush, scratch marks).

  The patient is drawn in two layers so the hands can rest on top of the blanket:
  <PatientBody> sits between the bed and the blanket, <PatientHands> above the blanket.
*/

export interface PatientLook {
  sex: 'male' | 'female';
  /** Base skin colour before any clinical sign. */
  skin: string;
  hair: { color: string; style: 'short-wavy' | 'long' | 'bald' };
  beard?: string;
  gown: { base: string; dots: string };
  expression: 'neutral' | 'tired' | 'distressed';
  signs: {
    /** 0–1: how yellow the sclerae and skin are. */
    jaundice?: number;
    pallor?: number;
    flushed?: number;
    sweating?: boolean;
    scratchMarks?: boolean;
  };
}

/* ── colour helpers: mix a clinical sign into the base colours ── */
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
function mix(a: string, b: string, t: number) {
  const [x, y] = [hex(a), hex(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
}

export function colours(p: PatientLook) {
  const j = p.signs.jaundice ?? 0;
  let skin = mix(p.skin, '#d9b44a', j * 0.42);
  if (p.signs.pallor) skin = mix(skin, '#ece3d6', p.signs.pallor * 0.5);
  const sclera = mix('#f6f0e2', '#dcc23e', j * 0.9);
  const blush = mix('#c8705f', '#d2523f', p.signs.flushed ?? 0);
  return { skin, shade: mix(skin, '#5a3a24', 0.28), sclera, blush, blushAlpha: 0.45 + (p.signs.flushed ?? 0) * 0.35 };
}

const INK = '#2a2118';

export function PatientBody({ p }: { p: PatientLook }) {
  const c = colours(p);
  const lid = p.expression === 'tired' ? 0.45 : p.expression === 'distressed' ? 0.2 : 0.15;
  return (
    <svg className="pt pt--body" viewBox="0 0 1600 900" aria-hidden>
      <defs>
        <clipPath id="pt-gown">
          <path d="M1262,512 Q1290,496 1318,494 L1352,496 Q1392,500 1412,518 Q1428,560 1408,612 L1176,612 Q1186,566 1206,548 Q1232,522 1262,512 Z" />
        </clipPath>
      </defs>
      {/* breathing: the chest rises and falls */}
      <g className="pt-breathe">
        <path
          d="M1262,512 Q1290,496 1318,494 L1352,496 Q1392,500 1412,518 Q1428,560 1408,612 L1176,612 Q1186,566 1206,548 Q1232,522 1262,512 Z"
          fill={p.gown.base}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <g clipPath="url(#pt-gown)" fill={p.gown.dots}>
          {GOWN_DOTS.map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r="2.6" cx="-3" />
              <circle r="2.6" cx="3" />
              <circle r="2.6" cy="-3" />
              <circle r="2.6" cy="3" />
            </g>
          ))}
        </g>
        <path d="M1316,496 Q1332,522 1352,498" fill="none" stroke={INK} strokeWidth="2.4" />
        <path d="M1240,540 Q1250,570 1246,600 M1390,530 Q1400,566 1394,604" fill="none" stroke="#b9b29f" strokeWidth="2" />
      </g>

      {/* head and neck, with a small, slow movement */}
      <g className="pt-head">
        <g transform="translate(1336 500) scale(1.14) translate(-1336 -500)">
        <path d="M1320,474 L1322,500 Q1336,506 1352,498 L1352,474 Z" fill={c.skin} stroke={INK} strokeWidth="2.6" />
        {/* face */}
        <path
          d="M1324,420 Q1356,402 1386,420 Q1402,444 1396,476 Q1388,500 1356,504 Q1330,504 1318,486 Q1308,472 1312,460 L1306,452 Q1312,446 1314,440 Q1314,428 1324,420 Z"
          fill={c.skin}
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* hair */}
        {p.hair.style !== 'bald' && (
          <path
            d={
              p.hair.style === 'long'
                ? 'M1318,438 Q1318,404 1352,398 Q1396,396 1408,430 Q1420,470 1414,520 Q1404,540 1396,520 Q1400,480 1392,456 Q1380,428 1350,424 Q1332,426 1318,438 Z'
                : 'M1314,446 Q1306,430 1318,422 Q1316,404 1336,402 Q1348,390 1364,396 Q1382,390 1392,402 Q1410,404 1410,422 Q1420,434 1410,448 Q1416,462 1404,474 Q1404,486 1396,488 Q1392,476 1394,466 Q1386,458 1390,446 Q1380,436 1384,426 Q1372,428 1362,420 Q1352,428 1338,424 Q1330,432 1320,432 Q1318,440 1314,446 Z'
            }
            fill={p.hair.color}
            stroke={INK}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
        )}
        {p.hair.style === 'short-wavy' && (
          <path
            d="M1324,420 q8,-8 16,-4 M1346,408 q10,-8 20,-2 M1372,404 q12,0 18,10 M1398,420 q8,8 4,18 M1400,452 q6,8 0,16 M1356,416 q8,-4 14,2"
            fill="none"
            stroke={mix(p.hair.color, INK, 0.4)}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
        {/* ear */}
        <path d="M1382,454 Q1394,448 1396,462 Q1396,474 1384,474" fill={c.skin} stroke={INK} strokeWidth="2.4" />
        <path d="M1386,458 Q1390,462 1386,468" fill="none" stroke={c.shade} strokeWidth="1.6" />
        {/* brow, eye (the sclera shows the jaundice), nose, mouth, cheek */}
        <path
          d={p.expression === 'distressed' ? 'M1324,436 Q1336,428 1350,436' : 'M1324,434 Q1338,430 1350,436'}
          fill="none"
          stroke={mix(p.hair.color, INK, 0.5)}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M1326,449 Q1338,440 1350,449 Q1338,456 1326,449 Z" fill={c.sclera} stroke={INK} strokeWidth="1.8" />
        <circle cx="1335" cy="449" r="3.6" fill="#3a2a1c" />
        <circle cx="1336" cy="447.6" r="1" fill="#f6f0e2" />
        {/* the resting upper lid (tired eyes droop), then the blink */}
        <path d={`M1325,449 Q1338,440 1351,449 L1351,${449 - 9 + lid * 9} Q1338,${440 + lid * 9} 1325,${449 - 9 + lid * 9} Z`} fill={c.skin} />
        <path className="pt-blink" d="M1325,449 Q1338,440 1351,449 L1351,452 Q1338,457 1325,452 Z" fill={c.skin} />
        <path d={`M1325,${449 - 1 + lid * 4} Q1338,${441 + lid * 6} 1351,${449 - 1 + lid * 4}`} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        <path d="M1316,446 Q1308,462 1312,468 Q1316,472 1324,470" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="1356" cy="470" r="7" fill={c.blush} opacity={c.blushAlpha} />
        {p.beard ? (
          <>
            <path
              d="M1318,486 Q1326,492 1332,490 Q1342,496 1352,492 Q1364,494 1374,486 Q1384,480 1392,468 Q1398,484 1390,498 Q1378,514 1354,514 Q1330,514 1320,500 Q1314,494 1318,486 Z"
              fill={p.beard}
              stroke={INK}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <path d="M1314,476 Q1322,472 1330,476 Q1338,472 1344,478 Q1336,482 1328,480 Q1320,482 1314,476 Z" fill={p.beard} stroke={INK} strokeWidth="1.8" />
            <path d="M1320,485 Q1330,488 1340,485" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M1334,504 q5,-3 10,0 M1352,504 q5,-3 10,0 M1370,496 q4,-3 8,1" fill="none" stroke={mix(p.beard, INK, 0.35)} strokeWidth="1.3" />
          </>
        ) : (
          <path
            d={p.expression === 'distressed' ? 'M1322,488 Q1332,482 1344,488' : 'M1322,486 Q1332,490 1344,486'}
            fill="none"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {/* the cheek away from us falls into shadow */}
        <path d="M1376,440 Q1392,456 1388,480 Q1380,470 1376,456 Z" fill={c.shade} opacity=".35" />
        {p.signs.sweating && (
          <g fill="#cfe6ee" stroke={INK} strokeWidth="1">
            <path d="M1364,430 q-4,7 0,9 q4,-2 0,-9 Z" />
            <path d="M1342,424 q-3,6 0,8 q3,-2 0,-8 Z" />
          </g>
        )}
        </g>
      </g>
    </svg>
  );
}

const GOWN_DOTS: Array<[number, number]> = [
  [1230, 556],
  [1262, 532],
  [1296, 520],
  [1376, 520],
  [1404, 548],
  [1270, 574],
  [1310, 552],
  [1350, 548],
  [1392, 582],
  [1214, 590],
  [1250, 600],
  [1330, 590],
  [1372, 566],
];

export function PatientHands({ p }: { p: PatientLook }) {
  const c = colours(p);
  return (
    <svg className="pt pt--hands" viewBox="0 0 1600 900" aria-hidden>
      <g className="pt-breathe-soft">
        {/* far arm: short sleeve, forearm down to the belly, hand */}
        <path d="M1402,522 Q1422,546 1410,574 L1380,580 Q1386,556 1376,534 Z" fill={p.gown.base} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M1384,574 Q1372,592 1336,598 Q1314,600 1304,594 L1306,608 Q1336,612 1370,604 Q1398,594 1408,572 Z" fill={c.skin} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M1308,592 Q1288,588 1280,596 Q1278,606 1290,610 Q1300,612 1310,606 Z" fill={c.skin} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M1286,598 q6,1 10,4 M1284,604 q6,1 10,3" fill="none" stroke={c.shade} strokeWidth="1.4" strokeLinecap="round" />
        {/* near arm */}
        <path d="M1264,514 Q1236,524 1224,552 L1252,562 Q1258,540 1272,530 Z" fill={p.gown.base} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M1226,550 Q1208,574 1214,592 Q1226,604 1262,604 L1286,602 L1284,590 L1250,590 Q1238,586 1240,566 L1252,560 Z" fill={c.skin} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M1280,588 Q1300,582 1312,590 Q1316,600 1304,606 Q1292,610 1282,604 Z" fill={c.skin} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M1296,590 q4,4 4,10 M1304,590 q4,4 3,10" fill="none" stroke={c.shade} strokeWidth="1.4" strokeLinecap="round" />
        {p.signs.scratchMarks && (
          <g stroke="#b5544a" strokeWidth="1.6" strokeLinecap="round" opacity=".85">
            <path d="M1222,578 l10,8 M1228,574 l9,9 M1350,596 l12,-3 M1346,602 l14,-3" />
          </g>
        )}
      </g>
    </svg>
  );
}

/** The patient's colours as CSS variables, for the portrait in the dialogue panel. */
export function lookVars(p: PatientLook): CSSProperties {
  const c = colours(p);
  return { '--pt-skin': c.skin, '--pt-sclera': c.sclera } as CSSProperties;
}

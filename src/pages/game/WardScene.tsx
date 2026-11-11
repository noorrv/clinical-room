import { useRef } from 'react';
import { useLoopsInView } from '../../lib/motion';
import ward from './art/ward.jpg';
import type { PatientLook } from './Patient';

/*
  The ward: the illustrated hospital room with its patient already in bed, painted in one piece so
  the figure sits naturally in the room's light and perspective. A case's clinical signs are laid
  over him as soft, feathered tints, on 1672 × 941 coordinates that match the picture.

  The room comes alive in small, contained ways that a single painting can carry: he breathes (his
  chest and arms rise a hair under a soft mask), he blinks (his own skin colour closes over the
  painted eyes for a moment), the monitor's trace runs at his heart rate, the IV drips, the
  privacy curtain stirs and the lamp breathes a little warmth. There is no head turn: a painted
  head can't turn without frames drawn for it. Everything rests when the scene is off screen,
  while the page scrolls, and for anyone who prefers reduced motion.
*/

export const WARD_SIZE = { w: 1672, h: 941 };
const VB = `0 0 ${WARD_SIZE.w} ${WARD_SIZE.h}`;

/** Where the patient's visible skin is in the picture: forehead and cheeks, neck, forearms and hands. */
const SKIN = [
  { cx: 1281, cy: 362, rx: 36, ry: 27 },
  { cx: 1318, cy: 380, rx: 16, ry: 20 },
  { cx: 1284, cy: 437, rx: 22, ry: 12 },
  { cx: 1160, cy: 532, rx: 54, ry: 17 },
  { cx: 1292, cy: 556, rx: 64, ry: 19 },
];

/** The two painted eyes, and the skin around them (sampled from the painting). */
const EYES = [
  { cx: 1260.5, cy: 365.5, rx: 4.6, ry: 6.4 },
  { cx: 1294.3, cy: 371.5, rx: 5.2, ry: 7.6 },
];
const LID = '#e7a56b';

// one beat on the monitor, 43 units wide, starting and ending on the baseline
const BEAT = 'l8,0 l3,-3 l3,3 l3,0 l2,4 l3,-26 l3,40 l3,-18 l3,0 q3,-5 6,0 l6,0';
const TRACE = `M1424,211 ${BEAT.repeat(5)}`;

export function WardScene({ patient, heartRate = 80, label }: { patient: PatientLook; heartRate?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLoopsInView(ref);
  const j = patient.signs.jaundice ?? 0;
  const pallor = patient.signs.pallor ?? 0;
  const flush = patient.signs.flushed ?? 0;
  const cast = j > 0 ? { fill: '#f0c24a', amount: 0.62 * j } : pallor > 0 ? { fill: '#efe6d8', amount: 0.5 * pallor } : flush > 0 ? { fill: '#d9604a', amount: 0.4 * flush } : null;
  const bg = { backgroundImage: `url(${ward})` };

  return (
    <div className="ward" ref={ref} data-loops>
      <div className="ward__frame">
        <img className="ward__layer" src={ward} alt={label ?? 'A patient lying in a hospital bed in a lamp-lit ward at night.'} width={WARD_SIZE.w} height={WARD_SIZE.h} decoding="async" />

        {/* his chest and arms, a copy of the painting under a soft mask, rising and falling */}
        <div className="ward__layer ward-breath" style={bg} aria-hidden />
        {/* the privacy curtain, stirring */}
        <div className="ward__layer ward-curtain" style={bg} aria-hidden />

        <svg className="ward__layer" viewBox={VB} aria-hidden>
          <defs>
            <clipPath id="ward-screen">
              <rect x="1424" y="168" width="94" height="84" rx="3" />
            </clipPath>
          </defs>
          {/* the monitor: its screen, a live trace at his heart rate */}
          <rect x="1424" y="168" width="94" height="84" rx="3" fill="#1e1f19" />
          <path d="M1428,240 h86 M1428,246 h70" stroke="#33352c" strokeWidth="1.5" />
          <g clipPath="url(#ward-screen)">
            <path className="ward-ecg" d={TRACE} fill="none" stroke="#b9d494" strokeWidth="2.4" strokeLinejoin="round" style={{ animationDuration: `${60 / heartRate}s` }} />
          </g>
          {/* the IV drip */}
          <circle className="ward-drip" cx="1111" cy="302" r="2.3" fill="#f3e6c8" stroke="#3a2a1c" strokeWidth=".7" />
          {/* a blink: his own skin closes over the painted eyes, with the line of the closed lid */}
          <g className="ward-blink">
            {EYES.map((e, i) => (
              <g key={i}>
                <ellipse {...e} fill={LID} />
                <path d={`M${e.cx - e.rx - 0.6},${e.cy + 1} Q${e.cx},${e.cy + 3.4} ${e.cx + e.rx + 0.6},${e.cy + 1}`} fill="none" stroke="#2a1a10" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            ))}
          </g>
        </svg>

        {/* the lamp's warmth, breathing a little */}
        <svg className="ward__layer ward-lamp" viewBox={VB} aria-hidden>
          <defs>
            <radialGradient id="ward-warm">
              <stop offset="0" stopColor="#ffe2a0" stopOpacity="1" />
              <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="1297" cy="150" rx="190" ry="110" fill="url(#ward-warm)" />
        </svg>

        {cast && (
          // the blend sits on the overlay itself so it mixes with the painting below: the sign changes
          // the skin's colour but keeps the painting's own light and shade
          <svg className="ward__layer ward__signs" viewBox={VB} aria-hidden style={{ mixBlendMode: 'color' }}>
            <defs>
              <filter id="ward-feather" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>
            <g filter="url(#ward-feather)" fill={cast.fill} opacity={cast.amount}>
              {SKIN.map((e, i) => (
                <ellipse key={i} {...e} />
              ))}
            </g>
          </svg>
        )}
        {patient.signs.scratchMarks && (
          <svg className="ward__layer" viewBox={VB} aria-hidden style={{ mixBlendMode: 'multiply' }}>
            <g stroke="#a8473d" strokeWidth="1.6" strokeLinecap="round" opacity=".55">
              <path d="M1262,552 l14,-5 M1268,560 l15,-5 M1140,532 l11,6 M1146,526 l10,7" />
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}

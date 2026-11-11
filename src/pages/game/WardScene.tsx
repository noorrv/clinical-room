import ward from './art/ward.jpg';
import type { PatientLook } from './Patient';

/*
  The ward: the illustrated hospital room with its patient already in bed, painted in one piece so
  the figure sits naturally in the room's light and perspective. A case's clinical signs are laid
  over him as soft, feathered tints (a yellow cast for jaundice, a paler cast for pallor, a flush
  for fever) on 1672 × 941 coordinates that match the picture.
*/

export const WARD_SIZE = { w: 1672, h: 941 };

/** Where the patient's visible skin is in the picture: forehead and cheeks, neck, forearms and hands. */
const SKIN = [
  { cx: 1281, cy: 362, rx: 36, ry: 27 },
  { cx: 1318, cy: 380, rx: 16, ry: 20 },
  { cx: 1284, cy: 437, rx: 22, ry: 12 },
  { cx: 1160, cy: 532, rx: 54, ry: 17 },
  { cx: 1292, cy: 556, rx: 64, ry: 19 },
];

export function WardScene({ patient, label }: { patient: PatientLook; label?: string }) {
  const j = patient.signs.jaundice ?? 0;
  const pallor = patient.signs.pallor ?? 0;
  const flush = patient.signs.flushed ?? 0;
  const cast = j > 0 ? { fill: '#e8c437', amount: 0.85 * j } : pallor > 0 ? { fill: '#efe6d8', amount: 0.5 * pallor } : flush > 0 ? { fill: '#d9604a', amount: 0.4 * flush } : null;

  return (
    <div className="ward">
      <div className="ward__frame">
        <img className="ward__layer" src={ward} alt={label ?? 'A patient lying in a hospital bed in a lamp-lit ward at night.'} width={WARD_SIZE.w} height={WARD_SIZE.h} decoding="async" />
        {cast && (
          // the blend sits on the overlay itself so it mixes with the painting below: the sign changes
          // the skin's colour but keeps the painting's own light and shade
          <svg className="ward__layer ward__signs" viewBox={`0 0 ${WARD_SIZE.w} ${WARD_SIZE.h}`} aria-hidden style={{ mixBlendMode: 'color' }}>
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
          <svg className="ward__layer" viewBox={`0 0 ${WARD_SIZE.w} ${WARD_SIZE.h}`} aria-hidden style={{ mixBlendMode: 'multiply' }}>
            <g stroke="#a8473d" strokeWidth="1.6" strokeLinecap="round" opacity=".55">
              <path d="M1262,552 l14,-5 M1268,560 l15,-5 M1140,532 l11,6 M1146,526 l10,7" />
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}

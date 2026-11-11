import { useRef } from 'react';
import { useLoopsInView } from '../../lib/motion';
import roomBack from './art/room-back.svg';
import roomFront from './art/room-front.svg';
import { PatientBody, PatientHands, type PatientLook } from './Patient';

/*
  The ward: one hospital room shared by every case, drawn in layers so a case only swaps the
  patient. The room's still drawing is painted once as two images (behind and in front of the
  patient); the patient and the few things that move (breathing, blinking, the ECG trace, the
  IV drip, the lamp's glow) are live SVG on the same 1600 × 900 frame. Everything rests when the
  scene is off screen, while the page scrolls, or when the student prefers reduced motion.
*/

// one P–QRS–T beat, 72 units wide, drawn twice so the trace can slide without a seam
const BEAT = 'l14,0 q4,-6 8,0 l6,0 l3,4 l4,-26 l4,30 l3,-8 l6,0 q6,-9 12,0 l12,0';
const TRACE = `M1426,232 ${BEAT.repeat(4)}`;

export function WardScene({ patient, heartRate, spo2 }: { patient: PatientLook; heartRate: number; spo2: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLoopsInView(ref);
  const beat = 60 / heartRate; // seconds per beat: the trace slides one beat per beat

  return (
    <div className="ward" ref={ref} data-loops>
      <div className="ward__frame">
        <img className="ward__layer" src={roomBack} alt="" draggable={false} decoding="async" />
        <PatientBody p={patient} />
        <img className="ward__layer" src={roomFront} alt="" draggable={false} decoding="async" />
        <PatientHands p={patient} />
        <svg className="ward__layer ward__live" viewBox="0 0 1600 900" aria-hidden>
          <defs>
            <clipPath id="ward-screen">
              <rect x="1428" y="182" width="140" height="70" />
            </clipPath>
            <radialGradient id="ward-bulb">
              <stop offset="0" stopColor="#ffe6a6" stopOpacity=".9" />
              <stop offset="1" stopColor="#ffe6a6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* the lamp's warm pool of light */}
          <ellipse className="ward-glow" cx="1330" cy="176" rx="150" ry="60" fill="url(#ward-bulb)" />
          {/* ECG trace on the monitor */}
          <g clipPath="url(#ward-screen)">
            <path
              className="ward-ecg"
              d={TRACE}
              fill="none"
              stroke="#a8e08e"
              strokeWidth="2"
              strokeLinejoin="round"
              style={{ animationDuration: `${beat}s` }}
            />
          </g>
          <text x="1432" y="266" className="ward-vital" fill="#a8e08e">
            HR {heartRate}
          </text>
          <text x="1508" y="266" className="ward-vital" fill="#8fc4d6">
            SpO₂ {spo2}%
          </text>
          {/* IV drip */}
          <circle className="ward-drip" cx="1106" cy="300" r="2.6" fill="#cfe0d4" stroke="#2a2118" strokeWidth=".8" />
        </svg>
      </div>
    </div>
  );
}

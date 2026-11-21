import { useRef } from 'react';
import { telegramHandle } from '../data/homepage';
import { useLoopsInView } from '../lib/motion';
import { TelegramEnvelope } from './TelegramEnvelope';
import './QuoteBand.css';

/* small warm lights flickering on the blue, like fairy lights in a window; positions in % of the band */
const LIGHTS = [
  { x: 4, y: 30, s: 8, d: 0.0 },
  { x: 9, y: 68, s: 7, d: 1.3 },
  { x: 14, y: 42, s: 9, d: 2.1 },
  { x: 19, y: 82, s: 7, d: 0.6 },
  { x: 24, y: 24, s: 8, d: 1.8 },
  { x: 29, y: 58, s: 7, d: 0.2 },
  { x: 34, y: 36, s: 9, d: 2.6 },
  { x: 39, y: 76, s: 8, d: 1.0 },
  { x: 45, y: 20, s: 7, d: 2.2 },
  { x: 50, y: 62, s: 8, d: 0.4 },
  { x: 55, y: 40, s: 7, d: 1.6 },
  { x: 60, y: 84, s: 9, d: 2.9 },
  { x: 65, y: 26, s: 7, d: 0.8 },
  { x: 70, y: 54, s: 8, d: 2.4 },
  { x: 75, y: 74, s: 7, d: 1.2 },
  { x: 80, y: 34, s: 9, d: 0.1 },
  { x: 85, y: 64, s: 7, d: 2.0 },
  { x: 90, y: 22, s: 8, d: 1.5 },
  { x: 95, y: 50, s: 7, d: 0.7 },
  { x: 98, y: 80, s: 8, d: 2.7 },
  { x: 12, y: 92, s: 7, d: 1.9 },
  { x: 42, y: 92, s: 8, d: 0.5 },
  { x: 58, y: 12, s: 7, d: 2.3 },
  { x: 88, y: 90, s: 8, d: 1.1 },
];

export function QuoteBand() {
  const band = useRef<HTMLDivElement>(null);
  useLoopsInView(band);
  const handle = telegramHandle.replace(/^@/, '').trim();
  return (
    <div className="band" ref={band} data-loops>
      <div className="band__lights" aria-hidden>
        {LIGHTS.map((p, i) => (
          <span key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${2.4 + (i % 5) * 0.45}s` }} />
        ))}
      </div>
      {/* the Telegram envelope appears only once there is an official handle */}
      {handle && <TelegramEnvelope handle={handle} />}
    </div>
  );
}

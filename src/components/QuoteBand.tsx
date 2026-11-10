import { telegramHandle } from '../data/homepage';
import { StudyStillLife } from './art/WidgetArt';
import './QuoteBand.css';

/* soft four-point glints scattered over the cloth; positions in % of the band */
const SPARKLES = [
  { x: 8, y: 30, s: 21, d: 0 },
  { x: 19, y: 72, s: 14, d: 1.6 },
  { x: 27, y: 44, s: 16, d: 3.1 },
  { x: 36, y: 82, s: 12, d: 0.8 },
  { x: 44, y: 38, s: 20, d: 2.4 },
  { x: 53, y: 70, s: 14, d: 3.8 },
  { x: 61, y: 46, s: 18, d: 1.1 },
  { x: 70, y: 80, s: 12, d: 2.9 },
  { x: 79, y: 34, s: 15, d: 0.4 },
  { x: 88, y: 64, s: 20, d: 2.0 },
  { x: 95, y: 40, s: 12, d: 3.4 },
];

function PaperPlane() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden className="tg-label__mark">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M5.4 11.7 17.2 7.1c.55-.2 1.03.13.85.96l-2 9.44c-.15.67-.55.83-1.1.52l-3.05-2.25-1.47 1.42c-.16.16-.3.3-.62.3l.22-3.1 5.64-5.1c.25-.22-.05-.34-.38-.12l-6.97 4.39-3-.94c-.65-.2-.66-.65.14-.97Z" fill="#f6ecd6" />
    </svg>
  );
}

export function QuoteBand() {
  const handle = telegramHandle.replace(/^@/, '').trim();
  const inner = (
    <>
      <PaperPlane />
      <span className="tg-label__text">
        <span className="tg-label__kicker">Find us on Telegram</span>
        <span className="tg-label__handle">@{handle}</span>
      </span>
    </>
  );
  return (
    <div className="band">
      <div className="band__art">
        <StudyStillLife />
      </div>
      <div className="band__sparkles" aria-hidden>
        {SPARKLES.map((p, i) => (
          <span key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s` }} />
        ))}
      </div>
      {/* the Telegram label appears only once there is an official handle */}
      {handle && (
        <a className="tg-label" href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      )}
    </div>
  );
}

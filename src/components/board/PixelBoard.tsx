import { useEffect } from 'react';
import type { BoardData, RecentKind } from './types';
import { ago } from './types';
import './pixel.css';

/*
  The noticeboard as pixel art: a pixel corkboard with pinned paper notices, and new arrivals in
  inventory slots. Icons are hand-placed bitmaps drawn as crisp SVG squares in the site's colours.
*/

const PAL: Record<string, string> = { k: '#2b1d12', c: '#f3e6cc', r: '#8a2a2c', g: '#4e6b47', y: '#d9a93e', w: '#fff7e6' };

const ICONS: Record<string, string[]> = {
  question: ['..kkkkkkk...', '..kcccccckk.', '..kccccccck.', '..kckkkkcck.', '..kccccccck.', '..kckkkkkck.', '..kccccccck.', '..kckkkkcck.', '..kccccccck.', '..kckkkkkck.', '..kccccccck.', '..kkkkkkkkk.'],
  doctor: ['..k.....k...', '..k.....k...', '..k.....k...', '..k.....k...', '...k...k....', '....kkk.....', '.....k......', '.....k......', '.....k...yy.', '......k.yyyy', '.......kyyyy', '.........yy.'],
  topic: ['..kkkkkkkk..', '..krrrrrrrk.', '..krryyyrrk.', '..krrrrrrrk.', '..krrrrrrrk.', '..krrrrrrrk.', '..krrrrrrrk.', '..krrrrrrrk.', '..krrrrrrrk.', '..kccccccck.', '..kkkkkkkkk.', '............'],
  pin: ['..rrrr..', '.rrwrrr.', '.rrrrrr.', '..rrrr..', '...kk...', '...k....', '...k....', '........'],
  star: ['...y...', '..yyy..', 'yyyyyyy', '..yyy..', '...y...'],
};

export function Pixel({ name, size }: { name: keyof typeof ICONS | RecentKind; size: number }) {
  const rows = ICONS[name];
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg className="px-icon" viewBox={`0 0 ${w} ${h}`} width={size} height={(size * h) / w} shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (PAL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={PAL[ch]} /> : null)),
      )}
    </svg>
  );
}

const PIXEL_FONTS = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=VT323&display=swap';

export function PixelBoard({ notices, recent, now = Date.now() }: BoardData & { now?: number }) {
  // the pixel faces are only fetched when this board is on the page
  useEffect(() => {
    if (document.querySelector(`link[href="${PIXEL_FONTS}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = PIXEL_FONTS;
    document.head.appendChild(l);
  }, []);

  return (
    <section className="px" aria-labelledby="px-title">
      <header className="px-bar">
        <Pixel name="star" size={18} />
        <h2 id="px-title">News Board</h2>
        <Pixel name="star" size={18} />
      </header>

      <div className="px-body">
        <div className="px-notes">
          <p className="px-label">Notices</p>
          {notices.length ? (
            <ul>
              {notices.map((n, i) => (
                <li key={n.id} className="px-note" style={{ ['--tilt' as string]: i % 2 ? '1deg' : '-1deg' }}>
                  <span className="px-pin">
                    <Pixel name="pin" size={16} />
                  </span>
                  <strong>{n.title}</strong>
                  {n.body && <span>{n.body}</span>}
                  <time dateTime={n.date}>{ago(n.date, now)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-quiet">No notices just now.</p>
          )}
        </div>

        <div className="px-recent">
          <p className="px-label">New in the library</p>
          {recent.length ? (
            <ul>
              {recent.map((r) => {
                const fresh = now - Date.parse(r.date) < 7 * 86_400_000;
                return (
                  <li key={r.id}>
                    <span className="px-slot">
                      <Pixel name={r.kind} size={28} />
                    </span>
                    <span className="px-item">
                      <a href={r.href ?? '#'}>{r.title}</a>
                      <span>
                        {r.specialty} · {ago(r.date, now)}
                      </span>
                    </span>
                    {fresh && <span className="px-new">NEW</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-quiet">Nothing new yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import type { BoardData, RecentKind } from './types';
import { ago, KIND_LABEL } from './types';
import './gazette.css';

/*
  The noticeboard as an old printed gazette: a ruled masthead, notices in a green almanac box with
  a stitched edge, and new arrivals in a list of dark medallions under a rose ribbon.
*/

function Medallion({ kind }: { kind: RecentKind }) {
  return (
    <svg className="gz-medal" viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="19" fill="#2f3b2a" />
      <circle cx="20" cy="20" r="16.5" fill="none" stroke="#e9dcbc" strokeWidth="0.8" opacity="0.6" />
      <g fill="none" stroke="#efe3c6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'question' && (
          <>
            <path d="M13 12 h12 a2 2 0 0 1 2 2 v13 h-12 a2 2 0 0 1 -2 -2 z" />
            <path d="M25 27 a2 2 0 0 0 2 -2" />
            <path d="M16 17 h8 M16 20.5 h8 M16 24 h5" strokeWidth="1" />
          </>
        )}
        {kind === 'doctor' && (
          <>
            <path d="M14 11 v6 a5 5 0 0 0 10 0 v-6" />
            <path d="M19 22 v3 a5 5 0 0 0 10 0 v-2" />
            <circle cx="29" cy="21" r="2" />
          </>
        )}
        {kind === 'topic' && (
          <>
            <path d="M11 14 q4.5 -2 9 0 v14 q-4.5 -2 -9 0 z" />
            <path d="M20 14 q4.5 -2 9 0 v14 q-4.5 -2 -9 0 z" />
          </>
        )}
      </g>
    </svg>
  );
}

/** An engraved apothecary bottle and sprig for the masthead corner. */
function Engraving() {
  return (
    <svg className="gz-engraving" viewBox="0 0 70 90" aria-hidden>
      <g fill="none" stroke="#2b1d12" strokeLinecap="round">
        <path d="M27 8 h16 v8 h-16 z" strokeWidth="1.3" />
        <path d="M29 16 v8 q-14 6 -14 24 v26 q0 8 8 8 h24 q8 0 8 -8 v-26 q0 -18 -14 -24 v-8" strokeWidth="1.4" />
        <path d="M21 52 h28 v16 h-28 z" strokeWidth="1" />
        <path d="M25 57 h20 M25 61 h14" strokeWidth="0.8" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${18 + i * 0} ${40 + i * 4} q2 -1 4 0`} strokeWidth="0.5" opacity="0.6" />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`h${i}`} d={`M${50} ${36 + i * 5} l4 3`} strokeWidth="0.5" opacity="0.7" />
        ))}
        <path d="M54 82 C60 70 64 58 62 44" strokeWidth="1" />
        {[50, 58, 66, 74].map((y, i) => (
          <path key={y} d={`M${62 - i * 1.5} ${y} q${i % 2 ? 7 : -7} -4 ${i % 2 ? 9 : -6} -10`} strokeWidth="0.9" />
        ))}
      </g>
    </svg>
  );
}

export function GazetteBoard({ notices, recent, date = new Date(), loading = false }: BoardData & { date?: Date; loading?: boolean }) {
  const dateline = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="gz" id="notices" aria-labelledby="gz-title">
      <header className="gz-head">
        <p className="gz-kicker">The Clinical Room</p>
        <h2 id="gz-title" className="gz-title">
          Notices &amp; New Arrivals
        </h2>
        <p className="gz-dateline">
          <span>Vol. I</span>
          <span aria-hidden>✦</span>
          <span>{dateline}</span>
        </p>
        <Engraving />
      </header>

      <div className="gz-body">
        <div className="gz-notices">
          <p className="gz-box-title">Notices</p>
          {loading ? (
            <p className="gz-quiet">Fetching the latest…</p>
          ) : notices.length ? (
            <ul>
              {notices.map((n) => (
                <li key={n.id}>
                  <span className="gz-fleuron" aria-hidden>
                    ❧
                  </span>
                  <span>
                    <strong>{n.title}</strong>
                    {n.body && <span className="gz-notice-body"> {n.body}</span>}
                    <time className="gz-when" dateTime={n.date}>
                      {ago(n.date)}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gz-quiet">No notices just now.</p>
          )}
        </div>

        <div className="gz-recent">
          <p className="gz-ribbon">
            <span>Lately added to the library</span>
          </p>
          {loading ? (
            <p className="gz-quiet">Fetching the latest…</p>
          ) : recent.length ? (
            <ul>
              {recent.map((r) => (
                <li key={r.id}>
                  <Medallion kind={r.kind} />
                  <span className="gz-item">
                    {r.href ? (
                      <Link to={r.href} className="gz-item-title">
                        <bdi>{r.title}</bdi>
                      </Link>
                    ) : (
                      <span className="gz-item-title">
                        <bdi>{r.title}</bdi>
                      </span>
                    )}
                    <span className="gz-item-meta">
                      {KIND_LABEL[r.kind]} · {r.specialty} · {ago(r.date)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gz-quiet">Nothing new yet. New questions and examiners appear here as they’re added.</p>
          )}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudySheet } from '../archive/StudySheet';
import './reader.css';

/*
  A written approach read like a digital textbook: an overview first, then one section at a time,
  with a contents list that shows where you are and what you've read, previous / next at the foot
  of each section, and subsections that fold away. The words and their order are exactly the
  approach's own; only the layout changes. Section boundaries come from its "## " headings and
  subsections from its "### " headings.
*/

interface Sub {
  title: string;
  body: string;
}

interface Section {
  title: string;
  /** "1." in "1. The patient presents", shown as a number disc. */
  num: string;
  name: string;
  lead: string;
  subs: Sub[];
}

/** A colour by what a heading is about: emergencies red, investigations blue, mechanisms purple, warnings amber. */
export type Tone = 'red' | 'blue' | 'purple' | 'amber' | 'plain';
const TONES: Array<[Tone, RegExp]> = [
  ['red', /red flags|urgency|emergenc|acute liver failure|acute (ascending )?cholangitis|fever and hypotension/i],
  ['purple', /metabolism|mechanism|why is this important|fractionate|pathway [ab]/i],
  ['blue', /investigat|ultrasound|imaging|mrcp|\bct\b|liver function|r ratio|algorithm|first-line|confirmatory/i],
  ['amber', /important|drug history|viva|do not miss/i],
];
export const toneOf = (title: string): Tone => TONES.find(([, re]) => re.test(title))?.[0] ?? 'plain';

function parse(sheet: string): { intro: string; sections: Section[] } {
  const parts = sheet.split(/^## /m);
  const intro = parts.shift()?.trim() ?? '';
  const sections = parts.map((p) => {
    const [head, ...rest] = p.split('\n');
    const body = rest.join('\n');
    const chunks = body.split(/^### /m);
    const lead = chunks.shift()?.trim() ?? '';
    const subs = chunks.map((c) => {
      const [t, ...b] = c.split('\n');
      return { title: t.trim(), body: b.join('\n').trim() };
    });
    const m = head.trim().match(/^(\d+\.)\s+(.*)$/);
    return { title: head.trim(), num: m?.[1].replace('.', '') ?? '', name: m?.[2] ?? head.trim(), lead, subs };
  });
  return { intro, sections };
}

const seenKey = (id: string) => `cr.read.${id}`;
function loadSeen(id: string): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(seenKey(id)) ?? '[]');
    return Array.isArray(v) ? v.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

export function ApproachReader({ approachId, title, sheet }: { approachId: string; title: string; sheet: string }) {
  const { intro, sections } = useMemo(() => parse(sheet), [sheet]);
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('s') ?? 0);
  const at = Number.isInteger(raw) && raw >= 0 && raw <= sections.length ? raw : 0; // 0 = overview
  const [seen, setSeen] = useState<number[]>(() => loadSeen(approachId));
  const [openAll, setOpenAll] = useState<boolean | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // remember which sections have been read
  useEffect(() => {
    if (at === 0 || seen.includes(at)) return;
    const next = [...seen, at];
    setSeen(next);
    try {
      localStorage.setItem(seenKey(approachId), JSON.stringify(next));
    } catch {
      /* not remembered in a private window */
    }
  }, [at, seen, approachId]);

  // a new section starts at its top, with its subsections back in their resting state
  useEffect(() => {
    setOpenAll(null);
    if (first.current) {
      first.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [at]);

  const go = (n: number) => {
    const next = new URLSearchParams(params);
    if (n === 0) next.delete('s');
    else next.set('s', String(n));
    setParams(next);
  };

  const sec = at > 0 ? sections[at - 1] : null;
  const read = seen.filter((n) => n >= 1 && n <= sections.length).length;
  const pct = Math.round((read / sections.length) * 100);

  return (
    <div className="apx" ref={topRef}>
      {/* contents: a sidebar on wide screens, a compact bar with a section picker on narrow ones */}
      <nav className="apx-nav" aria-label={`${title}: sections`}>
        <div className="apx-nav__inner">
          <p className="apx-nav__head">Contents</p>
          <div className="apx-progress" aria-label={`${read} of ${sections.length} sections read`}>
            <span className="apx-progress__bar">
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="apx-progress__text">
              {read} of {sections.length} read
            </span>
          </div>
          <ol className="apx-toc">
            <li>
              <button type="button" className={`apx-toc__item${at === 0 ? ' is-here' : ''}`} aria-current={at === 0 ? 'page' : undefined} onClick={() => go(0)}>
                <span className="apx-toc__num">·</span>
                <span className="apx-toc__name">Overview</span>
              </button>
            </li>
            {sections.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  className={`apx-toc__item apx-tone--${toneOf(s.title)}${at === i + 1 ? ' is-here' : ''}${seen.includes(i + 1) ? ' is-read' : ''}`}
                  aria-current={at === i + 1 ? 'page' : undefined}
                  onClick={() => go(i + 1)}
                >
                  <span className="apx-toc__num">{s.num}</span>
                  <span className="apx-toc__name">{s.name}</span>
                  {seen.includes(i + 1) && (
                    <span className="apx-toc__tick" aria-label="read">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="apx-bar">
          <button type="button" className="apx-bar__step" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous section">
            ‹
          </button>
          <label className="apx-bar__pick">
            <span className="visually-hidden">Go to section</span>
            <select value={at} onChange={(e) => go(Number(e.target.value))}>
              <option value={0}>Overview</option>
              {sections.map((s, i) => (
                <option key={s.title} value={i + 1}>
                  {s.num}. {s.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="apx-bar__step" onClick={() => go(at + 1)} disabled={at === sections.length} aria-label="Next section">
            ›
          </button>
          <span className="apx-bar__progress" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </span>
        </div>
      </nav>

      <div className="apx-main">
        {sec === null ? (
          <article className="apx-page da-q__answer da-q__answer--sheet">
            <p className="apx-page__kicker">Overview</p>
            <StudySheet text={intro} title={title} />
            <h2 className="apx-page__h">In this approach</h2>
            <ol className="apx-overview">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <button type="button" className={`apx-overview__item apx-tone--${toneOf(s.title)}${seen.includes(i + 1) ? ' is-read' : ''}`} onClick={() => go(i + 1)}>
                    <span className="apx-overview__num">{s.num}</span>
                    <span className="apx-overview__name">{s.name}</span>
                    <span className="apx-overview__meta">
                      {s.subs.length ? `${s.subs.length} ${s.subs.length === 1 ? 'part' : 'parts'}` : 'One page'}
                      {seen.includes(i + 1) && ' · read'}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="apx-foot">
              <span />
              <button type="button" className="apx-foot__next" onClick={() => go(1)}>
                <span className="apx-foot__dir">Start reading</span>
                <span className="apx-foot__title">
                  {sections[0]?.num}. {sections[0]?.name}
                </span>
              </button>
            </div>
          </article>
        ) : (
          <article className={`apx-page apx-page--${toneOf(sec.title)} da-q__answer da-q__answer--sheet`} key={at}>
            <header className="apx-page__head">
              <span className="apx-page__num" aria-hidden>
                {sec.num}
              </span>
              <div>
                <p className="apx-page__kicker">
                  Section {at} of {sections.length}
                </p>
                <h2 className="apx-page__title">{sec.name}</h2>
              </div>
              {sec.subs.length > 1 && (
                <button type="button" className="apx-page__toggle" onClick={() => setOpenAll((v) => !(v ?? false))}>
                  {openAll ? 'Collapse all' : 'Expand all'}
                </button>
              )}
            </header>

            {sec.lead && <StudySheet text={sec.lead} title={title} />}

            {sec.subs.map((s, i) => (
              <details
                key={`${at}-${i}-${openAll === null ? 'r' : openAll ? 'o' : 'c'}`}
                className={`apx-sub apx-tone--${toneOf(s.title)}`}
                open={openAll ?? i === 0}
              >
                <summary className="apx-sub__head">
                  <span className="apx-sub__title">{s.title}</span>
                  <span className="apx-sub__chev" aria-hidden />
                </summary>
                <div className="apx-sub__body">
                  <StudySheet text={s.body} title={title} />
                </div>
              </details>
            ))}

            <div className="apx-foot">
              <button type="button" className="apx-foot__prev" onClick={() => go(at - 1)}>
                <span className="apx-foot__dir">‹ Previous</span>
                <span className="apx-foot__title">{at === 1 ? 'Overview' : `${sections[at - 2].num}. ${sections[at - 2].name}`}</span>
              </button>
              {at < sections.length ? (
                <button type="button" className="apx-foot__next" onClick={() => go(at + 1)}>
                  <span className="apx-foot__dir">Next ›</span>
                  <span className="apx-foot__title">
                    {sections[at].num}. {sections[at].name}
                  </span>
                </button>
              ) : (
                <button type="button" className="apx-foot__next" onClick={() => go(0)}>
                  <span className="apx-foot__dir">Finished</span>
                  <span className="apx-foot__title">Back to the overview</span>
                </button>
              )}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

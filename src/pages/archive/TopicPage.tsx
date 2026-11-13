import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TYPE_LABEL, type QuestionRef, type Specialty } from '../../content';
import type { Question } from '../../content/types';
import { record, study, useStudy, type PositionFilter } from '../../study/store';
import { ANSWER_ORDER, GIVEN } from '../specialty/QuestionPage';
import { Ribbon } from '../specialty/ui';
import { Bow, CheckSeal, Star } from './art';
import { archivePath, isReviewed, OTHER, pad, sectionProgress, specialtyArchive, topicPath } from './data';
import { pageThemeAt, SPECIALTY_OFFSET, themePalette } from '../approach/palettes';
import { cardFor } from './cards';
import { ArchiveRoom, Highlight } from './shared';
import { StudySheet } from './StudySheet';

/*
  One topic of a specialty: every question filed under it, with the recorded answer revealed on
  demand, review ticks and bookmarks that save to the student's progress, and real previous /
  next navigation through the topics in board order. No doctor is named anywhere on it.
*/

const PAGE = 8;

function Body({ value, term, ordered }: { value: unknown; term: string | null; ordered?: boolean }) {
  if (Array.isArray(value)) {
    const List = ordered ? 'ol' : 'ul';
    return (
      <List className="da-list">
        {value.map((v, i) => (
          <li key={i}>
            <Highlight text={String(v)} term={term} />
          </li>
        ))}
      </List>
    );
  }
  return (
    <p className="da-text">
      <Highlight text={String(value)} term={term} />
    </p>
  );
}

/** A title without its old written number ("Q4. ", "10. "): the page numbers questions in difficulty order. */
const unnumbered = (title: string) => title.replace(/^\s*(?:Q\s*)?\d+\s*[.)]\s+/i, '');

const LEVEL = { 1: 'Easy', 2: 'Moderate', 3: 'Difficult' } as const;

type Filter = 'all' | 1 | 2 | 3 | 'marked';

/* the navigator's filter as it is saved in the student's position, and back */
const TO_SAVED: Record<string, PositionFilter> = { all: 'all', 1: 'easy', 2: 'moderate', 3: 'difficult', marked: 'bookmarked' };
const FROM_SAVED: Record<string, Filter> = { all: 'all', easy: 1, moderate: 2, difficult: 3, bookmarked: 'marked' };
const NAV_KEY = 'cr.topic-navigator';

/** Open or closed, as the student last left it; open on wide screens the first time. */
function initialOpen(): boolean {
  try {
    const v = localStorage.getItem(NAV_KEY);
    if (v === 'open' || v === 'closed') return v === 'open';
  } catch {
    /* storage unavailable: fall through */
  }
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 720px)').matches;
}

/** The question's difficulty: its word and one to three filled marks. */
function Level({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className={`da-level da-level--${n}`}>
      <span className="da-level__pips" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? 'is-on' : undefined} />
        ))}
      </span>
      {LEVEL[n]}
    </span>
  );
}

const filled = (q: Question, k: keyof Question) => {
  const v = q[k];
  return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : false;
};

export function TopicPage({ sp }: { sp: Specialty }) {
  const { topicId = '' } = useParams();
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const st = useStudy();
  const term = params.get('hl');
  const archive = useMemo(() => specialtyArchive(sp), [sp]);
  const sectionIndex = archive.sections.findIndex((s) => s.id === topicId);
  const section = sectionIndex >= 0 ? archive.sections[sectionIndex] : null;
  const subject = sp.subjects?.find((x) => x.id === section?.subjectId);
  const card = section ? cardFor(sp.id, section.id) : null;
  // every topic its own combination of the palettes, in board order so neighbours never match
  const palette = themePalette(pageThemeAt(Math.max(0, sectionIndex), SPECIALTY_OFFSET[sp.id] ?? 0));

  const [page, setPage] = useState(1);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [navOpen, setNavOpen] = useState(initialOpen);
  const [flash, setFlash] = useState<string | null>(null);
  // the question the student is on: the last one opened or jumped to
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const list: QuestionRef[] = useMemo(() => {
    if (!section) return [];
    if (filter === 'all') return section.questions;
    if (filter === 'marked') return section.questions.filter((q) => record(st, q.key).bookmarked);
    return section.questions.filter((q) => q.difficulty === filter);
  }, [section, filter, st]);
  // every question keeps its own number in the topic, whatever the filter shows
  const numberOf = useMemo(() => new Map((section?.questions ?? []).map((q, i) => [q.key, i + 1])), [section]);
  // every question of this doctor's archive, for pathways to link to (same mechanism, related stage)
  const links = useMemo(
    () =>
      archive.sections.flatMap((s) => s.questions.map((q) => ({ id: q.id, title: q.title, href: `${topicPath(sp, s.id)}#q-${encodeURIComponent(q.id)}`, text: q.modelAnswer }))),
    [archive, sp],
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice((page - 1) * PAGE, page * PAGE);

  // a new topic starts at its first page, unfiltered (a #q- link below may then move it)
  useEffect(() => {
    setPage(1);
    setFilter('all');
    setFocusKey(null);
  }, [topicId]);

  // arriving at #q-<id> (from search or "continue"): open its page, reveal it and bring it into view
  useEffect(() => {
    if (!section || !hash.startsWith('#q-')) return;
    const id = decodeURIComponent(hash.slice(3));
    const target = section.questions.find((q) => q.id === id);
    if (!target) return;
    // "continue studying" brings back the filter the student had, when the question still fits it
    const wanted = FROM_SAVED[params.get('filter') ?? 'all'] ?? 'all';
    const fits = (f: Filter) => f === 'all' || (f === 'marked' ? record(st, target.key).bookmarked : target.difficulty === f);
    const f = fits(wanted) ? wanted : 'all';
    const inList = f === 'all' ? section.questions : section.questions.filter((q) => (f === 'marked' ? record(st, q.key).bookmarked : q.difficulty === f));
    const i = inList.findIndex((q) => q.key === target.key);
    setFilter(f);
    setPage(Math.floor(i / PAGE) + 1);
    const key = target.key;
    setFocusKey(key);
    setRevealed((r) => new Set(r).add(key));
    setFlash(key);
    const t = window.setTimeout(() => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    const off = window.setTimeout(() => setFlash(null), 2600);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(off);
    };
  }, [hash, section]);

  // where the student is, remembered for "continue studying" (the question they're on, its page and filter)
  useEffect(() => {
    if (!section || section.id === OTHER || !list.length) return;
    const onPage = list.slice((page - 1) * PAGE, page * PAGE);
    const key = focusKey && onPage.some((q) => q.key === focusKey) ? focusKey : (onPage[0]?.key ?? null);
    study.position({ scope: `topic:${sp.id}/${section.id}`, specialty: sp.id, topic: section.id, key, index: key ? (numberOf.get(key) ?? 1) - 1 : 0, page, filter: TO_SAVED[String(filter)] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, focusKey, section?.id]);

  if (!section) {
    return (
      <ArchiveRoom className="da--plain" palette={palette}>
        <div className="da-wrap">
          <div className="da-card da-missing">
            <h1 className="da-h1">This topic isn’t in the archive</h1>
            <p>
              <Link to={archivePath(sp)}>Back to the {sp.title} subjects</Link>
            </p>
          </div>
        </div>
      </ArchiveRoom>
    );
  }

  const { sections } = archive;
  const prog = sectionProgress(st, section);
  const rated = section.questions.filter((q) => q.difficulty).length;
  const count = (f: Filter) => (f === 'all' ? section.questions.length : f === 'marked' ? section.questions.filter((q) => record(st, q.key).bookmarked).length : section.questions.filter((q) => q.difficulty === f).length);
  // difficulty filters appear once the topic's questions are rated
  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: count('all') },
    ...(rated > 0 ? ([1, 2, 3] as const).map((n) => ({ id: n as Filter, label: LEVEL[n], count: count(n) })) : []),
    { id: 'marked', label: 'Bookmarked', count: count('marked') },
  ];
  const prevTopic = sections[sectionIndex - 1];
  const nextTopic = sections[sectionIndex + 1];

  const toggleAnswer = (q: QuestionRef) => {
    const opening = !revealed.has(q.key);
    setRevealed((r) => {
      const n = new Set(r);
      if (n.has(q.key)) n.delete(q.key);
      else n.add(q.key);
      return n;
    });
    // remembered for "continue where you stopped" (outside the updater: updaters run during render)
    if (opening) {
      study.viewed(q.key);
      setFocusKey(q.key);
    }
  };

  const goPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpTo = (q: QuestionRef) => {
    const i = list.findIndex((x) => x.key === q.key);
    setPage(Math.floor(i / PAGE) + 1);
    setFocusKey(q.key);
    setTimeout(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <ArchiveRoom className="da-enter da--plain" palette={palette}>
      <div className="da-wrap">
        <nav className="da-crumbs" aria-label="Breadcrumb">
          <Link to={archivePath(sp)}>← {sp.title} subjects</Link>
          <span aria-hidden> · </span>
          <Link to="/archive/search">Search every subject</Link>
        </nav>

        <header className="da-frame da-topic-head">
          <Bow className="da-bow da-bow--tl" />
          <Bow className="da-bow da-bow--tr" flip />
          <div className="da-topic-head__inner">
            <span className="da-disc da-disc--big">{pad(section.number)}</span>
            <div>
              <p className="da-kicker">
                {subject ? `${subject.name} · ` : ''}
                {sp.title}
              </p>
              <h1 className="da-h1">
                <bdi>{section.name}</bdi>
              </h1>
              <p className="da-topic-head__meta">
                {section.questions.length} {section.questions.length === 1 ? 'question' : 'questions'} · {prog.done} reviewed
                {prog.complete && <CheckSeal className="da-inline-seal" />}
              </p>
            </div>
            {/* the topic's organ, painted straight onto its title card */}
            {card && <img className="da-topic-organ" src={card.src} alt={card.alt} decoding="async" />}
          </div>
          <Star className="da-star da-star--a" size={16} />
          <Star className="da-star da-star--c" size={12} color="#e3a24c" />
        </header>

        <div className="da-tools" ref={topRef}>
          <section className={`da-nav${navOpen ? ' is-open' : ''}`} aria-label="Question navigator">
            <button
              type="button"
              className="da-nav__head"
              aria-expanded={navOpen}
              aria-controls="da-nav-body"
              onClick={() => {
                const next = !navOpen;
                setNavOpen(next);
                try {
                  localStorage.setItem(NAV_KEY, next ? 'open' : 'closed');
                } catch {
                  /* storage unavailable: the choice lasts for this visit */
                }
              }}
            >
              <span className="da-nav__title">Question navigator</span>
              <span className="da-nav__count">
                {prog.done} / {section.questions.length} reviewed
              </span>
              <span className="da-nav__chev" aria-hidden />
              <span className="da-nav__bar" aria-hidden>
                <span style={{ width: `${(prog.done / Math.max(1, section.questions.length)) * 100}%` }} />
              </span>
            </button>

            <div id="da-nav-body" className="da-nav__body" hidden={!navOpen}>
              {rated > 0 && (
                <p className="da-nav__legend">
                  {([1, 2, 3] as const).map((n) => (
                    <span key={n} className={`da-nav__key da-lv-${n}`}>
                      <i aria-hidden />
                      {LEVEL[n]}
                    </span>
                  ))}
                </p>
              )}
              <div className="da-nav__filters" role="group" aria-label="Show questions">
                {filters.map((f) => (
                  <button key={String(f.id)} type="button" className="da-nav__filter" aria-pressed={filter === f.id} onClick={() => {
                      setFilter(f.id);
                      setPage(1);
                    }}>
                    {f.label}
                    <span className="da-nav__n">{f.count}</span>
                  </button>
                ))}
              </div>
              <div className="da-chips" role="navigation" aria-label="Questions in this topic">
                {list.map((q, i) => {
                  const num = numberOf.get(q.key) ?? i + 1;
                  const done = isReviewed(st, q.key);
                  return (
                    <button
                      key={q.key}
                      type="button"
                      className={`da-chip${q.difficulty ? ` da-lv-${q.difficulty}` : ''}${done ? ' is-done' : ''}${Math.floor(i / PAGE) + 1 === page ? ' is-here' : ''}`}
                      onClick={() => jumpTo(q)}
                      aria-label={`Question ${num}${q.difficulty ? `, ${LEVEL[q.difficulty]}` : ''}${done ? ', reviewed' : ''}`}
                    >
                      {pad(num)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="da-switches">
            <button type="button" className="da-switch" aria-pressed={allOpen} onClick={() => setAllOpen((v) => !v)}>
              {allOpen ? 'Hide all answers' : 'Show all answers'}
            </button>
          </div>
        </div>

        {list.length === 0 ? (
          <p className="da-card da-quiet">{filter === 'marked' ? 'No bookmarked questions in this topic yet.' : filter === 'all' ? 'No questions here yet.' : `No ${LEVEL[filter].toLowerCase()} questions in this topic.`}</p>
        ) : (
          <ol className="da-questions" start={(page - 1) * PAGE + 1}>
            {shown.map((q, idx) => {
              const n = numberOf.get(q.key) ?? (page - 1) * PAGE + idx + 1;
              const r = record(st, q.key);
              const done = isReviewed(st, q.key);
              const open = allOpen || revealed.has(q.key);
              const given = GIVEN.filter((s) => filled(q, s.key));
              const answer = ANSWER_ORDER[q.type].filter((s) => filled(q, s.key));
              return (
                <li key={q.key} id={`q-${q.id}`} className={`da-q${flash === q.key ? ' is-flash' : ''}${done ? ' is-done' : ''}`}>
                  <header className="da-q__head">
                    <span className="da-disc">{pad(n)}</span>
                    <div className="da-q__titles">
                      <p className="da-q__type">
                        {TYPE_LABEL[q.type]}
                        {q.difficulty && <Level n={q.difficulty} />}
                      </p>
                      <h2 className="da-q__title">
                        {answer.length > 0 ? (
                          <button type="button" className="da-q__toggle" aria-expanded={open} aria-controls={`a-${q.id}`} onClick={() => toggleAnswer(q)}>
                            <bdi>
                              <Highlight text={unnumbered(q.title)} term={term} />
                            </bdi>
                          </button>
                        ) : (
                          <bdi>
                            <Highlight text={unnumbered(q.title)} term={term} />
                          </bdi>
                        )}
                      </h2>
                    </div>
                    <div className="da-q__actions">
                      <button
                        type="button"
                        className={`da-tick${done ? ' is-on' : ''}`}
                        aria-pressed={done}
                        onClick={() => study.setStatus(q.key, done ? 'in-progress' : 'mastered')}
                      >
                        <span aria-hidden>{done ? '✓' : '○'}</span> {done ? 'Reviewed' : 'Mark reviewed'}
                      </button>
                      <button type="button" className={`da-mark${r.bookmarked ? ' is-on' : ''}`} aria-pressed={r.bookmarked} onClick={() => study.toggleBookmark(q.key)}>
                        <Ribbon filled={r.bookmarked} /> <span className="visually-hidden">{r.bookmarked ? 'Remove bookmark' : 'Bookmark'}</span>
                      </button>
                    </div>
                  </header>

                  {given.length > 0 && (
                    <div className="da-q__given">
                      {given.map((s) => (
                        <section key={s.key} className="da-q__section">
                          <h3 className="da-q__h">{s.label}</h3>
                          <Body value={q[s.key]} term={term} />
                        </section>
                      ))}
                    </div>
                  )}

                  {answer.length > 0 ? (
                    <>
                      <button type="button" className="da-reveal" aria-expanded={open} aria-controls={`a-${q.id}`} onClick={() => toggleAnswer(q)}>
                        {open ? 'Hide the answer' : 'Show the answer'}
                      </button>
                      <div id={`a-${q.id}`} className={`da-q__answer${answer.some((x) => x.key === 'modelAnswer') ? ' da-q__answer--sheet' : ''}`} hidden={!open}>
                        <p className="da-q__answer-label">Recorded answer</p>
                        {answer.map((s) => (
                          <section key={s.key} className="da-q__section">
                            {!(s.key === 'modelAnswer' && answer.length === 1) && <h3 className="da-q__h">{s.label}</h3>}
                            {s.key === 'modelAnswer' ? (
                              <StudySheet text={String(q.modelAnswer)} term={term} links={links} selfId={q.id} title={q.title} />
                            ) : (
                              <Body value={q[s.key]} term={term} ordered={s.key === 'steps'} />
                            )}
                          </section>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="da-quiet">The answer for this question hasn’t been added yet.</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <nav className="da-pager" aria-label="More questions">
          {page > 1 ? (
            <button type="button" className="da-pager__step" onClick={() => goPage(page - 1)}>
              ‹ Previous
            </button>
          ) : prevTopic ? (
            <Link className="da-pager__step" to={topicPath(sp, prevTopic.id)}>
              ‹ <bdi>{prevTopic.name}</bdi>
            </Link>
          ) : (
            <span className="da-pager__step is-off">‹ Previous</span>
          )}
          <span className="da-pager__nums">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" className={`da-pager__num${page === i + 1 ? ' is-here' : ''}`} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => goPage(i + 1)} aria-label={`Page ${i + 1}`}>
                {pad(i + 1)}
              </button>
            ))}
          </span>
          {page < pages ? (
            <button type="button" className="da-pager__step" onClick={() => goPage(page + 1)}>
              Next ›
            </button>
          ) : nextTopic ? (
            <Link className="da-pager__step" to={topicPath(sp, nextTopic.id)}>
              <bdi>{nextTopic.name}</bdi> ›
            </Link>
          ) : (
            <button type="button" className="da-pager__step" onClick={() => navigate(archivePath(sp))}>
              Contents ›
            </button>
          )}
        </nav>
      </div>
    </ArchiveRoom>
  );
}

import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Specialty } from '../../content';
import { useStudy } from '../../study/store';
import { Bow, CHARMS, CheckSeal, LemonSprig, Locket, SafetyPin, Star } from './art';
import { doctorArchive, isReviewed, pad, searchArchives, sectionProgress, topicPath } from './data';
import { ArchiveRoom, Highlight, zoomInto } from './shared';

const Medallion3D = lazy(() => import('./Medallion3D'));

/** The first real letter of a name, skipping a "Dr." or "د." title. */
export function initialOf(name: string) {
  const bare = name.replace(/^\s*(dr\.?|د\.?)\s*/i, '').trim();
  return (bare[0] ?? name[0] ?? '·').toLocaleUpperCase();
}

export function DoctorArchive({ sp }: { sp: Specialty }) {
  const { doctorId = '' } = useParams();
  const navigate = useNavigate();
  const st = useStudy();
  const [term, setTerm] = useState('');
  const archive = useMemo(() => doctorArchive(sp, doctorId), [sp, doctorId]);

  const results = useMemo(() => (archive ? searchArchives(term, { sp, doctorId }) : null), [term, sp, doctorId, archive]);

  if (!archive) {
    return (
      <ArchiveRoom>
        <div className="da-wrap">
          <div className="da-card da-missing">
            <h1 className="da-h1">This examiner isn’t in the library</h1>
            <p>
              They may have been renamed or removed. <Link to={`/specialties/${sp.slug}`}>Back to {sp.title}</Link>
            </p>
          </div>
        </div>
      </ArchiveRoom>
    );
  }

  const { doctor, sections, questions } = archive;
  const reviewed = questions.filter((q) => isReviewed(st, q.key)).length;
  const pct = questions.length ? Math.round((reviewed / questions.length) * 100) : 0;

  // continue from the most recently opened unfinished question, else the first unfinished one
  const keys = new Set(questions.map((q) => q.key));
  const recentKey = st.recent.find((r) => keys.has(r.key) && !isReviewed(st, r.key))?.key;
  const nextQ = (recentKey && questions.find((q) => q.key === recentKey)) || sections.flatMap((s) => s.questions).find((q) => !isReviewed(st, q.key));
  const nextSection = nextQ && sections.find((s) => s.questions.some((q) => q.key === nextQ.key));

  const open = (el: HTMLElement, to: string) => zoomInto(el, () => navigate(to));

  return (
    <ArchiveRoom>
      <div className="da-wrap">
        <nav className="da-crumbs" aria-label="Breadcrumb">
          <Link to={`/specialties/${sp.slug}`}>← {sp.title}</Link>
          <span aria-hidden> · </span>
          <Link to={`/archive/search`}>Search every archive</Link>
        </nav>

        <header className="da-frame da-title">
          <Bow className="da-bow da-bow--tl" />
          <Bow className="da-bow da-bow--tr" flip />
          <div className="da-title__inner">
            <div className="da-oval">
              <p className="da-kicker">{sp.title} · Examiner’s archive</p>
              <h1 className="da-name">
                <bdi>{doctor.name}</bdi>
              </h1>
              {doctor.role && <p className="da-role">{doctor.role}</p>}
              <SafetyPin className="da-pin" />
            </div>
            <div className="da-title__medal">
              <Suspense fallback={<Locket className="da-medallion__flat" />}>
                <Medallion3D letter={initialOf(doctor.name)} label={`Medallion for ${doctor.name}`} />
              </Suspense>
            </div>
          </div>
          <Star className="da-star da-star--a" size={18} />
          <Star className="da-star da-star--b" size={12} color="#7e8aa8" />
          <Star className="da-star da-star--c" size={14} color="#e3a24c" />
        </header>

        {doctor.note && <p className="da-note">{doctor.note}</p>}

        <section className="da-ledger" aria-label="Your revision">
          <dl>
            <div>
              <dt>Topics</dt>
              <dd>{sections.length}</dd>
            </div>
            <div>
              <dt>Questions</dt>
              <dd>{questions.length}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>
                {reviewed}
                <small> of {questions.length}</small>
              </dd>
            </div>
          </dl>
          <div className="da-progress">
            <div className="da-progress__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Revision progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <p>
              {questions.length === 0
                ? 'Nothing recorded from this examiner yet.'
                : reviewed === questions.length
                  ? 'Every question reviewed.'
                  : `${pct}% reviewed`}
              {nextQ && nextSection && (
                <>
                  {' · '}
                  <Link to={`${topicPath(sp, doctor.id, nextSection.id)}#q-${nextQ.id}`}>Continue where you stopped →</Link>
                </>
              )}
            </p>
          </div>
        </section>

        <section className="da-search" aria-label="Search this archive">
          <label className="visually-hidden" htmlFor="da-q">
            Search {doctor.name}’s archive
          </label>
          <input id="da-q" type="search" placeholder="Search this archive: questions, answers, topics…" value={term} onChange={(e) => setTerm(e.target.value)} dir="auto" />
          <Link className="da-search__all" to={`/archive/search${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ''}`}>
            Search all archives
          </Link>
          {results && term.trim().length >= 2 && (
            <div className="da-results" aria-live="polite">
              {results.topics.length + results.questions.length === 0 ? (
                <p className="da-quiet">Nothing in this archive mentions “{term.trim()}”.</p>
              ) : (
                <ul>
                  {results.topics.map((t) => (
                    <li key={`t-${t.section.id}`}>
                      <Link to={topicPath(sp, doctor.id, t.section.id)}>
                        <span className="da-results__kind">Topic</span>
                        <strong>
                          <Highlight text={t.section.name} term={term} />
                        </strong>
                      </Link>
                    </li>
                  ))}
                  {results.questions.map((h) => (
                    <li key={h.q.key}>
                      <Link to={`${topicPath(sp, doctor.id, h.sectionFor(doctor.id))}?hl=${encodeURIComponent(term.trim())}#q-${h.q.id}`}>
                        <span className="da-results__kind">{h.where}</span>
                        <strong>
                          <bdi>{h.q.title}</bdi>
                        </strong>
                        <span className="da-results__snip">
                          <Highlight text={h.snippet} term={term} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="da-frame da-toc" aria-labelledby="da-toc-title">
          <div className="da-toc__art" aria-hidden>
            <LemonSprig />
          </div>
          <div className="da-toc__list">
            <h2 id="da-toc-title" className="da-caps">
              Table of contents
            </h2>
            {sections.length === 0 ? (
              <p className="da-quiet">No questions have been recorded from this examiner yet. Their topics will appear here as questions are added.</p>
            ) : (
              <ol>
                {sections.map((s, i) => {
                  const p = sectionProgress(st, s);
                  const Charm = CHARMS[i % CHARMS.length];
                  const to = topicPath(sp, doctor.id, s.id);
                  return (
                    <li key={s.id}>
                      <a
                        href={to}
                        className={`da-topic${p.complete ? ' is-complete' : ''}`}
                        onClick={(e) => {
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                          e.preventDefault();
                          open(e.currentTarget, to);
                        }}
                      >
                        <span className="da-disc">{pad(s.number)}</span>
                        <span className="da-topic__text">
                          <span className="da-topic__name">
                            <bdi>{s.name}</bdi>
                          </span>
                          <span className="da-topic__meta">
                            {s.questions.length} {s.questions.length === 1 ? 'question' : 'questions'} · {p.done} reviewed
                          </span>
                          <span className="da-topic__dash" aria-hidden>
                            <span style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                          </span>
                        </span>
                        {p.complete ? <CheckSeal className="da-topic__seal" /> : <Charm className="da-topic__charm" />}
                        <span className="da-topic__go" aria-hidden>
                          →
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <p className="da-foot">
          Topics and questions update automatically as they’re added to the library.
        </p>
      </div>
    </ArchiveRoom>
  );
}

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bow, Star } from './art';
import { searchArchives, topicPath } from './data';
import { ArchiveRoom, Highlight } from './shared';

/*
  One search across every subject: subject and topic names and every word of every recorded
  question and answer. Each result leads to its subject board, its topic or the exact question.
*/

export function ArchiveSearch() {
  const [params, setParams] = useSearchParams();
  const term = params.get('q') ?? '';
  const t = term.trim();
  const res = useMemo(() => searchArchives(term), [term]);
  const total = res.subjects.length + res.topics.length + res.questions.length;
  const hl = `?hl=${encodeURIComponent(t)}`;

  return (
    <ArchiveRoom>
      <div className="da-wrap">
        <nav className="da-crumbs" aria-label="Breadcrumb">
          <Link to="/">← The library</Link>
        </nav>

        <header className="da-frame da-topic-head">
          <Bow className="da-bow da-bow--tl" />
          <Bow className="da-bow da-bow--tr" flip />
          <div className="da-search-head">
            <p className="da-kicker">Every subject</p>
            <h1 className="da-h1">Search the library</h1>
            <label className="visually-hidden" htmlFor="da-gq">
              Search subjects, topics, questions and answers
            </label>
            <input
              id="da-gq"
              type="search"
              className="da-input"
              autoFocus
              dir="auto"
              placeholder="A subject, a topic, a word from a question or answer…"
              value={term}
              onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
            />
          </div>
          <Star className="da-star da-star--a" size={16} />
          <Star className="da-star da-star--c" size={12} color="#e3a24c" />
        </header>

        {t.length < 2 ? (
          <p className="da-card da-quiet">Type at least two letters to search.</p>
        ) : total === 0 ? (
          <p className="da-card da-quiet">Nothing in the library mentions “{t}”.</p>
        ) : (
          <div className="da-found" aria-live="polite">
            <p className="da-found__count">
              {total} {total === 1 ? 'result' : 'results'} for “{t}”
            </p>

            {res.subjects.length > 0 && (
              <section className="da-card da-found__group">
                <h2 className="da-caps">Subjects</h2>
                <ul>
                  {res.subjects.map((x) => (
                    <li key={`${x.sp.id}/${x.subject.id}`}>
                      <Link to={`/specialties/${x.sp.slug}?tab=subjects&subject=${x.subject.id}`}>
                        <strong>
                          <bdi>
                            <Highlight text={x.subject.name} term={t} />
                          </bdi>
                        </strong>
                        <span className="da-found__meta">
                          {x.sp.title} · {x.count ? `${x.count} ${x.count === 1 ? 'question' : 'questions'}` : 'no questions yet'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {res.topics.length > 0 && (
              <section className="da-card da-found__group">
                <h2 className="da-caps">Topics</h2>
                <ul>
                  {res.topics.map((r) => (
                    <li key={`${r.sp.id}/${r.section.id}`}>
                      <Link to={topicPath(r.sp, r.section.id)}>
                        <strong>
                          <bdi>
                            <Highlight text={r.section.name} term={t} />
                          </bdi>
                        </strong>
                        <span className="da-found__meta">
                          {r.sp.title} · {r.section.questions.length} {r.section.questions.length === 1 ? 'question' : 'questions'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {res.questions.length > 0 && (
              <section className="da-card da-found__group">
                <h2 className="da-caps">Questions and answers</h2>
                <ul>
                  {res.questions.map((h) => (
                    <li key={h.q.key} className="da-found__q">
                      <p className="da-found__meta">
                        {h.sp.title} · matched in {h.where.toLocaleLowerCase()}
                      </p>
                      <strong>
                        <bdi>
                          <Highlight text={h.q.title} term={t} />
                        </bdi>
                      </strong>
                      <p className="da-found__snip">
                        <bdi>
                          <Highlight text={h.snippet} term={t} />
                        </bdi>
                      </p>
                      <p className="da-found__by">
                        In{' '}
                        <Link to={`${topicPath(h.sp, h.section.id)}${hl}#q-${encodeURIComponent(h.q.id)}`}>
                          <bdi>{h.section.name}</bdi>
                        </Link>
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </ArchiveRoom>
  );
}

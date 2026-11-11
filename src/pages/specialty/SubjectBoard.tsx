import { useMemo, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Specialty } from '../../content';
import { specialtyArchive, topicPath, type Section } from '../archive/data';
import { specialtyTheme, themeVars } from '../approach/palettes';
import { pct, tally } from '../../study/derive';
import { useStudy } from '../../study/store';
import './subject-board.css';

/*
  A specialty's subject board, laid out like a plate in an anatomical atlas: the specialty's
  subjects branch off a central ink spine as labelled nodes, each with its question count and
  the student's progress. Choosing a node unfolds its topics; a topic opens its questions.
  Subjects with nothing in them yet stay on the plate, marked as empty. A search box filters
  subjects and topics as you type. Colours are the specialty's combination of the approach
  palettes.
*/

interface Node {
  id: string;
  name: string;
  topics: Section[];
  count: number;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function SubjectBoard({ sp }: { sp: Specialty }) {
  const st = useStudy();
  const [params, setParams] = useSearchParams();
  const open = params.get('subject');
  const find = params.get('find') ?? '';
  const archive = useMemo(() => specialtyArchive(sp), [sp]);
  const theme = specialtyTheme(sp.id);

  const nodes: Node[] = useMemo(() => {
    const subjects = sp.subjects ?? [];
    const filed = (id: string) => archive.sections.filter((s) => s.subjectId === id);
    const list: Node[] = subjects.map((x) => {
      const topics = filed(x.id);
      return { id: x.id, name: x.name, topics, count: topics.reduce((n, t) => n + t.questions.length, 0) };
    });
    // topics not yet filed under a subject (or every topic, before subjects exist) still have a home
    const loose = archive.sections.filter((s) => !s.subjectId || !subjects.some((x) => x.id === s.subjectId));
    if (loose.length) list.push({ id: 'other', name: subjects.length ? 'Other topics' : 'Topics', topics: loose, count: loose.reduce((n, t) => n + t.questions.length, 0) });
    return list;
  }, [sp, archive]);

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const q = find.trim().toLowerCase();
  const hits = (n: Node) => !q || n.name.toLowerCase().includes(q) || n.topics.some((t) => t.name.toLowerCase().includes(q));
  const total = nodes.reduce((n, x) => n + x.count, 0);
  const plate = ROMAN[['medicine', 'surgery', 'obgyn', 'paediatrics'].indexOf(sp.id)] ?? 'I';
  const tones = [theme.accent, theme.info, theme.mech, theme.calm, theme.caution, theme.danger];

  return (
    <section className="atlas" style={themeVars(theme)} aria-label={`${sp.title} subjects`}>
      <header className="atlas__head">
        <p className="atlas__plate">Plate {plate}</p>
        <h2 className="atlas__title">{sp.title}</h2>
        <p className="atlas__meta">
          {nodes.length} {nodes.length === 1 ? 'subject' : 'subjects'} · {total} {total === 1 ? 'question' : 'questions'}
        </p>
        <label className="atlas__find">
          <span className="visually-hidden">Find a subject or topic</span>
          <input type="search" value={find} placeholder="Find a subject or topic" onChange={(e) => set('find', e.target.value || null)} />
        </label>
      </header>

      {nodes.length === 0 ? (
        <p className="atlas__empty">No subjects in {sp.title} yet.</p>
      ) : (
        <ol className="atlas__map">
          {nodes.map((n, i) => {
            const isOpen = open === n.id || (q !== '' && hits(n) && n.topics.some((t) => t.name.toLowerCase().includes(q)));
            const all = n.topics.flatMap((t) => t.questions);
            const tl = tally(all, st);
            const empty = n.count === 0;
            const tone = tones[i % tones.length];
            const shown = q ? n.topics.filter((t) => n.name.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) : n.topics;
            return (
              <li
                key={n.id}
                className={`atlas__node${i % 2 ? ' is-right' : ' is-left'}${isOpen ? ' is-open' : ''}${empty ? ' is-empty' : ''}${hits(n) ? '' : ' is-dim'}`}
                style={{ '--node': tone, '--node-pct': `${Math.round((tl.counts.mastered / Math.max(1, tl.total)) * 360)}deg` } as CSSProperties}
              >
                <button
                  type="button"
                  className="atlas__label"
                  aria-expanded={isOpen}
                  aria-controls={`atlas-${n.id}`}
                  onClick={() => set('subject', open === n.id ? null : n.id)}
                >
                  <span className="atlas__dot" aria-hidden>
                    <span>{i + 1}</span>
                  </span>
                  <span className="atlas__name">{n.name}</span>
                  <span className="atlas__count">
                    {empty ? 'No questions yet' : `${n.count} ${n.count === 1 ? 'question' : 'questions'}${tl.counts.mastered ? ` · ${pct(tl.mastered)} reviewed` : ''}`}
                  </span>
                </button>

                <div id={`atlas-${n.id}`} className="atlas__topics" hidden={!isOpen}>
                  {shown.length ? (
                    <ul>
                      {shown.map((t) => {
                        const tt = tally(t.questions, st);
                        return (
                          <li key={t.id}>
                            <Link className={`atlas__topic${t.questions.length ? '' : ' is-empty'}`} to={topicPath(sp, t.id)}>
                              <span className="atlas__topic-name">{t.name}</span>
                              <span className="atlas__topic-count">{t.questions.length ? `${t.questions.length} ${t.questions.length === 1 ? 'question' : 'questions'}` : 'No questions yet'}</span>
                              {t.questions.length > 0 && (
                                <span className="atlas__bar" aria-label={`${tt.counts.mastered} of ${tt.total} reviewed`}>
                                  <span style={{ width: `${(tt.counts.mastered / Math.max(1, tt.total)) * 100}%` }} />
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="atlas__none">Nothing filed here yet. Questions will appear as they’re added.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { useCase } from '../../content/approaches';
import { STAGES, type CaseData, type ChartSection, type Choice, type ResultRow, type Stage, type Test } from './cases/types';
import {
  allChoices,
  canLeave,
  diagnosisDone,
  initial,
  managementDone,
  missed,
  missteps,
  pendingCheckpoint,
  reducer,
  score,
  type GameState,
} from './engine';
import type { PatientLook } from './Patient';
import ward from './art/ward.jpg';
import { WardScene } from './WardScene';
import './game.css';

/*
  The case game: a junior doctor on the ward. The stage panel on the left holds the choices for
  the current stage, the dialogue panel shows what the patient says and what the consultant
  thinks of it, and the chart gathers everything found so far. Progress is kept on this device
  so a case can be left and picked up again.
*/

const STAGE_NAME: Record<Stage, string> = {
  patient: 'Patient',
  history: 'History',
  examination: 'Examination',
  investigations: 'Investigations',
  differential: 'Differential',
  diagnosis: 'Diagnosis',
};

const saveKey = (id: string) => `cr.case.${id}`;
const bestKey = (id: string) => `cr.case.best.${id}`;

function load(c: CaseData): GameState {
  try {
    const raw = localStorage.getItem(saveKey(c.id));
    const s = raw ? (JSON.parse(raw) as GameState) : null;
    if (s && s.v === 1 && Array.isArray(s.chosen)) return s;
  } catch {
    /* nothing saved, or storage blocked */
  }
  return initial(c);
}

/* ───────────── portraits ───────────── */

function ConsultantPortrait() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <rect width="120" height="120" fill="#cdbf9a" />
      <path d="M20,120 Q24,86 60,82 Q96,86 100,120 Z" fill="#56603f" stroke="#2a2118" strokeWidth="3" />
      <path d="M48,84 L60,104 L72,84" fill="#efe6d2" stroke="#2a2118" strokeWidth="2.4" />
      <path d="M54,70 L54,86 Q60,90 66,86 L66,70 Z" fill="#d9a882" stroke="#2a2118" strokeWidth="2.4" />
      <ellipse cx="60" cy="52" rx="24" ry="28" fill="#d9a882" stroke="#2a2118" strokeWidth="3" />
      <path d="M34,50 Q34,22 60,22 Q86,22 86,50 Q80,34 60,34 Q42,36 34,50 Z" fill="#8f8a86" stroke="#2a2118" strokeWidth="2.6" />
      <circle cx="60" cy="18" r="10" fill="#8f8a86" stroke="#2a2118" strokeWidth="2.6" />
      <circle cx="50" cy="54" r="7" fill="none" stroke="#2a2118" strokeWidth="2" />
      <circle cx="70" cy="54" r="7" fill="none" stroke="#2a2118" strokeWidth="2" />
      <path d="M57,54 h6" stroke="#2a2118" strokeWidth="2" />
      <circle cx="50" cy="54" r="1.8" fill="#2a2118" />
      <circle cx="70" cy="54" r="1.8" fill="#2a2118" />
      <path d="M54,68 Q60,72 66,68" fill="none" stroke="#2a2118" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="64" r="4" fill="#c8705f" opacity=".5" />
      <circle cx="76" cy="64" r="4" fill="#c8705f" opacity=".5" />
      <path d="M38,96 q6,10 0,18" fill="none" stroke="#b48a3c" strokeWidth="3" />
      <circle cx="38" cy="116" r="5" fill="#b48a3c" stroke="#2a2118" strokeWidth="2" />
    </svg>
  );
}

function Portrait({ who, look }: { who: 'patient' | 'consultant' | 'note'; look: PatientLook }) {
  return (
    <div className={`cg-portrait cg-portrait--${who}`}>
      {who === 'consultant' ? (
        <ConsultantPortrait />
      ) : who === 'patient' ? (
        // his own face, cropped from the ward picture, with the same clinical tint
        <span className="cg-portrait__crop" style={{ backgroundImage: `url(${ward})` }}>
          {(look.signs.jaundice ?? 0) > 0 && <span className="cg-portrait__tint" style={{ opacity: 0.55 * (look.signs.jaundice ?? 0) }} />}
        </span>
      ) : null}
    </div>
  );
}

/* ───────────── small pieces ───────────── */

function ResultTable({ rows }: { rows: ResultRow[] }) {
  return (
    <table className="cg-result">
      <thead>
        <tr>
          <th scope="col">Test</th>
          <th scope="col">Result</th>
          <th scope="col">Range</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className={r.flag ? `is-${r.flag}` : undefined}>
            <th scope="row">{r.name}</th>
            <td>
              {r.value}
              {r.unit && <span className="cg-result__unit"> {r.unit}</span>}
              {r.flag && (
                <span className="cg-result__flag" aria-label={r.flag === 'H' ? 'high' : 'low'}>
                  {' '}
                  {r.flag}
                </span>
              )}
            </td>
            <td>{r.range ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Report({ t }: { t: Test }) {
  return (
    <article className="cg-report">
      <p className="cg-report__head">
        <span>{t.category}</span> {t.label}
      </p>
      {t.rows ? <ResultTable rows={t.rows} /> : <p className="cg-report__text">{t.report}</p>}
    </article>
  );
}

function ChoiceList({ items, s, onChoose, disabled }: { items: Choice[]; s: GameState; onChoose: (id: string) => void; disabled?: boolean }) {
  return (
    <ul className="cg-choices">
      {items.map((x) => {
        const done = s.chosen.includes(x.id);
        return (
          <li key={x.id}>
            <button type="button" className={`cg-choice${done ? ' is-done' : ''}`} disabled={done || disabled} onClick={() => onChoose(x.id)}>
              <span className="cg-choice__mark" aria-hidden>
                {done ? '✓' : '❧'}
              </span>
              {x.label}
              {done && <span className="visually-hidden"> (done)</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── the game ───────────── */

export function CaseGame({ specialtyId, caseId, onRead }: { specialtyId: string; caseId: string; onRead?: () => void }) {
  const loaded = useCase(specialtyId, caseId);
  if (loaded.data === undefined) return <p className="ap__loading">Opening the ward…</p>;
  if (!loaded.data) return <p className="ap__loading">{loaded.error ? 'The case couldn’t be loaded. Check your connection and reload.' : 'This case isn’t open to you yet.'}</p>;
  return <Game key={loaded.data.id} c={loaded.data} onRead={onRead} />;
}

function Game({ c, onRead }: { c: CaseData; onRead?: () => void }) {
  const [s, dispatch] = useReducer(useMemo(() => reducer(c), [c]), c, load);
  const [chart, setChart] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // keep progress on this device; remember the best finished score
  useEffect(() => {
    try {
      localStorage.setItem(saveKey(c.id), JSON.stringify(s));
      if (s.done) {
        const sc = score(c, s);
        const best = Number(localStorage.getItem(bestKey(c.id)) ?? 0);
        if (sc.got > best) localStorage.setItem(bestKey(c.id), String(sc.got));
      }
    } catch {
      /* storage blocked: the case still plays */
    }
  }, [c, s]);

  // a new stage starts at the top of its panel
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [s.stage]);

  const pending = pendingCheckpoint(c, s);
  const leave = canLeave(c, s, s.stage);
  const furthest = s.reached[s.reached.length - 1];
  const next = STAGES[STAGES.indexOf(s.stage) + 1];
  const choose = (id: string) => dispatch({ t: 'choose', id });
  const sc = score(c, s);
  const said = s.turn;

  const nextButton = (label: string) =>
    next && s.stage === furthest ? (
      <div className="cg-next">
        <button type="button" className="cg-btn cg-btn--go" disabled={!leave.ok} onClick={() => dispatch({ t: 'go', stage: next })}>
          {label}
        </button>
        {!leave.ok && leave.why && <p className="cg-next__why">{leave.why}</p>}
      </div>
    ) : null;

  let panel: ReactNode;
  if (s.done) {
    panel = <EndReport c={c} s={s} onRestart={() => dispatch({ t: 'restart' })} onRead={onRead} />;
  } else if (s.stage === 'patient') {
    const introDone = s.intro >= c.intro.length - 1;
    panel = (
      <>
        <h3 className="cg-panel__h">First look</h3>
        {introDone ? (
          <>
            <p className="cg-panel__lead">He has just been settled into bed 4. What do you do first?</p>
            <ChoiceList items={c.firstLook} s={s} onChoose={choose} disabled={!!pending} />
          </>
        ) : (
          <p className="cg-panel__lead">Listen to the handover and the patient first.</p>
        )}
        {nextButton('Start the history')}
      </>
    );
  } else if (s.stage === 'history') {
    const groups = [...new Set(c.history.map((h) => h.group))];
    const asked = c.history.filter((h) => s.chosen.includes(h.id)).length;
    panel = (
      <>
        <h3 className="cg-panel__h">History</h3>
        <p className="cg-panel__lead">
          {asked} {asked === 1 ? 'question' : 'questions'} asked. Choose the ones that tell causes apart.
        </p>
        {groups.map((g) => (
          <section key={g} className="cg-group">
            <h4 className="cg-group__h">{g}</h4>
            <ChoiceList items={c.history.filter((h) => h.group === g)} s={s} onChoose={choose} disabled={!!pending} />
          </section>
        ))}
        {nextButton('Move on to the examination')}
      </>
    );
  } else if (s.stage === 'examination') {
    panel = (
      <>
        <h3 className="cg-panel__h">Examination</h3>
        <p className="cg-panel__lead">What will you examine?</p>
        <ChoiceList items={c.exam} s={s} onChoose={choose} disabled={!!pending} />
        {nextButton('Move on to investigations')}
      </>
    );
  } else if (s.stage === 'investigations') {
    const cats = [...new Set(c.tests.map((t) => t.category))];
    const shown = c.tests.find((t) => t.id === s.lastResult);
    const results = c.tests.filter((t) => s.chosen.includes(t.id) && (t.rows || t.report));
    panel = (
      <>
        <h3 className="cg-panel__h">Investigations</h3>
        {shown && <Report t={shown} />}
        {results.length > 1 && (
          <div className="cg-resultlinks" role="group" aria-label="Results so far">
            {results.map((t) => (
              <button key={t.id} type="button" className={`cg-chip${t.id === s.lastResult ? ' is-on' : ''}`} aria-pressed={t.id === s.lastResult} onClick={() => dispatch({ t: 'show-result', id: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <p className="cg-panel__lead">Order what answers a question. Results arrive in the chart.</p>
        {cats.map((cat) => (
          <section key={cat} className="cg-group">
            <h4 className="cg-group__h">{cat}</h4>
            <ChoiceList items={c.tests.filter((t) => t.category === cat)} s={s} onChoose={choose} disabled={!!pending} />
          </section>
        ))}
        {nextButton('Build the differential')}
      </>
    );
  } else if (s.stage === 'differential') {
    panel = (
      <>
        <h3 className="cg-panel__h">Differential board</h3>
        <p className="cg-panel__lead">Keep what the evidence supports, strike what it rules out. Open a card to weigh it.</p>
        <Board c={c} s={s} onMark={(id, mark) => dispatch({ t: 'board', id, mark })} />
        {nextButton('Make the diagnosis')}
      </>
    );
  } else {
    const dxDone = diagnosisDone(c, s);
    panel = (
      <>
        <h3 className="cg-panel__h">{c.diagnosis.question}</h3>
        <Picks options={c.diagnosis.options} tries={s.dxTries} done={dxDone} onPick={(id) => dispatch({ t: 'diagnose', id })} />
        {dxDone && (
          <>
            <h3 className="cg-panel__h cg-panel__h--then">{c.management.question}</h3>
            <Picks options={c.management.options} tries={s.mgTries} done={managementDone(c, s)} onPick={(id) => dispatch({ t: 'manage', id })} />
          </>
        )}
      </>
    );
  }

  return (
    <section className={`cg${s.done ? ' is-done' : ''}`} aria-label={`Case ${c.number}: ${c.title}`}>
      <nav className="cg-tabs" aria-label="Stages of the case">
        {STAGES.map((st) => {
          const reached = s.reached.includes(st);
          const complete = reached && (st !== furthest || s.done);
          return (
            <button
              key={st}
              type="button"
              className={`cg-tab${s.stage === st && !s.done ? ' is-on' : ''}${complete ? ' is-done' : ''}`}
              aria-current={s.stage === st ? 'step' : undefined}
              disabled={!reached}
              onClick={() => dispatch({ t: 'go', stage: st })}
            >
              {complete && (
                <span className="cg-seal" aria-hidden>
                  ✓
                </span>
              )}
              {STAGE_NAME[st]}
              {!reached && <span className="visually-hidden"> (not reached yet)</span>}
            </button>
          );
        })}
      </nav>

      <div className="cg-stage">
        <WardScene patient={c.patient.look} heartRate={c.vitals.heartRate} label={`${c.patient.name} lying in a hospital bed in a lamp-lit ward.`} />

        <div className="cg-tools">
          <span className="cg-points" title="Clinical reasoning points">
            {sc.got} pts
          </span>
          <button type="button" className="cg-btn cg-btn--small" onClick={() => setChart(true)} aria-haspopup="dialog">
            Patient chart
          </button>
          {!s.done && c.hints[s.stage] && (
            <button type="button" className="cg-btn cg-btn--small" onClick={() => dispatch({ t: 'hint' })}>
              Ask the consultant
            </button>
          )}
        </div>

        <div className="cg-panel" ref={panelRef}>
          <div className="cg-panel__patient">
            <p className="cg-card__case">Case {c.number}</p>
            <h2 className="cg-card__name">{c.patient.name}</h2>
            <p className="cg-panel__meta">
              {c.patient.age} · {c.patient.sex} · {c.patient.complaint} · <span className="cg-card__status">{s.done ? 'Plan agreed' : 'Stable'}</span>
            </p>
          </div>
          {panel}
        </div>

        {said && (
          <div className={`cg-talk${said.tone ? ` is-${said.tone}` : ''}`} aria-live="polite">
            <Portrait who={said.who} look={c.patient.look} />
            <div className="cg-talk__body">
              <p className="cg-talk__who">{said.who === 'consultant' ? 'Dr Haddad, consultant' : said.who === 'patient' ? c.patient.name : 'Ward note'}</p>
              <p className="cg-talk__text">{said.text}</p>
              {said.teach && (
                <p className="cg-talk__teach">
                  <span className="cg-talk__teach-who">Dr Haddad:</span> {said.teach}
                </p>
              )}
              {s.stage === 'patient' && s.intro < c.intro.length - 1 && (
                <div className="cg-talk__actions">
                  <button type="button" className="cg-btn" onClick={() => dispatch({ t: 'next-intro' })}>
                    Continue
                  </button>
                </div>
              )}
              {pending && (
                <div className="cg-quiz">
                  <p className="cg-quiz__q">
                    <span className="cg-talk__teach-who">Dr Haddad asks:</span> {pending.question}
                  </p>
                  <div className="cg-quiz__opts">
                    {pending.options.map((o, i) => {
                      const tried = (s.answers[pending.id] ?? []).includes(i);
                      return (
                        <button key={i} type="button" className={`cg-btn cg-btn--opt${tried ? ' is-wrong' : ''}`} disabled={tried} onClick={() => dispatch({ t: 'answer', checkpoint: pending.id, option: i })}>
                          {o.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {chart && <Chart c={c} s={s} onClose={() => setChart(false)} />}
      </div>
    </section>
  );
}

/* ───────────── the differential board ───────────── */

function Board({ c, s, onMark }: { c: CaseData; s: GameState; onMark: (id: string, mark: 'pinned' | 'struck' | null) => void }) {
  const fact = (id: string) => c.facts.find((f) => f.id === id);
  return (
    <ul className="cg-board">
      {c.differentials.map((d) => {
        const mark = s.board[d.id];
        const pro = d.for.filter((f) => s.facts.includes(f));
        const con = d.against.filter((f) => s.facts.includes(f));
        return (
          <li key={d.id} className={`cg-dx${mark ? ` is-${mark}` : ''}`}>
            <details>
              <summary>
                <span className="cg-dx__name">{d.name}</span>
                <span className="cg-dx__count">
                  {pro.length} for · {con.length} against
                </span>
              </summary>
              <div className="cg-dx__body">
                {pro.length === 0 && con.length === 0 && <p className="cg-dx__none">Nothing found yet for or against this.</p>}
                {pro.length > 0 && (
                  <>
                    <p className="cg-dx__h cg-dx__h--for">Supports it</p>
                    <ul>
                      {pro.map((f) => (
                        <li key={f}>{fact(f)?.text}</li>
                      ))}
                    </ul>
                  </>
                )}
                {con.length > 0 && (
                  <>
                    <p className="cg-dx__h cg-dx__h--against">Argues against it</p>
                    <ul>
                      {con.map((f) => (
                        <li key={f}>{fact(f)?.text}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </details>
            <div className="cg-dx__marks" role="group" aria-label={`${d.name}: keep or strike`}>
              <button type="button" className="cg-mark cg-mark--keep" aria-pressed={mark === 'pinned'} onClick={() => onMark(d.id, mark === 'pinned' ? null : 'pinned')}>
                Keep
              </button>
              <button type="button" className="cg-mark cg-mark--strike" aria-pressed={mark === 'struck'} onClick={() => onMark(d.id, mark === 'struck' ? null : 'struck')}>
                Strike
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Picks({ options, tries, done, onPick }: { options: Array<{ id: string; text: string; correct?: boolean }>; tries: string[]; done: boolean; onPick: (id: string) => void }) {
  return (
    <ul className="cg-choices">
      {options.map((o) => {
        const tried = tries.includes(o.id);
        const reveal = done && o.correct;
        return (
          <li key={o.id}>
            <button
              type="button"
              className={`cg-choice${tried && !o.correct ? ' is-wrong' : ''}${reveal ? ' is-right' : ''}`}
              disabled={done || tried}
              onClick={() => onPick(o.id)}
            >
              <span className="cg-choice__mark" aria-hidden>
                {reveal ? '✓' : tried ? '✗' : '❧'}
              </span>
              {o.text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── the patient chart ───────────── */

function Chart({ c, s, onClose }: { c: CaseData; s: GameState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      prev?.focus();
    };
  }, [onClose]);
  // the order a doctor writes the clerking in, whatever order things were found
  const ORDER: ChartSection[] = ['Presentation', 'History', 'Past history', 'Drugs', 'Social', 'Family', 'Vital signs', 'Examination'];
  const sections = ORDER.filter((sec) => c.facts.some((f) => f.section === sec));
  const results = c.tests.filter((t) => s.chosen.includes(t.id) && (t.rows || t.report));
  return (
    <div className="cg-chart" role="dialog" aria-modal="true" aria-label="Patient chart" tabIndex={-1} ref={ref}>
      <div className="cg-chart__sheet">
        <header className="cg-chart__head">
          <div>
            <p className="cg-card__case">Patient chart · Case {c.number}</p>
            <h3 className="cg-card__name">
              {c.patient.name}, {c.patient.age}
            </h3>
          </div>
          <button type="button" className="cg-btn cg-btn--small" onClick={onClose}>
            Close
          </button>
        </header>
        {sections.map((sec) => {
          const found = c.facts.filter((f) => f.section === sec && s.facts.includes(f.id) && sec !== 'Results');
          if (sec === 'Results') return null;
          return (
            <section key={sec} className="cg-chart__sec">
              <h4>{sec}</h4>
              {found.length ? (
                <ul>
                  {found.map((f) => (
                    <li key={f.id} className={f.negative ? 'is-neg' : undefined}>
                      {f.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cg-chart__empty">Nothing recorded yet.</p>
              )}
            </section>
          );
        })}
        <section className="cg-chart__sec">
          <h4>Results</h4>
          {results.length ? results.map((t) => <Report key={t.id} t={t} />) : <p className="cg-chart__empty">No results yet.</p>}
        </section>
      </div>
    </div>
  );
}

/* ───────────── the end-of-case report ───────────── */

function EndReport({ c, s, onRestart, onRead }: { c: CaseData; s: GameState; onRestart: () => void; onRead?: () => void }) {
  const sc = score(c, s);
  const pct = Math.round((sc.got / sc.max) * 100);
  const right = c.diagnosis.options.find((o) => o.correct)!;
  const miss = missed(c, s);
  const slips = missteps(c, s);
  const weak = sc.lines.filter((l) => l.max > 0 && l.got / l.max < 0.6);
  const area: Record<string, string> = {
    'History and first look': 'history',
    Examination: 'exam',
    'Choice of investigations': 'tests',
    Interpretation: 'interpretation',
    'Differential diagnosis': 'differential',
    Diagnosis: 'diagnosis',
    Management: 'diagnosis',
  };
  const revise = [...new Set(weak.map((l) => area[l.name]))].map((w) => c.revise.find((r) => r.when === w)).filter(Boolean);
  const facts = (neg: boolean) => c.facts.filter((f) => s.facts.includes(f.id) && !!f.negative === neg && f.section !== 'Presentation');
  const ordered = allChoices(c).filter((x) => c.tests.some((t) => t.id === x.id) && s.chosen.includes(x.id));

  return (
    <div className="cg-end">
      <h3 className="cg-panel__h">Case report</h3>
      <p className="cg-end__score">
        <strong>{sc.got}</strong> of {sc.max} reasoning points <span>({pct}%)</span>
      </p>
      <dl className="cg-end__lines">
        {sc.lines.map((l) => (
          <div key={l.name}>
            <dt>{l.name}</dt>
            <dd>
              <span className="cg-end__bar" aria-hidden>
                <span style={{ width: `${l.max ? (l.got / l.max) * 100 : 0}%` }} />
              </span>
              {l.got}/{l.max}
            </dd>
          </div>
        ))}
      </dl>

      <section className="cg-end__sec">
        <h4>Final diagnosis</h4>
        <p>{right.text}</p>
      </section>
      <section className="cg-end__sec">
        <h4>The reasoning</h4>
        <ol>
          {c.reasoning.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>
      <section className="cg-end__sec">
        <h4>Findings that mattered</h4>
        <ul>
          {facts(false).map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
        <h4>Important negatives</h4>
        <ul>
          {facts(true).map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      </section>
      <section className="cg-end__sec">
        <h4>Investigations you requested</h4>
        <p>{ordered.length ? ordered.map((t) => t.label).join(', ') : 'None.'}</p>
      </section>
      {miss.length > 0 && (
        <section className="cg-end__sec">
          <h4>Clues you didn’t reach for</h4>
          <ul>
            {miss.map((m) => (
              <li key={m.id}>
                <strong>{m.label}</strong>
                {m.teach && <> — {m.teach}</>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {slips.length > 0 && (
        <section className="cg-end__sec">
          <h4>Decisions that cost points</h4>
          <ul>
            {slips.map((m) => (
              <li key={m.id}>
                <strong>{m.label}</strong>
                {m.teach && <> — {m.teach}</>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {revise.length > 0 && (
        <section className="cg-end__sec">
          <h4>To revise in the written approach</h4>
          <ul>
            {revise.map((r) => (
              <li key={r!.when}>{r!.text}</li>
            ))}
          </ul>
        </section>
      )}
      {s.hints.length > 0 && <p className="cg-end__note">You asked the consultant for {s.hints.length === 1 ? 'one hint' : `${s.hints.length} hints`}.</p>}
      <blockquote className="cg-end__quote">
        <p>{c.closing}</p>
        <footer>Dr Haddad</footer>
      </blockquote>
      <div className="cg-end__actions">
        <button type="button" className="cg-btn cg-btn--go" onClick={onRestart}>
          Play the case again
        </button>
        {onRead && (
          <button type="button" className="cg-btn" onClick={onRead}>
            Read the approach
          </button>
        )}
      </div>
    </div>
  );
}

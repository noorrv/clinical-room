import { useMemo, type ReactNode } from 'react';
import { StudySheet } from './StudySheet';
import './historychart.css';

/*
  A focused history laid out as a vintage hospital history sheet rather than a question and answer:
  a printed department heading and a typed patient label, then the history as clerking notes, each
  section with handwritten "Ask" and "Why" notes in the margin. Red flags sit in a stamped block,
  the summary is a pull-quote, and the impression, mind map and examiner follow-ups close the sheet.

  Written in the answer as boxes:
    :::patient            Name: … / Age: … / History from: … / Complaint: …   (one "Label: value" a line)
    :::section Title      the notes (any study-sheet markup), then margin notes on lines starting
                          "> Ask:" or "> Why:"
    :::redflags Title     usually a table
    :::summary Title      the summary to say to the examiner
    :::impression Title   the DDx in order
  Anything else (a :::mindmap, :::followup boxes) is drawn by the study sheet after the chart.
*/

interface Box {
  kind: string;
  title: string;
  lines: string[];
}

function splitBoxes(text: string): { boxes: Box[]; rest: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const boxes: Box[] = [];
  const rest: string[] = [];
  const CHART = /^:::(patient|section|redflags|summary|impression)\s*(.*)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(CHART);
    if (!m) {
      rest.push(lines[i]);
      continue;
    }
    const body: string[] = [];
    i++;
    while (i < lines.length && lines[i].trim() !== ':::') body.push(lines[i++]);
    boxes.push({ kind: m[1], title: m[2].trim(), lines: body });
  }
  return { boxes, rest: rest.join('\n').trim() };
}

/** true if an answer is written as a history chart */
export const isHistoryChart = (text: string | null | undefined) => !!text && /^\s*:::patient\b/m.test(text);

function Margin({ lines, term }: { lines: string[]; term: string | null }) {
  if (!lines.length) return null;
  return (
    <aside className="hx-margin" aria-label="Notes">
      {lines.map((l, i) => {
        const m = l.match(/^(Ask|Why):\s*(.*)$/i);
        const kind = m ? m[1].toLowerCase() : 'why';
        return (
          <p key={i} className={`hx-note hx-note--${kind}`}>
            <span className="hx-note__tag">{kind === 'ask' ? 'Ask' : 'Why'}</span>
            <span className="hx-note__text">
              <StudySheet text={m ? m[2] : l} term={term} />
            </span>
          </p>
        );
      })}
    </aside>
  );
}

export function HistoryChart({ text, term = null, actions, topic }: { text: string; term?: string | null; actions?: ReactNode; topic?: string }) {
  const { boxes, rest } = useMemo(() => splitBoxes(text), [text]);
  const patient = boxes.find((b) => b.kind === 'patient');
  const fields = (patient?.lines ?? [])
    .map((l) => l.match(/^\s*([^:]+):\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1].trim(), m[2].trim()] as const);

  return (
    <article className="hx">
      <div className="hx__frame">
        <header className="hx__head">
          <p className="hx__dept">The Clinical Room · Paediatric Department · History sheet</p>
          <h3 className="hx__title">{topic || 'History sheet'}</h3>
          {actions && <div className="hx__actions">{actions}</div>}
        </header>

        {fields.length > 0 && (
          <dl className="hx-label">
            {fields.map(([k, v]) => (
              <div key={k} className={`hx-label__row${/complaint/i.test(k) ? ' hx-label__row--wide' : ''}`}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="hx__body">
          {boxes
            .filter((b) => b.kind !== 'patient')
            .map((b, i) => {
              if (b.kind === 'section') {
                const notes = b.lines.filter((l) => /^\s*>\s?/.test(l)).map((l) => l.replace(/^\s*>\s?/, '').trim());
                const main = b.lines.filter((l) => !/^\s*>\s?/.test(l)).join('\n').trim();
                return (
                  <section key={i} className="hx-sec">
                    <h4 className="hx-sec__title">
                      <span>{b.title}</span>
                    </h4>
                    <div className={`hx-sec__row${notes.length ? '' : ' hx-sec__row--solo'}`}>
                      <div className="hx-sec__notes">{main && <StudySheet text={main} term={term} />}</div>
                      <Margin lines={notes} term={term} />
                    </div>
                  </section>
                );
              }
              const body = b.lines.join('\n').trim();
              if (b.kind === 'redflags')
                return (
                  <section key={i} className="hx-flags">
                    <p className="hx-flags__stamp" aria-hidden>
                      Red flags
                    </p>
                    <h4 className="hx-flags__title">{b.title || 'Red flags'}</h4>
                    <StudySheet text={body} term={term} />
                  </section>
                );
              if (b.kind === 'summary')
                return (
                  <section key={i} className="hx-summary">
                    <h4 className="hx-summary__title">{b.title || 'Summary'}</h4>
                    <blockquote className="hx-summary__quote">
                      <StudySheet text={body} term={term} />
                    </blockquote>
                  </section>
                );
              return (
                <section key={i} className="hx-impression">
                  <h4 className="hx-impression__title">{b.title || 'Impression'}</h4>
                  <StudySheet text={body} term={term} />
                </section>
              );
            })}
        </div>

        {rest && (
          <div className="hx__after">
            <StudySheet text={rest} term={term} />
          </div>
        )}
        <p className="hx__foot" aria-hidden>
          Clerked for revision · The Clinical Room
        </p>
      </div>
    </article>
  );
}

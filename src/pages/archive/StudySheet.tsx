import { Fragment, type ReactNode } from 'react';
import { Highlight } from './shared';
import './studysheet.css';

/*
  Renders a recorded answer as an illustrated study sheet, in the manner of an old medical
  encyclopedia. The answer stays ordinary text in the database (selectable, searchable, editable
  in the admin editor), written in a small markup:

    ## Section title            ### Sub-heading
    - bullet                     1. numbered item
    | a | b |  tables (first row is the header; <br> breaks a line inside a cell)
    ![Caption](/clinical/photo.jpg)          a captioned photograph or illustration
    :::kind Title                a boxed note, closed by a line with ::: on its own
      kinds: definition, pearl, remember, important, tip, say, note, reference, group
    :::step 3 Hand positioning   a numbered examination step
    **bold**  *italic*

  Plain text with none of this renders as paragraphs, so older answers look as they did.
  Nothing here injects HTML.
*/

type Block =
  | { t: 'h2' | 'h3' | 'p'; text: string }
  | { t: 'ul' | 'ol'; items: string[]; start: number }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'img'; src: string; caption: string; attrs: Record<string, string> }
  | { t: 'box'; kind: string; title: string; body: Block[]; num?: string };

const LIST_UL = /^\s*[-•]\s+(.*)$/;
const LIST_OL = /^\s*(\d+)\.\s+(.*)$/;
// ![caption](image){page=…; credit=…; license=…; licenseUrl=…; added=yes}: the braces are optional
const IMG = /^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{(.*)\})?\s*$/;

function parseAttrs(s: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (s ?? '').split(/;\s+/)) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

const safeUrl = (u: string | undefined) => (u && /^(https:\/\/|\/)/.test(u) ? u : undefined);

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (inner[i] === '|') {
      cells.push(cur.trim());
      cur = '';
    } else cur += inner[i];
  }
  cells.push(cur.trim());
  return cells;
}

export function parseSheet(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: 'p', text: para.join('\n') });
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      i++;
      continue;
    }

    const open = trimmed.match(/^:::(\w+)\s*(.*)$/);
    if (open && open[1]) {
      flush();
      const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') inner.push(lines[i++]);
      i++; // the closing :::
      let title = open[2].trim();
      let num: string | undefined;
      if (open[1] === 'step') {
        const m = title.match(/^(\S+)\s*(.*)$/);
        num = m?.[1];
        title = m?.[2] ?? '';
      }
      out.push({ t: 'box', kind: open[1], title, num, body: parseSheet(inner.join('\n')) });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flush();
      out.push({ t: 'h2', text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flush();
      out.push({ t: 'h3', text: trimmed.slice(4) });
      i++;
      continue;
    }

    const img = trimmed.match(IMG);
    if (img) {
      flush();
      out.push({ t: 'img', caption: img[1], src: img[2], attrs: parseAttrs(img[3]) });
      i++;
      continue;
    }

    if (trimmed.startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const r = splitRow(lines[i]);
        if (!r.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(r);
        i++;
      }
      out.push({ t: 'table', head: rows[0] ?? [], rows: rows.slice(1) });
      continue;
    }

    const ul = trimmed.match(LIST_UL);
    const ol = trimmed.match(LIST_OL);
    if (ul || ol) {
      flush();
      const kind = ul ? 'ul' : 'ol';
      const items: string[] = [];
      const start = ol ? Number(ol[1]) : 1;
      while (i < lines.length) {
        const m = kind === 'ul' ? lines[i].match(LIST_UL) : lines[i].match(LIST_OL);
        if (!m) break;
        items.push(kind === 'ul' ? m[1] : m[2]);
        i++;
      }
      out.push({ t: kind, items, start });
      continue;
    }

    para.push(line);
    i++;
  }
  flush();
  return out;
}

/** The plain words of a sheet, for search and excerpts (markup removed). */
export function sheetText(src: string): string {
  return src
    .replace(/^:::\w*\s*/gm, '')
    .replace(/^#{2,3}\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)(\{[^}]*\})?/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/<br>/g, ' ')
    .replace(/^\|?\s*:?-{2,}.*$/gm, '')
    .replace(/\\\|/g, '¦')
    .replace(/\|/g, ' · ')
    .replace(/¦/g, '|')
    .replace(/[ \t]+/g, ' ');
}

/* ───────────── inline text ───────────── */

function Inline({ text, term }: { text: string; term: string | null }) {
  // line breaks inside a paragraph or cell, then **bold** and *italic*
  const lines = text.split(/\n|<br>/);
  return (
    <>
      {lines.map((ln, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {ln.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, pi) => {
            if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={pi}><Highlight text={part.slice(2, -2)} term={term} /></strong>;
            if (/^\*[^*\s][^*]*\*$/.test(part)) return <em key={pi}><Highlight text={part.slice(1, -1)} term={term} /></em>;
            return <Highlight key={pi} text={part} term={term} />;
          })}
        </Fragment>
      ))}
    </>
  );
}

const BOX_LABEL: Record<string, string> = {
  definition: 'Definition',
  pearl: 'Clinical pearl',
  remember: 'Remember',
  important: 'Important',
  tip: 'OSCE tip',
  say: 'Say to the examiner',
  note: 'Note',
  reference: 'Reference',
};

function Blocks({ blocks, term }: { blocks: Block[]; term: string | null }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h2':
            return (
              <h3 key={i} className="ss-h2">
                <span className="ss-h2__rule" aria-hidden />
                <span className="ss-h2__text">
                  <Inline text={b.text} term={term} />
                </span>
                <span className="ss-h2__rule" aria-hidden />
              </h3>
            );
          case 'h3':
            return (
              <h4 key={i} className="ss-h3">
                <Inline text={b.text} term={term} />
              </h4>
            );
          case 'p':
            return (
              <p key={i} className="ss-p">
                <Inline text={b.text} term={term} />
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="ss-ul">
                {b.items.map((it, k) => (
                  <li key={k}>
                    <Inline text={it} term={term} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="ss-ol" start={b.start}>
                {b.items.map((it, k) => (
                  <li key={k}>
                    <Inline text={it} term={term} />
                  </li>
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={i} className="ss-table" role="region" aria-label="Table" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, k) => (
                        <th key={k} scope="col">
                          <Inline text={h} term={term} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, k) => (
                      <tr key={k}>
                        {r.map((c, n) =>
                          n === 0 ? (
                            <th key={n} scope="row">
                              <Inline text={c} term={term} />
                            </th>
                          ) : (
                            <td key={n}>
                              <Inline text={c} term={term} />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'img': {
            const page = safeUrl(b.attrs.page);
            const src = safeUrl(b.src);
            if (!src) return null;
            const picture = <img src={src} alt={b.caption} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
            const licence = safeUrl(b.attrs.licenseUrl);
            return (
              <figure key={i} className={`ss-fig${b.attrs.added === 'yes' ? ' ss-fig--added' : ''}`}>
                <div className="ss-fig__plate">
                  {page ? (
                    <a href={page} target="_blank" rel="noopener noreferrer" aria-label={`${b.caption} (opens the original source)`}>
                      {picture}
                    </a>
                  ) : (
                    picture
                  )}
                </div>
                {b.caption && (
                  <figcaption>
                    <span className="ss-fig__label">Fig.</span> <Inline text={b.caption} term={term} />
                    {(b.attrs.credit || b.attrs.added === 'yes') && (
                      <span className="ss-fig__credit">
                        {b.attrs.added === 'yes' && <span className="ss-fig__added">Added illustration</span>}
                        {b.attrs.credit && (
                          <>
                            {' '}
                            {page ? (
                              <a href={page} target="_blank" rel="noopener noreferrer">
                                {b.attrs.credit}
                              </a>
                            ) : (
                              b.attrs.credit
                            )}
                          </>
                        )}
                        {licence && b.attrs.license && (
                          <>
                            {' · '}
                            <a href={licence} target="_blank" rel="noopener noreferrer license">
                              licence
                            </a>
                          </>
                        )}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            );
          }
          case 'box':
            if (b.kind === 'group')
              return (
                <p key={i} className="ss-group">
                  <Inline text={b.body.map((x) => ('text' in x ? x.text : '')).join(' ')} term={term} />
                </p>
              );
            if (b.kind === 'step')
              return (
                <section key={i} className="ss-step">
                  <span className="ss-step__num" aria-hidden>
                    {b.num}
                  </span>
                  <div className="ss-step__body">
                    <h4 className="ss-step__title">
                      <span className="visually-hidden">Step {b.num}: </span>
                      <Inline text={b.title} term={term} />
                    </h4>
                    <Blocks blocks={b.body} term={term} />
                  </div>
                </section>
              );
            return (
              <aside key={i} className={`ss-box ss-box--${b.kind}`}>
                <p className="ss-box__label">
                  <Inline text={b.title || BOX_LABEL[b.kind] || b.kind} term={term} />
                </p>
                <Blocks blocks={b.body} term={term} />
              </aside>
            );
        }
      })}
    </>
  );
}

/** A recorded answer laid out as a study sheet. */
export function StudySheet({ text, term = null }: { text: string; term?: string | null }): ReactNode {
  return (
    <div className="ss">
      <Blocks blocks={parseSheet(text)} term={term} />
    </div>
  );
}

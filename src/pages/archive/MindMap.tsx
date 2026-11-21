import { useLayoutEffect, useMemo, useRef, useState } from 'react';

/*
  A mind map drawn in ink: the topic in the centre, thick coloured branches curving out to either
  side, and a thin twig from each branch to every point under it. On a narrow screen the branches
  all curve out to the right of the topic so the words stay readable. Written in the answer as an
  indented "- " list (top-level items are the branches, indented items the twigs); **bold** marks
  the key point on a twig. Hidden behind a toggle, so the written answer stays as it is.
*/

export interface MapNode {
  text: string;
  kids: MapNode[];
}

/** An indented "- " list as a tree: two spaces (or a tab) of indent per level. */
export function parseMap(raw: string): MapNode[] {
  const roots: MapNode[] = [];
  const stack: Array<{ depth: number; node: MapNode }> = [];
  for (const line of raw.replace(/\t/g, '  ').split('\n')) {
    const m = line.match(/^(\s*)[-•]\s+(.*)$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const node: MapNode = { text: m[2].trim(), kids: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    (stack.length ? stack[stack.length - 1].node.kids : roots).push(node);
    stack.push({ depth, node });
  }
  return roots;
}

const TONES = ['#8a2c34', '#3f6a62', '#a07a2c', '#4d5f86', '#687653', '#7a4a6a'];
const INK = '#40382f';
const plain = (s: string) => s.replace(/\*\*/g, '').replace(/\[\[\w+:([^\]]+)\]\]/g, '$1');

type Word = { w: string; bold: boolean; glue?: boolean }; // glue: no space before it (punctuation after bold)
type Line = Word[];

/** words with their bold flag, from text that may hold **bold** runs */
function words(text: string): Word[] {
  const out: Word[] = [];
  text
    .replace(/\[\[\w+:([^\]]+)\]\]/g, '$1')
    .split('**')
    .forEach((part, i) => {
      const toks = part.split(/\s+/).filter(Boolean);
      toks.forEach((w, n) => out.push({ w, bold: i % 2 === 1, glue: n === 0 && out.length > 0 && !/^\s/.test(part) }));
    });
  return out;
}

/** wraps text to a width, by an average character width for the face (good enough for Garamond) */
function wrap(text: string, maxW: number, size: number): Line[] {
  const cw = size * 0.47;
  const lines: Line[] = [];
  let cur: Line = [];
  let len = 0;
  for (const word of words(text)) {
    const add = (cur.length && !word.glue ? 1 : 0) + word.w.length;
    if (cur.length && (len + add) * cw > maxW) {
      lines.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(word);
    len += (cur.length > 1 && !word.glue ? 1 : 0) + word.w.length;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

const lineWidth = (l: Line, size: number) => l.reduce((n, w, i) => n + w.w.length + (i ? 1 : 0), 0) * size * 0.47;

interface Placed {
  tone: string;
  side: 1 | -1;
  bx: number; // the branch label's inner edge (towards the centre)
  by: number;
  bw: number;
  blines: Line[];
  leaves: Array<{ x: number; y: number; lines: Line[] }>;
}

function layout(branches: MapNode[], title: string, W: number) {
  const narrow = W < 620;
  const fs = { root: narrow ? 17 : 20, branch: narrow ? 14 : 15.5, leaf: narrow ? 13 : 14 };
  const lh = (s: number) => s * 1.28;

  const rootLines = wrap(title, narrow ? 84 : 180, fs.root);
  const rootW = Math.max(...rootLines.map((l) => lineWidth(l, fs.root))) + (narrow ? 22 : 40);
  const rootH = rootLines.length * lh(fs.root) + 20;

  const gapRB = narrow ? 20 : 34; // root to branch label
  const branchMax = narrow ? 96 : 124;
  const gapBL = narrow ? 16 : 28; // branch label to twig text
  const sides: Array<1 | -1> = narrow ? branches.map(() => 1) : branches.map((_, i) => (i < Math.ceil(branches.length / 2) ? 1 : -1));

  const rootX = narrow ? 6 + rootW / 2 : W / 2;
  const half = narrow ? W - (rootX + rootW / 2) - 6 : W / 2 - rootW / 2 - 6;

  // measure each branch block
  const blocks = branches.map((b, i) => {
    const blines = wrap(b.text, branchMax, fs.branch);
    const bw = Math.max(...blines.map((l) => lineWidth(l, fs.branch))) + 18;
    const leafMax = Math.max(80, half - gapRB - bw - gapBL);
    const leaves = b.kids.map((k) => wrap(k.text, leafMax, fs.leaf));
    const leavesH = leaves.reduce((n, l) => n + l.length * lh(fs.leaf), 0) + Math.max(0, leaves.length - 1) * 7;
    const bh = blines.length * lh(fs.branch) + 12;
    return { b, i, blines, bw, leaves, h: Math.max(bh, leavesH) };
  });

  const GAP = narrow ? 16 : 20;
  const sideHeight = (s: 1 | -1) => blocks.filter((k) => sides[k.i] === s).reduce((n, k) => n + k.h + GAP, -GAP);
  const H = Math.max(sideHeight(1), sideHeight(-1), rootH) + 40;
  const cy = H / 2;

  const placed: Placed[] = [];
  for (const s of [1, -1] as const) {
    const mine = blocks.filter((k) => sides[k.i] === s);
    if (!mine.length) continue;
    let y = cy - sideHeight(s) / 2;
    for (const k of mine) {
      const by = y + k.h / 2;
      const bx = rootX + s * (rootW / 2 + gapRB);
      const leafX = bx + s * (k.bw + gapBL);
      const total = k.leaves.reduce((n, l) => n + l.length * lh(fs.leaf), 0) + Math.max(0, k.leaves.length - 1) * 7;
      let ly = by - total / 2;
      const leaves = k.leaves.map((lines) => {
        const h = lines.length * lh(fs.leaf);
        const out = { x: leafX, y: ly + h / 2, lines };
        ly += h + 7;
        return out;
      });
      placed.push({ tone: TONES[k.i % TONES.length], side: s, bx, by, bw: k.bw, blines: k.blines, leaves });
      y += k.h + GAP;
    }
  }
  return { H, cy, rootX, rootW, rootH, rootLines, placed, fs, lh, narrow };
}

/** a line of words as tspans, bold where marked */
function Words({ line }: { line: Line }) {
  return (
    <>
      {line.map((w, i) => (
        <tspan key={i} fontWeight={w.bold ? 700 : undefined}>
          {(i && !w.glue ? ' ' : '') + w.w}
        </tspan>
      ))}
    </>
  );
}

function Drawing({ branches, title, W }: { branches: MapNode[]; title: string; W: number }) {
  const L = useMemo(() => layout(branches, title, W), [branches, title, W]);
  const { H, cy, rootX, rootW, rootH, rootLines, placed, fs, lh } = L;
  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`;
  };
  return (
    <svg className="ss-mind__svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      {placed.map((p, i) => {
        const startX = rootX + p.side * (rootW / 2 - 6);
        const outer = p.bx + p.side * p.bw;
        return (
          <g key={i}>
            {/* the branch: a thick curve from the topic, tapering by a second, thinner stroke */}
            <path d={curve(startX, cy, p.bx, p.by)} stroke={p.tone} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.85} />
            <path d={`M${p.bx} ${p.by + 10} H${outer}`} stroke={p.tone} strokeWidth={2} strokeLinecap="round" />
            <text
              className="ss-mind__branch"
              x={p.side === 1 ? p.bx + 9 : p.bx - 9}
              y={p.by + 6 - (p.blines.length - 1) * lh(fs.branch)}
              textAnchor={p.side === 1 ? 'start' : 'end'}
              fill={p.tone}
              fontSize={fs.branch}
            >
              {p.blines.map((l, n) => (
                <tspan key={n} x={p.side === 1 ? p.bx + 9 : p.bx - 9} dy={n ? lh(fs.branch) : 0}>
                  <Words line={l} />
                </tspan>
              ))}
            </text>
            {/* the twigs */}
            {p.leaves.map((lf, j) => {
              const end = lf.x - p.side * 6;
              const top = lf.y - ((lf.lines.length - 1) * lh(fs.leaf)) / 2;
              return (
                <g key={j}>
                  <path d={curve(outer, p.by + 10, end, lf.y)} stroke={p.tone} strokeWidth={1.4} fill="none" opacity={0.7} />
                  <circle cx={end} cy={lf.y} r={2.6} fill={p.tone} />
                  <text className="ss-mind__leaf" x={lf.x} y={top + fs.leaf * 0.36} textAnchor={p.side === 1 ? 'start' : 'end'} fontSize={fs.leaf} fill={INK}>
                    {lf.lines.map((l, n) => (
                      <tspan key={n} x={lf.x} dy={n ? lh(fs.leaf) : 0}>
                        <Words line={l} />
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      {/* the topic, last so it sits over the roots of the branches */}
      <g>
        <ellipse cx={rootX} cy={cy} rx={rootW / 2 + 4} ry={rootH / 2 + 4} fill="none" stroke="#c9bda8" strokeWidth={1} />
        <ellipse cx={rootX} cy={cy} rx={rootW / 2} ry={rootH / 2} fill="#faf6ec" stroke={INK} strokeWidth={1.6} />
        <text className="ss-mind__root" x={rootX} y={cy + fs.root * 0.34 - ((rootLines.length - 1) * lh(fs.root)) / 2} textAnchor="middle" fontSize={fs.root} fill={INK}>
          {rootLines.map((l, n) => (
            <tspan key={n} x={rootX} dy={n ? lh(fs.root) : 0}>
              <Words line={l} />
            </tspan>
          ))}
        </text>
      </g>
    </svg>
  );
}

/** On a phone: the topic at the top left, a trunk down the left edge, each branch curving off it
 *  to the right with its twigs hanging below, so the words have the whole width and nothing
 *  crosses them. */
function DrawingNarrow({ branches, title, W }: { branches: MapNode[]; title: string; W: number }) {
  const fs = { root: 18, branch: 15, leaf: 14 };
  const lh = (n: number) => n * 1.3;
  const trunk = 14; // x of the trunk
  const bx = 40; // x where branch labels start
  const leafX = 64;
  const rootLines = wrap(title, W - 60, fs.root);
  const rootW = Math.max(...rootLines.map((l) => lineWidth(l, fs.root))) + 36;
  const rootH = rootLines.length * lh(fs.root) + 18;
  const rootCx = 4 + rootW / 2;
  const rootB = 6 + rootH;

  let y = rootB + 22;
  const placed = branches.map((b, i) => {
    const blines = wrap(b.text, W - bx - 6, fs.branch);
    const bw = Math.max(...blines.map((l) => lineWidth(l, fs.branch))) + 8;
    const labelH = blines.length * lh(fs.branch);
    const top = y;
    const under = top + labelH + 4;
    let ly = under + 12;
    const leaves = b.kids.map((k) => {
      const lines = wrap(k.text, W - leafX - 6, fs.leaf);
      const h = lines.length * lh(fs.leaf);
      const out = { y: ly + fs.leaf * 0.5, lines };
      ly += h + 6;
      return out;
    });
    y = ly + 14;
    return { tone: TONES[i % TONES.length], blines, bw, top, under, leaves };
  });
  const H = y;
  const lastUnder = placed.length ? placed[placed.length - 1].under : rootB;

  return (
    <svg className="ss-mind__svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      {/* the trunk */}
      <path d={`M${trunk} ${rootB - 2} V${lastUnder - 16}`} stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      {placed.map((p, i) => (
        <g key={i}>
          <path d={`M${trunk} ${p.under - 26} C${trunk} ${p.under} ${trunk} ${p.under} ${bx} ${p.under}`} stroke={p.tone} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.85} />
          <path d={`M${bx} ${p.under} H${bx + p.bw}`} stroke={p.tone} strokeWidth={2} strokeLinecap="round" />
          <text className="ss-mind__branch" x={bx} y={p.top + fs.branch * 0.9} fontSize={fs.branch} fill={p.tone}>
            {p.blines.map((l, n) => (
              <tspan key={n} x={bx} dy={n ? lh(fs.branch) : 0}>
                <Words line={l} />
              </tspan>
            ))}
          </text>
          {p.leaves.map((lf, j) => (
            <g key={j}>
              <path d={`M${bx + 8} ${p.under} C${bx + 8} ${lf.y} ${bx + 8} ${lf.y} ${leafX - 8} ${lf.y}`} stroke={p.tone} strokeWidth={1.4} fill="none" opacity={0.7} />
              <circle cx={leafX - 8} cy={lf.y} r={2.6} fill={p.tone} />
              <text className="ss-mind__leaf" x={leafX} y={lf.y + fs.leaf * 0.34} fontSize={fs.leaf} fill={INK}>
                {lf.lines.map((l, n) => (
                  <tspan key={n} x={leafX} dy={n ? lh(fs.leaf) : 0}>
                    <Words line={l} />
                  </tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
      ))}
      <ellipse cx={rootCx} cy={6 + rootH / 2} rx={rootW / 2} ry={rootH / 2} fill="#faf6ec" stroke={INK} strokeWidth={1.6} />
      <text className="ss-mind__root" x={rootCx} y={6 + rootH / 2 + fs.root * 0.34 - ((rootLines.length - 1) * lh(fs.root)) / 2} textAnchor="middle" fontSize={fs.root} fill={INK}>
        {rootLines.map((l, n) => (
          <tspan key={n} x={rootCx} dy={n ? lh(fs.root) : 0}>
            <Words line={l} />
          </tspan>
        ))}
      </text>
    </svg>
  );
}

export function MindMap({ title, raw }: { title: string; raw: string }) {
  const branches = useMemo(() => parseMap(raw), [raw]);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [W, setW] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!open || !el) return;
    const measure = () => setW(Math.floor(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!branches.length) return null;
  return (
    <details className="ss-map" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="ss-map__toggle">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="ss-map__icon">
          <circle cx="12" cy="12" r="3" />
          <path d="M9.2 10.8C6.5 9 5 7 3.5 6M9.2 13.2C6.5 15 5 17 3.5 18M14.8 10.8C17.5 9 19 7 20.5 6M14.8 13.2C17.5 15 19 17 20.5 18" fill="none" />
        </svg>
        <span className="ss-map__toggle-text">Mind map</span>
        <span className="ss-map__toggle-hint">{plain(title)}</span>
      </summary>
      <figure className="ss-mind" aria-label={`Mind map: ${plain(title)}`}>
        <div ref={box} className="ss-mind__canvas">
          {W > 0 && (W < 560 ? <DrawingNarrow branches={branches} title={title} W={W} /> : <Drawing branches={branches} title={title} W={W} />)}
        </div>
        {/* the same map as a list, for screen readers */}
        <ul className="visually-hidden">
          {branches.map((b, i) => (
            <li key={i}>
              {plain(b.text)}
              {b.kids.length > 0 && (
                <ul>
                  {b.kids.map((k, j) => (
                    <li key={j}>{plain(k.text)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </figure>
    </details>
  );
}

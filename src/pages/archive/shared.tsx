import { Fragment, useEffect, type ReactNode } from 'react';
import './archive.css';
import { PALETTES, paletteStyle, type Palette } from './palettes';

/*
  Pieces shared by the doctor archive pages: their own typefaces (loaded only here), the
  framed panel, search-term highlighting and the zoom into a topic.
*/

const ARCHIVE_FONTS = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Arimo:wght@400;600;700&display=swap';

export function useArchiveFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${ARCHIVE_FONTS}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = ARCHIVE_FONTS;
    document.head.appendChild(l);
  }, []);
}

/** The archive's outer world: the doctor's painted pattern and palette (Amalfi wash by default). */
export function ArchiveRoom({ children, className = '', palette = PALETTES[0] }: { children: ReactNode; className?: string; palette?: Palette }) {
  useArchiveFonts();
  return (
    <div className={`da ${className}`} style={paletteStyle(palette)} data-palette={palette.id}>
      {children}
    </div>
  );
}

/** Wraps every occurrence of the search term in <mark>. */
export function Highlight({ text, term }: { text: string; term?: string | null }) {
  const t = term?.trim();
  if (!t || t.length < 2) return <>{text}</>;
  const lower = text.toLocaleLowerCase();
  const needle = t.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let at = lower.indexOf(needle);
  while (at >= 0) {
    if (at > i) parts.push(<Fragment key={`t${i}`}>{text.slice(i, at)}</Fragment>);
    parts.push(<mark key={`m${at}`}>{text.slice(at, at + t.length)}</mark>);
    i = at + t.length;
    at = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(<Fragment key={`t${i}`}>{text.slice(i)}</Fragment>);
  return <>{parts}</>;
}

/**
 * Zooms from a contents panel into its topic: the panel lifts, a framed card grows from it to fill
 * the screen, the topic page opens beneath, and the card fades away. Skipped under reduced motion.
 */
export function zoomInto(el: HTMLElement, go: () => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof el.animate !== 'function') {
    go();
    return;
  }
  const r = el.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'da-zoom-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  const room = getComputedStyle(el);
  ghost.style.borderColor = room.getPropertyValue('--da-butter').trim() || '#f6d77a';
  Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(ghost);

  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
  const grow = ghost.animate(
    [
      { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: '10px', opacity: 0.4 },
      { opacity: 1, offset: 0.25 },
      { left: '0px', top: '0px', width: `${window.innerWidth}px`, height: `${window.innerHeight}px`, borderRadius: '0px', opacity: 1 },
    ],
    { duration: 460, delay: 90, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
  );
  grow.onfinish = () => {
    go();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => ghost.remove();
    });
  };
}

import { Fragment, useEffect, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import './archive.css';
import { withOrnaments } from './ornaments';
import { PALETTES, paletteStyle, type Palette } from './palettes';

/*
  Pieces shared by the doctor archive pages: their own typefaces (loaded only here), the
  framed panel, search-term highlighting and the zoom into a topic.
*/

const ARCHIVE_FONTS = 'https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Arimo:wght@400;600;700&family=Special+Elite&display=swap';

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
  if (!t || t.length < 2) return <>{withOrnaments(text)}</>;
  const lower = text.toLocaleLowerCase();
  const needle = t.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let at = lower.indexOf(needle);
  while (at >= 0) {
    if (at > i) parts.push(<Fragment key={`t${i}`}>{withOrnaments(text.slice(i, at))}</Fragment>);
    parts.push(<mark key={`m${at}`}>{withOrnaments(text.slice(at, at + t.length))}</mark>);
    i = at + t.length;
    at = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(<Fragment key={`t${i}`}>{withOrnaments(text.slice(i))}</Fragment>);
  return <>{parts}</>;
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Zooms from a contents panel into its topic.
 *
 * Where the browser supports View Transitions, the clicked panel itself grows into the topic page's
 * header (a shared-element morph, drawn on the GPU) while the rest of the page crossfades. Elsewhere a
 * paper card scales up from the panel with transforms only, the page opens beneath it and the card
 * fades away. Skipped entirely under reduced motion.
 */
export function zoomInto(el: HTMLElement, go: () => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    go();
    return;
  }

  const doc = document as ViewTransitionDoc;
  if (typeof doc.startViewTransition === 'function') {
    const root = document.documentElement;
    el.style.setProperty('view-transition-name', 'da-zoom');
    root.classList.add('da-vt');
    try {
      const vt = doc.startViewTransition(() => {
        flushSync(go);
        window.scrollTo(0, 0);
      });
      vt.finished.finally(() => {
        root.classList.remove('da-vt');
        el.style.removeProperty('view-transition-name');
      });
      return;
    } catch {
      root.classList.remove('da-vt');
      el.style.removeProperty('view-transition-name');
    }
  }

  if (typeof el.animate !== 'function') {
    go();
    return;
  }
  // fallback: a full-screen paper card that starts as the panel's box and scales up (transform only)
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ghost = document.createElement('div');
  ghost.className = 'da-zoom-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.background = getComputedStyle(el).getPropertyValue('--da-cream').trim() || '#fdf3d9';
  document.body.appendChild(ghost);
  const from = `translate(${r.left}px, ${r.top}px) scale(${r.width / vw}, ${r.height / vh})`;
  const grow = ghost.animate(
    [
      { transform: from, opacity: 0.6 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 440, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
  );
  grow.onfinish = () => {
    go();
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-out', fill: 'forwards' });
      fade.onfinish = () => ghost.remove();
    });
  };
}

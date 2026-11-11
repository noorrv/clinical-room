import { useEffect, useRef, type RefObject } from 'react';

/*
  The homepage's ornaments (hanging baubles, dust in the light, steam from the teacup, the
  handwritten quote) loop forever. Each running loop makes the browser recalculate styles and
  repaint every frame, which measured at most of a phone's main thread and dozens of dropped
  frames per scroll. They now rest while the page is scrolling and while they are off-screen,
  and carry on from the same spot afterwards. The CSS lives in styles/base.css ([data-loops]).
*/

let watching = false;

/** Marks <html> with .is-scrolling while any scroll is under way. Call once at start-up. */
export function watchScrolling() {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  const root = document.documentElement;
  let timer = 0;
  const settle = () => {
    root.classList.remove('is-scrolling');
    timer = 0;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (timer) window.clearTimeout(timer);
      else root.classList.add('is-scrolling');
      timer = window.setTimeout(settle, 160);
    },
    { passive: true, capture: true },
  );
}

/**
 * Lets an element's looping ornaments rest while it is off-screen. The element needs a
 * data-loops attribute; onChange hears about visibility too (to pause a video, say).
 */
export function useLoopsInView(ref: RefObject<Element>, onChange?: (visible: boolean) => void) {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.toggleAttribute('data-offscreen', !entry.isIntersecting);
        callback.current?.(entry.isIntersecting);
      },
      { rootMargin: '120px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

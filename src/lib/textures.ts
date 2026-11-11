/*
  Paper, lace and cloth textures are drawn as SVG: vector line work and feTurbulence noise filters.
  The browser redraws an SVG background for every tile it paints, so on long pages scrolling kept
  re-running the noise filters and re-stroking thousands of paths (measured: 30–60 dropped frames a
  scroll on the homepage, the specialty directory and the admin pages).

  Here each texture is drawn once into a canvas at the screen's pixel density and handed back to CSS
  as a bitmap, so the page looks exactly the same but painting it is a plain copy of pixels. The
  bitmaps are kept in Cache Storage, so later visits skip the drawing. If anything is unsupported or
  fails, the SVG stays in place: the textures never go missing.
*/

/** Every texture variable defined on :root in styles/tokens.css, smallest first. */
const TEXTURES = [
  '--grain',
  '--paper-tooth',
  '--paper-tooth-fine',
  '--paper-specks',
  '--tex-cloth-weave',
  '--paper-fibres',
  '--tex-lace',
  '--tex-stripe',
  '--fibers',
  '--tex-cloth-fade',
  '--tex-archive-border',
  '--paper-age',
  '--tex-emboss',
];

const CACHE = 'clinical-room-textures-v1';

/** Short stable hash of a texture's source, so a changed texture gets a fresh bitmap. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36) + text.length.toString(36);
}

/** The address inside a CSS url(...) value, or null. */
function urlOf(value: string): string | null {
  const m = value.trim().match(/^url\(\s*(['"]?)([\s\S]*)\1\s*\)$/);
  return m ? m[2] : null;
}

/** Draw an SVG (file or data: address) into a PNG at the given scale. */
async function draw(src: string, scale: number): Promise<Blob> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  if (!w || !h) throw new Error('texture has no size');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png'));
}

async function bitmapFor(src: string, scale: number): Promise<Blob> {
  const key = `${location.origin}/__textures/${hash(src)}@${scale}x.png`;
  let cache: Cache | undefined;
  try {
    cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    if (hit) return await hit.blob();
  } catch {
    /* no Cache Storage (private mode, old browser): draw every visit */
  }
  const blob = await draw(src, scale);
  cache?.put(key, new Response(blob, { headers: { 'Content-Type': 'image/png' } })).catch(() => undefined);
  return blob;
}

const idle = (cb: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cb, { timeout: 1200 });
  else setTimeout(cb, 60); // Safari before 18
};

let started = false;

/** Swap the SVG textures for bitmaps, one at a time while the browser is idle. Call once at start-up. */
export function bakeTextures() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // image-set() tells CSS the bitmap's density, so sizes and border-image slices stay as they were
  if (!CSS.supports('background-image', 'image-set(url("x.png") 2x)')) return;
  const scale = Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const queue = TEXTURES.map((name) => ({ name, src: urlOf(styles.getPropertyValue(name)) })).filter(
    (t): t is { name: string; src: string } => !!t.src && (t.src.startsWith('data:image/svg') || t.src.endsWith('.svg')),
  );

  const next = () => {
    const t = queue.shift();
    if (!t) return;
    bitmapFor(t.src, scale)
      .then((blob) => root.style.setProperty(t.name, `image-set(url("${URL.createObjectURL(blob)}") ${scale}x)`))
      .catch(() => undefined) // keep the SVG
      .finally(() => idle(next));
  };
  idle(next);
}

import { useEffect, useRef, useState } from 'react';
import { Locket } from './art';

/*
  The one 3D piece in the archive: a gilt medallion bearing the doctor's initial, turning gently
  and leaning toward the pointer. It draws only while visible, rests under reduced motion, and
  falls back to the flat drawn locket if WebGL isn't available.
*/

export default function Medallion3D({ letter, label }: { letter: string; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      if (disposed) return;
      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFailed(true);
        return;
      }
      const size = () => Math.max(120, el.clientWidth);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size(), size());
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.1, 7);

      scene.add(new THREE.AmbientLight(0xfff3dc, 1.6));
      const key = new THREE.DirectionalLight(0xfff0cc, 2.2);
      key.position.set(-3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x9fb0e0, 0.9);
      rim.position.set(4, -2, -3);
      scene.add(rim);

      // the face: initial, caduceus-like flourish and a ring of stars, painted onto a canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      // a cylinder's cap maps the texture a quarter-turn round, so the face is painted turned back
      ctx.translate(0, 512);
      ctx.rotate(-Math.PI / 2);
      const grad = ctx.createRadialGradient(200, 180, 40, 256, 256, 280);
      grad.addColorStop(0, '#f6d891');
      grad.addColorStop(1, '#b8803a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#8f5d24';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(256, 256, 214, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#7a4c1c';
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      await document.fonts.load('200px "IM Fell English"').catch(() => undefined);
      ctx.fillStyle = '#5c3b14';
      ctx.font = '230px "IM Fell English", "Amiri", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 256, 268);
      const face = new THREE.CanvasTexture(canvas);
      face.colorSpace = THREE.SRGBColorSpace;

      const gold = new THREE.MeshStandardMaterial({ color: 0xd9a64e, metalness: 0.45, roughness: 0.38 });
      const faceMat = new THREE.MeshStandardMaterial({ map: face, metalness: 0.25, roughness: 0.5 });

      const medal = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.22, 96), [gold, faceMat, faceMat]);
      body.rotation.x = Math.PI / 2;
      medal.add(body);
      const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.09, 24, 120), gold);
      medal.add(rimRing);
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 16, 48), gold);
      bail.position.y = 1.72;
      medal.add(bail);
      scene.add(medal);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let target = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        target = { x: ((e.clientY - r.top) / r.height - 0.5) * 0.5, y: ((e.clientX - r.left) / r.width - 0.5) * 0.8 };
      };
      window.addEventListener('pointermove', onMove);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);

      let raf = 0;
      const clock = new THREE.Clock();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const t = clock.getElapsedTime();
        const sway = reduce ? 0 : Math.sin(t * 0.6) * 0.35;
        medal.rotation.y += (sway + target.y - medal.rotation.y) * 0.06;
        medal.rotation.x += (target.x - medal.rotation.x) * 0.06;
        medal.position.y = reduce ? 0 : Math.sin(t * 0.9) * 0.05;
        renderer.render(scene, camera);
      };
      tick();

      const onResize = () => renderer.setSize(size(), size());
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', onResize);
        face.dispose();
        gold.dispose();
        faceMat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [letter]);

  return (
    <div className="da-medallion" ref={host} role="img" aria-label={label}>
      {failed && <Locket className="da-medallion__flat" />}
    </div>
  );
}

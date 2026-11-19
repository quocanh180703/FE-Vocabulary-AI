/**
 * Interactive glass & typography micro-effects adapted cleanly from:
 * - React Bits Glass Surface pattern (cursor-tracking --glint-x / --glint-y)
 * - Codrops pointer tilt (clamped <= 4deg inside app, <= 5deg on hero card)
 * - Scene depth parallax (--parallax-x / --parallax-y)
 * Runs on a single requestAnimationFrame throttle and respects prefers-reduced-motion.
 */
export function attachSagePointerEffects(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  let lastCoords: { x: number; y: number; target: EventTarget | null } | null = null;

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || reduceMotion.matches) return;
    lastCoords = { x: e.clientX, y: e.clientY, target: e.target };
    if (queued) return;
    queued = true;

    window.requestAnimationFrame(() => {
      queued = false;
      if (!lastCoords) return;
      const { x, y, target } = lastCoords;
      const el = target instanceof Element ? target : null;
      if (!el) return;

      const glass = el.closest<HTMLElement>('.glass, .card, .kpi, .hero-card');
      if (glass) {
        const r = glass.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          glass.style.setProperty('--glint-x', (((x - r.left) / r.width) * 100).toFixed(1) + '%');
          glass.style.setProperty('--glint-y', (((y - r.top) / r.height) * 100).toFixed(1) + '%');
          glass.style.setProperty('--glint-alpha', '.95');
        }
      }

      const tilt = el.closest<HTMLElement>('.tilt-target, .hero-card, .flashcard');
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const maxDeg = tilt.dataset.tiltMax ? Number(tilt.dataset.tiltMax) : 4;
          const rx = Math.max(-maxDeg, Math.min(maxDeg, (0.5 - (y - r.top) / r.height) * maxDeg * 2));
          const ry = Math.max(-maxDeg, Math.min(maxDeg, ((x - r.left) / r.width - 0.5) * maxDeg * 2));
          tilt.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
          tilt.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
        }
      }

      const bg = document.querySelector<HTMLElement>('.scene-depth');
      if (bg) {
        bg.style.setProperty('--parallax-x', (((x / window.innerWidth) - 0.5) * 8).toFixed(1) + 'px');
        bg.style.setProperty('--parallax-y', (((y / window.innerHeight) - 0.5) * 6).toFixed(1) + 'px');
      }
    });
  };

  const onPointerOut = (e: PointerEvent) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;

    const glass = el.closest<HTMLElement>('.glass, .card, .kpi, .hero-card');
    if (glass && (!related || !glass.contains(related))) {
      glass.style.setProperty('--glint-alpha', '.62');
    }

    const tilt = el.closest<HTMLElement>('.tilt-target, .hero-card, .flashcard');
    if (tilt && (!related || !tilt.contains(related))) {
      tilt.style.setProperty('--tilt-x', '0deg');
      tilt.style.setProperty('--tilt-y', '0deg');
    }
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerout', onPointerOut, { passive: true });

  return () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerout', onPointerOut);
  };
}

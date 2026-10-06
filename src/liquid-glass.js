// A lightweight, shared liquid-glass surface.  It deliberately keeps the
// backdrop in the compositor and only updates a pair of CSS variables, so it
// has the visual response of a liquid panel without a WebGL canvas per card.
export function initLiquidGlass(root = document) {
  const panels = [...root.querySelectorAll('[data-liquid-glass]')];
  if (!panels.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const cleanups = panels.map(panel => {
    let frame = 0;
    let pointer;
    const move = event => {
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = panel.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        panel.style.setProperty('--liquid-x', `${(pointer.x - rect.left) / rect.width * 100}%`);
        panel.style.setProperty('--liquid-y', `${(pointer.y - rect.top) / rect.height * 100}%`);
      });
    };
    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      panel.style.removeProperty('--liquid-x');
      panel.style.removeProperty('--liquid-y');
    };
    panel.addEventListener('pointermove', move, { passive: true });
    panel.addEventListener('pointerleave', leave);
    panel.addEventListener('pointercancel', leave);
    return () => {
      leave();
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerleave', leave);
      panel.removeEventListener('pointercancel', leave);
    };
  });
  return () => cleanups.forEach(cleanup => cleanup());
}

const clamp = (number, min, max) => Math.min(max, Math.max(min, number));

export function initFriendAquarium(root) {
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { destroy() {} };
  const bubbles = [...root.querySelectorAll('[data-friend-orb]')];
  if (!bubbles.length) return { destroy() {} };
  let nodes = [];
  let frame = 0;
  let previous = performance.now();
  let visible = !document.hidden;

  const measure = () => {
    const width = root.clientWidth;
    const height = root.clientHeight;
    nodes = bubbles.map((element, index) => {
      const size = element.getBoundingClientRect().width || 64;
      const radius = size / 2;
      const old = nodes[index];
      return {
        element, radius,
        x: old ? clamp(old.x, radius, width - radius) : radius + (width - radius * 2) * ((index * .371 + .19) % 1),
        y: old ? clamp(old.y, radius, height - radius) : radius + (height - radius * 2) * ((index * .617 + .27) % 1),
        vx: old?.vx ?? (42 + index * 11) * (index % 2 ? -1 : 1),
        vy: old?.vy ?? (34 + index * 9) * (index % 3 ? 1 : -1),
        paused: false,
      };
    });
  };
  const place = node => { node.element.style.transform = `translate3d(${node.x - node.radius}px, ${node.y - node.radius}px, 0)`; };
  const collide = (a, b) => {
    const dx = b.x - a.x; const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy) || .001;
    const minimum = a.radius + b.radius;
    if (distance >= minimum) return;
    const nx = dx / distance; const ny = dy / distance;
    const overlap = (minimum - distance) / 2 + .2;
    if (!a.paused) { a.x -= nx * overlap; a.y -= ny * overlap; }
    if (!b.paused) { b.x += nx * overlap; b.y += ny * overlap; }
    const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (relative <= 0) return;
    const impulse = relative;
    if (!a.paused) { a.vx -= impulse * nx; a.vy -= impulse * ny; }
    if (!b.paused) { b.vx += impulse * nx; b.vy += impulse * ny; }
  };
  const tick = now => {
    const delta = Math.min((now - previous) / 1000, .04); previous = now;
    const width = root.clientWidth; const height = root.clientHeight;
    if (visible && width && height) {
      nodes.forEach(node => {
        if (!node.paused) { node.x += node.vx * delta; node.y += node.vy * delta; }
        if (node.x < node.radius || node.x > width - node.radius) { node.x = clamp(node.x, node.radius, width - node.radius); node.vx *= -1; }
        if (node.y < node.radius || node.y > height - node.radius) { node.y = clamp(node.y, node.radius, height - node.radius); node.vy *= -1; }
      });
      for (let a = 0; a < nodes.length; a += 1) for (let b = a + 1; b < nodes.length; b += 1) collide(nodes[a], nodes[b]);
      nodes.forEach(place);
    }
    frame = requestAnimationFrame(tick);
  };
  bubbles.forEach((element, index) => {
    const pause = () => { if (nodes[index]) nodes[index].paused = true; };
    const resume = () => { if (nodes[index]) nodes[index].paused = false; };
    element.addEventListener('pointerenter', pause); element.addEventListener('pointerleave', resume);
    element.addEventListener('focus', pause); element.addEventListener('blur', resume);
  });
  const observer = new ResizeObserver(measure); observer.observe(root);
  const visibility = () => { visible = !document.hidden; previous = performance.now(); };
  document.addEventListener('visibilitychange', visibility);
  measure(); frame = requestAnimationFrame(tick);
  return { destroy() { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); } };
}

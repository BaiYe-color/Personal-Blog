// 拖动约束与弹簧回弹。挂坠固定在页眉，不随页面内容重建。
import { backgroundAt, choosePendantInk } from './pendant-contrast.js';

export function attachmentPoint(left, top, size, inset, x, y, radians) {
  const radius = size / 2 - inset;
  return { x: left + size / 2 + x + radius * Math.sin(radians), y: top + size / 2 + y - radius * Math.cos(radians) };
}
export function constrainPull(x, y, limit = 125) {
  y = Math.max(-18, y);
  const distance = Math.hypot(x, y);
  const ratio = distance > limit ? limit / distance : 1;
  return { x: x * ratio, y: y * ratio };
}

export function initPendant({ onRelease, onActivity }) {
  const button = document.querySelector('#gpt-pendant-button');
  const rope = document.querySelector('#pendant-rope');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0, y = 0, vx = 0, vy = 0;
  let pointer = null, originX = 0, originY = 0, startX = 0, startY = 0;
  let frame = 0, previousTime = 0, moved = false, suppressClick = false;
  let contrastFrame = 0;
  const updateContrast = () => {
    const rect = button.getBoundingClientRect();
    const ink = choosePendantInk(backgroundAt(rect.left + rect.width / 2, rect.top + rect.height / 2));
    button.parentElement.style.setProperty('--pendant-ink', ink);
    button.dataset.ink = ink;
  };
  const scheduleContrast = () => {
    if (!contrastFrame) contrastFrame = requestAnimationFrame(() => { contrastFrame = 0; updateContrast(); });
  };

  const draw = () => {
    const angle = Math.atan2(x, 84 + y) * 180 / Math.PI;
    const rotation = -angle * .55;
    button.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    // 同时计算平移与绕中心旋转后的图形挂点，绳端不会与标志分离。
    const end = attachmentPoint(button.offsetLeft, button.offsetTop, button.offsetWidth, 6, x, y, rotation * Math.PI / 180);
    rope.setAttribute('d', `M 46 0 Q ${46 + (end.x - 46) * .3} ${end.y * .45} ${end.x} ${end.y}`);
    button.dataset.pull = Math.hypot(x, y).toFixed(1);
    updateContrast();
  };
  const active = () => pointer !== null || frame !== 0;
  const finish = () => { x = y = vx = vy = 0; frame = 0; previousTime = 0; draw(); onActivity(); };
  const step = time => {
    const dt = Math.min((time - previousTime) / 1000 || 1 / 60, .032);
    previousTime = time;
    vx += (-145 * x - 10 * vx) * dt;
    vy += (-165 * y - 12 * vy) * dt;
    x += vx * dt; y += vy * dt;
    draw();
    if (Math.hypot(x, y) < .15 && Math.hypot(vx, vy) < 1) finish();
    else frame = requestAnimationFrame(step);
  };
  const spring = () => {
    if (reducedMotion.matches) { finish(); return; }
    previousTime = 0;
    frame = requestAnimationFrame(step);
    onActivity();
  };
  button.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pointer = event.pointerId;
    originX = event.clientX; originY = event.clientY; startX = x; startY = y;
    moved = false;
    suppressClick = false;
    vx = vy = 0;
    button.setPointerCapture(pointer);
    button.classList.add('dragging');
    onActivity();
  });
  button.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    const pull = constrainPull(startX + event.clientX - originX, startY + event.clientY - originY);
    moved ||= Math.hypot(event.clientX - originX, event.clientY - originY) > 4;
    x = pull.x; y = pull.y;
    draw();
  });
  const release = (event, cancelled = false) => {
    if (event.pointerId !== pointer) return;
    const id = pointer;
    pointer = null;
    button.classList.remove('dragging');
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    suppressClick = moved;
    spring();
    if (!cancelled && moved) onRelease();
  };
  button.addEventListener('pointerup', event => release(event));
  button.addEventListener('pointercancel', event => release(event, true));
  button.addEventListener('lostpointercapture', event => release(event, true));
  button.addEventListener('click', event => {
    if (event.detail > 0 && suppressClick) { suppressClick = false; return; }
    onRelease();
  });
  button.addEventListener('pointerenter', () => {
    if (active() || reducedMotion.matches) return;
    x = 2; vx = 55; vy = 10;
    spring();
  });
  window.addEventListener('blur', () => {
    if (pointer !== null) release({ pointerId: pointer }, true);
  });
  window.addEventListener('scroll', scheduleContrast, { passive: true });
  window.addEventListener('resize', () => { draw(); });
  document.addEventListener('load', scheduleContrast, true);
  new MutationObserver(scheduleContrast).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new MutationObserver(scheduleContrast).observe(document.querySelector('#main-content'), { childList: true, subtree: true });
  document.querySelector('.header-inner').addEventListener('transitionend', scheduleContrast);
  draw();
  return { isActive: active, updateContrast: scheduleContrast };
}

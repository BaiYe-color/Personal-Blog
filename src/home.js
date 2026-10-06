import { initClock } from './home-clock.js';
import { typeCompassCaption } from './compass-caption.js';

// A wheel gesture includes its momentum tail. Only a new gesture can turn another page.
export class WheelStepGate {
  constructor() { this.reset(); }
  reset() { this.last = -Infinity; this.until = 0; this.used = false; this.sum = 0; }
  consume(delta, now) {
    if (now - this.last > 220) { this.used = false; this.sum = 0; }
    this.last = now;
    if (this.used || now < this.until) { this.used = true; return 0; }
    if (Math.sign(delta) !== Math.sign(this.sum)) this.sum = 0;
    this.sum += delta;
    if (Math.abs(this.sum) < 35) return 0;
    this.used = true; this.until = now + 750;
    return Math.sign(this.sum);
  }
}
export function compassDirection(angle) { return ((Math.round(angle / 90) % 4) + 4) % 4; }
export function nearestAngle(current, target) { return current + ((target - current + 540) % 360 + 360) % 360 - 180; }

export function initPagedDeck(root, { onLayerChange = () => {} } = {}) {
  const abort = new AbortController();
  const signal = abort.signal;
  const listen = (element, name, callback, options = {}) => element.addEventListener(name, callback, { ...options, signal });
  const layers = [...root.querySelectorAll('.home-layer')];
  const buttons = [...root.querySelectorAll('[data-home-layer]')];
  const track = root.querySelector('.home-track');
  const gate = new WheelStepGate();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, busyUntil = 0, touchStart = null;
  function goTo(next) {
    next = Math.max(0, Math.min(layers.length - 1, next));
    if (next === index) return;
    document.activeElement instanceof HTMLElement && layers[index].contains(document.activeElement) && document.activeElement.blur();
    index = next;
    root.dataset.layer = index;
    track.style.transform = `translateY(-${index * 100}%)`;
    layers.forEach((layer, itemIndex) => { layer.inert = itemIndex !== index; layer.setAttribute('aria-hidden', String(itemIndex !== index)); });
    buttons.forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.homeLayer) === index)));
    busyUntil = performance.now() + (reduced.matches ? 250 : 750);
    onLayerChange(index);
  }
  const blocked = target => target.closest('dialog[open], .site-header, .music-player, .cassette-track-list, .cassette-now, .cassette-canvas, .cassette-stage, input, textarea, select, [contenteditable="true"]');
  listen(window, 'wheel', event => {
    if (event.ctrlKey || blocked(event.target) || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(event.deltaX) > Math.abs(delta)) return;
    const step = gate.consume(delta, performance.now());
    if (step && performance.now() >= busyUntil) goTo(index + step);
  }, { passive: false });
  listen(window, 'keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || blocked(event.target) || document.querySelector('dialog[open]')) return;
    if (event.target.closest('button, a') && event.key === ' ') return;
    const step = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? 1 : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
    if (step && !event.repeat && performance.now() >= busyUntil) { event.preventDefault(); goTo(index + step); }
  });
  listen(root, 'touchstart', event => { touchStart = !blocked(event.target) && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
  listen(root, 'touchmove', event => { if (touchStart) event.preventDefault(); }, { passive: false });
  listen(root, 'touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0], dy = touchStart.y - touch.clientY, dx = touchStart.x - touch.clientX;
    touchStart = null;
    if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) && performance.now() >= busyUntil) goTo(index + Math.sign(dy));
  });
  listen(root, 'click', event => { const button = event.target.closest('[data-home-layer]'); if (button) goTo(Number(button.dataset.homeLayer)); });
  return { goTo, get activeIndex() { return index; }, destroy() { abort.abort(); } };
}

export function initHome(root, { onLayerChange = () => {}, festivals = {} } = {}) {
  const abort = new AbortController();
  const signal = abort.signal;
  const listen = (element, name, callback, options = {}) => element.addEventListener(name, callback, { ...options, signal });
  const layers = [...root.querySelectorAll('.home-layer')];
  const buttons = [...root.querySelectorAll('[data-home-layer]')];
  const track = root.querySelector('.home-track');
  const gate = new WheelStepGate();
  let index = 0, busyUntil = 0, touchStart = null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stopCaption = () => {};
  function goTo(next) {
    next = Math.max(0, Math.min(layers.length - 1, next));
    if (next === index) return;
    const focused = document.activeElement;
    if (layers[index].contains(focused)) focused.blur();
    index = next;
    stopCaption();
    if (index === 1) stopCaption = typeCompassCaption(root.querySelector('.compass-caption'), { reducedMotion: reduced.matches });
    root.dataset.layer = index;
    track.style.transform = `translateY(-${index * 100}%)`;
    layers.forEach((layer, i) => { layer.inert = i !== index; layer.setAttribute('aria-hidden', String(i !== index)); });
    buttons.forEach(button => button.setAttribute('aria-current', Number(button.dataset.homeLayer) === index ? 'step' : 'false'));
    busyUntil = performance.now() + (reduced.matches ? 250 : 750);
    onLayerChange(index);
  }
  const blocked = target => target.closest('dialog[open], .site-header, .music-player, input, textarea, select, [contenteditable="true"]');
  listen(window, 'wheel', event => {
    if (event.ctrlKey || blocked(event.target) || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(event.deltaX) > Math.abs(delta)) return;
    const step = gate.consume(delta, performance.now());
    if (step && performance.now() >= busyUntil) goTo(index + step);
  }, { passive: false });
  listen(window, 'keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || blocked(event.target) || document.querySelector('dialog[open]')) return;
    if (event.target.closest('button, a') && event.key === ' ') return;
    const step = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? 1 : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
    if (!step || event.repeat) return;
    event.preventDefault();
    if (performance.now() >= busyUntil) goTo(index + step);
  });
  listen(root, 'touchstart', event => {
    touchStart = !blocked(event.target) && !event.target.closest('.compass-dial, .archive-stage') && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  listen(root, 'touchmove', event => { if (touchStart) event.preventDefault(); }, { passive: false });
  listen(root, 'touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0], dy = touchStart.y - touch.clientY, dx = touchStart.x - touch.clientX;
    touchStart = null;
    if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) && performance.now() >= busyUntil) goTo(index + Math.sign(dy));
  });
  listen(root, 'touchcancel', () => { touchStart = null; });
  listen(root, 'click', event => {
    const button = event.target.closest('[data-home-layer]');
    if (button) goTo(Number(button.dataset.homeLayer));
  });

  const compass = root.querySelector('.home-compass');
  const stopClock = initClock(compass.querySelector('.compass-clock'), festivals);
  const dial = compass.querySelector('.compass-dial');
  const cards = [...compass.querySelectorAll('[data-direction]')];
  const backgrounds = [...compass.querySelectorAll('[data-compass-background]')];
  let angle = 0, direction = 0, pointer = null;
  function select(next, rotation = next * 90) {
    direction = next; angle = nearestAngle(angle, rotation);
    dial.style.setProperty('--needle-angle', `${angle}deg`);
    compass.dataset.direction = next;
    dial.setAttribute('aria-label', `指南针，当前指向${cards[next].dataset.title}，用左右方向键转动`);
    cards.forEach((card, i) => { card.classList.toggle('is-pointed', i === next); if (i === next) card.setAttribute('aria-current', 'true'); else card.removeAttribute('aria-current'); });
    backgrounds.forEach((background, i) => background.classList.toggle('is-current', i === next));
  }
  for (const card of cards) {
    listen(card, 'pointerenter', event => { if (event.pointerType !== 'touch' && pointer === null) select(Number(card.dataset.direction)); });
    listen(card, 'focus', () => select(Number(card.dataset.direction)));
    // Touch has no hover; update the direction as the visitor taps the cover.
    listen(card, 'pointerdown', event => { if (event.pointerType === 'touch') select(Number(card.dataset.direction)); });
  }
  function turn(event) {
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < 10) return;
    const rotation = Math.atan2(dx, -dy) * 180 / Math.PI;
    select(compassDirection(rotation), rotation);
  }
  listen(dial, 'pointerdown', event => {
    if (event.button !== 0) return;
    pointer = event.pointerId; dial.setPointerCapture(pointer); dial.classList.add('is-dragging'); turn(event);
  });
  listen(dial, 'pointermove', event => { if (event.pointerId === pointer) turn(event); });
  function release() { pointer = null; dial.classList.remove('is-dragging'); select(direction); }
  listen(dial, 'pointerup', release); listen(dial, 'pointercancel', release); listen(dial, 'lostpointercapture', release);
  listen(dial, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    select((direction + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 3)) % 4);
  });
  select(0);
  return { goTo, get activeIndex() { return index; }, destroy() { abort.abort(); stopClock(); stopCaption(); } };
}

// Complete RhineLabUI renderer, with the homepage lifecycle and blog data bridge.
import { ArchiveScene } from './rhine/scene.js';
import { configureArticles, indexAtCell } from './rhine/data.js';
import { fullMotion, reducedMotion } from './rhine/motion-preferences.js';
import { archiveEntryFrame, ARCHIVE_ENTRY_DURATION } from './archive-entry.js';
import { ArchiveFrameBudget, archiveQuality } from './archive-performance.js';

export async function createArchiveScene(container, { onSelect, columns, numbers }) {
  configureArticles(columns, numbers);
  const archive = new ArchiveScene(container);
  archive.renderer.domElement.setAttribute('aria-hidden', 'true');
  const abort = new AbortController();
  let active = false, destroyed = false, frame = 0, selection = null, configuredColumns = columns;
  let entryStart = null, entryElapsed = 0, previousTime = 0, unchanged = 0, telemetryTime = 0, warmupUntil = 0, entered = false;
  const budget = new ArchiveFrameBudget();
  const root = container.closest('.article-archive');
  const entryTitle = root.querySelector('[data-entry-title]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const theme = () => { archive.setTheme(document.documentElement.dataset.theme === 'dark'); start(); };
  const motion = () => {
    archive.setMotion(reduced.matches ? reducedMotion() : { ...fullMotion(), idleWave: false, pointerParallax: false });
    if (reduced.matches) finishEntry();
    start();
  };
  function finishEntry() {
    entryStart = null; entryElapsed = ARCHIVE_ENTRY_DURATION; root.dataset.entry = 'ready';
    entered = true;
    archive.revealImmediately();
  }
  function layout() {
    container.dataset.layout = container.clientWidth / container.clientHeight < 1.05 ? 'portrait' : container.clientWidth < 1100 ? 'compact' : 'desktop';
    archive.resize();
    start();
  }
  function render(now) {
    frame = 0;
    if (!active || destroyed || document.hidden) return;
    if (entryStart === null && entryElapsed < ARCHIVE_ENTRY_DURATION) entryStart = now;
    const elapsed = entryElapsed + (entryStart === null ? 0 : (now - entryStart) / 1000);
    const entry = archiveEntryFrame(elapsed, reduced.matches);
    if (root.dataset.entry !== entry.phase) root.dataset.entry = entry.phase;
    if (entry.title !== undefined && entry.title !== null) entryTitle.textContent = entry.title;
    if (entry.phase === 'welcome') {
      frame = requestAnimationFrame(render); return;
    }
    if (entry.phase === 'ready' && entryStart !== null) finishEntry();
    const before = archive.renderedFrames;
    const cpuStart = performance.now();
    archive.update(now / 1000, entry.cinematic);
    const cpuMs = performance.now() - cpuStart;
    const changed = archive.renderedFrames !== before;
    unchanged = changed ? 0 : unchanged + 1;
    const interval = previousTime ? now - previousTime : 0;
    previousTime = now;
    if (changed && now > warmupUntil && entry.phase === 'ready' && budget.sample(interval)) {
      archive.setQuality(archiveQuality[budget.level]); warmupUntil = now + 1500;
    }
    if (now - telemetryTime > 1000) {
      container.dataset.frameStats = JSON.stringify({ cpuMs: +cpuMs.toFixed(2), intervalMs: +interval.toFixed(2), rendered: archive.renderedFrames, reused: archive.reusedFrames, qualityLevel: budget.level });
      telemetryTime = now;
    }
    // The template cache now settles because idle waves and parallax are off.
    // Wake on input/theme/resize, and otherwise release the animation loop.
    if (unchanged < 12 || entry.phase !== 'ready') frame = requestAnimationFrame(render);
    else container.dataset.renderState = 'idle';
  }
  function start() {
    if (active && !destroyed && !document.hidden && !frame) {
      unchanged = 0; previousTime = 0; budget.reset();
      container.dataset.renderState = 'active'; frame = requestAnimationFrame(render);
    }
  }
  archive.onSelect = (_, cell) => {
    const origin = archive.coordinateOrigin;
    onSelect({ lane: cell.lane + origin.lane - 2, row: cell.row + origin.row - 12 });
  };
  container.addEventListener('pointerdown', () => container.focus({ preventScroll: true }), { signal: abort.signal });
  for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'webglcontextrestored']) container.addEventListener(event, start, { signal: abort.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (entryStart !== null) { entryElapsed += (performance.now() - entryStart) / 1000; entryStart = null; }
      cancelAnimationFrame(frame); frame = 0;
    }
    else start();
  }, { signal: abort.signal });
  reduced.addEventListener('change', motion, { signal: abort.signal });
  const observer = new ResizeObserver(layout); observer.observe(container);
  const themeObserver = new MutationObserver(theme); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const controller = {
    select(cell, number, interruptMotion = false, nextColumns = columns) {
      if (interruptMotion) finishEntry();
      if (configuredColumns !== nextColumns) { configureArticles(nextColumns, numbers); configuredColumns = nextColumns; }
      const origin = archive.coordinateOrigin;
      const sceneCell = { lane: cell.lane + 2 - origin.lane, row: cell.row + 12 - origin.row };
      const index = indexAtCell(sceneCell);
      if (interruptMotion || !selection || selection.lane !== cell.lane || selection.row !== cell.row || selection.number !== number) {
        archive.select(index, { cell: sceneCell });
        selection = { ...cell, number };
        start();
      }
    },
    setActive(value) {
      if (value === active) return;
      active = value; archive.setPresentationVisible(value, true);
      if (active) {
        const skip = reduced.matches || entered;
        entryElapsed = skip ? ARCHIVE_ENTRY_DURATION : 0; entryStart = null;
        archive.reveal = skip ? 1 : 0;
        root.dataset.entry = skip ? 'ready' : 'welcome';
        warmupUntil = performance.now() + (skip ? 1500 : ARCHIVE_ENTRY_DURATION * 1000 + 1600); layout(); start();
      } else { cancelAnimationFrame(frame); frame = 0; entryStart = null; root.dataset.entry = 'welcome'; }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; active = false; cancelAnimationFrame(frame); abort.abort(); observer.disconnect(); themeObserver.disconnect(); archive.dispose();
    },
  };
  try {
    await Promise.all([
      document.fonts.load('700 16px MiSans', 'BAIYE ARCHIVE'),
      document.fonts.load('750 32px MiSans', root.querySelector('.archive-welcome-lines').textContent),
    ]);
    await archive.load('/assets/rhine/archive-cassette.glb');
    archive.setQuality(archiveQuality[0]);
    motion();
    archive.setMode('archive'); archive.revealImmediately(); archive.setTheme(document.documentElement.dataset.theme === 'dark', true); layout();
    return controller;
  } catch (error) { controller.destroy(); throw error; }
}

// Reuse the template's array shot (21.9–26.5 s), without its detail extraction.
const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const ARCHIVE_ENTRY_DURATION = 6.4;
export function archiveEntryFrame(elapsed, reduced = false) {
  if (reduced || elapsed >= ARCHIVE_ENTRY_DURATION) return { phase: 'ready' };
  if (elapsed < 1.8) return { phase: 'welcome' };
  const time = 21.9 + Math.min(4.6, elapsed - 1.8);
  return {
    phase: time < 25.68 ? 'array' : 'select',
    title: time < 25.68 ? 'SELECTING FILES...'.slice(0, Math.max(0, Math.floor((time - 21.94) * 18))) : null,
    cinematic: { time, reveal: ease((time - 22) / .4), lift: 0, zoom: 0 },
  };
}

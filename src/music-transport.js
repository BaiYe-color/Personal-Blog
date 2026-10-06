export function formatAudioTime(seconds) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function adjacentTrack(queue, currentId, direction = 1, shuffle = false, random = Math.random) {
  if (!queue.length) return null;
  const index = queue.findIndex(track => track.id === currentId);
  if (shuffle && direction > 0) {
    const choices = queue.filter(track => track.id !== currentId);
    return choices.length ? choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] : queue[0];
  }
  if (index < 0) return direction > 0 ? queue[0] : queue.at(-1);
  return queue[(index + direction + queue.length) % queue.length];
}

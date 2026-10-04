export const compassCaption = '循着好奇心，去下一段风景。';

// Runs once on each arrival, leaving the cursor to CSS after typing finishes.
export function typeCompassCaption(root, { text = compassCaption, reducedMotion = false } = {}) {
  if (!root) return () => {};
  const output = root.querySelector('.compass-caption-text');
  const characters = Array.from(text);
  let timer = 0, index = 0, stopped = false;
  output.textContent = '';
  root.setAttribute('aria-label', text);
  root.dataset.phase = 'typing';
  function type() {
    if (stopped || !root.isConnected) return;
    output.textContent += characters[index++];
    root.dataset.phase = index === characters.length ? 'idle' : 'typing';
    if (index < characters.length) timer = setTimeout(type, 110);
  }
  if (reducedMotion || !characters.length) { output.textContent = text; root.dataset.phase = 'idle'; }
  else timer = setTimeout(type, 600);
  return () => { stopped = true; clearTimeout(timer); };
}

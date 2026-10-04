// 仅展示文本，不执行任何命令。完整输入后停留五秒，再退格并换下一句。
export const terminalLines = [
  'npm run dev',
  'git commit -m "collect blue moments"',
  'console.log("Hello, BaiYe!");',
  'python -c "print(\'Stay curious.\')"',
  'const tomorrow = await dream();',
  'echo 把平凡的日子，写成值得收藏的故事。',
  '人生海海，慢慢记录。',
  '今天也要留一点时间，听喜欢的音乐。',
  'find inspiration --in everyday-life',
  'SELECT happiness FROM little_things;',
];

export function initHeroTerminal(root, { reducedMotion = false } = {}) {
  if (!root) return () => {};
  const output = root.querySelector('.terminal-output');
  let current = Math.floor(Math.random() * terminalLines.length);
  let characters = [], animationTimer = 0, stopped = false;
  const write = phase => { output.textContent = characters.join(''); root.dataset.phase = phase; };
  const hold = () => { write('idle'); animationTimer = setTimeout(refresh, 5000); };
  const type = target => {
    if (stopped || !root.isConnected) return;
    characters.push(target[characters.length]);
    if (characters.length === target.length) hold();
    else { write('typing'); animationTimer = setTimeout(() => type(target), 70); }
  };
  const refresh = () => {
    if (stopped || !root.isConnected) return;
    // 下一条随机选择，但不与上一条重复。
    current = (current + 1 + Math.floor(Math.random() * (terminalLines.length - 1))) % terminalLines.length;
    const next = terminalLines[current];
    if (reducedMotion) { characters = Array.from(next); hold(); return; }
    const erase = () => {
      if (stopped || !root.isConnected) return;
      if (characters.length) {
        characters.pop(); write('deleting');
        animationTimer = setTimeout(erase, 34);
      } else {
        write('typing');
        animationTimer = setTimeout(() => type(Array.from(next)), 220);
      }
    };
    erase();
  };
  if (reducedMotion) { characters = Array.from(terminalLines[current]); hold(); }
  else type(Array.from(terminalLines[current]));
  return () => { stopped = true; clearTimeout(animationTimer); };
}

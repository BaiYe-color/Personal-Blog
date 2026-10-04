import test from 'node:test';
import assert from 'node:assert/strict';
import { initHeroTerminal, terminalLines } from '../src/hero-terminal.js';

function fixture() {
  const output = { textContent: '' };
  return { output, root: { isConnected: true, dataset: {}, querySelector: () => output } };
}
function finishTyping(t, root) {
  for (let time = 0; root.dataset.phase !== 'idle' && time < 10000; time++) t.mock.timers.tick(1);
  assert.equal(root.dataset.phase, 'idle');
}
test('每句完整输入后停留五秒，再逐字删除和输入不同内容', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { root, output } = fixture();
  const stop = initHeroTerminal(root);
  assert.equal(root.dataset.phase, 'typing');
  finishTyping(t, root);
  const previous = output.textContent;
  assert.ok(terminalLines.includes(previous));
  assert.equal(root.dataset.phase, 'idle');
  t.mock.timers.tick(4999);
  assert.equal(output.textContent, previous);
  assert.equal(root.dataset.phase, 'idle');
  t.mock.timers.tick(1);
  assert.equal(root.dataset.phase, 'deleting');
  assert.equal(output.textContent, Array.from(previous).slice(0, -1).join(''));
  finishTyping(t, root);
  assert.ok(terminalLines.includes(output.textContent));
  assert.notEqual(output.textContent, previous);
  const second = output.textContent;
  t.mock.timers.tick(4999);
  assert.equal(root.dataset.phase, 'idle');
  assert.equal(output.textContent, second);
  t.mock.timers.tick(1);
  assert.equal(root.dataset.phase, 'deleting');
  stop();
});
test('离开首页时取消正在输入的动画和下一轮刷新', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { root, output } = fixture();
  const stop = initHeroTerminal(root);
  const previous = output.textContent;
  stop();
  t.mock.timers.tick(20000);
  assert.equal(output.textContent, previous);
});
test('完整输入后离开首页，也会取消五秒停留计时器', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, output } = fixture();
  const stop = initHeroTerminal(root);
  finishTyping(t, root);
  const previous = output.textContent;
  stop(); t.mock.timers.tick(20000);
  assert.equal(output.textContent, previous);
  assert.equal(root.dataset.phase, 'idle');
});
test('减少动画模式保留五秒切换，直接显示完整内容', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { root, output } = fixture();
  const stop = initHeroTerminal(root, { reducedMotion: true });
  const previous = output.textContent;
  assert.ok(terminalLines.includes(previous));
  t.mock.timers.tick(5000);
  assert.equal(root.dataset.phase, 'idle');
  assert.ok(terminalLines.includes(output.textContent));
  assert.notEqual(output.textContent, previous);
  stop();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { typeCompassCaption, compassCaption } from '../src/compass-caption.js';
const fixture = () => {
  const output = { textContent: '' };
  return { output, root: { isConnected: true, dataset: {}, setAttribute() {}, querySelector: () => output } };
};
test('进入后逐字出现，完整文案不会继续刷新', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, output } = fixture();
  const stop = typeCompassCaption(root);
  t.mock.timers.tick(599); assert.equal(output.textContent, '');
  t.mock.timers.tick(1); assert.equal(output.textContent, Array.from(compassCaption)[0]);
  for (let i = 1; i < Array.from(compassCaption).length; i++) t.mock.timers.tick(110);
  assert.equal(output.textContent, compassCaption); assert.equal(root.dataset.phase, 'idle');
  t.mock.timers.tick(20000); assert.equal(output.textContent, compassCaption);
  stop();
});
test('离开停止输入，再次进入从首字重新开始', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, output } = fixture();
  const stop = typeCompassCaption(root);
  t.mock.timers.tick(600); const first = output.textContent;
  stop(); t.mock.timers.tick(2000); assert.equal(output.textContent, first);
  const stopAgain = typeCompassCaption(root);
  assert.equal(output.textContent, '');
  t.mock.timers.tick(600); assert.equal(output.textContent, first);
  stopAgain();
});
test('减少动画模式直接展示整句', () => {
  const { root, output } = fixture();
  const stop = typeCompassCaption(root, { reducedMotion: true });
  assert.equal(output.textContent, compassCaption); assert.equal(root.dataset.phase, 'idle');
  stop();
});

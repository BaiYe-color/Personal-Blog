import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPosts, categoriesOf, shortDate, updatedAt } from '../src/posts.js';
import { constrainPull, attachmentPoint } from '../src/pendant.js';
import { choosePendantInk } from '../src/pendant-contrast.js';

test('更新与发布排序独立，按实际时间倒序，置顶不覆盖日期', () => {
  const posts = [
    { slug: 'old', publishedAt: '2026-10-01T09:00:00+08:00', updatedAt: '2026-10-04T12:00:00+08:00', pinned: true },
    { slug: 'new', publishedAt: '2026-10-04T09:00:00+08:00', updatedAt: '2026-10-04T10:00:00+08:00' },
    { slug: 'middle', publishedAt: '2026-10-03T23:00:00Z', updatedAt: '2026-10-04T11:00:00+08:00' },
  ];
  assert.deepEqual(sortPosts(posts).map(p => p.slug), ['new', 'middle', 'old']);
  assert.deepEqual(sortPosts(posts, 'updated').map(p => p.slug), ['old', 'middle', 'new']);
  assert.equal(posts[0].slug, 'old', '排序不改变原始数据');
});
test('多分类与缺少更新时间的旧文章可正常读取', () => {
  assert.deepEqual(categoriesOf({ categories: ['life', 'inspiration'] }), ['life', 'inspiration']);
  assert.deepEqual(categoriesOf({ category: 'life' }), ['life']);
  assert.deepEqual(categoriesOf({ categories: [] }), []);
  assert.equal(updatedAt({ publishedAt: '2026-10-04' }), '2026-10-04');
});
test('时间线显示内容日期，不因时区跨日而变化', () => {
  assert.equal(shortDate('2026-10-04T00:15:00+08:00'), '26/10/4');
  assert.equal(shortDate('2026-01-02'), '26/1/2');
  assert.equal(shortDate(undefined), '暂无日期');
});
test('挂坠拖动有总距离上限，向上拉动保留最低绳长', () => {
  for (const [x, y] of [[500, 500], [-500, 300], [0, 500], [300, -100]]) {
    const pull = constrainPull(x, y);
    assert.ok(Math.hypot(pull.x, pull.y) <= 125.00001);
    assert.ok(pull.y >= -18);
  }
  assert.deepEqual(constrainPull(25, 30), { x: 25, y: 30 });
});
test('挂点跟随旋转和平移，左右转动保持同一连接点', () => {
  assert.deepEqual(attachmentPoint(24, 62, 44, 6, 0, 0, 0), { x: 46, y: 68 });
  const right = attachmentPoint(24, 62, 44, 6, 70, 20, Math.PI / 2);
  assert.equal(right.x, 132); assert.equal(right.y, 104);
  const left = attachmentPoint(24, 62, 44, 6, -70, 20, -Math.PI / 2);
  assert.equal(left.x, -40); assert.equal(left.y, 104);
  assert.deepEqual(attachmentPoint(26, 62, 40, 6, 0, 0, 0), { x: 46, y: 68 });
});
test('挂坠按背景亮度选择黑白标志', () => {
  assert.equal(choosePendantInk({ r: 255, g: 255, b: 255 }), 'black');
  assert.equal(choosePendantInk({ r: 247, g: 247, b: 247 }), 'black');
  assert.equal(choosePendantInk({ r: 0, g: 0, b: 0 }), 'white');
  assert.equal(choosePendantInk({ r: 35, g: 35, b: 35 }), 'white');
});

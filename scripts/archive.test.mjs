import test from 'node:test';
import assert from 'node:assert/strict';
import { ArticleArchive, nearestArchiveRow } from '../src/archive-state.js';
import { ArchiveDrag, ArchivePlaneMomentum } from '../src/archive-drag.js';
import { configureArticles, indexAtCell, fileLocation, fileNumber, rowPeriod } from '../src/rhine/data.js';
import { archiveEntryFrame, ARCHIVE_ENTRY_DURATION } from '../src/archive-entry.js';
import { ArchiveFrameBudget, archiveQuality } from '../src/archive-performance.js';

const posts = [
  { slug: 'first', publishedAt: '2026-10-04', updatedAt: '2026-10-04', categories: ['a', 'b'] },
  { slug: 'second', publishedAt: '2026-10-03', updatedAt: '2026-10-05', categories: ['a'] },
  { slug: 'third', publishedAt: '2026-10-02', updatedAt: '2026-10-02', categories: ['b'] },
  { slug: 'draft', publishedAt: '2026-10-06', status: 'draft', categories: ['empty'] },
];
const categories = ['a', 'b', 'empty'].map(slug => ({ slug, name: slug }));
test('archive contains real published articles and places multiple-category posts in each matching column', () => {
  const state = new ArticleArchive(posts, categories);
  assert.deepEqual(state.columns.map(column => column.posts.map(post => post.slug)), [['first', 'second', 'third'], ['first', 'second'], ['first', 'third']]);
  assert.equal(state.fileNumber(), '001');
});
test('row selection continuously wraps in both directions without reversing the track', () => {
  const state = new ArticleArchive(posts, categories);
  state.stepRow(-1); assert.equal(state.row, -1); assert.equal(state.post.slug, 'third');
  state.stepRow(1); assert.equal(state.row, 0); assert.equal(state.post.slug, 'first');
  for (let i = 0; i < 3; i++) state.stepRow(1);
  assert.equal(state.row, 3); assert.equal(state.post.slug, 'first');
});
test('returning to a category restores its remembered article, including multi-category duplicates', () => {
  const state = new ArticleArchive(posts, categories);
  state.stepColumn(1); state.selectIndex(1); assert.equal(state.post.slug, 'second');
  state.stepColumn(1); state.selectIndex(1); assert.equal(state.post.slug, 'third');
  state.stepColumn(-1); assert.equal(state.post.slug, 'second');
  state.stepColumn(1); assert.equal(state.post.slug, 'third');
});
test('sort changes reorder articles by date but retain the current article and stable file number', () => {
  const state = new ArticleArchive(posts, categories);
  state.setSort('updated');
  assert.deepEqual(state.column.posts.map(post => post.slug), ['second', 'first', 'third']);
  assert.equal(state.post.slug, 'first'); assert.equal(state.index, 1); assert.equal(state.fileNumber(), '001');
  state.selectIndex(0); assert.equal(state.post.slug, 'second'); assert.equal(state.fileNumber(), '002');
});
test('empty content is safe and unused categories do not create phantom file counts', () => {
  const state = new ArticleArchive([], categories);
  state.stepRow(1); state.stepColumn(1); state.selectIndex(0); state.selectCell(1, 1); state.setSort('updated');
  assert.equal(state.post, undefined); assert.equal(state.columns.length, 1);
});
test('tick selection picks the nearest repeated occurrence', () => {
  assert.equal(nearestArchiveRow(0, 8, 3), 9);
  assert.equal(nearestArchiveRow(2, -4, 3), -4);
});
test('migrated drag follows the projected scene plane and continuous inertia settles on whole cells', () => {
  const drag = new ArchiveDrag();
  drag.start(0, 0, { lane: { x: 100, y: 0 }, row: { x: 20, y: 30 } }, 0);
  drag.move(120, 30, 50); assert.deepEqual(drag.value, { lane: 1, row: 1 });
  drag.move(240, 60, 100);
  const velocity = drag.releaseVelocity(100, false);
  assert.ok(velocity.lane > 0 && velocity.row > 0);
  const momentum = new ArchivePlaneMomentum(drag.value, velocity);
  for (let i = 0; i < 1000 && momentum.phase !== 'idle'; i++) momentum.step(1 / 60);
  assert.equal(momentum.phase, 'idle');
  assert.equal(momentum.value.lane, Math.round(momentum.value.lane));
  assert.ok(momentum.value.lane > 2, 'fast drag continues beyond a fixed two-file jump');
  assert.deepEqual(drag.releaseVelocity(100, true), { lane: 0, row: 0 });
});

test('original renderer bridge maps cyclic scene lanes to blog columns and preserves stable file numbers', () => {
  const state = new ArticleArchive(posts, categories);
  const numbers = Object.fromEntries(state.posts.map(post => [post.slug, state.fileNumber(post)]));
  configureArticles(state.columns, numbers);
  const first = indexAtCell({ lane: 2, row: 12 });
  assert.equal(fileNumber(first), '001');
  assert.deepEqual(fileLocation(first), { lane: 2, row: 12, slot: 76 });
  assert.equal(fileNumber(indexAtCell({ lane: 3, row: 13 })), '002');
  assert.equal(fileNumber(indexAtCell({ lane: -1, row: 13 })), '002');
  assert.equal(rowPeriod, 6);
  assert.equal(fileNumber(indexAtCell({ lane: 2, row: 12 - rowPeriod })), '001');
  state.setSort('updated'); configureArticles(state.columns, numbers);
  assert.equal(fileNumber(indexAtCell({ lane: 2, row: 12 })), '002');
  assert.equal(fileNumber(indexAtCell({ lane: 2, row: 13 })), '001');
});

test('categories precede tags, same slugs remain independent and each group remembers its article', () => {
  const mixed = posts.map(post => ({ ...post, tags: post.slug === 'third' ? ['a'] : ['a', 'b'] }));
  const state = new ArticleArchive(mixed, categories, 'published', [{ slug: 'a', name: 'tag a' }, { slug: 'b', name: 'tag b' }, { slug: 'empty' }]);
  assert.deepEqual(state.columns.map(column => column.slug), ['all', 'category:a', 'category:b', 'tag:a', 'tag:b']);
  state.stepColumn(1); state.selectIndex(1);
  state.stepColumn(1); state.stepColumn(1); state.selectIndex(2);
  assert.equal(state.post.slug, 'third'); assert.equal(state.column.kind, 'tag');
  state.stepColumn(-1); state.stepColumn(-1);
  assert.equal(state.post.slug, 'second');
  state.stepColumn(1); state.stepColumn(1);
  assert.equal(state.post.slug, 'third');
  configureArticles(state.columns, Object.fromEntries(state.posts.map(post => [post.slug, state.fileNumber(post)])));
  assert.equal(fileNumber(indexAtCell({ lane: 5, row: 14 })), '003');
});

test('recommended articles form a home-only first group and remain outside taxonomy groups', () => {
  const recommended = posts.map(post => ({ ...post, tags: ['a'], recommended: post.slug === 'second' }));
  const state = new ArticleArchive(recommended, categories, 'published', [{ slug: 'a', name: 'tag a' }]);
  assert.equal(state.column.kind, 'recommended');
  assert.equal(state.column.name, '推荐文章');
  assert.deepEqual(state.column.posts.map(post => post.slug), ['second']);
  assert.deepEqual(state.columns.map(column => column.kind), ['recommended', 'all', 'category', 'category', 'tag']);
});

test('entry follows welcome, original array camera, file title and ready; reduced motion skips it', () => {
  assert.equal(archiveEntryFrame(0).phase, 'welcome');
  const array = archiveEntryFrame(2.8);
  assert.equal(array.phase, 'array'); assert.equal(array.cinematic.zoom, 0);
  assert.equal(array.cinematic.time, 22.9);
  assert.equal(archiveEntryFrame(6).phase, 'select');
  assert.equal(archiveEntryFrame(ARCHIVE_ENTRY_DURATION).phase, 'ready');
  assert.deepEqual(archiveEntryFrame(0, true), { phase: 'ready' });
});

test('frame budget ignores pauses, tolerates isolated stalls and bounds sustained quality reductions', () => {
  const budget = new ArchiveFrameBudget();
  assert.equal(budget.sample(2000), false);
  for (let i = 0; i < 29; i++) assert.equal(budget.sample(16), false);
  assert.equal(budget.sample(180), false); assert.equal(budget.level, 0);
  for (let i = 0; i < 29; i++) budget.sample(40);
  assert.equal(budget.sample(40), true); assert.equal(budget.level, 1);
  budget.reset();
  for (let i = 0; i < 120; i++) budget.sample(40);
  assert.equal(budget.level, archiveQuality.length - 1);
  assert.ok(archiveQuality.every(quality => quality.depthOfField > 0 && quality.aoSamples > 0));
});

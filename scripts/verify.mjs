import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.BLOG_TEST_URL || 'http://127.0.0.1:5173';
const response = await fetch(origin + '/data/content.json');
assert.equal(response.status, 200, '内容文件应可读取');
const data = await response.json();
const assets = new Set(['/assets/sakura.css', '/assets/openai.svg', '/src/styles.css', '/src/palette.css', '/src/home.css', '/src/home.js', '/src/home-clock.js', '/src/compass-caption.js', '/src/app.js', '/src/api.js', '/src/posts.js', '/src/pendant.js', '/src/pendant-contrast.js', '/src/hero-terminal.js']);
function collect(value) {
  if (typeof value === 'string' && value.startsWith('/assets/')) assets.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
collect(data);
['/src/article-archive.css', '/src/article-archive.js', '/src/archive-state.js', '/src/archive-scene.js', '/src/archive-drag.js', '/assets/rhine/archive-cassette.glb', '/assets/rhine/LICENSE.txt', '/assets/vendor/three/build/three.module.js', '/assets/vendor/three/build/three.core.js', '/assets/vendor/three/addons/loaders/GLTFLoader.js', '/assets/vendor/three/addons/utils/BufferGeometryUtils.js', '/assets/vendor/three/addons/utils/SkeletonUtils.js', '/assets/vendor/three/addons/environments/RoomEnvironment.js'].forEach(asset => assets.add(asset));
const workspace = path.resolve(import.meta.dirname, '..');
const visited = new Set();
async function imports(url) {
  if (visited.has(url)) return;
  visited.add(url); assets.add(url);
  const filename = path.join(workspace, url.startsWith('/assets/') ? 'public' : '.', url);
  const code = await fs.readFile(filename, 'utf8');
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    const next = specifier === 'three' ? '/assets/vendor/three/build/three.module.js' : specifier.startsWith('three/addons/') ? '/assets/vendor/three/addons/' + specifier.slice(13) : specifier.startsWith('.') ? new URL(specifier, origin + url).pathname : null;
    if (next) await imports(next);
  }
}
await imports('/src/archive-scene.js');
await imports('/src/music-cassette.js');
assets.add('/src/music.css');
assets.add('/src/glass-ui.css');
assets.add('/src/guestbook.css');
assets.add('/src/content-glass.css');
assets.add('/src/liquid-glass.css');
assets.add('/src/liquid-glass.js');
assets.add('/src/friend-aquarium.js');
assets.add('/src/floating-player.js');
assets.add('/src/music-transport.js');
assets.add('/src/rhine/fonts.css');
for (const match of (await fs.readFile(path.join(workspace, 'src/rhine/fonts.css'), 'utf8')).matchAll(/url\("([^"]+)"\)/g)) assets.add(match[1]);
for (const asset of assets) {
  const result = await fetch(origin + asset);
  assert.equal(result.status, 200, `资源不存在：${asset}`);
  assert.ok(!result.headers.get('content-type')?.includes('text/html'), `资源错误返回 HTML：${asset}`);
}
const routes = ['/', '/articles', '/articles?sort=updated&page=2', '/articles/categories', '/articles/tags', '/links', '/photos', '/music', '/moments', '/pet', '/guestbook', '/login', ...data.posts.map(p => '/posts/' + p.slug), ...data.categories.map(c => '/articles/categories/' + c.slug), ...data.tags.map(t => '/articles/tags/' + t.slug)];
for (const route of routes) {
  const result = await fetch(origin + route);
  assert.equal(result.status, 200, `路由不能直接访问：${route}`);
  assert.match(await result.text(), /id="app"/, `缺少前端入口：${route}`);
}
assert.equal((await fetch(origin + '/package.json')).status, 404, '开发服务不应暴露项目配置文件');
// Seeking audio relies on the same byte-range support as other static files.
const rangeAsset = origin + '/assets/openai.svg';
const full = new Uint8Array(await (await fetch(rangeAsset)).arrayBuffer());
assert.equal(Number((await fetch(rangeAsset, { method: 'HEAD' })).headers.get('content-length')), full.length);
for (const [range, start, end] of [['bytes=0-7', 0, 8], ['bytes=8-', 8, full.length], ['bytes=-12', full.length - 12, full.length]]) {
  const partial = await fetch(rangeAsset, { headers: { Range: range } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), `bytes ${start}-${end - 1}/${full.length}`);
  assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), full.subarray(start, end));
}
assert.equal((await fetch(rangeAsset, { headers: { Range: `bytes=${full.length}-` } })).status, 416);
console.log(`验证通过：${assets.size} 个静态资源、${routes.length} 个直接访问路由。页面渲染及交互另通过浏览器验证。`);

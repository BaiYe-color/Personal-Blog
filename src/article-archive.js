import { ArticleArchive } from './archive-state.js';
import { publishedAt, updatedAt, categoriesOf, shortDate } from './posts.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const digits = value => String(value).padStart(2, '0');
export function archiveMarkup(site = {}) {
  const name = site.profile?.name || '白晔';
  const avatar = /^(?:\/(?!\/)|https?:\/\/)/i.test(site.avatar || '') ? site.avatar : '/assets/images/default/avatar.webp';
  return `<section class="home-layer home-articles article-archive" aria-label="最新文章" aria-hidden="true" inert>
    <div class="archive-stage" tabindex="0" role="group" aria-label="三维文章档案，拖动或使用方向键选档，Enter 阅读"></div>
    <div class="archive-wash" aria-hidden="true"></div>
    <div class="archive-brand"><strong>BAIYE LAB</strong><span>PERSONAL INFORMATION</span><div>ARCHIVE <b>OS</b></div></div>
    <div class="archive-topbar"><a href="/articles">文章 ↗</a></div>
    <div class="archive-welcome" aria-hidden="true"><div class="archive-welcome-lines"><strong>欢迎来到</strong><b>${escape(name)}的文字档案</b><span>记录生活 · 收藏灵感</span><img class="archive-welcome-avatar" src="${escape(avatar)}" alt="${escape(name)}的头像" decoding="async"><small>B A I Y E · J O U R N A L</small></div></div>
    <div class="archive-entry-title" aria-hidden="true"><strong data-entry-title>SELECTING FILES...</strong><i></i></div>
    <div class="archive-callout" aria-live="polite" aria-atomic="true"></div>
    <div class="archive-counter" title="当前分组中的文章序号 / 文章总数"><span>ARTICLE / SELECT</span><div><strong data-archive-number>01</strong><i>/</i><span data-archive-total>00</span></div></div>
    <div class="archive-navigation"><button data-archive-action="prev" aria-label="上一篇文章">↑</button><div class="archive-ticks" role="group" aria-label="选择文章"></div><button data-archive-action="next" aria-label="下一篇文章">↓</button></div>
    <div class="archive-columns"><button data-archive-action="column-prev" aria-label="上一个分类或标签">←</button><div><span data-archive-column-number></span><strong data-archive-column-name></strong></div><button data-archive-action="column-next" aria-label="下一个分类或标签">→</button></div>
    <p class="archive-hint">← → 分类 / 标签 · ↑ ↓ 组内文章 · ENTER 阅读</p>
    <span class="archive-loading" role="status">正在装入文章档案…</span>
  </section>`;
}

export function initArticleArchive(root, data) {
  const state = new ArticleArchive(data.posts, data.categories, 'published', data.tags);
  root.dataset.entry = 'welcome';
  const abort = new AbortController();
  let scene = null, loading = false, destroyed = false, active = false;
  const listen = (target, type, callback) => target.addEventListener(type, callback, { signal: abort.signal });
  function update(interruptMotion = false) {
    const post = state.post;
    const callout = root.querySelector('.archive-callout');
    if (!post) {
      root.dataset.entry = 'ready';
      callout.innerHTML = '<h2>档案等待写入</h2><p>这里还没有文章。</p><a class="archive-access" href="/articles">前往文章 →</a>';
      root.querySelectorAll('.archive-navigation button, .archive-columns button').forEach(button => { button.disabled = true; });
      root.querySelector('.archive-loading').hidden = true;
      return;
    }
    const taxonomy = [
      ...categoriesOf(post).map(slug => [data.categories.find(item => item.slug === slug), 'categories', 'category']),
      ...(post.tags || []).map(slug => [data.tags.find(item => item.slug === slug), 'tags', 'tag']),
    ].filter(([item]) => item);
    const path = `/posts/${encodeURIComponent(post.slug)}`;
    callout.innerHTML = `<div class="archive-eyebrow">PERSONAL DATABASE <span>${escape(state.column.name)}</span></div>
      <a class="archive-file-title" href="${path}">FILE NUMBER: B-${state.fileNumber()}<span>↗</span></a>
      <div class="archive-rule"><i></i></div>
      <h2>${escape(post.title)}</h2><p class="archive-excerpt">${escape(post.excerpt)}</p>
      <div class="archive-dates"><span>发布 ${shortDate(publishedAt(post))}</span><span>更新 ${shortDate(updatedAt(post))}</span></div>
      <div class="archive-badges">${taxonomy.map(([item, type, kind]) => `<a class="archive-badge archive-${kind}" href="/articles/${type}/${encodeURIComponent(item.slug)}">${kind === 'tag' ? '# ' : ''}${escape(item.name)}</a>`).join('')}</div>
      <a class="archive-access" href="${path}">READ ARTICLE <span>阅读全文 →</span></a>`;
    root.querySelector('[data-archive-number]').textContent = digits(state.index + 1);
    root.querySelector('[data-archive-total]').textContent = digits(state.column.posts.length);
    root.querySelector('.archive-counter').setAttribute('aria-label', `${state.column.name}：第 ${state.index + 1} 篇，共 ${state.column.posts.length} 篇文章`);
    root.querySelector('[data-archive-column-number]').textContent = `${{ recommended: 'FEATURED', all: 'ALL', category: 'CATEGORY', tag: 'TAG' }[state.column.kind]} ${digits(state.columnIndex + 1)} / ${digits(state.columns.length)}`;
    root.querySelector('[data-archive-column-name]').textContent = state.column.name;
    const ticks = root.querySelector('.archive-ticks');
    // Reuse buttons while selecting within a column so keyboard focus survives.
    if (ticks.dataset.column !== state.column.slug || ticks.dataset.sort !== state.mode) {
      ticks.innerHTML = state.column.posts.map((item, index) => `<button data-archive-index="${index}" aria-label="选择文章：${escape(item.title)}" title="${escape(item.title)}"></button>`).join('');
      ticks.dataset.column = state.column.slug; ticks.dataset.sort = state.mode;
    }
    ticks.querySelectorAll('button').forEach((button, index) => button.setAttribute('aria-pressed', String(index === state.index)));
    scene?.select({ lane: state.lane, row: state.row }, state.fileNumber(), interruptMotion, state.columns);
  }
  const actions = {
    prev: () => state.stepRow(-1), next: () => state.stepRow(1),
    'column-prev': () => state.stepColumn(-1), 'column-next': () => state.stepColumn(1),
  };
  listen(root, 'click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.archiveAction) actions[button.dataset.archiveAction]();
    else if (button.dataset.archiveIndex !== undefined) state.selectIndex(Number(button.dataset.archiveIndex));
    else return;
    update(true);
  });
  listen(root, 'keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input, textarea, select')) return;
    const action = { ArrowUp: 'prev', ArrowDown: 'next', ArrowLeft: 'column-prev', ArrowRight: 'column-next' }[event.key];
    if (action) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) { actions[action](); update(true); } }
    if (event.key === 'Enter' && event.target.classList.contains('archive-stage')) { event.preventDefault(); root.querySelector('.archive-access')?.click(); }
  });
  async function loadScene() {
    if (loading || destroyed || !state.post) return;
    loading = true;
    const status = root.querySelector('.archive-loading');
    try {
      // Load WebGL and the original GLB only when the third layer is visited.
      const { createArchiveScene } = await import('./archive-scene.js');
      if (destroyed) return;
      scene = await createArchiveScene(root.querySelector('.archive-stage'), {
        columns: state.columns, numbers: Object.fromEntries(state.posts.map(post => [post.slug, state.fileNumber(post)])),
        onSelect: cell => { state.selectCell(cell.lane, cell.row); update(); },
      });
      if (destroyed) { scene.destroy(); scene = null; return; }
      status.hidden = true; root.dataset.scene = 'ready';
      update(); scene.setActive(active);
    } catch (error) {
      if (destroyed) return;
      scene?.destroy(); scene = null;
      root.dataset.scene = 'unavailable';
      root.dataset.entry = 'ready';
      status.textContent = '三维预览暂不可用，可使用下方按钮选文章';
      console.warn('文章档案三维预览加载失败', error);
    }
  }
  update();
  return {
    setActive(value) { active = value; if (active) loadScene(); scene?.setActive(active); },
    destroy() { destroyed = true; abort.abort(); scene?.destroy(); scene = null; },
  };
}

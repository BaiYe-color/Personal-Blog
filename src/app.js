import { loadContent, loadMessages, submitMessage, removeLocalMessage } from './api.js';
import { publishedAt, updatedAt, categoriesOf, shortDate, sortPosts } from './posts.js';
import { initPendant } from './pendant.js';
import { initHeroTerminal } from './hero-terminal.js';
import { initHome } from './home.js';
import { clockMarkup } from './home-clock.js';
import { archiveMarkup, initArticleArchive } from './article-archive.js';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safeUrl = value => {
  const text = String(value ?? '');
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  try { const url = new URL(text); return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; }
};
const image = (src, alt, cls = '', eager = false) => `<img src="${escape(safeUrl(src))}" alt="${escape(alt)}" class="${cls}" loading="${eager ? 'eager' : 'lazy'}">`;
const href = (base, slug) => `${base}/${encodeURIComponent(slug)}`;
let data;
let page = 1;
let photoGroup = '全部';
let musicGroup = '全部';
let sortMode = 'published';
let currentPosts = [];
let messages = [];
let selectedTrack = null;
let playRequest = 0;
let previousFocus;
let pendant;
let stopHeroTerminal = () => {};
let homeController;
let headerHovered = false;
let pointerLocation = null;
const pageSize = 3;
const titles = { '/': '首页', '/articles': '文章', '/articles/categories': '分类', '/articles/tags': '标签', '/links': '友链', '/photos': '相册', '/music': '音乐', '/moments': '瞬间', '/pet': '看板娘', '/guestbook': '留言板', '/about': '关于', '/login': '管理入口' };

function theme() { try { return localStorage.getItem('blog-theme') || 'light'; } catch { return 'light'; } }
document.documentElement.dataset.theme = theme();
function notify(text) { const element = document.querySelector('#toast'); element.textContent = text; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2500); }
function themeSwitch() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return `<button class="theme-switch" data-theme role="switch" aria-checked="${dark}" aria-label="切换明暗主题" title="${dark ? '切换到白天模式' : '切换到夜晚模式'}">
    <span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-orbit"><svg class="theme-switch-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.55 1.55m11.1 11.1 1.55 1.55m0-14.2-1.55 1.55M6.45 17.55 4.9 19.1"/></svg><svg class="theme-switch-moon" viewBox="0 0 24 24"><path d="M20.6 15.1A8.7 8.7 0 0 1 8.9 3.4a8.7 8.7 0 1 0 11.7 11.7Z"/></svg></span></span>
  </button>`;
}
function navigationIcon(url) {
  const shapes = {
    '/': '<path fill-rule="evenodd" d="M3 7h3V4h2v3h3V4h2v3h3V4h2v3h3v14h-6v-5a3 3 0 0 0-6 0v5H3ZM6 10v3h2v-3Zm5 0v3h2v-3Zm5 0v3h2v-3ZM11 1h2v2h-2Z"/>',
    '/articles': '<circle cx="4" cy="5" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="4" cy="19" r="2"/><path d="M9 3h13v4H9Zm0 7h13v4H9Zm0 7h13v4H9Z"/>',
    '/links': '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="m10 7-2-2a4 4 0 0 0-6 6l4 4a4 4 0 0 0 6 0m2 2 2 2a4 4 0 0 0 6-6l-4-4a4 4 0 0 0-6 0M8 8l8 8"/></g>',
    '/photos': '<path fill-rule="evenodd" d="M3 6h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm9 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"/>',
    '/music': '<path d="M9 4v12a4 3 0 1 0 2 2V8l8-2v8a4 3 0 1 0 2 2V1Z"/>',
    '/moments': '<path fill-rule="evenodd" d="M5 2h2v3h10V2h2v3h2v17H3V5h2Zm0 7v11h14V9Z"/><path d="M12 18s-4-2.4-4-4.9c0-2.1 2.6-2.8 4-1.2 1.4-1.6 4-.9 4 1.2 0 2.5-4 4.9-4 4.9Z"/>',
    '/pet': '<circle cx="12" cy="8" r="3.5"/><path d="M5 22c.7-4.4 3-6.7 7-6.7s6.3 2.3 7 6.7M6.5 4.5 9 2l1 3M17.5 4.5 15 2l-1 3"/>',
    '/guestbook': '<path fill-rule="evenodd" d="M3 4h11v2H4v14h14v-9h2v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm5 10 10-10 3 3-10 10-4 1Zm10.5-12.5a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L22 6l-3-3Z"/>',
    '/about': '<path d="M22 2C10 2 4 5 4 12c0 1.5.4 2.7 1.1 3.7L2 20l1.6 1.2L7 16.6C11 12.2 15 9 19 6c-3.7 4-7.7 7.8-11.6 10.8C16 20 23 13 22 2Z"/>',
  };
  return `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes[url] || ''}</svg>`;
}
function navigation() {
  const path = location.pathname;
  const link = (url, name) => `<a href="${url}" ${path === url ? 'aria-current="page"' : ''}>${navigationIcon(url)}<span>${name}</span></a>`;
  return `<header class="site-header"><div class="header-inner"><a class="blog-brand" href="/">${escape(data.site.name)}<span> / SAKURA</span></a><nav class="blog-nav" aria-label="主导航">${link('/', '首页')}${link('/articles', '文章')}${link('/photos', '相册')}${link('/music', '音乐')}${link('/moments', '瞬间')}${link('/pet', '看板娘')}${link('/guestbook', '留言板')}${link('/links', '友链')}${link('/about', '关于')}</nav><div class="nav-actions"><button data-search aria-label="搜索文章">⌕</button>${themeSwitch()}<a href="/login" class="admin-avatar" aria-label="登录管理后台">${image(data.site.avatar, '管理入口', '', true)}</a><button data-menu aria-label="展开导航" aria-expanded="false">☰</button></div><div class="gpt-pendant"><svg class="pendant-string" viewBox="0 0 92 220" aria-hidden="true"><path id="pendant-rope" d="M46 0 L46 62"/></svg><button id="gpt-pendant-button" class="pendant-token" aria-label="GPT 挂坠，拉动后松手回到顶部" title="拉一拉，松手回到顶部"><img src="/assets/openai.svg" alt="" draggable="false"></button></div></div></header>`;
}
function hero() {
  return `<section class="headertop"><figure id="centerbg" class="centerbg">${image(data.site.cover, '首页背景', 'cover-bg', true)}<div class="hero-shade"></div><div class="focusinfo hero-intro"><h1 class="center-text">${escape(data.site.greeting)}</h1><div class="header-info hero-terminal" role="img" aria-label="BaiYe 的命令行，轮流展示代码、指令和生活句子"><div class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></div><div class="terminal-line" aria-hidden="true"><span class="terminal-prompt">C:\\Users\\BaiYe&gt;</span> <span class="terminal-output"></span><span class="terminal-cursor"></span></div></div></div>${heroProfile()}<button class="hero-profile-toggle" data-profile-toggle aria-expanded="false" aria-controls="hero-profile" aria-label="显示个人简介"><span>scroll@home:~$</span><span class="profile-toggle-direction" aria-hidden="true">&gt;_</span></button><div class="hero-wave"></div></figure></section>`;
}
function heroProfile() {
  const profile = data.site.profile || {};
  const socialLink = (name, aliases, icon) => {
    const social = data.site.socials.find(item => aliases.includes(item.name));
    return `<a class="profile-social" href="${escape(safeUrl(social?.url || '#'))}" target="_blank" rel="noopener noreferrer">${image(icon, '')}<span>${name}</span></a>`;
  };
  return `<section id="hero-profile" class="hero-profile" aria-label="白晔的个人简介" aria-hidden="true" inert><div class="profile-layout">${image(data.site.avatar, '白晔的头像', 'profile-avatar', true)}<div class="profile-panel"><div class="profile-window-bar"><div class="terminal-dots" aria-hidden="true"><i></i><i></i><i></i></div><span>baiye-profile.exe</span></div><div class="profile-command"><span class="terminal-prompt">C:\\Users\\BaiYe&gt;</span> <strong>${escape(profile.name || '白晔')}</strong><span class="terminal-cursor" aria-hidden="true"></span></div><p class="profile-bio">${escape(profile.bio || data.site.description)}</p><div class="profile-socials" aria-label="社交入口">${socialLink('GitHub', ['GitHub'], '/assets/images/sns/github.png')}${socialLink('Bilibili', ['Bilibili', '哔哩哔哩'], '/assets/images/sns/bilibili.png')}<button class="profile-social" data-contact-qr="wechat">${image('/assets/images/sns/wechat.png', '')}<span>微信</span></button><button class="profile-social" data-contact-qr="qq">${image('/assets/images/sns/qq.png', '')}<span>QQ</span></button></div></div></div></section>`;
}
function toggleHeroProfile(button) {
  const open = button.getAttribute('aria-expanded') !== 'true';
  const root = document.querySelector('#centerbg');
  root.classList.toggle('hero-profile-open', open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? '收起个人简介' : '显示个人简介');
  const panel = root.querySelector('.hero-profile'), intro = root.querySelector('.hero-intro');
  panel.setAttribute('aria-hidden', String(!open)); panel.toggleAttribute('inert', !open);
  intro.setAttribute('aria-hidden', String(open)); intro.toggleAttribute('inert', open);
  stopHeroTerminal();
  if (!open) stopHeroTerminal = initHeroTerminal(root.querySelector('.hero-terminal'), { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
}
function showContactQr(kind) {
  const name = kind === 'wechat' ? '微信' : 'QQ';
  const source = data.site.profile?.[kind + 'Qr'];
  const url = source ? safeUrl(source) : '';
  const dialog = document.querySelector('#contact-qr-dialog');
  const img = dialog.querySelector('#contact-qr-image');
  const empty = dialog.querySelector('#contact-qr-empty');
  img.onerror = () => { img.hidden = true; empty.hidden = false; empty.textContent = `${name}二维码暂时无法加载`; };
  dialog.querySelector('#contact-qr-title').textContent = `${name}二维码`;
  empty.textContent = `${name}二维码待添加`;
  const ready = Boolean(url && url !== '#');
  img.hidden = !ready; empty.hidden = ready;
  if (ready) { img.src = url; img.alt = `${name}联系二维码`; }
  else img.removeAttribute('src');
  openDialog(dialog);
}
function banner(title, subtitle, cover = data.site.cover) { return `<section class="page-banner">${image(cover, '', '', true)}<div><h1>${escape(title)}</h1><p>${escape(subtitle)}</p></div></section>`; }
function pageCover(name) { return data.site.pageCovers?.[name] || data.site.cover; }
function articleTabs() { return `<nav class="article-tabs" aria-label="文章导航">${[['/articles', '全部文章'], ['/articles/categories', '分类'], ['/articles/tags', '标签']].map(([url, name]) => `<a href="${url}" class="${location.pathname === url ? 'selected' : ''}">${name}</a>`).join('')}</nav>`; }
function postDates(post) {
  return `<div class="post-dates"><span>发布 <time datetime="${escape(publishedAt(post))}" title="${escape(publishedAt(post))}">${shortDate(publishedAt(post))}</time></span><span>更新 <time datetime="${escape(updatedAt(post))}" title="${escape(updatedAt(post))}">${shortDate(updatedAt(post))}</time></span></div>`;
}
function postBadges(post) {
  const badges = (slugs, kind, prefix) => slugs.map(slug => {
    const item = data[kind].find(i => i.slug === slug);
    return item ? `<a class="post-bubble ${kind === 'categories' ? 'category-bubble' : 'tag-bubble'}" href="${href('/articles/' + kind, slug)}" aria-label="${kind === 'categories' ? '分类' : '标签'}：${escape(item.name)}">${prefix}${escape(item.name)}</a>` : '';
  }).join('');
  return `<div class="post-bubbles">${badges(categoriesOf(post), 'categories', '▤ ')}${badges(post.tags || [], 'tags', '# ')}</div>`;
}
function postCards(posts) {
  return posts.map((post, index) => {
    const date = sortMode === 'updated' ? updatedAt(post) : publishedAt(post);
    return `<div class="timeline-entry"><div class="timeline-stamp"><span>${sortMode === 'updated' ? '更新' : '发布'}</span><time datetime="${escape(date)}">${shortDate(date)}</time></div><article data-post="${escape(post.slug)}" class="post post-list-thumb ${index % 2 ? 'post-list-thumb-right' : ''}"><div class="post-content-wrap">${postDates(post)}<a class="post-title" href="${href('/posts', post.slug)}"><h2>${escape(post.title)}</h2></a>${postBadges(post)}<div class="float-content"><p>${escape(post.excerpt)}</p><div class="post-bottom"><a class="read-more" href="${href('/posts', post.slug)}" aria-label="阅读 ${escape(post.title)}">•••</a></div></div></div><div class="post-thumb"><a href="${href('/posts', post.slug)}">${image(post.cover, post.title)}</a></div></article></div>`;
  }).join('');
}
function postList(posts) {
  currentPosts = posts;
  const sorted = sortPosts(posts, sortMode);
  const total = Math.ceil(sorted.length / pageSize);
  page = Math.max(1, Math.min(page, total || 1));
  return `<section id="article-feed" aria-label="文章时间线"><div class="post-sort"><span>最新在上 · 时间从下往上</span><div role="group" aria-label="文章排序"><button data-sort="published" aria-pressed="${sortMode === 'published'}">按发布日期</button><button data-sort="updated" aria-pressed="${sortMode === 'updated'}">按更新日期</button></div></div><div id="post-list" class="post-timeline">${sorted.length ? postCards(sorted.slice((page - 1) * pageSize, page * pageSize)) : '<div class="empty-state">这里还没有文章，过些时候再来看看吧。</div>'}</div><div class="feed-status" role="status">${sorted.length} 篇文章 · 按${sortMode === 'updated' ? '更新' : '发布'}日期 · 第 ${page} / ${total || 1} 页</div>${total > 1 ? `<nav class="list-pager" aria-label="文章分页"><button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>← 上一页</button><span>${page} / ${total}</span><button data-page="${page + 1}" ${page === total ? 'disabled' : ''}>下一页 →</button></nav>` : ''}</section>`;
}
function updateFeed() {
  const feed = document.querySelector('#article-feed');
  if (!feed) return;
  const url = new URL(location.href);
  url.searchParams.set('sort', sortMode);
  url.searchParams.set('page', page);
  history.pushState({}, '', url);
  feed.outerHTML = postList(currentPosts);
  if (!homeController) document.querySelector('#article-feed').scrollIntoView({ behavior: 'instant', block: 'start' });
  const status = document.querySelector('.feed-status');
  status.setAttribute('tabindex', '-1');
  status.focus({ preventScroll: true });
}
function home() {
  const destinations = [
    ['articles', '文章', '用文字收藏想法', 'N', 'north'],
    ['moments', '瞬间', '记录生活的温度', 'E', 'east'],
    ['music', '音乐', '让旋律陪你一会儿', 'S', 'south'],
    ['photos', '相册', '留住喜欢的风景', 'W', 'west'],
  ];
  const compass = `<section class="home-compass home-layer" aria-label="随处逛逛" aria-hidden="true" inert>
    <div class="compass-backgrounds" aria-hidden="true">${destinations.map(([name], i) => image(pageCover(name), '', `compass-backdrop ${i === 0 ? 'is-current' : ''}`, true).replace('<img ', `<img data-compass-background="${i}" `)).join('')}</div>
    <div class="compass-glass"></div>${clockMarkup(data.site.festivals)}<div class="compass-scene">
      <div class="home-layer-heading"><span>CHOOSE A DIRECTION</span><h2>随处逛逛</h2><p>让好奇心带路</p></div>
      <div class="compass-map">
        ${destinations.map(([name, title, intro, letter, position], i) => `<a class="compass-card compass-${position} ${i === 0 ? 'is-pointed' : ''}" data-direction="${i}" data-title="${title}" href="/${name}" aria-label="${title}，${letter} 方向">${image(pageCover(name), title, '', true)}<span class="compass-card-direction">${letter}<small>0${i + 1}</small></span><div class="compass-card-copy"><h3>${title}<span aria-hidden="true">↗</span></h3><p>${intro}</p></div></a>`).join('')}
        <div class="compass-center"><span class="dial-north">N</span><span class="dial-east">E</span><span class="dial-south">S</span><span class="dial-west">W</span>
          <button class="compass-dial" aria-label="转动指南针" aria-describedby="compass-help"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="dial-rim" cx="100" cy="100" r="90"/><path class="dial-arcs" d="M42 42a82 82 0 0 1 116 0M158 158a82 82 0 0 1-116 0"/>${Array.from({ length: 40 }, (_, i) => `<path class="dial-tick ${i % 10 === 0 ? 'dial-tick-major' : ''}" d="M100 14v${i % 10 === 0 ? 12 : i % 5 === 0 ? 7 : 3}" transform="rotate(${i * 9} 100 100)"/>`).join('')}<path class="dial-crosshair" d="M52 100h12m72 0h12M100 136v12"/><g class="compass-needle"><path class="needle-guide" d="M100 30v70"/><path class="needle-body" d="m100 28 11 58-11-7-11 7Z"/><path class="needle-edge" d="m100 28 11 58-11-7Z"/></g><circle class="dial-hub" cx="100" cy="100" r="10"/><circle class="dial-pin" cx="100" cy="100" r="3"/></svg></button>
        </div>
      </div><p id="compass-help" class="compass-help">拖动指南针 · 点击封面出发</p>
    </div><div class="compass-caption" role="img" aria-label="循着好奇心，去下一段风景。"><span class="compass-caption-text" aria-hidden="true"></span><span class="terminal-cursor" aria-hidden="true"></span></div>
  </section>`;
  return `<div class="home-deck" data-layer="0"><div class="home-track"><div class="home-layer home-hero" aria-label="首页大图">${hero()}</div>${compass}${archiveMarkup(data.site)}</div><nav class="home-layer-nav" aria-label="首页层级">${['首页', '随处逛逛', '档案'].map((title, i) => `<button data-home-layer="${i}" aria-label="前往${title}层" aria-current="${i === 0 ? 'step' : 'false'}"><i></i><span>${title}</span></button>`).join('')}</nav></div>`;
}
function taxonomy(kind) {
  const isCategory = kind === 'categories';
  const items = data[kind];
  return banner(isCategory ? '分类' : '标签', isCategory ? '像翻阅书架一样，找到你感兴趣的主题。' : '每一枚书签，都通向一段文字。') + `<div class="page-content">${articleTabs()}<div class="collection-heading"><span>${isCategory ? '主题 / 简介' : '书签 / 简介'}</span><span>文章</span></div><div class="bookmark-list">${items.map(item => {
    const count = data.posts.filter(p => isCategory ? categoriesOf(p).includes(item.slug) : p.tags.includes(item.slug)).length;
    return `<a class="bookmark-row" href="${href('/articles/' + kind, item.slug)}">${image(item.cover || data.site.cover, item.name)}<div class="bookmark-copy"><h2>${escape(item.name)}</h2><p>${escape(item.description || '还没有填写简介')}</p></div><span class="bookmark-count">${count}<small> 篇</small></span><span class="bookmark-arrow" aria-hidden="true">↗</span></a>`;
  }).join('') || '<p class="empty-state">暂无内容</p>'}</div></div>`;
}
function collectionDetail(kind, slug) {
  const item = data[kind].find(i => i.slug === slug);
  if (!item) return notFound();
  const posts = data.posts.filter(p => kind === 'categories' ? categoriesOf(p).includes(slug) : p.tags.includes(slug));
  document.title = `${item.name} · ${data.site.name}`;
  return banner(item.name, item.description, item.cover) + `<div class="page-content">${articleTabs()}<a class="back-link" href="/articles/${kind}">← 返回${kind === 'categories' ? '分类' : '标签'}</a><h2 class="section-title">${posts.length} 篇文章</h2>${postList(posts)}</div>`;
}
function blockMarkup(block, index) {
  switch (block.type) {
    case 'heading': return `<h2 id="heading-${index}">${escape(block.text)}</h2>`;
    case 'quote': return `<blockquote><p>${escape(block.text)}</p></blockquote>`;
    case 'code': return `<div class="code-box"><div class="code-toolbar"><span>● ● ● &nbsp; ${escape(block.language || 'Code')}</span><button data-copy="${index}">复制代码</button></div><pre><code>${escape(block.text)}</code></pre></div>`;
    case 'image': return `<figure><button class="image-button" data-photo="${escape(safeUrl(block.src))}" data-caption="${escape(block.text)}">${image(block.src, block.text)}</button><figcaption>${escape(block.text)}</figcaption></figure>`;
    default: return `<p>${escape(block.text)}</p>`;
  }
}
function postDetail(slug) {
  const post = data.posts.find(p => p.slug === slug);
  if (!post) return notFound();
  document.title = `${post.title} · ${data.site.name}`;
  const headings = post.blocks.map((block, index) => ({ ...block, index })).filter(b => b.type === 'heading');
  const index = data.posts.indexOf(post);
  return banner(post.title, `发布 ${shortDate(publishedAt(post))} · 更新 ${shortDate(updatedAt(post))}`, post.cover) + `<div class="reading-layout"><div><a class="back-link" href="/articles">← 返回文章</a><article class="post-article">${postDates(post)}${postBadges(post)}<div class="entry-content">${post.blocks.map(blockMarkup).join('')}</div><footer class="post-footer"><p class="post-end">— 写到这里，感谢阅读 —</p><button class="share-button" data-share>复制文章链接</button></footer></article><div class="adjacent-posts">${[data.posts[index - 1], data.posts[index + 1]].map((p, i) => p ? `<a href="${href('/posts', p.slug)}"><small>${i ? '下一篇' : '上一篇'}</small><strong>${escape(p.title)}</strong></a>` : '<span></span>').join('')}</div></div><aside class="article-toc"><h3>文章目录</h3><nav aria-label="文章目录">${headings.map(h => `<a href="#heading-${h.index}">${escape(h.text)}</a>`).join('')}</nav></aside></div>`;
}
function linksPage() {
  const groups = [...new Set(data.links.map(link => link.group))];
  return banner('友情链接', '在这里，遇见更多有趣的世界。') + `<div class="page-content"><p class="page-intro">以下为演示链接，后续可通过管理后台维护。</p><article class="link-article"><div class="links">${groups.map(group => `<h3 class="link-title"><span class="fake-title">${escape(group)}</span></h3><ul class="link-items">${data.links.filter(l => l.group === group).map(l => `<li class="link-item"><a class="link-item-inner" href="${escape(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${image(l.avatar, l.name)}<span class="sitename">${escape(l.name)}</span><div class="linkdes">${escape(l.description)}</div></a></li>`).join('')}</ul>`).join('')}</div></article></div>`;
}
function photosPage() {
  const groups = ['全部', ...new Set(data.photos.map(p => p.group))];
  const photos = data.photos.filter(p => photoGroup === '全部' || p.group === photoGroup);
  return banner('光影相册', '把喜欢的画面，放进时光的相册里。', pageCover('photos')) + `<div class="page-content">${groupTabs(groups, photoGroup, 'group', '相册分组')}<div class="photo-gallery">${photos.map(p => `<figure class="gallery-item"><button class="image-button" data-photo="${escape(safeUrl(p.src))}" data-caption="${escape(p.name + ' · ' + p.description)}">${image(p.src, p.name)}<span class="gallery-caption"><strong>${escape(p.name)}</strong><span>${escape(p.description)}</span></span></button></figure>`).join('') || '<p class="empty-state">这个分组还没有照片。</p>'}</div></div>`;
}
function groupTabs(groups, selected, attribute, label) {
  return `<nav class="article-tabs media-tabs" aria-label="${label}">${groups.map(group => `<button data-${attribute}="${escape(group)}" aria-pressed="${group === selected}" class="${group === selected ? 'selected' : ''}">${escape(group)}</button>`).join('')}</nav>`;
}
function musicCards() {
  const tracks = (data.music || []).filter(t => musicGroup === '全部' || t.group === musicGroup);
  return tracks.map(track => `<article class="music-row ${selectedTrack?.id === track.id ? 'is-selected' : ''}" data-track-card="${escape(track.id)}"><button class="music-row-main" data-track="${escape(track.id)}" aria-label="播放 ${escape(track.name)}" aria-pressed="${selectedTrack?.id === track.id}">${image(track.cover, track.name)}<span class="music-track-copy"><strong>${escape(track.name)}</strong><small>${escape(track.artist || '音乐收藏')}</small></span><span class="music-row-heart" aria-hidden="true">${selectedTrack?.id === track.id ? '♥' : '♡'}</span></button><p class="music-row-quote">${escape(track.quote || track.description)}</p><span class="music-row-album">${escape(track.album || `${track.group} · 收藏`)}</span><time class="music-row-duration">${escape(track.duration || '—:—')}</time></article>`).join('') || '<p class="empty-state">这个分组还没有音乐。</p>';
}
function musicPage() {
  const groups = ['全部', ...new Set((data.music || []).map(t => t.group))];
  return banner('音乐收藏', '把喜欢的旋律，收进一张张封面里。', pageCover('music')) + `<div class="page-content">${groupTabs(groups, musicGroup, 'music-group', '音乐分组')}<section id="music-gallery" class="music-library" aria-label="音乐列表"><header class="music-library-head"><span>歌曲 / 歌手</span><span>片段</span><span>专辑</span><span>时长</span></header>${musicCards()}</section></div>`;
}
function messageCards() {
  const all = [...messages, ...(data.messages || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return `<div class="moments-container"><ul class="moments-inner">${all.map(m => `<li class="moments-item journal"><div class="moment-container"><span class="guest-avatar" aria-hidden="true">${escape(m.name.slice(0, 1))}</span><div class="moment-inner"><strong class="guest-name">${escape(m.name)}</strong><div class="moment-content"><p>${escape(m.text)}</p></div><div class="moment-footer"><time datetime="${escape(m.date)}">${escape(new Date(m.date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }))}</time>${messages.some(local => local.id === m.id) ? `<button class="remove-local-message" data-remove-message="${escape(m.id)}">删除这条本地留言</button>` : ''}</div></div></div></li>`).join('') || '<p class="empty-state">还没有留言，来写下第一句问候吧。</p>'}</ul></div>`;
}
function guestbookPage() {
  return banner('留言板', '路过的小伙伴，留下一句问候吧。') + `<div class="page-content"><form id="guestbook-form" class="guestbook-form"><h2>写一条留言</h2><label for="guest-name">昵称</label><input id="guest-name" name="name" required maxlength="30" placeholder="怎么称呼你？" autocomplete="nickname"><label for="guest-message">留言</label><textarea id="guest-message" name="text" required maxlength="1000" rows="4" placeholder="分享心情，或留下一个小小的建议…"></textarea><div class="guestbook-submit"><span id="message-count">0 / 1000</span><button class="primary-link" type="submit">保存本地留言</button></div><p id="message-status" role="status"></p></form><h2 class="section-title">留下的足迹</h2><div id="guestbook-messages">${messageCards()}</div></div>`;
}
function petPage() {
  return banner('看板娘', '陪伴小站的角落，正在准备中。', pageCover('pet')) + '<div class="page-content pet-page" aria-label="看板娘内容区"></div>';
}
function playerMarkup() {
  return `<section id="music-player" class="music-player" aria-label="音乐播放器" hidden><img id="player-cover" alt="当前音乐封面"><div class="player-info"><strong id="player-title"></strong><span id="player-status" role="status"></span></div><audio id="music-audio" controls preload="none"></audio><button id="player-close" aria-label="关闭音乐播放器">×</button></section>`;
}
async function playTrack(id) {
  const track = (data.music || []).find(t => t.id === id);
  if (!track) return;
  const audio = document.querySelector('#music-audio');
  const status = document.querySelector('#player-status');
  const sameTrack = selectedTrack?.id === id;
  const request = ++playRequest;
  if (sameTrack && !audio.paused) { audio.pause(); return; }
  if (!sameTrack) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  selectedTrack = track;
  document.querySelector('#music-player').hidden = false;
  document.body.classList.add('has-player');
  document.querySelector('#player-title').textContent = track.name;
  document.querySelector('#player-cover').src = safeUrl(track.cover);
  updateTrackCards();
  if (!track.src || safeUrl(track.src) === '#') {
    status.textContent = '音源待添加，暂时无法播放';
    audio.hidden = true;
    return;
  }
  audio.hidden = false;
  if (!sameTrack) audio.src = safeUrl(track.src);
  status.textContent = '正在加载…';
  try { await audio.play(); }
  catch { if (request === playRequest) status.textContent = '无法播放，请检查音源或使用播放按钮重试'; }
}
function updateTrackCards() {
  document.querySelectorAll('[data-track-card]').forEach(card => {
    const selected = card.dataset.trackCard === selectedTrack?.id;
    card.classList.toggle('is-selected', selected);
    card.querySelector('button').setAttribute('aria-pressed', String(selected));
  });
}
function momentsPage() {
  return banner('日常瞬间', '短一点的文字，也可以留下长久的回忆。', pageCover('moments')) + `<div class="page-content"><div class="moments-container"><ul class="moments-inner">${data.moments.map(m => `<li class="moments-item journal"><div class="moment-container">${image(data.site.avatar, '作者头像', 'avatar')}<div class="moment-inner"><div class="moment-content"><p>${escape(m.text)}</p></div>${m.photos.length ? `<div class="moment-medium medium-${m.photos.length}">${m.photos.map(src => `<button class="image-button" data-photo="${escape(safeUrl(src))}" data-caption="${escape(m.text)}">${image(src, '瞬间配图')}</button>`).join('')}</div>` : ''}<div class="moment-footer"><time datetime="${escape(m.date.replace(' ', 'T') + ':00+08:00')}">◷ ${escape(m.date)}</time></div></div></div></li>`).join('') || '<p class="empty-state">还没有发布瞬间。</p>'}</ul></div></div>`;
}
function notFound() { document.title = `页面未找到 · ${data.site.name}`; return banner('404', '这一页好像走丢了。') + '<div class="page-content empty-state"><p>页面或内容不存在。</p><a class="primary-link" href="/">回到首页</a></div>'; }
function mainContent() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.title = `${titles[path] || '文章'} · ${data.site.name}`;
  if (path === '/') return home();
  if (path === '/articles') return banner('文章', '关于技术、生活，以及偶尔出现的灵感。', pageCover('articles')) + `<div class="page-content">${articleTabs()}${postList(data.posts)}</div>`;
  if (path === '/articles/categories') return taxonomy('categories');
  if (path === '/articles/tags') return taxonomy('tags');
  if (path === '/links') return linksPage();
  if (path === '/photos') return photosPage();
  if (path === '/music') return musicPage();
  if (path === '/moments') return momentsPage();
  if (path === '/pet') return petPage();
  if (path === '/guestbook') return guestbookPage();
  if (path === '/about') return banner('关于小站', '你好，很高兴在这里遇见你。') + `<div class="page-content about-card">${image(data.site.avatar, '个人头像')}<h2>${escape(data.site.name)}</h2><p>${escape(data.site.description)}</p><p>这里将用来记录生活、分享技术与收藏灵感。目前是前端演示版本，内容管理后台将在下一阶段接入。</p><a class="primary-link" href="/articles">阅读文章 →</a></div>`;
  if (path === '/login') return banner('管理入口', '属于你的小站，也由你来打理。') + '<div class="page-content management-placeholder"><h2>前端入口已就绪</h2><p>当前阶段正在搭建前端。账号登录与管理后台将在后端阶段实现。</p><p>文章、图片和站点配置目前使用演示数据。</p><a class="primary-link" href="/">返回小站</a></div>';
  const parts = path.split('/').filter(Boolean);
  let slug;
  try { slug = decodeURIComponent(parts.at(-1)); } catch { return notFound(); }
  if (parts.length === 2 && parts[0] === 'posts') return postDetail(slug);
  if (parts.length === 3 && parts[0] === 'articles' && ['categories', 'tags'].includes(parts[1])) return collectionDetail(parts[1], slug);
  return notFound();
}
let archiveController;
function render() {
  stopHeroTerminal();
  archiveController?.destroy(); archiveController = null;
  homeController?.destroy(); homeController = null;
  document.documentElement.classList.toggle('is-home', location.pathname === '/');
  if (!document.querySelector('#main-content')) {
    app.innerHTML = navigation() + `<main id="main-content"></main>` + playerMarkup();
    pendant = initPendant({ onRelease: () => homeController ? homeController.goTo(0) : window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }), onActivity: updateHeader });
    const audio = document.querySelector('#music-audio');
    for (const [event, label] of [['playing', '正在播放'], ['pause', '已暂停'], ['ended', '播放结束'], ['waiting', '正在缓冲…'], ['error', '音源无法加载，请稍后重试']]) {
      audio.addEventListener(event, () => { if (selectedTrack?.src && audio.getAttribute('src')) document.querySelector('#player-status').textContent = label; });
    }
  }
  document.querySelector('#main-content').innerHTML = mainContent();
  const deck = document.querySelector('.home-deck');
  if (deck) {
    archiveController = initArticleArchive(deck.querySelector('.article-archive'), data);
    homeController = initHome(deck, { onLayerChange: index => { archiveController.setActive(index === 2); updateHeader(); }, festivals: data.site.festivals });
  }
  stopHeroTerminal = initHeroTerminal(document.querySelector('.hero-terminal'), { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  document.querySelector('#main-content').dataset.path = location.pathname;
  document.querySelectorAll('.blog-nav a').forEach(a => {
    if (a.pathname === location.pathname || (a.pathname === '/articles' && location.pathname.startsWith('/articles/'))) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelector('.blog-nav').classList.remove('open');
  document.querySelector('[data-menu]').setAttribute('aria-expanded', 'false');
  updateHeader();
}
// 捕获委托让局部更新之后的图片也有回退行为。
app.addEventListener('error', event => {
  const img = event.target;
  if (img.tagName === 'IMG' && !img.dataset.fallback) { img.dataset.fallback = 'true'; img.src = '/assets/images/default/temp.webp'; }
}, true);
function updateHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const isHome = location.pathname === '/';
  if (pointerLocation) {
    const height = window.innerWidth <= 768 ? 64 : 76;
    const rect = document.querySelector('#gpt-pendant-button').getBoundingClientRect();
    headerHovered = pointerLocation.y <= height || (!header.classList.contains('header-hidden') && pointerLocation.x >= rect.left && pointerLocation.x <= rect.right && pointerLocation.y >= rect.top && pointerLocation.y <= rect.bottom);
  }
  const focused = Boolean(header.querySelector(':focus-visible'));
  const menuOpen = document.querySelector('.blog-nav')?.classList.contains('open');
  header.classList.toggle('scrolled', !isHome);
  header.dataset.homeLayer = homeController?.activeIndex || 0;
  header.classList.toggle('header-hidden', isHome && !headerHovered && !focused && !menuOpen && !pendant?.isActive());
}
window.addEventListener('pointermove', event => {
  pointerLocation = { x: event.clientX, y: event.clientY };
  updateHeader();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointerLocation = null; headerHovered = false; updateHeader(); });
document.addEventListener('focusin', updateHeader);
document.addEventListener('focusout', () => requestAnimationFrame(updateHeader));
// 触屏没有悬停，在首页顶部轻触页眉区域也可以唤出导航。
window.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') { pointerLocation = { x: event.clientX, y: event.clientY }; updateHeader(); }
}, { passive: true });
function navigate(url) {
  history.pushState({}, '', url);
  readListState();
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelector('#main-content').setAttribute('tabindex', '-1');
  document.querySelector('#main-content').focus({ preventScroll: true });
}
function openDialog(dialog) { previousFocus = document.activeElement; dialog.showModal(); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', e => { if (e.target === dialog || e.target.closest('[data-close]')) dialog.close(); });
  dialog.addEventListener('close', () => previousFocus?.isConnected && previousFocus.focus());
});
document.addEventListener('click', async event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.matches('[data-profile-toggle]')) toggleHeroProfile(target);
  if (target.matches('[data-contact-qr]')) showContactQr(target.dataset.contactQr);
  if (target.matches('[data-search]')) { openDialog(document.querySelector('#search-dialog')); document.querySelector('#search-input').focus(); search(''); }
  if (target.matches('[data-theme]')) { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('blog-theme', next); } catch {} target.setAttribute('aria-checked', String(next === 'dark')); target.title = next === 'dark' ? '切换到白天模式' : '切换到夜晚模式'; }
  if (target.matches('[data-menu]')) { const expanded = target.getAttribute('aria-expanded') !== 'true'; target.setAttribute('aria-expanded', expanded); document.querySelector('.blog-nav').classList.toggle('open', expanded); }
  if (target.matches('[data-page]')) { page = Number(target.dataset.page); updateFeed(); }
  if (target.matches('[data-sort]')) { sortMode = target.dataset.sort; page = 1; updateFeed(); }
  if (target.matches('[data-group]')) {
    photoGroup = target.dataset.group;
    const wrapper = document.createElement('div'); wrapper.innerHTML = photosPage();
    document.querySelector('.photo-gallery').innerHTML = wrapper.querySelector('.photo-gallery').innerHTML;
    document.querySelectorAll('[data-group]').forEach(button => { const active = button.dataset.group === photoGroup; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  if (target.matches('[data-music-group]')) {
    musicGroup = target.dataset.musicGroup;
    document.querySelector('#music-gallery').innerHTML = musicCards();
    document.querySelectorAll('[data-music-group]').forEach(button => { const active = button.dataset.musicGroup === musicGroup; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  if (target.matches('[data-track]')) await playTrack(target.dataset.track);
  if (target.matches('[data-remove-message]')) {
    try { await removeLocalMessage(target.dataset.removeMessage); messages = messages.filter(m => m.id !== target.dataset.removeMessage); if (document.querySelector('#guestbook-messages')) document.querySelector('#guestbook-messages').innerHTML = messageCards(); notify('本地留言已删除'); }
    catch (error) { notify(error.message); }
  }
  if (target.matches('#player-close')) { playRequest++; document.querySelector('#music-audio').pause(); document.querySelector('#music-player').hidden = true; document.body.classList.remove('has-player'); selectedTrack = null; updateTrackCards(); }
  if (target.matches('[data-photo]')) { const preview = document.querySelector('#preview-image'); preview.src = target.dataset.photo; preview.alt = target.dataset.caption; document.querySelector('#preview-caption').textContent = target.dataset.caption; openDialog(document.querySelector('#photo-dialog')); }
  if (target.matches('[data-copy]')) { const code = target.closest('.code-box').querySelector('code').textContent; try { await navigator.clipboard.writeText(code); notify('代码已复制'); } catch { notify('无法访问剪贴板，请选中代码手动复制'); } }
  if (target.matches('[data-share]')) { try { await navigator.clipboard.writeText(location.href); notify('文章链接已复制'); } catch { notify('请从地址栏复制文章链接'); } }
  if (target.tagName === 'A' && !target.hasAttribute('target') && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
    const url = new URL(target.href);
    if (url.origin === location.origin && !target.hasAttribute('download')) {
      if (url.pathname === location.pathname && url.hash) return;
      event.preventDefault();
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      navigate(url.pathname + url.search + url.hash);
    }
  }
});
function search(query) {
  const value = query.trim().toLowerCase();
  const posts = data.posts.filter(post => [post.title, post.excerpt, ...post.blocks.map(b => b.text || '')].join(' ').toLowerCase().includes(value));
  document.querySelector('#search-results').innerHTML = posts.map(p => `<a class="search-result" href="${href('/posts', p.slug)}"><strong>${escape(p.title)}</strong><p>${escape(p.excerpt)}</p></a>`).join('') || '<p class="empty-state">没有找到相关文章，换个关键词试试。</p>';
}
document.querySelector('#search-input').addEventListener('input', e => search(e.target.value));
document.addEventListener('input', event => { if (event.target.id === 'guest-message') document.querySelector('#message-count').textContent = `${event.target.value.length} / 1000`; });
document.addEventListener('submit', async event => {
  if (event.target.id !== 'guestbook-form') return;
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector('#message-status');
  const fields = new FormData(form);
  button.disabled = true;
  status.textContent = '正在保存…';
  try {
    const message = await submitMessage({ name: String(fields.get('name') || ''), text: String(fields.get('text') || '') });
    messages.unshift(message);
    if (form.isConnected) { document.querySelector('#guestbook-messages').innerHTML = messageCards(); form.reset(); document.querySelector('#message-count').textContent = '0 / 1000'; status.textContent = '已保存在此浏览器中，暂未公开发布。'; }
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
function readListState() {
  const params = new URLSearchParams(location.search);
  sortMode = params.get('sort') === 'updated' ? 'updated' : 'published';
  page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
}
window.addEventListener('popstate', () => {
  readListState();
  // 同一路由的排序/分页回退也只更新文章区域。
  if (document.querySelector('#article-feed') && document.querySelector('#main-content').dataset.path === location.pathname) document.querySelector('#article-feed').outerHTML = postList(currentPosts);
  else render();
});
window.addEventListener('scroll', updateHeader, { passive: true });
try { [data, messages] = await Promise.all([loadContent(), loadMessages()]); readListState(); render(); if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView()); }
catch (error) { app.innerHTML = `<div class="empty-state"><h1>小站暂时没有打开</h1><p>${escape(error.message)}</p><button onclick="location.reload()">重新加载</button></div>`; }




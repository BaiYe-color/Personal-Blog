import { loadContent, loadMessages, submitMessage, removeLocalMessage } from './api.js';
import { publishedAt, updatedAt, categoriesOf, shortDate, sortPosts } from './posts.js';
import { initPendant } from './pendant.js';
import { initHeroTerminal } from './hero-terminal.js';
import { initHome, initPagedDeck } from './home.js';
import { clockMarkup, geometricWord } from './home-clock.js';
import { archiveMarkup, initArticleArchive } from './article-archive.js';
import { adjacentTrack, formatAudioTime } from './music-transport.js';
import { floatingPlayerMarkup } from './floating-player.js';
import { initLiquidGlass } from './liquid-glass.js';
import { initFriendAquarium } from './friend-aquarium.js';

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
let photoGroup = null;
let musicGroup = '全部';
let musicView = 'all';
let musicPlaylist = '';
let musicPlayMode = 'loop';
let musicDisplay = 'cassette';
let sortMode = 'published';
let currentPosts = [];
let messages = [];
let selectedTrack = null;
let playRequest = 0;
let previousFocus;
let pendant;
let stopHeroTerminal = () => {};
let homeController;
let stopLiquidGlass = () => {};
let aquariumController;
let musicCassetteModule;
let musicCassetteImport;
let ensureMusicCassette = () => {};
let headerHovered = false;
let pointerLocation = null;
const pageSize = 3;
const titles = { '/': '首页', '/articles': '文章', '/articles/categories': '分类', '/articles/tags': '标签', '/links': '友链', '/photos': '相册', '/music': '音乐', '/moments': '瞬间', '/pet': '看板娘', '/guestbook': '留言板', '/about': '关于', '/login': '管理入口' };

function loadMusicCassetteModule() {
  if (musicCassetteModule) return Promise.resolve(musicCassetteModule);
  if (!musicCassetteImport) musicCassetteImport = import('./music-cassette.js').then(module => (musicCassetteModule = module));
  return musicCassetteImport;
}

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
function pageEnglishMarkup() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  const names = { '/': 'HOME', '/articles': 'ARTICLES', '/photos': 'GALLERY', '/music': 'MUSIC', '/moments': 'MOMENTS', '/pet': 'MASCOT', '/guestbook': 'GUESTBOOK', '/links': 'FRIENDS', '/about': 'ABOUT', '/login': 'LOGIN', '/articles/categories': 'CATEGORIES', '/articles/tags': 'TAGS' };
  const name = names[path] || (path.startsWith('/posts/') ? 'ARTICLE' : path.startsWith('/articles/categories/') ? 'CATEGORY' : path.startsWith('/articles/tags/') ? 'TAG' : 'NOT FOUND');
  return `<p class="page-english-name" aria-label="${name}" style="--name-width:${name.replace(/[^A-Z]/g, '').length * 20}px">${geometricWord(name)}</p>`;
}
function immerseCurrentPage() {
  const main = document.querySelector('#main-content');
  const bannerElement = main.querySelector(':scope > .page-banner');
  if (!bannerElement) return;
  const cover = bannerElement.querySelector('img')?.getAttribute('src') || data.site.cover;
  const title = bannerElement.querySelector('h1')?.textContent || '页面';
  const subtitle = bannerElement.querySelector('p')?.textContent || '';
  const content = document.createElement('div');
  content.className = 'immersive-content';
  [...main.children].forEach(element => { if (element !== bannerElement) content.append(element); });
  main.replaceChildren();
  const page = document.createElement('div');
  page.className = 'immersive-page';
  page.innerHTML = `<div class="immersive-backdrop" aria-hidden="true">${image(cover, '')}</div><section class="immersive-intro">${pageEnglishMarkup()}<h1>${escape(title)}</h1><span>${escape(subtitle)}</span></section>`;
  page.append(content);
  main.append(page);
}
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
  return `<div class="home-deck" data-layer="0"><div class="home-track"><div class="home-layer home-hero" aria-label="首页大图">${hero()}</div>${compass}</div><nav class="home-layer-nav" aria-label="首页层级">${['首页', '随处逛逛'].map((title, i) => `<button data-home-layer="${i}" aria-label="前往${title}层" aria-current="${i === 0 ? 'step' : 'false'}"><i></i><span>${title}</span></button>`).join('')}</nav></div>`;
}
function articleDeck() {
  return `<div class="home-deck article-deck" data-layer="0"><div class="home-track"><section class="home-layer article-landing" aria-label="文章首页"><div class="article-landing-background">${image(pageCover('articles'), '', '', true)}</div><div class="article-landing-frost"></div><div class="article-landing-copy"><p>PERSONAL DATABASE / 01</p><h1>文章</h1><span>记录生活，收藏灵感，也保留那些还在生长的想法。</span></div><button class="article-landing-next" data-home-layer="1" aria-label="进入文字档案"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></section>${archiveMarkup(data.site)}</div><nav class="home-layer-nav" aria-label="文章层级">${['文章', '档案'].map((title, i) => `<button data-home-layer="${i}" aria-label="前往${title}层" aria-current="${i === 0 ? 'step' : 'false'}"><i></i><span>${title}</span></button>`).join('')}</nav></div>`;
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
  const orbs = data.links.map(link => `<a class="friend-orb" data-friend-orb href="${escape(safeUrl(link.url))}" target="_blank" rel="noopener noreferrer" style="--orb-size:80px" aria-label="访问 ${escape(link.name)}"><img src="${escape(safeUrl(link.avatar))}" alt="${escape(link.name)}"><span>${escape(link.name)}</span></a>`).join('');
  return banner('友情链接', '在这里，遇见更多有趣的世界。') + `<div class="page-content friends-page"><section class="friend-aquarium-section friend-liquid-glass" data-liquid-glass aria-label="友链头像小球"><header class="friend-aquarium-head"><span>FRIEND ORBITS</span><p>轻碰一下，去看看他们的世界</p></header><div class="friend-aquarium" data-friend-aquarium>${orbs}</div></section><section class="friend-directory" aria-label="友链目录">${groups.map(group => `<section class="friend-group"><h3 class="link-title"><span class="fake-title">${escape(group)}</span></h3><ul class="link-items">${data.links.filter(l => l.group === group).map(l => `<li class="link-item friend-liquid-glass" data-liquid-glass><a class="link-item-inner" href="${escape(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer"><span class="friend-avatar">${image(l.avatar, l.name)}</span><span class="friend-copy"><span class="sitename">${escape(l.name)}</span><span class="linkdes">${escape(l.description)}</span></span><span class="friend-enter" aria-hidden="true">↗</span></a></li>`).join('')}</ul></section>`).join('')}</section></div>`;
}
function photosPage() {
  return banner('光影相册', '把喜欢的画面，放进时光的相册里。', pageCover('photos')) + `<div class="page-content photo-page">${photoContent()}</div>`;
}
function photoContent() {
  if (photoGroup !== null) {
    const photos = data.photos.filter(photo => photo.group === photoGroup);
    return `<header class="photo-category-head"><button data-album-back>← 返回图集</button><div><h2 tabindex="-1">${escape(photoGroup)}</h2><span>${photos.length} 张照片</span></div></header><section class="photo-category-masonry" aria-label="${escape(photoGroup)}的图片">${photos.map(photo => `<figure class="photo-category-item"><button class="image-button" data-photo="${escape(safeUrl(photo.src))}" data-caption="${escape(photo.name + ' · ' + photo.description)}" aria-label="查看 ${escape(photo.name)}">${image(photo.src, photo.name)}</button><figcaption><strong>${escape(photo.name)}</strong><p>${escape(photo.description)}</p></figcaption></figure>`).join('') || '<p class="empty-state">这个图集还没有照片。</p>'}</section>`;
  }
  const groups = [...new Set(data.photos.map(photo => photo.group))];
  const albums = groups.map(group => {
    const items = data.photos.filter(photo => photo.group === group);
    const stack = [items[2] || items[0], items[1] || items[0], items[0]].filter(Boolean);
    const cover = items[0];
    return `<article class="photo-album-card"><div class="photo-stack" aria-label="${escape(group)}相册，${items.length} 张照片">${stack.map((photo, index) => `<div class="photo-stack-frame photo-stack-frame--${index}"><img src="${escape(safeUrl(photo.src))}" alt="${escape(photo.name)}" loading="lazy"></div>`).join('')}<button class="photo-stack-open image-button" data-album="${escape(group)}" aria-label="打开 ${escape(group)} 图集"><span>OPEN</span></button></div><div class="photo-album-info"><span>${String(items.length).padStart(2, '0')} FRAMES</span><h2>${escape(group)}</h2><p>${escape(cover.description)}</p></div></article>`;
  }).join('');
  return `<section class="photo-album-grid" aria-label="分类图集">${albums || '<p class="empty-state">还没有图集。</p>'}</section>`;
}
function groupTabs(groups, selected, attribute, label) {
  return `<nav class="article-tabs media-tabs" aria-label="${label}">${groups.map(group => `<button data-${attribute}="${escape(group)}" aria-pressed="${group === selected}" class="${group === selected ? 'selected' : ''}">${escape(group)}</button>`).join('')}</nav>`;
}
function musicCards() {
  const tracks = (data.music || []).filter(t => musicGroup === '全部' || t.group === musicGroup);
  return tracks.map(track => `<article class="music-row ${selectedTrack?.id === track.id ? 'is-selected' : ''}" data-track-card="${escape(track.id)}"><button class="music-row-main" data-track="${escape(track.id)}" aria-label="播放 ${escape(track.name)}" aria-pressed="${selectedTrack?.id === track.id}">${image(track.cover, track.name)}<span class="music-track-copy"><strong>${escape(track.name)}</strong><small>${escape(track.artist || '作者')}</small></span><span class="music-row-heart" aria-hidden="true">${selectedTrack?.id === track.id ? '♥' : '♡'}</span></button><p class="music-row-quote">${escape(track.quote || track.description)}</p><span class="music-row-album">${escape(track.album || `${track.group} · 收藏`)}</span><time class="music-row-duration">${escape(track.duration || '—:—')}</time></article>`).join('') || '<p class="empty-state">这个分组还没有音乐。</p>';
}
function musicPage() {
  const tracks = data.music || [];
  const current = selectedTrack || tracks[0];
  if (!current) return '<p class="empty-state">还没有收藏音乐。</p>';
  return `<div class="home-deck music-deck" data-layer="0"><div class="music-fixed-background"><div class="article-landing-background">${image(pageCover('music'), '', '', true)}</div><div class="article-landing-frost"></div></div><div class="home-track">
    <section class="home-layer music-landing" aria-label="音乐首页">
      <div class="article-landing-copy"><p>PERSONAL COLLECTION / 02</p><h1>音乐</h1><span>让旋律在某个时刻，替你保存当下的心情。</span></div>
      <button class="article-landing-next" data-home-layer="1" aria-label="进入磁带工作台"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    </section>
    <section class="home-layer cassette-layer" aria-label="磁带音乐工作台" aria-hidden="true" inert>
      <div class="cassette-workbench">
        <header class="cassette-topline"><span>BAIYE AUDIO ARCHIVE</span></header>
        <div class="cassette-stage" data-display="${musicDisplay}">
          <nav class="cassette-display-switch" aria-label="音乐展示方式">${['cover', 'cassette'].map(view => `<button data-music-display="${view}" aria-pressed="${musicDisplay === view}">${view === 'cover' ? '封面' : '磁带'}</button>`).join('<span aria-hidden="true">/</span>')}</nav>
          <div class="cassette-media">
            <div class="cassette-canvas" data-cassette-canvas role="img" aria-label="可拖动旋转查看的立体磁带，标签显示 ${escape(current.name)}" aria-hidden="${musicDisplay !== 'cassette'}" ${musicDisplay !== 'cassette' ? 'inert' : ''}></div>
            <div class="cassette-cover" aria-hidden="${musicDisplay !== 'cover'}">${image(current.cover, current.name, 'cassette-cover-image', true)}</div>
            <p class="cassette-drag-hint">DRAG TO ROTATE</p>
          </div>
          <div class="cassette-transport" aria-label="音乐播放控制">
            <div class="cassette-progress"><input data-music-seek type="range" min="0" max="1000" step="1" value="0" disabled aria-label="音乐进度"><div><time data-music-elapsed>00:00</time><time data-music-total>${escape(current.duration || '00:00')}</time></div></div>
            <div class="cassette-transport-buttons"><button data-music-step="-1" aria-label="上一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 5 8 12l10 7Z"/></svg></button><button data-music-toggle class="cassette-toggle-play" aria-label="播放" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg></button><button data-music-step="1" aria-label="下一首"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 5l10 7-10 7Z"/></svg></button></div>
            <p data-music-status role="status"></p>
          </div>
        </div>
        <section class="cassette-now" aria-live="polite"><p>NOW PLAYING / <span data-cassette-number>01</span></p><h2 data-cassette-name>${escape(current.name)}</h2><span data-cassette-artist>${escape(current.artist || '作者')}</span><dl><div><dt>专辑</dt><dd data-cassette-album>${escape(current.album || '—')}</dd></div><div><dt>时长</dt><dd data-cassette-duration>${escape(current.duration || '—:—')}</dd></div></dl><blockquote data-cassette-quote>“${escape(current.quote || current.description || '把这一刻，录进磁带。')}”</blockquote></section>
        <aside class="cassette-library">${musicLibraryMarkup(current)}</aside>
      </div>
    </section>
  </div><nav class="home-layer-nav" aria-label="音乐层级">${['音乐', '磁带'].map((title, i) => `<button data-home-layer="${i}" aria-label="前往${title}层" aria-current="${i === 0 ? 'step' : 'false'}"><i></i><span>${title}</span></button>`).join('')}</nav></div>`;
}

function musicPlaylists() {
  if (data.playlists?.length) return data.playlists.map(list => ({ ...list, tracks: (data.music || []).filter(track => (list.trackIds || []).includes(track.id)) }));
  return [...new Set((data.music || []).map(track => track.group).filter(Boolean))].map(name => ({ id: name, name, tracks: data.music.filter(track => track.group === name) }));
}
function musicQueue() {
  return musicView === 'playlist' ? (musicPlaylists().find(list => list.id === musicPlaylist)?.tracks || []) : (data.music || []);
}
function musicLibraryMarkup(current = selectedTrack || data.music?.[0]) {
  const playlists = musicPlaylists();
  const playlist = playlists.find(list => list.id === musicPlaylist);
  const icon = name => name === 'loop' ? '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>' : '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/>';
  const content = musicView === 'playlists' ? playlists.map(list => `<button class="cassette-playlist" data-music-playlist="${escape(list.id)}"><span>${escape(list.name)}</span><small>${list.tracks.length} 首</small><b aria-hidden="true">›</b></button>`).join('') : musicQueue().map((track, index) => `<button class="cassette-track ${current?.id === track.id ? 'is-current' : ''}" data-cassette-track="${escape(track.id)}" aria-pressed="${current?.id === track.id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escape(track.name)}</strong><small>${escape(track.artist || '作者')}</small></button>`).join('');
  return `<div class="cassette-library-head"><div class="cassette-select-row"><p>SELECT</p><div class="cassette-play-modes" aria-label="播放方式">${['loop', 'shuffle'].map(mode => `<button data-play-mode="${mode}" aria-label="${mode === 'loop' ? '循环播放' : '随机播放'}" title="${mode === 'loop' ? '循环播放' : '随机播放'}" aria-pressed="${musicPlayMode === mode}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon(mode)}</svg></button>`).join('')}</div></div><nav class="cassette-select-tabs" aria-label="音乐选择"><button data-music-view="all" aria-pressed="${musicView === 'all'}">全部</button><button data-music-view="playlists" aria-pressed="${musicView === 'playlists'}">歌单</button>${musicView === 'playlist' && playlist ? `<button class="cassette-playlist-name" data-music-view="playlist" aria-pressed="true" title="${escape(playlist.name)}">${escape(playlist.name)}</button>` : ''}</nav></div><div id="cassette-track-list" class="cassette-track-list" tabindex="0" aria-label="${musicView === 'playlists' ? '歌单列表' : '歌曲列表'}">${content || '<p class="cassette-empty">暂无内容</p>'}</div>`;
}
function updateMusicLibrary() { const library = document.querySelector('.cassette-library'); if (library) library.innerHTML = musicLibraryMarkup(); }

function selectCassetteTrack(id) {
  const track = (data.music || []).find(item => item.id === id);
  if (!track) return;
  selectedTrack = track;
  document.querySelectorAll('[data-cassette-track]').forEach(button => {
    const active = button.dataset.cassetteTrack === id;
    button.classList.toggle('is-current', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const put = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
  put('[data-cassette-name]', track.name); put('[data-cassette-artist]', track.artist || '作者');
  put('[data-cassette-album]', track.album || '—'); put('[data-cassette-duration]', track.duration || '—:—');
  put('[data-cassette-number]', String((data.music || []).findIndex(item => item.id === id) + 1).padStart(2, '0'));
  put('[data-cassette-quote]', `“${track.quote || track.description || '把这一刻，录进磁带。'}”`);
  const cover = document.querySelector('.cassette-cover-image');
  if (cover) { cover.src = safeUrl(track.cover); cover.alt = track.name; delete cover.dataset.fallback; }
  document.querySelector('[data-cassette-canvas]')?.setAttribute('aria-label', `可拖动旋转查看的立体磁带，标签显示 ${track.name}`);
  cassetteController?.update(track);
  syncMusicTransport();
}

function syncMusicTransport() {
  const audio = document.querySelector('#music-audio');
  const current = selectedTrack || data.music?.[0];
  const matching = audio?.dataset.track === current?.id;
  const duration = matching && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  const playing = matching && !audio.paused && !audio.ended;
  document.querySelectorAll('[data-music-seek]').forEach(seek => {
    const position = duration ? Math.min(1000, audio.currentTime / duration * 1000) : 0;
    seek.disabled = !duration; seek.value = String(position);
    seek.style.setProperty('--progress', `${position / 10}%`);
    seek.setAttribute('aria-valuetext', `${formatAudioTime(matching ? audio.currentTime : 0)} / ${duration ? formatAudioTime(duration) : current?.duration || '00:00'}`);
  });
  document.querySelectorAll('[data-music-elapsed]').forEach(elapsed => { elapsed.textContent = formatAudioTime(matching ? audio.currentTime : 0); });
  document.querySelectorAll('[data-music-total]').forEach(total => { total.textContent = duration ? formatAudioTime(duration) : current?.duration || '00:00'; });
  document.querySelectorAll('[data-music-toggle]').forEach(button => {
    button.setAttribute('aria-label', playing ? '暂停' : '播放');
    button.setAttribute('aria-pressed', String(playing));
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${playing ? '<path d="M8 5v14M16 5v14"/>' : '<path d="m9 5 11 7-11 7Z"/>'}</svg>`;
  });
  document.querySelectorAll('[data-music-status]').forEach(status => { status.textContent = matching ? document.querySelector('#player-status').textContent : current?.src ? '' : '音源待添加'; });
  document.querySelector('#music-player')?.classList.toggle('is-playing', Boolean(playing && audio.readyState >= 2));
  const title = document.querySelector('#player-title');
  if (title && current) {
    title.textContent = current.name; title.title = current.name;
    document.querySelector('#player-artist').textContent = current.artist || '作者';
    const cover = document.querySelector('#player-cover');
    const source = safeUrl(current.cover);
    if (cover.dataset.track !== current.id || cover.dataset.source !== source) {
      cover.dataset.track = current.id; cover.dataset.source = source;
      cover.src = source; cover.alt = `${current.name} · 音乐封面`; delete cover.dataset.fallback;
    }
  }
}

function setPlayerOpen(open, restoreFocus = false) {
  const player = document.querySelector('#music-player');
  const panel = document.querySelector('#player-panel');
  const launcher = document.querySelector('#player-launcher');
  if (!player || player.hidden) return;
  player.classList.toggle('is-open', open);
  panel.inert = !open; panel.setAttribute('aria-hidden', String(!open));
  launcher.setAttribute('aria-expanded', String(open));
  launcher.setAttribute('aria-label', open ? '收起音乐播放器' : '打开音乐播放器');
  if (open) document.querySelector('#player-close').focus({ preventScroll: true });
  else if (restoreFocus) launcher.focus({ preventScroll: true });
}

function setMusicDisplay(view) {
  musicDisplay = view;
  const stage = document.querySelector('.cassette-stage');
  if (!stage) return;
  stage.dataset.display = view;
  stage.querySelectorAll('[data-music-display]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.musicDisplay === view)));
  const canvas = stage.querySelector('[data-cassette-canvas]');
  canvas.inert = view !== 'cassette'; canvas.setAttribute('aria-hidden', String(canvas.inert));
  stage.querySelector('.cassette-cover').setAttribute('aria-hidden', String(view !== 'cover'));
  if (view === 'cassette' && document.querySelector('.music-deck')?.dataset.layer === '1') ensureMusicCassette();
  cassetteController?.setActive(view === 'cassette' && document.querySelector('.music-deck')?.dataset.layer === '1');
}
function messageCards() {
  const all = [...messages, ...(data.messages || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return all.length ? `<ul class="guestbook-wall">${all.map((m, index) => {
    const local = messages.some(item => item.id === m.id);
    return `<li class="guestbook-note"><article><header class="guestbook-note-head"><span class="guestbook-note-avatar" aria-hidden="true">${escape(Array.from(m.name)[0])}</span><div><strong>${escape(m.name)}</strong><span>${local ? '本地留言' : '来访者'}</span></div><span class="guestbook-note-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span></header><p class="guestbook-note-text">${escape(m.text)}</p><footer class="guestbook-note-footer"><time datetime="${escape(m.date)}">${escape(new Date(m.date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }))}</time>${local ? `<button class="guestbook-note-remove" data-remove-message="${escape(m.id)}" aria-label="删除 ${escape(m.name)} 的本地留言" title="删除本地留言"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg></button>` : ''}</footer></article></li>`;
  }).join('')}</ul>` : '<div class="guestbook-empty"><p>这里还没有留下足迹。</p><span>点一下右上角的笔，写下第一句问候吧。</span></div>';
}
function guestbookPage() {
  return banner('留言板', '路过的小伙伴，留下一句问候吧。') + `<div class="page-content guestbook-page"><header class="guestbook-wall-head"><div><p>GUESTBOOK / 足迹</p><h2>留下的足迹 <span data-guestbook-count>${messages.length + (data.messages || []).length}</span></h2></div><button class="guestbook-compose" data-compose-message aria-label="写一条留言" title="写一条留言" aria-haspopup="dialog" aria-controls="guestbook-dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M15.5 3.5l5 5M9 15l1-5L18 2a2.1 2.1 0 0 1 3 3l-8 8-4 2Z"/></svg></button></header><div id="guestbook-messages">${messageCards()}</div></div>`;
}
function refreshGuestbook() {
  const board = document.querySelector('#guestbook-messages');
  if (board) board.innerHTML = messageCards();
  const count = document.querySelector('[data-guestbook-count]');
  if (count) count.textContent = messages.length + (data.messages || []).length;
}
function petPage() {
  const comicPanels = ['panel-01.png', 'panel-02.png', 'panel-03.png'];
  return `<div class="home-deck pet-deck" data-layer="0"><div class="home-track">
    <section class="home-layer pet-landing" aria-label="看板娘首页">
      <div class="pet-comic-background"><div class="pet-comic-panels" aria-hidden="true">${[0, 1].map(() => `<div class="pet-comic-sequence">${comicPanels.map(panel => image(`/assets/images/pet/${panel}`, '', 'pet-comic-panel', true)).join('')}</div>`).join('')}</div><div class="pet-comic-wash" aria-hidden="true"></div>
      ${image('/assets/images/pet/character-cutout.png', '看板娘', 'pet-character', true)}</div>
      <h1 class="pet-visually-hidden">看板娘</h1>
      <button class="article-landing-next pet-landing-next" data-home-layer="1" aria-label="进入看板娘档案"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    </section>
    <section class="home-layer pet-studio" aria-label="看板娘档案" aria-hidden="true" inert>
      <div class="pet-studio-background" aria-hidden="true">${image('/assets/images/pet/panel-03.png', '', '', true)}</div>
      <div class="pet-studio-frost" aria-hidden="true"></div>
      <div class="pet-studio-copy"><p>MASCOT NOTES</p><h2>看板娘档案</h2><span>正在准备中。</span></div>
    </section>
  </div><nav class="home-layer-nav" aria-label="看板娘层级">${['看板娘', '档案'].map((title, i) => `<button data-home-layer="${i}" aria-label="前往${title}层" aria-current="${i === 0 ? 'step' : 'false'}"><i></i><span>${title}</span></button>`).join('')}</nav></div>`;
}
function playerMarkup() {
  return floatingPlayerMarkup(musicPlayMode);
}
async function playTrack(id, toggle = true) {
  const track = (data.music || []).find(t => t.id === id);
  if (!track) return;
  const audio = document.querySelector('#music-audio');
  const status = document.querySelector('#player-status');
  const sameTrack = audio.dataset.track === id;
  const request = ++playRequest;
  if (toggle && sameTrack && !audio.paused) { audio.pause(); return; }
  if (!sameTrack) { audio.pause(); audio.removeAttribute('src'); delete audio.dataset.track; audio.load(); }
  audio.dataset.track = id;
  selectedTrack = track;
  selectCassetteTrack(id);
  document.querySelector('#music-player').hidden = false;
  document.querySelector('#player-title').textContent = track.name;
  document.querySelector('#player-cover').src = safeUrl(track.cover);
  updateTrackCards();
  if (!track.src || safeUrl(track.src) === '#') {
    status.textContent = '音源待添加，暂时无法播放';
    audio.hidden = true;
    syncMusicTransport();
    return;
  }
  if (!sameTrack) audio.src = safeUrl(track.src);
  audio.dataset.track = id;
  status.textContent = '正在加载…';
  try { await audio.play(); }
  catch { if (request === playRequest) status.textContent = '无法播放，请检查音源或使用播放按钮重试'; }
  syncMusicTransport();
}
function updateTrackCards() {
  document.querySelectorAll('[data-track-card]').forEach(card => {
    const selected = card.dataset.trackCard === selectedTrack?.id;
    card.classList.toggle('is-selected', selected);
    card.querySelector('button').setAttribute('aria-pressed', String(selected));
  });
}
function momentsPage() {
  const tones = ['aurora', 'rainbow', 'ticket', 'watercolor', 'mist', 'mint'];
  return banner('日常瞬间', '短一点的文字，也可以留下长久的回忆。', pageCover('moments')) + `<div class="page-content glimmer-page"><section class="glimmer-notes" aria-label="浮光便签"><header class="glimmer-section-head"><div><span>GLIMMER NOTES</span><h2>浮光便签</h2></div></header><div class="glimmer-notes-grid">${data.moments.map((m, index) => `<article class="glimmer-note glimmer-note--${tones[index % tones.length]}"><i class="glimmer-note-tape" aria-hidden="true"></i><div class="glimmer-note-meta"><time datetime="${escape(m.date.replace(' ', 'T') + ':00+08:00')}">${escape(m.date)}</time><span>瞬间</span></div><div class="glimmer-note-lines"><p>${escape(m.text)}</p></div>${m.photos.length ? `<div class="glimmer-note-photos">${m.photos.map((src, photoIndex) => `<button class="image-button glimmer-note-photo" data-photo="${escape(safeUrl(src))}" data-caption="${escape(m.text)}">${image(src, `瞬间配图 ${photoIndex + 1}`)}</button>`).join('')}</div>` : ''}</article>`).join('') || '<p class="empty-state">还没有发布瞬间。</p>'}</div></section></div>`;
}
function aboutPage() {
  const profile = data.site.profile || {};
  const field = value => escape(value || '待补充');
  const socials = (data.site.socials || []).map(item => `<a class="about-social-logo" href="${escape(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${escape(item.name)}" title="${escape(item.name)}">${image(item.icon, item.name, 'about-social-icon')}</a>`).join('') + `<button class="about-social-logo" data-contact-qr="wechat" aria-label="查看微信二维码" title="微信">${image('/assets/images/sns/wechat.png', '微信', 'about-social-icon')}</button><button class="about-social-logo" data-contact-qr="qq" aria-label="查看QQ二维码" title="QQ">${image('/assets/images/sns/qq.png', 'QQ', 'about-social-icon')}</button>`;
  const interests = profile.interests?.length ? profile.interests : (data.photos || []).map(photo => ({ name: photo.name, description: photo.description, image: photo.src }));
  const username = profile.github || 'BaiYe-color';
  const heatCells = Array.from({ length: 364 }, (_, index) => {
    const level = (index * 11 + Math.floor(index / 7) * 3) % 13 < 4 ? 0 : (index * 5 + Math.floor(index / 7)) % 4 + 1;
    return `<i class="github-heat-cell" data-level="${level}" aria-hidden="true"></i>`;
  }).join('');
  return banner('关于', '在屏幕与日常之间，保留一点属于自己的表达。', data.site.cover) + `<div class="page-content about-page"><div class="about-layout"><aside class="about-sidebar"><p class="about-kicker">PERSONAL FILE / 01</p><div class="about-identity">${image(data.site.avatar, `${profile.name || '白晔'}的头像`, 'about-avatar', true)}<div><h2>${escape(profile.name || '白晔')}</h2><span><i></i>ONLINE</span></div></div><p class="about-bio">${escape(profile.bio || data.site.description)}</p><dl class="about-sidebar-facts"><div><dt>出生日期</dt><dd>${field(profile.birthday)}</dd></div><div><dt>地址</dt><dd>${field(profile.location)}</dd></div><div><dt>学校</dt><dd>${field(profile.school)}</dd></div></dl><div class="about-social-logos" aria-label="社交账号">${socials}</div></aside><main class="about-main"><section class="about-signature"><p class="about-kicker">SIGNATURE / 02</p><blockquote>“${escape(profile.signature || '把日子过成可以回望的风景。')}”</blockquote></section><section class="about-components"><header class="about-section-head"><p>COMPONENTS / 03</p><h2>我的成分</h2></header><div class="about-component-wall">${interests.map((item, index) => `<article class="about-component-card about-component-${index % 3}">${image(item.image, item.name)}<div><span>${String(index + 1).padStart(2, '0')}</span><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p></div></article>`).join('')}</div></section><section class="about-github"><header class="about-section-head"><p>GITHUB / 04</p><a href="https://github.com/${encodeURIComponent(username)}" target="_blank" rel="noopener noreferrer">@${escape(username)} ↗</a></header><div class="github-heatmap" role="img" aria-label="GitHub 贡献热力图预览"><div class="github-heat-weeks">${heatCells}</div><div class="github-heat-legend"><span>Less</span><i data-level="0"></i><i data-level="1"></i><i data-level="2"></i><i data-level="3"></i><i data-level="4"></i><span>More</span></div></div></section><section class="about-site-data"><header class="about-section-head"><p>SITE LOG / 05</p><h2>正在成长的小站</h2></header><div><article><strong>${data.posts.length}</strong><span>篇文章</span></article><article><strong>${data.photos.length}</strong><span>张照片</span></article><article><strong>${data.music.length}</strong><span>首音乐</span></article></div></section></main></div></div>`;
}
function notFound() { document.title = `页面未找到 · ${data.site.name}`; return banner('404', '这一页好像走丢了。') + '<div class="page-content empty-state"><p>页面或内容不存在。</p><a class="primary-link" href="/">回到首页</a></div>'; }
function mainContent() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.title = `${titles[path] || '文章'} · ${data.site.name}`;
  if (path === '/') return home();
  if (path === '/articles') return articleDeck();
  if (path === '/articles/categories') return taxonomy('categories');
  if (path === '/articles/tags') return taxonomy('tags');
  if (path === '/links') return linksPage();
  if (path === '/photos') return photosPage();
  if (path === '/music') return musicPage();
  if (path === '/moments') return momentsPage();
  if (path === '/pet') return petPage();
  if (path === '/guestbook') return guestbookPage();
  if (path === '/about') return aboutPage();
  if (path === '/login') return banner('管理入口', '属于你的小站，也由你来打理。') + '<div class="page-content management-placeholder"><h2>前端入口已就绪</h2><p>当前阶段正在搭建前端。账号登录与管理后台将在后端阶段实现。</p><p>文章、图片和站点配置目前使用演示数据。</p><a class="primary-link" href="/">返回小站</a></div>';
  const parts = path.split('/').filter(Boolean);
  let slug;
  try { slug = decodeURIComponent(parts.at(-1)); } catch { return notFound(); }
  if (parts.length === 2 && parts[0] === 'posts') return postDetail(slug);
  if (parts.length === 3 && parts[0] === 'articles' && ['categories', 'tags'].includes(parts[1])) return collectionDetail(parts[1], slug);
  return notFound();
}
let archiveController;
let cassetteController;
function render() {
  stopHeroTerminal();
  stopLiquidGlass(); stopLiquidGlass = () => {};
  aquariumController?.destroy(); aquariumController = null;
  archiveController?.destroy(); archiveController = null;
  cassetteController?.destroy(); cassetteController = null;
  ensureMusicCassette = () => {};
  homeController?.destroy(); homeController = null;
  document.documentElement.classList.toggle('is-home', location.pathname === '/');
  document.documentElement.classList.toggle('is-music', location.pathname === '/music');
  document.documentElement.classList.toggle('is-paged', ['/', '/articles', '/music', '/pet'].includes(location.pathname));
  if (!document.querySelector('#main-content')) {
    app.innerHTML = navigation() + `<main id="main-content"></main>` + playerMarkup();
    pendant = initPendant({ onRelease: () => homeController ? homeController.goTo(0) : window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }), onActivity: updateHeader });
    const audio = document.querySelector('#music-audio');
    for (const [event, label] of [['playing', '正在播放'], ['pause', '已暂停'], ['ended', '播放结束'], ['waiting', '正在缓冲…'], ['error', '音源无法加载，请稍后重试']]) {
      audio.addEventListener(event, () => { if (selectedTrack?.src && audio.getAttribute('src')) document.querySelector('#player-status').textContent = label; syncMusicTransport(); });
    }
    for (const event of ['timeupdate', 'durationchange', 'loadedmetadata', 'seeking', 'seeked', 'emptied']) audio.addEventListener(event, syncMusicTransport);
    audio.addEventListener('ended', () => {
      const queue = musicQueue().filter(track => track.src && safeUrl(track.src) !== '#');
      if (!queue.length) return;
      const next = adjacentTrack(queue, audio.dataset.track, 1, musicPlayMode === 'shuffle');
      if (next.id === audio.dataset.track) audio.currentTime = 0;
      playTrack(next.id);
    });
  }
  document.querySelector('#main-content').innerHTML = mainContent();
  document.querySelector('.article-landing-copy > p')?.replaceWith(document.createRange().createContextualFragment(pageEnglishMarkup()));
  if (!['/', '/articles', '/music', '/pet'].includes(location.pathname)) immerseCurrentPage();
  const deck = document.querySelector('.home-deck');
  if (deck?.classList.contains('article-deck')) {
    archiveController = initArticleArchive(deck.querySelector('.article-archive'), data);
    homeController = initPagedDeck(deck, { onLayerChange: index => { archiveController.setActive(index === 1); updateHeader(); } });
  } else if (deck?.classList.contains('music-deck')) {
    const host = deck.querySelector('[data-cassette-canvas]');
    const stage = host.closest('.cassette-stage');
    let cassetteStart;
    const startCassette = () => {
      if (cassetteController || cassetteStart) return cassetteStart;
      stage.classList.add('is-cassette-loading'); host.setAttribute('aria-busy', 'true');
      cassetteStart = loadMusicCassetteModule().then(({ initMusicCassette }) => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(initMusicCassette(host, selectedTrack || data.music?.[0])))))).then(controller => {
        if (location.pathname !== '/music' || !host.isConnected) { controller.destroy(); return; }
        cassetteController = controller;
        stage.classList.remove('is-cassette-loading'); host.removeAttribute('aria-busy');
        cassetteController.setActive(homeController?.activeIndex === 1 && musicDisplay === 'cassette');
      }).catch(() => {
        stage.classList.remove('is-cassette-loading'); host.removeAttribute('aria-busy');
        host.textContent = '磁带模型暂时无法加载';
      });
      return cassetteStart;
    };
    ensureMusicCassette = startCassette;
    homeController = initPagedDeck(deck, { onLayerChange: index => {
      if (index === 1 && musicDisplay === 'cassette') startCassette();
      cassetteController?.setActive(index === 1 && musicDisplay === 'cassette');
      updateHeader();
    } });
    const preload = () => loadMusicCassetteModule().catch(() => {});
    if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 1800 });
    else window.setTimeout(preload, 700);
  } else if (deck?.classList.contains('pet-deck')) {
    homeController = initPagedDeck(deck, { onLayerChange: () => updateHeader() });
  } else if (deck) {
    homeController = initHome(deck, { onLayerChange: index => { updateHeader(); }, festivals: data.site.festivals });
  }
  syncMusicTransport();
  stopHeroTerminal = initHeroTerminal(document.querySelector('.hero-terminal'), { reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  stopLiquidGlass = initLiquidGlass(document.querySelector('#main-content'));
  aquariumController = initFriendAquarium(document.querySelector('[data-friend-aquarium]'));
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
  header.classList.remove('scrolled');
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
  if (target.matches('[data-compose-message]')) {
    document.querySelector('#message-status').textContent = '';
    openDialog(document.querySelector('#guestbook-dialog'));
    document.querySelector('#guest-name').focus({ preventScroll: true });
  }
  if (target.matches('[data-theme]')) { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; try { localStorage.setItem('blog-theme', next); } catch {} target.setAttribute('aria-checked', String(next === 'dark')); target.title = next === 'dark' ? '切换到白天模式' : '切换到夜晚模式'; }
  if (target.matches('[data-menu]')) { const expanded = target.getAttribute('aria-expanded') !== 'true'; target.setAttribute('aria-expanded', expanded); document.querySelector('.blog-nav').classList.toggle('open', expanded); }
  if (target.matches('[data-page]')) { page = Number(target.dataset.page); updateFeed(); }
  if (target.matches('[data-sort]')) { sortMode = target.dataset.sort; page = 1; updateFeed(); }
  if (target.matches('[data-album], [data-album-back]')) {
    const returningTo = photoGroup;
    photoGroup = target.matches('[data-album-back]') ? null : target.dataset.album;
    stopLiquidGlass();
    const content = document.querySelector('.photo-page');
    content.innerHTML = photoContent();
    stopLiquidGlass = initLiquidGlass(document.querySelector('#main-content'));
    const focus = photoGroup !== null ? content.querySelector('.photo-category-head h2') : [...content.querySelectorAll('[data-album]')].find(button => button.dataset.album === returningTo);
    focus?.focus({ preventScroll: true });
    content.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  if (target.matches('[data-music-group]')) {
    musicGroup = target.dataset.musicGroup;
    const musicGallery = document.querySelector('#music-gallery');
    if (musicGallery) musicGallery.innerHTML = musicCards();
    const cassetteList = document.querySelector('#cassette-track-list');
    if (cassetteList) {
      const tracks = (data.music || []).filter(track => musicGroup === '全部' || track.group === musicGroup);
      cassetteList.innerHTML = tracks.map((track, index) => `<button class="cassette-track ${selectedTrack?.id === track.id ? 'is-current' : ''}" data-cassette-track="${escape(track.id)}" aria-pressed="${selectedTrack?.id === track.id}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${escape(track.name)}</strong><small>${escape(track.artist || '作者')}</small></button>`).join('') || '<p class="cassette-empty">这个分组还没有音乐。</p>';
      if (!tracks.some(track => track.id === selectedTrack?.id)) selectCassetteTrack(tracks[0]?.id);
    }
    document.querySelectorAll('[data-music-group]').forEach(button => { const active = button.dataset.musicGroup === musicGroup; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  }
  if (target.matches('[data-cassette-track]')) await playTrack(target.dataset.cassetteTrack);
  if (target.matches('[data-music-display]')) setMusicDisplay(target.dataset.musicDisplay);
  if (target.matches('[data-music-toggle]')) await playTrack((selectedTrack || data.music?.[0])?.id);
  if (target.matches('[data-music-step]')) {
    const next = adjacentTrack(musicQueue(), (selectedTrack || data.music?.[0])?.id, Number(target.dataset.musicStep), musicPlayMode === 'shuffle');
    if (next) { if (next.id === document.querySelector('#music-audio').dataset.track) document.querySelector('#music-audio').currentTime = 0; await playTrack(next.id, false); }
  }
  if (target.matches('[data-music-view]')) { musicView = target.dataset.musicView; updateMusicLibrary(); }
  if (target.matches('[data-music-playlist]')) { musicPlaylist = target.dataset.musicPlaylist; musicView = 'playlist'; updateMusicLibrary(); }
  if (target.matches('[data-play-mode]')) { musicPlayMode = target.dataset.playMode; document.querySelectorAll('[data-play-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.playMode === musicPlayMode))); }
  if (target.matches('[data-track]')) await playTrack(target.dataset.track);
  if (target.matches('[data-remove-message]')) {
    try { await removeLocalMessage(target.dataset.removeMessage); messages = messages.filter(m => m.id !== target.dataset.removeMessage); refreshGuestbook(); notify('本地留言已删除'); }
    catch (error) { notify(error.message); }
  }
  if (target.matches('#player-launcher')) setPlayerOpen(!document.querySelector('#music-player').classList.contains('is-open'));
  if (target.matches('#player-close')) setPlayerOpen(false, true);
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
document.addEventListener('pointerdown', event => {
  if (document.querySelector('#music-player.is-open') && !event.target.closest('#music-player')) setPlayerOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('#music-player.is-open')) { event.preventDefault(); setPlayerOpen(false, true); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'guest-message') document.querySelector('#message-count').textContent = `${event.target.value.length} / 1000`;
  if (event.target.matches('[data-music-seek]')) {
    const audio = document.querySelector('#music-audio');
    if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.dataset.track === (selectedTrack || data.music?.[0])?.id) {
      audio.currentTime = Number(event.target.value) / 1000 * audio.duration; syncMusicTransport();
    }
  }
});
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
    refreshGuestbook();
    form.reset(); document.querySelector('#message-count').textContent = '0 / 1000'; status.textContent = '';
    document.querySelector('#guestbook-dialog').close();
    notify('留言已保存在此浏览器中，暂未公开发布。');
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




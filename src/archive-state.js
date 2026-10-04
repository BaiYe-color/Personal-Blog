import { categoriesOf, sortPosts } from './posts.js';

// Adapted from RhineLabUI's archive-loop: unbounded coordinates keep wrapping
// in the direction of travel; each category retains its selected article.
export const wrapArchive = (value, count) => ((value % count) + count) % count;
export function nearestArchiveRow(index, current, count) {
  return index + Math.floor((current - index + count / 2) / count) * count;
}
export class ArticleArchive {
  constructor(posts, categories, mode = 'published', tags = []) {
    this.posts = posts.filter(post => !post.status || post.status === 'published');
    this.categories = categories;
    this.tags = tags;
    this.mode = mode;
    this.lane = 0;
    this.row = 0;
    this.memory = new Map();
    this.rebuild();
  }
  rebuild() {
    const sorted = sortPosts(this.posts, this.mode);
    const groups = (items, kind, matches) => items.map(item => ({
      ...item, slug: `${kind}:${item.slug}`, kind,
      posts: sorted.filter(post => matches(post).includes(item.slug)),
    })).filter(column => column.posts.length);
    const recommended = sorted.filter(post => post.recommended);
    this.columns = [...(recommended.length ? [{ slug: 'recommended', kind: 'recommended', name: '推荐文章', posts: recommended }] : []),
      { slug: 'all', kind: 'all', name: '全部文章', posts: sorted },
      ...groups(this.categories, 'category', categoriesOf),
      ...groups(this.tags, 'tag', post => post.tags || [])];
  }
  get columnIndex() { return this.columns.length ? wrapArchive(this.lane, this.columns.length) : 0; }
  get column() { return this.columns[this.columnIndex]; }
  get index() { return this.column ? wrapArchive(this.row, this.column.posts.length) : 0; }
  get post() { return this.column?.posts[this.index]; }
  remember() { if (this.post) this.memory.set(this.column.slug, this.post.slug); }
  stepRow(direction) { if (!this.post) return; this.row += direction; this.remember(); }
  stepColumn(direction) {
    if (!this.post) return;
    this.remember(); this.lane += direction;
    const remembered = this.memory.get(this.column.slug);
    const index = Math.max(0, this.column.posts.findIndex(post => post.slug === remembered));
    this.row = nearestArchiveRow(index, this.row, this.column.posts.length);
    this.remember();
  }
  selectIndex(index) {
    if (!this.post) return;
    this.row = nearestArchiveRow(wrapArchive(index, this.column.posts.length), this.row, this.column.posts.length);
    this.remember();
  }
  selectCell(lane, row) {
    if (!this.post) return;
    this.remember(); this.lane = lane; this.row = row; this.remember();
  }
  setSort(mode) {
    if (!['published', 'updated'].includes(mode) || mode === this.mode) return;
    this.remember(); this.mode = mode;
    this.rebuild();
    const remembered = this.memory.get(this.column?.slug);
    if (this.column) this.row = nearestArchiveRow(Math.max(0, this.column.posts.findIndex(post => post.slug === remembered)), this.row, this.column.posts.length);
  }
  fileNumber(post = this.post) {
    return String(this.posts.findIndex(item => item.slug === post?.slug) + 1).padStart(3, '0');
  }
}

export const publishedAt = post => post.publishedAt || post.date;
export const updatedAt = post => post.updatedAt || publishedAt(post);
export const categoriesOf = post => post.categories || (post.category ? [post.category] : []);
export function shortDate(value) {
  // 保留内容自己的日历日期，避免浏览器时区改变时间线日期。
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1].slice(-2)}/${Number(match[2])}/${Number(match[3])}` : '暂无日期';
}
export function sortPosts(posts, mode = 'published') {
  const date = mode === 'updated' ? updatedAt : publishedAt;
  const timestamp = post => Date.parse(date(post)) || 0;
  // 严格按时间倒序，不再让置顶字段覆盖日期顺序。
  return [...posts].sort((a, b) => timestamp(b) - timestamp(a) || a.slug.localeCompare(b.slug));
}

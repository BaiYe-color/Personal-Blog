// 所有页面通过这一层读取数据。接入后台时替换内部请求，保留页面使用的数据结构。
export async function loadContent() {
  const response = await fetch('/data/content.json');
  if (!response.ok) throw new Error('内容加载失败，请稍后重试');
  const content = await response.json();
  return { ...content, posts: content.posts.filter(post => post.status === 'published') };
}

const guestbookKey = 'personal-blog-guestbook-v1';
export async function loadMessages() {
  try {
    const stored = JSON.parse(localStorage.getItem(guestbookKey) || '[]');
    return Array.isArray(stored) ? stored.filter(m => typeof m.name === 'string' && typeof m.text === 'string' && typeof m.date === 'string') : [];
  } catch { return []; }
}
export async function submitMessage({ name, text }) {
  name = name.trim();
  text = text.trim();
  if (!name || name.length > 30 || !text || text.length > 1000) throw new Error('请填写昵称（最多 30 字）和留言（最多 1000 字）。');
  const message = { id: crypto.randomUUID(), name, text, date: new Date().toISOString() };
  const messages = await loadMessages();
  // 前端阶段仅保存在此浏览器，接入后台后替换成真实提交接口。
  try { localStorage.setItem(guestbookKey, JSON.stringify([message, ...messages])); }
  catch { throw new Error('浏览器无法保存留言，请检查存储设置后重试。'); }
  return message;
}
export async function removeLocalMessage(id) {
  const messages = await loadMessages();
  try { localStorage.setItem(guestbookKey, JSON.stringify(messages.filter(m => m.id !== id))); }
  catch { throw new Error('无法删除此条本地留言，请稍后重试。'); }
}

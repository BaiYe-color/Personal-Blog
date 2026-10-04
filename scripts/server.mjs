import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname);
    const publicPath = name.startsWith('/assets/') || name.startsWith('/data/');
    const allowedFile = publicPath || name.startsWith('/src/');
    if (!allowedFile && path.extname(name) && name !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
    const candidate = allowedFile ? path.resolve(root, publicPath && !process.argv.includes('--dist') ? 'public' : '.', '.' + name) : path.join(root, 'index.html');
    const relative = path.relative(root, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
    const data = await fs.readFile(candidate);
    res.writeHead(200, { 'Content-Type': types[path.extname(candidate)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`个人博客：http://127.0.0.1:${port}`));

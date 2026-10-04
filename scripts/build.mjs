import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist');
await fs.mkdir(output, { recursive: true });
await fs.copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
await fs.cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true });
await fs.cp(path.join(root, 'public'), output, { recursive: true });
console.log('静态前端已生成到 dist/；部署时请将页面路由回退到 index.html。');

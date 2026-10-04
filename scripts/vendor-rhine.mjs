import fs from 'node:fs/promises';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'public/assets/vendor/three');
const three = path.join(root, 'node_modules/three');
await fs.mkdir(path.join(target, 'build'), { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await fs.copyFile(path.join(three, 'build', file), path.join(target, 'build', file));
await fs.copyFile(path.join(three, 'LICENSE'), path.join(target, 'LICENSE'));
const copiedAddons = new Set();
async function addon(file) {
  if (copiedAddons.has(file)) return;
  copiedAddons.add(file);
  const dest = path.join(target, 'addons', file);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const code = await fs.readFile(path.join(three, 'examples/jsm', file), 'utf8');
  await fs.writeFile(dest, code);
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.')) await addon(path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])));
  }
}
const source = path.join(root, '模板/RhineLabUI');
const assets = path.join(root, 'public/assets/rhine');
await fs.mkdir(assets, { recursive: true });
await fs.copyFile(path.join(source, 'public/assets/archive-cassette.glb'), path.join(assets, 'archive-cassette.glb'));
await fs.copyFile(path.join(source, 'LICENSE'), path.join(assets, 'LICENSE.txt'));
const drag = await fs.readFile(path.join(source, 'src/archive-drag.ts'), 'utf8');
await fs.writeFile(path.join(root, 'src/archive-drag.js'), '// Adapted from RhineLabUI/src/archive-drag.ts; MIT, copyright 2026 LBEILC.\n' + stripTypeScriptTypes(drag));
const modules = new Set();
const moduleDir = path.join(root, 'src/rhine');
await fs.mkdir(moduleDir, { recursive: true });
async function module(name) {
  if (modules.has(name) || ['data', 'asset-url'].includes(name)) return;
  modules.add(name);
  let code = stripTypeScriptTypes(await fs.readFile(path.join(source, 'src', name + '.ts'), 'utf8'), { mode: 'transform' });
  const dependencies = [];
  code = code.replace(/((?:from\s*|import\s*)['"])([^'"]+)(['"])/g, (all, prefix, specifier, suffix) => {
    if (specifier.startsWith('.')) {
      const dependency = specifier.replace(/^\.\//, '').replace(/\.ts$/, '');
      dependencies.push(dependency);
      return prefix + './' + dependency + '.js' + suffix;
    }
    if (specifier.startsWith('three/addons/')) dependencies.push({ addon: specifier.slice(13) });
    return all;
  });
  if (name === 'scene') {
    code = code.replace('fileAtSlot, fileLocation', 'fileAtSlot, fileLocation, fileNumber, archiveColumns, rowPeriod');
    code = code.replace('(this.selectedCell.lane - 2) / 5) * 5', '(this.selectedCell.lane - 2) / archiveColumns.length) * archiveColumns.length');
    code = code.replace('(this.selectedCell.row - 12) / 8) * 8', '(this.selectedCell.row - 12) / rowPeriod) * rowPeriod');
    code = code.replace('"RHINE LAB, LLC."', '"BAIYE ARCHIVE"').replace('"R L / I S"', '"B Y / L G"');
    code = code.replace('String(index + 1).padStart(3, "0")', 'fileNumber(index)');
    // The homepage wheel turns full-screen layers. The original canvas wheel
    // changes files, so bypass only that handler, preserving drag and picking.
    code = code.replace(/(canvas\.addEventListener\(\s*"wheel",\s*\(e\) => \{)/, '$1\n        return; // Homepage wheel navigation owns this gesture.');
    code = code.replace('THREE.PCFSoftShadowMap', 'THREE.PCFShadowMap');
  }
  await fs.writeFile(path.join(moduleDir, name + '.js'), '// RhineLabUI, MIT, copyright 2026 LBEILC.\n' + code);
  for (const dependency of dependencies) {
    if (typeof dependency === 'object') await addon(dependency.addon);
    else await module(dependency);
  }
}
await module('scene');
await fs.writeFile(path.join(moduleDir, 'asset-url.js'), 'export const assetUrl = path => "/assets/rhine/" + path.replace(/^\\/?assets\\//, "");\n');
// Original MiSans font shards load on demand; retain their provenance/license.
await fs.cp(path.join(source, 'public/fonts/misans-webfont-4.3.1'), path.join(assets, 'fonts/misans-webfont-4.3.1'), { recursive: true });
for (const file of ['NOTICE.txt', 'MiSans-license.pdf']) await fs.copyFile(path.join(source, 'public/fonts', file), path.join(assets, 'fonts', file));
const fonts = (await fs.readFile(path.join(source, 'src/fonts.css'), 'utf8')).replaceAll('/fonts/', '/assets/rhine/fonts/');
await fs.writeFile(path.join(root, 'src/rhine/fonts.css'), fonts);
console.log(`完整 RhineLabUI 渲染已迁入：${modules.size} 个场景模块、${copiedAddons.size} 个 Three.js 扩展、原模型及 MiSans 字体。`);

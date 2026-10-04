// 读取标志所在位置的底层内容。图片像素只在同源或允许 CORS 时读取；
// 读取不到的外部图片退回页面背景色，不依赖截图或远程识别服务。
const pixels = new WeakMap();
const rgb = value => {
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return { r: 0, g: 0, b: 0, a: 0 };
  const values = match[1].split(/[\s,\/]+/).map(Number);
  return { r: values[0], g: values[1], b: values[2], a: values[3] ?? 1 };
};
const over = (front, back) => {
  const a = front.a + back.a * (1 - front.a);
  if (!a) return { r: 0, g: 0, b: 0, a: 0 };
  return Object.fromEntries(['r', 'g', 'b'].map(c => [c, (front[c] * front.a + back[c] * back.a * (1 - front.a)) / a]).concat([['a', a]]));
};
function imagePixel(image, x, y) {
  if (!image.complete || !image.naturalWidth) return null;
  let cached = pixels.get(image);
  if (!cached || cached.src !== image.currentSrc) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    try {
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 128, 128);
      cached = { src: image.currentSrc, data: context.getImageData(0, 0, 128, 128).data };
    } catch { cached = { src: image.currentSrc, data: null }; }
    pixels.set(image, cached);
  }
  if (!cached.data) return null;
  const rect = image.getBoundingClientRect();
  const style = getComputedStyle(image);
  let u = (x - rect.left) / rect.width, v = (y - rect.top) / rect.height;
  if (['cover', 'contain'].includes(style.objectFit)) {
    const scale = Math[style.objectFit === 'cover' ? 'max' : 'min'](rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    const position = style.objectPosition.split(' ').map(part => part.endsWith('%') ? parseFloat(part) / 100 : .5);
    u = (x - rect.left - (rect.width - w) * position[0]) / w;
    v = (y - rect.top - (rect.height - h) * (position[1] ?? .5)) / h;
  }
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const index = (Math.min(127, Math.floor(v * 128)) * 128 + Math.min(127, Math.floor(u * 128))) * 4;
  return { r: cached.data[index], g: cached.data[index + 1], b: cached.data[index + 2], a: cached.data[index + 3] / 255 };
}
export function choosePendantInk({ r, g, b }) {
  const linear = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
  const luminance = .2126 * linear(r) + .7152 * linear(g) + .0722 * linear(b);
  return luminance > .179 ? 'black' : 'white';
}
export function backgroundAt(x, y) {
  let composite = { r: 0, g: 0, b: 0, a: 0 };
  for (const element of document.elementsFromPoint(x, y)) {
    if (element.closest('.site-header')) continue;
    const style = getComputedStyle(element);
    let layer = rgb(style.backgroundColor);
    if (element.tagName === 'IMG') {
      layer = imagePixel(element, x, y) || layer;
      // 页面封面有一个铺在图片上的半透明伪元素。
      if (element.parentElement.classList.contains('page-banner')) layer = over(rgb(getComputedStyle(element.parentElement, '::after').backgroundColor), layer);
    } else if (style.backgroundImage.startsWith('linear-gradient(')) {
      const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
      if (stops?.length) {
        const rect = element.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (y - rect.top) / rect.height)) * (stops.length - 1);
        const first = rgb(stops[Math.floor(progress)]), last = rgb(stops[Math.ceil(progress)]);
        const fraction = progress % 1;
        layer = Object.fromEntries(['r', 'g', 'b', 'a'].map(c => [c, first[c] * (1 - fraction) + last[c] * fraction]));
      }
    }
    layer.a *= Number(style.opacity);
    composite = over(composite, layer);
    if (composite.a > .99) break;
  }
  return over(composite, { ...rgb(getComputedStyle(document.body).backgroundColor), a: 1 });
}

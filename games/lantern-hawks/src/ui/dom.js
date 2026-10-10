// Tiny DOM helper: el('button', { class: 'x', onclick }, 'text', child...)
export function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

// A registry drawable as an <img> (cached data URL for canvases).
const urlCache = new WeakMap();
export function artImg(drawable, cls) {
  let src = drawable.src;
  if (!src) {
    src = urlCache.get(drawable);
    if (!src) { src = drawable.toDataURL(); urlCache.set(drawable, src); }
  }
  return el('img', { src, class: cls, alt: '' });
}

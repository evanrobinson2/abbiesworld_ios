// Asset registry keyed by role ("tile.grass", "portrait.regent", ...).
// Procedural placeholders register first; anything listed in
// assets/manifest.json then overrides them, so real art drops in without
// code changes. A missing key draws a loud magenta checker, never nothing.

const store = new Map();
const overrides = new Map();
const warned = new Set();
let missingTile = null;

export function register(key, drawable) {
  store.set(key, drawable);
}

// Only real (manifest) art, or null.
export function getOverride(key) {
  return overrides.get(key) || null;
}

export function has(key) {
  return overrides.has(key) || store.has(key);
}

export function get(key) {
  const d = overrides.get(key) || store.get(key);
  if (d) return d;
  if (!warned.has(key)) {
    warned.add(key);
    console.warn(`[assets] no art for "${key}"; drawing placeholder`);
  }
  return missing();
}

function missing() {
  if (missingTile) return missingTile;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.fillStyle = (x + y) % 2 ? '#ff00ff' : '#200020';
    g.fillRect(x * 4, y * 4, 4, 4);
  }
  missingTile = c;
  return c;
}

// manifest: { "images": { "tile.grass": "assets/tiles/grass.png",
//                         "sprite.hero.walk.down.0": { "src": "assets/hero.png", "rect": [0,0,16,16] } } }
export async function loadManifest(url = 'assets/manifest.json') {
  let manifest;
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    manifest = await res.json();
  } catch {
    return 0;
  }
  const entries = Object.entries(manifest.images || {});
  const loaded = await Promise.all(entries.map(async ([key, spec]) => {
    const src = typeof spec === 'string' ? spec : spec.src;
    try {
      const img = await loadImage(src);
      if (typeof spec === 'object' && spec.rect) {
        const [x, y, w, h] = spec.rect;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
        overrides.set(key, c);
      } else if (typeof spec === 'object' && spec.fit) overrides.set(key, fitImage(img, spec.fit[0], spec.fit[1]));
      else overrides.set(key, img);
      return 1;
    } catch {
      console.warn(`[assets] manifest entry "${key}" failed to load from ${src}; keeping placeholder`);
      return 0;
    }
  }));
  return loaded.reduce((a, b) => a + b, 0);
}

// "fit": [w, h] in a manifest entry resamples a large painting down to the size
// it is drawn at, smoothly, in halving steps. The screens draw with smoothing
// off (right for pixel art), which would otherwise shred a 1280 px painting.
function fitImage(img, w, h) {
  let src = img, sw = img.width, sh = img.height;
  while (sw / 2 >= w && sh / 2 >= h) {
    const c = document.createElement('canvas');
    c.width = Math.round(sw / 2); c.height = Math.round(sh / 2);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    src = c; sw = c.width; sh = c.height;
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  return c;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

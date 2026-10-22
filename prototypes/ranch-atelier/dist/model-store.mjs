// Game loader for the R2 model store. Import it before anything loads a model:
//   import '/model-store.mjs';
// It reads /api/models?paths=1 (site path -> R2 URL, written by tools/model-store) and points three.js's
// default loading manager at R2, so every GLTFLoader/TextureLoader request for a stored file comes from R2.
// Files not in the store, a slow catalogue (over 1.5 s), or ?bundled in the URL keep the bundled copy.
import {DefaultLoadingManager} from 'three';

const state = {source: 'bundled', paths: {}, hits: 0, misses: 0};
export const modelStore = state;

async function load() {
  if (typeof location === 'undefined' || new URLSearchParams(location.search).has('bundled')) return;
  try {
    const r = await fetch('/api/models?paths=1', {signal: AbortSignal.timeout(1500)});
    if (!r.ok) return;
    const doc = await r.json();
    if (doc?.paths && typeof doc.paths === 'object') Object.assign(state, {source: 'r2', paths: doc.paths});
  } catch {}
}
await load();

/** Stored URL for a site path or URL, or the input unchanged when the store doesn't have it. */
export function modelUrl(url) {
  if (state.source !== 'r2' || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) return url;
  let u;
  try { u = new URL(url, document.baseURI); } catch { return url; }
  if (u.origin !== location.origin || u.pathname.startsWith('/r2/')) return url;
  const hit = state.paths[decodeURIComponent(u.pathname)];
  if (hit) { state.hits++; return hit; }
  if (/\.(glb|gltf)$/i.test(u.pathname)) state.misses++;
  return url;
}

if (state.source === 'r2') {
  const previous = DefaultLoadingManager.urlModifier;
  DefaultLoadingManager.setURLModifier(url => modelUrl(previous ? previous(url) : url));
  globalThis.__modelStore = state;
}

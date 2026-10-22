// Model catalogue, read from Cloudflare R2. tools/model-store/sync.mjs (run by the model-store GitHub Action)
// uploads every model and writes the catalogue from the model_assets table to R2; this route only reads it.
//   GET /api/models          curated models for /models   ({models:[...]}, see models/README.md)
//   GET /api/models?all=1    every stored model and reference image
//   GET /api/models?paths=1  site path -> stored URL, used by /model-store.mjs in the game
// R2 URLs are rewritten to the same-origin /r2 proxy (vercel.json), so GLBs load without bucket CORS.
const BASE = (process.env.MODELS_R2_BASE || 'https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev').replace(/\/+$/, '');

function proxied(value) {
  if (typeof value === 'string') return value.startsWith(BASE + '/') ? '/r2/' + value.slice(BASE.length + 1) : value;
  if (Array.isArray(value)) return value.map(proxied);
  if (value && typeof value === 'object') { const out = {}; for (const k in value) out[k] = proxied(value[k]); return out; }
  return value;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(JSON.stringify({error: 'Read only'})); }
  const query = new URL(req.url, 'http://local').searchParams;
  const file = query.has('paths') ? 'paths.json' : query.has('all') ? 'catalog-all.json' : 'catalog.json';
  try {
    const upstream = await fetch(`${BASE}/models/${file}`, {signal: AbortSignal.timeout(4000)});
    if (!upstream.ok) throw new Error(`R2 answered ${upstream.status}`);
    const doc = await upstream.json();
    if (file === 'paths.json') { doc.base = '/r2'; doc.paths = proxied(doc.paths); }
    else doc.models = proxied(doc.models || []);
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=600');
    res.end(JSON.stringify(doc));
  } catch (error) {
    // 503 lets /models fall back to its bundled manifest and the game to its bundled files.
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({error: 'Model catalogue unavailable', detail: String(error.message || error)}));
  }
};
module.exports.proxied = proxied;

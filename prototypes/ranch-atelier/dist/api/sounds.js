// Sound catalogue, read from Cloudflare R2. tools/sound-engineer/store.mjs (run by the sound-store GitHub Action)
// uploads every processed sound and writes the catalogue from the sound_assets table to R2; this route only reads it.
//   GET /api/sounds   {sounds:[...]}, see sounds/README.md
// R2 URLs are rewritten to the same-origin /r2 proxy (vercel.json), as /api/models does.
const {proxied} = require('./models.js');
const BASE = (process.env.MODELS_R2_BASE || 'https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev').replace(/\/+$/, '');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(JSON.stringify({error: 'Read only'})); }
  try {
    const upstream = await fetch(`${BASE}/sounds/catalog.json`, {signal: AbortSignal.timeout(4000)});
    if (!upstream.ok) throw new Error(`R2 answered ${upstream.status}`);
    const doc = await upstream.json();
    doc.sounds = proxied(doc.sounds || []);
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=600');
    res.end(JSON.stringify(doc));
  } catch (error) {
    // 503 lets /sounds fall back to its bundled manifest.
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({error: 'Sound catalogue unavailable', detail: String(error.message || error)}));
  }
};

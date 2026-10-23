const { randomBytes } = require('node:crypto');

// Verdicts from the /models review screen: accept, adjust (with notes) or reject, typed or spoken.
// The latest verdict per model lives at model-reviews/v1/latest/<model>.json; every verdict also goes to the
// feedback inbox (feedback/v1/), which a GitHub Action copies into the repo for the modelers to pick up.
//   GET  /api/model-reviews            {reviews: {<model id>: {verdict, notes, via, at}}}
//   POST /api/model-reviews  {id, verdict, notes, via}
const PREFIX = 'model-reviews/v1/';
const VERDICTS = ['accept', 'adjust', 'reject', 'clear'];
const MODEL = /^[a-z0-9][a-z0-9-]{0,80}$/;
const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const read = async (get, path) => { const r = await get(path, { access: 'private', useCache: false }); return r && r.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : null; };

function createHandler({ put, list, get, del } = require('@vercel/blob')) { return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
  try {
    if (req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin rejected' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = text(body && body.id, 90), verdict = text(body && body.verdict, 10), notes = text(body && body.notes, 4000).trim();
      if (!MODEL.test(id) || !VERDICTS.includes(verdict)) return json(res, 400, { error: 'Invalid review' });
      if (verdict === 'adjust' && !notes) return json(res, 400, { error: 'Say what to change' });
      const latest = `${PREFIX}latest/${id}.json`;
      if (verdict === 'clear') { await del(latest).catch(() => {}); return json(res, 200, { ok: true }); }
      const at = new Date().toISOString(), via = body.via === 'voice' ? 'voice' : 'tap';
      const review = { id, verdict, notes, via, at, name: text(body.name, 120) };
      await put(latest, JSON.stringify(review), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
      const fid = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
      const label = { accept: 'Accepted', adjust: 'Adjust', reject: 'Rejected' }[verdict];
      await put(`feedback/v1/${fid}.json`, JSON.stringify({
        id: fid, receivedAt: at, kind: 'model-review', model: id, verdict,
        note: `${label}: ${review.name || id}${notes ? ' — ' + notes : ''}`,
        page: `/models/${id}`, title: 'Model review', via, userAgent: text(req.headers['user-agent'], 300), hasImage: false
      }), { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
      return json(res, 200, { ok: true, review });
    }
    const blobs = []; let cursor;
    do { const page = await list({ prefix: `${PREFIX}latest/`, limit: 1000, cursor }); blobs.push(...page.blobs); cursor = page.hasMore ? page.cursor : null; } while (cursor);
    const reviews = {};
    (await Promise.all(blobs.map(b => read(get, b.pathname).catch(() => null)))).forEach(r => { if (r && r.id) reviews[r.id] = r; });
    return json(res, 200, { reviews });
  } catch (error) {
    console.error('Model review failed:', error.name, error.message);
    return json(res, 500, { error: 'Reviews temporarily unavailable' });
  }
}; }
module.exports = createHandler();
module.exports.createHandler = createHandler;

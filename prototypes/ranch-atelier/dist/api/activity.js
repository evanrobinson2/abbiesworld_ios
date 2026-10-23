// The app's activity centre feed (app-activity.js): jobs, machines and events from the dispatch bridge,
// proxied so the feed key stays on the server. POST {dispatch_id, instructions} steers a running job.
// Contract: FEEDBACK.md, "Activity centre".
const FEED = process.env.DISPATCH_FEED_URL || 'https://studio-mock-iota.vercel.app/api/dispatch-feed';
const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
const offline = error => ({ source: 'offline', error, events: [], jobs: [], machines: [], generated_at: new Date().toISOString() });

function createHandler(fetchImpl = (...args) => fetch(...args)) { return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const key = process.env.DISPATCH_FEED_KEY;
  try {
    if (req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin rejected' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const id = String(body?.dispatch_id || ''), instructions = String(body?.instructions || '').trim().slice(0, 4000);
      if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(id) || !instructions) return json(res, 400, { error: 'Pick a job and write what to change' });
      if (!key) return json(res, 503, { error: 'The workshop feed is not connected yet' });
      const upstream = await fetchImpl(FEED, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Dispatch-Feed-Key': key }, body: JSON.stringify({ dispatch_id: id, instructions, source: 'ranch-app' }), signal: AbortSignal.timeout(10000) });
      const data = await upstream.json().catch(() => ({}));
      return json(res, upstream.ok ? 200 : 502, upstream.ok ? { ok: true, ...data } : { error: 'The workshop did not take the note', status: upstream.status });
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    if (!key) return json(res, 200, offline('The workshop feed is not connected yet'));
    const query = new URL(req.url, 'https://activity.invalid').searchParams;
    const params = new URLSearchParams({ format: 'activity' });
    if (query.get('since')) params.set('since', query.get('since'));
    params.set('limit', String(Math.min(200, Number(query.get('limit')) || 100)));
    const upstream = await fetchImpl(`${FEED}?${params}`, { headers: { 'X-Dispatch-Feed-Key': key }, signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return json(res, 200, offline(`Workshop feed answered ${upstream.status}`));
    const data = await upstream.json();
    return json(res, 200, { source: 'live', events: data.events || [], jobs: data.jobs || [], machines: data.machines || [], generated_at: data.generated_at || new Date().toISOString() });
  } catch (error) {
    console.error('Activity feed failed:', error.name, error.message);
    return json(res, 200, offline('Workshop feed unreachable'));
  }
}; }
module.exports = createHandler();
module.exports.createHandler = createHandler;

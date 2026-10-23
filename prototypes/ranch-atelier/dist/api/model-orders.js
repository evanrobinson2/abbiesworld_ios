const { randomBytes } = require('node:crypto');
const { account } = require('../lib/account.cjs');
const { wallet, PRICES } = require('../lib/wallet.cjs');

// "Request more" from /models: a cart of new modeling orders, each a few words and an optional photo.
// Evan's rules (2026-10-23):
//  - An order never skips the concept stage. Every order is stored at stage 'concept', whatever the page sends, and
//    goes to Claude as a new order that starts with concept art for Evan to pick.
//  - Photos pass a PG check before anything is stored or forwarded. Nothing unclothed is ever accepted. Faces may be
//    in a photo, but a face is never redrawn, modelled or turned into a likeness; the order carries noLikeness.
//  - When the check can't run, the photo is refused (fail closed), and the words alone can still be sent.
// Orders live in the private Blob store at model-orders/v1/; each also drops a note in the feedback inbox. Photos
// stay out of the inbox (it is copied into the repo) and only the owner can fetch them.
//   POST /api/model-orders  {from_model_id?, text, photo?: data:image/jpeg|png;base64,...}
//   GET  /api/model-orders             owner only: the latest 50 orders
//   GET  /api/model-orders?photo=<id>  owner only: an order's photo
const PREFIX = 'model-orders/v1/';
const THREAD = 'cmsg_01USVJqCbJruSGtaP4zsE2eYJJwV5vW99BgS3tVwgdy9Q5';
const MODEL = /^[a-z0-9][a-z0-9-]{0,80}$/;
const ID = /^[a-z0-9]{8,12}-[a-f0-9]{8}$/;
const PHOTO = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
const GUARD_MODEL = 'openai/gpt-6-luna';
const GUARD_PROMPT = `You check photos a family uploads to a children's game before anything is made from them.
Answer with JSON only: {"people": boolean, "faces": boolean, "child": boolean, "unclothed": boolean, "unsafe": boolean, "subject": string}.
- people/faces: any person or human face is visible.
- child: anyone who may be under 18 is visible.
- unclothed: anyone is nude, partly nude, in underwear, or the photo is sexual in any way. When unsure, true.
- unsafe: gore, weapons pointed at people, drugs, hate symbols, or anything not PG. When unsure, true.
- subject: what the photo shows, in a few plain words, without describing any person's face or body.`;
const json = (res, status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const read = async (get, path) => { const r = await get(path, { access: 'private', useCache: false }); return r && r.statusCode === 200 ? r : null; };

// Asks the gateway model to look at the photo. Returns {ok, reason?, pg?}; any failure refuses the photo.
async function checkPhoto({ fetcher, env, photo }) {
  const token = env.VERCEL_OIDC_TOKEN || env.AI_GATEWAY_API_KEY;
  if (!token) return { ok: false, reason: 'Photo checking is offline right now. Send the words without the photo, or try again later.' };
  try {
    const response = await fetcher('https://ai-gateway.vercel.sh/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL_ORDER_GUARD_MODEL || GUARD_MODEL, response_format: { type: 'json_object' }, max_tokens: 200, stream: false,
        messages: [{ role: 'system', content: GUARD_PROMPT }, { role: 'user', content: [{ type: 'text', text: 'Check this photo.' }, { type: 'image_url', image_url: { url: photo } }] }] }) });
    if (!response.ok) throw Error(`gateway ${response.status}`);
    const pg = JSON.parse((await response.json()).choices?.[0]?.message?.content || '');
    if (typeof pg.unclothed !== 'boolean' || typeof pg.unsafe !== 'boolean') throw Error('unreadable answer');
    if (pg.unclothed) return { ok: false, reason: 'That photo can’t be used: Abbie’s World never makes anything from photos of people who aren’t dressed.' };
    if (pg.unsafe) return { ok: false, reason: 'That photo can’t be used in Abbie’s World. Try another one.' };
    return { ok: true, pg: { people: !!pg.people, faces: !!pg.faces, child: !!pg.child, subject: text(pg.subject, 120) } };
  } catch (error) {
    console.error('Photo check failed:', error.name, error.message);
    return { ok: false, reason: 'The photo couldn’t be checked just now. Send the words without the photo, or try again.' };
  }
}

function createHandler({ blob = require('@vercel/blob'), fetcher = fetch, env = process.env, who = account, purse = wallet, now = Date.now } = {}) {
  const { put, list, get } = blob, buckets = new Map();
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
    try {
      if (req.method === 'GET') {
        const me = who(req, env);
        if (!me || !me.owner) return json(res, 403, { error: 'Only the owner can see orders' });
        const photoId = new URL(req.url, 'https://orders.invalid').searchParams.get('photo');
        if (photoId) {
          if (!ID.test(photoId)) return json(res, 400, { error: 'Invalid id' });
          const order = await read(get, `${PREFIX}${photoId}.json`);
          const kind = order && JSON.parse(await new Response(order.stream).text()).photo;
          const r = kind && await read(get, `${PREFIX}${photoId}.${kind === 'png' ? 'png' : 'jpg'}`);
          if (!r) return json(res, 404, { error: 'No photo' });
          res.statusCode = 200; res.setHeader('Content-Type', kind === 'png' ? 'image/png' : 'image/jpeg');
          return res.end(Buffer.from(await new Response(r.stream).arrayBuffer()));
        }
        const blobs = []; let cursor;
        do { const page = await list({ prefix: PREFIX, limit: 1000, cursor }); blobs.push(...page.blobs); cursor = page.hasMore ? page.cursor : null; } while (cursor);
        const ids = blobs.map(b => b.pathname.slice(PREFIX.length)).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)).filter(id => ID.test(id)).sort().reverse().slice(0, 50);
        const orders = (await Promise.all(ids.map(async id => { const r = await read(get, `${PREFIX}${id}.json`); return r ? JSON.parse(await new Response(r.stream).text()) : null; }))).filter(Boolean);
        return json(res, 200, { orders });
      }

      if (req.headers.origin && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: 'Origin rejected' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') return json(res, 400, { error: 'Invalid order' });
      const words = text(body.text, 2000).trim(), from = body.from_model_id == null ? null : text(body.from_model_id, 90);
      const photo = typeof body.photo === 'string' && body.photo ? body.photo : '';
      if (!words && !photo) return json(res, 400, { error: 'Say what you’d like made' });
      if (from !== null && !MODEL.test(from)) return json(res, 400, { error: 'Invalid model' });
      const m = photo && photo.match(PHOTO);
      if (photo && (!m || photo.length > 2800000)) return json(res, 400, { error: 'Send the photo as a JPEG or PNG under 2 MB' });

      const at = now(), ip = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown';
      for (const [key, value] of buckets) if (at - value.at > 60000) buckets.delete(key);
      const rate = buckets.get(ip) || { at, n: 0 };
      if (rate.n >= 10) return json(res, 429, { error: 'That’s a lot of orders at once. Wait a minute and try again.' });
      rate.n++; buckets.set(ip, rate);

      // The photo check costs real money, so it needs a signed-in player and comes out of their cap (lib/wallet.cjs).
      let pg = null;
      if (photo) {
        const me = who(req, env);
        if (!me) return json(res, 401, { error: 'Sign in to send a photo. You can send the words without it.' });
        if (!await purse().charge(me, PRICES.photoCheck, 'Checking a photo')) return json(res, 402, { error: 'Photo checking has used up its magic for now. Send the words without the photo.' });
        const checked = await checkPhoto({ fetcher, env, photo });
        if (!checked.ok) return json(res, 422, { error: checked.reason });
        pg = checked.pg;
      }

      const id = `${at.toString(36)}-${randomBytes(4).toString('hex')}`, receivedAt = new Date(at).toISOString();
      const order = { id, receivedAt, stage: 'concept', status: 'new', text: words, fromModel: from,
        photo: m ? (m[1] === 'png' ? 'png' : 'jpeg') : null, pg, noLikeness: !!(pg && (pg.faces || pg.people)) };
      if (m) await put(`${PREFIX}${id}.${m[1] === 'png' ? 'png' : 'jpg'}`, Buffer.from(m[2], 'base64'), { access: 'private', addRandomSuffix: false, contentType: `image/${m[1]}` });
      await put(`${PREFIX}${id}.json`, JSON.stringify(order), { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
      const note = [`New model order (start with concept art for Evan to pick; never go straight to a model)${from ? `, more like /models/${from}` : ''}: ${words || '(photo only)'}`,
        m ? `Photo: ${pg.subject || 'see it'} at /api/model-orders?photo=${id} (owner sign-in).` : '',
        order.noLikeness ? 'The photo shows people: do not redraw, model or make a likeness of any face or person.' : ''].filter(Boolean).join(' ');
      await put(`feedback/v1/${id}.json`, JSON.stringify({ id, receivedAt, kind: 'model-order', order: id, note, page: '/models', title: 'Request more',
        thread: THREAD, threadTitle: 'Model challenge', userAgent: text(req.headers['user-agent'], 300), hasImage: false }),
        { access: 'private', addRandomSuffix: false, contentType: 'application/json' });
      return json(res, 200, { ok: true, order });
    } catch (error) {
      console.error('Model order failed:', error.name, error.message);
      return json(res, 500, { error: 'Orders are temporarily unavailable' });
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.checkPhoto = checkPhoto;

// The explore library's non-model collections (models come from /api/models). Read only.
//   GET /api/library?c=cards       cards catalogue from R2 library/cards/catalog.json ({items:[...]}, see explore/README.md)
//   GET /api/library?c=huds        HUDs catalogue from R2 library/huds/catalog.json
//   GET /api/library?c=reports     every study under docs/oracle on main, read from GitHub, so a merged report appears on its own
//   GET /api/library?report=<path> one report's file (Markdown as text, HTML as a sandboxed page)
// A missing catalogue is an empty collection, not an error, so a collection fills in the moment its first item is published.
const R2 = (process.env.MODELS_R2_BASE || 'https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev').replace(/\/+$/, '');
const REPO = 'evanrobinson2/abbiesworld_ios', REF = process.env.LIBRARY_REPORTS_REF || 'main', ROOT = 'docs/oracle';
const COLLECTIONS = new Set(['cards', 'huds']);
// Which collection a report sits beside, from its folder under docs/oracle.
const BESIDE = {cards: 'cards', card: 'cards', huds: 'huds', hud: 'huds', models: 'models', modeling: 'models', sounds: 'sounds'};
const SKIP = /(^|\/)(BACKLOG|README)\.md$/i;

const proxied = value => typeof value === 'string' && value.startsWith(R2 + '/') ? '/r2/' + value.slice(R2.length + 1) : value;

async function get(url, json = true){
  const headers = {'user-agent': 'abbies-explore'};
  if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) headers.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const r = await fetch(url, {headers, signal: AbortSignal.timeout(5000)});
  if (!r.ok) { const e = new Error(`${url.split('?')[0]} answered ${r.status}`); e.status = r.status; throw e; }
  return json ? r.json() : r.text();
}

async function collection(name){
  try {
    const doc = await get(`${R2}/library/${name}/catalog.json`);
    const items = (Array.isArray(doc) ? doc : doc.items || []).map(item => {
      const out = {...item};
      for (const k of ['image', 'thumb', 'back']) if (out[k]) out[k] = proxied(out[k]);
      return out;
    });
    return {items, updated: doc.updated || null};
  } catch (error) {
    if (error.status === 404 || error.status === 403) return {items: [], updated: null};
    throw error;
  }
}

function blurb(text){
  const lines = text.split('\n'), title = (lines.find(l => /^#\s/.test(l)) || '').replace(/^#\s+/, '').trim();
  const para = text.replace(/^#.*$/gm, '').split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).find(p => p && !/^[|>\-*`<!]/.test(p)) || '';
  return {title, summary: para.replace(/[*_`]/g, '').slice(0, 280)};
}

async function reports(){
  const docs = await get(`https://api.github.com/repos/${REPO}/contents/${ROOT.split('/')[0]}?ref=${REF}`);
  const dir = docs.find(d => d.path === ROOT);
  if (!dir) return {items: []};
  const tree = await get(`https://api.github.com/repos/${REPO}/git/trees/${dir.sha}?recursive=1`);
  const files = tree.tree.filter(f => f.type === 'blob' && /\.(md|html)$/i.test(f.path) && !SKIP.test(f.path));
  // CARD_STUDY.md and card-study.html side by side are one report: the page is what opens, the Markdown is its text.
  const stem = f => f.path.toLowerCase().replace(/\.(md|html)$/, '').replace(/[-_\s]+/g, '-');
  const pages = new Map(files.filter(f => /\.html$/i.test(f.path)).map(f => [stem(f), f])), entries = [];
  for (const f of files.filter(f => /\.md$/i.test(f.path))){ const page = pages.get(stem(f)); pages.delete(stem(f)); entries.push({text: f, page}); }
  for (const page of pages.values()) entries.push({page});
  const items = [];
  await Promise.all(entries.map(async e => {
    const main = e.text || e.page, path = `${ROOT}/${main.path}`, folder = main.path.includes('/') ? main.path.split('/')[0] : '';
    let meta = {title: '', summary: ''};
    if (e.text) { try { meta = blurb(await get(`https://raw.githubusercontent.com/${REPO}/${REF}/${path}`, false)); } catch {} }
    const fallback = main.path.split('/').pop().replace(/\.(md|html)$/i, '').replace(/[-_]+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    items.push({
      id: path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
      kind: 'report', name: meta.title || fallback, summary: meta.summary,
      group: folder ? folder.replace(/\b\w/g, c => c.toUpperCase()) + ' studies' : 'Research notes',
      beside: BESIDE[folder.toLowerCase()] || null,
      text: e.text ? `${ROOT}/${e.text.path}` : null, page: e.page ? `${ROOT}/${e.page.path}` : null,
      source: `https://github.com/${REPO}/blob/${REF}/${path}`, bytes: main.size || 0,
    });
  }));
  items.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  return {items};
}

async function report(path, res){
  if (!/^docs\/oracle\/[\w./-]+\.(md|html)$/i.test(path) || path.includes('..')) { res.statusCode = 400; return res.end(JSON.stringify({error: 'Not a report'})); }
  const body = await get(`https://raw.githubusercontent.com/${REPO}/${REF}/${path}`, false);
  if (/\.html$/i.test(path)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy', "sandbox allow-scripts; default-src 'self' https: data: 'unsafe-inline'");
  } else res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  res.end(body);
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(JSON.stringify({error: 'Read only'})); }
  const query = new URL(req.url, 'http://local').searchParams, name = query.get('c');
  try {
    if (query.has('report')) return await report(query.get('report'), res);
    let doc;
    if (name === 'reports') doc = await reports();
    else if (COLLECTIONS.has(name)) doc = await collection(name);
    else { res.statusCode = 400; return res.end(JSON.stringify({error: 'Unknown collection', collections: ['cards', 'huds', 'reports']})); }
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=900');
    res.end(JSON.stringify({collection: name, count: doc.items.length, ...doc}));
  } catch (error) {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({error: 'Library unavailable', detail: String(error.message || error)}));
  }
};
module.exports.blurb = blurb;

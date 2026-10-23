// Local stand-in for the Vercel site: serves prototypes/ranch-atelier/dist with the
// rewrites and redirects from its vercel.json, answers /api and /r2 with 404, and
// records every file it serves (crawl.mjs uses the record to decide what to mirror).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
export const DIST = path.resolve(here, '../../prototypes/ranch-atelier/dist');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.obj': 'text/plain', '.mtl': 'text/plain', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.wasm': 'application/wasm', '.txt': 'text/plain', '.md': 'text/markdown',
  '.hdr': 'application/octet-stream', '.ktx2': 'application/octet-stream',
};

function compile(source) {
  const keys = [];
  const re = source.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)(\*)?/g, (_, k, star) => {
    keys.push(k);
    return star ? '(.*)' : '([^/]+)';
  });
  return { re: new RegExp('^' + re + '$'), keys };
}

function rules(list) {
  return (list || []).filter((r) => !r.has).map((r) => ({ ...r, ...compile(r.source) }));
}

const vercel = JSON.parse(fs.readFileSync(path.join(DIST, 'vercel.json'), 'utf8'));
const REWRITES = rules(vercel.rewrites);
const REDIRECTS = rules(vercel.redirects);

function apply(rule, m) {
  let out = rule.destination;
  rule.keys.forEach((k, i) => { out = out.replace(new RegExp(':' + k + '\\*?', 'g'), m[i + 1]); });
  return out;
}

// Resolve a request path to a file in dist, following Vercel's order: filesystem first, then rewrites.
export function resolve(pathname) {
  const tryFile = (p) => {
    const f = path.join(DIST, decodeURIComponent(p));
    if (!f.startsWith(DIST)) return null;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    if (fs.existsSync(path.join(f, 'index.html'))) return path.join(f, 'index.html');
    if (fs.existsSync(f + '.html')) return f + '.html';
    return null;
  };
  const direct = tryFile(pathname);
  if (direct) return { file: direct };
  for (const r of REWRITES) {
    const m = pathname.match(r.re);
    if (!m) continue;
    const dest = apply(r, m);
    if (/^https?:/.test(dest)) return { external: dest };
    const f = tryFile(dest.split('?')[0]);
    if (f) return { file: f };
  }
  return null;
}

export function start(port = 0, record = new Map()) {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = u.pathname;
    for (const r of REDIRECTS) {
      if (r.missing) continue;
      const m = p.match(r.re);
      if (m && p !== '/') { res.writeHead(302, { location: apply(r, m) }); return res.end(); }
    }
    if (p === '/') { res.writeHead(302, { location: '/sandbox' }); return res.end(); }
    if (p.startsWith('/api/') || p.startsWith('/r2/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"error":"not mirrored"}'); }
    const hit = resolve(p);
    if (!hit || !hit.file) { res.writeHead(404); return res.end('not found'); }
    const rel = path.relative(DIST, hit.file);
    record.set(rel, (record.get(rel) || new Set()).add(p));
    res.writeHead(200, { 'content-type': TYPES[path.extname(hit.file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(hit.file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, port: server.address().port, record })));
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  const { port } = await start(Number(process.argv[2] || 5180));
  console.log('serving dist on http://127.0.0.1:' + port);
}

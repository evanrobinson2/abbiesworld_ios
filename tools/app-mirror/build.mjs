// Builds the Claude-page mirror of the app from prototypes/ranch-atelier/dist into tools/app-mirror/out/site.
//   node tools/app-mirror/build.mjs            (uses out/crawl.json from crawl.mjs)
// Code, styles and pages stay loose files with root paths made relative; models, pictures, sounds and data
// go into a few content-named packs that runtime/shim.js serves. The shell (runtime/shell.html) becomes
// the page itself. Writes out/site/_mirror/index.json and out/files.json (every published path and its hash).
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { DIST, resolve } from './serve.mjs';
import { SCREENS, WHOLE_DIRS, ALWAYS } from './screens.mjs';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
const SITE = path.join(OUT, 'site');
const PACK_BYTES = 6 * 1024 * 1024;
const LOOSE_EXT = new Set(['.html', '.js', '.mjs', '.cjs', '.css', '.woff2', '.woff', '.ttf', '.otf']);
const TEXT_EXT = new Set(['.html', '.css']);
const TYPES = { '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wasm': 'application/wasm', '.obj': 'text/plain', '.mtl': 'text/plain', '.txt': 'text/plain', '.md': 'text/markdown', '.hdr': 'application/octet-stream', '.ktx2': 'image/ktx2', '.webmanifest': 'application/manifest+json' };
const SKIP = /(^|\/)(\.|node_modules\/)|\.(blend1?|log|py|psd|zip)$/i;

const sha = (() => { try { return execSync('git rev-parse HEAD', { cwd: DIST }).toString().trim(); } catch { return 'unknown'; } })();
const crawl = JSON.parse(fs.readFileSync(path.join(OUT, 'crawl.json'), 'utf8'));

// ---- which files ----
const files = new Set();
for (const s of Object.values(crawl)) for (const f of s.files) files.add(f);
const walk = (d) => fs.readdirSync(path.join(DIST, d), { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.add(path.join(d, e.name))));
for (const d of WHOLE_DIRS) if (fs.existsSync(path.join(DIST, d))) walk(d);
for (const f of ALWAYS) files.add(f);
files.delete('index.html'); // the shell takes the page's own path; "/" opens the sandbox anyway
for (const f of [...files]) if (SKIP.test(f) || !fs.existsSync(path.join(DIST, f))) files.delete(f);

// Pictures named by a stylesheet or a style attribute must stay loose: CSS can't go through the shim.
const cssRefs = new Set();
for (const f of files) {
  if (!TEXT_EXT.has(path.extname(f))) continue;
  const text = fs.readFileSync(path.join(DIST, f), 'utf8');
  for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const u = m[2];
    if (/^(data|https?|blob):|^#/.test(u)) continue;
    const abs = u.startsWith('/') ? u.slice(1) : path.join(path.dirname(f), u);
    cssRefs.add(path.normalize(abs.split(/[?#]/)[0]));
  }
}
const isLoose = (f) => LOOSE_EXT.has(path.extname(f).toLowerCase()) || (cssRefs.has(f) && /\.(png|jpe?g|webp|gif|svg)$/i.test(f));

// ---- rewriting root paths in pages and stylesheets ----
const HOSTS = /^(?:https?:)?\/\/(?:abbies-ranch-atelier\.vercel\.app|ranch\.abbies\.world|app\.abbies\.world|www\.abbies\.world|abbies\.world)(?=\/|$)/i;
function target(u) {
  // A root path or one of our own hosts, to the mirrored file that serves it (or null to leave it alone).
  const s = u.replace(HOSTS, '');
  if (!s.startsWith('/') || s.startsWith('//')) return null;
  const [p, rest = ''] = s.split(/(?=[?#])/);
  if (p.startsWith('/api/') || p.startsWith('/r2/')) return null;
  const hit = p === '/' ? { file: path.join(DIST, 'simulations/index.html') } : resolve(p);
  if (!hit?.file) return null;
  const rel = path.relative(DIST, hit.file);
  return files.has(rel) ? { rel, rest } : null;
}
const relFrom = (dir, rel) => { const r = path.relative(dir, rel) || path.basename(rel); return r.startsWith('.') ? r : r; };

function rewriteHtml(f, text) {
  const fileDir = path.dirname(f);
  let baseDir = fileDir;
  const baseM = text.match(/<base\s+href=["']([^"']*)["'][^>]*>/i);
  if (baseM && baseM[1].startsWith('/')) baseDir = baseM[1].replace(/^\/+|\/+$/g, '') || '.';
  const toRoot = (path.relative(baseDir, '.') || '.') + '/';
  const baseHref = (path.relative(fileDir, baseDir) || '.') + '/';
  text = text.replace(/<base\s+href=["'][^"']*["'][^>]*>/i, '');
  // Attribute values: root paths and our hosts become paths relative to the page's base.
  text = text.replace(/\b(src|href|poster|data-src)=(["'])([^"']+)\2/gi, (all, a, q, u) => {
    const t = target(u);
    if (!t) return all;
    return `${a}=${q}${relFrom(baseDir, t.rel)}${t.rest}${q}`;
  });
  text = text.replace(/url\(\s*(['"]?)(\/[^'")]+)\1\s*\)/g, (all, q, u) => { const t = target(u); return t ? `url(${q}${relFrom(baseDir, t.rel)}${t.rest}${q})` : all; });
  // Module specifiers that start with "/" resolve through the import map to the mirror's root.
  let hasMap = false;
  text = text.replace(/<script type=["']importmap["']>([\s\S]*?)<\/script>/i, (all, body) => {
    hasMap = true;
    let map = {};
    try { map = JSON.parse(body); } catch { return all; }
    map.imports = map.imports || {};
    for (const [k, v] of Object.entries(map.imports)) if (typeof v === 'string' && v.startsWith('/')) map.imports[k] = toRoot + v.slice(1);
    map.imports['/'] = toRoot;
    return `<script type="importmap">${JSON.stringify(map)}</script>`;
  });
  const head = `<base href="${baseHref}"><script src="${toRoot}_mirror/shim.js" data-root="${toRoot}"></script>` + (hasMap || !/type=["']module["']/.test(text) ? '' : `<script type="importmap">${JSON.stringify({ imports: { '/': toRoot } })}</script>`);
  if (/<head[^>]*>/i.test(text)) text = text.replace(/<head[^>]*>/i, (h) => h + head);
  else text = text.replace(/<html[^>]*>/i, (h) => h + '<head>' + head + '</head>');
  if (!/^\s*<!doctype/i.test(text)) text = '<!doctype html>\n' + text;
  return text;
}
function rewriteCss(f, text) {
  return text.replace(/url\(\s*(['"]?)(\/[^'")]+)\1\s*\)/g, (all, q, u) => { const t = target(u); return t ? `url(${q}${relFrom(path.dirname(f), t.rel)}${t.rest}${q})` : all; });
}

// ---- write ----
fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, '_mirror/packs'), { recursive: true });
const loose = [];
const packed = [];
for (const f of [...files].sort()) (isLoose(f) ? loose : packed).push(f);
for (const f of loose) {
  const src = path.join(DIST, f);
  const dst = path.join(SITE, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const ext = path.extname(f).toLowerCase();
  if (ext === '.html') fs.writeFileSync(dst, rewriteHtml(f, fs.readFileSync(src, 'utf8')));
  else if (ext === '.css') fs.writeFileSync(dst, rewriteCss(f, fs.readFileSync(src, 'utf8')));
  else fs.copyFileSync(src, dst);
}

// Packs: grouped by folder so a screen pulls only what it needs; named by content so unchanged packs aren't re-sent.
const groups = new Map();
for (const f of packed) {
  const key = f.split('/').slice(0, f.startsWith('simulations/') || f.startsWith('models/') ? 2 : 1).join('/');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}
const index = {};
for (const [key, list] of [...groups].sort()) {
  let chunk = [], size = 0;
  const flush = () => {
    if (!chunk.length) return;
    const bufs = chunk.map((f) => fs.readFileSync(path.join(DIST, f)));
    const all = Buffer.concat(bufs);
    const id = key.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) + '-' + crypto.createHash('sha1').update(all).digest('hex').slice(0, 10) + '.wasm';
    let off = 0;
    chunk.forEach((f, i) => { index[f] = [id, off, bufs[i].length, TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream']; off += bufs[i].length; });
    fs.writeFileSync(path.join(SITE, '_mirror/packs', id), all);
    chunk = []; size = 0;
  };
  for (const f of list) {
    const n = fs.statSync(path.join(DIST, f)).size;
    if (size && size + n > PACK_BYTES) flush();
    chunk.push(f); size += n;
  }
  flush();
}

// Vercel rewrites, compiled to regex for the shim's link and fetch routing.
const vercel = JSON.parse(fs.readFileSync(path.join(DIST, 'vercel.json'), 'utf8'));
const rewrites = [];
for (const r of [...(vercel.rewrites || []), ...(vercel.redirects || [])]) {
  if (r.has || r.missing || /^https?:/.test(r.destination)) continue;
  let i = 0;
  const names = {};
  const re = '^' + r.source.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)(\*)?/g, (_, k, star) => { names[k] = ++i; return star ? '(.*)' : '([^/]+)'; }) + '$';
  rewrites.push([re, r.destination.replace(/:(\w+)\*?/g, (_, k) => '$' + names[k])]);
}

const build = { sha, built: new Date().toISOString() };
fs.writeFileSync(path.join(SITE, '_mirror/index.json'), JSON.stringify({ build, loose, packed: index, rewrites, screens: SCREENS.map(({ id, label, route, icon }) => ({ id, label, route, icon })) }));
fs.copyFileSync(path.join(here, 'runtime/shim.js'), path.join(SITE, '_mirror/shim.js'));
const shell = fs.readFileSync(path.join(here, 'runtime/shell.html'), 'utf8')
  .replace('/*SCREENS*/[]', JSON.stringify(SCREENS.map(({ id, label, route, icon }) => ({ id, label, route, icon }))))
  .replace('/*BUILD*/{}', JSON.stringify(build));
fs.writeFileSync(path.join(SITE, 'index.html'), shell);

// files.json: every published path with its hash and size, for publish-plan.mjs.
const out = {};
const list = (d) => fs.readdirSync(path.join(SITE, d), { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return list(p);
  const b = fs.readFileSync(path.join(SITE, p));
  out[p] = { hash: crypto.createHash('sha1').update(b).digest('hex'), bytes: b.length };
});
list('.');
fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify({ build, files: out }, null, 1));
const total = Object.values(out).reduce((a, b) => a + b.bytes, 0);
console.log(`mirror of ${sha.slice(0, 7)}: ${Object.keys(out).length} files (${loose.length} loose, ${new Set(Object.values(index).map((v) => v[0])).size} packs holding ${packed.length}), ${(total / 1e6).toFixed(1)} MB`);

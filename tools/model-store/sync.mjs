#!/usr/bin/env node
// Model store sync: puts every model asset in the repo into Cloudflare R2 and catalogues it.
//
//   node sync.mjs --tree live=../live --tree main=../main      upload + catalogue
//   node sync.mjs --tree live=. --dry-run                       show what would happen, no credentials needed
//
// For each GLB/glTF it stores the model, its provenance record and the image it was made to match,
// keyed by content hash (models/blobs/...), so unchanged files are skipped on later runs.
// Rows go to Postgres (table model_assets) when POSTGRES_URL is set. The same rows are published
// to R2 as models/catalog.json (curated /models list), models/catalog-all.json and models/paths.json
// (site path -> R2 URL, read by the game's loader).
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL, POSTGRES_URL (optional)
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { SITE_ROOT, MODEL_EXT, IMAGE_EXT, mimeType, blobKey, sidecarsFor, modelRow, publicCatalog, pathMap } from './catalog.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const trees = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--tree') { const [name, dir] = args[++i].split('='); trees.push({ name, dir: path.resolve(dir) }); }
if (!trees.length) trees.push({ name: 'local', dir: process.cwd() });

const env = process.env;
const PUBLIC_BASE = (env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const need = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'].filter(k => !env[k]);
if (!DRY && need.length) {
  console.error(`Missing ${need.join(', ')}. Add them as GitHub Actions secrets on evanrobinson2/abbiesworld_ios (see tools/model-store/README.md).`);
  process.exit(2);
}

// ---- 1. Gather files from every tree. A later tree wins for the same path (list live last).
const files = new Map(); // repoPath -> {abs, tree}
for (const t of trees) {
  const listed = execFileSync('git', ['-C', t.dir, 'ls-files', '-z'], { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  for (const p of listed) files.set(p, { abs: path.join(t.dir, p), tree: t.name });
}
const names = new Set(files.keys());
const ext = p => path.extname(p).toLowerCase();

// Curated /models entries carry scores and notes; their URLs are site-relative files.
const pages = new Map(); // repoPath of glb -> page entry
const manifestPath = `${SITE_ROOT}/models/manifest.json`;
if (files.has(manifestPath)) {
  for (const m of JSON.parse(readFileSync(files.get(manifestPath).abs, 'utf8')).models || []) {
    if (m.urls?.glb?.startsWith('/')) pages.set(SITE_ROOT + m.urls.glb, m);
  }
}

const models = [...names].filter(p => MODEL_EXT.has(ext(p)) && !p.includes('/node_modules/'));
const looseImages = [...names].filter(p => p.startsWith('tools/midjourney/') && IMAGE_EXT.has(ext(p)));

// ---- 2. Hash + upload.
let s3, S3;
if (!DRY) {
  S3 = await import('@aws-sdk/client-s3');
  s3 = new S3.S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}
const uploaded = new Map(); // repoPath -> {url, sha256, bytes, key, repoPath}
const stats = { stored: 0, skipped: 0, bytes: 0 };

async function exists(key) {
  try { await s3.send(new S3.HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key })); return true; }
  catch (e) { if (e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound') return false; throw e; }
}

async function store(repoPath, keyOverride) {
  if (uploaded.has(repoPath)) return uploaded.get(repoPath);
  const f = files.get(repoPath);
  if (!f) return null;
  const body = readFileSync(f.abs);
  const sha256 = createHash('sha256').update(body).digest('hex');
  const key = keyOverride || blobKey(sha256, repoPath);
  const rec = { repoPath, sha256, bytes: body.length, key, url: `${PUBLIC_BASE || 'https://r2.invalid'}/${key}` };
  uploaded.set(repoPath, rec);
  if (DRY) return rec;
  if (await exists(key)) { stats.skipped++; return rec; }
  await s3.send(new S3.PutObjectCommand({
    Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: mimeType(repoPath),
    CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256, 'source-path': repoPath.slice(0, 900) },
  }));
  stats.stored++; stats.bytes += body.length;
  return rec;
}

// A .gltf points at sibling files by relative URI; keep that layout under one folder.
async function storeGltf(repoPath) {
  const f = files.get(repoPath), doc = JSON.parse(readFileSync(f.abs, 'utf8'));
  const sha = createHash('sha256').update(readFileSync(f.abs)).digest('hex');
  const prefix = `models/gltf/${sha}`;
  for (const ref of [...(doc.buffers || []), ...(doc.images || [])]) {
    if (!ref.uri || ref.uri.startsWith('data:')) continue;
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(repoPath), decodeURIComponent(ref.uri)));
    if (files.has(dep)) await store(dep, `${prefix}/${ref.uri}`);
  }
  return store(repoPath, `${prefix}/${path.posix.basename(repoPath)}`);
}

async function pool(items, n, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
      if (++done % 100 === 0) console.log(`  ${done}/${items.length}`);
    }
  }));
}

const rows = [];
console.log(`${models.length} models and ${looseImages.length} reference images across ${trees.map(t => t.name).join(', ')}${DRY ? ' (dry run)' : ''}`);
await pool(models, 8, async repoPath => {
  const model = ext(repoPath) === '.gltf' ? await storeGltf(repoPath) : await store(repoPath);
  const page = pages.get(repoPath);
  const side = sidecarsFor(repoPath, names);
  const urls = { glb: model.url };
  const site = p => (p?.startsWith('/') ? SITE_ROOT + p : null);
  const ref = site(page?.urls?.ref) || side.reference, render = site(page?.urls?.render) || side.render, overlay = site(page?.urls?.overlay);
  if (ref && files.has(ref)) urls.ref = (await store(ref)).url;
  if (render && files.has(render)) urls.render = (await store(render)).url;
  if (overlay && files.has(overlay)) urls.overlay = (await store(overlay)).url;
  let provenance = null;
  if (side.provenance) {
    urls.provenance = (await store(side.provenance)).url;
    try { const text = readFileSync(files.get(side.provenance).abs, 'utf8'); if (text.length < 65536) provenance = JSON.parse(text); } catch {}
  }
  rows.push(modelRow({ repoPath, tree: files.get(repoPath).tree, sha256: model.sha256, bytes: model.bytes, urls, provenance, page }));
});
await pool(looseImages, 8, async repoPath => {
  const img = await store(repoPath);
  rows.push({
    id: repoPath.toLowerCase().replace(/\.[a-z]+$/, '').replace(/[^a-z0-9]+/g, '-'), name: path.basename(repoPath), kind: 'reference-image',
    group: 'tools/midjourney', source_path: repoPath, site_path: null, tree: files.get(repoPath).tree, sha256: img.sha256, bytes: img.bytes,
    urls: { ref: img.url }, source_image: img.url, provenance: null, showcase: false, outline: null,
  });
});

// Ids must be unique; a path collision after slugging gets a hash suffix.
const seen = new Set();
for (const r of rows.sort((a, b) => a.source_path.localeCompare(b.source_path))) {
  if (seen.has(r.id)) r.id = `${r.id}-${r.sha256.slice(0, 6)}`;
  seen.add(r.id);
}

// ---- 3. Catalogue: Postgres rows, then the published JSON in R2.
// R2 is what the site reads, so a database failure warns and the catalogue still publishes.
if (!DRY && env.POSTGRES_URL) try {
  const { default: pg } = await import('pg');
  const db = new pg.Client({ connectionString: env.POSTGRES_URL.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, ''), ssl: /localhost|127\.0\.0\.1/.test(env.POSTGRES_URL) ? false : { rejectUnauthorized: false } });
  await db.connect();
  await db.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  for (const r of rows) {
    await db.query(
      `insert into model_assets (id, name, kind, group_name, status, match_score, source_path, site_path, tree, sha256, bytes,
         glb_url, ref_url, render_url, overlay_url, provenance_url, source_image, showcase, provenance, page, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now())
       on conflict (id) do update set name=excluded.name, kind=excluded.kind, group_name=excluded.group_name, status=excluded.status,
         match_score=excluded.match_score, source_path=excluded.source_path, site_path=excluded.site_path, tree=excluded.tree,
         sha256=excluded.sha256, bytes=excluded.bytes, glb_url=excluded.glb_url, ref_url=excluded.ref_url, render_url=excluded.render_url,
         overlay_url=excluded.overlay_url, provenance_url=excluded.provenance_url, source_image=excluded.source_image,
         showcase=excluded.showcase, provenance=excluded.provenance, page=excluded.page, updated_at=now()`,
      [r.id, r.name, r.kind, r.group, r.status, r.outline, r.source_path, r.site_path, r.tree, r.sha256, r.bytes,
       r.urls.glb || null, r.urls.ref || null, r.urls.render || null, r.urls.overlay || null, r.urls.provenance || null,
       r.source_image, r.showcase, r.provenance, r]);
  }
  await db.end();
  console.log(`Postgres: ${rows.length} rows upserted into model_assets`);
} catch (err) {
  console.log(`::warning::Postgres skipped (${err.message}). Check the POSTGRES_URL secret; the catalogue is still published to R2`);
} else if (!DRY) console.log('POSTGRES_URL not set: skipped the database, catalogue published to R2 only');

const outputs = {
  'models/catalog.json': publicCatalog(rows),
  'models/catalog-all.json': publicCatalog(rows, { all: true }),
  'models/paths.json': { version: 1, updated: new Date().toISOString(), base: PUBLIC_BASE, paths: pathMap([...uploaded.values()]) },
};
if (DRY) {
  const kinds = {};
  for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  const unique = new Set([...uploaded.values()].map(u => u.sha256));
  const bytes = [...new Map([...uploaded.values()].map(u => [u.sha256, u.bytes])).values()].reduce((a, b) => a + b, 0);
  console.log(JSON.stringify({ rows: rows.length, kinds, files: uploaded.size, uniqueBlobs: unique.size, uniqueMB: +(bytes / 1e6).toFixed(1),
    showcase: outputs['models/catalog.json'].count, gamePaths: Object.keys(outputs['models/paths.json'].paths).length,
    withReference: rows.filter(r => r.urls.ref).length, withProvenance: rows.filter(r => r.urls.provenance).length }, null, 1));
  process.exit(0);
}
for (const [key, doc] of Object.entries(outputs)) {
  await s3.send(new S3.PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: JSON.stringify(doc), ContentType: 'application/json', CacheControl: 'public, max-age=60' }));
}

// Browsers load GLBs straight from R2 on pages that don't go through the site's /r2 proxy.
try {
  await s3.send(new S3.PutBucketCorsCommand({ Bucket: env.R2_BUCKET, CORSConfiguration: { CORSRules: [{
    AllowedOrigins: ['https://abbies-ranch-atelier.vercel.app', 'https://abbies-ranch-atelier-evan-8467.vercel.app', 'https://ranch-atelier-cloud-preview.vercel.app', 'https://*.vercel.app', 'https://claude.ai', 'https://*.claude.ai', 'https://*.claudeusercontent.com'],
    AllowedMethods: ['GET', 'HEAD'], AllowedHeaders: ['*', 'Range'], ExposeHeaders: ['Content-Length', 'Content-Range', 'ETag'], MaxAgeSeconds: 86400 }] } }));
  console.log('CORS set on the bucket');
} catch (e) { console.log(`CORS not changed (${e.name}: the R2 token may lack bucket-admin rights; the site's /r2 proxy still works)`); }

console.log(`R2: ${stats.stored} files stored (${(stats.bytes / 1e6).toFixed(1)} MB), ${stats.skipped} already there`);
console.log(`Catalogue: ${rows.length} rows, ${outputs['models/catalog.json'].count} on /models, ${Object.keys(outputs['models/paths.json'].paths).length} game paths`);

// The site proxies /r2/* to the bucket's public URL; check it's the same bucket we just wrote.
const check = await fetch(`${PUBLIC_BASE}/models/paths.json`, { cache: 'no-store' });
if (!check.ok) { console.error(`Public read of ${'models/paths.json'} failed with HTTP ${check.status}. Is public access (r2.dev or a custom domain) on for this bucket?`); process.exit(1); }
const site = env.SITE_R2_BASE;
if (site && site.replace(/\/+$/, '') !== PUBLIC_BASE) {
  const viaSite = await fetch(`${site.replace(/\/+$/, '')}/models/paths.json`).catch(() => null);
  if (!viaSite?.ok) console.log(`::warning::The site proxies /r2 to ${site}, which doesn't serve this bucket. Update the /r2 rewrite in prototypes/ranch-atelier/dist/vercel.json.`);
}
console.log('Public read OK');

#!/usr/bin/env node
// Put built sounds (out/rows.json + out/*.mp3, from build.mjs) into Cloudflare R2 and the sound_assets table,
// publish sounds/catalog.json for /api/sounds, and write the site's bundled list (dist/sounds/manifest.json).
//   node store.mjs [--out out] [--manifest-only]
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL, POSTGRES_URL (optional).
// Without R2 credentials (or with --manifest-only) only the manifest is written: every sound is listed with its
// measurements and waveform, marked as not stored yet. Audio is never written into the repo.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { blobKey, publicCatalog } from './catalog.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const here = new URL('./', import.meta.url);
const OUT = path.resolve(opt('--out') || new URL('out', here).pathname);
const MANIFEST = new URL('../../prototypes/ranch-atelier/dist/sounds/manifest.json', here);
const SITE_R2 = (process.env.SITE_R2_BASE || 'https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev').replace(/\/+$/, '');
const env = process.env, PUBLIC_BASE = (env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
const live = !args.includes('--manifest-only') && ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL'].every(k => env[k]);

const built = JSON.parse(readFileSync(path.join(OUT, 'rows.json'), 'utf8'));
const rows = built.map(b => b.row);

if (live) {
  const S3 = await import('@aws-sdk/client-s3');
  const s3 = new S3.S3Client({ region: 'auto', endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
  let stored = 0, skipped = 0, bytes = 0, i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < built.length) {
      const b = built[i++], key = blobKey(b.row.sha256, b.file);
      try { await s3.send(new S3.HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key })); skipped++; }
      catch {
        const body = readFileSync(path.join(OUT, b.file));
        await s3.send(new S3.PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256: b.row.sha256, slot: b.row.slot } }));
        stored++; bytes += body.length;
      }
      b.row.urls = { audio: `${PUBLIC_BASE}/${key}` };
      b.row.status = 'stored';
    }
  }));
  console.log(`R2: ${stored} sounds stored (${(bytes / 1e6).toFixed(1)} MB), ${skipped} already there`);
  if (env.POSTGRES_URL) {
    const { default: pg } = await import('pg');
    const db = new pg.Client({ connectionString: env.POSTGRES_URL, ssl: /localhost|127\.0\.0\.1/.test(env.POSTGRES_URL) ? false : { rejectUnauthorized: false } });
    await db.connect();
    await db.query(readFileSync(new URL('schema.sql', here), 'utf8'));
    for (const r of rows) {
      await db.query(`insert into sound_assets (id, slot, name, kind, group_name, loop, audio_url, duration, loudness, peak, channels, sha256, bytes, source_path, source_part, license, uses, provenance, page, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now())
        on conflict (id) do update set slot=excluded.slot, name=excluded.name, kind=excluded.kind, group_name=excluded.group_name, loop=excluded.loop,
          audio_url=excluded.audio_url, duration=excluded.duration, loudness=excluded.loudness, peak=excluded.peak, channels=excluded.channels,
          sha256=excluded.sha256, bytes=excluded.bytes, source_path=excluded.source_path, source_part=excluded.source_part, license=excluded.license,
          uses=excluded.uses, provenance=excluded.provenance, page=excluded.page, updated_at=now()`,
        [r.id, r.slot, r.name, r.kind, r.group, r.loop, r.urls.audio || null, r.duration, r.loudness, r.peak, r.channels, r.sha256, r.bytes,
         r.source.path, r.source.part, r.license, r.uses, { source: r.source, recipe: r.recipe, candidates: r.candidates, notes: r.notes }, r]);
    }
    await db.end();
    console.log(`Postgres: ${rows.length} rows upserted into sound_assets`);
  } else console.log('POSTGRES_URL not set: skipped the database, catalogue published to R2 only');
  await s3.send(new S3.PutObjectCommand({ Bucket: env.R2_BUCKET, Key: 'sounds/catalog.json', Body: JSON.stringify(publicCatalog(rows)), ContentType: 'application/json', CacheControl: 'public, max-age=60' }));
  const check = await fetch(`${PUBLIC_BASE}/sounds/catalog.json`, { cache: 'no-store' });
  console.log(`Public read of sounds/catalog.json: HTTP ${check.status}`);
  if (!check.ok) process.exit(1);
} else console.log('No R2 credentials: writing the manifest only (sounds listed, not playable until stored)');

// The site's bundled list: same records, R2 URLs through the site's /r2 proxy, waveform kept short.
const site = u => typeof u === 'string' && PUBLIC_BASE && u.startsWith(PUBLIC_BASE + '/') ? '/r2/' + u.slice(PUBLIC_BASE.length + 1) : u;
const short = p => Array.isArray(p) ? p.filter((_, i) => i % 2 === 0).map(v => +v.toFixed(2)) : p;
const old = (() => { try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return { sounds: [] }; } })();
const keep = (old.sounds || []).filter(s => s.status === 'bundled'); // sounds the site ships itself (e.g. the jukebox track)
const sounds = [...keep, ...publicCatalog(rows).sounds.map(r => ({ ...r, status: r.urls?.audio ? 'stored' : 'picked', urls: r.urls?.audio ? { audio: site(r.urls.audio) } : {}, peaks: short(r.peaks), candidates: r.candidates.slice(0, 4) }))];
writeFileSync(MANIFEST, JSON.stringify({ version: 1, updated: new Date().toISOString().slice(0, 10), r2: SITE_R2, count: sounds.length, sounds }) + '\n');
console.log(`manifest: ${sounds.length} sounds (${sounds.filter(s => s.urls?.audio).length} playable)`);

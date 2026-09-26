#!/usr/bin/env node
/**
 * Pull Media Drop inbox sidecars (Abbie's World server) into the local asset library.
 *
 *   ABBIES_WORLD_SERVER_URL=http://abbies.world:8000 \
 *   ABBIES_WORLD_SERVER_API_KEY=... \
 *   node tools/dev-asset-library/pull_inbox.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const LIBRARY_PATH = join(ROOT, 'data/dev-asset-library/library.json');
const MIRROR = join(ROOT, 'AssetSources/MediaInbox');
const ASSET_TYPE = 'media-inbox';

function baseUrl() {
  return (process.env.ABBIES_WORLD_SERVER_URL || 'http://abbies.world:8000').replace(
    /\/$/,
    ''
  );
}

function authHeaders() {
  const key = process.env.ABBIES_WORLD_SERVER_API_KEY;
  if (!key) throw new Error('Set ABBIES_WORLD_SERVER_API_KEY');
  return { Authorization: `Bearer ${key}` };
}

async function main() {
  const listedRes = await fetch(`${baseUrl()}/api/assets/${ASSET_TYPE}`, {
    headers: authHeaders(),
  });
  if (listedRes.status === 404) {
    console.log('No media-inbox assets yet.');
    return;
  }
  if (!listedRes.ok) {
    throw new Error(`list failed: ${listedRes.status}`);
  }
  const listed = await listedRes.json();
  const assets = listed.assets || [];
  const metas = assets.filter((a) => String(a.name || '').endsWith('.meta.json'));
  mkdirSync(MIRROR, { recursive: true });

  const library = existsSync(LIBRARY_PATH)
    ? JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'))
    : { version: 1, cdn: { provider: 'r2' }, assets: [] };
  const byId = new Map(library.assets.map((a) => [a.id, a]));
  let added = 0;

  for (const meta of metas) {
    const metaUrl = `${baseUrl()}/static/assets/${ASSET_TYPE}/${meta.name}`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) continue;
    const record = await metaRes.json();
    const assetName = record.blob?.assetName || String(meta.name).replace(/\.meta\.json$/, '');
    const mediaUrl =
      record.blob?.remoteUrl ||
      `${baseUrl()}/static/assets/${ASSET_TYPE}/${assetName}`;

    const mediaRes = await fetch(mediaUrl);
    if (!mediaRes.ok) continue;
    const bytes = Buffer.from(await mediaRes.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex');
    const localName = `${hash.slice(0, 12)}-${record.filename || assetName || 'drop.bin'}`;
    const localPath = join(MIRROR, localName);
    if (!existsSync(localPath)) writeFileSync(localPath, bytes);

    const id = record.id || `inbox:${hash.slice(0, 16)}`;
    byId.set(id, {
      id,
      semanticId: null,
      name: record.filename || id,
      kind: record.kind === 'image' ? 'sceneArt' : 'reference',
      family: record.family || 'mediaInbox',
      tags: [...(record.tags || []), 'media-drop'],
      status: 'draft',
      sourcePath: relative(ROOT, localPath),
      contentHash: hash,
      uploadedAt: record.uploadedAt || null,
      sourceUrl: record.sourceUrl || null,
    });
    added += 1;
  }

  library.assets = [...byId.values()];
  writeFileSync(LIBRARY_PATH, JSON.stringify(library, null, 2) + '\n');
  console.log(`Mirrored ${added} inbox item(s) → ${relative(ROOT, MIRROR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

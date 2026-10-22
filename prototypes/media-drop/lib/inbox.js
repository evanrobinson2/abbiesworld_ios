/**
 * Media Drop inbox backed by Abbie's World server assets.
 * Uploads land under asset type `media-inbox` via POST /api/assets/upload.
 */

const ASSET_TYPE = 'media-inbox';

export function classifyMedia(filename = '', contentType = '', sourceUrl = '') {
  const name = `${filename} ${sourceUrl}`.toLowerCase();
  const type = (contentType || '').toLowerCase();

  if (
    type.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i.test(name) ||
    /suno\.com|cdn\.suno|cdn1\.suno/i.test(name)
  ) {
    return { kind: 'audio', family: 'suno', tags: ['inbox', 'suno', 'song'] };
  }
  if (
    type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|heic|heif)(\?|$)/i.test(name) ||
    /midjourney|cdn\.midjourney|discordapp|discord\.com/i.test(name)
  ) {
    const midjourney = /midjourney|cdn\.midjourney/i.test(name);
    return {
      kind: 'image',
      family: midjourney ? 'midjourney' : 'drop',
      tags: ['inbox', midjourney ? 'midjourney' : 'image'],
    };
  }
  if (type.startsWith('video/') || /\.(mp4|mov|webm)(\?|$)/i.test(name)) {
    return { kind: 'video', family: 'drop', tags: ['inbox', 'video'] };
  }
  return { kind: 'file', family: 'drop', tags: ['inbox'] };
}

export function serverConfigured() {
  return Boolean(
    process.env.ABBIES_WORLD_SERVER_URL && process.env.ABBIES_WORLD_SERVER_API_KEY
  );
}

export function serverBaseUrl() {
  const raw = (process.env.ABBIES_WORLD_SERVER_URL || 'http://abbies.world:8000').trim();
  return raw.replace(/\/$/, '');
}

function authHeaders(extra = {}) {
  const key = process.env.ABBIES_WORLD_SERVER_API_KEY;
  if (!key) throw new Error('ABBIES_WORLD_SERVER_API_KEY is not set');
  return {
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

function absoluteAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${serverBaseUrl()}${path}`;
}

function publicProxyUrl(assetName) {
  return `/api/blob?name=${encodeURIComponent(assetName)}`;
}

function safeFilename(filename) {
  const stampSafe = new Date().toISOString().replace(/[:.]/g, '-');
  const base =
    (filename || 'drop.bin')
      .replace(/[^\w.\-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100) || 'drop.bin';
  return `${stampSafe}-${base}`;
}

async function uploadAssetBytes({ bytes, filename, contentType, force = true }) {
  const form = new FormData();
  form.append('asset_type', ASSET_TYPE);
  form.append('force', force ? 'true' : 'false');
  form.append(
    'file',
    new Blob([bytes], { type: contentType || 'application/octet-stream' }),
    filename
  );

  const res = await fetch(`${serverBaseUrl()}/api/assets/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.message || body?.error || `upload_http_${res.status}`;
    throw new Error(detail);
  }
  return body;
}

export async function putInboxBlob({
  bytes,
  filename,
  contentType,
  email,
  sourceUrl = null,
  note = null,
}) {
  if (!serverConfigured()) {
    throw new Error('Abbie\'s World server is not configured');
  }

  const safeName = safeFilename(filename);
  const classification = classifyMedia(safeName, contentType, sourceUrl || '');

  const uploaded = await uploadAssetBytes({
    bytes,
    filename: safeName,
    contentType: contentType || 'application/octet-stream',
    force: true,
  });

  const assetName = uploaded.asset_name || safeName;
  const remoteUrl =
    absoluteAssetUrl(uploaded.url) ||
    absoluteAssetUrl(`/static/assets/${ASSET_TYPE}/${assetName}`);

  const record = {
    id: `inbox:${ASSET_TYPE}/${assetName}`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: email,
    filename: assetName,
    contentType: contentType || 'application/octet-stream',
    size: bytes.byteLength,
    sourceUrl,
    note,
    kind: classification.kind,
    family: classification.family,
    tags: classification.tags,
    blob: {
      url: publicProxyUrl(assetName),
      downloadUrl: publicProxyUrl(assetName),
      pathname: `${ASSET_TYPE}/${assetName}`,
      remoteUrl,
      assetType: ASSET_TYPE,
      assetName,
    },
  };

  const metaName = `${assetName}.meta.json`;
  await uploadAssetBytes({
    bytes: Buffer.from(JSON.stringify(record, null, 2), 'utf8'),
    filename: metaName,
    contentType: 'application/json',
    force: true,
  });

  return record;
}

async function fetchMetaRecord(assetName) {
  const url = absoluteAssetUrl(`/static/assets/${ASSET_TYPE}/${assetName}`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    // Static may be open; retry without auth
    const open = await fetch(url);
    if (!open.ok) return null;
    return open.json();
  }
  return res.json();
}

export async function listInbox(limit = 40) {
  if (!serverConfigured()) return [];

  const res = await fetch(`${serverBaseUrl()}/api/assets/${ASSET_TYPE}`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`list_inbox_failed_${res.status}`);
  }

  const body = await res.json();
  const assets = Array.isArray(body?.assets) ? body.assets : [];
  const metas = assets.filter((a) => String(a.name || '').endsWith('.meta.json'));

  const records = [];
  for (const meta of metas.slice(0, limit)) {
    try {
      const record = await fetchMetaRecord(meta.name);
      if (!record) continue;
      if (record.blob?.assetName) {
        record.blob.url = publicProxyUrl(record.blob.assetName);
        record.blob.downloadUrl = publicProxyUrl(record.blob.assetName);
      } else if (record.blob?.pathname) {
        const name = String(record.blob.pathname).split('/').pop();
        if (name) {
          record.blob.url = publicProxyUrl(name);
          record.blob.downloadUrl = publicProxyUrl(name);
        }
      }
      records.push(record);
    } catch {
      // skip broken sidecars
    }
  }

  records.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  return records.slice(0, limit);
}

export async function fetchInboxAsset(assetName) {
  if (
    !assetName ||
    assetName.includes('..') ||
    assetName.includes('/') ||
    assetName.endsWith('.meta.json')
  ) {
    return null;
  }

  const url = absoluteAssetUrl(`/static/assets/${ASSET_TYPE}/${assetName}`);
  let upstream = await fetch(url, { headers: authHeaders() });
  if (!upstream.ok) {
    upstream = await fetch(url);
  }
  if (!upstream.ok) return null;
  return upstream;
}

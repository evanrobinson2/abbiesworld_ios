/**
 * Game Asset Registry client for MCP asset ingest.
 * Staging Midjourney/CDN URLs are intake only — bytes are re-hosted under
 * game `abbies-world-2` so the iPad never depends on a third-party CDN.
 */
import { registryKeyToSemantic, semanticToRegistryKey } from "./steel-rail.js";

const GAME_KEY = "abbies-world-2";

function origin() {
  return (
    process.env.ABBIES_SERVER_URL ||
    process.env.ABBIES_WORLD_ORIGIN ||
    "http://abbies.world:8000"
  ).replace(/\/$/, "");
}

function adminKey() {
  return String(process.env.ASSET_REGISTRY_ADMIN_API_KEY || "").trim();
}

/** Read API key for GET current revision (admin key is write-only on this server). */
function readKey() {
  return String(process.env.ABBIES_WORLD_API_KEY || process.env.API_KEY || "").trim();
}

function actorId() {
  return String(process.env.ASSET_REGISTRY_ACTOR_ID || "studio-mcp").trim();
}

function filenameFor(registryKey, contentType, sourceUrl) {
  const leaf = String(registryKey || "asset")
    .split("/")
    .filter(Boolean)
    .pop() || "asset";
  const safe = leaf.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  let ext = "png";
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
  else if (ct.includes("webp")) ext = "webp";
  else if (ct.includes("gif")) ext = "gif";
  else {
    try {
      const path = new URL(sourceUrl).pathname.toLowerCase();
      if (path.endsWith(".jpg") || path.endsWith(".jpeg")) ext = "jpg";
      else if (path.endsWith(".webp")) ext = "webp";
      else if (path.endsWith(".gif")) ext = "gif";
      else if (path.endsWith(".png")) ext = "png";
    } catch {
      /* keep png */
    }
  }
  return `${safe}.${ext}`;
}

async function currentRevision(registryKey) {
  const key = readKey() || adminKey();
  if (!key) return { revision: 0 };
  const encoded = registryKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const response = await fetch(
    `${origin()}/api/v1/games/${encodeURIComponent(GAME_KEY)}/assets/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    }
  );
  if (response.status === 404) return { revision: 0 };
  if (response.status === 401 || response.status === 403) {
    // Without a read key, assume create; PUT will 409 if the asset exists.
    return { revision: 0, warning: "registry_read_unauthorized" };
  }
  if (!response.ok) {
    const text = await response.text();
    return {
      error: "registry_read_failed",
      status: response.status,
      detail: text.slice(0, 240),
    };
  }
  const body = await response.json();
  const revision = Number(body?.revision);
  return { revision: Number.isFinite(revision) && revision > 0 ? revision : 0 };
}

/**
 * Ensure the World 2 game row exists (idempotent PUT).
 */
export async function ensureGameRegistered() {
  const key = adminKey();
  if (!key) return { error: "registry_admin_missing" };
  const response = await fetch(
    `${origin()}/api/v1/games/${encodeURIComponent(GAME_KEY)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Actor-ID": actorId(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: "Abbie's World 2",
        metadata: {
          team: "world-2",
          minimumClientVersion: "1.0",
          assetPolicy: "server-hosted-semantic-ids",
        },
      }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    return {
      error: "game_register_failed",
      status: response.status,
      detail: text.slice(0, 240),
    };
  }
  return { ok: true, gameKey: GAME_KEY };
}

/**
 * Re-host raw image bytes on the Game Asset registry (OpenAI Images, MJ download, etc.).
 * Returns semantic/registry identifiers — never leave third-party URLs as SoT.
 */
export async function ingestBytes({
  bytes,
  contentType = "image/png",
  semanticId,
  registryKey,
  kind,
  brief,
  source = "studio-mcp",
  stagingSourceHost = "bytes",
} = {}) {
  const key = adminKey();
  if (!key) {
    return {
      error: "registry_admin_missing",
      hint: "Set ASSET_REGISTRY_ADMIN_API_KEY on studio-mock (Vercel).",
    };
  }
  const sem = String(semanticId || "").trim();
  const regKey = String(registryKey || "").trim();
  if (!sem || !regKey) {
    return { error: "semantic_or_registry_missing" };
  }
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (!buf.length || buf.length > 25 * 1024 * 1024) {
    return { error: "staging_bytes_invalid", size: buf.length };
  }
  const ct = String(contentType || "image/png").split(";")[0].trim() || "image/png";
  if (!ct.toLowerCase().startsWith("image/")) {
    return { error: "staging_not_image", contentType: ct };
  }

  const ensured = await ensureGameRegistered();
  if (ensured.error) return ensured;

  const revInfo = await currentRevision(regKey);
  if (revInfo.error) return revInfo;
  let expectedRevision = revInfo.revision;

  const filename = filenameFor(regKey, ct, `https://${stagingSourceHost}/asset`);

  async function putOnce(expected) {
    const form = new FormData();
    form.append("file", new Blob([buf], { type: ct }), filename);
    form.append(
      "metadata",
      JSON.stringify({
        role: kind || "world-plate",
        semanticId: sem,
        brief: String(brief || "").slice(0, 500),
        ingestedFrom: source,
        stagingSourceHost,
      })
    );
    form.append("expectedRevision", String(expected));

    const encoded = regKey
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const put = await fetch(
      `${origin()}/api/v1/games/${encodeURIComponent(GAME_KEY)}/assets/${encoded}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Actor-ID": actorId(),
          Accept: "application/json",
        },
        body: form,
      }
    );
    const text = await put.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 240) };
    }
    return { put, body };
  }

  let { put, body } = await putOnce(expectedRevision);
  if (put.status === 409) {
    const again = await currentRevision(regKey);
    if (!again.error && typeof again.revision === "number") {
      expectedRevision = again.revision;
      ({ put, body } = await putOnce(expectedRevision));
    }
  }
  if (!put.ok) {
    return {
      error: "registry_ingest_failed",
      status: put.status,
      detail: body,
    };
  }

  const deliveryURL = body?.deliveryURL
    ? body.deliveryURL.startsWith("/")
      ? `${origin()}${body.deliveryURL}`
      : body.deliveryURL
    : null;

  return {
    ok: true,
    gameKey: GAME_KEY,
    semanticId: sem,
    registryKey: regKey,
    revision: body?.revision,
    deliveryURL,
    mimeType: body?.mimeType || ct,
    sha256: body?.sha256 || null,
    bindWith: sem,
  };
}

/**
 * Download a temporary staging HTTPS image and re-host it on the registry.
 * Returns semantic/registry identifiers — never leave the staging URL as SoT.
 */
export async function ingestStagingUrl({
  stagingUrl,
  semanticId,
  registryKey,
  kind,
  brief,
} = {}) {
  const url = String(stagingUrl || "").trim();
  if (!/^https:\/\//i.test(url)) {
    return { error: "staging_url_required", detail: "https image URL required for intake" };
  }

  let download;
  try {
    download = await fetch(url, {
      headers: { Accept: "image/*,*/*" },
      redirect: "follow",
    });
  } catch (err) {
    return {
      error: "staging_download_failed",
      detail: String(err?.message || err).slice(0, 200),
    };
  }
  if (!download.ok) {
    return {
      error: "staging_download_failed",
      status: download.status,
    };
  }
  const contentType = download.headers.get("content-type") || "image/png";
  if (!String(contentType).toLowerCase().startsWith("image/")) {
    return {
      error: "staging_not_image",
      contentType,
    };
  }
  const bytes = Buffer.from(await download.arrayBuffer());
  let stagingSourceHost = "unknown";
  try {
    stagingSourceHost = new URL(url).host;
  } catch {
    /* keep unknown */
  }
  return ingestBytes({
    bytes,
    contentType,
    semanticId,
    registryKey,
    kind,
    brief,
    source: "studio-mcp",
    stagingSourceHost,
  });
}

export function registryConfigStatus() {
  return {
    configured: Boolean(adminKey()),
    readConfigured: Boolean(readKey()),
    gameKey: GAME_KEY,
    origin: origin(),
  };
}

function normalizeListPayload(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.assets)) return body.assets;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

function publicAssetRow(row) {
  const key = String(row?.key || row?.assetKey || row?.id || "").trim();
  if (!key) return null;
  const semanticId =
    String(row?.metadata?.semanticId || "").trim() || registryKeyToSemantic(key);
  let deliveryURL = row?.deliveryURL || null;
  if (typeof deliveryURL === "string" && deliveryURL.startsWith("/")) {
    deliveryURL = `${origin()}${deliveryURL}`;
  }
  return {
    key,
    semanticId: semanticId || null,
    revision: Number(row?.revision) || null,
    mimeType: row?.mimeType || null,
    sha256: row?.sha256 || null,
    role: row?.metadata?.role || null,
    brief: row?.metadata?.brief || null,
    metadata: row?.metadata && typeof row.metadata === "object" ? row.metadata : {},
    // Studio-proxied thumb — browser never needs LAN deliveryURL.
    thumbURL: `/api/asset-library?thumb=1&key=${encodeURIComponent(key)}`,
    deliveryURL,
    bindWith: semanticId || null,
  };
}

/**
 * List assets for the World 2 game (read API key). Used by Studio Library room.
 */
export async function listGameAssets({ prefix = "", limit = 80 } = {}) {
  const key = readKey();
  if (!key) {
    return {
      error: "registry_read_missing",
      hint: "Set ABBIES_WORLD_API_KEY on studio-mock (Vercel).",
    };
  }
  const capped = Math.min(200, Math.max(1, Number(limit) || 80));
  const params = new URLSearchParams();
  const cleanPrefix = String(prefix || "").trim().replace(/^\/+|\/+$/g, "");
  if (cleanPrefix) params.set("prefix", cleanPrefix);
  params.set("limit", String(capped));
  const url = `${origin()}/api/v1/games/${encodeURIComponent(GAME_KEY)}/assets?${params}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 240) };
  }
  if (!response.ok) {
    return {
      error: "registry_list_failed",
      status: response.status,
      detail: body,
    };
  }
  const rows = normalizeListPayload(body)
    .map(publicAssetRow)
    .filter(Boolean)
    .slice(0, capped);
  return {
    ok: true,
    gameKey: GAME_KEY,
    prefix: cleanPrefix || null,
    count: rows.length,
    assets: rows,
    config: registryConfigStatus(),
  };
}

export async function getGameAsset(registryKey) {
  const key = readKey();
  if (!key) {
    return {
      error: "registry_read_missing",
      hint: "Set ABBIES_WORLD_API_KEY on studio-mock (Vercel).",
    };
  }
  const regKey = String(registryKey || "").trim().replace(/^\/+|\/+$/g, "");
  if (!regKey || regKey.includes("..")) return { error: "registry_key_invalid" };
  const encoded = regKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const response = await fetch(
    `${origin()}/api/v1/games/${encodeURIComponent(GAME_KEY)}/assets/${encoded}`,
    {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    }
  );
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 240) };
  }
  if (response.status === 404) return { error: "asset_missing", key: regKey };
  if (!response.ok) {
    return {
      error: "registry_get_failed",
      status: response.status,
      detail: body,
    };
  }
  const row = publicAssetRow({ ...body, key: body?.key || regKey });
  return { ok: true, asset: row, config: registryConfigStatus() };
}

/** Stream hosted bytes for a registry key (Studio thumbnail / preview). */
export async function fetchGameAssetBytes(registryKey) {
  const record = await getGameAsset(registryKey);
  if (record.error) return record;
  const key = readKey();
  let delivery = record.asset?.deliveryURL || "";
  if (!delivery) return { error: "delivery_missing", key: registryKey };
  if (delivery.startsWith("/")) delivery = `${origin()}${delivery}`;
  const bytes = await fetch(delivery, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
  });
  if (!bytes.ok) {
    return {
      error: "bytes_missing",
      status: bytes.status,
      key: registryKey,
    };
  }
  return {
    ok: true,
    body: bytes.body,
    mimeType: record.asset.mimeType || bytes.headers.get("content-type") || "application/octet-stream",
    asset: record.asset,
  };
}

export { GAME_KEY, semanticToRegistryKey, registryKeyToSemantic };

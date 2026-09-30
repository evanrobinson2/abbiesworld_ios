/**
 * Game Asset Registry client for MCP asset ingest.
 * Staging Midjourney/CDN URLs are intake only — bytes are re-hosted under
 * game `abbies-world-2` so the iPad never depends on a third-party CDN.
 */
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
  const key = adminKey();
  if (!key) {
    return {
      error: "registry_admin_missing",
      hint: "Set ASSET_REGISTRY_ADMIN_API_KEY on studio-mock (Vercel).",
    };
  }
  const url = String(stagingUrl || "").trim();
  if (!/^https:\/\//i.test(url)) {
    return { error: "staging_url_required", detail: "https image URL required for intake" };
  }
  const sem = String(semanticId || "").trim();
  const regKey = String(registryKey || "").trim();
  if (!sem || !regKey) {
    return { error: "semantic_or_registry_missing" };
  }

  const ensured = await ensureGameRegistered();
  if (ensured.error) return ensured;

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
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) {
    return { error: "staging_bytes_invalid", size: bytes.length };
  }

  const revInfo = await currentRevision(regKey);
  if (revInfo.error) return revInfo;
  let expectedRevision = revInfo.revision;

  const filename = filenameFor(regKey, contentType, url);

  async function putOnce(expected) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([bytes], { type: contentType.split(";")[0].trim() || "image/png" }),
      filename
    );
    form.append(
      "metadata",
      JSON.stringify({
        role: kind || "world-plate",
        semanticId: sem,
        brief: String(brief || "").slice(0, 500),
        ingestedFrom: "studio-mcp",
        stagingSourceHost: (() => {
          try {
            return new URL(url).host;
          } catch {
            return "unknown";
          }
        })(),
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
    mimeType: body?.mimeType || contentType,
    sha256: body?.sha256 || null,
    // Explicit: world docs must use semanticId, never stagingUrl / CDN.
    bindWith: sem,
  };
}

export function registryConfigStatus() {
  return {
    configured: Boolean(adminKey()),
    gameKey: GAME_KEY,
    origin: origin(),
  };
}

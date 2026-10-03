/**
 * Web Push subscribe / VAPID public key for review.html home-screen.
 *
 * GET  /api/push           → { publicKey, configured }
 * POST /api/push           → save subscription on household world
 * POST /api/push { op: unsubscribe, endpoint }
 */
import {
  getVapidPublicKey,
  vapidConfigured,
  upsertPushSubscription,
  removePushSubscription,
  listPushSubscriptions,
} from "./lib/push.js";

const ORIGIN = (
  process.env.ABBIES_WORLD_SERVER_URL ||
  process.env.ABBIES_WORLD_ORIGIN ||
  "http://abbies.world:8000"
).replace(/\/$/, "");

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

function authFrom(request) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ") && header.length > 20) {
    const token = header.slice(7).trim();
    if (!token.includes("${") && token !== "[SENSITIVE]") return `Bearer ${token}`;
  }
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (env && env !== "[SENSITIVE]" && !env.includes("${")) return `Bearer ${env}`;
  return "";
}

async function readWorld(auth) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "bad_upstream" };
  }
  return { status: response.status, body };
}

async function writeWorld(auth, doc, expected) {
  const payload = { ...doc, expectedRevision: expected };
  delete payload.revision;
  const saved = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "PUT",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await saved.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "bad_upstream" };
  }
  return { status: saved.status, body };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET() {
  return json({
    configured: vapidConfigured(),
    publicKey: getVapidPublicKey() || null,
    hint: vapidConfigured()
      ? "POST subscription from review.html after Enable notifications"
      : "Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (+ optional VAPID_SUBJECT) on Studio",
  });
}

export async function POST(request) {
  const auth = authFrom(request);
  if (!auth) {
    return json(
      {
        error: "auth_required",
        hint: "Studio ABBIES_WORLD_TOKEN proxies household auth for the phone page.",
      },
      401
    );
  }
  if (!vapidConfigured()) {
    return json({ error: "vapid_unconfigured" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const current = await readWorld(auth);
  if (current.status !== 200) {
    return json({ error: "world_unavailable", status: current.status }, current.status === 401 ? 401 : 502);
  }

  const doc = current.body;
  const expected = doc.revision;
  const op = String(body.op || "subscribe").trim();
  const ua = request.headers.get("user-agent") || "";

  let result;
  if (op === "unsubscribe") {
    result = removePushSubscription(doc, body.endpoint || body.subscription?.endpoint);
  } else {
    result = upsertPushSubscription(doc, body.subscription || body, { userAgent: ua });
  }
  if (result.error) return json(result, 400);

  const saved = await writeWorld(auth, doc, expected);
  if (saved.status === 409) return json({ error: "revision_conflict", body: saved.body }, 409);
  if (saved.status !== 200) {
    return json({ error: "save_failed", status: saved.status, body: saved.body }, 502);
  }

  return json({
    ok: true,
    op,
    count: result.count,
    removed: result.removed,
    revision: saved.body?.revision,
    subscribers: listPushSubscriptions(saved.body).length,
  });
}

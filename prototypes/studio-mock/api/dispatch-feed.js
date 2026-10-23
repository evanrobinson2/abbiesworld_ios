/**
 * Dispatch progress feed for the Abbie's World phone app.
 *
 * GET  /api/dispatch-feed?since=ISO[&dispatch_id=D-…]  → { events, next_since, parcels, machines }
 *      parcels: each dispatch as a work parcel (stage, stages passed, latest images/models, its machine).
 *      machines: Claude sessions working on parcels, plus the Midjourney workers.
 *      Every message Claude posted on a dispatch (ack, progress, checkpoints such as concept art
 *      with images, questions, completion with links), independent of any deploy.
 * POST /api/dispatch-feed { dispatch_id, instructions } → revise(): steer a running build
 *      (delivered to the session at its next checkpoint) or answer a question.
 *
 * GET  /api/dispatch-feed?format=activity[&since=ISO] → { events (newest first, activity-centre shape), jobs, machines }
 *
 * Auth: Bearer Auth0 token (household api.abbies.world or the MCP audience), signature-checked,
 * or X-Dispatch-Feed-Key = DISPATCH_FEED_KEY for the Ranch Atelier server-side proxy.
 */
import { timingSafeEqual } from "node:crypto";
import { authorizeDispatchCaller } from "./lib/dispatch-auth.js";
import { createDispatchService, getDefaultStore } from "./lib/dispatch-service.js";
import { summarize as summarizeExecutionCapacity } from "./lib/execution-capacity-store.js";

const ORIGIN = "http://game.abbies.world:8000";

/** Midjourney pull workers (the Mac) as factory machines, from the household world. */
async function midjourneyMachines() {
  const token = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (!token) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${ORIGIN}/api/v1/worlds/current`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!res.ok) return [];
    const cap = summarizeExecutionCapacity(await res.json());
    const alive = new Set((cap.aliveWorkers || []).map((w) => w.id || w));
    return (cap.workers || []).map((w) => ({
      kind: "midjourney",
      id: w.id,
      state: alive.has(w.id) ? (w.currentJobId ? "working" : "ready") : "offline",
      current_job: w.currentJobId,
      last_seen_at: w.lastSeenAt,
      last_message: w.lastMessage,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-dispatch-feed-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors({ "Content-Type": "application/json" }) });
}

/** Server-to-server key for the Ranch Atelier app's /api/activity proxy (DISPATCH_FEED_KEY on both projects). */
function feedKeyOk(request) {
  const want = String(process.env.DISPATCH_FEED_KEY || "");
  const got = String(request.headers.get("x-dispatch-feed-key") || "");
  if (want.length < 32 || got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

async function authorize(request) {
  if (feedKeyOk(request)) return { ok: true, requester: { kind: "app-proxy", sub: "ranch-atelier" } };
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return authorizeDispatchCaller(token).catch((err) => ({ ok: false, error: String(err?.message || err) }));
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(request) {
  const auth = await authorize(request);
  if (!auth.ok) return json({ error: "unauthorized", detail: auth.error }, 401);
  const url = new URL(request.url);
  const service = createDispatchService({ store: await getDefaultStore(), machinesExtra: midjourneyMachines });
  if (url.searchParams.get("format") === "activity") {
    const act = await service.activity({ since: url.searchParams.get("since") || undefined, limit: url.searchParams.get("limit") || undefined });
    if (!act.error) act.machines = (await service.feed({})).machines;
    return json(act, act.error ? 400 : 200);
  }
  const out = await service.feed({
    since: url.searchParams.get("since") || undefined,
    dispatch_id: url.searchParams.get("dispatch_id") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  return json(out, out.error ? 400 : 200);
}

export async function POST(request) {
  const auth = await authorize(request);
  if (!auth.ok) return json({ error: "unauthorized", detail: auth.error }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const service = createDispatchService({ store: await getDefaultStore() });
  const out = await service.revise({
    dispatch_id: body?.dispatch_id,
    instructions: body?.instructions,
    requester: { ...auth.requester, via: "app" },
  });
  return json(out, out.error ? 400 : 200);
}

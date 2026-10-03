/**
 * Durable trouble tickets on household world creative.troubleQueue.
 *
 * GET  /api/trouble-tickets           → list
 * GET  /api/trouble-tickets?id=AW-1   → one
 * POST /api/trouble-tickets           → create
 */
import {
  createTroubleTicket,
  getTroubleTicket,
  listTroubleTickets,
  commentTroubleTicket,
  updateTroubleTicketStatus,
} from "./lib/trouble-tickets.js";

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
  if (!payload.players) return { status: 409, body: { error: "players_missing" } };
  const saved = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "PUT",
    headers: { Authorization: auth, "Content-Type": "application/json" },
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

export async function GET(request) {
  const auth = authFrom(request);
  if (!auth) {
    return json({ error: "auth_required", hint: "Studio ABBIES_WORLD_TOKEN or Bearer." }, 401);
  }
  const current = await readWorld(auth);
  if (current.status !== 200) return json({ error: "world_unavailable", status: current.status, body: current.body }, current.status);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const got = getTroubleTicket(current.body, id);
    if (got.error) return json(got, 404);
    return json({ durable: "creative.troubleQueue", revision: current.body.revision, ...got });
  }
  return json({
    durable: "creative.troubleQueue",
    revision: current.body.revision,
    ...listTroubleTickets(current.body, {
      status: url.searchParams.get("status") || "",
      limit: Number(url.searchParams.get("limit") || 30),
    }),
  });
}

export async function POST(request) {
  const auth = authFrom(request);
  if (!auth) {
    return json({ error: "auth_required", hint: "Studio ABBIES_WORLD_TOKEN or Bearer." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  const current = await readWorld(auth);
  if (current.status !== 200) return json({ error: "world_unavailable", status: current.status, body: current.body }, current.status);
  const expected = current.body.revision;
  const next = structuredClone(current.body);
  let extra;
  if (body.action === "comment") {
    extra = commentTroubleTicket(next, body.ticketId, body);
  } else if (body.action === "resolve") {
    extra = updateTroubleTicketStatus(next, body.ticketId, body);
  } else {
    extra = createTroubleTicket(next, body, {
      mcpServer: "abbies-world",
      mcpVersion: "0.6.0",
      originatingSurface: body.surface || "studio",
      beforeRevision: current.body.revision,
    });
  }
  if (extra.error) return json(extra, 400);
  const players = next.players;
  next.players = structuredClone(current.body.players);
  if (players && next.players) {
    /* keep gems untouched */
  }
  const saved = await writeWorld(auth, next, expected);
  if (saved.status !== 200) return json({ error: "save_failed", status: saved.status, body: saved.body }, saved.status);
  return json({
    durable: "creative.troubleQueue",
    revision: saved.body.revision,
    ...extra,
  });
}

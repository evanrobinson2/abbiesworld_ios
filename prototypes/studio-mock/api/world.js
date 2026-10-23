const ORIGIN = "http://abbies.world:8000";
const REQUIRED_PLAYERS = ["player.abbie", "player.ani", "player.evan"];

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length < 16 || header.length > 8000) return "";
  return header;
}

async function readWorld(auth) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    headers: { Authorization: auth },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: "bad_upstream" }; }
  return { status: response.status, body };
}

function playersIntact(players) {
  return REQUIRED_PLAYERS.every((id) => players && typeof players[id] === "object" && players[id]);
}

export async function GET(request) {
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  const upstream = await readWorld(auth);
  return Response.json(upstream.body, { status: upstream.status });
}

export async function PUT(request) {
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  let incoming;
  try { incoming = await request.json(); } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const expected = incoming.expectedRevision;
  if (!Number.isInteger(expected) || expected < 0) {
    return Response.json({ error: "expected_revision_required" }, { status: 400 });
  }

  const current = await readWorld(auth);
  if (current.status !== 200 || !current.body) {
    return Response.json(current.body || { error: "world_unavailable" }, { status: current.status || 502 });
  }
  if (current.body.revision !== expected) {
    return Response.json({
      error: "revision_conflict",
      revision: current.body.revision,
    }, { status: 409 });
  }
  if (!playersIntact(current.body.players)) {
    return Response.json({ error: "players_missing" }, { status: 409 });
  }

  const payload = { ...incoming, players: current.body.players, expectedRevision: expected };
  // Creative trail lives with the world. The iPad does not round-trip it yet.
  if (incoming.creative == null && current.body.creative != null) {
    payload.creative = current.body.creative;
  }
  delete payload.revision;
  const saved = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "PUT",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await saved.text();
  return new Response(text, {
    status: saved.status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/midjourney/fill
 * Enqueue Midjourney work on the household cloud queue (creative.executionCapacity).
 * Local Mac execution-capacity workers pull jobs — no tunnel / MJ_WORKER_URL.
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return Response.json({ ok: false, message: "prompt_required" }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const envToken = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authHeader.startsWith("Bearer ")) {
    headers.Authorization = authHeader;
  } else if (envToken && envToken !== "[SENSITIVE]" && !envToken.includes("${")) {
    headers.Authorization = `Bearer ${envToken}`;
  }

  const origin = new URL(request.url).origin;
  const upstream = await fetch(`${origin}/api/execution-capacity`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      op: "enqueue",
      id: body.id || undefined,
      capability: "midjourney.imagine",
      payload: {
        prompt: prompt.slice(0, 8000),
        missionId: body.missionId || undefined,
        requirementId: body.requirementId || undefined,
        semanticId: body.semanticId || undefined,
      },
      maxAttempts: body.maxAttempts,
    }),
  });
  const text = await upstream.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { ok: false, message: text.slice(0, 300) };
  }
  return Response.json(
    {
      ...(payload && typeof payload === "object" ? payload : { ok: false }),
      model: "pull",
      note: "Queued for local Mac worker pull. No tunnel required.",
    },
    { status: upstream.ok ? 200 : upstream.status || 502 }
  );
}

export async function GET(request) {
  const origin = new URL(request.url).origin;
  const authHeader = request.headers.get("authorization") || "";
  const envToken = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  const headers = { Accept: "application/json" };
  if (authHeader.startsWith("Bearer ")) headers.Authorization = authHeader;
  else if (envToken && envToken !== "[SENSITIVE]" && !envToken.includes("${")) {
    headers.Authorization = `Bearer ${envToken}`;
  }
  let mjWorkersAliveLast5Minutes = null;
  let aliveWorkers = [];
  if (headers.Authorization) {
    try {
      const status = await fetch(`${origin}/api/execution-capacity`, { headers });
      const payload = await status.json().catch(() => ({}));
      if (status.ok) {
        mjWorkersAliveLast5Minutes = payload.mjWorkersAliveLast5Minutes ?? payload.summary?.mjWorkersAliveLast5Minutes ?? 0;
        aliveWorkers = payload.summary?.aliveWorkers || [];
      }
    } catch {
      /* household world optional on GET */
    }
  }
  return Response.json({
    configured: true,
    model: "pull",
    mjWorkersAliveLast5Minutes,
    aliveWindowMs: 5 * 60 * 1000,
    aliveWorkers,
    note: "POST { prompt } enqueues on creative.executionCapacity; Mac workers claim outbound. mjWorkersAliveLast5Minutes = workers with lastSeenAt in the last 5 minutes.",
  });
}

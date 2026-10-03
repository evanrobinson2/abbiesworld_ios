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

export async function GET() {
  return Response.json({
    configured: true,
    model: "pull",
    note: "POST { prompt } enqueues on creative.executionCapacity; Mac workers claim outbound.",
  });
}

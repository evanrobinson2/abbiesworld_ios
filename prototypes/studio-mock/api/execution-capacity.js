/**
 * Cloud execution-capacity queue (pull model).
 *
 * SoT: household world creative.executionCapacity
 *
 * GET  /api/execution-capacity                 → status summary (+ ?jobId=)
 * POST /api/execution-capacity { op: enqueue } → ChatGPT / MCP
 * POST /api/execution-capacity { op: claim }   → Mac worker pull
 * POST /api/execution-capacity { op: complete|fail|heartbeat|cancel }
 */
import {
  ensureExecutionCapacity,
  enqueueJob,
  getJob,
  listJobs,
  summarize,
  claimNextJob,
  completeJob,
  failJob,
  cancelJob,
  heartbeatWorker,
} from "./lib/execution-capacity-store.js";

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

async function withWorldWrite(auth, mutator, { retries = 4 } = {}) {
  let last = null;
  for (let i = 0; i < retries; i++) {
    const { status, body } = await readWorld(auth);
    if (status !== 200 || !body || body.error) {
      return { status: status || 502, body: body || { error: "world_read_failed" } };
    }
    const expected = body.revision;
    const doc = body;
    ensureExecutionCapacity(doc);
    const result = mutator(doc);
    if (result?.error && !result?.persist) {
      return { status: result.status || 400, body: result };
    }
    const saved = await writeWorld(auth, doc, expected);
    if (saved.status === 409) {
      last = saved;
      continue;
    }
    if (saved.status >= 400) {
      return { status: saved.status, body: saved.body || { error: "world_write_failed" } };
    }
    return {
      status: 200,
      body: {
        ...(result && typeof result === "object" ? result : {}),
        revision: saved.body?.revision ?? expected,
        durable: "creative.executionCapacity",
      },
    };
  }
  return { status: 409, body: last?.body || { error: "revision_conflict" } };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(request) {
  const auth = authFrom(request);
  if (!auth) return json({ error: "auth_required" }, 401);
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  const { status, body } = await readWorld(auth);
  if (status !== 200 || !body || body.error) {
    return json(body || { error: "world_read_failed" }, status || 502);
  }
  ensureExecutionCapacity(body);
  if (jobId) {
    const job = getJob(body, jobId);
    if (!job) return json({ error: "job_missing", jobId }, 404);
    return json({ job, durable: "creative.executionCapacity" });
  }
  return json({
    ok: true,
    model: "pull",
    summary: summarize(body),
    jobs: listJobs(body, { limit: Number(url.searchParams.get("limit") || 20) }),
    durable: "creative.executionCapacity",
  });
}

export async function POST(request) {
  const auth = authFrom(request);
  if (!auth) return json({ error: "auth_required" }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const op = String(body.op || body.action || "").trim();

  if (op === "enqueue") {
    const out = await withWorldWrite(auth, (doc) => {
      const created = enqueueJob(doc, {
        id: body.id,
        capability: body.capability || "midjourney.imagine",
        payload: body.payload || { prompt: body.prompt },
        maxAttempts: body.maxAttempts,
      });
      if (created.error) return { error: created.error, persist: false, status: 400 };
      return {
        ok: true,
        duplicate: created.duplicate,
        job: created.job,
        next: "Local Mac execution-capacity worker will claim this job (pull). No tunnel.",
      };
    });
    return json(out.body, out.status);
  }

  if (op === "claim") {
    const out = await withWorldWrite(auth, (doc) => {
      const claimed = claimNextJob(doc, {
        workerId: body.workerId,
        capabilities: body.capabilities || ["midjourney.imagine"],
      });
      if (claimed.error) return { error: claimed.error, persist: false, status: 400 };
      return { ok: true, job: claimed.job, summary: claimed.summary };
    });
    return json(out.body, out.status);
  }

  if (op === "complete") {
    const out = await withWorldWrite(auth, (doc) => {
      const done = completeJob(doc, {
        jobId: body.jobId || body.id,
        workerId: body.workerId,
        result: body.result,
      });
      if (done.error) return { error: done.error, persist: false, status: 400 };
      return { ok: true, job: done.job };
    });
    return json(out.body, out.status);
  }

  if (op === "fail") {
    const out = await withWorldWrite(auth, (doc) => {
      const failed = failJob(doc, {
        jobId: body.jobId || body.id,
        workerId: body.workerId,
        error: body.error,
        requeue: body.requeue !== false,
      });
      if (failed.error) return { error: failed.error, persist: false, status: 400 };
      return { ok: true, job: failed.job };
    });
    return json(out.body, out.status);
  }

  if (op === "cancel") {
    const out = await withWorldWrite(auth, (doc) => {
      const cancelled = cancelJob(doc, { jobId: body.jobId || body.id });
      if (cancelled.error) return { error: cancelled.error, persist: false, status: 404 };
      return { ok: true, job: cancelled.job };
    });
    return json(out.body, out.status);
  }

  if (op === "heartbeat") {
    const out = await withWorldWrite(auth, (doc) => {
      const beat = heartbeatWorker(doc, {
        workerId: body.workerId,
        capabilities: body.capabilities,
        currentJobId: body.currentJobId,
        lastMessage: body.lastMessage,
      });
      if (beat.error) return { error: beat.error, persist: false, status: 400 };
      return { ok: true, worker: beat.worker, summary: beat.summary };
    });
    return json(out.body, out.status);
  }

  return json(
    {
      error: "unknown_op",
      hint: "enqueue | claim | complete | fail | cancel | heartbeat",
    },
    400
  );
}

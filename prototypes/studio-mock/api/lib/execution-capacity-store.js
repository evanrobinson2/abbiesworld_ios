/**
 * Execution capacity — cloud queue on household world (creative.executionCapacity).
 *
 * Requesters (ChatGPT / MCP) enqueue. Local Mac workers pull (claim), run Midjourney,
 * then complete/fail. No inbound tunnel.
 */

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix = "ecjob") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ensureExecutionCapacity(doc) {
  if (!doc.creative || typeof doc.creative !== "object") doc.creative = {};
  if (!doc.creative.executionCapacity || typeof doc.creative.executionCapacity !== "object") {
    doc.creative.executionCapacity = {
      schemaVersion: 1,
      jobs: {},
      workers: {},
      updatedAt: nowIso(),
    };
  }
  const bag = doc.creative.executionCapacity;
  if (!bag.jobs || typeof bag.jobs !== "object") bag.jobs = {};
  if (!bag.workers || typeof bag.workers !== "object") bag.workers = {};
  return bag;
}

function publicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    capability: job.capability,
    state: job.state,
    payload: job.payload || {},
    result: job.result || null,
    error: job.error || null,
    attempts: job.attempts || 0,
    maxAttempts: job.maxAttempts || 2,
    workerId: job.workerId || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || null,
    finishedAt: job.finishedAt || null,
  };
}

function pruneJobs(bag, { keep = 80 } = {}) {
  const rows = Object.values(bag.jobs || {});
  if (rows.length <= keep) return;
  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  const keepIds = new Set(rows.slice(0, keep).map((j) => j.id));
  for (const id of Object.keys(bag.jobs)) {
    if (!keepIds.has(id)) delete bag.jobs[id];
  }
}

export function enqueueJob(doc, { id, capability = "midjourney.imagine", payload = {}, maxAttempts = 2 } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const jobId = String(id || "").trim() || newId();
  if (bag.jobs[jobId]) {
    return { duplicate: true, job: publicJob(bag.jobs[jobId]), bag };
  }
  const prompt = String(payload?.prompt || "").trim();
  if (capability === "midjourney.imagine" && !prompt) {
    return { error: "prompt_required" };
  }
  const now = nowIso();
  const job = {
    id: jobId,
    capability: String(capability || "midjourney.imagine").trim(),
    state: "queued",
    payload: { ...(payload && typeof payload === "object" ? payload : {}), prompt },
    result: null,
    error: null,
    attempts: 0,
    maxAttempts: Math.max(1, Math.min(5, Number(maxAttempts) || 2)),
    workerId: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  bag.jobs[jobId] = job;
  bag.updatedAt = now;
  pruneJobs(bag);
  return { duplicate: false, job: publicJob(job), bag };
}

export function getJob(doc, jobId) {
  const bag = ensureExecutionCapacity(doc);
  return publicJob(bag.jobs[String(jobId || "").trim()]);
}

export function listJobs(doc, { limit = 30, state } = {}) {
  const bag = ensureExecutionCapacity(doc);
  let rows = Object.values(bag.jobs || {});
  if (state) rows = rows.filter((j) => j.state === state);
  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return rows.slice(0, Math.min(100, Math.max(1, Number(limit) || 30))).map(publicJob);
}

export function summarize(doc) {
  const bag = ensureExecutionCapacity(doc);
  const byState = {};
  for (const j of Object.values(bag.jobs || {})) {
    byState[j.state] = (byState[j.state] || 0) + 1;
  }
  const workers = Object.values(bag.workers || {}).map((w) => ({
    id: w.id,
    lastSeenAt: w.lastSeenAt,
    capabilities: w.capabilities || [],
    currentJobId: w.currentJobId || null,
    lastMessage: w.lastMessage || null,
  }));
  return {
    byState,
    queued: byState.queued || 0,
    claimed: byState.claimed || 0,
    completed: byState.completed || 0,
    failed: byState.failed || 0,
    workers,
    updatedAt: bag.updatedAt,
  };
}

export function heartbeatWorker(doc, { workerId, capabilities = ["midjourney.imagine"], currentJobId = null, lastMessage = null } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const id = String(workerId || "").trim();
  if (!id) return { error: "workerId_required" };
  const now = nowIso();
  bag.workers[id] = {
    id,
    lastSeenAt: now,
    capabilities: Array.isArray(capabilities) ? capabilities.map(String) : ["midjourney.imagine"],
    currentJobId: currentJobId || null,
    lastMessage: lastMessage ? String(lastMessage).slice(0, 200) : null,
  };
  bag.updatedAt = now;
  return { ok: true, worker: bag.workers[id], summary: summarize(doc) };
}

/**
 * Atomically claim oldest queued job matching a supported capability.
 * Caller must persist doc with expectedRevision (retry on 409).
 */
export function claimNextJob(doc, { workerId, capabilities = ["midjourney.imagine"] } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const id = String(workerId || "").trim();
  if (!id) return { error: "workerId_required" };

  const caps = new Set((capabilities || []).map(String));
  const queued = Object.values(bag.jobs || {})
    .filter((j) => j.state === "queued" && caps.has(j.capability))
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));

  heartbeatWorker(doc, {
    workerId: id,
    capabilities: [...caps],
    currentJobId: null,
    lastMessage: queued.length ? "claiming" : "idle",
  });

  const job = queued[0];
  if (!job) return { job: null, summary: summarize(doc) };

  const now = nowIso();
  job.state = "claimed";
  job.workerId = id;
  job.attempts = Number(job.attempts || 0) + 1;
  job.startedAt = now;
  job.updatedAt = now;
  job.error = null;
  bag.jobs[job.id] = job;
  bag.workers[id] = {
    ...(bag.workers[id] || { id }),
    lastSeenAt: now,
    capabilities: [...caps],
    currentJobId: job.id,
    lastMessage: `claimed:${job.id}`,
  };
  bag.updatedAt = now;
  return { job: publicJob(job), summary: summarize(doc) };
}

export function completeJob(doc, { jobId, workerId, result } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const id = String(jobId || "").trim();
  const job = bag.jobs[id];
  if (!job) return { error: "job_missing" };
  if (workerId && job.workerId && job.workerId !== workerId) {
    return { error: "worker_mismatch" };
  }
  if (!["claimed", "queued"].includes(job.state)) {
    return { error: "bad_state", state: job.state, job: publicJob(job) };
  }
  const now = nowIso();
  job.state = "completed";
  job.result = result && typeof result === "object" ? result : {};
  job.error = null;
  job.updatedAt = now;
  job.finishedAt = now;
  bag.jobs[id] = job;
  if (job.workerId && bag.workers[job.workerId]) {
    bag.workers[job.workerId].currentJobId = null;
    bag.workers[job.workerId].lastSeenAt = now;
    bag.workers[job.workerId].lastMessage = `completed:${id}`;
  }
  bag.updatedAt = now;
  pruneJobs(bag);
  return { job: publicJob(job) };
}

export function failJob(doc, { jobId, workerId, error, requeue = true } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const id = String(jobId || "").trim();
  const job = bag.jobs[id];
  if (!job) return { error: "job_missing" };
  if (workerId && job.workerId && job.workerId !== workerId) {
    return { error: "worker_mismatch" };
  }
  const now = nowIso();
  const attempts = Number(job.attempts || 1);
  const maxAttempts = Number(job.maxAttempts || 2);
  const msg = String(error || "failed").slice(0, 400);

  if (requeue && attempts < maxAttempts) {
    job.state = "queued";
    job.workerId = null;
    job.error = `retry:${msg}`;
    job.startedAt = null;
    job.finishedAt = null;
    job.updatedAt = now;
  } else {
    job.state = "failed";
    job.error = msg;
    job.updatedAt = now;
    job.finishedAt = now;
  }
  bag.jobs[id] = job;
  if (workerId && bag.workers[workerId]) {
    bag.workers[workerId].currentJobId = null;
    bag.workers[workerId].lastSeenAt = now;
    bag.workers[workerId].lastMessage = `${job.state}:${id}`;
  }
  bag.updatedAt = now;
  return { job: publicJob(job) };
}

export function cancelJob(doc, { jobId } = {}) {
  const bag = ensureExecutionCapacity(doc);
  const id = String(jobId || "").trim();
  const job = bag.jobs[id];
  if (!job) return { error: "job_missing" };
  if (["completed", "failed", "cancelled"].includes(job.state)) {
    return { job: publicJob(job) };
  }
  const now = nowIso();
  job.state = "cancelled";
  job.error = "cancelled";
  job.updatedAt = now;
  job.finishedAt = now;
  bag.jobs[id] = job;
  bag.updatedAt = now;
  return { job: publicJob(job) };
}

/**
 * ChatGPT → Claude dispatch bridge: durable records, lifecycle and inbox.
 *
 * One JSON record per dispatch. The record is the whole truth for that dispatch:
 * the original request, every revision, delivery attempts to Claude, every
 * message Claude sent back, and the Git references it reported.
 *
 * Lifecycle (status):
 *   submitted     stored here; not yet proven to have reached Claude
 *   acknowledged  Claude posted an ack on the dispatch's GitHub issue
 *   running       Claude reported progress
 *   blocked       Claude asked a question; revise() answers it
 *   completed     Claude reported completion (verified=true once GitHub confirmed the commits)
 *   failed        Claude reported failure, or delivery/ack never happened after retries
 *
 * delivery.state tracks the hop to Claude separately: pending → fired (the
 * scheduled-task API accepted it and created a session) → acknowledged.
 * A fired session is NOT proof Claude read it; only an ack message is.
 *
 * Storage is pluggable so tests run in memory; production uses private Vercel Blob.
 */
import { createHash, randomBytes } from "node:crypto";

export const MODES = ["auto", "quick", "standard", "bespoke"];
export const STATUSES = ["submitted", "acknowledged", "running", "blocked", "completed", "failed"];
export const MESSAGE_KINDS = ["ack", "progress", "question", "completed", "failed", "note"];
const TERMINAL = new Set(["completed", "failed"]);

export const LIMITS = {
  requestChars: 8000,
  contextChars: 8000,
  messageChars: 4000,
  maxMessages: 200,
  maxRevisions: 50,
  idempotencyWindowMs: 15 * 60 * 1000,
  // Watchdog timings.
  refireBackoffMs: [0, 60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000],
  maxDeliveryAttempts: 5,
  ackTimeoutMs: 15 * 60 * 1000,
  maxAckRefires: 2,
  staleRunMs: 90 * 60 * 1000,
  maxResumeRefires: 1,
};

const PREFIX = "dispatch/v1/";
const RECORD_PREFIX = `${PREFIX}d/`;
const IDEM_PREFIX = `${PREFIX}idem/`;

export function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function clip(text, max) {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L: easy to say aloud

export function newDispatchId(now = Date.now()) {
  const d = new Date(now);
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const bytes = randomBytes(5);
  let tail = "";
  for (const b of bytes) tail += ID_ALPHABET[b % ID_ALPHABET.length];
  return `D-${ymd}-${tail}`;
}

export function isDispatchId(id) {
  return /^D-\d{6}-[2-9A-HJKMNP-Z]{5}$/.test(String(id || ""));
}

export function branchFor(id) {
  return `claude/dispatch-${String(id).toLowerCase()}`;
}

export function idempotencyKey(request, context, explicit) {
  const raw = explicit
    ? `explicit:${String(explicit).trim()}`
    : `auto:${String(request || "").trim().toLowerCase().replace(/\s+/g, " ")}\n${String(context || "").trim()}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function newMessageId(record) {
  return `${record.id}.m${(record.messages?.length || 0) + 1}`;
}

function event(record, type, detail, now) {
  record.history.push({ at: nowIso(now), type, ...(detail || {}) });
  if (record.history.length > 400) record.history.splice(0, record.history.length - 400);
}

export function buildRecord({ request, context, requester, idemKey, now = Date.now(), id, mode, references }) {
  const text = String(request || "").trim();
  if (!text) throw Object.assign(new Error("request is required"), { code: "request_required" });
  const dispatchId = id || newDispatchId(now);
  const record = {
    schema: "abbies-dispatch/v1",
    id: dispatchId,
    status: "submitted",
    verified: false,
    request: clip(text, LIMITS.requestChars),
    context: context ? clip(context, LIMITS.contextChars) : null,
    mode: MODES.includes(mode) ? mode : "auto",
    references: (Array.isArray(references) ? references : [])
      .map((r) => ({ label: clip(r?.label || "", 80), url: String(r?.url || r || "") }))
      .filter((r) => /^https:\/\//.test(r.url))
      .slice(0, 20),
    requester: requester || null,
    idempotencyKey: idemKey || null,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
    lastActivityAt: nowIso(now),
    revision: 0,
    revisions: [],
    pendingRevision: false,
    delivery: {
      state: "pending",
      attempts: 0,
      failuresInRow: 0,
      ackRefires: 0,
      resumeRefires: 0,
      lastAttemptAt: null,
      lastError: null,
      sessions: [],
      deliveredRevision: null,
    },
    claude: { acknowledgedAt: null, sessionId: null, lastKind: null },
    git: { branch: branchFor(dispatchId), issue: null, issueUrl: null, commits: [], prs: [], links: [] },
    lastProgress: null,
    needsInput: null,
    error: null,
    messages: [],
    history: [],
  };
  event(record, "submitted", { by: requester?.sub || null }, now);
  return record;
}

/** Text handed to Claude's scheduled task as the routine-fire payload. */
export function firePayload(record, { reason = "new", now = Date.now() } = {}) {
  const payload = {
    protocol: "abbies-dispatch/v1",
    dispatch_id: record.id,
    reason, // new | revision | retry | resume
    attempt: record.delivery.attempts + 1,
    revision: record.revision,
    request: record.request,
    context: record.context,
    mode: record.mode || "auto",
    references: record.references || [],
    revisions: record.revisions.map((r) => ({ n: r.n, at: r.at, instructions: r.instructions })),
    branch: record.git.branch,
    github_issue: record.git.issue,
    last_progress: record.lastProgress,
    sent_at: nowIso(now),
  };
  return JSON.stringify(payload);
}

export function recordFireResult(record, result, { now = Date.now(), reason = "new" } = {}) {
  record.delivery.attempts += 1;
  record.delivery.lastAttemptAt = nowIso(now);
  if (result?.ok) {
    record.delivery.failuresInRow = 0;
    record.delivery.state = record.delivery.state === "acknowledged" && reason !== "revision" ? "acknowledged" : "fired";
    record.delivery.lastError = null;
    record.delivery.deliveredRevision = record.revision;
    record.pendingRevision = false;
    record.delivery.sessions.push({
      at: nowIso(now),
      reason,
      revision: record.revision,
      sessionId: result.sessionId || null,
      sessionUrl: result.sessionUrl || null,
    });
    if (record.delivery.sessions.length > 30) record.delivery.sessions.shift();
    event(record, "fired", { reason, revision: record.revision, session: result.sessionId || null }, now);
  } else {
    record.delivery.failuresInRow = (record.delivery.failuresInRow || 0) + 1;
    record.delivery.lastError = clip(result?.error || "fire_failed", 300);
    event(record, "fire_failed", { reason, error: record.delivery.lastError }, now);
    if (record.delivery.failuresInRow >= LIMITS.maxDeliveryAttempts && record.status === "submitted") {
      record.status = "failed";
      record.pendingRevision = false;
      record.error = `Could not start a Claude session after ${record.delivery.failuresInRow} attempts: ${record.delivery.lastError}`;
      pushSystemMessage(record, "failed", record.error, now);
    }
  }
  record.updatedAt = nowIso(now);
  return record;
}

function pushSystemMessage(record, kind, text, now) {
  record.messages.push({
    id: newMessageId(record),
    at: nowIso(now),
    from: "bridge",
    kind,
    text: clip(text, LIMITS.messageChars),
    acknowledged: false,
  });
}

export function addRevision(record, instructions, { requester, now = Date.now() } = {}) {
  const text = String(instructions || "").trim();
  if (!text) throw Object.assign(new Error("instructions are required"), { code: "instructions_required" });
  if (record.revisions.length >= LIMITS.maxRevisions) {
    throw Object.assign(new Error("too many revisions; start a new build"), { code: "revision_limit" });
  }
  record.revision += 1;
  record.revisions.push({ n: record.revision, at: nowIso(now), instructions: clip(text, LIMITS.requestChars), by: requester?.sub || null });
  record.pendingRevision = true;
  const wasTerminal = TERMINAL.has(record.status) || record.status === "blocked";
  if (wasTerminal) {
    record.status = "submitted";
    record.verified = false;
    record.needsInput = null;
    record.error = null;
    record.delivery.ackRefires = 0;
    record.delivery.resumeRefires = 0;
  }
  record.updatedAt = nowIso(now);
  record.lastActivityAt = nowIso(now);
  event(record, "revised", { revision: record.revision, deliverNow: wasTerminal }, now);
  return { deliverNow: wasTerminal };
}

/**
 * Parse Claude's machine marker from a GitHub issue body or comment.
 *   <!-- abbies-dispatch:v1 {"id":"D-…","kind":"ack",...} -->
 */
export function parseMarker(body) {
  const m = String(body || "").match(/<!--\s*abbies-dispatch:v1\s+(\{[\s\S]*?\})\s*-->/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    if (!isDispatchId(data.id) || !MESSAGE_KINDS.includes(data.kind)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Human text of a Claude message: the body minus the marker and the attribution footer. */
export function messageText(body) {
  return String(body || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n-{3,}\n_Generated by \[Claude Code\][^\n]*_\s*$/i, "")
    .trim();
}

const SHA = /^[0-9a-f]{7,40}$/i;

/**
 * Apply one relayed GitHub event (an issue or a comment Claude wrote) to the record.
 * `source` = { kind: "issue"|"comment", id, url, issueNumber, issueUrl, body, author, createdAt, verification }
 * Returns { applied, duplicate, message }.
 */
export function applyClaudeMessage(record, source, { now = Date.now() } = {}) {
  const marker = parseMarker(source.body);
  if (!marker || marker.id !== record.id) return { applied: false, reason: "no_marker" };
  const sourceKey = `${source.kind}:${source.id}`;
  if (record.messages.some((msg) => msg.source === sourceKey)) return { applied: false, duplicate: true };

  if (source.issueNumber && !record.git.issue) {
    record.git.issue = source.issueNumber;
    record.git.issueUrl = source.issueUrl || null;
  }
  if (typeof marker.branch === "string" && marker.branch.startsWith("claude/")) record.git.branch = clip(marker.branch, 120);
  for (const sha of Array.isArray(marker.commits) ? marker.commits : []) {
    if (SHA.test(sha) && !record.git.commits.includes(sha)) record.git.commits.push(sha);
  }
  for (const pr of Array.isArray(marker.prs) ? marker.prs : marker.pr ? [marker.pr] : []) {
    const n = Number(pr);
    if (Number.isInteger(n) && n > 0 && !record.git.prs.includes(n)) record.git.prs.push(n);
  }
  for (const link of Array.isArray(marker.links) ? marker.links : []) {
    const url = String(link?.url || link || "");
    if (/^https:\/\//.test(url) && !record.git.links.some((l) => l.url === url)) {
      record.git.links.push({ label: clip(link?.label || "", 80), url: clip(url, 400) });
    }
  }
  if (record.git.commits.length > 100) record.git.commits.splice(0, record.git.commits.length - 100);

  const text = clip(messageText(source.body), LIMITS.messageChars);
  const at = source.createdAt || nowIso(now);
  const msg = {
    id: newMessageId(record),
    at,
    from: "claude",
    kind: marker.kind,
    revision: Number.isInteger(marker.rev) ? marker.rev : null,
    session: marker.session ? clip(marker.session, 80) : null,
    text,
    url: source.url || null,
    source: sourceKey,
    acknowledged: false,
  };
  const images = (Array.isArray(marker.images) ? marker.images : [])
    .map((img) => ({ label: clip(img?.label || "", 80), url: String(img?.url || img || "") }))
    .filter((img) => /^https:\/\//.test(img.url))
    .slice(0, 12);
  if (images.length) msg.images = images;
  const models = (Array.isArray(marker.models) ? marker.models : [])
    .map((m) => ({ label: clip(m?.label || "", 80), url: String(m?.url || m || "") }))
    .filter((m) => /^https:\/\//.test(m.url))
    .slice(0, 8);
  if (models.length) msg.models = models;
  if (typeof marker.stage === "string" && marker.stage.trim()) {
    msg.stage = clip(marker.stage.trim().toLowerCase(), 40);
    record.stage = msg.stage;
    record.stages = record.stages || [];
    if (!record.stages.some((st) => st.name === msg.stage)) record.stages.push({ name: msg.stage, at });
  }
  if (typeof marker.job_kind === "string" && marker.job_kind.trim()) record.jobKind = clip(marker.job_kind.trim().toLowerCase(), 24);
  // Partial progress on long jobs: {"progress":{"done":3,"total":8,"unit":"parts","note":"…"}}
  const pr = marker.progress;
  if (pr && typeof pr === "object" && Number.isFinite(Number(pr.done)) && Number.isFinite(Number(pr.total)) && Number(pr.total) > 0) {
    msg.progress = {
      done: Math.max(0, Number(pr.done)),
      total: Number(pr.total),
      unit: clip(pr.unit || "steps", 24),
      note: pr.note ? clip(pr.note, 160) : null,
    };
    msg.progress.fraction = Math.min(1, msg.progress.done / msg.progress.total);
    record.progress = { ...msg.progress, at, stage: msg.stage || record.stage || null };
  }
  if (images.length || models.length) {
    record.artifacts = record.artifacts || [];
    for (const it of images) record.artifacts.push({ type: "image", ...it, at, stage: msg.stage || null, message: msg.id });
    for (const it of models) record.artifacts.push({ type: "model", ...it, at, stage: msg.stage || null, message: msg.id });
    if (record.artifacts.length > 60) record.artifacts.splice(0, record.artifacts.length - 60);
  }
  if (typeof marker.checkpoint === "string") {
    msg.checkpoint = clip(marker.checkpoint, 40);
    record.checkpoints = record.checkpoints || [];
    record.checkpoints.push({ name: msg.checkpoint, at, message: msg.id, images });
    if (record.checkpoints.length > 30) record.checkpoints.shift();
  }

  const forOldRevision = msg.revision != null && msg.revision < record.revision;
  record.lastActivityAt = nowIso(now);
  record.claude.lastKind = marker.kind;
  if (msg.session) record.claude.sessionId = msg.session;

  if (marker.kind === "ack") {
    record.claude.acknowledgedAt = record.claude.acknowledgedAt || at;
    if (!forOldRevision) {
      record.delivery.state = "acknowledged";
      if (record.status === "submitted" || record.status === "blocked") record.status = "acknowledged";
    }
  } else if (marker.kind === "progress") {
    record.lastProgress = clip(text, 600);
    if (!forOldRevision) {
      if (!TERMINAL.has(record.status)) record.status = "running";
      record.delivery.state = "acknowledged";
    }
  } else if (marker.kind === "question") {
    if (!forOldRevision) {
      record.status = "blocked";
      record.needsInput = clip(text, 1200);
    }
  } else if (marker.kind === "completed") {
    if (!forOldRevision) {
      record.status = "completed";
      record.needsInput = null;
      record.lastProgress = clip(text, 600);
      const v = source.verification;
      record.verified = Boolean(v && v.ok === true);
      record.verification = v ? { ok: Boolean(v.ok), checkedAt: v.checkedAt || nowIso(now), detail: v.detail || null } : null;
    }
  } else if (marker.kind === "failed") {
    if (!forOldRevision) {
      record.status = "failed";
      record.error = clip(text, 1200);
    }
  }
  if (!forOldRevision && msg.revision === record.revision && record.pendingRevision) {
    // A running session reported against the newest revision: it took it in mid-run.
    record.pendingRevision = false;
    record.delivery.deliveredRevision = record.revision;
    event(record, "revision_taken_in_run", { revision: record.revision }, now);
  }
  if (forOldRevision) {
    msg.note = `reported against revision ${msg.revision}; current revision is ${record.revision}`;
    // The run that was busy when a revision arrived has stopped: free the queued revision to go out.
    const runEnded = ["completed", "failed", "question"].includes(marker.kind);
    if (runEnded && record.pendingRevision && msg.revision === record.delivery.deliveredRevision && !TERMINAL.has(record.status)) {
      record.status = "submitted";
    }
  }

  record.messages.push(msg);
  if (record.messages.length > LIMITS.maxMessages) record.messages.splice(0, record.messages.length - LIMITS.maxMessages);
  record.updatedAt = nowIso(now);
  event(record, `claude_${marker.kind}`, { message: msg.id, revision: msg.revision }, now);
  return { applied: true, message: msg };
}

/**
 * What the watchdog should do for this record right now, if anything.
 * Returns null or { reason: "retry"|"resume"|"revision", note }.
 */
export function watchdogAction(record, now = Date.now()) {
  const d = record.delivery;
  const last = d.lastAttemptAt ? Date.parse(d.lastAttemptAt) : 0;
  const since = now - last;

  // A revision queued while a session was running goes out once that run ends.
  const failures = d.failuresInRow || 0;
  const backoff = LIMITS.refireBackoffMs[Math.min(Math.max(0, failures - 1), LIMITS.refireBackoffMs.length - 1)];
  if (record.pendingRevision && (TERMINAL.has(record.status) || record.status === "blocked" || record.status === "submitted")) {
    return failures === 0 || since >= backoff ? { reason: "revision" } : null;
  }
  if (record.status === "failed" || record.status === "completed" || record.status === "blocked") return null;

  if (d.state === "pending") {
    if (failures >= LIMITS.maxDeliveryAttempts) return null;
    return since >= backoff ? { reason: "retry" } : null;
  }
  if (d.state === "fired" && !record.claude.acknowledgedAt && record.status === "submitted") {
    if (since < LIMITS.ackTimeoutMs) return null;
    if (d.ackRefires >= LIMITS.maxAckRefires) return { reason: "give_up", note: "Claude never acknowledged" };
    return { reason: "retry" };
  }
  // Fired for a revision but no ack for that revision yet: treat like an unacknowledged fire.
  if (record.status === "submitted" && d.state === "fired" && since >= LIMITS.ackTimeoutMs) {
    if (d.ackRefires >= LIMITS.maxAckRefires) return { reason: "give_up", note: "Claude never acknowledged the revision" };
    return { reason: "retry" };
  }
  if (record.status === "acknowledged" || record.status === "running") {
    const quiet = now - Math.max(Date.parse(record.lastActivityAt || record.updatedAt), last);
    if (quiet < LIMITS.staleRunMs) return null;
    if (d.resumeRefires >= LIMITS.maxResumeRefires) return { reason: "give_up", note: "Claude went quiet and did not resume" };
    return { reason: "resume" };
  }
  return null;
}

/**
 * Revisions a running Claude session should see now, on its GitHub issue (posted by the relay workflow),
 * so Evan can steer mid-run (e.g. after concept art) without waiting for the run to end.
 */
export function revisionsToPost(record) {
  if (!record.pendingRevision || !record.git.issue) return [];
  if (!["acknowledged", "running"].includes(record.status)) return [];
  return record.revisions
    .filter((r) => !r.postedAt && r.n > (record.delivery.deliveredRevision ?? -1))
    .map((r) => ({ dispatch_id: record.id, issue: record.git.issue, revision: r.n, instructions: r.instructions }));
}

export function markRevisionPosted(record, n, commentUrl, now = Date.now()) {
  const r = record.revisions.find((x) => x.n === n);
  if (!r || r.postedAt) return false;
  r.postedAt = nowIso(now);
  r.commentUrl = commentUrl || null;
  event(record, "revision_posted_to_issue", { revision: n }, now);
  record.updatedAt = nowIso(now);
  return true;
}

export function giveUp(record, note, now = Date.now()) {
  record.status = "failed";
  record.error = note;
  record.updatedAt = nowIso(now);
  pushSystemMessage(record, "failed", `${note}. Use revise() to try again, or build() a new request.`, now);
  event(record, "gave_up", { note }, now);
}

export function noteRefire(record, reason) {
  if (reason === "retry" && record.delivery.state === "fired") record.delivery.ackRefires += 1;
  if (reason === "resume") record.delivery.resumeRefires += 1;
}

/** Compact view for status(). */
export function summarize(record) {
  const unread = record.messages.filter((m) => !m.acknowledged).length;
  const lastSession = record.delivery.sessions[record.delivery.sessions.length - 1] || null;
  return {
    dispatch_id: record.id,
    status: record.status,
    verified: record.verified,
    request: clip(record.request, 280),
    mode: record.mode || "auto",
    revision: record.revision,
    pending_revision: record.pendingRevision,
    delivery: {
      state: record.delivery.state,
      attempts: record.delivery.attempts,
      last_error: record.delivery.lastError,
      claude_session_url: lastSession?.sessionUrl || null,
    },
    acknowledged_at: record.claude.acknowledgedAt,
    last_progress: record.lastProgress,
    needs_input: record.needsInput,
    error: record.error,
    last_activity_at: record.lastActivityAt,
    created_at: record.createdAt,
    git: {
      branch: record.git.branch,
      issue_url: record.git.issueUrl,
      commits: record.git.commits.slice(-10),
      prs: record.git.prs.map((n) => `https://github.com/evanrobinson2/abbiesworld_ios/pull/${n}`),
      links: record.git.links.slice(-10),
    },
    verification: record.verification || null,
    checkpoints: (record.checkpoints || []).slice(-5).map((c) => ({ name: c.name, at: c.at, images: c.images })),
    unread_messages: unread,
  };
}

/** A dispatch as a work parcel moving through the factory, for the phone app's activity center. */
export function parcelView(record, now = Date.now()) {
  const lastSession = record.delivery.sessions[record.delivery.sessions.length - 1] || null;
  const quietMs = now - Date.parse(record.lastActivityAt || record.updatedAt);
  const working = ["acknowledged", "running"].includes(record.status) || (record.status === "submitted" && record.delivery.state === "fired");
  return {
    parcel_id: record.id,
    title: clip(record.request.split("\n")[0], 90),
    mode: record.mode || "auto",
    references: record.references || [],
    status: record.status,
    verified: record.verified,
    stage: record.stage || (record.status === "submitted" ? "queued" : null),
    stages: record.stages || [],
    progress: record.progress || null,
    revision: record.revision,
    needs_input: record.needsInput,
    last_progress: record.lastProgress,
    started_at: record.createdAt,
    last_activity_at: record.lastActivityAt,
    artifacts: (record.artifacts || []).slice(-12),
    machine: {
      kind: "claude",
      state: working ? (quietMs > 20 * 60 * 1000 ? "quiet" : "working") : record.status === "blocked" ? "waiting_for_evan" : "idle",
      session_started_at: lastSession?.at || null,
      deliveries: record.delivery.attempts,
    },
    links: {
      issue: record.git.issueUrl,
      prs: record.git.prs.map((n) => `https://github.com/evanrobinson2/abbiesworld_ios/pull/${n}`),
      other: record.git.links.slice(-5),
    },
  };
}

const ACTIVITY_STATUS = { submitted: "queued", acknowledged: "running", running: "running", blocked: "blocked", completed: "done", failed: "failed" };

/** One message as an activity-centre event (the phone app's shape). */
export function activityEvent(record, msg) {
  const p = msg.progress || record.progress;
  return {
    id: msg.id,
    jobId: record.id,
    jobTitle: clip(record.request.split("\n")[0], 90),
    jobKind: record.mode === "bespoke" ? "serious" : record.jobKind || "build",
    mode: record.mode || "auto",
    stages: (record.stages || []).map((st) => st.name),
    stage: msg.stage || record.stage || null,
    progress: p ? Math.round(p.fraction * 1000) / 1000 : record.status === "completed" ? 1 : null,
    status: ACTIVITY_STATUS[record.status] || record.status,
    at: msg.at,
    message: clip(msg.text.split("\n")[0], 280),
    kind: msg.kind,
    checkpoint: msg.checkpoint || null,
    image: msg.images?.[0]?.url || null,
    images: msg.images || [],
    model: msg.models?.[0]?.url || null,
    models: msg.models || [],
    worker: msg.from === "claude" ? "claude" : "bridge",
    thread: record.git.issueUrl || null,
    verified: record.verified,
  };
}

export function publicMessage(record, msg) {
  return {
    message_id: msg.id,
    dispatch_id: record.id,
    at: msg.at,
    from: msg.from,
    kind: msg.kind,
    text: msg.text,
    url: msg.url || null,
    revision: msg.revision ?? null,
    note: msg.note || undefined,
    checkpoint: msg.checkpoint || undefined,
    images: msg.images || undefined,
    models: msg.models || undefined,
    stage: msg.stage || undefined,
    progress: msg.progress || undefined,
    acknowledged: msg.acknowledged,
  };
}

/* ---------------------------------------------------------------- storage */

export function createMemoryStorage() {
  const map = new Map();
  let etagSeq = 0;
  return {
    async read(path) {
      const hit = map.get(path);
      return hit ? { value: structuredClone(hit.value), etag: hit.etag, uploadedAt: hit.uploadedAt } : null;
    },
    async write(path, value, { ifMatch, ifNone } = {}) {
      const hit = map.get(path);
      if (ifNone && hit) throw Object.assign(new Error("exists"), { code: "precondition" });
      if (ifMatch && (!hit || hit.etag !== ifMatch)) throw Object.assign(new Error("etag mismatch"), { code: "precondition" });
      const etag = `e${++etagSeq}`;
      map.set(path, { value: structuredClone(value), etag, uploadedAt: new Date() });
      return { etag };
    },
    async list(prefix) {
      return [...map.entries()]
        .filter(([k]) => k.startsWith(prefix))
        .map(([pathname, v]) => ({ pathname, uploadedAt: v.uploadedAt }));
    },
  };
}

export function createBlobStorage(blob) {
  const access = "private";
  return {
    async read(path) {
      const res = await blob.get(path, { access, useCache: false });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      const text = await new Response(res.stream).text();
      return { value: JSON.parse(text), etag: res.blob.etag, uploadedAt: res.blob.uploadedAt };
    },
    async write(path, value, { ifMatch, ifNone } = {}) {
      const opts = {
        access,
        contentType: "application/json",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
      };
      if (ifMatch) opts.ifMatch = ifMatch;
      else if (!ifNone) opts.allowOverwrite = true;
      try {
        const out = await blob.put(path, JSON.stringify(value), opts);
        return { etag: out.etag };
      } catch (err) {
        const name = String(err?.name || err?.constructor?.name || "");
        if (/PreconditionFailed/.test(name) || /already exists/i.test(String(err?.message || ""))) {
          throw Object.assign(new Error(err.message), { code: "precondition" });
        }
        throw err;
      }
    },
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const page = await blob.list({ prefix, cursor, limit: 1000 });
        for (const b of page.blobs) out.push({ pathname: b.pathname, uploadedAt: b.uploadedAt });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor && out.length < 5000);
      return out;
    },
  };
}

export function createDispatchStore(storage) {
  const recordPath = (id) => `${RECORD_PREFIX}${id}.json`;

  async function get(id) {
    if (!isDispatchId(id)) return null;
    const hit = await storage.read(recordPath(id));
    return hit ? hit.value : null;
  }

  /** Read-modify-write with optimistic concurrency. `fn` mutates the record and may return a value. */
  async function update(id, fn) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const hit = await storage.read(recordPath(id));
      if (!hit) return { notFound: true };
      const record = hit.value;
      const result = await fn(record);
      if (result && result.__skipWrite) return { record, result: result.value };
      try {
        await storage.write(recordPath(id), record, { ifMatch: hit.etag });
        return { record, result };
      } catch (err) {
        if (err?.code !== "precondition") throw err;
        await new Promise((r) => setTimeout(r, 40 + Math.random() * 120));
      }
    }
    throw Object.assign(new Error("dispatch record busy; retry"), { code: "busy" });
  }

  async function create(record) {
    await storage.write(recordPath(record.id), record, { ifNone: true });
    if (record.idempotencyKey) {
      await storage.write(`${IDEM_PREFIX}${record.idempotencyKey}.json`, { id: record.id, at: record.createdAt }, {});
    }
    return record;
  }

  async function findByIdempotency(key, now = Date.now()) {
    const hit = await storage.read(`${IDEM_PREFIX}${key}.json`);
    if (!hit) return null;
    const record = await get(hit.value.id);
    if (!record) return null;
    const age = now - Date.parse(record.createdAt);
    return { record, age };
  }

  /** Records whose blob changed at or after `sinceMs` (all when omitted), newest first. */
  async function listRecords({ sinceMs } = {}) {
    const entries = await storage.list(RECORD_PREFIX);
    const picked = entries
      .filter((e) => !sinceMs || new Date(e.uploadedAt).getTime() >= sinceMs)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 200);
    const out = [];
    for (const e of picked) {
      const id = e.pathname.slice(RECORD_PREFIX.length).replace(/\.json$/, "");
      const rec = await get(id);
      if (rec) out.push(rec);
    }
    return out;
  }

  return { get, update, create, findByIdempotency, listRecords };
}

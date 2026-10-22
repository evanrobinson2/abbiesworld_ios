/**
 * Dispatch bridge operations shared by the MCP tools (build/status/revise/inbox)
 * and the GitHub relay endpoint (Claude's replies, watchdog sweep).
 */
import {
  addRevision,
  applyClaudeMessage,
  buildRecord,
  createBlobStorage,
  createDispatchStore,
  firePayload,
  giveUp,
  idempotencyKey,
  isDispatchId,
  LIMITS,
  markRevisionPosted,
  revisionsToPost,
  noteRefire,
  activityEvent,
  parcelView,
  publicMessage,
  recordFireResult,
  summarize,
  watchdogAction,
} from "./dispatch-store.js";

const FIRE_BASE = "https://api.anthropic.com/v1/claude_code/routines";

/** Start a Claude Code cloud session through the dispatch scheduled task's API trigger. */
export async function fireRoutine(text, { env = process.env, fetchImpl = fetch } = {}) {
  const id = String(env.CLAUDE_DISPATCH_ROUTINE_ID || "").trim();
  const token = String(env.CLAUDE_DISPATCH_ROUTINE_TOKEN || "").trim();
  if (!/^trig_[A-Za-z0-9]+$/.test(id)) return { ok: false, error: "CLAUDE_DISPATCH_ROUTINE_ID not set" };
  if (!token || token === "[SENSITIVE]") return { ok: false, error: "CLAUDE_DISPATCH_ROUTINE_TOKEN not set" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetchImpl(`${FIRE_BASE}/${id}/fire`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const retryAfter = res.headers.get("retry-after");
      return {
        ok: false,
        status: res.status,
        error: `fire_${res.status}: ${body?.error?.message || body?.error?.type || "error"}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`,
      };
    }
    return { ok: true, sessionId: body.claude_code_session_id || null, sessionUrl: body.claude_code_session_url || null };
  } catch (err) {
    return { ok: false, error: `fire_exception: ${String(err?.message || err).slice(0, 200)}` };
  }
}

let defaultStore = null;
export async function getDefaultStore() {
  if (!defaultStore) {
    const blob = await import("@vercel/blob");
    defaultStore = createDispatchStore(createBlobStorage(blob));
  }
  return defaultStore;
}

export function createDispatchService({ store, fire = fireRoutine, now = () => Date.now(), notify = null, machinesExtra = null } = {}) {
  async function deliver(id, reason) {
    // Persist the attempt first so a crash mid-fire is visible and retried, never silently lost.
    const loaded = await store.get(id);
    if (!loaded) return null;
    const text = firePayload(loaded, { reason, now: now() });
    const result = await fire(text);
    const { record } = await store.update(id, (r) => {
      recordFireResult(r, result, { now: now(), reason });
    });
    return { record, result };
  }

  async function build({ request, context, idempotency_key: explicitKey, requester, mode, references, kind = "build", about }) {
    const text = String(request || "").trim();
    if (!text) return { error: "request_required", hint: "Describe what Claude should build, in plain words." };
    const key = idempotencyKey(kind === "build" ? text : `${kind}:${about || ""}:${text}`, context, explicitKey);
    const existing = await store.findByIdempotency(key, now());
    if (existing && (explicitKey || existing.age < LIMITS.idempotencyWindowMs)) {
      return {
        duplicate: true,
        note: "Same request was already submitted; returning the existing dispatch instead of starting a second build.",
        ...summarize(existing.record),
      };
    }
    const record = buildRecord({ request: text, context, requester, idemKey: key, now: now(), mode, references, kind, about });
    await store.create(record);
    const out = await deliver(record.id, "new");
    const current = out?.record || record;
    return {
      duplicate: false,
      ...summarize(current),
      meaning:
        current.delivery.state === "fired"
          ? "Stored, and a Claude session was started. Not yet acknowledged: check inbox() or status() for Claude's receipt."
          : "Stored durably, but starting Claude failed; the bridge retries automatically. See delivery.last_error.",
    };
  }

  async function sweepOne(id) {
    const rec = await store.get(id);
    if (!rec) return null;
    const action = watchdogAction(rec, now());
    if (!action) return null;
    if (action.reason === "give_up") {
      await store.update(id, (r) => {
        const again = watchdogAction(r, now());
        if (!again || again.reason !== "give_up") return { __skipWrite: true };
        giveUp(r, action.note, now());
      });
      return { id, action: "gave_up", note: action.note };
    }
    // Claim the re-fire inside a conditional write so two sweeps don't double-fire.
    const claim = await store.update(id, (r) => {
      const again = watchdogAction(r, now());
      if (!again || again.reason !== action.reason) return { __skipWrite: true, value: false };
      noteRefire(r, action.reason);
      r.delivery.lastAttemptAt = new Date(now()).toISOString();
      return true;
    });
    if (!claim.result) return null;
    const out = await deliver(id, action.reason);
    return { id, action: action.reason, ok: Boolean(out?.result?.ok), error: out?.result?.error || null };
  }

  /** Revisions the relay workflow should post on running sessions' issues. */
  async function pendingIssuePosts() {
    const records = await store.listRecords();
    return records.flatMap(revisionsToPost);
  }

  async function revisionPosted({ dispatch_id: id, revision, comment_url: url }) {
    const out = await store.update(id, (r) => {
      if (!markRevisionPosted(r, Number(revision), url, now())) return { __skipWrite: true, value: false };
      return true;
    });
    return { id, revision, marked: Boolean(out.result) };
  }

  async function sweep({ ids } = {}) {
    const records = ids ? (await Promise.all(ids.map((id) => store.get(id)))).filter(Boolean) : await store.listRecords();
    const results = [];
    for (const rec of records) {
      if (rec.status === "completed" && !rec.pendingRevision) continue;
      if (rec.status === "failed" && !rec.pendingRevision) continue;
      const r = await sweepOne(rec.id);
      if (r) results.push(r);
    }
    return results;
  }

  async function status({ dispatch_id: id, include_messages } = {}) {
    if (id) {
      if (!isDispatchId(id)) return { error: "bad_dispatch_id", hint: "Dispatch ids look like D-261022-AB3CD." };
      await sweepOne(id).catch(() => null);
      const rec = await store.get(id);
      if (!rec) return { error: "not_found", dispatch_id: id };
      const out = summarize(rec);
      if (include_messages) out.messages = rec.messages.slice(-20).map((m) => publicMessage(rec, m));
      out.revisions = rec.revisions.map((r) => ({ n: r.n, at: r.at, instructions: r.instructions }));
      out.original_request = rec.request;
      out.context = rec.context;
      return out;
    }
    const all = await store.listRecords();
    const active = all.filter((r) => !["completed", "failed"].includes(r.status) || r.pendingRevision);
    for (const r of active) await sweepOne(r.id).catch(() => null);
    const fresh = active.length ? await Promise.all(active.map((r) => store.get(r.id))) : [];
    const recent = all
      .filter((r) => ["completed", "failed"].includes(r.status) && !r.pendingRevision)
      .slice(0, 5)
      .map(summarize);
    return {
      active: fresh.filter(Boolean).map(summarize),
      recently_finished: recent,
      counts: all.reduce((acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc), {}),
    };
  }

  async function revise({ dispatch_id: id, instructions, requester }) {
    if (!isDispatchId(id)) return { error: "bad_dispatch_id" };
    let plan;
    try {
      const out = await store.update(id, (r) => addRevision(r, instructions, { requester, now: now() }));
      if (out.notFound) return { error: "not_found", dispatch_id: id };
      plan = out.result;
    } catch (err) {
      return { error: err.code || "revise_failed", detail: err.message };
    }
    if (plan.deliverNow) {
      const out = await deliver(id, "revision");
      return {
        ...summarize(out.record),
        meaning: out.result.ok
          ? "Revision recorded and a Claude session was started on the same branch and issue. Wait for its ack in inbox()."
          : "Revision recorded; starting Claude failed and will be retried automatically.",
      };
    }
    const rec = await store.get(id);
    return {
      ...summarize(rec),
      meaning:
        "Revision recorded. Claude is mid-run: the revision is posted on the dispatch's GitHub issue within ~10 minutes and Claude folds it in before its next step (it checks at each checkpoint, e.g. after concept art). If the run ends without taking it, a new run starts with it.",
    };
  }

  async function inbox({ since, unread_only: unreadOnly = true, acknowledge = true, dispatch_id: onlyId, limit = 30 } = {}) {
    const sinceMs = since ? Date.parse(since) : null;
    if (since && Number.isNaN(sinceMs)) return { error: "bad_since", hint: "Use an ISO timestamp, e.g. 2026-10-22T20:00:00Z" };
    const records = onlyId ? [await store.get(onlyId)].filter(Boolean) : await store.listRecords({ sinceMs: sinceMs || undefined });
    const picked = [];
    for (const rec of records) {
      for (const m of rec.messages) {
        if (unreadOnly && m.acknowledged) continue;
        if (sinceMs && Date.parse(m.at) < sinceMs) continue;
        picked.push({ rec, m });
      }
    }
    picked.sort((a, b) => Date.parse(a.m.at) - Date.parse(b.m.at));
    const page = picked.slice(0, Math.max(1, Math.min(100, Number(limit) || 30)));
    const messages = page.map(({ rec, m }) => publicMessage(rec, m));
    if (acknowledge && page.length) {
      const byId = new Map();
      for (const { rec, m } of page) {
        if (!byId.has(rec.id)) byId.set(rec.id, new Set());
        byId.get(rec.id).add(m.id);
      }
      for (const [id, set] of byId) {
        await store.update(id, (r) => {
          let changed = false;
          for (const m of r.messages) {
            if (set.has(m.id) && !m.acknowledged) {
              m.acknowledged = true;
              m.acknowledgedAt = new Date(now()).toISOString();
              changed = true;
            }
          }
          if (!changed) return { __skipWrite: true };
        });
      }
    }
    return {
      messages,
      more: picked.length > page.length,
      acknowledged: Boolean(acknowledge && page.length),
      checked_at: new Date(now()).toISOString(),
      hint: messages.length ? undefined : "No new messages from Claude.",
    };
  }

  /** A GitHub issue or comment, relayed by the dispatch-relay workflow. */
  async function relay(source) {
    const { parseMarker } = await import("./dispatch-store.js");
    const marker = parseMarker(source.body);
    if (!marker) return { ignored: "no_marker" };
    const out = await store.update(marker.id, (r) => {
      const res = applyClaudeMessage(r, source, { now: now() });
      if (!res.applied) return { __skipWrite: true, value: res };
      return res;
    });
    if (out.notFound) return { ignored: "unknown_dispatch", id: marker.id };
    if (out.result?.applied && out.result.message?.briefing && out.record.kind === "briefing") {
      await store.putMeta("briefing", {
        ...out.result.message.briefing,
        generated_at: out.result.message.at,
        dispatch_id: out.record.id,
      });
    }
    let alerted = null;
    if (notify && out.result?.applied) alerted = await notify(out.record, out.result.message).catch((e) => ({ error: String(e) }));
    // A queued revision goes out as soon as the running session reports a stopping point.
    const after = out.record;
    let delivered = null;
    if (after.pendingRevision && ["completed", "failed", "blocked"].includes(after.status)) {
      const swept = await sweepOne(after.id);
      delivered = swept;
    }
    return { id: marker.id, kind: marker.kind, applied: Boolean(out.result?.applied), duplicate: Boolean(out.result?.duplicate), delivered, alerted };
  }

  /**
   * Event feed for the phone app: every Claude message (and bridge notice) across dispatches,
   * oldest first, with images for checkpoints such as concept art. Read-only; does not touch
   * ChatGPT's inbox read state.
   */
  async function feed({ since, dispatch_id: onlyId, limit = 50 } = {}) {
    const sinceMs = since ? Date.parse(since) : null;
    if (since && Number.isNaN(sinceMs)) return { error: "bad_since" };
    const records = onlyId ? [await store.get(onlyId)].filter(Boolean) : await store.listRecords({ sinceMs: sinceMs || undefined });
    const events = [];
    for (const rec of records) {
      for (const m of rec.messages) {
        if (sinceMs && Date.parse(m.at) <= sinceMs) continue;
        const pub = publicMessage(rec, m);
        delete pub.acknowledged;
        events.push({
          event_id: m.id,
          ...pub,
          dispatch: { status: rec.status, verified: rec.verified, revision: rec.revision, request: rec.request.slice(0, 280) },
        });
      }
    }
    events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const page = events.slice(-Math.max(1, Math.min(200, Number(limit) || 50)));
    // Parcels: everything active, plus anything that finished in the last 24h.
    const all = onlyId ? records : sinceMs ? await store.listRecords() : records;
    const dayAgo = now() - 24 * 3600 * 1000;
    const parcels = all
      .filter((r) => !["completed", "failed"].includes(r.status) || Date.parse(r.updatedAt) >= dayAgo)
      .map((r) => parcelView(r, now()));
    const machines = parcels.filter((p) => p.machine.state !== "idle").map((p) => ({ ...p.machine, parcel_id: p.parcel_id, title: p.title, stage: p.stage }));
    if (machinesExtra) {
      const extra = await machinesExtra().catch(() => []);
      machines.push(...extra);
    }
    return {
      events: page,
      next_since: page.length ? page[page.length - 1].at : since || null,
      parcels,
      machines,
    };
  }

  /** The activity-centre shape: events newest first, plus the latest state of each job. */
  async function activity({ since, limit = 100 } = {}) {
    const sinceMs = since ? Date.parse(since) : null;
    if (since && Number.isNaN(sinceMs)) return { error: "bad_since" };
    const records = await store.listRecords();
    const events = [];
    for (const rec of records) {
      for (const m of rec.messages) {
        if (sinceMs && Date.parse(m.at) <= sinceMs) continue;
        events.push(activityEvent(rec, m));
      }
    }
    const seq = (e) => Number(String(e.id).split(".m")[1] || 0);
    events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || seq(b) - seq(a));
    const dayAgo = now() - 24 * 3600 * 1000;
    const jobs = records
      .filter((r) => !["completed", "failed"].includes(r.status) || Date.parse(r.updatedAt) >= dayAgo)
      .map((r) => parcelView(r, now()));
    return { events: events.slice(0, Math.max(1, Math.min(500, Number(limit) || 100))), jobs, generated_at: new Date(now()).toISOString() };
  }

  /**
   * Project-wide status, like the coordinator's summaries: one item per workstream (W1, W2, …) with
   * what's done and what's waiting on Evan. Returns the latest briefing at once, merged with live
   * dispatch state; starts a fresh one (a short Claude session) when asked or when it's over an hour old.
   */
  async function briefing({ refresh = false, requester } = {}) {
    const latest = await store.getMeta("briefing");
    const ageMin = latest ? Math.round((now() - Date.parse(latest.generated_at)) / 60000) : null;
    const records = await store.listRecords();
    const inFlight = records.find((r) => r.kind === "briefing" && !["completed", "failed"].includes(r.status));
    let refreshing = inFlight ? inFlight.id : null;
    if (!inFlight && (refresh || !latest || ageMin > 60)) {
      const started = await build({
        kind: "briefing",
        mode: "quick",
        request:
          "Write a project-wide status briefing for Evan: one item per active workstream, what is done, what is in progress, and what is waiting on him.",
        idempotency_key: `briefing-${Math.floor(now() / (10 * 60 * 1000))}`,
        requester,
      });
      refreshing = started.dispatch_id || null;
    }
    const waiting = records
      .filter((r) => r.status === "blocked")
      .map((r) => ({ dispatch_id: r.id, title: r.request.slice(0, 90), question: r.needsInput }));
    const active = records
      .filter((r) => (r.kind || "build") === "build" && !["completed", "failed"].includes(r.status))
      .map((r) => ({ dispatch_id: r.id, title: r.request.slice(0, 90), status: r.status, stage: r.stage || null, last_progress: r.lastProgress }));
    return {
      briefing: latest
        ? { headline: latest.headline, items: latest.items, generated_at: latest.generated_at, age_minutes: ageMin }
        : null,
      refreshing,
      live: { dispatches_in_flight: active, waiting_on_evan: waiting },
      how_to_follow_up: "Call ask(question, about: 'W3') to open a thread on an item; ask again with thread_id to continue it. Answers arrive in inbox().",
      note: latest ? undefined : "No briefing yet; one is being written now. Check back in a few minutes (inbox() will have it).",
    };
  }

  /** A question for Claude about a dispatch (done or running), a briefing item, or anything. thread_id continues a thread. */
  async function ask({ question, about, thread_id: threadId, requester }) {
    const q = String(question || "").trim();
    if (!q) return { error: "question_required" };
    if (threadId) {
      const rec = await store.get(threadId);
      if (!rec) return { error: "thread_not_found", thread_id: threadId };
      const out = await revise({ dispatch_id: threadId, instructions: q, requester });
      return { thread_id: threadId, ...out, meaning: "Follow-up added to the thread. The answer arrives in inbox() under this thread_id." };
    }
    let context = null;
    if (about && isDispatchId(about)) {
      // A question about a dispatch, finished or still running: a separate read-only session answers it,
      // so a running build is never interrupted.
      const target = await store.get(about);
      if (!target) return { error: "not_found", about };
      const snap = summarize(target);
      snap.recent_messages = target.messages.slice(-12).map((m) => ({ at: m.at, kind: m.kind, stage: m.stage || null, text: m.text.slice(0, 400) }));
      snap.revisions = target.revisions.map((r) => ({ n: r.n, instructions: r.instructions }));
      context = `About dispatch ${about} (${target.status}). Do not modify its branch or interrupt its session; read only. Snapshot: ${JSON.stringify(snap).slice(0, 6000)}`;
    } else if (about) {
      const latest = await store.getMeta("briefing");
      const item = latest?.items?.find((it) => it.id === about) || null;
      context = item ? `About briefing item ${item.id} (${latest.generated_at}): ${JSON.stringify(item)}` : `About: ${about}`;
    }
    const out = await build({ kind: "inquiry", mode: "quick", request: q, context, about, requester });
    return { thread_id: out.dispatch_id, ...out, meaning: "Question sent. The answer arrives in inbox() under this thread_id; use ask(question, thread_id) to follow up." };
  }

  return { build, status, revise, inbox, relay, sweep, sweepOne, deliver, pendingIssuePosts, revisionPosted, feed, activity, briefing, ask };
}

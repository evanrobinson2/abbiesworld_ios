/**
 * Smoke test for execution-capacity cloud store (no network).
 */
import assert from "node:assert/strict";
import {
  ensureExecutionCapacity,
  enqueueJob,
  claimNextJob,
  completeJob,
  failJob,
  summarize,
  heartbeatWorker,
  countAliveWorkers,
  ALIVE_WINDOW_MS,
} from "./execution-capacity-store.js";

const doc = { creative: {} };
ensureExecutionCapacity(doc);

const a = enqueueJob(doc, {
  capability: "midjourney.imagine",
  payload: { prompt: "pink rocket --ar 1:1" },
});
assert.equal(a.duplicate, false);
assert.equal(a.job.state, "queued");

const dup = enqueueJob(doc, { id: a.job.id, payload: { prompt: "x" } });
assert.equal(dup.duplicate, true);

const claim = claimNextJob(doc, { workerId: "mac.test" });
assert.equal(claim.job.id, a.job.id);
assert.equal(claim.job.state, "claimed");
assert.equal(claim.job.workerId, "mac.test");

const empty = claimNextJob(doc, { workerId: "mac.other" });
assert.equal(empty.job, null);

const done = completeJob(doc, {
  jobId: a.job.id,
  workerId: "mac.test",
  result: { candidateUrls: ["https://cdn.midjourney.com/x.webp"] },
});
assert.equal(done.job.state, "completed");
assert.equal(done.job.result.candidateUrls.length, 1);

const b = enqueueJob(doc, { payload: { prompt: "retry me" } });
claimNextJob(doc, { workerId: "mac.test" });
const failed = failJob(doc, { jobId: b.job.id, workerId: "mac.test", error: "no_tab", requeue: true });
assert.equal(failed.job.state, "queued");

const summary = summarize(doc);
assert.ok(summary.completed >= 1);
assert.ok(summary.workers.some((w) => w.id === "mac.test"));
assert.equal(summary.mjWorkersAliveLast5Minutes, 2, "claim heartbeats count as alive");
assert.equal(summary.aliveLast5Minutes, summary.mjWorkersAliveLast5Minutes);

const liveness = { creative: { executionCapacity: { jobs: {}, workers: {} } } };
ensureExecutionCapacity(liveness);
heartbeatWorker(liveness, { workerId: "mac.fresh" });
const staleAt = new Date(Date.now() - ALIVE_WINDOW_MS - 1000).toISOString();
liveness.creative.executionCapacity.workers["mac.stale"] = {
  id: "mac.stale",
  lastSeenAt: staleAt,
  capabilities: ["midjourney.imagine"],
};
const alive = countAliveWorkers(liveness);
assert.equal(alive.count, 1, "stale worker older than 5 minutes is not alive");
assert.equal(alive.workers[0].id, "mac.fresh");
assert.equal(summarize(liveness).mjWorkersAliveLast5Minutes, 1);

console.log("execution-capacity-store ok");

/**
 * Local unit checks for asset jobs store (no live registry required).
 * Run: node prototypes/studio-mock/api/lib/asset-jobs-store.test.js
 */
import {
  createProject,
  describeLibrary,
  createJob,
  listJobs,
  getJob,
  completeJob,
  __resetAssetStoreForTests,
} from "./asset-jobs-store.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

__resetAssetStoreForTests();

const project = createProject({
  name: "Peg monastery",
  libraryIntent: "Peglin floating peg monastery exterior and interior plates",
});
assert(project.id?.startsWith("proj_"), "project id");
assert(
  project.suggestedSemanticIds.includes("poi.peglin.pegMonastery.exterior"),
  "suggests peg monastery exterior"
);

const described = describeLibrary({
  projectId: project.id,
  libraryIntent: "Peglin monastery + crash land map for Abbie's World",
});
assert(described.suggestedSemanticIds.includes("map.peglin.crashLand"), "suggests map");

const job = await createJob(
  {
    projectId: project.id,
    semanticId: "poi.peglin.pegMonastery.exterior",
    brief: "floating white monastery with blue roofs and waterfalls",
  },
  { openaiKey: "" }
);
assert(job.id?.startsWith("job_"), "job id");
assert(job.status === "awaiting_image", "awaiting image");
assert(job.midjourneyPrompt?.includes("monastery"), "prompt has subject");
assert(job.proofBrief?.includes("poi.peglin.pegMonastery.exterior"), "proof brief");
assert(job.registryKey === "pois/peglin/peg-monastery/exterior", "registry key");

const listed = listJobs({ projectId: project.id });
assert(listed.length === 1, "list by project");

// Without a reachable image / admin key, complete must fail closed (not leave CDN as SoT).
const done = await completeJob(job.id, {
  stagingUrl: "https://example.invalid/monastery.png",
});
assert(done.status === "failed", "failed closed when ingest cannot finish");
assert(getJob(job.id).stagingUrl.includes("example.invalid"), "staging url kept as provenance");
assert(done.error, "error set on failed ingest");

const bad = await createJob({ semanticId: "not-a-key", brief: "x" }, { openaiKey: "" });
assert(bad.error === "semantic_id_invalid", "rejects bad semantic id");

console.log("asset-jobs-store.test.js OK");

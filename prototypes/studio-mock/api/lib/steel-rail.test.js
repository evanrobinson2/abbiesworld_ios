/**
 * Local unit checks for steel-rail (no network).
 * Run: node prototypes/studio-mock/api/lib/steel-rail.test.js
 */
import {
  validateAuthorPlan,
  behaviorOk,
  semanticToRegistryKey,
  AUTHOR_OPS,
} from "./steel-rail.js";
import { planAuthorBeat } from "./author-beat.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(behaviorOk("pegMonastery"), "pegMonastery allowed");
assert(!behaviorOk("questUI"), "questUI rejected");
assert(
  semanticToRegistryKey("poi.peglin.pegMonastery.exterior") ===
    "pois/peglin/peg-monastery/exterior",
  "registry key mapping"
);

const bad = validateAuthorPlan({ ops: [{ op: "hack.world", args: {} }] }, {});
assert(bad.error === "rail_rejected", "unknown op rejected");

const cdn = validateAuthorPlan(
  {
    ops: [
      {
        op: "scene.set_background_url",
        args: { sceneId: "scene.x", url: "https://cdn.example/a.png" },
      },
    ],
  },
  {}
);
assert(cdn.error === "cdn_forbidden", "cdn url rejected");

const bindCdn = validateAuthorPlan(
  {
    ops: [{ op: "asset.bind", args: { stagingUrl: "https://cdn.example/a.png" } }],
  },
  {}
);
assert(bindCdn.error === "cdn_forbidden", "asset.bind cdn rejected");

const planned = await planAuthorBeat({
  intent: "add peg monastery on crash land",
  describe: { activeSceneID: "scene.peglin.crashLand", scenes: [] },
  openaiKey: "",
});
const ok = validateAuthorPlan(planned, { scenes: {} });
assert(ok.ok, "heuristic monastery plan ok");
assert(ok.ops.every((s) => AUTHOR_OPS.has(s.op)), "all ops closed");

console.log("steel-rail.test.js OK");

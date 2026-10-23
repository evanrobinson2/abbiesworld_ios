/**
 * Local unit checks for steel-rail (no network).
 * Run: node prototypes/studio-mock/api/lib/steel-rail.test.js
 */
import {
  validateAuthorPlan,
  behaviorOk,
  semanticToRegistryKey,
  registryKeyToSemantic,
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
assert(
  registryKeyToSemantic("pois/peglin/peg-monastery/exterior") ===
    "poi.peglin.pegMonastery.exterior",
  "registry key → semantic"
);
assert(
  registryKeyToSemantic("maps/peglin/crash-land") === "map.peglin.crashLand",
  "map registry key → semantic"
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

const aliased = validateAuthorPlan(
  { ops: [{ op: "scene.upsert", args: { id: "scene.home", name: "Home" } }] },
  { scenes: { "scene.home": { poiInstances: [] } } }
);
assert(aliased.ok, "args.id aliases to sceneId");
assert(aliased.ops[0].args.sceneId === "scene.home", "sceneId present");
assert(!aliased.ops[0].args.id, "id stripped");
assert(aliased.warnings.includes("normalized_id_to_sceneId"), "warn about alias");

const mint = validateAuthorPlan(
  { ops: [{ op: "scene.upsert", args: { name: "Ghost" } }] },
  { scenes: { "scene.home": {} } }
);
assert(mint.error === "scene_id_required", "bare scene.upsert rejected");

const rocketPlan = await planAuthorBeat({
  intent: "Remove poi.moonBase.rocket Pink Rocket from scene.home. Delete accidental scene.mcpmusm14y7.",
  describe: {
    activeSceneID: "scene.home",
    scenes: [
      {
        id: "scene.home",
        name: "Home",
        places: [
          { placeId: "poi.abbie.treehouse", name: "Abbie’s Treehouse" },
          { placeId: "poi.moonBase.rocket", name: "Pink Rocket" },
        ],
      },
    ],
  },
  openaiKey: "",
});
const rocketOk = validateAuthorPlan(rocketPlan, {
  scenes: { "scene.home": {}, "scene.mcpmusm14y7": {} },
});
assert(rocketOk.ok, "cleanup plan ok");
assert(rocketOk.ops.some((s) => s.op === "place.remove" && s.args.placeId === "poi.moonBase.rocket"), "place.remove rocket");
assert(
  rocketOk.ops.some((s) => s.op === "place.remove" && s.args.sceneId === "scene.home"),
  "place.remove targets scene.home even when a scene.mcp* id is mentioned first"
);
assert(rocketOk.ops.some((s) => s.op === "scene.delete" && s.args.sceneId === "scene.mcpmusm14y7"), "delete ghost scene");
assert(AUTHOR_OPS.has("place.remove") && AUTHOR_OPS.has("scene.delete"), "new ops closed");

console.log("steel-rail.test.js OK");

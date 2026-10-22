/**
 * World ops: sceneId vs id, place.remove, postcondition fail-closed.
 * Run: node prototypes/studio-mock/api/lib/world-ops.test.js
 */
import {
  upsertScene,
  removePlace,
  deleteScene,
  verifyAuthorPostconditions,
  graphDiff,
  narrationFromVerified,
  restoreGraph,
  normalizeSceneArgs,
} from "./world-ops.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const home = {
  id: "scene.home",
  name: "Home",
  poiInstances: [
    { id: "poiInstance.poi.abbie.treehouse", archetypeID: "poi.abbie.treehouse" },
    { id: "poiInstance.poi.moonBase.rocket", archetypeID: "poi.moonBase.rocket" },
  ],
};

function world() {
  const doc = {
    revision: 19806,
    activeSceneID: "scene.home",
    scenes: {
      "scene.home": structuredClone(home),
    },
    places: [
      { id: "poi.moonBase.rocket", name: "Pink Rocket", behavior: "moonBase", exteriorAsset: "poi.moonBase.rocket.exterior" },
      { id: "poi.abbie.treehouse", name: "Abbie’s Treehouse", behavior: "playerHome", exteriorAsset: "poi.abbie.treehouse.exterior" },
    ],
  };
  return doc;
}

assert(normalizeSceneArgs({ id: "scene.home" }).sceneId === "scene.home", "id aliases to sceneId");
assert(normalizeSceneArgs({ id: "scene.home" }).id === undefined, "id stripped after alias");

{
  const doc = world();
  const buggy = upsertScene(doc, { id: "scene.home", name: "Home" }, { mintIfMissing: true });
  assert(buggy.sceneId === "scene.home", "MCP upsert honors args.id as sceneId");
  assert(buggy.created === false, "existing scene is an update");
  assert(Object.keys(doc.scenes).length === 1, "no extra scene");
}

{
  const doc = world();
  const minted = upsertScene(doc, { name: "Oops" }, { mintIfMissing: true });
  assert(minted.created === true, "nameless create still mints for MCP");
  assert(String(minted.sceneId).startsWith("scene.mcp"), "minted id prefix");
}

{
  const doc = world();
  const refused = upsertScene(doc, { id: "scene.home" }, { mintIfMissing: false });
  assert(refused.sceneId === "scene.home", "author_beat update uses scene.home");
  assert(refused.created === false, "author_beat does not create");
}

{
  const doc = world();
  const missing = upsertScene(doc, { sceneId: "scene.doesNotExist" }, { mintIfMissing: false });
  assert(missing.error === "scene_missing", "unknown sceneId does not mint");
}

{
  const doc = world();
  const needId = upsertScene(doc, { name: "Ghost" }, { mintIfMissing: false });
  assert(needId.error === "scene_id_required", "author_beat create without create:true fails");
}

{
  const before = world();
  const after = world();
  const minted = upsertScene(after, { name: "Ghost" }, { mintIfMissing: true });
  const check = verifyAuthorPostconditions({
    beforeDoc: before,
    afterDoc: after,
    ops: [{ op: "scene.upsert", args: { id: "scene.home" } }],
    results: [{ op: "scene.upsert", sceneId: minted.sceneId, created: true }],
  });
  assert(!check.ok, "Pink Rocket postcondition fails");
  assert(
    check.failures.some((f) => f.code === "scene_id_mismatch" || f.code === "scene_created_instead_of_update" || f.code === "unexpected_scene_created"),
    "detects mint-instead-of-update"
  );
}

{
  const doc = world();
  const removed = removePlace(doc, { sceneId: "scene.home", placeId: "poi.moonBase.rocket", name: "Pink Rocket" });
  assert(!removed.error, "place.remove ok");
  assert(removed.removed.length === 1, "one pin removed");
  const pins = doc.scenes["scene.home"].poiInstances.map((p) => p.archetypeID);
  assert(pins.includes("poi.abbie.treehouse"), "treehouse remains");
  assert(!pins.includes("poi.moonBase.rocket"), "rocket gone");
  assert(doc.places.some((p) => p.id === "poi.moonBase.rocket"), "catalog row stays");
}

{
  const before = world();
  const after = world();
  removePlace(after, { sceneId: "scene.home", placeId: "poi.moonBase.rocket" });
  const check = verifyAuthorPostconditions({
    beforeDoc: before,
    afterDoc: after,
    ops: [{ op: "place.remove", args: { sceneId: "scene.home", placeId: "poi.moonBase.rocket" } }],
    results: [{ op: "place.remove", sceneId: "scene.home", removed: [{ placeId: "poi.moonBase.rocket", name: "Pink Rocket" }] }],
  });
  assert(check.ok, "verified rocket removal");
  assert(check.diff.sceneCountBefore === check.diff.sceneCountAfter, "scene count unchanged");
  const said = narrationFromVerified({
    ops: [{ op: "place.remove" }],
    results: [{ op: "place.remove", sceneId: "scene.home", removed: [{ name: "Pink Rocket" }] }],
    plannedNarration: "The Pink Rocket is gone from Abbie’s World.",
  });
  assert(said.includes("Pink Rocket"), "narration from result");
  assert(said.includes("scene.home"), "narration names the scene");
}

{
  const doc = world();
  doc.scenes["scene.mcpmusm14y7"] = { id: "scene.mcpmusm14y7", name: "Ghost", poiInstances: [] };
  const gone = deleteScene(doc, { sceneId: "scene.mcpmusm14y7" });
  assert(gone.deleted === true, "accidental scene deleted");
  assert(!doc.scenes["scene.mcpmusm14y7"], "ghost gone");
  assert(doc.scenes["scene.home"], "home intact");
  const blocked = deleteScene(doc, { sceneId: "scene.home" });
  assert(blocked.error === "home_protected", "home protected");
}

{
  const before = world();
  const after = restoreGraph(world(), before);
  after.scenes["scene.oops"] = { id: "scene.oops", poiInstances: [] };
  restoreGraph(after, before);
  assert(!after.scenes["scene.oops"], "rollback restores graph");
  assert(after.scenes["scene.home"], "home restored");
}

{
  const diff = graphDiff(world(), world());
  assert(diff.addedScenes.length === 0, "empty diff");
}

console.log("world-ops.test.js OK");

/**
 * Closed world graph mutations used by MCP + author_beat.
 * Scene updates must never mint a new id when the caller named an existing scene.
 */

export function normalizeSceneArgs(args) {
  const out = args && typeof args === "object" ? { ...args } : {};
  if (!out.sceneId && out.id) out.sceneId = out.id;
  delete out.id;
  return out;
}

export function blankScene(id, name) {
  return {
    id,
    name: name || "New scene",
    summary: "",
    backgroundAsset: "",
    hardpoints: [],
    poiInstances: [],
    isMutableByPlayer: true,
    showsOpenHardpointsToPlayers: false,
    isDeveloperPlaceholder: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create or update a scene.
 * mintIfMissing: MCP scene_upsert may create when no sceneId is given.
 * author_beat must pass mintIfMissing:false so a missing/unknown id cannot spawn scene.mcp*.
 */
export function upsertScene(doc, rawArgs, { mintIfMissing = true } = {}) {
  const args = normalizeSceneArgs(rawArgs);
  let id = String(args.sceneId || "").trim();
  doc.scenes = doc.scenes || {};
  const exists = Boolean(id && doc.scenes[id]);

  if (!id) {
    if (!mintIfMissing && args.create !== true) {
      return {
        error: "scene_id_required",
        detail: "To change an existing scene pass sceneId (not id). To create, pass create:true and a name.",
      };
    }
    id = `scene.mcp${Date.now().toString(36)}`;
  } else if (!exists && args.create !== true && !mintIfMissing) {
    return {
      error: "scene_missing",
      sceneId: id,
      detail: "Refusing to mint a new scene for an unknown sceneId. Pass create:true to create.",
    };
  }

  const created = !doc.scenes[id];
  const scene = doc.scenes[id] || blankScene(id, args.name);
  if (args.name) scene.name = String(args.name).slice(0, 80);
  if (args.summary != null) scene.summary = String(args.summary).slice(0, 400);
  if (args.backgroundAsset != null) {
    scene.backgroundAsset = String(args.backgroundAsset).slice(0, 2000);
    scene.isDeveloperPlaceholder = !scene.backgroundAsset;
  }
  if (args.musicTrackID != null) scene.musicTrackID = String(args.musicTrackID).slice(0, 80);
  if (!Array.isArray(scene.poiInstances)) scene.poiInstances = [];
  if (!Array.isArray(scene.hardpoints)) scene.hardpoints = [];
  scene.id = id;
  doc.scenes[id] = scene;
  if (!doc.activeSceneID) doc.activeSceneID = id;
  return { sceneId: id, created, name: scene.name };
}

export function placeMatchesArgs(doc, scene, instance, args) {
  const instanceId = String(args.instanceId || "").trim();
  const placeId = String(args.placeId || "").trim();
  const name = String(args.name || "").trim().toLowerCase();
  if (instanceId) return instance.id === instanceId;
  if (placeId && instance.archetypeID === placeId) return true;
  if (name) {
    const place = (doc.places || []).find((item) => item.id === instance.archetypeID);
    const placeName = String(place?.name || "").trim().toLowerCase();
    return placeName === name || instance.archetypeID.toLowerCase() === name;
  }
  return false;
}

export function removePlace(doc, args) {
  const sceneId = String(args.sceneId || "").trim();
  if (!sceneId) return { error: "scene_id_required" };
  const scene = doc.scenes?.[sceneId];
  if (!scene) return { error: "scene_missing", sceneId };
  const instanceId = String(args.instanceId || "").trim();
  const placeId = String(args.placeId || "").trim();
  const name = String(args.name || "").trim();
  if (!instanceId && !placeId && !name) {
    return { error: "place_ref_required", detail: "Pass placeId, instanceId, or name." };
  }

  const before = [...(scene.poiInstances || [])];
  const removed = [];
  scene.poiInstances = before.filter((instance) => {
    if (placeMatchesArgs(doc, scene, instance, args)) {
      removed.push({
        instanceId: instance.id,
        placeId: instance.archetypeID,
        name: (doc.places || []).find((item) => item.id === instance.archetypeID)?.name || instance.archetypeID,
      });
      return false;
    }
    return true;
  });

  if (!removed.length) {
    return {
      error: "place_not_on_scene",
      sceneId,
      placeId: placeId || null,
      instanceId: instanceId || null,
      name: name || null,
    };
  }
  return { sceneId, removed, remaining: scene.poiInstances.length };
}

export function deleteScene(doc, args) {
  const sceneId = String(args.sceneId || args.id || "").trim();
  if (!sceneId) return { error: "scene_id_required" };
  if (!doc.scenes?.[sceneId]) return { error: "scene_missing", sceneId };
  if (sceneId === "scene.home" && args.confirmHome !== true) {
    return {
      error: "home_protected",
      sceneId,
      detail: "scene.home is protected. Pass confirmHome:true only for an intentional home wipe.",
    };
  }
  const remaining = Object.keys(doc.scenes).filter((id) => id !== sceneId);
  if (!remaining.length) {
    return { error: "last_scene", sceneId, detail: "Refusing to delete the only scene." };
  }
  delete doc.scenes[sceneId];
  if (doc.activeSceneID === sceneId) {
    doc.activeSceneID = remaining.includes("scene.home") ? "scene.home" : remaining[0];
  }
  return { sceneId, deleted: true, activeSceneID: doc.activeSceneID, sceneCount: remaining.length };
}

export function graphSnapshot(doc) {
  const scenes = doc?.scenes || {};
  const pins = {};
  for (const [id, scene] of Object.entries(scenes)) {
    pins[id] = (scene.poiInstances || []).map((instance) => ({
      instanceId: instance.id,
      placeId: instance.archetypeID,
    }));
  }
  return {
    sceneIds: Object.keys(scenes).sort(),
    activeSceneID: doc?.activeSceneID || null,
    pins,
  };
}

export function graphDiff(beforeDoc, afterDoc) {
  const before = graphSnapshot(beforeDoc);
  const after = graphSnapshot(afterDoc);
  const beforeSet = new Set(before.sceneIds);
  const afterSet = new Set(after.sceneIds);
  const addedScenes = after.sceneIds.filter((id) => !beforeSet.has(id));
  const removedScenes = before.sceneIds.filter((id) => !afterSet.has(id));
  const pinChanges = [];
  for (const id of new Set([...before.sceneIds, ...after.sceneIds])) {
    const prev = new Set((before.pins[id] || []).map((p) => p.placeId));
    const next = new Set((after.pins[id] || []).map((p) => p.placeId));
    const added = [...next].filter((p) => !prev.has(p));
    const removed = [...prev].filter((p) => !next.has(p));
    if (added.length || removed.length) pinChanges.push({ sceneId: id, added, removed });
  }
  return {
    sceneCountBefore: before.sceneIds.length,
    sceneCountAfter: after.sceneIds.length,
    addedScenes,
    removedScenes,
    pinChanges,
    activeSceneID: after.activeSceneID,
  };
}

function sceneHasPlace(doc, sceneId, args) {
  const scene = doc.scenes?.[sceneId];
  if (!scene) return false;
  return (scene.poiInstances || []).some((instance) => placeMatchesArgs(doc, scene, instance, args));
}

/**
 * Fail closed if execution did not do what the plan said.
 * The Pink Rocket incident: scene.upsert with args.id minted scene.mcp* and left scene.home unchanged.
 */
export function verifyAuthorPostconditions({ beforeDoc, afterDoc, ops, results }) {
  const failures = [];
  const before = graphSnapshot(beforeDoc);
  const after = graphSnapshot(afterDoc);
  const diff = graphDiff(beforeDoc, afterDoc);
  const steps = Array.isArray(ops) ? ops : [];
  const applied = Array.isArray(results) ? results : [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const result = applied[i] || {};
    const args = normalizeSceneArgs(step.args || {});
    if (result.error) {
      failures.push({ code: "op_error", op: step.op, error: result.error, detail: result });
      continue;
    }
    if (step.op === "scene.upsert") {
      const wanted = String(args.sceneId || "").trim();
      if (wanted && result.sceneId && result.sceneId !== wanted) {
        failures.push({ code: "scene_id_mismatch", wanted, got: result.sceneId });
      }
      if (wanted && result.created && args.create !== true) {
        failures.push({ code: "scene_created_instead_of_update", wanted, got: result.sceneId });
      }
      if (wanted && !afterDoc.scenes?.[wanted]) {
        failures.push({ code: "target_scene_missing", wanted });
      }
    }
    if (step.op === "place.remove") {
      if (sceneHasPlace(afterDoc, args.sceneId, args)) {
        failures.push({
          code: "place_still_present",
          sceneId: args.sceneId,
          placeId: args.placeId || null,
          name: args.name || null,
        });
      }
    }
    if (step.op === "scene.delete") {
      const sceneId = String(args.sceneId || "").trim();
      if (sceneId && afterDoc.scenes?.[sceneId]) {
        failures.push({ code: "scene_still_present", sceneId });
      }
    }
  }

  const allowCreate = steps.some(
    (step) => step.op === "scene.upsert" && (step.args?.create === true || (!step.args?.sceneId && !step.args?.id))
  );
  const allowDelete = steps.some((step) => step.op === "scene.delete");
  if (!allowCreate && diff.addedScenes.length) {
    failures.push({
      code: "unexpected_scene_created",
      addedScenes: diff.addedScenes,
      sceneCountBefore: diff.sceneCountBefore,
      sceneCountAfter: diff.sceneCountAfter,
    });
  }
  if (!allowDelete && diff.removedScenes.length) {
    failures.push({ code: "unexpected_scene_deleted", removedScenes: diff.removedScenes });
  }

  return { ok: failures.length === 0, failures, diff };
}

export function narrationFromVerified({ ops, results, plannedNarration }) {
  const bits = [];
  for (const result of results || []) {
    if (!result || result.error) continue;
    if (result.op === "place.remove" || result.removed) {
      const names = (result.removed || []).map((row) => row.name || row.placeId).join(", ");
      bits.push(`Removed ${names || "place"} from ${result.sceneId}.`);
    } else if (result.op === "scene.delete" || result.deleted) {
      bits.push(`Deleted ${result.sceneId}.`);
    } else if (result.op === "scene.upsert" || result.sceneId) {
      if (result.created) bits.push(`Created ${result.sceneId}.`);
      else if (result.op === "scene.upsert") bits.push(`Updated ${result.sceneId}.`);
    } else if (result.op === "place.upsert" && result.name) {
      bits.push(`Placed ${result.name} on ${result.sceneId}.`);
    }
  }
  const text = bits.join(" ").trim();
  return text || String(plannedNarration || "World updated.").trim();
}

export function restoreGraph(doc, snapshotDoc) {
  doc.scenes = structuredClone(snapshotDoc.scenes || {});
  doc.places = structuredClone(snapshotDoc.places || []);
  doc.activeSceneID = snapshotDoc.activeSceneID || doc.activeSceneID;
  return doc;
}

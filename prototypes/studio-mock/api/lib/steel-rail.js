/**
 * Steel-rail helpers shared by MCP and asset jobs.
 * Closed behaviors + closed author_beat ops. No invented screens.
 */

export const BEHAVIORS = new Set([
  "playerHome",
  "cardFactory",
  "furnitureStore",
  "assetWorkbench",
  "creatureLab",
  "placeFactory",
  "threeBearsHouse",
  "characterStudio",
  "figurineExplorer",
  "sceneBuilder",
  "whizbang",
  "planningDept",
  "rooms",
  "decoration",
  "plink",
  "pegMonastery",
]);

/** Ops an NL planner may emit. Anything else is rail_rejected. */
export const AUTHOR_OPS = new Set([
  "scene.upsert",
  "scene.set_background_semantic",
  "scene.set_background_url",
  "place.upsert",
  "scene.connect",
  "asset.job_create",
  "asset.bind",
  "vars.apply",
  "session.patch",
]);

export function behaviorOk(value) {
  const behavior = String(value || "");
  if (BEHAVIORS.has(behavior)) return true;
  if (behavior.startsWith("travel:") && behavior.length > "travel:".length) return true;
  if (behavior.startsWith("fallingTargets:") && behavior.length > "fallingTargets:".length) {
    return true;
  }
  return false;
}

export function clamp01(value, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** Play semantic → registry slash key (matches World2RegistryKey.conventionalKey). */
export function semanticToRegistryKey(semanticId) {
  const id = String(semanticId || "").trim();
  if (!id) return "";
  const parts = id.split(".").filter(Boolean);
  if (parts.length < 2) return id.replace(/\./g, "/");
  const [head, ...rest] = parts;
  const tail = rest.map(camelToKebab).join("/");
  if (head === "map") return `maps/${tail}`;
  if (head === "poi") {
    if (rest.length < 2) return `pois/${tail}`;
    return `pois/${tail}`;
  }
  if (head === "token") return `tokens/${tail}`;
  if (head === "ui") return `ui/${tail}`;
  if (head === "furniture") return `furniture/${tail}`;
  if (head === "title") return `backgrounds/${tail}`;
  return `${head}/${tail}`;
}

function camelToKebab(s) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function isSemanticAssetId(value) {
  const v = String(value || "");
  return /^(map|poi|token|ui|furniture|title)\./.test(v);
}

export function isStagingUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

/**
 * Validate a planner plan. Returns { ok, ops, rails, warnings, error }.
 */
export function validateAuthorPlan(plan, doc) {
  const rails = ["closed_ops", "behavior_whitelist", "layout_01", "no_player_touch"];
  const warnings = [];
  const ops = Array.isArray(plan?.ops) ? plan.ops : [];
  if (!ops.length) {
    return { ok: false, ops: [], rails, warnings, error: "empty_plan" };
  }

  const normalized = [];
  for (const raw of ops) {
    const op = String(raw?.op || "").trim();
    if (!AUTHOR_OPS.has(op)) {
      return {
        ok: false,
        ops: [],
        rails,
        warnings,
        error: "rail_rejected",
        detail: `unknown_op:${op}`,
        allowed: [...AUTHOR_OPS],
      };
    }
    const args = raw.args && typeof raw.args === "object" ? { ...raw.args } : {};

    if (op === "place.upsert" || op === "scene.connect") {
      if (args.behavior != null && !behaviorOk(args.behavior)) {
        return {
          ok: false,
          ops: [],
          rails,
          warnings,
          error: "behavior_rejected",
          behavior: args.behavior,
          allowed: [...BEHAVIORS, "travel:<sceneId>", "fallingTargets:<id>"],
        };
      }
    }
    if (op === "place.upsert") {
      if (args.x != null) args.x = clamp01(args.x);
      if (args.y != null) args.y = clamp01(args.y);
      if (args.x != null && (args.x < 0.08 || args.x > 0.92)) {
        warnings.push(`place_x_edge:${args.x}`);
      }
      if (args.y != null && (args.y < 0.08 || args.y > 0.92)) {
        warnings.push(`place_y_edge:${args.y}`);
      }
    }
    if (op === "scene.set_background_url" || (op === "asset.bind" && isStagingUrl(args.asset || args.stagingUrl || args.url))) {
      return {
        ok: false,
        ops: [],
        rails,
        warnings,
        error: "cdn_forbidden",
        detail:
          "World plates must be Game Asset semantic IDs. Use asset_job_complete (ingests to server) then asset_bind with semanticId.",
      };
    }
    if (op === "asset.bind" && args.stagingUrl && !args.semanticId) {
      return {
        ok: false,
        ops: [],
        rails,
        warnings,
        error: "cdn_forbidden",
        detail: "asset.bind requires semanticId; staging URLs are intake-only.",
      };
    }
    if (
      (op === "scene.set_background_semantic" || op === "asset.bind") &&
      args.semanticId &&
      !isSemanticAssetId(args.semanticId)
    ) {
      return {
        ok: false,
        ops: [],
        rails,
        warnings,
        error: "semantic_id_invalid",
        semanticId: args.semanticId,
      };
    }
    if (op === "scene.upsert" && args.sceneId && doc?.scenes && !doc.scenes[args.sceneId]) {
      // creating new scene is fine
    }
    normalized.push({ op, args, note: raw.note ? String(raw.note).slice(0, 200) : undefined });
  }

  return { ok: true, ops: normalized, rails, warnings, error: null };
}

export function lintWorld(doc) {
  const notes = [];
  const scenes = doc.scenes || {};
  const ids = new Set(Object.keys(scenes));
  if (!ids.size) notes.push({ code: "empty", text: "No scenes" });
  for (const [id, scene] of Object.entries(scenes)) {
    if (!scene.backgroundAsset) {
      notes.push({ code: "no_plate", text: `${scene.name || id} has no background` });
    } else if (isStagingUrl(scene.backgroundAsset)) {
      notes.push({
        code: "cdn_plate_forbidden",
        text: `${scene.name || id} uses a third-party URL — replace with a registry semantic ID`,
      });
    }
    for (const instance of scene.poiInstances || []) {
      const place = (doc.places || []).find((item) => item.id === instance.archetypeID);
      if (!place) {
        notes.push({ code: "orphan_instance", text: `${instance.id} has no place` });
        continue;
      }
      if (isStagingUrl(place.exteriorAsset)) {
        notes.push({
          code: "cdn_plate_forbidden",
          text: `${place.name || place.id} exterior is a third-party URL`,
        });
      }
      if (place.interiorAsset && isStagingUrl(place.interiorAsset)) {
        notes.push({
          code: "cdn_plate_forbidden",
          text: `${place.name || place.id} interior is a third-party URL`,
        });
      }
      if (!behaviorOk(place.behavior)) {
        notes.push({ code: "bad_behavior", text: `${place.name}: ${place.behavior}` });
      }
      if (String(place.behavior || "").startsWith("travel:")) {
        const dest = place.behavior.slice("travel:".length);
        if (!ids.has(dest)) {
          notes.push({ code: "dangling_exit", text: `${place.name} → missing ${dest}` });
        }
      }
    }
  }
  return notes;
}

/**
 * Abbie's World MCP — Streamable HTTP (stateless JSON).
 * ChatGPT developer mode: Authentication OAuth (Auth0).
 * Discovery: /.well-known/oauth-protected-resource + 401 WWW-Authenticate.
 * Bearer from ChatGPT OAuth (aud = MCP URL) or Studio Copy MCP token / accessToken.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BEHAVIORS,
  behaviorOk,
  lintWorld,
  isSemanticAssetId,
  isStagingUrl,
} from "./lib/steel-rail.js";
import { planAuthorBeat, validatePlanAgainstWorld } from "./lib/author-beat.js";
import {
  createJob as createAssetJob,
  getJob as getAssetJob,
  completeJob as completeAssetJob,
  markBound as markAssetBound,
  listJobs as listAssetJobs,
  createProject as createAssetProject,
  getProject as getAssetProject,
  listProjects as listAssetProjects,
  describeLibrary as describeAssetLibrary,
} from "./lib/asset-jobs-store.js";

const ORIGIN = "http://abbies.world:8000";
const PROTOCOL = "2025-03-26";
const SERVER = { name: "abbies-world", version: "0.3.0" };
const MCP_PUBLIC_URL = "https://studio-mock-iota.vercel.app/mcp";
const OAUTH_RESOURCE_METADATA =
  "https://studio-mock-iota.vercel.app/.well-known/oauth-protected-resource";
const OAUTH_SCOPES = "openid profile email offline_access read:world write:world";

const IPAD_LAYOUT = `## How to create things the iPad can show

The iPad does not use the Studio map's pixel layout. It plays one scene at a time:

1. Scene = full-screen plate. Set backgroundAsset to a semantic id (map.*). Never a Midjourney/CDN https URL.
2. POIs sit on that plate at normalized coordinates: transform.position.x and .y from 0 to 1 (keep 0.12–0.88).
3. Connect scenes with a place whose behavior is travel:<otherSceneId>. That is the exit. There is no separate edge table on the iPad.
4. activeSceneID is where play starts.
5. New art: asset_job_create → Midjourney → asset_job_complete (ingests bytes onto our Game Asset server) → asset_bind(semanticId).

### POI capabilities (honest limit)
A POI is mostly how it looks plus which existing screen it opens.

You CAN set: name, exteriorAsset (picture), optional interiorAsset or rooms[].image, x/y, scale, and behavior.

behavior MUST be one of:
playerHome, cardFactory, furnitureStore, assetWorkbench, creatureLab, placeFactory,
threeBearsHouse, characterStudio, figurineExplorer, sceneBuilder, whizbang, planningDept,
rooms, decoration, plink, pegMonastery, fallingTargets:<configurationID>, travel:<sceneId>

You CANNOT invent dialogue, puzzles, quest scripts, or new screens. Story flavor lives in the name, the picture, travel, and session HUD/vars — not inside the POI.

Decorations are short labels (≤12 characters) plus a sprite. They are not interactive behaviors yet.

### Steel-rail habit
read_primer → world_describe → author_beat (dryRun) → confirm. Prefer semantic asset IDs over Midjourney URLs. Prefer asset_job_create for new plates. Low-level scene_upsert / place_upsert still work. Never wipe players.

### Asset generation habit (ChatGPT)
asset_project_create (library intent) → asset_job_create → copy midjourneyPrompt into Midjourney → paste https URL with asset_job_complete (server downloads + hosts on Game Asset registry) → asset_bind with semanticId only. Never set Midjourney/CDN URLs on scenes or POIs — the iPad must load from our registry.

### Dungeon master habit
read_primer first. world_describe before edits. scene_upsert, then scene_set_background_url when Evan pastes a URL, place_upsert for POIs, scene_connect for exits. vars_apply for counters (server does the math). Do not wipe players.
`;

function primerBody() {
  const candidates = [
    join(process.cwd(), "api", "mcp-primer.md"),
    join(process.cwd(), "mcp-primer.md"),
  ];
  for (const path of candidates) {
    try {
      return `${IPAD_LAYOUT}\n\n---\n\n${readFileSync(path, "utf8")}`;
    } catch {
      /* try the next location */
    }
  }
  return IPAD_LAYOUT;
}

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function tokenFrom(request, args) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ") && header.length > 16) return header.slice(7).trim();
  const arg = String(args?.accessToken || "").trim();
  if (arg.length > 16) return arg;
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  return env;
}

function wwwAuthenticate() {
  return `Bearer FAKESECRET_g3h4i5j6k7l8m9n0o1p2="${OAUTH_RESOURCE_METADATA}", scope="${OAUTH_SCOPES}"`;
}

function unauthorizedResponse(description = "No authorization provided") {
  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description: description,
    }),
    {
      status: 401,
      headers: cors({
        "Content-Type": "application/json",
        "WWW-Authenticate": wwwAuthenticate(),
      }),
    }
  );
}

function authRequired(id) {
  return rpcResult(id, {
    content: [{
      type: "text",
      text: JSON.stringify({
        error: "auth_required",
        hint: "Complete ChatGPT OAuth (Auth0), or pass Studio → Copy MCP token as accessToken / Authorization Bearer.",
        oauth_protected_resource: OAUTH_RESOURCE_METADATA,
      }),
    }],
    isError: true,
  });
}

function bearerPresent(request, body) {
  if (tokenFrom(request, {})) return true;
  if (Array.isArray(body)) {
    return body.some((msg) => tokenFrom(request, msg?.params?.arguments || {}));
  }
  return Boolean(tokenFrom(request, body?.params?.arguments || {}));
}

async function readWorld(auth) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    headers: { Authorization: `Bearer ${auth}` },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: "bad_upstream" }; }
  return { status: response.status, body };
}

async function writeWorld(auth, doc, expected) {
  const payload = { ...doc, expectedRevision: expected };
  delete payload.revision;
  if (!payload.players) {
    return { status: 409, body: { error: "players_missing" } };
  }
  const saved = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await saved.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: "bad_upstream" }; }
  return { status: saved.status, body };
}

async function mutate(auth, change) {
  const current = await readWorld(auth);
  if (current.status !== 200 || !current.body) return current;
  const expected = current.body.revision;
  const next = change(structuredClone(current.body));
  const extra = next.__mcp;
  const abort = next.__abort;
  delete next.__mcp;
  delete next.__abort;
  if (abort) {
    return { status: 200, body: { ...current.body, __mcp: extra } };
  }
  const edited = next.players;
  next.players = structuredClone(current.body.players);
  if (edited && next.players) {
    for (const id of Object.keys(next.players)) {
      if (edited[id] && typeof edited[id].gems === "number") {
        next.players[id].gems = edited[id].gems;
      }
    }
  }
  const saved = await writeWorld(auth, next, expected);
  if (saved.body && extra != null) saved.body.__mcp = extra;
  return saved;
}

function clamp01(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(0.88, Math.max(0.12, v));
}

function describe(doc) {
  const scenes = doc?.scenes || {};
  const places = doc?.places || [];
  const rows = Object.entries(scenes).map(([id, scene]) => {
    const pins = (scene.poiInstances || []).map((instance) => {
      const place = places.find((item) => item.id === instance.archetypeID) || {};
      const position = instance.transform?.position || {};
      return {
        instanceId: instance.id,
        placeId: instance.archetypeID,
        name: place.name || instance.archetypeID,
        behavior: place.behavior || "",
        x: position.x ?? null,
        y: position.y ?? null,
        exteriorAsset: place.exteriorAsset || "",
      };
    });
    return {
      id,
      name: scene.name,
      summary: scene.summary || "",
      backgroundAsset: scene.backgroundAsset || "",
      musicTrackID: scene.musicTrackID || "",
      placeholder: !!scene.isDeveloperPlaceholder,
      places: pins,
    };
  });
  return {
    revision: doc?.revision ?? null,
    activeSceneID: doc?.activeSceneID || null,
    sceneCount: rows.length,
    scenes: rows,
    live: doc?.creative?.live || null,
    vars: doc?.creative?.vars || null,
    poiLimit: "POIs are picture + whitelisted behavior + x/y. No custom gameplay scripts.",
  };
}

function ensureCreative(doc) {
  if (!doc.creative || typeof doc.creative !== "object") doc.creative = {};
  if (!doc.creative.scenes || typeof doc.creative.scenes !== "object") doc.creative.scenes = {};
  if (!doc.creative.live || typeof doc.creative.live !== "object") {
    doc.creative.live = { schemaVersion: 1, revision: 0, vars: {}, flags: {}, hud: {}, beat: null };
  }
  if (!doc.creative.vars || typeof doc.creative.vars !== "object") {
    doc.creative.vars = { session: {}, player: {}, world: {} };
  }
  return doc.creative;
}

function blankScene(id, name) {
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

function upsertScene(doc, args) {
  const id = String(args.sceneId || `scene.mcp${Date.now().toString(36)}`);
  doc.scenes = doc.scenes || {};
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
  doc.scenes[id] = scene;
  if (!doc.activeSceneID) doc.activeSceneID = id;
  return id;
}

function upsertPlace(doc, args) {
  const sceneId = String(args.sceneId || doc.activeSceneID || "");
  const scene = doc.scenes?.[sceneId];
  if (!scene) return { error: "scene_missing", sceneId };
  const behavior = String(args.behavior || "rooms");
  if (!behaviorOk(behavior)) {
    return { error: "behavior_rejected", behavior, allowed: [...BEHAVIORS, "travel:<sceneId>", "fallingTargets:<id>"] };
  }
  const placeId = String(args.placeId || `poi.mcp${Date.now().toString(36)}`);
  const instanceId = String(args.instanceId || `poiInstance.${placeId}`);
  doc.places = doc.places || [];
  let place = doc.places.find((item) => item.id === placeId);
  if (!place) {
    place = { id: placeId, name: "Place", behavior, exteriorAsset: "", rooms: [] };
    doc.places.push(place);
  }
  place.name = String(args.name || place.name || "Place").slice(0, 40);
  place.behavior = behavior;
  if (args.exteriorAsset != null) {
    const exterior = String(args.exteriorAsset).slice(0, 2000);
    if (isStagingUrl(exterior)) {
      return {
        error: "cdn_forbidden",
        detail: "exteriorAsset must be a semantic ID. Ingest with asset_job_complete first.",
      };
    }
    place.exteriorAsset = exterior;
  }
  if (args.interiorAsset != null) {
    const interior = String(args.interiorAsset).slice(0, 2000);
    if (isStagingUrl(interior)) {
      return {
        error: "cdn_forbidden",
        detail: "interiorAsset must be a semantic ID. Ingest with asset_job_complete first.",
      };
    }
    place.interiorAsset = interior;
  }
  if (!place.exteriorAsset && behavior.startsWith("travel:")) place.exteriorAsset = "poi.spookyPortal.exterior";
  const x = clamp01(args.x, 0.5);
  const y = clamp01(args.y, 0.62);
  const instance = {
    id: instanceId,
    archetypeID: placeId,
    sceneID: sceneId,
    transform: {
      position: { x, y },
      scale: Number.isFinite(Number(args.scale)) ? Number(args.scale) : 1,
      rotationDegrees: 0,
    },
    zIndex: 0,
    isAuthored: true,
    createdAt: new Date().toISOString(),
  };
  scene.poiInstances = (scene.poiInstances || []).filter((item) => item.id !== instanceId && item.archetypeID !== placeId);
  scene.poiInstances.push(instance);
  return { sceneId, placeId, instanceId, name: place.name, behavior, x, y };
}

function connectScenes(doc, args) {
  const from = String(args.fromSceneId || "");
  const to = String(args.toSceneId || "");
  if (!doc.scenes?.[from] || !doc.scenes?.[to]) return { error: "scene_missing", from, to };
  const go = upsertPlace(doc, {
    sceneId: from,
    name: args.label || `To ${doc.scenes[to].name}`,
    behavior: `travel:${to}`,
    x: args.x,
    y: args.y,
    exteriorAsset: args.exteriorAsset || "poi.spookyPortal.exterior",
  });
  let back = null;
  if (!args.oneWay) {
    back = upsertPlace(doc, {
      sceneId: to,
      name: args.returnLabel || `To ${doc.scenes[from].name}`,
      behavior: `travel:${from}`,
      x: args.returnX ?? 0.5,
      y: args.returnY ?? 0.2,
      exteriorAsset: "poi.spookyPortal.exterior",
    });
  }
  return { from, to, go, back };
}

function lint(doc) {
  return lintWorld(doc);
}

function scopeBag(doc, scope, playerId) {
  const creative = ensureCreative(doc);
  if (scope === "player") {
    const id = playerId || "player.abbie";
    creative.vars.player[id] = creative.vars.player[id] || {};
    return creative.vars.player[id];
  }
  if (scope === "world") {
    creative.vars.world = creative.vars.world || {};
    return creative.vars.world;
  }
  creative.live.vars = creative.live.vars || {};
  creative.vars.session = creative.live.vars;
  return creative.live.vars;
}

function applyOp(bag, op) {
  const key = String(op.key || "").slice(0, 40);
  if (!key) return { error: "key_required" };
  const kind = String(op.op || "");
  const current = bag[key];
  const num = Number(current ?? 0);
  if (kind === "set") {
    bag[key] = op.value;
    return { key, value: bag[key] };
  }
  if (!["inc", "dec", "add", "min", "max", "clamp"].includes(kind)) return { error: "bad_op", op: kind };
  if (typeof current === "boolean" || typeof current === "string") return { error: "not_numeric", key };
  const by = Number(op.by ?? op.value ?? 1);
  if (kind === "inc") bag[key] = num + (Number.isFinite(by) ? by : 1);
  if (kind === "dec") bag[key] = num - (Number.isFinite(by) ? by : 1);
  if (kind === "add") bag[key] = num + (Number.isFinite(by) ? by : 0);
  if (kind === "min") bag[key] = Math.min(num, Number(op.value));
  if (kind === "max") bag[key] = Math.max(num, Number(op.value));
  if (kind === "clamp") {
    bag[key] = Math.min(Number(op.max ?? num), Math.max(Number(op.min ?? num), num));
  }
  return { key, value: bag[key] };
}

function evalWhen(when, bag) {
  const match = String(when || "").trim().match(/^([A-Za-z0-9_.]+)\s*(>=|<=|==|>|<)\s*(true|false|-?\d+(?:\.\d+)?|"[^"]*")$/);
  if (!match) return false;
  const key = match[1].replace(/^flag\./, "");
  const op = match[2];
  let rhs = match[3];
  if (rhs === "true") rhs = true;
  else if (rhs === "false") rhs = false;
  else if (rhs.startsWith('"')) rhs = rhs.slice(1, -1);
  else rhs = Number(rhs);
  const lhs = bag[key];
  if (op === ">=") return Number(lhs) >= rhs;
  if (op === "<=") return Number(lhs) <= rhs;
  if (op === ">") return Number(lhs) > rhs;
  if (op === "<") return Number(lhs) < rhs;
  return lhs === rhs;
}

function applyEffects(doc, effects) {
  const live = ensureCreative(doc).live;
  live.hud = live.hud || {};
  live.flags = live.flags || {};
  const applied = [];
  for (const raw of effects || []) {
    const line = String(raw);
    if (line.startsWith("hud.objective=")) {
      live.hud.objective = line.slice("hud.objective=".length).slice(0, 80);
      applied.push(line);
    } else if (line.startsWith("hud.whisper=")) {
      live.hud.whisper = line.slice("hud.whisper=".length).slice(0, 120);
      applied.push(line);
    } else if (line.startsWith("flag.")) {
      const [k, v] = line.slice("flag.".length).split("=");
      live.flags[k] = v !== "false";
      applied.push(line);
    } else if (line.startsWith("highlight+=")) {
      live.hud.highlightPlaceIds = live.hud.highlightPlaceIds || [];
      live.hud.highlightPlaceIds.push(line.slice("highlight+=".length));
      applied.push(line);
    }
  }
  live.revision = (live.revision || 0) + 1;
  live.updatedAt = new Date().toISOString();
  return applied;
}

const TOOLS = [
  {
    name: "read_primer",
    description: "Dungeon-master primer plus how scenes and POIs show up on the iPad. Call this before authoring.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "poi_capabilities",
    description:
      "What a POI can and cannot do. Look + whitelisted behavior + position. No custom scripts. Includes pegMonastery, plink, travel:<sceneId>, and other closed behaviors.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "world_get_current",
    description: "Load the focused household world document (the iPad's /worlds/current).",
    inputSchema: {
      type: "object",
      properties: { accessToken: { type: "string", description: "Auth0 access token if Authorization header is absent" } },
    },
  },
  {
    name: "world_describe",
    description: "Compact map: scenes, plates, POIs with x/y and behavior, exits, live session, vars.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "world_list",
    description: "List worlds. Today there is only the focused /current world.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "world_create",
    description: "Multi-world create is not on the server yet. Without confirmReplace this explains that. With confirmReplace:true it replaces /current with an empty named scaffold and KEEPS players. Prefer scene_upsert to add a scene instead.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        name: { type: "string" },
        confirmReplace: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "world_set_current",
    description: "Set play/edit focus. Today only /current exists, so this acknowledges focus and does not switch documents.",
    inputSchema: {
      type: "object",
      properties: { accessToken: { type: "string" }, worldId: { type: "string" } },
    },
  },
  {
    name: "scene_upsert",
    description: "Create or update a scene the iPad can open: name, summary, optional backgroundAsset URL, optional musicTrackID. Positions of POIs are separate.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        name: { type: "string" },
        summary: { type: "string" },
        backgroundAsset: { type: "string" },
        musicTrackID: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "scene_set_background_url",
    description: "Attach a picture to a scene plate by semantic asset id only. For new Midjourney art use asset_job_complete (server host) then asset_bind — raw https URLs are rejected.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        url: { type: "string", description: "Deprecated — rejected. Use asset_job_complete." },
        semanticId: { type: "string", description: "map.* semantic id already on the registry" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "place_upsert",
    description: "Drop or update a POI on a scene. x and y are 0–1 on the plate. behavior must be an existing route or travel:<sceneId>. This does not add new gameplay — only look, position, and which built screen opens.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        placeId: { type: "string" },
        name: { type: "string" },
        behavior: { type: "string" },
        exteriorAsset: { type: "string" },
        interiorAsset: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        scale: { type: "number" },
      },
      required: ["sceneId", "name", "behavior"],
    },
  },
  {
    name: "scene_connect",
    description: "Link two scenes with travel POIs so the iPad can walk between them. oneWay skips the return portal.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        fromSceneId: { type: "string" },
        toSceneId: { type: "string" },
        label: { type: "string" },
        oneWay: { type: "boolean" },
        x: { type: "number" },
        y: { type: "number" },
      },
      required: ["fromSceneId", "toSceneId"],
    },
  },
  {
    name: "world_lint",
    description: "Check missing plates, bad behaviors, and exits that point nowhere.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "prompt_inspire_scene",
    description: "Write one Midjourney prompt for a scene plate. Evan pastes the image URL back; then call scene_set_background_url.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneName: { type: "string" },
        inspiration: { type: "string" },
        neighbors: { type: "array", items: { type: "string" } },
      },
      required: ["inspiration"],
    },
  },
  {
    name: "session_get",
    description: "Read live beat/HUD/flags stored on creative.live of the focused world. The iPad does not render Zeus HUD yet; the JSON is still the session record.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "session_patch",
    description: "Merge fields into creative.live (beat, hud, flags). Bumps live.revision.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        patch: { type: "object" },
      },
      required: ["patch"],
    },
  },
  {
    name: "vars_get",
    description: "Read counters. scope is session, player, or world. Server is source of truth.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        scope: { type: "string", enum: ["session", "player", "world"] },
        playerId: { type: "string" },
      },
    },
  },
  {
    name: "vars_apply",
    description: "Apply inc/dec/set/add/min/max/clamp and tiny gates. Do not do the math yourself. Narrate from the returned vars and effects. Gates: key >= n, flag == true|false.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        scope: { type: "string" },
        playerId: { type: "string" },
        ops: { type: "array" },
        gates: { type: "array" },
      },
      required: ["ops"],
    },
  },
  {
    name: "author_beat",
    description:
      "Steel-rail NL world builder. Pass intent; gets a closed-op plan. Defaults dryRun:true. Set confirm:true to execute. Never invents screens; never wipes players. Prefer this over freeform world edits.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        intent: { type: "string" },
        activeSceneHint: { type: "string" },
        dryRun: { type: "boolean" },
        confirm: { type: "boolean" },
      },
      required: ["intent"],
    },
  },
  {
    name: "asset_project_create",
    description:
      "Start an asset generation project: name + library intent (what pack of plates you are making). Returns projectId and suggested semantic IDs (e.g. peg monastery). Next: asset_job_create for each plate.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string", description: "Auth0 Bearer from Studio → Copy MCP token" },
        name: { type: "string", description: "Short project name, e.g. Peglin monastery pack" },
        libraryIntent: {
          type: "string",
          description: "What art pack to generate (subjects, mood, game area). Not a Midjourney prompt yet.",
        },
        stylePin: { type: "string", description: "Default abbies-world-storybook" },
        suggestedSemanticIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional explicit semantic ids to include",
        },
      },
      required: ["libraryIntent"],
    },
  },
  {
    name: "asset_library_describe",
    description:
      "Describe or refresh the library intent for a project (or create one if projectId omitted). Returns suggested semantic IDs for Game Asset registry keys. Use before creating jobs.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        projectId: { type: "string" },
        name: { type: "string" },
        libraryIntent: { type: "string" },
        stylePin: { type: "string" },
        suggestedSemanticIds: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "asset_project_status",
    description: "Read one asset project (or list recent projects if projectId omitted) including linked job ids.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        projectId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "asset_job_create",
    description:
      "Create a plate generation job. Pass semanticId (map.* or poi.*.exterior|interior) + brief. Returns midjourneyPrompt (paste into Midjourney) and proofBrief (what to check in the image). Optional projectId groups jobs. Next: asset_job_complete with the https image URL.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        semanticId: {
          type: "string",
          description: "e.g. poi.peglin.pegMonastery.exterior or map.peglin.crashLand",
        },
        kind: { type: "string", enum: ["map", "poi.exterior", "poi.interior"] },
        brief: { type: "string", description: "Subject + look in plain language" },
        stylePin: { type: "string" },
        projectId: { type: "string", description: "From asset_project_create" },
      },
      required: ["semanticId", "brief"],
    },
  },
  {
    name: "asset_job_list",
    description: "List recent asset generation jobs (newest first). Optional projectId filter.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        projectId: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "asset_job_status",
    description:
      "Read one asset job: status, midjourneyPrompt, proofBrief, stagingUrl, semanticId/registryKey.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "asset_job_complete",
    description:
      "Paste a temporary Midjourney (or other) https image URL. The MCP downloads the bytes and registers them on the Game Asset API under the job's semanticId/registryKey. Returns bindWith=semanticId. Never put the staging URL on a scene/POI.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        jobId: { type: "string" },
        stagingUrl: {
          type: "string",
          description: "Temporary https image URL — intake only; server re-hosts",
        },
      },
      required: ["jobId", "stagingUrl"],
    },
  },
  {
    name: "asset_bind",
    description:
      "Bind a registered semantic asset id onto a scene background or place exterior/interior. Rejects https/CDN URLs. Prefer after asset_job_complete. Optional jobId marks that job bound.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        semanticId: { type: "string" },
        sceneId: { type: "string" },
        placeId: { type: "string" },
        slot: { type: "string", enum: ["background", "exterior", "interior"] },
        jobId: { type: "string" },
      },
      required: ["semanticId"],
    },
  },
];

async function inspire(args) {
  const key = process.env.OPENAI_API_KEY || "";
  if (!key) return { error: "openai_missing" };
  const neighbors = Array.isArray(args.neighbors) ? args.neighbors.slice(0, 8).join(", ") : "";
  const user = [
    args.sceneName ? `Working title: ${args.sceneName}` : "",
    neighbors ? `Nearby: ${neighbors}` : "",
    `Idea:\n${String(args.inspiration || "").slice(0, 1200)}`,
    "Write one Midjourney prompt for a kids storybook plate. End with --ar 16:9 --stylize 250. No text in the image.",
  ].filter(Boolean).join("\n\n");
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4",
      temperature: 0.8,
      messages: [
        { role: "system", content: "Return only the Midjourney prompt." },
        { role: "user", content: user },
      ],
    }),
  });
  if (!upstream.ok) return { error: "inspire_failed", status: upstream.status };
  const payload = await upstream.json();
  return { prompt: payload?.choices?.[0]?.message?.content || "" };
}

function applyAssetBind(doc, args) {
  if (args.stagingUrl && !args.semanticId) {
    return {
      error: "cdn_forbidden",
      detail: "asset_bind requires semanticId. Staging URLs are intake-only via asset_job_complete.",
    };
  }
  const asset = String(args.semanticId || "").trim();
  if (!asset) return { error: "semantic_id_required" };
  if (isStagingUrl(asset)) {
    return {
      error: "cdn_forbidden",
      detail: "Do not bind Midjourney/CDN URLs. Ingest with asset_job_complete, then bind the semanticId.",
    };
  }
  if (!isSemanticAssetId(asset)) {
    return { error: "semantic_id_invalid", semanticId: asset };
  }
  const slot = String(args.slot || (args.sceneId ? "background" : "exterior"));
  if (slot === "background") {
    const sceneId = String(args.sceneId || doc.activeSceneID || "");
    const scene = doc.scenes?.[sceneId];
    if (!scene) return { error: "scene_missing", sceneId };
    scene.backgroundAsset = asset.slice(0, 200);
    scene.isDeveloperPlaceholder = !scene.backgroundAsset;
    return { bound: "background", sceneId, asset, warnings: [] };
  }
  const placeId = String(args.placeId || "");
  const place = (doc.places || []).find((item) => item.id === placeId);
  if (!place) return { error: "place_missing", placeId };
  if (slot === "interior") place.interiorAsset = asset.slice(0, 200);
  else place.exteriorAsset = asset.slice(0, 200);
  return { bound: slot, placeId, asset, warnings: [] };
}

async function runAuthorBeat(auth, args) {
  const intent = String(args.intent || "").trim();
  if (!intent) return { error: "intent_required" };
  const dryRun = args.confirm === true ? false : args.dryRun !== false;
  const current = await readWorld(auth);
  if (current.status !== 200) return { error: "world_unavailable", status: current.status };

  const snapshot = describe(current.body);
  const planned = await planAuthorBeat({
    intent,
    describe: snapshot,
    activeSceneHint: args.activeSceneHint,
    openaiKey: process.env.OPENAI_API_KEY || "",
  });
  if (planned?.error) return planned;

  const validated = validatePlanAgainstWorld(planned, current.body);
  if (!validated.ok) {
    return {
      executed: false,
      dryRun: true,
      narration: planned.narration || "",
      ...validated,
    };
  }

  const response = {
    executed: false,
    dryRun,
    narration: planned.narration || "",
    plan: { ops: validated.ops },
    rails: validated.rails,
    warnings: [...(validated.warnings || []), ...(planned.warnings || [])],
    lintBefore: lint(current.body),
  };

  if (dryRun) {
    response.hint = "Pass confirm:true to execute this plan.";
    return response;
  }

  // Side-channel jobs before world mutate (asset store is not the world doc).
  for (const step of validated.ops) {
    if (step.op === "asset.job_create") {
      step._jobResult = await createAssetJob(step.args, {
        openaiKey: process.env.OPENAI_API_KEY || "",
      });
    }
  }

  const results = [];
  const saved = await mutate(auth, (doc) => {
    for (const step of validated.ops) {
      const applied = applyAuthorOp(doc, step);
      results.push(applied);
      if (applied?.error) {
        doc.__abort = true;
        doc.__mcp = { error: "op_failed", step, applied, results };
        return doc;
      }
    }
    doc.__mcp = { results, lint: lint(doc) };
    return doc;
  });

  if (saved.status === 409) return { error: "revision_conflict", body: saved.body };
  if (saved.status !== 200) return { error: "save_failed", status: saved.status, body: saved.body };
  const extra = saved.body.__mcp;
  if (saved.body.__mcp) delete saved.body.__mcp;
  if (extra?.error) return { ...response, ...extra, executed: false };

  return {
    ...response,
    executed: true,
    dryRun: false,
    revision: saved.body.revision,
    results: extra?.results || results,
    lintAfter: extra?.lint || lint(saved.body),
    summary: describe(saved.body),
  };
}

function applyAuthorOp(doc, step) {
  const { op, args } = step;
  if (op === "scene.upsert") {
    const id = upsertScene(doc, args);
    return { op, sceneId: id };
  }
  if (op === "scene.set_background_semantic" || op === "scene.set_background_url") {
    const sceneId = String(args.sceneId || doc.activeSceneID || "");
    const scene = doc.scenes?.[sceneId];
    if (!scene) return { error: "scene_missing", sceneId };
    const asset = String(args.semanticId || args.backgroundAsset || "").slice(0, 200);
    if (!asset) return { error: "semantic_id_required" };
    if (isStagingUrl(asset) || args.url) {
      return {
        error: "cdn_forbidden",
        detail: "Use asset_job_complete to host art, then scene.set_background_semantic / asset_bind with semanticId.",
      };
    }
    if (!isSemanticAssetId(asset)) return { error: "semantic_id_invalid", semanticId: asset };
    scene.backgroundAsset = asset;
    scene.isDeveloperPlaceholder = !asset;
    return { op, sceneId, asset };
  }
  if (op === "place.upsert") {
    return { op, ...upsertPlace(doc, args) };
  }
  if (op === "scene.connect") {
    return { op, ...connectScenes(doc, args) };
  }
  if (op === "asset.job_create") {
    const job = step._jobResult;
    if (job?.error) return { error: job.error, op, detail: job };
    return { op, job };
  }
  if (op === "asset.bind") {
    return { op, ...applyAssetBind(doc, args) };
  }
  if (op === "vars.apply") {
    const scope = args.scope || "session";
    const bag = scopeBag(doc, scope, args.playerId);
    const appliedOps = [];
    for (const item of args.ops || []) {
      appliedOps.push(applyOp(item.scope ? scopeBag(doc, item.scope, item.playerId || args.playerId) : bag, item));
    }
    return { op, appliedOps, vars: bag };
  }
  if (op === "session.patch") {
    const live = ensureCreative(doc).live;
    Object.assign(live, args.patch || {});
    live.revision = (live.revision || 0) + 1;
    live.updatedAt = new Date().toISOString();
    return { op, liveRevision: live.revision };
  }
  return { error: "unknown_op", op };
}

async function callTool(name, args, request) {
  if (name === "read_primer") return { text: primerBody() };
  if (name === "poi_capabilities") {
    return {
      can: ["name", "exteriorAsset", "interiorAsset", "x", "y", "scale", "behavior from whitelist", "travel:<sceneId>"],
      cannot: ["custom dialogue", "puzzles", "new screens", "freeform scripts"],
      behaviors: [...BEHAVIORS, "travel:<sceneId>", "fallingTargets:<configurationID>"],
      layout: "x and y are 0–1 on the scene plate. The iPad shows that plate full screen.",
    };
  }

  const auth = tokenFrom(request, args);
  if (!auth) return { error: "auth_required" };

  if (name === "prompt_inspire_scene") return inspire(args);

  if (name === "asset_project_create") {
    return createAssetProject(args);
  }
  if (name === "asset_library_describe") {
    return describeAssetLibrary(args);
  }
  if (name === "asset_project_status") {
    if (args.projectId) {
      const project = getAssetProject(args.projectId);
      return project || { error: "project_missing", projectId: args.projectId };
    }
    return { projects: listAssetProjects({ limit: args.limit }) };
  }
  if (name === "asset_job_create") {
    return createAssetJob(args, { openaiKey: process.env.OPENAI_API_KEY || "" });
  }
  if (name === "asset_job_list") {
    return { jobs: listAssetJobs({ projectId: args.projectId, limit: args.limit }) };
  }
  if (name === "asset_job_status") {
    const job = getAssetJob(args.jobId);
    return job || { error: "job_missing", jobId: args.jobId };
  }
  if (name === "asset_job_complete") {
    return completeAssetJob(args.jobId, { stagingUrl: args.stagingUrl });
  }

  if (name === "author_beat") {
    return runAuthorBeat(auth, args);
  }

  if (name === "world_get_current") {
    const current = await readWorld(auth);
    if (current.status !== 200) return { error: "world_unavailable", status: current.status, body: current.body };
    return current.body;
  }
  if (name === "world_describe" || name === "world_lint" || name === "world_list" || name === "session_get" || name === "vars_get") {
    const current = await readWorld(auth);
    if (current.status !== 200) return { error: "world_unavailable", status: current.status };
    if (name === "world_describe") return describe(current.body);
    if (name === "world_lint") return { revision: current.body.revision, notes: lint(current.body) };
    if (name === "world_list") {
      return {
        worlds: [{
          id: "current",
          name: current.body?.scenes?.[current.body.activeSceneID]?.name || "Current world",
          revision: current.body.revision,
          isCurrent: true,
        }],
        note: "Multi-world list is not on the server yet. Focus is /worlds/current.",
      };
    }
    if (name === "session_get") return ensureCreative(structuredClone(current.body)).live;
    const scope = args.scope || "session";
    const bag = scopeBag(structuredClone(current.body), scope, args.playerId);
    return { scope, vars: bag };
  }

  if (name === "world_set_current") {
    return {
      focused: "current",
      requested: args.worldId || "current",
      note: "Only one world document exists. Focus stays on /worlds/current until multi-world ships.",
    };
  }

  if (name === "world_create" && !args.confirmReplace) {
    const current = await readWorld(auth);
    if (current.status !== 200) return { error: "world_unavailable", status: current.status };
    return {
      error: "multi_world_not_shipped",
      hint: "Add a scene with scene_upsert. Pass confirmReplace:true only to wipe /current into a new scaffold (players kept).",
      current: describe(current.body),
    };
  }

  const saved = await mutate(auth, (doc) => {
    if (name === "world_create") {
      if (!args.confirmReplace) return doc;
      const id = "scene.home";
      doc.scenes = { [id]: blankScene(id, args.name || "New world") };
      doc.places = [];
      doc.activeSceneID = id;
      doc.creative = { scenes: {}, live: { schemaVersion: 1, revision: 0, vars: {}, flags: {}, hud: {} }, vars: { session: {}, player: {}, world: {} } };
      return doc;
    }
    if (name === "scene_upsert") {
      upsertScene(doc, args);
      return doc;
    }
    if (name === "scene_set_background_url") {
      const scene = doc.scenes?.[args.sceneId];
      if (!scene) {
        doc.__mcp = { error: "scene_missing", sceneId: args.sceneId };
        doc.__abort = true;
        return doc;
      }
      const asset = String(args.semanticId || "").trim();
      if (!asset || isStagingUrl(asset) || args.url) {
        doc.__mcp = {
          error: "cdn_forbidden",
          detail:
            "scene_set_background_url no longer accepts https. Use asset_job_complete to host, then asset_bind / pass semanticId.",
        };
        doc.__abort = true;
        return doc;
      }
      if (!isSemanticAssetId(asset)) {
        doc.__mcp = { error: "semantic_id_invalid", semanticId: asset };
        doc.__abort = true;
        return doc;
      }
      scene.backgroundAsset = asset.slice(0, 200);
      scene.isDeveloperPlaceholder = !scene.backgroundAsset;
      return doc;
    }
    if (name === "place_upsert") {
      const placed = upsertPlace(doc, args);
      doc.__mcp = placed;
      if (placed?.error) doc.__abort = true;
      return doc;
    }
    if (name === "scene_connect") {
      const linked = connectScenes(doc, args);
      doc.__mcp = linked;
      if (linked?.error) doc.__abort = true;
      return doc;
    }
    if (name === "session_patch") {
      const live = ensureCreative(doc).live;
      Object.assign(live, args.patch || {});
      live.revision = (live.revision || 0) + 1;
      live.updatedAt = new Date().toISOString();
      return doc;
    }
    if (name === "asset_bind") {
      const bound = applyAssetBind(doc, args);
      if (!bound?.error && args.jobId) {
        const marked = markAssetBound(args.jobId);
        if (marked?.error) {
          doc.__mcp = marked;
          doc.__abort = true;
          return doc;
        }
        bound.job = marked;
      }
      doc.__mcp = bound;
      if (bound?.error) doc.__abort = true;
      return doc;
    }
    if (name === "vars_apply") {
      const scope = args.scope || "session";
      const bag = scopeBag(doc, scope, args.playerId);
      const appliedOps = [];
      for (const op of args.ops || []) {
        const target = op.scope ? scopeBag(doc, op.scope, op.playerId || args.playerId) : bag;
        appliedOps.push(applyOp(target, op));
        if (op.scope === "player" && op.key === "gems" && args.playerId && doc.players?.[args.playerId]) {
          const gems = target.gems;
          if (typeof gems === "number") doc.players[args.playerId].gems = gems;
        }
      }
      const effects = [];
      for (const gate of args.gates || []) {
        if (evalWhen(gate.when, bag)) effects.push(...(gate.then || []));
      }
      const appliedEffects = applyEffects(doc, effects);
      doc.__mcp = { appliedOps, effects: appliedEffects, vars: bag };
      return doc;
    }
    return doc;
  });

  if (saved.status === 409) return { error: "revision_conflict", body: saved.body };
  if (saved.status !== 200) return { error: "save_failed", status: saved.status, body: saved.body };

  const extra = saved.body.__mcp;
  if (saved.body.__mcp) delete saved.body.__mcp;
  if (extra?.error) return extra;
  return {
    revision: saved.body.revision,
    summary: describe(saved.body),
    result: extra || null,
    hudNote: "Session JSON is stored on creative.live. The iPad does not draw Zeus HUD chips yet.",
  };
}

function toolText(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: "text", text: text.slice(0, 100000) }],
    isError: !!(value && typeof value === "object" && (value.error === "auth_required" || value.error)),
  };
}

async function handleRpc(message, request) {
  const { id, method, params } = message;
  if (!method) return rpcError(id ?? null, -32600, "Invalid request");
  if (String(method).startsWith("notifications/")) return null;

  if (method === "initialize") {
    const requested = params?.protocolVersion || PROTOCOL;
    return rpcResult(id, {
      protocolVersion: requested === "2025-06-18" ? requested : PROTOCOL,
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
      serverInfo: SERVER,
      instructions: IPAD_LAYOUT,
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
  if (method === "resources/list") {
    return rpcResult(id, {
      resources: [
        {
          uri: "abbies-world://primer",
          name: "Dungeon master primer",
          mimeType: "text/markdown",
          description: "Zeus primer plus iPad scene/POI layout",
        },
      ],
    });
  }
  if (method === "resources/read") {
    return rpcResult(id, {
      contents: [{ uri: params?.uri || "abbies-world://primer", mimeType: "text/markdown", text: primerBody() }],
    });
  }
  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    if (!TOOLS.some((tool) => tool.name === name)) return rpcError(id, -32602, `Unknown tool ${name}`);
    try {
      const value = await callTool(name, args, request);
      if (value?.error === "auth_required") return rpcResult(id, toolText(value));
      return rpcResult(id, toolText(value));
    } catch (error) {
      return rpcResult(id, toolText({ error: "tool_failed", detail: String(error?.message || error) }));
    }
  }
  return rpcError(id ?? null, -32601, `Method not found: ${method}`);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET() {
  return json({
    name: SERVER.name,
    version: SERVER.version,
    protocol: PROTOCOL,
    transport: "streamable-http",
    url: MCP_PUBLIC_URL,
    oauth: {
      protected_resource: OAUTH_RESOURCE_METADATA,
      authorization_server: "https://dev-33h7qd4ytudlk0ls.us.auth0.com",
      client_id: "7AAx3t0fgolUT125oBNGICidhAW0rVY9",
    },
    chatgpt: {
      developerMode: "ChatGPT → Settings → Security and login → Developer mode ON",
      create: "https://developers.openai.com/plugins (or chatgpt.com/plugins) → +",
      mcpUrl: MCP_PUBLIC_URL,
      authentication: "OAuth",
      clientId: "7AAx3t0fgolUT125oBNGICidhAW0rVY9",
      authorizationServer: "https://dev-33h7qd4ytudlk0ls.us.auth0.com",
      audience: MCP_PUBLIC_URL,
    },
    tools: TOOLS.map((tool) => tool.name),
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return unauthorizedResponse("Parse error / missing body");
  }
  // ChatGPT OAuth discovery expects HTTP 401 + WWW-Authenticate when unauthenticated
  // (same pattern as StoryBoard MCP). Cursor sends Authorization via mcp.json.
  if (!bearerPresent(request, body)) {
    return unauthorizedResponse("No authorization provided");
  }
  if (Array.isArray(body)) {
    const out = [];
    for (const message of body) {
      const result = await handleRpc(message, request);
      if (result) out.push(result);
    }
    if (!out.length) return new Response(null, { status: 202, headers: cors() });
    return json(out);
  }
  const result = await handleRpc(body, request);
  if (!result) return new Response(null, { status: 202, headers: cors() });
  return json(result);
}

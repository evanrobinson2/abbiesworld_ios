/**
 * Abbie's World MCP — Streamable HTTP (stateless JSON).
 * ChatGPT developer mode: Authentication OAuth (Auth0).
 * Discovery: /.well-known/oauth-protected-resource + 401 WWW-Authenticate.
 * Bearer from ChatGPT OAuth (aud = MCP URL) or Studio Copy MCP token / accessToken.
 * World upstream requires household aud `https://api.abbies.world` — ChatGPT MCP
 * tokens are bridged via ABBIES_WORLD_TOKEN on Studio (same as phone review proxy).
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
  generateJob as generateAssetJob,
  markBound as markAssetBound,
  listJobs as listAssetJobs,
  createProject as createAssetProject,
  getProject as getAssetProject,
  listProjects as listAssetProjects,
  describeLibrary as describeAssetLibrary,
  ingestImage as ingestAssetImage,
  IMAGE_MODEL,
} from "./lib/asset-jobs-store.js";
import {
  buildMission,
  describeMission,
  attachProof,
  approveProof,
  rejectProof,
  upsertMissionOnDoc,
  getMissionFromDoc,
  listMissionsFromDoc,
  hydrateFromWorld,
  ensureArtRequirement,
  deckFromMission,
  requestMinigame,
  listEngAutoDispatch,
  appendMissionFeedback,
} from "./lib/missions-store.js";
import { notifyMinigameMaker } from "./lib/eng-dispatch-webhook.js";
import { notifyProofsReady } from "./lib/push.js";
import { galleryMarkdown, unapprovedImageGallery } from "./lib/proof-display.js";
import {
  blankScene,
  upsertScene,
  removePlace,
  deleteScene,
  verifyAuthorPostconditions,
  narrationFromVerified,
  restoreGraph,
  normalizeSceneArgs,
} from "./lib/world-ops.js";
import {
  createTroubleTicket,
  getTroubleTicket,
  listTroubleTickets,
  commentTroubleTicket,
  updateTroubleTicketStatus,
  setTicketGithubUrl,
} from "./lib/trouble-tickets.js";
import { summarize as summarizeExecutionCapacity } from "./lib/execution-capacity-store.js";

const ORIGIN = "http://abbies.world:8000";
const PROTOCOL = "2025-03-26";
const SERVER = { name: "abbies-world", version: "0.6.3" };
const HOUSEHOLD_AUDIENCE = "https://api.abbies.world";
const PLATE_BASE = "https://studio-mock-iota.vercel.app/api/plate";
const REVIEW_BASE = "https://studio-mock-iota.vercel.app/review.html";
const MCP_PUBLIC_URL = "https://studio-mock-iota.vercel.app/mcp";
const OAUTH_RESOURCE_METADATA =
  "https://studio-mock-iota.vercel.app/.well-known/oauth-protected-resource";
const OAUTH_SCOPES = "openid profile email offline_access read:world write:world";

const COMMAND_CARD = `## Exposed commands (these ARE on this MCP)

DELETE / REMOVE a POI: place_remove or place_delete (sceneId + placeId, instanceId, or name). Never rewrite a scene to drop a pin.
DELETE a scene: scene_delete (scene.home is protected). Use this for accidental scene.mcp* objects.
FEEDBACK / BUG REPORT / ISSUE / TROUBLE TICKET: feedback_report or bug_report or trouble_ticket_create. Writes durable AW-N on household creative.troubleQueue — not chat text. Then trouble_ticket_list / trouble_ticket_get.
INGEST ART: asset_ingest (imageBase64, OpenAI fileId, or https fileUrl + semanticId + kind) → sanity + Game Asset registry → bindWith. Do not host a temporary CDN URL first.
NL world edit: author_beat (dryRun first; confirm:true executes; postconditions roll back lies).
MJ WORKER ALIVE: execution_capacity_status or mj_workers_alive. Count of Midjourney pull workers seen in the last 5 minutes (creative.executionCapacity.workers lastSeenAt). Also on GET /api/execution-capacity and midjourney_fill.

`;

const IPAD_LAYOUT = `${COMMAND_CARD}## How to create things the iPad can show

The iPad does not use the Studio map's pixel layout. It plays one scene at a time:

1. Scene = full-screen plate. Set backgroundAsset to a semantic id (map.*). Never a Midjourney/CDN https URL.
2. POIs sit on that plate at normalized coordinates: transform.position.x and .y from 0 to 1 (keep 0.12–0.88).
3. Connect scenes with a place whose behavior is travel:<otherSceneId>. That is the exit. There is no separate edge table on the iPad.
4. activeSceneID is where play starts.
5. New art: asset_ingest (hand the image bytes / fileId) or asset_job_create (server generates) → registered semantic id → asset_bind. Optional: generate:false + asset_job_complete with a temporary https URL.

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
read_primer → world_describe → author_beat (dryRun) → confirm. Prefer semantic asset IDs. Prefer asset_job_create for new plates. To drop a POI use place_remove / author_beat place.remove — never rewrite a scene. scene_upsert requires sceneId to update; omitting it creates a new scene. Accidents → scene_delete + trouble_ticket_create. Never wipe players.

### Mission habit (durable intent)
Talk that should survive chat death → mission_create (narrative). Resume with mission_describe. Unapproved proof/harvest images come back as public displayUrl markdown — show them in chat. Vet via mission_attach_proof + mission_approve_proof (candidate index). Leave durable taste/direction with mission_feedback (does not Board/Dump by itself). New minigames → mission_request_minigame (tight design). If MINIGAME_MAKER_WEBHOOK_URL is unset, response is honest: saved, blocked: builder not configured — do not imply a worker started. Eng workers open PR (no merge) when the builder is configured — even hard physics puzzlers. Missions live on the household world (creative.missionOs) — not in the chat. Do not mark playable from workers.

### Trouble tickets (durable developer queue)
When an MCP mutation lies (dry-run looks right, execute reports success, world unchanged, extra objects appear), call trouble_ticket_create. That writes AW-N on household creative.troubleQueue — not chat text. Include expected/actual, relatedIds, plan, results, requestedCleanup. Then trouble_ticket_get / trouble_ticket_list. Do not claim the world changed unless postconditions passed.

### Asset generation habit (ChatGPT MCP)
asset_ingest (imageBase64 / fileId / https fileUrl + semanticId + kind → Game Asset registry + sanity + bindWith) or asset_project_create (optional) → asset_job_create with semanticId + brief (server writes imagePrompt, calls OpenAI gpt-image-2.5-sunburst, ingests to Game Asset registry, runs subject/framing sanity, returns registered or needs_review) → asset_bind only when registered. Prefer semantic asset IDs. Never put CDN/Midjourney URLs on scenes or POIs. Midjourney paste remains available via generate:false then asset_job_complete (same sanity). Override model with ASSET_IMAGE_MODEL (e.g. gpt-image-2.5-flare). See docs/architecture/ASSET_SANITY_CORPUS.md.

### Midjourney (pull worker — no tunnel)
Check workers first: execution_capacity_status / mj_workers_alive (count seen in last 5 minutes). midjourney_fill enqueues on household creative.executionCapacity and returns the same alive count. The Mac sailboat worker pulls the job outbound, runs Chrome Midjourney, reports candidate URLs. No MJ_WORKER_URL tunnel. Local Mac can also /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh submit. Poll job via GET /api/execution-capacity?jobId=… or MCP follow-up. Contract: /Users/evanrobinson/abbies.world.ios/docs/architecture/EXECUTION_CAPACITY.md.


### Dungeon master habit
read_primer first. world_describe before edits. place_upsert for POIs, place_remove to drop a pin, scene_connect for exits. vars_apply for counters (server does the math). Do not wipe players. Operational failures → trouble_ticket_create (durable AW-N queue on the household world).
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

function presentedToken(request, args) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ") && header.length > 16) {
    const token = header.slice(7).trim();
    // Cursor sometimes sends the literal uninterpolated ${env:…} string.
    if (token.includes("${") || token.includes("ABBIES_WORLD_TOKEN")) return "";
    return token;
  }
  const arg = String(args?.accessToken || "").trim();
  return arg.length > 16 ? arg : "";
}

function tokenFrom(request, args) {
  const presented = presentedToken(request, args);
  if (presented) return presented;
  return String(process.env.ABBIES_WORLD_TOKEN || "").trim();
}

/** Decode JWT payload without verify — only for aud routing. */
function jwtAudiences(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return [];
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(b64 + pad, "base64").toString("utf8"));
    const aud = payload?.aud;
    if (Array.isArray(aud)) return aud.map(String);
    if (aud) return [String(aud)];
  } catch {
    /* ignore */
  }
  return [];
}

function tokenHasHouseholdAudience(token) {
  return jwtAudiences(token).includes(HOUSEHOLD_AUDIENCE);
}

/**
 * Token for game-server world reads/writes.
 * ChatGPT OAuth mints aud=MCP URL; household API only accepts api.abbies.world.
 * When the presented token is MCP-only, use Studio ABBIES_WORLD_TOKEN.
 */
function worldTokenFrom(request, args) {
  const presented = presentedToken(request, args);
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (presented && tokenHasHouseholdAudience(presented)) return presented;
  if (env && (env === "[SENSITIVE]" || env.includes("${"))) {
    /* ignore bad env placeholders */
  } else if (env) {
    return env;
  }
  return presented || tokenFrom(request, args);
}

function prefersHeaderAuth(request) {
  return String(request.headers.get("x-abbies-auth") || "").toLowerCase() === "bearer";
}

function wwwAuthenticate() {
  return `Bearer FAKESECRET_g3h4i5j6k7l8m9n0o1p2="${OAUTH_RESOURCE_METADATA}", scope="${OAUTH_SCOPES}"`;
}

function unauthorizedResponse(description = "No authorization provided", { challengeOAuth = true } = {}) {
  const headers = cors({ "Content-Type": "application/json" });
  // Cursor with X-Abbies-Auth: bearer should not be pushed into OAuth (it hangs).
  if (challengeOAuth) headers["WWW-Authenticate"] = wwwAuthenticate();
  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description: description,
      hint: challengeOAuth
        ? "Complete OAuth, or pass Studio → Copy MCP token as Authorization Bearer."
        : "Set Authorization Bearer (run scripts/sync_cursor_mcp_token.sh). Do not use OAuth for Cursor.",
    }),
    { status: 401, headers }
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
  if (response.status === 401 || response.status === 403) {
    return {
      status: response.status,
      body,
      hint: tokenHasHouseholdAudience(auth)
        ? "Household token rejected — refresh Studio → Copy MCP token into ABBIES_WORLD_TOKEN."
        : "Token audience is not https://api.abbies.world. Studio needs ABBIES_WORLD_TOKEN (household) for ChatGPT world tools.",
    };
  }
  return { status: response.status, body };
}

async function listWorldsUpstream(auth) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds`, {
    headers: { Authorization: `Bearer ${auth}` },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: "bad_upstream" }; }
  return { status: response.status, body };
}

async function createWorldUpstream(auth, name) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: "bad_upstream" }; }
  return { status: response.status, body };
}

async function setCurrentWorldUpstream(auth, worldId) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ worldId }),
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
    mjWorkersAliveLast5Minutes: summarizeExecutionCapacity(doc).mjWorkersAliveLast5Minutes,
    can: {
      deletePlace: "place_remove",
      deleteScene: "scene_delete",
      feedback: "feedback_report",
      bugReport: "bug_report",
      troubleTicket: "trouble_ticket_create",
      ingest: "asset_ingest",
      mjWorkersAlive: "execution_capacity_status",
    },
  };
}

function strictSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  const out = { ...schema };
  if (out.type === "array") {
    out.items = strictSchema(out.items || { type: "object", additionalProperties: true });
  }
  if (out.type === "object") {
    const props = out.properties && typeof out.properties === "object" ? out.properties : {};
    out.properties = Object.fromEntries(
      Object.entries(props).map(([key, value]) => [key, strictSchema(value)])
    );
    if (out.additionalProperties == null) out.additionalProperties = true;
  }
  return out;
}

export function publicTools() {
  return TOOLS.map((tool) => ({
    ...tool,
    inputSchema: strictSchema(tool.inputSchema || { type: "object", properties: {} }),
  }));
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
      "What a POI can and cannot do. Look + whitelisted behavior + position. No custom scripts. Includes pegMonastery, plink, travel:<sceneId>, and other closed behaviors. DELETE a pin with place_remove / place_delete. FEEDBACK / bug report: feedback_report.",
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
    description: "Compact map: scenes, plates, POIs with x/y and behavior, exits, live session, vars. Includes can.deletePlace / can.feedback tool names.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "world_list",
    description: "List household worlds (id, name, revision, isCurrent). Focus is /worlds/current.",
    inputSchema: { type: "object", properties: { accessToken: { type: "string" } } },
  },
  {
    name: "world_create",
    description: "Create a new empty world document, copy players from the focused world, and set focus to the new id. Prefer this over wiping /current.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        name: { type: "string" },
        confirmReplace: {
          type: "boolean",
          description: "Legacy: if true and multi-world create fails, wipe /current into a scaffold (players kept).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "world_set_current",
    description: "Set play/edit focus to worldId. /worlds/current then returns that document.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        worldId: { type: "string" },
      },
      required: ["worldId"],
    },
  },
  {
    name: "scene_upsert",
    description: "Create or update a scene the iPad can open. To UPDATE, pass sceneId (not id). Omitting sceneId creates a new scene. This does not add or remove POIs — use place_upsert / place_remove.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string", description: "Existing scene to update. Alias: id. Required to avoid minting scene.mcp*." },
        id: { type: "string", description: "Alias for sceneId (normalized server-side)." },
        name: { type: "string" },
        summary: { type: "string" },
        backgroundAsset: { type: "string" },
        musicTrackID: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "place_remove",
    description: "DELETE/REMOVE a POI pin from one scene. Does not delete the catalog row or other scenes. Pass sceneId plus placeId, instanceId, or name. Alias: place_delete.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        placeId: { type: "string" },
        instanceId: { type: "string" },
        name: { type: "string" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "place_delete",
    description: "DELETE a POI from a scene. Same as place_remove. Pass sceneId plus placeId, instanceId, or name.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        placeId: { type: "string" },
        instanceId: { type: "string" },
        name: { type: "string" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "scene_delete",
    description: "DELETE a scene. Refuses scene.home unless confirmHome:true. Refuses deleting the last scene. Use this to remove accidental scene.mcp* objects.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        sceneId: { type: "string" },
        confirmHome: { type: "boolean" },
      },
      required: ["sceneId"],
    },
  },
  {
    name: "feedback_report",
    description:
      "FEEDBACK / BUG REPORT / ISSUE. Files a durable developer trouble ticket (AW-N) on household creative.troubleQueue — not chat text. Alias of trouble_ticket_create. Use when MCP lies, world state is wrong, or cleanup is needed.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        severity: { type: "string", description: "low | medium | high | critical" },
        surface: { type: "string", description: "chatgpt | cursor | studio | ipad | mcp" },
        operation: { type: "string", description: "e.g. author_beat, scene_upsert" },
        expectedBehavior: { type: "string" },
        actualBehavior: { type: "string" },
        worldRevision: { type: "number" },
        relatedIds: { type: "array", items: { type: "string" } },
        diagnosticContext: { type: "object", additionalProperties: true },
        requestedCleanup: { type: "string" },
        plan: { type: "object", additionalProperties: true },
        results: { type: "array", items: { type: "object", additionalProperties: true } },
        stateDiff: { type: "object", additionalProperties: true },
        lint: { type: "array", items: { type: "object", additionalProperties: true } },
        error: { type: "string" },
        beforeRevision: { type: "number" },
        afterRevision: { type: "number" },
      },
      required: ["title"],
    },
  },
  {
    name: "bug_report",
    description:
      "BUG REPORT / trouble ticket / issue. Same as feedback_report and trouble_ticket_create. Writes AW-N on creative.troubleQueue for developers to review.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        severity: { type: "string" },
        surface: { type: "string" },
        operation: { type: "string" },
        expectedBehavior: { type: "string" },
        actualBehavior: { type: "string" },
        worldRevision: { type: "number" },
        relatedIds: { type: "array", items: { type: "string" } },
        diagnosticContext: { type: "object", additionalProperties: true },
        requestedCleanup: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "trouble_ticket_create",
    description:
      "File a durable developer trouble ticket (AW-N) on the household world creative.troubleQueue. FEEDBACK / bug report / issue. Not chat text — developers review this queue. Attach plan/results/diff when you have them.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        severity: { type: "string", description: "low | medium | high | critical" },
        surface: { type: "string", description: "chatgpt | cursor | studio | ipad | mcp" },
        operation: { type: "string", description: "e.g. author_beat, scene_upsert" },
        expectedBehavior: { type: "string" },
        actualBehavior: { type: "string" },
        worldRevision: { type: "number" },
        relatedIds: { type: "array", items: { type: "string" } },
        diagnosticContext: { type: "object", additionalProperties: true },
        requestedCleanup: { type: "string" },
        plan: { type: "object", additionalProperties: true },
        results: { type: "array", items: { type: "object", additionalProperties: true } },
        stateDiff: { type: "object", additionalProperties: true },
        lint: { type: "array", items: { type: "object", additionalProperties: true } },
        error: { type: "string" },
        beforeRevision: { type: "number" },
        afterRevision: { type: "number" },
      },
      required: ["title"],
    },
  },
  {
    name: "trouble_ticket_get",
    description: "Read one AW-N trouble ticket (feedback/bug report) from the household world queue.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        ticketId: { type: "string", description: "e.g. AW-1" },
      },
      required: ["ticketId"],
    },
  },
  {
    name: "trouble_ticket_list",
    description: "List durable feedback / bug-report / trouble tickets (newest first). Optional status filter: open | in_review | resolved | wont_fix.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "trouble_ticket_comment",
    description: "Append a comment to an existing AW-N ticket.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        ticketId: { type: "string" },
        text: { type: "string" },
        author: { type: "string" },
        surface: { type: "string" },
      },
      required: ["ticketId", "text"],
    },
  },
  {
    name: "trouble_ticket_resolve",
    description: "Set ticket status to resolved, in_review, open, or wont_fix.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        ticketId: { type: "string" },
        status: { type: "string" },
        note: { type: "string" },
      },
      required: ["ticketId", "status"],
    },
  },
  {
    name: "asset_ingest",
    description:
      "INGEST artwork directly: image bytes/base64, an OpenAI fileId, or an uploaded https fileUrl plus semanticId and kind. Runs sanity, stores on the Game Asset API, registers the semantic ID, returns bindWith. Use this when ChatGPT/Claude/Studio already has the image — do not host a temporary CDN URL first.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        semanticId: {
          type: "string",
          description: "map.* or poi.*.exterior|interior to register",
        },
        kind: { type: "string", enum: ["map", "poi.exterior", "poi.interior"] },
        brief: { type: "string", description: "What the picture is; used by sanity" },
        imageBase64: {
          type: "string",
          description: "Raw base64 or data:image/png;base64,… Keep under ~3MB for MCP JSON.",
        },
        mimeType: { type: "string", description: "image/png, image/jpeg, image/webp" },
        fileId: {
          type: "string",
          description: "OpenAI Files API id (file-…). Studio downloads with OPENAI_API_KEY.",
        },
        fileRef: { type: "string", description: "Alias of fileId" },
        fileUrl: {
          type: "string",
          description: "Optional https image URL if bytes are already hosted. Intake only; server re-hosts.",
        },
        projectId: { type: "string" },
      },
      required: ["semanticId"],
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
        patch: { type: "object", additionalProperties: true },
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
        ops: { type: "array", items: { type: "object", additionalProperties: true } },
        gates: { type: "array", items: { type: "object", additionalProperties: true } },
      },
      required: ["ops"],
    },
  },
  {
    name: "author_beat",
    description:
      "Steel-rail NL world builder. Pass intent; gets a closed-op plan. Defaults dryRun:true. Set confirm:true to execute. Execution verifies postconditions and rolls back if a named scene update would mint scene.mcp* or leave a POI in place. Prefer place.remove to drop pins.",
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
      "Create a plate generation job. Pass semanticId (map.* or poi.*.exterior|interior) + brief. By default (generate:true) the server writes an imagePrompt and generates with OpenAI gpt-image-2.5-sunburst, then registers bytes on the Game Asset API (status registered after sanity). Set generate:false to stop at awaiting_image for manual https paste. Returns imagePrompt/proofBrief/bindWith.",
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
        missionId: {
          type: "string",
          description:
            "Household Mission id. When set and generate registers, attaches a proof on creative.missionOs (game server world) and returns review.html?missionId=…",
        },
        requirementId: { type: "string", description: "Optional art requirement id on the Mission" },
        generate: {
          type: "boolean",
          description:
            "Default true when OPENAI_API_KEY is set. false = prompt only (awaiting_image) for asset_job_complete paste.",
        },
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
      "Read one asset job: status, imagePrompt, proofBrief, provider/model, stagingUrl, semanticId/registryKey.",
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
    name: "asset_job_generate",
    description:
      `Generate (or re-generate) art for an awaiting_image/failed job with OpenAI ${IMAGE_MODEL}, ingest to Game Asset registry, return status registered + bindWith semanticId.`,
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
      "Paste a temporary https image URL (optional Midjourney path). The MCP downloads the bytes and registers them on the Game Asset API under the job's semanticId/registryKey. Prefer asset_job_create with generate:true (gpt-image-2.5-sunburst) instead. Never put the staging URL on a scene/POI.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        jobId: { type: "string" },
        stagingUrl: {
          type: "string",
          description: "Temporary https image URL — intake only; server re-hosts",
        },
        imageBase64: { type: "string", description: "Optional direct bytes instead of stagingUrl" },
        mimeType: { type: "string" },
        fileId: { type: "string" },
        fileUrl: { type: "string" },
      },
      required: ["jobId"],
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
  {
    name: "execution_capacity_status",
    description:
      "MJ WORKER ALIVE count: how many Midjourney pull workers were seen in the last 5 minutes (creative.executionCapacity.workers lastSeenAt). Also returns queued/claimed jobs. Same number as GET /api/execution-capacity mjWorkersAliveLast5Minutes.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
      },
    },
  },
  {
    name: "mj_workers_alive",
    description:
      "Alias of execution_capacity_status. Count of Midjourney workers alive in the last 5 minutes.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
      },
    },
  },
  {
    name: "midjourney_fill",
    description:
      "Enqueue a Midjourney.imagine job on the household cloud queue (creative.executionCapacity). The Mac execution-capacity worker pulls it outbound — no tunnel. Does not wait for the grid; poll GET /api/execution-capacity?jobId=… or wait for candidateUrls then asset_job_complete / mission_attach_proof. Response includes mjWorkersAliveLast5Minutes.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        prompt: { type: "string", description: "Full Midjourney prompt including --ar etc." },
        semanticId: {
          type: "string",
          description: "Optional: also create generate:false asset job awaiting the later paste",
        },
        brief: { type: "string" },
        missionId: { type: "string", description: "Optional Mission id to stamp on the job payload" },
        requirementId: { type: "string" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "mission_create",
    description:
      "Create a durable Mission from narrative intent (survives chat death). Infers plan beats + proposed requirements — no art spend, no world mutation of scenes/POIs. Stored on household world creative.missionOs.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        narrative: {
          type: "string",
          description: "What should become playable reality (story + acceptance journey in plain words).",
        },
        title: { type: "string", description: "Short Mission title" },
        missionId: {
          type: "string",
          description: "Optional stable id (default mission.<slug>.v1). Re-create with same id overwrites.",
        },
        surface: {
          type: "string",
          description: "Where talk happened: chatgpt | cursor | studio | voice",
        },
        utteranceRef: { type: "string", description: "Optional chat/message id for provenance" },
      },
      required: ["narrative"],
    },
  },
  {
    name: "mission_get",
    description: "Load one Mission by id from the household Mission store.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string" },
      },
      required: ["missionId"],
    },
  },
  {
    name: "mission_list",
    description: "List recent Missions on the focused household world (newest first).",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "mission_describe",
    description:
      "One-screen Mission status: intent, requirements, awaiting Evan (decisions/proofs), unread notifications, next act, and public unapprovedImages displayUrl markdown so ChatGPT can show Board/Dump candidates. Prefer this to resume after chat death.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: {
          type: "string",
          description: "Mission id. If omitted, describes the most recently updated Mission.",
        },
      },
    },
  },
  {
    name: "mission_attach_proof",
    description:
      "Attach a proof gallery to a requirement (POC: stub candidates if none passed). Sets requirement proofs_ready and queues a notification.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string" },
        requirementId: { type: "string" },
        kind: { type: "string", description: "Default art_candidates" },
        candidates: {
          type: "array",
          items: { type: "object" },
          description: "Optional [{index, url, label}]. Stub 1–4 used if omitted.",
        },
      },
      required: ["missionId", "requirementId"],
    },
  },
  {
    name: "mission_approve_proof",
    description:
      "Put on Board: approve a proof by 1-based candidate index (Voice: “Rocket 3” → candidateIndex 3). Marks requirement done and queues a notification.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string" },
        proofId: { type: "string" },
        candidateIndex: { type: "number", description: "1-based index into proof candidates" },
        note: { type: "string" },
        surface: { type: "string" },
      },
      required: ["missionId", "proofId", "candidateIndex"],
    },
  },
  {
    name: "mission_reject_proof",
    description:
      "Dump: reject a proof (optional candidateIndex). Reopens the art requirement for replacement and queues a notification.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string" },
        proofId: { type: "string" },
        candidateIndex: { type: "number", description: "Optional 1-based index that was dumped" },
        note: { type: "string" },
        direction: { type: "string", description: "Default replace" },
        surface: { type: "string" },
      },
      required: ["missionId", "proofId"],
    },
  },
  {
    name: "mission_feedback",
    description:
      "Leave durable feedback on a Mission (taste, art direction, eng notes). Survives chat death; shows in mission_describe. Does NOT approve or dump — use mission_approve_proof / mission_reject_proof for Board/Dump. Optional: requirementId, proofId, candidateIndex (1-based).",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string" },
        text: { type: "string", description: "Feedback / direction (required)" },
        kind: {
          type: "string",
          description: "general | art | eng | taste | direction | playtest",
        },
        requirementId: { type: "string" },
        proofId: { type: "string" },
        candidateIndex: { type: "number", description: "Optional 1-based candidate" },
        surface: { type: "string", description: "Default chatgpt" },
      },
      required: ["missionId", "text"],
    },
  },
  {
    name: "mission_request_minigame",
    description:
      "File a durable eng minigame requirement with tight design params (verb, fail/bypass, onWin, physics, captions). AUTO-DISPATCHES to eng worker — Evan does not ask for the build, including hard physics puzzlers. Worker opens a PR (no auto-merge). Follow GAME_DESIGNER_CORPUS + CUTSCENE_DESIGNER_CORPUS.",
    inputSchema: {
      type: "object",
      properties: {
        accessToken: { type: "string" },
        missionId: { type: "string", description: "Existing Mission id" },
        routeId: {
          type: "string",
          description: "Proposed World2POIRoute / behavior id (e.g. moonLaunch, tiltMaze)",
        },
        verb: { type: "string", description: "Kid-facing verb, e.g. land rocket on pad" },
        difficulty: {
          type: "string",
          description: "easy | moderate | hard | physics_puzzler — does not block auto-start",
        },
        mustBecomeTrue: { type: "string" },
        requirementId: { type: "string" },
        design: {
          type: "object",
          description:
            "Tight design: feel, fail, bypass, onWin, teach, artSlots, referenceRoutes, acceptance, physics, captionDefaultTier",
        },
        supersedeRequirementIds: {
          type: "array",
          items: { type: "string" },
          description: "Prior eng requirement ids to mark wont_fix (e.g. wrong inferred lander)",
        },
      },
      required: ["missionId", "routeId", "verb"],
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

function authorOpRank(op) {
  switch (op) {
    case "asset.job_create":
      return 0;
    case "scene.upsert":
    case "scene.set_background_semantic":
    case "scene.set_background_url":
    case "scene.delete":
    case "place.upsert":
    case "place.remove":
    case "scene.connect":
      return 1;
    case "asset.bind":
      return 2;
    default:
      return 3;
  }
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
  if (!placeId) {
    // Planner often emits bare asset.bind after place.upsert already set exteriorAsset.
    return {
      bound: "skipped",
      reason: "place_id_missing",
      asset,
      warnings: ["asset.bind without placeId — rely on place.upsert exteriorAsset or pass placeId+slot"],
    };
  }
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
  if (current.status !== 200) {
    return {
      error: "world_unavailable",
      status: current.status,
      body: current.body,
      hint: current.hint,
    };
  }

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

  const looksLikeRemoval = /\b(remove|delete|drop|omit|unplace|get rid of)\b/i.test(intent) &&
    (/\bpoi\./i.test(intent) || /\brocket\b/i.test(intent) || /\bplace\b/i.test(intent) || /scene\.mcp/i.test(intent));
  if (looksLikeRemoval && !validated.ops.some((s) => s.op === "place.remove" || s.op === "scene.delete")) {
    return {
      executed: false,
      dryRun: true,
      error: "use_place_remove",
      detail:
        "Removing a POI or accidental scene.mcp* must use place.remove / scene.delete. scene.upsert cannot drop pins and must not mint a new scene.",
      narration: planned.narration || "",
      plan: { ops: validated.ops },
      rails: validated.rails,
      warnings: validated.warnings,
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
  // Default generate:true so ChatGPT MCP lands registered art without Midjourney.
  for (const step of validated.ops) {
    if (step.op === "asset.job_create") {
      const args = { ...step.args };
      if (args.generate === undefined) args.generate = true;
      step._jobResult = await createAssetJob(args, {
        openaiKey: process.env.OPENAI_API_KEY || "",
      });
    }
  }

  // place/scene before asset.bind — bind needs placeId or is a no-op when place.upsert already set exteriorAsset.
  const orderedOps = [...validated.ops].sort((a, b) => authorOpRank(a.op) - authorOpRank(b.op));

  const results = [];
  const saved = await mutate(auth, (doc) => {
    for (const step of orderedOps) {
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

  const afterDoc = saved.body;
  const opResults = extra?.results || results;
  const verified = verifyAuthorPostconditions({
    beforeDoc: current.body,
    afterDoc,
    ops: orderedOps,
    results: opResults,
  });
  if (!verified.ok) {
    const rolled = await mutate(auth, (doc) => restoreGraph(doc, current.body));
    return {
      ...response,
      executed: false,
      error: "postcondition_failed",
      rolledBack: rolled.status === 200,
      rollbackRevision: rolled.body?.revision ?? null,
      failures: verified.failures,
      diff: verified.diff,
      results: opResults,
      revision: afterDoc.revision,
      narration:
        "Change was not applied. The world did not match the plan, so the mutation was rolled back.",
      hint: "Use place.remove to drop a POI. scene.upsert requires sceneId (not id). File trouble_ticket_create with this payload.",
    };
  }

  return {
    ...response,
    executed: true,
    dryRun: false,
    narration: narrationFromVerified({
      ops: orderedOps,
      results: opResults,
      plannedNarration: planned.narration,
    }),
    revision: saved.body.revision,
    results: opResults,
    lintAfter: extra?.lint || lint(saved.body),
    diff: verified.diff,
    summary: describe(saved.body),
  };
}

function applyAuthorOp(doc, step) {
  const { op } = step;
  const args = normalizeSceneArgs(step.args || {});
  if (op === "scene.upsert") {
    const result = upsertScene(doc, args, { mintIfMissing: false });
    return result.error ? result : { op, ...result };
  }
  if (op === "scene.delete") {
    return { op, ...deleteScene(doc, args) };
  }
  if (op === "place.remove") {
    return { op, ...removePlace(doc, args) };
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

async function runMissionTool(name, auth, args) {
  if (name === "mission_get" || name === "mission_list" || name === "mission_describe") {
    const current = await readWorld(auth);
    if (current.status !== 200) {
    return {
      error: "world_unavailable",
      status: current.status,
      body: current.body,
      hint: current.hint,
    };
  }
    hydrateFromWorld(current.body);

    if (name === "mission_list") {
      return {
        durable: "creative.missionOs",
        missions: listMissionsFromDoc(current.body, { limit: args.limit }),
      };
    }

    let missionId = String(args.missionId || "").trim();
    if (!missionId && name === "mission_describe") {
      const listed = listMissionsFromDoc(current.body, { limit: 1 });
      missionId = listed[0]?.id || "";
    }
    if (!missionId) {
      return {
        error: name === "mission_describe" ? "no_missions" : "mission_id_required",
        hint: "mission_create first, or pass missionId.",
      };
    }

    const mission = getMissionFromDoc(current.body, missionId);
    if (!mission) return { error: "mission_missing", missionId };
    if (name === "mission_get") {
      return {
        ...mission,
        unapprovedImages: unapprovedImageGallery(mission, { worldDoc: current.body }),
      };
    }
    return describeMission(mission, { worldDoc: current.body });
  }

  // Writes: create / attach_proof / approve_proof
  const saved = await mutate(auth, (doc) => {
    hydrateFromWorld(doc);

    if (name === "mission_create") {
      const built = buildMission({
        narrative: args.narrative,
        title: args.title,
        surface: args.surface || "mcp",
        utteranceRef: args.utteranceRef || null,
        missionId: args.missionId || null,
      });
      if (built.error) {
        doc.__mcp = built;
        doc.__abort = true;
        return doc;
      }
      // Preserve createdAt if overwriting same id.
      const prior = getMissionFromDoc(doc, built.mission.id);
      if (prior?.createdAt) {
        built.mission.createdAt = prior.createdAt;
        built.mission.work = prior.work || built.mission.work;
        built.mission.approvals = prior.approvals || [];
        // Keep prior proofs unless this is a fresh narrative replace — POC overwrites plan.
      }
      upsertMissionOnDoc(doc, built.mission);
      const engQueue = listEngAutoDispatch(built.mission);
      doc.__mcp = {
        created: true,
        durable: "creative.missionOs",
        mission: built.mission,
        describe: describeMission(built.mission, { worldDoc: doc }),
        engAutoDispatch: engQueue,
      };
      if (engQueue.length) {
        doc.__wakeMaker = {
          missionId: built.mission.id,
          requirementIds: engQueue.map((e) => e.requirementId),
          source: "mission_create",
        };
      }
      return doc;
    }

    const missionId = String(args.missionId || "").trim();
    const mission = getMissionFromDoc(doc, missionId);
    if (!mission) {
      doc.__mcp = { error: "mission_missing", missionId };
      doc.__abort = true;
      return doc;
    }

    if (name === "mission_attach_proof") {
      const result = attachProof(mission, {
        requirementId: args.requirementId,
        kind: args.kind,
        candidates: args.candidates,
      });
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      upsertMissionOnDoc(doc, result.mission);
      doc.__mcp = {
        attached: true,
        proof: result.proof,
        notification: result.notification,
        describe: describeMission(result.mission, { worldDoc: doc }),
        unapprovedImages: unapprovedImageGallery(result.mission, { worldDoc: doc }),
      };
      return doc;
    }

    if (name === "mission_approve_proof") {
      const result = approveProof(mission, {
        proofId: args.proofId,
        candidateIndex: args.candidateIndex,
        note: args.note,
        surface: args.surface || "mcp",
      });
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      upsertMissionOnDoc(doc, result.mission);
      doc.__mcp = {
        approved: true,
        approval: result.approval,
        notification: result.notification,
        describe: describeMission(result.mission, { worldDoc: doc }),
      };
      return doc;
    }

    if (name === "mission_reject_proof") {
      const result = rejectProof(mission, {
        proofId: args.proofId,
        candidateIndex: args.candidateIndex,
        note: args.note,
        direction: args.direction,
        surface: args.surface || "mcp",
      });
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      upsertMissionOnDoc(doc, result.mission);
      doc.__mcp = {
        dumped: true,
        approval: result.approval,
        notification: result.notification,
        describe: describeMission(result.mission, { worldDoc: doc }),
      };
      return doc;
    }

    if (name === "mission_feedback") {
      const result = appendMissionFeedback(mission, {
        text: args.text,
        kind: args.kind,
        requirementId: args.requirementId,
        proofId: args.proofId,
        candidateIndex: args.candidateIndex,
        surface: args.surface || "chatgpt",
      });
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      upsertMissionOnDoc(doc, result.mission);
      doc.__mcp = {
        feedbackLogged: true,
        feedback: result.feedback,
        notification: result.notification,
        describe: describeMission(result.mission, { worldDoc: doc }),
      };
      return doc;
    }

    if (name === "mission_request_minigame") {
      const result = requestMinigame(mission, {
        routeId: args.routeId,
        verb: args.verb,
        design: args.design || {},
        mustBecomeTrue: args.mustBecomeTrue,
        requirementId: args.requirementId,
        difficulty: args.difficulty || "moderate",
        supersedeRequirementIds: args.supersedeRequirementIds || [],
      });
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      const blocked = result.requirement?.dispatch?.status === "blocked_builder_unconfigured";
      upsertMissionOnDoc(doc, result.mission);
      doc.__mcp = {
        requested: true,
        autoDispatch: !blocked && !!result.builderConfigured,
        builderConfigured: !!result.builderConfigured,
        builderDispatch: blocked
          ? {
              status: "saved_blocked",
              reason: "builder not configured",
              detail: "MINIGAME_MAKER_WEBHOOK_URL unset",
              message: "saved, blocked: builder not configured",
            }
          : { status: "queued_for_wake" },
        requirement: result.requirement,
        notification: result.notification,
        engAutoDispatch: result.engAutoDispatch,
        describe: describeMission(result.mission, { worldDoc: doc }),
        workerContract: blocked
          ? "Requirement saved. Builder webhook unset — no worker started. Configure MINIGAME_MAKER_WEBHOOK_URL, then re-request or wait for wake."
          : "Start eng without waiting for Evan. Open PR + CI. Do not merge. Do not mark playable. Difficulty does not gate start.",
      };
      doc.__wakeMaker = {
        missionId: result.mission.id,
        requirementIds: [result.requirement?.id].filter(Boolean),
        source: "mission_request_minigame",
        routeId: result.requirement?.design?.routeId || null,
        difficulty: result.requirement?.dispatch?.difficulty || null,
      };
      return doc;
    }

    doc.__mcp = { error: "unknown_mission_tool", name };
    doc.__abort = true;
    return doc;
  });

  if (saved.status === 409) return { error: "revision_conflict", body: saved.body };
  if (saved.status !== 200) return { error: "save_failed", status: saved.status, body: saved.body };

  const wake = saved.body.__wakeMaker;
  if (saved.body.__wakeMaker) delete saved.body.__wakeMaker;
  const extra = saved.body.__mcp;
  if (saved.body.__mcp) delete saved.body.__mcp;
  if (extra?.error) return extra;

  let makerWake = null;
  if (wake && !extra?.error) {
    makerWake = await notifyMinigameMaker(wake);
  }

  let pushWake = null;
  if (name === "mission_attach_proof" && extra?.attached && extra?.proof && !extra?.error) {
    try {
      pushWake = await notifyProofsReady(saved.body, {
        missionTitle: extra.describe?.title || extra.proof?.requirementId || "Art ready",
        missionId: extra.describe?.id || args.missionId,
        proofId: extra.proof.id,
        candidateCount: (extra.proof.payload?.candidates || []).length,
      });
    } catch (err) {
      pushWake = { skipped: true, reason: String(err?.message || err).slice(0, 120) };
    }
  }

  const blockedWake = makerWake?.skipped === true;
  if (extra && blockedWake) {
    extra.autoDispatch = false;
    extra.builderConfigured = false;
    extra.builderDispatch = {
      status: "saved_blocked",
      reason: "builder not configured",
      detail: makerWake.reason,
      message: "saved, blocked: builder not configured",
    };
    if (extra.workerContract && !String(extra.workerContract).includes("blocked")) {
      extra.workerContract =
        "Requirement saved. Builder webhook unset — no worker started. Configure MINIGAME_MAKER_WEBHOOK_URL.";
    }
  } else if (extra && makerWake && !makerWake.skipped) {
    extra.builderConfigured = true;
    extra.builderDispatch = {
      status: makerWake.ok ? "woken" : "wake_failed",
      ...makerWake,
    };
  }

  return {
    revision: saved.body.revision,
    ...extra,
    ...(makerWake ? { makerWake } : {}),
    ...(pushWake ? { pushWake } : {}),
  };
}

async function maybeOpenGithubIssue(ticket) {
  const token = String(process.env.GITHUB_TOKEN || process.env.STUDIO_GITHUB_TOKEN || "").trim();
  if (!token || token === "[SENSITIVE]") return { skipped: true, reason: "no_github_token" };
  const repo = String(process.env.TROUBLE_TICKET_GITHUB_REPO || "evanrobinson2/abbiesworld_ios").trim();
  const body = [
    `**Ticket:** ${ticket.id}`,
    `**Severity:** ${ticket.severity}`,
    `**Surface:** ${ticket.surface}`,
    `**Operation:** ${ticket.operation || "—"}`,
    `**World revision:** ${ticket.worldRevision ?? "—"}`,
    "",
    "## Summary",
    ticket.summary || ticket.title,
    "",
    "## Expected",
    ticket.expectedBehavior || "—",
    "",
    "## Actual",
    ticket.actualBehavior || "—",
    "",
    "## Related ids",
    (ticket.relatedIds || []).map((id) => `- \`${id}\``).join("\n") || "—",
    "",
    "## Requested cleanup",
    ticket.requestedCleanup || "—",
    "",
    "## Auto diagnostics",
    "```json",
    JSON.stringify(ticket.auto || {}, null, 2).slice(0, 8000),
    "```",
    "",
    "_Filed via MCP `trouble_ticket_create` onto household `creative.troubleQueue`._",
  ].join("\n");
  try {
    let res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "abbies-world-mcp",
      },
      body: JSON.stringify({
        title: `[${ticket.id}] ${ticket.title}`,
        body: body.slice(0, 60000),
        labels: ["trouble-ticket", ticket.severity].filter(Boolean),
      }),
    });
    let json = await res.json().catch(() => ({}));
    if (res.status === 422) {
      res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "abbies-world-mcp",
        },
        body: JSON.stringify({
          title: `[${ticket.id}] ${ticket.title}`,
          body: body.slice(0, 60000),
        }),
      });
      json = await res.json().catch(() => ({}));
    }
    if (!res.ok) return { skipped: true, reason: `github_${res.status}`, detail: json.message || json };
    return { url: json.html_url, number: json.number, repo };
  } catch (err) {
    return { skipped: true, reason: "github_failed", detail: String(err?.message || err) };
  }
}

async function runTroubleTool(name, auth, args) {
  const current = await readWorld(auth);
  if (current.status !== 200) {
    return {
      error: "world_unavailable",
      status: current.status,
      body: current.body,
      hint: current.hint,
    };
  }

  if (name === "trouble_ticket_get") {
    return {
      durable: "creative.troubleQueue",
      ...getTroubleTicket(current.body, args.ticketId),
    };
  }
  if (name === "trouble_ticket_list") {
    return {
      durable: "creative.troubleQueue",
      revision: current.body.revision,
      ...listTroubleTickets(current.body, { status: args.status, limit: args.limit }),
    };
  }

  const saved = await mutate(auth, (doc) => {
    if (name === "trouble_ticket_create") {
      const built = createTroubleTicket(doc, args, {
        mcpServer: SERVER.name,
        mcpVersion: SERVER.version,
        timestamp: new Date().toISOString(),
        beforeRevision: args.beforeRevision ?? current.body.revision,
        afterRevision: args.afterRevision ?? null,
        plan: args.plan || args.diagnosticContext?.plan || null,
        results: args.results || args.diagnosticContext?.results || null,
        stateDiff: args.stateDiff || args.diagnosticContext?.stateDiff || null,
        lint: args.lint || lint(doc),
        error: args.error || null,
        originatingSurface: args.surface || "mcp",
      });
      if (built.error) {
        doc.__mcp = built;
        doc.__abort = true;
        return doc;
      }
      doc.__mcp = {
        created: true,
        durable: "creative.troubleQueue",
        ticketId: built.ticket.id,
        status: built.ticket.status,
        label: `${built.ticket.id} — ${built.ticket.status}`,
        ticket: built.ticket,
      };
      return doc;
    }
    if (name === "trouble_ticket_comment") {
      const result = commentTroubleTicket(doc, args.ticketId, args);
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      doc.__mcp = { durable: "creative.troubleQueue", commented: true, ...result };
      return doc;
    }
    if (name === "trouble_ticket_resolve") {
      const result = updateTroubleTicketStatus(doc, args.ticketId, args);
      if (result.error) {
        doc.__mcp = result;
        doc.__abort = true;
        return doc;
      }
      doc.__mcp = { durable: "creative.troubleQueue", updated: true, ...result };
      return doc;
    }
    return doc;
  });

  if (saved.status === 409) return { error: "revision_conflict", body: saved.body };
  if (saved.status !== 200) return { error: "save_failed", status: saved.status, body: saved.body };
  const extra = saved.body.__mcp;
  if (saved.body.__mcp) delete saved.body.__mcp;
  if (extra?.error) return extra;

  if (name === "trouble_ticket_create" && extra?.ticket) {
    extra.github = await maybeOpenGithubIssue(extra.ticket);
    extra.ticket.githubIssueUrl = extra.github?.url || null;
    extra.revision = saved.body.revision;
    extra.label = extra.label || `${extra.ticket.id} — ${extra.ticket.status}`;
    if (extra.ticket.githubIssueUrl) {
      const linked = await mutate(auth, (doc) => {
        const result = setTicketGithubUrl(doc, extra.ticket.id, extra.ticket.githubIssueUrl);
        if (result.error) {
          doc.__mcp = result;
          doc.__abort = true;
        }
        return doc;
      });
      if (linked.status === 200) extra.revision = linked.body.revision;
    }
  } else if (extra) {
    extra.revision = saved.body.revision;
  }
  return extra;
}

async function callTool(name, args, request) {
  if (name === "place_delete") name = "place_remove";
  if (name === "feedback_report" || name === "bug_report") name = "trouble_ticket_create";
  if (name === "read_primer") return { text: primerBody() };
  if (name === "poi_capabilities") {
    return {
      can: ["name", "exteriorAsset", "interiorAsset", "x", "y", "scale", "behavior from whitelist", "travel:<sceneId>"],
      cannot: ["custom dialogue", "puzzles", "new screens", "freeform scripts"],
      deletePlace: "place_remove or place_delete",
      deleteScene: "scene_delete",
      feedback: "feedback_report or bug_report or trouble_ticket_create",
      behaviors: [...BEHAVIORS, "travel:<sceneId>", "fallingTargets:<configurationID>"],
      layout: "x and y are 0–1 on the scene plate. The iPad shows that plate full screen.",
    };
  }

  const gate = tokenFrom(request, args);
  if (!gate) return { error: "auth_required" };
  // World / mission tools need household API audience; ChatGPT OAuth alone is not enough.
  const auth = worldTokenFrom(request, args);
  if (!auth) {
    return {
      error: "auth_required",
      hint: "Set ABBIES_WORLD_TOKEN on Studio (Studio → Copy MCP token), or pass a household-aud Bearer.",
    };
  }

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
    const job = await createAssetJob(args, { openaiKey: process.env.OPENAI_API_KEY || "" });
    if (job?.error) return job;

    const missionId = String(args.missionId || "").trim();
    // Real path: registered art → Mission proof on household WORLD (game server).
    if (missionId && job.status === "needs_review") {
      return {
        ...job,
        missionId,
        durable: "creative.missionOs",
        proofAttached: false,
        hint:
          "Sanity failed (subject/framing). Do not Board as final. Regenerate with clearer framing, or human-override after looking at plate.",
        reviewUrl: `${REVIEW_BASE}?semantic=${encodeURIComponent(job.semanticId)}`,
      };
    }
    if (missionId && (job.status === "registered" || job.status === "bound")) {
      const plateUrl = `${PLATE_BASE}?semantic=${encodeURIComponent(job.semanticId)}`;
      const saved = await mutate(auth, (doc) => {
        hydrateFromWorld(doc);
        const mission = getMissionFromDoc(doc, missionId);
        if (!mission) {
          doc.__mcp = { error: "mission_missing", missionId, job };
          doc.__abort = true;
          return doc;
        }
        const req = ensureArtRequirement(mission, {
          requirementId: args.requirementId,
          semanticId: job.semanticId,
          mustBecomeTrue: `Art registered as ${job.semanticId}`,
        });
        if (!req.links) req.links = {};
        req.links.assetJobIds = [...(req.links.assetJobIds || []), job.id];
        const attached = attachProof(mission, {
          requirementId: req.id,
          kind: "art_candidates",
          candidates: [
            {
              index: 1,
              label: "Candidate 1",
              url: plateUrl,
              jobId: job.id,
              semanticId: job.semanticId,
              registryKey: job.registryKey,
            },
          ],
        });
        if (attached.error) {
          doc.__mcp = { ...attached, job };
          doc.__abort = true;
          return doc;
        }
        upsertMissionOnDoc(doc, attached.mission);
        doc.__mcp = {
          job,
          durable: "creative.missionOs",
          origin: ORIGIN,
          proof: attached.proof,
          deck: deckFromMission(attached.mission, { proofId: attached.proof.id }),
          reviewUrl: `${REVIEW_BASE}?missionId=${encodeURIComponent(missionId)}`,
          describe: describeMission(attached.mission, { worldDoc: doc }),
          unapprovedImages: unapprovedImageGallery(attached.mission, { worldDoc: doc }),
        };
        return doc;
      });
      if (saved.status === 409) return { error: "revision_conflict", body: saved.body, job };
      if (saved.status !== 200) {
        return { error: "world_save_failed", status: saved.status, body: saved.body, job };
      }
      const extra = saved.body.__mcp;
      if (saved.body.__mcp) delete saved.body.__mcp;
      if (extra?.error) return extra;
      let pushWake = null;
      try {
        pushWake = await notifyProofsReady(saved.body, {
          missionTitle: extra.describe?.title || missionId,
          missionId,
          proofId: extra.proof?.id,
          candidateCount: (extra.proof?.payload?.candidates || []).length,
        });
      } catch (err) {
        pushWake = { skipped: true, reason: String(err?.message || err).slice(0, 120) };
      }
      return { revision: saved.body.revision, ...extra, pushWake };
    }

    // Without missionId: registry-only (still game-server bytes). Caller must mission_attach_proof.
    return {
      ...job,
      hint: missionId
        ? null
        : "Pass missionId to attach a proof on the household world. Review: review.html?missionId=…",
      reviewUrl: null,
    };
  }
  if (name === "asset_job_list") {
    return { jobs: listAssetJobs({ projectId: args.projectId, limit: args.limit }) };
  }
  if (name === "asset_job_status") {
    const job = getAssetJob(args.jobId);
    return job || { error: "job_missing", jobId: args.jobId };
  }
  if (name === "asset_job_generate") {
    return generateAssetJob(args.jobId, { openaiKey: process.env.OPENAI_API_KEY || "" });
  }
  if (name === "asset_job_complete") {
    return completeAssetJob(args.jobId, {
      stagingUrl: args.stagingUrl,
      imageBase64: args.imageBase64,
      mimeType: args.mimeType,
      fileId: args.fileId || args.fileRef,
      fileUrl: args.fileUrl,
    });
  }
  if (name === "asset_ingest") {
    return ingestAssetImage(args);
  }

  if (name === "midjourney_fill") {
    const prompt = String(args.prompt || "").trim();
    if (!prompt) return { error: "prompt_required" };
    let job = null;
    if (args.semanticId) {
      job = await createAssetJob(
        {
          semanticId: args.semanticId,
          brief: args.brief || prompt.slice(0, 240),
          generate: false,
        },
        { openaiKey: "" }
      );
      if (job?.error) return { error: "job_create_failed", job };
    }
    const fill = await fetch("https://studio-mock-iota.vercel.app/api/midjourney/fill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // auth is the raw JWT (same as other world tools) — fill.js only
        // accepts Authorization that starts with "Bearer ", else it falls
        // through to Studio ABBIES_WORLD_TOKEN (often stale).
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        missionId: args.missionId,
        requirementId: args.requirementId,
        semanticId: args.semanticId,
      }),
    });
    const text = await fill.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { ok: false, message: text.slice(0, 300) };
    }
    const jobId = payload?.job?.id || null;
    const alive =
      payload?.mjWorkersAliveLast5Minutes ??
      payload?.summary?.mjWorkersAliveLast5Minutes ??
      null;
    return {
      fill: payload,
      job,
      cloudJobId: jobId,
      model: "pull",
      mjWorkersAliveLast5Minutes: alive,
      next: payload?.ok
        ? `Queued ${jobId || ""}. ${alive === 0 ? "No MJ worker seen in the last 5 minutes — start the sailboat worker." : `${alive} MJ worker(s) alive in the last 5 minutes.`} Poll GET https://studio-mock-iota.vercel.app/api/execution-capacity?jobId=${jobId || "…"} then asset_job_complete / mission_attach_proof with candidate https URLs.`
        : "Enqueue failed — check household auth / world write. Local fallback: /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh submit",
    };
  }

  if (name === "execution_capacity_status" || name === "mj_workers_alive") {
    const current = await readWorld(auth);
    if (current.status !== 200) {
      return {
        error: "world_unavailable",
        status: current.status,
        body: current.body,
        hint: current.hint,
      };
    }
    const summary = summarizeExecutionCapacity(current.body);
    return {
      mjWorkersAliveLast5Minutes: summary.mjWorkersAliveLast5Minutes,
      aliveWindowMs: summary.aliveWindowMs,
      aliveWorkers: summary.aliveWorkers,
      queued: summary.queued,
      claimed: summary.claimed,
      summary,
      durable: "creative.executionCapacity",
    };
  }

  if (
    name === "mission_create" ||
    name === "mission_get" ||
    name === "mission_list" ||
    name === "mission_describe" ||
    name === "mission_attach_proof" ||
    name === "mission_approve_proof" ||
    name === "mission_reject_proof" ||
    name === "mission_feedback" ||
    name === "mission_request_minigame"
  ) {
    return runMissionTool(name, auth, args);
  }

  if (name === "author_beat") {
    return runAuthorBeat(auth, args);
  }

  if (
    name === "trouble_ticket_create" ||
    name === "trouble_ticket_get" ||
    name === "trouble_ticket_list" ||
    name === "trouble_ticket_comment" ||
    name === "trouble_ticket_resolve"
  ) {
    return runTroubleTool(name, auth, args);
  }

  if (name === "world_get_current") {
    const current = await readWorld(auth);
    if (current.status !== 200) {
      return {
        error: "world_unavailable",
        status: current.status,
        body: current.body,
        hint: current.hint,
      };
    }
    return current.body;
  }
  if (name === "world_list") {
    const listing = await listWorldsUpstream(auth);
    if (listing.status !== 200) {
      return { error: "world_list_unavailable", status: listing.status, body: listing.body };
    }
    return listing.body;
  }

  if (name === "world_set_current") {
    const worldId = String(args.worldId || "").trim();
    if (!worldId) return { error: "world_id_required" };
    const focused = await setCurrentWorldUpstream(auth, worldId);
    if (focused.status !== 200) {
      return { error: "world_set_current_failed", status: focused.status, body: focused.body };
    }
    const current = await readWorld(auth);
    return {
      ...focused.body,
      focused: focused.body?.currentWorldId || worldId,
      describe: current.status === 200 ? describe(current.body) : null,
    };
  }

  if (name === "world_create") {
    const created = await createWorldUpstream(auth, String(args.name || "").trim() || "New world");
    if (created.status === 201 || created.status === 200) {
      return {
        created: {
          id: created.body?.id,
          name: created.body?.name,
          revision: created.body?.revision,
        },
        describe: describe(created.body),
      };
    }
    // Legacy fallback only when explicitly requested.
    if (!args.confirmReplace) {
      return {
        error: "world_create_failed",
        status: created.status,
        body: created.body,
        hint: "Server multi-world create failed. Pass confirmReplace:true only to wipe the focused /current world.",
      };
    }
  }

  if (name === "world_describe" || name === "world_lint" || name === "session_get" || name === "vars_get") {
    const current = await readWorld(auth);
    if (current.status !== 200) {
    return {
      error: "world_unavailable",
      status: current.status,
      body: current.body,
      hint: current.hint,
    };
  }
    if (name === "world_describe") return describe(current.body);
    if (name === "world_lint") return { revision: current.body.revision, notes: lint(current.body) };
    if (name === "session_get") return ensureCreative(structuredClone(current.body)).live;
    const scope = args.scope || "session";
    const bag = scopeBag(structuredClone(current.body), scope, args.playerId);
    return { scope, vars: bag };
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
      const result = upsertScene(doc, normalizeSceneArgs(args), { mintIfMissing: true });
      doc.__mcp = result;
      if (result?.error) doc.__abort = true;
      return doc;
    }
    if (name === "place_remove") {
      const result = removePlace(doc, args);
      doc.__mcp = result;
      if (result?.error) doc.__abort = true;
      return doc;
    }
    if (name === "scene_delete") {
      const result = deleteScene(doc, normalizeSceneArgs(args));
      doc.__mcp = result;
      if (result?.error) doc.__abort = true;
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

function extractUnapprovedImages(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.unapprovedImages)) return value.unapprovedImages;
  if (Array.isArray(value.describe?.unapprovedImages)) return value.describe.unapprovedImages;
  return [];
}

function toolText(value) {
  const gallery = galleryMarkdown(extractUnapprovedImages(value));
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const text = (gallery ? `${gallery}\n\n` : "") + json;
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
      capabilities: { tools: { listChanged: true }, resources: { listChanged: false } },
      serverInfo: SERVER,
      instructions: IPAD_LAYOUT,
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: publicTools() });
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
    commands: {
      deletePlace: ["place_remove", "place_delete"],
      deleteScene: ["scene_delete"],
      feedback: ["feedback_report", "bug_report", "trouble_ticket_create"],
      tickets: ["trouble_ticket_get", "trouble_ticket_list", "trouble_ticket_comment", "trouble_ticket_resolve"],
      ingest: ["asset_ingest"],
      mjWorkersAlive: ["execution_capacity_status", "mj_workers_alive"],
    },
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return unauthorizedResponse("Parse error / missing body");
  }
  // ChatGPT OAuth discovery expects HTTP 401 + WWW-Authenticate when unauthenticated.
  // Cursor uses mcp.json Bearer (+ X-Abbies-Auth: bearer) — do not OAuth-challenge it.
  if (!bearerPresent(request, body)) {
    return unauthorizedResponse(
      "No authorization provided",
      { challengeOAuth: !prefersHeaderAuth(request) }
    );
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

/**
 * In-memory asset generation jobs + lightweight projects (Studio first slice).
 * Durable store (Supabase) is next — see ASSET_GENERATION_SERVICE.md.
 *
 * ChatGPT / MCP flow:
 *   asset_project_create → asset_library_describe → asset_job_create
 *   → (paste Midjourney URL) → asset_job_complete (ingests to Game Asset API)
 *   → asset_bind (semantic ID only — never CDN)
 */

import { semanticToRegistryKey, isSemanticAssetId } from "./steel-rail.js";
import { ingestStagingUrl } from "./asset-registry.js";

const jobs = new Map();
const projects = new Map();

const STYLE_PINS = {
  "abbies-world-storybook":
    "stylized storybook soft clay watercolor illustration, child-safe warm inviting, landscape plate, no text no logos no UI, --ar 16:9 --stylize 250",
};

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function kindFlags(kind) {
  switch (kind) {
    case "map":
      return "full-bleed overland map plate, soft horizon, readable silhouette landmarks";
    case "poi.exterior":
      return "single landmark building or island as a map token, clear silhouette, transparent-friendly edges";
    case "poi.interior":
      return "interior hall plate, open floor in the lower third for UI, warm light, no characters";
    default:
      return "game art plate for a children's adventure";
  }
}

function buildProofBrief(brief, kind, semanticId) {
  const bits = [
    `Semantic id ${semanticId} must match the picture.`,
    `Kind ${kind}: ${kindFlags(kind)}.`,
    `Subject from brief: ${brief.slice(0, 240)}`,
    "Child-safe; no text, logos, UI chrome, or scary content.",
  ];
  return bits.join(" ");
}

function publicJob(job) {
  return {
    id: job.id,
    projectId: job.projectId || null,
    status: job.status,
    semanticId: job.semanticId,
    registryKey: job.registryKey,
    kind: job.kind,
    brief: job.brief,
    midjourneyPrompt: job.midjourneyPrompt,
    proofBrief: job.proofBrief,
    // Provenance only — world must bind semanticId, never this URL.
    stagingUrl: job.stagingUrl || null,
    deliveryURL: job.deliveryURL || null,
    registryRevision: job.registryRevision ?? null,
    bindWith: job.semanticId,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function publicProject(project) {
  const linked = [...jobs.values()].filter((j) => j.projectId === project.id);
  return {
    id: project.id,
    name: project.name,
    libraryIntent: project.libraryIntent,
    stylePin: project.stylePin,
    suggestedSemanticIds: project.suggestedSemanticIds || [],
    jobCount: linked.length,
    jobIds: linked.map((j) => j.id),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function listJobs({ projectId, limit = 50 } = {}) {
  let rows = [...jobs.values()];
  if (projectId) rows = rows.filter((j) => j.projectId === String(projectId));
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows.slice(0, Math.min(100, Math.max(1, Number(limit) || 50))).map(publicJob);
}

export function getJob(id) {
  const job = jobs.get(String(id || ""));
  return job ? publicJob(job) : null;
}

export function listProjects({ limit = 20 } = {}) {
  const rows = [...projects.values()].sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt))
  );
  return rows.slice(0, Math.min(50, Math.max(1, Number(limit) || 20))).map(publicProject);
}

export function getProject(id) {
  const project = projects.get(String(id || ""));
  return project ? publicProject(project) : null;
}

/**
 * Lightweight generation project — groups jobs under one library intent.
 * Not the full carve/planner system; just ChatGPT-usable scaffolding.
 */
export function createProject(args = {}) {
  const name = String(args.name || "Asset pack").trim().slice(0, 80) || "Asset pack";
  const libraryIntent = String(args.libraryIntent || args.intent || "").trim().slice(0, 2000);
  if (!libraryIntent) return { error: "library_intent_required" };
  const stylePin = String(args.stylePin || "abbies-world-storybook");
  const suggestedSemanticIds = suggestSemanticIds(libraryIntent, args.suggestedSemanticIds);
  const id = newId("proj");
  const now = new Date().toISOString();
  const project = {
    id,
    name,
    libraryIntent,
    stylePin,
    suggestedSemanticIds,
    createdAt: now,
    updatedAt: now,
  };
  projects.set(id, project);
  return publicProject(project);
}

/**
 * Set or refresh library intent on a project; returns suggested semantic ids.
 */
export function describeLibrary(args = {}) {
  const projectId = String(args.projectId || "").trim();
  const libraryIntent = String(args.libraryIntent || args.intent || "").trim().slice(0, 2000);
  if (!projectId) {
    if (!libraryIntent) return { error: "library_intent_or_project_required" };
    return createProject({
      name: args.name || "Library draft",
      libraryIntent,
      stylePin: args.stylePin,
      suggestedSemanticIds: args.suggestedSemanticIds,
    });
  }
  const project = projects.get(projectId);
  if (!project) return { error: "project_missing", projectId };
  if (libraryIntent) project.libraryIntent = libraryIntent;
  if (args.name) project.name = String(args.name).trim().slice(0, 80);
  if (args.stylePin) project.stylePin = String(args.stylePin);
  project.suggestedSemanticIds = suggestSemanticIds(
    project.libraryIntent,
    args.suggestedSemanticIds || project.suggestedSemanticIds
  );
  project.updatedAt = new Date().toISOString();
  return publicProject(project);
}

function suggestSemanticIds(intent, provided) {
  if (Array.isArray(provided) && provided.length) {
    return provided.map((s) => String(s).trim()).filter(Boolean).slice(0, 24);
  }
  const text = String(intent || "").toLowerCase();
  const out = [];
  if (/peg\s*monastery|monastery|peglin/.test(text)) {
    out.push(
      "map.peglin.crashLand",
      "poi.peglin.pegMonastery.exterior",
      "poi.peglin.pegMonastery.interior"
    );
  }
  if (/plink/.test(text)) {
    out.push("poi.plinkPavilion.exterior");
  }
  return out.slice(0, 24);
}

export async function createJob(args, { openaiKey } = {}) {
  const semanticId = String(args.semanticId || "").trim();
  if (!isSemanticAssetId(semanticId)) {
    return { error: "semantic_id_invalid", semanticId };
  }
  const kind = String(args.kind || inferKind(semanticId)).trim();
  const brief = String(args.brief || "").trim().slice(0, 800);
  if (!brief) return { error: "brief_required" };

  const projectId = String(args.projectId || "").trim() || null;
  if (projectId && !projects.has(projectId)) {
    return { error: "project_missing", projectId };
  }

  const stylePin = String(
    args.stylePin ||
      (projectId && projects.get(projectId)?.stylePin) ||
      "abbies-world-storybook"
  );
  const style = STYLE_PINS[stylePin] || STYLE_PINS["abbies-world-storybook"];
  const id = newId("job");
  const job = {
    id,
    projectId,
    status: "prompting",
    semanticId,
    registryKey: semanticToRegistryKey(semanticId),
    kind,
    brief,
    stylePin,
    midjourneyPrompt: "",
    proofBrief: buildProofBrief(brief, kind, semanticId),
    stagingUrl: null,
    deliveryURL: null,
    registryRevision: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(id, job);

  const draft = [brief, kindFlags(kind), style].join(", ");

  if (openaiKey) {
    try {
      job.midjourneyPrompt = await writePrompt(openaiKey, brief, kind, style);
    } catch (err) {
      job.midjourneyPrompt = draft;
      job.error = `prompt_fallback:${String(err?.message || err).slice(0, 120)}`;
    }
  } else {
    job.midjourneyPrompt = draft;
  }

  job.status = "awaiting_image";
  job.updatedAt = new Date().toISOString();
  if (projectId) {
    const project = projects.get(projectId);
    if (project) project.updatedAt = job.updatedAt;
  }
  // awaiting_image = author pastes MJ URL via complete, or Images API later
  return publicJob(job);
}

function inferKind(semanticId) {
  if (semanticId.startsWith("map.")) return "map";
  if (semanticId.endsWith(".interior")) return "poi.interior";
  if (semanticId.endsWith(".exterior")) return "poi.exterior";
  return "poi.exterior";
}

async function writePrompt(key, brief, kind, style) {
  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY a Midjourney prompt under 70 words before flags. Child-safe Abbie's World art. No quotes.",
        },
        {
          role: "user",
          content: `Kind: ${kind}\nBrief: ${brief}\nStyle: ${style}`,
        },
      ],
    }),
  });
  if (!upstream.ok) throw new Error(`openai_${upstream.status}`);
  const payload = await upstream.json();
  return String(payload?.choices?.[0]?.message?.content || "").trim().slice(0, 2000);
}

/**
 * Intake a temporary https image (Midjourney etc.), re-host on Game Asset API,
 * and mark the job `registered`. World bind must use semanticId only.
 */
export async function completeJob(id, { stagingUrl } = {}) {
  const job = jobs.get(String(id || ""));
  if (!job) return { error: "job_missing", id };
  const url = String(stagingUrl || "").trim();
  if (!/^https:\/\//i.test(url)) return { error: "staging_url_required" };

  job.stagingUrl = url.slice(0, 2000);
  job.status = "ingesting";
  job.error = null;
  job.updatedAt = new Date().toISOString();

  const ingested = await ingestStagingUrl({
    stagingUrl: url,
    semanticId: job.semanticId,
    registryKey: job.registryKey,
    kind: job.kind,
    brief: job.brief,
  });

  if (ingested.error) {
    job.status = "failed";
    job.error = ingested.error;
    job.updatedAt = new Date().toISOString();
    return { ...publicJob(job), ingest: ingested };
  }

  job.status = "registered";
  job.deliveryURL = ingested.deliveryURL || null;
  job.registryRevision = ingested.revision ?? null;
  job.updatedAt = new Date().toISOString();
  return {
    ...publicJob(job),
    ingest: ingested,
    hint: "Asset is on the Game Asset registry. Call asset_bind with semanticId only (never the Midjourney URL).",
  };
}

export function markBound(id) {
  const job = jobs.get(String(id || ""));
  if (!job) return { error: "job_missing", id };
  if (job.status !== "registered" && job.status !== "bound") {
    return {
      error: "not_registered",
      hint: "Call asset_job_complete first so bytes are hosted on the server.",
      status: job.status,
    };
  }
  job.status = "bound";
  job.updatedAt = new Date().toISOString();
  return publicJob(job);
}

/** Reset in-memory state (unit / smoke tests only). */
export function __resetAssetStoreForTests() {
  jobs.clear();
  projects.clear();
}

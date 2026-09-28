/**
 * In-memory asset generation jobs + lightweight projects (Studio first slice).
 * Durable store (Supabase) is next — see ASSET_GENERATION_SERVICE.md.
 *
 * ChatGPT / MCP flow (default — no Midjourney required):
 *   asset_project_create → asset_job_create (generate:true)
 *   → OpenAI gpt-image-2 writes bytes → Game Asset registry → status registered
 *   → asset_bind (semantic ID only — never CDN)
 *
 * Optional: generate:false leaves awaiting_image for manual https paste via
 * asset_job_complete (MJ / any staging URL).
 */

import { semanticToRegistryKey, isSemanticAssetId } from "./steel-rail.js";
import { ingestStagingUrl, ingestBytes } from "./asset-registry.js";

const jobs = new Map();
const projects = new Map();

/** OpenAI Images model — current production id is gpt-image-2 (not "2.5"). */
export const IMAGE_MODEL = "gpt-image-2";

const STYLE_PINS = {
  "abbies-world-storybook":
    "stylized storybook soft clay watercolor illustration, child-safe warm inviting colors, rounded forms, cozy magical atmosphere, no text, no logos, no UI chrome",
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
  const imagePrompt = job.imagePrompt || job.midjourneyPrompt || "";
  return {
    id: job.id,
    projectId: job.projectId || null,
    status: job.status,
    semanticId: job.semanticId,
    registryKey: job.registryKey,
    kind: job.kind,
    brief: job.brief,
    // Primary field for ChatGPT / gpt-image path.
    imagePrompt,
    // Legacy alias (same string) — older clients still read midjourneyPrompt.
    midjourneyPrompt: imagePrompt,
    proofBrief: job.proofBrief,
    provider: job.provider || null,
    imageModel: job.imageModel || null,
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
  // Default: auto-generate with OpenAI when a key is present (ChatGPT MCP path).
  // Pass generate:false to stop at awaiting_image for manual MJ/URL paste.
  const wantGenerate =
    args.generate === false || args.generate === "false"
      ? false
      : args.generate === true || args.generate === "true"
        ? true
        : Boolean(openaiKey);

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
    imagePrompt: "",
    midjourneyPrompt: "",
    proofBrief: buildProofBrief(brief, kind, semanticId),
    provider: null,
    imageModel: null,
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
      job.imagePrompt = await writePrompt(openaiKey, brief, kind, style);
      job.midjourneyPrompt = job.imagePrompt;
    } catch (err) {
      job.imagePrompt = draft;
      job.midjourneyPrompt = draft;
      job.error = `prompt_fallback:${String(err?.message || err).slice(0, 120)}`;
    }
  } else {
    job.imagePrompt = draft;
    job.midjourneyPrompt = draft;
  }

  job.updatedAt = new Date().toISOString();
  if (projectId) {
    const project = projects.get(projectId);
    if (project) project.updatedAt = job.updatedAt;
  }

  if (wantGenerate && openaiKey) {
    return generateJob(id, { openaiKey });
  }

  if (wantGenerate && !openaiKey) {
    job.status = "awaiting_image";
    job.error = "openai_missing_for_generate";
    job.updatedAt = new Date().toISOString();
    return {
      ...publicJob(job),
      hint: "Set OPENAI_API_KEY on Studio, or call asset_job_complete with a staging https URL.",
    };
  }

  job.status = "awaiting_image";
  job.updatedAt = new Date().toISOString();
  return {
    ...publicJob(job),
    hint: "generate:false — paste an https image via asset_job_complete, or call asset_job_generate.",
  };
}

/**
 * Run OpenAI gpt-image-2 for an awaiting_image (or failed generate) job and register bytes.
 */
export async function generateJob(id, { openaiKey } = {}) {
  const job = jobs.get(String(id || ""));
  if (!job) return { error: "job_missing", id };
  const key = String(openaiKey || "").trim();
  if (!key) {
    return {
      error: "openai_missing",
      hint: "Set OPENAI_API_KEY on studio-mock (Vercel Production).",
    };
  }
  if (job.status === "registered" || job.status === "bound") {
    return { ...publicJob(job), hint: "already_registered" };
  }
  if (job.status === "ingesting") {
    return { error: "busy", status: job.status };
  }

  const prompt = String(job.imagePrompt || job.midjourneyPrompt || job.brief || "").trim();
  if (!prompt) return { error: "prompt_missing", id: job.id };

  job.status = "ingesting";
  job.provider = "openai";
  job.imageModel = IMAGE_MODEL;
  job.error = null;
  job.updatedAt = new Date().toISOString();

  let generated;
  try {
    generated = await generateOpenAIImage(key, prompt);
  } catch (err) {
    job.status = "failed";
    job.error = `image_generate_failed:${String(err?.message || err).slice(0, 160)}`;
    job.updatedAt = new Date().toISOString();
    return publicJob(job);
  }

  if (!generated?.ok) {
    job.status = "failed";
    job.error = `image_generate_failed:${generated?.error || "unknown"}`;
    job.updatedAt = new Date().toISOString();
    return { ...publicJob(job), generate: generated };
  }

  const ingested = await ingestBytes({
    bytes: generated.bytes,
    contentType: generated.contentType || "image/png",
    semanticId: job.semanticId,
    registryKey: job.registryKey,
    kind: job.kind,
    brief: job.brief,
    source: "openai-gpt-image",
    stagingSourceHost: IMAGE_MODEL,
  });

  if (ingested.error) {
    job.status = "failed";
    job.error = ingested.error;
    job.updatedAt = new Date().toISOString();
    return { ...publicJob(job), ingest: ingested, generate: { ok: true, model: IMAGE_MODEL } };
  }

  job.status = "registered";
  job.deliveryURL = ingested.deliveryURL || null;
  job.registryRevision = ingested.revision ?? null;
  job.stagingUrl = `openai://${IMAGE_MODEL}`;
  job.updatedAt = new Date().toISOString();
  return {
    ...publicJob(job),
    ingest: ingested,
    hint: "Asset is on the Game Asset registry. Call asset_bind with semanticId only.",
  };
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
            "Return ONLY a plain-language image prompt for OpenAI gpt-image-2, under 80 words. Child-safe Abbie's World storybook art. No Midjourney flags (--ar, --stylize). No quotes. No text/logos/UI in the image.",
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

async function generateOpenAIImage(key, prompt) {
  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: String(prompt).slice(0, 3200),
      n: 1,
      size: "1024x1024",
      quality: "medium",
    }),
  });
  const text = await upstream.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!upstream.ok) {
    const detail =
      payload?.error?.message ||
      payload?.error?.code ||
      text.slice(0, 200) ||
      `http_${upstream.status}`;
    return { ok: false, error: detail, status: upstream.status };
  }
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) {
    // Some responses return a temporary URL instead of b64.
    const url = payload?.data?.[0]?.url;
    if (url && /^https:\/\//i.test(url)) {
      const dl = await fetch(url, { headers: { Accept: "image/*,*/*" } });
      if (!dl.ok) return { ok: false, error: `image_url_download_${dl.status}` };
      const bytes = Buffer.from(await dl.arrayBuffer());
      const contentType = dl.headers.get("content-type") || "image/png";
      return { ok: true, bytes, contentType, model: IMAGE_MODEL, via: "url" };
    }
    return { ok: false, error: "no_image_data" };
  }
  return {
    ok: true,
    bytes: Buffer.from(b64, "base64"),
    contentType: "image/png",
    model: IMAGE_MODEL,
    via: "b64",
  };
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

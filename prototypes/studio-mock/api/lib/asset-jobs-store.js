/**
 * In-memory asset generation jobs + lightweight projects (Studio first slice).
 * Durable store (Supabase) is next — see ASSET_GENERATION_SERVICE.md.
 *
 * ChatGPT / MCP flow (default — no Midjourney required):
 *   asset_project_create → asset_job_create (generate:true)
 *   → OpenAI gpt-image-2.5 (sunburst) writes bytes → Game Asset registry → status registered
 *   → asset_bind (semantic ID only — never CDN)
 *
 * Optional: generate:false leaves awaiting_image for manual https paste via
 * asset_job_complete (MJ / any staging URL).
 */

import { semanticToRegistryKey, isSemanticAssetId } from "./steel-rail.js";
import { ingestBytes } from "./asset-registry.js";
import { runAssetSanityCheck, framingPromptAddon } from "./asset-vision-sanity.js";

const jobs = new Map();
const projects = new Map();

/**
 * OpenAI Images model — GPT Image 2.5 Sunburst (latest quality).
 * Override with ASSET_IMAGE_MODEL (e.g. gpt-image-2.5-flare for speed).
 */
export const IMAGE_MODEL =
  String(process.env.ASSET_IMAGE_MODEL || "").trim() || "gpt-image-2.5-sunburst";

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
      return "full-bleed overland map plate, soft horizon, readable silhouette landmarks, all landmarks fully inside frame with margin";
    case "poi.exterior":
      return "single landmark building or island as a map token, clear silhouette, transparent-friendly edges, whole subject inside frame with padding — never half-cropped";
    case "poi.interior":
      return "interior hall plate, open floor in the lower third for UI, warm light, no characters, architecture fully framed";
    default:
      return "game art plate for a children's adventure, subject fully inside frame, face visible if character";
  }
}

function buildProofBrief(brief, kind, semanticId) {
  const bits = [
    `Semantic id ${semanticId} must match the picture.`,
    `Kind ${kind}: ${kindFlags(kind)}.`,
    `Subject from brief: ${brief.slice(0, 240)}`,
    "Child-safe; no text, logos, UI chrome, or scary content.",
    "Sanity: reject feet-as-face crops, half-cut subjects, empty frames, wrong subject.",
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
    sanity: job.sanity || null,
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
    sanity: null,
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
 * Run OpenAI image generate for an awaiting_image (or failed generate) job and register bytes.
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

  job.deliveryURL = ingested.deliveryURL || null;
  job.registryRevision = ingested.revision ?? null;
  job.stagingUrl = `openai://${IMAGE_MODEL}`;
  await applySanityToJob(job, {
    openaiKey: key,
    bytes: generated.bytes,
    contentType: generated.contentType || "image/png",
    imageUrl: job.deliveryURL,
  });
  return {
    ...publicJob(job),
    ingest: ingested,
    hint:
      job.status === "needs_review"
        ? "Sanity failed — do not Board/bind as final. Regenerate or fix framing (see job.sanity)."
        : "Asset is on the Game Asset registry. Call asset_bind with semanticId only.",
  };
}

function inferKind(semanticId) {
  if (semanticId.startsWith("map.")) return "map";
  if (semanticId.endsWith(".interior")) return "poi.interior";
  if (semanticId.endsWith(".exterior")) return "poi.exterior";
  return "poi.exterior";
}

function sniffImageMime(bytes) {
  if (!bytes || bytes.length < 12) return "";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57) return "image/webp";
  return "";
}

function decodeBase64Image(raw, mimeHint) {
  let text = String(raw || "").trim();
  if (!text) return { error: "image_required" };
  let mime = String(mimeHint || "").split(";")[0].trim();
  const dataUrl = text.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (dataUrl) {
    mime = mime || dataUrl[1];
    text = dataUrl[2];
  }
  text = text.replace(/\s+/g, "");
  let bytes;
  try {
    bytes = Buffer.from(text, "base64");
  } catch {
    return { error: "image_base64_invalid" };
  }
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) {
    return { error: "staging_bytes_invalid", size: bytes.length };
  }
  const sniffed = sniffImageMime(bytes);
  if (!sniffed && mime && !mime.toLowerCase().startsWith("image/")) {
    return { error: "staging_not_image", contentType: mime };
  }
  if (!sniffed && !mime) return { error: "staging_not_image" };
  return {
    ok: true,
    bytes,
    contentType: sniffed || mime || "image/png",
    source: "base64",
  };
}

async function fetchOpenAiFile(fileId) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    return {
      error: "file_fetch_failed",
      fileId,
      hint: "Set OPENAI_API_KEY to resolve fileId uploads, or pass imageBase64.",
    };
  }
  const response = await fetch(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}/content`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    return { error: "file_fetch_failed", status: response.status, fileId };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const headerType = String(response.headers.get("content-type") || "").split(";")[0].trim();
  const sniffed = sniffImageMime(bytes);
  if (!sniffed && !headerType.toLowerCase().startsWith("image/")) {
    return { error: "staging_not_image", contentType: headerType, fileId };
  }
  return {
    ok: true,
    bytes,
    contentType: sniffed || headerType || "image/png",
    source: `openai-file:${fileId}`,
  };
}

/**
 * Resolve image bytes from MCP/HTTP args: base64, data URL, OpenAI file id, or https.
 */
export async function resolveImageBytes(args = {}) {
  const nested = args.image && typeof args.image === "object" ? args.image : null;
  const mimeHint =
    args.mimeType || args.contentType || nested?.mimeType || nested?.mediaType || nested?.contentType || "";
  const b64 =
    args.imageBase64 ||
    args.base64 ||
    (typeof args.bytes === "string" ? args.bytes : "") ||
    args.data ||
    nested?.data ||
    nested?.base64 ||
    nested?.imageBase64 ||
    "";
  if (typeof b64 === "string" && b64.trim().length > 32) {
    return decodeBase64Image(b64, mimeHint);
  }
  if (Buffer.isBuffer(args.bytes) || args.bytes instanceof Uint8Array) {
    const bytes = Buffer.from(args.bytes);
    const sniffed = sniffImageMime(bytes);
    if (!sniffed) return { error: "staging_not_image" };
    return { ok: true, bytes, contentType: sniffed, source: "bytes" };
  }
  const fileId = String(
    args.fileId || args.file_id || args.uploadedFile || args.fileRef || nested?.fileId || nested?.file_id || ""
  ).trim();
  if (fileId) return fetchOpenAiFile(fileId);

  const url = String(args.fileUrl || args.url || args.stagingUrl || nested?.url || "").trim();
  if (/^https:\/\//i.test(url)) {
    try {
      const download = await fetch(url, { headers: { Accept: "image/*,*/*" }, redirect: "follow" });
      if (!download.ok) return { error: "staging_download_failed", status: download.status };
      const bytes = Buffer.from(await download.arrayBuffer());
      const headerType = String(download.headers.get("content-type") || "").split(";")[0].trim();
      const sniffed = sniffImageMime(bytes);
      if (!sniffed && !headerType.toLowerCase().startsWith("image/")) {
        return { error: "staging_not_image", contentType: headerType };
      }
      let host = "https";
      try {
        host = new URL(url).host;
      } catch {
        /* keep */
      }
      return {
        ok: true,
        bytes,
        contentType: sniffed || headerType || "image/png",
        source: `https:${host}`,
        sourceUrl: url,
      };
    } catch (err) {
      return { error: "staging_download_failed", detail: String(err?.message || err).slice(0, 200) };
    }
  }
  return {
    error: "image_required",
    hint: "Pass imageBase64 (or a data URL), fileId (OpenAI file-…), or https fileUrl.",
  };
}

async function finishIngest(job, { bytes, contentType, provenance, openaiKey } = {}) {
  job.status = "ingesting";
  job.error = null;
  job.stagingUrl = String(provenance || job.stagingUrl || "direct").slice(0, 2000);
  job.updatedAt = new Date().toISOString();

  const ingested = await ingestBytes({
    bytes,
    contentType: contentType || "image/png",
    semanticId: job.semanticId,
    registryKey: job.registryKey,
    kind: job.kind,
    brief: job.brief,
    source: "studio-mcp-ingest",
    stagingSourceHost: String(provenance || "bytes").replace(/^[a-z]+:/, "").slice(0, 80) || "bytes",
  });

  if (ingested.error) {
    job.status = "failed";
    job.error = ingested.error;
    job.updatedAt = new Date().toISOString();
    return { ...publicJob(job), ingest: ingested };
  }

  job.deliveryURL = ingested.deliveryURL || null;
  job.registryRevision = ingested.revision ?? null;
  const key = String(openaiKey || process.env.OPENAI_API_KEY || "").trim();
  await applySanityToJob(job, {
    openaiKey: key,
    bytes,
    contentType: contentType || "image/png",
    imageUrl: job.deliveryURL,
  });
  return {
    ...publicJob(job),
    ingest: ingested,
    hint:
      job.status === "needs_review"
        ? "Sanity failed — do not Board/bind as final. Fix the image or regenerate (see job.sanity)."
        : "Asset is on the Game Asset registry. Call asset_bind with bindWith / semanticId — never a CDN URL.",
  };
}

/**
 * Intake a temporary https image (Midjourney etc.), re-host on Game Asset API,
 * and mark the job `registered`. World bind must use semanticId only.
 * Also accepts imageBase64 / fileId so agents need not host a public URL.
 */
export async function completeJob(id, input = {}) {
  const job = jobs.get(String(id || ""));
  if (!job) return { error: "job_missing", id };
  if (input.stagingUrl || input.fileUrl) {
    job.stagingUrl = String(input.stagingUrl || input.fileUrl).slice(0, 2000);
    job.updatedAt = new Date().toISOString();
  }
  const resolved = input.bytes
    ? {
        ok: true,
        bytes: Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes),
        contentType: input.contentType || sniffImageMime(Buffer.from(input.bytes)) || "image/png",
        source: input.stagingUrl || "bytes",
      }
    : await resolveImageBytes(input);
  if (resolved.error) {
    job.status = "failed";
    job.error = resolved.error;
    job.updatedAt = new Date().toISOString();
    return { ...publicJob(job), ...resolved };
  }

  return finishIngest(job, {
    bytes: resolved.bytes,
    contentType: resolved.contentType,
    provenance: resolved.sourceUrl || resolved.source || input.stagingUrl,
  });
}

/**
 * Direct ingest: image bytes in, semantic id out. No public HTTPS host required.
 * Runs the same Game Asset PUT + sanity pipeline as generate / complete.
 */
export async function ingestImage(args = {}) {
  const semanticId = String(args.semanticId || "").trim();
  if (!isSemanticAssetId(semanticId)) {
    return { error: "semantic_id_invalid", semanticId };
  }
  const resolved = await resolveImageBytes(args);
  if (resolved.error) return resolved;

  const created = await createJob(
    {
      semanticId,
      kind: args.kind || inferKind(semanticId),
      brief: String(args.brief || semanticId).slice(0, 800),
      projectId: args.projectId,
      generate: false,
    },
    {}
  );
  if (created.error) return created;

  const done = await completeJob(created.id, {
    bytes: resolved.bytes,
    contentType: resolved.contentType,
    stagingUrl: resolved.sourceUrl || resolved.source || "direct",
  });
  return {
    ...done,
    bindWith: done.semanticId || semanticId,
    ingestedFrom: resolved.source || "direct",
  };
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
            "Return ONLY a plain-language image prompt for OpenAI GPT Image 2.5, under 90 words. Child-safe Abbie's World storybook art. No Midjourney flags (--ar, --stylize). No quotes. No text/logos/UI in the image. Always specify full subject in frame with padding; for characters show face/eyes clearly — never feet-only or half-cropped subjects.",
        },
        {
          role: "user",
          content: `Kind: ${kind}\nBrief: ${brief}\nStyle: ${style}\n${framingPromptAddon(kind)}`,
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
      quality: "high",
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

/** Create an awaiting job and ingest a staging/CDN URL onto the Game Asset registry. */
export async function registerStagingImage({ semanticId, brief, stagingUrl } = {}) {
  const created = await createJob(
    {
      semanticId,
      brief: String(brief || semanticId || "Review candidate").slice(0, 800),
      generate: false,
    },
    {}
  );
  if (created.error) return created;
  return completeJob(created.id, { stagingUrl });
}

export function markBound(id) {
  const job = jobs.get(String(id || ""));
  if (!job) return { error: "job_missing", id };
  if (job.status === "needs_review") {
    return {
      error: "sanity_failed",
      hint: "Job failed subject/framing sanity. Regenerate or set ASSET_SANITY=0 only for emergency override after human look.",
      status: job.status,
      sanity: job.sanity || null,
    };
  }
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

async function applySanityToJob(job, { openaiKey, bytes, contentType, imageUrl } = {}) {
  const sanity = await runAssetSanityCheck({
    openaiKey,
    bytes,
    contentType,
    imageUrl,
    brief: job.brief,
    kind: job.kind,
    semanticId: job.semanticId,
    proofBrief: job.proofBrief,
  });
  job.sanity = sanity;
  job.updatedAt = new Date().toISOString();
  if (sanity.pass) {
    job.status = "registered";
    job.error = null;
  } else {
    job.status = "needs_review";
    job.error = `sanity_failed:${sanity.summary || "framing_or_subject"}`;
  }
  return sanity;
}

/** Reset in-memory state (unit / smoke tests only). */
export function __resetAssetStoreForTests() {
  jobs.clear();
  projects.clear();
}

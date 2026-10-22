/**
 * GET /api/proof-image?missionId=&proofId=&i=&t=
 *     /api/proof-image?jobId=&i=&t=
 *
 * Public image bytes for ChatGPT markdown display. HMAC `t` required.
 */
import { hydrateFromWorld } from "./lib/missions-store.js";
import { verifyProofImage } from "./lib/proof-display.js";

const ORIGIN = (
  process.env.ABBIES_WORLD_SERVER_URL ||
  process.env.ABBIES_WORLD_ORIGIN ||
  "http://abbies.world:8000"
).replace(/\/$/, "");

function corsImage(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=300",
    ...extra,
  };
}

function householdAuth() {
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (env && env !== "[SENSITIVE]" && !env.includes("${")) return `Bearer ${env}`;
  return "";
}

function collectResultUrls(result) {
  if (!result || typeof result !== "object") return [];
  const raw = [];
  if (Array.isArray(result.candidateUrls)) raw.push(...result.candidateUrls);
  if (Array.isArray(result.urls)) raw.push(...result.urls);
  if (typeof result.url === "string") raw.push(result.url);
  return raw.map((u) => String(u || "").trim()).filter((u) => /^https:\/\//i.test(u));
}

async function resolveSourceUrl(url, params) {
  const auth = householdAuth();
  if (!auth) return { error: "proxy_unconfigured", status: 503 };
  const missionId = String(params.get("missionId") || "").trim();
  const proofId = String(params.get("proofId") || "").trim();
  const jobId = String(params.get("jobId") || "").trim();
  const index = Number(params.get("i") || params.get("index") || 0);
  const token = String(params.get("t") || "").trim();
  if (!verifyProofImage({ missionId, proofId, jobId, index, token })) {
    return { error: "not_found", status: 404 };
  }

  const worldRes = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!worldRes.ok) return { error: "world_unavailable", status: 502 };
  const doc = await worldRes.json();
  hydrateFromWorld(doc);

  if (proofId && missionId) {
    const mission = doc?.creative?.missionOs?.missions?.[missionId];
    const proof = (mission?.proofs || []).find((p) => p.id === proofId);
    const all = [
      ...(proof?.payload?.candidates || []),
      ...(proof?.payload?.dumped || []),
    ];
    const chosen =
      all.find((c) => Number(c.index) === index) || all[index - 1] || null;
    const src = chosen?.url || chosen?.previewUrl || "";
    if (!/^https:\/\//i.test(src)) return { error: "not_found", status: 404 };
    return { url: src };
  }

  if (jobId) {
    const job = doc?.creative?.executionCapacity?.jobs?.[jobId];
    const urls = collectResultUrls(job?.result);
    const src = urls[index - 1] || "";
    if (!/^https:\/\//i.test(src)) return { error: "not_found", status: 404 };
    return { url: src };
  }

  return { error: "not_found", status: 404 };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsImage() });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const resolved = await resolveSourceUrl(request.url, params);
  if (resolved.error) {
    return new Response(resolved.error, {
      status: resolved.status || 404,
      headers: corsImage({ "Content-Type": "text/plain" }),
    });
  }

  const upstream = await fetch(resolved.url, {
    headers: {
      Accept: "image/*,*/*",
      "User-Agent": "AbbiesWorld-ProofProxy/1.0",
    },
  });
  if (!upstream.ok) {
    return new Response("upstream_image_failed", {
      status: 502,
      headers: corsImage({ "Content-Type": "text/plain" }),
    });
  }
  const type = upstream.headers.get("content-type") || "image/jpeg";
  return new Response(upstream.body, {
    status: 200,
    headers: corsImage({ "Content-Type": type }),
  });
}

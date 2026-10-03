/**
 * Public display URLs for unapproved proof / harvest images.
 * ChatGPT cannot send Bearer when rendering ![alt](url), so Studio proxies bytes.
 */
import { createHmac } from "crypto";

export const STUDIO_PUBLIC = (
  process.env.STUDIO_PUBLIC_URL ||
  "https://studio-mock-iota.vercel.app"
).replace(/\/$/, "");

function secret() {
  const env = String(process.env.ABBIES_WORLD_TOKEN || process.env.PROOF_IMAGE_SECRET || "studio").trim();
  return env && env !== "[SENSITIVE]" && !env.includes("${") ? env : "studio";
}

export function signProofImage({ missionId = "", proofId = "", jobId = "", index } = {}) {
  const idx = String(Number(index) || 0);
  const msg = `${missionId}|${proofId}|${jobId}|${idx}`;
  return createHmac("sha256", secret()).update(msg).digest("hex").slice(0, 24);
}

export function verifyProofImage(args) {
  const expected = signProofImage(args);
  const got = String(args.token || args.t || "").trim();
  return Boolean(got) && got === expected;
}

export function publicProofImageUrl({ missionId = "", proofId = "", jobId = "", index } = {}) {
  const i = Number(index) || 0;
  const t = signProofImage({ missionId, proofId, jobId, index: i });
  const qs = new URLSearchParams({ i: String(i), t });
  if (missionId) qs.set("missionId", missionId);
  if (proofId) qs.set("proofId", proofId);
  if (jobId) qs.set("jobId", jobId);
  return `${STUDIO_PUBLIC}/api/proof-image?${qs}`;
}

function collectResultUrls(result) {
  if (!result || typeof result !== "object") return [];
  const raw = [];
  if (Array.isArray(result.candidateUrls)) raw.push(...result.candidateUrls);
  if (Array.isArray(result.urls)) raw.push(...result.urls);
  if (Array.isArray(result.images)) {
    raw.push(...result.images.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean));
  }
  if (typeof result.url === "string") raw.push(result.url);
  return [...new Set(raw.map((u) => String(u || "").trim()).filter((u) => /^https:\/\//i.test(u)))];
}

export function unapprovedImageGallery(mission, { worldDoc = null } = {}) {
  const rows = [];
  if (mission) {
    const reqById = Object.fromEntries((mission.requirements || []).map((r) => [r.id, r]));
    for (const proof of mission.proofs || []) {
      if (proof.status !== "awaiting_approval") continue;
      const req = reqById[proof.requirementId] || {};
      for (const c of proof.payload?.candidates || []) {
        const index = Number(c.index);
        const sourceUrl = c.url || c.previewUrl || c.thumbUrl || "";
        if (!/^https:\/\//i.test(sourceUrl)) continue;
        const displayUrl = publicProofImageUrl({
          missionId: mission.id,
          proofId: proof.id,
          index,
        });
        const label = c.label || `Candidate ${index}`;
        rows.push({
          index,
          label,
          proofId: proof.id,
          missionId: mission.id,
          requirementId: proof.requirementId || null,
          semanticId: req.semanticId || c.semanticId || null,
          url: sourceUrl,
          displayUrl,
          markdown: `![${label}](${displayUrl})`,
          status: "awaiting_approval",
          source: "mission_proof",
        });
      }
    }
  }

  const seen = new Set(rows.map((r) => r.url));
  const jobs = worldDoc?.creative?.executionCapacity?.jobs || {};
  for (const job of Object.values(jobs)) {
    if (!job || job.state !== "completed") continue;
    const urls = collectResultUrls(job.result);
    urls.forEach((url, i) => {
      if (seen.has(url)) return;
      seen.add(url);
      const index = i + 1;
      const displayUrl = publicProofImageUrl({ jobId: job.id, index });
      const label = `Harvest ${index}`;
      rows.push({
        index,
        label,
        proofId: null,
        missionId: job.payload?.missionId || mission?.id || null,
        requirementId: job.payload?.requirementId || null,
        semanticId: job.payload?.semanticId || null,
        url,
        displayUrl,
        markdown: `![${label}](${displayUrl})`,
        status: "harvested",
        source: "executionCapacity",
        jobId: job.id,
      });
    });
  }

  return rows;
}

export function galleryMarkdown(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return "";
  const parts = [
    "Unapproved images — display each markdown image in chat. Do not bind to the world until Board.",
    "",
    ...list.map((r) => {
      const meta = [`#${r.index}`, r.semanticId || "", r.proofId || r.jobId || ""]
        .filter(Boolean)
        .join(" · ");
      return `${r.markdown}\n${meta}`;
    }),
  ];
  return parts.join("\n");
}

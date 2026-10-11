/**
 * Cheap post-generate subject + framing sanity for Studio asset jobs.
 *
 * Catches household accidents: feet/shoes instead of face, half-cropped subject,
 * empty frame, wrong subject vs brief. One vision call; skip with ASSET_SANITY=0.
 *
 * Pass → status can be `registered`. Fail → `needs_review` (bytes may still be
 * on registry; Board/bind must not treat as clean).
 */

export const SANITY_MODEL =
  String(process.env.ASSET_SANITY_MODEL || "").trim() || "gpt-4.1-mini";

const HARD_FAIL = new Set([
  "wrong_subject",
  "cropped_subject",
  "feet_not_face",
  "face_missing",
  "empty_or_abstract",
  "unsafe",
  "text_or_ui",
]);

function framingRules(kind) {
  switch (kind) {
    case "map":
      return "Full-bleed map/overland plate. Landmarks fully inside frame with margin. Horizon readable. No giant character face filling the plate unless brief asks.";
    case "poi.interior":
      return "Interior room plate. Subject architecture fully framed. Lower third may be open floor. No cropped doorways cutting key furniture in half.";
    case "poi.exterior":
      return "Single landmark/token. Whole silhouette inside frame with padding. Do not crop the base or roof off.";
    case "portrait":
    case "token":
      return "Character/creature: eyes and face must dominate the useful frame. FAIL if the crop is mostly feet, shoes, legs, quills-only, or top-of-head sliver.";
    default:
      return "Primary subject fully inside frame with padding. No accidental half-crops.";
  }
}

function inferSanityKind(kind, semanticId, brief) {
  const id = `${semanticId || ""} ${brief || ""}`.toLowerCase();
  if (
    /\bportrait\b/.test(id) ||
    /\bface\b/.test(id) ||
    /\bhead\b/.test(id) ||
    /\bcharacter\b/.test(id) ||
    /\babbie\b/.test(id) ||
    /\bdaddy\b/.test(id) ||
    kind === "token"
  ) {
    return "portrait";
  }
  return kind || "poi.exterior";
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  const unfenced = raw.startsWith("```")
    ? raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
    : raw;
  try {
    return JSON.parse(unfenced);
  } catch {
    const m = unfenced.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/**
 * @param {{
 *   openaiKey: string,
 *   bytes?: Buffer,
 *   contentType?: string,
 *   imageUrl?: string,
 *   brief: string,
 *   kind: string,
 *   semanticId: string,
 *   proofBrief?: string,
 * }} args
 */
export async function runAssetSanityCheck(args = {}) {
  if (String(process.env.ASSET_SANITY || "1").trim() === "0") {
    return {
      pass: true,
      skipped: true,
      model: null,
      summary: "ASSET_SANITY=0",
      flags: [],
      subjectDescription: null,
    };
  }

  const key = String(args.openaiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    return {
      pass: true,
      skipped: true,
      model: null,
      summary: "sanity_skipped_no_openai_key",
      flags: ["sanity_skipped"],
      subjectDescription: null,
      hint: "Set OPENAI_API_KEY to enable subject/framing checks.",
    };
  }

  const kind = inferSanityKind(args.kind, args.semanticId, args.brief);
  const brief = String(args.brief || "").slice(0, 400);
  const proof = String(args.proofBrief || "").slice(0, 400);
  const semanticId = String(args.semanticId || "");

  let imagePart = null;
  if (args.imageUrl && /^https:\/\//i.test(args.imageUrl)) {
    imagePart = { type: "image_url", image_url: { url: args.imageUrl } };
  } else if (args.bytes && Buffer.isBuffer(args.bytes) && args.bytes.length > 32) {
    const ct = String(args.contentType || "image/png").split(";")[0] || "image/png";
    // Cap payload: if huge, still send — Vercel may struggle; prefer URL when possible.
    const b64 = args.bytes.toString("base64");
    if (b64.length > 6_000_000) {
      return {
        pass: false,
        skipped: false,
        model: SANITY_MODEL,
        summary: "image_too_large_for_inline_sanity",
        flags: ["sanity_payload_too_large"],
        subjectDescription: null,
        hint: "Provide deliveryURL for sanity, or shrink image.",
      };
    }
    imagePart = {
      type: "image_url",
      image_url: { url: `data:${ct};base64,${b64}` },
    };
  } else {
    return {
      pass: false,
      skipped: false,
      model: null,
      summary: "no_image_for_sanity",
      flags: ["sanity_no_image"],
      subjectDescription: null,
    };
  }

  const system = `You are Abbie's World art QA. Child-safe storybook game art.
Return ONLY JSON:
{
  "pass": boolean,
  "subjectDescription": "one short sentence of what you see",
  "matchesBrief": boolean,
  "framingOk": boolean,
  "flags": string[],
  "summary": "≤20 words"
}
Allowed flags: wrong_subject, cropped_subject, feet_not_face, face_missing, empty_or_abstract, unsafe, text_or_ui, soft_warn_busy, soft_warn_busy_background.
HARD FAIL (pass=false) if any of: wrong_subject, cropped_subject, feet_not_face, face_missing, empty_or_abstract, unsafe, text_or_ui.
feet_not_face = crop dominated by feet/shoes/legs when a face/character was expected.
cropped_subject = primary subject cut in half or clipped at edge.
Be strict on framing; soft_warn_* alone may still pass=true.`;

  const userText = [
    `semanticId: ${semanticId}`,
    `kind: ${kind}`,
    `framing contract: ${framingRules(kind)}`,
    `brief: ${brief}`,
    proof ? `proofBrief: ${proof}` : "",
    "Does the image match the brief and framing contract?",
  ]
    .filter(Boolean)
    .join("\n");

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SANITY_MODEL,
        temperature: 0,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [{ type: "text", text: userText }, imagePart],
          },
        ],
      }),
    });
  } catch (err) {
    return {
      pass: false,
      skipped: false,
      model: SANITY_MODEL,
      summary: `sanity_request_failed:${String(err?.message || err).slice(0, 80)}`,
      flags: ["sanity_request_failed"],
      subjectDescription: null,
    };
  }

  const text = await upstream.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!upstream.ok) {
    return {
      pass: false,
      skipped: false,
      model: SANITY_MODEL,
      summary: `sanity_http_${upstream.status}`,
      flags: ["sanity_http_error"],
      subjectDescription: null,
      detail: String(payload?.error?.message || text).slice(0, 200),
    };
  }

  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(content);
  if (!parsed || typeof parsed !== "object") {
    return {
      pass: false,
      skipped: false,
      model: SANITY_MODEL,
      summary: "sanity_non_json",
      flags: ["sanity_non_json"],
      subjectDescription: null,
      raw: String(content || "").slice(0, 400),
    };
  }

  const flags = Array.isArray(parsed.flags)
    ? parsed.flags.map((f) => String(f)).slice(0, 12)
    : [];
  const hard = flags.some((f) => HARD_FAIL.has(f));
  let pass = parsed.pass === true && parsed.framingOk !== false && parsed.matchesBrief !== false;
  if (hard) pass = false;
  if (flags.includes("feet_not_face") || flags.includes("cropped_subject")) pass = false;

  return {
    pass,
    skipped: false,
    model: SANITY_MODEL,
    summary: String(parsed.summary || (pass ? "ok" : "failed")).slice(0, 160),
    flags,
    subjectDescription: String(parsed.subjectDescription || "").slice(0, 240) || null,
    matchesBrief: parsed.matchesBrief === true,
    framingOk: parsed.framingOk === true,
  };
}

export function framingPromptAddon(kind) {
  const k = inferSanityKind(kind, "", "");
  return `Framing: ${framingRules(k)} Subject fully inside frame with padding. Never crop the subject in half. For characters show the face/eyes clearly — never a feet-only or legs-only crop.`;
}

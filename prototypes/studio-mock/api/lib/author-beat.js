/**
 * NL → closed op plan for author_beat.
 * Model may only propose AUTHOR_OPS; validateAuthorPlan enforces the rail.
 */

import { AUTHOR_OPS, BEHAVIORS, validateAuthorPlan } from "./steel-rail.js";

const SYSTEM = `You are the steel-rail planner for Abbie's World (gentle kids iPad game).
Return ONLY JSON: { "ops": [ { "op": "...", "args": { ... }, "note": "..." } ], "narration": "one short sentence" }

Allowed op values (exact):
${[...AUTHOR_OPS].join(", ")}

Allowed place behaviors (exact, or travel:sceneId, or fallingTargets:id):
${[...BEHAVIORS].join(", ")}

Rules:
- Prefer semantic asset ids (map.*, poi.*.exterior|interior) over https URLs.
- If art is missing, emit asset.job_create then asset.bind with the semanticId.
- place.upsert needs sceneId, name, behavior, x, y in 0..1 (prefer 0.12..0.88).
- Never invent new behaviors or screens.
- Never touch players.
- Keep plans small: 1–6 ops.
- sceneIds look like scene.peglin.crashLand; placeIds like poi.peglin.pegMonastery.
`;

export async function planAuthorBeat({ intent, describe, activeSceneHint, openaiKey }) {
  const user = [
    `Intent:\n${String(intent || "").trim().slice(0, 2000)}`,
    activeSceneHint ? `Preferred scene: ${activeSceneHint}` : "",
    `Current world (compact):\n${JSON.stringify(describe).slice(0, 12000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!openaiKey) {
    return heuristicPlan(intent, describe, activeSceneHint);
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });

  if (!upstream.ok) {
    const fallback = heuristicPlan(intent, describe, activeSceneHint);
    fallback.warnings = [`openai_${upstream.status}_used_heuristic`];
    return fallback;
  }

  const payload = await upstream.json();
  let parsed;
  try {
    parsed = JSON.parse(payload?.choices?.[0]?.message?.content || "{}");
  } catch {
    return { error: "planner_json_invalid" };
  }
  return parsed;
}

/** Tiny offline planner so author_beat works without OpenAI. */
function heuristicPlan(intent, describe, activeSceneHint) {
  const text = String(intent || "").toLowerCase();
  const scenes = describe?.scenes || [];
  const sceneId =
    activeSceneHint ||
    describe?.activeSceneID ||
    scenes[0]?.id ||
    "scene.home";

  if (text.includes("monastery") || text.includes("peg monastery")) {
    return {
      narration: "Place Peg Monastery on the active land and bind exterior art.",
      ops: [
        {
          op: "asset.job_create",
          args: {
            semanticId: "poi.peglin.pegMonastery.exterior",
            kind: "poi.exterior",
            brief: "floating white monastery with blue roofs and waterfalls in a bright sky",
          },
          note: "generate exterior plate",
        },
        {
          op: "place.upsert",
          args: {
            sceneId,
            placeId: "poi.peglin.pegMonastery",
            name: "Peg Monastery",
            behavior: "pegMonastery",
            exteriorAsset: "poi.peglin.pegMonastery.exterior",
            interiorAsset: "poi.peglin.pegMonastery.interior",
            x: 0.72,
            y: 0.42,
            scale: 1.2,
          },
        },
      ],
    };
  }

  return {
    narration: "Add a rooms landmark on the active scene (customize via confirm after dry run).",
    ops: [
      {
        op: "place.upsert",
        args: {
          sceneId,
          placeId: `poi.authored.${Date.now().toString(36)}`,
          name: "New Place",
          behavior: "rooms",
          exteriorAsset: "poi.spookyPortal.exterior",
          x: 0.5,
          y: 0.55,
        },
      },
    ],
  };
}

export function validatePlanAgainstWorld(plan, doc) {
  return validateAuthorPlan(plan, doc);
}

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
- If art is missing, emit asset.job_create (server generates via OpenAI gpt-image-2.5-sunburst) then place.upsert with that exteriorAsset/interiorAsset. Optional asset.bind only with placeId+slot (or sceneId+slot background).
- Order ops: asset.job_create → place.upsert / place.remove / scene.* → asset.bind last.
- place.upsert needs sceneId, name, behavior, x, y in 0..1 (prefer 0.12..0.88).
- To remove a POI from a scene, emit place.remove with sceneId plus placeId (preferred) or name. NEVER delete a pin by scene.upsert / rewriting the whole scene.
- scene.upsert MUST pass args.sceneId (never args.id). Updating scene.home requires sceneId:"scene.home". Omitting sceneId mints a dangerous new scene — forbidden unless create:true and a new name.
- To delete an accidental scene, emit scene.delete with sceneId. Never delete scene.home.
- Never invent new behaviors or screens.
- Never touch players.
- Keep plans small: 1–6 ops.
- sceneIds look like scene.peglin.crashLand or scene.home; placeIds like poi.peglin.pegMonastery or poi.moonBase.rocket.
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
    pickSceneId(intent, describe, activeSceneHint) ||
    describe?.activeSceneID ||
    scenes[0]?.id ||
    "scene.home";

  const removeIntent = /\b(remove|delete|drop|omit|unplace|take away|get rid of)\b/.test(text);
  if (removeIntent) {
    const ops = [];
    const accidental = String(intent || "").match(/scene\.mcp[a-z0-9]+/i);
    if (accidental) {
      ops.push({
        op: "scene.delete",
        args: { sceneId: accidental[0] },
        note: "remove minted duplicate",
      });
    }
    const pin = pickPlaceRef(intent, describe, sceneId);
    if (pin) {
      ops.push({
        op: "place.remove",
        args: {
          sceneId: pin.sceneId,
          placeId: pin.placeId,
          name: pin.name || undefined,
        },
        note: "drop POI from scene, leave other pins",
      });
    }
    if (ops.length) {
      const bits = ops.map((step) =>
        step.op === "scene.delete"
          ? `Delete ${step.args.sceneId}`
          : `Remove ${step.args.name || step.args.placeId} from ${step.args.sceneId}`
      );
      return { narration: `${bits.join(". ")}.`, ops };
    }
  }

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

function pickSceneId(intent, describe, hint) {
  const text = String(intent || "");
  const named = [...text.matchAll(/scene\.[a-zA-Z0-9.]+/g)]
    .map((m) => m[0])
    .find((id) => !/^scene\.mcp/i.test(id));
  if (named) return named;
  if (hint) return hint;
  const scenes = describe?.scenes || [];
  const byName = scenes.find((s) => s.name && text.toLowerCase().includes(String(s.name).toLowerCase()));
  return byName?.id || describe?.activeSceneID || scenes[0]?.id || "";
}

function pickPlaceRef(intent, describe, fallbackSceneId) {
  const text = String(intent || "");
  const lower = text.toLowerCase();
  const idMatch = text.match(/poi\.[a-zA-Z0-9.]+/);
  const scenes = describe?.scenes || [];
  for (const scene of scenes) {
    for (const pin of scene.places || []) {
      if (idMatch && pin.placeId === idMatch[0]) {
        return { sceneId: scene.id, placeId: pin.placeId, name: pin.name };
      }
      if (pin.name && lower.includes(String(pin.name).toLowerCase())) {
        return { sceneId: scene.id, placeId: pin.placeId, name: pin.name };
      }
    }
  }
  if (idMatch) {
    return { sceneId: fallbackSceneId, placeId: idMatch[0], name: "" };
  }
  return null;
}

export function validatePlanAgainstWorld(plan, doc) {
  return validateAuthorPlan(plan, doc);
}

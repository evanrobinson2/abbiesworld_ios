const MODEL = "gpt-5.4";

const SYSTEM = `You propose a decoration pack for one Abbie's World scene plate.

Return ONLY valid JSON (no markdown):
{
  "items": [
    {
      "label": "Lantern",
      "objectFamilyID": "object.lighting"|"object.seating"|"object.rug"|"object.furniture"|"object.storage"|"object.wall-decoration",
      "placement": "floor"|"wall",
      "scores": { "type": 0.0, "quality": 0.0, "appropriateness": 0.0, "accuracy": 0.0 },
      "why": "short"
    }
  ]
}

Rules:
- Propose 6–8 props grounded in the scene name + prompt (+ lore if any).
- Labels are SHORT display names: max 12 characters, one or two words (Lamp, Rug, Pillow).
- Kids-safe, gentle house style. Score honestly 0–1 on each dimension.
- Prefer diversity of objectFamilyID.
- Do not invent brands or text-on-prop.`;

function overall(scores) {
  const t = Number(scores?.type) || 0;
  const q = Number(scores?.quality) || 0;
  const a = Number(scores?.appropriateness) || 0;
  const c = Number(scores?.accuracy) || 0;
  return a * 0.35 + q * 0.25 + t * 0.2 + c * 0.2;
}

function keep(scores) {
  const t = Number(scores?.type) || 0;
  const q = Number(scores?.quality) || 0;
  const a = Number(scores?.appropriateness) || 0;
  const c = Number(scores?.accuracy) || 0;
  if (t < 0.55 || q < 0.6 || a < 0.85 || c < 0.5) return false;
  return overall(scores) >= 0.62;
}

function plateHash(plateURL) {
  const s = String(plateURL || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (`00000000${(h >>> 0).toString(16)}`).slice(-8);
}

export async function POST(request) {
  const key = process.env.OPENAI_API_KEY || "";
  if (!key) {
    return Response.json({ error: "openai_missing" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const sceneId = String(body?.sceneId || "").trim().slice(0, 80);
  const sceneName = String(body?.sceneName || "").trim().slice(0, 80);
  const prompt = String(body?.prompt || "").trim().slice(0, 2000);
  const plateURL = String(body?.plateURL || "").trim().slice(0, 500);
  const lore = String(body?.lore || "").trim().slice(0, 4000);
  const advice = String(body?.advice || "").trim().slice(0, 800);
  if (!sceneId || !sceneName) {
    return Response.json({ error: "scene_required" }, { status: 400 });
  }

  const jobId = `autodecor.${sceneId}.${plateHash(plateURL || sceneId)}`;
  const startedAt = new Date().toISOString();

  const userParts = [
    `Scene id: ${sceneId}`,
    `Scene name: ${sceneName}`,
  ];
  if (prompt) userParts.push(`Plate prompt:\n${prompt}`);
  if (lore) userParts.push(`Story lore:\n${lore}`);
  if (advice) userParts.push(`Creator advice:\n${advice}`);
  userParts.push("Propose the decoration pack JSON now.");

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userParts.join("\n\n") },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json({
      jobId,
      status: "failed",
      plateSha256: plateHash(plateURL),
      startedAt,
      updatedAt: new Date().toISOString(),
      generationsRequested: 5,
      generationsDone: 0,
      items: [],
      keptCount: 0,
      culledCount: 0,
      error: "autodecor_failed",
      detail: detail.slice(0, 240),
    }, { status: 502 });
  }

  const payload = await upstream.json();
  const raw = payload?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({
      jobId,
      status: "failed",
      plateSha256: plateHash(plateURL),
      startedAt,
      updatedAt: new Date().toISOString(),
      items: [],
      keptCount: 0,
      culledCount: 0,
      error: "bad_json",
    }, { status: 502 });
  }

  const families = new Set([
    "object.lighting",
    "object.seating",
    "object.rug",
    "object.furniture",
    "object.storage",
    "object.wall-decoration",
  ]);

  const proposed = (Array.isArray(parsed.items) ? parsed.items : [])
    .map((row, index) => {
      const scores = {
        type: Math.min(1, Math.max(0, Number(row?.scores?.type) || 0)),
        quality: Math.min(1, Math.max(0, Number(row?.scores?.quality) || 0)),
        appropriateness: Math.min(1, Math.max(0, Number(row?.scores?.appropriateness) || 0)),
        accuracy: Math.min(1, Math.max(0, Number(row?.scores?.accuracy) || 0)),
      };
      const family = families.has(row?.objectFamilyID) ? row.objectFamilyID : "object.furniture";
      const placement = row?.placement === "wall" || family === "object.wall-decoration" ? "wall" : "floor";
      return {
        id: `${jobId}.${index}`,
        label: String(row?.label || "Prop").trim().slice(0, 12),
        objectFamilyID: family,
        placement,
        generationIndex: index,
        scores,
        overall: Number(overall(scores).toFixed(3)),
        kept: keep(scores),
        why: String(row?.why || "").trim().slice(0, 100),
        registryKey: `scene-autodecor/${sceneId}/${jobId}/${index}`,
      };
    })
    .filter((row) => row.label);

  // Diversity preference among keepers, cap pack.
  const kept = [];
  const seenFamily = new Set();
  const ranked = [...proposed].sort((a, b) => b.overall - a.overall);
  for (const item of ranked) {
    if (!item.kept) continue;
    if (kept.length >= 5) {
      item.kept = false;
      continue;
    }
    if (seenFamily.has(item.objectFamilyID) && kept.length >= 3) {
      // allow some dupes only after we have breadth
    }
    kept.push(item);
    seenFamily.add(item.objectFamilyID);
  }
  const keptIds = new Set(kept.map((i) => i.id));
  for (const item of proposed) {
    item.kept = keptIds.has(item.id);
  }

  const pack = {
    jobId,
    status: "ready",
    plateSha256: plateHash(plateURL),
    startedAt,
    updatedAt: new Date().toISOString(),
    generationsRequested: 5,
    generationsDone: 1,
    items: proposed,
    keptCount: proposed.filter((i) => i.kept).length,
    culledCount: proposed.filter((i) => !i.kept).length,
    note: "Proposed + scored. iPad invent cooks real cutouts from kept labels.",
  };

  return Response.json(pack);
}

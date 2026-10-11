const MODEL = "gpt-5.4";

const SYSTEM = `You suggest exits and places for Abbie's World Studio — a gentle kids' map editor.

Return ONLY valid JSON (no markdown) shaped like:
{
  "exits": [
    { "direction": "n"|"s"|"e"|"w"|"ne"|"nw"|"se"|"sw", "label": "Short name", "why": "one kid-safe reason", "seedPrompt": "optional Midjourney vibe seed" }
  ],
  "pois": [
    { "label": "Short name", "kind": "poi"|"portal"|"decoration", "behavior": "rooms"|archetypeId|"travel", "why": "one kid-safe reason", "x": 0.2, "y": 0.5 }
  ],
  "note": "one sentence about this roll"
}

Rules:
- More is better: aim for 4–8 exits and 4–8 pois (mix kinds). Prefer open compass directions when listed.
- Labels ≤ 18 characters, concrete, warm, no brands/celebrities.
- Child-safe. Spooky-cozy ok; no gore, weapons-as-focus, or romance.
- Honor revision advice when provided. Vary from prior suggestions when re-rolling.
- x/y are 0–1 plate coords; keep away from edges (0.12–0.88).
- If story lore is present, lean on it. If absent, use scene name + prompt + neighbors.`;

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

  const sceneName = String(body?.sceneName || "").trim().slice(0, 80);
  const prompt = String(body?.prompt || "").trim().slice(0, 2000);
  const summary = String(body?.summary || "").trim().slice(0, 400);
  const advice = String(body?.advice || "").trim().slice(0, 800);
  const lore = String(body?.lore || "").trim().slice(0, 4000);
  const openDirs = Array.isArray(body?.openDirections)
    ? body.openDirections.map((d) => String(d || "").trim().toLowerCase()).filter(Boolean).slice(0, 8)
    : [];
  const neighbors = Array.isArray(body?.neighbors)
    ? body.neighbors.map((n) => String(n || "").trim().slice(0, 60)).filter(Boolean).slice(0, 12)
    : [];
  const existing = Array.isArray(body?.existing)
    ? body.existing.map((n) => String(n || "").trim().slice(0, 60)).filter(Boolean).slice(0, 20)
    : [];
  const prior = body?.prior && typeof body.prior === "object" ? body.prior : null;

  const userParts = [];
  if (sceneName) userParts.push(`Scene: ${sceneName}`);
  if (summary) userParts.push(`Summary: ${summary}`);
  if (prompt) userParts.push(`Plate prompt:\n${prompt}`);
  if (neighbors.length) userParts.push(`Neighbor scenes: ${neighbors.join(", ")}`);
  if (openDirs.length) userParts.push(`Open exit directions (prefer these): ${openDirs.join(", ")}`);
  if (existing.length) userParts.push(`Already on this scene: ${existing.join(", ")}`);
  if (lore) userParts.push(`Story lore (prefer):\n${lore}`);
  if (prior) userParts.push(`Prior suggestions (vary on re-roll):\n${JSON.stringify(prior).slice(0, 3000)}`);
  if (advice) userParts.push(`Creator advice for this re-roll:\n${advice}`);
  userParts.push("Propose exits and places now as JSON.");

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: advice ? 0.95 : 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userParts.join("\n\n") },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: "suggest_failed", status: upstream.status, detail: detail.slice(0, 240) },
      { status: 502 }
    );
  }

  const payload = await upstream.json();
  const raw = payload?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad_json", detail: raw.slice(0, 240) }, { status: 502 });
  }

  const dirs = new Set(["n", "s", "e", "w", "ne", "nw", "se", "sw"]);
  const exits = (Array.isArray(parsed.exits) ? parsed.exits : [])
    .map((row) => ({
      direction: dirs.has(String(row?.direction || "").toLowerCase())
        ? String(row.direction).toLowerCase()
        : "e",
      label: String(row?.label || "Path").trim().slice(0, 18),
      why: String(row?.why || "").trim().slice(0, 120),
      seedPrompt: String(row?.seedPrompt || "").trim().slice(0, 240),
    }))
    .filter((row) => row.label)
    .slice(0, 10);

  const pois = (Array.isArray(parsed.pois) ? parsed.pois : [])
    .map((row) => {
      const kind = ["poi", "portal", "decoration"].includes(row?.kind) ? row.kind : "poi";
      const x = Number(row?.x);
      const y = Number(row?.y);
      return {
        label: String(row?.label || "Place").trim().slice(0, 18),
        kind,
        behavior: String(row?.behavior || (kind === "decoration" ? "decoration" : "rooms")).trim().slice(0, 60),
        why: String(row?.why || "").trim().slice(0, 120),
        x: Number.isFinite(x) ? Math.min(0.88, Math.max(0.12, x)) : 0.5,
        y: Number.isFinite(y) ? Math.min(0.88, Math.max(0.12, y)) : 0.55,
      };
    })
    .filter((row) => row.label)
    .slice(0, 12);

  return Response.json({
    exits,
    pois,
    note: String(parsed.note || "").trim().slice(0, 200),
    model: MODEL,
  });
}

import {
  ABBIES_WORLD_MUSIC_STANDARD,
  MUSIC_OUTPUT_RULES,
} from "./abbies-world-music-standard.js";

const MODEL = "gpt-5.4";

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

  const inspiration = String(body?.inspiration || "").trim().slice(0, 1200);
  const revise = String(body?.revise || "").trim().slice(0, 800);
  const prior = String(body?.prior || "").trim().slice(0, 4000);
  const sceneName = String(body?.sceneName || "").trim().slice(0, 80);
  const functionHint = String(body?.gameFunction || "OVERLAND").trim().slice(0, 40);
  const neighbors = Array.isArray(body?.neighbors)
    ? body.neighbors.map((name) => String(name || "").trim().slice(0, 60)).filter(Boolean).slice(0, 8)
    : [];

  if (!inspiration && !revise) {
    return Response.json({ error: "inspiration_required" }, { status: 400 });
  }

  const userParts = [];
  userParts.push(`Game function: ${functionHint || "OVERLAND"}`);
  if (sceneName) userParts.push(`Scene / room: ${sceneName}`);
  if (neighbors.length) userParts.push(`Nearby places: ${neighbors.join(", ")}`);
  if (inspiration) userParts.push(`Place / mood ideation:\n${inspiration}`);
  if (prior) userParts.push(`Current music prompt:\n${prior}`);
  if (revise) userParts.push(`Revision request:\n${revise}`);
  if (!revise) userParts.push("Write the Suno-ready music generation prompt now.");

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `${ABBIES_WORLD_MUSIC_STANDARD}\n\n${MUSIC_OUTPUT_RULES}`,
        },
        { role: "user", content: userParts.join("\n\n") },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: "compose_failed", status: upstream.status, detail: detail.slice(0, 240) },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

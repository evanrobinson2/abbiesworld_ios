const MODEL = "gpt-5.4";

const SYSTEM = `You write Midjourney prompts for Abbie's World, a gentle kids' game for a six-year-old.

Return ONLY the Midjourney prompt text. No quotes, no markdown, no preamble.

Hard rules for every prompt:
- One painted place plate, not a collage or UI mock
- Stylized storybook / soft clay / watercolor illustration — never photoreal, never CGI gloss
- Child-safe, warm, inviting; spooky is okay if cozy, never gore or horror
- Landscape orientation for a map plate: end with --ar 16:9 --stylize 250
- No text, letters, watermarks, logos, or UI chrome in the image
- No real brand names, no celebrity likeness
- Keep it under 70 words before the flags
- Prefer concrete subjects, weather, time of day, and one clear art medium

When the user revises, honor the revision while keeping these rules.`;

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
  const prior = String(body?.prior || "").trim().slice(0, 2000);
  const sceneName = String(body?.sceneName || "").trim().slice(0, 80);
  const neighbors = Array.isArray(body?.neighbors)
    ? body.neighbors.map((name) => String(name || "").trim().slice(0, 60)).filter(Boolean).slice(0, 8)
    : [];

  if (!inspiration && !revise) {
    return Response.json({ error: "inspiration_required" }, { status: 400 });
  }

  const userParts = [];
  if (sceneName) userParts.push(`Working title: ${sceneName}`);
  if (neighbors.length) userParts.push(`Nearby places on the map: ${neighbors.join(", ")}`);
  if (inspiration) userParts.push(`What kind of scene the creator is trying to make:\n${inspiration}`);
  if (prior) userParts.push(`Current Midjourney prompt:\n${prior}`);
  if (revise) userParts.push(`Revision request:\n${revise}`);
  if (!revise) {
    userParts.push(
      "Blend their scene idea with Abbie's World scene-creation advice above. Write one Midjourney prompt now that a parent could paste into Create."
    );
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.8,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userParts.join("\n\n") },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: "inspire_failed", status: upstream.status, detail: detail.slice(0, 240) },
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

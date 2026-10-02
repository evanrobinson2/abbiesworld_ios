/**
 * Wake Cursor Minigame Maker when Mission eng work is queued.
 * Set MINIGAME_MAKER_WEBHOOK_URL (and optional MINIGAME_MAKER_WEBHOOK_SECRET)
 * after creating the Cursor Automation webhook trigger.
 *
 * Fire-and-forget — never blocks Mission writes.
 */

export async function notifyMinigameMaker(payload = {}) {
  const url = String(process.env.MINIGAME_MAKER_WEBHOOK_URL || "").trim();
  if (!/^https:\/\//i.test(url)) {
    return { skipped: true, reason: "MINIGAME_MAKER_WEBHOOK_URL unset" };
  }

  const body = {
    type: "eng_auto_dispatch",
    at: new Date().toISOString(),
    ...payload,
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const secret = String(process.env.MINIGAME_MAKER_WEBHOOK_SECRET || "").trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err?.message || err).slice(0, 160) };
  }
}

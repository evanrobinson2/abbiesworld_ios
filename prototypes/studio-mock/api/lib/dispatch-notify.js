/**
 * Phone alerts for dispatch moments Evan may want to act on mid-run (concept art and other
 * checkpoints, questions, completion, failure). Uses the app's existing Web Push subscriptions
 * (household world creative.missionOs.pushSubscriptions). Fire-and-forget: never blocks the relay.
 */
import { sendSparsePush } from "./push.js";

const ORIGIN = "http://game.abbies.world:8000";

export function alertFor(record, msg) {
  if (!msg || msg.from !== "claude") return null;
  const short = (record.request || "").slice(0, 60);
  if (msg.checkpoint || msg.images?.length) {
    const what = msg.checkpoint ? msg.checkpoint.replace(/[_-]+/g, " ") : "progress images";
    return { title: `${what[0].toUpperCase()}${what.slice(1)} ready`, body: `${short}: still building. Tap to review or steer.` };
  }
  if (msg.kind === "question") return { title: "Claude has a question", body: msg.text.slice(0, 140) };
  if (msg.kind === "completed") return { title: "Build finished", body: `${short}${record.verified ? " (verified)" : ""}` };
  if (msg.kind === "failed") return { title: "Build failed", body: msg.text.slice(0, 140) };
  return null;
}

export async function notifyDispatchEvent(record, msg, { fetchImpl = fetch } = {}) {
  const alert = alertFor(record, msg);
  if (!alert) return { skipped: true, reason: "not_alertable" };
  const token = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (!token) return { skipped: true, reason: "no_household_token" };
  try {
    const res = await fetchImpl(`${ORIGIN}/api/v1/worlds/current`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { skipped: true, reason: `world_${res.status}` };
    const doc = await res.json();
    return await sendSparsePush(doc, {
      ...alert,
      url: `https://studio-mock-iota.vercel.app/review.html?dispatch=${encodeURIComponent(record.id)}&event=${encodeURIComponent(msg.id)}`,
      tag: `dispatch-${record.id}`,
      data: { dispatchId: record.id, eventId: msg.id, kind: msg.kind, checkpoint: msg.checkpoint || null },
    });
  } catch (err) {
    return { skipped: true, reason: String(err?.message || err).slice(0, 120) };
  }
}

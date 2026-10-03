/**
 * Sparse Web Push for phone Board/Dump (review.html home-screen).
 * Subscriptions live on household world: creative.missionOs.pushSubscriptions.
 */
import webpush from "web-push";

const MAX_SUBS = 12;

function nowIso() {
  return new Date().toISOString();
}

export function vapidConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      String(process.env.VAPID_PUBLIC_KEY).length > 20
  );
}

export function getVapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || "").trim();
}

function applyVapid() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    String(process.env.VAPID_SUBJECT || "mailto:evan@abbies.world").trim(),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

function missionOs(doc) {
  if (!doc.creative) doc.creative = {};
  if (!doc.creative.missionOs) {
    doc.creative.missionOs = { version: 1, missions: [], updatedAt: nowIso() };
  }
  if (!Array.isArray(doc.creative.missionOs.pushSubscriptions)) {
    doc.creative.missionOs.pushSubscriptions = [];
  }
  return doc.creative.missionOs;
}

export function listPushSubscriptions(doc) {
  return [...(doc?.creative?.missionOs?.pushSubscriptions || [])];
}

export function upsertPushSubscription(doc, subscription, { userAgent = "" } = {}) {
  const os = missionOs(doc);
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !auth) {
    return { error: "subscription_invalid" };
  }
  const next = {
    endpoint,
    keys: { p256dh, auth },
    userAgent: String(userAgent || "").slice(0, 160),
    updatedAt: nowIso(),
    createdAt: nowIso(),
  };
  const idx = os.pushSubscriptions.findIndex((s) => s.endpoint === endpoint);
  if (idx >= 0) {
    next.createdAt = os.pushSubscriptions[idx].createdAt || next.createdAt;
    os.pushSubscriptions[idx] = next;
  } else {
    os.pushSubscriptions.push(next);
  }
  while (os.pushSubscriptions.length > MAX_SUBS) os.pushSubscriptions.shift();
  os.updatedAt = nowIso();
  return { subscription: next, count: os.pushSubscriptions.length };
}

export function removePushSubscription(doc, endpoint) {
  const os = missionOs(doc);
  const before = os.pushSubscriptions.length;
  os.pushSubscriptions = os.pushSubscriptions.filter((s) => s.endpoint !== String(endpoint || ""));
  os.updatedAt = nowIso();
  return { removed: before - os.pushSubscriptions.length, count: os.pushSubscriptions.length };
}

/**
 * Fire-and-forget sparse alert. Never throws into Mission tools.
 */
export async function sendSparsePush(doc, payload = {}) {
  if (!applyVapid()) {
    return { skipped: true, reason: "vapid_unconfigured" };
  }
  const subs = listPushSubscriptions(doc);
  if (!subs.length) return { skipped: true, reason: "no_subscribers", sent: 0 };

  const title = String(payload.title || "Abbie’s World").slice(0, 80);
  const body = String(payload.body || "Something needs your eye").slice(0, 160);
  const url = String(payload.url || "https://studio-mock-iota.vercel.app/review.html").slice(0, 400);
  const tag = String(payload.tag || "abbies-review").slice(0, 80);
  const data = JSON.stringify({ title, body, url, tag, ...((payload.data && typeof payload.data === "object") ? payload.data : {}) });

  const results = [];
  const gone = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        data,
        { TTL: 60 * 60 * 12, urgency: "high" }
      );
      results.push({ endpoint: sub.endpoint.slice(-24), ok: true });
    } catch (err) {
      const status = err?.statusCode || err?.status || 0;
      results.push({
        endpoint: sub.endpoint.slice(-24),
        ok: false,
        status,
        message: String(err?.message || err).slice(0, 120),
      });
      if (status === 404 || status === 410) gone.push(sub.endpoint);
    }
  }

  for (const endpoint of gone) removePushSubscription(doc, endpoint);

  return {
    sent: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    pruned: gone.length,
    results,
  };
}

export async function notifyProofsReady(doc, { missionTitle, missionId, proofId, candidateCount = 0 } = {}) {
  const qs = new URLSearchParams();
  if (missionId) qs.set("missionId", missionId);
  if (proofId) qs.set("proofId", proofId);
  const path = qs.toString() ? `review.html?${qs}` : "review.html";
  const url = `https://studio-mock-iota.vercel.app/${path}`;
  const n = Number(candidateCount) || 0;
  return sendSparsePush(doc, {
    title: missionTitle || "Art ready",
    body: n > 0 ? `${n} candidate${n === 1 ? "" : "s"} — Board or Dump` : "Proofs ready — Board or Dump",
    url,
    tag: proofId ? `proof-${proofId}` : `mission-${missionId || "review"}`,
    data: { missionId, proofId },
  });
}

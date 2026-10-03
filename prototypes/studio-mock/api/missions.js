/**
 * Mission review against the household GAME SERVER world document.
 *
 * SoT: GET/PUT http://abbies.world:8000/api/v1/worlds/current
 *      → creative.missionOs.missions
 *
 * Auth: Authorization Bearer = Auth0 household token
 *       (request header, or ABBIES_WORLD_TOKEN env on Studio for phone proxy).
 *
 * GET  /api/missions?missionId=…           → review deck from awaiting proof
 * GET  /api/missions?missionId=…&describe=1 → mission_describe JSON
 * POST /api/missions { action: board|dump|unkeep|restore|feedback|registry, missionId, … }
 */
import {
  getMissionFromDoc,
  listMissionsFromDoc,
  hydrateFromWorld,
  upsertMissionOnDoc,
  deckFromMission,
  describeMission,
  approveProof,
  rejectProof,
  reverseKeep,
  restoreDump,
  appendMissionFeedback,
  reviewHistoryFromDoc,
} from "./lib/missions-store.js";
import { registerStagingImage } from "./lib/asset-jobs-store.js";
import { deleteRegisteredAsset } from "./lib/asset-registry.js";

const ORIGIN = (
  process.env.ABBIES_WORLD_SERVER_URL ||
  process.env.ABBIES_WORLD_ORIGIN ||
  "http://abbies.world:8000"
).replace(/\/$/, "");

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

function authFrom(request) {
  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Bearer ") && header.length > 20) {
    const token = header.slice(7).trim();
    if (!token.includes("${") && token !== "[SENSITIVE]") return `Bearer ${token}`;
  }
  const env = String(process.env.ABBIES_WORLD_TOKEN || "").trim();
  if (env && env !== "[SENSITIVE]" && !env.includes("${")) return `Bearer ${env}`;
  return "";
}

async function readWorld(auth) {
  const response = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "bad_upstream" };
  }
  return { status: response.status, body };
}

async function writeWorld(auth, doc, expected) {
  const payload = { ...doc, expectedRevision: expected };
  delete payload.revision;
  const saved = await fetch(`${ORIGIN}/api/v1/worlds/current`, {
    method: "PUT",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await saved.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "bad_upstream" };
  }
  return { status: saved.status, body };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(request) {
  const auth = authFrom(request);
  if (!auth) {
    return json(
      {
        error: "auth_required",
        hint: "Auth0 household Bearer required (Studio Copy MCP token). Or set ABBIES_WORLD_TOKEN on Studio.",
        origin: ORIGIN,
      },
      401
    );
  }

  const url = new URL(request.url);
  const current = await readWorld(auth);
  if (current.status !== 200) {
    return json(
      { error: "world_unavailable", status: current.status, body: current.body, origin: ORIGIN },
      current.status === 401 ? 401 : 502
    );
  }

  hydrateFromWorld(current.body);
  const missionId = String(url.searchParams.get("missionId") || "").trim();
  const proofId = String(url.searchParams.get("proofId") || "").trim() || null;

  if (!missionId) {
    return json({
      origin: ORIGIN,
      revision: current.body.revision,
      durable: "creative.missionOs",
      missions: listMissionsFromDoc(current.body, { limit: 20 }).map((m) => {
        const feedback = m.feedback || [];
        const last = feedback[feedback.length - 1] || null;
        const awaitingProofs = (m.proofs || []).filter((p) => p.status === "awaiting_approval");
        const proof = awaitingProofs[awaitingProofs.length - 1] || awaitingProofs[0] || null;
        const req = proof
          ? (m.requirements || []).find((r) => r.id === proof.requirementId)
          : null;
        const cands = proof?.payload?.candidates || [];
        const first = cands[0] || null;
        return {
          id: m.id,
          title: m.title,
          status: m.status,
          awaitingProofs: awaitingProofs.length,
          latestAwaiting: proof
            ? {
                proofId: proof.id,
                requirementId: proof.requirementId || null,
                semanticId: req?.semanticId || null,
                candidateCount: cands.length,
                previewUrl: first?.previewUrl || first?.thumbUrl || first?.url || null,
                at: proof.createdAt || proof.at || m.updatedAt || null,
              }
            : null,
          feedbackCount: feedback.length,
          lastFeedback: last
            ? {
                kind: last.kind,
                text: last.text,
                surface: last.surface,
                at: last.at,
              }
            : null,
          unreadNotifications: (m.notifications || []).filter((n) => !n.read).length,
        };
      }),
      history: reviewHistoryFromDoc(current.body, { limit: 80 }),
    });
  }

  const mission = getMissionFromDoc(current.body, missionId);
  if (!mission) return json({ error: "mission_missing", missionId, origin: ORIGIN }, 404);

  if (url.searchParams.get("describe") === "1") {
    return json({ origin: ORIGIN, revision: current.body.revision, ...describeMission(mission) });
  }

  const deck = deckFromMission(mission, { proofId });
  if (deck.error) return json({ ...deck, origin: ORIGIN }, 404);
  const describe = describeMission(mission);
  return json({
    ...deck,
    origin: ORIGIN,
    worldRevision: current.body.revision,
    recentFeedback: describe.recentFeedback || [],
    unreadNotifications: describe.unreadNotifications || 0,
    reviewUrl: `https://studio-mock-iota.vercel.app/review.html?missionId=${encodeURIComponent(missionId)}`,
  });
}

export async function POST(request) {
  const auth = authFrom(request);
  if (!auth) {
    return json({ error: "auth_required", origin: ORIGIN }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const missionId = String(body.missionId || "").trim();
  const action =
    body.action === "board"
      ? "board"
      : body.action === "dump"
        ? "dump"
        : body.action === "unkeep"
          ? "unkeep"
          : body.action === "restore"
            ? "restore"
            : body.action === "feedback"
              ? "feedback"
              : body.action === "registry"
                ? "registry"
                : "";
  if (!missionId && action !== "registry") {
    return json({ error: "missionId_action_required" }, 400);
  }
  if (!action) {
    return json({ error: "missionId_action_required" }, 400);
  }
  const proofId = String(body.proofId || "").trim();
  if ((action === "board" || action === "dump" || action === "unkeep" || action === "restore") && !proofId) {
    return json({ error: "missionId_proofId_action_required" }, 400);
  }

  const current = await readWorld(auth);
  if (current.status !== 200) {
    return json({ error: "world_unavailable", status: current.status, body: current.body }, 502);
  }

  const expected = current.body.revision;
  const doc = structuredClone(current.body);
  hydrateFromWorld(doc);

  async function ingestToRegistry({ semanticId, brief, url }) {
    const sid = String(semanticId || "").trim();
    const staging = String(url || "").trim();
    if (!sid) return { error: "semantic_id_required" };
    if (!/^https:\/\//i.test(staging)) return { error: "image_url_required" };
    return registerStagingImage({
      semanticId: sid,
      brief: String(brief || sid).slice(0, 800),
      stagingUrl: staging,
    });
  }

  if (action === "registry") {
    let semanticId = body.semanticId;
    let url = body.url || body.candidateUrl;
    let brief = body.prompt || body.brief || "";
    if (missionId) {
      const mission = getMissionFromDoc(doc, missionId);
      if (mission) {
        const proof = proofId
          ? (mission.proofs || []).find((p) => p.id === proofId)
          : null;
        const req = proof
          ? (mission.requirements || []).find((r) => r.id === proof.requirementId)
          : (mission.requirements || []).find((r) => r.semanticId === semanticId);
        const all = [
          ...(proof?.payload?.candidates || []),
          ...(proof?.payload?.dumped || []),
        ];
        const idx = Number(body.candidateIndex);
        const chosen =
          Number.isFinite(idx) && idx >= 1
            ? all.find((c) => Number(c.index) === idx) || all[idx - 1]
            : null;
        semanticId = semanticId || req?.semanticId || chosen?.semanticId;
        url = url || chosen?.url;
        brief = brief || req?.mustBecomeTrue || mission.title;
      }
    }
    const registry = await ingestToRegistry({ semanticId, brief, url });
    return json(
      {
        ok: !registry.error,
        action,
        origin: ORIGIN,
        registry,
        history: reviewHistoryFromDoc(current.body, { limit: 80 }),
      },
      registry.error ? 400 : 200
    );
  }

  const mission = getMissionFromDoc(doc, missionId);
  if (!mission) return json({ error: "mission_missing", missionId }, 404);

  const result =
    action === "board"
      ? approveProof(mission, {
          proofId,
          candidateIndex: body.candidateIndex,
          note: body.note,
          surface: body.surface || "ipad_gesture_review",
        })
      : action === "dump"
        ? rejectProof(mission, {
            proofId,
            candidateIndex: body.candidateIndex,
            note: body.note,
            surface: body.surface || "ipad_gesture_review",
          })
        : action === "unkeep"
          ? reverseKeep(mission, {
              proofId,
              note: body.note,
              surface: body.surface || "ipad_gesture_review",
            })
          : action === "restore"
            ? restoreDump(mission, {
                proofId,
                candidateIndex: body.candidateIndex,
                note: body.note,
                surface: body.surface || "ipad_gesture_review",
              })
            : appendMissionFeedback(mission, {
                text: body.text || body.note,
                kind: body.kind,
                requirementId: body.requirementId,
                proofId: proofId || null,
                candidateIndex: body.candidateIndex,
                surface: body.surface || "review_sidecar",
              });

  if (result.error) return json(result, 400);

  upsertMissionOnDoc(doc, result.mission);
  doc.players = structuredClone(current.body.players);

  const saved = await writeWorld(auth, doc, expected);
  if (saved.status === 409) return json({ error: "revision_conflict", body: saved.body }, 409);
  if (saved.status !== 200) {
    return json({ error: "save_failed", status: saved.status, body: saved.body, origin: ORIGIN }, 502);
  }

  let registry = null;
  if (action === "board") {
    const proof = (result.mission.proofs || []).find((p) => p.id === proofId);
    const req = (result.mission.requirements || []).find((r) => r.id === proof?.requirementId);
    const chosen = result.approval?.candidate;
    const semanticId = req?.semanticId || chosen?.semanticId;
    if (chosen?.url && semanticId) {
      registry = await ingestToRegistry({
        semanticId,
        brief: req?.mustBecomeTrue || chosen.label || result.mission.title,
        url: chosen.url,
      });
    }
  }
  if (action === "unkeep") {
    registry = await deleteRegisteredAsset({
      semanticId: result.semanticId,
      registryKey: result.registryKey,
    });
  }

  return json({
    ok: true,
    action,
    origin: ORIGIN,
    worldRevision: saved.body?.revision ?? null,
    durable: "creative.missionOs",
    approval: result.approval || null,
    remaining: result.remaining ?? null,
    candidate: result.candidate || null,
    feedback: result.feedback || null,
    notification: result.notification,
    registry,
    describe: describeMission(result.mission),
    history: reviewHistoryFromDoc(saved.body || doc, { limit: 80 }),
  });
}

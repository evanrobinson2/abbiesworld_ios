/**
 * GET  /api/review-inbox — list open decks (phone UI)
 * GET  /api/review-inbox?active=1 — newest open deck as review.html deck shape
 * GET  /api/review-inbox?id=deck… — one deck
 * POST /api/review-inbox { deckId, action: board|dump, candidateIndex } — decide
 * POST /api/review-inbox { fromJob: true, jobId } — push registered job into inbox
 */
import { getJob } from "./lib/asset-jobs-store.js";
import {
  listInbox,
  getDeck,
  activeDeck,
  pushFromJob,
  recordDecision,
} from "./lib/review-inbox.js";

const PLATE_BASE = "https://studio-mock-iota.vercel.app/api/plate";

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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const deck = getDeck(id);
    if (!deck) return json({ error: "deck_missing", id }, 404);
    return json(deck);
  }
  if (url.searchParams.get("active") === "1") {
    const deck = activeDeck({ deckId: url.searchParams.get("deckId") || undefined });
    if (!deck) return json({ error: "no_open_decks", candidates: [] }, 404);
    return json(deck);
  }
  return json({ decks: listInbox({ limit: Number(url.searchParams.get("limit") || 20) }) });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  if (body?.fromJob || body?.op === "push_job") {
    const job = getJob(body.jobId || body.id);
    if (!job) return json({ error: "job_missing", jobId: body.jobId || body.id }, 404);
    const reviewUrl = `${PLATE_BASE}?semantic=${encodeURIComponent(job.semanticId)}`;
    const pushed = pushFromJob(job, {
      title: body.title || null,
      missionId: body.missionId || null,
      requirementId: body.requirementId || null,
      reviewUrl,
    });
    if (pushed.error) return json(pushed, 400);
    return json(pushed, 201);
  }

  if (body?.action === "board" || body?.action === "dump") {
    const result = recordDecision(body.deckId, {
      action: body.action,
      candidateIndex: body.candidateIndex,
      note: body.note,
      surface: body.surface || "mobile",
    });
    if (result.error) return json(result, 400);
    return json(result);
  }

  return json({ error: "unknown_op" }, 400);
}

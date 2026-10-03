/**
 * Mobile review inbox — art suggestions waiting for Board / Dump.
 * In-memory on the Studio deploy (same process as asset jobs).
 */
const inbox = new Map(); // deckId → deck

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function publicDeck(deck) {
  return structuredClone(deck);
}

export function listInbox({ limit = 20, includeClosed = false } = {}) {
  let rows = [...inbox.values()];
  if (!includeClosed) rows = rows.filter((d) => d.status === "open");
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows.slice(0, Math.min(50, Math.max(1, Number(limit) || 20))).map(publicDeck);
}

export function getDeck(deckId) {
  const deck = inbox.get(String(deckId || ""));
  return deck ? publicDeck(deck) : null;
}

/** Active deck for phone UI — newest open, or by id. */
export function activeDeck({ deckId } = {}) {
  if (deckId) return getDeck(deckId);
  const open = listInbox({ limit: 1, includeClosed: false });
  return open[0] || null;
}

/**
 * Push a registered asset job into the phone review inbox.
 * reviewUrl should be phone-reachable (Studio /api/plate?semantic=…).
 */
export function pushFromJob(job, {
  title = null,
  missionId = null,
  requirementId = null,
  reviewUrl = null,
} = {}) {
  if (!job?.semanticId) return { error: "semantic_id_required" };
  if (job.status !== "registered" && job.status !== "bound") {
    return { error: "job_not_registered", status: job.status };
  }

  const deckId = `deck.${String(job.semanticId).replace(/\./g, "_")}.${String(job.id || "x").slice(-8)}`;
  const url =
    reviewUrl ||
    `https://studio-mock-iota.vercel.app/api/plate?semantic=${encodeURIComponent(job.semanticId)}`;

  const deck = {
    id: deckId,
    title: title || job.brief?.slice(0, 80) || job.semanticId,
    semanticId: job.semanticId,
    missionId: missionId || null,
    proofId: null,
    requirementId: requirementId || null,
    jobId: job.id || null,
    status: "open",
    provider: job.provider || "openai",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    candidates: [
      {
        index: 1,
        label: "Candidate 1",
        url,
        jobId: job.id || null,
      },
    ],
    decisions: [],
  };
  inbox.set(deckId, deck);
  return { deck: publicDeck(deck) };
}

export function recordDecision(deckId, { action, candidateIndex, note = "", surface = "mobile" } = {}) {
  const deck = inbox.get(String(deckId || ""));
  if (!deck) return { error: "deck_missing", deckId };
  if (deck.status !== "open") return { error: "deck_closed", status: deck.status };

  const idx = Number(candidateIndex);
  const candidate = (deck.candidates || []).find((c) => Number(c.index) === idx);
  if (!candidate) return { error: "candidate_missing", candidateIndex: idx };

  const decision = {
    id: newId("dec"),
    action: action === "board" ? "board" : "dump",
    candidateIndex: idx,
    note: String(note || "").slice(0, 240),
    surface: String(surface || "mobile").slice(0, 40),
    at: nowIso(),
    candidate,
  };
  deck.decisions.push(decision);
  deck.candidates = deck.candidates.filter((c) => Number(c.index) !== idx);
  if (!deck.candidates.length) deck.status = "closed";
  deck.updatedAt = nowIso();
  return { deck: publicDeck(deck), decision };
}

export function __resetReviewInboxForTests() {
  inbox.clear();
}

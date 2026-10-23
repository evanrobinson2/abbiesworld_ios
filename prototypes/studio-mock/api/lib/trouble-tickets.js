/**
 * Durable developer trouble queue on the household world document.
 * SoT: creative.troubleQueue — survives chat death the same way Missions do.
 */

function nowIso() {
  return new Date().toISOString();
}

function clip(value, max) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, max);
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}

const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const STATUSES = new Set(["open", "in_review", "resolved", "wont_fix"]);

export function ensureTroubleQueue(doc) {
  if (!doc.creative || typeof doc.creative !== "object") doc.creative = {};
  if (!doc.creative.troubleQueue || typeof doc.creative.troubleQueue !== "object") {
    doc.creative.troubleQueue = {
      schemaVersion: 1,
      nextNumber: 1,
      tickets: {},
      updatedAt: nowIso(),
    };
  }
  const q = doc.creative.troubleQueue;
  if (!q.tickets || typeof q.tickets !== "object") q.tickets = {};
  if (!Number.isFinite(Number(q.nextNumber)) || q.nextNumber < 1) q.nextNumber = 1;
  return q;
}

export function publicTicket(ticket) {
  if (!ticket || typeof ticket !== "object") return null;
  return structuredClone(ticket);
}

export function createTroubleTicket(doc, input = {}, auto = {}) {
  const q = ensureTroubleQueue(doc);
  const title = clip(input.title, 160).trim();
  if (!title) return { error: "title_required" };
  const n = q.nextNumber;
  const id = `AW-${n}`;
  q.nextNumber = n + 1;
  const severity = SEVERITIES.has(String(input.severity || "").toLowerCase())
    ? String(input.severity).toLowerCase()
    : "high";
  const ticket = {
    id,
    status: "open",
    title,
    summary: clip(input.summary, 8000),
    severity,
    surface: clip(input.surface || auto.originatingSurface || "mcp", 80),
    operation: clip(input.operation, 120),
    expectedBehavior: clip(input.expectedBehavior, 4000),
    actualBehavior: clip(input.actualBehavior, 4000),
    worldRevision: input.worldRevision ?? auto.afterRevision ?? auto.beforeRevision ?? doc.revision ?? null,
    relatedIds: Array.isArray(input.relatedIds) ? input.relatedIds.map((v) => clip(v, 120)).slice(0, 40) : [],
    diagnosticContext: input.diagnosticContext && typeof input.diagnosticContext === "object"
      ? input.diagnosticContext
      : {},
    requestedCleanup: clip(input.requestedCleanup, 4000),
    auto: {
      mcpServer: auto.mcpServer || "abbies-world",
      mcpVersion: auto.mcpVersion || null,
      timestamp: auto.timestamp || nowIso(),
      beforeRevision: auto.beforeRevision ?? null,
      afterRevision: auto.afterRevision ?? null,
      plan: auto.plan || null,
      results: auto.results || null,
      stateDiff: auto.stateDiff || null,
      lint: auto.lint || null,
      error: auto.error || null,
      originatingSurface: auto.originatingSurface || input.surface || "mcp",
    },
    comments: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    githubIssueUrl: null,
  };
  q.tickets[id] = ticket;
  q.updatedAt = ticket.updatedAt;
  return { ticket: publicTicket(ticket), queue: { nextNumber: q.nextNumber } };
}

export function getTroubleTicket(doc, ticketId) {
  const q = ensureTroubleQueue(doc);
  const ticket = q.tickets[String(ticketId || "")];
  if (!ticket) return { error: "ticket_missing", ticketId };
  return { ticket: publicTicket(ticket) };
}

export function listTroubleTickets(doc, { status = "", limit = 30 } = {}) {
  const q = ensureTroubleQueue(doc);
  let rows = Object.values(q.tickets || {});
  if (status) rows = rows.filter((t) => t.status === status);
  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return {
    tickets: rows.slice(0, Math.min(80, Math.max(1, Number(limit) || 30))).map(publicTicket),
    total: rows.length,
    nextNumber: q.nextNumber,
  };
}

export function commentTroubleTicket(doc, ticketId, { text, author, surface } = {}) {
  const q = ensureTroubleQueue(doc);
  const ticket = q.tickets[String(ticketId || "")];
  if (!ticket) return { error: "ticket_missing", ticketId };
  const body = clip(text, 4000).trim();
  if (!body) return { error: "comment_required" };
  const comment = {
    id: `cmt_${Date.now().toString(36)}`,
    text: body,
    author: clip(author || "mcp", 80),
    surface: clip(surface || "mcp", 80),
    at: nowIso(),
  };
  ticket.comments = ticket.comments || [];
  ticket.comments.push(comment);
  ticket.updatedAt = comment.at;
  q.updatedAt = comment.at;
  return { ticket: publicTicket(ticket), comment };
}

export function setTicketGithubUrl(doc, ticketId, url) {
  const q = ensureTroubleQueue(doc);
  const ticket = q.tickets[String(ticketId || "")];
  if (!ticket) return { error: "ticket_missing", ticketId };
  ticket.githubIssueUrl = clip(url, 400);
  ticket.updatedAt = nowIso();
  q.updatedAt = ticket.updatedAt;
  return { ticket: publicTicket(ticket) };
}

export function updateTroubleTicketStatus(doc, ticketId, { status, note } = {}) {
  const q = ensureTroubleQueue(doc);
  const ticket = q.tickets[String(ticketId || "")];
  if (!ticket) return { error: "ticket_missing", ticketId };
  const next = String(status || "").trim();
  if (!STATUSES.has(next)) return { error: "status_invalid", allowed: [...STATUSES] };
  ticket.status = next;
  ticket.updatedAt = nowIso();
  q.updatedAt = ticket.updatedAt;
  if (note) {
    ticket.comments = ticket.comments || [];
    ticket.comments.push({
      id: `cmt_${Date.now().toString(36)}`,
      text: clip(note, 2000),
      author: "system",
      surface: "mcp",
      at: ticket.updatedAt,
    });
  }
  return { ticket: publicTicket(ticket) };
}

/** The Pink Rocket / scene.mcp* incident — used as the acceptance fixture. */
export function rocketIncidentPayload() {
  return {
    title: "author_beat scene.upsert minted a new scene instead of updating scene.home",
    summary:
      "Dry-run planned an update of scene.home with poi.moonBase.rocket omitted. Execution created scene.mcpmusm14y7, left scene.home unchanged, and narrated that the Pink Rocket was gone.",
    severity: "critical",
    surface: "chatgpt",
    operation: "author_beat",
    expectedBehavior:
      "scene.home.places should keep Abbie’s Treehouse and lose poi.moonBase.rocket. Scene count unchanged.",
    actualBehavior:
      "executed:true, revision 19807, scene.upsert returned scene.mcpmusm14y7, scene count 10→11, scene.home still has Pink Rocket.",
    worldRevision: 19807,
    relatedIds: ["scene.home", "poi.moonBase.rocket", "scene.mcpmusm14y7"],
    requestedCleanup:
      "Delete scene.mcpmusm14y7. Remove poi.moonBase.rocket (Pink Rocket) from scene.home. No other world state should change.",
    diagnosticContext: {
      planArgs: { id: "scene.home" },
      expectedField: "sceneId",
      resultSceneId: "scene.mcpmusm14y7",
      narration: "The Pink Rocket is gone from Abbie’s World.",
    },
  };
}

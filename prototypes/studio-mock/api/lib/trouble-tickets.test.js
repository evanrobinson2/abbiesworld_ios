/**
 * Durable trouble tickets on creative.troubleQueue.
 * Run: node prototypes/studio-mock/api/lib/trouble-tickets.test.js
 */
import {
  createTroubleTicket,
  getTroubleTicket,
  listTroubleTickets,
  commentTroubleTicket,
  updateTroubleTicketStatus,
  setTicketGithubUrl,
  rocketIncidentPayload,
  ensureTroubleQueue,
} from "./trouble-tickets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const doc = { revision: 19807, creative: {} };
const filed = createTroubleTicket(doc, rocketIncidentPayload(), {
  mcpServer: "abbies-world",
  mcpVersion: "0.6.0",
  beforeRevision: 19806,
  afterRevision: 19807,
  originatingSurface: "chatgpt",
  plan: { ops: [{ op: "scene.upsert", args: { id: "scene.home" } }] },
  results: [{ op: "scene.upsert", sceneId: "scene.mcpmusm14y7", created: true }],
  stateDiff: { addedScenes: ["scene.mcpmusm14y7"], sceneCountBefore: 10, sceneCountAfter: 11 },
});
assert(!filed.error, "create ok");
assert(filed.ticket.id === "AW-1", "durable ticket id");
assert(filed.ticket.status === "open", "open");
assert(filed.ticket.relatedIds.includes("scene.mcpmusm14y7"), "related ids");
assert(filed.ticket.auto.afterRevision === 19807, "auto revision");
assert(doc.creative.troubleQueue.tickets["AW-1"], "persisted on world doc");

const got = getTroubleTicket(doc, "AW-1");
assert(got.ticket.title.includes("author_beat"), "get");

const listed = listTroubleTickets(doc, { status: "open" });
assert(listed.tickets.length === 1, "list open");

const noted = commentTroubleTicket(doc, "AW-1", { text: "Cleanup still outstanding.", author: "cursor" });
assert(noted.comment.text.includes("Cleanup"), "comment");
assert(got.ticket.comments?.length !== 99, "comment stored");

const closed = updateTroubleTicketStatus(doc, "AW-1", { status: "resolved", note: "place.remove + scene.delete shipped" });
assert(closed.ticket.status === "resolved", "resolved");

const linked = setTicketGithubUrl(doc, "AW-1", "https://github.com/evanrobinson2/abbiesworld_ios/issues/1");
assert(linked.ticket.githubIssueUrl.includes("issues/1"), "github url persisted");

ensureTroubleQueue(doc);
const second = createTroubleTicket(doc, { title: "follow-up" });
assert(second.ticket.id === "AW-2", "monotonic ids");

console.log("trouble-tickets.test.js OK");

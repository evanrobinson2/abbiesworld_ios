/**
 * Local unit checks for review inbox.
 * Run: node prototypes/studio-mock/api/lib/review-inbox.test.js
 */
import {
  pushFromJob,
  activeDeck,
  recordDecision,
  __resetReviewInboxForTests,
} from "./review-inbox.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

__resetReviewInboxForTests();

const bad = pushFromJob({ status: "awaiting_image", semanticId: "poi.x.exterior" });
assert(bad.error === "job_not_registered", "rejects unregistered");

const pushed = pushFromJob({
  id: "job_test",
  status: "registered",
  semanticId: "poi.moonBase.poc.reviewRocket.exterior",
  brief: "Pink rocket",
  provider: "openai",
});
assert(pushed.deck?.status === "open", "open deck");
assert(pushed.deck.candidates.length === 1, "one candidate");
assert(activeDeck()?.id === pushed.deck.id, "active");

const boarded = recordDecision(pushed.deck.id, { action: "board", candidateIndex: 1 });
assert(boarded.decision?.action === "board", "boarded");
assert(boarded.deck.status === "closed", "closed after last candidate");

console.log("review-inbox.test.js OK");

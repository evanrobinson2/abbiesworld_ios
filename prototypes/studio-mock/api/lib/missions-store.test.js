/**
 * Local unit checks for Mission OS store (no live world required).
 * Run: node prototypes/studio-mock/api/lib/missions-store.test.js
 */
import {
  buildMission,
  describeMission,
  attachProof,
  approveProof,
  rejectProof,
  deckFromMission,
  ensureArtRequirement,
  ensureMissionOs,
  upsertMissionOnDoc,
  getMissionFromDoc,
  listMissionsFromDoc,
  requestMinigame,
  listEngAutoDispatch,
  appendMissionFeedback,
  __resetMissionsCacheForTests,
} from "./missions-store.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

__resetMissionsCacheForTests();

const built = buildMission({
  narrative:
    "Abby finds the pink rocket on the Home path, flies to the moon, lands carefully, and meets Daddy at the Moon Base garden.",
  title: "Abby & Daddy Moon Base",
  surface: "chatgpt",
});
assert(!built.error, "builds");
assert(built.mission.id.includes("moon"), "id slug");
assert(built.mission.requirements.some((r) => r.id === "req.art.rocket.exterior"), "infers rocket art");
assert(built.mission.plan.openDecisions.length === 1, "landing decision open");
assert(built.mission.notifications.some((n) => n.type === "mission_created"), "created note");

const desc = describeMission(built.mission);
assert(desc.text.includes("Abby & Daddy Moon Base"), "describe title");
assert(desc.awaitingEvan.decisions.includes("decision.landingMiss"), "awaiting decision");
assert(Array.isArray(desc.engAutoDispatch) && desc.engAutoDispatch.length >= 1, "eng auto-dispatch listed");
assert(desc.engAutoDispatch[0].requirementId === "req.eng.moonGuidance", "moon eng queued");
assert(
  built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance")?.dispatch?.autoStart === true,
  "eng autoStart"
);
assert(
  ["eng_auto_dispatch", "eng_dispatch_blocked"].some((t) =>
    built.mission.notifications.some((n) => n.type === t)
  ),
  "eng dispatch note"
);
assert(
  built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance")?.dispatch?.status ===
    "blocked_builder_unconfigured" ||
    built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance")?.dispatch?.status === "queued",
  "eng status honest"
);
assert(desc.nextAct.includes("decision.landingMiss"), "next act is decision");

const cockpit = buildMission({
  narrative:
    "Moon Base chapter: Pink Rocket cockpit launch-check memory game. Houston demonstrates; Slow/Fast and scrubber; grow to 7 commands.",
  title: "Moon Base — Pink Rocket Launch Check",
  surface: "chatgpt",
});
assert(!cockpit.error, "cockpit builds");
assert(
  cockpit.mission.requirements.some((r) => r.id === "req.eng.moonLaunchCheck"),
  "infers launch-check eng not lander"
);
assert(
  !cockpit.mission.requirements.some((r) => r.id === "req.eng.moonGuidance"),
  "does not infer moonGuidance lander for cockpit narrative"
);
assert((cockpit.mission.plan.openDecisions || []).length === 0, "no landingMiss for cockpit");
assert(
  describeMission(cockpit.mission).text.includes("builder not configured") ||
    cockpit.mission.requirements.find((r) => r.id === "req.eng.moonLaunchCheck")?.dispatch?.status ===
      "queued",
  "honest builder messaging when webhook unset"
);

const attached = attachProof(built.mission, { requirementId: "req.art.rocket.exterior" });
assert(attached.proof?.status === "awaiting_approval", "proof awaiting");
assert(
  built.mission.requirements.find((r) => r.id === "req.art.rocket.exterior").status === "proofs_ready",
  "req proofs_ready"
);

const approved = approveProof(built.mission, {
  proofId: attached.proof.id,
  candidateIndex: 3,
  note: "Rocket 3",
  surface: "chatgpt_voice",
});
assert(approved.approval?.candidateIndex === 3, "approved index 3");
assert(
  built.mission.requirements.find((r) => r.id === "req.art.rocket.exterior").status === "done",
  "req done"
);
assert(built.mission.notifications.some((n) => n.type === "proof_approved"), "approve note");

// Fresh proof for dump path
const attached2 = attachProof(built.mission, { requirementId: "req.eng.moonGuidance" });
assert(attached2.proof?.id, "second proof");
const dumped = rejectProof(built.mission, {
  proofId: attached2.proof.id,
  candidateIndex: 1,
  note: "Wrong vibe",
  surface: "ipad_gesture_review",
});
assert(dumped.approval?.decision === "reject", "reject decision");
assert(
  built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance").status === "open",
  "req reopened"
);

assert(built.mission.notifications.some((n) => n.type === "proof_dumped"), "dump note");

const fresh = buildMission({
  narrative: "Abby rocket moon Daddy lander garden",
  title: "Deck mission",
  surface: "test",
}).mission;
const req = ensureArtRequirement(fresh, { semanticId: "poi.moonBase.poc.reviewRocket.exterior" });
const att = attachProof(fresh, {
  requirementId: req.id,
  candidates: [{ index: 1, url: "https://studio-mock-iota.vercel.app/api/plate?semantic=poi.moonBase.poc.reviewRocket.exterior", label: "1" }],
});
const deck = deckFromMission(fresh, { proofId: att.proof.id });
assert(deck.missionId === fresh.id, "deck mission id");
assert(deck.candidates[0].url.includes("plate?semantic="), "plate url");


const doc = { creative: {} };
upsertMissionOnDoc(doc, built.mission);
assert(getMissionFromDoc(doc, built.mission.id)?.id === built.mission.id, "roundtrip get");
assert(listMissionsFromDoc(doc).length === 1, "list");
assert(ensureMissionOs(doc).schemaVersion === 1, "bag schema");

const empty = buildMission({ narrative: "" });
assert(empty.error === "narrative_required", "requires narrative");

const physics = requestMinigame(built.mission, {
  routeId: "tiltBlockPuzzle",
  verb: "tilt blocks into the cup",
  difficulty: "physics_puzzler",
  design: {
    fail: "infinite_retry",
    bypass: "Do it for me",
    physics: { engine: "SpriteKit", gravity: true, joints: false },
    onWin: { emit: "unlock.demo.tilt.v1" },
    captionDefaultTier: "micro",
  },
});
assert(!physics.error, "requestMinigame ok");
assert(physics.requirement.dispatch.autoStart === true, "physics autoStart");
assert(listEngAutoDispatch(physics.mission).some((e) => e.requirementId === "req.eng.tiltBlockPuzzle"), "physics in queue");

const fb = appendMissionFeedback(physics.mission, {
  text: "Closer on the face; less feet. Keep chalk style.",
  kind: "art",
  requirementId: "req.eng.tiltBlockPuzzle",
  surface: "chatgpt",
});
assert(!fb.error, "feedback ok");
assert(fb.mission.feedback?.length === 1, "feedback stored");
const descFb = describeMission(fb.mission);
assert(descFb.text.includes("Closer on the face"), "describe shows feedback");

console.log("missions-store.test.js OK");

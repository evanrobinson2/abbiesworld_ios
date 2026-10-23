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
  reverseKeep,
  restoreDump,
  deckFromMission,
  ensureArtRequirement,
  ensureMissionOs,
  upsertMissionOnDoc,
  getMissionFromDoc,
  listMissionsFromDoc,
  requestMinigame,
  listEngAutoDispatch,
  appendMissionFeedback,
  reviewHistoryFromDoc,
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
const descAfterAttach = describeMission(attached.mission);
assert(descAfterAttach.unapprovedImages.length === 4, "describe lists unapproved candidates");
assert(
  descAfterAttach.unapprovedImages[0].displayUrl.includes("/api/proof-image?"),
  "public proxy displayUrl"
);
assert(descAfterAttach.text.includes("![Candidate 1]("), "describe text has markdown images");
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
assert(dumped.remaining === 3, "dump keeps other candidates");
assert(
  built.mission.proofs.find((p) => p.id === attached2.proof.id).status === "awaiting_approval",
  "proof still awaiting after one dump"
);
assert(
  built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance").status === "proofs_ready",
  "req stays proofs_ready until last dump"
);
assert((attached2.proof.payload.candidates || []).length === 3, "three left");

const dumpedRest = rejectProof(built.mission, {
  proofId: attached2.proof.id,
  candidateIndex: attached2.proof.payload.candidates[0].index,
  note: "Clear rest",
  surface: "ipad_gesture_review",
});
assert(dumpedRest.remaining === 2, "second dump");
rejectProof(built.mission, {
  proofId: attached2.proof.id,
  candidateIndex: attached2.proof.payload.candidates[0].index,
});
rejectProof(built.mission, {
  proofId: attached2.proof.id,
  candidateIndex: attached2.proof.payload.candidates[0].index,
});
assert(
  built.mission.proofs.find((p) => p.id === attached2.proof.id).status === "rejected",
  "proof rejected after last candidate"
);
assert(
  built.mission.requirements.find((r) => r.id === "req.eng.moonGuidance").status === "open",
  "req reopened after last dump"
);

assert(built.mission.notifications.some((n) => n.type === "proof_dumped"), "dump note");

const hist = reviewHistoryFromDoc({
  creative: { missionOs: { missions: { [built.mission.id]: built.mission } } },
});
assert(hist.some((r) => r.status === "boarded"), "history has boarded rocket");
assert(hist.some((r) => r.status === "dumped"), "history has dumped candidates");

const withFailedQueue = reviewHistoryFromDoc(
  {
    creative: {
      missionOs: { missions: {} },
      executionCapacity: {
        jobs: {
          ecjob_fail: {
            id: "ecjob_fail",
            state: "failed",
            updatedAt: "2026-10-03T15:22:00.000Z",
            payload: {
              semanticId: "poi.moonBase.rocket.exterior.pink",
              prompt: "failed pink rocket",
            },
            result: {},
          },
          ecjob_ok: {
            id: "ecjob_ok",
            state: "completed",
            finishedAt: "2026-10-03T12:00:00.000Z",
            payload: { semanticId: "map.garden", prompt: "garden plate" },
            result: { candidateUrls: ["https://cdn.example/garden.webp"] },
          },
        },
      },
    },
  },
  { platesOnly: true }
);
assert(
  !withFailedQueue.some((r) => r.status === "failed"),
  "platesOnly hides failed Midjourney jobs with no bytes"
);
assert(
  withFailedQueue.some((r) => r.status === "harvested" && r.semanticId === "map.garden"),
  "platesOnly keeps harvested plates"
);
const includeEmpty = reviewHistoryFromDoc(
  {
    creative: {
      missionOs: { missions: {} },
      executionCapacity: {
        jobs: {
          ecjob_fail: {
            id: "ecjob_fail",
            state: "failed",
            updatedAt: "2026-10-03T15:22:00.000Z",
            payload: { semanticId: "poi.x", prompt: "x" },
            result: {},
          },
        },
      },
    },
  },
  { platesOnly: false }
);
assert(includeEmpty.some((r) => r.status === "failed"), "platesOnly:false keeps queue failures");

const unkept = reverseKeep(built.mission, { proofId: attached.proof.id, surface: "drop" });
assert(!unkept.error, "unkeep ok");
assert(attached.proof.status === "awaiting_approval", "kept proof reopened");
assert(
  built.mission.requirements.find((r) => r.id === "req.art.rocket.exterior").status === "proofs_ready",
  "art req open again"
);
assert(unkept.semanticId, "unkeep returns semantic for registry delete");

const restored = restoreDump(built.mission, {
  proofId: attached2.proof.id,
  candidateIndex: attached2.proof.payload.dumped[0].index,
  surface: "drop",
});
assert(!restored.error, "restore dump ok");
assert(attached2.proof.status === "awaiting_approval", "rejected proof live again");
assert((attached2.proof.payload.candidates || []).length >= 1, "candidate back on deck");

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

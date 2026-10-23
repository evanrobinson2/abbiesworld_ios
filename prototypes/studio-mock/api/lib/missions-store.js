import { unapprovedImageGallery, galleryMarkdown } from "./proof-display.js";

/**
 * Mission OS — durable intent store (POC).
 *
 * SoT for tonight: household world document at creative.missionOs
 * (Auth0-backed /worlds/current). Survives ChatGPT chat death and Vercel
 * cold starts because the world server persists — not this process Map.
 *
 * In-memory Map is a write-through cache only.
 */

const missionsCache = new Map();

const STATUSES = new Set([
  "draft",
  "active",
  "blocked",
  "playable_candidate",
  "playable",
  "archived",
]);

const REQ_STATUSES = new Set([
  "proposed",
  "open",
  "in_progress",
  "proofs_ready",
  "blocked",
  "done",
  "wont_fix",
]);

function nowIso() {
  return new Date().toISOString();
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 48) || "untitled";
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function ensureMissionOs(doc) {
  if (!doc.creative || typeof doc.creative !== "object") doc.creative = {};
  if (!doc.creative.missionOs || typeof doc.creative.missionOs !== "object") {
    doc.creative.missionOs = {
      schemaVersion: 1,
      missions: {},
      updatedAt: nowIso(),
    };
  }
  if (!doc.creative.missionOs.missions || typeof doc.creative.missionOs.missions !== "object") {
    doc.creative.missionOs.missions = {};
  }
  return doc.creative.missionOs;
}

export function hydrateFromWorld(doc) {
  const bag = doc?.creative?.missionOs;
  if (!bag?.missions) return { count: 0 };
  for (const [id, mission] of Object.entries(bag.missions)) {
    if (mission && typeof mission === "object") missionsCache.set(id, mission);
  }
  return { count: missionsCache.size };
}

export function listMissionsFromDoc(doc, { limit = 20 } = {}) {
  const bag = doc?.creative?.missionOs;
  const rows = Object.values(bag?.missions || {});
  rows.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  return rows.slice(0, Math.min(50, Math.max(1, Number(limit) || 20))).map(publicMission);
}

export function getMissionFromDoc(doc, missionId) {
  const id = String(missionId || "").trim();
  const raw = doc?.creative?.missionOs?.missions?.[id];
  return raw ? publicMission(raw) : null;
}

function publicMission(mission) {
  return structuredClone(mission);
}

/** Infer a minimal plan + requirements from narrative (no LLM spend). */
export function isMinigameMakerConfigured() {
  const url = String(process.env.MINIGAME_MAKER_WEBHOOK_URL || "").trim();
  return /^https:\/\//i.test(url);
}

/** Honest eng dispatch status — never imply a worker started when webhook is unset. */
export function makeEngDispatch({
  difficulty = "moderate",
  at = nowIso(),
  prior = null,
} = {}) {
  const configured = isMinigameMakerConfigured();
  const keepInProgress = prior?.status === "in_progress";
  return {
    autoStart: true,
    status: keepInProgress
      ? "in_progress"
      : configured
        ? "queued"
        : "blocked_builder_unconfigured",
    difficulty: String(difficulty || "moderate").slice(0, 40),
    queuedAt: prior?.queuedAt || at,
    refreshedAt: at,
    note: configured
      ? "Standing order: eng starts without Evan asking. PR only — no merge."
      : "saved, blocked: builder not configured — set MINIGAME_MAKER_WEBHOOK_URL (Cursor Minigame Maker webhook).",
  };
}

function wantsCockpitLaunchCheck(text) {
  return (
    /\blaunch[\s-]?check\b/.test(text) ||
    /\bcockpit\b/.test(text) ||
    /\bhouston\b/.test(text) ||
    /\bmemory\b/.test(text) ||
    /\bsimon\b/.test(text) ||
    (/\bcommands?\b/.test(text) && /\b(slow|fast|scrubber|scrub)\b/.test(text)) ||
    (/\bsequence\b/.test(text) && /\b(command|button|demo)\b/.test(text))
  );
}

export function inferPlanFromNarrative(narrative, title) {
  const text = `${title || ""} ${narrative || ""}`.toLowerCase();
  const cockpit = wantsCockpitLaunchCheck(text);
  const isMoon =
    /\bmoon\b/.test(text) ||
    /\brocket\b/.test(text) ||
    /\bdaddy\b/.test(text) ||
    /\blander\b/.test(text);

  // Narrative wins: cockpit / launch-check memory game is NOT the lunar lander.
  if (cockpit) {
    return {
      beats: [
        { id: "beat.rocket", title: "Pink rocket on Home path", status: "open" },
        { id: "beat.cockpit", title: "Enter mission-control cockpit", status: "open" },
        { id: "beat.launchCheck", title: "Sequence memory to 7 commands", status: "open" },
        { id: "beat.handoff", title: "All systems ready → existing moonGuidance", status: "open" },
      ],
      inferredPacks: ["moonBase.rocket", "moonBase.cockpit"],
      assumptions: [
        "This chapter is the launch-check memory game — not the lunar lander.",
        "moonGuidance lander remains a later handoff after length-7 success.",
        "No auto art spend until Evan approves proofs.",
        "No live placement / merge without Evan.",
      ],
      openDecisions: [],
      requirements: [
        {
          id: "req.art.rocket.exterior",
          kind: "art",
          mustBecomeTrue: "Pink rocket POI art exists as semanticId poi.moonBase.rocket.exterior",
          semanticId: "poi.moonBase.rocket.exterior",
          priority: "blocker",
          status: "proposed",
          links: { artRequestId: null, assetJobIds: [], candidates: [] },
        },
        {
          id: "req.art.cockpit.interior",
          kind: "art",
          mustBecomeTrue:
            "Cockpit interior plate exists as semanticId poi.moonBase.earthCockpit (or plate.moonBase.earthCockpit)",
          semanticId: "poi.moonBase.earthCockpit",
          priority: "blocker",
          status: "proposed",
          links: { artRequestId: null, assetJobIds: [], candidates: [] },
        },
        {
          id: "req.eng.moonLaunchCheck",
          kind: "engineering",
          mustBecomeTrue:
            "moonLaunchCheck: Houston demo + player rows, grow to 7 commands, Slow/Fast + demo scrubber, gentle Retry overlay, spoken cue only first 2 consecutive misses; handoff to moonGuidance",
          priority: "blocker",
          status: "open",
          links: { githubIssue: null, branch: null, prUrl: null, evidencePaths: [] },
          dispatch: makeEngDispatch({ difficulty: "moderate" }),
          design: {
            routeId: "moonLaunchCheck",
            verb: "copy Houston command sequence",
            fail: "gentle_retry",
            bypass: null,
            onWin: { emit: "launchCheck.ready", handoff: "moonGuidance" },
            captionDefaultTier: "micro",
            teach: "Houston demonstrates full current sequence before every attempt",
            feel: "mission control readiness, never harsh",
            inputs: {
              houstonRow: true,
              playerRow: true,
              slowFastDemoOnly: true,
              scrubberDemoOnly: true,
              targetLength: 7,
              startLength: 2,
              spokenRetryMaxConsecutive: 2,
              retryOverlay: "Launch check: Retry",
            },
            acceptance: [
              "Separate Houston and player rows",
              "Scrub never mutates player input",
              "Art + test stills reviewed in chat before live placement",
            ],
          },
        },
        {
          id: "req.world.placeRocket",
          kind: "world",
          mustBecomeTrue: "Rocket POI on scene.home; opens moonLaunchCheck (not live until eng+art approved)",
          priority: "blocker",
          status: "blocked",
          blockedBy: ["req.art.rocket.exterior", "req.eng.moonLaunchCheck"],
          links: { authorBeatIntents: [] },
        },
        {
          id: "req.verify.acceptanceJourney",
          kind: "verification",
          mustBecomeTrue: "Acceptance journey completed on household iPad",
          priority: "blocker",
          status: "proposed",
        },
      ],
      acceptanceJourney: [
        "home: see pink rocket on path",
        "tap rocket → cockpit launch-check",
        "grow sequence to 7 with Houston demo + player rows",
        "All systems ready → handoff to moonGuidance (existing)",
      ],
    };
  }

  if (isMoon) {
    return {
      beats: [
        { id: "beat.rocket", title: "Pink rocket on Home path", status: "open" },
        { id: "beat.launch", title: "Launch sequence", status: "open" },
        { id: "beat.flight", title: "Flight to moon", status: "open" },
        { id: "beat.land", title: "Manual land (retry + Land for me)", status: "open" },
        { id: "beat.daddy", title: "Meet Daddy at base", status: "open" },
        { id: "beat.garden", title: "Garden beat", status: "open" },
      ],
      inferredPacks: ["moonBase.rocket", "moonBase.pad", "moonBase.exterior", "moonBase.daddy"],
      assumptions: [
        "Reuse Waypoint buggy patterns only after land+Daddy+garden are playable.",
        "No auto art spend until Evan approves proofs.",
      ],
      openDecisions: [
        {
          id: "decision.landingMiss",
          question: "Miss landing pad: infinite retry + Land for me, or bounce?",
          options: ["infinite_retry_with_bypass", "bounce"],
          defaultProposal: "infinite_retry_with_bypass",
          status: "open",
          answer: null,
        },
      ],
      requirements: [
        {
          id: "req.art.rocket.exterior",
          kind: "art",
          mustBecomeTrue: "Pink rocket POI art exists as semanticId poi.moonBase.rocket.exterior",
          semanticId: "poi.moonBase.rocket.exterior",
          priority: "blocker",
          status: "proposed",
          links: { artRequestId: null, assetJobIds: [], candidates: [] },
        },
        {
          id: "req.eng.moonGuidance",
          kind: "engineering",
          mustBecomeTrue:
            "moonGuidance minigame: kid lander, infinite retry, Land for me, unlock.moonBase.landed",
          priority: "blocker",
          status: "open",
          links: { githubIssue: null, branch: null, prUrl: null, evidencePaths: [] },
          dispatch: makeEngDispatch({ difficulty: "moderate" }),
          design: {
            routeId: "moonGuidance",
            verb: "land rocket on pad",
            fail: "infinite_retry",
            bypass: "Land for me",
            onWin: { emit: "unlock.moonBase.landed", unlockWorld: "world.moonBase" },
            captionDefaultTier: "micro",
          },
        },
        {
          id: "req.world.placeRocket",
          kind: "world",
          mustBecomeTrue: "Rocket POI on scene.home; opens launch→guidance",
          priority: "blocker",
          status: "blocked",
          blockedBy: ["req.art.rocket.exterior", "req.eng.moonGuidance"],
          links: { authorBeatIntents: [] },
        },
        {
          id: "req.verify.acceptanceJourney",
          kind: "verification",
          mustBecomeTrue: "Acceptance journey completed on household iPad",
          priority: "blocker",
          status: "proposed",
        },
      ],
      acceptanceJourney: [
        "home: see pink rocket on path",
        "tap rocket → launch sequence",
        "flight → moon approach",
        "manual land (infinite retry + Land for me)",
        "meet Daddy at base",
        "garden beat",
      ],
    };
  }

  const lines = String(narrative || "")
    .split(/[\n.]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 8);

  return {
    beats: lines.map((line, i) => ({
      id: `beat.${i + 1}`,
      title: line.slice(0, 80),
      status: "open",
    })),
    inferredPacks: [],
    assumptions: ["POC inference only — refine via mission_patch_intent later."],
    openDecisions: [],
    requirements: [
      {
        id: "req.verify.acceptanceJourney",
        kind: "verification",
        mustBecomeTrue: "Evan attests playable after a real playthrough",
        priority: "blocker",
        status: "proposed",
      },
    ],
    acceptanceJourney: lines.length ? lines : ["Playable on household iPad"],
  };
}

export function buildMission({
  narrative,
  title,
  surface = "mcp",
  utteranceRef = null,
  missionId = null,
} = {}) {
  const cleanedNarrative = String(narrative || "").trim().slice(0, 4000);
  if (!cleanedNarrative) return { error: "narrative_required" };

  const cleanedTitle =
    String(title || "").trim().slice(0, 120) ||
    cleanedNarrative.split(/[\n.!?]/)[0].trim().slice(0, 80) ||
    "Untitled mission";

  const inferred = inferPlanFromNarrative(cleanedNarrative, cleanedTitle);
  const id =
    String(missionId || "").trim() ||
    `mission.${slugify(cleanedTitle)}.v1`;

  const at = nowIso();
  const mission = {
    id,
    title: cleanedTitle,
    status: "active",
    createdAt: at,
    updatedAt: at,
    createdFrom: { surface: String(surface || "mcp").slice(0, 40), utteranceRef },
    intent: {
      narrative: cleanedNarrative,
      acceptanceJourney: inferred.acceptanceJourney,
      acceptanceTargets: ["ipad.household"],
    },
    plan: {
      beats: inferred.beats,
      inferredPacks: inferred.inferredPacks,
      assumptions: inferred.assumptions,
      openDecisions: inferred.openDecisions,
    },
    requirements: inferred.requirements,
    work: {
      cycles: [],
      budgets: {
        artCreditsUsd: { limit: 20, spent: 0 },
        engCycles: { limit: 12, used: 0 },
        mjGrids: { limit: 40, used: 0 },
      },
    },
    proofs: [],
    approvals: [],
    notifications: [
      {
        id: newId("note"),
        type: "mission_created",
        at,
        text: `${cleanedTitle} — Mission created. Intent is durable.`,
        read: false,
      },
    ],
    integration: { worldRevisions: [], iosCommits: [], catalogBindings: [] },
    verification: {
      automated: [],
      runtimeEvidence: [],
      acceptanceChecklist: (inferred.acceptanceJourney || []).map((step) => ({
        step,
        status: "pending",
        evidence: null,
      })),
    },
    playable: {
      status: "not_yet",
      declaredAt: null,
      declaredBy: null,
      note: "Only Evan completing acceptanceJourney sets this.",
    },
    signals: { postPlay: null },
  };

  for (const r of mission.requirements) {
    if (r.kind !== "engineering") continue;
    if (!r.dispatch) {
      r.dispatch = makeEngDispatch({ at });
    } else {
      // Re-stamp honesty if env changed between drafts
      r.dispatch = makeEngDispatch({
        difficulty: r.dispatch.difficulty || "moderate",
        at,
        prior: r.dispatch,
      });
    }
    if (r.status === "proposed") r.status = "open";
    const blocked = r.dispatch?.status === "blocked_builder_unconfigured";
    mission.notifications.push({
      id: newId("note"),
      type: blocked ? "eng_dispatch_blocked" : "eng_auto_dispatch",
      at,
      text: blocked
        ? `${cleanedTitle} — eng ${r.id} saved, blocked: builder not configured (MINIGAME_MAKER_WEBHOOK_URL).`
        : `${cleanedTitle} — eng auto-dispatch ${r.id}. Worker wake sent. Open PR; do not merge.`,
      read: false,
      requirementId: r.id,
    });
  }

  return { mission };
}

export function upsertMissionOnDoc(doc, mission) {
  const bag = ensureMissionOs(doc);
  bag.missions[mission.id] = mission;
  bag.updatedAt = nowIso();
  missionsCache.set(mission.id, mission);
  return mission;
}

export function describeMission(mission, { worldDoc = null } = {}) {
  if (!mission) return { error: "mission_missing" };

  const reqs = mission.requirements || [];
  const byStatus = {};
  for (const r of reqs) {
    const s = r.status || "unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const openDecisions = (mission.plan?.openDecisions || []).filter((d) => d.status === "open");
  const awaitingProofs = (mission.proofs || []).filter((p) => p.status === "awaiting_approval");
  const unreadNotes = (mission.notifications || []).filter((n) => !n.read);

  const blockers = reqs
    .filter((r) => r.priority === "blocker" && !["done", "wont_fix"].includes(r.status))
    .map((r) => `${r.id} [${r.kind}/${r.status}] ${r.mustBecomeTrue}`);

  const engQueue = listEngAutoDispatch(mission);

  const nextAct =
    openDecisions.length > 0
      ? `Answer decision: ${openDecisions[0].id} — ${openDecisions[0].question}`
      : awaitingProofs.length > 0
        ? `Approve proofs: ${awaitingProofs.map((p) => p.id).join(", ")}`
        : engQueue[0]
          ? engQueue[0].dispatch?.status === "blocked_builder_unconfigured"
            ? `Eng saved, blocked: builder not configured — ${engQueue[0].requirementId}`
            : `Eng auto-dispatch (do not wait for Evan): ${engQueue[0].requirementId}`
          : blockers[0]
            ? `Advance requirement: ${blockers[0].split(" ")[0]}`
            : mission.playable?.status === "not_yet"
              ? "No human gate — Director can propose next cycle (mission_advance later)."
              : "Playable attested.";

  const lines = [
    `# ${mission.title}`,
    `id: ${mission.id}`,
    `status: ${mission.status} · playable: ${mission.playable?.status || "not_yet"}`,
    `updated: ${mission.updatedAt}`,
    "",
    "## Intent",
    mission.intent?.narrative || "(none)",
    "",
    "## Acceptance journey",
    ...(mission.intent?.acceptanceJourney || []).map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Requirements",
    `counts: ${JSON.stringify(byStatus)}`,
    ...reqs.map((r) => `- ${r.id} · ${r.kind} · ${r.status} — ${r.mustBecomeTrue}`),
  ];

  if (engQueue.length) {
    const anyBlocked = engQueue.some((e) => e.dispatch?.status === "blocked_builder_unconfigured");
    const anyQueued = engQueue.some((e) => e.dispatch?.status === "queued" || e.dispatch?.status === "in_progress");
    lines.push(
      "",
      anyBlocked && !anyQueued
        ? `## Eng auto-dispatch (${engQueue.length}) — saved, blocked: builder not configured`
        : `## Eng auto-dispatch (${engQueue.length}) — start without Evan asking`,
      ...engQueue.map((e) => {
        const route = e.design?.routeId ? ` → ${e.design.routeId}` : "";
        const diff = e.dispatch?.difficulty ? ` (${e.dispatch.difficulty})` : "";
        return `- ${e.requirementId} [${e.dispatch?.status || "queued"}]${diff}${route} — ${e.mustBecomeTrue}`;
      }),
      anyBlocked && !anyQueued
        ? "Set MINIGAME_MAKER_WEBHOOK_URL (Cursor Minigame Maker). Do not imply a worker has started."
        : "Worker: open PR + CI. Do not merge. Do not mark playable."
    );
  }

  const recentFeedback = (mission.feedback || []).slice(-8);
  if (recentFeedback.length) {
    lines.push(
      "",
      "## Recent feedback (ChatGPT / Evan)",
      ...recentFeedback.map((f) => {
        const about = [
          f.requirementId,
          f.proofId,
          f.candidateIndex != null ? `cand ${f.candidateIndex}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return `- [${f.kind || "general"}] ${f.text}${about ? ` (${about})` : ""}`;
      })
    );
  }

  lines.push(
    "",
    "## Awaiting Evan",
    openDecisions.length
      ? openDecisions.map((d) => `- decision ${d.id}: ${d.question}`).join("\n")
      : "- (no open decisions)",
    awaitingProofs.length
      ? awaitingProofs.map((p) => `- proof ${p.id} (${p.kind})`).join("\n")
      : "- (no proofs awaiting approval)",
    "",
    "## Unapproved images",
    galleryMarkdown(unapprovedImageGallery(mission, { worldDoc })) ||
      "- (none — attach proofs or wait for harvest)",
    "",
    "## Notifications",
    unreadNotes.length
      ? unreadNotes.map((n) => `- [${n.type}] ${n.text}`).join("\n")
      : "- (none unread)",
    "",
    "## Next act",
    nextAct,
    "",
    "## Blockers",
    blockers.length ? blockers.map((b) => `- ${b}`).join("\n") : "- (none)"
  );

  return {
    id: mission.id,
    title: mission.title,
    status: mission.status,
    playable: mission.playable?.status || "not_yet",
    nextAct,
    engAutoDispatch: engQueue,
    awaitingEvan: {
      decisions: openDecisions.map((d) => d.id),
      proofs: awaitingProofs.map((p) => p.id),
      note: "Eng builds auto-start; Evan only for taste, budget, PR merge, playable.",
    },
    requirementCounts: byStatus,
    unreadNotifications: unreadNotes.length,
    recentFeedback: (mission.feedback || []).slice(-8),
    unapprovedImages: unapprovedImageGallery(mission, { worldDoc }),
    text: lines.join("\n"),
  };
}

/** Eng requirements the worker must start without Evan asking. */
export function listEngAutoDispatch(mission) {
  if (!mission) return [];
  return (mission.requirements || [])
    .filter((r) => {
      if (r.kind !== "engineering") return false;
      if (["done", "wont_fix"].includes(r.status)) return false;
      const d = r.dispatch;
      if (d && d.autoStart === false) return false;
      // Default: any open/proposed/in_progress eng req is auto-dispatch unless explicitly off.
      if (d && ["merged", "cancelled"].includes(d.status)) return false;
      return true;
    })
    .map((r) => ({
      requirementId: r.id,
      mustBecomeTrue: r.mustBecomeTrue,
      status: r.status,
      dispatch: r.dispatch || { autoStart: true, status: "queued" },
      design: r.design || null,
      links: r.links || {},
    }));
}

/**
 * File (or refresh) an engineering minigame requirement with tight design params.
 * Auto-dispatches to eng worker — Evan does not need to ask for the build.
 */
export function requestMinigame(
  mission,
  {
    routeId,
    verb,
    design = {},
    mustBecomeTrue = null,
    requirementId = null,
    difficulty = "moderate",
    supersedeRequirementIds = [],
  } = {}
) {
  if (!mission) return { error: "mission_missing" };
  const route = String(routeId || design.routeId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  if (!route || route.length < 2) {
    return { error: "route_id_required", hint: "Proposed World2POIRoute / behavior id, e.g. moonLaunch" };
  }
  const cleanedVerb = String(verb || design.verb || "").trim().slice(0, 200);
  if (!cleanedVerb) return { error: "verb_required", hint: "Kid-facing verb, e.g. land rocket on pad" };

  const id =
    String(requirementId || "").trim() ||
    `req.eng.${route}`;

  const fail = design.fail || "infinite_retry";
  const bypass = design.bypass != null ? design.bypass : "Do it for me";
  const onWin = design.onWin || {};
  const captionDefaultTier = design.captionDefaultTier || "micro";

  const designBlock = {
    routeId: route,
    verb: cleanedVerb,
    feel: design.feel || null,
    teach: design.teach || ["isolate", "elaborate", "combine_in_play"],
    fail,
    bypass,
    onWin,
    inputs: design.inputs || "thumb-first iPad",
    artSlots: Array.isArray(design.artSlots) ? design.artSlots.slice(0, 12) : [],
    referenceRoutes: Array.isArray(design.referenceRoutes)
      ? design.referenceRoutes.slice(0, 8)
      : ["plink", "moonGuidance"],
    acceptance: Array.isArray(design.acceptance)
      ? design.acceptance.slice(0, 8)
      : ["6yo solo", "no text puzzle", "win or bypass < 90s"],
    physics: design.physics || null,
    captionDefaultTier,
    corpora: [
      "docs/architecture/GAME_DESIGNER_CORPUS.md",
      "docs/architecture/CUTSCENE_DESIGNER_CORPUS.md",
    ],
    ...Object.fromEntries(
      Object.entries(design).filter(
        ([k]) =>
          ![
            "routeId",
            "verb",
            "feel",
            "teach",
            "fail",
            "bypass",
            "onWin",
            "inputs",
            "artSlots",
            "referenceRoutes",
            "acceptance",
            "physics",
            "captionDefaultTier",
          ].includes(k)
      )
    ),
  };

  const must =
    String(mustBecomeTrue || "").trim() ||
    `${route} minigame: ${cleanedVerb}; fail=${fail}; bypass=${bypass || "none"}; corpora applied`;

  const at = nowIso();
  const supersede = [
    ...(Array.isArray(supersedeRequirementIds) ? supersedeRequirementIds : []),
    ...(Array.isArray(design.supersedeRequirementIds) ? design.supersedeRequirementIds : []),
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  for (const oldId of supersede) {
    const oldReq = (mission.requirements || []).find((r) => r.id === oldId);
    if (!oldReq || oldReq.id === id) continue;
    oldReq.status = "wont_fix";
    oldReq.dispatch = {
      ...(oldReq.dispatch || {}),
      status: "cancelled",
      autoStart: false,
      cancelledAt: at,
      note: `Superseded by ${id}`,
    };
  }

  let req = (mission.requirements || []).find((r) => r.id === id);
  if (!req) {
    req = {
      id,
      kind: "engineering",
      mustBecomeTrue: must.slice(0, 500),
      priority: "blocker",
      status: "open",
      links: { githubIssue: null, branch: null, prUrl: null, evidencePaths: [] },
      design: designBlock,
      dispatch: makeEngDispatch({ difficulty, at }),
    };
    mission.requirements = mission.requirements || [];
    mission.requirements.push(req);
  } else {
    req.kind = "engineering";
    req.mustBecomeTrue = must.slice(0, 500);
    req.status = ["done", "wont_fix"].includes(req.status) ? "open" : req.status || "open";
    req.design = { ...(req.design || {}), ...designBlock };
    req.links = req.links || { githubIssue: null, branch: null, prUrl: null, evidencePaths: [] };
    req.dispatch = makeEngDispatch({
      difficulty: difficulty || req.dispatch?.difficulty || "moderate",
      at,
      prior: req.dispatch,
    });
  }

  const blocked = req.dispatch?.status === "blocked_builder_unconfigured";
  const note = {
    id: newId("note"),
    type: blocked ? "eng_dispatch_blocked" : "eng_auto_dispatch",
    at,
    text: blocked
      ? `${mission.title} — eng ${id} (${difficulty}) saved, blocked: builder not configured.`
      : `${mission.title} — eng auto-dispatch ${id} (${difficulty}): ${cleanedVerb}. Worker wake sent; open PR, do not merge.`,
    read: false,
    requirementId: id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(note);
  mission.updatedAt = at;

  return {
    mission,
    requirement: req,
    notification: note,
    engAutoDispatch: listEngAutoDispatch(mission),
    builderConfigured: isMinigameMakerConfigured(),
  };
}

/**
 * Attach a proof gallery to a requirement (real candidates or stubs).
 */
export function attachProof(mission, { requirementId, kind = "art_candidates", candidates = [] } = {}) {
  const req = (mission.requirements || []).find((r) => r.id === requirementId);
  if (!req) return { error: "requirement_missing", requirementId };

  const proof = {
    id: newId("proof"),
    kind,
    requirementId,
    status: "awaiting_approval",
    createdAt: nowIso(),
    payload: {
      candidates: candidates.length
        ? candidates
        : [
            { index: 1, url: "https://example.invalid/poc-candidate-1.png", label: "Candidate 1" },
            { index: 2, url: "https://example.invalid/poc-candidate-2.png", label: "Candidate 2" },
            { index: 3, url: "https://example.invalid/poc-candidate-3.png", label: "Candidate 3" },
            { index: 4, url: "https://example.invalid/poc-candidate-4.png", label: "Candidate 4" },
          ],
    },
  };

  mission.proofs = mission.proofs || [];
  mission.proofs.push(proof);
  req.status = "proofs_ready";
  if (!req.links) req.links = {};
  req.links.candidates = proof.payload.candidates;

  const note = {
    id: newId("note"),
    type: "proofs_ready",
    at: nowIso(),
    text: `${mission.title} — proofs ready for ${requirementId}`,
    read: false,
    proofId: proof.id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(note);
  mission.updatedAt = nowIso();

  return { mission, proof, notification: note };
}

/**
 * Ensure an art requirement exists (create proposed if missing) for a semanticId.
 */
export function ensureArtRequirement(mission, { requirementId, semanticId, mustBecomeTrue } = {}) {
  const id =
    String(requirementId || "").trim() ||
    `req.art.${String(semanticId || "plate").replace(/^poi\.|^map\./, "").replace(/\./g, ".")}`;
  let req = (mission.requirements || []).find((r) => r.id === id);
  if (!req && semanticId) {
    req = (mission.requirements || []).find((r) => r.semanticId === semanticId);
  }
  if (req) return req;
  req = {
    id: id.startsWith("req.") ? id : `req.art.${id}`,
    kind: "art",
    mustBecomeTrue:
      mustBecomeTrue ||
      `Art registered as ${semanticId || "semantic asset"}`,
    semanticId: semanticId || null,
    priority: "blocker",
    status: "open",
    links: { artRequestId: null, assetJobIds: [], candidates: [] },
  };
  mission.requirements = mission.requirements || [];
  mission.requirements.push(req);
  mission.updatedAt = nowIso();
  return req;
}

/**
 * Phone/MCP review deck shaped from a Mission proof on the household world.
 * Candidate urls should already be plate-proxy or game-server reachable.
 */
export function deckFromMission(mission, { proofId = null } = {}) {
  if (!mission) return { error: "mission_missing" };
  const awaiting = (mission.proofs || []).filter((p) => p.status === "awaiting_approval");
  const proof = proofId
    ? (mission.proofs || []).find((p) => p.id === proofId)
    : awaiting[0];
  if (!proof) return { error: "no_proofs_awaiting", missionId: mission.id };
  if (proof.status !== "awaiting_approval") {
    return { error: "proof_not_awaiting", status: proof.status, proofId: proof.id };
  }
  const req = (mission.requirements || []).find((r) => r.id === proof.requirementId);
  return {
    id: `deck.mission.${mission.id}.${proof.id}`,
    title: mission.title,
    semanticId: req?.semanticId || null,
    missionId: mission.id,
    proofId: proof.id,
    requirementId: proof.requirementId,
    status: "open",
    provider: "world",
    durable: "creative.missionOs",
    candidates: (proof.payload?.candidates || []).map((c) => ({
      index: Number(c.index),
      label: c.label || `Candidate ${c.index}`,
      url: c.url,
      previewUrl: c.previewUrl || c.thumbUrl || null,
      jobId: c.jobId || null,
    })),
  };
}

export function approveProof(
  mission,
  { proofId, candidateIndex, note = "", surface = "mcp", by = "evan" } = {}
) {
  const proof = (mission.proofs || []).find((p) => p.id === proofId);
  if (!proof) return { error: "proof_missing", proofId };
  if (proof.status !== "awaiting_approval") {
    return { error: "proof_not_awaiting", status: proof.status };
  }

  const idx = Number(candidateIndex);
  if (!Number.isFinite(idx) || idx < 1) {
    return { error: "candidate_index_required", hint: "1-based index into proof candidates" };
  }

  const candidates = proof.payload?.candidates || [];
  const chosen = candidates.find((c) => Number(c.index) === idx) || candidates[idx - 1];
  if (!chosen) return { error: "candidate_missing", candidateIndex: idx };

  proof.status = "approved";
  proof.approvedIndex = idx;
  proof.approvedAt = nowIso();

  const approval = {
    id: newId("appr"),
    proofId,
    decision: "approve",
    candidateIndex: idx,
    note: String(note || "").slice(0, 240),
    by: String(by || "evan").slice(0, 40),
    at: nowIso(),
    surface: String(surface || "mcp").slice(0, 40),
    candidate: chosen,
  };
  mission.approvals = mission.approvals || [];
  mission.approvals.push(approval);

  const req = (mission.requirements || []).find((r) => r.id === proof.requirementId);
  if (req) {
    req.status = "done";
    if (!req.links) req.links = {};
    req.links.approvedCandidate = chosen;
  }

  const notification = {
    id: newId("note"),
    type: "proof_approved",
    at: nowIso(),
    text: `${mission.title} — approved ${proof.requirementId} candidate ${idx}`,
    read: false,
    proofId,
    approvalId: approval.id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(notification);
  mission.updatedAt = nowIso();

  return { mission, approval, notification };
}

/** Dump one candidate (keep the rest) or the whole proof if no index / last remaining. */
export function rejectProof(
  mission,
  {
    proofId,
    candidateIndex = null,
    note = "",
    direction = "replace",
    surface = "mcp",
    by = "evan",
  } = {}
) {
  const proof = (mission.proofs || []).find((p) => p.id === proofId);
  if (!proof) return { error: "proof_missing", proofId };
  if (proof.status !== "awaiting_approval") {
    return { error: "proof_not_awaiting", status: proof.status };
  }

  const idx = candidateIndex == null ? null : Number(candidateIndex);
  const candidates = proof.payload?.candidates || [];
  const dumped =
    idx != null && Number.isFinite(idx)
      ? candidates.find((c) => Number(c.index) === idx) || candidates[idx - 1] || null
      : null;

  if (!proof.payload) proof.payload = { candidates: [] };
  proof.payload.dumped = Array.isArray(proof.payload.dumped) ? proof.payload.dumped : [];

  let remaining = candidates;
  if (dumped) {
    remaining = candidates.filter((c) => c !== dumped && Number(c.index) !== Number(dumped.index));
    proof.payload.candidates = remaining;
    proof.payload.dumped.push({ ...dumped, dumpedAt: nowIso() });
  }

  const dumpAll = !dumped || remaining.length === 0;
  if (dumpAll) {
    proof.status = "rejected";
    proof.rejectedAt = nowIso();
    proof.rejectedIndex = idx;
    proof.rejectDirection = String(direction || "replace").slice(0, 40);
    if (!dumped && candidates.length) {
      proof.payload.dumped.push(...candidates.map((c) => ({ ...c, dumpedAt: nowIso() })));
      proof.payload.candidates = [];
    }
  } else {
    proof.status = "awaiting_approval";
    proof.rejectedIndex = idx;
  }

  const approval = {
    id: newId("appr"),
    proofId,
    decision: "reject",
    candidateIndex: idx,
    note: String(note || "").slice(0, 240),
    by: String(by || "evan").slice(0, 40),
    at: nowIso(),
    surface: String(surface || "mcp").slice(0, 40),
    direction: proof.rejectDirection,
    candidate: dumped,
  };
  mission.approvals = mission.approvals || [];
  mission.approvals.push(approval);

  const req = (mission.requirements || []).find((r) => r.id === proof.requirementId);
  if (req) {
    req.status = dumpAll ? "open" : "proofs_ready";
    if (!req.links) req.links = {};
    req.links.lastDump = { at: approval.at, candidateIndex: idx, note: approval.note };
    req.links.candidates = proof.payload?.candidates || [];
  }

  const notification = {
    id: newId("note"),
    type: "proof_dumped",
    at: nowIso(),
    text: `${mission.title} — dumped ${proof.requirementId}${idx != null ? ` candidate ${idx}` : ""}`,
    read: false,
    proofId,
    approvalId: approval.id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(notification);
  mission.updatedAt = nowIso();

  return { mission, approval, notification, remaining: (proof.payload?.candidates || []).length };
}

/**
 * Undo Keep: reopen the proof. Caller deletes registry bytes.
 */
export function reverseKeep(
  mission,
  { proofId, note = "", surface = "drop", by = "evan" } = {}
) {
  const proof = (mission.proofs || []).find((p) => p.id === proofId);
  if (!proof) return { error: "proof_missing", proofId };
  if (proof.status !== "approved") {
    return { error: "proof_not_kept", status: proof.status };
  }

  const req = (mission.requirements || []).find((r) => r.id === proof.requirementId);
  const idx = Number(proof.approvedIndex) || null;
  const chosen =
    (proof.payload?.candidates || []).find((c) => Number(c.index) === idx) ||
    req?.links?.approvedCandidate ||
    null;
  const semanticId = req?.semanticId || chosen?.semanticId || null;
  const registryKey = req?.links?.registryIngest?.registryKey || chosen?.registryKey || null;

  proof.status = "awaiting_approval";
  delete proof.approvedIndex;
  delete proof.approvedAt;
  proof.reversedAt = nowIso();

  if (req) {
    req.status = "proofs_ready";
    if (!req.links) req.links = {};
    delete req.links.approvedCandidate;
    req.links.registryIngest = null;
  }

  const approval = {
    id: newId("appr"),
    proofId,
    decision: "unkeep",
    candidateIndex: idx,
    note: String(note || "").slice(0, 240),
    by: String(by || "evan").slice(0, 40),
    at: nowIso(),
    surface: String(surface || "drop").slice(0, 40),
    candidate: chosen,
    semanticId,
    registryKey,
  };
  mission.approvals = mission.approvals || [];
  mission.approvals.push(approval);

  const notification = {
    id: newId("note"),
    type: "proof_unkept",
    at: nowIso(),
    text: `${mission.title} — unkept ${proof.requirementId}${idx != null ? ` candidate ${idx}` : ""} (registry bytes pulled)`,
    read: false,
    proofId,
    approvalId: approval.id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(notification);
  mission.updatedAt = nowIso();

  return { mission, approval, notification, semanticId, registryKey, candidate: chosen };
}

/**
 * Undo Dump: put one candidate back on the live proof.
 */
export function restoreDump(
  mission,
  { proofId, candidateIndex, note = "", surface = "drop", by = "evan" } = {}
) {
  const proof = (mission.proofs || []).find((p) => p.id === proofId);
  if (!proof) return { error: "proof_missing", proofId };
  if (!proof.payload) proof.payload = { candidates: [], dumped: [] };
  const dumped = Array.isArray(proof.payload.dumped) ? proof.payload.dumped : [];
  const idx = Number(candidateIndex);
  if (!Number.isFinite(idx) || idx < 1) {
    return { error: "candidate_index_required" };
  }
  const foundI = dumped.findIndex((c) => Number(c.index) === idx);
  if (foundI < 0) return { error: "dumped_missing", candidateIndex: idx };
  const [restored] = dumped.splice(foundI, 1);
  delete restored.dumpedAt;
  proof.payload.dumped = dumped;
  proof.payload.candidates = [...(proof.payload.candidates || []), restored].sort(
    (a, b) => Number(a.index) - Number(b.index)
  );
  proof.status = "awaiting_approval";
  delete proof.rejectedAt;
  delete proof.rejectedIndex;

  const req = (mission.requirements || []).find((r) => r.id === proof.requirementId);
  if (req) {
    req.status = "proofs_ready";
    if (!req.links) req.links = {};
    req.links.candidates = proof.payload.candidates;
  }

  const approval = {
    id: newId("appr"),
    proofId,
    decision: "restore",
    candidateIndex: idx,
    note: String(note || "").slice(0, 240),
    by: String(by || "evan").slice(0, 40),
    at: nowIso(),
    surface: String(surface || "drop").slice(0, 40),
    candidate: restored,
  };
  mission.approvals = mission.approvals || [];
  mission.approvals.push(approval);

  const notification = {
    id: newId("note"),
    type: "proof_restored",
    at: nowIso(),
    text: `${mission.title} — restored ${proof.requirementId} candidate ${idx}`,
    read: false,
    proofId,
    approvalId: approval.id,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(notification);
  mission.updatedAt = nowIso();

  return { mission, approval, notification, candidate: restored };
}

/**
 * Durable feedback from ChatGPT / Evan — does not approve or dump by itself.
 * Workers and next art passes read this via mission_describe.
 */
export function appendMissionFeedback(
  mission,
  {
    text,
    kind = "general",
    requirementId = null,
    proofId = null,
    candidateIndex = null,
    surface = "chatgpt",
    by = "evan",
  } = {}
) {
  if (!mission) return { error: "mission_missing" };
  const cleaned = String(text || "").trim().slice(0, 2000);
  if (!cleaned) return { error: "feedback_required", hint: "Pass text — direction for art/eng/taste." };

  const allowed = new Set(["general", "art", "eng", "taste", "direction", "playtest"]);
  const k = String(kind || "general").trim().toLowerCase();
  const kindSafe = allowed.has(k) ? k : "general";

  let idx = null;
  if (candidateIndex != null && candidateIndex !== "") {
    const n = Number(candidateIndex);
    if (!Number.isFinite(n) || n < 1) {
      return { error: "candidate_index_invalid", hint: "1-based candidate index or omit" };
    }
    idx = n;
  }

  const reqId = String(requirementId || "").trim() || null;
  const pId = String(proofId || "").trim() || null;
  if (reqId && !(mission.requirements || []).some((r) => r.id === reqId)) {
    return { error: "requirement_missing", requirementId: reqId };
  }
  if (pId && !(mission.proofs || []).some((p) => p.id === pId)) {
    return { error: "proof_missing", proofId: pId };
  }

  const at = nowIso();
  const entry = {
    id: newId("fb"),
    kind: kindSafe,
    text: cleaned,
    requirementId: reqId,
    proofId: pId,
    candidateIndex: idx,
    by: String(by || "evan").slice(0, 40),
    surface: String(surface || "chatgpt").slice(0, 40),
    at,
  };
  mission.feedback = mission.feedback || [];
  mission.feedback.push(entry);
  if (mission.feedback.length > 100) {
    mission.feedback = mission.feedback.slice(-100);
  }

  const notification = {
    id: newId("note"),
    type: "mission_feedback",
    at,
    text: `${mission.title} — feedback (${kindSafe}): ${cleaned.slice(0, 120)}`,
    read: false,
    feedbackId: entry.id,
    requirementId: reqId,
    proofId: pId,
  };
  mission.notifications = mission.notifications || [];
  mission.notifications.push(notification);
  mission.updatedAt = at;

  return { mission, feedback: entry, notification };
}

function collectResultUrls(result) {
  if (!result || typeof result !== "object") return [];
  const raw = [];
  if (Array.isArray(result.candidateUrls)) raw.push(...result.candidateUrls);
  if (Array.isArray(result.urls)) raw.push(...result.urls);
  if (Array.isArray(result.images)) {
    raw.push(...result.images.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean));
  }
  if (typeof result.url === "string") raw.push(result.url);
  return [...new Set(raw.map((u) => String(u || "").trim()).filter((u) => /^https:\/\//i.test(u)))];
}

function rowHasPlate(row) {
  return Boolean(row?.previewUrl || row?.url);
}

/**
 * Phone Archive history: proofs, dumps, boards, Midjourney harvests.
 * Default platesOnly — skip failed/cancelled/queued jobs with no image bytes
 * so Archive is a usable photo stream, not a job console.
 */
export function reviewHistoryFromDoc(doc, { limit = 80, platesOnly = true } = {}) {
  const rows = [];
  const bag = doc?.creative?.missionOs?.missions || {};
  for (const m of Object.values(bag)) {
    if (!m || typeof m !== "object") continue;
    const reqById = Object.fromEntries((m.requirements || []).map((r) => [r.id, r]));
    for (const proof of m.proofs || []) {
      const req = reqById[proof.requirementId] || {};
      const prompt =
        req.links?.lastPrompt ||
        req.mustBecomeTrue ||
        m.intent ||
        m.title ||
        "";
      const live = (proof.payload?.candidates || []).map((c) => ({ ...c, lane: "live" }));
      const dumped = (proof.payload?.dumped || []).map((c) => ({ ...c, lane: "dumped" }));
      for (const c of [...live, ...dumped]) {
        const idx = Number(c.index);
        let status = "awaiting";
        if (c.lane === "dumped") status = "dumped";
        else if (proof.status === "approved" && Number(proof.approvedIndex) === idx) status = "boarded";
        else if (proof.status === "approved") status = "runner_up";
        else if (proof.status === "rejected") status = "dumped";
        else if (proof.status === "awaiting_approval") status = "awaiting";
        const row = {
          id: `${proof.id}:${idx}:${c.lane}`,
          at: c.dumpedAt || proof.approvedAt || proof.rejectedAt || proof.createdAt || m.updatedAt,
          missionId: m.id,
          missionTitle: m.title,
          proofId: proof.id,
          requirementId: proof.requirementId || null,
          semanticId: req.semanticId || c.semanticId || null,
          prompt: c.prompt || c.brief || prompt,
          candidateIndex: idx,
          url: c.url || null,
          previewUrl: c.previewUrl || c.thumbUrl || c.url || null,
          status,
          jobId: c.jobId || null,
          source: "mission",
        };
        if (platesOnly && !rowHasPlate(row)) continue;
        rows.push(row);
      }
    }
  }

  const ec = doc?.creative?.executionCapacity?.jobs || {};
  for (const job of Object.values(ec)) {
    if (!job || typeof job !== "object") continue;
    const prompt = job.payload?.prompt || "";
    const semanticId = job.payload?.semanticId || job.payload?.bindWith || null;
    const urls = collectResultUrls(job.result);
    if (!urls.length && job.state !== "completed") {
      // Failed / cancelled / queued Midjourney — no plate to browse.
      if (platesOnly) continue;
      rows.push({
        id: `ec:${job.id}`,
        at: job.updatedAt || job.createdAt,
        missionId: job.payload?.missionId || null,
        missionTitle: "Midjourney queue",
        proofId: null,
        requirementId: job.payload?.requirementId || null,
        semanticId,
        prompt,
        candidateIndex: null,
        url: null,
        previewUrl: null,
        status: job.state || "queued",
        jobId: job.id,
        source: "executionCapacity",
      });
      continue;
    }
    urls.forEach((url, i) => {
      rows.push({
        id: `ec:${job.id}:${i + 1}`,
        at: job.finishedAt || job.updatedAt || job.createdAt,
        missionId: job.payload?.missionId || null,
        missionTitle: "Midjourney harvest",
        proofId: null,
        requirementId: job.payload?.requirementId || null,
        semanticId,
        prompt,
        candidateIndex: i + 1,
        url,
        previewUrl: url,
        status: "harvested",
        jobId: job.id,
        source: "executionCapacity",
      });
    });
  }

  rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const cap = Math.min(120, Math.max(1, Number(limit) || 80));
  return rows.slice(0, cap);
}

export function __resetMissionsCacheForTests() {
  missionsCache.clear();
}

export const MISSION_STATUSES = STATUSES;
export const REQUIREMENT_STATUSES = REQ_STATUSES;

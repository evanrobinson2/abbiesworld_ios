# Mission OS — fully baked plan for the next branch

**Companion to:** [`UNIFIED.md`](./UNIFIED.md)  
**Vertical slice:** Abby & Daddy Moon Base  
**Maxim:** The user should never again be the integration layer.  
**Status:** Spine live (2026-09-30) — Mission on household world + registry art + phone Board/Dump. Director / Midjourney worker / overnight wake still next.

**Shepherd doc:** This file is the **key product document** for durable intent. When the app evolves or Evan expresses new intent in chat, **add to Missions here in spirit** — update this plan when the object model or rails change; do not invent a parallel tracker.

---

## 0. One-sentence product

Abbie’s World is a **persistent creative world** with a **Mission** as durable intent. Surfaces (ChatGPT, Studio, iPad, iPhone, Cursor) expose capabilities into that world. A thin **Director** advances Missions through bounded work cycles until **playable reality**, interrupting Evan only for taste, money, new screens, commits, or play.

---

## 0.1 Mission = living intent database (not a sprint board)

**Evan’s call (2026-09-30):** keep Missions alive and **add to them** as the app evolves and as he expresses intent. Shepherd this document. 👍

That is the product: a **growing memory of creative intent**, not a one-shot ticket queue.

### Why not Jira (or Jira-shaped tools) as SoT?

| Fit | Verdict |
|---|---|
| Jira / Classic PM DBs | Great for eng chores, sprint status, assignees. Wrong grain for “Abby finds the pink rocket and lands with Daddy.” Turns taste into tickets. Evan already rejected being the bus / Gantt of workers. |
| Free PM alternatives (Linear free, GitHub Projects, Notion DBs) | Fine as **mirrors** for engineering requirements (`req.eng.*` → Issue). Still not the soul of Abbie’s World. |
| **Mission objects on the household game server** (what we started) | Right place: same world Abby plays, Auth0 household, survives chat death, phone can Board/Dump into it, ChatGPT/Cursor share one SoT. |

**Rule:** Mission SoT stays in Abbie’s World (server). Optional free tools may **reflect** eng/art chores — they must not become a second brain Evan has to reconcile.

### Living intent (CS)

Mission is a **versioned document** on the household world (`creative.missionOs.missions[id]`), concurrent via world `revision`.

| Piece | Shape |
|---|---|
| Intent | Mutable `narrative` / `acceptanceJourney` / `acceptanceTargets` — patch in place |
| Plan | `beats[]`, `openDecisions[]`, `assumptions[]` |
| Work | `requirements[]` with `kind`, `status`, optional `blockedBy[]` (DAG) |
| Evidence | Append-heavy `proofs[]`, `approvals[]`, `verification`, `integration` |
| Lifecycle | Status on Mission + requirements; playable only by human attest |
| Growth | Same `missionId`; patches + new rows; optional child Missions by id |
| Eng mirror | Optional GitHub/Linear links on `req.eng.*` — projection, not SoT |

Prefer extending an existing Mission over a second tracker. Surfaces talk; the document is the memory.

---

### How it grows (operations)

1. Talk → patch Mission intent and/or append requirements (same `missionId`).  
2. Director proposes requirements; Evan resolves decisions and Board/Dumps proofs.  
3. New app capabilities appear as new `requirements` (or child Missions), not a second tracker.  
4. Playable attestation is human-gated; later play signals may spawn child Missions.  
5. Amend this shepherd doc when the object model or rails change.

**Proved spine (2026-09-30):**  
`mission.wakeLoop.worldProof.v1` on world `creative.missionOs` → OpenAI plate on Game Asset API → phone `review.html?missionId=…` → Board/Dump → `PUT /api/v1/worlds/current`.

### Phone review — feedback backlog (2026-09-30)

**Scope now:** show the work; optional coarse skim later. Broader nav / gallery organization schemes deferred.

**Parked (build when Evan says go — not blocking):**
- Title = subject being drawn; canon toggle / PiP / config.
- Tap → feedback → Return or Revise & resubmit.
- Stable URL style; MCP phone telemetry (OAuth = Evan) for agent collab.
- Fluid feedback from phone or chat on the same Mission channel.
- History mode (past jobs; resubmit with new params; delete when safe).

---

## 1. What we already have (re-weave, don’t rewrite)

| Existing piece | Role in Mission OS |
|---|---|
| Studio MCP + steel rail (`author_beat`, scene/place/vars, lint) | **World capability** — closed ops that mutate live household state |
| Asset jobs + Game Asset registry + semantic IDs | **Art capability** intake → registered join keys |
| `art-requests/` lifecycle + queue + AD contract | **Art requirement** subgraph (open → proofs → fulfilled) |
| `chore(art-integration)` GitHub Issues | **Engineering requirement** for bind/wire/verify |
| `AGENT_COORDINATION.md` + callsign thrusts | Embryonic **worker log**; becomes evidence trail, not SoT |
| Live revision Accept-in-place (no player wipe) | **Integration** proof that world change reached play without destruction |
| Voyage capture / alpha stills / minigame evidence JSON | Patterns for **Verification** artifacts |
| Fair marble / picture puzzle / Plink / Waypoint moon buggy | **Playable precedents** for Moon Base beats |
| ChatGPT MCP + Cursor MCP (same backend) | Two **talk / act** surfaces into one OS |
| `creative.live` (vars/flags/hud/beat) | Session bag — **not** Mission store; Mission may *write* unlocks here |
| WaypointNavigationGame (moonbase art, victory polaroids) | Day-one **reuse** for lunar path / daddy reunion flavor |

**Missing centerpiece (original plan):** durable Mission object + Director state machine + playable-completion proofs + sparse notifications.

**Now present (spine):** Mission object on household world (`creative.missionOs`), MCP create/describe/approve/reject, registry-backed art jobs, phone gesture review writing back to the world. Still missing: Director advance cycles, Midjourney worker URL, sparse push, playable attestation UX.

---

## 2. Design that fits *Evan*, not a generic PM tool

Observed modality (git + art queue + session docs + marathon chats):

- **Burst conductor** — evening/weekend marathons, quiet gaps; Mission must idle and resume without archaeology.
- **Taste at candidate grain** — MJ job UUID + index; world edits at dryRun → confirm; binds at handoff; commits only when asked.
- **Hard role split** — Codex AD produces sources; Cursor binds/builds; Evan authorizes and playtests.
- **Hate being the bus** — copy URL, remember stills, relay AD→builder, ask “bind now?”, protect Home, refresh tokens.
- **Done = on Abby’s iPad** — compile/PR/registered semantic ID are waypoints.
- **Parallel callsigns work** if one-line and Home-safe; Dump is interrupt-first during playtest.
- **Notifications he wants:** proofs ready · one creative decision · budget · playable · regression. Never worker choreography.

**Slick for him** = evening partner that remembers overnight art, surfaces a short approval gallery, asks one gameplay fork when blocked, then says “ready for iPad” with a walkthrough checklist. Not a Gantt chart of workers.

---

## 3. Canonical object model

### 3.1 World (already mostly exists)

Server household world document remains SoT for:

- worlds list / current focus  
- players, active player, scene position  
- scenes, places, objects, behaviors  
- unlocks / vars  
- revision + pending Accept  
- asset semantic bindings  

**Extend observability** (MCP + small APIs), don’t replace:

```text
world_observe questions (v1):
  where_is_player?
  what_scene?
  nearby_pois?
  unlocks?
  has_played?(experienceId)
  place_exists?(poiId)
  visited?(poiId)
  changed_since?(isoTimestamp)
  mission_hooks?(missionId)   # POIs/vars this Mission owns
```

Play-session telemetry (v2, after Moon Base playable): soft counters — time in POI, retry counts, bypass used, returns to garden — stored as Mission/world **signals**, not secret manipulators.

### 3.2 Mission (new SoT)

Store on **Studio/household API**, sibling to worlds — not only in git, not buried inside one world doc (a Mission may span Home + Moon world + engineering repo).

```text
missions/
  {missionId}.json          # SoT (server); optional git mirror under missions/ for review
```

**Schema sketch (`AbbieMission`):**

```json
{
  "id": "mission.moonBase.abbyDaddy.v1",
  "title": "Abby & Daddy Moon Base",
  "status": "active",
  "createdAt": "…",
  "updatedAt": "…",
  "createdFrom": { "surface": "chatgpt", "utteranceRef": "…" },

  "intent": {
    "narrative": "Abby finds the pink rocket…",
    "acceptanceJourney": [
      "home: see pink rocket on path",
      "tap rocket → launch sequence",
      "flight → moon approach",
      "manual land (infinite retry + Land for me)",
      "meet Daddy at base",
      "garden beat",
      "meteor → repair/radar/quadbike adventure start"
    ],
    "acceptanceTargets": ["ipad.household", "iphone.parentOptional"]
  },

  "plan": {
    "beats": [ /* ordered story/play beats */ ],
    "inferredPacks": [ /* art packs Director proposed */ ],
    "assumptions": [ /* e.g. reuse Waypoint buggy for post-landing */ ],
    "openDecisions": [
      {
        "id": "decision.landingMiss",
        "question": "Miss landing pad: restart approach or bounce?",
        "options": ["infinite_retry", "bounce"],
        "defaultProposal": "infinite_retry_with_bypass",
        "status": "resolved",
        "answer": "She keeps trying forever. Offer bypass. No harm."
      }
    ]
  },

  "requirements": [
    {
      "id": "req.art.rocket.exterior",
      "kind": "art",
      "mustBecomeTrue": "Pink rocket POI art exists as semanticId poi.moonBase.rocket.exterior",
      "semanticId": "poi.moonBase.rocket.exterior",
      "priority": "blocker",
      "status": "proofs_ready",
      "links": {
        "artRequestId": "20261001-moon-rocket-exterior",
        "assetJobIds": ["job_…"],
        "candidates": [{ "job": "…", "index": 2, "url": "…" }]
      }
    },
    {
      "id": "req.eng.moonGuidance",
      "kind": "engineering",
      "mustBecomeTrue": "moonGuidance minigame: kid Lunar Lander, infinite retry, Land for me, emits unlock.moonBase.landed",
      "status": "in_progress",
      "links": {
        "githubIssue": "chore(mission): moonGuidance lander",
        "branch": "unified/moon-guidance",
        "tests": ["MoonGuidanceTests"],
        "evidencePaths": []
      }
    },
    {
      "id": "req.world.placeRocket",
      "kind": "world",
      "mustBecomeTrue": "poi.moonBase.rocket on scene.home path; behavior opens launch→guidance",
      "status": "blocked",
      "blockedBy": ["req.art.rocket.exterior", "req.eng.moonGuidance"],
      "links": { "authorBeatIntents": [] }
    },
    {
      "id": "req.verify.acceptanceJourney",
      "kind": "verification",
      "mustBecomeTrue": "Acceptance journey checklist completed on target iPad",
      "status": "pending"
    }
  ],

  "work": {
    "cycles": [
      {
        "id": "cycle.47",
        "at": "…",
        "observe": "14/21 art; lander PR green; rocket unbound",
        "reason": "Bind rocket after Evan approve #2",
        "act": "awaiting_human_approval",
        "verify": null,
        "evidence": []
      }
    ],
    "budgets": {
      "artCreditsUsd": { "limit": 20, "spent": 6.4 },
      "engCycles": { "limit": 12, "used": 3 },
      "mjGrids": { "limit": 40, "used": 11 }
    }
  },

  "proofs": [
    {
      "id": "proof.art.rocket.grid1",
      "kind": "art_candidates",
      "requirementId": "req.art.rocket.exterior",
      "status": "awaiting_approval",
      "payload": { "candidates": [/* 4 */] }
    }
  ],

  "approvals": [
    {
      "id": "appr.rocket.2",
      "proofId": "proof.art.rocket.grid1",
      "decision": "approve",
      "candidateIndex": 2,
      "note": "Rocket 3",
      "by": "evan",
      "at": "…",
      "surface": "chatgpt_voice"
    }
  ],

  "integration": {
    "worldRevisions": [/* after binds */],
    "iosCommits": [/* shas */],
    "catalogBindings": [/* semanticId → catalog */]
  },

  "verification": {
    "automated": [/* test xcresults, lint */],
    "runtimeEvidence": [/* screenshots, capture packs */],
    "acceptanceChecklist": [
      { "step": "home: see pink rocket", "status": "pending", "evidence": null }
    ]
  },

  "playable": {
    "status": "not_yet",
    "declaredAt": null,
    "declaredBy": null,
    "note": "Only Evan (or Abby+Evan) completing acceptanceJourney sets this."
  },

  "signals": {
    "postPlay": null
  }
}
```

**Status enum (Mission-level):**  
`draft → active → blocked_on_human → integrating → verifying → playable → observing → archived`

**Requirement statuses:**  
`proposed → ready → in_progress → proofs_ready → approved → integrating → verified → satisfied | cancelled | blocked`

**Constitutional rule in schema:**  
`playable.status` may **never** be set by workers. Only human attestation (or a future explicit “I walked it” MCP tool with Evan auth).

### 3.3 Requirement kinds (capability tags)

| kind | Satisfied by | Existing substrate |
|---|---|---|
| `art` | registered + approved source (+ later bound) | art-requests + asset jobs |
| `world` | steel-rail ops + lint + Accept | author_beat / place_upsert |
| `engineering` | code + tests + runtime evidence | Cursor + GitHub chores |
| `decision` | Evan answer | openDecisions |
| `budget` | spend authorization | work.budgets |
| `verification` | device evidence + checklist | capture scripts, screenshots |
| `notification` | delivered sparse alert | (new thin channel) |

Art-request JSON gains optional `missionId` + `requirementId` (join back). Chore issues gain the same. Asset jobs already have `semanticId` — Mission requirements hold the semanticId.

---

## 4. Director — competent state machine, not recursive AGI

### 4.1 Loop

```text
Observe → Reason → Act → Verify → Record → (sleep or Repeat)
```

- **Observe:** read Mission + world_describe + art queue + open chores + budgets + recent evidence.  
- **Reason:** pick **one** next requirement that is unblocked; or raise **one** human interrupt.  
- **Act:** dispatch to exactly one capability worker with a **budget** (time, credits, files, confirm flags).  
- **Verify:** check evidence against `mustBecomeTrue` (not against “worker said done”).  
- **Record:** append `work.cycles[]`; update requirement status; maybe enqueue notification.

**Hard anti-patterns:**

- No Claude→Claude→Claude chains as the architecture. Workers are replaceable (Cursor today, other agent tomorrow).  
- No worker may mark Mission `playable`.  
- No auto-**merge** / auto-push-to-main / auto-`confirmReplace`. Eng **auto-starts** (branch + PR + CI) when `req.eng.*` is open — Evan does **not** ask for the build, including hard physics puzzlers.  
- No ChatGPT `place_upsert` onto a brand-new `World2POIRoute` until that route ships via merged PR.  
- No auto Midjourney spend past budget without `decision` approval.  
- Home-protection flag on Mission: `constraints.doNotTouchScenes: ["scene.home"]` until explicitly cleared (TED-talk pattern).

**Eng auto-dispatch maxim:** Once a Mission has an engineering minigame requirement (`mission_request_minigame` or inferred `req.eng.*`), Cursor/eng **starts without being asked**. Difficulty is a planning hint, not a gate. Evan’s interrupts remain taste, budget, PR merge, and playable attestation — not “please build that.”

### 4.2 Capability router

```text
need image asset     → Art capability
need world mutation  → World capability (author_beat)
need new POI route / physics / UI → Engineering capability
need bind catalog    → Engineering (chore) after art approved
need “does it work?” → Build/Test capability
need Evan judgment   → Decision + Notification (stop)
need on-device truth → Verification + Delivery (install + checklist)
```

Art capability **chooses provider** (reuse / edit / gpt-image-2 / Midjourney / Meshy / 3D) from Mission style pins + budget + quality bar — Mission never says “use Midjourney” unless Evan overrides.

### 4.3 Workers (bounded contracts)

| Worker | Input | Output evidence | Must not |
|---|---|---|---|
| **Art Director** | art requirement + style refs + budget | candidates, hashes, art-request move, AssetSources pack | bind runtime, invent gameplay |
| **World Author** | world requirement + dryRun default | plan.ops, lint, revision id | wipe players, invent routes |
| **Builder / Eng** | engineering requirement | PR/diff summary, tests, screenshots paths | declare adventure finished |
| **Dump** | playtest utterance | triage note + fix-now or queued req | stall other thrusts |
| **Verifier** | verification requirement | checklist ticks + capture pack | skip physical acceptance |

Director schedules workers; workers do not schedule Directors.

### 4.4 Human interrupt taxonomy (only these)

1. **Art proofs ready** — gallery of N candidates for requirement set.  
2. **Creative / gameplay decision** — one question, proposed default.  
3. **Budget exceed** — proposed spend > remaining.  
4. **PR ready / route ships** — eng opened a PR that adds a `World2POIRoute` or large surface; Evan merges (or rejects). Starting the build is **not** an interrupt.  
5. **Playable candidate** — install ready; acceptance journey listed.  
6. **Regression** — named experience broken (e.g. Marble Voyage).  

Everything else is silent state.

---

## 5. Surfaces — same Mission, different capabilities

```text
                    ┌─────────────────────────┐
   Talk / Voice ──►│     ABBIE’S WORLD        │◄── Play (Abby)
   Approve ───────►│  World + Missions + Dir │◄── Observe signals
   Engineer ──────►│                          │
                    └─────────────────────────┘
```

| Surface | Exposes | Does not own |
|---|---|---|
| **ChatGPT** (esp. Voice) | Create/update Mission intent; answer decisions; approve by saying “Rocket 3”; author_beat confirm; ask world_observe | Repo edits, MJ credentials as product |
| **Studio** | Visual proofs wall; placement; compare; approve/reject; mission progress 14/21 | Sole Mission SoT (it *views* server Missions) |
| **Cursor** | Claim engineering requirements; implement; report evidence to Mission | Declaring playable; burning art credits |
| **iPad** | Play; Accept world; child creation; emit play signals | Parent approval inbox (maybe later toast “Daddy left a surprise”) |
| **iPhone (later)** | Sparse notifications; approve proofs; quick talk; smoke play | Becoming a second game product |
| **MCP** | Protocol for all of the above | Being “the product” |

**North-star UX line:** “Talk to Abbie’s World” — connector name already points here (`Abbie's World` MCP). Next branch makes that **literally true** by having talk create Missions, not only fire-and-forget `author_beat`.

---

## 6. MCP / API surface to add (minimal)

### 6.1 Mission tools

```text
mission_create        # from narrative intent → draft Mission + inferred plan
mission_get / list
mission_describe      # human-readable status: blockers, awaiting Evan, next act
mission_patch_intent  # refine narrative / acceptance journey
mission_answer_decision
mission_approve_proof # candidate index + note + optional reference image URL
mission_reject_proof  # note + guidance
mission_feedback      # durable taste/direction (not Board/Dump); optional proof/requirement/candidate
mission_attest_playable  # ONLY Evan; ticks acceptance checklist
mission_advance       # run one Director cycle (or N with budget) — dryRun default
```

### 6.2 Observe tools (world legibility)

```text
world_observe         # structured Q&A over current world + players
play_signals_get      # soft telemetry when available
```

### 6.3 Keep existing rails

Do **not** replace `author_beat` / asset jobs / art-requests. Mission **links** to them. Director calls them inside cycles.

`mission_advance` dryRun returns: `{ wouldAct, requirementId, worker, estimatedBudget, needsHuman? }` — same spirit as author_beat.

---

## 7. Approval capability (Studio page is optional)

**First ship:** Mission proofs as:

1. MCP-readable proof objects + candidate image URLs  
2. A single Studio page `/missions/:id` **or** ChatGPT canvas of candidates — whichever is faster; product is the **approve_proof** tool  
3. Optional: mirror proofs into `art-requests/in_review` so existing AD board still works  

Evan flow that must work from Voice:

> “Rocket 3. Base 1. Meteor 2. Daddy is wrong — use this.”  
> *[attaches image]*  

→ `mission_approve_proof` ×3 + `mission_reject_proof` with reference → Director opens replacement art requirement.

---

## 8. Notifications (authorship, not ops)

**v0 (this branch):** no APNs required.

- Mission `notifications[]` queue + Studio badge / ChatGPT proactive message if available  
- Cursor handoff line already required by art-queue rule — Director writes the one-liner  
- Optional: Mac `osascript` / local push for “playable build ready” during evening sessions  

**v1:** iPhone parent app or Shortcuts webhook for the six interrupt types only.

Copy pattern:

```text
Moon Base — 8 art proofs ready
Moon Base — needs one gameplay decision (landing miss)
Moon Base — playable on living-room iPad
```

---

## 9. Moon Base vertical slice — force the architecture

### 9.1 Story beats → inferred requirements (Director pack inference)

From intent alone, Director proposes (Evan can trim):

| Beat | Likely requirements |
|---|---|
| Pink rocket on Home path | art rocket exterior/idle; world place; eng route `moonLaunch` or reuse travel+cover |
| Launch sequence | art inserts / cockpit; eng short sequence or VoyageOpening-like gate |
| Fly to Moon | art approach plates; eng transition |
| Land on pad | **eng `moonGuidance`** (new); art pad+cockpit HUD; decision on miss behavior |
| Meet Daddy | art Daddy arrival/reunion; world Moon Base exterior/interior |
| Garden | art garden; world POI; light interaction (decorate-like or waypoint) |
| Meteor adventure | art meteor/site/radar/panel/quadbike; eng or reuse Waypoint buggy; unlock chain |

**Reuse ruthlessly:**

- WaypointNavigationGame for post-landing lunar path / buggy  
- Fair-marble / picture-puzzle patterns for “open trinket → puzzle → unlock world” if needed as gateway  
- VoyageOpening web-comic pattern for short launch cutscene  
- Existing steel-rail multi-scene Moon world (`world.moonBase`) rather than stuffing everything into Home  

### 9.2 Explicit Evan authorizations needed once

1. New `World2POIRoute` cases (e.g. `moonLaunch`, `moonGuidance`, `moonBase`) — steel rail cannot invent these.  
2. Art budget ceiling for the Mission.  
3. Whether Moon is a **new world** in World Switcher vs a travel scene from Home.  
4. Daddy representation rules (likeness, age — he already rejects “Daddy looks twenty-five”).  

After that, Director should not ask him to dispatch assets.

### 9.3 Acceptance journey (completion)

Mission `playable` only after Evan attests:

1. Unlock iPad → Abby’s Home.  
2. See pink rocket.  
3. Launch → flight → land (retry + bypass demonstrated).  
4. Meet Daddy / garden visible.  
5. Meteor beat reachable.  

Optional: Abby present. Optional: iPhone smoke if targeted.

**Measure architecture success:** count of **Evan bus actions** per week (URL copies, “tell Cursor what AD did”, manual stills reminders, bind prompts, token paste, thrust coordination). Goal: each Moon Base iteration deletes classes of those actions.

---

## 10. Implementation phases (branch plan)

### Phase 0 — Constitution already done

- [`UNIFIED.md`](./UNIFIED.md) committed as north star.  
- This document is the operational plan.

### Phase 1 — Mission spine (3–5 days of burst work)

**Ship:**

- Server: `missions` store on studio-mock (SQLite/JSON alongside worlds).  
- Schema + `mission_*` MCP tools (create/get/describe/patch/answer/approve/advance dryRun).  
- `mission_create` from narrative: LLM or template → plan beats + **proposed** requirements (no auto-spend).  
- Link fields on art-request schema: `missionId`, `requirementId`.  
- `mission_describe` one-screen status for ChatGPT/Cursor.  

**Done when:** Evan says “Let’s make Abby and Daddy’s Moon Base mission” in ChatGPT → durable Mission exists after chat ends → `mission_describe` works next day from Cursor.

**Does not yet:** auto art, auto eng, playable.

### Phase 2 — Art loop without Evan as dispatcher

**Ship:**

- Director cycle: for open `art` requirements → `asset_job_create` and/or file art-requests → proofs attached.  
- Approval via `mission_approve_proof` (ChatGPT) + simple `/missions/:id` gallery.  
- On approve → move art-request fulfilled source path; open `chore(art-integration)` automatically with semantic ID.  
- Budget gate.  

**Done when:** overnight, Mission accumulates proofs; morning, Evan approves by index from phone/ChatGPT; builder chores appear without him zipping packs.

### Phase 3 — World + engineering requirements

**Ship:**

- World requirements → `author_beat` dryRun inside `mission_advance`; confirm still human (or Mission-stored prior confirm).  
- Engineering requirements → GitHub Issue + Cursor handoff block generated from `mustBecomeTrue`.  
- Cursor reports back via `mission_patch` evidence (MCP or script `missions/report_evidence.py`).  
- New routes for Moon Base authorized explicitly; implement `moonGuidance` to STANDALONE_MINIGAME_PATTERN.  

**Done when:** rocket can be placed in live world after art bind; lander exists behind a debug or POI route with tests + screenshot evidence linked on Mission.

### Phase 4 — Verification & “ready for iPad”

**Ship:**

- Acceptance checklist UI/tool.  
- Install/delivery script tagged to Mission (`./scripts/mission_deliver.sh mission.moonBase…`).  
- Capture pack auto-attached as verification evidence (voyage capture habit generalized).  
- `mission_attest_playable`.  
- Sparse “playable” notification.  

**Done when:** Director says playable candidate → Evan walks checklist → Mission `playable` — without him asking three chats “is it on the iPad?”

### Phase 5 — Observe loop (after first real play)

**Ship:**

- Soft signals: visits, retries, bypass, dwell time in garden/quadbike.  
- `mission_describe` post-play summary.  
- Chat: “What did Abby like?” → answer from signals + optional Evan note → spawn **child Mission** or requirements (“enlarge quadbike area”).  

**Done when:** one expansion cycle happens from play evidence without Evan reconstructing the session from memory.

---

## 11. Repo layout (proposed)

```text
docs/architecture/UNIFIED.md          # constitution
docs/architecture/MISSION_OS.md       # this plan
missions/schema.json                  # AbbieMission schema (git mirror)
missions/README.md                    # human habit
art-requests/schema.json              # + missionId, requirementId
prototypes/studio-mock/api/
  lib/missions.js                     # store + advance
  lib/mission-director.js             # one-cycle state machine
  mcp.js                              # mission_* tools
scripts/
  mission_deliver.sh
  mission_report_evidence.py
  rebuild_mission_index.py            # optional
.cursor/rules/mission-os.mdc          # builders: never mark playable; report evidence
```

Git mirror of Missions is **optional convenience** for PR review; **server remains SoT** so ChatGPT Voice and Cursor share state when laptop is closed.

---

## 12. What we deliberately do *not* build in this branch

- General AGI multi-agent swarm / recursive planners.  
- Full iPhone parent product.  
- Replacing Studio wholesale.  
- Replacing art-requests or semantic registry.  
- Auto-commit / auto-App-Store.  
- Dialogue/quest scripting engine inside POIs (steel rail stays).  
- Perfect Abby telemetry privacy-invasive analytics — only coarse play signals with household consent assumptions.  
- Three-month platform rewrite before one Moon Base walkthrough.

---

## 13. Risk register

| Risk | Mitigation |
|---|---|
| Mission becomes another inbox Evan manages | Only six interrupt types; Director batches proofs |
| Workers mark things done falsely | Evidence required; playable human-only |
| Home clobbered during Moon authorship | Mission constraints + scene allowlists (TED pattern) |
| Art credit burn | Budgets + no builder MJ |
| Cursor MCP auth friction | Prefer ChatGPT Mission create; Cursor consumes Mission id |
| Scope explosion (meteor/radar/quadbike) | Phase playable at **land + Daddy + garden**; meteor as Mission phase 2 requirements |
| Schema over-design | Start with Moon Base instance; generalize fields only when second Mission needs them |

---

## 14. Success metrics (honest)

1. **Bus-action count** during Moon Base — weekly, should fall.  
2. **Time from intent → first proof gallery** — target overnight without Evan.  
3. **Time from “playable candidate” → attested playable** — should be one evening device session.  
4. **Cross-surface continuity** — create in ChatGPT, approve on Studio/Voice, eng in Cursor, play on iPad, same `missionId`.  
5. **Chat death resilience** — kill the chat; Mission still describes correctly tomorrow.

---

## 15. First concrete build ticket (when you say go)

1. Add `AbbieMission` schema + in-memory/SQLite store on studio-mock.  
2. MCP: `mission_create`, `mission_get`, `mission_describe`, `mission_advance` (dryRun only).  
3. Seed Mission `mission.moonBase.abbyDaddy.v1` from UNIFIED narrative with inferred requirements **unstarted**.  
4. Demo: ChatGPT creates/describes; Cursor reads same Mission; no world mutation yet.  
5. Next burst: wire art requirement → asset_job + proof approve path for **one** rocket plate only.

That is the smallest wedge that proves: **intent survives the interface.**

---

## 16. Closing architectural picture

```text
Evan / Abby
    │  talk / play / approve
    ▼
┌──────────────────────────────────────┐
│           ABBIE’S WORLD              │
│  World state  ·  Missions  ·  Dir    │
└──────────────────────────────────────┘
    │ mission_advance (bounded)
    ▼
 Capabilities: World │ Art │ Eng │ Build │ Deliver │ Notify
    │                    │
    ▼                    ▼
 Live iPad ◄──── semantic IDs / revisions / evidence
```

Abbie’s World is not the iOS app.  
The Mission is how imagination becomes responsibility.  
Completion is Abby’s hands on the rocket.

**The user should never again be the integration layer.**

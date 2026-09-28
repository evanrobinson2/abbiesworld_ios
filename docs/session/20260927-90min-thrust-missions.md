# Abbie’s World — 90‑minute session missions (2026-09-27)

**Clock:** ~90 minutes · **Branch:** `review/marble-voyage-plink` @ `1e41482` (origin synced)  
**Evan:** playtests Marble Voyage on iPad and dictates feedback into the Playtest Dump chat.  
**Rule:** do not wipe players (`world_create` needs explicit `confirmReplace`). No inventing POI behaviors outside an explicit new `World2POIRoute` Evan authorized in Thrust 1.

---

## Orchestration

| Callsign | Thrust | Chat / agent |
| --- | --- | --- |
| **Abbie's demo** | 1 — Home World → Marble Voyage unlock loop | This chat (primary) |
| **TED talk** | 2 — NL → live world creation | Parallel agent |
| **Asset maker arbitrage** | 3 — Asset Generation Service | Parallel agent |
| **Playtest dump** | Voyage feedback sink + merge triage | Same chat as Abbie's demo, interrupt-first |

Cross-talk: post blockers and “ready for iPad” in one line. Do not steal files from another thrust without saying so. Playtest dump owns Voyage bug triage; the three program agents do not stop their mission to chase Voyage unless dump hands them a scoped task.

Handoff prefixes: `Abbie's demo:` · `TED talk:` · `Asset maker:` · `Dump:`

---

## Abbie's demo — Thrust 1: Home World → Marble Voyage unlock loop

### Mission
Reset the live Home World so it *is* Abby’s World again. Treehouse (with bedroom / music box) is a real POI graph. Ship a **reusable** picture-puzzle POI mechanic (simple tile/slider first). Solving it unlocks Marble Voyage. Tapping Abby opens a **World Switcher** listing the current world plus unlocked worlds so Voyage stays permanently accessible after unlock.

### Surfaces
- Studio MCP / household world doc (scenes, places, vars, lint)
- iOS: `World2POIRoute`, host routing, new puzzle screen, world switcher UI, unlock persistence (session/player/world vars or local unlock store — prefer server vars if viable)
- Art via semantic IDs / art-request queue — not one-off CDN SoT

### Explicitly authorized new routes (this session)
- Puzzle POI behavior (e.g. `picturePuzzle` / slider tile) — reusable, not Voyage-only hardcode
- World Switcher surface (Abby tap) — not a random new map screen

### Done when
1. Home / active scene reads as Abby’s World (treehouse POI + bedroom/music-box interior path).
2. Puzzle POI opens on device; completing it sets an unlock that opens Marble Voyage (`plink`).
3. After unlock, Abby → World Switcher shows at least Home + Marble Voyage; Voyage remains reachable without re-solving.
4. `world_lint` clean enough for play; brief handoff note for Evan.

### Out of scope
- Full jigsaw with arbitrary piece counts
- Picture-puzzle POI mechanic (unlock API is `unlockMarbleVoyage`; wire puzzle next)
- Marble Voyage balance/physics (playtest dump owns)

### First moves
1. Fix Studio MCP auth if tools are down (`mcp_auth` / token).
2. `read_primer` → `world_describe` → plan dry edits.
3. Scaffold `World2POIRoute` + puzzle UI + unlock var.
4. Wire world content; install; verify on iPad.

### Handoff line (template)
> Abbie's demo: puzzle unlock [works/blocked]; switcher [works/blocked]; world reset [done/partial]. Blocker: …

---

## TED talk — Thrust 2: Natural-language → live world creation

### Mission
Push world-authoring toward **NL-only** creation: Evan (or agent) says what they want → art generated (remote Midjourney worker) → art/POIs/scenes injected into the **running** game. Stretch: path to entirely new worlds, not only patches of `/current`.

### Surfaces
- Studio MCP (`author_beat` if available; else steel-rail ops: `scene_upsert`, `place_upsert`, `scene_connect`, `vars_apply`, asset job tools)
- Remote Midjourney worker (newly available — find and use the real interface; do not invent a parallel drop folder as SoT)
- Docs: `STEEL_RAIL_AUTHORSHIP.md`, `ASSET_GENERATION_SERVICE.md`, Game Asset registry convention
- Staging https URLs are temporary; durable content = semantic IDs + `asset_bind` / registry

### Done when
1. One end-to-end demo: a single NL request produces (or queues) art and lands a visible scene/POI change on the iPad without hand-edited world JSON.
2. Written gap list: what’s missing for NL-only (tools, worker hooks, confirmations, multi-world).
3. If multi-world create is still stubbed, document the honest limit and the smallest next API/MCP wedge.

### Out of scope
- Rewriting the iPad renderer
- Thrust 1 puzzle/unlock UX (coordinate if you need a sandbox scene — don’t clobber Home mid–Abbie's demo)
- Full autonomous library carve (Asset maker)

### First moves
1. Confirm MCP tool surface (auth, whether `author_beat` / `asset_job_*` exist vs docs).
2. Locate remote MJ worker entrypoint; run one controlled generate → complete → bind.
3. Script or agent skill: NL utterance → closed ops list → dry-run → apply → `world_lint`.
4. Demo on device; file gaps.

### Handoff line (template)
> TED talk: NL→live [demo URL/sceneId / blocked]. MJ worker [ok/fail]. Gaps: …

### Coordination with Abbie's demo
Do **not** `confirmReplace` Home while Abbie's demo is resetting Abby’s World. Prefer a side scene or wait for their “world stable” ping.

---

## Asset maker arbitrage — Thrust 3: Asset Generation Service

### Mission
Exercise the existing Asset Generation Service and its MCP/HTTP interface end-to-end (this has not been seen successfully operating). Find what’s broken or missing. Push toward: request asset library → prompt/permutation → image generation → carving/tagging → usable game assets.

### Surfaces
- `docs/current-state/ASSET_GENERATION_SERVICE.md` (contract)
- Studio `/api/asset-jobs` lifecycle: queued → prompting → awaiting_image → ingesting → registered → bound
- MCP asset tools if present; Game Asset API registry (admin key only on server/scripts — never iOS)
- Related: Media Drop / Zeus callers if that’s how jobs enter

### Done when
1. A factual E2E report: which steps succeeded, which failed, with exact error/status.
2. Minimal repro of the first hard break (auth, prompting, awaiting_image, ingest, bind).
3. If the pipe works: one small library request that ends in a **registered** semantic asset usable by a scene/POI (or clear “stopped at awaiting_image because MJ paste” with worker path called out for TED talk).
4. Interface/workflow fix list prioritized (P0 blocks E2E, P1 UX, P2 autonomy).

### Out of scope
- Shipping Voyage portraits / henchmen art (art-request queue remains; don’t derail into MJ credit burn without need)
- Redesigning the whole registry
- Clobbering Abbie's demo Home plates unless binding a clearly named test semantic ID

### First moves
1. Read the contract doc; find running deploy + auth path.
2. `POST` create job → poll states → attempt complete/ingest → confirm registry row.
3. Trace UI/MCP that operators actually use; note dead buttons / missing tools vs docs.
4. Write the report into `docs/session/` or evidence JSON; one-line handoff.

### Handoff line (template)
> Asset maker: E2E [pass through state X / fail at Y]. P0: … Next autonomy wedge: …

### Coordination with TED talk
Asset maker owns **service truth**; TED talk owns **NL author path that calls it**. Share job IDs and failure modes; don’t duplicate fix attempts on the same bug without a ping.

---

## Playtest dump — Marble Voyage (same agent as Abbie's demo)

### Mission
Be the interrupt-first channel while Abbie's demo / TED talk / Asset maker cook. Evan playtests on iPad and dictates feedback; dump captures, triages, and either (a) fixes small Voyage bugs immediately, (b) queues scoped tasks, or (c) parks items with repro notes.

### Surfaces
- Live iPad Voyage / Plink
- `review/marble-voyage-plink` voyage code only when a fix is clearly Voyage-scoped
- Known open notes: armadillo ball disappearance; portrait/tile gates already formalized — don’t relitigate unless new evidence

### Operating rules
1. **Interrupt-first:** when Evan speaks, stop other Dump work and acknowledge the note in one line.
2. Log feedback as: symptom → scene/foe/build → severity → action (`fix-now` / `queue` / `need-repro`).
3. Do not block Abbie's demo / TED talk / Asset maker. If a fix needs shared world/MCP, hand a one-liner to the right callsign.
4. No drive-by refactors. Capture stills only if Evan asks or dump needs PNGs to judge layout.
5. End of session: short Voyage feedback digest (top 5).

### Done when
- Feedback from the session is captured (not lost in chat scroll).
- Critical play-blockers either fixed or explicitly parked with repro.
- The three program agents still have a clear owner for any cross-cutting ask.

### Handoff line (template)
> Dump: N notes · P0: … · fixed: … · parked: …

---

## Session close checklist (any callsign)

- [ ] One-line status from Abbie's demo / TED talk / Asset maker / Dump
- [ ] No uncommitted secrets; commit only if Evan asks
- [ ] Art queue: call out open/fulfilled that affect the demo
- [ ] Stage stills reminder only if a major Voyage build shipped: `./scripts/build_marble_voyage.sh --capture`

# Codex handoff: Abbie's World open work

Written 2026-10-24 ~17:30Z (1:30 PM local, UTC-4) by the Claude coordinator thread "Hand off open work to Codex".
Claude credits are running out. Codex (and ChatGPT) take over everything below. Evan, 17:12Z: "Yes you can use all meshy
credits ... package open work neatly and dispatch a giant hand off to codex."

No secrets are in this file. Never put any in the repo, a preview, a PR or chat. API keys live in GitHub Actions secrets or
Vercel env and are used by workflows (for example `MESHY_API_KEY` by `.github/workflows/meshy-run.yml`).

**How to read this.** Section 1 is the rules, section 2 is how things ship, section 3 is the open-work table, section 4 is
the detail per item, section 5 is what only Evan can decide. State is as of each owner thread's last message; the threads
were asked to push their work first, so trust `git log` over this file. Stage words are Evan's: **drafted**, **preview**,
**live**. Verify live before saying live.

Readable copy with the same content: `preview/codex-handoff/index.html`
(https://app.abbies.world/r2/previews/codex-handoff/index.html once synced).

Companion handoffs (read them too):
- `docs/handoff/DEPLOY_HANDOFF.md` how production deploys work (exact call, checks, pitfalls).
- `tools/meshy-heroes/HANDOFF.md` on branch `claude/project-thread-4a30bd` (Meshy pipeline and queue; merge it to main).
- `docs/handoff/CHATGPT_HANDOFF.md` earlier navigation handoff for ChatGPT.
- `/mnt/project-files/asset-sources/*.html` and `tools/stl-pilot/` free-asset sources.

---

## 1. Standing rules (Evan's, non-negotiable)

Read `CLAUDE.md`, `INVARIANTS.md`, `VISION.md`, `docs/MODELER_VISION.md`, `docs/design/LIVING_TOY_WORLD.md`, `docs/MODELER_STATUS.md`,
`docs/architecture/` before building. In short:

**Invariant contracts (`INVARIANTS.md`, enforced by the `invariants` workflow; a PR that breaks one does not merge)**
1. No minigame or feature is live (reachable from abbies.world) without a real scene in the world and a passing headless-Chrome
   run that plays it end to end. Otherwise it is experimental: opens only with `?exp=<id>` (or `?exp=all`) or developer mode.
   Register it in `prototypes/ranch-atelier/dist/simulations/game-registry.json` (`status`, `scene`, `test`, `tour`, and `needs`
   for experimental). Static check: `node tools/game-registry/check.mjs`. Run: `node tools/game-registry/run-tests.mjs`.
   Switch: `simulations/experimental.mjs` (`live(id)`, `liveGate(gate)`).
2. The town HUD starts from `simulations/town-hud-boot.mjs` by its own `<script type="module" src>` tag, exactly once, never
   inline. Merges have dropped that tag twice. After any merge: `grep -c town-hud-boot studies/abbietown/index.html` (expect 2
   in the deployed page). `studies/abbietown/index.html` is generated from `docs/oracle/abbietown/abbietown.template.html`
   via `build_page.py`; it has drifted from the template, so diff before rebuilding.
3. **No MIDI.** Sounds only from the catalogue (`prototypes/ranch-atelier/dist/sounds/manifest.json`, effects via
   `simulations/catalog-sfx.mjs` `sfx('id')`); music only from the music catalogue or composed tracks. No oscillator or
   noise-buffer synths. `tools/audio-check/check.mjs` enforces it; `tools/audio-check/baseline.json` is empty and may only shrink.
4. **Voices are ElevenLabs designed voices only, never cloned.** No `speechSynthesis`, no other TTS. Scripted lines are
   pre-rendered to R2 with the `voice-cast` workflow (`tools/voice-cast/cast.json`); unscripted lines stream through
   `api/live-voice.js` after `wallet().charge`. Kid voices are adult actors.

**Other standing rules**
- **Never say "done".** Say drafted / preview / live. "Done" that turns out to be a wireframe, mockup or question infuriates
  Evan. "Production" means playable inside the real game from the Winchester town, not a studies page.
- **Rewards are backpack charms and items only. No gold coins.** (Floppy disk = basement word game, star = school roof,
  moon cheese rules, etc.) Abbie wears the backpack and jingling charms in FPS and minigames.
- **Missions start at their medallion** (medallions are the only mission entry points).
- **PG content only.** No NSFW or "unbounded" variants (declined; figures stay smooth mannequins in a fitted base layer).
  Kids' faces are never redrawn; kids' photos are private. No real house numbers or addresses of family or Ani anywhere.
- **No secrets** in chat, repo, previews or artifacts. Plain readable scripts only, never hidden or encrypted ones.
- **All work stays in `evanrobinson2/abbiesworld_ios`.** No other repos, no local-only copies. Branch from `main`, PR into `main`
  (auto-merge your own PRs). `claude/live-snapshot-2026-10-22` is an archive: never use it.
- **Tour rule.** Every new feature gets `"tour": true|false` on its `prototypes/ranch-atelier/dist/whats-new.json` entry and a
  line "tour: yes/no" in the PR.
- **Information grammar** (`docs/oracle/hud/HUD_STUDY.md`, `GAME_FEEL.md`): ask "how would a character know this?"; diegetic /
  spatial / meta / overlay (+ none); world layer vs presentation layer never mix; the play HUD covers at most 8% of the screen
  with zero words; no engine artifacts (axes, grids, gizmos, raw ids); nothing masks the world. Four ways of acting: tiles
  create the world, cards act as a god, HUD/overlay is the simulation and the app, FPS is playing as Evan/Abbie/Ani. Load the
  `abbies-world-designer` skill in `.claude/skills/` for player-facing work. CI `game-feel` and `tools/hud-rubric/check_hud.py`.
- **UI layout canon:** LEFT = liquid-glass bar of things the character touches (3D backpack, notebook, buggy). TOP = one row of
  sim/HUD and world-effect 3D icons plus paint balloons. BOTTOM = real 3D hex tile cards. No map widget, counters, sliders.
  Customising is FPS-loadout slots on the 3D model, not card walls. Keep liquid glass as objects with depth, rich colours, live previews.
- **Modeling:** show every model made from an image in an interactive 3D viewer beside the inspiration image. Keep intent and
  history in the asset folder (brief, prompts, `provenance.json`, `build.py`, `notes.json`). Low-poly parts, real materials
  (hero-level for iso and first person). Midjourney for concept art when Evan's Mac is online, else record what you used.
  Licences: CC0 / CC-BY usable (credit CC-BY); BY-SA / NC / personal-use not usable; brands are inspired-by only.
- **Speed review:** after every minigame made from a story, add "How it was made, and how to be faster next time" to its study doc.
- **Context card:** every study lists its sources in `studies/context.json` (`tools/context-card/README.md`).
- **Talking to Evan:** one plain line, outcome plus at most one tap. Never show him GitHub or PR links, PR numbers, branch names
  or check status. Shipping format: "Shipping it; I'll post the link here when it's live." then, once verified live,
  "<local time> - Here's the link: https://<page he will actually use>". Local time = UTC-4. Don't ask what you can answer.
  Do exactly what is asked, nothing unasked on his machines. No apologies. He is fed up with "do X on your machine": use a
  Remote Control session on his PC, or give full direct links.
- **Launch/money:** NO Kickstarter. Payments OFF until the launch gate; Stripe TEST keys only. No marketing spend without his go.
  AI caps: $1 per person, $100 public, $1,000 for evanr2@gmail.com (`wallet().charge` before any paid call).
- **Studies** are named "AW-STUDY-NNNN - Title" with the same ID on doc and page. Highest used so far: 0063. Next free: 0064
  (check `docs/oracle/` and the studies list; numbers have collided before).

## 2. How things ship

- **Instant preview (no deploy):** put a static page in `preview/<name>/index.html` (relative paths) on any branch and push.
  The `instant-preview` Action syncs to R2 in about a minute: `https://app.abbies.world/r2/previews/<name>/index.html`.
  Never give Evan a bare file attachment as the only preview.
- **Production (Ranch Atelier, abbies.world / app.abbies.world / ranch.abbies.world):** Vercel project `abbies-ranch-atelier` is
  not Git-linked. Merging to main deploys nothing. Production deploys of `main` go out in one batch every 10 minutes (immediately
  on "ship it now"). Exact call, pre/post checks and pitfalls: `docs/handoff/DEPLOY_HANDOFF.md`. Last live: main `fab70d98`,
  17:13Z, nothing pending at handoff time. Hourly sweep trigger `trig_01Np5bYaXkvW4jufbtGkgJYk`. Codex must take the deployer role
  (it needs the Vercel MCP `create_deployment`) or ask Evan to name who does.
- **Meshy (3D generation):** only through `.github/workflows/meshy-run.yml` and `tools/meshy-heroes/meshy_run.py` (the cloud
  container cannot reach api.meshy.ai). Evan approved using ALL remaining credits; the runner's cap is now 1,000,000 so Meshy's
  live balance is the limit (the Action prints it at the start of every run). Ledger: `tools/meshy-heroes/meshy/credits.json`
  (2,394 spent through 2026-10-24). Untextured 20 credits, textured 30, remesh+rig +10, animation 3. Never ask Evan for the key.
- **Dispatch bridge:** ChatGPT issues on GitHub. `chatgpt-issue-intake` handles ordinary issues (branch `claude/issue-<n>`, PR to
  main, merge, comment, close). Bridge dispatches (`abbies-dispatch:v1`, label `dispatch`) go through `dispatch-relay`. Ledger:
  https://app.abbies.world/r2/previews/dispatch-ledger/index.html. See `docs/dispatch/README.md`, `ISSUE_INTAKE.md`.
- **Cloud limits:** cloud sessions cannot reach `*.vercel.app` (use Vercel MCP `web_fetch_vercel_url` on custom domains), Printables,
  or api.meshy.ai. Real-device screenshots and Printables downloads need a Remote Control session on Evan's Windows PC
  ("Evan"; folders `C:\Users\Evan Robinson\Claude\Abbie's World` etc.). MacBook Air runs Midjourney when online.
- **Messaging:** one agent could post only 60 messages/hour across threads; batch updates.

## 3. Open work at a glance

| # | Item | Owner thread (Claude) | Stage | Branch / key files | Blocked on Evan |
|---|------|------|-------|--------------------|-----------------|
| 1 | Meshy heroes, charms, animations, ledger | Meshy hero characters (0043) | astronauts + 83 anims live in town; car charm running | `claude/project-thread-4a30bd`, `tools/meshy-heroes/` | nothing |
| 2 | Toy-car coaster round 4 (toy box, rail game, scoreboard) | Toy-car coaster ride (0054) | drafted, branch pushed, no PR | `claude/project-thread-kidtb0` c9fd70b4 | leaderboard: family board vs online |
| 3 | Gate: invariants, game registry, 7 experimental games | Gate minigames (INVARIANTS) | Moon Mission + mission charms live | `tools/game-registry/`, `game-registry.json` | nothing |
| 4 | **CI red on main:** `invariants/static` fails for every PR | Gate + Hex city | open bug | town mounts carwash and halloween without `live()` gate | nothing |
| 5 | Backpack redesign + wardrobe study (#537) | Backpack inventory (0046) | previews only, nothing built | `claude/project-thread-fxnzqg`, PR #627 | picks A to D and the look |
| 6 | Townsfolk quests + "help Abbie" | Add random quests | merged to main | `simulations/quests.mjs`, `abbietown/quest-*.mjs` | listen to 8 voices; approve backpack redesign |
| 7 | Paint the world (0049) | Paint the world card | merged, live not confirmed | `simulations/paint-world/`, branch `claude/project-thread-51139f` | nothing |
| 8 | Farm and riding school tiles | Farm and riding school tiles | merged `0bec1db7`, live not confirmed | `preview/farm-tile`, `riding-school` | nothing |
| 9 | Abbie's video experiments (#608) | Build experiments from videos | 4 of 12 drafted as previews | `docs/design/VIDEO_EXPERIMENTS.md`, `preview/video-experiments/` | the videos were never opened |
| 10 | Dispatch backlog | Catch up on every missed dispatch item | intake fixed; items open | ledger page | #621/#622 decisions |
| 11 | Research lab (0063) | Design the in-game research lab | drafted preview, PR open | `preview/research-lab/` | where the door goes |
| 12 | Scene Builder Lab (0062) | Design the scene builder lab | experimental, merged `78c75a56` | `studies/scene-builder/?exp=scene-builder` | "go" for in-world door and real models |
| 13 | Use best library model everywhere | Use the best library model | barely started | `claude/project-thread-goqu14` (= main) | RC approval for screenshots |
| 14 | Swappable hero / who is playing | Character Studio (0037) | design only | `preview/swappable-hero/` | five choices |
| 15 | Charms: map, jewellery box, carwash sponge charm | Charms (0053) | proposal | `simulations/backpack.mjs` | approve sponge charm |
| 16 | Carwash (0060) | Earn the buggy at the carwash | buggy drafted; 4-minute minigame unbuilt | `preview/carwash-study` | song licence, pick |
| 17 | Free assets + reauthor weak models | Free high-end asset sources | merged, to confirm live | `tools/stl-pilot/`, `asset-sources/` | Printables downloads need his Chrome |
| 18 | Halloween mode | Add Halloween mode | merged, off (`?exp=halloween`) | registry swap pending | his "go" |
| 19 | Winchester / hex city | Founding City on Hexes (0033) | live town; second-landmass fix merged | `docs/oracle/abbietown/` | nothing |
| 20 | Town HUD / design lead | Design lead | top bar live; bottom hand still a flat pill | `simulations/town-hud-boot.mjs` | real-device screenshot |
| 21 | Performance (WASD, frame rate) | WebAssembly performance | WASD merged | `docs/oracle/performance` | RC on his PC to measure |
| 22 | Spaceships (0035) | Aurora Mk 2 spaceship | 8 Meshy ships made | `studies/spaceships/models.html` | his pick |
| 23 | Papercraft (0017), Turnaround hero (0023), MCP reconnect | blocked on his Mac | offline sessions | `tools/paper-*`, `/mnt/project-files/papercraft` | Mac online |
| 24 | Biome suit HUD (0044), Texture Studio (0040), Moon base FPS (0031) | various | drafted / live rounds | studies | verify merge/live |
| 25 | 2,000-model plan, Winchester inventory, diorama builder | planning threads | drafted | `preview/asset-plan-2000`, `winchester-inventory`, `diorama-swipe` | "go" for batch 1 |
| 26 | Sanctuary (0055) | Write game ingest handoff | drafted | `preview/sanctuary` | four legal/outreach calls |
| 27 | Launch: sign-in, payments, marketing | Front door; Launch marketing | payments off | `docs/architecture/` | launch gate, spend |

## 4. Detail per item

### 1. Meshy heroes, charms, animations, ledger (owner of all Meshy spend)
Full detail in `tools/meshy-heroes/HANDOFF.md` (branch `claude/project-thread-4a30bd`; merge main into it first, then merge it to main).
Live: 24 astronauts (6 people x clay/paint x suit/tee) in `studies/moon-mission/heroes/`, Character Studio heroes cs-1/2/4,
83 animations (`studies/moon-mission/heroes/anims/`, loader `simulations/hero-anims.mjs` `heroClip(name, hero)`, always use it),
town heroes `simulations/abbietown/heroes.mjs`, charms in `simulations/assets/backpack/charms/`.
Next, in order (use all credits on these):
1. Toy-car charm (issue #534): job `charm-toy-car` (textured, 30 credits) dispatched 17:15Z. Then
   `python3 tools/meshy-heroes/charm_cleanup.py charm-toy-car`, wire in `simulations/backpack.mjs` (`CHARM_GLB`, `CHARM_SHADE`),
   credit 3dworkbench (CC BY 4.0), check in game, comment on and close #534. (Backpack and Charms threads own that file.)
2. Side-by-side 3D viewer pages (model next to its inspiration picture) for astronauts, cs heroes, charms. Refs in
   `tools/meshy-heroes/refs/<id>/pick.png`.
3. cs-3 stick man: rig failed (422 pose estimation). Rerun from an A-pose image or rig in Blender.
4. 40 PG base bodies (`docs/oracle/moonheroes/BASE_ROSTER.md`, `roster.json`) and story heroes (Star Child, gem bug). Need reference
   pictures (Midjourney on the Mac, or another source; record which).
5. Abbie wears her backpack on the town hero: `wearBackpack(chestBone,{height:.42,offset:[0,0,-.16]})` from
   `simulations/backpack-wear.mjs`, `pack.update(dt)` per frame.
6. Reusable painterly shader owed to Character Studio (keep the comic cel-ink outline) in `simulations/`.
7. More animations: only 83 of 678 library actions cut; PG only (no weapons, shooting, dying, illness).
8. Spare-credit ideas: cleanup of the 8 spaceships (item 22), missing Winchester inventory models (item 25), the three family
   members with no 3D model (Mommy, Lexi, Jeff, Georgia, Pearl, young Daddy; item 14). Ask Evan in one line only for a very large single spend.
Cleanup uses `pip download bpy` then install the wheel (a direct install times out); renders need `libegl1`.
Gotchas: don't put an empty `environment:` in the workflow (runs end action_required); recover a paid task with `recover_task`.

### 2. Toy-car coaster round 4 (AW-STUDY-0054)
Evan (16:58Z) asked for a toy box to pick cars from, and for the coaster to become a rail game with points, charm prizes and a
leaderboard. Drafted on `claude/project-thread-kidtb0` (c9fd70b4), pushed, no PR yet. Files under `prototypes/ranch-atelier/dist/`:
`studies/coaster/play.html`, `simulations/toy-box.mjs`, `simulations/rail-score.mjs`, `simulations/backpack.mjs` (new Golden
Wheel charm, bonus, does not count toward the heart), `tools/minigame-test/coaster-flow.cjs`. Scores: stars 100 x combo, dodging
the tennis ball 300, centred boost 50, straight landing 200; medals at 1,500 / 3,500 / 5,500; gold wins the Golden Wheel.
Fixed a live bug ("ride again" threw). Next: move toy box and scoreboard so a tree doesn't block the camera and the fan stays
inside the park fence; frame the chosen car on the start line; rerun the flow test until it passes; preview screenshots; PR, merge,
send sha to deploys. Blocked on Evan: family board on this device (recommended, built) or online board. Earlier rounds are live
(round 3: fire wheels card from the toy-car charm, garage with Printables cars).

### 3 and 4. Gate / invariants, and the red CI check
The Gate thread built `INVARIANTS.md`, the `invariants` workflow, `game-registry.json`, `tools/game-registry/` and the audio check.
Moon Mission and the mission charms went live 2026-10-24 (bot-family end-to-end run, `tools/game-registry/moon-mission-flow.cjs`).
Seven games are experimental; `needs` in the registry says what each lacks. `scene.stage: "town"` covers town-mounted features
(intro, paint balls, world effects, quests, backpack), whose one run is `tools/game-registry/town-features.cjs`.
**Known bug:** `invariants/static` is red on main for every PR because the town page mounts carwash and halloween without a
`live()` gate. Fix by gating those mounts through `simulations/experimental.mjs` (only the hex-city owner edits Winchester; Codex
is now that owner). Until fixed, PRs cannot get green CI.

### 5. Backpack redesign and wardrobe study (#537, AW-STUDY-0046)
Bag only carries; all dressing at one mirror dressing room (her look, backpack, buggy, who's playing); taking something out shows a
close-up model; charms unlock powers. Drafted as previews only (nothing in the game):
https://app.abbies.world/r2/previews/backpack-briefs/index.html, `.../backpack-redesign/`, `.../wardrobe-study/`. Branch
`claude/project-thread-fxnzqg` (d9bb5f1b); PR #627 holds previews only and is blocked by the red check in item 4. Files:
`preview/backpack-redesign/`, `preview/wardrobe-study/`, `dist/simulations/item-models.mjs` (new, unimported), `loadout.mjs`
(42px touch swatches), `context.json` entry `wardrobe-study`. After Evan picks: mirror bead on the left bar with three stations and
a who's-playing row; delete old card and facet paths; fix the triple `inventory.mjs` import; export `closeUp(item,{actions})` from
`backpack.mjs` for Quests; put her figure on the town board; scene + test run; merge; sha to deploys.
Blocked on Evan: A to D (dressing room vs dress button, pockets automatic vs chosen, charm powers yes/no, all charms vs two hanging)
and the look (liquid glass recommended, forest wood, storybook paper).

### 6. Quests and "help Abbie find what to do"
Merged to main: engine `dbd80065`, lab-step fix `0e6fb98b`, spotlight/help `5ce11570`, voices `39a02bee` (live in fab70d98 batch).
Files: `simulations/quests.mjs`, `simulations/abbietown/quest-guide.mjs`, `quest-help.mjs`, `townsfolk.mjs`, voices in
`tools/voice-cast/` (`quest-lines.mjs`, `lines/quests.json`, `cast.json`) and `studies/family-cast/lines-quests.json`; tests
`simulations/tests/quests.test.mjs`, `quest-guide.test.mjs`, `tools/minigame-test/quest-guide-flow.cjs` (static server on :8765
from `dist`). Next: wire the backpack `closeUp` once the redesign is approved; four of eight giver figures use stand-in models.
Blocked on Evan: listen to the 8 ElevenLabs voices (first candidate was picked unheard; re-pick with voice-cast `mode=save` then
`mode=lines game=quests`).

### 7. Paint the world (AW-STUDY-0049)
Paint balloons that splat, stay one in-game day, grow alien plants; fireball icon with slot-machine refill; water balloons carrying
fire / water / cats-and-dogs / tie-dye. Merged: `bae46710`, `c4a80928`, `8886e9ac`, `3a3e285a`. Files:
`simulations/paint-world/` (`paint-world.mjs`, `paint-splat.mjs`, `alien-plants.mjs`, `paint-balls.mjs`, `paint-hud.mjs`,
`balloon.mjs`, `town-mount.mjs`), `lab.mjs`, `world-effects.mjs`, `town-events.mjs`, `studies/paint-world/`,
`docs/oracle/paint-world/PAINT_WORLD_STUDY.md`, preview `preview/paint-balloons/`. Tour: yes. Next: confirm live, watch a special
balloon land its effect in the live town and sandbox, ask Evan whether the slot machine's miss prize and 1-in-4 special rate feel
right, restore `mountTownHud` if dropped, later plants as cafe ingredients, sound, GLB plants, shared watercolour wash.

### 8. Farm and riding school tiles
Merged and live as of 1:13 PM (main `0bec1db7` was in the `fab70d98` deploy). Re-check that /town still loads the farm tiles
(slot-300-0) and the `town-hud-boot` count after later deploys. Previews: `preview/farm-tile`, `preview/riding-school`, `preview/wright-farm`.

### 9. Experiments from Abbie's two videos (#608)
Merged PR #626. Code map and success checks: `docs/design/VIDEO_EXPERIMENTS.md`. Prototypes: experiments 1 (paint the party suit),
4 (party reveal), 7 (companions), 8 (search, collect, follow) in `preview/video-experiments/`. Tour: no. Experiments 2, 3, 5, 6,
9 to 12 not started. The videos (`IMG_9638.MOV`, `IMG_9639.MOV` in `drops\` on Evan's PC) were never opened; findings come from
the written briefing. Next: open the videos via Remote Control, check gesture timing and the loop in 8, pick one prototype to
go into the town as a `?exp=` feature with scene and test. Real-world uploads become scenes: architecture doc drafted (#608).

### 10. Dispatch backlog
#610-#622 were swept and acknowledged (Intro fix, Create New studies with Sandbox renamed Design and Assimilate renamed Capture,
World Browser #617, player home #619, arcade racer #621 with a passing test run, living toy world vision #622 docs only, no
cooldowns #546 closed). Still open: #545 WASD (built for the iOS app; the web map needs it; WASD/arrows on the web map shipped
9:38 PM so verify), the old `FAVORITES_*` and `STYLE_ASSETS_*` request files at repo root were never acknowledged, the Blob store
`abbies-dispatch` was never read (needs a PC session), #529 terrain catalog answer pending, #622 lists six decisions for Evan
including the child-photo rule, #621 decision pending, #534 car charm (item 1), #537 wardrobe (item 5), #608 (item 9). The
intake only fired for titles starting Dispatch/Fix etc.; it now accepts all titles. Ledger page above.

### 11. Research lab (AW-STUDY-0063)
Glass-domed hall, five wings, 49 pedestals (one per study), seven-hex Winchester map table with NEW flags, Scene Builder arch at the
north end. `#<study-id>` walks to a pedestal. Drafted, tested headless: https://app.abbies.world/r2/previews/research-lab/index.html.
Concept only, door not placed. Recommendation: a "Walk in" door on abbies.world/studies plus one door in town. Tour: no.
Blocked on Evan: door on /studies, in Winchester, or both.

### 12. Scene Builder Lab (AW-STUDY-0062)
Experimental at `/studies/scene-builder/?exp=scene-builder`, merged `78c75a56`. Next phase (on "go"): the in-world door and real
models. Preview/spec: `preview/scene-builder-study`.

### 13. Use the best library model everywhere
Compare every 3D asset the live game uses against the ~1,540-model library (`dist/models/library.json`); produce a swap table as an
instant preview with before/after thumbnails, unused gems and gaps; then swap scene by scene with each owner (hex city owns town
files). Nothing drafted yet; branch `claude/project-thread-goqu14` is identical to main. Model gaps page:
https://app.abbies.world/r2/previews/model-gaps/index.html (638 of 1,493 in game; gaps: people, animals, Main St shops). Real-PC
screenshots need Remote Control.

### 14. Swappable hero
Today nobody is the player on the hex board; car mode has a nine-block stand-in; real Meshy Abbie/Ani/Daddy exist in Moon Mission
and FPS only. Design (no build until approved): bead on the left bar shows who you are; tap fans the family out; hold opens the
shared dressing room. Preview https://app.abbies.world/r2/previews/swappable-hero/index.html. Five choices for Evan: tap-and-pick vs
cycle, shared vs separate bag/notebook, silhouettes vs spending ~275 Meshy credits on three more people, is Evan = Daddy-now,
build order. Evan's rule: redesign first, rebuild after he approves.

### 15. Charms
Charms study / map / jewellery box (0053). Proposal (not approved): yellow Sponge charm with blue bubbles floating at the carwash
with an aqua beam; chest would become twelve. Moon and rocket medallions sit at the black truck at the French bakery where the
Moon Mission starts. Gold minigame medallions with halo beams, track "Collect the Backpack Charms".

### 16. Carwash (AW-STUDY-0060)
Study + two song takes drafted: https://app.abbies.world/r2/previews/carwash-study/index.html. Earned buggy drives 1.5x bigger,
foliage shows a pale outline of it; merged. The four-minute minigame is unbuilt. Evan's call: Rose Royce "Car Wash" licence.

### 17. Free assets and reauthoring
Merged; confirm `f01463d3` and `e57c1cec` are live. Reauthor the weak models (space helmet, sci-fi crate, bench, tractor, chest,
potion bottle, lighthouse, box truck). Add a CC-BY credits page. Usable car: VW bus (CC BY, badge and plate sanded off) plus a
roll-cage buggy, truck cab, box truck from the car tag. Not usable without written permission: F1 (BY-SA), Landy Mini (NC), Jeep
(personal use). No free shopping-cart car exists. Printables downloads need Evan's Chrome on the PC. Docs: `tools/stl-pilot/`,
`/mnt/project-files/asset-sources/*.html`.

### 18. Halloween mode
Merged, off for everyone; `?exp=halloween` works as a shorthand for its own flag. Needs the one-line swap into the game registry
and PC screenshots; waits on Evan's "go".

### 19 to 21. Winchester, HUD, performance
Winchester = 7 hexes, 3 zones; only the hex-city owner edits it (now Codex). Café on Main St beside the skate park. Old map layer
hidden; sky follows clock/season/weather; world starts at real date, time, season. Town HUD: one glass bar at the top, cards pill
removed, 3D driving icons (live 10:39 PM). Open: bottom hand is a flat "Go to" pill rather than 3D hex tile cards (Tile pull and
print thread, 0025, `tile-print`); needs a real-device screenshot. Performance: WASD/arrows on the web map merged; measure frame
rate with the ~670 library props on his PC (Remote Control); Town dressing is `?bare` to disable.

### 19b. Late additions from the owner threads
- **Hex city:** keep the town template rules (edit `docs/oracle/abbietown/abbietown.template.html`, rebuild, grep `town-hud-boot`);
  open: water-edge props not placed, LOD for the ~670 library props, more townsfolk, and the Winchester hexes scope (Evan to decide).
- **Grace's Basement (0024):** PR #423 (floppy-disk charm replaces coins; the word game KEYSTORM, two minutes of play wins the charm
  through the Backpack's `earnCharm`; Daddy calls her up) still needs merging. Gold coin, School star and Heart charms still unlock
  from coins and must move to non-coin rewards.
- **Moon Mission (0036):** live. Next is the Chapter 2 playthrough. Start must sit at its medallion (rocket/moon medallions at the
  black truck beside the French bakery).
- **Interactive world ("Make the world interactive everywhere"):** merged `d876aa14`, needs a live check of the tap test.

### 22 to 27. Parked or waiting
- **Spaceships (0035):** 8 ships made (160 credits), mirrored, at `/studies/spaceships/models.html`. Waits on his pick, then cleanup into named parts and mechatronics pass.
- **Papercraft 0017, Turnaround hero 0023, MCP reconnect, Roman figure parts 0020 (leave undisturbed):** sessions on his Mac are offline; resume only when he asks.
- **Biome suit HUD 0044, Texture Studio 0040 (compare Meshy texture tests to brute retextures), Moon base FPS 0031:** drafted; verify what merged.
- **2,000-model plan** (`preview/asset-plan-2000`, 1,000 concepts x 2 looks, batches of 50 for ChatGPT) waits on Evan's "go" for batch 1;
  **Winchester inventory** (447 entries, 326 missing, drone shot list; Evan buys a drone Sat 10-24); **Diorama builder** (swipe left = like,
  right = hate, learns his taste). ChatGPT is the better modeler; the two-stage process (low-poly, then upgrade pass) is best.
- **Sanctuary (0055):** four calls pending from Evan (BY-SA gallery-only?, takedown contact, outreach list, lawyer).
- **Launch:** sign-in thread, payments off, Stripe test keys only, no Kickstarter, marketing spend needs his go.

## 5. What only Evan can decide (collect and ask once, in one line each)
Leaderboard family vs online; backpack picks A to D and look; listen to the 8 quest voices; research lab door; scene-builder "go";
swappable hero five choices; sponge charm; carwash licence; Halloween "go"; spaceship pick; 2,000-model batch 1 "go"; Sanctuary calls;
#621/#622 decisions; open the two videos (Remote Control); Mac online for Midjourney work.

## 6. First steps for Codex
1. Merge `claude/project-thread-4a30bd` (Meshy) and `claude/project-thread-kidtb0` (coaster) work to main via PRs, check CI.
2. Fix the red `invariants/static` check (item 4). Everything else is blocked behind it.
3. Take the deployer role per `docs/handoff/DEPLOY_HANDOFF.md`.
4. Run the Meshy queue (item 1) with the remaining credits.
5. Work down the table in section 3, reporting stage in Evan's words and never "done".

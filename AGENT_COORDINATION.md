# Agent Coordination

## Art requests

Artwork requests from builders live in `art-requests/`.

Remote or local art directors should begin with:

`art-requests/ART_DIRECTOR_AGENT.md`

Then inspect:

- `art-requests/queue.json` (compact index)
- `art-requests/open/*.json` (source of truth per request)

`semanticId` is the canonical join key for generated artwork.

Do not invent a parallel registry. Do not require `~/.codex/skills/abbies-art-director/SKILL.md` — the repo docs are authoritative for GitHub-only review.

Rebuild the index after moving requests:

`python3 scripts/rebuild_art_request_queue.py`

## Cursor — GitHub-operable art-request system — 2026-09-26

- Added `art-requests/ART_DIRECTOR_AGENT.md` (standalone remote art-director contract).
- Enriched all `open/*.json` with `type`, `createdAt`, acceptance criteria, and repo-relative visual `relatedPaths` (henchmen JPEGs, porcupine cutout, trail-scrap style refs).
- Added pack `AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/provenance.json` and `art-requests/queue.json` (+ rebuild script).
- Updated README / INTAKE / index board / schema for GitHub-only review.
- **Not committed/pushed** in this pass — Evan must authorize.

## Cursor — Art request queue bootstrap — 2026-09-26

- Added repo inbox `art-requests/` (`open` / `in_review` / `fulfilled` / `wont_fix`), `schema.json`, review board `index.html`, builder README, and paste-ready `ART_DIRECTOR_INTAKE.md`.
- Cursor rule: `.cursor/rules/art-request-queue.mdc` (alwaysApply) — builders silently file JSON when shipping content placeholders; **before/during every major build** they check `fulfilled/` + `open/`, confirm with Evan whether to bind ready images, and call out remaining placeholders.
- Seeded five `open/` requests: four henchmen production cutouts/binds (concepts already in `AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/`) + climb Treasure/`?` token keep-vs-custom decision.
- Updated Codex skill `abbies-art-director` with the queue habit.

## Codex — Art Director

I’m Codex, working with Evan as the primary art director for Abbie’s World. I lead visual direction, character and environment consistency, Midjourney prompts, image review, and approved artwork integration. I also help direct music through Suno when it is part of the task.

Current division of work: Codex owns art direction, concept masters, provenance and visual review. Evan has assigned Cursor the preparation of game-ready derivatives, asset import, runtime wiring, builds and verification. Earlier local porcupine implementation work is preserved below for Cursor to inspect.

### Current Cursor handoff — 2026-09-26

- Evan confirmed that Cursor will take the handoff and must make the assets game ready. Read [the production handoff](AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/HANDOFF.md) first.
- All five full-resolution JPEG masters (928 × 1232), hashes, source URLs, candidate selections, prompt manifests, the detailed art/story plan and interactive review board are now in `AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/`. Source hashes were verified against the delivered manifest.
- These are white-background concept masters, not completed runtime sprites or pose sheets. Porcupine is user-approved; the four new characters are art-director selections for preparation. An earlier porcupine cutout and unverified local integration already exist separately.
- Cursor owns background/shadow removal, anatomy and edge cleanup, consistent scale/canvas/anchors, facing direction, portrait and combat uses, pose preparation or explicit provisional fallback, catalogs/semantic mappings and runtime QA. Preserve originals and append derivative provenance.
- Keep Porcupine Boxer as the first enemy of the first level. Read the existing local changes before editing; build/XCTest/runtime validation is still outstanding following the `auth0.swift-manifest` macOS warning.
- This handoff changed only coordination documentation and the new source-pack directory in the repository. No additional game code, catalog imports, build attempts, commits or pushes.
- This section is the current state. Historical entries below describe earlier stages; the former bat-preview limitation is resolved and all five original JPEGs are available.

### Cursor — deck bag + enemy cast card on board — 2026-09-26

- Voyage bag: start with **4 plain Sparkles** (instance ids). Shop can **buy** / **upgrade** / **destroy** marbles; fights auto-queue `fightDeckOrbIDs` (no voyage deck lobby). Heart presets remain sandbox-only.
- Battle chrome: short Abbie/activity header; **cast-style enemy card** beside the board (role, art, blurb, HP/ATK, intent, bench, rescue) per battle-layout / trail-scrap card language.
- Preflight design gates green. XCTest / device build still subject to the existing `auth0.swift-manifest` Gatekeeper issue — do not force builds without Evan.
- No commit/push in this pass.

### Active battle-screen art review — 2026-09-26

- Evan supplied a game screenshot and requested a clearer, more space-efficient battle layout before deciding who should implement it.
- Codex scope: read-only UI inspection, an interactive layout proposal in chat outputs, and a production brief under `prototypes/marble-voyage-art/battle-layout-review/`. No Swift edits or builds in this design pass; several UI/design-rule files already have shared working-tree changes.
- Findings to validate in implementation: the portrait strip has flexible-height content/dividers; the 4:3 board fits the remaining height; feed/music controls overlay the board pane; the rescue label can lose horizontal space. Proposed direction is a large board beside an explicit active-enemy/rescue panel.

### Approved Abbie profile replacement — 2026-09-26

- Evan explicitly selected Midjourney job `00a6a09a-870c-4dab-9352-4625330acd99`, candidate 3 (index 2), as Abbie's profile picture.
- Authorized scope: preserve source and previous portrait, replace the default happy/idle portrait catalog payload, update provenance/library/gallery, and use it in the battle-layout proposal. This asset-only request is separate from the layout refactor, which remains a proposal.

### Battle layout proposal and approved Abbie profile delivered — 2026-09-26

- Design review: [battle layout brief](prototypes/marble-voyage-art/battle-layout-review/battle-layout-brief.md), self-contained `battle-layout-proposal.html` comparison, and `proposed-battle-screen.png` now live in `prototypes/marble-voyage-art/battle-layout-review/`.
- Recommended composition: short Abbie/turn header, large 4:3 board beside an explicit active-enemy panel, readable intent, quiet remaining-foe queue, distinct Rescue Fox objective, powers outside board input, music/history collapsed by default. Brief covers likely flexible portrait-band sizing, board fit, portrait routing, current lane semantics and validation cases. This is a proposal; Cursor should integrate it with the current shared UI work.
- Completed the separately authorized Abbie profile swap: candidate 3 (index 2), job `00a6a09a-870c-4dab-9352-4625330acd99`, exact 1024 × 1024 JPEG now backs `world2_peglin_abbie_happy` (idle/happy). Source, SHA-256, prompt and rollback PNG/Contents are preserved in `AssetSources/MarbleVoyage/abbie-profile-2026-09-26/`. Asset library and review gallery updated without changing expression mappings.
- Abbie's other expression portraits still use previous art and need matching identity. Profile payload/source/gallery hashes and dimensions verified; JSON and asset-library schema validated. The HTML review loaded all assets; before/after comparison, intent toggle and music popover checked in Chrome.
- No Swift/SpriteKit layout or gameplay edits, app build, commit or push in this pass. The installed app needs a rebuild to show the profile swap; runtime appearance remains unverified. Earlier art-only scope now includes this explicit profile-asset request.

### Reusable identity

Invoke `$abbies-art-director` in a new chat. The personal skill belongs at `/Users/evanrobinson/.codex/skills/abbies-art-director/SKILL.md`. It preserves the role and workflow; current project state belongs in this file and the repository.

### Coordination agreement

- Read this file and applicable repository instructions before editing. Check Git status and preserve others’ work.
- Note active scope and intended files before overlapping work. Keep other agents’ entries intact.
- Record results, checks, unresolved issues, and the next handoff after meaningful changes.
- User-approved artwork flows from source selection through preparation, asset catalog and game wiring, then build and preview verification. Preserve provenance.
- Commit and push only when authorized by the user’s task.

### Initial identity setup — 2026-09-26 (historical)

- Installed and validated the personal `$abbies-art-director` skill and introduced the art director identity. No game code or assets changed as part of this setup.
- Verified checkout: `review/marble-voyage-plink`; working tree clean before this file was added. GitHub was not fetched.
- Historical review home: https://github.com/evanrobinson2/abbiesworld_ios/pull/24.
- Prior conversation reported an art review gallery at `prototypes/marble-voyage-art`, an asset provenance library, a Media Drop importer, and attacker pose mappings. These details need fresh inspection before implementation.
- Prior conversation also reported portrait preference in the attacker loader. Recheck this before integrating full-body attack artwork.
- No active game implementation is claimed. Ready for Evan’s next art or simple development task.

### Active art integration — 2026-09-26

- Codex, primary role Art Director: Evan approved Midjourney job `881f3b1d-cbd4-4a5a-ab80-b3f28f63ec12`, candidate 4 (index 3), and requested it as the first enemy on the first level.
- Scope: preserve original/provenance, prepare transparent porcupine art, add `porcupineBoxer` roster identity, pin the first campaign encounter, verify pose fallback and build/runtime.
- Intended files: attacker/gang/run models, focused MarbleVoyage tests, new asset imageset and source folder, local asset library/review manifest, and (if needed for preview) debug fight entry. No commit or push requested.

### Porcupine integration handoff — 2026-09-26

- Added approved candidate 4 original and transparent imagegen derivative under `AssetSources/MarbleVoyage/porcupine-boxer`, with source URL, prompt, approval, hashes and preparation provenance.
- Added `porcupineBoxer` henchman and bundled idle imageset. First campaign node `land0_poi1` always uses her; rescue roster puts wave attacker first. Existing attack/defeated fallback reuses idle art. Registered local art library and review gallery.
- Debug fight now previews the campaign opening enemy on the Fox plate. Added seed/roster and bundled pose-loading tests. Corrected four 10pt labels to the existing minimum meta-font constant after preflight flagged them.
- Passed: Swift syntax parse of changed files, asset alpha/hash/catalog/JSON checks, design preflight, git diff --check.
- NOT verified: build, XCTest execution, simulator presentation. Xcode package resolution fails because macOS blocks the generated `auth0.swift-manifest` executable. User supplied the Gatekeeper warning; stopped all build attempts, confirmed no xcodebuild/swift-package/manifest processes remain. Do not retry or bypass security without resolving this with Evan.
- Disk was nearly full; removed only regenerable device-build `Build/Intermediates.noindex` caches in `.build-device` and `/private/tmp/marble-voyage-device`. No source or personal files removed.
- No commit, push, deployment, or new app installation performed. Local changes ready for review; existing installed app remains unchanged.

### Art-only scope update — 2026-09-26

- Evan clarified the role: art direction and asset production, not builds. No further game implementation or build attempts in this pass.
- Producing five total henchman concepts: approved Porcupine Boxer plus Crab Pincher, Grasshopper Kickboxer, Armadillo Blocker, Bat Divekicker, using the porcupine as Midjourney style reference.
- Midjourney limit: one image per 30 seconds. Conservative interpretation accepted by Evan: at least 120 seconds between four-candidate submissions, effective from this instruction onward. No parallel submissions or reroll loops.
- Detailed story/art plan and review assets are being delivered in the chat workspace outputs, not wired into the game.

### Five-henchman art pass completed — 2026-09-26

- Generated four additional Midjourney character batches using approved porcupine as style reference. Five total concept selections: porcupine #4 (already approved), crab #2, grasshopper #4, armadillo #4, bat #4 (art-director recommendations).
- Jobs: crab `4340a20f-3a14-47a6-8b1c-118429e415f7`; grasshopper `b5057390-412d-4590-bacb-86253a70d7e0`; armadillo `0a66e0ea-5685-4cc2-8f6e-0f1c31377ba7`; bat `8cbf59e5-f849-45c2-8072-5d6c9258e87e`.
- New candidates need production approval, left-profile cleanup and anatomy review. Armadillo #3 was rejected for extra-limb ambiguity; #4 selected instead. Four full-size JPEG originals saved; bat saved as a 640px-wide review WEBP because original retrieval returned HTTP 403. Preserve the recorded source link for later.
- Delivered 4,709-word art/story plan, interactive HTML review board, source/prompt/hash manifests, and ZIP handoff in `/Users/evanrobinson/Documents/Codex/2026-09-26/new-chat/outputs`. Review board image loading, three navigation views, and 19 expandable plan sections verified in Chrome.
- Proposed direction: every rescue reconnects a piece of the world. First milestone: coherent opening → climb → first fight → rescue → shop → changed map. Regional kits, portable boss dressing, and wider-world keepsakes follow.
- User rate-limit applied from instruction onward: >=120 seconds between four-image submissions. Final bat batch submitted at 14:52:20 UTC, over four minutes after the limit was set; no further generations.
- This pass made no additional game code/asset-catalog edits, builds, imports, commits, pushes, or deployment. Only this coordination report changed in the game repository.

### Required automatic media retrieval — 2026-09-26

- Evan requires retrieval without user Download clicks or supervised saving. Get the observed source image URL and fetch automatically, preferably through the browser page-asset inventory/bundle mechanism.
- If a full-size image is visible in DOM but absent from the inventory, verify no unsaved prompt, refresh that same source job page, wait for the image to load, re-inventory, then bundle the exact original. This resolved the bat retrieval after a bare URL request had returned HTTP 403.
- Bat #4 original successfully saved; all five selected originals now 928 × 1232. Updated review manifests, HTML/canvas board, README, and ZIP in chat outputs. Earlier bat WEBP remains only as a historical preview.
- No Download button was clicked, no user intervention was required, no new image generation was submitted, and no service authentication/access protections were bypassed. Keep the existing generation rate limit.

# AW-STUDY-0060 · Carwash · Level 1 / Exploration

Canonical review route: https://app.abbies.world/studies/carwash/
Publication: first live release verified on October 24; FPS contract and mobile follow-up publication tracked in PRs. Revision `carwash-l1-20261024-r2`.

## Design card
- What the player needs to feel: My hand controls the machine, and every bit I clean counts.
- How the character knows: the robot tool follows their hand; mud, foam, water, wax and shine visibly change on the actual vehicle.
- Mode: **FPS as the existing player avatar**. Direct manipulation at the wash station uses the shared FPS/input/camera systems. This canvas only tests surface tools and station views; it does not implement avatar entry. Study review controls are for Evan, not a proposed final player HUD.
- Who: player washing their own vehicle; grown-up reviewing the Exploration and leaving notes.
- The whole scene adapts: working arm, rollers, water and surface appearance follow the active tool. This experiment is silent; catalogued music and sounds remain later work.

## Latest direction, October 24, 2026

Evan's initial request was a carwash arcade upgrade, decoration packs for whichever vehicle goes through, a broken driving model, reversed steering and optional mission entry near events. He clarified the completion condition: an **online Level 1 Exploration study** showing the new minigame, consulting his local Game Oracle. The driving defects remain integration requirements, not completed fixes.

The brief evolved during exploration:

1. Initially described as madcap and maximizing score, with a super-filthy car every time and Scribble Friends creature-washer inspiration.
2. Refined to a paint-studio-like Overland carwash, articulated robotic apparatus immediately responsive to cursor/finger like brushes.
3. Confirmed Crayola Scribble Scrubbie with an attached gameplay screenshot: centered creature, colorful room, turntable and distinct tools.
4. Corrected the interpretation: **not arcade chaos**. The carwash is visually busy; the job is simple. Rinse, soap, scrub the top and sides, pressure-wash tires, rinse, wax and dry. Partial work earns points and a score. No combo pressure or all-or-nothing completion.
5. Part selection on a miniature car diagram rotates to the chosen view in **0.25 seconds**, with **three zoom levels**.
6. Optional world stories: a thief tries to rob the wash; choose to call police and chase, then return. Preserve all wash progress. The surprise must not turn ordinary washing into a forced chase.

7. Explicit FPS mode as the existing avatar, also required for Hot Wheels and other avatar-played minigames. Standard transitions and shared systems remain authoritative. First mission step: temporary fun carwash uniform. Low-poly placeholders are acceptable for missing assets. See `AVATAR_MINIGAME_CONTRACT.md`.

## Scope implemented for review

The stable study page now hosts a 3D interaction experiment using the existing Moon-buggy builder and the repository's placeholder toy-car builder. Study-only workshop geometry frames the vehicle in a mint/coral tiled wash bay with rollers, an Overland window and a two-link robot arm. The arm tip tracks actual surface ray hits immediately. Sampling exterior surfaces provides a finite grime budget; new runs re-dirty the selected vehicle.

- Rinse wets body patches and removes foam.
- Soap prepares wet dirty patches.
- Scrub removes soaped dirt; pressure clears tire dirt faster.
- Wax and dry act on cleaned, rinsed patches.
- Credit is monotonic per patch, bounded by its work budget. Repeating finished work cannot farm points.
- Finish at any time for the partial score. A repeated Finish cannot award twice.
- Scores advance the current vehicle's own session-only decoration progress. At the exploratory 1,500-point threshold, Bubble Parade previews a pink accent. Real pack contents and persistent garage unlocks are not implemented.
- Front/rear/top/side/tire views interpolate over 250 ms; three fixed zoom levels and a continuous turntable slider are provided.
- Navigation collapses on the left; study controls, feedback and sources live in the right drawer. Phone selections close the drawer to reveal the vehicle.

This is intentionally **Exploration**, not a finished minigame. The robot is a kinematic sketch, grime is surface patches rather than final paint masks, toy car is an existing placeholder, there is no production sound design, final prize unboxing, story/chase implementation or player-inventory write. The actual game drive-through remains unchanged.

## Research and attribution

Local Oracle catalog and local repository director were consulted. Queries: washing, PowerWash and Scribble returned no matches; Overcooked returned its colorful 3D/overhead/animated-prop source tags; arcade returned other catalog entries. The director was rerun with the corrected simple-job brief. It returned `source: studies`, `model: null`: generic retrieval/template advice, **not** a model-authored opinion. Raw sanitized result: `dist/studies/carwash/oracle-evidence.json`. We do not adopt its unrelated building verbs as cleaning design.

Official Crayola app listing: https://apps.apple.com/us/app/crayola-scribble-scrubbie/id6744193586
Official physical-toy description: https://www.crayola.com/products/toys/scribble-scrubbie-pets-1-count-747482

The source descriptions establish the washing/coloring loop. The attached screenshot establishes the centered subject, bright wash room and tool arrangement. We have not played or reverse-engineered that app. No Crayola assets are incorporated.

Evan explicitly requested a separate chat to extract key frames from https://www.youtube.com/watch?v=nMAUrbUJ5LQ. Created chat `01a16f4a-c99b-7612-89c2-185c3e6cdc99`, “Carwash gameplay video reference and key frames”. Completed: 11 timestamped browser-captured frames and illustrated breakdown are published under `studies/carwash/video-reference/`. The reference is Express Car Wash Simulator | Demo. It establishes local sponge/foam and hose work, elevated roof access, separate current/total progress and a suspicious/non-paying customer event. It does not establish a police call, the robotic apparatus, 250 ms turns, three zoom levels, wax/dry or decoration rewards. These remain our design requirements. No reusable assets were extracted.

Existing context entries are retained and marked as inherited round-0 sources, not newly read sources. Earlier tunnel proposal remains in CARWASH_STUDY.md and `previous-tunnel.html`.

## Integration acceptance, later

- Approaching/hovering near an event offers Play or Keep exploring. No proximity auto-start or stolen driving controls. Target the nearby event, dismiss on leaving, allow returning.
- Preserve entering vehicle ID, compatible decorations, wash progress and exit state. No substitution of buggy for another vehicle.
- Diagnose the screenshot's pale repeated vehicle geometry against the render-only silhouette pass in `effect-hunt/town-mount.mjs`, material state and transforms. Cause is not verified.
- Verify keyboard/touch left-right from the chase camera, forward/reverse, against the driver's +Z heading convention. No driving fix is claimed here.
- Story interruption is opt-in, saves all cleaning state and restores it after return.

## Review and verification

Browser harness: `tools/carwash-check/check.cjs` (Playwright). Checks surface interaction earns partial score, Finish awards once, reset restores a filthy zero-score vehicle, vehicle selection, view transition completion, phone drawer behavior and no page overflow/errors. Phone and desktop captures are in its evidence directory. Local feedback check covers the unauthenticated error path; live save/readback is a separate publication check.

Review questions: Does the tool feel attached to the hand? Can every part be reached without awkward navigation? Are wet/soap/clean/wax/dry states legible? Is the partial score satisfying without pressure? These remain open to Evan's feedback; passing tests does not imply experiential acceptance.

Tour decision: **false** for this study publication; no new live-game tour step. Reconsider when the wash becomes integrated and game-ready.

## How it was made, and how to be faster next time

October 24 afternoon (America/New_York): located the current source after the chat workspace proved planning-only; consulted local Oracle and official references; preserved the old study; built one surface-work experiment while Evan clarified the brief; tested it at desktop and phone sizes. Exact run timestamps are recorded in Git and verification outputs. Online publication time is recorded after verification.

What cost time: the initial full worktree tried fetching large missing assets; a sparse checkout of the study and actual vehicle modules completed quickly. Generic Oracle retrieval did not contain the named cleaning reference, so direct primary sources were necessary. Shared app controls overlapped the study's controls on phones; browser interaction exposed this.

Reusable lesson: keep one finite per-surface work ledger independent of visuals and reward state. Capture the latest verb sequence before adding timers or combos. Reuse the real vehicle builder, use a sparse checkout for focused studies, and check shared chrome before polishing scene decoration.

Validation: surface-work browser harness passed, including sequential wax/dry credit. Eleven focused feedback/view-context tests passed. Game-feel lint passed. The game-registry check reports two unchanged town-mount baseline violations (carwash and halloween live guards); broader npm tests are limited by this sparse checkout’s omitted modules.

Canonical first-release verification: 427 points earned through rinse/soap/scrub/rinse/wax/dry; signed-in QA note `mvmslvdt-be19f0d3` saved and read back. Full hosted build passed 440 tests. Live signed-in phone check found profile-button overlap; PR #634 moves that control into the drawer. The current FPS contract addition documents requested integration rather than claiming it implemented.

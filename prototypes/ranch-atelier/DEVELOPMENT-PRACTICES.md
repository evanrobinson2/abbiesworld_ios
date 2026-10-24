# Abbie’s World Ranch: development practices

Recorded 2026-10-21 from Evan’s project instructions, the Ranch/Sandbox implementation, and release experience. This is the working guide for extending the new web version of Abbie’s World. Keep it current as decisions change; do not turn historical measurements or proposals into permanent facts.

Production workspace: [Sandbox](https://abbies-ranch-atelier.vercel.app/sandbox). The web application lives in [`dist/`](dist/); it is not automatically integrated into the native iOS application.

## 1. Build generators that produce believable places

A displayed diorama is an instance of a reusable generator. Improve its rules, constraints, assets and simulation rather than polishing only one seed or arranging a one-off showcase. Evaluate multiple seeds, terrain conditions and configurations.

A scene family is a complete microcosm: generated place, movement routes, simulation, right-panel interface, dashboard and saved board placement. These must agree. A separate illustration with invented readouts does not satisfy that contract.

Begin with terrain, access, shared activities and available space. Place doors, stairs, platforms, shelters and supports so they connect and make physical sense. Let paths and roads take useful angles; the hex grid defines the board container and connection boundary, not a mandatory street grid. Prefer varied frontage and infill to repeated mirrored rows. Add detail to explain construction, use, history and inhabitants’ behavior.

Use references such as LEGO Bricktales to inform spatial quality. Carry improvements into the actual shared scene families. The long-term ambition is increasingly believable generated spaces; that is a direction, not a claim that current scenes already achieve realism.

## 2. One actual simulation, several presentations

Style studies, comparisons and closeups must reuse the real generators and implemented runtimes, including their assets, paths and physical scale. Do not create a simpler substitute and label it a view of the same simulation.

Keep domain state independent of lighting, camera and presentation. Readouts and visible station contents should derive from that state. Distinguish clearly between:

- Spatial activity: an inhabitant moving, waiting or following a path.
- Implemented domain activity: a reservation, collection, delivery, consumption or other accounted state transition.
- Planned mechanics that have not been implemented.

Names and animation alone are not evidence of an economy or household simulation. A delivery completes after real arrival and the appropriate state transition, not merely because an animation timer expired.

The shared resource workflow provides reservations, carrying, consumption, cancellation and accounting. Scene adapters supply resources, policies and places. Do not copy the simulator to change its vocabulary. Preserve its accounting invariant: stock, station contents, cargo and consumed quantities balance initial supply and replenishment.

Each runtime owns its state, bounds and route network. Save movement, targets and active jobs alongside domain state; restore stable identities and job references. Release reservations and cargo when an instance is disposed. Camera changes must not recreate simulation state. See [`dist/simulations/simulation/README.md`](dist/simulations/simulation/README.md) for the implementation contract; its dated feature-status statements need checking against current code.

## 3. Make inhabitants visibly alive and physically grounded

Locomotion, idle and work states all need deliberate presentation. Stationary does not mean frozen: restrained breathing, posture and head movement can communicate life without suggesting work that the simulator is not doing.

Keep root placement tied to sampled terrain height, with pose offsets applied on top. A discovered Ranch defect let stationary animation overwrite world height, sinking workers into the ground. Fix the shared placement/animation boundary, then test every affected state and role.

Pause must stop the appropriate motion. Check actual rendered bodies and limb transforms over time, finite positions, grounding and save/resume behavior where affected. Do not rely solely on the existence of an animation function or a screenshot of one frame.

The snapshot includes `dist/scripts/check-character-motion.mjs`, its loader, and a build hook. Preserve that gate. The Moon caption removal is a specific presentation decision: remove unwanted overhead labels without damaging rigs, movement or useful inspection data. It is not a blanket ban on all labels.

## 4. Assets enter through the shared asset system

New assets require source provenance, measured game scale, validation, exact Art Director review evidence and registration in the existing asset database before game integration. Reuse approved parts where suitable. Do not bypass the system with an unregistered imported model or ad hoc scene-only substitute.

Preserve source identity and original bytes where applicable, along with hashes and asset IDs. A reviewed render, a registered asset and a correctly integrated runtime asset are different milestones. Verify all three. Match attachment points, terrain contact, dimensions, material behavior and animation in the actual game view.

Tool choice follows the task: Blender is an authoring tool, not a visual style. Task-specific exclusions remain binding; Meshy was explicitly disallowed for the Aurora/Moon ship work.

The jukebox had an explicit, task-specific authorization to bundle the identified downloaded Suno MP3 directly after registry access was blocked. Preserve its provenance. That exception does not waive the asset-system rule for later assets or authorize publishing credentials.

## 5. Profile every Blender operation

Before modeling, generation, animation, rendering or export, read the project’s `.agents/skills/blender-efficiency/SKILL.md`. If the working checkout lacks the skill, obtain the project copy before using Blender; do not invent an equivalent workflow and claim compliance.

Use its profiling runner and named stages. Retain wall/CPU time, peak memory, exit status, Blender version, source/input/output hashes, logs and profiling evidence, including failed attempts. Measure a representative asset before a batch; inspect the largest measured bottleneck. Reuse unchanged approved geometry/materials and rebuild only affected parts.

Use cheaper render settings for iteration and appropriate final settings for delivery. Compare equivalent inputs and scope when reporting improvements. Python profiling does not by itself measure GPU kernels.

Release/package entry points must invoke the evidence checker as a blocking prerequisite. Missing, failed, stale or mismatched evidence blocks that workflow. This enforces the entry points that are wired to it; it is not an operating-system-wide interceptor. Never retroactively describe an unmeasured build as profiled.

## 6. Keep visual abstraction coherent

Match silhouette detail, materials, vegetation density, lighting and camera distance across the scene. Polygon count alone does not establish a coherent style. Inspect at ordinary play distance and in closeup; detail that works in a Blender render may become noise or disappear in the browser.

The copper-domed building and grass discussion produced a proposed direction, not an approved implementation: a softly shaded low-poly miniature world. Preserve architectural silhouette and useful construction details; simplify fine weathering. For vegetation, explore bent, tapered blades, varied clumps, softer color variation and patches shaped by paths and use.

The existing grass screenshot read as dark triangular spikes. That visual observation does not establish whether materials, normals or lighting caused the darkness. Diagnose the actual rendered asset before selecting a technical fix. Lush vegetation and whimsical architecture can coexist; inconsistent levels of abstraction are the concern.

## 7. Share controls across every 3D view

Reuse the production Sandbox camera/gesture implementation and its tests. Do not invent bindings for generators, asset viewers, studies or closeups.

| Input | Contract |
| --- | --- |
| Wheel, trackpad scroll, pinch | Zoom; no unexpected orbit |
| Shift-scroll | Pan |
| Shift-drag or right-drag | Pan |
| Middle-drag | Orbit |
| Empty-space drag or explicit Orbit mode | Rotate camera |
| Normal object drag | Preserve established object editing ownership |
| One-finger touch | Rotate on empty space/in Orbit mode, respecting object ownership |
| Two-finger touch | Dolly/pan through shared gesture arbitration |

Modified camera gestures must never grab, place or remove an object. Preserve sensitivity, direction, limits, fit/reset, pointer capture/cancel and mobile behavior. Keep selection, Glass House movement, pull-removal and Undo consistent. Help text must describe actual bindings. Static illustrations must not masquerade as usable 3D viewers.

## 8. Keep the workspace compact and consistent

Put the scene first. Use at most one compact top toolbar for essential actions and the current name; place help in disclosures and longer controls in bounded drawers or side panels. Retain the established left navigation/right-side control organization. Do not add stacked branding, hero copy or selector rows above the work surface.

At 1280 × 720, the working surface should begin within 64 pixels of the top, with scene and primary controls available without page scrolling. On phones, use a bounded drawer or split pane and usable targets rather than a long page of controls. Existing layouts are not exemptions from this acceptance target.

Sunroom is the no-preference default: Fraunces headings, Manrope interface text, cream surfaces and tomato accents. Honor saved appearance choices. Preserve `app-appearance.js`, `app-appearance.css`, `app-style-presets.mjs` and their shared `view-context.js` loader. Keep useful navigation/titles; do not restore the decorative top-left app logo.

Shared actions belong structurally to their panel. The jukebox originally floated over other controls: opening the player successfully did not prove correct toolbar integration. Its button now joins `#toolbar-tools`. Verify closed and open states, dimensions, overlap, focus and viewport fit. Apply the same discipline to future controls.

## 9. Test behavior and inspect the actual result

Use focused checks for the behavior changed, then required project/build gates. A successful build is not visual acceptance, and a good screenshot is not behavioral proof.

For a UI or scene change:

1. Exercise the real generator/runtime with representative seeds and configurations.
2. Verify affected transitions, pause/resume, persistence and accounting as appropriate.
3. Check the shared interaction contract and camera/object arbitration where touched.
4. Wait for the scene to finish loading before capturing evidence.
5. Inspect desktop and phone screenshots of relevant closed, open, selected and active states.
6. Check console errors, visible geometry, character grounding, control overlap, clipping and unintended page scroll.
7. Repeat the relevant checks on the canonical deployed page before calling it delivered.

Turn concrete regressions into executable checks at the correct boundary. Prefer tests that would fail on the old bug to tests that merely repeat the implementation. The character-motion gate is in the production build; the jukebox layout checks were run in the release workspace. Do not claim every useful check is wired into CI unless it actually is.

Performance claims need conditions: device, seed, population, camera, measured work and exclusions. Draw calls are not FPS; a headless simulation benchmark excludes rendering unless measured explicitly. Preserve geometry/material sharing and cache ownership, and release resources without disposing shared templates still in use.

## 10. Release additively to canonical production

All user-facing interactive previews, studies and finished features go on Vercel at the canonical production domain. Never substitute a deployment-specific/staging URL, localhost, ZIP or local file for the requested interactive delivery. Internal development and testing may be local.

Coordinate the release slot with other app contributors. Start from the latest canonical deployment, overlay only the intended changes and preserve other routes, shared loaders, assets and build gates. Compare baseline hashes for edited files and recheck the canonical alias before submission. If either changed, refresh and reconcile; do not deploy a stale whole-folder copy.

After deployment, confirm READY, canonical routing and the expected file bytes, then perform live behavioral and visual checks. Record the deployment ID, changed files and verification results. If delivery is blocked, state exactly what remains blocked rather than presenting a local substitute as delivered.

Read-only inspection and authorized routine work should proceed without repeated permission requests. Keep credentials outside the repository and out of logs. Use scoped access; do not pull a complete production environment merely to solve one asset or deployment problem.

## 11. Make Git checkpoints traceable

The 2026-10-21 GitHub checkpoint was recovered from Vercel’s deployed source manifest rather than assembled from potentially stale local release folders. [`production-snapshot.json`](production-snapshot.json) records its deployment ID and per-file hashes. It describes a point in time, not an automatic mirror of future deployments.

Use isolated checkouts/branches when concurrent uncommitted work exists. Commit only the intended scope. Verify recovered bytes, exclude credentials and machine state, and confirm the remote commit after pushing. Build-generated files are not automatically changes to the production snapshot. A documentation update should not silently include them.

The checkpoint branch is `codex/sandbox-production-2026-10-21`; it is not evidence that Vercel deploys automatically from that branch. Environment variables and external database state are outside the source snapshot and need their own authorized configuration/recovery process.

## 12. Preserve evidence and evolve the guide

Use Game Oracle at [abbies-game-oracle.vercel.app](https://abbies-game-oracle.vercel.app) for game-reference research. Preserve the distinction between source-reported tags, direct visual observations and inferences. Dated catalog counts are not permanent guarantees. Research informs original implementation; it does not justify claiming unimplemented mechanics or copying proprietary code.

Keep implementation contracts near code and release evidence with its artifacts. When a rule changes, record the decision and date, update this guide and link the affected implementation. Explicit later user direction takes precedence over older notes. Clearly label requirements, implemented behavior, measured results, known limitations and proposals so future contributors can tell them apart.


## 13. Avatar-played minigames declare FPS and reuse the host lifecycle

Evan, 2026-10-24: carwash and Hot Wheels are played as the existing avatar in FPS mode; this applies to other avatar-played minigames too. Declare the mode explicitly before entry because it determines controls. Missing assets may use low-poly placeholders.

Minigames must not overwrite or supersede shared player identity, avatar, input/camera, wardrobe, inventory, pause, save or transition systems. Use their existing integration points, retaining one authoritative owner. The minigame owns its local activity state and objectives. Nearby missions are invitations, not automatic entry. Standard entry, cancellation, pause and exit preserve the same player and restore the prior world/control context.

The carwash's first mission step dresses that same avatar in a fun temporary uniform through the wardrobe system; it does not replace the character. Restore the previous outfit at exit. Work-station part views and zoom are shared camera/input mode requests, not an independent player controller. Optional pursuits suspend and resume the same mission state. See [avatar minigame acceptance contract](../../docs/oracle/carwash/AVATAR_MINIGAME_CONTRACT.md). A surface-tool study is not evidence that FPS integration is complete.

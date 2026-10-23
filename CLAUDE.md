# CLAUDE.md

How Claude works in this repository (Abbie's World / Atelier Ranch). What we are building and why lives in the vision
documents; what is built lives in the status documents. Keep these three apart.

## Read first
- `VISION.md`: "The Living Holodeck", the founding product vision.
- `docs/MODELER_VISION.md`: the long-term source of truth for the AI modeler. We are building more than a 3D asset
  generator: a system that preserves creative intent, so whole experiences can be rebuilt, extended and upgraded as
  technology changes. Don't edit it to match the code; change the code toward it, or record the difference in the
  status doc.
- `docs/MODELER_STATUS.md`: what the modeling pipeline does today against that vision, and what to build next.
- `docs/architecture/`: the infrastructure that already exists (R2, Postgres, Vercel projects, MCP, auth, jobs).
  Read it before proposing any new service, store or deployment, and update it in the PR that changes infrastructure.

## Ground rules
- All work stays in this repo (evanrobinson2/abbiesworld_ios). No other repos and no local-only copies.
- `main` is the source for everything, including the live Ranch Atelier site. Branch from `main` and open PRs against
  `main`. Vercel project `abbies-ranch-atelier` is not Git-linked: deploy it with `create_deployment`, a `gitSource` of
  `main` at the merged sha, and root `prototypes/ranch-atelier/dist`. Production only ever ships a commit on `main`.
  The old `claude/live-snapshot-2026-10-22` branch is an archive, merged into `main` on 2026-10-23; don't use it.
- Evan uses Ranch Atelier as a home-screen app on his iPhone. Every Ranch deploy he can see adds an entry, with a
  picture and your thread id, to `prototypes/ranch-atelier/dist/whats-new.json`; it becomes the app's
  "new version ready" card. His notes from the app's feedback button come back through the Feedback inbox PR
  (branch `feedback-inbox`). See `prototypes/ranch-atelier/dist/FEEDBACK.md`.
- The tour rule (Evan, 2026-10-23 06:43Z): every new feature or capability gets a decision on whether it goes into the
  player tour. Write it as `"tour": true` or `"tour": false` on its `whats-new.json` entry and say it in the PR.
- Integrate the modeler vision incrementally. Don't overwrite existing conventions, file formats or loaders; extend them.

## How Abbie's World shows information
Follow these principles; they matter more than any UI grammar. The full study is `docs/oracle/hud/HUD_STUDY.md` on
`main`, and its page is https://claude.ai/artifact/66MG9h31W6fYFmRGdjPucx.
- Ask first: how would a character in the world know this? Show it that way (a bell, a sign, sheep heading home) before any UI.
- The 2x2 plus none: in the world or on the screen, crossed with "the characters know" or "only you know". Diegetic is
  feeling through the world; meta is feeling in your body; spatial is the social layer (bubbles and cues on the
  person, animal or thing they're about); overlay is precise information only. None means the world just behaves differently.
- The whole game adapts: one signal (time, threat, mood, a storm coming) drives light, music, people, animals and
  sound together. Sound sits on the same grid: a bell is diegetic, a heartbeat is meta, a UI tick is overlay.
- Place dialects: each place speaks the same grammar in its own materials (the Ranch uses wood, bells and painted
  signs; the Moonbase uses lights, radio and holograms).
- Two layers that never mix. The world layer holds only in-fiction things, and it is all that characters, the
  simulation, AI directors and the voice controller's `look` can perceive. The presentation layer (HUD, spatial cues,
  labels, selection, debug, tools) is drawn for the player and is invisible to every perception. Anything placed in
  the world becomes fiction, and the bots will react to it.
- No engine or editor artifacts in the player's view. In Evan's words: "we would never dream of dropping a 3D axes
  origin unit vector into the world." That means no gizmos, axis or grid helpers, debug boxes, raw ids or developer
  labels, except behind developer mode.
- Nothing masks the world: no edge haze, fade to white or backdrop blur. The play HUD covers at most 8% of the screen
  and has zero words. Everything else lives on things, is summoned, or goes to the grown-up workbench (`GAME_FEEL.md`).
- Keep what Evan likes: liquid glass (as objects with depth, not flat frosted panels), rich colours and live previews.
  Check a HUD with `tools/hud-rubric/check_hud.py`.
- In practice: load the `abbies-world-designer` skill (`.claude/skills/`) for any player-facing work. It gives the
  design card to fill first, the presentation-layer API (`prototypes/ranch-atelier/dist/simulations/presentation-layer.mjs`:
  `presentation()`, `developerHelper()`, `renderWorldOnly()`, `perceivable()`, `volunteer()` for the scene information
  manifest in `docs/design/INFO_MANIFEST.md`) and the review. Every PR runs the `game-feel` check: a lint for engine
  artifacts and world masks, and a ratchet that fails a change hiding more of the world (/sandbox). Briefs: `docs/design/briefs/`.

## Modeling work
- Every model made to match an image is shown with an interactive 3D viewer next to its inspiration image.
- Every asset keeps its intent and history in the repo, not in chat: the brief and prompts, Midjourney job IDs and
  picks (`provenance.json`), the construction recipe (`build.py`), revision rounds and decisions (`notes.json`), scores,
  and the game files it replaces. When you add a new pipeline stage, write its outputs into the same asset folder.
- Construction is engineered geometry from a recipe (Blender Python), not opaque image-to-3D. Name parts and materials
  by what they are; the game reads material names as shading roles (see `tools/ranch-rebuild/MODELER.md`).
- Midjourney is preferred for concept art but is not a hard dependency: if Evan's Mac is offline, use another image
  source or ask Evan to upload a reference, and record which one was used.
- Change requests make a new version of an asset with the request recorded; never silently replace history.

## Where things are
- `prototypes/ranch-atelier/dist/`: the live Ranch Atelier site (abbies-ranch-atelier.vercel.app, ranch.abbies.world).
- `tools/model-challenge/`: brief, modeler brief, scoring harness (`harness.py`), turnaround splitter, publisher.
- `tools/ranch-rebuild/`: the Ranch tile rebuild, `to_game.py` (GLB to the tile's mesh format) and `PROFILE.md`.
- `tools/midjourney/`: driving Midjourney in Evan's browser. `tools/model-store/`: R2 and Postgres asset storage.
- `tools/paper-warrior/`, `tools/paper-helmet/`: image-to-model fitting experiments and the papercraft grammar.
- `prototypes/studio-mock/`: the Abbie's World MCP that ChatGPT connects to (studio-mock-iota.vercel.app/mcp).
- `prototypes/game-oracle/`: the Game Oracle (abbies-game-oracle.vercel.app): Steam library index, game identity records,
  game studies and the `consult` director (idea to rules, beats, choices, style and factory requests). Notes in `docs/oracle/`.
- `docs/dispatch/`: the ChatGPT → Claude dispatch bridge (build/status/revise/inbox). A session started by a
  dispatch follows `docs/dispatch/CLAUDE_PROTOCOL.md`.

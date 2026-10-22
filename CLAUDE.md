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

## Ground rules
- All work stays in this repo (evanrobinson2/abbiesworld_ios). No other repos and no local-only copies.
- The live Ranch Atelier site is built from branch `claude/live-snapshot-2026-10-22`
  (`prototypes/ranch-atelier/dist`); `main` does not carry it. Ranch work merges into that branch.
- Evan uses Ranch Atelier as a home-screen app on his iPhone. Every Ranch deploy he can see adds an entry, with a
  picture and your thread id, to `prototypes/ranch-atelier/dist/whats-new.json` (live branch); it becomes the app's
  "new version ready" card. His notes from the app's feedback button come back through the Feedback inbox PR
  (branch `feedback-inbox`). See `prototypes/ranch-atelier/dist/FEEDBACK.md` on the live branch.
- Integrate the modeler vision incrementally. Don't overwrite existing conventions, file formats or loaders; extend them.

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
- `tools/model-challenge/`: brief, modeler brief, scoring harness (`harness.py`), turnaround splitter, publisher.
- `tools/ranch-rebuild/`: the Ranch tile rebuild, `to_game.py` (GLB to the tile's mesh format) and `PROFILE.md`.
- `tools/midjourney/`: driving Midjourney in Evan's browser. `tools/model-store/`: R2 and Postgres asset storage.
- `tools/paper-warrior/`, `tools/paper-helmet/`: image-to-model fitting experiments and the papercraft grammar.
- `prototypes/studio-mock/`: the Abbie's World MCP that ChatGPT connects to (studio-mock-iota.vercel.app/mcp).
- `docs/dispatch/`: the ChatGPT → Claude dispatch bridge (build/status/revise/inbox). A session started by a
  dispatch follows `docs/dispatch/CLAUDE_PROTOCOL.md`.

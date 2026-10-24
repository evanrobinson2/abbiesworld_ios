# INVARIANTS

Contracts that hold for every change, from Evan (2026-10-24: "these are invariant contracts"). Each one is enforced in CI by the
`invariants` workflow (`.github/workflows/invariants.yml`) wherever code can see it. A PR that breaks one does not merge.
CLAUDE.md links here; the designer skill (`.claude/skills/abbies-world-designer`) lists them in its review.

## 1. Nothing goes live without a scene and a passing test run
A minigame or feature is reachable from abbies.world only if it has **(a)** a real scene in the world (a town gate in `ENTRANCES`,
`simulations/abbietown/entrances.mjs`, with a scene id) and **(b)** an automated end-to-end run in headless Chrome that plays it
and passes in CI. Anything else is **experimental**, like a branch: it opens only with `?exp=<id>` (or `?exp=all`) or in
developer mode, and the live town does not show or open it. A standalone page with a stand-in board is a study, not a game.
- Registry: `prototypes/ranch-atelier/dist/simulations/game-registry.json`. Every entry has `status` (`live` | `experimental`),
  `scene`, `test` (script + pass marker) and a `tour` decision. Experimental entries list what they still `need`.
- Switch: `simulations/experimental.mjs` (`live(id)`, `liveGate(gate)`). Unknown ids are never live. Anything that mounts a game
  on the town asks it first.
- Static check: `node tools/game-registry/check.mjs`. Every `studies/*/play.html` and every town gate must be registered; a live
  entry needs its scene and test; an experimental entry must be gated in the town page.
- Run: `node tools/game-registry/run-tests.mjs` plays every live entry (flows in `tools/minigame-test/`, a flow prints
  `GAME-TEST PASS <id>` only after reaching its end state and fails on any page error).
- To go live: add the scene, make the run pass, flip `status` to `live` in the same PR. Check dispatch and the thread's brief for
  what the run must cover before you say it is done.

## 2. The town HUD starts from its own file
`studies/abbietown/index.html` (and `docs/oracle/abbietown/abbietown.template.html`) must load `simulations/town-hud-boot.mjs`
with its own `<script type="module" src>` tag, exactly once, and never mount the HUD inline. Twice a merge dropped it and the old
bottom bar came back. Merge `main` before editing the page; after any merge `grep -c town-hud-boot` it. Checked by
`tools/game-registry/check.mjs`. Note: the generated page has drifted from the template (other threads edit it directly), so do
not run `build_page.py` without diffing first.

## 3. Only sounds from the catalogue; no MIDI
Every sound effect and every piece of music comes from the sound catalogue (`prototypes/ranch-atelier/dist/sounds/manifest.json`:
the Sonniss takes in R2, plus the music catalogue and the composed tracks). No General-MIDI, no `.mid` files in the game, no
oscillator-built music or effects, no ad-hoc stand-ins. Checked by `tools/audio-check/check.mjs`: it fails on a `.mid`, on
`createOscillator` in a file the audit does not list, and on a `SAMPLES` list naming an id the catalogue does not have.
`tools/audio-check/baseline.json` is the audit of synthesized audio still in the game, with an owner per file; it may only shrink.

## 4. Every voice is ElevenLabs
All speech comes from ElevenLabs designed voices, never cloned (`tools/voice-cast/cast.json`): scripted lines pre-rendered to R2 with
the voice-cast workflow, unscripted lines streamed through `api/live-voice.js` after `wallet().charge`. Kid voices are adult actors.
No `speechSynthesis`, no other TTS. Checked by `tools/audio-check/check.mjs` against the same baseline file (`browserVoice`).

## Where the debt is
None in sound or voice: `tools/audio-check/baseline.json` is empty, so any new oscillator, `.mid` or browser speech fails CI.
Every effect plays through `simulations/catalog-sfx.mjs` (`sfx('coin-1')`), which resolves ids in the sound catalogue.
Games: seven are experimental (`needs` in the registry says what each lacks). The registry's `scene.stage: "town"` covers
features mounted on the Winchester board (intro, paint balls, world effects, quests, backpack); their one run is
`tools/game-registry/town-features.cjs`.
Known gap: the audio check sees oscillators, `.mid` files, browser speech and unknown catalogue ids. It cannot see a
noise-buffer synth; review for that.

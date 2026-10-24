# AW-STUDY-0062 The Scene Builder Lab

Status: **drafted** (concept study and clickable mock; nothing is in the game). Evan, 2026-10-24 11:59Z: "a scene editor where you can mix and match
elements and the game will dynamically generate the world and you get to do free build ... a right panel with all tools ... maybe an overlay toolbar ...
a major build not just a POC ... a first class in game engineering lab ... experiment with weather, physics, topology, simulation params like gravity
but without overwhelming the user, a default experience must just be selecting an asset family, season, topo, simulation style and decorate it first
pass auto second pass user." Then: "So do a big study."

Preview (playable mock plus the full study, with the Context card on the right): https://app.abbies.world/r2/previews/scene-builder-study/index.html
Source: `preview/scene-builder-study/` (`engine.js` scene document and generators, `render.js` stand-in renderer, `app.js` the lab, `index.src.html` the page;
`python3 build.py` inlines the context card). Context sources: `studies/context.json`, id `scene-builder`. (Study number: 0061 was taken by the project chat while this was drafted.)

## The idea
Choose four things (asset family, season, land shape, how alive), the game decorates a first pass, then the player takes over and builds freely.
Behind a flask button is an engineering bench (land, sky and weather, physics and life, scene record). A scene is **a base recipe plus an ordered list
of edits**, not a picture, so it can be undone, shared, tested and rebuilt on a better renderer (docs/MODELER_VISION.md).

## What the mock proves
- The scene is `fold(base, ops)`: undo drops the last edit group and replays; "Rebuild from record" gives the same checksum (tested in headless Chrome: place, raise, undo,
  chat edits, rebuild, identical checksum).
- Overlay toolbar (select, place, erase, raise, lower, smooth, pick, move view; undo, redo, turn, hex glow, run, step in, play), right panel with an icon rail, bottom hex card
  tray with keys 1 to 9, selection bubble on the thing, stepper (choose, first pass, yours), Play mode that folds the interface away.
- Default panel is only the four choices and one button. Land, Sky and weather, Physics and life, Scene record sit behind the flask (disclosure ladder: choose, build, bench,
  developer mode).
- Auto-decorator first pass: heroes on the flattest hexes, clusters (woods follow a noise field), scatter by slope and shore, creatures, props drop in under the scene's gravity
  (on the Moon they float down). Things you place or pin survive a new first pass.
- Bench: gravity presets and slider, time of day and real clock, seven weathers, wind, relief, feature size, world size, water level, seed, a drop test where balls bounce and
  roll downhill, so the land decides where they end.
- Helper chat without any AI: "make it winter", "add 3 trees", "remove the rocks", "moon gravity", "steeper hills", "a storm at night", "undo". Every action is an edit in the record.

## Architecture (see the page, sections 5 to 9)
Lab UI (presentation layer) over the scene document (`aw-scene` v1: base, ops, checksum, provenance) over pure seeded generators (terrain, auto-decorator, taste prior, pack
allow-list) and the simulation we already have (clock, seasons, weather fronts, ecology, tile-physics, headless runner), over the renderers. Every knob is a registry entry
(name, unit, range, default, level, owner module, plain explanation); panels, the helper and developer mode are all drawn from it.
Reuses: model library and project-chat packs, `loadout.mjs`, `tile-placement-feedback.mjs`, `scene-picking.mjs`, `hex-glow.mjs`, `landscape-parameters.mjs`,
`terrain-presets.js`, `world-clock.mjs`, `weather-state.mjs`, `planet-gravity.mjs`, `tile-physics/`, `worlds/boards.mjs`, `tile-chat/contract.mjs`, the swipe study's taste learner.

## Build plan (each phase ends in a passing headless run; behind `?exp=scene-builder` until the registry flips)
0. Scene document and parameter registry (M). 1. Recipe to world on real models (L). 2. Free build (L). 3. The bench with experiments (L).
4. Helper and taste (M). 5. Door, share and upgrade (M).

## Decisions
- The lab's right panel is the workbench exception (Evan asked for it); it is a mode you enter and leave. The play HUD stays at 8% with zero words, and Play mode drops the
  lab's interface from about a third of a laptop screen to under 1%.
- The helper's brain is swappable (AI Gateway under the wallet caps, or ChatGPT as provider); it only speaks registry and edit verbs and every action is undoable. The project chat
  (0061) stays the route for asking the project to build something new.
- Which of the four ways of acting: tiles create the world, at full strength. God cards are unchanged and stay the play-time tool.

## Open for Evan (recommendations in the page)
Where the door is (recommended: the dashed new-world hex in the board of boards), helper brain first, first families for phase 1 (Ranch, Woodland, Moon base).

## Not yet
Sound (catalogue only, one per material), real models (stand-in shapes), real physics engine, real AI, server save, WFC-style solver, experiments runner.
Tour: **false** (not reachable from the game). Invariants: not live, so no registry entry yet; no MIDI, no synthesized audio, no TTS in the mock.

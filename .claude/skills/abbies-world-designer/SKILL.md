---
name: abbies-world-designer
description: Use before building, changing or reviewing anything a player sees or hears in Abbie's World, or that characters and AI perceive (HUD, UI, scenes, models, cards, music, sound, voice controller), and before shipping it.
---

# Abbie's World designer

The principles are in `CLAUDE.md`, "How Abbie's World shows information". This skill turns them into steps you take
every time. Do all three parts; they take minutes, not hours.

## 1. Before you build: fill the design card

Write these five lines at the top of your PR description (or the asset's `notes.json`, or the brief). If you can't
answer one, you don't understand the feature yet.

```
Design card
- What the player needs to feel or know: <one line, in a child's words>
- How would the character know? <the in-world signal: a bell, a sign, sheep heading home, a smell, a queue>
- Mode: <none | diegetic | spatial | meta | overlay>, and why not the one to its left
- Who it's for: <player (the child) | grown-up (parent or owner view) | director (AI only)>
- The whole game adapts: <which of light, music, sound, people, animals also change with this signal>
```

Order of preference: none, then diegetic, then spatial (only for the social layer: bubbles, hearts and emotes on the
person or animal they're about), then meta (feelings: shake, warmth, heartbeat, music lifting), then overlay (only
where precision is truly needed, such as the hand of cards). Sound sits on the same grid. Each place speaks its own
dialect (Ranch: wood, bells, painted signs; Moonbase: lights, radio, holograms; coffee shop: playful-tense, never scary).

Grown-up information is real and welcome, but it never appears in play. Example (Evan): a coffee-shop sim keeps an
income statement; Abbie never sees it, she feels the morning rush. Evan reads in the grown-up view that she spent $5K
on a new espresso machine.

## 2. While you build: two layers in code

Ranch Atelier code uses `prototypes/ranch-atelier/dist/simulations/presentation-layer.mjs`:

- `presentation(obj, {purpose})` for anything drawn only for the player: selection, labels, cues, previews.
- `developerHelper(obj, isDeveloper)` for any engine helper (axes, grids, boxes, gizmos). Hidden unless developer mode.
- `playerCamera(camera)` once per player camera, so it draws both layers.
- `renderWorldOnly(renderer, scene, camera)` before any AI capture (`look`, director snapshots, Oracle shots).
- `perceivable(entities)` before any perception summary reaches the voice controller, a director or the Oracle.
- `volunteer(sceneId, {place, dialect, items})`: each scene publishes its information manifest
  (`docs/design/INFO_MANIFEST.md`), so any UI, bot or the voice controller chooses how to show each item.
  Read it with `window.RanchInfo.read(sceneId, {audience: 'player' | 'grown-up' | 'director'})`.

Anything you put in the world becomes fiction, and the bots will react to it. If it isn't in the fiction, it goes on
the presentation layer.

Never: a full-screen haze, fade-to-white, backdrop blur or vignette over the world; toolbars, side panels, segmented
buttons or other web-page layouts; raw ids, "debug" or developer labels in play. Keep: liquid glass as small objects
with depth, rich colours, live previews.

## 3. Before you ship: review

Run these from the repo root and fix what they find. CI runs the same two checks on every PR (`game-feel` workflow).

```
node tools/game-feel-check/lint.mjs origin/<base-branch>
(cd tools/game-feel-check && npm i && node world-cover.mjs ../../prototypes/ranch-atelier/dist /sandbox)
```

- The lint fails on engine helpers and world masks, and warns on labels in the world, raw-canvas captures,
  unfiltered perception, developer words and web vocabulary. Silence a line only with `// game-feel: ok <reason>`.
- World cover: the play HUD may cover at most 8% of the screen with zero words. CI fails a change that hides more of
  the world than its base did, and attaches before and after screenshots.
- For a HUD, also score it: `python3 tools/hud-rubric/check_hud.py <manifest>`. For a card: `tools/card-rubric`.
- Look at the phone screenshot yourself and answer, in the PR: is anything covering the world? Could a character
  explain every on-screen thing? Before and after shots use the exact same camera.
- Context engineering (Evan, 2026-10-23, org-wide): a study ships with its sources in
  `prototypes/ranch-atelier/dist/studies/context.json`: the Oracle records you consulted, the game dev blogs, game
  design blogs and tutorials you read, and the canon you followed. It shows as the Context card on the study's right
  side; paste `node tools/context-card/snippet.mjs <id>` into the study's artifact too. See `tools/context-card/README.md`.

## By discipline

- Models (`tools/model-challenge`, `tools/ranch-rebuild`): a model is world layer. No baked labels, arrows or text.
  Record in `notes.json` how the model itself carries state (a full feed trough, a wilting crop, a lit window).
- Cards (`docs/oracle/cards`): the hand of cards is the one sanctioned overlay; the card art itself stays diegetic.
- Music and sound (`docs/music/MUSIC_BIBLE.md`): state each cue's mode. A bell is diegetic, a heartbeat is meta, a UI
  tick is overlay. One game state drives the music arrangement, not a separate jukebox.
- Voice controller: it perceives only the world layer (`perceivable`, `renderWorldOnly`) and speaks in-world.
- Scenes and simulations: volunteer an information manifest with every scene; Sandbox v2 is the first consumer.

Briefs that carry the design card: `docs/design/briefs/`. The full HUD study: `docs/oracle/hud/HUD_STUDY.md`.
Game feel laws and banned web patterns: `GAME_FEEL.md` in the project files (`/mnt/project-files/game-feel/`; section 2b
has the same principles).

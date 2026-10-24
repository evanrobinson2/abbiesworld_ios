# Charms work: handoff for ChatGPT (written 2026-10-24, from the "Charms map and jewellery box" thread)

You are picking up the charms work for Abbie's World. Everything below is in the repo `evanrobinson2/abbiesworld_ios`
(main is the source). Read this top to bottom once; it tells you where things are and what Evan has decided.

## What exists (all drafted; none of it is in the game yet)
- **The study page** (the visual reference): `prototypes/ranch-atelier/dist/studies/charms/index.html`, live at
  https://app.abbies.world/studies/charms/ . One self-contained HTML file with inline SVG and JS. It is a mock on its own
  7-hex Winchester board; it reads no live game code. Sections: design card, playable stage (chest, tile bag, noticeboard),
  four ways to show "where can I earn my charms", the chest (11 slots), the jewellery box, the charm track, floating charms,
  the intro sequence, the mission board style, the hand-off spec, how it fits the code.
- **The study doc**: `docs/oracle/charms/CHARMS_STUDY.md` (decisions, dated, newest at the bottom).
- **The padlock model**: `prototypes/ranch-atelier/dist/models/padlock/padlock.glb` (158 triangles), built by
  `tools/charms/padlock.py`.
- **Charm pictures**: `prototypes/ranch-atelier/dist/studies/charms/img/*.png` (hero charms from the Midjourney sheet).
  Moon cheese and the toy car have no hero art (drawn stand-ins in the page).
- **Registered** in `studies/index.html` (AW-STUDY-0053), `studies/context.json` (the Context card) and `whats-new.json`.

## Where the real charm code lives (not mine)
`prototypes/ranch-atelier/dist/simulations/backpack.mjs` (the Backpack thread owns it): `CHARMS`, `earnCharm(id)`,
`earnedCharms()`, `charmCount(id)`, `keychain()`, `putInBox(id, yes)`, `inBox(id)`. Never change it from the study; ask the
Backpack thread. A charm brief by that thread is at https://app.abbies.world/r2/previews/backpack-briefs/index.html .

## Canon from Evan (newest wins)
- Every reward is a charm. No coins. There are 11 charms: tardigrade, floppy ("basement", beat the word game), brass key, coffee
  cup, star ("school-roof", climb onto the school roof), bub, "moon-key" shown as Moon base, rocket, moon cheese (repeatable,
  two on the keychain), toy car (10 of 16 coaster stars), heart ("all-memories": earn every other charm, comes by itself).
- **Missions start at the location of their backpack charm** (not a separate medallion). A floating, spinning charm with a halo
  laser into the sky over it is the mission start: floppy at the café cellar door, star at the school, toy car at the coaster,
  rocket at the black truck (bakery curb), moon cheese at the Moon outpost (only with a Moon tile). Winning drops the charm in
  the chest. Bub, coffee cup and brass key have no beam; they are found, not played.
- The current track is **Collect the Backpack Charms**: charms unlock blueprints, blueprints unlock tiles or card packs. More
  tracks come later. My grouping into rungs is a proposal (one `TRACK` list in the page).
- Locked things are a locked card: tap it, see a greyed card, press "Show me where"; the camera flies to the place and the
  game-ready padlock model is set on it.
- Intro: black screen, the charms circle with a spotlight, a second light on the backpack; when shaders are loaded the charms
  fold into the backpack, scene lights shut off, then Abbie's World fades up (overlay first, then a massive scene drop). The
  Performance thread builds it. It replaces the single-tile chalkboard intro.
- The science adventure and lab are parked; the Science tile was cancelled; the high school stays in the Downtown centre hex.
- Winchester facts: the black truck parks at the French bakery; a skate park sits beside the café; Abbie's "oak" is her pink
  tree house (`abbie-daddy-side.abbieTree`). Town helpers: `AbbieTown.board.heightAt(x,y)`, `board.obstaclesNear(x,y,r)`,
  `AbbieTown.stage.tiles[hexId].spots[id]`.
- Medallion/beam look to match (Demo thread builds the in-game one): see `medalsSVG()` and `MED` in the page.

## Open decisions (Evan's call)
Whether each charm unlocks a small power and whether all earned charms hang on the pack (the Backpack brief's choices C and D);
the track grouping; a separate Moon base charm beyond `moon-key`; replaying a mission after its charm is earned (suggest a dim,
beamless ghost charm at the place).

## How to work in this repo
1. Read `CLAUDE.md` first. Branch from `main`, open PRs against `main`, keep all work in this repo. Merge your own PRs.
2. Player-facing work: fill the five-line design card (`.claude/skills/abbies-world-designer/SKILL.md`) in the PR body.
   Ask "how would the character know?". Keep the HUD tiny; nothing masks the world; no engine artifacts in view.
3. Run `node tools/game-feel-check/lint.mjs origin/main` before you push.
4. Every new feature gets `"tour": true` or `false` on its `whats-new.json` entry (newest first) and says so in the PR.
5. Every study keeps its entry in `studies/context.json` (sources it drew on).
6. **Do not edit Winchester town files.** `studies/abbietown/index.html` is generated: edit
   `docs/oracle/abbietown/abbietown.template.html` and run `python3 docs/oracle/abbietown/build_page.py`. Placements are the
   hex city thread's call.
7. Deploys: Ranch production deploys of `main` go out in batches through the "Vercel deploys broken" thread. Do not deploy
   yourself. Say "live" only after checking the domain serves it.
8. Dispatches from ChatGPT arrive as GitHub issues labelled `dispatch`; follow `docs/dispatch/CLAUDE_PROTOCOL.md`.

## How to talk to Evan
One plain line: the outcome plus at most one tap. No PR numbers, branch names or check status. When something is live: "<local
time> - Here's the link: <the page he'll use>". Report anything not in the game as "drafted". No secrets in chat, no real
house numbers or addresses, PG only.

## Quick tour of the page code
`CH` (the 11 charms), `place()` and `art` (the board's places), `boardSVG()` (draws the board and the earn-map modes),
`medalsSVG()` and `MCHARM` (mission-start charms with beams), `state` (earned, tiles, rules), `renderAll()` (chest, track,
floating), `TRACK` (rungs), `MISS` (mission cards), `goMission()` (zoom and puff), `lockedCard()` (locked card and padlock).
The padlock picture is rendered once from the real GLB with three.js at load.

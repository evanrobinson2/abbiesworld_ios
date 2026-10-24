# Experiments from Abbie's videos: code map and first prototypes

Source: dispatch #608 follow-up (Evan, 2026-10-24). Two short clips of Abbie playing her favourite game (57 s and 92 s),
analysed into twelve experiments (not twelve proven defects). **Status: drafted.** Four experiments (1, 4, 7, 8) are mapped
to code and prototyped as previews; 2, 3, 5, 6, 9 to 12 are not started. The prototypes are self-contained canvas pages in
`preview/video-experiments/`; they hold no footage or photos from the clips (kids' video stays on Evan's PC). The
Windows originals were not opened from this cloud session (no person message to anchor a Remote Control request), so the
findings below rest on the written briefing in the #608 thread, not on playback.

Preview: https://app.abbies.world/r2/previews/video-experiments/index.html (add `?dev` to a page for its success numbers).

## Mapping to what exists (inspected on `main`)
| # | Experiment | What exists today | Gap |
|---|---|---|---|
| 1 | Direct manipulation with a persistent result | Paint the World (`simulations/paint-world/`): paint balls dragged from a top-bar tray splat on the board; plants grow from splats. `painted-brush.mjs` is a render look, not a drawing tool. | No place where a finger sweep paints a thing (a suit, a wall, a kite) and the mark stays. Painting is thrown, not drawn. |
| 4 | In-context reveal after editing | `tile-reveal.mjs` (tiles roll, parts drop and shoot home in 1.5 s); `live-tray-preview.mjs` (card preview in the world's renderer); `intro-charms.mjs`. | Reveals exist for tiles and the intro, but not for "your edit appears on a character in the scene" or a return-to-edit path. |
| 7 | Progress as companions accumulating | Backpack charms (`backpack.mjs`, `backpack-wear.mjs`, jingle on earn), `inventory.mjs`, Bub (`black-lab.mjs`). Progress is items in a backpack. | I found no follower line that grows in the world as you progress. |
| 8 | Search, collect, follow loop | Effect Hunt (`effect-hunt/`: beacons, collect, cooldown tray), charm pickups, `item-pickup.mjs` (held items). | Hunt is a vehicle drive to laser beacons; collected things go to a tray, they do not follow. No hide-and-peek search. |

## The four prototypes
Each is for a phone held portrait with fingers covering part of the screen: big targets, no words, nothing is lost.
- **1 Paint the party suit** (`1-paint.html`). A friend needs a swimsuit for the party (Evan's mission example: painting
  helps a friend and teaches the mechanic). Finger sweeps paint a broad stroke; eight swatches (solids and three patterns)
  sit in a slim tray that tucks down while painting and returns on lift. Saved on every stroke.
  *Expected improvement:* fewer taps to a visible result. *Success check:* a first-time player finishes without adult help,
  with at most one wrong swatch pick (a wrong pick = changing swatch twice with no stroke between).
- **4 The party reveal** (`4-reveal.html`). The painted cloth appears on the friend, who hops in, turns once under the
  lights, while guests hop. One button back to painting. *Success check:* cloth hash unchanged over repeated round trips;
  a child points to their own work in the scene.
- **8 Search, collect, follow** (`8-collect.html`). Drag the crowned bug; bugs peeking beside big flowers and crayons join
  a line behind it (wiggle and ring when you are close). One ghost-finger demo; when all six follow, they fly off and the
  garden resets. *Success check:* the first find happens unaided right after the single demo.
- **7 Companions show progress** (`7-companions.html`). The same garden plus a leaf where missing bugs are shadows and
  found ones are colour; the line behind you is the other progress signal. No counters. *Success check:* asked "how many
  are still hiding?", a child answers from the leaf and the line without reading.
Bugs differ in colour, shape and marking (experiment 9's rule: never colour alone).

## Rules honoured
No sound (so none outside the catalogue), no voices, no engine artifacts in the player view (the `?dev` readout is
developer-only), PG content. Nothing here is registered in `game-registry.json` or reachable from abbies.world: these are
previews, and anything promoted needs a real scene plus a passing headless-Chrome run (`INVARIANTS.md`).
**Tour: no** (prototypes, not shipped features; no `whats-new.json` entry).

## Next
Re-check the mapping against the continuous video once a PC session can open `drops/IMG_9638.MOV` and `IMG_9639.MOV`
(especially exact gesture timing for 1 and 4, and the loop in 8). Then pick which of the four goes into the town as
an experimental (`?exp=`) feature first.

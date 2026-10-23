# AW-STUDY-0058 Kart Mode: the Racetrack

Evan, 2026-10-23 21:47Z: driving the quad, shopping cart or toy car should feel like Mario Kart: obstacles, crashing into scenery,
the scene turning into a racetrack "stencilled out" from the board, remade each time the board changes and prebuilt lazily in the
background. Halos only come diegetically from the car; a cheat lives in developer tools; laser beacons are reserved for
charm-earning missions.

Page `/studies/kart/`, play `/studies/kart/play.html` (add `?dev` for the workbench). Code `simulations/kart/` on top of the Effect
Hunt's driver (AW-STUDY-0057), which still owns vehicles, effects, beacons and the tow-back.

## Design card
- Feel: the whole town is my toy track, and every tile I add makes the track longer.
- Diegetic: road, kerbs, ramps, pads, props that burst, the START gantry, the tow critter. Overlay: three lap pips. No other words.
- Place dialect: downtown has benches, lamps, parked cars; Ani's side mailboxes, fences, hedges; Abbie and Daddy's side hay, scarecrows, rocks.
- Mode: this is "FPS / acting as Abbie" in the four ways of acting; the track never takes the camera.

## What is built
- `track.mjs` (pure, node-testable): ring of the six outer hexes, a dirt shortcut through the middle hex, a bulge for each tile placed
  between two ring hexes and a hairpin for each tile on a corner slot. Catmull-Rom spline, sampled every 3 m. Time-sliced `runLazily`.
  Track is a decal on the board's own `heightAt`: no second terrain. Checked: zero samples off the board for 0 to 3 extra tiles.
- `kart.mjs`: road, kerbs, shortcut, start line and gantry, ramps and boost pads; surface speed (grass 72%), laps through gates,
  lazy rebuild with a puff swap, `prebuild()` of all twelve next-tile tracks in idle time, scenery clearing (`clearScenery`).
- `obstacles.mjs`: soft props burst above 8 m/s and return after 12 s; hard props bounce you; puddles slow you.
- Two one-line hooks in the hunt's `drive.mjs` (soft burst, `bump`). Halos and beacons are the hunt's, already car-only; the developer
  cheat is the hunt's `aw-dev-beacons`, surfaced in the `?dev` panel.

## Round 2: car mode in the town (Evan, 23:39Z: "car mode needs to actually get built and shipped in the live game")
- `town-mount.mjs` now creates the kart layer, so the notebook's car buttons on `/demo` drive the racetrack on the real Winchester board.
  The loop is threaded between the town's own houses and trees (relaxed against `board.obstaclesNear`, road 11 m wide); what is
  left in the lane bonks you, as in the hunt. Starts parked on the line until you press go.
- Fire wheels (Toy car charm card) trail from the car's wheels; real CC0/CC BY toy cars (Racer, Toddler car, Pickup, Sedan) replace
  the placeholder in toy car mode, Abbie riding on the roof.
- Polaroid mini phone (`polaroid.mjs`): unlocked by the floppy-disk charm (`basement`), round glass button on the left, only in car mode;
  tap takes a picture of the screen, a white-framed card slides out and develops, kept in this browser (newest 8) and announced with
  `aw:polaroid`. Developer cheat: `localStorage aw-dev-phone=1` or `?phone` in the page address.
- Tour: **yes** for car mode (one tap in the notebook, a payoff at once). Not yet checked in the live town by a person.

## Not built / open
Drift mini-turbo, countdown start, rivals, bridges over water, the town's houses on the road line are not cleared (the road threads
between them instead), a picker for which toy car (`pickToyCar(i)`, no button yet), a charm for finishing laps, Midjourney concept
art, owner-only gating of the dev panel, showing the Polaroids inside the backpack (the backpack thread listens for `aw:polaroid`).

## How it was made, and how to be faster next time
Evan's message 21:47Z (17:47 local); a first track with its own driver at about 22:10Z; rebased onto the Effect Hunt's code after its
thread said it already had the cart (~22:00Z) and playable on the hunt at about 22:55Z. Time went to: building a parallel driver,
vehicles and effects before reading main (about 25 minutes wasted); headless software GL at a few fps. Speedups: read `git ls-tree
origin/main` for the topic before coding; the coordinator relay should name existing threads on the same topic at spawn; keep game
logic pure so node tests catch off-board tracks without a browser; one `make_preview.sh` per study.

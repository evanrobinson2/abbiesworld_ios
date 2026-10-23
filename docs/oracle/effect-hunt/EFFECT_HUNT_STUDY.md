# AW-STUDY-0057 The Effect Hunt and the Jet Cart

Evan, 2026-10-23 21:25Z: "suggest like 5 other props like the paint balls, and we can hide them around the city, maybe we can make a
shopping cart with a jet pack and load the 3 of us into it and drive around the city looking for them like GTA 5... maybe there are 10
different effects to collect... once you get them you can use them infinitely but on a 15 second real life time out... make them obvious
by using laser beacons into the sky when this mission is selected... a mission selector: just use a notebook with paper check list...
either take the buggy / hot wheels / whatever in kart mode, or the overhead god mode... wacky and fun driving physics... if you go off
the tiles for more than 5 seconds: timeout, slow down, and a critter drags you back."

Page: `/studies/effect-hunt/index.html`. Play: `/studies/effect-hunt/play.html` (stand-in board) or the notebook's kart and overhead
buttons on `/demo` (the real Winchester). Code: `simulations/effect-hunt/`.

## Design card
- Feel: I found a strange new toy in the town, and now I can throw it whenever I like.
- Diegetic: the effects, beams, cart, critter, rope. Overlay: the tray of ten round buttons, jet and boost thumbs, fuel line. No words.
- Beacons are the town's own glow (world layer, additive, never masking the ground). The tray is presentation layer (`data-ui`).
- One signal, many outputs: the day clock drives sky, light, paint age and plant growth; fireflies matter more at dusk.
- Collect once, own forever, 15 s real-time cooldown (not game time, so a pause is not a loophole; stamped in storage so a reload is not either).

## The ten effects
| # | Effect | What it does | Hidden at (hex, spot) | Built |
|---|---|---|---|---|
| 1 | Paint splat | Paint falls, strange plants grow (AW-STUDY-0049) | Downtown, café curb | yes (reused module) |
| 2 | Confetti cannon | 220 streamers, everybody cheers | Downtown, the common | yes |
| 3 | Bubble burst | Soap bubbles lift you gently | Depot and River, by the river | yes |
| 4 | Bounce mushrooms | Seven springy caps; drive over one and boing | Reservoir Hills, lookout slope | yes |
| 5 | Firefly swarm | Glowing cloud follows and lights the way | Ani's side, Horn Pond | yes |
| 6 | Snow globe | Snow patch, ground goes slippery: drift | Neighbourhood, a quiet cul de sac | yes |
| 7 | Grow spray | Whatever you spray gets big (already in the demo's toy rocket) | Abbie and Daddy's side, the garden | spec only |
| 8 | Rainbow arc | A rainbow bridge you drive up and slide down | Gingerbread Hill | spec only |
| 9 | Disco floor | Ground flashes, everyone dances | Downtown, the skate park | spec only |
| 10 | Moon hop | A pocket of low gravity | Ani's side, the launch pad | spec only |

Paint is the existing one; nine are new (we built five of those). Every effect is original: no brand names, no brand art.
Hide spots live in `effects.mjs` as a hex id plus metres east and north of the hex middle, so the hex city thread can move any of them.

## Rules
- Beacons are earned in the car (Evan, 21:47Z): they show only while you drive; overhead and the notebook hide them unless the developer cheat is on (`localStorage aw-dev-beacons=1` or `?cheat=beacons`). Laser beacons are reserved for charm missions. A laser beacon over every effect not yet found (about 420 m tall, coloured per effect, a ring on the
  ground to drive into, a spinning gem). Found effects fade out with a ring burst.
- Drive into a ring (7 m, below 14 m up) to collect. The tray button lights; tap it (or keys 1 to 0) to cast ahead of the cart. In god mode
  tap a button to arm it, then tap the ground to throw it there.
- Vehicles: jet cart (Abbie in front, Ani in the middle, Daddy by the handle), Moon buggy and toy-car coaster car (stand-ins until those
  threads register real models with `registerVehicle`), and god mode (overhead; tap the ground to send the cart, drag to pan, wheel to zoom).
- Wacky physics (all springs and clamps, no sim): loose grip, squashy landings, mushrooms boing, bubbles float, snow slides, jet hover
  (2.6 s tank refilling on the ground), boost burst, props are bonk-and-bounce.
- Off the tiles: speed eases to 40% over 5 s, then Nubbin (original critter: round teal bumble-badger, orange scarf) runs in, clips a rope to
  the front and tows you to a safe spot, then waves and trots off. Kart-racer feel is inspired-by only. No Nintendo names, characters or sounds.
- Tour: **yes** for the hunt (a one-tap verb, a payoff in minutes). Tour: **no** for the stand-in page.

## Where it plugs in
- Notebook line registered through `registerMission` (`demo-mission.mjs`); `onSelect` lights the beams, `drive` and `overhead` start the hunt.
  The town is a separate frame with its own three.js, so `town-mount.mjs` is imported inside that frame.
- Ground comes from `AbbieTown.board.heightAt / tileAt` (`world.mjs`); the stand-in board answers the same questions (`standin.mjs`).

## Next
1. Hex city thread: confirm or move the ten hide spots; a road/drive-spawn list; an obstacle query (houses, trees) so the cart bonks in the real town.
2. Backpack thread: a charm for finishing the hunt (the line currently shows the cart icon).
3. Moon Mission and coaster threads: register their vehicles. Real GLBs for the cart and Nubbin from Midjourney concept art and a Blender recipe.
4. Build effects 7 to 10. Sound from the Ranch set instead of the tiny WebAudio blips.

## How it was made, and how to be faster next time
Evan's message 21:25Z (17:25 local); first playable standalone about 35 min later; real-town integration about 30 min after that.
Time went to: finding the hooks (paint module, demo notebook, town stage) and the town frame having its own three.js; debugging a camera
fight with the town's fly-to; headless software-GL testing (about 2 fps, so driving looks slow in tests). Speedups: a shared `vehicle` kit with
registerVehicle; an obstacle and road query on the board API; a test hook (`window.__effectHunt`) in every mounted game; an instant-preview
script per study (`tools/effect-hunt/make_preview.sh`).

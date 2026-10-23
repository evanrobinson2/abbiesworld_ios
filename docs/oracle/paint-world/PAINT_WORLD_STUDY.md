# AW-STUDY-0049 Paint the World

Evan, 2026-10-23: promote "Paint the world" (Splatoon, Inspiring Shaders #5) to a study with production assets, then
straight into the game. A card you play: paint drops from the sky, stays for a day of in-game time, and exotic alien
plants grow from it.

Live page: /studies/paint-world/ (Tab 1 study, Tab 2 production assets). Code: `simulations/paint-world/`.

## Design card
- Feel: I made a mess of colour and the world answered with a garden.
- Diegetic: the paint and plants are in the world. Overlay: only the card in the hand. Meta/spatial: none.
- Style from Splatoon yes, expression never: no squid forms, weapons, turf score, art, names or sounds.
- One signal, many outputs: the day clock drives paint age, plant growth, night glow and light.

## Rules
Paint lives 24 game hours (wet glint 4 h, dries, shrinks over the last 6). Plants start 0.3 to 1.8 h after landing,
grow over 12 h (sprout, grow, bloom), live 72 h, then sink into the soil. Caps: 14 splats, 30 plants. Everything is
derived from `day * 24 + hour`, so pause pauses growth and the time-of-day picker advances it.

## Modules
- `paint-splat.mjs`: draped splat pool, one shared shader (ink field, wet edge, dry, fade, night glow, watercolour wash).
- `alien-plants.mjs`: Jelly Bloom, Spiral Fern, Pom Reed, Glowcap, Star Spire; `makePlant`, `pose`.
- `paint-world.mjs`: sky drops, landing, plants, snapshot/restore, `warm()`.
- `paint-card.mjs`: the card face (Cards v3 die-cut) and hand.
- Hook: `lab.mjs` (`paintWorldReady`, `playPaintCard`, `paintFrame`), saved per seed in localStorage.

## Performance
Shader and plant materials compile once in `warm()`; a play rewrites position buffers of pooled meshes and touches no
tile or shared material. Plants are three meshes each.

## Why the splat looks so good (Evan, 2026-10-23: "out of control good"). Keep it exactly, reuse the recipe.
The look is locked. Values live in `simulations/paint-world/paint-splat.mjs` (shader) and `paint-world.mjs` (timing, drops).

Shape (one signed field, all from the seed, so every splat is different but the family is the same)
- A wobbly blob: base radius .5 plus three sine lobes (3, 5 and 8 per turn) plus a little noise of the angle.
- Five tapered splash arms (length .2 to .42 beyond the blob, width falling with distance) so it reads as thrown paint.
- Seven flung droplets at .72 to .96 of the radius, each .03 to .075 wide.

Surface
- Colour is two tones per paint (bright and deep). Deep pools at the rim (35%), bright swirls from low-frequency noise inside.
- Wet for the first ~4 game hours: a soft glint blob up-left and a light line just inside the edge. Then it dries to a chalky, slightly darker, grainy tone. In the last quarter of the day it shrinks irregularly with noise and goes translucent.
- At night it glows softly (the colour added back at 38%), so paint reads as light.
- Far from the camera the edge softens and the colour goes pastel (Watercolour distance, `uWash`).

Timing (real seconds, not game time)
- Teardrops fall in about .75 to 1.05 s with an ease-in (y = top * (1 - u*u)), stretching taller and thinner as they speed up. Drops are staggered by .22 s plus up to .12 s of jitter, so four land like a rhythm, not together.
- On landing the splat spreads in .5 s with an ease-out cubic and a small overshoot (a damped sine, +7%), which is the "squash then settle" that sells it.
- Six tiny paint droplets fly out with a ballistic arc for .9 s, shrinking as they go.
- Splat quad is a 26 x 26 draped grid, lifted .006 above the terrain, with polygon offset so it never z-fights.

Reuse the recipe
1. Draw the shape as a signed distance, not a texture: blob, arms, droplets, then smoothstep the edge.
2. Animate the radius, never the colour: ease-out with a damped overshoot over about half a second.
3. Put a falling object with stretch in front of every impact, and stagger the impacts.
4. Make it wet then dry then gone, driven by the game clock, with a night glow.
5. One shared shader program and a pool, compiled up front, so playing it never hitches.

## Composes with Watercolour distance (AW-STUDY-0050)
`uWash` softens far paint's edge and moves it toward pastel with camera distance. When 0050 ships a shared far-wash
uniform, feed it to `world.setWash()`.

## Tour
tour: yes. A one-tap verb with a payoff in minutes.

## Next
Winchester diorama hook (any board with a scene, height function and clock works), plants as café ingredients, sound
from the Ranch's own set, Blender build.py and GLB export of the plants for the model store.

## Splat balls (Evan, 2026-10-23)
Spending the card grants a random handful: count 3 to 7 (weights 1,2,4,2,1, so five is usual) and a size from tiny .55x, small .78x, regular 1x, big 1.35x, giant 1.6x (weights 1,2,4,2,1). Colours alternate within a pair. Balls wait in a tray on the right edge (), sized to show their splat. Drag one and release: pointer speed over the last 120 ms becomes the flick, mapped onto the ground by the camera;  arcs it (gravity, a little squash and stretch) and it splats where it lands. Letting go on the tray puts it back. Plants glow in the dark through additive halos around each lit part.

## In Winchester (/town)
`paint-world/town-mount.mjs` mounts on `AbbieTown.stage` like the Moon Mission: it uses the town's scene and camera, and the stage's tiles for the height function (NaN off the seven hexes, so paint never lands in the void). The town has no hour of the day, so the paint keeps its own game clock (a day in three minutes) and its plants never glow (no night). Units: the module's `unit` is render units per metre (sandbox .1, town 1); every size derives from it. The paint shader includes the three.js log-depth chunks because the town uses a logarithmic depth buffer. The card and tray are the same modules as the sandbox; the god-view deck's `ranch:play-event` with `paint-rain` also grants balls here.

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
Paint lives 24 game hours (wet glint 4 h, dries, shrinks over the last 6). Plants start 0.5 to 3.5 h after landing,
grow over 20 h (sprout, grow, bloom), live 72 h, then sink into the soil. Caps: 14 splats, 30 plants. Everything is
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

## Composes with Watercolour distance (AW-STUDY-0050)
`uWash` softens far paint's edge and moves it toward pastel with camera distance. When 0050 ships a shared far-wash
uniform, feed it to `world.setWash()`.

## Tour
tour: yes. A one-tap verb with a payoff in minutes.

## Next
Winchester diorama hook (any board with a scene, height function and clock works), plants as café ingredients, sound
from the Ranch's own set, Blender build.py and GLB export of the plants for the model store.

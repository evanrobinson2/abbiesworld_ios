# AW-STUDY-0050 - Watercolour distance

Evan, 2026-10-23 (3:38 PM local): "yes to this one too #6 Watercolour distance", from Inspiring Shaders (AW-STUDY-0045).
Promoted to a production shader and wired into the game: Abbie's Town (`/town`), the three Winchester dioramas and the
pulled-back trio.

- Study + production assets page: `/studies/watercolour/` (source `watercolour.template.html`, built by `build_page.py`).
- Shared kit: `prototypes/ranch-atelier/dist/simulations/watercolour-distance.mjs` (tests: `simulations/tests/watercolour.test.mjs`).
- In the game: each region's look in `docs/oracle/abbietown/dioramas.block.js` carries `wash: <zone>`; `dioFrame` sets the zone,
  the render loop calls `WC.update(dt); WC.render(scene, camera)`. `?watercolour=off` compares; `AbbieTown.watercolour.tune({...})`.

## How it works
One extra full-screen pass over a colour+depth target. Depth gives each pixel's distance (decoded for the page's logarithmic
depth buffer). Wash rises with a smoothstep and a curve between `start` and `end`, capped by `max` (never above 0.85, nothing
masks the world). With wash: taps bleed along paper noise (a near thing never smears over what is behind it), tones settle into
flat steps, pigment fades, the zone's wash colour comes up and everything lifts to the paper, edges darken a little, granulation
and paper fibres show. Near field is untouched. Reads colour and depth only, so it composes with Sunday Toon, Painted Brush and
Paint the world (AW-STUDY-0049): world paint is drawn first and washes with the distance.

## Per-zone opinions
Downtown rose over brick (clear 150, full 430); Ani's side cool, wide and wet (200 to 540, most blur); Abbie and Daddy's side rose
and violet, sharper wet edges (180 to 480); trio warm haze; real town cool horizon. All in `WASH_ZONES`.

## Cost
No shader compiles during play: `precompile()` compiles scene and pass at load (`compileAsync`), and until ready `render()
draws directly. Zones and sliders only move uniforms. Measured here only on a software renderer (about 38% more per frame,
which says nothing about a GPU): the study page prints frame ms and pass time on the viewer's own device, so read it on the RTX
4070 Ti and the iPhone before calling it done.

## Design card
Feels: the far world is a painting, the near world is a place. Character knowledge: none, the world just looks different (no label,
gauge or hint). Layer: presentation look on the finished picture, invisible to characters, AI and `look`. Tour: false.
Style yes, expression never. PG.

# AW-STUDY-0045 - Inspiring Shaders

Evan, 2026-10-23 14:22Z: "and I want an arcane inspired shader" and "look through modern games and find inspiring
shaders, do a study. we can review together".

Review page (live three.js, pick and notes per card): https://claude.ai/artifact/X5e4wt4hrrSE1zZeVpWZTU
Source: `inspiring-shaders.html` here. It loads the mannequin (`tools/figure-practice/mannequin/mannequin-rest-smooth.glb`)
and the brute (`prototypes/ranch-atelier/dist/studies/brute-fight/red/fighter.glb`) as glTF JSON made by `glb2gltf.py`,
because artifacts don't serve `.glb`. Evan's picks and notes live in the page's `picks` collection (one doc per look).
Follows AW-STUDY-0028 (Storybook) and the Shaders article (`docs/oracle/rendering/`).

## The Arcane-inspired look: Painted Brush

Inspired by how Fortiche paints light into textures (style only; no Arcane art). One `ShaderMaterial`, skinned-mesh
safe, reading any base-colour map:
- brush-stroke noise (world space, anisotropic) breaks the light-to-shadow edge before banding;
- painted grain on the albedo; purple shadow tint, warm key, teal rim;
- ink shell whose width breaks up along the line;
- a neon point light plus additive halo and light cone, flickering at 12 fps (Fortiche times 2D effects at 12).
Shown side by side with Sunday Toon on the mannequin and the brute.

## Ranked shortlist

1. Soft daylight (Tiny Glade): the Ranch base; already Sunday Toon.
2. Guiding wind (Ghost of Tsushima): one wind field bends grass, leaves and trees and points the way. Best
   "how would the character know?" answer.
3. Painted Brush (Arcane-inspired): characters, family cast, Moonbase astronauts.
4. On the beat (Hi-Fi Rush): world pulses to the music; café dance floor.
5. Paint the world (Splatoon): world-space paint as a play verb.
6. Watercolour distance (Zelda BotW/TotK). 7. Anime character light (Genshin: ramp, face shadows, tinted lines).
8. Held frames and edited normals (Guilty Gear Xrd): brute fight. 9. Lit pixel art (Sea of Stars): memory places.
10. Ink and paper (Okami). 11. Worlds in orbs (Cocoon): tile cards. 12. One-bit dither (Obra Dinn).
13. Line art (Sable). 14. Dusk dread (Dredge): Halloween, playful-tense only.

## Design card

- What the player feels or knows: "My world looks like a picture book, and it changes with the day, the music and the weather."
- How would the character know? The light, wind, glow and colour are the world itself.
- Mode: none and diegetic; outlines and lens looks stay presentation-side.
- Who it's for: the player; the pick board is a grown-up tool.
- The whole game adapts: every look is one material whose numbers come from one game signal.

## Evan's picks and the plan (2026-10-23, 15:40 local)

Loved, in the review page's `picks` collection:
- **#10 Ink and paper (Okami).** "This is wonderful for flashbacks and in game storytelling I love it."
- **#11 Worlds in orbs (Cocoon).** "This is a fun unlock to a new world."
Plans only. No production build until Evan says go.

### Ink and paper: the flashback and storytelling look
Diegetic when Daddy tells it: the telling turns the world to a page. One signal, `telling` (0 to 1), drives everything:
- Look: the `okami` preset (wash, paper grain, broken brush lines, red accent kept) as a new `inkpaper` entry in
  `simulations/toon-kit.mjs` TOON_LOOKS, plus a screen-space paper and wash pass for terrain and props that already use
  MeshStandard. Fade `telling` in over about 1.5 s so it reads as a page turning, using `storybook-arrival.mjs`.
- Where: Daddy's memory places (Grace's basement, the school jump, the Moon base memory), Daddy's stories, dreams. The
  coin is the accent: gold coins stay gold on the page, so the "core memory" is the one coloured thing.
- Sound moves with it: room tone drops, a paper rustle on the way in, a brush sweep on the way out (diegetic).
- Characters: Daddy and the kids stay the same models, painted by the look; Painted Brush stays for the present day.
- Cost: light; one shared material swap plus a paper overlay. Tour: yes when it ships (the first flashback is a story
  beat, not a setting).
First build when Evan says go: a `flashback()` kit in `simulations/` (enter/exit, `telling` signal, accent colours), wired
into the school jump's intro as the proof, plus a speed review.

### Worlds in orbs: the unlock for a new world
A glass orb is the world's key, and holding one is the unlock:
- Look: the `cocoon` preset (soft wrapped light, warm rim, smooth gradients) for the orb itself, with the tiny world
  rendered inside from its own tile (an extra camera into a small render target, sphere mapped and refracted).
- Flow: earn an orb (a milestone, a coin set, a story beat), it lands in the player inventory (first-class, top
  bubble); tap it to hold it up, tap again to step in: the orb grows to fill the view, then the world loads. Leaving
  returns the player to the orb. The Studies home and tile cards reuse the same orb.
- The whole game adapts: each orb carries that world's time of day, weather and music so the glow already tells you
  the weather inside before you enter.
- Cost: medium (render target per visible orb, capped at two live; the rest are baked thumbnails). Tour: yes.
First build when Evan says go: `orb-kit.mjs` (orb mesh and the little live world), the unlock moment, and one real
world behind it (Moon base or the town).

Open questions for Evan (only if he wants to steer): which story is the first flashback, and what earns the first orb.

## Next

Read Evan's picks (`picks` collection), then move the shared shader into `prototypes/ranch-atelier/dist/simulations/`
as a toon-set module with the loved presets, wire time of day, wind and music signals, and hand Painted Brush to the
Meshy heroes and Texture Studio threads. Tour: no (a study).

Sources are linked on each card (GDC Vault: Hi-Fi Rush toon rendering, Ghost of Tsushima procedural grass, Guilty Gear
Xrd art style; RedShark and 80.lv on Arcane; community Genshin breakdowns; 80.lv on lit pixel art).

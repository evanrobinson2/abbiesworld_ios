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

## Next

Read Evan's picks (`picks` collection), then move the shared shader into `prototypes/ranch-atelier/dist/simulations/`
as a toon-set module with the loved presets, wire time of day, wind and music signals, and hand Painted Brush to the
Meshy heroes and Texture Studio threads. Tour: no (a study).

Sources are linked on each card (GDC Vault: Hi-Fi Rush toon rendering, Ghost of Tsushima procedural grass, Guilty Gear
Xrd art style; RedShark and 80.lv on Arcane; community Genshin breakdowns; 80.lv on lit pixel art).

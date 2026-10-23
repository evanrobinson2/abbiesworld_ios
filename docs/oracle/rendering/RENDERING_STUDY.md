# Oracle rendering study: how Evan's games are shaded

Evan, 2026-10-23 12:25Z: "I asked you for a new set of toon shaders, but you also have game oracle. has it indexed
shaders? what can we learn from that? can you make a 'Shaders - What they don't teach you in 3D School' Article"

Article (live three.js): https://claude.ai/artifact/2qnHmuYv8iy5TV7BR4cW9z, source `shaders-article.html` here.

## Answer

Before this study the Oracle had no shading data: a one-line `art_direction` note per game, and Steam style tags
(realistic, pixel art, cartoon) on 119 of 370 catalog games. Now every studied game carries `identity.rendering`
(`oracle.rendering.v1`, filling the identity schema's `art.rendering` slot): style, family, light model, outline
source, surface, post effects, signature trick and lesson. 62 games are studied by hand
(`tools/steam-study/rendering_notes.py` HAND, confidence 0.4-0.8); 306 are read from their art notes by RULES
(0.15-0.3); 11 still need a play session. `python study_games.py` writes it; the Oracle game page shows
"How it's drawn".

## What the index says

- Light: physical 193, soft wrap 80, painted in 45, flat 38, stepped cel bands 12.
- Outlines: 19 of 368 games draw any outline.
- Evan's five (Tiny Glade, Dorfromantik, Besiege, Bricktales, 9 Kings) use no outlines and no hard bands. Their look
  is soft light, clean colour, contact shadows, a little air and depth of field.

## The nine rules (the article)

1. Shadows are a colour (sky tint), not black. 2. The light ramp is the art director (wrap, bands, softness).
3. Rim light draws the silhouette (masked off up-facing ground). 4. Outlines are geometry: an inverted shell, built
from smooth normals even on faceted models, thinning with distance. 5. Normals are a brush (sphere normals on tree
crowns and heads). 6. Grounding (contact shadows) beats cast shadows in a toy world. 7. Air is a shader; fog comes
from the sky colour. 8. Low resolution is a feeling. 9. One signal (time of day) drives every uniform.

## Proposed toon set (not built into the game yet)

One `ShaderMaterial`, seven presets of the same uniforms, no post-processing:
Sunday Toon (Ranch default, soft three bands, no ink), Ink Toon (school, brute fight), Clay (characters; the cheap
half of AW-STUDY-0028 Storybook), Paper Toon (papercraft, grain and halftone), Watercolour (maps, tile boards),
Moon Toon (Moonbase dialect, cyan rim), Pixel Toon (memory places, 8-bit coins). Storybook stays the film look for
cutscenes. Next step when Evan picks: move the shader into `simulations/` as a shared kit module and wire the
time-of-day signal. Tour: no (an article and an Oracle field, not a player feature).

Style, never expression: no game screenshots, art, shaders or code were used; the scene is primitives.

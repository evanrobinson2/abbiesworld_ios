# AW-STUDY-0040 - Texture Studio

Part of Evan's character studio (AW-STUDY-0037). Evan, 2026-10-23 13:44Z: "...then use the meshy characters after rigging
them as well, and then I need a texture studio for the meshy characters. by the end of the day I want to see walking 3D
characters of the caliber we see in movies (from a distance, using all the shaders...)".

Page: `prototypes/ranch-atelier/dist/studies/texture-studio/` (one full-screen studio; a grown-up workbench, not play).

## What it does
- Characters: the two rigged Meshy brutes from Brute Fight (AW-STUDY-0027, 20 bones, 19 clips including `walk_fwd`),
  each also in the Moon gear kit from the Bruiser study (`tools/bruiser-study/scale/out/brute*_gear`), bolted onto bones
  by part name (helmet to head, boots to feet, bracers to forearms, pads to upper arms, belt to hips, pack to chest).
- Looks (`looks.json`): Whimsical Clay, Stick Man Storybook, Plasticine Workshop (Wallace and Gromit style), Saturday
  Action (1980s cartoon action with a Marvel Rivals finish). Each gives every role (Skin, TankTop, Shorts, Armor, Light,
  Glass) a colour, a surface pattern, roughness, metal, sheen and clearcoat, and picks a shader.
- Texturing: the baked paint is split into shading (paint luminance over the part's original colour) and colour. The
  role of each texel comes from rasterising each named part's UV triangles. A look recolours per part, keeps the shading,
  adds pattern mottle (smudge, fingerprint, knit, felt, wood, brush), and can posterise; the same pattern becomes a
  tangent-space normal map.
- Paint: brush, rub out, fill a whole part (also by tapping armour or lights), on the body or on the flat UV card.
  Save downloads the texture PNG.
- Light: the shared toon kit (`simulations/toon-kit.mjs`): Sunday Toon, Clay (new, the cheap half of Storybook), Ink
  (shell outlines now follow skinned meshes, with normals averaged so faceted meshes don't crack), Film (plain PBR, ACES).
- Cameras: close, walking loop, from a distance (all four heroes walking, long lens, fog, soft shadows).

## Context engineering
Listed on the page's right card, from `studies/texture-studio/context.json`.

## Next
- Load the mannequin and its walks from AW-STUDY-0037 once rigged; the looks are data, so any rigged GLB with role-named
  materials wears them.
- Faces and hands per look; saved outfits; a real walk (the brute walk is a boxer's shuffle).

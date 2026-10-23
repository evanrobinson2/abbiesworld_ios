# AW-STUDY-0028 - Storybook Light

Evan, 2026-10-23 09:47Z: "new experiment, could we get shaders to portray this?" His picture is a soft, clay-like
animated-film frame: an old gardener, a small child and an older girl in a sunlit garden of twisted trees. The
picture is private reference only and is not in the repo; the study page lets him drop it in locally, and the
claude.ai preview carries it privately.

Page: `prototypes/ranch-atelier/dist/studies/storybook/index.html` (app.abbies.world/studies/storybook/).
Preview: https://claude.ai/artifact/Q566yNYkrgSe2HA2uyZCdw

## Answer

Yes. Every part of the look runs live in three.js r170 (the vendored build) with no new libraries. The stand-in
figures are primitives, so what is left between the study and the picture is mostly the models (sculpted soft shapes,
beard clumps, chunky hands, lawn density), not the shading.

## The parts, and how each is faked

All lighting is one `ShaderMaterial` ("clay") that uses three's shadow map chunks for sun shadows and does its own
lighting. The rest is a small hand-written post chain on half-float targets; no EffectComposer.

| Part | Where | How |
| --- | --- | --- |
| Soft light | clay shader | Smooth wrap ramp on N·L, sky-to-grass hemisphere bounce, warm front fill, a moving fbm leaf pattern projected down the sun direction so figures and ground share the same sun patches |
| Rim light | clay shader | Fresnel^3, weighted to the sun side and stronger when looking into the light |
| Glowing skin | clay shader | Red band at the light/shadow terminator plus back-light leak on thin parts (ears) |
| Soft shadows | post, half res | Depth-only ambient occlusion (14 golden-angle samples, normals rebuilt from depth), 5-tap blur, plus PCF sun shadows |
| Green haze | post | Distance fog with a height falloff, green near the ground to mint above, sun scatter; sky skipped via alpha 0 |
| Lens blur | post, half res | Single-pass scatter-as-gather bokeh (golden-angle disc, CoC from linear depth), so bright spots form round balls |
| Glow | post | Threshold at 1/4 res, two blur sizes (1/4, 1/8) added back |
| Colour grade | post | Saturation up, teal-green shadows, honey highlights, slight lift, then three's ACES and sRGB |

Plain three.js (left of the compare line) is the same scene with the soft light, rim and skin parts off and no post.

## Cost

Cheap: soft light, rim, skin, haze, grade. Medium: AO, glow. Heavy: lens blur (about 80 texture reads per half-res
pixel). The page steps resolution down when it runs under 40 fps.

## In the game

Sun colour, haze colour and grade are a handful of uniforms, so one game signal (time of day, weather, mood) can drive
them together, as `GAME_FEEL.md` asks. Fog here is in-world air (diegetic), the lens blur and grade are a camera look
on the presentation side; nothing masks the world at the edges (no vignette). Tour: no (a study, not a feature).

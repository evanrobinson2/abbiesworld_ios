# AW-STUDY-0052 - Light Study

Evan, 2026-10-23 19:41Z: "great work on the shaders now do a light study". Same format as AW-STUDY-0045 Inspiring Shaders.

Live page: `/studies/light/` (`prototypes/ranch-atelier/dist/studies/light/index.html`). Advance artifact: see the thread.
Picks (Love it / Maybe / Not for us, plus a note per look) save to the page's `picks` collection in the artifact, and on the
Ranch site go to the feedback inbox tagged with this thread.

## What it is

Fourteen lighting looks, each rebuilt in three.js on our own scenes, ranked for Abbie's World. A look is only numbers:
sun (colour, strength, angle), sky pair, ground bounce, fog, lamp colour and strength, window glow, rim, shadow softness,
tone mapping and a colour grade. Scenes: the Ranch, a Winchester diorama, the café, Grace's basement, the Moon base
(airlock and habitat) and a Halloween ranch.

1. Soft sky bounce (Tiny Glade): the Ranch base. 2. A day in Winchester (time-of-day table; Firewatch, Ghost of Tsushima).
3. Golden hour sweep (Ghost of Tsushima). 4. Window shaft café (Unpacking, Annapurna rooms). 5. On the beat (Hi-Fi Rush).
6. One bare bulb (Cocoon, Inside): basement. 7. Layered dusk (Firewatch). 8. Rim and long shadows (Journey).
9. Hard sun, no air (Outer Wilds): airlock. 10. Warm window, cold ground: Moon habitat. 11. Campfire night (Outer Wilds).
12. Flat pastel wash (Gris). 13. Candle-warm miniature (Moss). 14. Playful dusk (Dredge, tuned down): Halloween.

## The one signal

`KEYS` in the page is the day as six tables (dawn, morning, noon, golden hour, dusk, night) blended by a smooth step.
Window glow, lamp strength and stars are columns in the same table, so lamps come on at dusk with no scripting.
The same table is the proposed game clock: the sky behind every page in `LOOK.md`, the music, animals and people heading home read it.

## Performance bar (tile-placement standard)

One shadow map (1024), at most three point lights (no shadows), a fresnel rim inside the material, fog (free),
the colour grade is a CSS filter (free), no post-processing pass, and no object is rebuilt when the light changes.
Cards only render while on screen and dispose their WebGL context when they leave it.
No vignette, edge haze or backdrop blur anywhere: nothing masks the world.

## Match to the shader work

Painted Brush wants golden hour or candle-warm (warm key, teal rim). Watercolour wants the flat pastel wash.
Paint-the-world wants On the beat. Soft sky bounce sits under all of them.

## Design card

- What the player feels or knows: "It is morning, it is getting late, the café is warm, the Moon is cold and hard, and it is Halloween."
- How would the character know? The light is the world: long shadows, warm windows, lamps that come on.
- Mode: none and diegetic. The grade and the time slider are grown-up tools.
- Who it is for: the player. The pick board is a grown-up tool.
- The whole game adapts: one clock value drives sky, sun, shadow tint, fog, lamps, window glow, music and animals.
- Halloween: playful-tense, never scary: violet dusk, orange pools, thin fog, an exposure floor so nothing hides.
- Tour: **no**. A pick board and a lighting kit, not yet a player feature. The in-game version gets its own tour line once it ships.

## After Evan picks: plan for the game (production = in the game)

1. Read his picks (`picks` collection or the feedback inbox).
2. Add `simulations/light-kit.mjs`: the rig as data (the tables in this page), `dayAt(clock)`, `applyLook(scene, look)`,
   with the fresnel-rim material patch as a shared option. Reuse the presentation-layer rule: lights are world-layer, the grade is presentation.
3. Wire the Ranch to Soft sky bounce plus the day table first (one clock value from the game state); then the three
   Winchester regions with a table each, the café window and pendants, the basement bulb, Moon base airlock and habitat.
4. Halloween keys ship with the Halloween game on Evan's go.
5. Check each in the tile-placement lag test (his RTX 4070 Ti), and phone.

## Sources

Listed per card and in `studies/context.json` under `light`. Style only: no game screenshots, textures, shaders or code used.

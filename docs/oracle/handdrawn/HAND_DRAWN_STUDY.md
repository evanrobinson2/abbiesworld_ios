# AW-STUDY-0051 - Drawn by Hand, 12 Frames

Promotes pick #8 of the Inspiring Shaders study (AW-STUDY-0045, Guilty Gear Xrd) to a production look. Evan, 2026-10-23: "Drawn by hand, 12 frames <- that seems more useful effectually."

Reading of the note: keep Xrd's limited-animation 3D (held poses, designed two-band light, a pen line that swells and thins) and ship it as a switch for any figure.

- Kit: `simulations/hand-drawn.mjs` (a preset of Painted Brush plus a stepped clock, `stepMixer`, optional stepped camera, hit hold). `painted-brush.mjs` gained `grain`, `boil`, `inkVary`, all 0 by default so existing looks are unchanged.
- In the game: brute fight pencil button, `?look=hand|toon`, remembered per device. Default is the existing look. Character Studio has a "By hand" direction.
- Page: `/studies/hand-drawn/` (Study tab, Production assets tab with the twelve-drawing ladder, API and preset).
- Frame time: same single shader program as Painted Brush, uniforms only; `H.warm()` precompiles. Pose stepping skips the mixer between drawings.
- Tour: no. Style yes, expression never. PG.
- Not done: Paint the world and Watercolour distance threads own the land looks; this one dresses figures only, so the three compose by layer. No default-on in any scene until Evan says.

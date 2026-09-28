# Rescue storyboard scaffold

Serve this directory on localhost:8769. The default page is the eight-scene director storyboard. `motion-study.html` preserves the earlier visual experiment; its script is superseded and is not the new narrative.

`storyboard.json` is the scene contract: intent, emotion, full visual inventory, action, text, sound, motion, transition, missing art and suitability verdict. `visual-review.json` categorizes the three inspected existing images. `../STORYBOARD.md` is the complete readable treatment.

The scaffold implements scene selection, timed progression, pause, next/previous, URL fragments and a held final handoff. Blocking boxes are deliberately labeled; they are not character designs or finished art. The final button emits `prologue:complete` with `preview: true`; it does not launch gameplay. Timing playback has no audio or final animation.

Production work remaining: approved scene/action plates, verified dog reference, continuity review, reusable animated renderers, soundtrack and native game integration.

## Conflict cut

Open `rescue-cut.html` for the 44-second silent working edit; `conflict-review.html` explains selected/rejected art. Data-driven shots in `rescue-cut.js` define durations, panel rectangles, camera moves, timed text and imagery. The player supports replay, seeking, chapter selection, keyboard controls and reduced motion. Images preload; unavailable media is explicitly identified rather than silently substituted.

This is a review composition, not final art or production gameplay. Companion, soundtrack, exact character/prop continuity and game handoff remain outstanding. Original generation sources and reviews live under `AssetSources/MarbleVoyage/conflict-panels-2026-09-27`.

### Color and depth pass

Friends, bullies, departure and Abbie scenes now have an independently panning scenic layer from the inspected existing Sky Meadow painting. Scene-specific color treatment carries warm play into a darker interruption and a brighter rescue response. Raze and Vix use existing transparent portraits in the reveal.

`paper-layer.js` performs live near-white paper compositing on the generated Bramble and Abbie illustrations. Authored protected regions preserve face highlights; source files are unchanged. A soft outer edge blends the panel into its scenery. WebGL-unavailable or context-loss fallback shows the original image. GPU resources are disposed when a shot changes. Reduced motion holds the background at a stationary endpoint.

Validated in Chrome: paper layer initializes, source is hidden only after draw, face/fur inspected visually, scenery transforms change independently, reduced motion settles, no console warnings/errors. This remains a browser working cut.

### Title and net-scene revision

The current edit is 60 seconds. Opening and closing cards are reusable `card` entries. Abbie receives a timed name introduction. At the user’s request the original wide capture plate is now shown in full, followed by a full-width mesh close-up; review limitations on those generated designs remain recorded. Outro holds for replay and does not impersonate a production-game start.

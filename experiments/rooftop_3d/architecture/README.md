# A01 — Rooftop Lookout architectural basis

This is the current geometric design study. It replaces camera-led shape warping with an explicit plan, local coordinate frame, dimensions and member connections. It covers the rooftop terrace and its enclosing tree; the rest of the multi-room treehouse is outside this model.

Open `treehouse-architecture.blend`. `A01-architecture-sheet.png` / `.svg` show the deck plan, canopy-bearing section, neutral assembled frame and alcove elevation. `A04-deck-grid.png` / `.svg` make the carpentry grid explicit. `A01-spatial.png`, `A02-observer.png` and `A03-frame-cutaway.png` are actual Blender renders. The cutaway hides tree collections without moving any architectural part.

## Construction decisions

- The platform uses a 6.80 × 5.20 m bounding rectangle with a chamfer at the trunk recess. These are adopted game-scene dimensions, not measurements recoverable from the painting.
- Deck boards run along world Y. Joists cross along X. Three primary girders run along Y. The rear railing runs X, perpendicular to boards; the side return runs Y, parallel to boards. The alcove has its own explicit 45° frame at the chamfer. This rotation does not rotate individual deck members.
- A deck-edge opening receives the foreground fork. Interrupted joists terminate at an inner header, with doubled transverse trimmers at the opening. Seating has approximately 100 mm clearance from the evaluated fork at seating height.
- The rear canopy beam is also the alcove header. Both posts bear directly below it. Two knee braces carry the front beam. Seven rafters have actual modeled seats over the two beams; ten boards form the canopy above. Roof pitch is approximately 14.6°.
- The tree comprises a continuous hollow shell with a cut opening and a roof pocket, a foreground fork, and lower bearing limbs. These are schematic growth volumes, not finished bark sculpture. The top of the main stem is the extent of this study, not a designed flat-topped finished tree.
- The round-window feature is interpreted as a fixed recess above a bench. The painting does not establish a usable threshold or door opening. Hidden circulation and connection to other rooms remain unresolved. The front edge is the current study boundary toward the adjoining space, not a completed freestanding platform enclosure.

## Authority and reproducibility

`design.json` is the dimensional source. `build_architecture.py` creates the model from it. All parts are created before review cameras; there are no screen-space coordinates, camera-ray placements or camera-conditioned mesh deformations. `parts.json` identifies individual pieces and their roles. `derived.json` records derived levels.

`validate_architecture.py` reopens the saved model and checks actual geometry: board/joist/girder axes, rail directions, deck bearing levels, post/header alignment, rafter-seat vertices, ceiling contact plane, opening framing, tree/furniture clearance and a closed trunk shell. It also changes the camera and hashes the evaluated world-space geometry to verify that nothing moves or deforms. Results are in `validation.json`.

The same validation exports actual subfloor member bounds as `framing-footprints.json`; the framing drawing consumes those bounds rather than inventing another layout. `draw_architecture.py` generates the sheet and grid from the design and those footprints.

Rebuild from the repository root:

```sh
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python experiments/rooftop_3d/architecture/build_architecture.py
/opt/homebrew/bin/blender --background --factory-startup --python-exit-code 1 --python experiments/rooftop_3d/architecture/validate_architecture.py
python3 experiments/rooftop_3d/architecture/draw_architecture.py
```

## What this establishes

This pass establishes a coherent 3D architectural arrangement and inspectable bearing relationships. The checks verify geometry, not real-world structural adequacy. Detailed timber/tree joints, material finish, organic branch growth, foliage, lantern rigging, final source-camera alignment and whole-house circulation remain separate work.

Prior Meshy results and visual studies remain untouched. No new external generation was used. No native game or iPad integration is implied by the Blender model.

## A05 — source-composition camera and wire review

Open `treehouse-camera-scene.blend` for the assembled A01 model with the fitted camera active and original materials intact. `treehouse-camera-wireframe.blend` contains the same geometry with a pale material override and visible-edge rendering; its render is `A05-camera-wireframe.png`.

The camera is fitted to 12 window, sill, post and railing landmarks in the reference. It is at (2.344, -3.876, 2.350) m, using a 22 mm perspective lens and lens shift. `observer-camera.json` records the full camera and target/projection comparisons. Blender projection agrees with the fit; `camera-validation.json` confirms the evaluated geometry hash is unchanged from A01. This is an approximate camera match, not an exact recovery of the painting. The foreground fork and seating extend farther left than the painted silhouettes; the architectural grid remains fixed.

`fit_observer.py` fits only camera parameters. `camera_wireframe.py` reads the saved A01 model, sets the camera, verifies geometry and projection, and saves the two presentation scenes. It does not regenerate, deform or reposition architectural parts. Leaves, lanterns and background scenery are absent from this structure review.

## Camera direction from Evan

`camera-intent.json` records Evan’s spatial analogy: feel beside the foreground tree and couch, looking toward the door and mountain opening. The four-foot tripod was a metaphor, explicitly **not** a measurement or a height constraint.

A06 (`treehouse-composition-scene.blend`, `treehouse-composition-wireframe.blend`, `A06-camera-wireframe.png`) is a diagnostic fit that adds the near couch and trunk to the previous landmarks. It exposes the current adopted layout’s disagreement across the full composition. It is not promoted as a camera solution: the lens and horizontal shift hit their fitting bounds. The A01 geometry remains unchanged. `fit_composition_observer.py` and `composition_wireframe.py` reproduce this diagnostic; changing the adopted layout requires a distinct design revision.

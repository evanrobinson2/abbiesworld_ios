# Rooftop Lookout — assembled living-tree scene

This directory continues the architectural study into an assembled Blender scene. B10 is the current saved scene (`rooftop-current.blend`). Earlier scenes remain available for comparison.

The user’s intended viewpoint feels beside the foreground tree and couch, looking toward the doorway and mountain opening. The four-foot tripod analogy is **not** a literal measurement. Camera numbers are implementation details; the composition is judged as a whole.

## Design

- The window/door frame, bench, bearing posts and rear header retain the A01 placement. B09 replaces the short canopy with a deeper timber roof in the same architectural frame: 17 independent ceiling boards, 10 rafters, a front eave beam, a diagonal side bearer and a knee brace.
- The floor and railing share an explicit rotated deck frame. Planks run parallel to the long railing; joists run perpendicular; the next supporting girders cross the joists. Staggered board ends fall at joist positions.
- The tree is a continuous massive volume. The room is carved into it; the foreground trunk joins the enclosing body and three large bearing limbs beneath the platform. This replaces the earlier separate arch and rear shell.
- The sofa sits against the carved bark wall. Deck planks are trimmed to the tree volume. The tree’s carved floor level meets the primary girder undersides.
- Blossoms, foreground foliage, upholstery, lanterns, fallen petals, fairy lights, mountains and sky remain separate pieces or collections. Hiding foliage exposes the underlying structure.
- Lanterns pivot from their suspension points and have gentle keyframed sway. Nine independent petals have falling motion. These are Blender animations, not a native game implementation.

## Current files

- `rooftop-current.blend`: current complete editable scene and saved observer camera.
- `current-scene.png`: current assembled view.
- `current-without-foliage.png`: identical scene and camera with the two foliage collections hidden.
- `current-validation.json`: B10 record including B09 roof/contact verification and the separate lighting comparison. The upper trunk was modified to fit the roof; B08’s unchanged-whole-tree statement no longer applies.
- `current-design.json`: current world-space design notes.
- `B10-ceiling-detail.png`: closer view of the fitted ceiling under sheltered lighting.
- `B10-roof-on.png` / `B10-roof-off.png`: identical lighting, camera and exposure with only the new roof hidden in the second image.
- `rooftop-scene-b08.blend` / `B08-assembled.png`: preserved scene before the broad roof.
- `roof-validation-b09.json`: actual board planes, rafter seats, closed tree, preserved lower geometry and cushion contacts.
- `sheltered-lighting-b10.json`: exact fill-light changes.
- `B06-assembled.png`: preserved smooth-surface view before the bark and VFX pass.
- `bark_detail/B07-bark-closeup.png`: detailed bark under the original lighting.
- `bark_detail/B08-sunset-vfx.png`: bark plus sunset lights, atmospheric haze, saturation and bloom.
- `bark_detail/README.md`: material sources, settings, comparison files and limits.
- `B05-depth.png`: translated-camera view of the enclosing tree before the last right-jamb adjustment.
- `B04-tree-support.png`: outside structural view with foliage hidden; no geometry moved.
- `tree-enclosure-validation.json`: preserved B04 continuous-tree checks. B05/B06 reduce cushion compression to 12 mm at each back cushion.
- `design-b04.json`: world-space design and enclosing-tree / room-void description.
- `camera-intent` remains recorded in `../architecture/camera-intent.json`.

B03 (`rooftop-scene-b03.blend`, `B03-assembled.png`, `B03-depth.png`, `B03-wireframe.png`) preserves the previous complete scene with a smaller tree. Its `validation.json` records deck directions and bearing levels, independent cushion motion, unchanged geometry after camera movement, lantern suspension and petal motion. Those B03 checks are version-specific and do not constitute validation of later geometry.

## Rebuild

Run in order with the installed Blender executable:

1. `build_scene.py` opens A01 and builds B01.
2. `polish_scene.py` builds B02, including the framed deck opening and denser canopy.
3. `finish_scene.py` verifies and saves B03 and its depth/wire renders.
4. `enclose_tree.py` rebuilds the continuous tree, fits the room to it, verifies it and renders B04.
5. `refine_enclosure.py` sculpts its waist/overhead mass and adjusts cushion contact for B05.
6. `present_scene.py` widens the right bark return, checks current motion/camera independence and saves the current B06 scene.
7. `connect_twigs.py` anchors the 14 foliage twigs to the evaluated parent branch and refreshes the B06 renders. Preserve B06 as `rooftop-scene-b06.blend` before proceeding.
8. `bark_detail/build_bark.py` creates scanned bark plus true displacement, with architectural contact masks.
9. `bark_detail/light_bark.py` details the upper limbs and authors the sunset/VFX look.
10. `bark_detail/verify_bark.py` reopens B08 and checks it against B06. Preserve that verified scene as `rooftop-scene-b08.blend`.
11. `roof_ceiling.py` builds B09 from preserved B08, exposes the timber underside and verifies the lower tree/room.
12. `inspect_roof.py` reopens B09, checks actual board/rafter contacts and adds the ceiling inspection camera.
13. `sheltered_lighting.py` builds B10, reduces internal fill, and renders the roof on/off comparison. Current files are exact copies of the B10 scene and renders.

All geometry is authored in world or architectural coordinates before cameras. No source painting is projected over the scene. Bark combines a free CC0 Poly Haven scan, procedural shaping, true render-time displacement and fine bump; the source and exact checksums are in `bark_detail/provenance.json`. Other surfaces remain procedural Blender materials; prior Meshy trials are preserved separately. No additional generation credits were used.

## Remaining work

The scene is an editable desktop art build. The bark now has real relief and fine detail, with a first sunset/glow treatment. Natural branch transitions, bark art direction, softer upholstery and a less stylized distant landscape still need art polish. A real-time export requires baked materials, mesh/draw-call budgets and separate verification. iPad integration remains a later milestone. The off-camera continuation to the rest of the treehouse is outside this room model.

## Roof and light observations

The roof projects 4.15 m in the adopted scene, widening from 3.40 m at the back to 5.02 m at its front. These are design dimensions, not measurements recovered from the painting. It is independent of the tree and foliage. Its upper tree pocket was rebuilt as a closed surface; original lower vertices remain, with nine additional vertices on the existing bearing plane (maximum measured surface departure 0.00000024 m). All three cushion contacts remain -0.012 m with zero displacement at the contact faces.

B10 removes the under-roof amber and ceiling fill, reduces the frontal rosy fill and balances the exterior fill. The roof-on/off diagnostic holds lights, exposure and bloom fixed. The large tree already shades the alcove substantially, so the strongest visible darkening relative to the earlier B09 render comes from reduced artificial fill. This distinction matters: the roof gives real shelter, but bloom does not itself produce the physical lighting.

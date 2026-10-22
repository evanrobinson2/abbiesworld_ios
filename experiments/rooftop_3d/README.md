# Rooftop Lookout — a staged move into 3D

## Current assembled scene

The latest work is in `scene_v2/`: the revised room layout, full sunset arrangement, independent foliage and furnishings, and a continuous enclosing tree with thick deck-support limbs. See `scene_v2/README.md` and `review.html`. `architecture/` preserves the earlier dimensional baseline; the historical milestones below remain useful context.

## Brief
Rebuild the cherry-blossom rooftop shown in Evan's screenshot as a genuinely three-dimensional place: timber deck, living tree frame, round-window door, soft cushions, hanging lanterns, a distant mountain sunset. Keep the quiet, warm, sheltered feeling. The existing painted scene is the visual reference, not a texture pasted over the whole view.

One image does not establish hidden geometry, dimensions or material properties. Those must be designed and reviewed. The goal is recognizable composition and atmosphere, not a claim of automatic exact reconstruction.

## Milestones and review gates

1. **Composable spatial study (current: 1c, alcove correction)** — a library of independent pieces and a separate Blender arrangement; door, deck, rail, bare tree, cushions, lanterns and removable blossom clusters. Main, displaced, exploded and alcove close-up cameras. Pass when the place reads as the same rooftop, the second view demonstrates real depth, and the exploded view demonstrates separation. Deliberately simplified flowers, mountains and surfaces. No claim of finished art.
2. **Sunset, background and camera (current: 2a)** — render the existing assembled geometry with a reference-led camera, luminous peach sky, separate distant mountain layers, low amber sunlight and violet shelter shadows. Judge the large light/dark shapes and color relationships before adding detail. This is a Blender lighting study; runtime lighting parity remains unproven.
3. **One finished corner** — refine the window/tree/cushion corner under that lighting. Sculpt bark silhouette, improve weathered joinery, make soft upholstery and fuller blossom branches. Use Midjourney for additional visual/texture sources if needed; preserve provenance and prepare reusable textures. Review both a close view and a wide view before detailing the rest.
4. **Motion and desktop interaction** — first a short motion study with gentle lantern sway, drifting petals and a small camera move. Then build the interactive desktop view with orbit limits, a single tap interaction and optional motion. Prove effects independently and keep off switches.
5. **Real-time export proof** — convert procedural shading to supported PBR textures, export GLB for desktop inspection and USD/USDZ for a native loading probe. Reopen exports and inspect scale, normals, transparency and animation. Budget draw calls, triangles, texture memory and lighting from measured cost.
6. **iPad prototype (late phase)** — separate native test view based on the existing RealityKit viewer; load the approved scene and profile on the actual target iPad. Establish frame-rate/memory/thermal targets using that device. Preserve the painted room as fallback. Integration starts after visual, motion and export reviews.
7. **Game integration and child playtest** — opt-in rooftop view, room navigation, furniture placement/hit testing/occlusion, saved state, accessibility, Reduce Motion, loading/failure fallback and repeated device testing. Switch the production room only after review.

These are completion gates, not time estimates or percentages. iPad work begins after the first five gates. A rendered study does not imply artwork approval or replacement of the live room.

## Sunset study
`sunset-study.blend` is a separate arrangement that consumes the same piece library. `lighting_study.py` rebuilds it from the saved spatial study, replaces its distant environment and environmental light rig, and adds a camera framed from the balcony. Four individually removable modeled mountain profiles provide background depth. An emissive sky gradient provides the visible sunset; a low warm sun and area lights illuminate the actual meshes. There is no source-image projection.

The first pass still has placeholder bark, petals and upholstery. Its purpose is to judge the relationship between a sheltered violet/pink alcove and an open, luminous peach sky before detail and animation. It does not yet reproduce every color or shape of the reference.

## Composable pieces
The arrangement is an assembly, not a single fused model. `assets/rooftop-pieces.blend` stores 24 asset definitions. `rooftop-study.blend` links 30 placed instances from that library, while `assembly.json` records their independent placement transforms in meters. Keep the asset library beside the scene when moving the folder; its link is relative.

- The **deck contains only boards and its supporting timber**. No leaves, flowers, cushions or scattered petals are embedded in it.
- The **bare tree and nine blossom clusters are separate assets**. The clusters remain removable; their shape and distribution are placeholders. Falling and settled petals will be separate optional effects.
- **Each pillow is independently placed**, with three reusable cushion definitions serving nine placements. Their pivots sit at local bottom center. Rotate or move one instance without changing the others; edit the library definition to improve all copies.
- **Each lantern carries its own cord, ribs and light**, with a suspension pivot at the top of its cord. The timber frame and recessed rose window panel are separate. The panel has a lower-left placement pivot; no opening-door behavior is inferred from the artwork. Bench, roof slats and railing are separate pieces too.
- Mountains, cameras and environmental lights belong to the scene, independently of the asset library.

Open the assembly to arrange pieces. The library stores asset definitions without a staged editing scene. To inspect a definition, open the library, use the Outliner's Blender File mode to locate its collection, and link that collection into the working scene. Save changes to the library, then reload it in the assembly. The procedural builders recreate both files, so preserve manual sculpting in a separate authored asset before rebuilding.

## Alcove reference correction (1c)
The first model misread this feature as a narrow, tall door and added a brass knob absent from the source. The painting instead shows a broad recessed pink panel with a round gridded window, thick timber framing and a continuous horizontal beam above a low bench. The revised panel is 2.15 m wide by 2.44 m high, with a 1.46 m outer window diameter. These are authored proportions from the image, not measured real-world dimensions.

The round opening is cut through the panel. A shallow, flat wooden surround replaces the inflated torus, and the recessed luminous pane sits behind three vertical bars and two horizontal bars fitted to the circle. The panel has no knob. Nested trim, dark timber grain, wooden pegs, a lower pink wall and a low bench define the alcove. This is still a visual study: weathered irregular wood, final lighting and richer materials remain unfinished.

## Bark plan
The current tree has authored root flares, branching forms and modeled flutes, followed by one Meshy bark-material trial. The original smooth study remains preserved. Large twists, flared roots, knots and deep cracks need geometry because they affect the silhouette and cast shadows. Smaller grain belongs in color, roughness and normal textures. Lighting reveals that surface relief; post-processing provides the final glow and color treatment. Fine detail should follow the trunk and branches rather than stretching a vertical texture across their bends. Refine and inspect the isolated tree under neutral and rooftop lighting, then bake supported textures for the later real-time export.

## First material trial (3a)
Meshy authentication and a single 4K retexture job succeeded on a copy of the window timber. `meshy-material-study.blend` and renders 06–08 provide a comparison using the same camera and lighting. The candidate adds visible grain and curved detail around the window, but remains too clean and uniform for the reference. It has not replaced the reusable asset library. See `meshy_trial/README.md` for scope, fit measurements, provenance and the actual 10-credit cost. No credential is saved with the artifacts.

## Study deliverables
- `rooftop-study.blend`: editable spatial assembly, linked piece placements, four cameras and staged lighting.
- `sunset-study.blend`: separate lighting/background/camera study using the same piece library.
- `renders/05-sunset-study.png`: assembled sunset render.
- `lighting_study.py` and `sunset-study.json`: reproducible sunset setup and scope record.
- `assets/rooftop-pieces.blend`: reusable asset definitions with local coordinates and placement pivots.
- `assembly.json`: asset roles, pivots and independently saved placement transforms.
- `renders/01-rooftop-study.png`: main composition.
- `renders/02-depth-study.png`: moved camera using the same geometry.
- `renders/03-exploded-pieces.png`: pieces pulled apart to show composition; assembled pose remains saved in the source.
- `renders/04-alcove-revision.png`: assembled close-up of the reference-led window alcove correction.
- `review_history/01b/`: preserved before images for comparison.
- `alcove.py` and `alcove-study.json`: reproducible alcove geometry and its current proportions.
- `inspection.json`: actual scene measurements (not a mobile performance claim).
- `validation.json`: checks from reopening the saved assembly, resolving its library and moving one pillow's rendered geometry independently.
- `build_scene.py` and `modular_assets.py`: reproducible geometry, library assembly and rendering.
- `validate_assembly.py`: verifies saved links, placement, component separation and suspension pivots.
- `references/rooftop-source.png`: unchanged existing source plate.

Rebuild from the repository root:

```sh
blender --background --factory-startup --python-exit-code 1 --python experiments/rooftop_3d/build_scene.py
blender --background --factory-startup --python-exit-code 1 --python experiments/rooftop_3d/validate_assembly.py
blender --background --factory-startup --python-exit-code 1 --python experiments/rooftop_3d/lighting_study.py
```

Blender's documented background rendering workflow: https://docs.blender.org/manual/en/latest/advanced/command_line/index.html

## What remains intentionally rough
The distant terrain is stylized geometry and the flowers are low-detail instances. The tree now has modeled form and Meshy PBR textures, but its surface still needs deeper, more natural bark detail. The arrangement has not been prepared or validated for real-time use. No frog actor has been reconstructed. No particle simulation, animation export, mobile frame-rate proof or iPad integration in this first study. All geometry is authored in Blender; no image-generation tool substitutes for this model.

## Camera and enclosure correction (3c)

`enclosure-study.blend` is the current review scene, shown in `renders/15-enclosure-review.png`. It responds to Evan’s correction that the old perspective made the doorway look freestanding and omitted the surrounding trunk and ceiling. The scene now has a foreground arching trunk, thicker living bark behind both sides of the window alcove, and a separate solid timber ceiling. The ceiling slopes toward the rear lintel and remains independently editable. The railing, deck and cushions have been restaged for the revised observer.

`fit_camera.py` approximately fits nine hand-selected architectural landmarks from the reference, producing `camera-fit.json`. A horizontal perspective camera with vertical lens shift keeps the jambs upright; independently staged architecture and railing establish the corner. The fit is approximate and does not establish exact hidden geometry. The source image is never projected over the model.

`enclosure_study.py` rebuilds this arrangement from `bark-material-study.blend` (or the local bark study when the Meshy result is absent). The arrangement deforms a copy of the authored tree while retaining UVs; it never changes the model submitted to Meshy. The new tree returns, ceiling, floor and rail live in named asset collections. The flowers and nine cushions remain separate placements.

`meshy_bark_trial/README.md` records the specifically approved 10-credit bark job, fitting measurements and limitations. The material remains smoother than the reference; the current correction primarily establishes composition and enclosure. Natural bark sculpting, richer flowers, softer upholstery and final sunset matching remain open.

`validate_enclosure.py` reopens the saved scene and checks resolved libraries, packed textures, the unchanged uploaded-tree hash, component separation and independent pillow placement. It also renders a modest camera translation as `renders/16-enclosure-depth.png`. These are desktop Blender checks, not game-engine or iPad validation.

## Current architecture baseline: A01

Evan requested a designed structure rather than continued visual improvisation, then specified a consistent deck-building grid. `architecture/treehouse-architecture.blend` is the new geometric baseline, with a measured plan, roof-bearing section and elevations in `architecture/A01-architecture-sheet.png`. Boards and side railing share Y; the rear rail and joists run X; primary girders run Y. The tree opening has framing and the roof has modeled bearing seats. Geometry is independent of the camera. See `architecture/README.md` for the design authority, passed geometry checks, known assumptions and unfinished details. Earlier textured scenes are preserved visual experiments rather than the current architectural basis.

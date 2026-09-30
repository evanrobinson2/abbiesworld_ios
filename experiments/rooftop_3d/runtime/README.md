# Rooftop Lookout — native 3D candidate

This is a real RealityKit scene derived from `../scene_v2/rooftop-current.blend`, with textured geometry, a perspective camera, independently moving foliage/lantern groups, and pooled 3D petals. The image is not projected onto a flat screen or camera-facing room mesh.

## Enter it

From Abbie's treehouse, choose **Rooftop Lookout → Step into 3D**. **Back** returns to the existing room and its decorations. The 3D preview currently shows the authored furniture, not the player's movable inventory.

For a direct Debug launch, pass `-launchRooftop3D`. Add `-rooftopDiagnostics` to display scene/camera diagnostics and write `Documents/rooftop-performance.json` inside the app's sandbox. The debug direct launch returns to the normal app root when closed.

Drag gently to turn, pinch for a small zoom, or tilt an iPad. Pan and tilt combine within a 2.58° horizontal / 1.60° vertical limit in either direction. Zoom is limited to 1–1.045. The camera orbits very slightly about its original target so nearby bark and distant mountains show actual parallax. Camera input is damped; **Center** restores the original view and re-centers tilt. Rotating the device re-centers the motion baseline.

## Bounded work

- A fixed pool of 32 petals shares one four-triangle mesh and two materials. Paths use time and a deterministic seed; there is no rigid-body, fluid, cloth, wind-field or per-petal collision simulation.
- Six foliage groups and four lanterns rotate by small analytic angles. No vertex-by-vertex CPU animation.
- Motion updates run at most 30 times per second (20 in Low Power Mode or serious/critical thermal state), independently of RealityKit's render cadence. Constrained modes use only 12 petals.
- Reduce Motion stops automatic sway, falling petals and tilt; manual drag/pinch remains available. Backgrounding stops motion sensing and updates; resuming does not catch up elapsed simulation time.
- Static direct/indirect sunset light and roof shade are baked into conventional UV atlases. Bark keeps its low-frequency silhouette and baked surface shading. No live subdivision, displacement, area lights, dynamic shadow maps or volumetric fog.
- Twelve small depth-tested glow billboards share one 64px texture. This is an inexpensive local glow approximation, not full-screen bloom.
- Layers have opaque materials except the small glow sprites. Foliage consists of complete reduced flowers, avoiding broad alpha cards and excessive transparency overlap.

## Reproduce the asset

Run `export_runtime.py` with Blender 5.2 in background mode, then `export_glows.py`. The source `.blend` is only read. Both scripts write the new resource directory and export report; the original editable objects remain separate in the source.

The exporter reduces the tree, samples complete flowers, simplifies lantern ribs, batches static pieces by atlas, and bakes Cycles combined light. The latest foliage-only derivative uses a small color palette with directional tint to avoid tiny lightmap islands; this last derivative has not been visually accepted. The whole unlit lighting strategy is being reconsidered following the user’s visual review; see rendering-research.md. Lightmap PNGs use the Blender scene's view transform; RealityKit unlit materials disable a second tone-map pass. Meshes contain Y-up meter positions, normals, UVs and triangle indices. Runtime loading validates file lengths, finite floats and index bounds before creating any mesh resource.

Bark source/provenance remains in `../scene_v2/bark_detail/`: Poly Haven Bark Willow, CC0. No new paid generation or external upload was performed for this conversion.

## Verification and release gate

`RooftopSceneTests` checks deterministic long-running motion, the open-side entry path, camera bounds, corrupted meshes, bundled assets and geometry budgets. `RooftopSceneUITests` checks native loading, actual pan input, centering, breeze/tilt controls and background/resume. Evidence and build/test outcomes are recorded alongside this file.

Targets for a first hardware pass: <=180k scene triangles; <=24 static/moving atlas groups; <=128 MiB estimated decoded atlas memory including mipmaps; >=30 fps at the native iPad resolution. These are candidate budgets, not Apple's certification or proof of performance. `SceneEvents.Update` cadence and CPU transform timing do not measure GPU time.

Before promoting the preview to the default room: test the A16 and oldest supported iPad, capture Metal/GPU timings and memory, run at least 10 minutes for thermal/battery behavior, check Reduce Motion/Low Power Mode and physical tilt/rotation, and tune touch feel with Evan/Abbie. The source illustration's full foliage richness and cinematic bloom remain visual refinement work. Static baked shadows intentionally do not track the tiny foliage/lantern sways.

Current review state: user rejected visual fidelity. Seven targeted simulator tests passed before the latest foliage palette export. Hardware performance and physical tilt remain unverified. See AGENT_COORDINATION.md for the precise handoff.

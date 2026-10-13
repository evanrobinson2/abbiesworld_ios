# RealityKit lighting proof

This is an opt-in look-development study, not approved final art or a production performance claim. The user requested a warm, magical nook; the old unlit export is retained for comparison. `Lighting study` in the rooftop opens this scene; `Original prototype` returns to the old one. Both use the same starting camera.

## What is being tested

- Albedo, tangent normal and short-range contact occlusion maps replace baked direct lighting on the architecture, tree, deck and cushions. A shadowed low warm sun, pastel environment illumination and one reflected-light approximation light these surfaces at runtime.
- Expanded canopy, railing, window-side and foreground sprays use large leaves and complete cupped five-petal geometry, independently batched by branch, with a lit Metal material and a restrained transmission approximation. No alpha sorting or alpha-to-coverage dependence. 4× MSAA handles geometric edges.
- A geometry modifier applies small wind displacement using bounded time and one uniform per spray. There are still only 32 pooled falling petals, without simulation or accumulation. Pause/Reduce Motion controls apply to the new wind too.
- iPadOS 26 enables a half-resolution threshold/blur/composite glow effect. iPadOS 18.5–25 keep the same lit scene without this post-processing pass. This proof does not establish equivalent bloom across those versions.
- Shadows can be switched off for visual diagnosis. Large drag allows ±25.2° yaw and ±14.9° pitch; pinch covers 0.85–1.6× focal zoom. Physical tilt remains subtle. Reset view immediately restores camera input and recalibrates tilt.

## Reproducible assets

`export_lighting_proof.py` reuses the baseline mesh preparation but asserts a separate output directory and unlit albedo bake before execution. It reads `scene_v2/rooftop-current.blend`, never saves it, and writes `Resources/RooftopLightingProof`. `build_cherry_branch.py` creates the new curved sprays and their whole flowers. These are derivative meshes, not a painted projection of the reference.

The existing sky, mountain and lantern assets remain context. They are not yet part of the new material treatment. Bark UV density, upholstery shapes, roof silhouette, canopy composition and distant terrain still need art refinement. Switching modes rebuilds the scene intentionally so neither test affects the other.

## Validation

The initial six targeted simulator tests passed: baseline asset validity, bounded camera inputs, analytic motion, and the study's live shadow toggle, large pan/reset and return to baseline. Final resource and device checks are recorded in the coordination log once complete.

The original prototype was successfully installed and launched on the physical A16 iPad. An initial 601-frame sample reported 16.76 ms p95 scene-update interval, 1.19 ms average CPU motion work, nominal thermal state, and low-power mode off. This measures callback cadence/CPU work, not GPU timing, long-session thermal stability or visual correctness.

## Latest art revision

Evan requested substantially larger petals/leaves, much denser blossoms throughout the scene, and loose pillows laid on the sofa. Added overlapping canopy/railing/window/foreground sprays, large folded burgundy leaves and flattened/rotated the separate loose cushion objects before export. The original source scene and baseline remain unchanged. The study currently draws 337,774 triangles in 23 mesh groups. Estimated color/normal/contact textures are 123.25 MiB before mipmaps, about 164.3 MiB including mipmaps, excluding IBL/render targets/engine allocations. This is a visual proof budget, not a shipping target.

Final simulator suite: nine tests passed, including the new material/flower resource contract, wide camera/reset, shadow toggle, lifecycle, comparison switch and ordinary room entry/return. The final leaf-outline refinement was built for simulator/device and its mesh records/normals validated separately. Physical XCTest was blocked because the UI-test runner has no provisioning profile/account; the app itself signs and installs using its existing profile.

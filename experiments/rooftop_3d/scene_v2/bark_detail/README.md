# Bark and sunset look development

The B07 study replaces the smooth procedural trunk surface with scanned bark and true render-time displacement. B08 carries that material onto three upper limbs and adds the sunset lighting, haze, lantern glow, fairy lights, saturation and bloom in Blender. These effects do not wait for iPad integration.

## Review

- `B07-full-scene.png`: the first detailed trunk under the unchanged B06 lighting and camera.
- `B07-bark-closeup.png`: the actual trunk viewed closer, also under the B06 lighting.
- `B08-sunset-vfx.png`: the detailed trunk and branches with the new sunset treatment.
- `rooftop-bark-study.blend`: editable material study, including the subsequently detailed branches.
- `rooftop-sunset-vfx.blend`: complete editable sunset/VFX study.
- `final-validation.json`: checks against the preserved B06 camera, base tree and architecture.

## Detail is split across scales

The base mesh supplies the continuous enclosure and large tree form. A subdivided rendering mesh supplies real bark height, broken edges and self-shadowing. Scanned height also supplies smaller bump detail between displaced vertices; base color and roughness provide the fibrous surface. The material uses world-space/rest coordinates and three blended projections, with a longitudinal coordinate system along curved branches. Nothing is projected from the reference painting or camera.

Displacement is suppressed at the carved bearing plane and directly behind the couch cushions. The original base mesh and architectural layout stay intact. Leaves, pillows, lanterns and atmosphere remain separate objects/collections.

B08 uses real scene lighting and a separate distant scattering volume. Two compositor Fog Glow passes produce bloom; a saturation stage supplies a restrained overall grade. Fairy lights have been fitted onto the rebuilt tree surface, and lantern lights follow their animated suspension pivots.

## Source

[Bark Willow by Poly Haven](https://polyhaven.com/a/bark_willow), photography by Dimitrios Savva and processing by Dario Barresi. [CC0 license](https://polyhaven.com/license). The original 4K color, roughness and EXR height files are in `maps/`; exact source URLs and checksums are in `provenance.json`. Maps are packed into the saved Blender scenes. No generation credits were spent. The initial 1K cedar and willow samples remain as material-selection references.

## Reproduce

Run `build_bark.py`, then `light_bark.py`, then `verify_bark.py` in Blender. The initial input is the preserved B06 scene. All texture maps are already local.

## Limits

This is a desktop Cycles art build, not a mobile performance result. Displacement and materials will need baking and a mesh budget for a game asset. The large tree forms, furniture, foliage arrangement and distant terrain still need art refinement to approach the original illustration. The current detail pass proves a viable surface and lighting direction; it is not final-art approval.

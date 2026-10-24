# Blender reference recipe: one stylized organic biped

Issue #321. This is a proposed recipe, not a tested one. I could not run Blender in this session, so no number below has
been measured on a model built by it. Where a number comes from an existing hero it says so. Pin: **Blender 5.2 LTS**
(decision D4 in the integration doc). Option names for the glTF exporter are from background knowledge; check them against
the 5.2 manual before scripting (the manual page did not load during research).

Target character for the first run: an adult-proportion, toon-stylized "action hero" at 1.95 m to match cs-4, so the result
can be compared with an existing Meshy hero on the same moves. A child build follows in milestone M5.

Output folder (matches the repo rule that intent lives beside the asset): `characters/<id>/` with `brief.md`,
`params.json`, `build.py`, `notes.json`, `provenance.json`, `scores.json`, and the exported `<id>.glb`.

## Stage 1. Blockout (gesture, proportion, silhouette)

1. Set scene units to metres, scale 1.0. Front is +Y in Blender, which the glTF exporter turns into +Z with "+Y up" on.
2. Block the figure with simple volumes: head, ribcage, pelvis, upper and lower arms, hands, thighs, shins, feet.
   Proportions come from `docs/oracle/bodies/human-canon.json` for the chosen build (heroic: about 8 heads).
3. Pose the blockout in an A-pose, arms about 45 degrees below horizontal, matching the delivery spec.
4. Check the silhouette: fill the model black in a front and a side orthographic view; the pose and the role (hero) must
   read with no detail.

Acceptance (all measured in Blender on the blockout):
- Height 1.95 m within 1%; feet on z=0 within 1 mm.
- Landmark heights within 3% of the canon for the build (crown, chin, shoulder, elbow, wrist, crotch, knee, ankle).
- The ARTIST_METHOD silhouette and gesture checks score at least 4 of 4 combined.

## Stage 2. Base mesh and topology

1. Build one half and mirror (Mirror modifier, clip and merge on), apply at the end of the stage only.
2. Target 8k to 10k triangles for the whole body; hands and feet are mitten-and-boot shapes at this budget (no fingers
   in the core). Fingers are decision D3.
3. Edge flow rules:
   - Three loops at each bending joint (crease plus one each side): shoulder, elbow, wrist, hip, knee, ankle, neck base.
   - Loops follow the muscle direction on the torso and thigh; concentric loops around mouth and eyes if a face is modeled.
   - Poles go on the shoulder cap, the upper chest and the back; none on a joint crease.
   - Quads on every deforming region; triangles allowed only on the soles, the hair cap and other rigid regions.
   - No n-gons, no loose vertices, no overlapping geometry, no non-manifold edges in the body.
4. Name materials by role: `skin`, `suit`, `boots`, `hair`. One material per role.
5. UVs: one non-overlapping layout, 1024 px target, texel density within 20% across the body, seams on hidden lines
   (inside arm, under hair, boot cuffs).

Acceptance (script-checkable, run by the validator in milestone M0):
- Triangle count 6,000 to 12,000.
- Zero n-gons; zero non-manifold edges; zero loose vertices; zero zero-area faces.
- Quad ratio on deforming regions at least 95% (computed on the mesh before triangulation).
- Material names exactly `skin`, `suit`, `boots`, `hair`; each used.
- UV islands do not overlap; UV coverage at least 60%; every vertex has a UV.

## Stage 3. Rig

1. Build the 20 deform bones with exactly these names and this hierarchy (from `rig.mjs`):
   `root` > `hips` > `spine` > `chest` > `neck` > `head`; `chest` > `clavicle_L/R` > `upperarm_L/R` > `forearm_L/R` >
   `hand_L/R`; `hips` > `thigh_L/R` > `shin_L/R` > `foot_L/R`.
2. Bone roll aligned so local axes are consistent L to R (mirror with a naming rule, not by hand). Bones connected inside
   a limb chain; each joint centre sits at the visual centre of the bend.
3. Keep control rig parts (IK handles, pole targets, FK/IK switch) in the authoring file under bone collections that are
   marked non-deform. They are not exported.
4. Add an IK setup for legs and arms in the authoring file for animating test poses; export only deform bones.

Acceptance:
- Exactly 20 bones exported with the exact names; the root is named `root`; no extra deform bones.
- Rest pose is an A-pose within 5 degrees of the target arm angle (45 degrees below horizontal).
- Symmetry: mirrored bone positions agree within 1 mm.
- `rigSkinned(T, scene, J, {})` loads it with no alias and returns a rig whose `bones.hips` exists.

## Stage 4. Skin weights and deformation tests

1. Parent with automatic weights as a start, then hand-clean shoulders, hips and the neck; use Weight Paint with vertex
   selection (Blender 5.1+ allows loop selection in this mode).
2. Normalise, limit to 4 influences per vertex, clean zero weights.
3. Pose the six extremes and keep the pose files in `notes.json`: arm straight up, arm across the chest, deep squat,
   torso twist 45 degrees, neck turn 60 degrees, high kick forward. These match joint ranges in
   `docs/oracle/bodies/anatomy.json`.
4. Fix collapses with extra edge loops or corrective shape keys driven by joint angle. A corrective is allowed only if it
   is baked into the exported mesh or skipped; correctives driven live do not survive glTF skinning (the glTF format
   stores morph targets, but our rig does not drive them from joint angles).

Acceptance (measured in the deformation script from milestone M2; thresholds are proposals to be calibrated on cs-4):
- Every vertex has between 1 and 4 influences; weights sum to 1.0 within 0.001; no negative weights.
- No vertex's total weight on bones from the other side of the body exceeds 0.01 (no cross-contamination).
- Volume at the shoulder, elbow, hip and knee at the six extreme poses stays within 25% of rest (proposal: calibrate).
- No visible self-intersection of the torso with the upper arm or the thigh with the belly at the six poses (visual check
  plus a mesh self-intersection count of zero on the torso region).
- Max single-vertex displacement from the rest pose at any pose is below the rest-pose distance to the farthest bone
  times 1.2 (catches tearing and spikes).
- Visual: contact sheet of the six poses next to cs-4 in the same pose, same camera, no tearing.

## Stage 5. Materials and look

1. Base colour only; no PBR maps are required for the toon looks. Bake ambient occlusion into vertex colour or a second UV
   set only if a look needs it.
2. The studio re-lights the model with its own looks (`clayMaterial`, storybook, comic). Test the character under at least
   two looks before accepting.

Acceptance:
- Exactly one texture of at most 1024 px; textures are sRGB for colour.
- The character reads at a glance under the clay look and the storybook look (screenshot of each, saved in the asset
  folder).

## Stage 6. Export

Use the glTF exporter in GLB mode with these settings (names from background knowledge, to confirm):

```python
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB',
    export_yup=True, export_apply=True,            # apply modifiers (mirror, subdivision are already applied)
    export_skins=True, export_def_bones=True,      # only deform bones
    export_influence_nb=4,                         # glTF client minimum: one JOINTS/WEIGHTS set
    export_animations=False,                       # animation is retargeted in the studio, not baked in the file
    export_morph=False,                            # shipping form; keep a second file with morphs for editing
    export_image_format='JPEG', export_jpeg_quality=90)
```

If shipping size matters, run `gltf-transform` meshopt after export and compare load time on a device (hypothesis H4).
Do not rely on meshopt before our loader path is confirmed.

Acceptance (milestone M0 validator):
- File loads in three.js `GLTFLoader` with no warnings and in the Khronos glTF Validator with zero errors.
- One skin; exactly 20 joints; names exactly as in stage 3; one `JOINTS_0` and one `WEIGHTS_0` set only.
- All joint indices in range; each vertex's weights sum to 1.0 within 0.001.
- Triangle count 6,000 to 12,000; bounding box height within 1% of the declared height; feet at y=0 within 1 cm.
- Faces +Z (the chest normal's dominant direction is +Z).
- Material names exactly the four roles; one image at most 1024 px.
- File size at most 2 MB without meshopt (the three existing heroes are about 1.0 to 1.5 MB).

## Stage 7. In-game verification

1. Add the character to `bodies.mjs` as one entry: `{id, name, short, kind: 'skinned', url, height}`.
2. Open the Character Studio, select the body, play six moves: walk, wave, jab-cross, ko, roll, jump, plus the two
   hardest extremes from the baked Quaternius set.
3. Open the Scores room with the new body selected and the reference pane showing the same move.
4. Measure feet on the ground: the lowest foot vertex stays within 2 cm of y=0 on the walk at stance contact.
5. On a real iPad and iPhone, record frame time with 1 and with 10 copies (milestone M1). Record the device models.

Acceptance:
- Contact sheet of the eight moves with no tearing, side by side with cs-4 on the same moves, saved into the asset folder.
- Score each of the six moves for weight, anticipation, follow-through, arcs, foot contact and balance using the existing
  rubric; at least 20 of 30 per move, matching the studio's pass line.
- Feet within 2 cm of the floor at stance contact.
- A measured table of frame time on at least one iPad and one iPhone. Until it exists, every budget in this recipe is a
  target.

## What can fail, and what to do

| Failure | Likely cause | Fix |
|---|---|---|
| Shoulder collapses on arm-up | too few loops, weights bleed to chest | add a loop, repaint, a corrective baked in |
| Candy-wrapper forearm | no twist bone | split forearm weights smoothly, or add an optional twist bone layer (D3) |
| Knee pops outward | poles on the crease | move the pole off the joint |
| Bones fail to load in the studio | name or hierarchy differs | fix names; use the `alias` map only for foreign rigs |
| Some GPUs ignore extra weights | more than one JOINTS set | limit to 4 and export one set |
| Feet float or sink | origin not at the soles | set the origin at the soles, re-check `footY` |

## Records to keep with the asset

The brief, the parameters, the script that built it, the six deformation-pose renders, the validator output, the scores,
the device table, and the source and licence of anything not made by us (`provenance.json`). A revision gets a new
version of the asset, with the request that caused it in `notes.json`; history is never overwritten.

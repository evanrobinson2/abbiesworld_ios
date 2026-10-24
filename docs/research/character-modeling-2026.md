# Character modeling for Character Builder: 2026 research

Issue #321. Research and design only; nothing here is implemented. Companion files:
[`character-builder-integration.md`](character-builder-integration.md) (what we have, the gap, the plan) and
[`blender-biped-recipe.md`](blender-biped-recipe.md) (one concrete recipe with acceptance criteria).

## How to read the evidence

Every claim carries one of three labels and one of two confidence marks.

- **Established**: mature practice, stable for years. Trust it.
- **New in 2026**: changed in the last year or so. Check it against your own build.
- **Hypothesis**: plausible, untested here. Needs a spike before anyone depends on it.
- **[F]**: I fetched the cited page during this research and the statement matches it.
- **[K]**: standard practice I am stating from background knowledge; I did not re-fetch a page for it. Treat as "verify before relying."

Mobile numbers are targets that need profiling on a real iPad and iPhone (milestone M1 in the integration plan). None of
them has been measured on our device set.

## 1. Anatomy, gesture, silhouette and proportion

**Established [K].** A character reads from its silhouette and gesture before any detail. Work in layers: gesture line,
construction masses (head, ribcage, pelvis as three blocks), then limbs, then detail. Proportion is the main style dial.

- Realistic adult is about 7.5 heads tall. Heroic adults stretch to 8 to 8.5 by lengthening legs. Children are about 5 to 6
  heads, with a larger head, shorter limbs, wider eye spacing and a low brow. Toy and chibi styles run 2 to 4 heads.
- Stylized children are built by changing proportion, not by scaling an adult. A scaled-down adult reads as a small adult.
- Heroic stylization: broaden shoulders and chest, narrow the waist, enlarge hands and feet, keep head size nearly constant.
  Ranges, not single values, are what a parametric system should store.

**In our repo.** `docs/oracle/bodies/human-canon.json` already stores landmark heights in heads for four builds (average,
heroic, skinny, heavy), `docs/oracle/bodies/ARTIST_METHOD.md` has a 12-check score out of 24, and
`docs/oracle/bodies/anatomy.json` holds joint types and ranges of motion. These are the reference values for any generator.
The gap is that no modeling code reads them; they are used for scoring and for drawing sheets.

**Recommendation.** Use the canon as the parameter schema's source of truth (integration doc section 4), and add a
"child" build that the canon does not have yet (decision D2).

## 2. Polygon modeling, sculpt-to-retopo and edge flow

**Established [K].**
- Edge loops follow the muscle and the crease: concentric loops around the shoulder, elbow, knee, mouth and eyes;
  three loops at a bending joint (one at the crease, one on each side) is the usual minimum for a clean bend.
- Quads for deforming regions. Triangles are fine on flat or rigid regions and are what the GPU draws anyway.
- Poles (vertices with other than four edges) go where they will not stretch: not on the crease of a joint, usually on the
  shoulder cap, chest or back. A five-edge pole at the shoulder is normal and survives a lot of deformation.
- Retopology: sculpt a high-detail form, then rebuild a clean low mesh over it by hand or with a guided tool, then bake
  normals back. For a stylized low-poly hero this is optional; direct polygon modeling from a box or a subdivided base is
  faster and gives cleaner flow.

**Source note.** I tried to fetch the Polycount edge-flow wiki and its site refused automated access, so the topology rules
above are background knowledge, not a fetched citation [K]. A reference to cite in the final recipe is still open
(decision D6); two good candidates are the Polycount wiki and the Blender Studio character-pipeline training.

**What Blender 5.2 LTS adds for modeling [F]** (released 14 July 2026, supported to July 2028; release page
https://www.blender.org/download/releases/5-2/): the Loop Tools operators To Circle, Space Edge Loops Evenly and Flatten
are now native; custom vertex data is interpolated on merge; selection through back-face-culled faces; and in sculpt mode
an Add Primitive tool plus a Scene Project brush, with the voxel remesher now preserving vertex-painted colour across
repeated remeshing. For our recipe the useful pieces are the native loop tools (even joint loops) and colour-preserving
remesh. **New in 2026.**

**Recommendation.** Pin the recipe to Blender 5.2 LTS. It is long-term supported, and `pip install bpy` can pin the same
major version so the headless build matches the interactive one (the repo already drives Blender through `bpy`; see
`docs/oracle/blender-techniques.md` and `tools/meshy-heroes/cleanup.py`).

## 3. Rigging, weight painting, IK/FK, correctives, face and locomotion

**Established [K].**
- A game humanoid is a tree of deform bones with a root, hips, spine chain, neck/head, clavicles, three-bone limbs and feet.
  Control rigs (IK handles, pole targets, FK/IK switches) live in the authoring file and are not exported; only deform
  bones go to the game.
- Weights: heat or voxel auto-weights as a start, then hand cleanup at shoulders, hips and the neck, then normalise and
  limit to four influences. Test by posing the extremes, not the rest pose.
- Corrective shape keys fix the few places linear blend skinning cannot (elbow candy-wrapper, shoulder collapse). They are
  one-off per joint, driven by joint angle in the authoring file.
- Facial animation in games is bone- or blendshape-driven. Apple's face tracking exposes 52 blend-shape coefficients, each
  0 to 1 (eyes, brows, jaw, mouth, cheeks, nose, tongue; for example `jawOpen`, `mouthSmileLeft`, `eyeBlinkLeft`)
  [F, count from background knowledge; the Apple page needs JavaScript and did not render, so the count is [K]].
  Using that set as the authoring vocabulary makes a character drivable by phone face capture later (hypothesis H3).
- Locomotion is solved by retargeting existing clips to the standard skeleton plus a foot-contact fix, not by hand keying
  each character. Our pipeline does exactly this already (integration doc section 2).

**Blender 5.x rigging facts [F].**
- 5.0: Geometry Attribute constraint; per-armature-instance bone visibility and selection (a Python API break for scripts
  that hide bones); a shape key panel overhaul. Nothing in 5.0 changes weight painting or IK.
- 5.1: loop selection in Weight Paint mode with vertex selection; a Replace Action operator; a Gaussian Smooth F-curve
  modifier; large animation evaluation gains on very big armatures and shape-key meshes (one vendor benchmark on one
  Linux machine, not ours).
- 5.2 LTS: In-Between tools in Object mode; Copy Constraints; Auto IK reverse works with non-connected parent bones; a
  Head/Tail slider for bone parenting; Duplicate and Rename for bones (useful for L/R mirroring with a naming rule).
  **New in 2026**, useful, none of it essential. The recipe must not depend on any of them.

**What this means for us.** Our skeleton is 20 bones (`rig.mjs` BONES). That omits fingers, toes, twist bones and any
face bones. It is right for mobile and for retargeting; it limits close-up hands and facial acting. Decision D3 is whether
to add an optional layer (hand fingers, a jaw and two eye bones) that stays out of the 20-bone core.

## 4. Procedural and parametric generation, modular accessories

**Established [K].** A base mesh with sliders (shape keys or target deltas) generates a family of bodies from one topology.
Because every body shares topology and weights, rigs, animation, clothes and accessories carry across.

**Tools [F].**
- **MPFB 2** (MakeHuman Plugin For Blender): sliders for age, build, gender and ethnicity; several rigs including Rigify;
  skins, clothes and assets; export to any format Blender supports including glTF. Code is GPLv3; bundled assets and
  anything made with it are CC0 (so commercial and closed use is allowed). Requires Blender 4.2 or later. Version 2.08
  is the first stable release, parts are described as rough, and standalone MakeHuman development has effectively stopped
  (CGChannel summary, March 2025; I did not read the add-on's own repository). It produces realistic adults, not toon
  children, and the topology is far above our triangle budget.
- **Our own `figure-kit.mjs`** builds figures at runtime in three.js from lofted skinned rings with welded normals, a
  `facet` value, UVs in metres and one mesh per material role. It is parametric already but not in the way a skeleton
  retargeter wants, because its parts are lofted along bones rather than a single shared-topology body.

**Recommendation.** Do not adopt MPFB as the base (wrong style, wrong density). Borrow its idea: one stylized base mesh
with shape-key sliders and a fixed weight set, authored once in Blender, exported once, sliders driven in the game as
morph targets (hypothesis H1). Details in the integration doc.

**Modular accessories.** Attach by named socket on a bone (the backpack already does this: `backpack-wear.mjs`,
`wearBackpack(chestBone, ...)`). Clothes that must deform with the body should be skinned to the same 20 bones and share
the body's materials roles (skin, suit, boots, hair). Rigid items (hats, props, packs) are bone-parented with an offset.

## 5. UVs, PBR and stylized materials, LOD, mobile and export

**Established [K].**
- One UV island layout per character, one 1024 px texture for a hero (our delivery spec already says so). Mirror L/R
  islands only where the art style allows; asymmetric detail is not mirrored.
- Stylized work can skip PBR maps: base colour plus a toon ramp or a baked ambient-occlusion term. The studio already
  re-lights heroes with `clayMaterial` and the storybook look, so the delivered texture only needs base colour.
- Materials are named by role (`skin`, `suit`, `boots`, `hair`); the engine reads the name as a shading role. This is a
  repo rule (CLAUDE.md "Modeling work").
- LOD for a 10k-triangle hero is mostly for crowds: a second level near 2 to 3k triangles and an impostor beyond. Do not
  build LODs until a crowd scene shows a frame-time problem (M1 measures this).

**glTF skinning rules (normative, from the spec) [F].** `JOINTS_n`/`WEIGHTS_n` hold four influences per set; weights must
not be negative; a joint may not appear twice with a non-zero weight on one vertex; float weights should sum to about 1;
all joint indices must lie inside the skin; joints in a skin must share a common root; the inverse-bind-matrix accessor
must hold at least as many matrices as joints and its last row must be `[0,0,0,1]`; and a client may support only one set
of four influences. That last point is why "at most four weights per vertex" is a hard rule for us, not a preference.
The three-hero GLBs I measured on `main` have one `JOINTS_0` set, 20 joints and 10,000 triangles each.

**Export and compression.**
- Blender 5.2 exports `KHR_meshopt_compression`/`EXT_meshopt_compression` **[F, New in 2026]**. The Khronos page lists
  `KHR_meshopt_compression` as a release candidate [F], so it is not yet a ratified extension; three.js reads the older
  `EXT_` form through `MeshoptDecoder` [K]. Use it only after confirming our loader path and only for shipping files.
- Draco is the other option [K]; it decodes slower on mobile and is poorer for animation data. Prefer meshopt for skinned
  characters (hypothesis H4, spike in M1).
- KTX2/Basis textures cut GPU memory on mobile [K]; a single 1024 px texture per hero is small enough that this is optional.
- Validate every export with the Khronos glTF Validator [K] plus our own checks (bone names, influence count, triangle
  count, material names, scale, facing). The acceptance table in the recipe lists them.

**Mobile and iPad budgets (targets, not measurements).**

| Item | Starting target | Why this number | Measured? |
|---|---|---|---|
| Hero triangles | 6k to 12k (spec), 10k delivered | our delivery spec; three heroes at 10k | not on device |
| Bones per skin | 20 core, 40 max with the optional layer | well under common GPU uniform limits [K] | not on device |
| Influences per vertex | 4 | glTF client minimum [F] | n/a |
| Texture per hero | one 1024 px | spec | not on device |
| Draw calls per hero | 4 (one per role material) | role-material rule | not on device |
| Characters on screen | to be decided by M1 | depends on shader cost of film-look post | no |

## 6. 2026 workflows: mature practice versus AI mesh generation

**Mature practice (Established).** Concept to hand-built or kit-built base mesh, retopo or direct low-poly, weights, rig,
retarget animation, export, verify in the engine. Predictable, scores well on topology and deformation.

**AI mesh generation (New in 2026, experimental).** Image-to-3D (Meshy, Hunyuan3D 2.0, Tripo and similar) produces a
textured mesh from an image or text in minutes, but the mesh is a dense triangle soup with no intended edge flow, so it
needs cleanup before it can be rigged.
- Hunyuan3D 2.0 [F]: a shape model plus a texture model, outputs a mesh (GLB/OBJ) and texture maps, needs about 6 GB of
  VRAM for shape and about 16 GB for shape plus texture. I could not read its licence terms from the page; **treat licence
  as unresolved** until someone reads the repository's LICENSE file (decision D5).
- **UniRig** [F]: autoregressive model that predicts skeleton and skinning weights for arbitrary meshes, trained on
  Rig-XL (over 14,000 rigged models). The authors report 215% better rigging accuracy and 194% better motion accuracy than
  prior academic and commercial methods on their datasets. The abstract gives no baselines and no licence; the numbers are
  the authors' own and have not been reproduced here. **Hypothesis** for our use: it might replace hand-weighting on
  Meshy output, but our own record says Meshy's own auto-weights tore the brutes' shoulders, and nothing here shows
  UniRig does better on our meshes.
- Our measured experience (repo, `tools/meshy-heroes`): Meshy meshes plus our cleanup script (merge 24 bones to 20,
  decimate to about 10k triangles, cap at four weights, split by material) gave three playable heroes with no tearing on
  six test moves (walk, wave, jab-cross, ko, roll, jump). One model, the stick man, was refused by Meshy's rigger.

**Recommendation.** Keep Meshy-plus-cleanup as the fast path for one-off heroes, because it is already working and
tested. Build a hand-authored parametric base (the recipe) for the characters that must be reusable: Abbie, Ani and the
family cast, the kids' character creator, and clothes. Use AI generation for concept art, props and background characters
only. This also matches the repo vision (`docs/MODELER_VISION.md`: preserve intent so whole experiences can be rebuilt):
a recipe and parameter file preserves intent; an AI mesh preserves only a result.

## 7. Trade-offs in one table

| Approach | Strengths | Weaknesses | Use for |
|---|---|---|---|
| Hand-authored base mesh plus shape-key sliders | clean flow, predictable deformation, reusable clothes and anims | most effort up front, needs a modeler or a long script | the cast, the creator |
| Meshy image-to-3D plus cleanup | minutes per hero, strong likeness | topology not authored, auto-weights unreliable, credit-capped, one-off | single heroes, background cast |
| MPFB 2 adult generator | free, many rigs, CC0 output | realistic style, high density, adults | reference for slider ranges only |
| Runtime lofted figures (`figure-kit`) | no assets, instant variation | not shared topology, harder to retarget | creatures, props, prototypes |
| UniRig-style auto rig | no manual weighting | unproven on our meshes, licence unknown | spike only (H2) |

## 8. Hypotheses to test, with kill criteria

| # | Hypothesis | Test | Kill if |
|---|---|---|---|
| H1 | One base mesh with about 12 shape-key sliders makes all stylized bodies with no re-weighting | build in Blender, export morph targets, set sliders in the studio | any slider combination tears a joint in the 6-move test |
| H2 | UniRig weights on a Meshy hero beat our cleanup weights at the shoulder | run on cs-4 and the red brute, score with the shoulder test | not clearly better, or licence blocks use |
| H3 | A 52-shape facial vocabulary can be added without exceeding the triangle budget | add to the base head only | head triangles exceed 15% of the body total |
| H4 | Meshopt shrinks the shipped GLB by half or more with no visible change | export the same hero both ways | load time or decode cost on iPad is worse |

## 9. Source list

Fetched this session [F] (all accessed 2026-10-24):
- Blender 5.0 animation and rigging release notes: https://developer.blender.org/docs/release_notes/5.0/animation_rigging/
- Blender 5.1 animation and rigging release notes: https://developer.blender.org/docs/release_notes/5.1/animation_rigging/
- Blender 5.2 LTS release page: https://www.blender.org/download/releases/5-2/
- glTF 2.0 specification, skins and `JOINTS_n`/`WEIGHTS_n`: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
  (I read the first 100,000 of about 115,000 characters; the rest was not read.)
- `KHR_meshopt_compression` (status: release candidate): https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_meshopt_compression/README.md
- UniRig abstract: https://arxiv.org/abs/2504.12451
- MPFB 2 summary (CGChannel): https://www.cgchannel.com/2025/03/check-out-open-source-blender-character-generation-plugin-mpfb-2
- Hunyuan3D 2.0 repository page: https://github.com/Tencent-Hunyuan/Hunyuan3D-2

Tried and not read: the Blender glTF exporter manual page (returned navigation only), the Polycount edge-flow wiki
(blocked), and Apple's `ARFaceAnchor.BlendShapeLocation` page (needs JavaScript). Statements that would have come from them
are marked [K].

In-repo references: `docs/oracle/bodies/` (human-canon, anatomy, ARTIST_METHOD), `docs/oracle/blender-techniques.md`,
`tools/meshy-heroes/README.md` (delivery spec), `docs/oracle/character-studio/CHARACTER_STUDIO.md`, `tools/ranch-rebuild/MODELER.md`.

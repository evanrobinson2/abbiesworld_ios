# Character Builder: inventory, gap analysis and plan

Issue #321. Design only; no implementation is claimed. Evidence and sources are in
[`character-modeling-2026.md`](character-modeling-2026.md); the build recipe is
[`blender-biped-recipe.md`](blender-biped-recipe.md).

There is no single module called "Character Builder" in the repository (searched `docs/`, `prototypes/`, `tools/`). What
exists is a set of character systems built at different times. This document inventories them as they are on `main`
(2026-10-24), then plans the one that was asked for: a reusable, parameterized, stylized-biped pipeline.

## 1. What exists today (validated against the code)

| System | Where | What it is | Rig | Notes |
|---|---|---|---|---|
| Character Studio | `prototypes/ranch-atelier/dist/studies/character-studio/` | Viewer and mover for any body that has the 20-bone skeleton; 55 scored moves, Quaternius mocap clips, the Scores room | 20 bones, `rig.mjs` `BONES`/`PARENT` | The integration point. Poses are Euler degrees per bone or world quaternions, `root` in hip heights |
| Meshy heroes | `tools/meshy-heroes/`, `.../studies/moon-mission/heroes/`, `.../character-studio/models/heroes/` | Image-to-3D, then `cleanup.py` (bpy) merges 24 bones to 20, decimates to about 10k triangles, caps weights at 4, splits materials | 20 bones | cs-1, cs-2, cs-4 each measure 10,000 triangles, 20 joints, one `JOINTS_0` set, materials skin/suit/boots/hair, 3 images, no morph targets (checked by reading the GLB headers) |
| Recipe characters | `character-studio/characters.mjs` | Wooden-mannequin parts rebuilt with new proportions; `buildCharacter(T, id)` returns a Group plus rest joints | `rigMannequin`, rigid parts, 30 parts | Four recipes (adventurer, inventor, stickman, hero); hidden in the UI since the Meshy-only rule |
| Figure kit | `simulations/figure-kit.mjs`, `simulations/figures/*.mjs` | Runtime lofted skinned surfaces, welded normals, `facet`, UVs in metres, one mesh per material role; `skeleton()`, `figureBuilder()`, `ik2()` | own per-figure skeleton | Used by young Daddy, human, black lab, grace-kid. Not the 20-bone names |
| Face kit | `simulations/face-kit.mjs`, `face-rig3d.mjs` | 18 expressions, visemes, FaceDriver; 3D face with jointed eyes/brows and a morph-target mouth (jaw, wide, pucker, smile, frown) | face parts on a toy character | Morph targets are built at runtime from a lip-loop recipe, not exported from Blender |
| Character study sandbox | `dist/character-study.mjs`, `character-variants.mjs`, `character-skeleton-utils.mjs` | Loads a third-party rigged GLB, clones it, recolours by dominant bone (hero/zombie palettes) | the source asset's own | `character-skeleton-utils.mjs` is three.js SkeletonUtils (`retarget`, `retargetClip`, `clone`) with its licence file beside it |
| Backpack wear | `simulations/backpack-wear.mjs` | `wearBackpack(chestBone, {height, offset})` attaches a pack to a bone at runtime | any bone | The existing accessory socket pattern |
| Canon | `docs/oracle/bodies/` | `human-canon.json` (landmarks in heads, four builds), `anatomy.json`, `ARTIST_METHOD.md` (12 checks out of 24) | none | Read by scoring and sheet-drawing tools, not by any modeling code |
| Animation | `character-studio/mocap/`, `tools/character-studio/quaternius/bake.mjs` | Quaternius CC0 clips baked to `q-*.json` (world quaternions); `rigSkinned(..., alias)` maps foreign bone names; retarget formula `q = D * A2T` | 20 bones | In-place travel speed from stance-foot slide; lift only for clips flagged `air` |

Delivery spec for any new hero (`tools/meshy-heroes/README.md`): 20 named bones, metres, +Z front, Y up, feet on y=0,
A-pose with arms about 45 degrees down (a T-pose also works), at most 4 weights per vertex, 6k to 12k triangles, one GLB,
materials by role, one 1024 px texture.

## 2. Gap analysis

Ranked by how much each one blocks a reusable character pipeline.

| # | Gap | Evidence | Effect |
|---|---|---|---|
| G1 | No shared-topology base mesh. Every hero is a one-off; the recipe characters are a different construction | three heroes are separate Meshy meshes; recipes are rigid parts | Clothes, accessories, sliders and fixes do not carry over |
| G2 | Skin weights are produced by auto-tools and a cleanup script, with no repeatable deformation test | brutes tore at the shoulder (recorded in CHARACTER_STUDIO.md); heroes were checked on six moves by eye | Quality is not gated by a number |
| G3 | The canon (`human-canon.json`) is not wired to anything that builds a body | canon is read only by scoring/drawing tools | Proportions cannot be set from the canon; a child build does not exist |
| G4 | 20-bone core has no fingers, toes, twist bones, jaw or eyes | `rig.mjs` `BONES` | Hands read as mitts; face acting needs a separate system (face kit) |
| G5 | Face morph targets exist only in the runtime face kit, not in exported characters | hero GLBs have no morph targets | A Blender-authored face cannot drive from the face kit's expressions |
| G6 | Stick man cs-3 is unrigged; Meshy's rigger refused it | recorded in the studio doc | Shows the Meshy path has a failure mode with no fallback |
| G7 | No device profiling; budgets are guesses | no iPad/iPhone frame-time record in the repo | The 10k triangle and 20-bone figures are targets, not measured limits |
| G8 | No export validation step | heroes are measured only when someone reads them | A bad GLB reaches `main` before anyone notices |
| G9 | Two retarget paths (our alias map plus `q = D * A2T`, and three.js SkeletonUtils in the sandbox) | `rig.mjs` and `character-skeleton-utils.mjs` | Duplicated effort; the sandbox path is not connected to the studio |
| G10 | The kit has no child proportion | canon covers adult builds only | Abbie and Ani are children, and they are the main cast |

## 3. Proposed pipeline

```
 canon + parameters ──> Blender base mesh (shape keys) ──> weights ──> export GLB ──> validate ──> studio / game
        ^                      |                                              |            |
        |                      └─ recipe (build.py), notes.json, provenance ──┘            └─ fails block the PR
   human-canon.json
```

Principles (match the repo's rules: intent lives in the repo, geometry comes from a recipe, material names are shading roles):

1. One stylized base biped authored in Blender by script, with the 20-bone core skeleton and weights fixed once.
2. Variation by shape-key sliders and by swappable skinned parts (hair, clothes), all sharing the base's weights.
3. Export a GLB per character with the sliders baked in (shipping form) and optionally the morph targets kept (editing form).
4. Every export runs a validator and a deformation test. A failing number blocks the change.
5. Meshy-style one-off heroes keep their existing path; they are not forced through the base mesh (decision D1).

### Parameter schema (proposed, `characters/<id>/params.json`)

```json
{
  "id": "abbie",
  "base": "biped-v1",
  "heightM": 1.15,
  "build": {"headsTall": 5.5, "shoulder": 0.9, "waist": 1.0, "hip": 1.05, "limb": 0.95, "hand": 1.1, "foot": 1.1},
  "head": {"scale": 1.18, "eyeSpacing": 1.1, "browLow": 0.6},
  "parts": {"hair": "pigtails-v1", "top": "tee-v1", "bottom": "shorts-v1", "shoes": "sneakers-v1"},
  "materials": {"skin": "#d6a07c", "hair": "#6a3b22", "suit": "#e86aa0", "boots": "#3a3a3a"},
  "face": "toon-v1",
  "tags": ["child", "pg"]
}
```

Rules for the schema: every number is a multiplier or a range-checked value from the canon (so a value outside the canon's
range for that build fails validation); no real names or addresses; no real faces; ids are repo-safe. The file is the
intent record next to `build.py` and `notes.json` for the asset.

### Interfaces to keep unchanged (validated)

- The 20 bone names and their parents (`rig.mjs`: `BONES`, `PARENT`). The base must produce exactly these.
- `rigSkinned(T, scene, J, alias)` must keep working on the output with an empty alias map. Verify with the existing
  studio load path and a `hips` lookup that is non-null.
- Material names `skin`, `suit`, `boots`, `hair` (shading roles for the looks).
- Facing +Z, Y up, metres, feet on y=0.
- `bodies.mjs` entry shape: `{id, name, short, kind: 'skinned', url, height, ...}`. A new character is one more entry, no
  new loader.

Anything beyond these (fingers, jaw, eyes, extra morph names) is additive and must not rename the core.

## 4. Prioritized plan

Each milestone is small, reviewable and has a stop condition. Estimates are effort guesses, not commitments.

| M | Name | Deliverable | Acceptance | Effort |
|---|---|---|---|---|
| M0 | Validator | `tools/character-studio/validate_glb.py` reading a GLB and checking the table in the recipe (names, influences, triangles, scale, facing, materials, skin limits); run on the three heroes | Passes on cs-1/2/4; fails a deliberately broken copy | 1 day |
| M1 | Device profile | A page that spawns N copies of cs-4 at 10k triangles with the production look; frame times on one iPad and one iPhone | A table in `docs/research/` with real numbers; budgets updated from targets to measurements | 1 day plus device time |
| M2 | Deformation test | `tools/character-studio/deform_test.mjs`: pose the six extremes (arm up, arm across, deep squat, torso twist, neck turn, high kick), render, and measure max vertex displacement spike and self-intersection at shoulder, elbow, hip, knee | Numbers on cs-4 and the red brute; thresholds proposed from them | 2 days |
| M3 | Base mesh spike | One adult-proportion stylized base built to the recipe, weights, 6-move test | Passes M0 and M2 thresholds; triangle count 6k to 12k | 3 to 5 days |
| M4 | Sliders | 8 to 12 shape keys; export with sliders baked; a studio page to set them | H1 holds on 10 random slider combinations | 2 to 3 days |
| M5 | Child build | Add the child proportion to the canon and a child preset on the base | ARTIST_METHOD checks scored; reads as a child at a glance with the silhouette test | 2 days |
| M6 | Parts | Hair, one top, one bottom, shoes as skinned parts on the base weights | Swap parts with no re-weighting and no tearing | 3 days |
| M7 | Face layer (optional) | Jaw and two eye bones plus 12 face morphs matching the face kit's expression names | H3 holds; face kit drives it | 3 days |

M0 to M2 are measurement and can run on the existing heroes before any new asset is made. M3 onward is only worth doing if
M2 shows that the current heroes' weights are the real problem, or if D1 chooses to build the cast on the base.

## 5. Decision points (the person decides; nothing proceeds until answered)

| # | Decision | Options | My recommendation |
|---|---|---|---|
| D1 | Is the main cast (Abbie, Ani, family) built on a shared hand-authored base, or stays one-off Meshy heroes? | Base / Meshy only / both | Both: Meshy for one-offs, base for the cast, because the cast needs clothes, ages and sliders |
| D2 | Add a child build to the canon (`human-canon.json` v1.2)? | Yes / No | Yes, it blocks Abbie and Ani |
| D3 | Add an optional hand/face bone layer beyond the 20-bone core? | None / hands only / hands + face | Hands + face only after M7 passes; keep 20-bone core unchanged |
| D4 | Blender version for the pipeline | 4.2 / 5.2 LTS | 5.2 LTS (supported to July 2028) |
| D5 | Which AI generators may make a shipped asset, and how? | Concept and props only / two-stage (a generator makes the low-poly mesh, then an upgrade pass) / yes after licence review | Two-stage, per Evan's 2026-10-24 01:15Z conclusion that ChatGPT is the better modeler and the two-stage process is best. The generator's output is the low-poly stage; the upgrade pass (cleanup, weights, validator) is ours. Log the tool and licence in `provenance.json` for each asset. Open: whether this also covers the main cast (D1) |
| D6 | Which topology reference do we cite and train against? | Polycount / Blender Studio / our own sheet | Make our own one-page edge-flow sheet from the first base mesh, cite both |
| D7 | Budget numbers | Keep 10k / lower after M1 | Decide after M1 measures it |

## 6. Risks

- **Scope creep into a character creator UI.** The kids' creator belongs to the player-facing grammar
  (`docs/design/INTERACTION_GRAMMAR.md`); this plan stops at assets and tests.
- **Style drift.** The studio's looks (toon, storybook, clay) re-light everything; a base authored for one look can fail
  another. Test every milestone under at least two looks.
- **Weights from a script can be wrong in subtle places.** M2 exists to catch that with numbers instead of eyes.
- **Licensing.** Any third-party mesh, rig or generator needs a licence line in the asset's `provenance.json` before use.
  CC0/CC-BY are fine; BY-SA, NC and personal-use are not.
- **Kids' faces and photos.** The face layer uses designed stylized faces only; never a real child's face, never cloned
  voices.

## 7. Repo process items for the PR that implements anything here

- A `whats-new.json` entry with `tour: true` or `tour: false` for any player-visible change.
- Sources in `prototypes/ranch-atelier/dist/studies/context.json` for the study's Context card.
- The `game-feel` check passes; no engine artifacts in the player's view.
- Asset folders keep `brief`, `provenance.json`, `build.py`, `notes.json`, scores and the files the asset replaces.

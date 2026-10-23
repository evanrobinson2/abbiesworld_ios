# AW-STUDY-0034 - Low-Poly Figure Fidelity

Page: `/studies/figures/` (before and after under the same light, beside the reference). Thread: "AW-STUDY-0034 - Low-Poly
Figure Fidelity". Ask (Evan, 2026-10-23 12:24Z): "spin a figure study for these 2.5D low poly characters, if we could
improve their fidelity then we could let shaders do their jobs."

## The problem
Young Daddy, bub and the girl in Grace's basement were piles of primitives (spheres, boxes, cylinders): 20 to 33
separate pieces each, flat shaded, no surface detail, the girl in one vertex-colour material. The storybook light
(AW-STUDY-0028) works on normals and thickness, so each primitive lit as its own lump, the seams showed, and the pixel
pass turned facets into noise.

## What was built
- `simulations/figure-kit.mjs`: figures as lofted surfaces (rings along a path) skinned to bones; normals welded by
  position within a crease angle and blended back towards the flat face by a per-part `facet`; UVs in metres; a per-vertex
  `thin` value for skin glow; one SkinnedMesh per material role; canvas textures and bumps (stripes, knit, denim, hair
  strands, fur, rubber); `storybookLook()` (rim, sheen, terminator band and light through thin parts on any
  MeshStandardMaterial, so it works on skinned meshes); `ik2()` two-bone IK.
- `simulations/figures/human.mjs`: one child recipe (head, face, hair, shirt, sleeves, arms to fingertips, shorts or
  jeans, socks, sneakers) that runs on any skeleton that gives it joints and bone names.
- `simulations/figures/young-daddy.mjs` (`makeYoungDaddy`) and `simulations/figures/black-lab.mjs` (`makeBlackLab`), with
  the contract the school jump (AW-STUDY-0032) uses: `update(dt, pose)`, `arms[i].hand`, `head`, `hit`, `mouth`, `bark()`.
- `simulations/grace-kid.mjs`: `loadGraceKid()` now reshapes the Quaternius CC0 skeleton into a child, keeps the clips'
  rotations (and the hips' travel, rescaled) and builds the body over it in her idle pose. Same API; round 2 stays as
  `loadGraceKidRound2()` for comparison.

## Numbers (live on the page)
Triangles go up for the kid and dog (about 1.4k to 6.3k, 1k to 2.7k) and down for the girl (16.6k to 4.9k); pieces fall
from 20-33 to 7-10 draw calls. All three are skinned with welded normals, textured surfaces and thin-part glow.

## Rules learned
- Shape before shader: the storybook light needs one continuous surface per material, not stacked primitives.
- Build a rigged figure in the pose it spends its time in (the girl in idle), so the face and shoulders are shaped
  where they are seen.
- Keep low poly as a look with `facet`, not as missing normals.

## Next
1. Midjourney turnarounds of young Daddy, bub and the girl when the Mac is up; tune each against all four views and
   score with `docs/oracle/bodies/ARTIST_METHOD.md`.
2. The school jump swaps its figures for these once its modules land (same function names).

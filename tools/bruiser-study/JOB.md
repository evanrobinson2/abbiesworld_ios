# AW-STUDY-0021 Bruiser Study: one Blender job

You are one job in a bake-off. Several methods compete to model ONE exact figure: a low-poly, faceted, bald bruiser
in a grey tank top and shorts, standing barefoot with arms hanging. Your job models one chunk of him as a Blender
Python recipe. The whole study only matters if the final figure is faithful, so model THIS figure, never an
"inspired" one: his blocky skull, heavy brow, nose, square jaw and stern mouth; huge faceted deltoids; tank top with
thin straps, a scoop neckline and a hem band; shorts with leg openings; hands with four fingers and a thumb each,
fingers slightly curled; bare feet with toes. Faceted planes like the reference (flat shading, not smooth, not
blobby, not "rubber hose"). Clay grey everywhere, as in the picture.

He is a HUMAN man with normal human anatomy, just heavily muscled: think of the body under the clothes first (skull,
ribcage, pelvis, limbs with real joints), then the clothes over it. Plain shorts have a smooth, flat front: never add
any crotch bulge, wedge or knob, and nothing between the legs but the shorts' plain inner seam. This is a kids' game.

All paths below are relative to `tools/bruiser-study/` in the repo (cd there first).

## Your assignment
Given in your prompt: the arm (A, B, C, D1, D2, D3), your chunk id, what you may look at, and (for sequential arms)
which chunks already exist. Chunk ids, names, what each owns and their reference-pixel boxes are in `chunks.json`.

- **Sees crop** (arm A): you may look ONLY at `ref/crops/<your chunk>.png`. Do not open `ref/bruiser.png`,
  `ref/mask.png`, other crops, or other jobs' files. `ref/crops/crops.json` tells you where your crop sits in the
  full frame (`to_ref`), which you need to place geometry.
- **Sees full** (arms B to D): you may look at `ref/bruiser.png` and any crop in `ref/crops/`. In parallel arms (B)
  do not read other jobs' recipes. In sequential arms (C, D*) read the recipes that already exist in your arm's folder
  and build onto them: meet their edges, match their scale and proportions. Do not edit them.

## What you write
One file: `runs/<arm>/<chunk>.py` with

```python
def build(k):
    ...
```

`k` is `bkit.py` (read it, and `../roman-kit/kit.py` which it wraps): `k.loft(name, rings, mat, cap_start, cap_end)`,
`k.ring(rx, ry, z, n, cx=, cy=)`, `k.tube(name, pts, radii, n, mat)`, `k.box`, `k.plate`, `k.mesh(name, verts, faces, mat)`,
`k.mirror_x`, `k.place`, `k.bevel`, and materials `k.SKIN`, `k.TANK_TOP`, `k.SHORTS`. Build in world space:
Z up, metres, feet on z = 0, figure centred on x = 0, facing -Y (toward the camera), crown at z = 2.0.
`k.px(col, row)` converts a full-frame reference pixel to world (x, z) on the figure's mid plane: use it to place
landmarks straight from the picture. Name objects by what they are (`thumb_L`, `brow`, `tank_strap_R`).
Depth (y) is yours to judge: the reference is a front view with slight perspective; keep forms plausibly round
in depth (a forearm is about as deep as it is wide). "His right" is on the image's left.

## How you check
```
python3 build.py --arm <arm> --chunks <ids to include> --focus <your chunk> [--crop-only] --who <arm>:<chunk>
```
- Arm A adds `--crop-only` and includes only its own chunk.
- Arm B includes only its own chunk.
- Sequential arms include the existing chunks plus their own (in the arm's order).

It prints the silhouette IoU and loss (loss: 0 is perfect) and writes `runs/<arm>/out/<tag>/compare.png`:
reference | your render from the study camera | overlay (red = reference only, cyan = yours only, grey = both).
Look at the compare sheet after every render (Read the PNG). Neighbouring chunks that are not built yet show as
red in the overlay; ignore those and judge your own region.

Budget, the same for every job so the bake-off is fair: **at most 8 renders, and stop by about 12 minutes**.
Plan from the picture first (measure landmarks with `k.px`), then iterate on the overlay.

## Rules
- Touch only your own recipe file. No git commands. No other files.
- Keep it under about 3,000 faces for your chunk. Hands and face get the detail; big planes stay big.
- Your final answer is one JSON object, nothing else:
  `{"arm": "...", "chunk": "...", "renders": N, "iou": <last full or crop IoU>, "loss": <last loss>, "notes": "<one or two sentences: what you matched, what is still off>"}`

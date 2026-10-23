# AW-STUDY-0021 - Bruiser Study

A bake-off: which way of splitting the Blender work gets closest to ONE exact figure (`ref/bruiser.png`, Evan's
reference, 2026-10-23)? Page: `prototypes/ranch-atelier/dist/studies/bruiser/` (reads `results.json`).

| Arm | Each job sees | Order |
|---|---|---|
| A | only its crop (`ref/crops/`) | six jobs in parallel, assembled after |
| B | the full image, owns one chunk | six jobs in parallel |
| C | the full image and the chunks built so far | head, chest, armR, armL, hips, legs |
| D1 | same as C | legs, hips, chest, armR, armL, head (feet up) |
| D2 | same as C | chest, hips, head, armR, armL, legs (torso out) |
| D3 | same as C | chest, hips, legs, armR, armL, head (face last) |

Files
- `chunks.json`: the six chunks and their reference-pixel boxes.
- `make_mask.py`: the reference silhouette (`ref/mask.png`) every arm is scored against.
- `stage.py`: the one camera (85 mm, level, matched so z = 0 is row 987 and the 2.0 m crown is row 53), lights, renderer.
- `bkit.py`: the modeling kit jobs build with (wraps `tools/roman-kit/kit.py`, adds `px()` from picture to world).
- `build.py`: build an arm's chunk recipes, render from the study camera, score with `tools/paper-warrior/loss.py`,
  per-part IoU, compare sheet, optional GLB. Each call logs to `runs/<arm>/log.jsonl`.
- `JOB.md`: the brief every job gets, identical across arms (same kit, same budget: 8 renders, about 12 minutes).
- `runs/<arm>/<chunk>.py`: the recipes; `runs/<arm>/out/all/`: the assembled render, compare sheet, score and GLB.

Second brute (`ref/bruiser-2-queued.png`) waits for the winning method.

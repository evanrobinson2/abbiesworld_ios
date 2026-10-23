# Roman kit, part by part

Each piece of the Roman soldier's kit built as its own game-ready model from Evan's Midjourney picks
(`tools/midjourney/outputs/roman-soldier-inventory`). This is the "model the parts" rule in `docs/MODELER_STATUS.md`
put into practice: granular detail lives in separate, named, scored parts, not in one fitted figure.

| Part | Concept (Midjourney job, image) | Outline match | Triangles |
|---|---|---|---|
| helmet | 615426e3, image 2 | 0.76 | 3,550 |
| cuirass | 699aa058, image 1 | 0.92 | 6,784 |
| shoulders (left and right) | b767ad24, image 2 | 0.67 | 3,600 |
| belt | 3c090e7c, image 1 | 0.85 | 1,978 |
| gladius | 75c42e65, image 1 | 0.91 | 420 |
| sandals (left and right) | 5756e8ae, image 3 | 0.78 | 2,120 |

Review desk (concept beside a 3D viewer, Reject / Adjust / Accept): https://claude.ai/artifact/Hf5MLkWn3ZUcng7D7uk6C5

## Layout

- `kit.py`: shared Blender helpers (lofts, plates, tubes, facet look, grounding, GLB export).
  Conventions: Z up, metres, origin at the footprint centre on the ground, front faces -Y.
  Materials are named by role (`Ivory`, `Bronze`, `Leather`, `LeatherSole`, `BladeIvory`).
- `parts/<part>/build.py`: the recipe; shape numbers live in `P`. `python build.py` writes `<part>.glb`.
- `parts/<part>/concept.png`, `concept_mask.png` (rembg isnet-general-use), `provenance.json`, `notes.json`.
- `score.py PART [--calibrate] [--render]`: silhouette IoU against the concept after bounding-box normalising both
  masks. The camera is found by grid search on the model (`cam.json`), so the score is a guide. Writes
  `r/score.json`, `r/hero.png` and `r/compare.jpg` (concept, render, overlap).

Needs Blender's Python module (`pip install bpy`), numpy, Pillow and rembg.

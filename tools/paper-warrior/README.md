# Paper warrior: loss-tracked image-to-3D loop

This is test case one for the imagination machine. It rebuilds Evan's folded-paper Roman warrior from one reference image, renders and scores each candidate against the image, revises it, and logs the loss every round.

Results page: https://claude.ai/artifact/He3iTbBCWNgP76wGvaMurx

## Layout

The scripts expect `../ref/target.png`, `../ref/mask.png` and `../out/` next to this folder.

- `build.py` builds the parametric armoured humanoid with bpy. The body is metaballs, decimated and then jittered; the armour is procedural bmesh paper pieces. Fast silhouette rasteriser and Cycles render.
- `loss.py` is the image loss: IoU, outline chamfer, SSIM, facet-edge correlation, tone.
- `run.py` builds and scores one parameter set. `judge.py` scores many sets with the same settings.
- `opt.py` runs a (1+1) evolution strategy over parameter groups and appends every evaluation to `out/loss_log.jsonl`.
- `reviser.py` is the fidelity-dial loop. It calls `claude -p` with Haiku, Sonnet or Opus as the reviser, keeps an edit only when the loss drops, and logs the cost.
- `finals.py` exports the LOD GLBs, renders the matched proof shot and the turntable. `provenance.py` writes `provenance.json`.
- `schema.md` is the parameter guide that the reviser model reads.

## Setup

```
python3 -m venv venv && ./venv/bin/pip install bpy==5.2.3 numpy pillow scikit-image scipy
```

Cycles runs on CPU. EEVEE needs libEGL and won't run headless here.

## Results (judged at 512 px, LOD1, 32 samples)

The judged loss went from 0.469 to 0.267, and IoU from 0.71 to 0.85. The final asset ships the paper-look variant, which judges at 0.278. Per-run histories and the full evaluation log are in `runs/`.

"""Diff 3D models against the reference picture's own silhouette.

Run: Blender -b -P tools/bruiser-study/recipe/diff_picture.py -- PICTURE_MASK.npy OUT_PREFIX MODEL.glb [MODEL2.glb ...]

For each model, sweeps the turn angle (yaw) to find the view the picture was taken from, frames
both by height (orthographic; the picture has some perspective, which this ignores), and writes
OUT_PREFIX_<model>.png (red = picture only, blue = model only, grey = both) and OUT_PREFIX.json
with the best yaw and the IoU.
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bruiser_lib as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
pic = np.load(argv[0])
prefix = argv[1]
models = argv[2:]
RES = 400


def fit_box(mask, res=RES, margin=1.08):
    """Crop a mask to its bounding box and place it in a res x res frame scaled by height,
    the same framing L.frame uses, so the two line up."""
    ys, xs = np.nonzero(mask)
    crop = mask[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
    h = crop.shape[0]
    target_h = int(round(res / margin))
    scale = target_h / h
    new_w = max(1, int(crop.shape[1] * scale))
    yi = np.minimum((np.arange(target_h) / scale).astype(int), crop.shape[0] - 1)
    xi = np.minimum((np.arange(new_w) / scale).astype(int), crop.shape[1] - 1)
    a = crop[yi][:, xi]  # nearest-neighbour resize (Blender's Python has no PIL)
    out = np.zeros((res, res), bool)
    y0 = (res - a.shape[0]) // 2
    x0 = (res - a.shape[1]) // 2
    ys2 = slice(max(y0, 0), max(y0, 0) + min(a.shape[0], res))
    xs2 = slice(max(x0, 0), max(x0, 0) + min(a.shape[1], res))
    out[ys2, xs2] = a[: ys2.stop - ys2.start, max(-x0, 0): max(-x0, 0) + (xs2.stop - xs2.start)]
    return out


target = fit_box(pic)
L.clear_scene()
result = {}
for path in models:
    name = os.path.splitext(os.path.basename(path))[0]
    obj = L.import_glb(path, name)
    best = (-1, 0, None)
    for yaw in range(-40, 41, 4):
        L.VIEWS["picture"] = (90, 0, yaw)
        m = fit_box(L.silhouette(obj, "picture", (RES, RES)))
        s = L.iou(target, m)
        if s > best[0]:
            best = (s, yaw, m)
    for yaw in range(best[1] - 3, best[1] + 4):
        L.VIEWS["picture"] = (90, 0, yaw)
        m = fit_box(L.silhouette(obj, "picture", (RES, RES)))
        s = L.iou(target, m)
        if s > best[0]:
            best = (s, yaw, m)
    L.save_rgb(L.overlay(target, best[2]), f"{prefix}_{name}.png")
    result[name] = {"model": os.path.relpath(path, L.STUDY), "best_yaw_deg": best[1], "iou_vs_picture": round(best[0], 4)}
    obj.hide_render = True
    print("DIFF", name, result[name], flush=True)
with open(prefix + ".json", "w") as f:
    json.dump(result, f, indent=2)

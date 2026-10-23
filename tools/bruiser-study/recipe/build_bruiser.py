"""Build the bruiser from a character card: MPFB body + Rigify rig, stylised and posed,
dressed by region, decimated to low poly. Renders screenshots next to the Meshy target.

Run: Blender -b -P tools/bruiser-study/recipe/build_bruiser.py -- CARD TARGET_GLB OUT_DIR
Writes OUT_DIR/out/recipe.glb, recipe_lowpoly.glb, recipe_rigged.blend; OUT_DIR/shots/ (four views and
head close-ups of ours and Meshy's, plus silhouette overlays); OUT_DIR/scores.json (silhouette IoU
against Meshy: body from four views, head from three close-ups).
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bruiser_lib as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
card_path = os.path.abspath(argv[0]) if argv else os.path.join(L.HERE, "character.fitted.json")
L.MESHY_GLB = os.path.abspath(argv[1]) if len(argv) > 1 else L.MESHY_GLB
OUT_DIR = os.path.abspath(argv[2]) if len(argv) > 2 else L.HERE
out = os.path.join(OUT_DIR, "out")
shots = os.path.join(OUT_DIR, "shots")
os.makedirs(out, exist_ok=True)
os.makedirs(shots, exist_ok=True)

card = L.load_card(card_path)
L.clear_scene()
body, rig = L.build_body(card)
import bpy  # noqa: E402
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "recipe_rigged.blend"))
smooth = L.bake(card, body, rig, "recipe")
low = L.decimate(smooth, card["lowpoly"]["ratio"], "recipe_lowpoly")
body.hide_render = True
L.export_glb(smooth, os.path.join(out, "recipe.glb"))
L.export_glb(low, os.path.join(out, "recipe_lowpoly.glb"))
meshy = L.import_glb(L.MESHY_GLB, "meshy")

# Scores are on the smooth recipe body (the one the fitter sees); the low-poly is checked too.
scores = {"body": {}, "head": {}, "body_lowpoly": {}}
for view in L.VIEWS:
    L.shaded(low, view, os.path.join(shots, f"recipe_{view}.png"))
    L.shaded(meshy, view, os.path.join(shots, f"meshy_{view}.png"))
    t = L.silhouette(meshy, view, (400, 400))
    o = L.silhouette(smooth, view, (400, 400))
    scores["body"][view] = round(L.iou(t, o), 4)
    scores["body_lowpoly"][view] = round(L.iou(t, L.silhouette(low, view, (400, 400))), 4)
    L.save_rgb(L.overlay(t, o), os.path.join(shots, f"overlay_{view}.png"))
for view in ("front", "three_quarter", "side"):
    L.shaded(low, view, os.path.join(shots, f"recipe_head_{view}.png"), (600, 600), head=True)
    L.shaded(meshy, view, os.path.join(shots, f"meshy_head_{view}.png"), (600, 600), head=True)
    t, o = L.silhouette(meshy, view, (300, 300), head=True), L.silhouette(smooth, view, (300, 300), head=True)
    scores["head"][view] = round(L.iou(t, o), 4)
    L.save_rgb(L.overlay(t, o), os.path.join(shots, f"overlay_head_{view}.png"))
for k in list(scores):
    scores[k]["mean"] = round(sum(scores[k].values()) / len(scores[k]), 4)
scores["faces"] = {"smooth": len(smooth.data.polygons), "lowpoly": len(low.data.polygons)}
with open(os.path.join(OUT_DIR, "scores.json"), "w") as f:
    json.dump(scores, f, indent=2)
print("SCORES", json.dumps(scores), flush=True)

"""Build the bruiser from a character card: MPFB body + Rigify rig, stylised and posed,
dressed by region, decimated to low poly. Renders screenshots next to the Meshy target.

Run: Blender -b -P tools/bruiser-study/recipe/build_bruiser.py -- [card.json]
Writes out/bruiser_recipe.glb, out/bruiser_recipe_lowpoly.glb, out/bruiser_recipe_rigged.blend
and shots/<model>_<view>.png plus shots/overlay_<view>.png.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bruiser_lib as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
card_path = argv[0] if argv else os.path.join(L.HERE, "character.fitted.json")
out = os.path.join(L.HERE, "out")
shots = os.path.join(L.HERE, "shots")
os.makedirs(out, exist_ok=True)
os.makedirs(shots, exist_ok=True)

card = L.load_card(card_path)
L.clear_scene()
body, rig = L.build_body(card)
import bpy  # noqa: E402
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "bruiser_recipe_rigged.blend"))
smooth = L.bake(card, body, rig, "bruiser_recipe")
low = L.decimate(smooth, card["lowpoly"]["ratio"], "bruiser_recipe_lowpoly")
body.hide_render = True
L.export_glb(smooth, os.path.join(out, "bruiser_recipe.glb"))
L.export_glb(low, os.path.join(out, "bruiser_recipe_lowpoly.glb"))
meshy = L.import_glb(L.MESHY_GLB, "meshy")

scores = {}
for view in L.VIEWS:
    L.shaded(low, view, os.path.join(shots, f"recipe_{view}.png"))
    L.shaded(meshy, view, os.path.join(shots, f"meshy_{view}.png"))
    t, o = L.silhouette(meshy, view, (400, 400)), L.silhouette(low, view, (400, 400))
    scores[view] = round(L.iou(t, o), 4)
    L.save_rgb(L.overlay(t, o), os.path.join(shots, f"overlay_{view}.png"))
print("FACES", len(smooth.data.polygons), len(low.data.polygons), "IOU", scores, flush=True)

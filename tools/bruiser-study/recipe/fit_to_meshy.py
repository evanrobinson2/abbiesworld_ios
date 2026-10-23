"""Fit the character card's stylise and pose knobs so our recipe body matches the Meshy model's
silhouette (front and side), and save a screenshot of every improvement.

Run: Blender -b -P tools/bruiser-study/recipe/fit_to_meshy.py -- [card.json]
Writes character.fitted.json, fit_log.json and steps/step_NNN.png (red = Meshy only,
blue = ours only, grey = both; front on the left, side on the right).
"""
import copy
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bruiser_lib as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
card_path = argv[0] if argv else os.path.join(L.HERE, "character.json")
steps_dir = os.path.join(L.HERE, "steps")
os.makedirs(steps_dir, exist_ok=True)
for f in os.listdir(steps_dir):
    os.remove(os.path.join(steps_dir, f))

VIEWS = ("front", "side")
# (section, key, step, lo, hi)
KNOBS = [
    ("stylise", "head", 0.08, 0.6, 1.4),
    ("stylise", "neck_girth", 0.1, 0.8, 1.8),
    ("stylise", "upper_arm_girth", 0.1, 0.8, 1.8),
    ("stylise", "forearm_girth", 0.1, 0.8, 2.0),
    ("stylise", "forearm_length", 0.06, 0.8, 1.3),
    ("stylise", "hand", 0.1, 0.8, 1.8),
    ("stylise", "thigh_girth", 0.08, 0.8, 1.6),
    ("stylise", "shin_girth", 0.08, 0.8, 1.6),
    ("stylise", "leg_length", 0.05, 0.7, 1.2),
    ("stylise", "foot", 0.08, 0.6, 1.4),
    ("shape", "torso/torso-scale-depth-incr", 0.25, 0.0, 2.5),
    ("shape", "torso/torso-muscle-dorsi-incr", 0.25, 0.0, 2.5),
    ("shape", "torso/torso-muscle-pectoral-incr", 0.25, 0.0, 2.5),
    ("shape", "torso/measure-shoulder-dist-incr", 0.25, 0.0, 2.0),
    ("pose", "arm_drop_from_vertical", 4, 0, 40),
    ("pose", "elbow_bend", 5, 0, 40),
]

card = L.load_card(card_path)
L.clear_scene()
meshy = L.import_glb(L.MESHY_GLB, "meshy")
target = {v: L.silhouette(meshy, v) for v in VIEWS}
body, rig = L.build_body(card)


def score(c):
    L.apply_card(c, body, rig)
    ours = {v: L.silhouette(body, v) for v in VIEWS}
    return float(np.mean([L.iou(target[v], ours[v]) for v in VIEWS])), ours


def snapshot(n, s, ours):
    img = np.concatenate([L.overlay(target[v], ours[v]) for v in VIEWS], axis=1)
    L.save_rgb(img, os.path.join(steps_dir, f"step_{n:03d}.png"))


best, ours = score(card)
log = [{"step": 0, "iou": best, "change": "start"}]
snapshot(0, best, ours)
print(f"START iou={best:.4f}", flush=True)
n = 0
steps = {k: st for _, k, st, _, _ in KNOBS}
for rnd in range(4):
    improved_any = False
    for sec, key, _, lo, hi in KNOBS:
        for sign in (1, -1):
            while True:
                trial = copy.deepcopy(card)
                v = min(max(trial[sec][key] + sign * steps[key], lo), hi)
                if v == trial[sec][key]:
                    break
                trial[sec][key] = round(v, 3)
                s, o = score(trial)
                if s > best + 1e-4:
                    n += 1
                    best, card, ours = s, trial, o
                    log.append({"step": n, "iou": round(s, 4), "change": f"{sec}.{key} -> {trial[sec][key]}"})
                    snapshot(n, s, o)
                    print(f"STEP {n} iou={s:.4f} {sec}.{key}={trial[sec][key]}", flush=True)
                    improved_any = True
                else:
                    break
    for k in steps:
        steps[k] /= 2
    if not improved_any and rnd > 0:
        break

out = os.path.join(L.HERE, "character.fitted.json")
card["fit"] = {"target": "meshy/bruiser_meshy.glb", "views": list(VIEWS), "silhouette_iou": round(best, 4), "steps": n}
L.save_card(card, out)
with open(os.path.join(L.HERE, "fit_log.json"), "w") as f:
    json.dump(log, f, indent=2)
print(f"DONE iou={best:.4f} steps={n}", flush=True)

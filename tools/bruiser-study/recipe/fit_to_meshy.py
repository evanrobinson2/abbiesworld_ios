"""Fit a character card's knobs so our recipe body matches a Meshy model's silhouettes, and save a
screenshot of every improvement.

Run: Blender -b -P tools/bruiser-study/recipe/fit_to_meshy.py -- CARD TARGET_GLB OUT_DIR [body|head]

  body (default): whole-body knobs, scored on front, three-quarter, side and back.
  head:           head knobs only, scored on close-ups of the head from front, three-quarter and side.

Writes OUT_DIR/character.fitted.json, OUT_DIR/fit_log_<mode>.json and OUT_DIR/steps_<mode>/step_NNN.png
(red = Meshy only, blue = ours only, grey = both; one panel per view).
"""
import copy
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bruiser_lib as L  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
card_path = os.path.abspath(argv[0]) if argv else os.path.join(L.HERE, "character.json")
L.MESHY_GLB = os.path.abspath(argv[1]) if len(argv) > 1 else L.MESHY_GLB
OUT_DIR = os.path.abspath(argv[2]) if len(argv) > 2 else L.HERE
MODE = argv[3] if len(argv) > 3 else "body"
steps_dir = os.path.join(OUT_DIR, f"steps_{MODE}")
os.makedirs(steps_dir, exist_ok=True)
for f in os.listdir(steps_dir):
    os.remove(os.path.join(steps_dir, f))

UPPERARM_SHOULDER = ("arms/l-upperarm-shoulder-muscle-incr", "arms/r-upperarm-shoulder-muscle-incr")
UPPERARM_MUSCLE = ("arms/l-upperarm-muscle-incr", "arms/r-upperarm-muscle-incr")
LOWERARM_MUSCLE = ("arms/l-lowerarm-muscle-incr", "arms/r-lowerarm-muscle-incr")

# (section, key or (keys moved together), step, lo, hi)
BODY_KNOBS = [
    ("stylise", "head", 0.08, 0.5, 1.4),
    ("stylise", "neck_girth", 0.1, 0.8, 2.0),
    ("stylise", "upper_arm_girth", 0.1, 0.8, 2.0),
    ("stylise", "forearm_girth", 0.1, 0.7, 2.0),
    ("stylise", "forearm_length", 0.06, 0.7, 1.3),
    ("stylise", "hand", 0.1, 0.8, 2.0),
    ("stylise", "thigh_girth", 0.08, 0.7, 1.6),
    ("stylise", "shin_girth", 0.08, 0.6, 1.6),
    ("stylise", "leg_length", 0.05, 0.55, 1.2),
    ("stylise", "foot", 0.08, 0.5, 1.4),
    ("shape", "torso/torso-scale-depth-incr", 0.25, 0.0, 4.0),
    ("shape", "torso/torso-muscle-dorsi-incr", 0.25, 0.0, 3.0),
    ("shape", "torso/torso-muscle-pectoral-incr", 0.25, 0.0, 3.0),
    ("shape", "torso/measure-shoulder-dist-incr", 0.25, 0.0, 3.0),
    ("shape", UPPERARM_SHOULDER, 0.25, 0.0, 3.0),
    ("shape", UPPERARM_MUSCLE, 0.25, 0.0, 3.0),
    ("shape", LOWERARM_MUSCLE, 0.25, 0.0, 3.0),
    ("pose", "arm_drop_from_vertical", 4, 0, 40),
    ("pose", "elbow_bend", 5, 0, 40),
]
HEAD_KNOBS = [("head", k, 0.25, -1.5, 2.5) for k in L.HEAD_KNOBS] + [("stylise", "head", 0.04, 0.5, 1.4)]

if MODE == "head":
    KNOBS, VIEWS, HEAD = HEAD_KNOBS, ("front", "three_quarter", "side"), True
else:
    KNOBS, VIEWS, HEAD = BODY_KNOBS, ("front", "three_quarter", "side", "back"), False


def get(card, sec, key):
    keys = key if isinstance(key, tuple) else (key,)
    return card[sec].get(keys[0], 0.0)


def put(card, sec, key, v):
    for k in key if isinstance(key, tuple) else (key,):
        card[sec][k] = v


def name(sec, key):
    return f"{sec}.{key[0].replace('/l-', '/both-') if isinstance(key, tuple) else key}"


card = L.load_card(card_path)
card.setdefault("head", {k: 0.0 for k in L.HEAD_KNOBS})
for sec, key, *_ in KNOBS:
    put(card, sec, key, get(card, sec, key))
L.clear_scene()
meshy = L.import_glb(L.MESHY_GLB, "meshy")
target = {v: L.silhouette(meshy, v, head=HEAD) for v in VIEWS}
body, rig = L.build_body(card)


def score(c):
    L.apply_card(c, body, rig)
    ours = {v: L.silhouette(body, v, head=HEAD) for v in VIEWS}
    per = {v: L.iou(target[v], ours[v]) for v in VIEWS}
    return float(np.mean(list(per.values()))), per, ours


def snapshot(n, ours):
    img = np.concatenate([L.overlay(target[v], ours[v]) for v in VIEWS], axis=1)
    L.save_rgb(img, os.path.join(steps_dir, f"step_{n:03d}.png"))


best, per, ours = score(card)
start = (best, per)
log = [{"step": 0, "iou": round(best, 4), "per_view": {k: round(v, 4) for k, v in per.items()}, "change": "start"}]
snapshot(0, ours)
print(f"START {MODE} iou={best:.4f} {per}", flush=True)
n = 0
steps = {name(sec, key): st for sec, key, st, _, _ in KNOBS}
for rnd in range(4):
    improved_any = False
    for sec, key, _, lo, hi in KNOBS:
        nm = name(sec, key)
        for sign in (1, -1):
            while True:
                cur = get(card, sec, key)
                v = round(min(max(cur + sign * steps[nm], lo), hi), 3)
                if v == cur:
                    break
                trial = copy.deepcopy(card)
                put(trial, sec, key, v)
                s, p, o = score(trial)
                if s > best + 1e-4:
                    n += 1
                    best, per, card, ours = s, p, trial, o
                    log.append({"step": n, "iou": round(s, 4), "per_view": {k: round(x, 4) for k, x in p.items()}, "change": f"{nm} -> {v}"})
                    snapshot(n, o)
                    print(f"STEP {n} iou={s:.4f} {nm}={v}", flush=True)
                    improved_any = True
                else:
                    break
    for k in steps:
        steps[k] /= 2
    if not improved_any and rnd > 0:
        break

L.apply_card(card, body, rig)
card.setdefault("fit", {})
card["fit"][MODE] = {
    "target": os.path.relpath(L.MESHY_GLB, L.STUDY), "views": list(VIEWS),
    "iou_start": round(start[0], 4), "iou": round(best, 4),
    "per_view_start": {k: round(v, 4) for k, v in start[1].items()},
    "per_view": {k: round(v, 4) for k, v in per.items()}, "steps": n,
}
L.save_card(card, os.path.join(OUT_DIR, "character.fitted.json"))
with open(os.path.join(OUT_DIR, f"fit_log_{MODE}.json"), "w") as f:
    json.dump(log, f, indent=2)
print(f"DONE {MODE} iou={best:.4f} {per} steps={n}", flush=True)

"""Goat-to-door scale check (the goat is not part of the model; this only renders it next to the house).

The game sizes both through simulations/model-calibration.js: this house's file is rescaled by to_game.py to the old
goat shelter's footprint (2.615 file units) and drawn at 1.5 m per unit; the goat file is drawn at 0.5 m per unit and its
installed idle pose is 1.865 units long. Both are brought into this model's metres here, then a goat stands in the
doorway and one on the deck.  usage: python goat_check.py   -> r/goat_check.png and r/goat_check.json"""
import os, sys, json, math, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector, Matrix  # noqa: E402
sys.path.insert(0, HERE)
from build import P  # noqa: E402

OLD_SPAN, BLD_MPU = 2.615, 1.5          # old goat-shelter max footprint span (file units), game metres per unit
GOAT_SPAN_UNITS, GOAT_MPU = 1.865, 0.5  # installed goat-idle length (file units), game metres per unit

sc, lo, hi, tris, n = harness._scene(os.path.join(HERE, 'goat-house-open.glb'), 640, 24)
span = max(hi[0] - lo[0], hi[1] - lo[1])
house_m = OLD_SPAN / span * BLD_MPU            # game metres per model metre
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, '..', 'goat', 'goat.glb'))
goat = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
glo = np.min([np.array(o.matrix_world @ Vector(c)) for o in goat for c in o.bound_box], 0)
ghi = np.max([np.array(o.matrix_world @ Vector(c)) for o in goat for c in o.bound_box], 0)
glen = ghi[1] - glo[1]
goat_game = GOAT_SPAN_UNITS * GOAT_MPU          # game metres, nose to tail
k = goat_game / glen / house_m                  # goat file -> house metres
gdim = (ghi - glo) * k
roots = [o for o in bpy.data.objects if o not in before and o.parent is None]
off = Vector((-(P['X0'] + P['X1']) / 2 * 0, 0, 0))
# the build's coordinates were recentred on the footprint: recover the shift from the exported bounds
shift = Vector((-(lo[0] + hi[0]) / 2 + 0, 0, 0))
dx = (P['DOOR_X'][0] + P['DOOR_X'][1]) / 2
import build as B  # noqa: E402
fx = -(min(P['RAMP_FOOT_X'], P['X0'] - P['ROOF_OH_X']) + P['X1'] + P['ROOF_OH_X']) / 2
for r in roots:
    r.scale = (k, k, k); r.rotation_euler = (0, 0, 0)
    r.location = (dx + fx + 0.0 * shift.x, P['Y0'] + 0.15 - 0.0 + 0.1 - (-(lo[1] + hi[1]) / 2) * 0, 0)
# second goat on the deck
for r in roots:
    c = r.copy(); sc.collection.objects.link(c)
    c.location = (fx + P['X0'] + 1.3, P['Y0'] + 0.75, P['PLATE'] + P['DECK_T'])
    c.rotation_euler = (0, 0, math.radians(70))
    for ch in r.children_recursive:
        cc = ch.copy(); sc.collection.objects.link(cc); cc.parent = c
harness._cam(sc, lo, hi, (-0.35, -0.9, 0.25), False)
sc.render.filepath = os.path.join(HERE, 'r', 'goat_check.png'); bpy.ops.render.render(write_still=True)
res = dict(house_game_m_per_model_m=round(float(house_m), 3), goat_game_m=dict(length=round(float(goat_game), 2), width=round(float(gdim[0] * house_m), 2),
           height=round(float(gdim[2] * house_m), 2)),
           door_game_m=dict(width=round(float((P['DOOR_X'][1] - P['DOOR_X'][0]) * house_m), 2), height=round(P['DOOR_H'] * house_m, 2),
                            lower_leaf=round(P['GATE_H'] * house_m, 2)),
           interior_game_m=dict(x=round((P['X1'] - P['X0'] - 0.3) * house_m, 2), y=round((P['Y1'] - P['Y0'] - 0.3) * house_m, 2),
                                under_deck=round((P['PLATE'] - 0.16 - 0.1) * house_m, 2)),
           deck_top_game_m=round(float((P['PLATE'] + P['DECK_T']) * house_m), 2))
res = json.loads(json.dumps(res, default=float))
json.dump(res, open(os.path.join(HERE, 'r', 'goat_check.json'), 'w'), indent=1)
print(json.dumps(res))

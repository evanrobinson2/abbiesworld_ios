"""MK-147 Battery cell: the pickup that powers doors and the zapper's charger. Round 2, matched to the Midjourney pick:
a chunky cube with dark bumper corners, off-white side panels, a carry handle, an orange window on its flank and three
green charge bars behind a dark grille (diegetic: the bars say how full it is)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.module('Cell', (0.34, 0.3, 0.32), (0, 0, 0.18), bevel=0.02, t=0.045, fill=0.8)
k.box('TopPlate', (0.24, 0.2, 0.03), (0, 0, 0.35), 'Metal_Charcoal', bevel=0.01)
k.box('HazardPlate', (0.14, 0.1, 0.012), (0, 0, 0.368), 'Metal_Hazard', bevel=0.003)
for s in (-1, 1):
    k.box(f'HandlePost{"L" if s < 0 else "R"}', (0.035, 0.04, 0.08), (s * 0.1, 0, 0.4), 'Metal_Gunmetal', bevel=0.008)
k.box('Handle', (0.24, 0.045, 0.04), (0, 0, 0.45), 'Rubber_Black', bevel=0.012)
k.box('ChargeGrille', (0.13, 0.02, 0.15), (0.03, -0.155, 0.18), 'Plastic_Dark', bevel=0.01)
for j in range(3):
    k.box(f'ChargeBar{j}', (0.022, 0.012, 0.11), (-0.005 + 0.035 * j, -0.165, 0.18), 'Lamp_Green', bevel=0.004)
k.window('SideWindow', 0.07, 0.17, (-0.172, 0.0, 0.19), face='-X', depth=0.03)
k.box('CornerStripe', (0.05, 0.31, 0.02), (0.13, 0, 0.05), 'OrangeBand', bevel=0.004)
k.build(HERE, {'id': 'MK-147', 'name': 'Battery cell'}, bake_size=512,
        view=dict(yaw=-32, pitch=12), fps_eye=((-0.25, -0.65, 0.75), (0, 0, 0.2)))

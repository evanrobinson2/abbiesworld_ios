"""MK-001 Solar array on a sun-tracking mast. Round 2, matched to the pick: a framed equipment hut with a warm window
on a wide dark plinth, a gunmetal mast rising through it to a slewing head with a green "power good" lamp, and two
tilted wings of framed dark-blue cells. Diegetic: if the base is short of power, the lamp and the hut window go amber."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Plinth', (2.0, 1.7, 0.2), (0, 0, 0.1), 'Metal_Gunmetal', bevel=0.04)
k.module('Hut', (1.2, 1.0, 0.85), (0, 0, 0.64), bevel=0.05, t=0.1, fill=0.3)
k.window('HutWindow', 0.3, 0.32, (-0.1, -0.51, 0.62), depth=0.06)
k.cyl('Mast', 0.1, 2.0, (0.25, 0.1, 2.0), 'Metal_Gunmetal', n=10, bevel=0.015, fill=0.3)
k.box('SlewHead', (0.34, 0.34, 0.36), (0.25, 0.1, 3.1), 'Metal_Charcoal', bevel=0.05, fill=0.5)
k.box('PowerLamp', (0.12, 0.04, 0.14), (0.25, -0.08, 3.1), 'Lamp_Green', bevel=0.02)
k.cyl('TorqueTube', 0.06, 2.6, (0.25, 0.1, 3.1), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=8, fill=0.3)
for side in (-1, 1):
    tag = 'L' if side < 0 else 'R'
    k.box(f'Cells{tag}', (1.0, 1.3, 0.04), (0.25 + side * 0.8, 0.1, 3.1), 'Metal_SolarCell', bevel=0.005, fill=0.15,
          rot=(0.85, 0.0, side * 0.12))
    k.box(f'CellFrame{tag}', (1.08, 1.38, 0.035), (0.25 + side * 0.8, 0.1, 3.08), 'Metal_Gunmetal', bevel=0.01, fill=0.3,
          rot=(0.85, 0.0, side * 0.12))
k.tube('PowerCable', [(0.6, -0.3, 0.3), (0.9, -0.85, 0.08), (1.6, -1.4, 0.03)], 0.025, 'Rubber_Black', n=6)
k.build(HERE, {'id': 'MK-001', 'name': 'Solar array on a sun-tracking mast'}, bake_size=1024,
        view=dict(yaw=22, pitch=10), fps_eye=((0.8, -3.2, 1.1), (0.2, 0, 1.8)))

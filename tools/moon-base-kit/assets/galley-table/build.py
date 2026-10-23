"""MK-072 Galley table. Round 2, matched to the pick: a round table on one floor-pinned pedestal with a raised lip so
things don't drift off in low gravity, two chunky padded stools with dark bumpers, and a framed food module on the
table with a warm glowing rehydrator window and a hatch."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('PedestalFoot', 0.5, 0.08, (0, 0, 0.04), 'Metal_Gunmetal', n=12, bevel=0.02)
k.cyl('Pedestal', 0.14, 0.62, (0, 0, 0.38), 'Metal_Gunmetal', n=10, bevel=0.02)
k.cyl('Tabletop', 1.0, 0.08, (0, 0, 0.73), 'Metal_Hull', n=20, bevel=0.025)
k.torus('TableLip', 0.98, 0.035, (0, 0, 0.78), 'Metal_Gunmetal', n=24, m=6)
k.torus('TableBand', 1.0, 0.02, (0, 0, 0.7), 'OrangeBand', n=24, m=4)
k.module('FoodModule', (0.9, 0.62, 0.55), (0, 0.15, 1.05), bevel=0.04, t=0.08)
k.window('RehydratorWindow', 0.3, 0.24, (0.18, -0.17, 1.07), depth=0.05)
k.box('FoodHatch', (0.22, 0.04, 0.3), (-0.22, -0.17, 1.05), 'Metal_HullDark', bevel=0.02)
for i, x in enumerate((-0.75, 0.75)):
    k.module(f'Stool{i}', (0.55, 0.5, 0.38), (x, -0.8, 0.24), bevel=0.05, t=0.08)
    k.box(f'StoolCushion{i}', (0.5, 0.45, 0.1), (x, -0.8, 0.47), 'Cloth_Grey', bevel=0.04)
    k.box(f'StoolStripe{i}', (0.12, 0.02, 0.05), (x + 0.12, -1.06, 0.3), 'OrangeBand', bevel=0.005)
k.cyl('DrinkPouch', 0.05, 0.14, (0.55, -0.3, 0.84), 'Metal_Foil', n=8, bevel=0.01)
k.build(HERE, {'id': 'MK-072', 'name': 'Galley table with stools'}, bake_size=1024,
        view=dict(yaw=18, pitch=14), fps_eye=((0.3, -1.9, 1.1), (0, 0, 0.8)))

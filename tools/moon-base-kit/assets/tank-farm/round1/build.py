"""MK-011 Oxygen tank farm. Three upright tanks on a steel skid, joined by a manifold with valve wheels and two big
pressure dials. Diegetic: the dials' needles and the frost line on the tanks say how much air the base has."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Skid', (5.0, 1.8, 0.2), (0, 0, 0.1), 'Metal_Gunmetal', bevel=0.03)
for i, x in enumerate((-1.6, 0, 1.6)):
    k.cyl(f'Tank{i}', 0.65, 2.4, (x, 0.1, 1.5), 'Metal_Hull', n=14, bevel=0.0, fill=0.06)
    k.sphere(f'TankDome{i}', 0.65, (x, 0.1, 2.7), 'Metal_Hull', seg=14, rings=6, scale=(1, 1, 0.5), fill=0.06)
    k.cyl(f'TankBand{i}', 0.67, 0.18, (x, 0.1, 1.0), 'Metal_OxygenBlue', n=14)
    k.cyl(f'TankSaddle{i}', 0.7, 0.12, (x, 0.1, 0.32), 'Metal_Gunmetal', n=14, bevel=0.01)
    k.cyl(f'TankValve{i}', 0.07, 0.25, (x, 0.1, 3.1), 'Metal_Steel', n=8)
    k.torus(f'ValveWheel{i}', 0.13, 0.018, (x, 0.1, 3.24), 'Metal_Hazard', n=12, m=6)
k.tube('Manifold', [(-1.6, 0.1, 3.05), (-1.6, 0.85, 3.05), (1.6, 0.85, 3.05), (1.6, 0.1, 3.05)], 0.06, 'Metal_Steel')
k.tube('Downpipe', [(0, 0.85, 3.05), (0, 0.85, 0.6), (0, -0.6, 0.6), (0, -0.6, 0.25), (0, -2.2, 0.08)], 0.07, 'Metal_Steel')
for i, x in enumerate((-0.8, 0.8)):
    k.cyl(f'DialBezel{i}', 0.24, 0.08, (x, -0.72, 1.4), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=16, bevel=0.01)
    k.cyl(f'DialFace{i}', 0.21, 0.02, (x, -0.77, 1.4), 'Paint_Dial', rot=(math.pi / 2, 0, 0), n=16)
    k.box(f'DialNeedle{i}', (0.025, 0.012, 0.17), (x + 0.04, -0.79, 1.46), 'Plastic_Dark', bevel=0, rot=(0, 0.45, 0))
    k.box(f'DialPost{i}', (0.06, 0.25, 1.2), (x, -0.6, 0.8), 'Metal_Gunmetal', bevel=0.01)
for s_ in (-1, 1):
    k.box(f'LadderRail{"L" if s_ < 0 else "R"}', (0.05, 0.05, 2.9), (2.45, 0.05 + s_ * 0.25, 1.6), 'Metal_Steel', bevel=0.005)
for j in range(7):
    k.cyl(f'Rung{j}', 0.02, 0.5, (2.45, 0.05, 0.5 + 0.38 * j), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=6)
k.build(HERE, {'id': 'MK-011', 'name': 'Oxygen tank farm'}, bake_size=1024,
        view=dict(yaw=28, pitch=16), fps_eye=((0.6, -3.6, 1.1), (0, 0, 1.4)))

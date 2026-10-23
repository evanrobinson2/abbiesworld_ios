"""MK-011 Oxygen tank farm. Round 2, matched to the pick: three tall white capsule tanks on a steel skid, each with a
blue band, a warm frost window down its side and a valve on top, joined by a manifold with valve wheels and two big
pressure dials at the foot. Diegetic: the dials and the glow level in the windows say how much air the base has."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Skid', (3.6, 1.6, 0.16), (0, 0, 0.08), 'Metal_Gunmetal', bevel=0.03)
for i, (x, y) in enumerate(((-1.1, 0.15), (0, -0.05), (1.1, 0.15))):
    k.cyl(f'Tank{i}', 0.55, 2.3, (x, y, 1.45), 'Metal_Hull', n=16, bevel=0.0, fill=0.06)
    k.sphere(f'TankDome{i}', 0.55, (x, y, 2.6), 'Metal_Hull', seg=16, rings=6, scale=(1, 1, 0.55), fill=0.06)
    k.sphere(f'TankFoot{i}', 0.55, (x, y, 0.3), 'Metal_Hull', seg=16, rings=6, scale=(1, 1, 0.3), fill=0.06)
    k.cyl(f'TankBandTop{i}', 0.565, 0.1, (x, y, 2.35), 'Metal_OxygenBlue', n=16)
    k.cyl(f'TankBandLow{i}', 0.565, 0.1, (x, y, 0.75), 'Metal_OxygenBlue', n=16)
    k.window(f'FrostWindow{i}', 0.2, 0.75, (x + 0.15, y - 0.53, 1.5), depth=0.06)
    k.cyl(f'TankValve{i}', 0.06, 0.25, (x, y, 3.0), 'Metal_Steel', n=8)
    k.torus(f'ValveWheel{i}', 0.12, 0.018, (x, y, 3.12), 'Metal_Gunmetal', n=12, m=6)
k.tube('Manifold', [(-1.1, -0.45, 0.45), (1.1, -0.45, 0.45)], 0.05, 'Metal_Steel', n=8)
for i, x in enumerate((-0.6, 0.6)):
    k.cyl(f'DialBezel{i}', 0.2, 0.08, (x, -0.68, 0.55), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=16, bevel=0.01)
    k.cyl(f'DialFace{i}', 0.17, 0.02, (x, -0.73, 0.55), 'Paint_Dial', rot=(-math.pi / 2, 0, 0), n=16)
    k.box(f'DialNeedle{i}', (0.02, 0.012, 0.14), (x + 0.04, -0.75, 0.6), 'Plastic_Dark', bevel=0, rot=(0, 0.45, 0))
for i, x in enumerate((-1.4, 1.4)):
    k.torus(f'ManifoldWheel{i}', 0.1, 0.018, (x, -0.55, 0.45), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=12, m=6)
k.build(HERE, {'id': 'MK-011', 'name': 'Oxygen tank farm'}, bake_size=1024,
        view=dict(yaw=14, pitch=8), fps_eye=((0.5, -3.3, 1.1), (0, 0, 1.4)))

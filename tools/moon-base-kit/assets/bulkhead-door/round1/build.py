"""MK-035 Bulkhead door, round pressure hatch, set in a 2.4 m wall panel. A thick hatch with a porthole, a locking
wheel, a hinge block and a door-state light ring round the frame: green means the next module holds air, amber means
it is cycling, red means stop (diegetic: Abbie reads the ring, not a HUD)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
wall = k.box('WallPanel', (2.4, 0.2, 2.6), (0, 0, 1.3), 'Metal_Hull', bevel=0.02, fill=0.4)
k.cut(wall, k.cutter_cyl(0.78, 1.0, (0, 0, 1.25), rot=(math.pi / 2, 0, 0), n=20))
k.torus('HatchFrame', 0.84, 0.09, (0, -0.1, 1.25), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=20, m=6)
k.torus('StateRing', 0.97, 0.025, (0, -0.12, 1.25), 'Lamp_Green', rot=(math.pi / 2, 0, 0), n=24, m=6)
door = k.cyl('Hatch', 0.76, 0.14, (0, -0.02, 1.25), 'Metal_Charcoal', rot=(math.pi / 2, 0, 0), n=20, bevel=0.02, fill=0.5)
k.cut(door, k.cutter_cyl(0.16, 0.6, (0, -0.02, 1.62), rot=(math.pi / 2, 0, 0), n=12))
k.cyl('Porthole', 0.17, 0.06, (0, -0.02, 1.62), 'Glass_Window', rot=(math.pi / 2, 0, 0), n=12)
k.torus('PortholeRim', 0.18, 0.025, (0, -0.1, 1.62), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=12, m=5)
k.torus('LockWheel', 0.3, 0.03, (0, -0.2, 1.15), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=16, m=6)
for i in range(4):
    a = TAU * i / 4 + 0.4
    k.box(f'WheelSpoke{i}', (0.58, 0.03, 0.04), (0, -0.2, 1.15), 'Metal_Steel', bevel=0, rot=(0, a, 0))
k.cyl('WheelHub', 0.07, 0.12, (0, -0.16, 1.15), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=10)
k.box('HingeBlock', (0.22, 0.24, 0.6), (0.86, -0.12, 1.25), 'Metal_Gunmetal', bevel=0.03)
for i, z in enumerate((0.55, 1.95)):
    k.box(f'Dog{i}', (0.12, 0.08, 0.16), (-0.68 if i else -0.62, -0.13, z), 'Metal_Steel', bevel=0.01)
k.box('Sill', (1.6, 0.4, 0.08), (0, -0.18, 0.04), 'Metal_Hazard', bevel=0.01)
k.box('CyclePanel', (0.26, 0.06, 0.36), (-1.0, -0.13, 1.3), 'Metal_Charcoal', bevel=0.01)
k.box('CycleButton', (0.12, 0.04, 0.12), (-1.0, -0.17, 1.28), 'Lamp_Green', bevel=0.01)
k.build(HERE, {'id': 'MK-035', 'name': 'Bulkhead door, round pressure hatch'}, bake_size=1024,
        view=dict(yaw=22, pitch=8), fps_eye=((0.3, -2.2, 1.1), (0, 0, 1.25)))

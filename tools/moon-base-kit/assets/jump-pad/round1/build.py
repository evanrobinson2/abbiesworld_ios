"""MK-181 Jump pad: a low-gravity launcher. A 1.6 m round pad with a hazard-chevron grate top, a ring of green "ready"
lamps, chunky springs visible in the gap below the top plate, and four anchor feet in a dust skirt. Step on it and the
springs squash, the lamps chase inward, and you sail in a slow arc."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('DustSkirt', 1.2, 0.08, (0, 0, 0.04), 'Stone_Regolith', n=12, r2=0.95, bevel=0)
k.cyl('BaseRing', 0.85, 0.16, (0, 0, 0.14), 'Metal_Gunmetal', n=16, bevel=0.02, fill=0.4)
for i in range(6):
    a = TAU * i / 6
    for j in range(3):
        k.torus(f'Spring{i}{j}', 0.08, 0.018, (0.5 * math.cos(a), 0.5 * math.sin(a), 0.26 + 0.05 * j), 'Metal_Steel', n=8, m=5)
k.cyl('TopPlate', 0.78, 0.08, (0, 0, 0.42), 'Metal_Grate', n=16, bevel=0.015, fill=0.4)
for i in range(4):
    a = TAU * i / 4
    k.box(f'Chevron{i}', (0.5, 0.12, 0.012), (0.42 * math.cos(a), 0.42 * math.sin(a), 0.465), 'Metal_Hazard',
          bevel=0.0, rot=(0, 0, a + math.pi / 2))
k.cyl('CentreTarget', 0.18, 0.012, (0, 0, 0.465), 'OrangeBand', n=12)
for i in range(12):
    a = TAU * (i + 0.5) / 12
    k.cyl(f'ReadyLamp{i:02d}', 0.04, 0.03, (0.82 * math.cos(a), 0.82 * math.sin(a), 0.23), 'Lamp_Green', n=8)
for i in range(4):
    a = TAU * i / 4 + math.pi / 4
    k.box(f'AnchorFoot{i}', (0.36, 0.18, 0.08), (0.95 * math.cos(a), 0.95 * math.sin(a), 0.06), 'Metal_Gunmetal',
          bevel=0.015, rot=(0, 0, a))
k.build(HERE, {'id': 'MK-181', 'name': 'Jump pad'}, bake_size=512,
        view=dict(yaw=25, pitch=30), fps_eye=((0.2, -2.0, 1.1), (0, 0, 0.3)))

"""MK-181 Jump pad. Round 2, matched to the pick: a low round puck 1.8 m across, a thick panelled outer ring with
warm orange windows round its side, a green "ready" ring inset on the top and a dark grated launch plate in the
middle. Step on it and the plate squashes, the ring chases inward, and you sail in a slow low-gravity arc."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('BaseSkirt', 0.98, 0.08, (0, 0, 0.04), 'Metal_Gunmetal', n=24, bevel=0.02)
ring = k.cyl('OuterRing', 0.92, 0.36, (0, 0, 0.26), 'Metal_Hull', n=24, bevel=0.06, fill=0.4)
k.cyl('TopRim', 0.88, 0.06, (0, 0, 0.46), 'Metal_Gunmetal', n=24, bevel=0.02)
k.cyl('BottomBand', 0.94, 0.04, (0, 0, 0.1), 'OrangeBand', n=24)
k.torus('ReadyRing', 0.62, 0.03, (0, 0, 0.5), 'Lamp_Green', n=32, m=6)
k.cyl('LaunchPlate', 0.58, 0.06, (0, 0, 0.48), 'Metal_Grate', n=24, bevel=0.01)
k.cyl('PlateHub', 0.2, 0.03, (0, 0, 0.52), 'Metal_Charcoal', n=12, bevel=0.01)
for i in range(6):
    a = TAU * i / 6 + 0.26
    k.window(f'SideWindow{i}', 0.24, 0.12, (0.93 * math.cos(a), 0.93 * math.sin(a), 0.27), depth=0.05, yaw=a)
for i in range(12):
    a = TAU * i / 12
    k.box(f'Seam{i:02d}', (0.03, 0.05, 0.3), (0.925 * math.cos(a), 0.925 * math.sin(a), 0.26), 'Metal_Gunmetal', bevel=0.005, rot=(0, 0, a))
k.build(HERE, {'id': 'MK-181', 'name': 'Jump pad'}, bake_size=1024,
        view=dict(yaw=20, pitch=22), fps_eye=((0.2, -2.0, 1.1), (0, 0, 0.3)))

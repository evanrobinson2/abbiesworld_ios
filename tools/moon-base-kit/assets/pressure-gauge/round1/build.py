"""MK-162 Pressure gauge wall panel: two big round dials (air and power) behind glass, with chunky needles pointing at
painted green, white and red arcs, fed by a pipe with a valve wheel and a little amber "check me" lamp. The diegetic
replacement for an air meter: Abbie walks up and reads the wall."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Plate', (1.1, 0.08, 0.7), (0, 0.04, 1.35), 'Metal_Hull', bevel=0.03)
k.box('PlateTrim', (1.16, 0.06, 0.08), (0, 0.03, 0.97), 'Metal_Hazard', bevel=0.01)
for i, x in enumerate((-0.27, 0.27)):
    k.torus(f'Bezel{i}', 0.2, 0.03, (x, -0.02, 1.38), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=16, m=6)
    k.cyl(f'DialFace{i}', 0.19, 0.02, (x, -0.01, 1.38), 'Paint_Dial', rot=(-math.pi / 2, 0, 0), n=16)
    k.box(f'Needle{i}', (0.025, 0.012, 0.15), (x + (0.04 if i else -0.05), -0.035, 1.43), 'Plastic_Dark', bevel=0,
          rot=(0, (0.5 if i else -0.6), 0))
    k.cyl(f'NeedleHub{i}', 0.025, 0.02, (x, -0.04, 1.38), 'Plastic_Dark', rot=(math.pi / 2, 0, 0), n=8)
    k.cyl(f'DialGlass{i}', 0.19, 0.01, (x, -0.05, 1.38), 'Glass_Window', rot=(math.pi / 2, 0, 0), n=16)
    k.box(f'LabelPlate{i}', (0.22, 0.02, 0.06), (x, -0.005, 1.1), 'Plastic_White' if i else 'Metal_OxygenBlue', bevel=0.004)
k.cyl('CheckLamp', 0.04, 0.04, (0.45, -0.02, 1.62), 'Lamp_Amber', rot=(math.pi / 2, 0, 0), n=10)
k.tube('FeedPipe', [(0, 0.05, 1.0), (0, 0.05, 0.55), (0, 0.15, 0.0)], 0.04, 'Metal_Steel', n=8)
k.torus('ValveWheel', 0.1, 0.015, (0, -0.02, 0.75), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=12, m=6)
k.box('WallBack', (1.6, 0.06, 2.4), (0, 0.11, 1.2), 'Metal_HullDark', bevel=0.02)
k.build(HERE, {'id': 'MK-162', 'name': 'Pressure gauge wall panel'}, bake_size=512,
        view=dict(yaw=20, pitch=6), fps_eye=((0.1, -1.1, 1.1), (0, 0, 1.35)))

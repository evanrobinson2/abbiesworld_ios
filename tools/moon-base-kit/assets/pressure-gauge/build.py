"""MK-162 Pressure gauge wall panel. Round 2, matched to the pick: a panelled wall section with a recessed dark gauge
bay holding two big round dials (air and power) with green, white and red arcs, a little control strip, a pipe with a
valve wheel running out of it, and a warm porthole beside it. The diegetic replacement for an air meter: Abbie walks up
and reads the wall."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.module('Wall', (2.0, 0.4, 2.2), (0, 0.2, 1.1), bevel=0.05, t=0.14, fill=0.4)
k.box('GaugeBay', (1.0, 0.1, 0.95), (-0.35, -0.02, 1.25), 'Metal_Charcoal', bevel=0.05)
for i, x in enumerate((-0.58, -0.12)):
    k.cyl(f'Bezel{i}', 0.2, 0.08, (x, -0.08, 1.48), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=16, bevel=0.02)
    k.cyl(f'DialFace{i}', 0.17, 0.02, (x, -0.125, 1.48), 'Paint_Dial', rot=(-math.pi / 2, 0, 0), n=16)
    k.box(f'Needle{i}', (0.022, 0.012, 0.14), (x + (0.04 if i else -0.05), -0.14, 1.53), 'Plastic_Dark', bevel=0,
          rot=(0, (0.5 if i else -0.6), 0))
    k.cyl(f'DialGlass{i}', 0.17, 0.01, (x, -0.135, 1.48), 'Glass_Window', rot=(math.pi / 2, 0, 0), n=16)
k.box('ControlStrip', (0.6, 0.06, 0.18), (-0.35, -0.08, 1.1), 'Metal_Gunmetal', bevel=0.02)
for j, m in enumerate(('Lamp_Green', 'Lamp_Amber', 'Lamp_Red')):
    k.box(f'StripLamp{j}', (0.06, 0.03, 0.06), (-0.5 + 0.12 * j, -0.12, 1.1), m, bevel=0.01)
k.torus('ValveWheel', 0.1, 0.02, (-0.05, -0.13, 1.1), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=12, m=6)
k.tube('FeedPipe', [(-0.75, -0.1, 0.9), (-0.75, -0.15, 0.6), (0.2, -0.15, 0.6), (0.2, -0.15, 0.0)], 0.06, 'Metal_Steel', n=8)
k.torus('PipeValve', 0.09, 0.018, (-0.3, -0.24, 0.6), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=12, m=6)
k.window('Porthole', 0.45, 0.6, (0.55, -0.03, 1.3), depth=0.1)
k.box('HazardTrim', (0.08, 0.12, 2.0), (0.92, -0.02, 1.1), 'Metal_Hazard', bevel=0.02)
k.build(HERE, {'id': 'MK-162', 'name': 'Pressure gauge wall panel'}, bake_size=1024,
        view=dict(yaw=18, pitch=4), fps_eye=((-0.2, -1.2, 1.1), (-0.3, 0, 1.3)))

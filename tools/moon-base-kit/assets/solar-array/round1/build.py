"""MK-001 Solar array wing on a sun-tracking mast. A gunmetal mast on an anchored foot, a slewing head, a torque tube
and two wings of four framed cells each, tilted to the low lunar sun. A junction box at the foot carries the green
"power good" lamp (diegetic: if the base is short of power, these lamps go amber)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('FootPlate', (1.4, 1.4, 0.12), (0, 0, 0.06), 'Metal_HullDark', bevel=0.03, fill=0.5)
for i, (x, y) in enumerate(((0.6, 0.6), (-0.6, 0.6), (0.6, -0.6), (-0.6, -0.6))):
    k.cyl(f'AnchorPeg{i}', 0.06, 0.1, (x, y, 0.15), 'Metal_Steel', n=6, bevel=0.01)
k.cyl('Mast', 0.13, 3.0, (0, 0, 1.6), 'Metal_Gunmetal', n=10, bevel=0.015, fill=0.25)
k.cyl('MastCollar', 0.2, 0.25, (0, 0, 0.3), 'Metal_Gunmetal', n=10, bevel=0.02)
k.box('SlewHead', (0.5, 0.45, 0.4), (0, 0, 3.2), 'Metal_Charcoal', bevel=0.04, fill=0.5)
k.cyl('TorqueTube', 0.08, 8.6, (0, 0, 3.35), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=8, fill=0.3)
tilt = math.radians(32)
for side in (-1, 1):
    for j in range(4):
        x = side * (0.55 + 0.98 * j + 0.49)
        c, s = math.cos(tilt), math.sin(tilt)
        k.box(f'Cell_{"L" if side < 0 else "R"}{j}', (0.92, 1.7, 0.05), (x, 0, 3.45), 'Metal_SolarCell', bevel=0.008, fill=0.15,
              rot=(tilt, 0, 0))
        k.box(f'CellFrame_{"L" if side < 0 else "R"}{j}', (0.96, 0.06, 0.08), (x, -0.86 * c, 3.45 - 0.86 * s),
              'Metal_Steel', bevel=0.01, rot=(tilt, 0, 0))
        k.box(f'CellFrameTop_{"L" if side < 0 else "R"}{j}', (0.96, 0.06, 0.08), (x, 0.86 * c, 3.45 + 0.86 * s),
              'Metal_Steel', bevel=0.01, rot=(tilt, 0, 0))
    k.box(f'WingStrut_{"L" if side < 0 else "R"}', (0.06, 0.06, 1.1), (side * 2.5, 0.15, 2.9), 'Metal_Gunmetal',
          rot=(0.5, 0, 0))
k.box('JunctionBox', (0.42, 0.24, 0.5), (0.0, -0.32, 0.55), 'Metal_Charcoal', bevel=0.02, fill=0.4)
k.box('JunctionHazard', (0.44, 0.25, 0.06), (0.0, -0.32, 0.36), 'Metal_Hazard', bevel=0.005)
k.cyl('PowerLamp', 0.05, 0.05, (0.0, -0.45, 0.68), 'Lamp_Green', rot=(math.pi / 2, 0, 0), n=10)
k.tube('PowerCable', [(0.0, -0.32, 0.3), (0.0, -0.6, 0.06), (0.0, -1.6, 0.03)], 0.025, 'Rubber_Black', n=6)
k.build(HERE, {'id': 'MK-001', 'name': 'Solar array wing'}, bake_size=1024,
        view=dict(yaw=25, pitch=16), fps_eye=((1.5, -4.5, 1.1), (0, 0, 2.2)))

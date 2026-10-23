"""MK-028 Base tower and antenna. Matched to the Midjourney pick: a two-storey framed tower block (a wide lower storey
with a tall warm window and green/amber status lamps, a dark slab band with hazard trim, a narrower upper storey with a
porthole), a framed porch with a glowing door, a dish on the roof, and a lattice mast with a work platform, whip
antennas and a red beacon on top. The beacon is the base's landmark: you can see it from anywhere on the Moon tile,
and it blinks faster when someone is calling home."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Footing', (4.4, 3.4, 0.2), (0, 0, 0.1), 'Metal_Gunmetal', bevel=0.05)
k.module('Lower', (3.2, 3.0, 2.8), (0.4, 0, 1.6), bevel=0.12, t=0.2, fill=0.25)
k.window('TallWindow', 0.55, 1.35, (1.2, -1.53, 1.55), depth=0.12, round_=False)
k.box('LampGreen', (0.16, 0.06, 0.16), (1.75, -1.55, 1.95), 'Lamp_Green', bevel=0.03)
k.box('LampAmber', (0.16, 0.06, 0.16), (1.75, -1.55, 1.6), 'LampOff_Amber', bevel=0.03)
k.box('BaseHazard', (3.3, 3.1, 0.12), (0.4, 0, 0.3), 'Metal_Hazard', bevel=0.02)
k.box('SlabBand', (3.6, 3.4, 0.35), (0.4, 0, 3.15), 'Metal_Charcoal', bevel=0.06)
k.box('SlabLamp', (0.16, 0.05, 0.1), (0.4, -1.72, 3.15), 'Lamp_Green', bevel=0.02)
k.box('SlabHazard', (2.6, 2.4, 0.1), (0.4, 0, 3.38), 'Metal_Hazard', bevel=0.02)
k.module('Upper', (2.6, 2.4, 1.9), (0.4, 0, 4.3), bevel=0.25, t=0.16, fill=0.25)
k.window('Porthole', 0.36, 0.36, (-0.2, -1.22, 4.45), glow='Glass_Window', depth=0.1)
k.box('RoofCap', (2.5, 2.3, 0.14), (0.4, 0, 5.3), 'Metal_Gunmetal', bevel=0.04)
k.tube('Conduit', [(-0.3, -1.25, 5.3), (-0.3, -1.3, 3.6), (-0.6, -1.7, 3.3), (-0.6, -1.75, 0.3)], 0.04, 'Rubber_Black', n=6)
# porch on the left with a glowing door
k.box('PorchFloor', (1.6, 1.8, 0.16), (-1.95, -0.3, 0.28), 'Metal_Grate', bevel=0.02)
for i, (x, y) in enumerate(((-2.7, -1.15), (-1.25, -1.15), (-2.7, 0.55))):
    k.box(f'PorchPost{i}', (0.12, 0.12, 2.0), (x, y, 1.3), 'Metal_Gunmetal', bevel=0.02)
k.box('PorchRoof', (1.75, 1.95, 0.12), (-1.95, -0.3, 2.35), 'Metal_Gunmetal', bevel=0.03)
k.box('PorchRail', (1.4, 0.06, 0.06), (-1.95, -1.15, 1.25), 'Metal_Gunmetal', bevel=0.01)
k.window('Door', 0.8, 1.7, (-1.2, -0.2, 1.25), face='-X', depth=0.1, round_=False)
k.box('DoorLamp', (0.06, 0.2, 0.08), (-1.27, -0.2, 2.25), 'Lamp_Amber', bevel=0.01)
k.box('PorchStep', (0.8, 0.5, 0.12), (-1.95, -1.45, 0.12), 'Metal_Hazard', bevel=0.02)
# dish on the roof edge
k.cyl('DishPost', 0.06, 0.6, (1.35, -0.5, 5.65), 'Metal_Steel', n=6)
k.bowl('RoofDish', 0.65, 0.2, (1.55, -0.65, 6.05), 'Metal_Hull', rot=(1.1, 0, 0.7), seg=14, rings=4, thick=0.05, fill=0.4)
k.cyl('DishFeed', 0.03, 0.4, (1.6, -0.9, 6.15), 'Metal_Gunmetal', rot=(1.1, 0, 0.7), n=6)
# lattice mast: four legs, cross braces, a platform, whips and a beacon
H0, H1, W0, W1 = 5.35, 9.6, 0.75, 0.5
legs = []
for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
    legs.append([(0.2 + sx * W0, 0.2 + sy * W0, H0), (0.2 + sx * W1, 0.2 + sy * W1, H1)])
for i, (a, b) in enumerate(legs):
    k.tube(f'MastLeg{i}', [a, b], 0.045, 'Metal_Gunmetal', n=6)
levels = 5
for lv in range(levels):
    t0, t1 = lv / levels, (lv + 1) / levels
    for i in range(4):
        a0, b0 = legs[i], legs[(i + 1) % 4]
        p = lambda leg, t: tuple(leg[0][c] + (leg[1][c] - leg[0][c]) * t for c in range(3))
        k.tube(f'MastBrace{lv}{i}', [p(a0, t0), p(b0, t1)], 0.022, 'Metal_Gunmetal', n=5)
        k.tube(f'MastRung{lv}{i}', [p(a0, t1), p(b0, t1)], 0.022, 'Metal_Gunmetal', n=5)
k.box('MastPlatform', (1.5, 1.5, 0.08), (0.2, 0.2, 9.0), 'Metal_Grate', bevel=0.01)
k.box('MastRail', (1.5, 1.5, 0.05), (0.2, 0.2, 9.4), 'Metal_Gunmetal', bevel=0.01)
k.cyl('BeaconMast', 0.05, 1.0, (0.2, 0.2, 10.1), 'Metal_Steel', n=6)
k.cyl('Beacon', 0.11, 0.26, (0.2, 0.2, 10.7), 'Lamp_Red', n=10, bevel=0.03)
for i, (x, y, h) in enumerate(((-0.5, 0.9, 1.2), (0.9, 0.9, 0.9), (-0.5, -0.5, 0.7))):
    k.cyl(f'Whip{i}', 0.015, h, (x, y, 9.4 + h / 2), 'Metal_Steel', n=5)
k.cyl('RoofWhip', 0.015, 1.6, (-0.6, -0.8, 6.1), 'Metal_Steel', n=5)
k.build(HERE, {'id': 'MK-028', 'name': 'Base tower and antenna'}, bake_size=2048,
        view=dict(yaw=14, pitch=6), fps_eye=((1.5, -8.5, 1.1), (0.2, 0, 3.6)))

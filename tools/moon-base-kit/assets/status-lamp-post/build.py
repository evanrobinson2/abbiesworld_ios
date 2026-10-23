"""MK-161 Status lamp beacon post: the base's traffic light for the outside. Round 2, matched to the pick: a framed
equipment pedestal with a warm window, a post carrying three caged lanterns (green all's well, amber come back soon,
red come inside now), a bell, and a solar cap on top. The game lights one lantern and rings the bell, so the whole
base mood is read from the world, not a HUD."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('BasePlate', (0.9, 0.9, 0.1), (0, 0, 0.05), 'Metal_Gunmetal', bevel=0.03)
k.module('Pedestal', (0.62, 0.62, 0.9), (0, 0, 0.55), bevel=0.04, t=0.08, fill=0.3)
k.window('PedestalWindow', 0.16, 0.36, (0.1, -0.32, 0.55), depth=0.04)
k.cyl('Post', 0.07, 1.6, (0, 0, 1.8), 'Metal_Gunmetal', n=8, bevel=0.01, fill=0.3)
for i, (m, z, dx) in enumerate((('LampOff_Red', 1.35, 0.0), ('LampOff_Amber', 1.85, 0.18), ('Lamp_Green', 2.35, -0.05))):
    x = dx
    k.box(f'LanternArm{"RAG"[i]}', (abs(dx) + 0.1, 0.05, 0.05), (dx / 2, 0, z + 0.2), 'Metal_Gunmetal', bevel=0.01)
    k.cyl(f'Lantern{"RAG"[i]}', 0.11, 0.24, (x, -0.02, z), m, n=8, bevel=0.02)
    k.cyl(f'LanternCap{"RAG"[i]}', 0.14, 0.05, (x, -0.02, z + 0.15), 'Metal_Gunmetal', n=8, bevel=0.01)
    k.cyl(f'LanternBase{"RAG"[i]}', 0.13, 0.04, (x, -0.02, z - 0.14), 'Metal_Gunmetal', n=8, bevel=0.01)
    for c in range(4):
        a = TAU * c / 4 + 0.4
        k.box(f'Cage{"RAG"[i]}{c}', (0.02, 0.02, 0.24), (x + 0.12 * math.cos(a), -0.02 + 0.12 * math.sin(a), z), 'Metal_Gunmetal', bevel=0)
k.cyl('Bell', 0.1, 0.13, (-0.2, 0, 2.1), 'Metal_Steel', n=12, r2=0.05, bevel=0.01, fill=0.3)
k.box('BellArm', (0.2, 0.04, 0.04), (-0.1, 0, 2.2), 'Metal_Gunmetal', bevel=0.005)
k.cyl('TopCap', 0.2, 0.08, (0, 0, 2.65), 'Metal_Gunmetal', n=10, bevel=0.02)
k.box('SolarCap', (0.4, 0.36, 0.03), (0, 0, 2.75), 'Metal_SolarCell', bevel=0.005, rot=(0.25, 0, 0))
k.build(HERE, {'id': 'MK-161', 'name': 'Status lamp beacon post'}, bake_size=512,
        view=dict(yaw=18, pitch=8), fps_eye=((0.3, -2.0, 1.1), (0, 0, 1.8)))

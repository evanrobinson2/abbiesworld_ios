"""MK-161 Status lamp beacon post: the base's traffic light for the outside. Three caged glass lamps stacked on a post
(green all's well, amber come back soon, red come inside now), a little solar cap and a bell under the lamps. The game
lights one lamp and rings the bell, so the whole base mood is read from the world, not a HUD."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('BasePlate', (0.6, 0.6, 0.08), (0, 0, 0.04), 'Metal_HullDark', bevel=0.02)
k.cyl('Post', 0.06, 2.0, (0, 0, 1.08), 'Metal_Gunmetal', n=8, bevel=0.01, fill=0.3)
k.cyl('PostCollar', 0.1, 0.18, (0, 0, 0.17), 'Metal_Gunmetal', n=8, bevel=0.015)
k.box('HazardWrap', (0.14, 0.14, 0.3), (0, 0, 0.45), 'Metal_Hazard', bevel=0.01)
for i, (m, z) in enumerate((('Lamp_Green', 2.22), ('LampOff_Amber', 2.48), ('LampOff_Red', 2.74))):
    k.cyl(f'Lamp{"GAR"[i]}', 0.12, 0.2, (0, 0, z), m, n=10, bevel=0.015)
    k.cyl(f'LampRing{"GAR"[i]}', 0.135, 0.04, (0, 0, z - 0.12), 'Metal_Gunmetal', n=10)
    for c in range(4):
        a = TAU * c / 4 + 0.4
        k.box(f'Cage{"GAR"[i]}{c}', (0.02, 0.02, 0.22), (0.135 * math.cos(a), 0.135 * math.sin(a), z), 'Metal_Gunmetal', bevel=0)
k.cyl('TopCap', 0.16, 0.05, (0, 0, 2.9), 'Metal_Gunmetal', n=10, bevel=0.01)
k.box('SolarCap', (0.26, 0.26, 0.02), (0, 0, 2.94), 'Metal_SolarCell', bevel=0.004, rot=(0.25, 0, 0))
k.cyl('Bell', 0.13, 0.16, (0, -0.14, 1.85), 'Metal_Steel', n=12, r2=0.07, bevel=0.01, fill=0.3)
k.box('BellArm', (0.04, 0.18, 0.04), (0, -0.07, 1.96), 'Metal_Gunmetal', bevel=0.005)
k.build(HERE, {'id': 'MK-161', 'name': 'Status lamp beacon post'}, bake_size=512,
        view=dict(yaw=25, pitch=12), fps_eye=((0.3, -1.8, 1.1), (0, 0, 2.0)))

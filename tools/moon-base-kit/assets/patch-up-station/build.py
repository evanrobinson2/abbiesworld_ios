"""MK-085 Patch-up station: the base's first-aid locker. Round 2, matched to the pick: a tall framed white locker with
a glowing green plus on its face (lit = ready), a warm window showing the supplies, two pulled-out drawers of plasters
and suit patches, and an amber help button. PG: it fixes scrapes and suit tears, nothing scary."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.module('Locker', (0.95, 0.75, 1.7), (0, 0, 0.9), bevel=0.06, t=0.12, fill=0.3)
k.box('PlusV', (0.1, 0.05, 0.34), (-0.25, -0.38, 1.25), 'Lamp_Green', bevel=0.02)
k.box('PlusH', (0.34, 0.05, 0.1), (-0.25, -0.38, 1.25), 'Lamp_Green', bevel=0.02)
k.window('SupplyWindow', 0.32, 0.3, (0.18, -0.39, 1.4), depth=0.06)
for i, z in enumerate((1.0, 0.65)):
    k.box(f'Drawer{i}', (0.42, 0.3 + 0.1 * i, 0.26), (0.18, -0.5 - 0.05 * i, z), 'Metal_Hull', bevel=0.03, fill=0.3)
    k.box(f'DrawerFront{i}', (0.44, 0.04, 0.28), (0.18, -0.67 - 0.1 * i, z), 'Metal_Hull', bevel=0.02)
    for j in range(3):
        k.box(f'Patch{i}{j}', (0.1, 0.08, 0.05), (0.06 + 0.12 * j, -0.5 - 0.05 * i, z + 0.15),
              ('Plastic_White', 'Cloth_Blue', 'OrangeBand')[j], bevel=0.015)
k.cyl('HelpButton', 0.08, 0.06, (-0.25, -0.39, 0.6), 'Lamp_Amber', rot=(math.pi / 2, 0, 0), n=12, bevel=0.015)
k.box('HelpFrame', (0.22, 0.04, 0.26), (-0.25, -0.37, 0.6), 'Metal_Gunmetal', bevel=0.03)
k.build(HERE, {'id': 'MK-085', 'name': 'Patch-up station'}, bake_size=1024,
        view=dict(yaw=22, pitch=8), fps_eye=((0.3, -1.6, 1.1), (0, 0, 1.0)))

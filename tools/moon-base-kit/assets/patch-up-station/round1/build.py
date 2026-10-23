"""MK-085 Patch-up station: the base's first-aid wall. A white cabinet with a glowing green plus (lit = ready), a pull-out
drawer of plasters and suit patches, a fold-down seat at kid height and a big friendly press button. PG: it fixes
scrapes and suit tears, nothing scary."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Cabinet', (1.2, 0.35, 1.5), (0, 0.2, 1.25), 'Plastic_White', bevel=0.04, fill=0.3)
k.box('PlusV', (0.12, 0.04, 0.4), (0, 0.01, 1.68), 'Lamp_Green', bevel=0.01)
k.box('PlusH', (0.4, 0.04, 0.12), (0, 0.01, 1.68), 'Lamp_Green', bevel=0.01)
k.box('PlusPlate', (0.56, 0.03, 0.56), (0, 0.03, 1.68), 'Metal_Charcoal', bevel=0.02)
for i, z in enumerate((1.15, 0.85)):
    k.box(f'Drawer{i}', (1.0, 0.06, 0.24), (0, 0.0, z), 'Plastic_White', bevel=0.02)
    k.box(f'DrawerPull{i}', (0.3, 0.05, 0.04), (0, -0.04, z + 0.05), 'Metal_Steel', bevel=0.008)
k.box('DrawerOpen', (1.0, 0.4, 0.2), (0, -0.2, 0.55), 'Plastic_White', bevel=0.015, fill=0.3)
for i in range(4):
    k.box(f'Patch{i}', (0.16, 0.1, 0.02), (-0.3 + 0.2 * i, -0.22, 0.66), ('OrangeBand', 'Cloth_Blue', 'Plastic_White', 'Cloth_Grey')[i],
          bevel=0.006)
k.box('SeatHinge', (0.9, 0.06, 0.06), (0, 0.05, 0.47) if False else (0, 0.36, 0.47), 'Metal_Gunmetal', bevel=0.01)
k.box('Seat', (0.9, 0.42, 0.06), (0.0, 0.15, 0.45) if False else (1.3, 0.0, 0.45), 'Cloth_Blue', bevel=0.02)
k.box('SeatLeg', (0.06, 0.06, 0.42), (1.3, -0.15, 0.21), 'Metal_Gunmetal', bevel=0.01)
k.box('SeatWall', (0.9, 0.08, 1.0), (1.3, 0.33, 0.9), 'Metal_Hull', bevel=0.02)
k.cyl('HelpButton', 0.11, 0.06, (0.75, 0.0, 1.0), 'Lamp_Amber', rot=(math.pi / 2, 0, 0), n=12, bevel=0.015)
k.cyl('HelpButtonRim', 0.14, 0.04, (0.75, 0.03, 1.0), 'Metal_Steel', rot=(math.pi / 2, 0, 0), n=12, bevel=0.01)
k.build(HERE, {'id': 'MK-085', 'name': 'Patch-up station'}, bake_size=1024,
        view=dict(yaw=18, pitch=10), fps_eye=((0.4, -1.8, 1.1), (0.4, 0.2, 1.0)))

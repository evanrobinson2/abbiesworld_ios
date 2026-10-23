"""MK-147 Battery cell: the pickup that powers doors and the zapper's charger. A chunky charcoal block with a carry
handle, steel contacts, a hazard band and three green charge bars on its side (diegetic: the bars say how full it is)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('Case', (0.3, 0.18, 0.36), (0, 0, 0.18), 'Metal_Charcoal', bevel=0.025, fill=0.8)
k.box('HazardBand', (0.31, 0.19, 0.05), (0, 0, 0.06), 'Metal_Hazard', bevel=0.006)
k.box('TopCap', (0.26, 0.16, 0.04), (0, 0, 0.38), 'Metal_Gunmetal', bevel=0.01)
for s in (-1, 1):
    k.cyl(f'Contact{"N" if s < 0 else "P"}', 0.025, 0.04, (s * 0.08, 0, 0.42), 'Metal_Steel', n=8)
    k.box(f'HandlePost{"L" if s < 0 else "R"}', (0.03, 0.03, 0.08), (s * 0.07, 0.05, 0.44), 'Metal_Gunmetal', bevel=0.005)
k.box('Handle', (0.17, 0.03, 0.03), (0, 0.05, 0.48), 'Rubber_Black', bevel=0.006)
for j in range(3):
    k.box(f'ChargeBar{j}', (0.12, 0.012, 0.035), (0, -0.092, 0.17 + 0.055 * j), 'Lamp_Green', bevel=0.004)
k.box('ChargeWindow', (0.16, 0.01, 0.2), (0, -0.088, 0.225), 'Plastic_Dark', bevel=0.004)
k.build(HERE, {'id': 'MK-147', 'name': 'Battery cell'}, bake_size=512,
        view=dict(yaw=30, pitch=18), fps_eye=((0.2, -0.6, 0.75), (0, 0, 0.2)))

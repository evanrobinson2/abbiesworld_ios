"""MK-072 Galley table with bench. A table on a single floor-pinned pedestal, a raised lip so things don't drift off in
low gravity, two cushioned benches with foot straps, two magnetic meal trays and a drink pouch."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Pedestal', 0.12, 0.7, (0, 0, 0.35), 'Metal_Gunmetal', n=10, bevel=0.01)
k.cyl('PedestalFoot', 0.4, 0.05, (0, 0, 0.025), 'Metal_Gunmetal', n=10, bevel=0.01)
k.box('Tabletop', (1.6, 0.9, 0.06), (0, 0, 0.74), 'Plastic_White', bevel=0.02)
for s in (-1, 1):
    k.box(f'Lip{"F" if s < 0 else "B"}', (1.6, 0.04, 0.05), (0, s * 0.43, 0.79), 'Metal_Gunmetal', bevel=0.008)
    k.box(f'LipSide{"L" if s < 0 else "R"}', (0.04, 0.9, 0.05), (s * 0.78, 0, 0.79), 'Metal_Gunmetal', bevel=0.008)
    n = 'Front' if s < 0 else 'Back'
    k.box(f'Bench{n}', (1.5, 0.4, 0.06), (0, s * 0.8, 0.44), 'Metal_Gunmetal', bevel=0.015)
    k.box(f'Cushion{n}', (1.46, 0.38, 0.08), (0, s * 0.8, 0.51), 'Cloth_Blue', bevel=0.03)
    for x in (-0.6, 0.6):
        k.box(f'BenchLeg{n}{x}', (0.06, 0.3, 0.42), (x, s * 0.8, 0.21), 'Metal_Gunmetal', bevel=0.01)
    k.box(f'FootStrap{n}', (1.2, 0.08, 0.04), (0, s * 0.62, 0.12), 'Metal_Hazard', bevel=0.008)
    k.box(f'Tray{n}', (0.42, 0.3, 0.03), (s * 0.35, s * 0.18, 0.785), 'Metal_Steel', bevel=0.006)
    for c in range(3):
        k.box(f'TrayFood{n}{c}', (0.1, 0.1, 0.025), (s * 0.35 - 0.13 + 0.13 * c, s * 0.18, 0.81),
              ('Leaf_Lettuce', 'Fruit_Red', 'Plastic_White')[c], bevel=0.01)
k.cyl('DrinkPouch', 0.04, 0.14, (0.0, 0.05, 0.84), 'Metal_Foil', n=8, bevel=0.01)
k.cyl('DrinkStraw', 0.008, 0.08, (0.0, 0.05, 0.94), 'OrangeBand', n=5)
k.build(HERE, {'id': 'MK-072', 'name': 'Galley table with bench'}, bake_size=1024,
        view=dict(yaw=35, pitch=28), fps_eye=((0.3, -1.6, 1.1), (0, 0, 0.7)))

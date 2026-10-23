"""MK-070 Bunk pod with privacy shutter: two stacked sleep capsules, Daddy's up top and Abbie's below with a
ladder. Each has a mattress with a strap blanket (low-g: you sleep strapped in), a pillow, a reading lamp and a
slatted shutter. Diegetic: a closed shutter with the lamp off means someone is asleep."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for lv, z in (('Lower', 0.25), ('Upper', 1.35)):
    k.box(f'{lv}Shell', (2.2, 1.0, 0.08), (0, 0, z), 'Metal_Hull', bevel=0.02, fill=0.5)
    k.box(f'{lv}Back', (2.2, 0.08, 1.0), (0, 0.5, z + 0.5), 'Metal_Hull', bevel=0.02, fill=0.5)
    k.box(f'{lv}Roof', (2.2, 1.0, 0.08), (0, 0, z + 1.0), 'Metal_Hull', bevel=0.02, fill=0.5)
    for s in (-1, 1):
        k.box(f'{lv}End{"L" if s < 0 else "R"}', (0.08, 1.0, 1.0), (s * 1.1, 0, z + 0.5), 'Metal_HullDark', bevel=0.02, fill=0.5)
    k.box(f'{lv}Mattress', (2.0, 0.85, 0.16), (0, 0.04, z + 0.12), 'Cloth_Blue' if lv == 'Lower' else 'Cloth_Grey', bevel=0.04)
    k.box(f'{lv}Pillow', (0.4, 0.6, 0.12), (-0.75, 0.06, z + 0.26), 'Plastic_White', bevel=0.05)
    for st in (-0.1, 0.5):
        k.box(f'{lv}Strap{st}', (0.08, 0.9, 0.18), (st, 0.04, z + 0.12), 'Metal_Hazard', bevel=0.01)
    k.cyl(f'{lv}ReadingLamp', 0.06, 0.05, (-0.95, 0.3, z + 0.9), 'HeadlightGlass', n=10, rot=(math.pi, 0, 0))
    k.box(f'{lv}ShutterRail', (2.2, 0.06, 0.06), (0, -0.5, z + 0.96), 'Metal_Gunmetal', bevel=0.01)
    for j in range(5):
        k.box(f'{lv}ShutterSlat{j}', (0.95, 0.03, 0.14), (0.55, -0.5, z + 0.85 - 0.16 * j), 'Plastic_White', bevel=0.005)
k.box('LadderRailL', (0.05, 0.05, 2.3), (0.85, -0.6, 1.15), 'Metal_Steel', bevel=0.005)
k.box('LadderRailR', (0.05, 0.05, 2.3), (0.45, -0.6, 1.15), 'Metal_Steel', bevel=0.005)
for j in range(5):
    k.cyl(f'LadderRung{j}', 0.02, 0.4, (0.65, -0.6, 0.45 + 0.4 * j), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=6)
k.box('StarSticker', (0.12, 0.01, 0.12), (-0.3, 0.45, 0.7), 'OrangeBand', bevel=0.0, rot=(0, 0.6, 0))
k.build(HERE, {'id': 'MK-070', 'name': 'Bunk pod with privacy shutter'}, bake_size=1024,
        view=dict(yaw=24, pitch=12), fps_eye=((0.2, -2.2, 1.1), (-0.2, 0.2, 0.8)))

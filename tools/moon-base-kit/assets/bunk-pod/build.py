"""MK-070 Bunk pod: two stacked sleep capsules, Daddy's up top and Abbie's below. Round 2, matched to the pick: each
capsule is a chunky framed module with an open side showing a blue mattress, pillow and warm reading lamp, a slatted
shutter beside it, an orange window at the head end and an amber ladder. Diegetic: a closed shutter with the lamp off
means someone is asleep."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for lv, z in (('Lower', 0.55), ('Upper', 1.62)):
    body = k.module(f'{lv}Pod', (2.2, 1.1, 1.0), (0, 0, z), bevel=0.06, t=0.12, fill=0.4)
    k.cut(body, k.cutter_box((1.1, 0.8, 0.62), (0.15, -0.5, z + 0.02)))
    k.box(f'{lv}Alcove', (1.1, 0.04, 0.62), (0.15, 0.12, z + 0.02), 'Metal_HullDark', bevel=0)
    k.box(f'{lv}Mattress', (1.06, 0.6, 0.14), (0.15, -0.2, z - 0.22), 'Cloth_Blue', bevel=0.05)
    k.box(f'{lv}Pillow', (0.3, 0.4, 0.12), (-0.25, -0.2, z - 0.1), 'Plastic_White', bevel=0.05)
    k.box(f'{lv}Blanket', (0.6, 0.62, 0.06), (0.35, -0.2, z - 0.13), 'Cloth_Grey', bevel=0.03)
    k.cyl(f'{lv}ReadingLamp', 0.06, 0.04, (-0.25, -0.15, z + 0.31), 'HeadlightGlass', n=10)
    for j in range(5):
        k.box(f'{lv}ShutterSlat{j}', (0.04, 0.03, 0.6), (0.86 + 0.07 * j, -0.56, z + 0.02), 'Metal_Gunmetal', bevel=0.008)
    k.window(f'{lv}HeadWindow', 0.32, 0.4, (-0.8, -0.56, z + 0.04), depth=0.06)
k.box('LadderRailL', (0.06, 0.06, 2.3), (1.18, -0.62, 1.15), 'Metal_Hazard', bevel=0.01)
k.box('LadderRailR', (0.06, 0.06, 2.3), (0.82, -0.62, 1.15), 'Metal_Hazard', bevel=0.01)
for j in range(6):
    k.cyl(f'LadderRung{j}', 0.022, 0.36, (1.0, -0.62, 0.3 + 0.36 * j), 'Metal_Hazard', rot=(0, math.pi / 2, 0), n=6)
k.build(HERE, {'id': 'MK-070', 'name': 'Bunk pod with privacy shutter'}, bake_size=1024,
        view=dict(yaw=22, pitch=10), fps_eye=((0.2, -2.3, 1.1), (0, 0, 1.0)))

"""MK-083 Suit locker with spare suits. Round 2, matched to the pick: a chunky framed wardrobe module, open at the
front, with a warm-lit interior: an empty grown-up suit and an empty kid suit on hangers (no faces), helmets on the
shelf, boots below, and a tall orange window in the door panel. Diegetic: a missing suit means someone is outside."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
body = k.module('Locker', (2.0, 1.1, 2.3), (0, 0, 1.15), bevel=0.06, t=0.14, fill=0.3)
k.cut(body, k.cutter_box((1.2, 1.0, 1.9), (-0.25, -0.45, 1.12)))
k.box('InnerBack', (1.2, 0.04, 1.9), (-0.25, 0.3, 1.12), 'Metal_HullDark', bevel=0)
k.box('InnerLight', (1.0, 0.1, 0.04), (-0.25, 0.0, 2.0), 'HeadlightGlass', bevel=0.01)
k.window('DoorWindow', 0.26, 0.9, (0.65, -0.56, 1.2), depth=0.06)
k.box('Shelf', (1.15, 0.6, 0.05), (-0.25, 0.0, 1.85), 'Metal_Gunmetal', bevel=0.01)
k.box('HangerRail', (1.1, 0.04, 0.04), (-0.25, 0.05, 1.75), 'Metal_Steel', bevel=0.005)
def suit(tag, x, sc, z0):
    k.box(f'{tag}Torso', (0.42 * sc, 0.24 * sc, 0.55 * sc), (x, 0.05, z0 + 0.3 * sc), 'Cloth_Suit', bevel=0.05 * sc)
    k.box(f'{tag}ChestPlate', (0.34 * sc, 0.05, 0.26 * sc), (x, 0.05 - 0.13 * sc, z0 + 0.4 * sc), 'Metal_Gunmetal', bevel=0.03 * sc)
    k.box(f'{tag}ChestLamp', (0.09 * sc, 0.02, 0.04 * sc), (x, 0.05 - 0.17 * sc, z0 + 0.45 * sc), 'OrangeBand', bevel=0.0)
    for s in (-1, 1):
        k.cyl(f'{tag}Arm{"L" if s < 0 else "R"}', 0.07 * sc, 0.55 * sc, (x + s * 0.27 * sc, 0.05, z0 + 0.22 * sc), 'Cloth_Suit', n=8)
        k.cyl(f'{tag}Leg{"L" if s < 0 else "R"}', 0.085 * sc, 0.65 * sc, (x + s * 0.11 * sc, 0.05, z0 - 0.3 * sc), 'Cloth_Suit', n=8)
    k.sphere(f'{tag}Helmet', 0.15 * sc, (x, 0.05, 1.88 + 0.15 * sc), 'Metal_Hull', seg=12, rings=7)
    k.sphere(f'{tag}Visor', 0.11 * sc, (x, 0.05 - 0.06 * sc, 1.88 + 0.16 * sc), 'Glass_Window', seg=12, rings=6, scale=(1.1, 0.9, 0.8))
    for s in (-1, 1):
        k.box(f'{tag}Boot{"L" if s < 0 else "R"}', (0.12 * sc, 0.24 * sc, 0.13 * sc), (x + s * 0.09 * sc, -0.1, 0.3), 'Metal_Gunmetal', bevel=0.025)
k.box('BootStep', (1.15, 0.6, 0.18), (-0.25, -0.05, 0.16), 'Metal_Gunmetal', bevel=0.02)
suit('Grownup', -0.5, 1.0, 1.05)
suit('Kid', 0.05, 0.62, 1.2)
k.build(HERE, {'id': 'MK-083', 'name': 'Suit locker with spare suits'}, bake_size=1024,
        view=dict(yaw=12, pitch=6, lights=(((-0.25, -0.6, 1.5), 40),)), fps_eye=((0.0, -2.0, 1.1), (-0.25, 0, 1.2)))

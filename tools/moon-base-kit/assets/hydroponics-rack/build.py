"""MK-076 Hydroponics rack. Round 2, matched to the pick: a chunky framed grow cabinet with an open front, three
tiers (lettuce at Abbie's height, herbs, then tomato vines spilling over), pink grow light strips above each tier, an
orange status window on the side and a water line. Diegetic: plants droop and the pink light flickers when water or
power is low; ripe tomatoes mean harvest time."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
import random
random.seed(7)
body = k.module('Cabinet', (1.8, 0.8, 1.9), (0, 0, 1.0), bevel=0.06, t=0.14, fill=0.3)
k.cut(body, k.cutter_box((1.45, 0.8, 1.55), (0.05, -0.3, 1.0)))
k.box('BackGlow', (1.45, 0.03, 1.55), (0.05, 0.12, 1.0), 'Lamp_Grow', bevel=0)
k.window('SideWindow', 0.16, 0.5, (-0.88, -0.38, 1.0), face='-Y', depth=0.05)
for t, z in enumerate((0.38, 0.88, 1.38)):
    k.box(f'Tray{t}', (1.42, 0.55, 0.1), (0.05, -0.08, z), 'Plastic_White', bevel=0.02)
    k.box(f'Soil{t}', (1.36, 0.49, 0.02), (0.05, -0.08, z + 0.05), 'Soil_Grow', bevel=0)
    k.box(f'GrowLamp{t}', (1.4, 0.06, 0.03), (0.05, -0.3, z + 0.43), 'Lamp_Grow', bevel=0)
    for i in range(6):
        x = -0.55 + 0.22 * i
        if t == 0:
            k.ico(f'Lettuce{i}', 0.12, (x, -0.1, z + 0.14), 'Leaf_Lettuce', sub=1, scale=(1, 1, 0.7), rot=(0, 0, random.random()))
        elif t == 1:
            k.ico(f'Herb{i}', 0.1, (x, -0.1, z + 0.15), 'Leaf_Green', sub=1, scale=(0.8, 0.8, 1.2), rot=(0, 0, random.random()))
        else:
            k.ico(f'VineLeaves{i}', 0.12, (x, -0.1, z + 0.18), 'Leaf_Green', sub=1, scale=(1, 0.8, 1.1))
            for j in range(2):
                k.sphere(f'Tomato{i}{j}', 0.045, (x + 0.05 * (j * 2 - 1), -0.25, z + 0.05 - 0.12 * j), 'Fruit_Red', seg=8, rings=5)
k.tube('WaterLine', [(0.9, 0.2, 0.15), (0.9, 0.2, 1.75)], 0.03, 'Metal_OxygenBlue', n=6)
k.build(HERE, {'id': 'MK-076', 'name': 'Hydroponics rack, three tiers'}, bake_size=1024,
        view=dict(yaw=14, pitch=8), fps_eye=((0.2, -1.8, 1.1), (0, 0, 0.9)))

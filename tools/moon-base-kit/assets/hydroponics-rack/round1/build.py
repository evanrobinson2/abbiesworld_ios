"""MK-076 Hydroponics rack, three tiers: lettuce at the bottom (Abbie's height), herbs, then tomato vines on top, each
under a pink grow lamp, with a water line along the back. Diegetic: plants droop and the lamps flicker when the water
or power is low; ripe tomatoes mean it's harvest time."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for s in (-1, 1):
    for f in (-1, 1):
        k.box(f'Post{s}{f}', (0.05, 0.05, 2.1), (s * 0.95, f * 0.3, 1.05), 'Metal_Steel', bevel=0.005)
import random
random.seed(7)
for t, z in enumerate((0.35, 1.0, 1.65)):
    k.box(f'Trough{t}', (1.9, 0.55, 0.16), (0, 0, z), 'Plastic_White', bevel=0.02, fill=0.3)
    k.box(f'Soil{t}', (1.84, 0.49, 0.03), (0, 0, z + 0.08), 'Soil_Grow', bevel=0.0)
    k.box(f'GrowLamp{t}', (1.8, 0.12, 0.03), (0, 0, z + 0.55), 'Lamp_Grow', bevel=0.0)
    k.box(f'LampHousing{t}', (1.86, 0.16, 0.05), (0, 0, z + 0.585), 'Metal_Gunmetal', bevel=0.01)
    for i in range(6):
        x = -0.78 + 0.31 * i
        if t == 0:
            k.ico(f'Lettuce{i}', 0.13, (x, random.uniform(-0.08, 0.08), z + 0.17), 'Leaf_Lettuce', sub=1, scale=(1, 1, 0.65),
                  rot=(0, 0, random.random()))
        elif t == 1:
            for j in range(3):
                k.cyl(f'Herb{i}{j}', 0.03, 0.22, (x + 0.05 * (j - 1), 0.05 * (j - 1), z + 0.2), 'Leaf_Green', n=5, r2=0.06,
                      rot=(0.15 * (j - 1), 0.1, 0))
        else:
            k.cyl(f'Vine{i}', 0.015, 0.4, (x, 0, z + 0.28), 'Leaf_Green', n=5)
            k.ico(f'VineLeaves{i}', 0.11, (x, 0.02, z + 0.36), 'Leaf_Green', sub=1, scale=(1, 0.8, 1.1))
            for j in range(2):
                k.sphere(f'Tomato{i}{j}', 0.04, (x + 0.06 * (j * 2 - 1), -0.08, z + 0.25 + 0.06 * j), 'Fruit_Red', seg=8, rings=5)
k.tube('WaterLine', [(-0.95, 0.31, 0.2), (-0.95, 0.31, 1.8), (0.95, 0.31, 1.8)], 0.025, 'Metal_OxygenBlue', n=6)
k.box('Reservoir', (0.5, 0.4, 0.3), (-0.6, 0.0, 0.08), 'Plastic_Dark', bevel=0.03, fill=0.2)
k.build(HERE, {'id': 'MK-076', 'name': 'Hydroponics rack, three tiers'}, bake_size=1024,
        view=dict(yaw=24, pitch=10), fps_eye=((0.3, -1.6, 1.1), (0, 0, 0.9)))

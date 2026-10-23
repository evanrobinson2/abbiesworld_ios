"""MK-066 Command console. Round 2, matched to the pick: one chunky framed console block with a raised hood holding
three Earthlight screens and an orange status window, a sloped key deck of chunky coloured buttons, a lit service door
below, and a little step in front so Abbie can climb up (adults stand, she climbs)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.module('Base', (2.0, 0.9, 0.8), (0, 0, 0.42), bevel=0.05, t=0.12, fill=0.3)
k.box('Deck', (1.9, 0.5, 0.1), (0, -0.25, 0.88), 'Metal_Charcoal', bevel=0.03, rot=(-0.3, 0, 0))
k.module('Hood', (2.0, 0.45, 0.6), (0, 0.22, 1.18), bevel=0.05, t=0.1, fill=0.3)
for i, x in enumerate((-0.6, 0.05, 0.65)):
    if i == 0:
        k.window('StatusWindow', 0.3, 0.32, (x, -0.02, 1.2), depth=0.06)
    else:
        k.box(f'ScreenBezel{i}', (0.5, 0.06, 0.36), (x, -0.01, 1.2), 'Metal_Gunmetal', bevel=0.04)
        k.box(f'Screen{i}', (0.42, 0.04, 0.28), (x, -0.035, 1.2), 'Screen_Earthlight', bevel=0.03)
cols = ('Lamp_Green', 'Lamp_Amber', 'OrangeBand', 'Lamp_Red', 'Screen_Earthlight')
for r in range(2):
    for b in range(8):
        k.box(f'Button{r}{b}', (0.12, 0.1, 0.05), (-0.75 + 0.21 * b, -0.36 + 0.16 * r, 0.9 + 0.05 * r), cols[(b + r * 3) % 5],
              bevel=0.015, rot=(-0.3, 0, 0))
k.box('ServiceDoor', (0.5, 0.05, 0.46), (0, -0.44, 0.4), 'Metal_HullDark', bevel=0.03)
k.box('ServiceLight', (0.36, 0.04, 0.05), (0, -0.47, 0.67), 'Window_Warm', bevel=0.01)
k.box('KidStep', (0.8, 0.4, 0.2), (0, -0.72, 0.1), 'Metal_Gunmetal', bevel=0.03)
k.box('KidStepTread', (0.76, 0.36, 0.03), (0, -0.72, 0.21), 'Metal_Hazard', bevel=0.005)
k.build(HERE, {'id': 'MK-066', 'name': 'Command console with three screens'}, bake_size=1024,
        view=dict(yaw=24, pitch=10), fps_eye=((0, -1.7, 1.1), (0, 0, 1.0)))

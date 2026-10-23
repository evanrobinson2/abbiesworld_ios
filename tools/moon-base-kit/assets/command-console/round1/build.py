"""MK-066 Command console with three screens. A curved desk of three angled bays, each with an Earthlight screen on a
tilting arm, a key deck with chunky buttons, and a fold-out step so Abbie can reach (adults stand, she climbs up)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for i, a in enumerate((-0.5, 0.0, 0.5)):
    r = 1.6
    x, y = r * math.sin(a), -r * math.cos(a) + r
    k.box(f'Cabinet{i}', (1.0, 0.6, 0.72), (x, y, 0.36), 'Plastic_White', bevel=0.03, rot=(0, 0, a), fill=0.3)
    k.box(f'KickPlate{i}', (0.96, 0.58, 0.08), (x - 0.03 * math.sin(a), y + 0.03 * math.cos(a), 0.04), 'Plastic_Dark',
          bevel=0.01, rot=(0, 0, a))
    k.box(f'KeyDeck{i}', (1.04, 0.5, 0.06), (x - 0.06 * math.sin(a), y + 0.06 * math.cos(a) - 0.04, 0.75), 'Metal_Charcoal',
          bevel=0.015, rot=(-0.18, 0, a))
    for b in range(4):
        bx = -0.33 + 0.22 * b
        col = ('Lamp_Green', 'Lamp_Amber', 'OrangeBand', 'Lamp_Red')[b]
        k.box(f'Button{i}{b}', (0.12, 0.1, 0.05), (x + bx * math.cos(a) - 0.12 * math.sin(a) * 0,
              y + bx * math.sin(a) - 0.16, 0.79), col, bevel=0.012, rot=(-0.18, 0, a))
    sx, sy = x + 0.18 * math.sin(a), y - 0.18 * math.cos(a) + 0.4
    k.box(f'ScreenArm{i}', (0.08, 0.08, 0.5), (sx, sy, 1.0), 'Metal_Gunmetal', bevel=0.01, rot=(0, 0, a))
    k.box(f'ScreenBezel{i}', (0.9, 0.08, 0.56), (sx, sy - 0.04, 1.45), 'Metal_Gunmetal', bevel=0.02, rot=(0.2, 0, a))
    k.box(f'Screen{i}', (0.8, 0.02, 0.46), (sx - 0.05 * math.sin(a), sy - 0.09, 1.45), 'Screen_Earthlight',
          bevel=0.0, rot=(0.2, 0, a))
k.box('KidStep', (0.7, 0.36, 0.22), (0, -0.55, 0.11), 'Metal_Hazard', bevel=0.02)
k.box('KidStepTread', (0.66, 0.32, 0.02), (0, -0.55, 0.23), 'Rubber_Black', bevel=0.0)
k.cyl('Microphone', 0.015, 0.3, (0.25, 0.2, 0.9), 'Metal_Steel', n=6, rot=(0.6, 0, 0))
k.sphere('MicHead', 0.035, (0.25, 0.11, 1.03), 'Plastic_Dark', seg=8, rings=5)
k.build(HERE, {'id': 'MK-066', 'name': 'Command console with three screens'}, bake_size=1024,
        view=dict(yaw=200, pitch=22) if False else dict(hero_cam=((1.6, -2.6, 1.9), (0, 0.4, 0.8))),
        fps_eye=((0, -1.3, 1.1), (0, 0.5, 1.1)))

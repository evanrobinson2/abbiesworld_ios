"""MK-007 Regolith ore processor. A hopper you can tip dust into, a panelled furnace body on legs, a chute that drops
bricks of sintered regolith onto a tray, an exhaust stack and a status lamp. Diegetic: the warm window glows while it
cooks, the stack puffs slow low-gravity dust, and bricks pile up on the tray."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for i, (x, y) in enumerate(((1.1, 0.8), (-1.1, 0.8), (1.1, -0.8), (-1.1, -0.8))):
    k.box(f'Leg{i}', (0.18, 0.18, 0.6), (x, y, 0.3), 'Metal_Gunmetal', bevel=0.02)
    k.box(f'Foot{i}', (0.4, 0.4, 0.06), (x, y, 0.03), 'Metal_Gunmetal', bevel=0.01)
k.box('Body', (2.6, 1.9, 1.6), (0, 0, 1.4), 'Metal_Hull', bevel=0.06, fill=0.3)
k.box('HazardBand', (2.62, 1.92, 0.12), (0, 0, 0.72), 'Metal_Hazard', bevel=0.01)
k.box('FurnaceWindow', (0.7, 0.04, 0.35), (-0.5, -0.96, 1.5), 'Window_Warm', bevel=0.01)
k.box('WindowFrame', (0.8, 0.05, 0.45), (-0.5, -0.95, 1.5), 'Metal_Gunmetal', bevel=0.01)
k.cyl('Hopper', 0.95, 1.0, (0.3, 0.1, 2.75), 'Metal_Charcoal', n=8, r2=0.35, rot=(math.pi, 0, 0), bevel=0.02, fill=0.15)
k.cyl('HopperLip', 1.0, 0.08, (0.3, 0.1, 3.25), 'Metal_Gunmetal', n=8, bevel=0.01)
k.box('HopperGrate', (1.3, 1.3, 0.03), (0.3, 0.1, 3.2), 'Metal_Grate', bevel=0.0)
k.cyl('ExhaustStack', 0.16, 1.4, (-0.9, 0.55, 2.9), 'Metal_Gunmetal', n=10, bevel=0.01, fill=0.2)
k.cyl('StackCap', 0.24, 0.1, (-0.9, 0.55, 3.62), 'Metal_Gunmetal', n=10, bevel=0.01)
k.box('Chute', (0.5, 0.9, 0.3), (0.7, -1.25, 0.95), 'Metal_Steel', bevel=0.02, rot=(0.45, 0, 0), fill=0.3)
k.box('BrickTray', (1.0, 0.8, 0.12), (0.7, -1.9, 0.3), 'Metal_Gunmetal', bevel=0.02)
for i in range(5):
    k.box(f'RegolithBrick{i}', (0.28, 0.16, 0.1), (0.45 + 0.3 * (i % 3), -1.95 + 0.2 * (i // 3), 0.42 + 0.0 * i),
          'Stone_Basalt', bevel=0.015)
k.cyl('StatusLampPost', 0.03, 0.35, (1.1, -0.7, 2.37), 'Metal_Steel', n=6)
k.cyl('StatusLamp', 0.08, 0.14, (1.1, -0.7, 2.6), 'Lamp_Green', n=10, bevel=0.01)
k.tube('FeedPipe', [(-1.3, 0.4, 1.2), (-1.7, 0.4, 1.2), (-1.7, 0.4, 0.15), (-2.6, 0.4, 0.15)], 0.08, 'Metal_Steel')
k.cyl('ValveWheel', 0.18, 0.04, (-1.75, 0.0, 1.0), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=10)
k.build(HERE, {'id': 'MK-007', 'name': 'Regolith ore processor'}, bake_size=1024,
        view=dict(yaw=30, pitch=18), fps_eye=((1.0, -4.0, 1.1), (0.2, 0, 1.5)))

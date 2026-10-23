"""MK-007 Regolith ore processor. Round 2, matched to the pick: a chunky framed furnace block on four splayed legs, a
hopper on top, a glowing furnace mouth at the front with a tray of sintered bricks, an exhaust elbow on the side and a
warm side window. Diegetic: the mouth glows while it cooks, the stack puffs slow dust, and bricks pile up on the tray."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for i, (x, y) in enumerate(((0.75, 0.6), (-0.75, 0.6), (0.75, -0.6), (-0.75, -0.6))):
    k.box(f'Leg{i}', (0.18, 0.18, 0.75), (x * 1.08, y * 1.08, 0.33), 'Metal_Gunmetal', bevel=0.03,
          rot=(-0.2 * (1 if y > 0 else -1), 0.2 * (1 if x > 0 else -1), 0))
    k.box(f'Foot{i}', (0.36, 0.36, 0.08), (x * 1.2, y * 1.2, 0.04), 'Metal_Gunmetal', bevel=0.02)
k.module('Body', (1.8, 1.5, 1.6), (0, 0, 1.4), bevel=0.08, t=0.16, fill=0.3)
k.box('MouthFrame', (0.75, 0.12, 0.6), (0, -0.78, 1.25), 'Metal_Gunmetal', bevel=0.08)
k.box('FurnaceMouth', (0.55, 0.1, 0.4), (0, -0.82, 1.25), 'Window_Warm', bevel=0.05)
k.box('BrickTray', (0.8, 0.5, 0.08), (0, -1.05, 0.9), 'Metal_Gunmetal', bevel=0.02, rot=(0.15, 0, 0))
for i in range(4):
    k.box(f'RegolithBrick{i}', (0.18, 0.12, 0.09), (-0.24 + 0.16 * i, -1.06, 0.97), 'Stone_Basalt', bevel=0.015)
k.cyl('Hopper', 0.62, 0.55, (0, 0.05, 2.5), 'Metal_Charcoal', n=4, r2=0.3, rot=(math.pi, 0, math.pi / 4), bevel=0.02, fill=0.15)
k.box('HopperLip', (0.95, 0.95, 0.1), (0, 0.05, 2.78), 'Metal_Gunmetal', bevel=0.03)
k.tube('Exhaust', [(0.9, 0.3, 1.6), (1.15, 0.3, 1.6), (1.15, 0.3, 2.5)], 0.11, 'Metal_Steel', n=10)
k.cyl('ExhaustCap', 0.15, 0.08, (1.15, 0.3, 2.55), 'Metal_Gunmetal', n=10)
k.window('SideWindow', 0.3, 0.4, (0.91, -0.25, 1.5), face='+X', depth=0.06)
k.cyl('StatusLamp', 0.07, 0.1, (-0.6, -0.5, 2.25), 'Lamp_Green', n=10, bevel=0.01)
k.build(HERE, {'id': 'MK-007', 'name': 'Regolith ore processor'}, bake_size=1024,
        view=dict(yaw=24, pitch=10), fps_eye=((0.8, -3.6, 1.1), (0, 0, 1.4)))

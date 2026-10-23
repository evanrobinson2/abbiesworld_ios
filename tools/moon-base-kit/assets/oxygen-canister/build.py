"""MK-146 Oxygen canister: the pickup Abbie grabs to top up her air. Round 2, matched to the pick: a stout blue
capsule with an off-white front plate holding a warm window (it glows while there's air inside), a dark base ring, a
valve block on top with a green "full" ring, and a side strap. Diegetic: the window and ring dim as it empties."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Body', 0.16, 0.42, (0, 0, 0.3), 'Metal_OxygenBlue', n=14, bevel=0.03, fill=0.12)
k.sphere('Shoulder', 0.16, (0, 0, 0.51), 'Metal_OxygenBlue', seg=14, rings=6, scale=(1, 1, 0.5), fill=0.12)
k.cyl('BaseRing', 0.165, 0.12, (0, 0, 0.07), 'Metal_Gunmetal', n=14, bevel=0.025)
k.cyl('BaseBand', 0.168, 0.025, (0, 0, 0.14), 'OrangeBand', n=14)
k.box('FrontPlate', (0.2, 0.06, 0.3), (0, -0.14, 0.32), 'Metal_Hull', bevel=0.03)
k.window('AirWindow', 0.07, 0.15, (0.02, -0.18, 0.32), depth=0.03)
k.cyl('Neck', 0.05, 0.06, (0, 0, 0.6), 'Metal_Steel', n=10)
k.box('ValveBlock', (0.16, 0.1, 0.08), (0, 0, 0.66), 'Metal_Steel', bevel=0.02)
k.cyl('ValvePortL', 0.035, 0.06, (-0.1, 0, 0.66), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=8)
k.cyl('ValvePortR', 0.035, 0.06, (0.1, 0, 0.66), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=8)
k.torus('FullRing', 0.042, 0.012, (-0.1, -0.075, 0.66), 'Lamp_Green', rot=(math.pi / 2, 0, 0), n=12, m=5)
k.cyl('ValveKnob', 0.03, 0.04, (0, 0, 0.72), 'Metal_Gunmetal', n=8)
k.box('Strap', (0.03, 0.03, 0.42), (-0.17, 0.02, 0.3), 'Cloth_Blue', bevel=0.008)
k.build(HERE, {'id': 'MK-146', 'name': 'Oxygen canister'}, bake_size=512,
        view=dict(yaw=12, pitch=10), fps_eye=((0.2, -0.75, 0.85), (0, 0, 0.35)))

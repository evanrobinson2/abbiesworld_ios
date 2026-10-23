"""MK-146 Oxygen canister: the pickup Abbie grabs to top up her air. A blue cylinder with a steel valve head, a
rubber grip band, a carry loop and a green "full" lamp ring that the game dims as it empties (diegetic: the canister
itself says how full it is, no HUD bar)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import bkit as k

k.reset()
k.cyl('Body', 0.09, 0.42, (0, 0, 0.27), 'Metal_OxygenBlue', n=14, bevel=0.012, fill=0.12)
k.sphere('Shoulder', 0.09, (0, 0, 0.48), 'Metal_OxygenBlue', seg=14, rings=6, scale=(1, 1, 0.55), fill=0.12)
k.cyl('Foot', 0.085, 0.06, (0, 0, 0.03), 'Metal_Gunmetal', n=14, bevel=0.01)
k.cyl('GripBand', 0.094, 0.1, (0, 0, 0.25), 'Rubber_Black', n=14, bevel=0.008)
k.cyl('Neck', 0.03, 0.06, (0, 0, 0.55), 'Metal_Steel', n=10)
k.cyl('ValveHead', 0.045, 0.05, (0, 0, 0.6), 'Metal_Steel', n=10, bevel=0.008)
k.cyl('ValveKnob', 0.03, 0.025, (0, 0, 0.64), 'Metal_Hazard', n=8, bevel=0.005)
k.torus('CarryLoop', 0.05, 0.009, (0, 0, 0.66), 'Metal_Gunmetal', rot=(1.5708, 0, 0), n=12, m=6)
k.torus('FullLamp', 0.092, 0.008, (0, 0, 0.43), 'Lamp_Green', n=16, m=6)
k.build(HERE, {'id': 'MK-146', 'name': 'Oxygen canister'}, bake_size=512,
        view=dict(yaw=30, pitch=18), fps_eye=((0.25, -0.55, 0.85), (0, 0, 0.35)))

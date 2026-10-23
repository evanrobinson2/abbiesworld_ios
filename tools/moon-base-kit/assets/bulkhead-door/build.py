"""MK-035 Bulkhead door, round pressure hatch. Round 2, matched to the pick: a deep bezelled round hatch in a panelled
wall, a big orange porthole in the middle of the door, a green door-state ring (green: the next module holds air;
amber: cycling; red: stop), a chunky hinge on the left and latch dogs on the right, and a locking wheel."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
wall = k.box('WallPanel', (2.6, 0.24, 2.7), (0, 0.04, 1.35), 'Metal_Hull', bevel=0.04, fill=0.4)
k.cut(wall, k.cutter_cyl(0.85, 1.0, (0, 0, 1.3), rot=(math.pi / 2, 0, 0), n=24))
k.box('WallTrimL', (0.12, 0.3, 2.7), (-1.3, 0.04, 1.35), 'Metal_Hazard', bevel=0.02)
k.cyl('HatchBezel', 1.08, 0.18, (0, -0.12, 1.3), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=24, bevel=0.04, fill=0.4)
bez = k._parts[-1]
k.cut(bez, k.cutter_cyl(0.86, 1.0, (0, -0.12, 1.3), rot=(math.pi / 2, 0, 0), n=24))
k.torus('StateRing', 0.97, 0.028, (0, -0.22, 1.3), 'Lamp_Green', rot=(math.pi / 2, 0, 0), n=32, m=6)
door = k.cyl('Hatch', 0.84, 0.16, (0, -0.1, 1.3), 'Metal_Hull', rot=(math.pi / 2, 0, 0), n=24, bevel=0.04, fill=0.5)
k.cyl('HatchRing', 0.6, 0.06, (0, -0.2, 1.3), 'Metal_HullDark', rot=(math.pi / 2, 0, 0), n=24, bevel=0.02)
k.cyl('PortholeBezel', 0.3, 0.1, (0, -0.24, 1.3), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=16, bevel=0.03)
k.cyl('Porthole', 0.22, 0.04, (0, -0.29, 1.3), 'Window_Warm', rot=(math.pi / 2, 0, 0), n=16, bevel=0.02)
k.torus('LockWheel', 0.2, 0.03, (-0.5, -0.3, 1.3), 'Metal_Gunmetal', rot=(math.pi / 2, 0, 0), n=14, m=6)
for i in range(3):
    k.box(f'WheelSpoke{i}', (0.38, 0.03, 0.04), (-0.5, -0.3, 1.3), 'Metal_Gunmetal', bevel=0, rot=(0, TAU * i / 6, 0))
for i, z in enumerate((0.85, 1.75)):
    k.box(f'Hinge{i}', (0.36, 0.22, 0.22), (-1.0, -0.2, z), 'Metal_Gunmetal', bevel=0.05)
    k.cyl(f'HingePin{i}', 0.06, 0.32, (-1.12, -0.25, z), 'Metal_Steel', n=10)
for i, a in enumerate((-0.6, 0.0, 0.6)):
    k.box(f'LatchDog{i}', (0.22, 0.2, 0.16), (0.95 * math.cos(a), -0.2, 1.3 + 0.95 * math.sin(a)), 'Metal_Gunmetal', bevel=0.04,
          rot=(0, -a, 0))
k.box('Sill', (1.7, 0.45, 0.1), (0, -0.2, 0.05), 'Metal_Hazard', bevel=0.02)
k.box('CyclePanel', (0.28, 0.08, 0.4), (1.05, -0.12, 1.35), 'Metal_Charcoal', bevel=0.02)
k.box('CycleButton', (0.14, 0.05, 0.14), (1.05, -0.17, 1.4), 'Lamp_Green', bevel=0.02)
k.build(HERE, {'id': 'MK-035', 'name': 'Bulkhead door, round pressure hatch'}, bake_size=1024,
        view=dict(yaw=24, pitch=6), fps_eye=((0.3, -2.4, 1.1), (0, 0, 1.25)))

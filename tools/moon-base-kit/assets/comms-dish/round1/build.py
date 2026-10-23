"""MK-005 Comms dish on a turntable. A 3.2 m dish on a yoke, a feed horn on three struts, a counterweight and a red
blinker. It turns to follow Earth; when it is talking to home its feed lamp glows and the turntable hums."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Plinth', 1.0, 0.3, (0, 0, 0.15), 'Metal_HullDark', n=12, bevel=0.03)
k.cyl('Turntable', 0.8, 0.25, (0, 0, 0.42), 'Metal_Gunmetal', n=16, bevel=0.03, fill=0.5)
k.box('YokeBase', (1.2, 0.6, 0.3), (0, 0, 0.7), 'Metal_Charcoal', bevel=0.03, fill=0.5)
for s in (-1, 1):
    k.box(f'YokeArm{"L" if s < 0 else "R"}', (0.16, 0.4, 1.3), (s * 0.55, 0, 1.4), 'Metal_Charcoal', bevel=0.02, fill=0.5)
el = math.radians(38)
cx, cy, cz = 0, 0.1, 2.0
k.cyl('ElevationAxle', 0.09, 1.3, (cx, cy - 0.1, cz), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=8)
k.box('DishHub', (0.5, 0.5, 0.35), (cx, cy - 0.05, cz), 'Metal_Gunmetal', bevel=0.03, rot=(-el, 0, 0), fill=0.5)
d = k.bowl('Dish', 1.6, 0.42, (cx, cy - 0.05, cz), 'Metal_Hull', rot=(math.pi / 2 - el, 0, math.pi), seg=20, rings=5, thick=0.05, fill=0.4)
import mathutils
axis = mathutils.Euler((math.pi / 2 - el, 0, math.pi)).to_matrix() @ mathutils.Vector((0, 0, 1))
hub = mathutils.Vector((cx, cy - 0.05, cz))
feed = hub + axis * 1.45
for i in range(3):
    t = TAU * i / 3
    rim = mathutils.Euler((math.pi / 2 - el, 0, math.pi)).to_matrix() @ mathutils.Vector((1.3 * math.cos(t), 1.3 * math.sin(t), 0.3))
    k.tube(f'FeedStrut{i}', [tuple(hub + rim), tuple(feed)], 0.025, 'Metal_Steel', n=6)
k.cyl('FeedHorn', 0.14, 0.3, tuple(feed), 'Metal_Gunmetal', rot=(math.pi / 2 - el, 0, math.pi), n=10, r2=0.07)
k.sphere('FeedLamp', 0.06, tuple(feed + axis * -0.18), 'HeadlightGlass', seg=8, rings=5)
k.box('Counterweight', (0.6, 0.5, 0.5), tuple(hub - axis * 0.7), 'Metal_Gunmetal', bevel=0.04,
      rot=(math.pi / 2 - el, 0, math.pi))
k.cyl('BlinkerPost', 0.03, 0.5, (0.7, 0.5, 1.1), 'Metal_Steel', n=6)
k.sphere('Blinker', 0.07, (0.7, 0.5, 1.38), 'Lamp_Red', seg=8, rings=5)
k.build(HERE, {'id': 'MK-005', 'name': 'Comms dish on a turntable'}, bake_size=1024,
        view=dict(yaw=200, pitch=18), fps_eye=((-1.0, 4.2, 1.1), (0, 0, 1.8)))

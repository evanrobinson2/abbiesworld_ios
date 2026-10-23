"""MK-005 Comms dish on a turntable. Round 2, matched to the pick: a domed, framed turntable housing with warm orange
windows, a yoke and a 3.2 m panelled dish with a feed on three struts and a red blinker. It turns to follow Earth;
when it is talking to home the windows pulse and the turntable hums."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Plinth', 1.15, 0.18, (0, 0, 0.09), 'Metal_Gunmetal', n=12, bevel=0.03)
k.cyl('Housing', 0.95, 0.7, (0, 0, 0.53), 'Metal_Hull', n=12, r2=0.75, bevel=0.04, fill=0.3)
k.cyl('HousingRim', 0.8, 0.12, (0, 0, 0.92), 'Metal_Gunmetal', n=12, bevel=0.02)
for i, a in enumerate((-0.35, 0.35)):
    k.window(f'HousingWindow{i}', 0.34, 0.26, (0.87 * math.sin(a) * 0.98, -0.82 * math.cos(a), 0.5), depth=0.08)
k.cyl('Turntable', 0.55, 0.22, (0, 0, 1.08), 'Metal_Gunmetal', n=12, bevel=0.03)
for s in (-1, 1):
    k.box(f'YokeArm{"L" if s < 0 else "R"}', (0.2, 0.45, 1.0), (s * 0.5, 0, 1.6), 'Metal_Hull', bevel=0.05, fill=0.4)
    k.box(f'YokeCap{"L" if s < 0 else "R"}', (0.26, 0.5, 0.12), (s * 0.5, 0, 2.1), 'Metal_Gunmetal', bevel=0.03)
el = math.radians(38)
import mathutils
R = mathutils.Euler((math.pi / 2 - el, 0, 0)).to_matrix()
axis = R @ mathutils.Vector((0, 0, 1))
hub = mathutils.Vector((0, -0.05, 2.05))
k.cyl('ElevationAxle', 0.1, 1.2, tuple(hub), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=10)
k.box('DishHub', (0.55, 0.55, 0.35), tuple(hub), 'Metal_Gunmetal', bevel=0.05, rot=(math.pi / 2 - el, 0, 0))
k.bowl('Dish', 1.6, 0.45, tuple(hub + axis * 0.12), 'Metal_Hull', rot=(math.pi / 2 - el, 0, 0), seg=20, rings=5, thick=0.06, fill=0.4)
k.torus('DishRim', 1.6, 0.04, tuple(hub + axis * 0.57), 'Metal_Gunmetal', rot=(math.pi / 2 - el, 0, 0), n=24, m=5)
feed = hub + axis * 1.6
for i in range(3):
    t = TAU * i / 3 + 0.5
    rim = R @ mathutils.Vector((1.5 * math.cos(t), 1.5 * math.sin(t), 0.5))
    k.tube(f'FeedStrut{i}', [tuple(hub + rim), tuple(feed)], 0.025, 'Metal_Gunmetal', n=6)
k.cyl('FeedHorn', 0.13, 0.28, tuple(feed), 'Metal_Gunmetal', rot=(math.pi / 2 - el, 0, 0), n=10, r2=0.07)
k.sphere('FeedLamp', 0.06, tuple(feed - axis * 0.17), 'HeadlightGlass', seg=8, rings=5)
k.box('Counterweight', (0.6, 0.5, 0.45), tuple(hub - axis * 0.55), 'Metal_Gunmetal', bevel=0.06, rot=(math.pi / 2 - el, 0, 0))
k.cyl('BlinkerPost', 0.03, 0.4, tuple(feed + mathutils.Vector((0, 0, 0.2))), 'Metal_Steel', n=6)
k.sphere('Blinker', 0.06, tuple(feed + mathutils.Vector((0, 0, 0.42))), 'Lamp_Red', seg=8, rings=5)
k.build(HERE, {'id': 'MK-005', 'name': 'Comms dish on a turntable'}, bake_size=1024,
        view=dict(yaw=24, pitch=14), fps_eye=((1.2, -4.3, 1.1), (0, 0, 1.7)))

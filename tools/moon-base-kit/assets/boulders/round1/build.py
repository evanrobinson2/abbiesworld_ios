"""MK-098 Boulder set: three basalt boulders (a big cover rock, a medium one and a sitting rock), angular and pitted,
each sunk into a low drift of dust where it landed. Each has its own mass, so the small one can be shoved in low
gravity and the big one stops a gem bug."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
for i, (s, x, y, sq) in enumerate(((1.3, 0, 0, 0.7), (0.75, 1.9, -0.7, 0.8), (0.42, -1.5, -1.0, 0.65))):
    tag = 'LMS'[i]
    k.rock(f'Boulder{tag}', s, (x, y, 0), squash=sq, seed=i + 21, sink=0.3)
    k.cyl(f'DustDrift{tag}', s * 1.35, s * 0.12, (x, y, s * 0.06), 'Stone_Regolith', n=9, r2=s * 1.0, bevel=0)
for j in range(6):
    a = TAU * j / 6 + 0.3
    k.rock(f'Pebble{j}', 0.12, (0.4 + 2.2 * math.cos(a) * 0.7, -0.4 + 1.6 * math.sin(a) * 0.7, 0), squash=0.6, seed=40 + j)
k.build(HERE, {'id': 'MK-098', 'name': 'Boulder set (three)'}, bake_size=1024,
        view=dict(yaw=30, pitch=16), fps_eye=((0.8, -4.0, 1.1), (0, 0, 0.8)))

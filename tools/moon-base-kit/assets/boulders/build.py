"""MK-098 Boulder set. Round 2, matched to the pick: a cluster of six dark basalt boulders, one tall standing stone
with smaller rocks leaning round it, sunk into a low drift of pale dust with pebbles scattered where they landed. Each
rock has its own mass, so the small ones can be shoved in low gravity and the big one stops a gem bug."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.rock('DustDrift', 2.4, (0.2, 0.1, 0), 'Stone_Regolith', squash=0.08, seed=7, sink=0.5, sub=3, jag=0.08)
for i, (s, x, y, sq) in enumerate(((1.05, 0.5, 0.5, 1.35), (0.8, -0.9, 0.1, 1.0), (0.72, 1.5, -0.2, 0.95),
                                    (0.55, -0.3, -0.8, 0.85), (0.5, 0.9, -1.0, 0.8), (0.38, -1.7, -0.7, 0.8))):
    k.rock(f'Boulder{i}', s, (x, y, 0.05), 'Stone_BasaltDark', squash=sq, seed=i + 31, sink=0.2, sub=2, jag=0.2)
for j in range(10):
    a = TAU * j / 10 + 0.3
    rr = 2.2 + 0.6 * math.sin(j * 2.3)
    k.rock(f'Pebble{j}', 0.08 + 0.04 * (j % 3), (0.2 + rr * math.cos(a), 0.1 + rr * 0.75 * math.sin(a), 0), 'Stone_BasaltDark',
           squash=0.6, seed=40 + j)
k.build(HERE, {'id': 'MK-098', 'name': 'Boulder set'}, bake_size=1024,
        view=dict(yaw=12, pitch=14), fps_eye=((0.6, -4.2, 1.1), (0.2, 0, 0.8)))

"""MK-003 Landing pad with beacon ring. Round 2, matched to the pick: a raised round pad 12 m across on a thick
segmented plinth with warm orange windows all round its side, a hazard-gold ring and target circles on the deck, and a
ring of beacon posts with amber lamps that chase toward the pad when a lander is inbound (the diegetic approach signal;
closes the remaster study's open beacon-ring item)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Plinth', 6.2, 0.7, (0, 0, 0.35), 'Metal_Hull', n=24, bevel=0.08, fill=0.4)
k.cyl('PlinthFoot', 6.4, 0.12, (0, 0, 0.06), 'Metal_Gunmetal', n=24, bevel=0.03)
k.cyl('Deck', 5.9, 0.08, (0, 0, 0.72), 'Stone_Basalt', n=24, bevel=0.02)
k.cyl('DeckRim', 6.15, 0.1, (0, 0, 0.7), 'Metal_Gunmetal', n=24, bevel=0.03)
for i, (R, w) in enumerate(((4.8, 0.3), (2.6, 0.14), (1.2, 0.14))):
    k.torus(f'TargetRing{i}', R, w / 2, (0, 0, 0.765), 'Metal_Hazard' if i == 0 else 'Plastic_White', n=40, m=4)
for i in range(24):
    a = TAU * (i + 0.5) / 24
    x, y = 6.18 * math.cos(a), 6.18 * math.sin(a)
    if i % 2 == 0:
        k.box(f'SideWindow{i:02d}', (1.0, 0.08, 0.3), (x, y, 0.38), 'Window_Warm', bevel=0.05, rot=(0, 0, a + math.pi / 2))
    k.box(f'Buttress{i:02d}', (0.24, 0.3, 0.72), (6.15 * math.cos(a - TAU / 48), 6.15 * math.sin(a - TAU / 48), 0.36),
          'Metal_Gunmetal', bevel=0.04, rot=(0, 0, a))
for ring_r, n, tag in ((5.4, 12, 'Outer'), (3.4, 8, 'Inner')):
    for i in range(n):
        a = TAU * i / n
        x, y = ring_r * math.cos(a), ring_r * math.sin(a)
        k.cyl(f'Beacon{tag}Post{i:02d}', 0.05, 0.7, (x, y, 1.1), 'Metal_Gunmetal', n=8)
        k.sphere(f'Beacon{tag}Lamp{i:02d}', 0.1, (x, y, 1.5), 'Lamp_Amber', seg=8, rings=5)
k.cyl('CentreBeacon', 0.25, 0.14, (0, 0, 0.83), 'Lamp_Amber', n=12, bevel=0.03)
k.build(HERE, {'id': 'MK-003', 'name': 'Landing pad with beacon ring'}, bake_size=1024,
        view=dict(hero_cam=((7.5, -13.0, 4.2), (0, -0.5, 0.6))), fps_eye=((2.6, -9.6, 1.1), (0, 0, 0.8)))

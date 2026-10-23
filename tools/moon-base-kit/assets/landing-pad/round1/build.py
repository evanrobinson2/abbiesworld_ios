"""MK-003 Landing pad with beacon ring. A sintered-regolith slab 12 m across with a steel kerb, a painted hazard ring,
a touchdown circle of amber inset lights and a ring of 12 beacon posts that chase toward the pad when a lander is
inbound (the diegetic approach signal; this closes the remaster study's open beacon-ring item)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.cyl('Slab', 6.0, 0.25, (0, 0, 0.125), 'Stone_Basalt', n=24, bevel=0.04)
k.cyl('KerbRing', 6.15, 0.18, (0, 0, 0.09), 'Metal_HullDark', n=24, bevel=0.02)
for i in range(24):
    a = TAU * (i + 0.5) / 24
    k.box(f'HazardTile{i:02d}', (0.6, 1.4, 0.02), (4.9 * math.cos(a), 4.9 * math.sin(a), 0.26), 'Metal_Hazard',
          bevel=0.005, rot=(0, 0, a))
for i in range(16):
    a = TAU * i / 16
    k.cyl(f'TouchdownLight{i:02d}', 0.09, 0.03, (2.6 * math.cos(a), 2.6 * math.sin(a), 0.255), 'Lamp_Amber', n=8)
for i in range(4):
    a = TAU * i / 4
    k.box(f'CrossBar{i}', (1.6, 0.18, 0.02), (0.95 * math.cos(a), 0.95 * math.sin(a), 0.26), 'Plastic_White',
          bevel=0.004, rot=(0, 0, a))
for i in range(12):
    a = TAU * i / 12
    x, y = 6.9 * math.cos(a), 6.9 * math.sin(a)
    k.cyl(f'BeaconBase{i:02d}', 0.16, 0.12, (x, y, 0.06), 'Metal_Gunmetal', n=8, bevel=0.01)
    k.cyl(f'BeaconPost{i:02d}', 0.05, 0.9, (x, y, 0.55), 'Metal_Gunmetal', n=8)
    k.cyl(f'BeaconLamp{i:02d}', 0.09, 0.16, (x, y, 1.08), 'Lamp_Amber' if i % 3 == 0 else 'LampOff_Amber', n=8, bevel=0.01)
    k.cyl(f'BeaconCap{i:02d}', 0.11, 0.04, (x, y, 1.18), 'Metal_Gunmetal', n=8, bevel=0.008)
k.box('ServicePanel', (0.6, 0.35, 0.9), (0, -7.8, 0.45), 'Metal_Charcoal', bevel=0.03, fill=0.4)
k.cyl('ServiceLamp', 0.05, 0.05, (0, -7.98, 0.75), 'Lamp_Green', rot=(math.pi / 2, 0, 0), n=10)
k.build(HERE, {'id': 'MK-003', 'name': 'Landing pad with beacon ring'}, bake_size=1024,
        view=dict(hero_cam=((5.5, -12.5, 6.5), (0, -0.5, 0))), fps_eye=((2.6, -9.6, 1.1), (0, 0, 0.2)))

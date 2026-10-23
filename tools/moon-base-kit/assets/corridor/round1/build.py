"""MK-031 Corridor segment, straight, ribbed. The kit's base piece: 4 m long on the 2 m grid, 2.4 m wide, 2.6 m tall,
with a chamfered octagonal section. Grated floor over a cable trough, hull wall panels, gunmetal ribs every metre with
handholds for low-g, a pipe run on the left wall, a cable tray on the right, a warm light strip in the ceiling and
painted wayfinding stripes on the floor (diegetic: follow the orange stripe home)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
L, W, H, C = 4.0, 2.4, 2.6, 0.45  # length, width, height, corner chamfer
k.box('FloorTrough', (W - 0.2, L, 0.12), (0, 0, 0.06), 'Metal_HullDark', bevel=0.0)
k.box('FloorGrate', (1.4, L, 0.04), (0, 0, 0.14), 'Metal_Grate', bevel=0.0)
for s in (-1, 1):
    k.box(f'FloorPlate{"L" if s < 0 else "R"}', (0.45, L, 0.06), (s * 0.925, 0, 0.13), 'Metal_HullDark', bevel=0.01)
    k.box(f'Wall{"L" if s < 0 else "R"}', (0.08, L, H - 2 * C), (s * (W / 2), 0, H / 2), 'Metal_Hull', bevel=0.0)
    k.box(f'UpperBevel{"L" if s < 0 else "R"}', (0.08, L, C * 1.42), (s * (W / 2 - C / 2), 0, H - C / 2), 'Metal_Hull',
          bevel=0.0, rot=(0, s * math.radians(45), 0))
    k.box(f'LowerBevel{"L" if s < 0 else "R"}', (0.08, L, C * 1.42), (s * (W / 2 - C / 2), 0, C / 2), 'Metal_HullDark',
          bevel=0.0, rot=(0, -s * math.radians(45), 0))
k.box('Ceiling', (W - 2 * C, L, 0.08), (0, 0, H), 'Metal_Hull', bevel=0.0)
k.box('LightStrip', (0.3, L - 0.3, 0.03), (0, 0, H - 0.05), 'HeadlightGlass', bevel=0.0)
k.box('WayStripe', (0.12, L, 0.005), (0.55, 0, 0.165), 'OrangeBand', bevel=0.0)
for j in range(5):
    y = -L / 2 + j * 1.0
    k.box(f'RibFloor{j}', (W, 0.16, 0.1), (0, y, 0.05), 'Metal_Gunmetal', bevel=0.015)
    k.box(f'RibTop{j}', (W - 2 * C + 0.1, 0.16, 0.12), (0, y, H - 0.02), 'Metal_Gunmetal', bevel=0.015)
    for s in (-1, 1):
        k.box(f'RibWall{j}{"L" if s < 0 else "R"}', (0.12, 0.16, H - 2 * C + 0.1), (s * (W / 2 - 0.06), y, H / 2),
              'Metal_Gunmetal', bevel=0.015)
        k.box(f'RibUpper{j}{"L" if s < 0 else "R"}', (0.12, 0.16, C * 1.5), (s * (W / 2 - C / 2 - 0.04), y, H - C / 2 - 0.02),
              'Metal_Gunmetal', bevel=0.015, rot=(0, s * math.radians(45), 0))
        k.box(f'RibLower{j}{"L" if s < 0 else "R"}', (0.12, 0.16, C * 1.5), (s * (W / 2 - C / 2 - 0.04), y, C / 2 + 0.02),
              'Metal_Gunmetal', bevel=0.015, rot=(0, -s * math.radians(45), 0))
    if 0 < j < 4:
        k.torus(f'Handhold{j}', 0.1, 0.018, (W / 2 - 0.2, y, 1.25), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=10, m=6)
k.tube('PipeRunUpper', [(-W / 2 + 0.2, -L / 2, 1.9), (-W / 2 + 0.2, L / 2, 1.9)], 0.06, 'Metal_Steel', n=8)
k.tube('PipeRunLower', [(-W / 2 + 0.22, -L / 2, 1.7), (-W / 2 + 0.22, L / 2, 1.7)], 0.04, 'Metal_OxygenBlue', n=8)
k.cyl('PipeValve', 0.12, 0.03, (-W / 2 + 0.36, 0.5, 1.7), 'Metal_Hazard', rot=(0, math.pi / 2, 0), n=10)
k.box('CableTray', (0.12, L, 0.06), (W / 2 - 0.16, 0, 2.0), 'Metal_Grate', bevel=0.0)
k.tube('CableBundle', [(W / 2 - 0.16, -L / 2, 2.05), (W / 2 - 0.16, L / 2, 2.05)], 0.035, 'Rubber_Black', n=6)
k.box('WallSign', (0.04, 0.5, 0.22), (W / 2 - 0.1, -0.5, 1.55), 'Metal_Hazard', bevel=0.005)
k.build(HERE, {'id': 'MK-031', 'name': 'Corridor segment, straight, ribbed'}, bake_size=1024,
        view=dict(hero_cam=((0.9, -4.4, 1.9), (0, 0.6, 1.2)), lens=28), fps_eye=((-0.3, -2.4, 1.1), (0.0, 2.0, 1.15)))

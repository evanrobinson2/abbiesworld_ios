"""MK-031 Corridor segment, straight, ribbed. Round 2, matched to the pick: the kit's base piece, 4 m on the 2 m grid,
an octagonal tube with thick dark end frames and two mid ribs, off-white hull panels outside with small orange
windows, and a warm inside: wall ribs, a grated floor with an orange wayfinding stripe (follow it home), a light strip,
a pipe run and handholds for low gravity."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
L, W, H, C = 4.0, 2.6, 2.7, 0.55
def octo(name, y, depth, mtl, inset, thick):
    parts = []
    hw, hh = W / 2 + inset, H / 2 + inset
    pts = [(-hw + C, 0), (hw - C, 0), (hw, C), (hw, H + 2 * inset - C), (hw - C, H + 2 * inset), (-hw + C, H + 2 * inset),
           (-hw, H + 2 * inset - C), (-hw, C)]
    for i in range(8):
        a, b = pts[i], pts[(i + 1) % 8]
        mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - inset
        ln = math.dist(a, b)
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        parts.append(k.box(f'{name}_', (ln + thick * 0.8, depth, thick), (mx, y, mz), mtl, bevel=thick * 0.25, rot=(0, -ang, 0)))
    return k.merge(name, parts)
octo('Shell', 0, L, 'Metal_Hull', 0.0, 0.12)
for i, y in enumerate((-L / 2 + 0.15, L / 2 - 0.15)):
    octo(f'EndFrame{i}', y, 0.3, 'Metal_Gunmetal', 0.12, 0.3)
for i, y in enumerate((-0.6, 0.6)):
    octo(f'Rib{i}', y, 0.18, 'Metal_Gunmetal', 0.07, 0.16)
    octo(f'InnerRib{i}', y, 0.14, 'Metal_HullDark', -0.1, 0.1)
k.box('FloorGrate', (1.5, L - 0.2, 0.05), (0, 0, 0.1), 'Metal_Grate', bevel=0)
k.box('WayStripe', (0.12, L - 0.3, 0.01), (0.6, 0, 0.13), 'OrangeBand', bevel=0)
k.box('LightStrip', (0.35, L - 0.6, 0.04), (0, 0, H - 0.08), 'HeadlightGlass', bevel=0.01)
for s in (-1, 1):
    for j, y in enumerate((-1.3, 1.3)):
        k.window(f'Window{"L" if s < 0 else "R"}{j}', 0.32, 0.5, (s * (W / 2 + 0.03), y, 1.45), face='+X' if s > 0 else '-X', depth=0.1)
k.tube('PipeRun', [(-W / 2 + 0.25, -L / 2, 2.0), (-W / 2 + 0.25, L / 2, 2.0)], 0.06, 'Metal_Steel', n=8)
k.torus('Handhold', 0.1, 0.02, (W / 2 - 0.2, 0, 1.25), 'Metal_Hazard', rot=(math.pi / 2, 0, 0), n=10, m=6)
k.build(HERE, {'id': 'MK-031', 'name': 'Corridor segment, straight, ribbed', 'pivot': 'pivot on the walkable floor; the shell beds 0.27 m into the ground'}, bake_size=1024,
        view=dict(hero_cam=((3.6, -6.4, 2.4), (0, 0, 1.2)), lens=40, lights=(((0, 0, 2.2), 60),)),
        fps_eye=((-0.3, -2.6, 1.1), (0.0, 2.0, 1.15)))

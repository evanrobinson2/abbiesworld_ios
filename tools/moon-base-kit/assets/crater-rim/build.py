"""MK-096 Crater rim arc piece. Round 2, matched to the pick: a half crater 12 m across, a pale dusty bowl floor
sweeping up to a crown of broken dark basalt crags along the back of the rim, a few rocks rolled down onto the floor
and ejecta outside. Two of these close a crater; the crags make low-g FPS cover and a lookout to climb. Colours follow
the regolith grammar (simulations/moon/moon-regolith.mjs)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
import bmesh, bpy
from mathutils import noise, Vector
R, NA, NR = 6.0, 28, 11
bm = bmesh.new()
rows = []
for j in range(NR + 1):
    rr = 0.15 + (R + 2.25) * j / NR  # radial span: the bowl floor out past the rim
    row = []
    for i in range(NA + 1):
        a = math.pi * i / NA
        d = rr - R
        h = 2.2 * math.exp(-(d / 1.5) ** 2) if d > 0 else -0.8 + 3.0 * max(0.0, 1 + d / 2.6) ** 1.6
        h = min(max(h, -0.8), 2.2) + (0.25 if d > -2.6 else 0.06 * min(1.0, max(0.0, rr - 1.5))) * noise.noise(Vector((rr * 0.6, a * 6, 0.3)))
        edge = min(i, NA - i) / 3.0
        if edge < 1 and h > -0.5:
            h *= 0.55 + 0.45 * edge
        row.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), h)))
    rows.append(row)
for j in range(NR):
    for i in range(NA):
        bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
bmesh.ops.triangulate(bm, faces=bm.faces[:])
# a skirt under the surface so it reads as a solid chunk from the side
me = bpy.data.meshes.new('RimSurface')
bm.to_mesh(me)
bm.free()
o = bpy.data.objects.new('RimSurface', me)
bpy.context.collection.objects.link(o)
md = o.modifiers.new('thick', 'SOLIDIFY')
md.thickness = 0.6
md.offset = -1
k.apply_mods(o)
k._finish(o, 'Stone_Regolith', 0, fill=1.0)
import random
random.seed(3)
# the crown: broken basalt crags along the back of the rim, tallest in the middle
for row, (n, r0, z0, smin, smax) in enumerate(((30, R + 0.1, 2.0, 0.75, 1.15), (22, R - 1.2, 0.9, 0.5, 0.85))):
    for i in range(n):
        a = 0.1 + (math.pi - 0.2) * (i + random.uniform(-0.35, 0.35)) / (n - 1)
        mid = 0.55 + 0.45 * math.sin(a)
        s = random.uniform(smin, smax) * mid
        rr = r0 + random.uniform(-0.3, 0.4)
        k.rock(f'RimCrag{row}{i:02d}', s, (rr * math.cos(a), rr * math.sin(a), z0 * mid), 'Stone_BasaltDark',
               squash=random.uniform(0.85, 1.25), seed=80 + 40 * row + i, sink=0.2, sub=2, jag=0.2)
for i, (x, y, s) in enumerate(((-2.2, 2.0, 0.35), (-1.6, 1.8, 0.45), (1.4, 2.6, 0.22))):
    k.rock(f'FloorRock{i}', s, (x, y, -0.55), 'Stone_BasaltDark', seed=120 + i, squash=0.7)
for i in range(8):
    a = random.uniform(0.2, math.pi - 0.2)
    rr = R + random.uniform(1.4, 2.4)
    k.rock(f'EjectaRock{i}', random.uniform(0.2, 0.45), (rr * math.cos(a), rr * math.sin(a), 0.1), 'Stone_BasaltDark', seed=60 + i, squash=0.75)
k.build(HERE, {'id': 'MK-096', 'name': 'Crater rim, half crater', 'pivot': 'crater centre, so two halves rotate into a whole crater'}, bake_size=1024,
        view=dict(hero_cam=((3.5, -17.0, 7.5), (0.0, 2.0, 0.0))), fps_eye=((0.8, -1.0, 0.6), (0.0, 5.5, 1.4)))

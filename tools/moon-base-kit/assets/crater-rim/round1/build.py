"""MK-096 Crater rim arc piece: a quarter arc of a 9 m crater's raised lip, built as a faceted height field (inner wall
falls away steeply, outer flank slopes gently) with ejecta boulders on the outside. Four of these close a crater; they
also make low-g FPS cover. Colours follow the regolith grammar (simulations/moon/moon-regolith.mjs)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
import bmesh, bpy
from mathutils import noise, Vector
R, NA, NR = 9.0, 22, 9
bm = bmesh.new()
rows = []
for j in range(NR + 1):
    rr = R - 3.0 + 7.0 * j / NR  # radial span: 6 m (inner) to 13 m (outer)
    row = []
    for i in range(NA + 1):
        a = (math.pi / 2) * i / NA
        d = rr - R
        h = 1.5 * math.exp(-(d / 1.3) ** 2) if d > 0 else 1.5 * math.exp(-(d / 0.8) ** 2) - 0.7 * min(1, -d / 2.5)
        h = max(h, -0.8) + 0.25 * noise.noise(Vector((rr * 0.6, a * 6, 0.3)))
        edge = min(i, NA - i) / 3.0
        if edge < 1:
            h *= 0.55 + 0.45 * edge
        row.append(bm.verts.new((rr * math.cos(a) - R, rr * math.sin(a) - R, h)))
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
for i in range(9):
    a = random.uniform(0.15, 1.4)
    rr = R + random.uniform(1.2, 3.6)
    s = random.uniform(0.25, 0.7)
    k.rock(f'EjectaRock{i}', s, (rr * math.cos(a) - R, rr * math.sin(a) - R, 0.15), seed=60 + i, squash=0.75)
k.build(HERE, {'id': 'MK-096', 'name': 'Crater rim arc piece'}, bake_size=1024,
        view=dict(hero_cam=((6.0, -9.0, 5.0), (-3.0, -3.0, 0.3))), fps_eye=((2.0, -3.0, 1.1), (-3.0, -2.0, 0.8)))

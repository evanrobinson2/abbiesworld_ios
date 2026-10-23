"""Stone edging for the Ranch tile (replaces simulations/regional-assets/GF-010.glb).

A straight row of 8 rounded, faceted grey edging stones (squashed low-poly boulders, two in a paler grey),
touching, with small size and rotation variation. Chunky white daisies with yellow centres and yellow
marigold-like blooms grow from the gaps and around the base on short stems, with low leafy tufts along the base.
The row runs along X and keeps the old GF-010's 1.25 m length (to_game copies the GLB as-is, no rescale),
so the stones keep the brief's 0.30 x 0.25 x 0.22 proportions scaled to fit.
Z up, metres, origin at the centre of the row on the ground, front -Y. No animation.
usage: python build.py            (writes stone-edging.glb next to this file)
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=11,
    stones=8,
    length=1.25,                    # overall row length incl. the end tufts (old GF-010)
    stone_l=0.166, stone_d=0.138, stone_h=0.128,   # brief 0.30 x 0.25 x 0.22, scaled to fit 8 in the length
    size_var=0.07, yaw_var=12.0, y_var=0.008,
    pale=(2, 6),                    # which stones are Stone_Pale
    segs=9,
    profile=[(0.0, 0.84), (0.36, 1.0), (0.74, 0.90), (0.94, 0.58)],   # (height fraction, radius fraction) rings; then a top point
    jitter=0.08,
    # (x, y, head height, head radius)
    daisies=[(-0.45, -0.085, 0.100, 0.044), (-0.34, -0.088, 0.108, 0.040), (-0.22, -0.090, 0.075, 0.020),
             (0.15, -0.080, 0.115, 0.044), (0.27, -0.088, 0.058, 0.016), (-0.50, 0.03, 0.150, 0.020),
             (0.36, 0.03, 0.155, 0.020), (-0.06, 0.03, 0.140, 0.016)],
    marigolds=[(-0.47, 0.02, 0.152, 0.024), (-0.31, 0.03, 0.146, 0.026), (-0.03, 0.03, 0.156, 0.022),
               (0.06, 0.03, 0.150, 0.020), (0.22, -0.088, 0.108, 0.032), (0.50, -0.085, 0.098, 0.032),
               (0.43, 0.03, 0.165, 0.020)],
    tufts=16, tuft_leaves=4, tuft_len=(0.05, 0.08), tuft_w=0.032,   # tufts sit in the gaps, front and back
    head_dir=(-0.40, -1.0, 0.35),   # flower faces turn toward the hero camera
)

COL = {  # sRGB sampled from the hero
    'Stone_Grey': (0.58, 0.57, 0.52), 'Stone_Pale': (0.70, 0.68, 0.62),
    'Petal_White': (0.97, 0.95, 0.90), 'Petal_Yellow': (0.95, 0.68, 0.06),
    'Flower_Yellow': (0.93, 0.62, 0.03), 'Leaf_Green': (0.33, 0.40, 0.12),
}


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.88 if name.startswith('Stone') else 0.75
    m.use_backface_culling = False
    return m


class Part:
    """Collects triangles for one material; becomes one mesh object."""
    def __init__(self):
        self.v, self.f = [], []

    def add(self, verts, faces):
        o = len(self.v); self.v += [tuple(p) for p in verts]; self.f += [tuple(i + o for i in t) for t in faces]

    def obj(self, name, mat):
        me = bpy.data.meshes.new(name); me.from_pydata(self.v, [], self.f); me.update()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(name, me); o.data.materials.append(material(mat))
        bpy.context.scene.collection.objects.link(o)
        return o


def boulder(part, c, l, d, h, yaw, rnd):
    """Faceted squashed boulder: rings from the profile (staggered half a segment each) and a top point; open bottom."""
    segs, prof = P['segs'], P['profile']
    rot = Matrix.Rotation(math.radians(yaw), 3, 'Z')
    verts, faces = [], []
    for ri, (t, rad) in enumerate(prof):
        for s in range(segs):
            a = 2 * math.pi * (s + 0.5 * (ri % 2)) / segs
            j = 1 + rnd.uniform(-P['jitter'], P['jitter'])
            z = 0.0 if t == 0 else (t + rnd.uniform(-0.04, 0.04)) * h
            verts.append(rot @ Vector((math.cos(a) * rad * j * l / 2, math.sin(a) * rad * j * d / 2, z)) + c)
    top = len(verts); verts.append(rot @ Vector((rnd.uniform(-0.01, 0.01), rnd.uniform(-0.01, 0.01), h)) + c)
    n = len(prof)
    for ri in range(n - 1):
        for s in range(segs):
            a0, a1 = ri * segs + s, ri * segs + (s + 1) % segs
            b0, b1 = (ri + 1) * segs + s, (ri + 1) * segs + (s + 1) % segs
            if ri % 2 == 0:
                faces += [(a0, a1, b0), (a1, b1, b0)]
            else:
                faces += [(a0, a1, b1), (a0, b1, b0)]
    for s in range(segs):
        faces.append(((n - 1) * segs + s, (n - 1) * segs + (s + 1) % segs, top))
    part.add(verts, faces)


def frame(direction):
    z = Vector(direction).normalized(); x = Vector((0, 0, 1)).cross(z)
    if x.length < 1e-4:
        x = Vector((1, 0, 0))
    x.normalize(); y = z.cross(x)
    return x, y, z


def star(part, c, r, n, inner, direction, cup=0.0, twist=0.0):
    x, y, z = frame(direction)
    vs = [c - z * cup * r * 0.6]
    for i in range(2 * n):
        a = twist + math.pi * i / n; rr = r if i % 2 == 0 else r * inner
        vs.append(c + x * math.cos(a) * rr + y * math.sin(a) * rr + z * (cup * r * 0.3 if i % 2 == 0 else 0))
    part.add(vs, [(0, 1 + i, 1 + (i + 1) % (2 * n)) for i in range(2 * n)])


def disc(part, c, r, n, direction, dome):
    x, y, z = frame(direction)
    vs = [c + z * dome] + [c + x * math.cos(2 * math.pi * i / n) * r + y * math.sin(2 * math.pi * i / n) * r for i in range(n)]
    part.add(vs, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])


def stem(part, base, top, w):
    """A flat ribbon turned to face the hero camera (2 triangles)."""
    side = Vector((0.9, -0.4, 0)).normalized() * w
    part.add([base - side, base + side, top + side * 0.7, top - side * 0.7], [(0, 1, 2), (0, 2, 3)])


def leaf(part, base, ang, length, width, up):
    d = Vector((math.cos(ang), math.sin(ang), up)).normalized()
    side = Vector((-math.sin(ang), math.cos(ang), 0)) * width / 2
    mid = base + d * length * 0.45 + Vector((0, 0, 0.004))
    part.add([base, mid + side, base + d * length, mid - side], [(0, 1, 2), (0, 2, 3)])


def build():
    rnd = random.Random(P['seed'])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = {k: Part() for k in COL}
    n = P['stones']; pitch = (P['length'] - P['stone_l']) / (n - 1)
    for i in range(n):
        k = 1 + rnd.uniform(-P['size_var'], P['size_var'])
        x = -(n - 1) / 2 * pitch + i * pitch + rnd.uniform(-0.004, 0.004)
        c = Vector((x, rnd.uniform(-P['y_var'], P['y_var']), 0))
        boulder(parts['Stone_Pale' if i in P['pale'] else 'Stone_Grey'], c, P['stone_l'] * k, P['stone_d'] * k,
                P['stone_h'] * (1 + rnd.uniform(-P['size_var'], P['size_var'])), rnd.uniform(-P['yaw_var'], P['yaw_var']), rnd)
    hd = Vector(P['head_dir'])
    for (x, y, h, r) in P['daisies']:
        base = Vector((x, y, 0)); top = Vector((x + rnd.uniform(-0.01, 0.01), y - 0.01, h))
        stem(parts['Leaf_Green'], base, top, 0.004)
        dirn = (hd + Vector((rnd.uniform(-.3, .3), rnd.uniform(-.2, .2), rnd.uniform(-.1, .3)))).normalized()
        star(parts['Petal_White'], top, r, 11 if r > 0.025 else 7, 0.62, dirn, twist=rnd.uniform(0, 1))
        disc(parts['Flower_Yellow'], top + dirn * 0.004, r * 0.34, 5 if r > 0.025 else 4, dirn, r * 0.25)
    for (x, y, h, r) in P['marigolds']:
        base = Vector((x, y, 0)); top = Vector((x + rnd.uniform(-0.01, 0.01), y - 0.01, h))
        stem(parts['Leaf_Green'], base, top, 0.004)
        dirn = (hd + Vector((rnd.uniform(-.3, .3), 0, 0.6))).normalized()
        star(parts['Petal_Yellow'], top, r, 10, 0.65, dirn, cup=0.8, twist=rnd.uniform(0, 1))
    half = P['length'] / 2 - 0.03
    spots = [-(n / 2 - 1) * pitch + k * pitch for k in range(n - 1)]   # the gaps between stones
    for t in range(P['tufts']):
        x = spots[(t // 2) % len(spots)] + rnd.uniform(-0.02, 0.02)
        y = (-1 if t % 2 == 0 else 1) * (P['stone_d'] / 2 - 0.005) + rnd.uniform(-0.01, 0.01)
        base = Vector((x, y, 0))
        for k in range(P['tuft_leaves']):
            leaf(parts['Leaf_Green'], base, rnd.uniform(0, 6.28), rnd.uniform(*P['tuft_len']), P['tuft_w'], rnd.uniform(0.3, 0.8))
    names = {'Stone_Grey': 'stones', 'Stone_Pale': 'stones_pale', 'Petal_White': 'daisy_petals', 'Petal_Yellow': 'marigolds',
             'Flower_Yellow': 'daisy_centres', 'Leaf_Green': 'stems_leaves'}
    tris = 0
    for m, p in parts.items():
        if p.f:
            parts[m].obj(names[m], m); tris += len(p.f)
    print('triangles', tris)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'stone-edging.glb'), export_format='GLB', export_animations=False,
                              export_apply=True)


if __name__ == '__main__':
    build()

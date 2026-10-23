"""Charming (storybook) stone edging for the Ranch tile (replaces simulations/regional-assets/GF-010.glb).

A straight row of 8 rounded, faceted grey edging stones (squashed low-poly boulders, two in a paler grey),
touching, with small size and rotation variation. Chunky white daisies with yellow centres and yellow
marigold-like blooms grow from the gaps and around the base on short stems, with low leafy tufts along the base.
The row runs along X and keeps the old GF-010's 1.25 m length (to_game copies the GLB as-is, no rescale),
so the stones keep the brief's 0.30 x 0.25 x 0.22 proportions scaled to fit.
Z up, metres, origin at the centre of the row on the ground, front -Y. No animation.
usage: python build.py            (writes stone-edging-charming.glb next to this file)
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=7,
    stones=8,
    length=1.25,                    # overall row length incl. the end tufts (old GF-010, the same as the normal stone-edging)
    stone_span=1.17,                # the stones themselves; low grass tufts fill out each end to the full length
    stone_l=0.172, stone_d=0.150, stone_h=0.135,   # chubby: nearly as tall as they are deep
    size_var=0.08, yaw_var=10.0, y_var=0.010,
    scale=[0.95, 1.05, 1.0, 0.95, 1.0, 1.0, 1.08, 1.16],   # per stone: the hero's near (+X) end stones are the plumpest
    lean=6.0,                       # deg: each stone leans a little, storybook-style
    sink=0.008,                     # stones sit into the ground so a lean never lifts an edge
    pale=(1, 4, 6),                 # which stones are Stone_Pale
    segs=7,
    profile=[(0.0, 0.88), (0.34, 1.0), (0.70, 0.90), (0.93, 0.56)],   # (height fraction, radius fraction) rings; then a top point
    jitter=0.05,
    # big daisies: (x, y, head height, head radius); the ends bounce up, the middle dips
    daisies=[(-0.46, 0.03, 0.320, 0.058), (-0.38, 0.05, 0.320, 0.048), (-0.27, 0.02, 0.305, 0.046),
             (-0.12, 0.04, 0.290, 0.044), (0.04, 0.05, 0.285, 0.042), (0.25, 0.04, 0.300, 0.048),
             (0.38, 0.03, 0.305, 0.056), (0.50, 0.04, 0.280, 0.052), (-0.14, -0.088, 0.120, 0.038),
             (0.02, -0.092, 0.110, 0.032)],
    # yellow buds (Petal_Yellow, closed cups): (x, y, height, radius)
    buds=[(-0.52, 0.02, 0.265, 0.020), (-0.26, 0.05, 0.255, 0.018), (0.15, 0.04, 0.250, 0.018),
          (0.58, 0.02, 0.255, 0.018), (0.10, -0.095, 0.090, 0.016)],
    # leafy humps (Leaf_Green, faceted domes) heaped behind and over the stones: (x, length, height)
    humps=[(-0.44, 0.22, 0.26), (-0.27, 0.24, 0.25), (-0.07, 0.24, 0.245), (0.13, 0.24, 0.24), (0.33, 0.24, 0.25),
           (0.48, 0.20, 0.25)],
    hump_y=0.060, hump_d=0.13, hump_segs=7,
    mound_leaves=24, mound_z=(0.16, 0.24), mound_len=(0.08, 0.13), mound_w=0.055,   # plump leaves heaped behind/over the stones
    front_leaves=4, front_len=(0.05, 0.08), front_w=0.035,                          # little tufts at the front foot
    head_dir=(0.40, -1.0, 0.80),    # flower faces turn to the front-right and up, for the hero and the tile's high camera
)

COL = {  # sRGB sampled from the charming hero
    'Stone_Grey': (0.78, 0.71, 0.60), 'Stone_Pale': (0.85, 0.79, 0.67),
    'Petal_White': (0.98, 0.96, 0.90), 'Petal_Yellow': (0.96, 0.72, 0.10),
    'Flower_Yellow': (0.96, 0.66, 0.05), 'Leaf_Green': (0.44, 0.62, 0.20),
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
    def __init__(self, smooth=False):
        self.v, self.f, self.smooth, self.sm = [], [], smooth, []

    def add(self, verts, faces, smooth=None):
        o = len(self.v); self.v += [tuple(p) for p in verts]; self.f += [tuple(i + o for i in t) for t in faces]
        self.sm += [self.smooth if smooth is None else smooth] * len(faces)

    def obj(self, name, mat):
        me = bpy.data.meshes.new(name); me.from_pydata(self.v, [], self.f); me.update()
        for p, sm in zip(me.polygons, self.sm):
            p.use_smooth = sm
        o = bpy.data.objects.new(name, me); o.data.materials.append(material(mat))
        bpy.context.scene.collection.objects.link(o)
        return o


def boulder(part, c, l, d, h, yaw, lean, rnd):
    """Plump pebble: rings from the profile (staggered half a segment) and a top point, open bottom, smooth-shaded.
    `lean` = (deg about X, deg about Y) tips it over a little about its base centre."""
    segs, prof = P['segs'], P['profile']
    rot = Matrix.Rotation(math.radians(yaw), 3, 'Z') @ Euler((math.radians(lean[0]), math.radians(lean[1]), 0)).to_matrix()
    c = c + Vector((0, 0, -P['sink']))
    verts, faces = [], []
    for ri, (t, rad) in enumerate(prof):
        for s in range(segs):
            a = 2 * math.pi * (s + 0.5 * (ri % 2)) / segs
            j = 1 + rnd.uniform(-P['jitter'], P['jitter'])
            z = 0.0 if t == 0 else (t + rnd.uniform(-0.03, 0.03)) * h
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


def stem(part, base, top, w, bend=0.0):
    """A flat ribbon turned to face the hero camera (2 triangles); `bend` leans the head over, bouncy."""
    side = Vector((0.9, 0.4, 0)).normalized() * w
    top = top + Vector((bend, 0, 0))
    part.add([base - side, base + side, top + side * 0.7, top - side * 0.7], [(0, 1, 2), (0, 2, 3)])


def leaf(part, base, ang, length, width, up):
    """A plump oval leaf: widest past the middle, a slight cup (4 triangles)."""
    d = Vector((math.cos(ang), math.sin(ang), up)).normalized()
    side = Vector((-math.sin(ang), math.cos(ang), 0)) * width / 2
    lift = Vector((0, 0, 0.006))
    a = base + d * length * 0.30 + lift; b = base + d * length * 0.72 + lift * 1.5
    part.add([base, a + side * 0.85, b + side, base + d * length, b - side, a - side * 0.85],
             [(0, 1, 5), (1, 2, 4), (1, 4, 5), (2, 3, 4)])


def build():
    rnd = random.Random(P['seed'])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = {k: Part(smooth=k.startswith('Stone')) for k in COL}
    n = P['stones']; sc = P['scale']
    widths = [P['stone_l'] * s for s in sc]; gap = (P['stone_span'] - sum(widths)) / (n - 1)
    xs = [-P['stone_span'] / 2 + sum(widths[:i]) + gap * i + widths[i] / 2 for i in range(n)]
    pitch = (P['length'] - P['stone_l']) / (n - 1)
    for i in range(n):
        k = sc[i] * (1 + rnd.uniform(-P['size_var'], P['size_var']) * 0.5)
        x = xs[i] + rnd.uniform(-0.004, 0.004)
        c = Vector((x, rnd.uniform(-P['y_var'], P['y_var']), 0))
        lean = (rnd.uniform(-P['lean'], P['lean']), rnd.uniform(-P['lean'], P['lean']))
        boulder(parts['Stone_Pale' if i in P['pale'] else 'Stone_Grey'], c, P['stone_l'] * k, P['stone_d'] * k,
                P['stone_h'] * sc[i] * (1 + rnd.uniform(-P['size_var'], P['size_var'])), rnd.uniform(-P['yaw_var'], P['yaw_var']), lean, rnd)
    hd = Vector(P['head_dir'])
    for (x, y, h, r) in P['daisies']:
        base = Vector((x, y, 0.02)); top = Vector((x + rnd.uniform(-0.02, 0.02), y - 0.01, h))
        stem(parts['Leaf_Green'], base, top, 0.005, rnd.uniform(-0.015, 0.015))
        dirn = (hd + Vector((rnd.uniform(-.3, .3), rnd.uniform(-.2, .2), rnd.uniform(-.1, .3)))).normalized()
        star(parts['Petal_White'], top, r, 7, 0.70, dirn, cup=0.25, twist=rnd.uniform(0, 1))
        disc(parts['Flower_Yellow'], top + dirn * 0.005, r * 0.38, 5, dirn, r * 0.30)
    for (x, y, h, r) in P['buds']:
        base = Vector((x, y, 0.02)); top = Vector((x + rnd.uniform(-0.01, 0.01), y - 0.01, h))
        stem(parts['Leaf_Green'], base, top, 0.004, rnd.uniform(-0.01, 0.01))
        dirn = (hd + Vector((rnd.uniform(-.3, .3), 0, 1.4))).normalized()
        star(parts['Petal_Yellow'], top, r, 4, 0.75, dirn, cup=1.4, twist=rnd.uniform(0, 1))
    half = P['length'] / 2
    for (x, l, h) in P['humps']:   # chubby leafy humps: a faceted dome per hump (base ring, staggered mid ring, top)
        sg = P['hump_segs']; c = Vector((x, P['hump_y'] + rnd.uniform(-0.01, 0.01), 0.03))
        vs = []
        rings = [(0.0, 1.0), (0.50, 0.95), (0.84, 0.66)]
        for ri, (t, rad) in enumerate(rings):
            for k2 in range(sg):
                a = 2 * math.pi * (k2 + 0.5 * ri) / sg; j = 1 + rnd.uniform(-0.12, 0.12)
                vs.append(c + Vector((math.cos(a) * rad * j * l / 2, math.sin(a) * rad * j * P['hump_d'] / 2, t * (h - 0.03))))
        vs.append(c + Vector((rnd.uniform(-0.02, 0.02), 0, h - 0.03)))
        fs = []; nr = len(rings)
        for ri in range(nr - 1):
            for k2 in range(sg):
                a0, a1, b0, b1 = ri * sg + k2, ri * sg + (k2 + 1) % sg, (ri + 1) * sg + k2, (ri + 1) * sg + (k2 + 1) % sg
                fs += [(a0, a1, b0), (a1, b1, b0)] if ri % 2 == 0 else [(a0, a1, b1), (a0, b1, b0)]
        for k2 in range(sg):
            fs.append(((nr - 1) * sg + k2, (nr - 1) * sg + (k2 + 1) % sg, nr * sg))
        parts['Leaf_Green'].add(vs, fs, smooth=True)   # soft, pillowy humps; the leaves stay faceted
    for t in range(P['mound_leaves']):   # the leafy heap behind and over the stones, fanning out and up
        x = -half + 0.06 + (P['length'] - 0.12) * (t + rnd.uniform(0, 1)) / P['mound_leaves']
        base = Vector((x, rnd.uniform(0.0, 0.06), rnd.uniform(*P['mound_z'])))
        ang = rnd.choice([rnd.uniform(-2.6, -0.5), rnd.uniform(0.6, 2.5)])
        leaf(parts['Leaf_Green'], base, ang, rnd.uniform(*P['mound_len']), P['mound_w'], rnd.uniform(0.2, 0.9))
    spots = [-(n / 2 - 1) * pitch + k * pitch for k in range(n - 1)]   # the gaps between stones
    for t in range(P['front_leaves']):
        x = spots[(t * 3) % len(spots)] + rnd.uniform(-0.03, 0.03)
        base = Vector((x, -P['stone_d'] / 2 + rnd.uniform(-0.01, 0.01), 0))
        leaf(parts['Leaf_Green'], base, rnd.uniform(-2.6, -0.5), rnd.uniform(*P['front_len']), P['front_w'], rnd.uniform(0.3, 0.9))
    for sgn in (-1, 1):   # low end tufts: grass fanning out along the ground past each end stone
        for k2, ang in enumerate((0.25, -0.35, 0.0)):
            a = (0 if sgn > 0 else math.pi) + sgn * ang
            base = Vector((sgn * (P['stone_span'] / 2 - 0.02), -0.03 + 0.03 * k2, 0))
            leaf(parts['Leaf_Green'], base, a, P['length'] / 2 - P['stone_span'] / 2 + 0.02, P['front_w'], 0.25 + 0.15 * k2)
    names = {'Stone_Grey': 'stones', 'Stone_Pale': 'stones_pale', 'Petal_White': 'daisy_petals', 'Petal_Yellow': 'buds',
             'Flower_Yellow': 'daisy_centres', 'Leaf_Green': 'stems_leaves'}
    tris = 0
    for m, p in parts.items():
        if p.f:
            parts[m].obj(names[m], m); tris += len(p.f)
    print('triangles', tris)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'stone-edging-charming.glb'), export_format='GLB', export_animations=False,
                              export_apply=True)


if __name__ == '__main__':
    build()

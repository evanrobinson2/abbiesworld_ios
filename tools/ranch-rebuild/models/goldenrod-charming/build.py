"""Goldenrod, charming (storybook toy) version (Ranch tile meadow flower, charming twin of models/goldenrod, installs as
simulations/regional-assets-charming/WW-347.glb): a bushy toy clump. Eight chubby stems lean and bow a little, each
crowned by a fat plume of plump teardrop petals that splay out and up like a bottle brush, the tallest in the centre;
big soft oval leaves climb the stems and splay from a broad leafy foot.

usage: python build.py      writes goldenrod-charming.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (plant group).
Built in plant units (top of the tallest plume = 1, read off the hero), then scaled so the top sits at HEIGHT, the same
height as the normal model. Same materials as the normal one (Flower_Gold, Flower_GoldLight, Stem_Rust, Leaf_Green,
Leaf_Dark). Each petal is a 4-sided teardrop (8 triangles); each leaf is a puffed oval card with a raised midrib
(6 triangles, double-sided material).
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'goldenrod-charming'

P = {
    'HEIGHT': 0.837,            # final top (m), the same as the normal goldenrod (old WW-347 height)
    'CAM_ELEV': 6,              # the hero's camera height (deg)
    # stems: (u tip across, v tip height in the hero, y depth (+ back), plume start (fraction of stem), plume width)
    'STEMS': [
        (-0.030, 0.990, 0.02, 0.67, 0.20),     # centre, tallest
        (0.060, 0.800, 0.10, 0.64, 0.16),      # centre-right, behind
        (0.190, 0.780, 0.03, 0.70, 0.16),      # right top
        (0.235, 0.540, -0.02, 0.64, 0.15),     # right low
        (0.085, 0.440, -0.11, 0.60, 0.16),     # front, centre-right low
        (-0.235, 0.670, 0.02, 0.64, 0.17),     # left
        (-0.185, 0.440, -0.09, 0.58, 0.17),    # left low, front
        (-0.080, 0.640, 0.11, 0.70, 0.14),     # mid-left, behind
    ],
    'BASE_R': 0.08,
    'BASE_SHIFT': -0.04,        # the hero's leafy foot sits a little left of the plumes
    'FAN_POW': 1.4,             # x(s) ~ s^FAN_POW: stems rise near-upright, then fan out
    'BOW': 0.035,               # sideways bow at mid-stem (plant units): the bouncy toy curve
    'LEAN': -3.0,               # whole clump leans this many degrees to +X (charming tilt; the hero leans left)
    # plumes: petals on a golden-angle spiral from the plume foot to the tip
    'PETALS': 9,
    'PROFILE': [(0.0, 0.75), (0.25, 1.0), (0.6, 0.85), (1.0, 0.45)],   # petal length along the plume (x plume width)
    'PETAL_LEN': 0.85,          # petal length = plume width x this x profile
    'PETAL_FAT': 0.42,          # petal radius / length: plump
    'SPLAY': (60, 18),          # petal angle off the stem at the plume foot and at the tip (deg)
    'LIGHT_SHARE': 0.4,
    'STEM_R': (0.017, 0.009), 'STEM_SIDES': 3, 'STEM_SEGS': 2,
    # leaves: big soft ovals up each stem below the plume, and a splayed rosette at the foot
    'STEM_LEAVES': 4, 'LEAF_LEN': (0.20, 0.26), 'LEAF_W': 0.075, 'LEAF_ELEV': (5, 35),
    'N_BASE': 20, 'BASE_LEN': (0.20, 0.27), 'BASE_W': 0.090, 'BASE_Z': (0.0, 0.30), 'BASE_ELEV': (22, 55),
    'BASE_SPREAD': 0.13,        # rosette leaf feet radius (the low ones, shrinking upward)
    'DROOP': 0.25,              # leaf tip droop (x length): soft and heavy
    'DEPTH': 0.75,              # depth squash of the leaf scatter (front-back vs across)
    'DARK_SHARE': 0.35,
    'SPREAD': 1.0,              # final horizontal stretch
    'SQUASH_Y': 0.72,           # final front-back squash, keeps the plan close to the normal model's width/depth
    'SEED': 3,
}
COL = {'Flower_Gold': (232, 172, 18), 'Flower_GoldLight': (250, 208, 52), 'Stem_Rust': (112, 128, 52),
       'Leaf_Green': (112, 142, 58), 'Leaf_Dark': (66, 98, 38)}
RND = random.Random(P['SEED'])


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False          # exported double-sided: leaf cards show from both sides
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


def frame(t):
    t = t.normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
    u = up.cross(t).normalized(); return u, t.cross(u)


def tube(path, r0, r1, sides):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * i / (len(path) - 1)
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r for a in (2 * math.pi * k / sides for k in range(sides))])
    n = sides; V = [p for r in rings for p in r]; F = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        F += [(a + k, a + (k + 1) % n, b + (k + 1) % n, b + k) for k in range(n)]
    return V, F


def petal(base, d, L):
    """Plump teardrop petal from base along d: a 4-point ring 45 % up between the base and a rounded-off tip. 8 triangles."""
    u, v = frame(d); rot = RND.random() * 6.28; R = L * P['PETAL_FAT']
    V = [base, base + d * L]
    for k in range(4):
        a = rot + math.pi * k / 2
        V.append(base + d * (0.45 * L) + (u * math.cos(a) + v * math.sin(a)) * R * RND.uniform(0.9, 1.1))
    F = []
    for k in range(4):
        a, b = 2 + k, 2 + (k + 1) % 4
        F += [(0, b, a), (1, a, b)]
    return V, F


def leaf(base, d, side, L, W, droop):
    """Puffed oval leaf: base, two side points each at 30 % and 68 % up, a tip dropped by droop, and a raised midrib point.
    6 triangles."""
    nrm = d.cross(side).normalized()
    if nrm.z < 0:
        nrm = -nrm
    def pt(t, w, lift=0.0):
        return base + d * (t * L) + side * (w * W) + nrm * lift - Vector((0, 0, droop * L * t * t))
    V = [pt(0, 0), pt(0.30, 0.85, 0.1 * W), pt(0.68, 0.75, 0.1 * W), pt(1, 0), pt(0.68, -0.75, 0.1 * W), pt(0.30, -0.85, 0.1 * W),
         pt(0.48, 0, 0.35 * W)]
    return V, [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6)]


def prof(t):
    pr = P['PROFILE']
    for (t0, a0), (t1, a1) in zip(pr, pr[1:]):
        if t <= t1:
            return a0 + (a1 - a0) * (t - t0) / (t1 - t0)
    return pr[-1][1]


def at(b, T, s):
    """Stem point at s in [0, 1]: height linear, horizontal offset ~ s^FAN_POW, plus a sideways bow peaking mid-stem."""
    f = s ** P['FAN_POW']
    h = Vector((T.x - b.x, T.y - b.y, 0)); side = Vector((-h.y, h.x, 0)).normalized() if h.length > 1e-4 else Vector((1, 0, 0))
    if side.x < 0:
        side = -side
    return Vector((b.x + (T.x - b.x) * f, b.y + (T.y - b.y) * f, T.z * s)) + side * P['BOW'] * math.sin(math.pi * s)


def tangent(b, T, s):
    return (at(b, T, min(1, s + 0.02)) - at(b, T, max(0, s - 0.02))).normalized()


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    e = math.radians(P['CAM_ELEV'])
    flowers = {'Flower_Gold': [], 'Flower_GoldLight': []}
    leaves = {'Leaf_Green': [], 'Leaf_Dark': []}
    stems = []
    pick = lambda dark: 'Leaf_Dark' if RND.random() < dark else 'Leaf_Green'
    ga = math.pi * (3 - math.sqrt(5))
    for i, (u, vv, y, p0, W) in enumerate(P['STEMS']):
        z = (vv - y * math.sin(e)) / math.cos(e)
        T = Vector((u, y, z))
        th = math.atan2(u, -y) if abs(u) + abs(y) > 1e-3 else 0.0
        hd = Vector((math.sin(th), -math.cos(th), 0))
        b = hd * P['BASE_R'] * RND.uniform(0.3, 1.0); b.y *= P['DEPTH']; b.x += P['BASE_SHIFT']
        n = P['STEM_SEGS']
        stems.append(tube([at(b, T, k / n) for k in range(n + 1)], *P['STEM_R'], P['STEM_SIDES']))
        # plume: petals on a spiral, splayed wide at the foot and closing up to the tip, longest a quarter of the way up
        K = P['PETALS']; rot0 = RND.random() * 6.28
        for k in range(K):
            t = k / (K - 1)
            s = p0 + (1 - p0) * t * 0.93
            c = at(b, T, s); ax = tangent(b, T, s)
            L = W * P['PETAL_LEN'] * prof(t) * RND.uniform(0.92, 1.08)
            if k == K - 1:
                d = ax                              # the tip petal points straight along the stem
            else:
                u0, v0 = frame(ax); a = rot0 + k * ga
                out = u0 * math.cos(a) + v0 * math.sin(a)
                sp = math.radians(P['SPLAY'][0] + (P['SPLAY'][1] - P['SPLAY'][0]) * t)
                d = (ax * math.cos(sp) + out * math.sin(sp)).normalized()
            name = 'Flower_GoldLight' if (k >= K - 2 or RND.random() < P['LIGHT_SHARE']) else 'Flower_Gold'
            flowers[name].append(petal(c - d * L * 0.08, d, L))
        # big soft leaves up the stem below the plume
        n = P['STEM_LEAVES']
        for k in range(n):
            s = p0 * (0.2 + 0.8 * (k + RND.uniform(0.3, 0.7)) / n)
            p = at(b, T, s)
            a = th + (1 if (k + i) % 2 else -1) * RND.uniform(0.7, 1.6)
            el = math.radians(RND.uniform(*P['LEAF_ELEV']))
            d = Vector((math.sin(a) * math.cos(el), -math.cos(a) * math.cos(el), math.sin(el))).normalized()
            side = Matrix.Rotation(math.radians(RND.uniform(-25, 25)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
            leaves[pick(P['DARK_SHARE'] * (1.2 - s))].append(leaf(p, d, side, RND.uniform(*P['LEAF_LEN']), P['LEAF_W'], P['DROOP']))
    # foot: a rosette of big oval leaves splaying in every direction, the low ones nearly flat
    for i in range(P['N_BASE']):
        a = i * ga + RND.uniform(-0.2, 0.2)
        f = i / (P['N_BASE'] - 1)
        z = P['BASE_Z'][0] + (P['BASE_Z'][1] - P['BASE_Z'][0]) * f
        h = Vector((math.sin(a), -math.cos(a) * P['DEPTH'], 0))
        base = h * P['BASE_SPREAD'] * (1 - 0.6 * f) + Vector((P['BASE_SHIFT'], 0, z))
        el = math.radians(P['BASE_ELEV'][0] + (P['BASE_ELEV'][1] - P['BASE_ELEV'][0]) * f + RND.uniform(-6, 6))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-25, 25)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
        Lb = RND.uniform(*P['BASE_LEN']) * (1 - 0.25 * f)
        leaves[pick(P['DARK_SHARE'] + 0.25 * (1 - f))].append(leaf(base, d, side, Lb, P['BASE_W'], P['DROOP'] * 0.7))

    for name, lst in flowers.items():
        make('plumes_' + ('light' if name.endswith('Light') else 'gold'), *merge(*lst), name)
    V, F = merge(*stems); make('stems', [Vector((v[0], v[1], max(v[2], 0))) for v in V], F, 'Stem_Rust')
    for name, lst in leaves.items():
        V, F = merge(*lst)
        make('leaves_' + name.split('_')[1].lower(), [Vector((v[0], v[1], max(v[2], 0.003))) for v in V], F, name)
    # lean, centre the ground footprint on the origin and scale to the normal model's height
    lean = Matrix.Identity(4); lean[0][2] = math.tan(math.radians(P['LEAN']))
    for ob in bpy.context.scene.objects:
        ob.data.transform(lean)
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    zmax = max(p.z for p in ps); s = P['HEIGHT'] / zmax
    low = [p for p in ps if p.z < 0.05]          # the footprint: what touches the ground
    cx = (max(p.x for p in low) + min(p.x for p in low)) / 2; cy = (max(p.y for p in low) + min(p.y for p in low)) / 2
    for ob in bpy.context.scene.objects:
        ob.data.transform(Matrix.Translation((-cx, -cy, 0)))
        ob.data.transform(Matrix.Diagonal((s * P['SPREAD'], s * P['SPREAD'] * P['SQUASH_Y'], s, 1.0)))


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, NAME + '.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()

"""Goldenrod (Ranch tile meadow flower, replaces simulations/regional-assets/WW-347.glb): a tall upright clump like a
bunch of flames. Nine slender rust stems rise from a narrow leafy base and fan out a little; the top third to half of
each is a long feathery golden plume that tapers to a point and arches outward at the tip, the tallest in the centre.

usage: python build.py      writes goldenrod.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (plant group).
Built in plant units (top of the tallest plume = 1, read off the hero), then scaled so the top sits at HEIGHT, the old
GLB's height. Each plume is a stack of jagged low-poly blobs (a 6-point star ring between two apexes, 12 triangles)
that shrink towards the tip, with a few side sprigs at the plume foot. Leaves are folded lance cards (2 triangles,
double-sided material).
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'HEIGHT': 0.837,            # final top (m): the old WW-347 is 0.837 m tall, 0.39 x 0.33 m in plan
    'CAM_ELEV': 6,              # the hero's camera height (deg)
    # stems: (u tip across, v tip height in the hero, y depth (+ back), plume start (fraction of stem), plume width)
    # plant units: hero bbox height = 1, u from the clump axis
    'STEMS': [
        (0.040, 0.992, 0.03, 0.50, 0.140),     # centre, tallest
        (-0.090, 0.810, 0.10, 0.52, 0.110),    # centre-left, behind
        (-0.227, 0.843, 0.04, 0.50, 0.120),    # left tall
        (-0.120, 0.700, -0.06, 0.55, 0.100),   # left-mid, front
        (0.240, 0.770, 0.06, 0.52, 0.115),     # right
        (0.290, 0.630, -0.03, 0.52, 0.100),    # far right
        (0.330, 0.490, 0.02, 0.40, 0.090),     # far right low
        (-0.350, 0.490, -0.02, 0.38, 0.100),   # far left low
        (0.000, 0.560, -0.12, 0.40, 0.130),    # front centre, short
    ],
    'BASE_R': 0.06,
    'BASE_SHIFT': -0.012,       # the hero's foot sits a little left of the plumes' centre
    'W_SCALE': 1.9,             # plume width multiplier             # stem feet inside this radius
    'FAN_POW': 1.5,             # x(s) ~ s^FAN_POW: stems rise near-upright, then fan (arch) outward near the tip
    'CLUMPS': 5,                # stacked blobs per plume
    'PROFILE': [0.8, 1.0, 0.9, 0.65, 0.38],   # blob radius along the plume, bottom to tip (x plume width)
    'CLUMP_OVERLAP': 1.7,       # blob length = plume length / CLUMPS x this
    'JAG': 0.40,
    'TILT': 14,                 # random blob tilt (deg), so the stacks look ragged, not beaded                # random blob tip variation
    'SPRIGS': 0,                # small side blobs at the plume foot, angled out
    'LIGHT_SHARE': 0.35,        # share of blobs in Flower_GoldLight (the tip blob is always light)
    'STEM_R': (0.014, 0.006), 'STEM_SIDES': 3, 'STEM_SEGS': 2,
    # leaves up each stem (below the plume), denser low
    'STEM_LEAVES': 10, 'LEAF_LEN': (0.09, 0.14), 'LEAF_W': 0.020, 'LEAF_ELEV': (15, 55),
    # base: leaves splaying from the crown, and a lumpy dark core keeping the base solid
    'N_BASE': 50, 'BASE_LEN': (0.20, 0.30), 'BASE_W': 0.036, 'BASE_Z': (0.0, 0.34), 'BASE_ELEV': (40, 75),
    'CORE': [(0.0, 0.15), (0.16, 0.16), (0.32, 0.12), (0.44, 0.03)], 'CORE_LUMP': 0.2, 'CORE_SIDES': 6,
    'DEPTH': 0.65,              # depth squash of the base and leaf scatter (front-back vs across)
    'DARK_SHARE': 0.4,
    'SPREAD': 1.0,              # final horizontal stretch
    'SQUASH_Y': 0.82,           # final front-back squash, keeps the plan near the old 0.39 x 0.33 m footprint
    'SEED': 3,
}
COL = {'Flower_Gold': (206, 158, 30), 'Flower_GoldLight': (238, 202, 72), 'Stem_Rust': (168, 92, 40),
       'Leaf_Green': (98, 118, 50), 'Leaf_Dark': (52, 70, 24)}
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


def blob(c, d, L, R):
    """A jagged pointed blob along d: a 6-point star ring (3 long tips, 3 short) 40 % up, between a bottom and a long
    top apex. 12 triangles. Reads as a fluffy pointed clump, not a smooth cone."""
    u, v = frame(d); rot = RND.random() * 6.28
    V = [c - d * 0.4 * L, c + d * 0.6 * L]
    for k in range(6):
        a = rot + math.pi * k / 3
        r = R * ((1.0 + RND.uniform(-P['JAG'], P['JAG'])) if k % 2 == 0 else 0.62)
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * r + d * (RND.uniform(-0.08, 0.12) * L))
    F = []
    for k in range(6):
        a, b = 2 + k, 2 + (k + 1) % 6
        F += [(0, b, a), (1, a, b)]
    return V, F


def leaf(base, d, side, L, W, droop):
    """Folded lance leaf card: base, two side points a third of the way up, tip dropped by droop. 2 triangles."""
    nrm = d.cross(side).normalized()
    tip = base + d * L - Vector((0, 0, droop * L))
    s1 = base + d * (0.38 * L) + side * W + nrm * W * 0.3
    s2 = base + d * (0.38 * L) - side * W + nrm * W * 0.3
    return [base, s1, tip, s2], [(0, 1, 2), (0, 2, 3)]


def core_r(z):
    pr = P['CORE']
    for (z0, r0), (z1, r1) in zip(pr, pr[1:]):
        if z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return pr[-1][1]


def stem_path(b, T, n):
    """Stem from foot b to tip T: height linear, horizontal offset ~ s^FAN_POW (upright, then arching outward)."""
    pts = []
    for i in range(n + 1):
        s = i / n; f = s ** P['FAN_POW']
        pts.append(Vector((b.x + (T.x - b.x) * f, b.y + (T.y - b.y) * f, T.z * s)))
    return pts


def at(b, T, s):
    f = s ** P['FAN_POW']
    return Vector((b.x + (T.x - b.x) * f, b.y + (T.y - b.y) * f, T.z * s))


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    e = math.radians(P['CAM_ELEV'])
    flowers = {'Flower_Gold': [], 'Flower_GoldLight': []}
    leaves = {'Leaf_Green': [], 'Leaf_Dark': []}
    stems = []
    pick = lambda dark: 'Leaf_Dark' if RND.random() < dark else 'Leaf_Green'
    for i, (u, vv, y, p0, W) in enumerate(P['STEMS']):
        z = (vv - y * math.sin(e)) / math.cos(e)
        T = Vector((u, y, z))
        th = math.atan2(u, -y) if abs(u) + abs(y) > 1e-3 else 0.0
        hd = Vector((math.sin(th), -math.cos(th), 0))
        b = hd * P['BASE_R'] * RND.uniform(0.3, 1.0); b.y *= P['DEPTH']; b.x += P['BASE_SHIFT']
        stems.append(tube(stem_path(b, T, P['STEM_SEGS']), *P['STEM_R'], P['STEM_SIDES']))
        # plume: stacked blobs from s = p0 to the tip, shrinking upward
        K = P['CLUMPS']; L = (1 - p0) * z / K * P['CLUMP_OVERLAP']
        for k in range(K):
            s = p0 + (1 - p0) * (k + 0.5) / K
            if k == K - 1:
                s = 1 - 0.32 * L / z            # the tip blob's apex lands on the stem tip
            c = at(b, T, s); d = (at(b, T, min(1, s + 0.02)) - at(b, T, s - 0.02)).normalized()
            if k < K - 1:
                ax = Vector((RND.uniform(-1, 1), RND.uniform(-1, 1), 0)).normalized()
                d = Matrix.Rotation(math.radians(RND.uniform(-P['TILT'], P['TILT'])), 3, ax) @ d
            R = W * 0.5 * P['W_SCALE'] * P['PROFILE'][k]
            Lk = L * (1.25 if k == K - 1 else 1.0)
            name = 'Flower_GoldLight' if (k == K - 1 or RND.random() < P['LIGHT_SHARE']) else 'Flower_Gold'
            flowers[name].append(blob(c + Vector((RND.uniform(-.015, .015), RND.uniform(-.01, .01), 0)), d, Lk, R))
        # side sprigs: small blobs angled out from the plume foot
        for k in range(P['SPRIGS']):
            s = p0 + (1 - p0) * RND.uniform(0.0, 0.3)
            c = at(b, T, s); sd = 1 if k % 2 == 0 else -1
            side = Vector((math.cos(th), math.sin(th), 0)) * sd
            d = (side * 0.9 + Vector((0, 0, 1.0))).normalized()
            Ls = L * 0.7
            flowers['Flower_Gold'].append(blob(c + d * Ls * 0.45, d, Ls, W * 0.3 * P['W_SCALE']))
        # leaves up the stem below the plume, denser low
        n = P['STEM_LEAVES']
        for k in range(n):
            s = p0 * ((k + RND.uniform(0.2, 0.8)) / n) ** 1.4
            p = at(b, T, s)
            a = th + (1 if k % 2 else -1) * RND.uniform(0.5, 1.6)
            el = math.radians(RND.uniform(*P['LEAF_ELEV']))
            d = Vector((math.sin(a) * math.cos(el), -math.cos(a) * math.cos(el), math.sin(el))).normalized()
            side = Matrix.Rotation(math.radians(RND.uniform(-30, 30)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
            leaves[pick(P['DARK_SHARE'] * (1.3 - s))].append(leaf(p, d, side, RND.uniform(*P['LEAF_LEN']), P['LEAF_W'], 0.12))
    # base: narrow leaves out of the crown and core surface, in every direction
    ga = math.pi * (3 - math.sqrt(5))
    for i in range(P['N_BASE']):
        a = i * ga + RND.uniform(-0.2, 0.2)
        z = RND.uniform(*P['BASE_Z'])
        h = Vector((math.sin(a), -math.cos(a) * P['DEPTH'], 0))
        base = h * core_r(z) * 0.8 + Vector((P['BASE_SHIFT'], 0, z))
        el = math.radians(RND.uniform(*P['BASE_ELEV']))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
        leaves[pick(P['DARK_SHARE'] + 0.1)].append(leaf(base, d, side, RND.uniform(*P['BASE_LEN']), P['BASE_W'], RND.uniform(0.1, 0.3)))
    # dark core
    ns = P['CORE_SIDES']; V = []; F = []
    for j, (z, r) in enumerate(P['CORE']):
        for k in range(ns):
            a = 2 * math.pi * (k + 0.5 * (j % 2)) / ns
            rr = r * (1 + P['CORE_LUMP'] * math.sin(3 * a + 2.1 * j))
            V.append(Vector((P['BASE_SHIFT'] + math.sin(a) * rr, -math.cos(a) * rr * P['DEPTH'], z)))
    for j in range(len(P['CORE']) - 1):
        a0, b0 = j * ns, (j + 1) * ns
        for k in range(ns):
            F += [(a0 + k, a0 + (k + 1) % ns, b0 + k), (a0 + (k + 1) % ns, b0 + (k + 1) % ns, b0 + k)]
    leaves['Leaf_Dark'].append((V, F))

    for name, lst in flowers.items():
        make('plumes_' + ('light' if name.endswith('Light') else 'gold'), *merge(*lst), name)
    V, F = merge(*stems); make('stems', [Vector((v[0], v[1], max(v[2], 0))) for v in V], F, 'Stem_Rust')
    for name, lst in leaves.items():
        V, F = merge(*lst)
        make('leaves_' + name.split('_')[1].lower(), [Vector((v[0], v[1], max(v[2], 0.003))) for v in V], F, name)
    # centre the ground footprint on the origin and scale to the old model's height
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
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'goldenrod.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()

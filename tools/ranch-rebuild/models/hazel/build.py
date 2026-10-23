"""Hazel shrub for the Ranch tile (replaces simulations/regional-assets/GF-158.glb).

A tall vase-shaped multi-stem hazel: about 20 thin, straight, olive-brown stems rise from one base and fan gently
outward; round soft leaves as small faceted cards (6 verts, 4 triangles, folded along the midrib, double-sided) in
two greens, set alternately along the stems and angled outward, dense in the upper two thirds and sparse below;
a few clusters of 2-3 brown hazelnuts in pale frilled husks tucked in among the leaves.
Z up, metres, origin at the base on the ground, front -Y. No animation (the game poses and sways plants).
usage: python build.py            (writes hazel.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=7,
    stems=20,
    height=2.5,                     # top of the leaf mass
    stem_top=(2.15, 2.40),          # range of stem tip heights
    base_r=0.16,                    # stems leave the ground inside this radius
    tip_r=(0.24, 0.48),             # radial distance of the stem tips from the axis
    flare=0.30,                     # r(z) = base + (tip - base) * (z / top) ** flare: < 1 fans out early, then rises straight
    squash_y=1.0,                   # the clump is a little shallower front to back than wide
    stem_r0=0.020, stem_r1=0.007, stem_sides=3, stem_segs=4,
    leaf_z0=0.30,                   # lowest leaves
    leaf_zdense=0.90,               # leaves get dense above this
    leaves_low=4,                   # per stem, below leaf_zdense
    leaf_bias=1.15,                 # > 1 pushes the dense leaves down the stems
    leaves_high=18,                 # per stem, above leaf_zdense
    leaf_len=(0.17, 0.23), leaf_w=1.0,   # length range (m) and width / length
    leaf_low_scale=0.65,             # lower leaves are smaller
    leaf_off=0.04,                  # leaf base sits this far from the stem (a short petiole)
    leaf_out=0.75, leaf_up=0.45,    # how much each leaf points outward / up (plus its alternate side)
    leaf_fold=0.16,                 # midrib fold, as a fraction of the width
    face_out=0.6,                   # share of leaves whose face turns out of the clump
    spread=0.10,                    # leaves jitter this far round the stem, so the crown fills
    top_leaves=3,                   # a small fan of leaves at each stem tip
    clusters=8, cluster_z=(1.15, 2.15),
    nut_len=0.07, nut_r=0.032, nut_out=0.10,
)

COL = {  # sRGB, sampled from the hero (leaves, stems) and the sheet (nuts), lifted a little for shading
    'Stem_Olive': (0.37, 0.31, 0.09),
    'Leaf_Dark': (0.31, 0.41, 0.11), 'Leaf_Light': (0.44, 0.58, 0.22),
    'Fruit_Hazel': (0.60, 0.33, 0.13), 'Fruit_Husk': (0.80, 0.76, 0.50),
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
    b.inputs['Roughness'].default_value = 0.75 if name.startswith('Leaf') else 0.85
    m.use_backface_culling = False          # exported as doubleSided: leaf cards render from both sides
    return m


def obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = False
    me.materials.append(material(mat))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def norm(v):
    L = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / L for x in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def add(V, F, v, f):
    o = len(V); V += v; F += [tuple(i + o for i in x) for x in f]


def tube(path, radii, sides, rot=0.0):
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        a = path[min(i + 1, n - 1)]; b = path[max(i - 1, 0)]
        t = norm([a[k] - b[k] for k in range(3)])
        u = norm(cross(t, (1, 0, 0) if abs(t[0]) < 0.9 else (0, 1, 0))); v = cross(t, u)
        for s in range(sides):
            ang = rot + 2 * math.pi * s / sides
            q = [p[k] + r * (math.cos(ang) * u[k] + math.sin(ang) * v[k]) for k in range(3)]
            V.append((q[0], q[1], max(q[2], 0.0) if i == 0 else q[2]))
    for i in range(n - 1):
        for s in range(sides):
            a = i * sides + s; b = i * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    V.append(path[-1]); c = len(V) - 1
    for s in range(sides):
        F.append(((n - 1) * sides + s, (n - 1) * sides + (s + 1) % sides, c))
    return V, F


class Stem:
    def __init__(self, i, rng):
        n = P['stems']
        self.th = 2 * math.pi * (i + rng.uniform(-0.3, 0.3)) / n
        self.top = rng.uniform(*P['stem_top'])
        # outer stems lean further and are a little shorter, inner ones stand up straight
        k = rng.random()
        self.tip = P['tip_r'][0] + (P['tip_r'][1] - P['tip_r'][0]) * k
        self.top -= 0.22 * k
        self.b = rng.uniform(0.2, 1.0) * P['base_r']
        self.bth = self.th + rng.uniform(-0.6, 0.6)
        self.wob = rng.uniform(-0.12, 0.12)          # a slight sideways sweep, so the fan is not a perfect cone

    def at(self, z):
        t = max(0.0, min(1.0, z / self.top))
        r = self.tip * t ** P['flare']
        th = self.th + self.wob * t
        bx, by = self.b * math.cos(self.bth) * (1 - t), self.b * math.sin(self.bth) * (1 - t)
        return (bx + r * math.cos(th), (by + r * math.sin(th)) * P['squash_y'], z)

    def out(self, z):
        return (math.cos(self.th), math.sin(self.th), 0.0)


def leaf(base, d, across, L, rng, V, F):
    """A round leaf card: base, two pairs of edge points and the tip, folded along the midrib (4 triangles).
    `across` is roughly the direction of the leaf's width; the card's normal is d x across."""
    w = L * P['leaf_w']
    dot = sum(across[k] * d[k] for k in range(3))
    s = norm(tuple(across[k] - dot * d[k] for k in range(3)))
    n = cross(d, s)
    f = P['leaf_fold'] * w
    pts = [(0.0, 0.0, 0.0), (0.28, -0.46, f), (0.72, -0.5, f * 0.8), (1.0, 0.0, 0.0), (0.72, 0.5, f * 0.8), (0.28, 0.46, f)]
    v = []
    for a, b, c in pts:
        v.append(tuple(base[k] + d[k] * a * L + s[k] * b * w + n[k] * c for k in range(3)))
    add(V, F, v, [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5)])


def rot_about(v, axis, ang):
    c, s = math.cos(ang), math.sin(ang)
    d = sum(v[k] * axis[k] for k in range(3)); x = cross(axis, v)
    return tuple(v[k] * c + x[k] * s + axis[k] * d * (1 - c) for k in range(3))


def nut_cluster(p, out, rng, NV, NF, HV, HF):
    """2-3 hazelnuts pointing out and down, each in a pale frilled husk cup (6-sided nut, 6-point husk)."""
    k = rng.choice((2, 3, 3))
    for j in range(k):
        a = 2 * math.pi * j / k + rng.uniform(-0.3, 0.3)
        d = norm((out[0] * 0.6 + 0.35 * math.cos(a), out[1] * 0.6 + 0.35 * math.sin(a), -0.55))
        c = tuple(p[i] + d[i] * 0.03 for i in range(3))
        u = norm(cross(d, (0, 0, 1))); v = cross(d, u)
        L, R = P['nut_len'] * rng.uniform(0.9, 1.1), P['nut_r']
        sides = 6
        # nut: from the husk end (c) to its pointed tip; widest a third of the way out
        ring = []
        for s in range(sides):
            ang = 2 * math.pi * s / sides
            ring.append(tuple(c[i] + d[i] * L * 0.35 + R * (math.cos(ang) * u[i] + math.sin(ang) * v[i]) for i in range(3)))
        tip = tuple(c[i] + d[i] * L for i in range(3)); back = tuple(c[i] - d[i] * L * 0.05 for i in range(3))
        f = [(s, (s + 1) % sides, sides) for s in range(sides)] + [((s + 1) % sides, s, sides + 1) for s in range(sides)]
        add(NV, NF, ring + [tip, back], f)
        # husk: a frilled cup round the stalk end, points reaching past the nut's widest ring
        hv = [tuple(c[i] - d[i] * 0.012 for i in range(3))]
        for s in range(sides):
            ang = 2 * math.pi * (s + 0.5) / sides
            rr = R * 1.25; reach = L * rng.uniform(0.45, 0.6)
            hv.append(tuple(c[i] + d[i] * reach + rr * (math.cos(ang) * u[i] + math.sin(ang) * v[i]) for i in range(3)))
        add(HV, HF, hv, [(0, 1 + s, 1 + (s + 1) % sides) for s in range(sides)])


def build(rng):
    stems = [Stem(i, rng) for i in range(P['stems'])]
    SV, SF = [], []
    LV, LF, DV, DF = [], [], [], []
    anchors = []
    for si, st in enumerate(stems):
        segs = P['stem_segs']
        zs = [st.top * (i / segs) for i in range(segs + 1)]
        path = [st.at(z) for z in zs]
        radii = [P['stem_r0'] + (P['stem_r1'] - P['stem_r0']) * (i / segs) for i in range(segs + 1)]
        add(SV, SF, *tube(path, radii, P['stem_sides'], rot=st.th))
        # leaves, alternate along the stem: few and small low down, dense above
        zl = [P['leaf_z0'] + (P['leaf_zdense'] - P['leaf_z0']) * (i + rng.random()) / P['leaves_low'] for i in range(P['leaves_low'])]
        nh = P['leaves_high']
        zl += [P['leaf_zdense'] + (st.top - 0.05 - P['leaf_zdense']) * ((i + rng.uniform(0.2, 0.8)) / nh) ** P['leaf_bias'] for i in range(nh)]
        alt = rng.uniform(0, 2 * math.pi)
        for i, z in enumerate(zl):
            p = st.at(z)
            o = st.out(z)
            side_a = alt + math.pi * (i % 2) + rng.uniform(-0.5, 0.5) + i * 0.4
            side = (math.cos(side_a), math.sin(side_a), 0.0)
            # outward from the clump, plus the alternate side, plus up
            d = norm(tuple(P['leaf_out'] * o[k] + 0.8 * side[k] for k in range(2)) + (P['leaf_up'] + rng.uniform(-0.35, 0.25),))
            jit = rng.uniform(0, P['spread'])
            base = tuple(p[k] + side[k] * (P['leaf_off'] + jit) for k in range(2)) + (p[2] + rng.uniform(-0.03, 0.03),)
            L = rng.uniform(*P['leaf_len']) * (P['leaf_low_scale'] if z < P['leaf_zdense'] else 1.0)
            dark = (rng.random() < (0.65 if (o[0] * 0.5 - o[1] * 0.3 + rng.uniform(-0.6, 0.6)) < 0 else 0.35))
            V, F = (DV, DF) if dark else (LV, LF)
            # most leaves face out of the clump (their width runs round it), the rest at random
            if rng.random() < P['face_out']:
                across = (-o[1], o[0], rng.uniform(-0.3, 0.3))
            else:
                across = norm((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.5, 0.5)))
            leaf(base, d, across, L, rng, V, F)
            if z > 1.05 and i % 3 == 1:
                anchors.append((base, o))
        # a little fan of leaves at the tip
        tp = st.at(st.top)
        for j in range(P['top_leaves']):
            a = st.th + (j - 1) * 1.1 + rng.uniform(-0.3, 0.3)
            d = norm((0.5 * math.cos(a), 0.5 * math.sin(a), 0.9))
            V, F = (LV, LF) if j != 1 else (DV, DF)
            leaf(tp, d, (-math.sin(a), math.cos(a), 0), rng.uniform(*P['leaf_len']) * 0.85, rng, V, F)
    obj('stems', SV, SF, 'Stem_Olive')
    obj('leaves_light', LV, LF, 'Leaf_Light')
    obj('leaves_dark', DV, DF, 'Leaf_Dark')
    # nut clusters at leaf axils in the upper crown, spread round the bush
    NV, NF, HV, HF = [], [], [], []
    rng.shuffle(anchors)
    picked = []
    for base, o in anchors:
        if not (P['cluster_z'][0] < base[2] < P['cluster_z'][1]):
            continue
        if any(math.dist(base, q) < 0.45 for q in picked):
            continue
        picked.append(base)
        # pushed out to the surface of the leaf mass, so the nuts show between the leaves
        q = (base[0] + o[0] * P['nut_out'], base[1] + o[1] * P['nut_out'], base[2])
        nut_cluster(q, o, rng, NV, NF, HV, HF)
        if len(picked) == P['clusters']:
            break
    obj('nuts', NV, NF, 'Fruit_Hazel')
    obj('husks', HV, HF, 'Fruit_Husk')
    return len(picked)


def main(path=os.path.join(HERE, 'hazel.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    nc = build(rng)
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('clusters', nc)
    print('triangles', tris)


if __name__ == '__main__':
    main()

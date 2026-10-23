"""Hollyhock for the Ranch tile (replaces simulations/regional-assets/GF-634.glb).

One tall straight flower spire: a single Stem_Green stalk with about 24 open, five-lobed, cup-shaped pink blooms
(Petal_Pink cup, deeper Petal_Rose throat, small pale Flower_Yellow centre) spiralling all the way up, facing outwards
in different directions, largest at the bottom and smaller up the spire; closed pink buds and then green buds at the
tip; a few small stem leaves; and six big heart-shaped, scalloped, slightly cupped leaves spreading low around the foot
(Leaf_Green, one or two Leaf_Pale), the widest part of the plant.
All leaf and petal cards are single faced with a double-sided material (no backface culling).
Z up, metres, origin at the base on the ground, front -Y. No animation (the game poses and sways plants).
usage: python build.py            (writes hollyhock.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=5,
    height=1.455,                   # old GF-634 height (to_game copies the GLB without rescale)
    stem_top=1.40, stem_r0=0.016, stem_r1=0.007, stem_sides=5, stem_segs=4,
    # blooms
    blooms=24,
    bloom_z=(0.32, 1.22),           # centre heights of the lowest and highest open bloom
    bloom_zpow=0.92,                # < 1 packs blooms a little closer towards the top
    bloom_R=(0.125, 0.075),         # rim radius at the bottom / top
    bloom_off=0.80,                # bloom centre distance from the stalk axis, in rim radii
    bloom_front=1.1,               # how much each bloom turns towards the front (-Y) on top of facing out
    bloom_up=0.12,
    bloom_depth=0.42,               # cup depth (throat behind the rim), in rim radii
    bloom_scallop=0.84,             # rim notch radius / lobe radius
    golden=2.39996,                 # azimuth step between successive blooms (rad)
    az0=3.0,
    # buds at the tip
    pink_buds=[(1.25, 0.040, 0.030, 0.6), (1.30, 0.034, 0.026, 2.9), (1.34, 0.030, 0.022, 4.6)],   # z, offset, radius, az
    green_buds=[(1.37, 0.022, 0.020, 1.4), (1.40, 0.018, 0.018, 3.8), (1.425, 0.0, 0.020, 0.0)],
    # small stem leaves (z, azimuth, length)
    stem_leaves=[(0.62, 0.3, 0.07), (0.86, 3.4, 0.06), (1.05, 1.7, 0.055), (1.18, 4.9, 0.05)],
    # base leaves: (azimuth deg from +X towards +Y, distance of the leaf centre, radius, height, tilt deg, pale?)
    base_leaves=[(185, 0.165, 0.125, 0.15, 50, False),     # left, standing up towards the viewer
                 (-5, 0.170, 0.130, 0.12, 50, False),      # right
                 (-95, 0.110, 0.105, 0.09, 55, True),      # front, pale
                 (-150, 0.160, 0.095, 0.06, 60, False),    # front left, low
                 (-30, 0.150, 0.090, 0.05, 65, True),      # front right, low, pale
                 (60, 0.120, 0.110, 0.13, 40, False)],     # back right
    leaf_front=0.8,                # base leaves turn their faces towards the front (-Y)
    leaf_spread=(1.0, 1.1),      # scales the base leaves' distance and radius (sets the footprint)
    leaf_ring=8,                   # vertices in each base leaf's middle ring (rim has twice as many)
    leaf_notch=0.35,               # depth of the heart notch at the petiole, in leaf radii
    leaf_cup=0.22,                  # rim lift, in leaf radii
    leaf_scallop=0.88,
    jitter=0.08,                    # facet jitter, in radii
)

COL = {  # sRGB, sampled from the hero and lifted a little for shading
    'Stem_Green': (0.46, 0.43, 0.17),
    'Leaf_Green': (0.40, 0.48, 0.22), 'Leaf_Pale': (0.54, 0.60, 0.30), 'Leaf_Bud': (0.60, 0.62, 0.28),
    'Petal_Pink': (0.94, 0.60, 0.70), 'Petal_Rose': (0.80, 0.30, 0.46), 'Flower_Yellow': (0.98, 0.86, 0.55),
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
    b.inputs['Roughness'].default_value = 0.75 if name.startswith(('Leaf', 'Petal')) else 0.85
    m.use_backface_culling = False          # exported as doubleSided: cards render from both sides
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


def frame(n):
    u = norm(cross(n, (0, 0, 1) if abs(n[2]) < 0.95 else (1, 0, 0))); v = cross(n, u)
    return u, v


def at(c, u, v, n, x, y, z):
    return tuple(c[k] + x * u[k] + y * v[k] + z * n[k] for k in range(3))


def add(V, F, v, f):
    o = len(V); V += v; F += [tuple(i + o for i in x) for x in f]


def tube(path, radii, sides):
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        for s in range(sides):
            a = 2 * math.pi * s / sides
            V.append((p[0] + r * math.cos(a), p[1] + r * math.sin(a), p[2]))
    for i in range(n - 1):
        for s in range(sides):
            a = i * sides + s; b = i * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    V.append(path[-1]); c = len(V) - 1
    for s in range(sides):
        F.append(((n - 1) * sides + s, (n - 1) * sides + (s + 1) % sides, c))
    return V, F


def bloom(c, n, R, rng, PV, PF, RV, RF, YV, YF):
    """Five-lobed faceted cup: rim of 10 (lobe tips and notches) at the plane through c, an inner ring of 5 a little
    deeper (Petal_Pink between them), a Petal_Rose throat fan to the bottom point, and a small yellow centre."""
    u, v = frame(n); rot = rng.uniform(0, 2 * math.pi); d = P['bloom_depth'] * R
    rim = []
    for i in range(10):
        a = rot + math.pi * i / 5
        r = R * (1.0 if i % 2 == 0 else P['bloom_scallop']) * rng.uniform(0.95, 1.05)
        rim.append(at(c, u, v, n, r * math.cos(a), r * math.sin(a), rng.uniform(-0.06, 0.06) * R))
    inner = []
    for i in range(5):
        a = rot + 2 * math.pi * i / 5 + math.pi / 5 * 0.0
        inner.append(at(c, u, v, n, 0.36 * R * math.cos(a), 0.36 * R * math.sin(a), -0.55 * d))
    bottom = at(c, u, v, n, 0, 0, -d)
    f = []
    for i in range(5):
        j = (i + 1) % 5
        o0, o1, o2 = 2 * i, 2 * i + 1, (2 * i + 2) % 10
        f += [(10 + i, o0, o1), (10 + i, o1, 10 + j), (10 + j, o1, o2)]
    add(PV, PF, rim + inner, f)
    add(RV, RF, inner + [bottom], [(i, (i + 1) % 5, 5) for i in range(5)])
    # yellow centre: a small three-sided point standing out of the throat
    yc = at(c, u, v, n, 0, 0, -0.55 * d); tip = at(c, u, v, n, 0, 0, -0.05 * d); ry = 0.12 * R
    ring = [at(yc, u, v, n, ry * math.cos(rot + 2.094 * k), ry * math.sin(rot + 2.094 * k), 0) for k in range(3)]
    add(YV, YF, ring + [tip], [(0, 1, 3), (1, 2, 3), (2, 0, 3)])


def bud(c, r, rng, V, F, elong=1.5):
    """Closed bud: a five-sided bipyramid pointing up and out (10 triangles)."""
    rot = rng.uniform(0, 2 * math.pi)
    ring = [(c[0] + r * math.cos(rot + 1.2566 * k), c[1] + r * math.sin(rot + 1.2566 * k), c[2]) for k in range(5)]
    top = (c[0], c[1], c[2] + r * elong); bot = (c[0], c[1], c[2] - r * 0.8)
    add(V, F, ring + [top, bot], [(k, (k + 1) % 5, 5) for k in range(5)] + [((k + 1) % 5, k, 6) for k in range(5)])


def base_leaf(az, dist, r, h, tilt, rng, V, F, SV, SF):
    """Big heart-shaped, scalloped, cupped leaf: centre, ring of M at half radius, rim of 2M (lobe tips and notches,
    4M triangles), with a deep notch where the petiole joins (towards the stalk) and two rounded lobes beside it,
    on a short three-sided petiole from the stalk foot."""
    a = math.radians(az); out = (math.cos(a), math.sin(a), 0.0)
    t = math.radians(tilt)
    n = norm((out[0] * math.sin(t), out[1] * math.sin(t) - P['leaf_front'], math.cos(t)))      # face up, out and to the front
    c = (out[0] * dist, out[1] * dist, h)
    u, v = frame(n); j = P['jitter'] * r; cup = P['leaf_cup'] * r
    M = P['leaf_ring']; K = 2 * M
    rot = math.atan2(-sum(out[k] * v[k] for k in range(3)), -sum(out[k] * u[k] for k in range(3)))   # towards the stalk
    pts = [at(c, u, v, n, 0, 0, -0.25 * cup)]
    for i in range(M):
        ang = rot + math.pi / M + 2 * math.pi * i / M
        pts.append(at(c, u, v, n, 0.5 * r * math.cos(ang) + rng.uniform(-j, j), 0.5 * r * math.sin(ang) + rng.uniform(-j, j),
                      0.15 * cup + rng.uniform(-j, j) * 0.5))
    for i in range(K):
        ang = rot + 2 * math.pi * i / K
        rr = r * (1.0 if i % 2 == 1 else P['leaf_scallop'])
        if i == 0:
            rr = r * P['leaf_notch']                      # the heart's notch
        elif i in (1, K - 1):
            rr = r * 1.08                                 # the two lobes beside it
        pts.append(at(c, u, v, n, rr * math.cos(ang), rr * math.sin(ang), (cup if i else 0.3 * cup) + rng.uniform(-j, j)))
    f = [(0, 1 + i, 1 + (i + 1) % M) for i in range(M)]
    for i in range(M):
        m0, m1 = 1 + i, 1 + (i + 1) % M
        r1, r2, r3 = 1 + M + 2 * i + 1, 1 + M + (2 * i + 2) % K, 1 + M + (2 * i + 3) % K   # m_i sits at rim 2i+1's angle
        f += [(m0, r1, r2), (m0, r2, m1), (m1, r2, r3)]
    pts = [(x, y, max(z, 0.004)) for x, y, z in pts]     # rims rest on the ground, never below it
    add(V, F, pts, f)
    # petiole: from the stalk foot to the leaf centre
    base = (0, 0, 0.02); pr = 0.008
    pv = [(base[0] + pr * math.cos(k * 2.094), base[1] + pr * math.sin(k * 2.094), base[2]) for k in range(3)]
    pv += [(c[0] + pr * 0.7 * math.cos(k * 2.094), c[1] + pr * 0.7 * math.sin(k * 2.094), c[2] - 0.25 * cup) for k in range(3)]
    add(SV, SF, pv, [(k, (k + 1) % 3, 3 + (k + 1) % 3, 3 + k) for k in range(3)])


def stem_leaf(z, az, L, rng, V, F):
    """Small folded leaf card on the stalk (6 verts, 4 triangles)."""
    out = (math.cos(az), math.sin(az), 0.0); d = norm((out[0], out[1], 0.6))
    side = (-out[1], out[0], 0.0); b = (out[0] * 0.01, out[1] * 0.01, z)
    w = 0.5 * L
    p = lambda s, a, up=0.0: tuple(b[k] + s * d[k] + a * side[k] + (up if k == 2 else 0) for k in range(3))
    add(V, F, [p(0, 0), p(0.4 * L, -w, 0.01), p(0.4 * L, w, 0.01), p(0.5 * L, 0, -0.012), p(L, -0.15 * w), p(L, 0.15 * w)],
        [(0, 1, 3), (0, 3, 2), (1, 4, 3), (3, 5, 2)])


def build(rng):
    # stalk
    segs = P['stem_segs']
    path = [(0.0, 0.0, P['stem_top'] * i / segs) for i in range(segs + 1)]
    radii = [P['stem_r0'] + (P['stem_r1'] - P['stem_r0']) * i / segs for i in range(segs + 1)]
    SV, SF = tube(path, radii, P['stem_sides'])
    # blooms
    PV, PF, RV, RF, YV, YF = [], [], [], [], [], []
    N = P['blooms']; z0, z1 = P['bloom_z']; R0, R1 = P['bloom_R']
    for i in range(N):
        t = i / (N - 1); tz = t ** P['bloom_zpow']
        z = z0 + (z1 - z0) * tz; R = R0 + (R1 - R0) * t
        a = P['az0'] + P['golden'] * i + rng.uniform(-0.25, 0.25)
        out = (math.cos(a), math.sin(a), 0.0)
        c = (out[0] * R * P['bloom_off'], out[1] * R * P['bloom_off'], z)
        n = norm((out[0], out[1] - P['bloom_front'], P['bloom_up'] + rng.uniform(-0.1, 0.15)))
        bloom(c, n, R, rng, PV, PF, RV, RF, YV, YF)
    # closed buds
    BV, BF, GV, GF = [], [], [], []
    for z, off, r, a in P['pink_buds']:
        bud((off * math.cos(a), off * math.sin(a), z), r, rng, PV, PF)
    for z, off, r, a in P['green_buds']:
        bud((off * math.cos(a), off * math.sin(a), z), r, rng, GV, GF)
    # leaves
    LV, LF, QV, QF = [], [], [], []
    for z, a, L in P['stem_leaves']:
        stem_leaf(z, a, L, rng, LV, LF)
    kd, kr = P['leaf_spread']
    for az, dist, r, h, tilt, pale in P['base_leaves']:
        if pale:
            base_leaf(az, dist * kd, r * kr, h, tilt, rng, QV, QF, SV, SF)
        else:
            base_leaf(az, dist * kd, r * kr, h, tilt, rng, LV, LF, SV, SF)
    obj('stalk', SV, SF, 'Stem_Green')
    obj('blooms', PV, PF, 'Petal_Pink')
    obj('throats', RV, RF, 'Petal_Rose')
    obj('centres', YV, YF, 'Flower_Yellow')
    obj('buds', GV, GF, 'Leaf_Bud')
    obj('leaves', LV, LF, 'Leaf_Green')
    obj('leaves_pale', QV, QF, 'Leaf_Pale')


def main(path=os.path.join(HERE, 'hollyhock.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(random.Random(P['seed']))
    tris = 0; lo = [1e9] * 3; hi = [-1e9] * 3
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for v in o.data.vertices:
            lo = [min(a, b) for a, b in zip(lo, v.co)]; hi = [max(a, b) for a, b in zip(hi, v.co)]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('size %.3f x %.3f x %.3f  (x %.3f..%.3f, y %.3f..%.3f)' % (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2], lo[0], hi[0], lo[1], hi[1]))
    print('triangles', tris)


if __name__ == '__main__':
    main()

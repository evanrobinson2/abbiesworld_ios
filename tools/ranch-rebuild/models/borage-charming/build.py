"""Borage clump, CHARMING (storybook toy) style, for the Ranch tile's style switch
(installs as simulations/regional-assets-charming/GF-249.glb, the twin of models/borage).

Built from models/borage/build.py and reshaped to mj/borage-charming/hero.png:
  * a low, chubby mound of big pillowy leaves (rosette + a few upright arching leaves), each leaf puffed along its
    midrib with rounded shoulders and a drooping tip, wider and squatter than the normal clump's leaf dome;
  * nine bouncy curved stems springing out of the mound, leaning left at the top and right at the side,
    each ending in one OVERSIZED plump five-point star (petals puffed forward, broad shoulders) with a white eye;
  * a couple of small leaves and green buds on the stems.
Same material names and roles as the normal model (Leaf_Green, Leaf_Pale, Stem_Green, Stem_Red, Petal_Blue,
Flower_White), one material per object, double-sided cards, flat colours.
Z up, metres, origin at the base on the ground, front -Y. Height 0.41 like the normal model / old GF-249.
No animation (the game poses and sways plants).
usage: python build.py            (writes borage-charming.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'borage-charming'

P = dict(
    seed=11,
    height=0.41,                    # the finished clump is scaled to this (the normal borage / old GF-249 height)
    lean=0.0,                       # extra sideways lean of everything above the mound, metres per metre of height
    # the leaf mound: tiers of big pillowy paddle leaves, each rising out of the crown and arching over so its outer
    # half drapes down toward the viewer (droop grows with the square of the distance along the leaf)
    # tier: (count, base z, base radius, pitch rad, length, droop, width ratio, phase, pale every k-th)
    tiers=((10, 0.06, 0.025, 0.95, 0.235, 0.27, 0.86, 0.0, 3),
           (8, 0.10, 0.015, 1.20, 0.18, 0.18, 0.84, 0.45, 2)),
    leaf_puff=0.22, leaf_jitter=0.12, leaf_roll=0.25, mound_squash_y=0.97, mound_skew=0.0,
    core=((0.01, 0.07), (0.08, 0.085), (0.14, 0.06)), core_top=0.17,
    # stems
    stem_r0=0.0065, stem_r1=0.0042, stem_sides=3, stem_segs=3, stem_bow=0.35,
    stem_leaf_len=(0.08, 0.10),
    red_len=0.018, red_r=0.0032,
    # flowers
    notch=0.55, shoulder=0.82, shoulder_ang=0.36, petal_cup=0.30, shoulder_cup=0.12,
    flower_scale=1.5, centre_r=0.20, centre_h=0.30,
)

# The flowers, placed from the hero (x across, y depth, z up, metres before the final height fit), each on its own stem.
# (x, y, z, R, face) face: (fx, fz) turns the flower toward +x / up; nod flowers hang their face down and out.
FLOWERS = [
    (-0.016, 0.020, 0.378, 0.043, (-0.15, 0.35)),     # top, leaning left
    (-0.056, 0.060, 0.352, 0.026, (-0.80, 0.10)),     # small one behind it, side-on
    (0.056, 0.045, 0.300, 0.043, (0.20, 0.30)),       # right upper
    (-0.086, 0.030, 0.270, 0.036, (-0.35, 0.25)),    # left middle
    (-0.024, -0.050, 0.262, 0.036, (0.00, 0.30)),     # centre middle
    (0.108, -0.045, 0.226, 0.040, (0.35, 0.15)),      # right lower
    (0.158, 0.050, 0.218, 0.024, (0.90, 0.00)),       # far right, side-on
    (-0.084, -0.060, 0.186, 0.027, (-0.30, -0.10)),   # left low
    (-0.056, -0.085, 0.140, 0.020, (-0.20, -0.60)),   # nodding one at the front left
]
# stem base for each flower (x, y) at the crown; the stem bows outward (stem_bow) on the way up
STEM_BASE = [(-0.004, 0.010), (-0.010, 0.020), (0.010, 0.014), (-0.012, 0.010), (0.000, -0.016),
             (0.014, -0.014), (0.016, 0.018), (-0.014, -0.018), (-0.010, -0.024)]
STEM_LEAF = {0: 0.55, 1: 0.6, 2: 0.6, 3: 0.65, 4: 0.6, 5: 0.7, 7: 0.6}      # stem index -> where a small leaf sits along it
BUDS = [(0, 0.80, -1), (2, 0.85, 1), (5, 0.82, 1)]   # (stem, t along, side): small green buds on short spurs

COL = {  # sRGB, sampled from the charming hero and lifted a little toward the set's flat painted look
    'Leaf_Green': (0.40, 0.53, 0.27), 'Leaf_Pale': (0.55, 0.65, 0.38),
    'Stem_Green': (0.36, 0.46, 0.20), 'Stem_Red': (0.55, 0.32, 0.25),
    'Petal_Blue': (0.30, 0.57, 0.90), 'Flower_White': (0.94, 0.95, 0.92),
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
    m.use_backface_culling = False          # exported as doubleSided: leaf and petal cards render from both sides
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


def lerp(a, b, t):
    return tuple(a[k] + (b[k] - a[k]) * t for k in range(3))


def add(V, F, v, f):
    o = len(V); V += v; F += [tuple(i + o for i in x) for x in f]


def tube(path, radii, sides, cap=True):
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        a = path[min(i + 1, n - 1)]; b = path[max(i - 1, 0)]
        t = norm([a[k] - b[k] for k in range(3)])
        u = norm(cross(t, (1, 0, 0) if abs(t[0]) < 0.9 else (0, 1, 0))); v = cross(t, u)
        for s in range(sides):
            ang = 2 * math.pi * s / sides
            V.append(tuple(p[k] + r * (math.cos(ang) * u[k] + math.sin(ang) * v[k]) for k in range(3)))
    for i in range(n - 1):
        for s in range(sides):
            a = i * sides + s; b = i * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    if cap:
        V.append(path[-1]); c = len(V) - 1
        for s in range(sides):
            F.append(((n - 1) * sides + s, (n - 1) * sides + (s + 1) % sides, c))
    return V, F


def frame(d, across):
    dot = sum(across[k] * d[k] for k in range(3))
    s = norm(tuple(across[k] - dot * d[k] for k in range(3)))
    n = cross(d, s)
    if n[2] < 0:                            # keep the puffed face up
        s = tuple(-x for x in s); n = tuple(-x for x in n)
    return s, n


def leaf(base, d, across, L, wr, cup, droop, V, F, ground=False):
    """A small oval leaf card, 6 triangles (the normal model's leaf, used on the stems)."""
    w = L * wr / 2
    s, n = frame(d, across)
    pts = [(0.0, 0.0, 0.0), (0.48, 0.0, 0.0), (1.0, 0.0, 0.0),
           (0.25, -0.86, cup), (0.25, 0.86, cup), (0.66, -1.0, cup), (0.66, 1.0, cup)]
    v = []
    for a, b, c in pts:
        dz = -droop * a * a
        q = tuple(base[k] + d[k] * a * L + s[k] * b * w + n[k] * (c * w) + (dz if k == 2 else 0) for k in range(3))
        if ground:
            q = (q[0], q[1], max(q[2], 0.004))
        v.append(q)
    add(V, F, v, [(0, 3, 1), (0, 1, 4), (3, 5, 1), (1, 6, 4), (5, 2, 1), (1, 2, 6)])


def plump_leaf(base, d, across, L, wr, puff, droop, V, F, ground=False):
    """A big pillowy leaf, 12 triangles: a midrib (base, two puffed-up midpoints, tip) and four edge pairs giving round
    shoulders and a blunt tip; the midrib bulges up along the face normal, the edges curl down a little, and the
    whole leaf arches over (droop grows with the square of the distance along it)."""
    w = L * wr / 2
    s, n = frame(d, across)
    mid = [(0.0, 0.0, 0.0), (0.33, 0.0, puff), (0.66, 0.0, puff * 0.8), (1.0, 0.0, 0.0)]
    edge = [(0.12, 0.62, -0.05), (0.40, 1.0, -0.08), (0.70, 0.92, -0.08), (0.90, 0.55, -0.04)]
    pts = mid + [(a, -b, c) for a, b, c in edge] + [(a, b, c) for a, b, c in edge]
    v = []
    for a, b, c in pts:
        dz = -droop * a * a
        q = tuple(base[k] + d[k] * a * L + s[k] * b * w + n[k] * (c * w) + (dz if k == 2 else 0) for k in range(3))
        if ground:
            q = (q[0], q[1], max(q[2], 0.004))
        v.append(q)
    f = []
    for e0, sgn in ((4, -1), (8, 1)):
        e = [e0 + i for i in range(4)]
        tri = [(0, e[0], 1), (e[0], e[1], 1), (e[1], 2, 1), (e[1], e[2], 2), (e[2], e[3], 2), (e[3], 3, 2)]
        f += tri if sgn < 0 else [(a, c, b) for a, b, c in tri]
    add(V, F, v, f)


def star(c, nrm, up, R, rng, PV, PF, CV, CF):
    """A plump five-pointed star (20 triangles) facing nrm: each petal has broad shoulders and its tip pushed forward,
    so it reads as a chubby cupped flower; plus a white centre cone (5)."""
    u = norm(cross(nrm, up)); v = cross(nrm, u)
    rot = rng.uniform(0, 2 * math.pi / 5)

    def at(r, a, fwd):
        return tuple(c[k] + R * r * (math.cos(a) * u[k] + math.sin(a) * v[k]) + nrm[k] * R * fwd for k in range(3))
    vs = [c]
    for i in range(5):
        a = rot + 2 * math.pi * i / 5
        vs += [at(P['notch'], a - math.pi / 5, 0.0), at(P['shoulder'], a - P['shoulder_ang'], P['shoulder_cup']),
               at(1.0, a, P['petal_cup']), at(P['shoulder'], a + P['shoulder_ang'], P['shoulder_cup'])]
    f = []
    for i in range(5):
        nb, sl, tp, sr = 1 + 4 * i, 2 + 4 * i, 3 + 4 * i, 4 + 4 * i
        nn = 1 + 4 * ((i + 1) % 5)
        f += [(0, nb, sl), (0, sl, tp), (0, tp, sr), (0, sr, nn)]
    add(PV, PF, vs, f)
    cr = R * P['centre_r']
    cv = [tuple(c[k] + nrm[k] * R * 0.10 + cr * (math.cos(rot + 2 * math.pi * i / 5) * u[k] + math.sin(rot + 2 * math.pi * i / 5) * v[k])
                for k in range(3)) for i in range(5)]
    cv.append(tuple(c[k] + nrm[k] * R * P['centre_h'] for k in range(3)))
    add(CV, CF, cv, [(i, (i + 1) % 5, 5) for i in range(5)])


def build(rng):
    LV, LF, PLV, PLF = [], [], [], []      # Leaf_Green, Leaf_Pale
    SV, SF, RV, RF = [], [], [], []        # Stem_Green, Stem_Red
    PV, PF, CV, CF = [], [], [], []        # Petal_Blue, Flower_White

    # 1. the leaf mound: tiers of big paddle leaves arching out of the crown and draping down
    for (n, bz, br, pitch, L, droop, wr, phase, pale) in P['tiers']:
        for i in range(n):
            th = 2 * math.pi * (i + rng.uniform(-P['leaf_jitter'], P['leaf_jitter'])) / n + phase
            o = (math.cos(th), math.sin(th) * P['mound_squash_y'], 0.0)
            k = 1 + P['mound_skew'] * o[0]                      # hero: a little fuller on the right
            p = pitch * rng.uniform(0.92, 1.08)
            d = norm((o[0], o[1], math.tan(p)))
            base = (o[0] * br, o[1] * br, bz * rng.uniform(0.85, 1.15))
            V, F = (PLV, PLF) if i % pale == 1 else (LV, LF)
            roll = rng.uniform(-P['leaf_roll'], P['leaf_roll'])
            plump_leaf(base, d, (-o[1] * math.cos(roll), o[0] * math.cos(roll), math.sin(roll)),
                       L * k * rng.uniform(0.92, 1.05) * math.hypot(o[0], o[1]) ** 0.5, wr, P['leaf_puff'], droop * k, V, F, ground=True)

    # 1b. a low faceted core inside the mound, so the leaf mass reads solid
    rings = P['core']
    sides = 6
    cv, cf = [], []
    for zr, rr in rings:
        for j in range(sides):
            a = 2 * math.pi * (j + 0.5 * (len(cv) // sides % 2)) / sides
            cv.append((rr * math.cos(a), rr * math.sin(a) * P['mound_squash_y'], zr))
    for r in range(len(rings) - 1):
        for j in range(sides):
            a0, a1 = r * sides + j, r * sides + (j + 1) % sides
            cf += [(a0, a1, a1 + sides), (a0, a1 + sides, a0 + sides)]
    cv.append((0.0, 0.0, P['core_top'])); top = len(cv) - 1
    cf += [((len(rings) - 1) * sides + j, (len(rings) - 1) * sides + (j + 1) % sides, top) for j in range(sides)]
    add(LV, LF, cv, cf)

    # 3. one bouncy stem per flower: up out of the crown, bowing outward, ending in a short Stem_Red neck and the star
    paths = []
    for fi, ((x, y, z, R, face), (bx, by)) in enumerate(zip(FLOWERS, STEM_BASE)):
        x += P['lean'] * z
        fx, fz = face
        nrm = norm((fx, -1.0 + abs(fx) * 0.6, fz))
        neck_end = (x - nrm[0] * R * 0.15, y - nrm[1] * R * 0.15, z - nrm[2] * R * 0.15)
        neck_start = (neck_end[0] - nrm[0] * P['red_len'], neck_end[1] - nrm[1] * P['red_len'] + 0.004, neck_end[2] - P['red_len'])
        add(RV, RF, *tube([neck_start, neck_end], [P['red_r'], P['red_r'] * 0.9], 3, cap=False))
        b0 = (bx, by, 0.02)
        ctrl = (bx + (neck_start[0] - bx) * P['stem_bow'], by + (neck_start[1] - by) * P['stem_bow'], neck_start[2] * 0.75)
        segs = P['stem_segs']
        path = []
        for i in range(segs + 1):
            t = i / segs
            path.append(lerp(lerp(b0, ctrl, t), lerp(ctrl, neck_start, t), t))
        paths.append(path)
        radii = [P['stem_r0'] + (P['stem_r1'] - P['stem_r0']) * (i / segs) for i in range(segs + 1)]
        add(SV, SF, *tube(path, radii, P['stem_sides'], cap=False))
        up = (0, 0, 1) if fz > -0.4 else (0, 1, 0)
        star((x, y, z), nrm, up, R * P['flower_scale'], rng, PV, PF, CV, CF)

    def on(si, t):
        path = paths[si]; segs = len(path) - 1
        k = min(int(t * segs), segs - 1); f = t * segs - k
        return lerp(path[k], path[k + 1], f), norm(tuple(path[k + 1][j] - path[k][j] for j in range(3)))

    # 4. a small leaf on some stems, and a few round green buds on short spurs
    for si, t in STEM_LEAF.items():
        p, tg = on(si, t)
        out = norm((tg[0] + (0.3 if p[0] >= 0 else -0.3), tg[1] - 0.2, 0.0))
        d = norm((out[0] * 0.9, out[1] * 0.9, 0.5))
        leaf(p, d, (-d[1], d[0], 0.0), rng.uniform(*P['stem_leaf_len']), 0.62, 0.25, 0.012, LV, LF)
    for si, t, side in BUDS:
        p, tg = on(si, t)
        q = (p[0] + side * 0.022, p[1] - 0.006, p[2] + 0.012)
        add(SV, SF, *tube([p, q], [P['stem_r1'] * 0.8, P['stem_r1'] * 0.7], 3, cap=False))
        r = 0.009
        bud = [(q[0], q[1], q[2] - r * 0.4), (q[0] + r, q[1], q[2] + r * 0.6), (q[0] - r * 0.5, q[1] + r * 0.87, q[2] + r * 0.6),
               (q[0] - r * 0.5, q[1] - r * 0.87, q[2] + r * 0.6), (q[0] + side * r * 0.4, q[1], q[2] + r * 2.0)]
        add(SV, SF, bud, [(0, 1, 2), (0, 2, 3), (0, 3, 1), (4, 2, 1), (4, 3, 2), (4, 1, 3)])

    obj('leaves', LV, LF, 'Leaf_Green')
    obj('leaves_pale', PLV, PLF, 'Leaf_Pale')
    obj('stems', SV, SF, 'Stem_Green')
    obj('flower_stalks', RV, RF, 'Stem_Red')
    obj('petals', PV, PF, 'Petal_Blue')
    obj('flower_centres', CV, CF, 'Flower_White')


def main(path=os.path.join(HERE, NAME + '.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(random.Random(P['seed']))
    for o in bpy.context.scene.objects:            # nothing below the ground
        for v in o.data.vertices:
            v.co.z = max(v.co.z, 0.0)
    # scale the whole clump to the normal model's height (the game copies the GLB as-is, no rescale)
    top = max(v.co[2] for o in bpy.context.scene.objects for v in o.data.vertices)
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co = v.co * (P['height'] / top)
    tris = 0
    lo, hi = [1e9] * 3, [-1e9] * 3
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for v in o.data.vertices:
            for k in range(3):
                lo[k] = min(lo[k], v.co[k]); hi[k] = max(hi[k], v.co[k])
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('bounds', [round(x, 3) for x in lo], [round(x, 3) for x in hi], 'dims', [round(hi[k] - lo[k], 3) for k in range(3)])
    print('triangles', tris)


if __name__ == '__main__':
    main()

"""Hazel shrub, charming (storybook toy) version, for the Ranch tile's style switch
(the charming twin of simulations/regional-assets/GF-158.glb; models/hazel/ is the normal one).

Same plant as models/hazel: a multi-stem hazel with round leaves and hazelnut clusters, same materials, origin and
round footprint. Made toy-like after mj/hazel-charming/hero.png: a few chubby straight stems rise from a soft leafy
tuft into a big leaning crown of oversized round coin leaves round a dark core; a soft S-curved sage trunk swings out
to one side and carries a plump cloud clump of round blobs with raised swirls; a branch carries a second cloud clump
on the other side; fat caramel hazelnuts hang in threes in pale husks; a few fallen leaves lie round the foot.
Z up, metres, origin at the base on the ground, front -Y. No animation (the game poses and sways plants).
Features are laid out in the hero's picture plane (sx across, sd towards the hero camera, z up) and turned to world
by HERO_YAW, so the hero composition reads from the hero's 3/4 view.
usage: python build.py            (writes hazel-charming.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'hazel-charming'

P = dict(
    seed=11,
    hero_yaw=30.0,                  # degrees: the hero camera sits this far round from the front towards +X
    # stems: (base sx, base sd, top sx, top sd, top z)
    stems=[(-0.20, 0.05, -0.24, 0.10, 2.05), (-0.10, -0.06, -0.06, -0.12, 2.25), (-0.02, 0.08, 0.06, 0.12, 2.15),
           (-0.15, -0.12, -0.34, -0.18, 1.95), (0.04, -0.04, 0.18, -0.06, 2.00), (-0.07, 0.14, -0.03, 0.26, 1.90)],
    sprigs=3,                       # small leaves along each stem below the crown
    stem_r0=0.034, stem_r1=0.020, stem_sides=5, stem_segs=4,
    # crown: a leaning ellipsoid of round leaves round a dark core, plus a lower lobe towards the trunk side
    crown=dict(c=(-0.07, 0.0, 1.86), r=(0.56, 0.50, 0.60), lean=-8.0),
    lobe=dict(c=(0.45, 0.05, 1.32), r=(0.38, 0.34, 0.32), lean=0.0),
    crown_leaves=58, lobe_leaves=20,
    leaf_r=(0.15, 0.21),            # oversized round coin leaves (radius, m)
    leaf_cup=0.30,                  # rim lifts this fraction of the radius: a soft cup
    leaf_out=0.06,                  # leaf centres sit this far outside the shell
    core_scale=0.80,                # the dark core blob fills gaps between the leaves
    # S-curved soft trunk to the right cloud clump (sx, sd, z) and the branch to the left clump
    trunk=[(0.16, 0.02, 0.0), (0.08, 0.04, 0.18), (0.10, 0.06, 0.36), (0.22, 0.08, 0.50), (0.42, 0.08, 0.60),
           (0.56, 0.06, 0.72)],
    trunk_r=(0.085, 0.050), trunk_sides=7, trunk_sub=2,
    branch=[(-0.13, -0.02, 0.55), (-0.18, -0.02, 0.70), (-0.30, 0.0, 0.82)],
    branch_r=(0.030, 0.022),
    # cloud clumps: (centre sx, sd, z, scale); blobs are flattened icospheres
    clumps=[(-0.54, 0.16, 0.95, 0.36), (0.70, -0.12, 0.84, 0.41)],
    tuft=(-0.02, 0.0, 0.09, 0.56),   # the soft leafy tuft at the foot
    tuft_blobs=3,
    blob_squash=0.85,
    swirls=2,                       # raised swirls per cloud clump
    swirl_r=0.016, swirl_turns=1.6,
    # nuts: (sx, sd, z) of each hanging cluster of three
    nuts=[(-0.46, 0.20, 1.62), (0.06, 0.50, 1.90), (0.40, 0.36, 1.36)],
    nut_r=0.060,
    litter=8,
)

COL = {  # sRGB, sampled from mj/hazel-charming/hero.png, lifted a little for shading
    'Stem_Olive': (0.50, 0.54, 0.21),
    'Stem_Sage': (0.62, 0.64, 0.33),            # the soft twisty trunk (new part)
    'Leaf_Dark': (0.34, 0.44, 0.12), 'Leaf_Light': (0.55, 0.67, 0.27),
    'Leaf_Cloud': (0.66, 0.73, 0.38),           # the plump cloud clumps (new part)
    'Fruit_Hazel': (0.70, 0.42, 0.19), 'Fruit_Husk': (0.74, 0.77, 0.42),
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


def obj(name, verts, faces, mat, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = smooth
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


YAW = math.radians(P['hero_yaw'])
RX, RY = math.cos(YAW), math.sin(YAW)            # picture-plane right
DX, DY = math.sin(YAW), -math.cos(YAW)           # towards the hero camera


def W(p):
    """picture-plane (sx, sd, z) to world"""
    sx, sd, z = p
    return (sx * RX + sd * DX, sx * RY + sd * DY, z)


def Wv(v):
    return (v[0] * RX + v[1] * DX, v[0] * RY + v[1] * DY, v[2])


def tube(path, radii, sides, rot=0.0, cap=True):
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
    if cap:
        V.append(path[-1]); c = len(V) - 1
        for s in range(sides):
            F.append(((n - 1) * sides + s, (n - 1) * sides + (s + 1) % sides, c))
    return V, F


def catmull(pts, sub):
    """a smooth curve through pts (Catmull-Rom), `sub` points per span"""
    out = []
    ext = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for j in range(sub):
            t = j / sub
            out.append(tuple(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in range(3)))
    out.append(pts[-1])
    return out


def icosphere():
    t = (1 + 5 ** 0.5) / 2
    v = [norm(p) for p in [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
                           (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    mid = {}
    def m(a, b):
        k = (min(a, b), max(a, b))
        if k not in mid:
            v.append(norm(tuple((v[a][i] + v[b][i]) / 2 for i in range(3)))); mid[k] = len(v) - 1
        return mid[k]
    f2 = []
    for a, b, c in f:
        ab, bc, ca = m(a, b), m(b, c), m(c, a)
        f2 += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
    return v, f2


ICO = icosphere()


def blob(c, r, squash, V, F, rz=0.0):
    v = []
    for x, y, z in ICO[0]:
        x2, y2 = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
        v.append((c[0] + r * x2, c[1] + r * y2, max(0.0, c[2] + r * squash * z)))
    add(V, F, v, ICO[1])


def lowsphere(c, r, d, V, F, seg=5, rings=3, stretch=1.25):
    """a small smooth sphere stretched along d (nut)"""
    u = norm(cross(d, (0, 0, 1) if abs(d[2]) < 0.9 else (1, 0, 0))); w = cross(d, u)
    v = [tuple(c[k] - d[k] * r * stretch for k in range(3))]
    for i in range(1, rings):
        a = math.pi * i / rings; rr = r * math.sin(a); h = -math.cos(a) * r * stretch
        for s in range(seg):
            b = 2 * math.pi * s / seg
            v.append(tuple(c[k] + d[k] * h + rr * (math.cos(b) * u[k] + math.sin(b) * w[k]) for k in range(3)))
    v.append(tuple(c[k] + d[k] * r * stretch * 1.15 for k in range(3)))        # a little point at the tip
    f = [(0, 1 + (s + 1) % seg, 1 + s) for s in range(seg)]
    for i in range(rings - 2):
        for s in range(seg):
            a = 1 + i * seg + s; b = 1 + i * seg + (s + 1) % seg
            f.append((a, b, b + seg, a + seg))
    top = len(v) - 1; o = 1 + (rings - 2) * seg
    f += [(o + s, o + (s + 1) % seg, top) for s in range(seg)]
    add(V, F, v, f)


def coin_leaf(c, n, r, cup, rng, V, F, sides=7):
    """a round coin leaf: centre plus a rim of `sides` points lifted into a soft cup along its normal n"""
    n = norm(n)
    u = norm(cross(n, (0, 0, 1) if abs(n[2]) < 0.95 else (1, 0, 0))); w = cross(n, u)
    v = [tuple(c[k] - n[k] * r * cup * 0.4 for k in range(3))]
    rot = rng.uniform(0, 2 * math.pi)
    for s in range(sides):
        a = rot + 2 * math.pi * s / sides
        rr = r * (0.82 if s == 0 else 1.0)                       # a shallow notch where the stalk meets the leaf
        v.append(tuple(c[k] + rr * (math.cos(a) * u[k] + math.sin(a) * w[k]) + n[k] * r * cup * 0.6 for k in range(3)))
    add(V, F, v, [(0, 1 + s, 1 + (s + 1) % sides) for s in range(sides)])


def shell_point(spec, rng):
    """a random point on a leaning ellipsoid (picture-plane spec) and its outward normal, both in world"""
    while True:
        d = (rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))
        if sum(x * x for x in d) > 1e-6:
            break
    d = norm(d)
    if d[2] < -0.55:                                            # few leaves underneath
        d = (d[0], d[1], -d[2] * 0.5)
    cx, cy, cz = spec['c']; rx, ry, rz = spec['r']
    p = (d[0] * rx, d[1] * ry, d[2] * rz)
    nrm = norm((d[0] / rx, d[1] / ry, d[2] / rz))
    L = math.radians(spec['lean'])                               # lean: rotate in the picture plane about the sd axis
    def lean(q):
        return (q[0] * math.cos(L) - q[2] * math.sin(L), q[1], q[0] * math.sin(L) + q[2] * math.cos(L))
    p = lean(p); nrm = lean(nrm)
    p = (p[0] + cx, p[1] + cy, p[2] + cz)
    return W(p), Wv(nrm)


def swirl(c, r, n, rng, V, F):
    """a raised spiral ridge lying on a blob of radius r round its outward axis n"""
    n = norm(n); u = norm(cross(n, (0, 0, 1) if abs(n[2]) < 0.9 else (1, 0, 0))); w = cross(n, u)
    pts = []
    k = 10; turns = P['swirl_turns']; rot = rng.uniform(0, 2 * math.pi)
    for i in range(k + 1):
        t = i / k; a = rot + 2 * math.pi * turns * t; rho = r * (0.12 + 0.62 * t)
        h = math.sqrt(max(r * r - rho * rho, 0)) + P['swirl_r'] * 0.4
        pts.append(tuple(c[j] + n[j] * h + rho * (math.cos(a) * u[j] + math.sin(a) * w[j]) for j in range(3)))
    radii = [P['swirl_r'] * (0.7 + 0.5 * math.sin(math.pi * i / k)) for i in range(k + 1)]
    add(V, F, *tube(pts, radii, 3))


def build(rng):
    SV, SF, TV, TF = [], [], [], []
    LV, LF, DV, DF, CV, CF = [], [], [], [], [], []
    # stems: chubby, straight, a slight lean; they end inside the crown
    for i, (bx, bd, tx, td, tz) in enumerate(P['stems']):
        segs = P['stem_segs']
        path = [W((bx + (tx - bx) * s / segs, bd + (td - bd) * s / segs, tz * s / segs)) for s in range(segs + 1)]
        radii = [P['stem_r0'] + (P['stem_r1'] - P['stem_r0']) * s / segs for s in range(segs + 1)]
        add(SV, SF, *tube(path, radii, P['stem_sides'], rot=i))
        # a few small leaves on short stalks along the bare stem
        for j in range(P['sprigs']):
            z = rng.uniform(0.45, 1.35); f = z / tz
            p = W((bx + (tx - bx) * f, bd + (td - bd) * f, z))
            a = rng.uniform(0, 2 * math.pi)
            n = norm((math.cos(a), math.sin(a), 0.5))
            c = tuple(p[k] + n[k] * 0.07 for k in range(3))
            coin_leaf(c, norm((n[0], n[1], 1.2)), rng.uniform(0.06, 0.09), 0.3, rng, *((LV, LF) if j % 2 else (DV, DF)), sides=6)
        # a leaf fan at each stem tip, sticking out of the crown top
        tp = path[-1]
        for j in range(2):
            a = rng.uniform(0, 2 * math.pi)
            n = norm((0.6 * math.cos(a), 0.6 * math.sin(a), 1.0))
            c = tuple(tp[k] + n[k] * 0.14 for k in range(3))
            coin_leaf(c, n, rng.uniform(*P['leaf_r']), P['leaf_cup'], rng, *((LV, LF) if j == 0 else (DV, DF)))
    # the left branch, out of the second stem towards the left clump
    br = catmull([W(p) for p in P['branch']], 2)
    add(SV, SF, *tube(br, [P['branch_r'][0] + (P['branch_r'][1] - P['branch_r'][0]) * i / (len(br) - 1) for i in range(len(br))], 5))
    # the soft S trunk
    tr = catmull([W(p) for p in P['trunk']], P['trunk_sub'])
    radii = [P['trunk_r'][0] + (P['trunk_r'][1] - P['trunk_r'][0]) * (i / (len(tr) - 1)) ** 0.8 for i in range(len(tr))]
    radii[0] *= 1.35                                                       # a soft flared foot
    add(TV, TF, *tube(tr, radii, P['trunk_sides']))
    # crown: dark core blobs, then round leaves on the shells
    for spec, sc in ((P['crown'], 1.0), (P['lobe'], 1.0)):
        c = W(spec['c']); r = min(spec['r']) * P['core_scale']
        blob(c, r * 1.1, spec['r'][2] / min(spec['r']) * 0.95, DV, DF)
    for spec, n_leaves in ((P['crown'], P['crown_leaves']), (P['lobe'], P['lobe_leaves'])):
        for _ in range(n_leaves):
            p, nrm = shell_point(spec, rng)
            nn = norm((nrm[0] + rng.uniform(-0.35, 0.35), nrm[1] + rng.uniform(-0.35, 0.35), nrm[2] + 0.15))
            c = tuple(p[k] + nrm[k] * P['leaf_out'] for k in range(3))
            light = nrm[2] * 0.6 + (nrm[0] * RX + nrm[1] * RY) * -0.3 + rng.uniform(-0.5, 0.5) > -0.40
            coin_leaf(c, nn, rng.uniform(*P['leaf_r']), P['leaf_cup'], rng, *((LV, LF) if light else (DV, DF)))
    # cloud clumps: a big centre blob ringed by smaller ones, plus raised swirls on the outward faces
    for (cx, cd, cz, s), side in zip(P['clumps'], (-1, 1)):
        layout = [(0, 0, 0, 1.0), (side * 0.55, -0.15, -0.30, 0.68), (-side * 0.45, 0.10, -0.40, 0.60),
                  (side * 0.25, 0.20, 0.55, 0.62), (-side * 0.30, -0.25, 0.42, 0.58)]
        for k, (ox, od, oz, f) in enumerate(layout):
            c = W((cx + ox * s, cd + od * s, cz + oz * s))
            blob(c, s * f * 0.82, P['blob_squash'], CV, CF, rz=k)
        for k in range(P['swirls']):
            ox, od, oz, f = layout[k * 2 + (1 if side > 0 else 0)] if k else layout[0]
            c = W((cx + ox * s, cd + od * s, cz + oz * s)); r = s * f * 0.82
            n = norm(Wv((side * 0.45 + ox, 1.0, 0.15 + oz)))
            swirl(c, r * 0.97, n, rng, CV, CF)
    # the tuft at the foot: a low ring of blobs
    tx, td, tz, ts = P['tuft']
    for k in range(P['tuft_blobs']):
        a = 2 * math.pi * k / P['tuft_blobs'] + 0.4
        c = W((tx + ts * 0.62 * math.cos(a), td + ts * 0.55 * math.sin(a), tz + 0.02 * k))
        blob(c, ts * (0.48 if k % 2 else 0.40), 0.75, DV if k % 2 else LV, DF if k % 2 else LF, rz=k)
    # fallen leaves round the foot
    for k in range(P['litter']):
        a = 2 * math.pi * k / P['litter'] + rng.uniform(-0.2, 0.2); d = rng.uniform(0.45, 0.75)
        c = (tx + d * math.cos(a), td + d * 0.8 * math.sin(a), 0.012)
        coin_leaf(W(c), (rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), 1.0), rng.uniform(0.05, 0.08), 0.2, rng, LV if k % 3 else DV, LF if k % 3 else DF, sides=6)
    obj('stems', SV, SF, 'Stem_Olive', smooth=True)
    obj('trunk', TV, TF, 'Stem_Sage', smooth=True)
    obj('leaves_light', LV, LF, 'Leaf_Light')
    obj('leaves_dark', DV, DF, 'Leaf_Dark')
    obj('cloud_clumps', CV, CF, 'Leaf_Cloud', smooth=True)
    # nut clusters: three fat nuts hanging from a short stalk, each in a pale husk cup
    NV, NF, HV, HF = [], [], [], []
    for (sx, sd, z) in P['nuts']:
        top = W((sx, sd, z))
        for j in range(3):
            a = 2 * math.pi * j / 3 + rng.uniform(-0.3, 0.3)
            d = norm((0.45 * math.cos(a), 0.45 * math.sin(a), -1.0))
            R = P['nut_r'] * rng.uniform(0.9, 1.1)
            c = tuple(top[k] + d[k] * (R * 1.6) for k in range(3))
            lowsphere(c, R, d, NV, NF)
            u = norm(cross(d, (0, 0, 1))); w = cross(d, u)
            hv = [tuple(c[k] - d[k] * R * 1.35 for k in range(3))]
            for s in range(5):
                b = 2 * math.pi * (s + 0.5) / 5
                hv.append(tuple(c[k] - d[k] * R * 0.2 + R * 1.15 * (math.cos(b) * u[k] + math.sin(b) * w[k]) for k in range(3)))
            add(HV, HF, hv, [(0, 1 + s, 1 + (s + 1) % 5) for s in range(5)])
        add(HV, HF, *tube([top, (top[0], top[1], top[2] + 0.10)], [0.012, 0.012], 4))   # the cluster's stalk
    obj('nuts', NV, NF, 'Fruit_Hazel', smooth=True)
    obj('husks', HV, HF, 'Fruit_Husk')


def main(path=os.path.join(HERE, f'{NAME}.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    build(rng)
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    lo = [min(v.co[i] for o in bpy.context.scene.objects for v in o.data.vertices) for i in range(3)]
    hi = [max(v.co[i] for o in bpy.context.scene.objects for v in o.data.vertices) for i in range(3)]
    print('size %.2f x %.2f x %.2f' % tuple(hi[i] - lo[i] for i in range(3)), 'centre %.2f %.2f' % ((hi[0] + lo[0]) / 2, (hi[1] + lo[1]) / 2))
    print('triangles', tris)


if __name__ == '__main__':
    main()

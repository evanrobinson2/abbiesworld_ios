"""Charming (storybook toy) weeping silver birch for the Ranch tile: the `-charming` twin of models/birch.

The same tree as models/birch (white trunk with black marks and a dark base, arching branches, hanging threads of
leaf cards in two greens), pushed towards toy art: a chubby soft S-twisting trunk with fat root toes, oversized black
bark dashes, and the crown broken into five plump clumps, each a cap of soft cloud puffs with a skirt of chunky
leaf-card threads hanging round it, the whole crown leaning off to one side of the trunk base.
Z up, metres, origin at the trunk base on the ground, front -Y. No animation (the game poses and sways trees).
The hero is drawn from 30 deg off the front towards +X, so the S of the trunk and the spread of the clumps are laid
out along that view's screen axis (S below) and the footprint stays about square.
usage: python build.py            (writes birch-charming.glb next to this file)
"""
import os, math, random
import bpy, bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
YAW = math.radians(30)                              # hero view: screen right is S = (cos YAW, sin YAW)
S = (math.cos(YAW), math.sin(YAW)); D = (-math.sin(YAW), math.cos(YAW))   # D: depth, away from the hero camera

P = dict(
    seed=7,
    trunk_top=6.1,
    trunk_sides=9, trunk_rings=26,
    # trunk centreline as (z, s, d): s along the hero's screen axis, d in depth. The S-twist read from the hero.
    trunk_path=[(0.0, 0.0, 0.0), (0.45, 0.14, -0.04), (0.95, 0.55, -0.08), (1.4, 0.98, -0.04), (1.8, 1.02, 0.04),
                (2.25, 0.66, 0.08), (2.65, 0.45, 0.04), (3.05, 0.62, -0.02), (3.45, 0.90, -0.06), (3.95, 0.84, 0.0),
                (4.55, 0.60, 0.06), (5.15, 0.38, 0.08), (5.6, 0.24, 0.04), (6.1, 0.10, 0.0)],
    # trunk radius by height: chubby, soft taper
    trunk_r=[(0.0, 0.36), (0.25, 0.30), (0.7, 0.27), (2.0, 0.25), (3.5, 0.215), (4.6, 0.165), (5.5, 0.11), (6.1, 0.06)],
    bulge=0.10,                     # soft lumps along the trunk (fraction of radius)
    roots=5, root_len=0.30, root_h=0.16,          # fat dark root toes round the base
    base_dark_h=0.28, base_dark_jag=0.08,
    marks=20, mark_zmin=0.5, mark_zmax=5.3,       # oversized black bark dashes
    # crown clumps: (s, d, z centre, radius, curtain bottom low, high). Read from the hero, left to right.
    clumps=[(-1.45, -0.15, 4.35, 0.78, 2.8, 3.6),      # left, mid height
            (-0.80, -0.55, 3.30, 0.92, 1.3, 2.2),     # lower left, longest curtains
            (-0.22, 0.10, 6.2, 1.00, 3.1, 4.3),       # the big top clump
            (0.95, 0.35, 5.80, 0.72, 3.3, 4.4),        # upper right
            (1.95, 0.45, 5.05, 0.70, 1.9, 2.8)],     # far right, long curtains
    puffs=(4, 6), puff_r=(0.34, 0.46), puff_sq=0.9,  # puffs per clump, radius as a fraction of the clump, z squash
    puff_seg=7, puff_rings=4,
    threads_per_m=15,               # hanging threads per metre of clump radius
    thread_front=0.7,               # extra share of threads on the camera side (the hero is seen from there)
    card_len=0.33, card_w=0.30, card_turn=45, card_tilt=22, other_green=0.22,
    inner_threads=0,
    skirt_sides=18, skirt_k=0.8,       # dark solid skirt inside each curtain, with a ragged hem
    branch_r=0.085, branch_sides=4, branch_segs=4,
)

COL = {  # sRGB, sampled from the charming hero
    'Bark_White': (0.93, 0.91, 0.86), 'Bark_Black': (0.11, 0.10, 0.09), 'Bark_Dark': (0.27, 0.30, 0.13),
    'Leaf_Light': (0.50, 0.68, 0.19), 'Leaf_Dark': (0.33, 0.52, 0.12), 'Leaf_Puff': (0.58, 0.70, 0.27),
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
    b.inputs['Roughness'].default_value = 0.85 if name.startswith('Bark') else 0.75
    m.use_backface_culling = False          # exported as doubleSided: the leaf cards render from both sides
    return m


def obj(name, verts, faces, mat, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = smooth
    me.materials.append(material(mat))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def sd(s, d):
    """Hero screen/depth coordinates -> world x, y."""
    return (s * S[0] + d * D[0], s * S[1] + d * D[1])


def interp(pts, z):
    s = sorted(pts)
    if z <= s[0][0]:
        return s[0][1:]
    for a, b in zip(s, s[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(u + (v - u) * t for u, v in zip(a[1:], b[1:]))
    return s[-1][1:]


def smooth_path(z):
    """Catmull-Rom through the trunk control points; returns world (x, y)."""
    pts = P['trunk_path']
    z = min(max(z, 0.0), pts[-1][0])
    for i in range(len(pts) - 1):
        if pts[i][0] <= z <= pts[i + 1][0] or i == len(pts) - 2:
            p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
            t = min(max((z - p1[0]) / (p2[0] - p1[0]), 0), 1)
            out = []
            for k in (1, 2):
                a, b, c, d = p0[k], p1[k], p2[k], p3[k]
                out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
            return sd(*out)


def trunk_radius(z):
    return interp(P['trunk_r'], z)[0]


def trunk_outer(z):
    """Radius of the trunk's horizontal ring at z (with its bulge and the slope widening)."""
    ax, ay = smooth_path(z - 0.05); bx, by = smooth_path(z + 0.05)
    slope = math.hypot(bx - ax, by - ay) / 0.1
    return trunk_radius(z) * (1 + P['bulge'] * math.sin(z * 4.1 + 0.7)) * math.sqrt(1 + slope * slope)


def tube(path, radii, sides, rot=0.0, cap=True):
    """A tube along a polyline; returns verts, faces."""
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        a = path[min(i + 1, n - 1)]; b = path[max(i - 1, 0)]
        t = [a[k] - b[k] for k in range(3)]; L = math.sqrt(sum(x * x for x in t)) or 1; t = [x / L for x in t]
        up = (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0)
        u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]
        L = math.sqrt(sum(x * x for x in u)); u = [x / L for x in u]
        v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        for s in range(sides):
            ang = rot + 2 * math.pi * s / sides
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


def build_trunk(rng):
    n = P['trunk_rings']; top = P['trunk_top']
    zs = [top * (i / (n - 1)) for i in range(n)]
    # horizontal rings (no twisting frame), widened by the local slope so the trunk keeps its thickness in the bends
    sides = P['trunk_sides']; V, F = [], []
    for i, z in enumerate(zs):
        cx, cy = smooth_path(z)
        ax, ay = smooth_path(z - 0.05); bx, by = smooth_path(z + 0.05)
        slope = math.hypot(bx - ax, by - ay) / 0.1
        r = trunk_radius(z) * (1 + P['bulge'] * math.sin(z * 4.1 + 0.7)) * math.sqrt(1 + slope * slope)
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            V.append((cx + r * math.cos(ang), cy + r * math.sin(ang), z))
    for i in range(n - 1):
        for k in range(sides):
            a = i * sides + k; c = i * sides + (k + 1) % sides
            F.append((a, c, c + sides, a + sides))
    V.append((*smooth_path(top), top + 0.03)); c = len(V) - 1
    for k in range(sides):
        F.append(((n - 1) * sides + k, (n - 1) * sides + (k + 1) % sides, c))
    V = [(x, y, 0.0 if z < 0.01 else z) for x, y, z in V]
    obj('trunk', V, F, 'Bark_White', smooth=True)

    # dark root toes: short fat tapering lumps splayed round the base, plus a low ragged dark collar
    BV, BF = [], []
    for i in range(P['roots']):
        th = 2 * math.pi * (i + rng.uniform(-0.15, 0.15)) / P['roots'] + 0.4
        ln = P['root_len'] * rng.uniform(0.8, 1.15)
        pts, rr = [], []
        for k in range(4):
            t = k / 3
            r = trunk_radius(0) * 0.55 + ln * t
            pts.append((r * math.cos(th), r * math.sin(th), P['root_h'] * (1 - t) ** 1.4 * 0.8 + 0.02))
            rr.append(0.13 * (1 - 0.65 * t))
        v, f = tube(pts, rr, 4, cap=True)
        v = [(x, y, max(z, 0.0)) for x, y, z in v]
        o = len(BV); BV += v; BF += [tuple(x + o for x in q) for q in f]
    sides = P['trunk_sides'] + 1; o = len(BV)
    for ring, zr in enumerate((0.0, P['base_dark_h'])):
        for s in range(sides):
            ang = 2 * math.pi * s / sides + 0.2
            z = zr + (rng.uniform(-1, 1) * P['base_dark_jag'] * (1.6 if s % 2 else 0.5) if ring else 0)
            r = trunk_outer(z) + 0.015
            cx, cy = smooth_path(z)
            BV.append((cx + r * math.cos(ang), cy + r * math.sin(ang), z))
    for s in range(sides):
        a = o + s; b = o + (s + 1) % sides
        BF.append((a, b, b + sides, a + sides))
    obj('trunk_base', BV, BF, 'Bark_Dark', smooth=True)

    # black bark dashes: wide flat wrapped strokes, chunkier than the normal birch's
    V, F = [], []
    for i in range(P['marks']):
        z = P['mark_zmin'] + (P['mark_zmax'] - P['mark_zmin']) * (i + rng.uniform(0, 0.8)) / P['marks']
        th = rng.uniform(0, 2 * math.pi)
        r = trunk_outer(z) + 0.022   # clears the trunk's flat facets
        half = rng.uniform(0.4, 0.75); hgt = rng.uniform(0.05, 0.085)
        cx, cy = smooth_path(z); b = len(V)
        cols = 5
        for j in range(cols):                                       # a flat wrapped band, fatter mid-way
            a = th - half + 2 * half * j / (cols - 1); w = 1 - 0.55 * abs(j - 2) / 2
            for dz in (-hgt, hgt):
                V.append((cx + r * math.cos(a), cy + r * math.sin(a), z + dz * w))
        F += [(b + 2 * j, b + 2 * j + 2, b + 2 * j + 3, b + 2 * j + 1) for j in range(cols - 1)]
    obj('bark_marks', V, F, 'Bark_Black')


def puff(cx, cy, cz, r, sq, V, F):
    """A soft low-poly cloud puff: a UV sphere with a flattened underside."""
    seg, rings = P['puff_seg'], P['puff_rings']
    b = len(V)
    V.append((cx, cy, cz + r * sq))
    for i in range(1, rings):
        ph = math.pi * i / rings
        for j in range(seg):
            th = 2 * math.pi * (j + 0.5 * (i % 2)) / seg
            z = math.cos(ph); z = z * sq if z > 0 else z * sq * 0.6
            V.append((cx + r * math.sin(ph) * math.cos(th), cy + r * math.sin(ph) * math.sin(th), cz + r * z))
    V.append((cx, cy, cz - r * sq * 0.6)); bot = len(V) - 1
    ring = lambda i, j: b + 1 + (i - 1) * seg + j % seg
    for j in range(seg):
        F.append((b, ring(1, j), ring(1, j + 1)))
        F.append((bot, ring(rings - 1, j + 1), ring(rings - 1, j)))
    for i in range(1, rings - 1):
        off = i % 2
        for j in range(seg):
            if off:
                F.append((ring(i, j), ring(i + 1, j), ring(i + 1, j + 1))); F.append((ring(i, j), ring(i + 1, j + 1), ring(i, j + 1)))
            else:
                F.append((ring(i, j), ring(i + 1, j), ring(i, j + 1))); F.append((ring(i, j + 1), ring(i + 1, j), ring(i + 1, j + 1)))


def card(cx, cy, z, ln, w, yaw, tilt, V, F):
    """One chunky leaf card: a flat diamond hanging from (cx, cy, z). 2 triangles."""
    ax, ay = math.cos(yaw), math.sin(yaw)
    ct, st = math.cos(tilt), math.sin(tilt)
    def p(u, v):
        uu, vv = u * ct - v * st, u * st + v * ct
        return (cx + ax * uu, cy + ay * uu, z - vv)
    b = len(V)
    V += [p(0, 0), p(w * 0.5, ln * 0.45), p(0, ln), p(-w * 0.5, ln * 0.45)]
    F.append((b, b + 1, b + 2, b + 3))


def envelope(R, cz, z):
    """Radius of a clump's curtain at height z: a dome over the centre, then hanging straight with a slight flare."""
    if z >= cz:
        u = min((z - cz) / R, 1.0)
        return R * math.sqrt(max(1 - u * u, 0.0)) * 1.05
    return R * (1.05 + 0.06 * (cz - z))


def thread(cx, cy, cz, R, th, k, z0, z1, rng, own, other):
    """A hanging thread of chunky leaf cards round one clump, from z0 down to z1 at azimuth th."""
    sway = rng.uniform(-1, 1); z = z0; first = True
    while z > z1:
        t = (z0 - z) / max(z0 - z1, 1e-3)
        a = th + sway * 0.06 * t
        r = k * envelope(R, cz, z) + 0.04 * math.sin(t * 6 + th * 3) + rng.uniform(-0.03, 0.03)
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        sc = rng.uniform(0.7, 1.25) * (1 - 0.35 * t ** 2)
        ln = P['card_len'] * sc; w = P['card_w'] * sc * rng.uniform(0.85, 1.15)
        yaw = a + math.pi / 2 + math.radians(rng.uniform(-P['card_turn'], P['card_turn']))
        tilt = math.radians(rng.uniform(-P['card_tilt'], P['card_tilt']))
        V, F = other if (not first and rng.random() < P['other_green']) else own
        card(x, y, z, ln, w, yaw, tilt, V, F)
        z -= ln * rng.uniform(0.6, 0.85)
        first = False


def build_crown(rng):
    PV, PF = [], []
    BV, BF = [], []
    L, Dk = ([], []), ([], [])
    cam = math.atan2(-math.cos(YAW), math.sin(YAW))          # azimuth pointing at the hero camera
    for ci, (s, d, cz, R, zlo, zhi) in enumerate(P['clumps']):
        cx, cy = sd(s, d)
        # branch: from the trunk, out and up to the underside of the clump, a soft arch
        zb = min(max(cz - R * 1.1, 2.6), 5.4)
        bx, by = smooth_path(zb)
        pts = []
        for k in range(P['branch_segs'] + 1):
            t = k / P['branch_segs']
            pts.append((bx + (cx - bx) * t, by + (cy - by) * t, zb + (cz - 0.1 - zb) * math.sin(t * math.pi / 2) ** 0.8 + 0.25 * math.sin(t * math.pi)))
        radii = [P['branch_r'] * (1.25 - 0.6 * k / P['branch_segs']) for k in range(P['branch_segs'] + 1)]
        v, f = tube(pts, radii, P['branch_sides'], cap=True)
        o = len(BV); BV += v; BF += [tuple(x + o for x in q) for q in f]
        # cap of cloud puffs: one big on top, the rest round the shoulders
        npuff = rng.randint(*P['puffs'])
        for j in range(npuff):
            if j == 0:
                ph, a, pr = 0.0, 0.0, P['puff_r'][1] * 1.15
            else:
                ph = math.radians(rng.uniform(35, 70)); a = 2 * math.pi * j / (npuff - 1) + rng.uniform(-0.3, 0.3)
                pr = rng.uniform(*P['puff_r'])
            rr = R * 0.82
            puff(cx + rr * math.sin(ph) * math.cos(a), cy + rr * math.sin(ph) * math.sin(a), cz + rr * math.cos(ph) * 0.8,
                 R * pr, P['puff_sq'], PV, PF)
        # dark skirt: a solid hanging sleeve inside the threads, so the curtain reads as a mass; ragged hem
        ns = P['skirt_sides']; top = cz + R * 0.35; o = len(Dk[0])
        hem = [rng.uniform(zhi - 0.3, zhi + 0.3) + (0.3 if j % 2 else 0.0) for j in range(ns)]   # zigzag fringe, inside the threads
        jit = [rng.uniform(0.88, 1.1) for _ in range(ns)]
        for ring in range(3):
            for j in range(ns):
                a = 2 * math.pi * j / ns
                z = top + (hem[j] - top) * (0, 0.45, 1)[ring]
                r = P['skirt_k'] * envelope(R, cz, z) * (0.7 if ring == 0 else jit[j])
                Dk[0].append((cx + r * math.cos(a), cy + r * math.sin(a), z))
        for ring in range(2):
            for j in range(ns):
                p = o + ring * ns + j; q = o + ring * ns + (j + 1) % ns
                Dk[1].append((p, q, q + ns, p + ns))
        Dk[0].append((cx, cy, top + R * 0.25)); c = len(Dk[0]) - 1
        for j in range(ns):
            Dk[1].append((o + (j + 1) % ns, o + j, c))
        # skirt of hanging threads; more of them face the camera so the hero side reads full
        n = max(6, round(P['threads_per_m'] * R))
        for j in range(n):
            a = 2 * math.pi * (j + rng.uniform(-0.3, 0.3)) / n
            if rng.random() < P['thread_front']:
                a = cam + rng.uniform(-1.4, 1.4)
            z0 = cz + R * rng.uniform(0.25, 0.6)
            z1 = rng.uniform(zlo, zhi)
            if math.cos(a - cam) < -0.2:
                z1 = max(z1, (zlo + zhi) / 2)                      # the back hangs shorter (unseen, saves triangles)
            k = rng.uniform(0.92, 1.05)
            own, other = (L, Dk) if rng.random() < 0.7 else (Dk, L)
            thread(cx, cy, cz, R, a, k, z0, z1, rng, own, other)
        # a couple of short dark inner threads for depth
        for j in range(P['inner_threads'] // len(P['clumps'])):
            a = rng.uniform(0, 2 * math.pi)
            thread(cx, cy, cz, R, a, rng.uniform(0.5, 0.7), cz + R * 0.2, cz - R * rng.uniform(0.8, 1.4), rng, Dk, L)
    obj('branches', BV, BF, 'Bark_White', smooth=True)
    obj('leaf_puffs', PV, PF, 'Leaf_Puff', smooth=True)
    obj('leaves_light', L[0], L[1], 'Leaf_Light')
    obj('leaves_dark', Dk[0], Dk[1], 'Leaf_Dark')


def main(path=os.path.join(HERE, 'birch-charming.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    build_trunk(rng)
    build_crown(rng)
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    lo = [min(v.co[i] for o in bpy.context.scene.objects for v in o.data.vertices) for i in range(3)]
    hi = [max(v.co[i] for o in bpy.context.scene.objects for v in o.data.vertices) for i in range(3)]
    print('size %.2f x %.2f x %.2f' % tuple(h - l for h, l in zip(hi, lo)), 'x %.2f..%.2f y %.2f..%.2f' % (lo[0], hi[0], lo[1], hi[1]))
    print('triangles', tris)


if __name__ == '__main__':
    main()

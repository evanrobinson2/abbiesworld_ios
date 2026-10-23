"""horse-charming: the storybook-toy version of models/horse. A plush chibi chestnut pony: a big round head with a
wide cream blaze and a big cream muzzle, glossy button eyes and rosy cheeks, a short round barrel, short stubby legs
with a soft cuff over chunky dark hooves, a chunky dark mane falling on the near side, a big swoop of forelock, and a
fat tail swished to one side. Smooth-shaded and round instead of the normal model's facets; the head cocks a little.

Same structure as models/horse (copied from it): same part names, hierarchy, pivots-at-joints, poses, materials
(plus Fur_Blush for the new cheeks), origin and orientation, so it drops into the game in place of the normal horse.

usage: python build.py            builds every pose, writes horse-charming.glb (idle) and variants/<pose>.glb
       python build.py idle       builds and exports one pose only

Z up, metres, origin at the centre of the standing footprint on the ground, head toward -Y (to_game.py turns it to +X).
Built from named rigid parts parented in a hierarchy (body > neck > head > ears/eyes/muzzle/blaze/forelock,
body > tail, body > leg_<xx>_upper > leg_<xx>_lower > leg_<xx>_hoof > leg_<xx>_sock), each with its origin at its joint,
so the poses are rotations of those parts around their joints. All shape numbers live in P; the pose angles in POSES.
"""
import sys, os, math, random
import bpy
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    # body: rings along Y (head at -Y): (y, z_bottom, z_top, half width). A short, round plush barrel.
    BODY=[(-0.66, 0.80, 1.12, 0.20), (-0.60, 0.64, 1.24, 0.31), (-0.50, 0.55, 1.30, 0.375), (-0.34, 0.50, 1.33, 0.405),
          (-0.14, 0.49, 1.32, 0.415), (0.08, 0.50, 1.30, 0.415), (0.28, 0.52, 1.32, 0.41), (0.46, 0.56, 1.33, 0.39),
          (0.60, 0.63, 1.29, 0.35), (0.70, 0.73, 1.21, 0.28), (0.76, 0.85, 1.11, 0.17)],
    BODY_W=1.15,      # extra barrel width (half widths are multiplied by this)
    BODY_N=20,
    BODY_APEX=((-0.70, 0.97), (0.79, 0.98)),
    BODY_PIVOT=(0.0, 0.05, 0.92),
    # neck: a short thick stub from the buried base to the poll, stations (s, front depth, crest depth, half width)
    NECK_BASE=(-0.36, 1.00), NECK_TOP=(-0.56, 1.62),
    NECK=[(0.0, 0.30, 0.30, 0.30), (0.35, 0.28, 0.30, 0.27), (0.70, 0.24, 0.27, 0.23), (1.0, 0.18, 0.20, 0.18)],
    NECK_PIVOT=(-0.34, 0.86),
    NECK_N=14,
    # head: a big round chibi head on a path from the poll T to the muzzle tip M (s metres, forehead depth, jaw depth, half width)
    HEAD_T=(-0.54, 2.04), HEAD_M=(-0.92, 1.40),
    HEAD=[(0.00, 0.06, 0.10, 0.13), (0.06, 0.15, 0.22, 0.22), (0.16, 0.21, 0.30, 0.28), (0.29, 0.23, 0.31, 0.30),
          (0.42, 0.21, 0.28, 0.285), (0.52, 0.19, 0.25, 0.27)],
    MUZZLE=[(0.52, 0.19, 0.25, 0.27), (0.59, 0.20, 0.26, 0.285), (0.68, 0.18, 0.23, 0.265), (0.75, 0.13, 0.17, 0.21),
            (0.79, 0.07, 0.09, 0.11), (0.805, 0.02, 0.03, 0.04)],
    HEAD_PIVOT=(-0.56, 1.52),
    HEAD_N=16,
    EAR=dict(x=0.15, s=0.07, h=0.27, w=0.085, d=0.075, splay=(0.22, 0.42), fwd=0.12),
    BLAZE=dict(s0=0.08, s1=0.56, w0=0.035, w1=0.12),
    EYE=dict(s=0.29, f=0.05, r=0.085, bulge=0.05, inset=0.93),
    CHEEK=dict(s=0.43, f=-0.09, r=0.06, bulge=0.012),
    NOSTRIL=dict(s=0.70, f=0.10, x=0.62, r=0.030),
    # legs: x offset, front y (right, left), hind y (right, left): short, stubby, straight posts
    LEG_X=0.31, FRONT_Y=(-0.37, -0.31), HIND_Y=(0.40, 0.46),
    # front leg stations (dz from ground, dy, half width x, half depth y)
    FRONT_UP=[(0.80, 0.0, 0.15, 0.16), (0.58, 0.0, 0.135, 0.14), (0.42, 0.0, 0.125, 0.13), (0.32, 0.0, 0.12, 0.125)],
    FRONT_LO=[(0.33, 0.0, 0.12, 0.125), (0.22, 0.0, 0.12, 0.125), (0.14, 0.0, 0.125, 0.13)],
    HIND_UP=[(0.86, -0.02, 0.17, 0.20), (0.62, -0.01, 0.15, 0.16), (0.44, 0.0, 0.13, 0.135), (0.32, 0.0, 0.12, 0.125)],
    HIND_LO=[(0.33, 0.0, 0.12, 0.125), (0.22, 0.0, 0.12, 0.125), (0.14, 0.0, 0.125, 0.13)],
    SOCK=[(0.17, 0.0, 0.128, 0.133), (0.135, 0.0, 0.132, 0.137), (0.105, 0.0, 0.128, 0.133)],   # a soft plush cuff seam
    HOOF=[(0.12, 0.0, 0.13, 0.135), (0.02, -0.005, 0.145, 0.15), (0.0, -0.005, 0.135, 0.14)],
    LEG_N=12,
    FETLOCK=0.15,
    # tail: path points (y, z, half width x, half depth), with a sideways swish toward +X
    TAIL=[(0.66, 1.18, 0.09, 0.09), (0.82, 1.24, 0.16, 0.14), (0.98, 1.16, 0.22, 0.17), (1.08, 0.98, 0.23, 0.17),
          (1.12, 0.78, 0.18, 0.14), (1.10, 0.62, 0.09, 0.08)],
    TAIL_SWISH=0.36,
    TAIL_N=10,
    # mane: chunky locks along the neck crest, falling on the near side (-X, the side the hero shows)
    MANE_SIDE=-1, MANE_LOCKS=14, MANE_LEN=(2.3, 3.1), MANE_W=0.40, MANE_TH=0.15, MANE_FAR=5, MANE_DROP=0.42,
    FORELOCK=((0.0, 0.40), (0.07, 0.34), (-0.06, 0.28)), FORELOCK_W=0.18,
    JITTER=0.008,
    HS=1.30,          # head scale about the poll: every head station, feature and the poll-to-muzzle line
    YS=1.0,           # global length scale (0.93 tried: the hero score dropped)
    SMOOTH=True,      # plush: smooth shading instead of the normal model's facets
)

COL = {  # sRGB, sampled from the hero
    'Fur_Sorrel': (184, 98, 58), 'Fur_Cream': (238, 212, 158), 'Hair_Dark': (88, 46, 28),
    'Horn_Hoof': (60, 38, 24), 'Horn_Eye': (22, 16, 14), 'Fur_Blush': (236, 136, 118),
}


def scale_head(k):
    T, M = P['HEAD_T'], P['HEAD_M']
    P['HEAD_M'] = (T[0] + (M[0] - T[0]) * k, T[1] + (M[1] - T[1]) * k)
    for key in ('HEAD', 'MUZZLE'):
        P[key] = [tuple(x * k for x in st) for st in P[key]]
    for key, fields in (('EAR', ('x', 's', 'h', 'w', 'd')), ('BLAZE', ('s0', 's1', 'w0', 'w1')), ('EYE', ('s', 'f', 'r', 'bulge')),
                        ('CHEEK', ('s', 'f', 'r')), ('NOSTRIL', ('s', 'r'))):
        P[key] = {f: (v * k if f in fields else v) for f, v in P[key].items()}
    P['FORELOCK'] = tuple((ox * k, L * k) for ox, L in P['FORELOCK']); P['FORELOCK_W'] *= k


scale_head(P['HS'])
STATES = ['idle', 'feeding', 'rest']
LEGS = ['fl', 'fr', 'hl', 'hr']   # front/hind, left (+X, near side in the hero) / right


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        MATS[name] = m
    return MATS[name]


RND = random.Random(11)


def ring(c, u, v, ru, rvp, rvn, n, phase=0.0, p=2.0, jit=None):
    """n points around centre c in the (u, v) plane; rvp is the radius toward +v, rvn toward -v."""
    jit = P['JITTER'] if jit is None else jit
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n + phase
        ca, sa = math.cos(a), math.sin(a)
        eu = math.copysign(abs(ca) ** (2 / p), ca) * ru
        ev = math.copysign(abs(sa) ** (2 / p), sa) * (rvp if sa > 0 else rvn)
        f = 1 + RND.uniform(-jit, jit)
        pts.append(c + u * eu * f + v * ev * f)
    return pts


def loft(rings, cap0='flat', cap1='flat', apex0=None, apex1=None):
    verts, faces = [], []
    n = len(rings[0])
    for r in rings:
        verts += [tuple(p) for p in r]
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        for k in range(n):
            k2 = (k + 1) % n
            faces.append((a + k, a + k2, b + k2, b + k))
    for cap, idx, apex, rev in ((cap0, 0, apex0, True), (cap1, len(rings) - 1, apex1, False)):
        base = idx * n
        if cap == 'flat':
            f = tuple(base + k for k in range(n)); faces.append(f[::-1] if rev else f)
        elif cap == 'point':
            verts.append(tuple(apex)); t = len(verts) - 1
            for k in range(n):
                k2 = (k + 1) % n
                faces.append((base + k2, base + k, t) if rev else (base + k, base + k2, t))
    return verts, faces


def frame(t, up=Vector((1, 0, 0))):
    t = t.normalized(); u = (up - t * up.dot(t)).normalized(); v = t.cross(u)
    return u, v


def tube(path, radii, n, cap0='flat', cap1='flat', up=Vector((1, 0, 0)), p=2.0, phase=0.0, tip0=0.0, tip1=0.0):
    """rings perpendicular to the path; radii[i] = (ru, rvp, rvn); v = tangent x u."""
    rings = []
    for i, c in enumerate(path):
        t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)])
        u, v = frame(t, up)
        rings.append(ring(c, u, v, *radii[i], n, phase=phase, p=p))
    t0 = (path[1] - path[0]).normalized(); t1 = (path[-1] - path[-2]).normalized()
    return loft(rings, cap0, cap1, apex0=path[0] - t0 * tip0, apex1=path[-1] + t1 * tip1)


OBJ = {}


def make(name, vf, material, pivot, parent=None):
    verts, faces = vf
    pv = Vector(pivot); pv.y *= P['YS']
    verts = [(v[0], v[1] * P['YS'], v[2]) for v in verts]
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vector(v) - pv) for v in verts], [], faces)
    me.validate(); me.update()
    for poly in me.polygons:
        poly.use_smooth = P['SMOOTH']
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    ob['pivot'] = list(pv)
    if parent is not None:
        ob.parent = OBJ[parent]; ob.location = pv - Vector(OBJ[parent]['pivot'])
    else:
        ob.location = pv
    OBJ[name] = ob
    return ob


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


def yz(y, z, x=0.0):
    return Vector((x, y, z))


# ------------------------------------------------------------------ parts
def build_body():
    rings = []
    for y, zb, zt, hw in P['BODY']:
        c = yz(y, (zb + zt) / 2); h = (zt - zb) / 2
        rings.append(ring(c, Vector((1, 0, 0)), Vector((0, 0, 1)), hw * P['BODY_W'], h, h, P['BODY_N'], phase=math.pi / P['BODY_N'], p=2.3))
    y0, y1 = P['BODY'][0][0], P['BODY'][-1][0]
    (a0y, a0z), (a1y, a1z) = P['BODY_APEX']
    vf = loft(rings, 'point', 'point', apex0=yz(a0y, a0z), apex1=yz(a1y, a1z))
    make('body', vf, 'Fur_Sorrel', P['BODY_PIVOT'])


def neck_frame(s):
    B, T = Vector(P['NECK_BASE']), Vector(P['NECK_TOP'])
    c2 = B + (T - B) * s
    c = yz(c2.x, c2.y)
    d = yz(T.x - B.x, T.y - B.y).normalized()
    u, v = frame(d)          # u = +X, v = crest side (back/up)
    return c, d, u, v


def build_neck():
    path, radii = [], []
    for s, fd, cd, hw in P['NECK']:
        c, d, u, v = neck_frame(s)
        path.append(c); radii.append((hw, cd, fd))
    make('neck', tube(path, radii, P['NECK_N'], phase=math.pi / P['NECK_N']), 'Fur_Sorrel', yz(*P['NECK_PIVOT']), 'body')
    build_mane()


def neck_station(s):
    """interpolated (front depth, crest depth, half width) at s"""
    st = P['NECK']
    for (s0, *a), (s1, *b) in zip(st, st[1:]):
        if s0 <= s <= s1:
            t = (s - s0) / (s1 - s0)
            return [x + (y - x) * t for x, y in zip(a, b)]
    return st[-1][1:]


def lock(points, widths, along, th):
    """a tapered hair lock: a flattened prism through points, last point is the tip."""
    rings = []
    for i, (pt, w) in enumerate(zip(points[:-1], widths)):
        t = points[i + 1] - pt
        nrm = t.cross(along).normalized()
        rings.append([pt - along * w / 2 - nrm * th / 2, pt + along * w / 2 - nrm * th / 2,
                      pt + along * w / 2 + nrm * th / 2, pt - along * w / 2 + nrm * th / 2])
    return loft(rings, 'flat', 'point', apex1=points[-1])


def dome(pc, nrm, along, ra, rb, h, sx, n=8):
    """a low flattened dome on a surface: an ellipse (ra along `along`, rb across) at pc, raised h along nrm."""
    b = nrm.cross(along).normalized(); a = b.cross(nrm).normalized()
    r0 = [pc + a * (ra * math.cos(2 * math.pi * k / n)) + b * (rb * math.sin(2 * math.pi * k / n)) for k in range(n)]
    r1 = [pc + nrm * (h * 0.7) + (p - pc) * 0.7 for p in r0]
    return loft([r0, r1], 'flat', 'point', apex1=pc + nrm * h)


def build_mane():
    vfs = []
    n = P['MANE_LOCKS']
    for i in range(n):
        s = 0.06 + 0.98 * i / (n - 1)
        c, d, u, v = neck_frame(min(s, 1.0))
        fd, cd, hw = neck_station(min(s, 1.0))
        L = P['MANE_LEN'][0] + (P['MANE_LEN'][1] - P['MANE_LEN'][0]) * (0.5 + 0.5 * math.sin(i * 2.3)) * (0.6 + 0.4 * (1 - abs(s - 0.55)))
        L *= RND.uniform(0.9, 1.1)
        side = P['MANE_SIDE']
        pts = []
        steps = 4
        for k in range(steps + 1):
            th = -0.35 + L * k / steps          # angle from the crest (0) round to the near side (+X, pi/2)
            ru, rv = hw * 1.10 + 0.02, cd * 1.08 + 0.02
            drop = max(0.0, th - 1.2) * P['MANE_DROP']
            pt = c + v * (math.cos(th) * rv) + u * (side * math.sin(th) * ru) - d * (0.05 * th) - Vector((0, 0, drop))
            pt += Vector((RND.uniform(-0.01, 0.01), RND.uniform(-0.02, 0.02), 0))
            pts.append(pt)
        w = P['MANE_W'] * RND.uniform(0.85, 1.15)
        widths = [w * (1 - 0.8 * k / steps) for k in range(steps)]
        vfs.append(lock(pts, widths, d, P['MANE_TH']))
    for i in range(P['MANE_FAR']):            # short fringe over the far side
        s = 0.2 + 0.75 * i / (P['MANE_FAR'] - 1)
        c, d, u, v = neck_frame(s)
        fd, cd, hw = neck_station(s)
        L = RND.uniform(0.6, 0.85)
        pts = []
        for k in range(4):
            th = 0.2 - L * k / 3
            pts.append(c + v * (math.cos(th) * (cd * 1.08 + 0.02)) + u * (P['MANE_SIDE'] * math.sin(th) * (hw * 1.1 + 0.02)) - d * 0.03 * k)
        vfs.append(lock(pts, [0.20, 0.15, 0.08], d, P['MANE_TH']))
    make('mane', merge(*vfs), 'Hair_Dark', yz(*P['NECK_PIVOT']), 'neck')


def head_frame():
    T, M = Vector(P['HEAD_T']), Vector(P['HEAD_M'])
    a = yz(M.x - T.x, M.y - T.y).normalized()
    u, v = frame(a)      # v = forehead side
    return yz(T.x, T.y), a, u, v


def head_tube(stations, cap0, cap1, tip1=0.0):
    T, a, u, v = head_frame()
    path = [T + a * s for s, *_ in stations]
    radii = [(hw, fd, jd) for s, fd, jd, hw in stations]
    return tube(path, radii, P['HEAD_N'], cap0, cap1, phase=math.pi / P['HEAD_N'], p=2.2, tip1=tip1)


def head_surface(s, side):
    """point on the head surface at station s: side 'front' (forehead line) or (x sign, 'eye')"""
    T, a, u, v = head_frame()
    st = P['HEAD'] + P['MUZZLE']
    for (s0, f0, j0, w0), (s1, f1, j1, w1) in zip(st, st[1:]):
        if s0 <= s <= s1 and s1 > s0:
            t = (s - s0) / (s1 - s0); f = f0 + (f1 - f0) * t; w = w0 + (w1 - w0) * t
            return T + a * s, a, u, v, f, w
    s0, f0, j0, w0 = st[-1]
    return T + a * s, a, u, v, f0, w0


def build_head():
    hp = yz(*P['HEAD_PIVOT'])
    make('head', head_tube(P['HEAD'], 'point', 'flat'), 'Fur_Sorrel', hp, 'neck')
    make('muzzle', head_tube(P['MUZZLE'], 'flat', 'flat'), 'Fur_Cream', hp, 'head')
    # blaze: a thin cream strip down the forehead line to the muzzle
    b = P['BLAZE']; rings = []
    ns = 6
    for k in range(ns + 1):
        s = b['s0'] + (b['s1'] - b['s0']) * k / ns
        c, a, u, v, f, w = head_surface(s, 'front')
        ww = b['w0'] + (b['w1'] - b['w0']) * k / ns
        if k == 0:
            ww *= 0.5
        base = c + v * (f * 0.92)
        rings.append([base - u * ww, base + u * ww, base + u * ww + v * 0.035, base - u * ww + v * 0.035])
    make('blaze', loft(rings), 'Fur_Cream', hp, 'head')
    # eyes: big glossy button domes; nostrils: small dark ovals on the cream muzzle
    e = P['EYE']; vfs = []
    for sx in (1, -1):
        c, a, u, v, f, w = head_surface(e['s'], 'eye')
        pc = c + u * (sx * w * e['inset']) + v * e['f']
        vfs.append(dome(pc, (u * sx * 0.9 + v * 0.35).normalized(), a, e['r'], e['r'], e['bulge'], sx))
        n = P['NOSTRIL']
        c2, a2, u2, v2, f2, w2 = head_surface(n['s'], 'front')
        pn = c2 + v2 * (f2 * 0.80 + n['f'] * 0.0) + u2 * (sx * w2 * n['x'])
        nn = (v2 * 0.75 + u2 * sx * 0.65).normalized()
        vfs.append(dome(pn, nn, a2, n['r'], n['r'] * 0.6, 0.012, sx))
    make('eyes', merge(*vfs), 'Horn_Eye', hp, 'head')
    # rosy cheeks (new for the charming style): flat round blush patches below and behind the eyes
    ch = P['CHEEK']; vfs = []
    for sx in (1, -1):
        c, a, u, v, f, w = head_surface(ch['s'], 'eye')
        pc = c + u * (sx * w * 0.93) + v * ch['f']
        vfs.append(dome(pc, (u * sx).normalized(), a, ch['r'] * 1.15, ch['r'], ch['bulge'], sx, n=10))
    make('cheeks', merge(*vfs), 'Fur_Blush', hp, 'head')
    # ears: four-sided pyramids with a cupped front
    E = P['EAR']; T, a, u, v = head_frame()
    for sx, nm in ((1, 'ear_l'), (-1, 'ear_r')):
        base = T + a * E['s'] + u * (sx * E['x']) - v * 0.01
        up = (Vector((0, 0, 1)) + u * (sx * E['splay'][0 if sx > 0 else 1]) - Vector((0, 1, 0)) * E['fwd']).normalized()
        side = u * sx
        fw = up.cross(side).normalized()
        rg = [base + side * E['w'] + fw * E['d'] * 0.3, base + fw * E['d'], base - side * E['w'] * 0.6 + fw * E['d'] * 0.3,
              base - fw * E['d'] * 0.8]
        mid = [p + up * E['h'] * 0.40 + (p - base) * 0.25 for p in rg]          # plump, rounded leaf-shaped ears
        hi = [p + up * E['h'] * 0.75 + (p - base) * -0.15 for p in rg]
        if sx < 0:
            rg, mid, hi = rg[::-1], mid[::-1], hi[::-1]
        make(nm, loft([rg, mid, hi], 'flat', 'point', apex1=base + up * E['h']), 'Fur_Sorrel', base, 'head')
    # forelock: three locks from between the ears falling forward over the forehead
    vfs = []
    fw = P['FORELOCK_W']
    for i, (ox, L) in enumerate(P['FORELOCK']):          # a big swoop over the forehead toward the far side (+X)
        p0 = T + a * 0.03 + v * 0.10 + u * (ox - 0.05)
        pts = [p0, p0 + a * L * 0.35 + v * 0.13 + u * (0.06 + ox * 0.3), p0 + a * L * 0.7 + v * 0.13 + u * (0.13 + ox * 0.4),
               p0 + a * L + v * 0.10 + u * (0.20 + ox * 0.4)]
        vfs.append(lock(pts, [fw, fw * 0.8, fw * 0.5], u, 0.06))
    make('forelock', merge(*vfs), 'Hair_Dark', hp, 'head')


def leg_tube(stations, x, y0, cap0='flat', cap1='flat'):
    path = [Vector((x, y0 + dy, z)) for z, dy, rx, ry in stations]
    radii = [(rx, ry, ry) for z, dy, rx, ry in stations]
    return tube(path, radii, P['LEG_N'], cap0, cap1, phase=math.pi / P['LEG_N'], p=2.3)


def build_legs():
    for leg in LEGS:
        front = leg[0] == 'f'; sx = 1 if leg[1] == 'l' else -1
        x = sx * P['LEG_X']
        y0 = (P['FRONT_Y'] if front else P['HIND_Y'])[0 if sx < 0 else 1]
        up, lo = (P['FRONT_UP'], P['FRONT_LO']) if front else (P['HIND_UP'], P['HIND_LO'])
        top = up[0]
        nm = f'leg_{leg}'
        make(f'{nm}_upper', leg_tube(up, x, y0), 'Fur_Sorrel', Vector((x, y0 + top[1], top[0] - (0.1 if front else 0.1))), 'body')
        make(f'{nm}_lower', leg_tube(lo, x, y0), 'Fur_Sorrel', Vector((x, y0 + lo[0][1], lo[0][0])), f'{nm}_upper')
        fet = Vector((x, y0, P['FETLOCK']))
        make(f'{nm}_hoof', leg_tube(P['HOOF'], x, y0), 'Horn_Hoof', fet, f'{nm}_lower')
        make(f'{nm}_sock', leg_tube(P['SOCK'], x, y0), 'Fur_Sorrel', fet, f'{nm}_hoof')   # the charming hero has no white socks


def build_tail():
    nt = len(P['TAIL'])
    pts = [yz(y, z, P['TAIL_SWISH'] * (i / (nt - 1)) ** 1.5) for i, (y, z, rx, rv) in enumerate(P['TAIL'])]
    radii = [(rx, rv, rv) for y, z, rx, rv in P['TAIL']]
    vf = tube(pts, radii, P['TAIL_N'], 'flat', 'point', phase=0.3, tip1=0.10)
    # a few jagged strands at the end
    end = pts[-2]; vfs = [vf]
    for ox, oy, L in ((0.06, 0.03, 0.16), (-0.05, -0.02, 0.13), (0.01, 0.07, 0.11)):     # a curled, flicked tip
        p0 = end + Vector((ox, oy, 0.05))
        vfs.append(lock([p0, p0 + Vector((ox * 0.3, oy * 0.6 + 0.03, -L * 0.6)), p0 + Vector((ox * 0.6, oy + 0.08, -L))], [0.10, 0.06], Vector((1, 0, 0)), 0.07))
    make('tail', merge(*vfs), 'Hair_Dark', pts[0], 'body')


# ------------------------------------------------------------------ poses
POSES = {
    'idle': {'neck': (0, 0, -4), 'head': (0, -8, -3)},                 # head turned a touch to the near side and cocked
    'feeding': {'neck': ('solve', 0), 'head_world': 12.0, 'head_roll': -5},   # head ends 12 deg more vertical than in idle
    'rest': {
        'drop': 0.35,
        'leg_fl_upper': (-80, -10, 0), 'leg_fl_lower': (150, 0, 0), 'leg_fl_hoof': (20, 0, 0),
        'leg_fr_upper': (-76, 10, 0), 'leg_fr_lower': (146, 0, 0), 'leg_fr_hoof': (20, 0, 0),
        'leg_hl_upper': (-84, -24, 0), 'leg_hl_lower': (150, 0, 0), 'leg_hl_hoof': (12, 0, 0),
        'leg_hr_upper': (-82, 24, 0), 'leg_hr_lower': (148, 0, 0), 'leg_hr_hoof': (12, 0, 0),
        'tail': (42, 0, 40), 'neck': (6, 0, 0), 'head': (-10, -9, 0),
    },
}


def lowest(names):
    bpy.context.view_layer.update()
    z = 1e9
    for nm in names:
        ob = OBJ[nm]; M = ob.matrix_world
        for vtx in ob.data.vertices:
            z = min(z, (M @ vtx.co).z)
    return z


def pose(state):
    for ob in OBJ.values():
        ob.rotation_euler = (0, 0, 0)
    body = OBJ['body']; body.location = Vector(body['pivot']) + Vector(SHIFT)
    spec = POSES[state]
    for nm, rot in spec.items():
        if nm in OBJ and not isinstance(rot, (int, float)) and rot[0] != 'solve':
            OBJ[nm].rotation_euler = Euler([math.radians(r) for r in rot])
    if 'drop' in spec:
        body.location.z -= spec['drop']
    if state == 'feeding':     # lower the neck until the muzzle touches the grass, head nodding back toward vertical
        lo_a, hi_a = 0.0, 150.0
        for _ in range(30):
            m = (lo_a + hi_a) / 2
            OBJ['neck'].rotation_euler = (math.radians(m), 0, 0)
            OBJ['head'].rotation_euler = (math.radians(spec['head_world'] - m), math.radians(spec.get('head_roll', 0)), 0)
            if lowest(['muzzle']) > 0.03:
                lo_a = m
            else:
                hi_a = m
        print(f'feeding: neck {hi_a:.1f} deg, head {spec["head_world"] - hi_a:.1f} deg')
    if state == 'rest':        # settle the barrel onto the ground; folded legs may press 3 cm into the grass
        rest = [n for n in OBJ if n != 'body']
        body.location.z -= min(lowest(['body']) - 0.02, lowest(rest) + 0.03)
    bpy.context.view_layer.update()


SHIFT = [0, 0, 0]


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); OBJ.clear(); RND.seed(11)
    build_body(); build_neck(); build_head(); build_legs(); build_tail()
    # centre the standing footprint on the origin
    bpy.context.view_layer.update()
    pts = [OBJ[n].matrix_world @ v.co for n in OBJ for v in OBJ[n].data.vertices]
    xs = [p.x for p in pts]; ys = [p.y for p in pts]; zs = [p.z for p in pts]
    SHIFT[:] = [-(min(xs) + max(xs)) / 2, -(min(ys) + max(ys)) / 2, -min(zs)]


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def tris():
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for ob in OBJ.values():
        m = ob.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); ob.evaluated_get(dg).to_mesh_clear()
    return n


def main():
    states = sys.argv[1:] or STATES
    build()
    for st in states:
        pose(st)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'idle':
            export(os.path.join(HERE, 'horse-charming.glb'))
    print('triangles', tris(), 'parts', len(OBJ))


if __name__ == '__main__':
    main()

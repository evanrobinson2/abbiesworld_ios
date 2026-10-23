"""chicken: a plump, upright farm hen. Warm white faceted body with layered feather plates, golden-tipped hackles
round the neck, a fanned golden tail, folded layered wings, a red comb, wattles and face, a yellow beak, an orange
eye with a dark pupil, and thin yellow-orange legs with three forward toes. Faceted low-poly, flat colours.

usage: python build.py           builds every pose, writes chicken.glb (idle) and variants/<pose>.glb
       python build.py feeding   builds and exports one pose only (idle also writes chicken.glb)

Z up, metres, origin at the footprint centre on the ground, head faces -Y (to_game.py turns it to +X).
Named parts with pivots: body (pivot at the hips) > neck > head > comb/wattle/beak/face/eyes, body > tail,
body > wing_l/wing_r, body > breast plates. The legs (leg_l, leg_r) are separate roots at the hip joints, so the body
can tip and sink without dragging the feet. Every pose is rotations of those parts plus a body drop (POSE).
All shape numbers live in P.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    HIP=(0.0, 0.005, 0.085),          # body pivot: between the hip joints
    # body rings along Y (front -Y to back +Y): (y, z bottom, z top, half width, widest point 0..1 up the ring)
    BODY=[(-0.120, 0.150, 0.244, 0.042, 0.42),
          (-0.104, 0.090, 0.280, 0.076, 0.36),
          (-0.068, 0.060, 0.292, 0.096, 0.32),
          (-0.020, 0.052, 0.288, 0.100, 0.33),
          (0.030, 0.056, 0.282, 0.096, 0.38),
          (0.070, 0.076, 0.280, 0.082, 0.46),
          (0.100, 0.108, 0.280, 0.060, 0.52),
          (0.120, 0.150, 0.276, 0.036, 0.56)],
    BODY_W=0.92,                     # scales every ring's half width (the sheet wants slimmer, the hero plumper)
    RING_N=12,
    # neck (hackle cone): (y, z centre, half width, half depth), shoulders up to behind the head
    NECK=[(-0.052, 0.232, 0.064, 0.056), (-0.072, 0.300, 0.054, 0.050), (-0.080, 0.330, 0.042, 0.040), (-0.084, 0.356, 0.028, 0.028)],
    NECK_PIVOT=(0.0, -0.060, 0.262),
    HEAD_C=(0.0, -0.086, 0.342), HEAD_R=(0.034, 0.039, 0.035),   # half sizes x, y, z
    BEAK=dict(base=(0.0, -0.120, 0.340), len=0.030, r=0.012, droop=14.0),
    COMB=dict(y0=-0.116, y1=-0.052, z=0.370, h=(0.020, 0.032, 0.036, 0.032, 0.022), t=0.016),
    WATTLE=dict(y=-0.112, z=0.304, rx=0.011, ry=0.014, rz=0.024, dx=0.010),
    EYE=dict(y=-0.094, z=0.348, r=0.0105, pupil=0.0055),
    LEG=dict(x=0.031, top=0.090, ankle=0.016, r=(0.010, 0.0075), toe=0.040, toe_w=0.008, spread=32.0, back=0.020),
    TAIL=dict(pivot=(0.0, 0.080, 0.245), n=7, len=(0.105, 0.135), w=0.062, up=(40.0, 82.0), fan=0.034),
    WING=dict(y0=-0.050, y1=0.095, a=(1.45, 2.35), lift=0.009, plates=3),
    JITTER=0.004,
)

COL = {  # sRGB, sampled from the hero
    'Feather_White': (242, 232, 210), 'Feather_Cream': (232, 214, 180), 'Feather_Gold': (236, 190, 104),
    'Skin_Red': (196, 50, 38), 'Horn_Yellow': (236, 184, 60), 'Skin_Yellow': (226, 158, 58),
    'Skin_EyeOrange': (222, 128, 30), 'Skin_EyeDark': (34, 22, 16),
}
POSES = ['idle', 'feeding', 'rest']

# pose = rotations (degrees, XYZ euler in the parent's frame) of named pivots; body 'drop' in metres;
# 'peck' = tip the head down until the beak tip reaches this height; legs: (rotation, location offset);
# while pecking the head slides out along the neck (the neck's top ring sits inside the head, so no gap opens)
POSE = {
    'idle': dict(),
    'feeding': dict(body=(48, 0, 0), neck=(48, 0, 0), tail=(-24, 0, 0), wing_l=(-6, 0, 0), wing_r=(-6, 0, 0),
                    head=(-12, 0, 0), peck=0.010),
    'rest': dict(drop=0.072, body=(-3, 0, 0), neck=(-6, 0, 0), head=(4, 0, 0), tail=(-10, 0, 0),
                 wing_l=(0, -4, 0), wing_r=(0, 4, 0), legs=((90, 0, 0), (0, 0.0, 0.070))),
}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85 if 'Eye' not in name else 0.5
        MATS[name] = m
    return MATS[name]


RNG = random.Random(11)


def jit(v, a=None):
    a = P['JITTER'] if a is None else a
    return Vector((v[0] + RNG.uniform(-a, a), v[1] + RNG.uniform(-a, a), v[2] + RNG.uniform(-a, a)))


def loft(bm, rings, cap0=True, cap1=True):
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vs, vs[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    if cap0:
        bm.faces.new(list(reversed(vs[0])))
    if cap1:
        bm.faces.new(vs[-1])
    return vs


def egg_ring(y, zb, zt, hw, wide, n, jitter=True):
    """section across the body: an egg, widest at `wide` of the height, flatter on top"""
    h = zt - zb; zc = zb + wide * h
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2          # start at the bottom
        s, c = math.sin(a), math.cos(a)
        z = zc + (s * (h - wide * h) if s > 0 else s * wide * h)
        x = c * hw * (1.0 - 0.40 * max(s, 0))
        p = Vector((x, y, z))
        pts.append(jit(p) if jitter else p)
    return pts


def ellipsoid(bm, c, r, nu=8, nv=5, jitter=True):
    c = Vector(c)
    rings = []
    for j in range(1, nv):
        t = math.pi * j / nv
        rings.append([c + Vector((r[0] * math.sin(t) * math.cos(2 * math.pi * i / nu), r[1] * math.sin(t) * math.sin(2 * math.pi * i / nu),
                                  -r[2] * math.cos(t))) for i in range(nu)])
    rings = [[jit(p) if jitter else p for p in rr] for rr in rings]
    vs = loft(bm, rings, False, False)
    bot = bm.verts.new(c - Vector((0, 0, r[2]))); top = bm.verts.new(c + Vector((0, 0, r[2])))
    for i in range(nu):
        bm.faces.new((bot, vs[0][(i + 1) % nu], vs[0][i]))
        bm.faces.new((top, vs[-1][i], vs[-1][(i + 1) % nu]))


def frustum(bm, p0, p1, r0, r1, n=6, cap0=True, cap1=True, sq=(1.0, 1.0), phase=0.0):
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    a = d.cross(Vector((0, 0, 1))).normalized() if abs(d.z) < 0.9 else Vector((1, 0, 0))
    b = d.cross(a).normalized()
    rings = []
    for p, r in ((p0, r0), (p1, r1)):
        rings.append([p + a * math.cos(2 * math.pi * i / n + phase) * r * sq[0] + b * math.sin(2 * math.pi * i / n + phase) * r * sq[1]
                      for i in range(n)])
    return loft(bm, rings, cap0, cap1)


def cone(bm, p0, p1, r0, n=4, phase=0.0, sq=(1.0, 1.0)):
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    a = d.cross(Vector((0, 0, 1))).normalized() if abs(d.z) < 0.9 else Vector((1, 0, 0))
    b = d.cross(a).normalized()
    ring = [bm.verts.new(p0 + a * math.cos(2 * math.pi * i / n + phase) * r0 * sq[0] + b * math.sin(2 * math.pi * i / n + phase) * r0 * sq[1])
            for i in range(n)]
    tip = bm.verts.new(p1)
    bm.faces.new(list(reversed(ring)))
    for i in range(n):
        bm.faces.new((ring[i], ring[(i + 1) % n], tip))


def plate(bm, root, along, side, length, width, thick=0.006, bend=0.0, tip=0.0):
    """a pointed feather plate: a flat kite from root along `along` with a raised midrib, `side` across it.
    The normal side (along x side) faces out. bend lifts the tip along the normal."""
    root, along, side = Vector(root), Vector(along).normalized(), Vector(side).normalized()
    nrm = along.cross(side).normalized()
    pts = [root, root + along * length * 0.42 + side * width / 2, root + along * length + nrm * bend + side * tip,
           root + along * length * 0.42 - side * width / 2]
    top = [bm.verts.new(p + nrm * (thick if i in (0, 2) else 0.0) + nrm * 0.0) for i, p in enumerate(pts)]
    mid = bm.verts.new(root + along * length * 0.45 + nrm * thick * 1.6 + nrm * bend * 0.3)
    bot = bm.verts.new(root + along * length * 0.45 - nrm * thick * 0.6 + nrm * bend * 0.3)
    for i in range(4):
        bm.faces.new((top[i], top[(i + 1) % 4], mid))
        bm.faces.new((top[(i + 1) % 4], top[i], bot))


OBJS, PIVOTS = {}, {}


def make(name, bm, material, pivot, parent=None):
    pivot = Vector(pivot)
    if bm.faces:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for v in bm.verts:
        v.co -= pivot
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob.rotation_mode = 'XYZ'
    if parent is not None:
        ob.parent = OBJS[parent]; ob.location = pivot - PIVOTS[parent]
    else:
        ob.location = pivot
    PIVOTS[name] = pivot; OBJS[name] = ob
    return ob


def body_surface(y, a):
    """point on the body at y (interpolated between rings) and angle a (0 = bottom, pi/2 = +X side, pi = top)"""
    B = P['BODY']
    for r0, r1 in zip(B, B[1:]):
        if r0[0] <= y <= r1[0]:
            f = (y - r0[0]) / (r1[0] - r0[0]); r = [r0[k] + (r1[k] - r0[k]) * f for k in range(1, 5)]; break
    else:
        r = list((B[0] if y < B[0][0] else B[-1])[1:])
    zb, zt, hw, wide = r; hw *= P['BODY_W']; h = zt - zb; zc = zb + wide * h
    s, c = -math.cos(a), math.sin(a)
    z = zc + (s * (h - wide * h) if s > 0 else s * wide * h)
    x = c * hw * (1.0 - 0.40 * max(s, 0))
    return Vector((x, y, z)), Vector((c, 0, s * 0.6)).normalized()


def surf(sx, y, a):
    p, n = body_surface(y, a)
    if sx < 0:
        p.x, n.x = -p.x, -n.x
    return p, n


def sheet(bm, outer, inner):
    """a closed slab from two grids of points (rows along the length, columns across)"""
    vo = [[bm.verts.new(p) for p in r] for r in outer]; vi = [[bm.verts.new(p) for p in r] for r in inner]
    R, C = len(outer), len(outer[0])
    for i in range(R - 1):
        for j in range(C - 1):
            bm.faces.new((vo[i][j], vo[i][j + 1], vo[i + 1][j + 1], vo[i + 1][j]))
            bm.faces.new((vi[i][j], vi[i + 1][j], vi[i + 1][j + 1], vi[i][j + 1]))
    ring = [(0, j) for j in range(C)] + [(i, C - 1) for i in range(1, R)] + [(R - 1, j) for j in range(C - 2, -1, -1)] + \
           [(i, 0) for i in range(R - 2, 0, -1)]
    for k in range(len(ring)):
        (i0, j0), (i1, j1) = ring[k], ring[(k + 1) % len(ring)]
        bm.faces.new((vo[i0][j0], vi[i0][j0], vi[i1][j1], vo[i1][j1]))


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); OBJS.clear(); PIVOTS.clear(); RNG.seed(11)

    # body: a faceted egg, deep breast in front, the back rising into the tail
    bm = bmesh.new()
    loft(bm, [egg_ring(y, zb, zt, hw * P['BODY_W'], w, P['RING_N']) for y, zb, zt, hw, w in P['BODY']])
    make('body', bm, 'Feather_White', P['HIP'])

    # layered feather plates over the breast and flanks: rows of overlapping shards pointing down and back
    bm = bmesh.new()
    rows = [(-0.104, (1.2, 1.6, 2.0, 2.4), 0.042, 0.042), (-0.075, (0.9, 1.3, 1.7, 2.1, 2.5), 0.046, 0.046),
            (-0.040, (1.0, 1.35), 0.046, 0.046), (-0.040, (4.93, 5.28), 0.046, 0.046)]
    for y, angs, L, W in rows:
        for a in angs:
            p, n = body_surface(y, a)
            if a > math.pi:   # -X side
                p, n = surf(-1, y, 2 * math.pi - a)
            down = Vector((0, 0.35, -1))
            down = (down - n * n.dot(down)).normalized()       # lie on the surface
            side = n.cross(down).normalized()
            plate(bm, p + n * 0.002, down, side, L, W, thick=0.004, bend=0.004)
    make('breast_plates', bm, 'Feather_White', P['HIP'], 'body')

    # wings: a folded covert shell hugging each flank, with layered flight plates trailing back over the rump
    Wg = P['WING']
    for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
        bm = bmesh.new()
        ys = [Wg['y0'] + (Wg['y1'] - Wg['y0']) * f for f in (0.0, 0.3, 0.6, 1.0)]
        bands = [(Wg['a'][0] + 0.25, Wg['a'][1] - 0.15), Wg['a'], (Wg['a'][0] + 0.05, Wg['a'][1] + 0.05), (Wg['a'][0] + 0.35, Wg['a'][1] - 0.05)]
        outer, inner = [], []
        for y, (a0, a1) in zip(ys, bands):
            ro, ri = [], []
            for k in range(4):
                p, n = surf(sx, y, a0 + (a1 - a0) * k / 3)
                bulge = math.sin(math.pi * k / 3) * 0.6 + 0.4
                ro.append(jit(p + n * (Wg['lift'] * bulge)), ); ri.append(p - n * 0.006)
            outer.append(ro); inner.append(ri)
        sheet(bm, outer, inner)
        p0, _ = surf(sx, ys[1], sum(Wg['a']) / 2)
        make(nm, bm, 'Feather_White', p0, 'body')
        bm = bmesh.new()
        for j in range(Wg['plates']):
            a = Wg['a'][0] + 0.10 + 0.28 * j
            r0, n0 = surf(sx, Wg['y1'] - 0.055, a); r1, n1 = surf(sx, Wg['y1'] + 0.030 - 0.008 * j, a + 0.16)
            r0 += n0 * (Wg['lift'] + 0.002); r1 += n1 * 0.012
            along = r1 - r0; side = n0.cross(along).normalized()
            plate(bm, r0, along, side, along.length, 0.036, thick=0.005, bend=0.004)
        make(nm + '_plates', bm, 'Feather_Cream', p0, nm)

    # tail: a fan of upright plates, white underlayer, golden top layer
    T = P['TAIL']; tp = Vector(T['pivot'])
    for layer, mname, k0 in (('tail_under', 'Feather_Cream', 0), ('tail', 'Feather_Gold', 1)):
        bm = bmesh.new()
        n = T['n'] - k0 * 2
        for i in range(n):
            f = i / (n - 1) if n > 1 else 0.5
            ang = math.radians(T['up'][0] + (T['up'][1] - T['up'][0]) * f) + (0.08 if k0 else 0)
            along = Vector((0, math.cos(ang), math.sin(ang)))
            x = (f - 0.5) * 2 * T['fan'] * (0.7 if k0 else 1.0)
            L = T['len'][0] + (T['len'][1] - T['len'][0]) * math.sin(math.pi * f) - k0 * 0.012
            plate(bm, tp + Vector((x, -0.025, -0.01 + 0.01 * k0)), along, Vector((1, 0, 0)), L, T['w'] * (0.9 if k0 else 1.0),
                  thick=0.006, bend=0.0, tip=x * 0.4)
        if layer == 'tail_under':
            make(layer, bm, mname, tp, 'body')
        else:
            make(layer, bm, mname, tp, 'tail_under')

    # neck: hackle cone, then a skirt of hackle plates over the shoulders with golden tips
    bm = bmesh.new()
    rings = []
    for y, zc, hw, hd in P['NECK']:
        rings.append([jit(Vector((hw * math.cos(2 * math.pi * i / 8), y + hd * math.sin(2 * math.pi * i / 8), zc))) for i in range(8)])
    loft(bm, rings, False, True)
    make('neck', bm, 'Feather_White', P['NECK_PIVOT'], 'body')
    bm = bmesh.new(); bt = bmesh.new()
    for ring_i, (zr, nn, L, R, ph) in enumerate([(0.318, 9, 0.048, 0.040, 0.0), (0.288, 11, 0.054, 0.050, 0.5)]):
        for i in range(nn):
            a = 2 * math.pi * (i + ph) / nn
            cx, cy = math.cos(a), math.sin(a)
            if cy < -0.75:
                continue        # leave the throat open under the wattles
            root = Vector((R * cx, -0.072 + R * 0.9 * cy, zr))
            outv = Vector((cx, cy * 0.9, 0)).normalized()
            down = (Vector((0, 0, -1)) + outv * (0.28 if ring_i else 0.18)).normalized()
            side = outv.cross(down).normalized()
            plate(bm, root + outv * 0.004, down, side, L, 0.030 + 0.004 * ring_i, thick=0.005, bend=0.005)
            if ring_i == 1 or cy > 0:   # the lower ring (and the back of the upper) is golden at the tips
                tipr = root + outv * 0.010 + down * L * 0.55
                plate(bt, tipr, down, side, L * 0.48, 0.022, thick=0.006, bend=0.006)
    make('hackles', bm, 'Feather_White', P['NECK_PIVOT'], 'neck')
    make('hackle_tips', bt, 'Feather_Gold', P['NECK_PIVOT'], 'neck')

    # head
    hc = Vector(P['HEAD_C'])
    bm = bmesh.new(); ellipsoid(bm, hc, P['HEAD_R'], nu=8, nv=5)
    make('head', bm, 'Feather_White', hc + Vector((0, 0.015, -0.015)), 'neck')
    # red bare face around the eyes
    bm = bmesh.new()
    for sx in (-1, 1):
        ellipsoid(bm, hc + Vector((sx * 0.024, P['EYE']['y'] - hc.y + 0.002, P['EYE']['z'] - hc.z - 0.008)), (0.017, 0.024, 0.024), nu=6, nv=3, jitter=False)
    make('face', bm, 'Skin_Red', hc, 'head')
    # eyes: orange iris, dark pupil
    E = P['EYE']; bm = bmesh.new(); bp = bmesh.new()
    for sx in (-1, 1):
        c = Vector((sx * 0.041, E['y'], E['z']))
        frustum(bm, c - Vector((sx * 0.006, 0, 0)), c + Vector((sx * 0.002, 0, 0)), E['r'], E['r'] * 0.9, n=6)
        frustum(bp, c + Vector((sx * 0.001, 0, 0)), c + Vector((sx * 0.0035, 0, 0)), E['pupil'], E['pupil'] * 0.8, n=5)
    make('eyes', bm, 'Skin_EyeOrange', hc, 'head')
    make('pupils', bp, 'Skin_EyeDark', hc, 'head')
    # beak: a stout four-sided cone, drooping a little
    Bk = P['BEAK']; b0 = Vector(Bk['base']); d = math.radians(Bk['droop'])
    bm = bmesh.new(); cone(bm, b0 + Vector((0, 0.008, 0)), b0 + Vector((0, -Bk['len'] * math.cos(d), -Bk['len'] * math.sin(d))), Bk['r'],
                           n=4, phase=math.pi / 4, sq=(0.85, 1.0))
    make('beak', bm, 'Horn_Yellow', b0, 'head')
    # comb: a row of upright blade spikes along the crown, tallest in the middle, on a low base blade
    C = P['COMB']; bm = bmesh.new(); nh = len(C['h']); seg = (C['y1'] - C['y0']) / nh
    for i, h in enumerate(C['h']):
        y = C['y0'] + seg * (i + 0.5); lean = (i - (nh - 1) / 2) * 0.002
        r = seg * 1.0
        frustum(bm, Vector((0, y, C['z'] - 0.016)), Vector((0, y + lean, C['z'] + h)), r, r * 0.5, n=6, sq=(C['t'] / 2 / r, 1.0))
    frustum(bm, Vector((0, C['y0'] + 0.004, C['z'] - 0.012)), Vector((0, C['y1'], C['z'] - 0.012)), C['t'] / 2, C['t'] / 2, n=4,
            phase=math.pi / 4, sq=(1.0, 2.2))
    make('comb', bm, 'Skin_Red', Vector((0, (C['y0'] + C['y1']) / 2, C['z'])), 'head')
    # wattles: two hanging lobes under the beak
    Wt = P['WATTLE']; bm = bmesh.new()
    for sx in (-1, 1):
        ellipsoid(bm, (sx * Wt['dx'], Wt['y'], Wt['z']), (Wt['rx'], Wt['ry'], Wt['rz']), nu=6, nv=4, jitter=True)
    make('wattle', bm, 'Skin_Red', Vector((0, Wt['y'], Wt['z'] + Wt['rz'])), 'head')

    # legs: thin shanks with three forward toes and a short back toe (roots, not parented to the body)
    L = P['LEG']
    for sx, nm in ((1, 'leg_l'), (-1, 'leg_r')):
        top = Vector((sx * L['x'], 0.0, L['top'])); ank = Vector((sx * L['x'], -0.004, L['ankle']))
        bm = bmesh.new()
        frustum(bm, top, ank, L['r'][0], L['r'][1], n=5)
        foot = Vector((ank.x, ank.y, 0.006))
        frustum(bm, ank, foot, L['r'][1], L['r'][1] * 1.1, n=5, cap0=False)
        for ang in (-L['spread'], 0.0, L['spread']):
            a = math.radians(ang)
            d = Vector((math.sin(a), -math.cos(a), 0)); tipp = foot + d * L['toe'] + Vector((0, 0, -0.004))
            cone(bm, foot + d * 0.004, tipp, L['toe_w'] * 0.6, n=3, phase=math.pi / 2, sq=(1.0, 0.7))
        cone(bm, foot, foot + Vector((0, L['back'], -0.003)), L['toe_w'] * 0.5, n=3, phase=math.pi / 2, sq=(1.0, 0.7))
        make(nm, bm, 'Skin_Yellow', top)


def lowest(ob):
    return min((ob.matrix_world @ v.co).z for v in ob.data.vertices)


def pose(name):
    q = POSE[name]
    for k, v in q.items():
        if k in OBJS:
            OBJS[k].rotation_euler = Euler([math.radians(a) for a in v], 'XYZ')
    if 'drop' in q:
        OBJS['body'].location.z -= q['drop']
    if 'legs' in q:
        rot, off = q['legs']
        for nm in ('leg_l', 'leg_r'):
            OBJS[nm].rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
            OBJS[nm].location += Vector(off) - Vector((0, 0, q.get('drop', 0)))
    bpy.context.view_layer.update()
    if 'peck' in q:          # the neck stretches: slide the head out along the neck until the beak tip reaches the ground
        hd = OBJS['head']; l0 = hd.location.copy()
        d = hd.parent.matrix_world.to_3x3().inverted() @ Vector((0, -0.35, -1)).normalized()
        for k in range(0, 80):
            hd.location = l0 + d * (0.002 * k); bpy.context.view_layer.update()
            if lowest(OBJS['beak']) <= q['peck']:
                break
        print('peck reach %.3f m' % (0.002 * k))
    # nothing may sink below the ground
    lo = min(lowest(o) for o in OBJS.values() if o.type == 'MESH')
    if lo < 0:
        for nm in ('body', 'leg_l', 'leg_r'):
            OBJS[nm].location.z -= lo
        bpy.context.view_layer.update()


def tri_count():
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return n


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    which = [a for a in sys.argv[1:] if a in POSES] or POSES
    for st in which:
        build(); pose(st)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'idle':
            export(os.path.join(HERE, 'chicken.glb'))
        print(f'{st}: triangles {tri_count()}')

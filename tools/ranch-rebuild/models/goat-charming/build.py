"""goat-charming: the storybook-toy goat (Ranch tile rebuild, charming style).

usage: python build.py            builds every pose, writes goat-charming.glb (idle) and variants/<pose>.glb
       python build.py feeding    builds and exports one pose only (idle also writes goat-charming.glb)

Same skeleton, conventions, part names and materials as models/goat (the normal goat), reshaped to the chibi hero:
a big round head carried right on the chest with a little cock and turn, floppy ears, chunky curled horns, a round
plush barrel ringed with soft fur puffs, short stubby legs in tan socks, an upright pom-pom tail, rosy cheeks.
Z up, metres, origin at the footprint centre on the ground, head towards -Y (to_game.py turns it to +X).
Shape numbers are in metres, as (y, z) side-view points (y < 0 is towards the head), in P at the top.
Parts are separate objects parented at their joints (body > neck > head > horns/ears/beard/nose/eyes/cheeks,
body > tail, body > leg upper > lower > hoof), so each pose is only joint rotations (POSE), plus the body drop/pitch.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'goat-charming'

P = dict(
    JIT=0.025,        # radial jitter of loft rings (soft, hand-moulded, not crumpled)
    # body loft: (y, centre z, half height, half width)  chest -> rump. A round plush barrel.
    BODY=[(-0.335, 0.47, 0.05, 0.06), (-0.315, 0.465, 0.13, 0.13), (-0.27, 0.46, 0.185, 0.18), (-0.18, 0.455, 0.215, 0.205),
          (-0.06, 0.45, 0.225, 0.215), (0.09, 0.45, 0.228, 0.218), (0.23, 0.455, 0.222, 0.21), (0.33, 0.465, 0.19, 0.185),
          (0.39, 0.475, 0.13, 0.135), (0.42, 0.48, 0.05, 0.06)],
    BODY_N=14,
    # neck: a short stub hidden between chest and head: (y, z, half depth, half width)
    NECK=[(-0.20, 0.54, 0.13, 0.12), (-0.25, 0.63, 0.12, 0.115), (-0.29, 0.71, 0.11, 0.11)],
    NECK_N=10,
    NECK_PIVOT=(-0.20, 0.54),
    # head loft: (y, z, half height, half width)  poll -> nose tip. Big and round, a short muzzle.
    HEAD=[(-0.140, 0.860, 0.07, 0.07), (-0.170, 0.860, 0.195, 0.180), (-0.235, 0.855, 0.255, 0.235),
          (-0.330, 0.845, 0.275, 0.255), (-0.425, 0.825, 0.258, 0.240), (-0.500, 0.795, 0.205, 0.195),
          (-0.555, 0.772, 0.140, 0.142), (-0.585, 0.760, 0.080, 0.090), (-0.595, 0.757, 0.020, 0.030)],
    HEAD_N=12,
    HEAD_PIVOT=(-0.28, 0.70),
    HEAD_TILT=(9.0, 10.0),             # roll (deg, head cocked towards +X) and turn (deg, face turned to +X): the charm
    EYE=(-0.485, 0.875, 0.038),         # y, z, radius: big round eyes (|X| is found on the head surface)
    CHEEK=(-0.510, 0.770, 0.042),
    NOSE=(-0.592, 0.778),
    # horns: polyline (y, z) from the crown, |X| at base and tip, radius at base and tip
    HORN=[(-0.275, 1.070), (-0.266, 1.125), (-0.238, 1.170), (-0.192, 1.192), (-0.142, 1.185), (-0.114, 1.162)],
    HORN_X=(0.085, 0.135), HORN_R=(0.046, 0.015),
    # ears: root (y, z, |X|), tip (|X|, z, y back), half width: long floppy ears hanging out and down
    EAR=(-0.310, 0.935, 0.205), EAR_TIP=(0.265, 0.640, -0.285), EAR_W=0.086,
    # beard: chin (y, z), tip (y, z), half width
    BEARD=((-0.500, 0.630), (-0.480, 0.480), 0.055),
    # tail: root (y, z) and tip (y, z): an upright pom-pom
    TAIL=((0.400, 0.585), (0.480, 0.770)),
    # legs: (y, z, half width, half depth) rings: upper (fluffy cream), lower (tan sock)
    FRONT_X=0.115, HIND_X=0.120,
    FRONT_UP=[(-0.165, 0.330, 0.088, 0.092), (-0.170, 0.190, 0.086, 0.088), (-0.172, 0.130, 0.074, 0.076)],
    FRONT_LO=[(-0.172, 0.130, 0.070, 0.072), (-0.174, 0.085, 0.068, 0.070), (-0.176, 0.060, 0.070, 0.072)],
    HIND_UP=[(0.245, 0.330, 0.092, 0.098), (0.250, 0.190, 0.088, 0.090), (0.252, 0.130, 0.074, 0.076)],
    HIND_LO=[(0.252, 0.130, 0.070, 0.072), (0.254, 0.085, 0.068, 0.070), (0.256, 0.060, 0.070, 0.072)],
    LEG_N=8,
    HOOF_R=(0.070, 0.080),
    PUFFS_HEM=8, PUFF_R=0.064,         # soft fur puffs round the belly hem, per side
)

COL = {  # sRGB, from the hero
    'Fur_Cream': (243, 232, 212), 'Fur_Tan': (222, 178, 128), 'Horn_Tan': (196, 160, 118),
    'Horn_Hoof': (196, 140, 92), 'Skin_Pink': (232, 160, 142), 'Skin_Eye': (40, 34, 30),
    'Skin_Blush': (240, 170, 160),
}
POSES = ['idle', 'feeding', 'rest']
# joint rotations about X in degrees (+ swings a downward part backwards, an upward part forwards); '*' = L and R
POSE = {
    'idle': {},
    # goats kneel on their front knees to graze; a chibi with a short neck has to, to reach the grass
    'feeding': {'face': 80.0, 'muzzle_z': 0.03,
                'rx': {'front*u': -10.0, 'front*l': 100.0, 'tail': -15.0, 'ear1': 15.0, 'ear-1': 15.0}},
    'rest': {'belly_z': 0.04,
             'rx': {'front*u': -70.0, 'front*l': 150.0, 'front*h': 10.0,
                    'hind*u': -85.0, 'hind*l': 165.0, 'hind*h': 10.0,
                    'neck': -6.0, 'head': 8.0, 'tail': 15.0}},
}


def V(y, z, x=0.0):
    return Vector((x, y, z))


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[lin(c) for c in COL[name]], 1)
        b.inputs['Roughness'].default_value = 0.85
        MATS[name] = m
    return MATS[name]


RNG = random.Random(7)


def ring(c, t, a, b, n, jit=0.0, phase=0.0, side=None):
    """n points round centre c, in the plane normal to t; a along the 'up' direction, b along X."""
    t = t.normalized()
    side = side or Vector((1, 0, 0))
    u = side.cross(t).normalized()
    if u.z < 0:
        u = -u
    w = t.cross(u).normalized()
    if w.x < 0:
        w = -w
    pts = []
    for i in range(n):
        ang = 2 * math.pi * i / n + phase
        r = 1.0 + (RNG.uniform(-jit, jit) if jit else 0.0)
        pts.append(c + u * (math.cos(ang) * a * r) + w * (math.sin(ang) * b * r))
    return pts


def loft(rings, cap0=True, cap1=True):
    verts, faces = [], []
    n = len(rings[0])
    for r in rings:
        verts += r
    for k in range(len(rings) - 1):
        for i in range(n):
            a, b = k * n + i, k * n + (i + 1) % n
            faces.append((a, b, b + n, a + n))
    if cap0:
        faces.append(tuple(reversed(range(n))))
    if cap1:
        faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n)))
    return verts, faces


def tangents(pts):
    out = []
    for i in range(len(pts)):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        out.append((b - a).normalized())
    return out


def puff(c, r, squash=(1.0, 1.0, 0.8), seg=6, rings_=4, rng=None):
    """a soft low-poly fur puff: a small squashed UV ball."""
    vs, fs = [], []
    j = (lambda: rng.uniform(0.9, 1.1)) if rng else (lambda: 1.0)
    vs.append(c + Vector((0, 0, -r * squash[2])))
    for k in range(1, rings_):
        th = math.pi * k / rings_
        for i in range(seg):
            ph = 2 * math.pi * i / seg + (k % 2) * math.pi / seg
            s = r * j()
            vs.append(c + Vector((math.sin(th) * math.cos(ph) * s * squash[0], math.sin(th) * math.sin(ph) * s * squash[1],
                                  -math.cos(th) * s * squash[2])))
    vs.append(c + Vector((0, 0, r * squash[2])))
    top = len(vs) - 1
    for i in range(seg):
        fs.append((0, 1 + (i + 1) % seg, 1 + i))
    for k in range(rings_ - 2):
        a0, a1 = 1 + k * seg, 1 + (k + 1) * seg
        for i in range(seg):
            fs.append((a0 + i, a0 + (i + 1) % seg, a1 + (i + 1) % seg, a1 + i))
    b0 = 1 + (rings_ - 2) * seg
    for i in range(seg):
        fs.append((b0 + i, b0 + (i + 1) % seg, top))
    return vs, fs


class Part:
    def __init__(self, name, material):
        self.name, self.material, self.v, self.f = name, material, [], []

    def add(self, verts, faces):
        o = len(self.v); self.v += [Vector(p) for p in verts]; self.f += [tuple(i + o for i in fc) for fc in faces]
        return self

    def make(self, pivot, parent=None, xf=None):
        """xf: a function applied to every vertex and the pivot (the head tilt)."""
        if xf:
            self.v = [xf(p) for p in self.v]; pivot = xf(pivot)
        me = bpy.data.meshes.new(self.name)
        bm = bmesh.new()
        bv = [bm.verts.new(p - pivot) for p in self.v]
        for fc in self.f:
            try:
                bm.faces.new([bv[i] for i in fc])
            except ValueError:
                pass
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = False
        me.materials.append(mat(self.material))
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        ob.location = pivot - (parent['pivot'] if parent else Vector())
        if parent:
            ob.parent = parent['ob']
        return dict(ob=ob, pivot=pivot)


def body_profile(y):
    """top z, bottom z, half width of the body at y (interpolated from P['BODY'])."""
    B = [(y_, zc + a, zc - a, hw) for y_, zc, a, hw in P['BODY']]
    y = min(max(y, B[0][0]), B[-1][0])
    for (y0, t0, b0, w0), (y1, t1, b1, w1) in zip(B, B[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0 or 1)
            return t0 + (t1 - t0) * k, b0 + (b1 - b0) * k, w0 + (w1 - w0) * k


def build_body():
    part = Part('body', 'Fur_Cream')
    rings = [ring(V(y, zc), Vector((0, 1, 0)), a, hw, P['BODY_N'], P['JIT'], phase=math.pi / P['BODY_N'])
             for y, zc, a, hw in P['BODY']]
    part.add(*loft(rings))
    rng = random.Random(11)
    # the plush hem: soft puffs ringing the lower flanks, belly and chest (the hero's fluffy skirt)
    n = P['PUFFS_HEM']
    for i in range(n):
        y = -0.24 + 0.58 * (i + 0.5) / n
        top, bot, hw = body_profile(y)
        for sx in (-1, 1):
            r = P['PUFF_R'] * rng.uniform(0.85, 1.15)
            c = Vector((sx * hw * 0.84, y + rng.uniform(-0.01, 0.01), bot + 0.075 + (0.025 if i % 2 else 0.0)))
            part.add(*puff(c, r, (0.75, 0.95, 1.35), rng=rng))     # hanging locks of the fluffy skirt
    for k, (y, z, x) in enumerate(((-0.300, 0.36, 0.0), (-0.290, 0.30, 0.07), (-0.290, 0.30, -0.07), (-0.27, 0.40, 0.10),
                                   (-0.27, 0.40, -0.10))):
        part.add(*puff(Vector((x, y, z)), P['PUFF_R'] * 1.05, (1.0, 0.85, 1.0), rng=rng))
    # a fluffy crest of puffs along the back and the rump
    for y in (-0.10, 0.07, 0.24):
        top, bot, hw = body_profile(y)
        part.add(*puff(Vector((rng.uniform(-0.02, 0.02), y, top - 0.03)), P['PUFF_R'] * 0.95, (1.2, 1.1, 0.7), rng=rng))
    return part


def build_neck():
    part = Part('neck', 'Fur_Cream')
    pts = [V(y, z) for y, z, a, b in P['NECK']]
    ts = tangents(pts)
    rings = [ring(p, t, a, b, P['NECK_N'], P['JIT'], phase=math.pi / P['NECK_N'])
             for p, t, (y, z, a, b) in zip(pts, ts, P['NECK'])]
    part.add(*loft(rings))
    return part


def build_head():
    part = Part('head', 'Fur_Cream')
    pts = [V(y, z) for y, z, a, b in P['HEAD']]
    ts = tangents(pts)
    rings = [ring(p, t, a, b, P['HEAD_N'], P['JIT'] * 0.6, phase=math.pi / P['HEAD_N'])
             for p, t, (y, z, a, b) in zip(pts, ts, P['HEAD'])]
    part.add(*loft(rings))
    # a soft forelock puff between the horns
    part.add(*puff(V(-0.315, 1.105), 0.058, (1.3, 1.0, 0.7), rng=random.Random(3)))
    return part


def build_nose():
    part = Part('nose', 'Skin_Pink')
    c = V(*P['NOSE'])
    # a rounded pink triangle (wider on top) on the muzzle tip
    t = Vector((0, -1, 0.1))
    part.add(*loft([ring(c + Vector((0, 0.020, 0)), t, 0.026, 0.036, 6, phase=math.pi / 2),
                    ring(c + Vector((0, -0.008, 0)), t, 0.020, 0.028, 6, phase=math.pi / 2)]))
    return part


def disc(c, d, r, depth, n=8):
    d = d.normalized()
    return loft([ring(c - d * depth, d, r, r, n), ring(c + d * depth * 0.5, d, r * 0.92, r * 0.92, n),
                 ring(c + d * depth, d, r * 0.6, r * 0.6, n)])


def head_x(y, z):
    """|X| of the head surface at (y, z), from the head loft's ellipses."""
    H = P['HEAD']
    for (y0, z0, a0, b0), (y1, z1, a1, b1) in zip(H, H[1:]):
        if y1 <= y <= y0:
            k = (y - y0) / (y1 - y0)
            zc, a, b = z0 + (z1 - z0) * k, a0 + (a1 - a0) * k, b0 + (b1 - b0) * k
            return b * math.sqrt(max(0.0, 1 - ((z - zc) / a) ** 2))
    return 0.0


def face_spot(key, sx):
    y, z, r = P[key]
    return V(y, z, sx * (head_x(y, z) - 0.004)), r


def build_eye(sx):
    part = Part(f'eye_{"L" if sx > 0 else "R"}', 'Skin_Eye')
    c, r = face_spot('EYE', sx)
    part.add(*disc(c, Vector((sx, -0.75, 0.1)), r, 0.014))
    return part


def build_cheek(sx):
    part = Part(f'cheek_{"L" if sx > 0 else "R"}', 'Skin_Blush')
    c, r = face_spot('CHEEK', sx)
    part.add(*disc(c, Vector((sx, -0.9, -0.1)), r, 0.008))
    return part


def build_horn(sx):
    part = Part(f'horn_{"L" if sx > 0 else "R"}', 'Horn_Tan')
    n = len(P['HORN']); x0, x1 = P['HORN_X']; r0, r1 = P['HORN_R']
    pts = [V(y, z, sx * (x0 + (x1 - x0) * (i / (n - 1)) ** 1.5)) for i, (y, z) in enumerate(P['HORN'])]
    ts = tangents(pts)
    rings = [ring(p, t, r0 + (r1 - r0) * (i / (n - 1)) ** 1.3, (r0 + (r1 - r0) * (i / (n - 1)) ** 1.3) * 0.85, 7)
             for i, (p, t) in enumerate(zip(pts, ts))]
    part.add(*loft(rings))
    return part, pts[0]


def build_ear(sx):
    """a long soft floppy ear hanging out and down; the pink inner plate is a child object."""
    y, z, ex = P['EAR']; tx, tz, ty = P['EAR_TIP']; w = P['EAR_W']
    root = V(y, z, sx * ex)
    tip = V(ty, tz, sx * tx)
    ax = (tip - root).normalized()
    fw = Vector((sx * 0.55, -1, 0)).normalized()   # the ear's broad (pink) face looks forward and a little out
    side = ax.cross(fw).normalized()
    th = 0.022
    outer = Part(f'ear_{"L" if sx > 0 else "R"}', 'Fur_Cream')
    prof = [(0.0, 0.55), (0.25, 0.95), (0.55, 1.0), (0.82, 0.78), (1.0, 0.0)]   # along, half width factor
    L = (tip - root).length
    rings = []
    for k, f in prof:
        c = root + ax * (L * k)
        rings.append([c + side * (w * f), c + fw * (th * (0.3 + f)), c - side * (w * f), c - fw * (th * (0.3 + f))])
    outer.add(*loft(rings))
    inner = Part(f'ear_inner_{"L" if sx > 0 else "R"}', 'Skin_Pink')
    iv = []
    for k, f in prof[1:4]:
        c = root + ax * (L * k) + fw * (th * (0.3 + f) + 0.002)
        iv.append((c + side * (w * f * 0.55), c - side * (w * f * 0.55)))
    tipc = root + ax * (L * 0.93) + fw * (th * 0.6)
    vs = [p for pr in iv for p in pr] + [tipc]
    inner.add(vs, [(0, 1, 3, 2), (2, 3, 5, 4), (4, 5, 6)])
    return outer, inner, root


def build_beard():
    part = Part('beard', 'Fur_Cream')
    (y0, z0), (y1, z1), hw = P['BEARD']
    a, b = V(y0, z0), V(y1, z1)
    r0 = ring(a, b - a, 0.040, hw, 6)
    r1 = ring(a.lerp(b, 0.55), b - a, 0.035, hw * 0.9, 6, 0.1)
    part.add(*loft([r0, r1], cap1=False))
    base = len(part.v) - 6; tipv = len(part.v); part.v.append(b)
    for i in range(6):
        part.f.append((base + i, base + (i + 1) % 6, tipv))
    rng = random.Random(9)
    for k in (-1, 1):     # two soft locks either side of the point
        part.add(*puff(a.lerp(b, 0.7) + Vector((k * hw * 0.6, 0.0, 0)), 0.03, (0.8, 0.8, 1.6), rng=rng))
    return part


def build_tail():
    part = Part('tail', 'Fur_Cream')
    (y0, z0), (y1, z1) = P['TAIL']
    a, b = V(y0, z0), V(y1, z1)
    rng = random.Random(13)
    r0 = ring(a, b - a, 0.045, 0.040, 6)
    r1 = ring(a.lerp(b, 0.45), b - a, 0.060, 0.055, 6, 0.1)
    part.add(*loft([r0, r1], cap1=False))
    base = len(part.v) - 6; tv = len(part.v); part.v.append(b)
    for i in range(6):
        part.f.append((base + i, base + (i + 1) % 6, tv))
    for k in range(3):     # the pom-pom tuft
        part.add(*puff(a.lerp(b, 0.55 + 0.15 * k) + Vector((rng.uniform(-0.02, 0.02), rng.uniform(-0.01, 0.02), 0)),
                       0.050 - 0.008 * k, (0.9, 0.9, 1.2), rng=rng))
    return part, a


def leg_loft(name, material, spec, sx, xoff, n=None):
    n = n or P['LEG_N']
    part = Part(name, material)
    pts = [V(y, z, sx * xoff) for y, z, a, b in spec]
    ts = tangents(pts)
    rings = [ring(p, t, b, a, n, P['JIT'], phase=math.pi / n) for p, t, (y, z, a, b) in zip(pts, ts, spec)]
    part.add(*loft(rings))
    return part, pts


def build_upper(name, spec, sx, xoff):
    """the fluffy cream thigh, with a cuff of fur puffs at its bottom (the hero's fluffy pants)."""
    part, pts = leg_loft(name, 'Fur_Cream', spec, sx, xoff)
    rng = random.Random(len(name) * 7 + (sx > 0))
    c = pts[-1] + Vector((0, 0, 0.02))
    for i in range(4):
        ang = 2 * math.pi * (i + 0.5) / 4 + rng.uniform(-0.2, 0.2)
        part.add(*puff(c + Vector((math.cos(ang) * 0.058, math.sin(ang) * 0.058, rng.uniform(-0.01, 0.01))), 0.036,
                       (1, 1, 0.8), seg=5, rings_=3, rng=rng))
    return part, pts


def build_hoof(name, top, sx):
    part = Part(name, 'Horn_Hoof')
    r0, r1 = P['HOOF_R']
    t = Vector((0, 0, 1))
    bot = Vector((top.x, top.y - 0.006, 0.0))
    ra = ring(top, t, r0, r0 * 0.95, 8, phase=math.pi / 8)
    rm = ring(top.lerp(bot, 0.6), t, r1, r1 * 0.95, 8, phase=math.pi / 8)
    rb = ring(bot, t, r1 * 1.02, r1 * 0.95, 8, phase=math.pi / 8)
    rb = [p + Vector((0, -0.010, 0)) if p.y < bot.y else p for p in rb]   # the toe sits forward
    part.add(*loft([ra, rm, rb]))
    return part


def tilt():
    """the head's cock and turn about its pivot, applied to the head and everything on it."""
    roll, turn = (math.radians(a) for a in P['HEAD_TILT'])
    piv = V(*P['HEAD_PIVOT'])
    R = Matrix.Rotation(turn, 3, 'Z') @ Matrix.Rotation(roll, 3, 'Y')
    return lambda p: piv + R @ (Vector(p) - piv)


def build():
    MATS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    J = {}
    tf = tilt()
    J['body'] = build_body().make(V(0.05, 0.45))
    J['neck'] = build_neck().make(V(*P['NECK_PIVOT']), J['body'])
    J['head'] = build_head().make(V(*P['HEAD_PIVOT']), J['neck'], tf)
    build_nose().make(V(*P['NOSE']), J['head'], tf)
    for sx in (-1, 1):
        build_eye(sx).make(face_spot('EYE', sx)[0], J['head'], tf)
        build_cheek(sx).make(face_spot('CHEEK', sx)[0], J['head'], tf)
        h, hp = build_horn(sx); h.make(hp, J['head'], tf)
        o, i, er = build_ear(sx); J['ear%d' % sx] = o.make(er, J['head'], tf); i.make(er, J['ear%d' % sx], tf)
    build_beard().make(V(*P['BEARD'][0]), J['head'], tf)
    t, tp = build_tail(); J['tail'] = t.make(tp, J['body'])
    for leg, up, lo, xo in (('front', 'FRONT_UP', 'FRONT_LO', P['FRONT_X']), ('hind', 'HIND_UP', 'HIND_LO', P['HIND_X'])):
        for sx in (-1, 1):
            s = 'L' if sx > 0 else 'R'
            u, upts = build_upper(f'leg_{leg}_{s}_upper', P[up], sx, xo)
            J[f'{leg}{s}u'] = u.make(upts[0], J['body'])
            l, lpts = leg_loft(f'leg_{leg}_{s}_lower', 'Fur_Tan', P[lo], sx, xo)
            J[f'{leg}{s}l'] = l.make(lpts[0], J[f'{leg}{s}u'])
            J[f'{leg}{s}h'] = build_hoof(f'leg_{leg}_{s}_hoof', lpts[-1], sx).make(lpts[-1], J[f'{leg}{s}l'])
    return J


def rx(j, deg):
    j['ob'].rotation_euler = Euler((math.radians(deg), 0, 0))


def world_minz(objs):
    bpy.context.view_layer.update()
    z = 9.0
    for ob in objs:
        for v in ob.data.vertices:
            z = min(z, (ob.matrix_world @ v.co).z)
    return z


def subtree(ob):
    out = [ob]
    for c in ob.children:
        out += subtree(c)
    return out


def pose(J, state):
    A = POSE[state]
    for k, deg in A.get('rx', {}).items():
        for s_ in ('LR' if k.startswith(('front', 'hind')) else ('',)):
            rx(J[k.replace('*', s_)] if '*' in k else J[k], deg)
    body = J['body']['ob']
    if state == 'feeding':
        # kneel: the front knees go to the ground and the body pitches nose-down about the hind hooves
        hind = [J[f'hind{s}h']['ob'] for s in 'LR']
        front = sum((subtree(J[f'front{s}u']['ob']) for s in 'LR'), [])
        z0 = body.location.z
        lo, hi = 0.0, 40.0
        for _ in range(25):
            m = (lo + hi) / 2
            body.rotation_euler = Euler((math.radians(m), 0, 0)); body.location.z = z0
            body.location.z -= world_minz(hind)
            if world_minz(front) > 0.0:
                lo = m
            else:
                hi = m
        body.rotation_euler = Euler((math.radians(lo), 0, 0)); body.location.z = z0
        body.location.z -= world_minz(hind)
        # the neck swings down until the muzzle reaches the grass; the head keeps its face pitch fixed
        heads = [o for o in subtree(J['head']['ob']) if not o.name.startswith(('beard', 'ear'))]
        lo2, hi2 = 0.0, 120.0
        for _ in range(30):
            m = (lo2 + hi2) / 2; rx(J['neck'], m); rx(J['head'], A['face'] - m - lo)
            if world_minz(heads) > A['muzzle_z']:
                lo2 = m
            else:
                hi2 = m
        rx(J['neck'], hi2); rx(J['head'], A['face'] - hi2 - lo)
        low = world_minz(subtree(body))
        if low < 0:
            body.location.z -= low
        print('feeding: body pitch %.1f deg, neck %.1f deg, muzzle z %.3f' % (lo, hi2, world_minz(heads)))
    elif state == 'rest':
        # lower the body until the belly is on the ground, then lift it if a folded leg would go under
        body.location.z -= world_minz([body]) - A['belly_z']
        low = world_minz(subtree(body))
        if low < 0:
            body.location.z -= low
    bpy.context.view_layer.update()


def tris():
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return n


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def main():
    states = [a for a in sys.argv[1:] if a in POSES] or POSES
    for s in states:
        J = build(); pose(J, s)
        print(f'{s}: {tris()} triangles')
        export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'idle':
            export(os.path.join(HERE, f'{NAME}.glb'))


if __name__ == '__main__':
    main()

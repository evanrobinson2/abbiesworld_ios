"""goat: a slim, alert cream farm goat in faceted low-poly (Ranch tile rebuild).

usage: python build.py            builds every pose, writes goat.glb (idle) and variants/<pose>.glb
       python build.py feeding    builds and exports one pose only (idle also writes goat.glb)

Z up, metres, origin at the footprint centre on the ground, head towards -Y (to_game.py turns it to +X).
The shape is drawn in the turnaround sheet's side-view pixels (2000 px wide display of turnaround.png, ground at
y=975) and converted with S px per metre, so a shape fix is a pixel edit read straight off the sheet.
Parts are separate objects parented at their joints (body > neck > head > horns/ears/beard/nose/eyes,
body > tail, body > leg upper > lower > hoof), so each pose is only joint rotations (POSES).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    S=673.0,          # sheet px per metre (withers at ~0.75 m)
    CX=1030.0,        # sheet x of the footprint centre
    GROUND=975.0,     # sheet y of the ground
    JIT=0.07,         # radial jitter of loft rings (the faceted, hand-cut look)
    # body loft: (sheet x, top y, bottom y, half width m)  chest -> rump
    BODY=[(795, 560, 640, 0.065), (804, 505, 690, 0.098), (842, 468, 735, 0.122), (900, 458, 758, 0.134),
          (985, 468, 765, 0.140), (1070, 488, 755, 0.142), (1145, 500, 738, 0.142), (1195, 503, 722, 0.140),
          (1228, 512, 685, 0.120), (1248, 532, 630, 0.080)],
    BODY_N=12,
    # neck loft: (sheet x, sheet y of the axis, half depth m, half width m)  base -> throat
    NECK=[(885, 560, 0.135, 0.100), (862, 480, 0.118, 0.086), (844, 400, 0.100, 0.074), (836, 330, 0.086, 0.066),
          (836, 280, 0.076, 0.062)],
    NECK_N=8,
    NECK_PIVOT=(905, 560),
    # head loft: (sheet x, sheet y of the axis, half height m, half width m)  poll -> nose tip
    HEAD=[(864, 262, 0.070, 0.062), (842, 254, 0.112, 0.078), (795, 262, 0.106, 0.082), (745, 288, 0.084, 0.064),
          (702, 312, 0.060, 0.048), (672, 322, 0.042, 0.038), (662, 324, 0.022, 0.024)],
    HEAD_N=8,
    HEAD_PIVOT=(845, 285),
    EYE=(772, 262, 0.068),            # sheet x, y, |X| m
    NOSE=(664, 316),
    # horns: polyline in sheet px from the poll, |X| at base and tip
    HORN=[(832, 215), (842, 185), (862, 163), (895, 152), (935, 152)],
    HORN_X=(0.032, 0.105), HORN_R=(0.024, 0.005),
    # ears: root (sheet x, y, |X|), tip (|X| m, drop m, back m), half width m
    EAR=(818, 240, 0.064), EAR_TIP=(0.225, -0.005, 0.030), EAR_W=0.040,
    # beard: chin (sheet x, y), tip (x, y), half width m
    BEARD=((722, 362), (702, 465), 0.040),
    # tail: root (x, y) and tip (x, y)
    TAIL=((1238, 535), (1308, 466)),
    # legs: (sheet x, sheet y, half width m, half depth m) rings: upper (to knee/hock), lower (to fetlock)
    FRONT_X=0.090, HIND_X=0.100,
    FRONT_UP=[(932, 640, 0.052, 0.080), (920, 745, 0.044, 0.054), (905, 812, 0.038, 0.040)],
    FRONT_LO=[(905, 812, 0.040, 0.042), (892, 868, 0.030, 0.032), (882, 925, 0.031, 0.033)],
    HIND_UP=[(1180, 600, 0.055, 0.092), (1195, 735, 0.046, 0.070), (1250, 830, 0.036, 0.040)],
    HIND_LO=[(1250, 830, 0.036, 0.042), (1230, 880, 0.029, 0.032), (1218, 928, 0.031, 0.033)],
    HOOF_H=0.075, HOOF_R=(0.034, 0.040),
    TUFTS_BELLY=8, TUFTS_CHEST=6, TUFT_LEN=0.040,
)

COL = {  # sRGB, from the hero and the sheet
    'Fur_Cream': (234, 222, 197), 'Fur_Tan': (200, 150, 96), 'Horn_Tan': (178, 148, 104),
    'Horn_Hoof': (88, 58, 38), 'Skin_Pink': (222, 146, 136), 'Skin_Eye': (34, 30, 28),
}
POSES = ['idle', 'feeding', 'rest']
# joint rotations about X in degrees (+ swings a downward part backwards, an upward part forwards); '*' = L and R
POSE = {
    'idle': {},
    'feeding': {'face': 95.0, 'muzzle_z': 0.03,
                'rx': {'front*u': -5.0, 'front*l': 5.0, 'tail': -12.0, 'ear1': 20.0, 'ear-1': 20.0}},
    'rest': {'belly_z': 0.05,
             'rx': {'front*u': -55.0, 'front*l': 150.0, 'front*h': 10.0,
                    'hind*u': -82.0, 'hind*l': 168.0, 'hind*h': 10.0,
                    'neck': -4.0, 'head': 6.0, 'tail': 12.0}},
}
S, CX, G = P['S'], P['CX'], P['GROUND']


def V(xp, yp, x=0.0):
    """sheet side-view pixel -> Blender point (head to -Y)."""
    return Vector((x, (xp - CX) / S, (G - yp) / S))


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


class Part:
    def __init__(self, name, material):
        self.name, self.material, self.v, self.f = name, material, [], []

    def add(self, verts, faces):
        o = len(self.v); self.v += [Vector(p) for p in verts]; self.f += [tuple(i + o for i in fc) for fc in faces]
        return self

    def make(self, pivot, parent=None):
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


def shard(base, d, length, width, rng):
    """a flat-sided tuft: 3-sided pyramid from a base on the surface along d."""
    d = d.normalized()
    a = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
    b = d.cross(a).normalized()
    w = width * rng.uniform(0.8, 1.2)
    p = [base + a * w, base + (b - a * 0.5) * w, base + (-b - a * 0.5) * w,
         base + d * length * rng.uniform(0.75, 1.25) + a * rng.uniform(-0.3, 0.3) * w]
    return p, [(0, 1, 2), (0, 3, 1), (1, 3, 2), (2, 3, 0)]


def body_profile(y):
    """top z, bottom z, half width of the body at Blender y (interpolated from P['BODY'])."""
    B = [((xp - CX) / S, (G - t) / S, (G - b) / S, hw) for xp, t, b, hw in P['BODY']]
    y = min(max(y, B[0][0]), B[-1][0])
    for (y0, t0, b0, w0), (y1, t1, b1, w1) in zip(B, B[1:]):
        if y0 <= y <= y1:
            k = (y - y0) / (y1 - y0 or 1)
            return t0 + (t1 - t0) * k, b0 + (b1 - b0) * k, w0 + (w1 - w0) * k


def build_body():
    part = Part('body', 'Fur_Cream')
    rings = []
    for xp, top, bot, hw in P['BODY']:
        c = V(xp, (top + bot) / 2); a = (bot - top) / 2 / S
        r = ring(c, Vector((0, 1, 0)), a, hw, P['BODY_N'], P['JIT'])
        # flatten the back a little (goats have a straight top line) and keep the spine ridge
        k = c.z + a * 0.8
        r = [p if p.z < k else Vector((p.x, p.y, k + (p.z - k) * 0.7)) for p in r]
        rings.append(r)
    # a jittered mid ring between each pair: more, smaller facets (the hero's crumpled-paper fur)
    dense = [rings[0]]
    for r0, r1 in zip(rings, rings[1:]):
        dense.append([p0.lerp(p1, 0.5) + (p0.lerp(p1, 0.5) - (sum(r0, Vector()) + sum(r1, Vector())) / (2 * len(r0)))
                      * RNG.uniform(0.0, P['JIT']) for p0, p1 in zip(r0, r1)])
        dense.append(r1)
    rings = dense
    part.add(*loft(rings))
    rng = random.Random(11)
    # shaggy belly fringe: shards hanging down along both lower flanks
    y0, y1 = V(850, 0).y, V(1190, 0).y
    for i in range(P['TUFTS_BELLY']):
        y = y0 + (y1 - y0) * (i + rng.uniform(0.1, 0.9)) / P['TUFTS_BELLY']
        top, bot, hw = body_profile(y)
        for sx in (-1, 1):
            base = Vector((sx * hw * rng.uniform(0.55, 0.8), y, bot + 0.04))
            part.add(*shard(base, Vector((sx * 0.8, rng.uniform(0.0, 0.5), -1)), P['TUFT_LEN'] * rng.uniform(0.7, 1.4), 0.04, rng))
    # chest ruff: shards pointing down and forward off the breast
    for i in range(P['TUFTS_CHEST']):
        k = (i + 0.5) / P['TUFTS_CHEST']
        yp = 560 + 170 * k
        top, bot, hw = body_profile(V(808 + 40 * k, 0).y)
        sx = (-1, 1)[i % 2] * rng.uniform(0.15, 0.7)
        base = V(812 + 30 * k, yp, sx * hw * 0.8)
        part.add(*shard(base, Vector((sx * 0.4, -0.9, -0.8)), P['TUFT_LEN'] * 0.9, 0.035, rng))
    # shoulder tufts (the sheet's front view has them at the elbows)
    for sx in (-1, 1):
        for yp, xp in ((690, 880), (720, 905)):
            top, bot, hw = body_profile(V(xp, 0).y)
            part.add(*shard(V(xp, yp, sx * hw * 0.92), Vector((sx * 0.8, -0.2, -0.7)), P['TUFT_LEN'] * 0.8, 0.03, rng))
    return part


def build_neck():
    part = Part('neck', 'Fur_Cream')
    pts = [V(x, y) for x, y, a, b in P['NECK']]
    ts = tangents(pts)
    rings = [ring(p, t, a, b, P['NECK_N'], P['JIT'] * 0.8, phase=math.pi / P['NECK_N'])
             for p, t, (x, y, a, b) in zip(pts, ts, P['NECK'])]
    part.add(*loft(rings))
    # the sheet's throat tufts and the crest at the withers
    rng = random.Random(5)
    for yp in (380, 430, 480):
        part.add(*shard(V(812 - (yp - 380) * 0.08, yp), Vector((0, -0.7, -1)), 0.05, 0.03, rng))
    part.add(*shard(V(930, 455), Vector((0, 1, 0.35)), 0.06, 0.03, rng))
    return part


def build_head():
    part = Part('head', 'Fur_Cream')
    pts = [V(x, y) for x, y, a, b in P['HEAD']]
    ts = tangents(pts)
    rings = []
    for p, t, (x, y, a, b) in zip(pts, ts, P['HEAD']):
        r = ring(p, t, a, b, P['HEAD_N'], P['JIT'] * 0.6, phase=math.pi / P['HEAD_N'])
        rings.append(r)
    part.add(*loft(rings))
    # forelock tuft between the horns
    rng = random.Random(3)
    part.add(*shard(V(828, 225), Vector((0, -0.5, 1)), 0.075, 0.035, rng))
    part.add(*shard(V(815, 230), Vector((0.2, -0.9, 0.8)), 0.06, 0.03, rng))
    return part


def build_nose():
    part = Part('nose', 'Skin_Pink')
    c = V(*P['NOSE'])
    pts = [c + Vector((0, 0.025, 0.0)), c + Vector((0, -0.006, 0))]
    part.add(*loft([ring(pts[0], Vector((0, -1, 0.15)), 0.026, 0.032, 6), ring(pts[1], Vector((0, -1, 0.15)), 0.02, 0.026, 6)]))
    return part


def build_eye(sx):
    part = Part(f'eye_{"L" if sx > 0 else "R"}', 'Skin_Eye')
    x, y, ex = P['EYE']; c = V(x, y, sx * ex)
    d = Vector((sx, -0.25, 0.1)).normalized()
    part.add(*loft([ring(c - d * 0.006, d, 0.014, 0.011, 5), ring(c + d * 0.006, d, 0.010, 0.008, 5)]))
    return part


def build_horn(sx):
    part = Part(f'horn_{"L" if sx > 0 else "R"}', 'Horn_Tan')
    n = len(P['HORN']); x0, x1 = P['HORN_X']; r0, r1 = P['HORN_R']
    pts = [V(x, y, sx * (x0 + (x1 - x0) * (i / (n - 1)) ** 1.5)) for i, (x, y) in enumerate(P['HORN'])]
    ts = tangents(pts)
    rings = [ring(p, t, r0 + (r1 - r0) * i / (n - 1), (r0 + (r1 - r0) * i / (n - 1)) * 0.8, 5)
             for i, (p, t) in enumerate(zip(pts, ts))]
    part.add(*loft(rings))
    return part, pts[0]


def build_ear(sx):
    """a flat leaf sticking out sideways; the pink inner plate is a child object."""
    xp, yp, ex = P['EAR']; tx, drop, back = P['EAR_TIP']; w = P['EAR_W']
    root = V(xp, yp, sx * ex)
    tip = root + Vector((sx * (tx - ex), back, -drop))
    mid = root.lerp(tip, 0.45)
    outer = Part(f'ear_{"L" if sx > 0 else "R"}', 'Fur_Cream')
    th = 0.012
    vs = [root + Vector((0, 0, w * 0.6)), mid + Vector((0, 0, w)), tip, mid + Vector((0, 0, -w)), root + Vector((0, 0, -w * 0.6)),
          mid + Vector((0, th * 2.5, 0))]
    # front face (y-) is the pink side: keep the cream shell slightly behind it
    outer.add(vs, [(0, 1, 5), (1, 2, 5), (2, 3, 5), (3, 4, 5), (4, 0, 5), (0, 4, 3, 2, 1)])
    inner = Part(f'ear_inner_{"L" if sx > 0 else "R"}', 'Skin_Pink')
    s = 0.72
    iv = [mid + (p - mid) * s + Vector((0, -0.004, 0)) for p in vs[:5]]
    inner.add(iv + [mid + Vector((0, -0.006, 0))], [(5, 1, 0), (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 0, 4)])
    return outer, inner, root


def build_beard():
    part = Part('beard', 'Fur_Tan')
    (x0, y0), (x1, y1), hw = P['BEARD']
    a, b = V(x0, y0), V(x1, y1)
    rng = random.Random(9)
    r0 = ring(a, b - a, 0.034, hw, 5)
    r1 = ring(a.lerp(b, 0.55), b - a, 0.030, hw * 0.85, 5, 0.15)
    part.add(*loft([r0, r1], cap1=False))
    base = len(part.v) - 5
    tipv = len(part.v)
    part.v.append(b)
    for i in range(5):
        part.f.append((base + i, base + (i + 1) % 5, tipv))
    for k in range(3):     # a few loose strands at the point
        part.add(*shard(a.lerp(b, 0.6) + Vector((rng.uniform(-1, 1) * hw * 0.6, 0.004, 0)), (b - a) + Vector((0, 0.02, 0)), 0.05, 0.012, rng))
    return part


def build_tail():
    part = Part('tail', 'Fur_Cream')
    (x0, y0), (x1, y1) = P['TAIL']
    a, b = V(x0, y0), V(x1, y1)
    rng = random.Random(13)
    r0 = ring(a, b - a, 0.026, 0.024, 5)
    r1 = ring(a.lerp(b, 0.5), b - a, 0.030, 0.026, 5, 0.1)
    part.add(*loft([r0, r1], cap1=False))
    base = len(part.v) - 5; tv = len(part.v); part.v.append(b)
    for i in range(5):
        part.f.append((base + i, base + (i + 1) % 5, tv))
    for i in range(5):     # the upright tuft: shards fanning up and back
        d = (b - a).normalized() + Vector((rng.uniform(-0.35, 0.35), rng.uniform(-0.3, 0.4), rng.uniform(-0.2, 0.3)))
        part.add(*shard(a.lerp(b, rng.uniform(0.35, 0.75)), d, 0.06, 0.02, rng))
    return part, a


def leg_loft(name, material, spec, sx, xoff, n=6):
    part = Part(name, material)
    pts = [V(x, y, sx * xoff) for x, y, a, b in spec]
    ts = tangents(pts)
    rings = [ring(p, t, b, a, n, P['JIT'] * 0.5, phase=math.pi / n) for p, t, (x, y, a, b) in zip(pts, ts, spec)]
    part.add(*loft(rings))
    return part, pts


def build_hoof(name, top, sx):
    part = Part(name, 'Horn_Hoof')
    r0, r1 = P['HOOF_R']
    t = Vector((0, 0, 1))
    bot = Vector((top.x, top.y - 0.006, 0.0))
    ra = ring(top, t, r0 * 1.05, r0 * 0.95, 6, phase=math.pi / 6)
    rb = ring(bot, t, r1 * 1.15, r1 * 0.95, 6, phase=math.pi / 6)
    rb = [p + Vector((0, -0.012, 0)) if p.y < bot.y else p for p in rb]   # the toe sits forward
    part.add(*loft([ra, rb]))
    return part


def build():
    MATS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    J = {}
    body_pivot = V(1040, 620)
    J['body'] = build_body().make(body_pivot)
    J['neck'] = build_neck().make(V(*P['NECK_PIVOT']), J['body'])
    J['head'] = build_head().make(V(*P['HEAD_PIVOT']), J['neck'])
    build_nose().make(V(*P['NOSE']), J['head'])
    for sx in (-1, 1):
        build_eye(sx).make(V(P['EYE'][0], P['EYE'][1], sx * P['EYE'][2]), J['head'])
        h, hp = build_horn(sx); h.make(hp, J['head'])
        o, i, er = build_ear(sx); J['ear%d' % sx] = o.make(er, J['head']); i.make(er, J['ear%d' % sx])
    build_beard().make(V(*P['BEARD'][0]), J['head'])
    t, tp = build_tail(); J['tail'] = t.make(tp, J['body'])
    for leg, up, lo, xo in (('front', 'FRONT_UP', 'FRONT_LO', P['FRONT_X']), ('hind', 'HIND_UP', 'HIND_LO', P['HIND_X'])):
        for sx in (-1, 1):
            s = 'L' if sx > 0 else 'R'
            u, upts = leg_loft(f'leg_{leg}_{s}_upper', 'Fur_Cream', P[up], sx, xo)
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
    if state == 'feeding':
        # the neck swings forward and down until the muzzle reaches the grass; the head keeps its face
        # pitch (neck + head angle) fixed, so it reads as a goat cropping grass, not a head folded under
        heads = [o for o in subtree(J['head']['ob']) if not o.name.startswith('beard')]
        lo, hi = 0.0, 170.0
        for _ in range(30):
            m = (lo + hi) / 2; rx(J['neck'], m); rx(J['head'], A['face'] - m)
            if world_minz(heads) > A['muzzle_z']:
                lo = m
            else:
                hi = m
        rx(J['neck'], hi); rx(J['head'], A['face'] - hi)
        print('feeding: neck %.1f deg, head %.1f deg, muzzle z %.3f' % (hi, A['face'] - hi, world_minz(heads)))
    elif state == 'rest':
        # lower the body until the belly is on the ground, then lift it if a folded leg would go under
        body = J['body']['ob']
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
            export(os.path.join(HERE, 'goat.glb'))


if __name__ == '__main__':
    main()

"""cow: a gentle, sturdy cream dairy cow with rust-brown patches, short golden horns, a pink muzzle and udder, and a
brass bell on a leather collar. Faceted low-poly, flat colours.

usage: python build.py           builds every pose, writes cow.glb (idle) and variants/<pose>.glb
       python build.py feeding   builds and exports one pose only (idle also writes cow.glb)

Z up, metres, origin at the footprint centre on the ground, head faces -Y (to_game.py turns it to +X).
The cow is built from named parts parented at their joints (body > legs upper > lower > hoof, body > neck > head >
horns/ears/muzzle, neck > collar > bell, body > tail), so each pose is only rotations of those parts (POSES).
All shape numbers live in P.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    # body rings: (y, z bottom, z top, half width, z of widest point as 0..1 of the height, top width factor)
    BODY=[(-0.70, 0.86, 1.18, 0.12, 0.45, 0.45),
          (-0.63, 0.70, 1.31, 0.21, 0.42, 0.45),
          (-0.48, 0.60, 1.39, 0.265, 0.40, 0.44),
          (-0.25, 0.54, 1.38, 0.30, 0.42, 0.52),
          (0.02, 0.51, 1.37, 0.315, 0.45, 0.62),
          (0.28, 0.55, 1.37, 0.305, 0.48, 0.66),
          (0.52, 0.66, 1.41, 0.29, 0.52, 0.72),
          (0.70, 0.76, 1.40, 0.265, 0.55, 0.74),
          (0.82, 0.88, 1.36, 0.21, 0.55, 0.78),
          (0.87, 0.98, 1.30, 0.13, 0.55, 0.7)],
    # neck rings (y, z bottom, z top, half width), from inside the shoulders to behind the head
    NECK=[(-0.42, 0.86, 1.36, 0.20), (-0.62, 0.92, 1.48, 0.17), (-0.80, 1.12, 1.62, 0.14), (-0.90, 1.32, 1.70, 0.125)],
    NECK_PIVOT=(0.0, -0.50, 1.16),
    HEAD_PIVOT=(0.0, -0.89, 1.71),   # the poll
    HEAD_SCALE=1.14,                 # the whole head (with ears, horns, muzzle) around the poll
    FACE_TILT=38.0,                  # face plane, degrees from vertical (nose forward)
    # head rings along the face axis: (s from the poll, half width, depth behind the face plane)
    HEAD=[(-0.06, 0.11, 0.20), (0.0, 0.135, 0.27), (0.17, 0.138, 0.28), (0.30, 0.115, 0.22), (0.40, 0.108, 0.18)],
    MUZZLE=[(0.36, 0.118, 0.205), (0.44, 0.135, 0.215), (0.52, 0.13, 0.19), (0.555, 0.10, 0.14)],
    EAR_S=-0.01, EAR_LEN=0.19, EAR_W=0.115, EAR_DROOP=6.0,
    HORN=dict(base=0.075, r0=0.044, r1=0.011, length=0.25, phi=(40.0, 100.0), fwd=0.03),   # arc from phi0 (out) to phi1 (up, tip leaning in)
    FRONT_LEG=dict(x=0.15, y=-0.40, top=0.98, knee=0.46, fet=0.12, r=(0.125, 0.074, 0.064, 0.055)),
    HIND_LEG=dict(x=0.155, y=0.56, top=1.08, hock=0.50, fet=0.12, r=(0.155, 0.075, 0.062, 0.055), hock_back=0.07),
    HOOF=dict(h=0.12, r0=0.064, r1=0.080),
    UDDER=dict(y=0.36, z=0.56, rx=0.15, ry=0.17, rz=0.12, teat=0.07),
    TAIL=dict(root=(0.0, 0.86, 1.31), pts=[(0, 0.91, 1.26), (0, 0.925, 1.08), (0, 0.925, 0.82), (0, 0.92, 0.60)], r=(0.03, 0.016)),
    COLLAR=dict(y=-0.83, w=0.08, t=0.035, tilt=-28.0, grow=0.022),
    BELL=dict(h=0.19, r_top=0.062, r_bot=0.098, rim=0.014),
    JITTER=0.006,
)

COL = {  # sRGB, sampled from the hero
    'Fur_Cream': (240, 222, 194), 'Fur_Brown': (160, 86, 60), 'Skin_Pink': (226, 150, 136), 'Skin_EarPink': (224, 160, 146),
    'Horn_Gold': (186, 146, 80), 'Horn_Hoof': (104, 56, 40), 'Cloth_Leather': (118, 60, 40), 'Metal_Brass': (184, 134, 52),
    'Skin_EyeDark': (40, 26, 20), 'Fur_TailTuft': (128, 70, 48),
}
POSES = ['idle', 'feeding', 'rest']

# pose = rotations (degrees, XYZ euler in the parent's frame) of the named pivots, plus a body drop
POSE = {
    'idle': dict(),
    'feeding': dict(head=(0, 0, -6), graze=0.06, tail=(0, 0, 8), leg_fl_upper=(-6, 0, 0), leg_fr_upper=(4, 0, 0)),
    'rest': dict(drop=0.45, tuck=0.14,          # body lowered onto the ground, udder tucked up between the folded legs
                 leg_fl_upper=(-28, 12, 0), leg_fl_lower=(118, 0, 0), leg_fl_hoof=(20, 0, 0),
                 leg_fr_upper=(-28, -12, 0), leg_fr_lower=(118, 0, 0), leg_fr_hoof=(20, 0, 0),
                 leg_hl_upper=(-8, 20, 0), leg_hl_lower=(-84, 0, 0), leg_hl_hoof=(30, 0, 0),
                 leg_hr_upper=(-8, -20, 0), leg_hr_lower=(-84, 0, 0), leg_hr_hoof=(30, 0, 0),
                 neck=(-6, 0, 0), head=(4, 0, 8), tail=(14, 0, 0)),
}

# brown patches: (part, side, centre a, centre b, radius a, radius b, seed); side +-1 = projected along -+X onto that
# flank (a=y, b=z), 'top' = projected down (a=x, b=y). The hero side (-X) carries the big shoulder and flank patches.
PATCHES = [
    ('body', -1, -0.30, 1.08, 0.23, 0.33, 1),    # big shoulder patch
    ('body', 'top', -0.12, -0.33, 0.13, 0.12, 2),  # it carries on over the withers
    ('body', -1, 0.42, 0.98, 0.24, 0.30, 3),     # big flank patch
    ('body', -1, 0.70, 1.22, 0.07, 0.06, 4),     # hip spot
    ('body', -1, -0.02, 0.66, 0.08, 0.05, 5),    # belly spot
    ('body', -1, 0.12, 1.26, 0.04, 0.04, 6),     # small spot
    ('body', 1, -0.22, 1.08, 0.15, 0.20, 7),
    ('body', 1, 0.36, 1.10, 0.21, 0.19, 8),
    ('body', 1, 0.64, 0.80, 0.08, 0.10, 9),
    ('body', 'top', 0.10, 0.62, 0.12, 0.12, 10),  # rump top
    ('body', 'top', -0.10, 0.20, 0.08, 0.07, 11),
]
HEAD_PATCHES = [  # on the head, in head-local coords: (side, s along face, lateral, radius s, radius lateral, seed)
    ('face', 0.15, -0.085, 0.09, 0.075, 21),     # around the right eye (hero)
    ('face', 0.00, 0.03, 0.06, 0.10, 22),        # brow / poll
]


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85 if 'Metal' not in name else 0.45
        if 'Metal' in name:
            b.inputs['Metallic'].default_value = 0.6
        MATS[name] = m
    return MATS[name]


RNG = random.Random(7)


def jit(v, a=None):
    a = P['JITTER'] if a is None else a
    return Vector((v[0] + RNG.uniform(-a, a), v[1] + RNG.uniform(-a, a), v[2] + RNG.uniform(-a, a)))


def loft(bm, rings, cap0=True, cap1=True):
    """rings: list of equal-length point lists. Quads between rings, n-gon caps."""
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


# half profile of the body section, u across (0..1 of half width), v up (0..1); bottom to top
BODY_HALF = [(0.36, 0.01), (0.66, 0.05), (0.87, 0.15), (0.98, 0.26), (1.00, 0.36), (0.98, 0.50), (0.91, 0.64), (0.78, 0.77), (0.62, 0.92)]


def body_ring(y, zb, zt, hw, wide, topw, jitter=True):
    h = zt - zb
    pts = [(0.0, 0.0)]
    for u, v in BODY_HALF:
        v2 = v * wide / 0.36 if v <= 0.36 else wide + (v - 0.36) / 0.64 * (1 - wide)   # move the widest point to `wide`
        uu = u if v < 0.85 else u * topw / 0.66
        pts.append((uu, min(v2, 0.99)))
    pts.append((topw * 0.42, 1.0))
    full = [(0.0, 0.0)] + [(u, v) for u, v in pts[1:]] + [(0.0, 1.0)] + [(-u, v) for u, v in reversed(pts[1:])]
    out = []
    for u, v in full:
        p = Vector((u * hw, y, zb + v * h))
        out.append(jit(p) if jitter else p)
    return out


def smooth_rings(rows):
    """adds a Catmull-Rom midpoint between each pair of section rows, so the barrel rounds off between them"""
    out = []
    for i in range(len(rows) - 1):
        p0, p1, p2, p3 = rows[max(i - 1, 0)], rows[i], rows[i + 1], rows[min(i + 2, len(rows) - 1)]
        out.append(p1)
        out.append(tuple(0.5625 * (b + c) - 0.0625 * (a + d) for a, b, c, d in zip(p0, p1, p2, p3)))
    return out + [rows[-1]]


def ellipse_ring(c, rx, rz, n, y_axis=True, phase=0.0):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n + phase
        out.append(Vector((c[0] + rx * math.cos(a), c[1], c[2] + rz * math.sin(a))))
    return out


def frustum(bm, p0, p1, r0, r1, n=6, cap0=True, cap1=True, sq=(1.0, 1.0), phase=0.0):
    """tapered prism from p0 to p1; sq squashes the section (x, y of the local frame)"""
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    a = d.cross(Vector((0, 0, 1))).normalized() if abs(d.z) < 0.9 else Vector((1, 0, 0))
    b = d.cross(a).normalized()
    rings = []
    for p, r in ((p0, r0), (p1, r1)):
        rings.append([p + a * math.cos(2 * math.pi * i / n + phase) * r * sq[0] + b * math.sin(2 * math.pi * i / n + phase) * r * sq[1]
                      for i in range(n)])
    return loft(bm, rings, cap0, cap1)


def tube(bm, pts, radii, n=6, cap=True):
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        a = d.cross(Vector((0, 0, 1))) if abs(d.z) < 0.95 else d.cross(Vector((1, 0, 0)))
        a.normalize(); b = d.cross(a).normalized()
        r = radii[i]
        rings.append([p + a * math.cos(2 * math.pi * k / n) * r + b * math.sin(2 * math.pi * k / n) * r for k in range(n)])
    return loft(bm, rings, cap, cap)


OBJS, PIVOTS = {}, {}


def make(name, bm, material, pivot, parent=None):
    """bm in world coordinates (rest of the build pose); the object's origin goes to the pivot"""
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
    PIVOTS[name] = pivot
    OBJS[name] = ob
    return ob


# ------------------------------------------------------------------ patches
def blob(seed, n=14):
    """an irregular, lobed outline (unit radius on average)"""
    r = random.Random(seed)
    ks = [r.uniform(0.55, 1.3) for _ in range(n)]
    for _ in range(2):                                       # a couple of bold lobes
        k = r.randrange(n); ks[k] *= 1.3; ks[(k + 1) % n] *= 1.15
    ks = [(ks[i - 1] + 3 * ks[i] + ks[(i + 1) % n]) / 5 for i in range(n)]   # soften
    return [(math.cos(2 * math.pi * i / n + seed) * ks[i], math.sin(2 * math.pi * i / n + seed) * ks[i]) for i in range(n)]


def project_patch(bvh, pts2d, to3d, direction, off=0.012):
    """pts2d: list of rings of 2D points (centre first). Each is placed at to3d(p) far outside and cast along direction."""
    out = []
    for ring in pts2d:
        rr = []
        for p in ring:
            o = to3d(p)
            hit = bvh.ray_cast(o, direction)
            k = 1.0
            while hit[0] is None and k > 0.3:                      # off the edge: pull toward the centre
                k -= 0.1; c = pts2d[0][0]
                o = to3d((c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k)); hit = bvh.ray_cast(o, direction)
            if hit[0] is None:
                return None
            rr.append(hit[0] + hit[1] * off)
        out.append(rr)
    return out


def patch_mesh(bm, rings3d):
    c = bm.verts.new(rings3d[0][0])
    rings = [[bm.verts.new(p) for p in r] for r in rings3d[1:]]
    n = len(rings[0])
    for i in range(n):
        bm.faces.new((c, rings[0][i], rings[0][(i + 1) % n]))
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], b[i], b[(i + 1) % n], a[(i + 1) % n]))


def patch_rings(ca, cb, ra, rb, seed):
    sh = blob(seed)
    return [[(ca, cb)]] + [[(ca + u * ra * k, cb + v * rb * k) for u, v in sh] for k in (0.35, 0.7, 1.0)]


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); OBJS.clear(); PIVOTS.clear(); RNG.seed(7)

    # body
    bm = bmesh.new()
    loft(bm, [body_ring(*r) for r in smooth_rings(P['BODY'])])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update(); bvh_body = BVHTree.FromBMesh(bm)
    make('body', bm, 'Fur_Cream', (0, 0, 0))

    # brown patches on the body
    bm = bmesh.new()
    for part, side, a, b, ra, rb, seed in PATCHES:
        rings = patch_rings(a, b, ra, rb, seed)
        if side == 'top':
            r3 = project_patch(bvh_body, rings, lambda p: Vector((p[0], p[1], 3.0)), Vector((0, 0, -1)))
        else:
            r3 = project_patch(bvh_body, rings, lambda p, s=side: Vector((s * 2.0, p[0], p[1])), Vector((-side, 0, 0)))
        if r3:
            patch_mesh(bm, r3)
    make('body_patches', bm, 'Fur_Brown', (0, 0, 0), 'body')

    # udder with four teats
    U = P['UDDER']; bm = bmesh.new()
    rings = []
    for k, (t, s) in enumerate([(-1.0, 0.35), (-0.75, 0.85), (-0.25, 1.0), (0.35, 0.9), (0.9, 0.45)]):
        rings.append([Vector((U['rx'] * s * math.cos(2 * math.pi * i / 8), U['y'] + U['ry'] * s * math.sin(2 * math.pi * i / 8), U['z'] - t * U['rz']))
                      for i in range(8)])
    loft(bm, rings)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p = Vector((sx * 0.065, U['y'] + sy * 0.07, U['z'] - U['rz'] * 0.7))
            frustum(bm, p, p - Vector((0, 0, U['teat'])), 0.022, 0.016, n=5, cap0=False)
    make('udder', bm, 'Skin_Pink', (0, U['y'], U['z']), 'body')

    # legs
    def leg(name, L, front, sx):
        x = sx * L['x']; y = L['y']; r = L['r']; H = P['HOOF']
        if front:
            top, joint, fet = Vector((x, y, L['top'])), Vector((x, y + 0.01, L['knee'])), Vector((x, y - 0.01, L['fet']))
        else:
            top, joint, fet = Vector((x, y, L['top'])), Vector((x, y + L['hock_back'], L['hock'])), Vector((x, y + 0.02, L['fet']))
        bm = bmesh.new()
        if front:
            frustum(bm, top + Vector((0, 0, 0.12)), joint, r[0], r[1], n=7, sq=(0.9, 1.1))
        else:   # the hind thigh is a wide, flat slab tapering to the hock
            mid = top.lerp(joint, 0.45) + Vector((0, -0.05, 0))
            tube(bm, [top + Vector((0, -0.02, 0.10)), mid, joint], [r[0], r[0] * 0.75, r[1]], n=7)
        make(f'{name}_upper', bm, 'Fur_Cream', top, 'body')
        bm = bmesh.new()
        frustum(bm, joint + Vector((0, 0, 0.04)), fet, r[2], r[3], n=7)
        bm2 = bmesh.new()
        make(f'{name}_lower', bm, 'Fur_Cream', joint, f'{name}_upper')
        frustum(bm2, fet + Vector((0, 0, 0.0)), Vector((fet.x, fet.y - 0.015, 0.0)), H['r0'], H['r1'], n=6, sq=(1.0, 1.15))
        make(f'{name}_hoof', bm2, 'Horn_Hoof', fet, f'{name}_lower')

    for nm, sx in (('leg_fl', -1), ('leg_fr', 1)):     # fl = the cow's left? no: -X is the cow's right; names are by +-X
        leg(nm, P['FRONT_LEG'], True, sx)
    for nm, sx in (('leg_hl', -1), ('leg_hr', 1)):
        leg(nm, P['HIND_LEG'], False, sx)

    # tail
    T = P['TAIL']; bm = bmesh.new()
    pts = [T['root']] + T['pts']; nr = len(pts)
    tube(bm, pts, [T['r'][0] + (T['r'][1] - T['r'][0]) * i / (nr - 1) for i in range(nr)], n=5)
    make('tail', bm, 'Fur_Cream', T['root'], 'body')
    bm = bmesh.new(); e = Vector(T['pts'][-1])
    tube(bm, [e + Vector((0, 0, 0.06)), e + Vector((0, 0.01, -0.04)), e + Vector((0, 0.0, -0.14)), e + Vector((0, -0.005, -0.2))],
         [0.02, 0.045, 0.035, 0.005], n=6)
    make('tail_tuft', bm, 'Fur_TailTuft', e, 'tail')

    # neck
    bm = bmesh.new()
    rings = []
    for y, zb, zt, hw in P['NECK']:
        rings.append([jit(p) for p in body_ring(y, zb, zt, hw, 0.45, 0.62, jitter=False)])
        rings[-1] = [Vector((p.x, p.y + (p.z - (zb + zt) / 2) * -0.25, p.z)) for p in rings[-1]]   # lean the sections forward
    loft(bm, rings)
    make('neck', bm, 'Fur_Cream', P['NECK_PIVOT'], 'body')

    # collar and bell (children of the neck)
    C = P['COLLAR']; nk = P['NECK']
    yb = C['y']; i0 = 1; f = (yb - nk[1][0]) / (nk[2][0] - nk[1][0])
    zb = nk[1][1] + (nk[2][1] - nk[1][1]) * f; zt = nk[1][2] + (nk[2][2] - nk[1][2]) * f; hw = nk[1][3] + (nk[2][3] - nk[1][3]) * f
    cc = Vector((0, yb, (zb + zt) / 2)); rx = hw + C['grow']; rz = (zt - zb) / 2 + C['grow']
    tilt = Matrix.Rotation(math.radians(C['tilt']), 3, 'X')
    n = 16; bm = bmesh.new(); rings = []
    for dr, dy in ((0, -C['w'] / 2), (C['t'], -C['w'] / 2), (C['t'], C['w'] / 2), (0, C['w'] / 2)):
        rings.append([cc + tilt @ Vector(((rx + dr) * math.cos(2 * math.pi * i / n), dy, (rz + dr) * math.sin(2 * math.pi * i / n))) for i in range(n)])
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    for a, b in zip(vs, vs[1:] + vs[:1]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    make('collar', bm, 'Cloth_Leather', cc, 'neck')
    B = P['BELL']
    bottom = cc + tilt @ Vector((0, 0, -(rz + C['t'])))
    top = bottom + Vector((0, 0, -0.03))
    bm = bmesh.new()
    frustum(bm, top + Vector((0, 0, 0.035)), top - Vector((0, 0, 0.005)), 0.022, 0.022, n=6, sq=(0.35, 1.0))   # loop
    prof = [(0.0, B['r_top'] * 0.55), (0.02, B['r_top']), (B['h'] * 0.55, B['r_top'] * 1.12), (B['h'] * 0.9, B['r_bot']),
            (B['h'], B['r_bot'] + B['rim']), (B['h'] + 0.012, B['r_bot'] + B['rim'])]
    rings = [[top + Vector((r * math.cos(2 * math.pi * i / 8 + math.pi / 8), r * math.sin(2 * math.pi * i / 8 + math.pi / 8), -d)) for i in range(8)]
             for d, r in prof]
    rings.append([top + Vector((B['r_bot'] * 0.8 * math.cos(2 * math.pi * i / 8 + math.pi / 8), B['r_bot'] * 0.8 * math.sin(2 * math.pi * i / 8 + math.pi / 8), -(B['h'] + 0.012))) for i in range(8)])
    rings.append([top + Vector((B['r_bot'] * 0.7 * math.cos(2 * math.pi * i / 8 + math.pi / 8), B['r_bot'] * 0.7 * math.sin(2 * math.pi * i / 8 + math.pi / 8), -(B['h'] * 0.6))) for i in range(8)])
    loft(bm, rings, True, True)
    cl = top - Vector((0, 0, B['h'] + 0.03))     # clapper ball peeking out
    frustum(bm, cl + Vector((0, 0, 0.03)), cl - Vector((0, 0, 0.02)), 0.028, 0.02, n=6)
    make('bell', bm, 'Metal_Brass', top + Vector((0, 0, 0.03)), 'collar')

    # head, built along the face axis (tilted forward) from the poll
    hp = Vector(P['HEAD_PIVOT']); t = math.radians(P['FACE_TILT'])
    down = Vector((0, -math.sin(t), -math.cos(t)))      # along the face toward the nose
    back = Vector((0, math.cos(t), -math.sin(t)))       # from the face plane toward the throat
    def hring(s, hw, dp, n=10, bulge=1.0):
        c = hp + down * s
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n
            u, v = math.cos(a), math.sin(a)          # u across, v: +1 = face plane, -1 = throat side
            ww = hw * (1.0 if v < 0.3 else 0.86)
            pts.append(jit(c + Vector((u * ww, 0, 0)) + back * (dp / 2 - v * dp / 2 * bulge)))
        return pts
    bm = bmesh.new()
    loft(bm, [hring(*r) for r in P['HEAD']])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update(); bvh_head = BVHTree.FromBMesh(bm)
    make('head', bm, 'Fur_Cream', hp, 'neck')
    bm = bmesh.new()
    loft(bm, [hring(*r) for r in P['MUZZLE']])
    # nostrils: two dark dents on the nose front
    make('muzzle', bm, 'Skin_Pink', hp + down * 0.45, 'head')
    bm = bmesh.new()
    for sx in (-1, 1):   # nostrils, flush on the front of the nose
        c = hp + down * 0.552 + back * 0.075 + Vector((sx * 0.048, 0, 0))
        frustum(bm, c - down * 0.004, c + down * 0.006, 0.026, 0.02, n=6, sq=(0.8, 1.2))
    for sx in (-1, 1):   # eyes
        c = hp + down * 0.15 + back * 0.075 + Vector((sx * 0.13, 0, 0))
        frustum(bm, c - Vector((sx * 0.012, 0, 0)), c + Vector((sx * 0.012, 0, 0)), 0.026, 0.02, n=6)
    make('eyes', bm, 'Skin_EyeDark', hp + down * 0.2, 'head')

    # head patches
    bm = bmesh.new()
    for side, s, lat, rs, rl, seed in HEAD_PATCHES:
        rings = patch_rings(s, lat, rs, rl, seed)
        r3 = project_patch(bvh_head, rings, lambda p: hp + down * p[0] + Vector((p[1], 0, 0)) - back * 1.0, back.copy(), off=0.006)
        if r3:
            patch_mesh(bm, r3)
    make('head_patches', bm, 'Fur_Brown', hp, 'head')

    # ears: flat leaves sticking out sideways, cream outside, pink inside
    for sx, nm in ((-1, 'ear_r'), (1, 'ear_l')):
        base = hp + down * P['EAR_S'] + back * 0.10 + Vector((sx * 0.13, 0, 0))
        dr = math.radians(P['EAR_DROOP'])
        along = Vector((sx * math.cos(dr), 0, -math.sin(dr)))
        L, W = P['EAR_LEN'], P['EAR_W']
        up = Vector((0, 0, 1)); fwd = Vector((0, -1, 0))
        outline = [(0.0, 0.25), (0.35, 0.5), (0.7, 0.45), (1.0, 0.0), (0.7, -0.4), (0.35, -0.5), (0.0, -0.3)]
        bm = bmesh.new()
        front = [bm.verts.new(base + along * (a * L) + up * (b * W) + fwd * 0.01) for a, b in outline]
        backv = [bm.verts.new(base + along * (a * L) + up * (b * W) - fwd * 0.025 + up * 0.0) for a, b in outline]
        bm.faces.new(front); bm.faces.new(list(reversed(backv)))
        k = len(outline)
        for i in range(k):
            bm.faces.new((front[i], backv[i], backv[(i + 1) % k], front[(i + 1) % k]))
        make(nm, bm, 'Fur_Cream', base, 'head')
        bm = bmesh.new()
        inner = [bm.verts.new(base + along * (0.08 * L + a * L * 0.8) + up * (b * W * 0.7) + fwd * 0.016) for a, b in outline[1:-1]]
        bm.faces.new(inner)
        make(nm + '_inner', bm, 'Skin_EarPink', base, nm)

    # horns: out from the top of the skull, then curving up
    Hn = P['HORN']
    for sx, nm in ((-1, 'horn_r'), (1, 'horn_l')):
        b0 = hp + down * -0.03 + back * 0.12 + Vector((sx * Hn['base'], 0, 0))
        pts = [b0 - Vector((sx * 0.03, 0, 0.01))]; p = b0.copy(); ds = Hn['length'] / 5
        for k in range(1, 6):
            phi = math.radians(Hn['phi'][0] + (Hn['phi'][1] - Hn['phi'][0]) * (k - 0.5) / 5)
            p = p + Vector((sx * math.cos(phi) * ds, -Hn['fwd'] / 5, math.sin(phi) * ds)); pts.append(p.copy())
        radii = [Hn['r0']] + [Hn['r0'] + (Hn['r1'] - Hn['r0']) * k / 5 for k in range(1, 6)]
        bm = bmesh.new(); tube(bm, pts, radii, n=6)
        make(nm, bm, 'Horn_Gold', b0, 'head')


def pose(name):
    q = POSE[name]
    for k, v in q.items():
        if k in OBJS:
            OBJS[k].rotation_euler = Euler([math.radians(a) for a in v], 'XYZ')
    OBJS['head'].scale = (P['HEAD_SCALE'],) * 3
    if 'drop' in q:
        OBJS['body'].location.z -= q['drop']
    if 'tuck' in q:
        OBJS['udder'].location.z += q['tuck']
    bpy.context.view_layer.update()
    if 'graze' in q:          # lower the neck until the muzzle, with the face hanging near plumb, reaches the grass
        nk, hd = OBJS['neck'], OBJS['head']; e = hd.rotation_euler.copy()
        for na in range(40, 130, 2):
            nk.rotation_euler = Euler((math.radians(na), 0, 0), 'XYZ')
            best = None
            for a in range(0, -181, -4):
                hd.rotation_euler = Euler((math.radians(a), e.y, e.z), 'XYZ'); bpy.context.view_layer.update()
                z = lowest(OBJS['muzzle'])
                if best is None or z < best[0]:
                    best = (z, a)
            hd.rotation_euler = Euler((math.radians(best[1] + 12), e.y, e.z), 'XYZ')    # a little nose-forward of plumb
            bpy.context.view_layer.update()
            if lowest(OBJS['muzzle']) <= q['graze']:
                break
    # the bell hangs plumb from the collar's lowest point, whatever the neck does
    col = OBJS['collar']
    low = min((col.matrix_world @ v.co for v in col.data.vertices if abs(v.co.x) < 0.01), key=lambda p: p.z)
    OBJS['bell'].matrix_world = Matrix.Translation(low + Vector((0, 0, 0.012)))
    bpy.context.view_layer.update()


def lowest(ob):
    return min((ob.matrix_world @ v.co).z for v in ob.data.vertices)


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
    states = [a for a in sys.argv[1:] if a in POSES] or POSES
    for st in states:
        build(); pose(st)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'idle':
            export(os.path.join(HERE, 'cow.glb'))
        print(st, 'triangles', tri_count(), flush=True)

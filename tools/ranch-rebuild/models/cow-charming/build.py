"""cow-charming: the storybook-toy version of `cow`. A chubby plush cream cow with soft taupe patches, a big round
head with a huge pink muzzle, rosy cheeks and a little smile, short thick curved horns, big cupped ears, a cream
forelock bump, stubby legs with chunky hooves, and an oversized brass bell on a leather collar. Faceted low-poly,
flat colours.

usage: python build.py           builds every pose, writes cow-charming.glb (idle) and variants/<pose>.glb
       python build.py feeding   builds and exports one pose only (idle also writes cow-charming.glb)

Same conventions as models/cow/build.py, so it drops in for the normal cow: Z up, metres, origin at the footprint
centre on the ground, head faces -Y (to_game.py turns it to +X). Same part hierarchy (body > legs upper > lower >
hoof, body > neck > head > horns/ears/muzzle/eyes, neck > collar > bell, body > tail > tail_tuft, body > udder,
body_patches), same material names and roles, plus Skin_Blush for the cheeks. Each pose is only rotations of those
parts (POSE) plus a body drop for rest. All shape numbers live in P.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'cow-charming'

P = dict(
    # body rings: (y, z bottom, z top, half width, z of widest point as 0..1 of the height, top width factor)
    BODY=[(-0.70, 0.74, 1.12, 0.14, 0.50, 0.55),
          (-0.64, 0.54, 1.25, 0.31, 0.42, 0.58),
          (-0.50, 0.44, 1.31, 0.39, 0.39, 0.62),
          (-0.28, 0.39, 1.32, 0.425, 0.38, 0.66),
          (0.00, 0.37, 1.30, 0.44, 0.38, 0.70),
          (0.28, 0.38, 1.29, 0.44, 0.40, 0.74),
          (0.52, 0.42, 1.27, 0.42, 0.44, 0.76),
          (0.69, 0.50, 1.22, 0.36, 0.48, 0.76),
          (0.80, 0.63, 1.12, 0.25, 0.50, 0.70),
          (0.84, 0.77, 0.99, 0.11, 0.52, 0.62)],
    NECK=dict(p0=(0.0, -0.30, 0.98), p1=(0.0, -0.66, 1.30), r0=0.27, r1=0.25),
    NECK_PIVOT=(0.0, -0.05, 0.72),   # deep in the chest, so the short neck can swing the big head down to the grass
    HEAD_PIVOT=(0.0, -0.62, 1.26),    # where the head sits on the neck
    HEAD_SCALE=1.28,
    HEAD_SHIFT=(0.0, 0.0, 0.0),     # the whole head group moved back and up so it sits on top of the chest
    HEAD=dict(c=(0.0, -0.74, 1.48), r=(0.37, 0.33, 0.40)),       # the big round skull
    TUFT=dict(c=(0.0, -0.82, 1.83), r=(0.17, 0.13, 0.08)),         # the cream forelock bump
    MUZZLE=dict(c=(0.0, -1.00, 1.235), r=(0.285, 0.165, 0.195)),   # the huge pink nose pad
    EYE=dict(x=0.185, z=1.55, r=(0.042, 0.058)),
    CHEEK=dict(x=0.25, z=1.38, r=(0.075, 0.05)),
    NOSTRIL=dict(x=0.095, z=1.27, r=(0.032, 0.024)),
    SMILE=dict(z=1.155, w=0.10, sag=0.03, r=0.011),
    EAR=dict(x=0.30, z=1.74, y=-0.66, len=0.29, w=0.18, droop=6.0, fwd=12.0),
    HORN=dict(x=0.22, z=1.74, y=-0.68, r0=0.085, r1=0.045, length=0.30, phi=(50.0, 112.0), fwd=0.03),
    FRONT_LEG=dict(x=0.25, y=-0.42, top=0.78, knee=0.30, fet=0.12, r=(0.18, 0.155, 0.15, 0.145)),
    HIND_LEG=dict(x=0.26, y=0.50, top=0.82, hock=0.32, fet=0.12, r=(0.20, 0.16, 0.15, 0.145), hock_back=0.03),
    HOOF=dict(h=0.12, r0=0.155, r1=0.166),
    UDDER=dict(y=0.24, z=0.42, rx=0.15, ry=0.15, rz=0.10, teat=0.06),
    TAIL=dict(root=(0.0, 0.80, 0.98), pts=[(0.03, 0.88, 0.93), (0.07, 0.94, 0.84), (0.09, 0.97, 0.74)], r=(0.04, 0.026)),
    COLLAR=dict(c=(0.0, -0.57, 1.12), rx=0.32, ry=0.27, w=0.08, t=0.045, tilt=38.0),
    BELL=dict(h=0.26, r_top=0.085, r_bot=0.145, rim=0.02),
    GRAZE_PITCH=78,                  # grazing: most the face may pitch down (neck + head, degrees)
    GRAZE_Y=-0.95,                   # grazing: the skull centre stays at least this far forward
    JITTER=0.004,
)

COL = {  # sRGB, sampled from the hero (lit side, flattened)
    'Fur_Cream': (236, 208, 184), 'Fur_Brown': (192, 148, 122), 'Skin_Pink': (226, 144, 128), 'Skin_EarPink': (230, 156, 146),
    'Horn_Gold': (176, 128, 102), 'Horn_Hoof': (140, 98, 76), 'Cloth_Leather': (122, 66, 46), 'Metal_Brass': (182, 132, 60),
    'Skin_EyeDark': (52, 30, 20), 'Fur_TailTuft': (206, 150, 128), 'Skin_Blush': (236, 146, 138),
}
POSES = ['idle', 'feeding', 'rest']

# pose = rotations (degrees, XYZ euler in the parent's frame) of the named pivots, plus a body drop.
# idle keeps a little storybook head tilt (turned toward the viewer's side and rolled).
POSE = {
    'idle': dict(head=(-8, -2, 12)),
    'feeding': dict(head=(0, -4, 6), graze=0.12, tail=(0, 0, 10), leg_fl_upper=(-8, 0, 0), leg_fr_upper=(-4, 0, 0)),
    'rest': dict(drop=0.36, tuck=0.12,          # belly on the grass, stubby front legs poking forward, hind legs tucked
                 leg_fl_upper=(-80, 6, 0), leg_fl_lower=(0, 0, 0), leg_fl_hoof=(-10, 0, 0),
                 leg_fr_upper=(-80, -6, 0), leg_fr_lower=(0, 0, 0), leg_fr_hoof=(-10, 0, 0),
                 leg_hl_upper=(-82, -24, 0), leg_hl_lower=(0, 0, 0), leg_hl_hoof=(0, 0, 0),
                 leg_hr_upper=(-82, 24, 0), leg_hr_lower=(0, 0, 0), leg_hr_hoof=(0, 0, 0),
                 neck=(-4, 0, 0), head=(6, -8, 12), tail=(30, 0, 20)),
}

# soft taupe patches: (part, side, centre a, centre b, radius a, radius b, seed); side +-1 = projected along -+X onto
# that flank (a=y, b=z), 'top' = projected down (a=x, b=y). The hero shows the +X side.
PATCHES = [
    ('body', 1, -0.36, 1.06, 0.15, 0.11, 1),     # over the shoulder, behind the collar
    ('body', 1, 0.10, 0.88, 0.17, 0.20, 3),      # big round flank patch
    ('body', 1, -0.40, 0.62, 0.12, 0.11, 5),     # top of the near foreleg
    ('body', 1, 0.42, 0.58, 0.15, 0.13, 4),      # low on the hind quarter
    ('body', 1, 0.62, 0.92, 0.05, 0.05, 6),      # hip spot
    ('body', 'top', 0.16, 0.42, 0.20, 0.17, 2),  # over the back toward the rump
    ('body', -1, -0.18, 0.95, 0.17, 0.15, 7),
    ('body', -1, 0.40, 0.80, 0.20, 0.22, 8),
    ('body', 'top', -0.18, -0.15, 0.10, 0.09, 10),
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


# half profile of the body section, u across (0..1 of half width), v up (0..1); bottom to top. Rounder than the
# normal cow's pear: a soft, full plush barrel.
BODY_HALF = [(0.42, 0.015), (0.72, 0.07), (0.90, 0.17), (0.985, 0.28), (1.00, 0.40), (0.98, 0.53), (0.92, 0.66), (0.80, 0.79), (0.62, 0.91)]


def body_ring(y, zb, zt, hw, wide, topw, jitter=True):
    h = zt - zb
    pts = [(0.0, 0.0)]
    for u, v in BODY_HALF:
        v2 = v * wide / 0.40 if v <= 0.40 else wide + (v - 0.40) / 0.60 * (1 - wide)   # move the widest point to `wide`
        uu = u if v < 0.85 else u * topw / 0.66
        pts.append((uu, min(v2, 0.99)))
    pts.append((topw * 0.40, 1.0))
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


def ellipsoid(bm, c, r, u=12, v=8, jitter=True, flat_bottom=None):
    """a low-poly ellipsoid (UV sphere scaled to radii r) centred at c; flat_bottom clamps z from below"""
    vs = bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=1.0)['verts']
    c = Vector(c)
    for vt in vs:
        p = Vector((vt.co.x * r[0], vt.co.y * r[1], vt.co.z * r[2])) + c
        if flat_bottom is not None:
            p.z = max(p.z, flat_bottom)
        vt.co = jit(p) if jitter else p
    return vs


def rounded_cyl(bm, p0, p1, r0, r1, n=8, bevel=0.3):
    """a stubby plush limb: a tapered prism with soft (chamfered) ends"""
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    a = d.cross(Vector((0, 0, 1))).normalized() if abs(d.z) < 0.9 else Vector((1, 0, 0))
    b = d.cross(a).normalized()
    L = (p1 - p0).length; e = min(bevel * r1, L * 0.3)
    prof = [(0.0, r0), (L - e, r1), (L, r1 * 0.72)]
    rings = [[p0 + d * s + a * math.cos(2 * math.pi * i / n) * r + b * math.sin(2 * math.pi * i / n) * r for i in range(n)] for s, r in prof]
    return loft(bm, rings, True, True)


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


def bvh_of(bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update()
    return BVHTree.FromBMesh(bm)


# ------------------------------------------------------------------ patches
def blob(seed, n=14):
    """a soft, rounded outline (unit radius on average): rounder than the normal cow's lobed patches"""
    r = random.Random(seed)
    ks = [r.uniform(0.8, 1.15) for _ in range(n)]
    k = r.randrange(n); ks[k] *= 1.15
    for _ in range(2):
        ks = [(ks[i - 1] + 2 * ks[i] + ks[(i + 1) % n]) / 4 for i in range(n)]
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


def patch_rings(ca, cb, ra, rb, seed, n=14):
    sh = blob(seed, n)
    return [[(ca, cb)]] + [[(ca + u * ra * k, cb + v * rb * k) for u, v in sh] for k in (0.5, 1.0)]


def face_disc(bm, bvh, x, z, rx, rz, off=0.006, n=10, yc=-0.74, fwd=None):
    """a flat oval decal (eye, cheek, nostril) projected onto a surface along fwd (default +Y, from the front)"""
    rings = [[(x, z)], [(x + rx * math.cos(2 * math.pi * i / n), z + rz * math.sin(2 * math.pi * i / n)) for i in range(n)]]
    d = Vector((0, 1, 0)) if fwd is None else fwd
    r3 = project_patch(bvh, rings, lambda p: Vector((p[0], yc, p[1])) - d * 3.0, d, off)
    if r3:
        patch_mesh(bm, r3)


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); OBJS.clear(); PIVOTS.clear(); RNG.seed(7)

    # body
    bm = bmesh.new()
    loft(bm, [body_ring(*r) for r in smooth_rings(P['BODY'])])
    bvh_body = bvh_of(bm)
    make('body', bm, 'Fur_Cream', (0, 0, 0))

    # patches on the body
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
            p = Vector((sx * 0.065, U['y'] + sy * 0.065, U['z'] - U['rz'] * 0.7))
            frustum(bm, p, p - Vector((0, 0, U['teat'])), 0.026, 0.02, n=5, cap0=False)
    make('udder', bm, 'Skin_Pink', (0, U['y'], U['z']), 'body')

    # legs: stubby plush columns with chunky hooves, splayed a touch for a sturdy toy stance
    def leg(name, L, front, sx):
        x = sx * L['x']; y = L['y']; r = L['r']; H = P['HOOF']; spl = sx * 0.025
        if front:
            top, joint, fet = Vector((x, y, L['top'])), Vector((x + spl * 0.6, y, L['knee'])), Vector((x + spl, y - 0.01, L['fet']))
        else:
            top, joint, fet = Vector((x, y, L['top'])), Vector((x + spl * 0.6, y + L['hock_back'], L['hock'])), Vector((x + spl, y + 0.01, L['fet']))
        bm = bmesh.new()
        frustum(bm, top + Vector((0, 0, 0.10)), joint - Vector((0, 0, 0.03)), r[0], r[1], n=8)
        make(f'{name}_upper', bm, 'Fur_Cream', top, 'body')
        bm = bmesh.new()
        frustum(bm, joint + Vector((0, 0, 0.03)), fet + Vector((0, 0, 0.01)), r[2], r[3], n=8)
        make(f'{name}_lower', bm, 'Fur_Cream', joint, f'{name}_upper')
        bm2 = bmesh.new()
        rounded_cyl(bm2, fet + Vector((0, 0, 0.02)), Vector((fet.x, fet.y - 0.01, 0.0)), H['r0'], H['r1'], n=8, bevel=0.15)
        make(f'{name}_hoof', bm2, 'Horn_Hoof', fet, f'{name}_lower')

    for nm, sx in (('leg_fl', -1), ('leg_fr', 1)):     # names follow +-X as in the normal cow
        leg(nm, P['FRONT_LEG'], True, sx)
    for nm, sx in (('leg_hl', -1), ('leg_hr', 1)):
        leg(nm, P['HIND_LEG'], False, sx)

    # tail: a short perky stub that kicks out to the side, with a soft tuft
    T = P['TAIL']; bm = bmesh.new()
    pts = [T['root']] + T['pts']; nr = len(pts)
    tube(bm, pts, [T['r'][0] + (T['r'][1] - T['r'][0]) * i / (nr - 1) for i in range(nr)], n=6)
    make('tail', bm, 'Fur_Cream', T['root'], 'body')
    bm = bmesh.new(); e = Vector(T['pts'][-1]); dv = (e - Vector(T['pts'][-2])).normalized()
    tube(bm, [e - dv * 0.02, e + dv * 0.04, e + dv * 0.10, e + dv * 0.16], [0.03, 0.065, 0.055, 0.01], n=7)
    make('tail_tuft', bm, 'Fur_TailTuft', e, 'tail')

    # neck: a short thick stub, mostly hidden between the chest and the big head
    N = P['NECK']; bm = bmesh.new()
    frustum(bm, N['p0'], N['p1'], N['r0'], N['r1'], n=10)
    make('neck', bm, 'Fur_Cream', P['NECK_PIVOT'], 'body')

    # collar (child of the neck) and an oversized bell
    C = P['COLLAR']; cc = Vector(C['c'])
    tilt = Matrix.Rotation(math.radians(C['tilt']), 3, 'X')
    n = 18; bm = bmesh.new(); rings = []
    for dr, dz in ((0, -C['w'] / 2), (C['t'], -C['w'] / 2), (C['t'], C['w'] / 2), (0, C['w'] / 2)):
        rings.append([cc + tilt @ Vector(((C['rx'] + dr) * math.cos(2 * math.pi * i / n + math.pi / 2), (C['ry'] + dr) * math.sin(2 * math.pi * i / n + math.pi / 2), dz))
                      for i in range(n)])
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    for a, b in zip(vs, vs[1:] + vs[:1]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    make('collar', bm, 'Cloth_Leather', cc, 'neck')
    B = P['BELL']
    top = Vector((0, 0, 0))
    bm = bmesh.new()
    frustum(bm, top + Vector((0, 0, 0.04)), top - Vector((0, 0, 0.005)), 0.026, 0.026, n=6, sq=(0.35, 1.0))   # loop
    prof = [(0.0, B['r_top'] * 0.55), (0.025, B['r_top']), (B['h'] * 0.55, B['r_top'] * 1.12), (B['h'] * 0.9, B['r_bot']),
            (B['h'], B['r_bot'] + B['rim']), (B['h'] + 0.016, B['r_bot'] + B['rim'])]
    rings = [[top + Vector((r * math.cos(2 * math.pi * i / 10), r * math.sin(2 * math.pi * i / 10), -d)) for i in range(10)]
             for d, r in prof]
    rings.append([top + Vector((B['r_bot'] * 0.8 * math.cos(2 * math.pi * i / 10), B['r_bot'] * 0.8 * math.sin(2 * math.pi * i / 10), -(B['h'] + 0.016))) for i in range(10)])
    rings.append([top + Vector((B['r_bot'] * 0.7 * math.cos(2 * math.pi * i / 10), B['r_bot'] * 0.7 * math.sin(2 * math.pi * i / 10), -(B['h'] * 0.6))) for i in range(10)])
    loft(bm, rings, True, True)
    cl = top - Vector((0, 0, B['h'] + 0.035))     # clapper ball peeking out
    frustum(bm, cl + Vector((0, 0, 0.035)), cl - Vector((0, 0, 0.025)), 0.034, 0.024, n=6)
    make('bell', bm, 'Metal_Brass', Vector((0, 0, 0.03)), 'collar')   # re-hung from the collar in pose()

    # head: one big round skull, held on the neck
    hp = Vector(P['HEAD_PIVOT']); Hd = P['HEAD']
    bm = bmesh.new()
    ellipsoid(bm, Hd['c'], Hd['r'], u=14, v=10)
    ellipsoid(bm, P['TUFT']['c'], P['TUFT']['r'], u=8, v=5)
    bvh_head = bvh_of(bm)
    make('head', bm, 'Fur_Cream', hp, 'neck')
    OBJS['head'].location += Vector(P['HEAD_SHIFT'])
    M = P['MUZZLE']; bm = bmesh.new()
    ellipsoid(bm, M['c'], M['r'], u=14, v=8)
    bvh_mz = bvh_of(bm)
    make('muzzle', bm, 'Skin_Pink', Vector(M['c']), 'head')

    # face decals: eyes and nostrils dark, rosy cheeks, a little smile
    bm = bmesh.new()
    E = P['EYE']
    for sx in (-1, 1):
        face_disc(bm, bvh_head, sx * E['x'], E['z'], E['r'][0], E['r'][1], off=0.006, n=10)
    Nn = P['NOSTRIL']
    for sx in (-1, 1):
        face_disc(bm, bvh_mz, sx * Nn['x'], Nn['z'], Nn['r'][0], Nn['r'][1], off=0.005, n=8)
    S = P['SMILE']; pts = []
    for k in range(7):
        t = -1 + 2 * k / 6
        x = 0.03 + t * S['w']; z = S['z'] - S['sag'] * (1 - t * t)
        hit = bvh_mz.ray_cast(Vector((x, -3.0, z)), Vector((0, 1, 0)))
        if hit[0] is not None:
            pts.append(hit[0] + hit[1] * 0.004)
    if len(pts) >= 3:
        tube(bm, pts, [S['r'] * (0.6 if i in (0, len(pts) - 1) else 1.0) for i in range(len(pts))], n=4)
    make('eyes', bm, 'Skin_EyeDark', hp + Vector((0, -0.3, 0.2)), 'head')
    bm = bmesh.new(); Ck = P['CHEEK']
    for sx in (-1, 1):   # cheeks sit on the sides of the face, so cast from in front and a little outside
        face_disc(bm, bvh_head, sx * Ck['x'], Ck['z'], Ck['r'][0], Ck['r'][1], off=0.005, n=10,
                  fwd=Vector((-sx * 0.45, 1, 0)).normalized())
    make('cheeks', bm, 'Skin_Blush', hp + Vector((0, -0.3, 0.1)), 'head')

    # ears: big soft cupped leaves out to the sides, drooping a little and turned forward; pink inside
    Ea = P['EAR']
    for sx, nm in ((-1, 'ear_r'), (1, 'ear_l')):
        base = Vector((sx * Ea['x'], Ea['y'], Ea['z']))
        dr, fw = math.radians(Ea['droop']), math.radians(Ea['fwd'])
        along = Vector((sx * math.cos(dr) * math.cos(fw), -math.cos(dr) * math.sin(fw), -math.sin(dr)))
        up = Vector((0, 0, 1)); fwd = along.cross(up).normalized() * (-sx)
        if fwd.y > 0:
            fwd = -fwd
        L, W = Ea['len'], Ea['w']
        outline = [(0.0, 0.32), (0.3, 0.55), (0.62, 0.55), (0.88, 0.32), (1.0, 0.0), (0.88, -0.32), (0.62, -0.5), (0.3, -0.5), (0.0, -0.3)]
        cup = lambda a, b: fwd * (0.035 * (b * b) - 0.01)          # the rim curls forward: a shallow cup
        bm = bmesh.new()
        front = [bm.verts.new(base + along * (a * L) + up * (b * W) + cup(a, b) + fwd * 0.012) for a, b in outline]
        backv = [bm.verts.new(base + along * (a * L) + up * (b * W) + cup(a, b) - fwd * 0.03) for a, b in outline]
        bm.faces.new(front); bm.faces.new(list(reversed(backv)))
        k = len(outline)
        for i in range(k):
            bm.faces.new((front[i], backv[i], backv[(i + 1) % k], front[(i + 1) % k]))
        make(nm, bm, 'Fur_Cream', base, 'head')
        bm = bmesh.new()
        inner = [bm.verts.new(base + along * (0.12 * L + a * L * 0.75) + up * (b * W * 0.68) + cup(a, b) + fwd * 0.018) for a, b in outline[1:-1]]
        bm.faces.new(inner)
        make(nm + '_inner', bm, 'Skin_EarPink', base, nm)

    # horns: short, thick and blunt, out from the top of the skull then curling up and a little in
    Hn = P['HORN']
    for sx, nm in ((-1, 'horn_r'), (1, 'horn_l')):
        b0 = Vector((sx * Hn['x'], Hn['y'], Hn['z']))
        pts = [b0 - Vector((sx * 0.05, 0, 0.04))]; p = b0.copy(); ds = Hn['length'] / 5
        for k in range(1, 6):
            phi = math.radians(Hn['phi'][0] + (Hn['phi'][1] - Hn['phi'][0]) * (k - 0.5) / 5)
            p = p + Vector((sx * math.cos(phi) * ds, -Hn['fwd'] / 5, math.sin(phi) * ds)); pts.append(p.copy())
        radii = [Hn['r0']] + [Hn['r0'] + (Hn['r1'] - Hn['r0']) * k / 5 for k in range(1, 6)]
        tip = pts[-1] + (pts[-1] - pts[-2]).normalized() * Hn['r1'] * 0.8           # rounded tip
        pts.append(tip); radii.append(Hn['r1'] * 0.45)
        bm = bmesh.new(); tube(bm, pts, radii, n=7)
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
        for na in range(20, 130, 2):
            nk.rotation_euler = Euler((math.radians(na), 0, 0), 'XYZ')
            best = None
            for a in range(-60, 61, 4):      # the big head must stay out in front of the chest, not tuck under it
                hd.rotation_euler = Euler((math.radians(a), e.y, e.z), 'XYZ'); bpy.context.view_layer.update()
                if (hd.matrix_world @ (Vector(P['HEAD']['c']) - Vector(P['HEAD_PIVOT']))).y > P['GRAZE_Y']:
                    continue
                if na + a + 10 > P['GRAZE_PITCH']:   # the face looks down at the grass, never back at the chest
                    continue
                z = lowest(OBJS['muzzle'])
                if best is None or z < best[0]:
                    best = (z, a)
            if best is None:
                continue
            hd.rotation_euler = Euler((math.radians(best[1] + 10), e.y, e.z), 'XYZ')
            bpy.context.view_layer.update()
            if lowest(OBJS['muzzle']) <= q['graze']:
                break
        print('feeding: neck', na, 'head', best[1] + 10, flush=True)
    # the bell hangs plumb from the collar's lowest front point, whatever the neck does
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
            export(os.path.join(HERE, f'{NAME}.glb'))
        print(st, 'triangles', tri_count(), flush=True)

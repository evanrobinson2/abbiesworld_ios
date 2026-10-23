"""chicken-charming: the storybook-toy hen, the charming twin of models/chicken. A plush round body, an oversized
round head with a big three-lobed red comb, a little yellow beak, a fat red wattle, dark dot eyes and rosy cheeks,
a collar of chunky rounded hackle petals with golden tips, a big soft wing pad on each flank with golden tip lobes,
a perky lobed golden tail, and short stubby legs in feather pants with fat toes. Smooth shaded, flat colours.

usage: python build.py           builds every pose, writes chicken-charming.glb (idle) and variants/<pose>.glb
       python build.py feeding   builds and exports one pose only (idle also writes chicken-charming.glb)

Same conventions and part tree as the normal chicken (so it drops into the game in its place):
Z up, metres, origin at the footprint centre on the ground, head faces -Y (to_game.py turns it to +X).
body (pivot at the hips) > neck > head > comb/wattle/beak/face/eyes/pupils, body > tail_under > tail,
body > wing_l/wing_r > wing plates, body > breast_plates, neck > hackles/hackle_tips. The legs (leg_l, leg_r, with
their pants) are separate roots at the hip joints, so the body can tip and sink without dragging the feet.
Every pose is rotations of those parts plus a body drop (POSE). All shape numbers live in P.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'chicken-charming'

P = dict(
    HIP=(0.0, -0.016, 0.072),            # body pivot: between the hip joints
    BODY=dict(c=(0.0, -0.002, 0.138), r=(0.104, 0.120, 0.100), nu=14, nv=8,
              front_drop=0.042,          # the breast sags forward and down (a plump, low-slung toy hen)
              back_rise=0.020,           # the back lifts toward the tail
              belly_flat=0.35,
              rear=0.86, rear_lift=0.030),                # squashes the rump (y > 0) so the tail rises straight off a round ball          # flattens the underside (0 round .. 1 flat)
    NECK=dict(p0=(0.0, -0.040, 0.190), p1=(0.0, -0.058, 0.262), r=(0.062, 0.050)),
    NECK_PIVOT=(0.0, -0.045, 0.215),
    HEAD_C=(0.0, -0.068, 0.300), HEAD_R=(0.064, 0.060, 0.058),       # oversized round head (normal: 0.034 x 0.039 x 0.035)
    BEAK=dict(base=(0.0, -0.118, 0.296), len=0.034, r=0.017, droop=12.0),
    # comb: three fat round lobes along the crown (y, z, radius), the middle one tallest
    COMB=[(-0.096, 0.354, 0.026), (-0.064, 0.380, 0.032), (-0.026, 0.374, 0.027)], COMB_T=0.50, COMB_H=1.0,
    WATTLE=dict(y=-0.116, z=0.252, rx=0.016, ry=0.017, rz=0.027, dx=0.012),
    EYE=dict(a=52.0, z=0.312, r=(0.0085, 0.012), shine=0.0035),      # a: degrees from the front toward the side
    CHEEK=dict(a=66.0, z=0.290, r=(0.006, 0.016, 0.011)),
    # hackle collar: rounded petals round the neck base hanging down over the shoulders (ring z, ring radius, count)
    COLLAR=dict(c=(0.0, -0.044, 0.244), R=(0.068, 0.064), n=8, len=0.058, w=0.044, t=0.018, out=0.42, skip=0.0),
    LEG=dict(x=0.036, y=-0.026, top=0.074, r=(0.014, 0.012), toe=0.036, toe_r=0.0095, spread=34.0, back=0.018,
             pants=(0.040, 0.036, 0.030), pants_z=0.064),
    TAIL=dict(pivot=(0.0, 0.086, 0.205), n=3, len=(0.110, 0.124), w=0.060, t=0.022, up=(36.0, 82.0), fan=0.020),
    WING=dict(c=(0.082, 0.018, 0.140), r=(0.025, 0.084, 0.058), tilt=-14.0, toe_in=6.0, roll=14.0, tips=3),
    BREAST=dict(c=(0.0, -0.100, 0.134), r=(0.078, 0.056, 0.074)),
    SMOOTH=True,
)

COL = {  # sRGB, sampled from the hero's lit faces
    'Feather_White': (250, 236, 204), 'Feather_Cream': (238, 212, 162), 'Feather_Gold': (236, 182, 92),
    'Skin_Red': (214, 66, 46), 'Horn_Yellow': (242, 182, 66), 'Skin_Yellow': (232, 156, 52),
    'Skin_EyeDark': (44, 30, 20), 'Skin_Cheek': (240, 148, 126), 'Skin_EyeShine': (255, 250, 240),
}
POSES = ['idle', 'feeding', 'rest']

# pose = rotations (degrees, XYZ euler in the parent's frame) of named pivots; body 'drop' in metres;
# 'peck' = tip the head down until the beak tip reaches this height; legs: (rotation, location offset).
# Every pose keeps the storybook tilt: the head cocked a few degrees and the body leaning into its step.
TILT = dict(body=(6, 0, 0), head=(0, -9, 4))
POSE = {
    'idle': dict(),
    'feeding': dict(body=(50, 0, 0), neck=(34, 0, 0), tail=(-20, 0, 0), wing_l=(-6, 0, 0), wing_r=(-6, 0, 0),
                    head=(-4, -9, 4), peck=0.010),
    'rest': dict(drop=0.040, body=(-2, 0, 0), neck=(-4, 0, 0), head=(6, -12, 4), tail=(-10, 0, 0),
                 wing_l=(0, -3, 0), wing_r=(0, 3, 0), legs=((90, 0, 0), (0, 0.0, 0.040))),
}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85 if 'Eye' not in name else 0.4
        MATS[name] = m
    return MATS[name]


RNG = random.Random(11)


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


def blob(bm, c, r, nu=8, nv=5, rot=None, warp=None):
    """an ellipsoid (radii r) at c; rot is a 3x3 Matrix applied to the local point, warp(local point) -> local point"""
    c = Vector(c); rings = []
    for j in range(1, nv):
        t = math.pi * j / nv
        ring = []
        for i in range(nu):
            u = 2 * math.pi * i / nu
            p = Vector((r[0] * math.sin(t) * math.cos(u), r[1] * math.sin(t) * math.sin(u), -r[2] * math.cos(t)))
            if warp:
                p = warp(p)
            ring.append(c + (rot @ p if rot else p))
        rings.append(ring)
    vs = loft(bm, rings, False, False)
    pb, pt = Vector((0, 0, -r[2])), Vector((0, 0, r[2]))
    if warp:
        pb, pt = warp(pb), warp(pt)
    bot = bm.verts.new(c + (rot @ pb if rot else pb)); top = bm.verts.new(c + (rot @ pt if rot else pt))
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


def frame(along, out):
    """rotation whose local +Z runs along `along` and local +X faces `out` (for petals, lobes and plates)"""
    z = Vector(along).normalized(); x = (Vector(out) - z * z.dot(Vector(out))).normalized(); y = z.cross(x)
    return Matrix((x, y, z)).transposed()


def petal(bm, root, along, out, length, width, thick, nu=6, nv=4):
    """a soft rounded feather lobe: a flattened ellipsoid from `root` along `along`, its flat face toward `out`"""
    R = frame(along, out)
    c = Vector(root) + Vector(along).normalized() * length / 2
    blob(bm, c, (thick / 2, width / 2, length / 2), nu, nv, rot=R,
         warp=lambda p: Vector((p.x + 0.25 * thick * (1 - (2 * p.z / length) ** 2), p.y * (1.0 + 0.25 * p.z / length * 2), p.z)))


OBJS, PIVOTS = {}, {}


def make(name, bm, material, pivot, parent=None):
    pivot = Vector(pivot)
    if bm.faces:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for v in bm.verts:
        v.co -= pivot
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = P['SMOOTH']
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob.rotation_mode = 'XYZ'
    if parent is not None:
        ob.parent = OBJS[parent]; ob.location = pivot - PIVOTS[parent]
    else:
        ob.location = pivot
    PIVOTS[name] = pivot; OBJS[name] = ob
    return ob


def body_warp(p):
    B = P['BODY']; r = B['r']
    fy = -p.y / r[1]                     # 1 at the breast, -1 at the tail
    fz = p.z / r[2]
    q = Vector(p)
    if fy > 0:                           # the breast sags forward and low
        q.z -= B['front_drop'] * fy * fy * (1 - fz) * 0.5
    else:                                # the back lifts toward the tail
        q.z += B['back_rise'] * fy * fy * (1 + fz) * 0.5
    if p.y > 0:
        q.y = p.y * B['rear']
        if fz < 0:                       # the rump's underside curves up into the tail: a ball, not a box
            q.z += B['rear_lift'] * fy * fy * (-fz)
    if fz < 0:
        q.z = p.z * (1 - B['belly_flat'] * fz * fz * 0.5) + (q.z - p.z)
    return q


def body_point(sx, y, z):
    """a point on the body surface at the side sx (+1/-1) for given y, z (bisection along x)"""
    B = P['BODY']; c = Vector(B['c']); r = B['r']
    ly, lz = y - c.y, z - c.z
    k = 1 - (ly / r[1]) ** 2 - (lz / r[2]) ** 2
    return Vector((sx * r[0] * math.sqrt(max(k, 0.02)), y, z))


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); OBJS.clear(); PIVOTS.clear(); RNG.seed(11)
    B = P['BODY']

    # body: a plush ball, the breast sagging forward, the back lifting to the tail, a softly flattened belly
    bm = bmesh.new(); blob(bm, B['c'], B['r'], B['nu'], B['nv'], warp=body_warp)
    make('body', bm, 'Feather_White', P['HIP'])

    # breast: one soft puff filling out the chest under the collar (the hero's smooth, low-slung breast)
    Br = P['BREAST']; bm = bmesh.new(); blob(bm, Br['c'], Br['r'], 6, 4)
    make('breast_plates', bm, 'Feather_White', P['HIP'], 'body')

    # wings: a big soft pad on each flank, tilted tail-down, with fat golden tip lobes at the back
    Wg = P['WING']
    for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
        c = Vector((sx * Wg['c'][0], Wg['c'][1], Wg['c'][2]))
        R = Matrix.Rotation(math.radians(sx * Wg['toe_in']), 3, 'Z') @ Matrix.Rotation(math.radians(-sx * Wg['roll']), 3, 'Y') @ \
            Matrix.Rotation(math.radians(Wg['tilt']), 3, 'X')
        bm = bmesh.new()
        blob(bm, c, Wg['r'], 8, 4, rot=R,
             warp=lambda p, sx=sx: Vector((p.x + sx * 0.010 * (1 - (p.y / Wg['r'][1]) ** 2), p.y + 0.012 * (p.z / Wg['r'][2]) * (p.y / Wg['r'][1]), p.z)))
        make(nm, bm, 'Feather_Cream', c - Vector((0, Wg['r'][1] * 0.6, 0)), 'body')
        bm = bmesh.new()
        for j in range(Wg['tips']):
            f = j / max(1, Wg['tips'] - 1)
            root = c + R @ Vector((sx * Wg['r'][0] * 0.55, Wg['r'][1] * 0.10, (0.55 - 0.9 * f) * Wg['r'][2] * 0.9))
            along = R @ Vector((-sx * 0.22, 1.0, -0.05 - 0.30 * f))
            petal(bm, root, along, R @ Vector((sx, 0, 0)), 0.070 - 0.012 * f, 0.040, 0.016, nu=5, nv=3)
        make(nm + '_plates', bm, 'Feather_Gold', c, nm)

    # tail: a perky fan of fat rounded lobes, a cream under-layer and golden tops
    T = P['TAIL']; tp = Vector(T['pivot'])
    for layer, mname, k0 in (('tail_under', 'Feather_Cream', 0), ('tail', 'Feather_Gold', 1)):
        bm = bmesh.new()
        n = T['n'] - k0
        for i in range(n):
            f = i / (n - 1) if n > 1 else 0.5
            ang = math.radians(T['up'][0] + (T['up'][1] - T['up'][0]) * f) + (0.10 if k0 else -0.05)
            along = Vector((0, math.cos(ang), math.sin(ang)))
            x = (f - 0.5) * 2 * T['fan'] * (0.6 if k0 else 1.0)
            L = T['len'][0] + (T['len'][1] - T['len'][0]) * math.sin(math.pi * f) - k0 * 0.010
            root = tp + Vector((x, -0.020 + 0.012 * k0, -0.020 + 0.012 * k0))
            petal(bm, root, along + Vector((x * 3, 0, 0)), Vector((1, 0, 0)), L, T['w'] * (0.9 if k0 else 1.0), T['t'], nu=6, nv=3)
        make(layer, bm, mname, tp, 'body' if layer == 'tail_under' else 'tail_under')

    # neck: a short plush stub from the shoulders into the head
    Nk = P['NECK']; bm = bmesh.new()
    frustum(bm, Nk['p0'], Nk['p1'], Nk['r'][0], Nk['r'][1], n=8, cap0=False)
    make('neck', bm, 'Feather_White', P['NECK_PIVOT'], 'body')

    # hackle collar: chunky rounded petals round the neck base, hanging over the shoulders, with golden tips
    Cl = P['COLLAR']; cc = Vector(Cl['c']); bm = bmesh.new(); bt = bmesh.new()
    for i in range(Cl['n']):
        a = 2 * math.pi * (i + 0.5) / Cl['n'] - math.pi / 2       # starts at the front (-Y)
        out = Vector((math.cos(a), math.sin(a), 0))
        if out.y < -0.9:
            continue                                               # the throat stays open under the wattle
        root = cc + Vector((out.x * Cl['R'][0], out.y * Cl['R'][1], 0))
        down = (Vector((0, 0, -1)) + out * Cl['out']).normalized()
        L = Cl['len'] * (1.0 if out.y < 0.5 else 0.85)
        petal(bm, root, down, out, L, Cl['w'], Cl['t'], nu=6, nv=3)
        petal(bt, root + down * L * 0.60 + out * 0.009, down, out, L * 0.50, Cl['w'] * 0.92, Cl['t'] * 0.9, nu=4, nv=3)
    make('hackles', bm, 'Feather_White', P['NECK_PIVOT'], 'neck')
    make('hackle_tips', bt, 'Feather_Gold', P['NECK_PIVOT'], 'neck')

    # head: oversized and round
    hc = Vector(P['HEAD_C'])
    bm = bmesh.new(); blob(bm, hc, P['HEAD_R'], 12, 8)
    make('head', bm, 'Feather_White', hc + Vector((0, 0.012, -0.030)), 'neck')
    HR = P['HEAD_R']

    def on_head(a_deg, z, lift=0.0):
        a = math.radians(a_deg); lz = (z - hc.z) / HR[2]; k = math.sqrt(max(0.05, 1 - lz * lz))
        n = Vector((math.sin(a) * k / HR[0], -math.cos(a) * k / HR[1], lz / HR[2])).normalized()
        return hc + Vector((math.sin(a) * HR[0] * k, -math.cos(a) * HR[1] * k, z - hc.z)) + n * lift, n

    # rosy cheeks (the bare face of the normal hen, now a blush)
    Ck = P['CHEEK']; bm = bmesh.new()
    for sx in (-1, 1):
        p, n = on_head(sx * Ck['a'], Ck['z'], -0.002)
        blob(bm, p, Ck['r'], 5, 3, rot=frame(Vector((0, 0, 1)), n))
    make('face', bm, 'Skin_Cheek', hc, 'head')
    # eyes: dark ovals with a white shine
    E = P['EYE']; bm = bmesh.new(); bp = bmesh.new()
    for sx in (-1, 1):
        p, n = on_head(sx * E['a'], E['z'], -0.0015)
        blob(bm, p, (0.004, E['r'][0], E['r'][1]), 5, 3, rot=frame(Vector((0, 0, 1)), n))
        s, _ = on_head(sx * (E['a'] - 4), E['z'] + 0.005, 0.0022)
        blob(bp, s, (0.0015, E['shine'], E['shine']), 4, 2, rot=frame(Vector((0, 0, 1)), n))
    make('eyes', bm, 'Skin_EyeDark', hc, 'head')
    make('pupils', bp, 'Skin_EyeShine', hc, 'head')
    # beak: a small stout rounded cone, drooping a little
    Bk = P['BEAK']; b0 = Vector(Bk['base']); d = math.radians(Bk['droop'])
    bm = bmesh.new(); cone(bm, b0 + Vector((0, 0.010, 0)), b0 + Vector((0, -Bk['len'] * math.cos(d), -Bk['len'] * math.sin(d))), Bk['r'],
                           n=6, sq=(0.85, 1.0))
    make('beak', bm, 'Horn_Yellow', b0, 'head')
    # comb: three fat round lobes, flattened side to side
    bm = bmesh.new()
    for y, z, r in P['COMB']:
        blob(bm, (0, y, z), (r * P['COMB_T'], r, r * P['COMB_H']), 6, 4)
    make('comb', bm, 'Skin_Red', Vector((0, P['COMB'][1][0], P['COMB'][1][1] - 0.02)), 'head')
    # wattle: two fat hanging lobes under the beak
    Wt = P['WATTLE']; bm = bmesh.new()
    for sx in (-1, 1):
        blob(bm, (sx * Wt['dx'], Wt['y'], Wt['z']), (Wt['rx'], Wt['ry'], Wt['rz']), 6, 3)
    make('wattle', bm, 'Skin_Red', Vector((0, Wt['y'], Wt['z'] + Wt['rz'])), 'head')

    # legs: short stubby shanks in fluffy feather pants, three fat forward toes and a little back toe
    L = P['LEG']
    for sx, nm in ((1, 'leg_l'), (-1, 'leg_r')):
        top = Vector((sx * L['x'], L['y'], L['top'])); foot = Vector((sx * L['x'], L['y'] - 0.004, 0.010))
        bm = bmesh.new()
        frustum(bm, top, foot, L['r'][0], L['r'][1], n=5)
        for ang in (-L['spread'], 0.0, L['spread']):
            a = math.radians(ang)
            dd = Vector((math.sin(a), -math.cos(a), 0)); tipp = foot + dd * L['toe'] + Vector((0, 0, -0.003))
            blob(bm, (foot + tipp) / 2, (L['toe_r'], L['toe'] / 2 + 0.004, L['toe_r'] * 0.8), 4, 3,
                 rot=Matrix.Rotation(-a, 3, 'Z'))
        blob(bm, foot + Vector((0, L['back'] / 2 + 0.004, -0.002)), (L['toe_r'] * 0.8, L['back'] / 2 + 0.004, L['toe_r'] * 0.7), 4, 2)
        make(nm, bm, 'Skin_Yellow', top)
        bm = bmesh.new()
        blob(bm, (sx * (L['x'] + 0.004), L['y'] + 0.004, L['pants_z']), L['pants'], 6, 3,
             warp=lambda p: Vector((p.x, p.y, p.z if p.z > 0 else p.z * 0.8)))
        make(nm.replace('leg', 'pants'), bm, 'Feather_Cream', top, nm)


def lowest(ob):
    return min((ob.matrix_world @ v.co).z for v in ob.data.vertices)


def pose(name):
    q = dict(TILT); q.update(POSE[name])
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
            export(os.path.join(HERE, f'{NAME}.glb'))
        print(f'{st}: triangles {tri_count()}')

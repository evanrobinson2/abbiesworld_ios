"""Water bucket, charming (storybook toy) version of models/water-bucket (Ranch supply, replaces simulation-assets/supplies/water-bucket-{full,partial,empty,carried}.json).
Same structure, states, materials and origin as the normal bucket, reshaped plump and toy-like: a taller, gently
bulging barrel body with a soft tucked-in base, thick rounded staves with chunky uneven tops, two very wide iron bands
with big rivets, a fat twisted rope handle on a tall arc that leans over, and big loose knots at the ears.
Normal description: a chunky wooden stave bucket tapering to its base: 12 bevelled staves with uneven tops and small gaps, two wide dark
iron hoops with rivet nubs, two iron ear straps rising above the rim left and right, a thick twisted jute rope handle
arching high over the top and knotted round each ear, and a clear blue water surface a little below the rim.
Z up, metres, origin at the centre of the footprint on the ground, front -Y, ears on +-X.
usage: python build.py            builds every fill state, writes variants/<state>.glb and water-bucket-charming.glb (= full)
       python build.py full       one state only"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'water-bucket-charming'
STATES = ['full', 'partial', 'empty', 'carried']

P = dict(
    H=0.38,                 # stave height (mean, before the uneven tops); taller than the normal 0.35
    r_top=0.18, r_bot=0.150,  # outer radius at the rim and at the base (before the bulge)
    bulge=0.016,            # extra radius at mid height (sin profile): the plump barrel belly
    tuck=0.014, tuck_h=0.03,  # the base rounds in by this much over this height (soft toy bottom)
    rings=4,                # stave cross-sections up the height (for the bulge)
    staves=12, gap=0.005,   # stave count and the gap between staves (m)
    thick=0.032,            # stave thickness (chunky rim)
    bevel=0.010,            # edge bevel on the staves (rounded, toy-like)
    top_jitter=0.016,       # uneven stave tops (+- m)
    lean_jitter=0.004,      # per-stave radial wobble
    floor_z=0.03,
    hoops=[(0.233, 0.31), (0.057, 0.128)],   # (z bottom, z top) of the two hoops: very wide bands
    hoop_out=0.013, hoop_seg=20,
    rivets=9, rivet_r=0.013, rivet_h=0.011,
    ear_w=0.056, ear_t=0.012, ear_z0=0.23, ear_rise=0.05,   # ear straps: width, thickness, bottom z, height above rim
    rope_r=0.019, rope_sides=6, rope_steps=24, rope_twist=0.6, rope_lobe=0.24,
    handle_top=0.72,        # top of the rope arc (centreline), z
    handle_squareness=1.8,  # superellipse exponent of the arc (2 = half ellipse, higher = squarer shoulders)
    handle_lean=14.0,       # deg: the arc tips over towards -Y (the front) about the ear axis
    handle_skew=0.05,       # m: the arc's crown shifts towards +X, so it reads hand-made and lopsided
    knot_r=0.046,
    ear_angle=20.0,         # deg: the ear axis turned about Z from X (positive takes the +X ear towards the back)
    water={"full": 0.335, "carried": 0.335, "partial": 0.20, 'empty': None},   # water surface z per state
    colours=dict(Wood_Stave=(178, 104, 58), Metal_Iron=(84, 76, 66), Rope_Jute=(150, 84, 44), Water=(140, 182, 190)),
    rough=dict(Wood_Stave=0.8, Metal_Iron=0.55, Rope_Jute=0.9, Water=0.15),
)


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[lin(c) for c in P['colours'][name]], 1)
        b.inputs['Roughness'].default_value = P['rough'][name]
        MATS[name] = m
    return MATS[name]


def obj(name, verts, faces, m):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.validate()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(m))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def R(z):
    """outer radius of the staves at height z: a taper, a sine belly and a rounded tuck at the base"""
    t = min(max(z / P['H'], 0.0), 1.0)
    r = P['r_bot'] + (P['r_top'] - P['r_bot']) * t + P['bulge'] * math.sin(math.pi * t)
    if z < P['tuck_h']:
        u = 1 - z / P['tuck_h']; r -= P['tuck'] * (1 - math.sqrt(max(0.0, 1 - u * u)))
    return r


def polar(r, a, z):
    return (r * math.cos(a), r * math.sin(a), z)


def prism(rings):
    """rings: list of equal-length closed loops (bottom to top) -> verts, faces (sides + both caps)"""
    n = len(rings[0]); V = [v for ring in rings for v in ring]; F = []
    for k in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            F.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    F.append(tuple(reversed(range(n))))
    top = (len(rings) - 1) * n; F.append(tuple(top + i for i in range(n)))
    return V, F


def staves():
    rnd = random.Random(11); N = P['staves']; T = P['thick']; b = P['bevel']
    V, F = [], []
    for s in range(N):
        a0 = -math.pi / 2 + math.pi / N + 2 * math.pi * s / N      # a gap sits at the front centre, as in the hero
        top = P['H'] + rnd.uniform(-1, 1) * P['top_jitter']; dr = rnd.uniform(-1, 1) * P['lean_jitter']

        def section(z, inset=0.0):
            ro = R(z) + dr - inset; ri = R(z) + dr - T + inset
            half = math.pi / N - P['gap'] / 2 / ro - inset / ro
            bo = b / ro
            return [polar(ri, a0 - half, z), polar(ri, a0 + half, z), polar(ro - b, a0 + half, z),
                    polar(ro, a0 + half - bo, z), polar(ro, a0 - half + bo, z), polar(ro - b, a0 - half, z)]
        zs = [P['tuck_h'] * k for k in (0.0,)] + [P['tuck_h'] + (top - b - P['tuck_h']) * k / (P['rings'] - 1) for k in range(P['rings'])]
        v, f = prism([section(z) for z in zs] + [section(top, b * 0.8)])
        o = len(V); V += v; F += [tuple(i + o for i in ff) for ff in f]
    return obj('staves', V, F, 'Wood_Stave')


def disk(name, z, r, n, m, rot=0.0):
    V = [polar(r, rot + 2 * math.pi * i / n, z) for i in range(n)]
    return obj(name, V, [tuple(range(n))], m)


def hoops():
    V, F = [], []; n = P['hoop_seg']; rnd = random.Random(5)
    for z0, z1 in P['hoops']:
        o = len(V)
        zm = (z0 + z1) / 2; e = 0.004           # a rounded band: bevelled top and bottom edges, belly row in the middle
        for i in range(n):
            a = 2 * math.pi * i / n; w = rnd.uniform(-0.0015, 0.0015); ho = P['hoop_out'] + w
            V += [polar(R(z0) - 0.004, a, z0), polar(R(z0) + ho * 0.6, a, z0), polar(R(z0 + e) + ho, a, z0 + e),
                  polar(R(zm) + ho * 1.08, a, zm), polar(R(z1 - e) + ho, a, z1 - e), polar(R(z1) + ho * 0.6, a, z1),
                  polar(R(z1) - 0.004, a, z1)]
        for i in range(n):
            j = (i + 1) % n; A, B = o + 7 * i, o + 7 * j
            F += [(A + k, B + k, B + k + 1, A + k + 1) for k in range(6)]
    return obj('hoops', V, F, 'Metal_Iron')


def rivets():
    V, F = [], []; n = P['rivets']; r = P['rivet_r']
    for hi, (z0, z1) in enumerate(P['hoops']):
        zc = (z0 + z1) / 2
        for k in range(n):
            a = -math.pi / 2 + (k + 0.5 * hi) * 2 * math.pi / n
            if abs(math.cos(a - math.radians(P['ear_angle']))) > 0.97 and hi == 0:
                continue                               # the ear straps sit there on the top hoop
            base = R(zc) + P['hoop_out'] * 1.08 - 0.001
            out = Vector((math.cos(a), math.sin(a), 0)); tan = Vector((-math.sin(a), math.cos(a), 0)); up = Vector((0, 0, 1))
            c = Vector((base * math.cos(a), base * math.sin(a), zc)); o = len(V)
            V += [c + tan * r, c + up * r, c - tan * r, c - up * r, c + out * P['rivet_h']]
            F += [(o, o + 1, o + 4), (o + 1, o + 2, o + 4), (o + 2, o + 3, o + 4), (o + 3, o, o + 4)]
    return obj('rivets', V, F, 'Metal_Iron')


def ear_points():
    """centre of each ear's top (where the rope knots), x = -+ the ear radius"""
    zt = P['H'] + P['ear_rise']; return [(s, R(P['H']) + 0.004 + P['ear_t'] / 2, zt) for s in (-1, 1)]


def ears():
    V, F = [], []; w = P['ear_w'] / 2; t = P['ear_t']
    for s in (-1, 1):
        z0 = P['ear_z0']; zt = P['H'] + P['ear_rise']
        # outline in the strap's own plane (u across, z up): a strap with a rounded top tab
        prof = [(-w, z0), (w, z0), (w, zt - w), (w * 0.7, zt - w * 0.3), (0, zt), (-w * 0.7, zt - w * 0.3), (-w, zt - w)]
        o = len(V)
        for d in (0.0, t):
            for u, z in prof:
                rr = max(R(min(z, P['H'])) + 0.003, R(P['hoops'][0][1]) + P['hoop_out'] - 0.002) + d
                V.append((s * rr, u, z))
        n = len(prof)
        for i in range(n):
            j = (i + 1) % n; F.append((o + i, o + j, o + n + j, o + n + i))
        F.append(tuple(o + i for i in reversed(range(n)))); F.append(tuple(o + n + i for i in range(n)))
    return obj('ears', V, F, 'Metal_Iron')


def rope_path():
    """the arc's centreline in the XZ plane, from the left knot over to the right knot"""
    (_, _, zt) = ear_points()[0]; xr = R(P['H']) + 0.004 + P['ear_t'] + P['rope_r'] * 0.6
    z0 = zt - 0.005; h = P['handle_top'] - z0; e = P['handle_squareness']; pts = []
    for i in range(P['rope_steps'] + 1):
        th = math.pi * i / P['rope_steps']                 # pi .. 0 sweeps left to right
        c, sn = math.cos(math.pi - th), math.sin(math.pi - th)
        x = -xr * math.copysign(abs(c) ** (2 / e), c); z = z0 + h * abs(sn) ** (2 / e)
        x += P['handle_skew'] * abs(sn) ** 2
        lean = math.radians(P['handle_lean']); dz = z - z0
        pts.append(Vector((-x, -dz * math.sin(lean), z0 + dz * math.cos(lean))))
    return pts


def rope():
    pts = rope_path(); n = P['rope_sides']; r = P['rope_r']; V, F = [], []
    lean = math.radians(P['handle_lean'])
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        side = Vector((0, math.cos(lean), math.sin(lean))); side = (side - t * side.dot(t)).normalized()
        other = t.cross(side).normalized()
        tw = k * P['rope_twist']
        for i in range(n):
            ph = 2 * math.pi * i / n; rr = r * (1 + P['rope_lobe'] * (1 if i % 2 == 0 else -1))
            V.append(p + (side * math.cos(ph + tw) + other * math.sin(ph + tw)) * rr)
    for k in range(len(pts) - 1):
        for i in range(n):
            j = (i + 1) % n; F.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    return obj('rope_handle', V, F, 'Rope_Jute')


def knots():
    """a lumpy wrap of rope round each ear top: a squashed, jittered low sphere"""
    rnd = random.Random(3); V, F = [], []; seg, rings = 7, 5; kr = P['knot_r']
    for s, y, zt in [(x, 0, z) for (x, _, z) in [(e[0], 0, e[2]) for e in ear_points()]]:
        cx = s * (R(P['H']) + 0.004 + P['ear_t'] * 0.6); cz = zt - 0.012; o = len(V)
        V.append((cx, 0, cz - kr * 0.95))
        for ri in range(1, rings):
            ph = math.pi * ri / rings
            for si in range(seg):
                th = 2 * math.pi * si / seg; j = 1 + rnd.uniform(-0.12, 0.12)
                V.append((cx + kr * 0.85 * j * math.sin(ph) * math.cos(th), kr * 1.0 * j * math.sin(ph) * math.sin(th),
                          cz - kr * 0.95 * math.cos(ph)))
        V.append((cx, 0, cz + kr * 0.95)); last = len(V) - 1
        for si in range(seg):
            sj = (si + 1) % seg; F.append((o, o + 1 + sj, o + 1 + si))
        for ri in range(rings - 2):
            for si in range(seg):
                sj = (si + 1) % seg; a, b = o + 1 + ri * seg, o + 1 + (ri + 1) * seg
                F.append((a + si, a + sj, b + sj, b + si))
        top = o + 1 + (rings - 2) * seg
        for si in range(seg):
            sj = (si + 1) % seg; F.append((top + si, top + sj, last))
    return obj('rope_knots', V, F, 'Rope_Jute')


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()
    staves(); hoops(); rivets()
    from mathutils import Matrix
    rot = Matrix.Rotation(math.radians(P['ear_angle']), 4, 'Z')
    for o in (ears(), rope(), knots()):
        o.data.transform(rot)
    disk('floor', P['floor_z'], R(P['floor_z']) - P['thick'] + 0.004, 12, 'Wood_Stave')
    wz = P['water'][state]
    if wz is not None:
        disk('water', wz, R(wz) - P['thick'] + 0.004, 24, 'Water')
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    return tris


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    for s in [a for a in sys.argv[1:] if a in STATES] or STATES:
        n = build(s)
        export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'full':
            export(os.path.join(HERE, f'{NAME}.glb'))
        print(f'{s}: triangles {n}')

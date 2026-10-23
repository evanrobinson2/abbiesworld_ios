"""ration-jar: a squat cream ceramic feed jar with hand-carved facets, a short straight neck, a thick round plank lid
with a bevelled edge, a twisted jute rope looped twice round the neck with a knot on the left (-X) and a loose
tail, and a wooden scoop hanging from the knot, bowl down by the ground, leaning on the jar.

usage: python build.py           builds every fill state, writes ration-jar.glb (= full) and variants/<state>.glb
       python build.py partial   builds and exports one state only

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
States: full (lid on, as the hero), partial (lid off, propped on the back of the neck; grain down in the neck and a
heap in the scoop), empty (lid off and propped, dark empty inside, empty scoop), carried (the full jar, lid on).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    H_SCALE=1.00,
    R_SCALE=1.05,        # widen every jar radius in PROFILE        # squash every height (the hero jar is squatter than the profile below was drawn)
    KNOT_OUT=0.035,      # how far the lower knot stands off the shoulder
    SEG=11,              # facets round the jar (hand-carved, not a smooth lathe)
    PROFILE=[            # (radius, z) of the outer jar wall, foot to rim
        (0.164, 0.000), (0.170, 0.022), (0.176, 0.120), (0.185, 0.220), (0.191, 0.300), (0.178, 0.345),
        (0.152, 0.390), (0.135, 0.418), (0.128, 0.430), (0.128, 0.468), (0.133, 0.476), (0.133, 0.486),
    ],
    JIT=0.035,           # radial jitter per vertex (fraction) for the chunky carved look
    TWIST=0.18,          # random ring rotation (fraction of a facet)
    INNER_R=0.110,       # mouth (inside of the neck)
    FLOOR_Z=0.07,
    LID_R=0.139, LID_Z=0.486, LID_DX=-0.012, LID_T=0.032, LID_CH=0.010, PLANKS=3, LID_SEG=13,
    ROPE_R=0.0085, ROPE_SIDES=5,
    NECK_LOOPS=(0.437, 0.455),          # z of the two loops round the neck
    SASH=(0.270, 0.420),                # the loose loop round the shoulder: z at the knot side (-X), z opposite
    KNOT_PHI=200.0,                     # knot direction (deg, 180 = -X, more = towards the front)
    KNOT_Z=0.255,
    SCOOP_BOWL=(-0.232, -0.128, 0.092),  # bowl centre
    SCOOP_N=(-0.45, -0.85, 0.30),        # bowl opening direction
    SCOOP_SIZE=(0.077, 0.088, 0.062),    # bowl radius across, radius along the handle, depth
    HANDLE=(0.030, 0.019),               # handle width, thickness
    GRAIN_Z={'partial': 0.385, 'empty': None, 'full': None, 'carried': None},
    LID_OFF=(0.375, 82.0),               # propped lid: z where its lower edge rests on the back shoulder, tilt (deg)
)

P['PROFILE'] = [(r * P['R_SCALE'], z) for r, z in P['PROFILE']]

COL = {  # sRGB, sampled from the hero's mid tones
    'Ceramic_Cream': (228, 210, 172), 'Ceramic_Inside': (128, 104, 74), 'Wood_Lid': (122, 72, 44),
    'Wood_Scoop': (166, 96, 58), 'Rope_Jute': (178, 140, 96), 'Feed_Grain': (218, 172, 84),
}
STATES = ['full', 'partial', 'empty', 'carried']


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.6 if name.startswith('Ceramic_Cream') else 0.85
        MATS[name] = m
    return MATS[name]


def obj(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.normal_update(); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(mat(m))
    for p in me.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def ring_faces(bm, a, b, mi=0):
    n = len(a)
    for i in range(n):
        f = bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])); f.material_index = mi


def jar(rng, inside_mat):
    """Faceted lathe: outer wall, rim, inner neck wall down to an inner floor. Material 0 outside, 1 inside."""
    bm = bmesh.new(); n = P['SEG']; rings = []
    for k, (r, z) in enumerate(P['PROFILE']):
        off = rng.uniform(-P['TWIST'], P['TWIST']) * (k not in (0, len(P['PROFILE']) - 1))
        ring = []
        for i in range(n):
            a = 2 * math.pi * (i + off) / n
            rr = r * (1 + rng.uniform(-P['JIT'], P['JIT']) * (0.4 if k >= 8 else 1.0))
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        ring_faces(bm, a, b)
    bottom = bm.faces.new(rings[0][::-1])
    zt = P['PROFILE'][-1][1]
    inner_top = [bm.verts.new((P['INNER_R'] * math.cos(2 * math.pi * i / n), P['INNER_R'] * math.sin(2 * math.pi * i / n), zt)) for i in range(n)]
    ring_faces(bm, rings[-1], inner_top)                    # rim (cream)
    inner_bot = [bm.verts.new((v.co.x * 0.98, v.co.y * 0.98, P['FLOOR_Z'])) for v in inner_top]
    for i in range(n):
        f = bm.faces.new((inner_top[(i + 1) % n], inner_top[i], inner_bot[i], inner_bot[(i + 1) % n])); f.material_index = 1
    fl = bm.faces.new(inner_bot); fl.material_index = 1
    return obj('jar', bm, ['Ceramic_Cream', inside_mat])


def lid(rng, M):
    """Thick round lid of PLANKS strips along X; each strip's top is inset (LID_CH), so the edge is bevelled and the
    joints read as V grooves."""
    bm = bmesh.new(); R, T, ch, np_ = P['LID_R'], P['LID_T'], P['LID_CH'], P['PLANKS']
    for k in range(np_):
        y0 = -R + 2 * R * k / np_; y1 = -R + 2 * R * (k + 1) / np_
        a0, a1 = math.asin(max(-1, y0 / R)), math.asin(min(1, y1 / R))
        m = max(2, round(P['LID_SEG'] * (a1 - a0) / (2 * math.pi)) + 1)
        pts = [(R * math.cos(a0 + (a1 - a0) * j / m), R * math.sin(a0 + (a1 - a0) * j / m)) for j in range(m + 1)]
        pts += [(-x, y) for x, y in reversed(pts)]
        clean = []
        for p in pts:
            if not clean or (abs(p[0] - clean[-1][0]) + abs(p[1] - clean[-1][1])) > 1e-4:
                clean.append(p)
        if abs(clean[0][0] - clean[-1][0]) + abs(clean[0][1] - clean[-1][1]) < 1e-4:
            clean.pop()
        cx = sum(p[0] for p in clean) / len(clean); cy = sum(p[1] for p in clean) / len(clean)
        lift = rng.uniform(-0.003, 0.004)
        def ring(z, inset):
            out = []
            for x, y in clean:
                dx, dy = x - cx, y - cy; d = math.hypot(dx, dy) or 1
                out.append(bm.verts.new(M @ Vector((x - dx / d * inset, y - dy / d * inset * 1.6, z))))
            return out
        b = ring(0, 0.0); mid = ring(T - ch + lift, 0.0); top = ring(T + lift, ch)
        bm.faces.new(b[::-1]); ring_faces(bm, b, mid); ring_faces(bm, mid, top); bm.faces.new(top)
    return obj('lid', bm, ['Wood_Lid'])


def frames(pts):
    """Parallel-transport frames along a polyline."""
    T = [(pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(len(pts))]
    up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = [T[0].cross(up).normalized()]
    for i in range(1, len(pts)):
        n = N[-1] - T[i] * N[-1].dot(T[i]); N.append(n.normalized())
    return T, N


def tube(bm, pts, r, sides, twist=1.2, closed=False, taper_end=False):
    """Twisted rope: an n-gon swept along pts, rotated as it goes (the twist of the strands)."""
    T, N = frames(pts); rings = []
    for i, p in enumerate(pts):
        B = T[i].cross(N[i]); rr = r * (0.55 if taper_end and i == len(pts) - 1 else 1.0)
        rings.append([bm.verts.new(p + (N[i] * math.cos(a) + B * math.sin(a)) * rr * (1.0 if j % 2 == 0 else 0.78))
                      for j, a in enumerate(2 * math.pi * s / sides + i * twist for s in range(sides))])
    for a, b in zip(rings, rings[1:]):
        ring_faces(bm, a, b)
    if closed:
        ring_faces(bm, rings[-1], rings[0])
    else:
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])


def jar_r(z):
    pr = P['PROFILE']
    for (r0, z0), (r1, z1) in zip(pr, pr[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / max(1e-6, z1 - z0)
    return pr[-1][0]


def loop_pts(zf, n=22, lift=1.02):
    phk = math.radians(P['KNOT_PHI']); pts = []
    for i in range(n):
        ph = phk + 2 * math.pi * i / n
        z = zf(ph - phk)
        r = jar_r(z) * lift + P['ROPE_R']
        pts.append(Vector((r * math.cos(ph), r * math.sin(ph), z)))
    return pts


def at_phi(r, z, dphi=0.0):
    ph = math.radians(P['KNOT_PHI']) + dphi
    return Vector((r * math.cos(ph), r * math.sin(ph), z))


def rope(rng):
    bm = bmesh.new(); r, s = P['ROPE_R'], P['ROPE_SIDES']
    for z in P['NECK_LOOPS']:
        tube(bm, loop_pts(lambda d, z=z: z + 0.004 * math.sin(3 * d), 16), r, s, closed=True)
    zk, zo = P['SASH']
    tube(bm, loop_pts(lambda d: zk + (zo - zk) * (1 - math.cos(d)) / 2, 22, 1.03), r, s, closed=True)
    # strands from the neck knot down to the lower knot, and the loose tails
    nk = at_phi(jar_r(0.445) + 0.02, 0.445, 0.10); lk = at_phi(jar_r(P['KNOT_Z']) + P['KNOT_OUT'], P['KNOT_Z'])
    for off in (-0.012, 0.012):
        mid = (nk + lk) / 2 + at_phi(0.035, 0) .normalized() * 0.04 + Vector((0, 0, off))
        tube(bm, [nk, mid, lk], r, s)
    tail0 = lk + Vector((0, 0, -0.01))
    tube(bm, [tail0, tail0 + at_phi(0.03, -0.06, -0.15), tail0 + at_phi(0.035, -0.115, -0.25)], r, s, taper_end=True)
    tube(bm, [tail0, tail0 + at_phi(0.035, -0.045, 0.12), tail0 + at_phi(0.045, -0.085, 0.2)], r * 0.9, s, taper_end=True)
    for c, rad in ((nk, 0.028), (lk, 0.032), (lk + Vector((0, 0, -0.03)), 0.026)):   # lumpy knots
        km = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rad)
        for v in km['verts']:
            v.co = Vector((v.co.x * 1.2, v.co.y * 1.2, v.co.z)) * rng.uniform(0.8, 1.2) + c
    return obj('rope', bm, ['Rope_Jute']), lk


def lathe_pts(bm, prof, n, M, sy=1.0):
    """prof: (r, z) list, r == 0 at either end becomes a pole."""
    rings = []
    for r, z in prof:
        if r == 0:
            rings.append([bm.verts.new(M @ Vector((0, 0, z)))])
        else:
            rings.append([bm.verts.new(M @ Vector((r * math.cos(2 * math.pi * i / n), sy * r * math.sin(2 * math.pi * i / n), z))) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1:
            for i in range(n):
                bm.faces.new((a[0], b[(i + 1) % n], b[i]))
        elif len(b) == 1:
            for i in range(n):
                bm.faces.new((a[i], a[(i + 1) % n], b[0]))
        else:
            ring_faces(bm, b, a)
    return rings


def scoop(knot, filled):
    """Bowl down by the ground, opening to the front-left, handle up to the knot."""
    c = Vector(P['SCOOP_BOWL']); rx, ry, d = P['SCOOP_SIZE']
    up = (knot - c).normalized()                                    # local +Y: along the handle
    nz = Vector(P['SCOOP_N']).normalized(); nz = (nz - up * nz.dot(up)).normalized()   # local +Z: the opening
    nx = up.cross(nz)
    M = Matrix((nx, up, nz)).transposed().to_4x4(); M.translation = c - nz * d * 0.5
    bm = bmesh.new(); s = ry / rx
    lathe_pts(bm, [(0, 0), (rx * 0.62, d * 0.12), (rx * 0.92, d * 0.5), (rx, d), (rx * 0.80, d * 1.02),
                   (rx * 0.66, d * 0.55), (rx * 0.40, d * 0.30), (0, d * 0.28)], 9, M, s)
    # handle: a tapered bar from the bowl rim up to the knot
    a = c + up * ry * 0.95 + nz * d * 0.25; b = knot - up * 0.01
    w, t = P['HANDLE']; side = nx; fwd = nz
    q = []
    for p, k in ((a, 1.15), (b, 0.85)):
        q.append([bm.verts.new(p + side * sx * w / 2 * k + fwd * sz * t / 2) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    bm.faces.new(q[0][::-1]); ring_faces(bm, q[0], q[1]); bm.faces.new(q[1])
    o = obj('scoop', bm, ['Wood_Scoop'])
    g = None
    if filled:                                                      # a heap of grain in the bowl
        gb = bmesh.new()
        lathe_pts(gb, [(rx * 0.78, d * 0.86), (rx * 0.45, d * 1.15), (0, d * 1.28)], 7, M, s)
        gb.faces.new([v for v in gb.verts][:7][::-1])
        g = obj('grain_scoop', gb, ['Feed_Grain'])
    return o, g


def grain(z, rng):
    """Feed surface inside the neck: a low jittered mound."""
    bm = bmesh.new(); n = P['SEG']; r = P['INNER_R'] * 0.96
    outer = [bm.verts.new((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
    midr = [bm.verts.new((0.6 * r * math.cos(2 * math.pi * (i + .5) / n), 0.6 * r * math.sin(2 * math.pi * (i + .5) / n), z + 0.018 + rng.uniform(0, 0.01))) for i in range(n)]
    top = bm.verts.new((0, 0, z + 0.032))
    for i in range(n):
        bm.faces.new((outer[i], outer[(i + 1) % n], midr[i])); bm.faces.new((outer[(i + 1) % n], midr[(i + 1) % n], midr[i]))
        bm.faces.new((midr[i], midr[(i + 1) % n], top))
    bm.faces.new(outer[::-1])
    return obj('grain', bm, ['Feed_Grain'])


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()
    rng = random.Random(7)
    jar(rng, 'Ceramic_Inside')
    if state in ('full', 'carried'):
        lid(rng, Matrix.Translation((P['LID_DX'], 0, P['LID_Z'])) @ Matrix.Rotation(math.radians(4), 4, 'Z'))
    else:
        z0, tilt = P['LID_OFF']; t = math.radians(tilt); R = P['LID_R']
        y0 = jar_r(z0)                                       # contact on the back shoulder; plank tops face the front
        c = Vector((0, y0 + R * math.cos(t) + P['LID_T'] * math.sin(t), z0 + R * math.sin(t)))
        lid(rng, Matrix.Translation(c) @ Matrix.Rotation(t, 4, 'X'))
    _, knot = rope(rng)
    scoop(knot, state == 'partial')
    if P['GRAIN_Z'].get(state):
        grain(P['GRAIN_Z'][state], rng)
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co.z *= P['H_SCALE']


def tris():
    n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.data.calc_loop_triangles(); n += len(o.data.loop_triangles)
    return n


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def main():
    states = [a for a in sys.argv[1:] if a in STATES] or STATES
    for s in states:
        build(s)
        print(s, 'triangles', tris())
        export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'full':
            export(os.path.join(HERE, 'ration-jar.glb'))


if __name__ == '__main__':
    main()

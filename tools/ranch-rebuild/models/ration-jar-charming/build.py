"""ration-jar-charming: the storybook-toy twin of ration-jar. A plump, egg-bellied cream clay jar (smooth and a little
lumpy, as if pressed by hand), a rolled lip at the neck, a fat round wooden lid that overhangs it and sits a touch askew,
one chunky twisted jute rope round the neck tied in a big bow on the front-left, and a long wooden spoon whose handle
hangs from the bow and whose deep bowl rests on the ground, leaning on the jar.

usage: python build.py           builds every fill state, writes ration-jar-charming.glb (= full) and variants/<state>.glb
       python build.py partial   builds and exports one state only

Same conventions and states as ../ration-jar: Z up, metres, origin at the footprint centre on the ground, front faces
-Y, spoon on the -X side. All shape numbers live in P.
States: full (lid on, as the hero), partial (lid off, propped on the back shoulder; grain down in the neck and a heap in
the spoon), empty (lid off and propped, dark empty inside, empty spoon), carried (the full jar, lid on).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'ration-jar-charming'

P = dict(
    H_SCALE=1.00,
    R_SCALE=1.07,        # widen every jar radius in PROFILE
    SEG=16,              # sides round the jar (smooth shaded)
    PROFILE=[            # (radius, z) of the outer jar wall, foot to rim: egg belly, tucked shoulder, rolled lip
        (0.176, 0.000), (0.187, 0.018), (0.194, 0.058), (0.199, 0.125), (0.204, 0.195), (0.204, 0.250),
        (0.199, 0.305), (0.186, 0.352), (0.168, 0.396), (0.146, 0.428), (0.128, 0.447), (0.124, 0.462),
        (0.127, 0.478), (0.137, 0.490), (0.142, 0.504), (0.137, 0.518), (0.126, 0.524),
    ],
    LUMP=0.022,          # soft hand-pressed lumps (radial, smooth noise)
    LEAN=(1.5, -1.0),    # degrees the jar leans: about Y (towards -X, the spoon side), about X (towards the front)
    INNER_R=0.100,       # mouth (inside of the neck)
    FLOOR_Z=0.07,
    LID_R=0.146, LID_Z=0.522, LID_DX=-0.006, LID_T=0.052, LID_SEG=20, LID_TILT=3.0,   # tilt in degrees (askew, toy-like)
    ROPE_R=0.0115, ROPE_SIDES=5, ROPE_Z=0.462, ROPE_PTS=22,
    KNOT_PHI=212.0,                     # bow direction (deg, 180 = -X, more = towards the front)
    LOOPS=[((-0.85, -0.30, 0.55), 0.082, 0.028), ((-0.92, -0.25, -0.18), 0.074, 0.026)],   # bow loops: dir, length, half-width
    TAILS=[(0.0, 0.085), (0.22, 0.065)],                       # bow tails: extra phi (rad) at the end, drop
    SPOON_BOWL=(-0.262, -0.125, 0.088),  # bowl centre
    SPOON_N=(-0.25, -0.95, 0.35),        # bowl opening direction
    SPOON_SIZE=(0.078, 0.102, 0.058),    # bowl radius across, radius along the handle, depth
    HANDLE_R=(0.020, 0.014), KNOB_R=0.020,
    HANDLE_TOP=(-0.155, -0.075, 0.405),   # where the handle ends, under the bow
    GRAIN_Z={'partial': 0.445, 'empty': None, 'full': None, 'carried': None},
    LID_OFF=(0.385, 80.0),               # propped lid: z where its lower edge rests on the back shoulder, tilt (deg)
)

P['PROFILE'] = [(r * P['R_SCALE'], z) for r, z in P['PROFILE']]

COL = {  # sRGB, sampled from the charming hero's mid tones
    'Ceramic_Cream': (216, 194, 156), 'Ceramic_Inside': (132, 108, 80), 'Wood_Lid': (132, 74, 46),
    'Wood_Scoop': (156, 90, 54), 'Rope_Jute': (190, 140, 88), 'Feed_Grain': (220, 174, 86),
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


def obj(name, bm, mats, sharp=45):
    """Smooth shaded, with edges sharper than `sharp` degrees kept hard (None: flat)."""
    me = bpy.data.meshes.new(name); bm.normal_update(); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(mat(m))
    for p in me.polygons:
        p.use_smooth = sharp is not None
    if sharp is not None:
        me.set_sharp_from_angle(angle=math.radians(sharp))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def ring_faces(bm, a, b, mi=0):
    n = len(a)
    for i in range(n):
        f = bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])); f.material_index = mi


def lump(a, z):
    """Soft low-frequency wobble, so the clay looks hand-pressed rather than lathed."""
    return 1 + P['LUMP'] * (0.6 * math.sin(2 * a + 7 * z + 0.5) + 0.4 * math.sin(3 * a - 11 * z + 1.7))


def jar(inside_mat):
    """Smooth lathe: outer wall, rim, inner neck wall down to an inner floor. Material 0 outside, 1 inside."""
    bm = bmesh.new(); n = P['SEG']; rings = []
    for k, (r, z) in enumerate(P['PROFILE']):
        ring = []
        for i in range(n):
            a = 2 * math.pi * i / n
            rr = r * (lump(a, z) if k < 10 else 1.0)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        ring_faces(bm, a, b)
    bm.faces.new(rings[0][::-1])
    zt = P['PROFILE'][-1][1]
    inner_top = [bm.verts.new((P['INNER_R'] * math.cos(2 * math.pi * i / n), P['INNER_R'] * math.sin(2 * math.pi * i / n), zt - 0.004)) for i in range(n)]
    ring_faces(bm, rings[-1], inner_top)                    # rim (cream)
    inner_bot = [bm.verts.new((v.co.x * 0.98, v.co.y * 0.98, P['FLOOR_Z'])) for v in inner_top]
    for i in range(n):
        f = bm.faces.new((inner_top[(i + 1) % n], inner_top[i], inner_bot[i], inner_bot[(i + 1) % n])); f.material_index = 1
    fl = bm.faces.new(inner_bot); fl.material_index = 1
    return obj('jar', bm, ['Ceramic_Cream', inside_mat], sharp=60)


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


def lid(M):
    """A fat round wooden lid with a soft rounded edge and a slightly domed top."""
    bm = bmesh.new(); R, T = P['LID_R'], P['LID_T']
    lathe_pts(bm, [(0, 0), (R * 0.93, 0), (R, T * 0.22), (R * 1.01, T * 0.55), (R * 0.985, T * 0.86), (R * 0.93, T),
                   (R * 0.5, T * 1.06), (0, T * 1.08)], P['LID_SEG'], M)
    return obj('lid', bm, ['Wood_Lid'], sharp=50)


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
        B = T[i].cross(N[i]); rr = r * (0.6 if taper_end and i == len(pts) - 1 else 1.0)
        rings.append([bm.verts.new(p + (N[i] * math.cos(a) + B * math.sin(a)) * rr * (1.0 if j % 2 == 0 else 0.8))
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


def at_phi(r, z, dphi=0.0):
    ph = math.radians(P['KNOT_PHI']) + dphi
    return Vector((r * math.cos(ph), r * math.sin(ph), z))


def rope(rng):
    bm = bmesh.new(); r, s, z0 = P['ROPE_R'], P['ROPE_SIDES'], P['ROPE_Z']; n = P['ROPE_PTS']
    phk = math.radians(P['KNOT_PHI'])
    pts = []
    for i in range(n):
        ph = phk + 2 * math.pi * i / n
        z = z0 + 0.004 * math.sin(2 * (ph - phk))
        rr = jar_r(z) + r * 0.9
        pts.append(Vector((rr * math.cos(ph), rr * math.sin(ph), z)))
    tube(bm, pts, r, s, closed=True)
    knot = at_phi(jar_r(z0) + r * 2.2, z0)
    out = at_phi(1.0, 0).normalized()
    for d, L, W in P['LOOPS']:                       # the bow's two loops, teardrops through the knot
        d = Vector(d).normalized(); side = d.cross(out).normalized()
        lp = []
        for j in range(12):
            t = 2 * math.pi * j / 12
            lp.append(knot + d * L * (1 - math.cos(t)) / 2 + side * W * math.sin(t) * (1 - 0.3 * math.cos(t)) + out * 0.006 * (1 - math.cos(t)))
        tube(bm, lp, r * 0.85, s, closed=True)
    for dphi, drop in P['TAILS']:                    # two tails hanging down over the shoulder
        tp = []
        for j in range(4):
            u = j / 3; z = z0 - 0.012 - drop * u
            tp.append(at_phi(jar_r(z) + r * 1.6 + 0.006 * math.sin(math.pi * u), z, dphi * u))
        tube(bm, tp, r * 0.85, s, taper_end=True)
    km = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.021)     # the plump knot
    for v in km['verts']:
        v.co = Vector((v.co.x * 1.15, v.co.y * 1.15, v.co.z * 0.95)) * rng.uniform(0.9, 1.1) + knot
    return obj('rope', bm, ['Rope_Jute'], sharp=70), knot


def spoon(filled):
    """A long wooden spoon: deep round bowl on the ground opening to the front, round handle up to the bow, knob end."""
    c = Vector(P['SPOON_BOWL']); rx, ry, d = P['SPOON_SIZE']; top = Vector(P['HANDLE_TOP'])
    up = (top - c).normalized()                                     # local +Y: along the handle
    nz = Vector(P['SPOON_N']).normalized(); nz = (nz - up * nz.dot(up)).normalized()   # local +Z: the opening
    nx = up.cross(nz)
    M = Matrix((nx, up, nz)).transposed().to_4x4(); M.translation = c - nz * d * 0.5
    bm = bmesh.new(); s = ry / rx
    lathe_pts(bm, [(0, 0), (rx * 0.60, d * 0.10), (rx * 0.90, d * 0.45), (rx, d), (rx * 0.84, d * 1.04),
                   (rx * 0.70, d * 0.60), (rx * 0.42, d * 0.36), (0, d * 0.32)], 12, M, s)
    # handle: a tapered round bar from the bowl rim up to under the bow, with a round knob
    a = c + up * ry * 0.92 + nz * d * 0.30
    pts = [a + (top - a) * t for t in (0, 0.35, 0.7, 1.0)]
    T, N = frames(pts); r0, r1 = P['HANDLE_R']; rings = []
    for i, p in enumerate(pts):
        B = T[i].cross(N[i]); rr = r0 + (r1 - r0) * i / (len(pts) - 1)
        rings.append([bm.verts.new(p + (N[i] * math.cos(2 * math.pi * k / 6) + B * math.sin(2 * math.pi * k / 6)) * rr) for k in range(6)])
    for q0, q1 in zip(rings, rings[1:]):
        ring_faces(bm, q0, q1)
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    km = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=P['KNOB_R'])
    for v in km['verts']:
        v.co = v.co + top + up * P['KNOB_R'] * 0.6
    o = obj('scoop', bm, ['Wood_Scoop'], sharp=60)
    g = None
    if filled:                                                      # a heap of grain in the bowl
        gb = bmesh.new()
        lathe_pts(gb, [(rx * 0.80, d * 0.86), (rx * 0.48, d * 1.18), (0, d * 1.32)], 8, M, s)
        gb.faces.new([v for v in gb.verts][:8][::-1])
        g = obj('grain_scoop', gb, ['Feed_Grain'], sharp=None)
    return o, g


def grain(z, rng):
    """Feed surface inside the neck: a low jittered mound."""
    bm = bmesh.new(); n = P['SEG']; r = P['INNER_R'] * 0.96
    outer = [bm.verts.new((r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
    midr = [bm.verts.new((0.6 * r * math.cos(2 * math.pi * (i + .5) / n), 0.6 * r * math.sin(2 * math.pi * (i + .5) / n), z + 0.02 + rng.uniform(0, 0.012))) for i in range(n)]
    top = bm.verts.new((0, 0, z + 0.036))
    for i in range(n):
        bm.faces.new((outer[i], outer[(i + 1) % n], midr[i])); bm.faces.new((outer[(i + 1) % n], midr[(i + 1) % n], midr[i]))
        bm.faces.new((midr[i], midr[(i + 1) % n], top))
    bm.faces.new(outer[::-1])
    return obj('grain', bm, ['Feed_Grain'], sharp=None)


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()
    rng = random.Random(7)
    parts = [jar('Ceramic_Inside')]
    if state in ('full', 'carried'):
        parts.append(lid(Matrix.Translation((P['LID_DX'], 0, P['LID_Z'])) @ Matrix.Rotation(math.radians(P['LID_TILT']), 4, Vector((1, -1, 0)).normalized())))
    else:
        z0, tilt = P['LID_OFF']; t = math.radians(tilt); R = P['LID_R']
        y0 = jar_r(z0)                                       # contact on the back shoulder; top faces the front
        c = Vector((0, y0 + R * math.cos(t) + P['LID_T'] * math.sin(t), z0 + R * math.sin(t)))
        parts.append(lid(Matrix.Translation(c) @ Matrix.Rotation(t, 4, 'X')))
    ro, knot = rope(rng); parts.append(ro)
    # the jar, lid and rope lean together a little; the spoon is placed in the leaned frame so it still meets the bow
    lean = Matrix.Rotation(math.radians(-P['LEAN'][0]), 4, 'Y') @ Matrix.Rotation(math.radians(P['LEAN'][1]), 4, 'X')
    for o in parts:
        o.data.transform(lean)
    spoon(state == 'partial')
    if P['GRAIN_Z'].get(state):
        grain(P['GRAIN_Z'][state], rng).data.transform(lean)
    zmin = min(min((v.co.z for v in o.data.vertices)) for o in bpy.context.scene.objects)
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co.z = (v.co.z - zmin) * P['H_SCALE']


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
            export(os.path.join(HERE, f'{NAME}.glb'))


if __name__ == '__main__':
    main()

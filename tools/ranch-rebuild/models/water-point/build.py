"""Water point (Ranch tile rebuild). Standalone builder: `python build.py` -> water-point.glb + variants/<state>.glb

Layout: Z up, metres, origin at the centre of the basin footprint on the ground, front faces -Y.
From the MJ hero: a square block-stone basin (darker bottom course), a timber band and stone coping round the top,
turquoise water a little below the coping. Two timber posts stand at the back corners (+Y) with knee braces and carry
a teal plank canopy (ridge along X, two overlapping courses per slope, ridge board). A cast-iron hand pump stands on the
back-right (+X,+Y) coping, its spout reaching over the water and its long curved handle sweeping out to the right
(towards +X+Y, which is screen-right from the hero camera). A stave bucket sits on the back-left coping.
States (STATE switch, one design): planned, foundation, frame, roof, complete. Water, pump and bucket are complete only.
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'water-point'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    hb=0.75,            # basin half size (x and y) at the stone face
    rows=(0.18, 0.18, 0.19),    # stone course heights, bottom (dark) first
    band_h=0.14, band_out=0.05,        # timber band on top of the stones
    cope_h=0.10, cope_out=0.075, cope_w=0.24,   # coping slabs: thickness, overhang past the stone face, ring width
    water_drop=0.065,   # water surface below the coping top
    post=0.15,          # post section
    can_c=(-0.35, 0.55),  # canopy centre (x, y): the canopy sits over the back-left of the basin, as in the hero
    can_yaw=14.0,       # canopy turned a little so its posts stand on the left (-X) and back (+Y) coping
    post_hx=0.42,       # posts at +-post_hx along the ridge (canopy-local)
    plate_z=1.9,        # top of the wall plate / tie beams
    ridge_z=2.3,        # ridge height (top of the deck at the ridge)
    eave_front=-0.5,    # front eave (canopy-local y from the ridge)
    eave_back=0.42,     # back eave
    roof_x=0.74,        # roof half length along the ridge
    pitch=0.8,          # roof rise per run (about 39 degrees)
    plank_w=0.25, plank_t=0.05, course_lap=0.1,
    pump_x=0.4, pump_y=0.64, pump_r=0.068, pump_top=1.33,
    handle_len=0.62,    # horizontal reach of the handle from the column
    bucket_x=-0.62, bucket_y=0.0, bucket_r=0.16, bucket_h=0.25,
)

if os.environ.get('WP_P'):   # parameter sweeps: WP_P='{"pitch": 0.8}'
    import json; P.update(json.loads(os.environ['WP_P']))

COLS = dict(
    Stone_Cream=(192, 188, 166), Stone_Dark=(138, 138, 122), 
    Timber_Brown=(150, 96, 56), Roof_Teal=(64, 150, 150), Water_Clear=(70, 168, 184),
    Metal_Iron=(56, 62, 64), Plank_Bucket=(150, 104, 62), Rope_Twine=(236, 226, 196),
)


def lin(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]), 1.0)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = lin(COLS[name])
        b.inputs['Roughness'].default_value = {'Metal_Iron': 0.6, 'Water_Clear': 0.3}.get(name, 0.85)
        if name == 'Metal_Iron':
            b.inputs['Metallic'].default_value = 0.4
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ mesh accumulator: one object, one material
class Part:
    def __init__(self, name, m):
        self.name = name; self.m = m; self.v = []; self.f = []

    def box(self, c, s, R=None):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = R if R is not None else Matrix.Identity(3)
        cs = [R @ Vector((x, y, z)) + Vector(c) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
        i = len(self.v); self.v += [tuple(p) for p in cs]
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            self.f.append([i + j for j in q])

    def beam(self, a, b, w, h, up=(0, 0, 1), ext=0.0):
        a = Vector(a); b = Vector(b); d = b - a; ln = d.length; x = d / ln
        a = a - x * ext; b = b + x * ext; ln += 2 * ext
        u = Vector(up); y = u.cross(x)
        if y.length < 1e-6:
            y = Vector((0, 1, 0)).cross(x)
        y.normalize(); z = x.cross(y)
        self.box(tuple((a + b) / 2), (ln, w, h), Matrix((x, y, z)).transposed())

    def cyl(self, c, r0, r1, h, n=12, cap=True, rot=0.0):
        """frustum on axis z, base centre c."""
        i = len(self.v)
        for k in range(n):
            t = rot + 2 * math.pi * k / n
            self.v.append((c[0] + r0 * math.cos(t), c[1] + r0 * math.sin(t), c[2]))
        for k in range(n):
            t = rot + 2 * math.pi * k / n
            self.v.append((c[0] + r1 * math.cos(t), c[1] + r1 * math.sin(t), c[2] + h))
        for k in range(n):
            k2 = (k + 1) % n
            self.f.append([i + k, i + k2, i + n + k2, i + n + k])
        if cap:
            self.f.append(list(range(i + n - 1, i - 1, -1))); self.f.append(list(range(i + n, i + 2 * n)))

    def ring(self, c, r_out, r_in, z0, z1, n=12):
        """a hollow cylinder (hoop, open tub wall)."""
        i = len(self.v)
        for (r, z) in ((r_out, z0), (r_out, z1), (r_in, z1), (r_in, z0)):
            for k in range(n):
                t = 2 * math.pi * k / n
                self.v.append((c[0] + r * math.cos(t), c[1] + r * math.sin(t), z))
        for s in range(4):
            a, b = s * n, ((s + 1) % 4) * n
            for k in range(n):
                k2 = (k + 1) % n
                self.f.append([i + a + k, i + a + k2, i + b + k2, i + b + k])

    def tube(self, pts, r, n=8, cap=True):
        """sweep a circle along a polyline (parallel-transport frames). r may be a list per point."""
        pts = [Vector(p) for p in pts]
        rs = r if isinstance(r, (list, tuple)) else [r] * len(pts)
        tans = []
        for k in range(len(pts)):
            a = pts[max(k - 1, 0)]; b = pts[min(k + 1, len(pts) - 1)]
            tans.append((b - a).normalized())
        ref = Vector((0, 0, 1)) if abs(tans[0].z) < 0.9 else Vector((1, 0, 0))
        nrm = tans[0].cross(ref).normalized()
        i = len(self.v)
        for k, (p, t) in enumerate(zip(pts, tans)):
            nrm = (nrm - t * nrm.dot(t)).normalized(); bi = t.cross(nrm)
            for j in range(n):
                a = 2 * math.pi * j / n
                self.v.append(tuple(p + (nrm * math.cos(a) + bi * math.sin(a)) * rs[k]))
        for k in range(len(pts) - 1):
            for j in range(n):
                j2 = (j + 1) % n
                self.f.append([i + k * n + j, i + k * n + j2, i + (k + 1) * n + j2, i + (k + 1) * n + j])
        if cap:
            self.f.append(list(range(i + n - 1, i - 1, -1)))
            e = i + (len(pts) - 1) * n; self.f.append(list(range(e, e + n)))


PARTS = {}


def part(name, m):
    k = (name, m)
    if k not in PARTS:
        PARTS[k] = Part(name, m)
    return PARTS[k]


def realize():
    objs = []
    for (name, m), p in PARTS.items():
        if not p.f:
            continue
        me = bpy.data.meshes.new(name)
        me.from_pydata(p.v, [], p.f)
        me.materials.append(mat(m))
        me.validate(); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for f in me.polygons:
            f.use_smooth = False
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        objs.append(o)
    return objs


# ------------------------------------------------------------------ heights
def H():
    r = P['rows']; z_st = sum(r)
    z_band = z_st + P['band_h']
    z_cope = z_band + P['cope_h']
    return r, z_st, z_band, z_cope


def face_blocks(prt, rnd, z0, h, row, mat_dark=False):
    """one course of blocks on all four faces of the basin, running bond."""
    hb = P['hb']
    for face in range(4):
        ln = 2 * hb + 0.04
        s = -ln / 2
        first = True
        while s < ln / 2 - 0.04:
            w = rnd.uniform(0.34, 0.46)
            if first and (row + face) % 2 == 1:
                w = rnd.uniform(0.16, 0.24)
            first = False
            e = min(s + w, ln / 2)
            if ln / 2 - e < 0.12:
                e = ln / 2
            c = (s + e) / 2; zc = z0 + h / 2
            hg = h - 0.03 + rnd.uniform(-0.01, 0.01); dep = 0.1
            out = rnd.uniform(-0.006, 0.016) + (0.015 if mat_dark else 0.0)
            tilt = Matrix.Rotation(rnd.uniform(-0.035, 0.035), 3, 'X') @ Matrix.Rotation(rnd.uniform(-0.03, 0.03), 3, 'Y')
            L = e - s - 0.03
            d = hb - dep / 2 + 0.03 + out
            if face == 0:
                prt.box((c, -d, zc), (L, dep, hg), tilt)
            elif face == 1:
                prt.box((-c, d, zc), (L, dep, hg), tilt)
            elif face == 2:
                prt.box((-d, -c, zc), (dep, L, hg), tilt)
            else:
                prt.box((d, c, zc), (dep, L, hg), tilt)
            s = e


def foundation(rnd):
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    core = part('basin_core', 'Stone_Dark')
    core.box((0, 0, r[0] / 2), (2 * hb - 0.02, 2 * hb - 0.02, r[0]))
    face_blocks(part('stones_bottom', 'Stone_Dark'), rnd, 0.0, r[0], 0, True)


def basin(rnd):
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    core = part('basin_core', 'Stone_Dark')
    core.box((0, 0, r[0] + (z_band - r[0]) / 2), (2 * hb - 0.02, 2 * hb - 0.02, z_band - r[0]))
    st = part('stones_wall', 'Stone_Cream')
    z = r[0]
    for k, h in enumerate(r[1:]):
        face_blocks(st, rnd, z, h, k + 1); z += h
    # timber band: four boards with mitred-looking corners (just overlapped)
    bd = part('rim_band', 'Timber_Brown'); o = hb + P['band_out']; zc = z_st + P['band_h'] / 2
    t = 0.07
    bd.box((0, -o + t / 2, zc), (2 * o, t, P['band_h'])); bd.box((0, o - t / 2, zc), (2 * o, t, P['band_h']))
    bd.box((-o + t / 2, 0, zc), (t, 2 * o - 2 * t, P['band_h'])); bd.box((o - t / 2, 0, zc), (t, 2 * o - 2 * t, P['band_h']))
    # bolt heads on the band
    bolt = part('rim_bolts', 'Metal_Iron')
    for s in (-0.42, 0.42):
        bolt.box((s, -o - 0.006, zc), (0.035, 0.02, 0.035)); bolt.box((o + 0.006, s, zc), (0.02, 0.035, 0.035))
    # coping: slabs round the top, slightly irregular, inner faces show above the water
    cp = part('rim_coping', 'Stone_Cream')
    co = hb + P['cope_out']; w = P['cope_w']; ci = co - w
    zb = z_band
    hh = z_cope - zb
    for side in range(4):
        n = 3
        span = 2 * co if side < 2 else 2 * ci
        for k in range(n):
            a = -span / 2 + span * k / n + 0.008; b = -span / 2 + span * (k + 1) / n - 0.008
            c = (a + b) / 2; ln = b - a; dz = rnd.uniform(-0.008, 0.01)
            if side == 0:
                cp.box((c, -co + w / 2, zb + hh / 2 + dz), (ln, w, hh))
            elif side == 1:
                cp.box((c, co - w / 2, zb + hh / 2 + dz), (ln, w, hh))
            elif side == 2:
                cp.box((-co + w / 2, c, zb + hh / 2 + dz), (w, ln, hh))
            else:
                cp.box((co - w / 2, c, zb + hh / 2 + dz), (w, ln, hh))
    # water: a slab inside the coping ring
    wt = part('water', 'Water_Clear')
    zw = z_cope - P['water_drop']
    wt.box((0, 0, zw - 0.05), (2 * ci + 0.01, 2 * ci + 0.01, 0.1))


def cf(x, y, z):
    """canopy-local (x along the ridge, y towards the back, z up) -> world."""
    a = math.radians(P['can_yaw'])
    cx, cy = P['can_c']
    return Vector((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a), z))


def cdir(x, y, z):
    a = math.radians(P['can_yaw'])
    return Vector((x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a), z))


def frame(rnd):
    r, z_st, z_band, z_cope = H()
    tb = part('frame_timber', 'Timber_Brown')
    ps, hx = P['post'], P['post_hx']; zp = P['plate_z']
    ux = tuple(cdir(1, 0, 0)); uy = tuple(cdir(0, 1, 0))
    rx = P['roof_x']; ef, eb = P['eave_front'], P['eave_back']
    for sx in (-1, 1):
        tb.beam(tuple(cf(sx * hx, 0, 0.0)), tuple(cf(sx * hx, 0, zp)), ps, ps, up=uy)
    # wall plate along the ridge line, tie beams across at each post (carry both slopes)
    tb.beam(tuple(cf(-rx + 0.08, 0, zp - 0.07)), tuple(cf(rx - 0.08, 0, zp - 0.07)), 0.13, 0.14)
    for sx in (-1, 1):
        tb.beam(tuple(cf(sx * hx, ef + 0.12, zp - 0.2)), tuple(cf(sx * hx, eb - 0.1, zp - 0.2)), 0.12, 0.13)
    # knee braces: outward and inward along the ridge, forward and back across it
    zb0 = zp - 0.55
    for sx in (-1, 1):
        x = sx * hx
        bo = min(0.4, P['roof_x'] - hx - 0.1)
        tb.beam(tuple(cf(x, 0, zp - 0.12 - bo * 1.2)), tuple(cf(x + sx * bo, 0, zp - 0.12)), 0.09, 0.09, up=uy)
        tb.beam(tuple(cf(x, 0, zb0 + 0.08)), tuple(cf(x - sx * 0.32, 0, zp - 0.12)), 0.08, 0.08, up=uy)
        tb.beam(tuple(cf(x, 0, zb0 - 0.04)), tuple(cf(x, ef * 0.75, zp - 0.24)), 0.09, 0.09, up=ux)
        tb.beam(tuple(cf(x, 0, zb0 + 0.06)), tuple(cf(x, eb * 0.75, zp - 0.24)), 0.08, 0.08, up=ux)
    # rafters under the planks at each post line, eave purlins and a ridge beam
    rz = P['ridge_z'] - P['plank_t'] - 0.05; k = slope()
    for ey in (ef + 0.06, eb - 0.06):
        ez = rz - abs(ey) * k
        for sx in (-1, 1):
            tb.beam(tuple(cf(sx * (hx + 0.02), 0, rz)), tuple(cf(sx * (hx + 0.02), ey, ez)), 0.1, 0.1, up=(0, 0, 1))
        tb.beam(tuple(cf(-rx + 0.08, ey, ez - 0.02)), tuple(cf(rx - 0.08, ey, ez - 0.02)), 0.08, 0.08)
    tb.beam(tuple(cf(-rx + 0.04, 0, rz - 0.03)), tuple(cf(rx - 0.04, 0, rz - 0.03)), 0.1, 0.12)


def slope():
    return P['pitch']   # rise per run


def roof(rnd):
    rf = part('roof_planks', 'Roof_Teal')
    rz = P['ridge_z']; k = slope(); t = P['plank_t']; rx = P['roof_x']
    a = math.atan(k)
    for sgn, ey in ((-1, P['eave_front']), (1, P['eave_back'])):
        run = abs(ey)
        d = Vector((0, sgn * math.cos(a), -math.sin(a)))          # down-slope unit vector (canopy-local)
        nrm = Vector((0, sgn * math.sin(a), math.cos(a)))         # deck normal
        L = run / math.cos(a) + 0.05
        top = Vector((0, 0, rz))
        # two courses: the lower course sits on the deck, the upper course laps over it
        split = L * 0.5
        for course, (s0, s1, lift) in enumerate(((split - P['course_lap'], L, 0.0), (0.0, split + 0.02, t * 0.9))):
            x = -rx
            while x < rx - 0.05:
                w = P['plank_w'] * rnd.uniform(0.82, 1.18)
                xe = min(x + w, rx)
                if rx - xe < 0.1:
                    xe = rx
                xc = (x + xe) / 2
                e1 = s1 + rnd.uniform(-0.04, 0.03) if course == 0 else s1
                pa = top + d * s0 + nrm * (t / 2 + lift); pb = top + d * e1 + nrm * (t / 2 + lift)
                tw = rnd.uniform(-0.03, 0.03)
                n2 = nrm + Vector((tw, 0, 0))
                rf.beam(tuple(cf(xc, pa.y, pa.z)), tuple(cf(xc, pb.y, pb.z)), xe - x - 0.018, t, up=tuple(cdir(*n2)))
                x = xe
    # ridge board: a chunky cap along the ridge
    rf.beam(tuple(cf(-rx - 0.05, 0, rz + t * 2 + 0.03)), tuple(cf(rx + 0.05, 0, rz + t * 2 + 0.03)), 0.24, 0.1)


def pump(rnd):
    r, z_st, z_band, z_cope = H()
    ir = part('pump', 'Metal_Iron')
    cx, cy, R = P['pump_x'], P['pump_y'], P['pump_r']; z0 = z_cope
    ir.box((cx, cy, z0 + 0.02), (0.24, 0.22, 0.04))                         # base plate
    ir.cyl((cx, cy, z0 + 0.04), R + 0.05, R + 0.03, 0.05, n=8)               # flange
    zt = P['pump_top']
    ir.cyl((cx, cy, z0 + 0.09), R + 0.012, R + 0.004, zt - 0.26 - z0 - 0.09, n=10)  # barrel
    ir.cyl((cx, cy, zt - 0.26), R + 0.03, R + 0.03, 0.05, n=10)              # collar
    ir.cyl((cx, cy, zt - 0.21), R - 0.008, R - 0.012, 0.15, n=10)            # upper column
    ir.cyl((cx, cy, zt - 0.08), R + 0.022, R + 0.022, 0.045, n=10)           # upper collar
    ir.cyl((cx, cy, zt - 0.035), R - 0.01, R - 0.03, 0.05, n=10)             # cap
    ir.cyl((cx, cy, z0 + 0.13), R + 0.028, R + 0.028, 0.04, n=10)            # base collar
    # spout towards the basin centre, then down
    d = Vector((-cx, -cy, 0)).normalized(); c = Vector((cx, cy, 0))
    zs = z0 + 0.3
    sp = [c + d * 0.02 + Vector((0, 0, zs)), c + d * 0.2 + Vector((0, 0, zs + 0.01)), c + d * 0.3 + Vector((0, 0, zs - 0.01)),
          c + d * 0.36 + Vector((0, 0, zs - 0.05)), c + d * 0.37 + Vector((0, 0, zs - 0.1))]
    ir.tube(sp, [0.04, 0.036, 0.036, 0.04, 0.042], n=8)
    # a little air-vent knob on the spout
    ir.cyl(tuple(c + d * 0.2 + Vector((0, 0, zs + 0.03))), 0.012, 0.012, 0.07, n=6)
    ir.cyl(tuple(c + d * 0.2 + Vector((0, 0, zs + 0.1))), 0.022, 0.02, 0.03, n=6)
    # handle: pivots on a bracket above the cap, arcs up and sweeps out and down to screen-right (+x+y)
    h = Vector((0.78, 0.62, 0)).normalized()
    piv = c - h * 0.07 + Vector((0, 0, zt + 0.3))
    ir.beam(tuple(c - h * 0.07 + Vector((0, 0, zt - 0.02))), tuple(piv), 0.035, 0.05, up=(h.x, h.y, 0))   # pivot post
    ir.beam(tuple(c + h * 0.05 + Vector((0, 0, zt - 0.02))), tuple(c + h * 0.05 + Vector((0, 0, zt + 0.36))), 0.025, 0.03, up=(h.x, h.y, 0))  # pump rod
    hl = P['handle_len']
    prof = [(-0.07, 0.3), (0.0, 0.42), (0.07, 0.46), (0.13, 0.42), (0.18, 0.28), (0.22, 0.08), (0.27, -0.12),
            (0.33, -0.28), (0.42, -0.38), (0.55, -0.43), (hl - 0.1, -0.45)]
    path = [c + h * s + Vector((0, 0, zt + z)) for s, z in prof]
    ir.tube(path, [0.032] * 7 + [0.029, 0.027, 0.027, 0.029], n=8)
    gr = part('pump_grip', 'Timber_Brown')
    g0 = c + h * (hl - 0.11) + Vector((0, 0, zt - 0.45)); g1 = c + h * (hl + 0.07) + Vector((0, 0, zt - 0.445))
    gr.tube([g0, (g0 + g1) / 2, g1], [0.03, 0.033, 0.028], n=8)
    # stream of water from the spout to the surface
    wt = part('water_stream', 'Water_Clear')
    zw = z_cope - P['water_drop']
    tip = c + d * 0.37
    wt.tube([tip + Vector((0, 0, zs - 0.12)), tip + Vector((0, 0, (zs + zw) / 2)), tip + Vector((0, 0, zw + 0.005))],
            [0.022, 0.018, 0.03], n=6)
    wt.cyl((tip.x, tip.y, zw - 0.005), 0.07, 0.03, 0.025, n=8)               # splash


def bucket(rnd):
    r, z_st, z_band, z_cope = H()
    bk = part('bucket', 'Plank_Bucket')
    cx, cy, R, h = P['bucket_x'], P['bucket_y'], P['bucket_r'], P['bucket_h']; z0 = z_cope
    n = 12
    i = len(bk.v)
    rb, rt, th = R * 0.84, R, 0.022
    for (rr, z) in ((rb, z0), (rt, z0 + h), (rt - th, z0 + h), (rb - th, z0 + 0.03)):
        for k in range(n):
            t = 2 * math.pi * (k + 0.5) / n
            bk.v.append((cx + rr * math.cos(t), cy + rr * math.sin(t), z))
    for s in range(3):
        for k in range(n):
            k2 = (k + 1) % n
            bk.f.append([i + s * n + k, i + s * n + k2, i + (s + 1) * n + k2, i + (s + 1) * n + k])
    bk.f.append(list(range(i + n - 1, i - 1, -1))); bk.f.append(list(range(i + 3 * n, i + 4 * n)))
    hp = part('bucket_hoops', 'Metal_Iron')
    for zf in (0.2, 0.68):
        z = z0 + h * zf; rr = rb + (rt - rb) * zf
        hp.ring((cx, cy), rr + 0.012, rr - 0.004, z - 0.014, z + 0.014, n=n)


def planned(rnd):
    hb = P['hb'] + 0.06
    stk = part('stakes', 'Timber_Brown'); ln = part('string_lines', 'Rope_Twine')
    zl = 0.32
    for sx in (-1, 1):
        for sy in (-1, 1):
            stk.box((sx * hb, sy * hb, 0.2), (0.06, 0.06, 0.4))
    for sy in (-1, 1):
        ln.beam((-hb - 0.15, sy * hb, zl), (hb + 0.15, sy * hb, zl), 0.015, 0.015)
    for sx in (-1, 1):
        ln.beam((sx * hb, -hb - 0.15, zl), (sx * hb, hb + 0.15, zl), 0.015, 0.015)
    # post marker pegs and a chalk outline on the ground
    for sx in (-1, 1):
        stk.box(tuple(cf(sx * P['post_hx'], 0, 0.12)), (0.05, 0.05, 0.24))
    w = 0.05
    ln.box((0, -hb, 0.01), (2 * hb, w, 0.02)); ln.box((0, hb, 0.01), (2 * hb, w, 0.02))
    ln.box((-hb, 0, 0.01), (w, 2 * hb, 0.02)); ln.box((hb, 0, 0.01), (w, 2 * hb, 0.02))


def build(state):
    PARTS.clear(); MATS.clear()
    if state == 'planned':
        planned(random.Random(1))
        return realize()
    foundation(random.Random(3))
    if state in ('frame', 'roof', 'complete'):
        frame(random.Random(5))
    if state in ('roof', 'complete'):
        roof(random.Random(7))
    if state == 'complete':
        basin(random.Random(9))
        pump(random.Random(11))
        bucket(random.Random(13))
    return realize()


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def main():
    os.makedirs(os.path.join(HERE, 'variants'), exist_ok=True)
    stats = {}
    for st in STATES:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        objs = build(st)
        tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
        stats[st] = tris
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'complete':
            export(os.path.join(HERE, f'{NAME}.glb'))
    print('triangles', stats)


if __name__ == '__main__':
    main()

"""Water point, CHARMING style (Ranch tile rebuild). Standalone builder:
`python build.py` -> water-point-charming.glb + variants/<state>.glb

Storybook-toy twin of models/water-point: same states, origin, orientation, material names and a near-square
footprint, reshaped to the charming hero (mj/water-point-charming/hero.png): a chubby square stone cistern with
softly bulging walls between four flared corner buttresses, a thick soft-edged timber rim on top, a little arched
door and a window on the +X side, a big friendly cast-iron pump on a round stone pedestal on the left (-X) rim with
an oversized looping handle, a chunky stave bucket on the front-left corner, and a tall teal shingle canopy on two
leaning posts at the back whose ridge sags like a smile and runs crooked (higher at the +X end).

Layout: Z up, metres, origin at the centre of the basin footprint on the ground, front faces -Y.
Hero camera is +X/-Y (as for the normal model): the front (-Y) face is screen-left, the door (+X) face screen-right.
States (STATE switch, one design): planned, foundation, frame, roof, complete. Water, pump, bucket, door: complete only.
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'water-point-charming'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    hb=0.84,            # basin half size at the stone face
    rows=(0.24, 0.26, 0.26),    # stone course heights, bottom (dark) first
    bulge=0.045,        # how far the middle of each wall swells out (soft bulging walls)
    pil_top=0.17, pil_bot=0.23, pil_out=0.06,   # corner buttress half widths (top, foot) and how proud they stand
    band_h=0.20, band_out=0.08, band_w=0.24,    # timber rim: thickness, overhang past the stone face, ring width
    water_drop=0.13,    # water surface below the rim top
    post=0.17,          # post section (chunky)
    lean=2.5,           # posts lean towards +X (degrees)
    can_c=(0.0, 0.70),  # canopy centre (x, y): posts on the back rim
    post_hx=0.52,       # posts at +-post_hx along the ridge (canopy-local)
    plate_z=2.12,       # top of the tie beams
    ridge_z=2.70,       # ridge height at the middle (top of the deck)
    ridge_tilt=0.08,    # ridge rises this much per metre towards +X (crooked roofline)
    ridge_smile=0.07,   # ridge ends this much higher than the middle (sagging, smiling ridge)
    eave_front=-0.70, drop_front=0.70,   # front slope: run and drop
    eave_back=0.26, drop_back=0.55,      # back slope (short and steep, as the hero's gable)
    roof_x=0.60,        # roof half length along the ridge
    courses_front=4, courses_back=3,
    shingle_w=0.31, shingle_t=0.06,
    pump_x=-0.64, pump_y=0.04, pump_r=0.1, pump_h=0.58,  # pump on a round pedestal on the -X rim
    handle_reach=0.62,
    handle_yaw=25.0,    # handle swings this far from -Y towards -X  # handle sweeps this far towards -Y from the column
    handle_peak=0.98,   # handle loop top above the rim
    bucket_x=-0.68, bucket_y=-0.52, bucket_r=0.24, bucket_h=0.32, bucket_tilt=6.0,
    door_y=-0.04, door_w=0.42, door_h=0.62,
    win_y=0.48, win_w=0.15, win_h=0.22,
)

if os.environ.get('WP_P'):   # parameter sweeps: WP_P='{"lean": 4}'
    import json; P.update(json.loads(os.environ['WP_P']))

COLS = dict(
    Stone_Cream=(146, 158, 146), Stone_Dark=(104, 120, 114),
    Timber_Brown=(186, 148, 104), Roof_Teal=(62, 150, 150), Water_Clear=(84, 196, 206),
    Metal_Iron=(58, 82, 88), Plank_Bucket=(146, 96, 58), Rope_Twine=(236, 226, 196),
    Plank_Door=(196, 146, 96), Glass_Window=(110, 200, 214),
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
        b.inputs['Roughness'].default_value = {'Metal_Iron': 0.6, 'Water_Clear': 0.3, 'Glass_Window': 0.3}.get(name, 0.85)
        if name == 'Metal_Iron':
            b.inputs['Metallic'].default_value = 0.35
        MATS[name] = m
    return MATS[name]


# soft toy bevels, applied on export: part name -> bevel width (one segment)
BEVEL = dict(stones_wall=0.03, stones_bottom=0.035, pillars=0.035, rim_band=0.035, rim_coping=0.02,
             frame_timber=0.025, roof_planks=0.018, ridge_board=0.03, pedestal=0.03, door=0.015)


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

    def cyl(self, c, r0, r1, h, n=12, cap=True, rot=0.0, R=None):
        """frustum on axis z (or R @ z), base centre c."""
        R = R if R is not None else Matrix.Identity(3)
        c = Vector(c); i = len(self.v)
        for (r, z) in ((r0, 0.0), (r1, h)):
            for k in range(n):
                t = rot + 2 * math.pi * k / n
                self.v.append(tuple(c + R @ Vector((r * math.cos(t), r * math.sin(t), z))))
        for k in range(n):
            k2 = (k + 1) % n
            self.f.append([i + k, i + k2, i + n + k2, i + n + k])
        if cap:
            self.f.append(list(range(i + n - 1, i - 1, -1))); self.f.append(list(range(i + n, i + 2 * n)))

    def ring(self, c, r_out, r_in, z0, z1, n=12, R=None, rot=0.0):
        """a hollow cylinder (hoop, open tub wall), axis R @ z through c."""
        R = R if R is not None else Matrix.Identity(3)
        c = Vector(c); i = len(self.v)
        for (r, z) in ((r_out, z0), (r_out, z1), (r_in, z1), (r_in, z0)):
            for k in range(n):
                t = rot + 2 * math.pi * k / n
                self.v.append(tuple(c + R @ Vector((r * math.cos(t), r * math.sin(t), z))))
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
        if name in BEVEL:
            md = o.modifiers.new('bevel', 'BEVEL'); md.width = BEVEL[name]; md.segments = 1
            md.limit_method = 'ANGLE'; md.angle_limit = math.radians(40); md.use_clamp_overlap = True
        objs.append(o)
    return objs


# ------------------------------------------------------------------ heights
def H():
    r = P['rows']; z_st = sum(r)
    z_band = z_st + P['band_h']          # top of the timber rim
    z_cope = z_band                       # the rim is the top of the basin (water, pump and bucket sit from here)
    return r, z_st, z_band, z_cope


def wall_out(c):
    """outward swell of a wall at position c along it (0 at the corners, bulge in the middle)."""
    u = max(0.0, 1 - (c / P['hb']) ** 2)
    return P['bulge'] * u


def openings():
    """wall openings on the +X face (face 3), as (y0, y1, z0, z1): the door and the window."""
    r, z_st, z_band, z_cope = H()
    dy, dw = P['door_y'], P['door_w']; wy, ww, wh = P['win_y'], P['win_w'], P['win_h']; wz = z_st - 0.08 - wh / 2
    return [(dy - dw / 2 - 0.07, dy + dw / 2 + 0.07, -1, 0.06 + P['door_h'] + 0.03),
            (wy - ww / 2 - 0.06, wy + ww / 2 + 0.06, wz - wh / 2 - 0.06, wz + wh / 2 + 0.06)]


def clip(face, s, e, z0, z1):
    """split a block span [s, e] around the openings it crosses (face 3 only)."""
    segs = [(s, e)]
    if face != 3:
        return segs
    for (a, b, za, zb) in openings():
        if z1 <= za or z0 >= zb:
            continue
        out = []
        for (p, q) in segs:
            if q <= a or p >= b:
                out.append((p, q)); continue
            if p < a:
                out.append((p, a))
            if q > b:
                out.append((b, q))
        segs = out
    return segs


def face_blocks(prt, rnd, z0, h, row, mat_dark=False):
    """one course of chunky blocks on all four faces, between the corner buttresses, running bond, softly bulging."""
    hb = P['hb']; ln = 2 * (hb - P['pil_top'] * 0.7)
    for face in range(4):
        s = -ln / 2
        first = True
        while s < ln / 2 - 0.04:
            w = rnd.uniform(0.3, 0.42)
            if first and (row + face) % 2 == 1:
                w = rnd.uniform(0.15, 0.22)
            first = False
            e = min(s + w, ln / 2)
            if ln / 2 - e < 0.12:
                e = ln / 2
            zc = z0 + h / 2
            for (sa, sb) in clip(face, s, e, z0, z0 + h):
                c = (sa + sb) / 2
                L = sb - sa - 0.035
                if L < 0.06:
                    continue
                hg = h - 0.035 + rnd.uniform(-0.012, 0.012); dep = 0.14
                out = rnd.uniform(-0.006, 0.016) + (0.02 if mat_dark else 0.0) + wall_out(c) * (0.6 + 0.4 * math.sin(math.pi * min(1, (zc / 0.7))))
                tilt = Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'X') @ Matrix.Rotation(rnd.uniform(-0.04, 0.04), 3, 'Y')
                d = hb - dep / 2 + 0.03 + out
                if face == 0:
                    prt.box((c, -d, zc), (L, dep, hg), tilt)
                elif face == 1:
                    prt.box((-c, d, zc), (L, dep, hg), tilt)
                elif face == 2:
                    prt.box((-d, -c, zc), (dep, L, hg), Matrix.Rotation(math.pi / 2, 3, 'Z') @ tilt)
                else:
                    prt.box((d, c, zc), (dep, L, hg), Matrix.Rotation(math.pi / 2, 3, 'Z') @ tilt)
            s = e


def pillars(rnd, full=True, feet=True):
    """four flared corner buttresses: a dark foot block and a cream tapered column up to the rim."""
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    ft = part('stones_bottom', 'Stone_Dark'); pl = part('pillars', 'Stone_Cream')
    for sx in (-1, 1):
        for sy in (-1, 1):
            c = hb + P['pil_out'] - P['pil_top']
            cx, cy = sx * c, sy * c
            fb = P['pil_bot'] + 0.05
            if feet:
                ft.box((cx + sx * 0.03, cy + sy * 0.03, 0.09), (2 * fb, 2 * fb, 0.18), Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'Z'))
            if full:
                # tapered square column (4-sided frustum), slightly leaning in, like a soft toy block
                pl.cyl((cx + sx * 0.02, cy + sy * 0.02, 0.1), P['pil_bot'] * 1.414, P['pil_top'] * 1.414, z_st - 0.1, n=4,
                       rot=math.pi / 4)


def foundation(rnd):
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    core = part('basin_core', 'Stone_Dark')
    core.box((0, 0, r[0] / 2), (2 * hb - 0.02, 2 * hb - 0.02, r[0]))
    face_blocks(part('stones_bottom', 'Stone_Dark'), rnd, 0.0, r[0], 0, True)
    pillars(rnd, full=False, feet=True)


def basin(rnd):
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    core = part('basin_core', 'Stone_Dark')
    core.box((0, 0, r[0] + (z_st - 0.02 - r[0]) / 2), (2 * hb - 0.02, 2 * hb - 0.02, z_st - 0.02 - r[0]))
    st = part('stones_wall', 'Stone_Cream')
    z = r[0]
    for k, h in enumerate(r[1:]):
        face_blocks(st, rnd, z, h, k + 1); z += h
    pillars(rnd, full=True, feet=False)   # the feet came with the foundation
    # timber rim: four thick boards with lapped corners, a touch out of true
    bd = part('rim_band', 'Timber_Brown'); o = hb + P['band_out']; w = P['band_w']; hh = P['band_h']
    zc = z_st + hh / 2
    for side in range(4):
        dz = rnd.uniform(-0.01, 0.012); tw = Matrix.Rotation(rnd.uniform(-0.012, 0.012), 3, 'X' if side < 2 else 'Y')
        if side == 0:
            bd.box((0, -o + w / 2, zc + dz), (2 * o + 0.03, w, hh), tw)
        elif side == 1:
            bd.box((0, o - w / 2, zc + dz), (2 * o + 0.03, w, hh), tw)
        elif side == 2:
            bd.box((-o + w / 2, 0, zc + dz - 0.004), (w, 2 * o - 2 * w + 0.02, hh * 0.96), tw)
        else:
            bd.box((o - w / 2, 0, zc + dz - 0.004), (w, 2 * o - 2 * w + 0.02, hh * 0.96), tw)
    # inner stone lining: a ring of slabs inside the rim, showing between the timber and the water
    cp = part('rim_coping', 'Stone_Cream')
    ci = o - w; lw = 0.09; zt = z_cope - 0.05; zb = z_cope - P['water_drop'] - 0.06
    for side in range(4):
        for k in range(3):
            span = 2 * ci
            a = -span / 2 + span * k / 3 + 0.01; b = -span / 2 + span * (k + 1) / 3 - 0.01
            c = (a + b) / 2; ln = b - a; dz = rnd.uniform(-0.012, 0.012)
            if side == 0:
                cp.box((c, -ci + lw / 2, (zt + zb) / 2 + dz), (ln, lw, zt - zb))
            elif side == 1:
                cp.box((c, ci - lw / 2, (zt + zb) / 2 + dz), (ln, lw, zt - zb))
            elif side == 2:
                cp.box((-ci + lw / 2, c, (zt + zb) / 2 + dz), (lw, ln - 2 * lw if k in (0, 2) else ln, zt - zb))
            else:
                cp.box((ci - lw / 2, c, (zt + zb) / 2 + dz), (lw, ln, zt - zb))
    # water: a slab inside the lining
    wt = part('water', 'Water_Clear')
    zw = z_cope - P['water_drop']
    wt.box((0, 0, zw - 0.06), (2 * ci - 0.05, 2 * ci - 0.05, 0.12))
    door(rnd)


def door(rnd):
    """an oversized little arched door and a window on the +X face (the hero's right-hand face)."""
    r, z_st, z_band, z_cope = H(); hb = P['hb']
    x = hb + 0.02
    dr = part('door', 'Plank_Door'); y0 = P['door_y']; w = P['door_w']; h = P['door_h']; z0 = 0.06
    R = Matrix.Rotation(math.radians(2.5), 3, 'X')     # a touch crooked
    # arched slab: a box plus a half-disc top, built as a fan of planks
    nplank = 3
    for k in range(nplank):
        yc = y0 - w / 2 + w * (k + 0.5) / nplank
        u = (yc - y0) / (w / 2)
        top = z0 + h - w / 2 + (w / 2) * math.sqrt(max(0.0, 1 - u * u)) - 0.01
        dr.box(tuple(Vector((x, yc, (z0 + top) / 2)) + Vector((0, 0, 0))), (0.05, w / nplank - 0.012, top - z0), R)
    fr = part('frame_door', 'Timber_Brown')   # door surround: posts and a lintel
    fr.box((x - 0.01, y0 - w / 2 - 0.04, z0 + (h - 0.05) / 2), (0.06, 0.07, h - 0.05), R)
    fr.box((x - 0.01, y0 + w / 2 + 0.04, z0 + (h - 0.05) / 2), (0.06, 0.07, h - 0.05), R)
    ir = part('door_iron', 'Metal_Iron')
    for zf in (0.3, 0.75):
        ir.box((x + 0.03, y0, z0 + h * zf), (0.015, w * 0.9, 0.035))
    ir.cyl((x + 0.03, y0 + w * 0.3, z0 + h * 0.5), 0.022, 0.022, 0.03, n=6, R=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    gl = part('window', 'Glass_Window')
    wy, ww, wh = P['win_y'], P['win_w'], P['win_h']; wz = z_st - 0.08 - wh / 2
    gl.box((x + 0.005, wy, wz), (0.03, ww, wh))
    dr.box((x + 0.01, wy, wz - wh / 2 - 0.03), (0.07, ww + 0.1, 0.05))     # sill
    fr.box((x - 0.005, wy - ww / 2 - 0.03, wz), (0.05, 0.05, wh + 0.04)); fr.box((x - 0.005, wy + ww / 2 + 0.03, wz), (0.05, 0.05, wh + 0.04))
    fr.box((x - 0.005, wy, wz + wh / 2 + 0.03), (0.05, ww + 0.11, 0.05))


# ------------------------------------------------------------------ canopy frame (canopy-local coordinates)
def cf(x, y, z):
    """canopy-local (x along the ridge, y towards the back, z up) -> world, with the posts' lean towards +X."""
    ln = math.radians(P['lean'])
    cx, cy = P['can_c']
    return Vector((cx + x + z * math.sin(ln), cy + y, z * math.cos(ln)))


def rz(x):
    """ridge height at x along the ridge: crooked (tilted) and smiling (ends higher)."""
    u = x / P['roof_x']
    return P['ridge_z'] + x * P['ridge_tilt'] + P['ridge_smile'] * u * u


def slope_pt(x, side, s, lift=0.0):
    """point on a roof slope: side -1 front / +1 back, s from 0 (ridge) to 1 (eave), lifted along the normal."""
    run = P['eave_front'] if side < 0 else P['eave_back']; drop = P['drop_front'] if side < 0 else P['drop_back']
    p = Vector((x, run * s, rz(x) - drop * s))
    n = Vector((0, side * drop, abs(run))).normalized()
    return p + n * lift, n


def frame(rnd):
    r, z_st, z_band, z_cope = H()
    tb = part('frame_timber', 'Timber_Brown')
    ps, hx = P['post'], P['post_hx']; zp = P['plate_z']
    for sx in (-1, 1):
        tb.beam(tuple(cf(sx * hx, 0, 0.0)), tuple(cf(sx * hx, 0, rz(sx * hx) - 0.2)), ps, ps)
        # tie beam across under each gable, braces from the post to its ends
        a = cf(sx * hx, P['eave_front'] * 0.55, zp - 0.07); b = cf(sx * hx, P['eave_back'] * 0.8, zp - 0.07)
        tb.beam(tuple(a), tuple(b), 0.12, 0.13, ext=0.05)
        tb.beam(tuple(cf(sx * hx, 0, zp - 0.6)), tuple(cf(sx * hx, P['eave_front'] * 0.45, zp - 0.12)), 0.1, 0.1, up=(1, 0, 0))
        tb.beam(tuple(cf(sx * hx, 0, zp - 0.5)), tuple(cf(sx * hx, P['eave_back'] * 0.7, zp - 0.12)), 0.09, 0.09, up=(1, 0, 0))
        # barge boards: chunky boards along both slopes of each gable, crossing past the ridge
        bx = sx * (P['roof_x'] + 0.1)
        for side in (-1, 1):
            p0, n = slope_pt(bx, side, -0.1, 0.06); p1, _ = slope_pt(bx, side, 1.1, 0.06)
            tb.beam(tuple(cf(*p0)), tuple(cf(*p1)), 0.12, 0.17, up=tuple(n))
        # a post brace out along the ridge
        tb.beam(tuple(cf(sx * hx, 0, zp - 0.45)), tuple(cf(sx * (hx - 0.32), 0, zp + 0.05)), 0.09, 0.09, up=(0, 1, 0))
    # purlins under the deck: at the front eave, mid front slope and the back eave
    for side, s in ((-1, 0.95), (-1, 0.5), (1, 0.9)):
        pts = []
        for k in range(5):
            x = -P['roof_x'] + 0.1 + (2 * P['roof_x'] - 0.2) * k / 4
            p, n = slope_pt(x, side, s, -0.06); pts.append(cf(*p))
        for a, b in zip(pts, pts[1:]):
            tb.beam(tuple(a), tuple(b), 0.09, 0.09, ext=0.01)
    # ridge beam following the smile
    pts = [cf(x, 0, rz(x) - 0.08) for x in [(-1 + 2 * k / 6) * (P['roof_x'] - 0.06) for k in range(7)]]
    for a, b in zip(pts, pts[1:]):
        tb.beam(tuple(a), tuple(b), 0.11, 0.12, ext=0.01)


def roof(rnd):
    rf = part('roof_planks', 'Roof_Teal')
    t = P['shingle_t']; rx = P['roof_x']
    for side, nc in ((-1, P['courses_front']), (1, P['courses_back'])):
        for c in range(nc):                    # c = 0 at the ridge
            s0 = c / nc - 0.03; s1 = (c + 1) / nc + 0.12 + (0.03 if c == nc - 1 else 0.0)
            lift = t * 0.55 * (nc - c)         # each course sits on the one below it
            x = -rx - 0.06 + (P['shingle_w'] * 0.5 if c % 2 else 0.0)
            if c % 2:
                xe0 = x
                x = -rx - 0.06
                widths = [xe0 - x]
            else:
                widths = []
            while x < rx + 0.06 - 0.05:
                w = widths.pop() if widths else P['shingle_w'] * rnd.uniform(0.85, 1.15)
                xe = min(x + w, rx + 0.06)
                if rx + 0.06 - xe < 0.08:
                    xe = rx + 0.06
                xc = (x + xe) / 2
                e1 = s1 + rnd.uniform(-0.04, 0.03)
                pa, n = slope_pt(xc, side, s0, t / 2 + lift); pb, _ = slope_pt(xc, side, e1, t / 2 + lift)
                tw = Vector((rnd.uniform(-0.05, 0.05), 0, 0))
                rf.beam(tuple(cf(*pa)), tuple(cf(*pb)), xe - x - 0.02, t, up=tuple(n + tw))
                x = xe
    # ridge board: a chunky cap following the smile, overhanging both gables
    rb = part('ridge_board', 'Timber_Brown')
    top = t * 0.55 * P['courses_front'] + t - 0.01
    xs = [(-1 + 2 * k / 6) * (rx + 0.1) for k in range(7)]
    pts = [cf(x, -0.02, rz(x) + top) for x in xs]
    for a, b in zip(pts, pts[1:]):
        rb.beam(tuple(a), tuple(b), 0.26, 0.12, ext=0.012)


def pump(rnd):
    r, z_st, z_band, z_cope = H()
    cx, cy, R = P['pump_x'], P['pump_y'], P['pump_r']
    # round stone pedestal rising through the rim, bulging into the water
    pd = part('pedestal', 'Stone_Cream')
    pd.cyl((cx + 0.04, cy, z_st - 0.1), 0.25, 0.22, z_cope - z_st + 0.15, n=10)
    z0 = z_cope + 0.05
    ir = part('pump', 'Metal_Iron')
    ln = Matrix.Rotation(math.radians(-3), 3, 'Y')     # leans a touch, like a toy
    def at(dz, dx=0.0, dy=0.0):
        return Vector((cx, cy, z0)) + ln @ Vector((dx, dy, dz))
    ir.cyl(tuple(at(0)), R + 0.07, R + 0.05, 0.05, n=10, R=ln)                      # foot flange
    ir.cyl(tuple(at(0.05)), R + 0.02, R + 0.01, 0.2, n=10, R=ln)                    # barrel
    ir.cyl(tuple(at(0.25)), R + 0.045, R + 0.045, 0.05, n=10, R=ln)                 # collar
    ir.cyl(tuple(at(0.3)), R + 0.015, R + 0.02, P['pump_h'] - 0.38, n=10, R=ln)     # upper column
    ir.cyl(tuple(at(P['pump_h'] - 0.08)), R + 0.05, R + 0.04, 0.06, n=8, R=ln)     # head
    ir.cyl(tuple(at(P['pump_h'] - 0.02)), R + 0.02, R - 0.02, 0.05, n=8, R=ln)     # cap
    # fat spout towards +X (over the water), turning down
    zs = 0.3
    sp = [at(zs, 0.02), at(zs + 0.01, 0.16), at(zs - 0.01, 0.26), at(zs - 0.07, 0.31), at(zs - 0.14, 0.32)]
    ir.tube(sp, [0.05, 0.045, 0.045, 0.05, 0.055], n=8)
    # little lugs on the head (the hero's ears)
    for dy in (-1, 1):
        ir.box(tuple(at(P['pump_h'] - 0.05, 0.03, dy * (R + 0.07))), (0.05, 0.06, 0.04))
    # oversized looping handle: up from the head, over a tall arc, down and out towards -Y, a wooden grip at the end
    pk = P['handle_peak'] - 0.05; reach = P['handle_reach']
    prof = [(0.02, P['pump_h'] - 0.03), (-0.02, P['pump_h'] + 0.12), (-0.07, pk - 0.04), (-0.13, pk), (-0.2, pk - 0.03),
            (-0.26, pk - 0.12), (-0.31, pk - 0.26), (-0.36, pk - 0.42), (-0.42, pk - 0.54), (-reach, pk - 0.6)]
    ha = math.radians(P['handle_yaw'])
    def hat(z, y):
        return at(z, y * math.sin(ha), y * math.cos(ha))
    path = [hat(z, y) for y, z in prof]
    ir.tube(path, [0.045, 0.05, 0.052, 0.052, 0.052, 0.05, 0.048, 0.046, 0.045, 0.046], n=8)
    # pump rod from the head up to the handle, and a pivot link
    ir.beam(tuple(hat(P['pump_h'], 0.05)), tuple(hat(pk - 0.02, -0.05)), 0.03, 0.03, up=(1, 0, 0))
    ir.cyl(tuple(at(pk - 0.02, -0.04, -0.07)), 0.03, 0.03, 0.08, n=6, R=Matrix.Rotation(math.pi / 2, 3, 'Y'))
    gr = part('pump_grip', 'Timber_Brown')
    g0 = hat(pk - 0.6, -reach + 0.04); g1 = hat(pk - 0.62, -reach - 0.14)
    gr.tube([g0, (g0 + g1) / 2, g1], [0.04, 0.046, 0.04], n=8)
    # stream of water from the spout to the surface
    wt = part('water_stream', 'Water_Clear')
    zw = z_cope - P['water_drop']
    tip = at(zs - 0.2, 0.32)
    wt.tube([tip, Vector((tip.x, tip.y, (tip.z + zw) / 2)), Vector((tip.x, tip.y, zw + 0.005))], [0.03, 0.024, 0.04], n=6)
    wt.cyl((tip.x, tip.y, zw - 0.005), 0.1, 0.04, 0.03, n=8)               # splash


def bucket(rnd):
    r, z_st, z_band, z_cope = H()
    bk = part('bucket', 'Plank_Bucket')
    cx, cy, R, h = P['bucket_x'], P['bucket_y'], P['bucket_r'], P['bucket_h']; z0 = z_cope - 0.005
    T = Matrix.Rotation(math.radians(P['bucket_tilt']), 3, Vector((1, 1, 0)).normalized())
    n = 10
    i = len(bk.v)
    rb, rt, th = R * 0.86, R, 0.03
    C = Vector((cx, cy, z0))
    for (rr, z) in ((rb, 0.0), (rt, h), (rt - th, h), (rb - th, 0.04)):
        for k in range(n):
            t = 2 * math.pi * (k + 0.5) / n
            bk.v.append(tuple(C + T @ Vector((rr * math.cos(t), rr * math.sin(t), z))))
    for s in range(3):
        for k in range(n):
            k2 = (k + 1) % n
            bk.f.append([i + s * n + k, i + s * n + k2, i + (s + 1) * n + k2, i + (s + 1) * n + k])
    bk.f.append(list(range(i + n - 1, i - 1, -1))); bk.f.append(list(range(i + 3 * n, i + 4 * n)))
    hp = part('bucket_hoops', 'Metal_Iron')
    for zf in (0.25,):
        rr = rb + (rt - rb) * zf
        hp.ring(tuple(C), rr + 0.016, rr - 0.004, h * zf - 0.025, h * zf + 0.025, n=n, R=T, rot=math.pi / n)
    # water in the bucket
    wb = part('water', 'Water_Clear')
    wb.cyl(tuple(C + T @ Vector((0, 0, h - 0.07))), rt - th - 0.005, rt - th - 0.005, 0.01, n=n, R=T, rot=math.pi / n)


def planned(rnd):
    hb = P['hb'] + 0.08
    stk = part('stakes', 'Timber_Brown'); ln = part('string_lines', 'Rope_Twine')
    zl = 0.32
    for sx in (-1, 1):
        for sy in (-1, 1):
            stk.box((sx * hb, sy * hb, 0.2), (0.07, 0.07, 0.4), Matrix.Rotation(rnd.uniform(-0.08, 0.08), 3, 'X'))
    for sy in (-1, 1):
        ln.beam((-hb - 0.15, sy * hb, zl), (hb + 0.15, sy * hb, zl), 0.015, 0.015)
    for sx in (-1, 1):
        ln.beam((sx * hb, -hb - 0.15, zl), (sx * hb, hb + 0.15, zl), 0.015, 0.015)
    # post marker pegs and a chalk outline on the ground
    for sx in (-1, 1):
        stk.box(tuple(cf(sx * P['post_hx'], 0, 0.12)), (0.06, 0.06, 0.24))
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


def tri_count(objs):
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in objs:
        me = o.evaluated_get(dg).to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        o.evaluated_get(dg).to_mesh_clear()
    return n


def main():
    os.makedirs(os.path.join(HERE, 'variants'), exist_ok=True)
    stats = {}
    for st in STATES:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        objs = build(st)
        stats[st] = tri_count(objs)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'complete':
            export(os.path.join(HERE, f'{NAME}.glb'))
    print('triangles', stats)


if __name__ == '__main__':
    main()

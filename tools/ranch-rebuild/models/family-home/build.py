"""Family home (Ranch tile rebuild). Standalone builder: `python build.py` -> family-home.glb + variants/<state>.glb

Layout: Z up, metres, origin at the centre of the footprint on the ground. Ridge runs along X.
Front (-Y) is the hero's long side: shuttered window + arched door with a stone step at the +X end.
The chimney stands on the back (+Y) slope at the +X end of the ridge (the hero's right).
-X gable = the hero's visible gable (window, king post and braces); +X gable mirrors it.
States (STATE switch, one design): planned, foundation, frame, roof, complete.
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'family-home'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    L=7.0,              # wall length (x)
    W=4.3,              # wall width (y), gable span
    found_h=0.55,       # stone footing height
    found_out=0.12,     # footing proud of the walls
    wall_h=2.75,        # footing top to wall plate
    pitch=51.0,         # roof pitch, degrees
    eave_over=0.62,     # roof overhang past the long walls (along the slope's run)
    gable_over=0.28,    # roof overhang past the gable walls
    roof_t=0.16,        # roof deck thickness
    course=0.48,        # shingle course exposure along the slope
    tab_w=(0.45, 0.9),   # shingle tab width range
    tab_t=0.1,        # shingle thickness
    tab_lift=0.13,      # how far each butt stands off the deck
    post=0.22,          # corner post section
    timber=0.15,        # other frame members
    rail_z=0.72,        # mid rail height above the footing top
    bay_x=1.15,         # intermediate posts on the long walls at +-bay_x
    win_w=0.78, win_h=1.0, win_z=0.98,   # window glass (bottom above footing top)
    door_w=0.98, door_h=2.2, door_x=2.25,
    chim_x=2.75, chim_y=0.95, chim_w=0.85, chim_above=1.0,    # chimney centre, size, top above ridge
)

COLS = dict(
    Roof_Teal=(46, 120, 116), Roof_TealLight=(62, 138, 132), Roof_TealDark=(34, 94, 92),
    Plaster_Cream=(242, 230, 204),
    Timber_Brown=(182, 100, 54), Timber_Stake=(176, 132, 84),
    Plank_Door=(138, 102, 72), Plank_Shutter=(64, 138, 166), Plank_Floor=(196, 158, 110),
    Stone_Grey=(168, 163, 152), Stone_Dark=(120, 116, 108), Stone_Step=(186, 180, 170),
    Brick_Red=(204, 98, 56), Brick_Dark=(160, 74, 44),
    Glass_Blue=(46, 92, 160), Metal_Iron=(60, 56, 52),
    Leaf_Green=(92, 128, 58), Grass_Green=(112, 146, 66), Flower_Pink=(242, 160, 150),
    Cloth_Mat=(214, 110, 60), Rope_Line=(222, 84, 60), Soil_Dug=(134, 100, 66),
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
        b.inputs['Roughness'].default_value = 0.7 if name in ('Glass_Blue', 'Metal_Iron') else 0.85
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ mesh accumulator: one object, one material
class Part:
    def __init__(self, name, m):
        self.name = name; self.m = m; self.v = []; self.f = []

    def poly(self, pts):
        i = len(self.v); self.v += [tuple(p) for p in pts]; self.f.append(list(range(i, i + len(pts))))

    def box(self, c, s, R=None, skip=()):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = R if R is not None else Matrix.Identity(3)
        cs = [R @ Vector((x, y, z)) + Vector(c) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
        i = len(self.v); self.v += [tuple(p) for p in cs]
        faces = {'-x': (0, 1, 3, 2), '+x': (4, 6, 7, 5), '-y': (0, 4, 5, 1), '+y': (2, 3, 7, 6), '-z': (0, 2, 6, 4), '+z': (1, 5, 7, 3)}
        for k, q in faces.items():
            if k not in skip:
                self.f.append([i + j for j in q])

    def beam(self, a, b, w, h, up=(0, 0, 1), ext=0.0):
        a = Vector(a); b = Vector(b); d = b - a; ln = d.length; x = d / ln
        a = a - x * ext; b = b + x * ext; ln += 2 * ext
        u = Vector(up); y = u.cross(x)
        if y.length < 1e-6:
            y = Vector((0, 1, 0)).cross(x)
        y.normalize(); z = x.cross(y)
        self.box(tuple((a + b) / 2), (ln, w, h), Matrix((x, y, z)).transposed())

    def prism(self, pts, axis, a0, a1):
        """convex polygon pts (2D) extruded along axis 'x' (pts are (y,z)) or 'y' (pts are (x,z)) from a0 to a1."""
        def P3(p, a):
            return (a, p[0], p[1]) if axis == 'x' else (p[0], a, p[1])
        n = len(pts); i = len(self.v)
        self.v += [P3(p, a0) for p in pts] + [P3(p, a1) for p in pts]
        self.f.append(list(range(i, i + n))); self.f.append(list(range(i + 2 * n - 1, i + n - 1, -1)))
        for k in range(n):
            k2 = (k + 1) % n
            self.f.append([i + k, i + k2, i + n + k2, i + n + k])

    def blob(self, c, r, sq=1.0, seed=0):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        rnd = random.Random(seed)
        i = len(self.v)
        for v in bm.verts:
            j = 1 + rnd.uniform(-0.12, 0.12)
            self.v.append((c[0] + v.co.x * j, c[1] + v.co.y * j, c[2] + v.co.z * j * sq))
        for f in bm.faces:
            self.f.append([i + v.index for v in f.verts])
        bm.free()


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


# ------------------------------------------------------------------ geometry
def dims():
    L, W = P['L'], P['W']; a = math.radians(P['pitch'])
    z0 = P['found_h']; zt = z0 + P['wall_h']
    # deck top surface: z = zr - |y| tan a ; deck underside meets the wall's outer top edge
    # zt is the visible wall top (the girt just under the eave tip); the deck underside reaches the eave tip
    # just above it, so the deep eaves don't swallow the door and windows (hero)
    zr = zt + 0.08 + (W / 2 + P['eave_over']) * math.tan(a) + P['roof_t'] / math.cos(a)
    return L, W, a, z0, zt, zr


def wall_top():
    """z where the long walls meet the deck underside (above the girt, hidden behind the eaves)."""
    L, W, a, z0, zt, zr = dims()
    return zr - P['roof_t'] / math.cos(a) - (W / 2) * math.tan(a) - 0.02


def foundation(rnd):
    L, W, a, z0, zt, zr = dims()
    fo = P['found_out']; hx, hy = L / 2 + fo, W / 2 + fo
    core = part('foundation_core', 'Stone_Dark')
    core.box((0, 0, z0 / 2 - 0.01), (2 * hx - 0.08, 2 * hy - 0.08, z0 - 0.02))
    st = part('foundation_stones', 'Stone_Grey')
    # columns of fieldstone: some run the full height, others split at a random course line
    gap = 0.035
    for face in range(4):
        # face: 0 front(-y) 1 back(+y) 2 -x 3 +x ; run along the face
        ln = 2 * hx if face < 2 else 2 * hy
        s = -ln / 2
        while s < ln / 2 - 0.05:
            w = rnd.uniform(0.38, 0.72)
            e = min(s + w, ln / 2)
            if ln / 2 - e < 0.2:
                e = ln / 2
            if rnd.random() < 0.28:
                spans = [(0.0, z0)]
            else:
                zs = z0 * rnd.uniform(0.38, 0.62); spans = [(0.0, zs), (zs, z0)]
            for k, (za, zb) in enumerate(spans):
                # split columns get their own slightly different widths so joints don't line up
                sa, sb = (s, e) if len(spans) == 1 or k == 0 else (s + rnd.uniform(-0.06, 0.06), e + rnd.uniform(-0.06, 0.06))
                sa, sb = max(sa, -ln / 2), min(sb, ln / 2)
                c = (sa + sb) / 2; zc = (za + zb) / 2
                hgt = zb - za - gap; dep = 0.16 + rnd.uniform(0, 0.06); wd = sb - sa - gap
                tilt = Matrix.Rotation(rnd.uniform(-0.06, 0.06), 3, 'X') @ Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'Y')
                out = rnd.uniform(-0.01, 0.035)
                if face == 0:
                    st.box((c, -hy + dep / 2 - 0.02 - out, zc), (wd, dep, hgt), tilt)
                elif face == 1:
                    st.box((c, hy - dep / 2 + 0.02 + out, zc), (wd, dep, hgt), tilt)
                elif face == 2:
                    st.box((-hx + dep / 2 - 0.02 - out, c, zc), (dep, wd, hgt), tilt)
                else:
                    st.box((hx - dep / 2 + 0.02 + out, c, zc), (dep, wd, hgt), tilt)
            s = e
    # cap stones on the top edge so the footing reads as a ledge
    floor = part('floor', 'Plank_Floor')
    floor.box((0, 0, z0 - 0.02), (L - 0.02, W - 0.02, 0.06))
    # door step: two stone slabs in front of the door
    step = part('door_step', 'Stone_Step')
    dx = P['door_x']
    step.box((dx, -hy - 0.24, 0.15), (1.45, 0.5, 0.3), Matrix.Rotation(0.02, 3, 'Z'))
    step.box((dx + 0.05, -hy - 0.08, 0.42), (1.2, 0.3, 0.26))
    step.box((dx + 0.95, -hy - 0.2, 0.08), (0.5, 0.4, 0.16), Matrix.Rotation(-0.12, 3, 'Z'))


def frame(rnd, complete):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2; ps = P['post']; t = P['timber']
    tb = part('timber_frame', 'Timber_Brown')
    zw = wall_top()
    zr_ = z0 + P['rail_z']
    # corner posts and top plates (plate ends run past the corners, as in the hero)
    for sx in (-1, 1):
        for sy in (-1, 1):
            tb.box((sx * hx, sy * hy, (z0 + zw) / 2), (ps, ps, zw - z0))
    for sy in (-1, 1):
        tb.beam((-hx - 0.28, sy * hy, zt - 0.06), (hx + 0.28, sy * hy, zt - 0.06), ps, 0.2)
        tb.beam((-hx - 0.1, sy * hy, zw - 0.1), (hx + 0.1, sy * hy, zw - 0.1), ps, 0.18)
        tb.beam((-hx, sy * hy, z0 + 0.07), (hx, sy * hy, z0 + 0.07), ps + 0.02, 0.14)
    for sx in (-1, 1):
        tb.beam((sx * hx, -hy - 0.24, zt - 0.07), (sx * hx, hy + 0.24, zt - 0.07), ps - 0.02, 0.17)
        tb.beam((sx * hx, -hy, z0 + 0.07), (sx * hx, hy, z0 + 0.07), ps + 0.02, 0.14)
    bx = P['bay_x']; dx = P['door_x']; dw = P['door_w']
    # long walls: intermediate posts, mid rail (broken by the door), braces
    for sy in (-1, 1):
        y = sy * hy
        for x in (-bx, bx):
            tb.box((x, y, (z0 + zt) / 2), (t, t, zt - z0))
        if sy < 0:
            tb.beam((-hx, y, zr_), (dx - dw / 2 - 0.2, y, zr_), t - 0.035, 0.13)
            tb.beam((dx + dw / 2 + 0.22, y, zr_), (hx, y, zr_), t - 0.035, 0.13)
            # long diagonal brace in the left bay (hero: top-left corner down to the rail by the window post)
            tb.beam((-hx + 0.1, y, zt - 0.16), (-bx - 0.05, y, zr_ + 0.05), t, 0.13, up=(0, -1, 0))
            # knee braces both sides of the post between window and door
            tb.beam((bx - 0.55, y, zt - 0.12), (bx, y, zt - 0.6), t, 0.12, up=(0, -1, 0))
            tb.beam((bx + 0.55, y, zt - 0.12), (bx, y, zt - 0.6), t, 0.12, up=(0, -1, 0))
        else:
            tb.beam((-hx, y, zr_), (hx, y, zr_), t - 0.035, 0.13)
            for s in (-1, 1):
                tb.beam((s * (hx - 0.62), y, zt - 0.12), (s * hx, y, zt - 0.72), t, 0.12, up=(0, 1, 0))
                tb.beam((s * (hx - 0.62), y, z0 + 0.12), (s * hx, y, z0 + 0.72), t, 0.12, up=(0, 1, 0))
                tb.beam((s * bx, y, zr_ + 0.05), (s * (bx + 0.75), y, zt - 0.16), t, 0.12, up=(0, 1, 0))
    # gable ends: window posts, mid rail, king post and braces in the gable triangle
    wp = P['win_w'] / 2 + 0.18
    for sx in (-1, 1):
        x = sx * hx
        for y in (-wp, wp):
            tb.box((x, y, (z0 + zt) / 2), (t, t, zt - z0))
        tb.beam((x, -hy, zr_), (x, hy, zr_), t - 0.035, 0.13)
        apex = zr - P['roof_t'] / math.cos(a) - 0.04
        tb.box((x, 0, (zt + apex) / 2), (t + 0.02, t + 0.02, apex - zt))
        for s in (-1, 1):
            # brace from the king post's foot up and out to the rafter
            yb = s * hy * 0.62; zb = zr - abs(yb) * math.tan(a) - P['roof_t'] / math.cos(a) - 0.1
            tb.beam((x, s * 0.08, zt + 0.1), (x, yb, zb), t, 0.13, up=(1, 0, 0))
            # corner braces in the lower wall
            tb.beam((x, s * (hy - 0.6), zt - 0.12), (x, s * hy, zt - 0.7), t, 0.12, up=(1, 0, 0))
    # bare-frame only parts (hidden by the roof and walls once finished): rafters and ridge beam
    if not complete:
        rf = part('rafters', 'Timber_Brown')
        under = zr - P['roof_t'] / math.cos(a)
        rf.beam((-hx - 0.2, 0, under - 0.08), (hx + 0.2, 0, under - 0.08), 0.16, 0.18)
        n = 6
        for i in range(n):
            x = -hx + i * L / (n - 1)
            for s in (-1, 1):
                ye = s * (hy + P['eave_over'] * 0.6); ze = under - abs(ye) * math.tan(a)
                rf.beam((x, 0, under - 0.1), (x, ye, ze - 0.08), 0.12, 0.14, up=(1, 0, 0))


def roof(rnd):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2
    go, eo = P['gable_over'], P['eave_over']
    x0, x1 = -hx - go, hx + go
    deck = part('roof_deck', 'Roof_TealDark')
    sh = part('roof_shingles', 'Roof_Teal')
    shl = part('roof_shingles_light', 'Roof_TealLight')
    u_max = (hy + eo) / math.cos(a)
    e = P['course']; tl = e * 1.65; tt = P['tab_t']; lift = P['tab_lift']
    for s in (-1, 1):
        d = Vector((0, s * math.cos(a), -math.sin(a))); n = Vector((0, s * math.sin(a), math.cos(a)))
        R0 = Vector((0, 0, zr))
        # deck slab under the shingles
        c = R0 + d * (u_max / 2) - n * (P['roof_t'] / 2)
        Rm = Matrix((Vector((1, 0, 0)), d, n)).transposed()
        deck.box(tuple(c), (x1 - x0, u_max, P['roof_t']), Rm)
        k = 0; ub = u_max
        while ub > 0.15:
            ut = max(ub - tl, 0.0)
            x = x0 - (0.0 if k % 2 == 0 else rnd.uniform(0.2, 0.32))
            while x < x1 - 0.05:
                w = rnd.uniform(*P['tab_w'])
                xa, xb = max(x, x0), min(x + w, x1)
                if xb - xa > 0.12:
                    jt = rnd.uniform(-0.05, 0.05); lj = lift + rnd.uniform(-0.035, 0.03)
                    ubj = ub + rnd.uniform(-0.05, 0.07); skew = rnd.uniform(-0.05, 0.05)
                    pts = []
                    for xx, sk in ((xa + 0.03, -skew), (xb - 0.03, skew)):
                        for uu, off in ((ut, 0.0), (ubj + sk, lj)):
                            base = R0 + d * uu + n * (off + jt * (xx - xa))
                            pts.append((Vector((xx, 0, 0)) + base, n))
                    # 8 corners: (xa,top),(xa,butt),(xb,top),(xb,butt) bottom then +tt
                    B = [p for p, _ in pts]; T = [p + n * tt for p, _ in pts]
                    tgt = shl if rnd.random() < 0.3 else sh
                    i = len(tgt.v); tgt.v += [tuple(v) for v in B + T]
                    for q in ((4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (1, 3, 7, 5), (0, 4, 6, 2)):
                        tgt.f.append([i + j for j in q])
                x += w
            ub -= e; k += 1
    # ridge cap: chunky saddle tabs straddling the ridge
    rc = part('roof_ridge', 'Roof_TealDark')
    x = x0 - 0.04
    while x < x1:
        w = min(rnd.uniform(0.5, 0.65), x1 + 0.04 - x)
        for s in (-1, 1):
            d = Vector((0, s * math.cos(a), -math.sin(a))); n = Vector((0, s * math.sin(a), math.cos(a)))
            c = Vector((x + w / 2, 0, zr)) + d * 0.2 + n * (lift + 0.1)
            rc.box(tuple(c), (w - 0.03, 0.5, 0.11), Matrix((Vector((1, 0, 0)), d, n)).transposed())
        x += w
    # barge boards along the rakes, under the deck edge
    bb = part('barge_boards', 'Timber_Brown')
    for sx in (-1, 1):
        xb = sx * (hx + go - 0.1)
        for s in (-1, 1):
            ye = s * (hy + eo); ze = zr - (hy + eo) * math.tan(a) - P['roof_t'] / math.cos(a)
            bb.beam((xb, 0, zr - P['roof_t'] / math.cos(a) - 0.06), (xb, ye, ze - 0.06), 0.16, 0.2, up=(1, 0, 0), ext=0.05)
        # peg ends of the purlins poking out under the rake
        for zf in (0.35, 0.62):
            yy = (hy + eo) * (1 - zf) * 0.9
            for s in (-1, 1):
                zz = zr - yy * math.tan(a) - P['roof_t'] / math.cos(a) - 0.18
                bb.box((sx * (hx + go - 0.05), s * yy, zz), (0.3, 0.14, 0.14))
    chimney(rnd)


def chimney(rnd):
    L, W, a, z0, zt, zr = dims()
    cx, cy, cw = P['chim_x'], P['chim_y'], P['chim_w']
    top = zr + P['chim_above']
    br = part('chimney', 'Brick_Red')
    zb = zr - (cy + cw / 2) * math.tan(a) - 0.3
    br.box((cx, cy, (zb + top) / 2), (cw, cw, top - zb))
    # proud bricks so it reads as brickwork
    ch = 0.17; z = zr - (cy - cw / 2) * math.tan(a) + 0.12; r = 0
    while z < top - 0.12:
        for face in range(4):
            if rnd.random() < 0.55:
                continue
            off = rnd.uniform(-0.18, 0.18)
            bw = rnd.uniform(0.24, 0.32)
            if face == 0:
                br.box((cx + off, cy - cw / 2, z), (bw, 0.06, ch - 0.03))
            elif face == 1:
                br.box((cx + off, cy + cw / 2, z), (bw, 0.06, ch - 0.03))
            elif face == 2:
                br.box((cx - cw / 2, cy + off, z), (0.06, bw, ch - 0.03))
            else:
                br.box((cx + cw / 2, cy + off, z), (0.06, bw, ch - 0.03))
        z += ch; r += 1
    cap = part('chimney_cap', 'Brick_Dark')
    cap.box((cx, cy, top + 0.09), (cw + 0.3, cw + 0.3, 0.18))
    cap.box((cx - 0.12, cy, top + 0.3), (0.3, 0.42, 0.24))
    cap.box((cx + 0.18, cy + 0.04, top + 0.27), (0.22, 0.3, 0.18))


def walls():
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2; inset = 0.05
    pl = part('plaster_walls', 'Plaster_Cream')
    apex = zr - P['roof_t'] / math.cos(a) - 0.05
    zw = wall_top()
    prof = [(-hy + inset, z0), (hy - inset, z0), (hy - inset, zw), (0, apex - 0.02), (-hy + inset, zw)]
    pl.prism(prof, 'x', -hx + inset, hx - inset)


def window(pos, normal, along, zc, rnd, flowers=True, open_left=False):
    """pos: wall-face point (centre of the glass, on the wall plane). normal: outward unit vector. along: unit along the wall."""
    w, h = P['win_w'], P['win_h']
    N = Vector(normal); A = Vector(along); Z = Vector((0, 0, 1)); C = Vector(pos) + Z * 0
    R = Matrix((A, N, Z)).transposed()   # local x=along, y=out, z=up

    def at(x, y, z):
        return tuple(C + A * x + N * y + Z * z)

    gl = part('window_glass', 'Glass_Blue')
    gl.box(at(0, 0.02, zc), (w, 0.04, h), R)
    fr = part('window_frames', 'Timber_Brown')
    ft = 0.11
    fr.box(at(0, 0.07, zc + h / 2 + ft / 2), (w + 2 * ft + 0.08, 0.12, ft + 0.02), R)
    fr.box(at(0, 0.09, zc - h / 2 - ft / 2), (w + 2 * ft + 0.12, 0.16, ft), R)
    for s in (-1, 1):
        fr.box(at(s * (w / 2 + ft / 2), 0.07, zc), (ft, 0.12, h), R)
    fr.box(at(0, 0.06, zc), (0.06, 0.06, h), R)
    fr.box(at(0, 0.06, zc + 0.08), (w, 0.06, 0.06), R)
    # little peaked hood over the window (hero)
    for s in (-1, 1):
        a0 = Vector(at(s * (w / 2 + 0.12), 0.1, zc + h / 2 + ft + 0.02)); a1 = Vector(at(0, 0.1, zc + h / 2 + ft + 0.24))
        fr.beam(a0, a1, 0.1, 0.09, up=tuple(N))
    # shutters: plank leaves, the left one swung half open
    shp = part('shutters', 'Plank_Shutter')
    sw = w / 2 + 0.06
    for s in (-1, 1):
        if s < 0 and open_left:
            ang = math.radians(35)
            hinge = Vector(at(-(w / 2 + ft), 0.12, 0))
            dirv = (-A * math.cos(ang) + N * math.sin(ang))
            Rs = Matrix((dirv, Z.cross(dirv), Z)).transposed()
            c = hinge + dirv * (sw / 2) + Z * zc
            shp.box(tuple(c), (sw, 0.06, h + 0.08), Rs)
            for zz in (-0.3, 0.3):
                shp.box(tuple(c + Z * zz + Z.cross(dirv) * 0.04), (sw - 0.04, 0.04, 0.08), Rs)
        else:
            cx = s * (w / 2 + ft + sw / 2 + 0.02)
            shp.box(at(cx, 0.11, zc), (sw, 0.06, h + 0.08), R)
            for zz in (-0.3, 0.3):
                shp.box(at(cx, 0.15, zc + zz), (sw - 0.04, 0.04, 0.08), R)
    if flowers:
        fb = part('flower_boxes', 'Timber_Brown')
        bz = zc - h / 2 - ft - 0.13
        fb.box(at(0, 0.2, bz), (w + 0.32, 0.26, 0.2), R)
        for s in (-1, 1):
            fb.beam(at(s * (w / 2 - 0.05), 0.08, bz - 0.28), at(s * (w / 2 - 0.05), 0.28, bz - 0.08), 0.06, 0.06, up=tuple(A))
        lf = part('flower_leaves', 'Leaf_Green')
        fl = part('flowers', 'Flower_Pink')
        n = 4
        for i in range(n):
            x = -w / 2 - 0.06 + i * (w + 0.12) / (n - 1)
            lf.blob(at(x, 0.22 + rnd.uniform(-0.03, 0.03), bz + 0.15), 0.15, 0.8, seed=rnd.randint(0, 999))
        for i in range(5):
            x = -w / 2 + i * w / 4 + rnd.uniform(-0.04, 0.04)
            fl.blob(at(x, 0.26 + rnd.uniform(-0.05, 0.05), bz + 0.26 + rnd.uniform(-0.02, 0.05)), 0.085, 0.8, seed=rnd.randint(0, 999))


def door(rnd):
    L, W, a, z0, zt, zr = dims()
    hy = W / 2; dx = P['door_x']; dw = P['door_w']; dh = P['door_h']
    r = dw / 2; zs = z0 + dh - r          # arch spring line
    seg = 8
    arch = [(dx + r * math.cos(math.pi * i / seg), zs + r * math.sin(math.pi * i / seg)) for i in range(seg + 1)]
    leaf = part('door_leaf', 'Plank_Door')
    pts = [(dx + r, z0)] + arch + [(dx - r, z0)]
    leaf.prism(pts, 'y', -hy - 0.07, -hy + 0.03)
    # battens and plank grooves
    for zz in (z0 + 0.45, z0 + 1.45):
        leaf.box((dx, -hy - 0.09, zz), (dw - 0.1, 0.04, 0.12))
    for k in (-1, 0, 1):
        leaf.box((dx + k * dw / 4, -hy - 0.08, z0 + (dh - r) / 2 + 0.2), (0.03, 0.02, dh - r))
    iron = part('door_handle', 'Metal_Iron')
    iron.box((dx + r - 0.16, -hy - 0.12, z0 + 1.0), (0.06, 0.06, 0.16))
    # arched timber surround: jambs and an arch of short beams, proud and chunky
    fr = part('door_frame', 'Timber_Brown')
    ft = 0.16; R2 = r + ft / 2
    for s in (-1, 1):
        fr.box((dx + s * R2, -hy - 0.06, (z0 + zs) / 2), (ft, 0.16, zs - z0))
    prev = None
    for i in range(seg + 1):
        p = Vector((dx + R2 * math.cos(math.pi * i / seg), -hy - 0.06, zs + R2 * math.sin(math.pi * i / seg)))
        if prev is not None:
            fr.beam(prev, p, 0.16, ft, up=(0, -1, 0), ext=0.03)
        prev = p
    # outer arch moulding (hero: a second, thinner arch)
    R3 = R2 + 0.16; prev = None
    for i in range(seg + 1):
        p = Vector((dx + R3 * math.cos(math.pi * i / seg), -hy - 0.04, zs + R3 * math.sin(math.pi * i / seg)))
        if prev is not None:
            fr.beam(prev, p, 0.1, 0.09, up=(0, -1, 0), ext=0.02)
        prev = p
    mt = part('door_mat', 'Cloth_Mat')
    mt.box((dx, -hy - 0.3, 0.56), (0.62, 0.3, 0.02))


def grass(rnd):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2 + P['found_out'], W / 2 + P['found_out']
    gp = part('grass_tufts', 'Grass_Green')
    per = [((x, -hy - 0.06), (0, -1)) for x in [-hx + 0.25 + i * 0.4 for i in range(19)] if abs(x - P['door_x']) > 0.85]
    per += [((x, hy + 0.06), (0, 1)) for x in [-hx + 0.3 + i * 0.5 for i in range(15)]]
    per += [((sx * (hx + 0.06), y), (sx, 0)) for sx in (-1, 1) for y in [-hy + 0.25 + i * 0.5 for i in range(9)]]
    for (x, y), (nx, ny) in per:
        x += rnd.uniform(-0.15, 0.15) * (1 - abs(nx)); y += rnd.uniform(-0.15, 0.15) * (1 - abs(ny))
        for b in range(4):
            ang = rnd.uniform(0, 2 * math.pi); r = 0.09
            bx, by = x + nx * rnd.uniform(0, 0.12) + math.cos(ang) * 0.06, y + ny * rnd.uniform(0, 0.12) + math.sin(ang) * 0.06
            hgt = rnd.uniform(0.14, 0.26); lean = rnd.uniform(0.04, 0.1)
            tip = (bx + nx * lean + rnd.uniform(-0.04, 0.04), by + ny * lean + rnd.uniform(-0.04, 0.04), hgt)
            p0 = (bx + math.cos(ang + 1.6) * r, by + math.sin(ang + 1.6) * r, 0.0)
            p1 = (bx - math.cos(ang + 1.6) * r, by - math.sin(ang + 1.6) * r, 0.0)
            p2 = (bx + nx * 0.05, by + ny * 0.05, 0.0)
            gp.poly([p0, p1, tip]); gp.poly([p1, p2, tip]); gp.poly([p2, p0, tip])


def planned(rnd):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2 + P['found_out'], W / 2 + P['found_out']
    stk = part('stakes', 'Timber_Stake')
    ln = part('string_lines', 'Rope_Line')
    sd = part('dug_outline', 'Soil_Dug')
    zl = 0.32
    for sx in (-1, 1):
        for sy in (-1, 1):
            stk.box((sx * hx, sy * hy, 0.25), (0.07, 0.07, 0.5), Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'X'))
            # batter boards just outside each corner
            bx, by = sx * (hx + 0.55), sy * (hy + 0.55)
            stk.box((bx, by, 0.3), (0.08, 0.08, 0.6))
            stk.box((bx - sx * 0.55, by, 0.3), (0.07, 0.07, 0.6))
            stk.box((bx, by - sy * 0.55, 0.3), (0.07, 0.07, 0.6))
            stk.box((bx - sx * 0.3, by + sy * 0.0, 0.5), (0.68, 0.04, 0.12))
            stk.box((bx, by - sy * 0.3, 0.5), (0.04, 0.68, 0.12))
    # string lines run batter board to batter board over the corner stakes
    for sy in (-1, 1):
        ln.beam((-hx - 0.62, sy * hy, zl + 0.2), (hx + 0.62, sy * hy, zl + 0.2), 0.035, 0.035)
    for sx in (-1, 1):
        ln.beam((sx * hx, -hy - 0.62, zl + 0.2), (sx * hx, hy + 0.62, zl + 0.2), 0.035, 0.035)
    # door marker peg
    stk.box((P['door_x'], -hy - 0.5, 0.2), (0.06, 0.06, 0.4))
    # the footing trench, freshly dug along the lines
    tw = 0.34
    sd.box((0, -hy + tw / 2, 0.015), (2 * hx, tw, 0.03)); sd.box((0, hy - tw / 2, 0.015), (2 * hx, tw, 0.03))
    sd.box((-hx + tw / 2, 0, 0.015), (tw, 2 * hy - 2 * tw, 0.03)); sd.box((hx - tw / 2, 0, 0.015), (tw, 2 * hy - 2 * tw, 0.03))


def build(state):
    PARTS.clear(); MATS.clear()
    rnd = random.Random(11)
    if state == 'planned':
        planned(rnd)
        return realize()
    foundation(random.Random(3))
    if state in ('frame', 'roof', 'complete'):
        frame(random.Random(5), state == 'complete')
    if state in ('roof', 'complete'):
        roof(random.Random(7))
    if state == 'complete':
        L, W, a, z0, zt, zr = dims(); hx, hy = L / 2, W / 2
        walls()
        wz = z0 + P['win_z'] + P['win_h'] / 2
        rw = random.Random(9)
        window((0, -hy, 0), (0, -1, 0), (1, 0, 0), wz, rw, open_left=True)
        window((0, hy, 0), (0, 1, 0), (-1, 0, 0), wz, rw)
        window((-hx, 0, 0), (-1, 0, 0), (0, -1, 0), wz, rw)
        window((hx, 0, 0), (1, 0, 0), (0, 1, 0), wz, rw)
        door(random.Random(13))
        grass(random.Random(17))
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

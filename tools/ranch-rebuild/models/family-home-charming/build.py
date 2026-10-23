"""Family home, CHARMING style (Ranch tile rebuild). Standalone builder:
`python build.py` -> family-home-charming.glb + variants/<state>.glb

Storybook-toy twin of models/family-home: same states, origin, orientation, material names and a similar
footprint ratio, reshaped to the charming hero (mj/family-home-charming/hero.png): a chubby half-timbered cottage
with softly bulging cream plaster, bowed timbers and arched braces, a deep teal roof of big rounded scalloped
shingles under a thick rolled ridge that sags and runs a little crooked, a dormer with an arched window, a leaning
stone-and-brick chimney with a chunky brick cap and pots, an oversized arched door with a round window and a stone
step, two arched windows with chunky blue shutters and flower boxes, and a footing of big rounded stones.

Layout: Z up, metres, origin at the centre of the footprint on the ground. Ridge runs along X.
Front (-Y) is the hero's long side: two arched shuttered windows with flower boxes, the dormer above them.
-X gable = the hero's visible gable with the big arched door and stone step (the hero puts the door there).
The chimney stands on the back (+Y) slope toward the +X end. The back wall and +X gable each get one window.
States (STATE switch, one design): planned, foundation, frame, roof, complete.
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'family-home-charming'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    L=6.5,              # wall length (x)
    W=4.6,              # wall width (y), gable span
    found_h=0.72,       # stone footing height
    found_out=0.16,     # footing proud of the walls
    wall_h=2.6,         # footing top to the girt
    pitch=49.0,         # roof pitch, degrees
    eave_over=0.7,      # roof overhang past the long walls (along the run)
    gable_over=0.55,     # roof overhang past the gable walls
    roof_t=0.2,         # roof deck thickness
    course=0.62,        # shingle course exposure along the slope
    tab_w=(0.72, 0.98), # shingle tab width range
    tab_t=0.13,         # shingle thickness
    tab_lift=0.15,      # how far each butt stands off the deck
    tab_round=0.2,      # depth of the rounded (scalloped) butt
    sag=0.24,           # ridge sag at mid-length
    tilt=0.14,          # ridge higher at the -X end than the +X end (crooked)
    wander=0.1,         # ridge wanders in plan (y) along its length
    flare=0.2,          # eaves flick up at the tips
    lean=0.12,          # the whole house leans toward +X by this much at the ridge (toy wobble)
    ridge_r=0.26,       # rolled ridge radius
    bulge=0.14,         # plaster bulge between the timbers (lower walls)
    bulge_gable=0.08,   # plaster bulge in the gable triangles
    post=0.26,          # corner post section
    timber=0.18,        # other frame members
    win_w=0.9, win_h=1.45, win_z=0.7,    # arched window glass (bottom above footing top)
    win_x=1.5,          # front windows at +-win_x
    door_w=1.1, door_h=2.25,              # door leaf (incl. arch)
    door_post=0.98,     # door posts at y = +-door_post on the -X gable
    dormer_x=-1.0, dormer_w=1.5, dormer_y=-1.75, dormer_h=1.2,  # dormer centre x, face width, face plane y, face wall height
    chim_x=2.4, chim_y=-0.15, chim_w=1.1, chim_above=1.0, chim_lean=5.0,
)

COLS = dict(
    Roof_Teal=(50, 116, 116), Roof_TealLight=(74, 142, 138), Roof_TealDark=(38, 94, 96),
    Plaster_Cream=(242, 228, 196),
    Timber_Brown=(192, 120, 62), Timber_Stake=(176, 132, 84),
    Plank_Door=(150, 98, 52), Plank_Shutter=(84, 136, 190), Plank_Floor=(196, 158, 110),
    Stone_Grey=(172, 170, 156), Stone_Dark=(118, 116, 106), Stone_Step=(166, 160, 146), Stone_Cream=(226, 214, 184),
    Brick_Red=(206, 108, 58), Brick_Dark=(158, 86, 48), Clay_Pot=(128, 76, 46),
    Glass_Blue=(34, 52, 86), Metal_Iron=(60, 56, 52),
    Leaf_Green=(84, 120, 52), Flower_Pink=(240, 128, 128), Flower_Orange=(242, 150, 64),
    Rope_Line=(222, 84, 60), Soil_Dug=(134, 100, 66),
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


# soft toy bevels, applied on export: part name -> (width, segments)
BEVEL = {
    'foundation_stones': (0.1, 1), 'door_step': (0.08, 1), 'chimney': (0.06, 1),
    'chimney_bricks': (0.035, 1), 'chimney_cap': (0.05, 1), 'stakes': (0.015, 1),
}
NO_DEFORM = set()        # everything rides the roofline deform (the chimney sits on the sagging roof)
NO_RECALC = {'plaster_walls'}


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

    def sweep(self, pts, w, d, N, closed=False):
        """rectangular timber swept along a polyline lying on a wall with outward normal N (w in-wall, d out)."""
        pts = [Vector(p) for p in pts]; N = Vector(N).normalized(); n = len(pts); i0 = len(self.v)
        for k in range(n):
            if closed:
                t = pts[(k + 1) % n] - pts[k - 1]
            else:
                t = pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]
            t.normalize(); s = N.cross(t).normalized(); nn = t.cross(s)
            p = pts[k]
            self.v += [tuple(p + s * w / 2 + nn * d / 2), tuple(p - s * w / 2 + nn * d / 2),
                       tuple(p - s * w / 2 - nn * d / 2), tuple(p + s * w / 2 - nn * d / 2)]
        segs = n if closed else n - 1
        for k in range(segs):
            a = i0 + 4 * k; b = i0 + 4 * ((k + 1) % n)
            for j in range(4):
                self.f.append([a + j, a + (j + 1) % 4, b + (j + 1) % 4, b + j])
        if not closed:
            self.f.append([i0 + 3, i0 + 2, i0 + 1, i0]); e = i0 + 4 * (n - 1); self.f.append([e, e + 1, e + 2, e + 3])

    def tube(self, pts, r, sides=8, up=(0, 0, 1), caps=True):
        pts = [Vector(p) for p in pts]; n = len(pts); i0 = len(self.v); U = Vector(up)
        for k in range(n):
            t = (pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]).normalized()
            s = U.cross(t)
            if s.length < 1e-6:
                s = Vector((1, 0, 0)).cross(t)
            s.normalize(); u = t.cross(s)
            rr = r(k) if callable(r) else r
            for j in range(sides):
                an = 2 * math.pi * j / sides
                self.v.append(tuple(pts[k] + (s * math.cos(an) + u * math.sin(an)) * rr))
        for k in range(n - 1):
            a = i0 + sides * k; b = a + sides
            for j in range(sides):
                self.f.append([a + j, a + (j + 1) % sides, b + (j + 1) % sides, b + j])
        if caps:
            self.f.append(list(range(i0 + sides - 1, i0 - 1, -1)))
            e = i0 + sides * (n - 1); self.f.append(list(range(e, e + sides)))

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

    def slab(self, outline, C, A, Z, N, t0, t1):
        """convex 2D outline (a, z) in the frame (A, Z) about C, extruded along N from t0 to t1."""
        C, A, Z, N = Vector(C), Vector(A), Vector(Z), Vector(N)
        n = len(outline); i = len(self.v)
        self.v += [tuple(C + A * a + Z * z + N * t0) for a, z in outline] + [tuple(C + A * a + Z * z + N * t1) for a, z in outline]
        self.f.append(list(range(i, i + n))); self.f.append(list(range(i + 2 * n - 1, i + n - 1, -1)))
        for k in range(n):
            k2 = (k + 1) % n
            self.f.append([i + k, i + k2, i + n + k2, i + n + k])

    def blob(self, c, r, sq=1.0, seed=0, sub=1):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
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


def deform(v):
    """storybook roofline: the ridge sags in the middle, sits higher at the -X end and wanders a little in plan;
    the eave tips flick up. Weighted by height above the girt, so walls and footing stay put."""
    L, W, a, z0, zt, zr = dims()
    x, y, z = v
    w = min(max((z - zt) / (zr - zt), 0.0), 1.0)
    xr = L / 2 + P['gable_over'] + 0.3
    xn = max(-1.0, min(1.0, x / xr))
    z += (-P['sag'] * (1 - xn * xn) - P['tilt'] * xn * 0.5) * w
    y += P['wander'] * math.sin(xn * 1.4) * w * w
    if z > z0:
        x += P['lean'] * min((z - z0) / (zr - z0), 1.2)
    over = abs(y) - W / 2
    if over > 0 and z > z0 + 1.0:
        z += P['flare'] * (over / P['eave_over']) ** 2
    return (x, y, z)


def realize():
    objs = []
    for (name, m), p in PARTS.items():
        if not p.f:
            continue
        verts = p.v if name in NO_DEFORM else [deform(v) for v in p.v]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], p.f)
        me.materials.append(mat(m))
        me.validate(); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        if name not in NO_RECALC:
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for f in me.polygons:
            f.use_smooth = False
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        if name in BEVEL:
            bw, sg = BEVEL[name]
            md = o.modifiers.new('bevel', 'BEVEL'); md.width = bw; md.segments = sg
            md.limit_method = 'ANGLE'; md.angle_limit = math.radians(40); md.use_clamp_overlap = True
        objs.append(o)
    return objs


# ------------------------------------------------------------------ geometry
def dims():
    L, W = P['L'], P['W']; a = math.radians(P['pitch'])
    z0 = P['found_h']; zt = z0 + P['wall_h']
    zr = zt + 0.1 + (W / 2 + P['eave_over']) * math.tan(a) + P['roof_t'] / math.cos(a)
    return L, W, a, z0, zt, zr


def wall_top():
    L, W, a, z0, zt, zr = dims()
    return zr - P['roof_t'] / math.cos(a) - (W / 2) * math.tan(a) - 0.02


def apex_z():
    L, W, a, z0, zt, zr = dims()
    return zr - P['roof_t'] / math.cos(a) - 0.05


def bulge_at(u, z):
    """outward plaster bulge on a wall at along-fraction u (0..1) and height z (lower wall only)."""
    L, W, a, z0, zt, zr = dims()
    v = (z - z0) / (zt - 0.14 - z0)
    if v <= 0 or v >= 1 or u <= 0 or u >= 1:
        return 0.0
    return P['bulge'] * math.sin(math.pi * u) * math.sin(math.pi * v)


def foundation(rnd):
    L, W, a, z0, zt, zr = dims()
    fo = P['found_out']; hx, hy = L / 2 + fo, W / 2 + fo
    core = part('foundation_core', 'Stone_Dark')
    core.box((0, 0, z0 / 2 - 0.01), (2 * hx - 0.12, 2 * hy - 0.12, z0 - 0.02))
    st = part('foundation_stones', 'Stone_Grey')
    # big rounded fieldstones: some run the full height, others split into two lumpy courses
    gap = 0.05
    for face in range(4):
        ln = 2 * hx if face < 2 else 2 * hy
        s = -ln / 2
        while s < ln / 2 - 0.05:
            w = rnd.uniform(0.75, 1.15)
            e = min(s + w, ln / 2)
            if ln / 2 - e < 0.3:
                e = ln / 2
            if rnd.random() < 0.35:
                spans = [(0.0, z0)]
            else:
                zs = z0 * rnd.uniform(0.42, 0.6); spans = [(0.0, zs), (zs, z0)]
            for k, (za, zb) in enumerate(spans):
                sa, sb = (s, e) if len(spans) == 1 or k == 0 else (s + rnd.uniform(-0.12, 0.12), e + rnd.uniform(-0.12, 0.12))
                sa, sb = max(sa, -ln / 2), min(sb, ln / 2)
                c = (sa + sb) / 2; zc = (za + zb) / 2 + 0.01
                hgt = zb - za - gap + rnd.uniform(0, 0.04); dep = 0.26 + rnd.uniform(0, 0.08); wd = sb - sa - gap
                tilt = Matrix.Rotation(rnd.uniform(-0.07, 0.07), 3, 'X') @ Matrix.Rotation(rnd.uniform(-0.07, 0.07), 3, 'Y')
                out = rnd.uniform(-0.01, 0.05)
                # the bottom and the inward face are never seen: left open to save triangles
                if face == 0:
                    st.box((c, -hy + dep / 2 - 0.03 - out, zc), (wd, dep, hgt), tilt, skip=('-z', '+y'))
                elif face == 1:
                    st.box((c, hy - dep / 2 + 0.03 + out, zc), (wd, dep, hgt), tilt, skip=('-z', '-y'))
                elif face == 2:
                    st.box((-hx + dep / 2 - 0.03 - out, c, zc), (dep, wd, hgt), tilt, skip=('-z', '+x'))
                else:
                    st.box((hx - dep / 2 + 0.03 + out, c, zc), (dep, wd, hgt), tilt, skip=('-z', '-x'))
            s = e
    floor = part('floor', 'Plank_Floor')
    floor.box((0, 0, z0 - 0.03), (L - 0.02, W - 0.02, 0.06))
    # door step on the -X gable: two chunky stone slabs
    step = part('door_step', 'Stone_Step')
    step.box((-hx - 0.36, 0.0, 0.17), (0.66, 1.6, 0.34), Matrix.Rotation(0.03, 3, 'Z'))
    step.box((-hx - 0.14, 0.04, 0.5), (0.4, 1.3, 0.34), Matrix.Rotation(-0.02, 3, 'Z'))


def arc_pts(c, r, a0, a1, n, A, Z):
    c, A, Z = Vector(c), Vector(A), Vector(Z)
    return [c + A * (r * math.cos(a0 + (a1 - a0) * i / n)) + Z * (r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def bowed(a, b, bow, side, n=4):
    """polyline from a to b bowed sideways by `bow` along `side` (a soft, hand-hewn timber)."""
    a, b, side = Vector(a), Vector(b), Vector(side)
    return [a.lerp(b, i / n) + side * (bow * math.sin(math.pi * i / n)) for i in range(n + 1)]


def curved(a, b, bend, side, n=5):
    """an arched brace: a quarter-ish curve from a to b, bulging along `side` (bend = sagitta)."""
    return bowed(a, b, bend, side, n)


def frame(rnd, complete):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2; ps = P['post']; t = P['timber']
    tb = part('timber_frame', 'Timber_Brown')
    zw = wall_top(); apex = apex_z()
    off = 0.08            # timber centre proud of the wall plane (the plaster bulges up to P['bulge'])
    # corner posts, softly bowed
    for sx in (-1, 1):
        for sy in (-1, 1):
            pts = bowed((sx * hx, sy * hy, z0 - 0.02), (sx * hx, sy * hy, zt), 0.05, (sx * 0.7, sy * 0.7, 0), 3)
            tb.sweep(pts, ps, ps, (0, -1, 0) if sx < 0 else (0, 1, 0))
    # long walls: eave plate / girt with ends running past the gables, curved knee braces at the top corners
    for sy in (-1, 1):
        y = sy * (hy + off)
        tb.beam((-hx - P['gable_over'] + 0.05, y, zt - 0.02), (hx + P['gable_over'] - 0.05, y, zt - 0.02), t + 0.04, 0.24)
        tb.beam((-hx, sy * hy, zw - 0.12), (hx, sy * hy, zw - 0.12), ps, 0.2)
        for sx in (-1, 1):
            a0 = (sx * (hx - 0.12), y, zt - 0.75); a1 = (sx * (hx - 0.8), y, zt - 0.12)
            tb.sweep(curved(a0, a1, 0.16, (sx, 0, 0.8)), t - 0.02, t, (0, sy, 0))
    # sill beams for the bare frame (the charming hero has plaster straight onto the stones, so only in the frame stages)
    if not complete:
        for sy in (-1, 1):
            tb.beam((-hx, sy * hy, z0 + 0.08), (hx, sy * hy, z0 + 0.08), ps, 0.16)
        for sx in (-1, 1):
            tb.beam((sx * hx, -hy, z0 + 0.08), (sx * hx, hy, z0 + 0.08), ps, 0.16)
        for x in (-P['win_x'] - 0.7, -P['win_x'] + 0.7, P['win_x'] - 0.7, P['win_x'] + 0.7):
            tb.box((x, -hy, (z0 + zt) / 2), (t, t, zt - z0))
    # gable ends
    for sx in (-1, 1):
        x = sx * (hx + off); N = (sx, 0, 0)
        # girt across the gable, ends running past the corners (hero)
        tb.beam((x, -hy - 0.42, zt - 0.02), (x, hy + 0.42, zt - 0.02), t + 0.04, 0.24)
        # king post and the arched (wishbone) braces in the gable triangle
        tb.sweep([(x + sx * 0.02, 0, zt + 0.08), (x + sx * 0.02, 0, apex - 0.05)], t + 0.02, t + 0.02, N)
        for s in (-1, 1):
            yb = s * hy * 0.66; zb = zr - abs(yb) * math.tan(a) - P['roof_t'] / math.cos(a) - 0.12
            tb.sweep(curved((x, s * 0.1, zt + 0.15), (x, yb, zb), 0.22, (0, -s, 0.7)), t - 0.02, t, N)
        if sx < 0:
            # door posts and arched braces from the corner posts down toward the door posts
            dp = P['door_post']
            for s in (-1, 1):
                tb.sweep(bowed((x, s * dp, z0), (x, s * dp, zt - 0.1), 0.03, (0, s, 0), 3), t, t, N)
                tb.sweep(curved((x, s * (hy - 0.12), zt - 0.95), (x, s * (dp + 0.15), z0 + 0.12), 0.2, (0, s, -0.6)), t - 0.02, t, N)
        else:
            wp = P['win_w'] / 2 + 0.55
            for s in (-1, 1):
                tb.sweep(curved((x, s * (hy - 0.12), zt - 0.75), (x, s * (hy - 0.8), zt - 0.12), 0.16, (0, -s, 0.8)), t - 0.02, t, N)
                tb.sweep(curved((x, s * (hy - 0.12), z0 + 0.7), (x, s * (wp + 0.1), z0 + 0.1), 0.16, (0, -s, -0.8)), t - 0.02, t, N)
    if not complete:
        rf = part('rafters', 'Timber_Brown')
        under = zr - P['roof_t'] / math.cos(a)
        rf.beam((-hx - 0.3, 0, under - 0.08), (hx + 0.3, 0, under - 0.08), 0.2, 0.22)
        n = 6
        for i in range(n):
            x = -hx + i * L / (n - 1)
            for s in (-1, 1):
                ye = s * (hy + P['eave_over'] * 0.6); ze = under - abs(ye) * math.tan(a)
                rf.beam((x, 0, under - 0.1), (x, ye, ze - 0.08), 0.14, 0.16, up=(1, 0, 0))


def tab(tgt, R0, X, d, n, xa, xb, ut, ub, lift, tt, rr, jt, roll):
    """one rounded (scalloped) shingle tab on a slope: top edge on the deck at ut, rounded butt lifted at ub."""
    xc = (xa + xb) / 2; hw = (xb - xa) / 2
    # butt rounding: angle runs 0..pi from the +x side to the -x side, bulging downslope
    out = [(xa, ut), (xb, ut), (xb, ub - rr)] + [(xc + hw * math.cos(math.pi * k / 4), ub - rr + rr * math.sin(math.pi * k / 4)) for k in range(1, 4)] + [(xa, ub - rr)]

    def place(x, u, extra):
        f = (u - ut) / max(ub - ut, 1e-6)
        return R0 + X * x + d * u + n * (lift * f + jt * (x - xc) + roll * f * (x - xc) + extra)
    B = [place(x, u, 0.0) for x, u in out]; T = [place(x, u, tt) for x, u in out]
    m = len(out); i = len(tgt.v); tgt.v += [tuple(v) for v in B + T]
    tgt.f.append([i + m + k for k in range(m)])
    for k in range(1, m):       # sides, skipping the top edge (k=0, buried under the course above)
        k2 = (k + 1) % m
        tgt.f.append([i + k, i + k2, i + m + k2, i + m + k])


def shingle_slope(rnd, R0, X, d, n, x0, x1, u_max, e, sh, shl, tl_mul=1.7):
    tl = e * tl_mul; tt = P['tab_t']; lift = P['tab_lift']; rr = P['tab_round']
    k = 0; ub = u_max
    while ub > 0.2:
        ut = max(ub - tl, 0.0)
        x = x0 - (0.0 if k % 2 == 0 else rnd.uniform(0.28, 0.4))
        while x < x1 - 0.05:
            w = rnd.uniform(*P['tab_w'])
            xa, xb = max(x, x0), min(x + w, x1)
            if xb - xa > 0.2:
                tgt = shl if rnd.random() < 0.3 else sh
                tab(tgt, R0, X, d, n, xa + 0.02, xb - 0.02, ut, ub + rnd.uniform(-0.04, 0.08),
                    lift + rnd.uniform(-0.03, 0.03), tt, rr, rnd.uniform(-0.04, 0.04), rnd.uniform(-0.06, 0.06))
            x += w
        ub -= e; k += 1


def roof(rnd):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2
    go, eo = P['gable_over'], P['eave_over']
    x0, x1 = -hx - go, hx + go
    deck = part('roof_deck', 'Roof_TealDark')
    sh = part('roof_shingles', 'Roof_Teal')
    shl = part('roof_shingles_light', 'Roof_TealLight')
    u_max = (hy + eo) / math.cos(a)
    X = Vector((1, 0, 0))
    for s in (-1, 1):
        d = Vector((0, s * math.cos(a), -math.sin(a))); n = Vector((0, s * math.sin(a), math.cos(a)))
        R0 = Vector((0, 0, zr))
        c = R0 + d * (u_max / 2) - n * (P['roof_t'] / 2)
        Rm = Matrix((X, d, n)).transposed()
        # deck slab in 6 pieces along x so the sag deform bends it
        for i in range(6):
            xa = x0 + (x1 - x0) * i / 6; xb = x0 + (x1 - x0) * (i + 1) / 6
            deck.box(tuple(c + X * ((xa + xb) / 2)), (xb - xa + 0.01, u_max, P['roof_t']), Rm)
        shingle_slope(rnd, R0, X, d, n, x0, x1, u_max, P['course'], sh, shl)
    # thick rolled ridge running a little past both gables
    rc = part('roof_ridge', 'Roof_TealDark')
    rz = zr + P['tab_lift'] + 0.02
    pts = [(x0 - 0.18 + (x1 - x0 + 0.36) * i / 10, 0, rz) for i in range(11)]
    rc.tube(pts, P['ridge_r'], 8, up=(0, 0, 1))
    # barge boards along the rakes, under the deck edge
    bb = part('barge_boards', 'Timber_Brown')
    for sx in (-1, 1):
        xb = sx * (hx + go - 0.1)
        for s in (-1, 1):
            pts = []
            for i in range(5):
                f = i / 4; yy = s * (hy + eo) * f
                pts.append((xb, yy, zr - abs(yy) * math.tan(a) - P['roof_t'] / math.cos(a) - 0.1))
            bb.sweep(pts, 0.24, 0.2, (sx, 0, 0))
    chimney(rnd)


def dormer_geom():
    L, W, a, z0, zt, zr = dims()
    yd = P['dormer_y']; dw = P['dormer_w']
    zroof = zr - abs(yd) * math.tan(a)            # main deck top at the face plane
    zb = zroof - 0.08                              # face wall starts just under the shingles
    ze = zb + P['dormer_h']                        # dormer eave line
    pa = math.radians(52)
    zrd = ze + (dw / 2 + 0.25) * math.tan(pa)      # dormer ridge
    return yd, dw, zb, ze, zrd, pa


def dormer(rnd):
    L, W, a, z0, zt, zr = dims()
    yd, dw, zb, ze, zrd, pa = dormer_geom()
    xc = P['dormer_x']
    # plaster box from the face plane back into the main roof
    pl = part('dormer_walls', 'Plaster_Cream')
    prof = [(xc - dw / 2, zb - 0.6), (xc + dw / 2, zb - 0.6), (xc + dw / 2, ze), (xc, zrd - 0.12), (xc - dw / 2, ze)]
    pl.prism(prof, 'y', yd, -0.2)
    # dormer roof: two deck slabs and scalloped tabs, ridge running back into the main roof
    deck = part('roof_deck', 'Roof_TealDark')
    sh = part('roof_shingles', 'Roof_Teal'); shl = part('roof_shingles_light', 'Roof_TealLight')
    y0, y1 = yd - 0.32, -0.15
    u_max = (dw / 2 + 0.32) / math.cos(pa)
    Y = Vector((0, 1, 0))
    for s in (-1, 1):
        d = Vector((s * math.cos(pa), 0, -math.sin(pa))); n = Vector((s * math.sin(pa), 0, math.cos(pa)))
        R0 = Vector((xc, 0, zrd))
        c = R0 + Y * ((y0 + y1) / 2) + d * (u_max / 2) - n * 0.08
        deck.box(tuple(c), (y1 - y0, u_max, 0.16), Matrix((Y, d, n)).transposed())
        shingle_slope(rnd, R0, Y, d, n, y0, y1, u_max, 0.42, sh, shl)
    rc = part('roof_ridge', 'Roof_TealDark')
    rc.tube([(xc, y0 - 0.12, zrd + 0.12), (xc, y1, zrd + 0.12)], 0.16, 8, up=(0, 0, 1))
    # timber trim round the dormer gable
    fr = part('window_frames', 'Timber_Brown')
    for s in (-1, 1):
        fr.beam((xc + s * (dw / 2 + 0.22), yd - 0.25, ze - 0.12), (xc, yd - 0.25, zrd - 0.05), 0.14, 0.14, up=(0, -1, 0), ext=0.06)
    window((xc, yd, 0), (0, -1, 0), (1, 0, 0), zb + 0.22, rnd, w=0.62, h=0.95, shutters=False, flowers=False)


def chimney(rnd):
    L, W, a, z0, zt, zr = dims()
    cx, cy, cw = P['chim_x'], P['chim_y'], P['chim_w']
    zb = zr - (abs(cy) + cw / 2) * math.tan(a) - 0.3
    top = zr + P['chim_above']
    pivot = Vector((cx, cy, zb + 0.6))
    lean = Matrix.Rotation(math.radians(P['chim_lean']), 3, Vector((-0.4, 1, 0)).normalized())

    def L_(p):
        return tuple(lean @ (Vector(p) - pivot) + pivot)
    st = part('chimney', 'Stone_Cream')
    br = part('chimney_bricks', 'Brick_Red')
    cap = part('chimney_cap', 'Brick_Red')
    pots = part('chimney_pots', 'Clay_Pot')
    # chunky stone stack, slightly tapered (built as a lumpy prism, then leaned)
    i0 = len(st.v)
    rings = [(zb, cw / 2 + 0.03), (top - 0.1, cw / 2 - 0.04)]
    for z, r in rings:
        for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            st.v.append(L_((cx + sx * r, cy + sy * r, z)))
    st.f += [[i0 + 3, i0 + 2, i0 + 1, i0], [i0 + 4, i0 + 5, i0 + 6, i0 + 7]]
    for k in range(4):
        k2 = (k + 1) % 4
        st.f.append([i0 + k, i0 + k2, i0 + 4 + k2, i0 + 4 + k])
    # a few big stones bulging off the stack, and brick patches (stone below, brick above, as in the hero)
    zroof = zr - (cy - cw / 2) * math.tan(a)
    for k in range(5):
        z = zroof + 0.15 + k * 0.32
        if z > top - 0.3:
            break
        sx = rnd.choice((-1, 1))
        Rb = lean @ Matrix.Rotation(rnd.uniform(-0.1, 0.1), 3, 'Z')
        if k % 2 == 0:
            st.box(L_((cx + rnd.uniform(-0.2, 0.2), cy - cw / 2 + 0.01, z)), (rnd.uniform(0.3, 0.45), 0.1, 0.24), Rb)
        else:
            bx_ = cx + cw / 2 - 0.2 + rnd.uniform(-0.05, 0.05)
            br.box(L_((bx_, cy - cw / 2 + 0.01, z)), (0.4, 0.12, 0.19), Rb)
            br.box(L_((bx_ + 0.05, cy - cw / 2 + 0.01, z + 0.21)), (0.34, 0.12, 0.19), Rb)
    br.box(L_((cx + cw / 2 - 0.16, cy - cw / 2, top - 0.5)), (0.34, 0.12, 0.2), lean)
    br.box(L_((cx + cw / 2 - 0.12, cy - cw / 2, top - 0.72)), (0.26, 0.12, 0.2), lean)
    br.box(L_((cx - cw / 2, cy - 0.15, top - 0.5)), (0.12, 0.36, 0.2), lean)
    # chunky brick cap: a ring of big bricks and a corbel course
    cap.box(L_((cx, cy, top)), (cw + 0.4, cw + 0.4, 0.3), lean)
    for j, (dx, dy, sx_, sy_) in enumerate(((-0.27, -1, 0.5, 0.18), (0.27, -1, 0.5, 0.18), (-0.27, 1, 0.5, 0.18), (0.27, 1, 0.5, 0.18),
                                          (-1, -0.27, 0.18, 0.5), (-1, 0.27, 0.18, 0.5), (1, -0.27, 0.18, 0.5), (1, 0.27, 0.18, 0.5))):
        px = dx if abs(dx) < 1 else dx * (cw / 2 + 0.18); py = dy if abs(dy) < 1 else dy * (cw / 2 + 0.18)
        cap.box(L_((cx + px, cy + py, top + 0.24)), (sx_ + 0.06, sy_ + 0.04, 0.26), lean)
    # two chimney pots
    for dx in (-0.2, 0.2):
        b = Vector((cx + dx * 1.3, cy, top + 0.3)); tpt = b + Vector((0, 0, 0.36))
        pts = [L_(b), L_(tpt)]
        pots.tube(pts, 0.2, 8, up=(1, 0, 0))
        pots.tube([L_(tpt - Vector((0, 0, 0.08))), L_(tpt + Vector((0, 0, 0.04)))], 0.25, 8, up=(1, 0, 0))


def wall_skin(pl, O, A, Z, N, length, top, nu, rows_lo, rows_hi, gable):
    """bulging plaster skin: O = bottom-left corner on the wall plane, A along (A x Z = N), top(u) = z of the top edge."""
    L, W, a, z0, zt, zr = dims()
    O, A, Z, N = Vector(O), Vector(A), Vector(Z), Vector(N)
    zl = zt - 0.14
    grid = []
    for j in range(nu + 1):
        u = j / nu; col = []
        tz = top(u)
        zs = [z0 + (zl - z0) * k / rows_lo for k in range(rows_lo + 1)]
        if gable:
            zs += [zl + (tz - zl) * k / rows_hi for k in range(1, rows_hi + 1)]
        else:
            zs += [tz]
        for z in zs:
            b = bulge_at(u, z)
            if gable and z > zt:
                f = (z - zt) / max(tz - zt, 1e-6)
                b = P['bulge_gable'] * math.sin(math.pi * u) * math.sin(math.pi * min(f, 1.0)) * min(1.0, (z - zt) / 0.3)
            col.append(tuple(O + A * (u * length) + Z * z + N * b))
        grid.append(col)
    nz = len(grid[0]); i0 = len(pl.v)
    for col in grid:
        pl.v += col
    for j in range(nu):
        for k in range(nz - 1):
            a_ = i0 + j * nz + k; b_ = i0 + (j + 1) * nz + k
            pl.f.append([a_, b_, b_ + 1, a_ + 1])


def walls():
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2, W / 2
    pl = part('plaster_walls', 'Plaster_Cream')
    zw = wall_top(); apex = apex_z()
    flat = lambda u: zw
    wall_skin(pl, (-hx, -hy, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), L, flat, 10, 5, 0, False)
    wall_skin(pl, (hx, hy, 0), (-1, 0, 0), (0, 0, 1), (0, 1, 0), L, flat, 10, 5, 0, False)
    gtop = lambda u: max(apex - abs(u - 0.5) * W * math.tan(a), zw)
    wall_skin(pl, (-hx, hy, 0), (0, -1, 0), (0, 0, 1), (-1, 0, 0), W, gtop, 8, 5, 5, True)
    wall_skin(pl, (hx, -hy, 0), (0, 1, 0), (0, 0, 1), (1, 0, 0), W, gtop, 8, 5, 5, True)
    # dark core so nothing looks hollow through any gap
    core = part('wall_core', 'Plaster_Cream')
    core.prism([(-hy + 0.03, z0), (hy - 0.03, z0), (hy - 0.03, zw), (0, apex - 0.05), (-hy + 0.03, zw)], 'x', -hx + 0.03, hx - 0.03)


def arch_outline(w, h, n=6):
    r = w / 2
    pts = [(-r, 0.0), (r, 0.0)]
    pts += [(r * math.cos(math.pi * i / n), h - r + r * math.sin(math.pi * i / n)) for i in range(n + 1)]
    return pts[:2] + pts[2:]


def window(pos, normal, along, zb, rnd, w=None, h=None, shutters=True, flowers=True, u=None):
    """arched window. pos: point on the wall plane under the window centre; zb: glass bottom z.
    u: along-fraction on the wall (for the plaster bulge)."""
    w = w or P['win_w']; h = h or P['win_h']
    N = Vector(normal); A = Vector(along); Z = Vector((0, 0, 1))
    b = bulge_at(u, zb + h * 0.5) if u is not None else 0.0
    C = Vector(pos) + N * b
    gl = part('window_glass', 'Glass_Blue')
    gl.slab(arch_outline(w, h), C + Z * zb, A, Z, N, -0.02, 0.05)
    fr = part('window_frames', 'Timber_Brown')
    ft = 0.13; r = w / 2 + ft / 2
    ring = [C + A * (r) + Z * zb, ] + arc_pts(C + Z * (zb + h - w / 2), r, 0, math.pi, 6, A, Z) + [C - A * r + Z * zb]
    fr.sweep([C + A * r + Z * (zb - ft / 2)] + ring[1:-1] + [C - A * r + Z * (zb - ft / 2)], ft, 0.14, tuple(N))
    Rw = Matrix((A, N, Z)).transposed()
    fr.box(tuple(C + Z * (zb - 0.07) + N * 0.1), (w + 2 * ft + 0.1, 0.2, 0.12), Rw)       # sill
    fr.box(tuple(C + Z * (zb + (h - w / 2) / 2 + w / 4) + N * 0.07), (0.065, 0.06, h - 0.05), Rw)   # mullion
    for zz in (zb + (h - w / 2) * 0.45, zb + h - w / 2 + 0.02):
        fr.box(tuple(C + Z * zz + N * 0.07), (w, 0.06, 0.065), Rw)
    if shutters:
        shp = part('shutters', 'Plank_Shutter')
        sw = w * 0.62; sh_h = h - 0.05
        for s in (-1, 1):
            cc = C + A * (s * (w / 2 + ft + sw / 2 + 0.03)) + Z * (zb + sh_h / 2 - 0.02) + N * 0.12
            tw = Matrix.Rotation(s * 0.025, 3, N)
            shp.box(tuple(cc), (sw, 0.09, sh_h), tw @ Rw)
            for zz in (-0.32, 0.32):
                shp.box(tuple(cc + Z * zz + N * 0.06), (sw - 0.06, 0.05, 0.11), tw @ Rw)
    if flowers:
        fb = part('flower_boxes', 'Timber_Brown')
        bz = zb - 0.26
        fb.box(tuple(C + Z * bz + N * 0.24), (w + 0.42, 0.3, 0.26), Rw)
        for s in (-1, 1):
            fb.beam(tuple(C + A * (s * (w / 2 - 0.02)) + Z * (bz - 0.34) + N * 0.06), tuple(C + A * (s * (w / 2 - 0.02)) + Z * (bz - 0.1) + N * 0.3),
                    0.07, 0.07, up=tuple(A))
        lf = part('flower_leaves', 'Leaf_Green')
        n = 4
        for i in range(n):
            x = -w / 2 - 0.08 + i * (w + 0.16) / (n - 1)
            lf.blob(tuple(C + A * x + N * (0.26 + rnd.uniform(-0.03, 0.03)) + Z * (bz + 0.2)), 0.2, 0.75, seed=rnd.randint(0, 999))
        for i in range(5):
            x = -w / 2 + i * w / 4 + rnd.uniform(-0.04, 0.04)
            m = 'Flower_Pink' if i % 2 == 0 else 'Flower_Orange'
            part('flowers' if m == 'Flower_Pink' else 'flowers_orange', m).blob(
                tuple(C + A * x + N * (0.3 + rnd.uniform(-0.05, 0.05)) + Z * (bz + 0.34 + rnd.uniform(-0.02, 0.06))), 0.13, 0.8, seed=rnd.randint(0, 999), sub=0)


def door(rnd):
    """oversized arched door on the -X gable, with a round window, an arched timber hood and an iron latch."""
    L, W, a, z0, zt, zr = dims()
    hx = L / 2; dw = P['door_w']; dh = P['door_h']
    C = Vector((-hx, 0.0, 0)); A = Vector((0, -1, 0)); Z = Vector((0, 0, 1)); N = Vector((-1, 0, 0))
    leaf = part('door_leaf', 'Plank_Door')
    leaf.slab(arch_outline(dw, dh, 8), C + Z * (z0 - 0.02), A, Z, N, -0.02, 0.14)
    for k in (-1, 1):   # plank grooves
        leaf.box(tuple(C + A * (k * dw / 4) + Z * (z0 + (dh - dw / 2) / 2) + N * 0.15), (0.02, 0.03, dh - dw / 2 - 0.1))
    # round window in the leaf
    gl = part('window_glass', 'Glass_Blue')
    wc = C + Z * (z0 + dh - dw / 2 - 0.05); rw = 0.24
    circ = [(rw * math.cos(2 * math.pi * i / 10), rw * math.sin(2 * math.pi * i / 10)) for i in range(10)]
    gl.slab(circ, wc, A, Z, N, 0.1, 0.17)
    fr = part('door_frame', 'Timber_Brown')
    fr.sweep([wc + N * 0.18 + A * ((rw + 0.04) * math.cos(2 * math.pi * i / 10)) + Z * ((rw + 0.04) * math.sin(2 * math.pi * i / 10)) for i in range(10)],
             0.08, 0.08, tuple(N), closed=True)
    Rd = Matrix((A, N, Z)).transposed()
    fr.box(tuple(wc + N * 0.2), (0.05, 0.04, 2 * rw), Rd); fr.box(tuple(wc + N * 0.2), (2 * rw, 0.04, 0.05), Rd)
    iron = part('door_handle', 'Metal_Iron')
    iron.box(tuple(C + A * (dw / 2 - 0.17) + Z * (z0 + 1.0) + N * 0.2), (0.07, 0.08, 0.2), Rd)
    iron.blob(tuple(C + A * (dw / 2 - 0.17) + Z * (z0 + 0.9) + N * 0.24), 0.05, 1.0, seed=3, sub=1)
    # arched hood: a thick curved timber springing from the door posts
    rh = P['door_post'] - 0.02
    zs = z0 + dh - dw / 2 + 0.05
    hood = arc_pts(C + Z * zs + N * 0.2, rh, 0.12, math.pi - 0.12, 8, A, Z)
    fr.sweep(hood, 0.2, 0.16, tuple(N))
    # inner plaster arch reveal around the leaf (a shallow raised band, as in the hero)
    rv = part('plaster_trim', 'Plaster_Cream')
    rv.sweep([C + A * (dw / 2 + 0.11) + Z * (z0 + 0.02) + N * 0.06] + arc_pts(C + Z * (z0 + dh - dw / 2) + N * 0.06, dw / 2 + 0.11, 0, math.pi, 8, A, Z)
             + [C - A * (dw / 2 + 0.11) + Z * (z0 + 0.02) + N * 0.06], 0.2, 0.14, tuple(N))


def planned(rnd):
    L, W, a, z0, zt, zr = dims()
    hx, hy = L / 2 + P['found_out'], W / 2 + P['found_out']
    stk = part('stakes', 'Timber_Stake')
    ln = part('string_lines', 'Rope_Line')
    sd = part('dug_outline', 'Soil_Dug')
    zl = 0.32
    for sx in (-1, 1):
        for sy in (-1, 1):
            stk.box((sx * hx, sy * hy, 0.25), (0.09, 0.09, 0.5), Matrix.Rotation(rnd.uniform(-0.08, 0.08), 3, 'X'))
            bx, by = sx * (hx + 0.55), sy * (hy + 0.55)
            stk.box((bx, by, 0.3), (0.1, 0.1, 0.6), Matrix.Rotation(rnd.uniform(-0.06, 0.06), 3, 'Y'))
            stk.box((bx - sx * 0.55, by, 0.3), (0.09, 0.09, 0.6))
            stk.box((bx, by - sy * 0.55, 0.3), (0.09, 0.09, 0.6))
            stk.box((bx - sx * 0.3, by, 0.5), (0.7, 0.06, 0.14), Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'Y'))
            stk.box((bx, by - sy * 0.3, 0.5), (0.06, 0.7, 0.14), Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'X'))
    for sy in (-1, 1):
        ln.beam((-hx - 0.62, sy * hy, zl + 0.2), (hx + 0.62, sy * hy, zl + 0.2), 0.05, 0.05)
    for sx in (-1, 1):
        ln.beam((sx * hx, -hy - 0.62, zl + 0.2), (sx * hx, hy + 0.62, zl + 0.2), 0.05, 0.05)
    stk.box((-hx - 0.5, 0.0, 0.2), (0.08, 0.08, 0.4))      # door marker peg on the -X gable
    tw = 0.38
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
        wz = z0 + P['win_z']
        rw = random.Random(9)
        for x in (-P['win_x'], P['win_x']):
            window((x, -hy, 0), (0, -1, 0), (1, 0, 0), wz, rw, u=(x + hx) / L)
        window((0, hy, 0), (0, 1, 0), (-1, 0, 0), wz, rw, u=0.5)
        window((hx, 0, 0), (1, 0, 0), (0, 1, 0), wz, rw, u=0.5)
        door(random.Random(13))
        dormer(random.Random(15))
    return realize()


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def tri_count(objs):
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in objs:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
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

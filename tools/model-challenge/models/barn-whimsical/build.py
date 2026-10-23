"""R-02 Barn, style B (whimsical). Standalone builder: `python build.py` -> barn-whimsical.glb

Z up, metres, origin at the centre of the footprint on the ground, front faces -Y.
Main barn: long axis Y, tall bell-curved gambrel gable faces -Y (front) with the big round-top doors.
Annex: lower wing on +X with its own little gable + round-top doors, also facing -Y.
Silo: fat cream barrel with a red dome, behind the annex (+X, +Y).
Moving: door_left/door_right (main), annex_door_left/right, weathervane (rooster + arrow), lantern.
"""
import math, random, os
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'barn-whimsical.glb')

P = dict(
    hw=2.4, L=7.0,            # main wall half-width (x) and length (y)
    wall_h=2.75,
    # right half of the main roof profile (x, z), eave -> ridge; mirrored for the left half
    roof=[(2.78, 2.55), (2.42, 3.05), (1.95, 3.85), (1.64, 4.9), (1.46, 6.25), (1.28, 7.7), (1.0, 8.85), (0.62, 9.65), (0.0, 10.1)],
    roof_t=0.14, over=0.38,   # roof slab thickness, gable overhang
    row=0.58, tab=0.95,        # shingle course step, tab width
    lean=1.1,                 # x shift at the ridge (whole barn leans toward the silo)
    # annex (+X wing)
    ax=3.8, ahw=1.35, ay=(-3.1, 0.3), a_wall=2.2,
    aroof=[(1.68, 2.05), (1.42, 2.45), (1.18, 2.9), (0.98, 3.5), (0.62, 4.05), (0.0, 4.35)],
    # silo
    silo_c=(3.85, 2.0), silo_r=1.5, silo_h=7.6, dome_h=2.1,
    # front openings
    door_w=1.8, door_h=2.7, adoor_w=1.15, adoor_h=2.0,
    # cupola
    cup_y=-2.0, cup_base=9.35, cup_w=1.25, cup_top=11.2, cup_tilt=(-4.0, -7.0, 5.0),
    # ground
    ground_c=(1.3, 0.1), ground_r=(4.9, 4.9),
)

COLS = dict(
    RedPlank=(190, 76, 64), RedBatten=(160, 60, 50), CoralShingle=(212, 102, 84), ShingleDark=(178, 74, 60),
    CreamTrim=(240, 218, 182), SiloCream=(242, 228, 202), DomeRed=(186, 66, 54), Teal=(104, 150, 134),
    Grass=(124, 160, 88), Stone=(156, 146, 132), Glass=(40, 52, 54), DoorCoral=(216, 112, 94), Iron=(52, 48, 46),
    WoodBox=(140, 88, 56), Leaf=(80, 130, 62), FlowerPink=(236, 124, 156), FlowerOrange=(242, 150, 60),
    FlowerYellow=(246, 208, 84), RoosterRed=(206, 62, 46), RoosterGold=(242, 182, 62), DarkInterior=(42, 30, 28),
    LanternGlow=(255, 214, 120),
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
        b = m.node_tree.nodes.get('Principled BSDF')
        b.inputs['Base Color'].default_value = lin(COLS[name])
        b.inputs['Roughness'].default_value = 0.8
        if name == 'LanternGlow':
            b.inputs['Emission Color'].default_value = lin(COLS[name])
            b.inputs['Emission Strength'].default_value = 2.0
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ mesh accumulation
class Part:
    def __init__(s):
        s.v, s.f, s.m, s.mats = [], [], [], []

    def add(s, verts, faces, m, mtx=None):
        o = len(s.v)
        for v in verts:
            V = Vector(v)
            s.v.append(mtx @ V if mtx else V)
        if m not in s.mats:
            s.mats.append(m)
        i = s.mats.index(m)
        for f in faces:
            s.f.append([o + k for k in f]); s.m.append(i)

    def add_bm(s, bm, m, mtx=None):
        bm.verts.index_update()
        s.add([v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces], m, mtx)
        bm.free()

    def build(s, name, loc=(0, 0, 0), smooth=False, origin=None, bevel=0.0):
        me = bpy.data.meshes.new(name)
        off = Vector(origin) if origin else Vector((0, 0, 0))
        me.from_pydata([tuple(v - off) for v in s.v], [], s.f)
        for mm in s.mats:
            me.materials.append(mat(mm))
        for p, i in zip(me.polygons, s.m):
            p.material_index = i
            p.use_smooth = smooth
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free(); me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = Vector(loc) + off if origin else Vector(loc)
        if bevel:
            md = ob.modifiers.new('bevel', 'BEVEL'); md.width = bevel; md.segments = 1; md.limit_method = 'ANGLE'
        return ob


# ------------------------------------------------------------------ primitive geometry
def prism(pts, y0, y1):
    n = len(pts)
    v = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    f = [list(range(n)), list(range(2 * n - 1, n - 1, -1))]
    f += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    return v, f


def ring(outer, inner, y0, y1):
    n = len(outer)
    v = [(x, y0, z) for x, z in outer] + [(x, y0, z) for x, z in inner] + [(x, y1, z) for x, z in outer] + [(x, y1, z) for x, z in inner]
    f = []
    for i in range(n):
        j = (i + 1) % n
        f.append([i, j, n + j, n + i])                    # front band
        f.append([2 * n + i, 3 * n + i, 3 * n + j, 2 * n + j])  # back band
        f.append([i, 2 * n + i, 2 * n + j, j])            # outer side
        f.append([n + i, n + j, 3 * n + j, 3 * n + i])    # inner side
    return v, f


def box(c, s):
    x, y, z = c; a, b, d = s[0] / 2, s[1] / 2, s[2] / 2
    v = [(x + i * a, y + j * b, z + k * d) for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)]
    f = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
    return v, f


def lathe(prof, seg, cx=0.0, cy=0.0, phase=0.0):
    """prof: list of (r, z) bottom->top. r == 0 ends become poles."""
    v, f, rings = [], [], []
    for r, z in prof:
        if r == 0:
            rings.append([len(v)]); v.append((cx, cy, z))
        else:
            idx = []
            for k in range(seg):
                a = 2 * math.pi * k / seg + phase
                idx.append(len(v)); v.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
            rings.append(idx)
    for A, B in zip(rings, rings[1:]):
        if len(A) == 1:
            f += [[A[0], B[(k + 1) % seg], B[k]] for k in range(seg)]
        elif len(B) == 1:
            f += [[A[k], A[(k + 1) % seg], B[0]] for k in range(seg)]
        else:
            f += [[A[k], A[(k + 1) % seg], B[(k + 1) % seg], B[k]] for k in range(seg)]
    if len(rings[0]) > 1:
        f.append(list(reversed(rings[0])))
    if len(rings[-1]) > 1:
        f.append(list(rings[-1]))
    return v, f


def sphere(part, m, c, r, rot=(0, 0, 0), seg=8, rings=6):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    mtx = Matrix.Translation(c) @ Matrix.LocRotScale(None, __import__('mathutils').Euler(rot), None) @ Matrix.Diagonal((*r, 1))
    part.add_bm(bm, m, mtx)


def blob(part, m, c, r, seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    rnd = random.Random(seed)
    for v in bm.verts:
        v.co *= 1 + rnd.uniform(-0.12, 0.12)
    part.add_bm(bm, m, Matrix.Translation(c) @ Matrix.Diagonal((*r, 1)))


def cyl(part, m, a, b, r, seg=8):
    a, b = Vector(a), Vector(b); d = b - a
    v, f = lathe([(r, 0), (r, d.length)], seg)
    q = d.normalized().to_track_quat('Z', 'Y' if abs(d.normalized().y) < 0.9 else 'X').to_matrix().to_4x4()
    part.add(v, f, m, Matrix.Translation(a) @ q)


# ------------------------------------------------------------------ 2D outlines (x, z)
def catmull(pts, sub=3):
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0 = Vector(pts[max(i - 1, 0)]); p1 = Vector(pts[i]); p2 = Vector(pts[i + 1]); p3 = Vector(pts[min(i + 2, n - 1)])
        for k in range(sub):
            t = k / sub
            out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    out.append(tuple(pts[-1]))
    return out


def full_profile(right, cx=0.0, sub=2):
    left = [(-x, z) for x, z in right]
    pts = left + list(reversed(right))[1:]
    return [(x + cx, z) for x, z in catmull(pts, sub)]


def normals(pts):
    ns = []
    for i in range(len(pts)):
        a = Vector(pts[max(i - 1, 0)]); b = Vector(pts[min(i + 1, len(pts) - 1)])
        t = (b - a).normalized(); ns.append(Vector((-t.y, t.x)))
    return ns


def offset(pts, d):
    return [tuple(Vector(p) + n * d) for p, n in zip(pts, normals(pts))]


def roundtop(cx, z0, w, h, n=8):
    r = w / 2; zc = z0 + h - r
    pts = [(cx - r, z0), (cx + r, z0)]
    pts += [(cx + r * math.cos(math.pi * k / n), zc + r * math.sin(math.pi * k / n)) for k in range(n + 1)]
    return pts


def ellipse(cx, cz, rx, rz, n=12):
    return [(cx + rx * math.cos(2 * math.pi * k / n), cz + rz * math.sin(2 * math.pi * k / n)) for k in range(n)]


def grow(pts, d, cx, cz):
    """scale an outline outward from (cx, cz) by d metres (good enough for convex arches)."""
    out = []
    for x, z in pts:
        v = Vector((x - cx, z - cz)); L = v.length or 1
        out.append((cx + v.x * (L + d) / L, cz + v.y * (L + d) / L))
    return out


def poly_at(pts, s_list):
    """points/tangents along a polyline at arc lengths s."""
    seg = [(Vector(pts[i]), Vector(pts[i + 1])) for i in range(len(pts) - 1)]
    lens = [(b - a).length for a, b in seg]
    res = []
    for s in s_list:
        acc = 0
        for (a, b), L in zip(seg, lens):
            if acc + L >= s or (a, b) == seg[-1]:
                t = min(max((s - acc) / L, 0), 1)
                d = (b - a).normalized()
                res.append((a.lerp(b, t), d)); break
            acc += L
    return res, sum(lens)


# ------------------------------------------------------------------ shingles
def shingle_roof(part, prof, y0, y1, row, tab, lift0, seed, scale=1.0):
    """chunky overlapping rounded tabs in courses from both eaves up to the ridge."""
    rnd = random.Random(seed)
    _, total = poly_at(prof, [0])
    mid = total / 2
    courses = []
    s = 0.22 * scale
    k = 0
    while s < mid - 0.15 * scale:
        courses += [(s, -1, k), (total - s, 1, k)]
        s += row; k += 1
    pts, _ = poly_at(prof, [c[0] for c in courses])
    L = y1 - y0
    for (s, side, k), (p, d) in zip(courses, pts):
        down = -d if side < 0 else d               # unit direction toward this course's eave
        nrm = Vector((-d.y, d.x))                  # outward normal (left of travel direction)
        top, bot = -0.62 * row - 0.1 * scale, 0.42 * scale
        n = max(2, round(L / tab)); w = L / n
        stagger = (k % 2) * w / 2
        edges = [y0] + [y0 + stagger + i * w for i in range(1, n + 1) if y0 + stagger + i * w < y1 - 0.05] + [y1]
        for a, b in zip(edges, edges[1:]):
            a += 0.02; b -= 0.02
            if b - a < 0.12:
                continue
            ch = min(0.16 * scale, (b - a) / 3)
            lift = lift0 + rnd.uniform(0.0, 0.05) * scale
            jt = rnd.uniform(-0.05, 0.05) * scale
            hexa = [(a, top), (b, top), (b, bot - ch + jt), (b - ch, bot + jt), (a + ch, bot + jt), (a, bot - ch + jt)]
            v = []
            for u, t in hexa:
                q = p + down * t + nrm * (0.03 + lift * (t - top) / (bot - top))
                v.append((q.x, u, q.y))
            th = 0.09 * scale
            for u, t in hexa[2:]:
                q = p + down * t + nrm * (0.03 + lift * (t - top) / (bot - top) - th)
                v.append((q.x, u, q.y))
            f = [[0, 1, 2, 3, 4, 5], [2, 6, 7, 3], [3, 7, 8, 4], [4, 8, 9, 5]]
            part.add(v, f, 'ShingleDark' if rnd.random() < 0.28 else 'CoralShingle')


# ------------------------------------------------------------------ pieces
def window(part, cx, z0, w, h, y, kind='arch', bars=True, mtx=None):
    """dark pane, cream frame ring, cream mullions. y = wall plane (front face), builds toward -y."""
    if kind == 'arch':
        inner = roundtop(cx, z0, w, h, 8); czc = z0 + h - w / 2
        outer = grow(inner, 0.12, cx, (z0 + czc) / 2) if h > w * 1.3 else grow(inner, 0.12, cx, z0 + (h - w / 2) * 0.5)
        # rebuild outer as true offset arch for nicer frames
        outer = roundtop(cx, z0 - 0.12, w + 0.24, h + 0.24, 8)
        zc = z0 + h / 2
    else:
        rx, rz = w / 2, h / 2; zc = z0 + rz
        inner = ellipse(cx, zc, rx, rz, 14); outer = ellipse(cx, zc, rx + 0.12, rz + 0.12, 14)
    v, f = prism(inner, y - 0.03, y + 0.01); part.add(v, f, 'Glass', mtx)
    v, f = ring(outer, inner, y - 0.12, y + 0.01); part.add(v, f, 'CreamTrim', mtx)
    if bars:
        v, f = box((cx, y - 0.06, zc if kind != 'arch' else z0 + h * 0.55), (0.06, 0.05, h)); part.add(v, f, 'CreamTrim', mtx)
        v, f = box((cx, y - 0.06, z0 + h * 0.5 if kind == 'arch' else zc), (w, 0.05, 0.06)); part.add(v, f, 'CreamTrim', mtx)


def flower_box(part, cx, z, y, w, seed):
    rnd = random.Random(seed)
    v, f = box((cx, y - 0.16, z), (w, 0.3, 0.24)); part.add(v, f, 'WoodBox')
    blob(part, 'Leaf', (cx, y - 0.17, z + 0.18), (w * 0.5, 0.2, 0.17), seed)
    for i in range(4):
        m = rnd.choice(['FlowerPink', 'FlowerOrange', 'FlowerYellow'])
        x = cx - w * 0.38 + i * w * 0.25 + rnd.uniform(-0.04, 0.04)
        v, f = box((x, y - 0.25 + rnd.uniform(-0.05, 0.05), z + 0.3 + rnd.uniform(0, 0.06)), (0.11, 0.11, 0.09)); part.add(v, f, m)


def bush(part, c, r, seed):
    rnd = random.Random(seed)
    blob(part, 'Leaf', (c[0], c[1], r * 0.92), (r, r * 0.85, r * 0.8), seed)
    for i in range(3):
        a = rnd.uniform(0, 6.28)
        v, f = box((c[0] + 0.7 * r * math.cos(a), c[1] + 0.7 * r * math.sin(a), r * (1.0 + rnd.uniform(0, 0.3))), (0.12, 0.12, 0.1))
        part.add(v, f, rnd.choice(['FlowerPink', 'FlowerOrange', 'FlowerYellow']))


def door_leaf(cx_hinge, side, w, h, yface, name, z0=0.0):
    """one half of a round-top double door. side=-1: left leaf (hinge on the left), +1: right leaf."""
    r = w  # the leaf is half the opening; the arch radius is the full half-width
    zc = z0 + h - r
    p = Part()
    # outline in hinge-local x: left leaf spans 0..w, right leaf spans -w..0
    arc = lambda c, a0, a1, ks: [(c + r * math.cos(math.radians(a0 + (a1 - a0) * k / 6)), zc + r * math.sin(math.radians(a0 + (a1 - a0) * k / 6))) for k in ks]
    if side < 0:
        pts = [(0, z0), (w, z0)] + arc(w, 90, 180, range(0, 7))
    else:
        pts = [(-w, z0), (0, z0)] + arc(-w, 0, 90, range(0, 7))
    v, f = prism(pts, -0.13, 0.0); p.add(v, f, 'DoorCoral')
    sx = 1 if side < 0 else -1
    tw = 0.1
    # cream rails: edge stile at the meeting edge, middle rail, diagonal brace
    v, f = box((sx * (w - tw / 2), -0.15, z0 + h / 2), (tw, 0.04, h - 0.02)); p.add(v, f, 'CreamTrim')
    v, f = box((sx * w / 2, -0.15, z0 + h * 0.52), (w, 0.04, tw)); p.add(v, f, 'CreamTrim')
    v, f = box((sx * w / 2, -0.15, z0 + 0.1), (w, 0.04, tw)); p.add(v, f, 'CreamTrim')
    bl = math.hypot(w, h * 0.45)
    bv, bf = box((0, 0, 0), (bl, 0.04, tw))
    ang = math.atan2(h * 0.45, w) * (1 if side < 0 else -1)
    p.add(bv, bf, 'CreamTrim', Matrix.Translation((sx * w / 2, -0.15, z0 + h * 0.28)) @ Matrix.Rotation(-ang, 4, 'Y'))
    sphere(p, 'Iron', (sx * (w - 0.18), -0.2, z0 + h * 0.4), (0.06, 0.06, 0.06), seg=6, rings=4)
    ob = p.build(name)
    ob.location = (cx_hinge, yface, 0)
    return ob


def lean_dx(z):
    return P['lean'] * (max(0.0, z - 2.4) / (P['roof'][-1][1] - 2.4)) ** 1.6


def apply_lean(ob):
    for v in ob.data.vertices:
        w = ob.matrix_world @ v.co
        v.co.x += lean_dx(w.z)
    ob.data.update()


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = 120
    hw, L = P['hw'], P['L']; yf, yb = -L / 2, L / 2
    prof = full_profile(P['roof'])
    leaners, movers = [], []

    # ---- main body (gable prism under the roof)
    inner = [p for p in offset(prof, -0.06)]
    top = [p for p in reversed(inner) if abs(p[0]) <= hw - 0.02]
    zr = top[0][1] - 0.15; zl = top[-1][1] - 0.15
    body_pts = [(-hw, 0), (hw, 0), (hw, zr)] + top + [(-hw, zl)]
    body = Part(); v, f = prism(body_pts, yf, yb); body.add(v, f, 'RedPlank')
    # plank battens on the front gable
    for k in range(-6, 7):
        x = k * 0.4
        if abs(x) > hw - 0.1:
            continue
        zt = max(z for (px, z) in top if abs(px - x) < 0.25) - 0.2 if any(abs(px - x) < 0.25 for px, _ in top) else 2.5
        z0 = 2.85 if abs(x) < 1.15 else 0.5
        v, f = box((x, yf - 0.015, (z0 + zt) / 2), (0.05, 0.03, zt - z0)); body.add(v, f, 'RedBatten')
    # stone foundation + cream sill
    v, f = box((0, 0, 0.27), (2 * hw + 0.16, L + 0.16, 0.54)); body.add(v, f, 'Stone')
    v, f = box((-2.2, yf - 0.1, 0.27), (0.6, 0.06, 0.5)); body.add(v, f, 'Stone')
    # corner boards
    posts = Part()
    for sx in (-1, 1):
        for sy in (-1, 1):
            v, f = box((sx * (hw + 0.02), sy * (L / 2 + 0.02), 1.6), (0.22, 0.22, 2.4)); posts.add(v, f, 'CreamTrim')
    leaners.append(posts.build('corner_posts', bevel=0.04))
    # dark opening behind the big doors + the frame
    dw, dh = P['door_w'], P['door_h']
    op = roundtop(0, 0.0, dw, dh, 8)
    v, f = prism(op, yf - 0.02, yf + 0.3); body.add(v, f, 'DarkInterior')
    v, f = ring(roundtop(0, 0.0, dw + 0.36, dh + 0.18, 8), op, yf - 0.17, yf + 0.0); body.add(v, f, 'CreamTrim')
    # windows + flower boxes on the front gable
    window(body, -1.65, 1.15, 0.7, 1.15, yf)
    window(body, 1.65, 1.15, 0.7, 1.15, yf)
    window(body, 0.05, 3.75, 0.72, 2.0, yf)
    window(body, 0.0, 6.75, 0.78, 1.15, yf, kind='oval')
    flower_box(body, -1.65, 1.05, yf, 0.95, 1)
    flower_box(body, 1.65, 1.05, yf, 0.95, 2)
    flower_box(body, 0.05, 3.62, yf, 1.0, 3)
    # small window on the -X side
    window(body, 0.8, 1.0, 0.7, 1.1, 0.0, mtx=Matrix.Translation((-hw, 0, 0)) @ Matrix.Rotation(math.radians(-90), 4, 'Z'))
    b = body.build('barn_body'); leaners.append(b)

    # ---- roof slab, barge trim, shingles, ridge
    roof = Part()
    outer = offset(prof, P['roof_t'])
    v, f = prism(outer + list(reversed(prof)), yf - P['over'], yb + P['over']); roof.add(v, f, 'ShingleDark')
    for y0 in (yf - P['over'] - 0.1, yb + P['over'] - 0.1):
        v, f = prism(offset(prof, P['roof_t'] + 0.22) + list(reversed(offset(prof, -0.05))), y0, y0 + 0.2); roof.add(v, f, 'CreamTrim')
    shingle_roof(roof, outer, yf - P['over'], yb + P['over'], P['row'], P['tab'], 0.14, 7)
    cyl(roof, 'Teal', (0, yf - P['over'] - 0.05, prof[len(prof) // 2][1] + P['roof_t'] + 0.06), (0, yb + P['over'] + 0.05, prof[len(prof) // 2][1] + P['roof_t'] + 0.06), 0.17, 8)
    r = roof.build('roof'); leaners.append(r)

    # ---- hay hoist beam with a scroll end and a hanging lantern
    hb = Part()
    zt = 9.45
    v, f = box((0, yf - 0.6, zt), (0.3, 1.8, 0.32)); hb.add(v, f, 'Teal')
    tv, tf = lathe([(0.0, -0.1), (0.3, -0.1), (0.3, 0.1), (0.0, 0.1)], 10)
    hb.add(tv, tf, 'Teal', Matrix.Translation((0, yf - 1.55, zt + 0.12)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    tv, tf = lathe([(0.0, -0.11), (0.14, -0.11), (0.14, 0.11), (0.0, 0.11)], 8)
    hb.add(tv, tf, 'CreamTrim', Matrix.Translation((0, yf - 1.55, zt + 0.12)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    bv, bf = box((0, 0, 0), (0.2, 1.1, 0.2))
    hb.add(bv, bf, 'Teal', Matrix.Translation((0, yf - 0.55, zt - 0.5)) @ Matrix.Rotation(math.radians(-45), 4, 'X'))
    h = hb.build('hoist_beam'); leaners.append(h)

    lp = Part()
    piv = Vector((0, yf - 1.3, zt - 0.16))
    cyl(lp, 'Iron', piv, piv + Vector((0, 0, -0.45)), 0.025, 4)
    v, f = lathe([(0.0, -0.45), (0.12, -0.5), (0.15, -0.62), (0.15, -0.82), (0.1, -0.9), (0.0, -0.9)], 8)
    lp.add(v, f, 'LanternGlow', Matrix.Translation(piv))
    v, f = lathe([(0.2, -0.5), (0.0, -0.36)], 8); lp.add(v, f, 'Iron', Matrix.Translation(piv))
    v, f = lathe([(0.16, -0.86), (0.16, -0.92), (0.0, -0.92)], 8); lp.add(v, f, 'Iron', Matrix.Translation(piv))
    lant = lp.build('lantern', origin=piv)
    lant.location.x += lean_dx(piv.z); movers.append(lant)

    # ---- cupola (crooked) + weathervane
    cp = Part()
    cw, cb, ct = P['cup_w'], P['cup_base'], P['cup_top']
    v, f = box((0, 0, (ct - cb) / 2), (cw, cw, ct - cb)); cp.add(v, f, 'RedPlank')
    for sx in (-1, 1):
        v, f = box((sx * cw / 2, -cw / 2, (ct - cb) / 2), (0.12, 0.12, ct - cb)); cp.add(v, f, 'CreamTrim')
    window(cp, -0.25, 1.25, 0.24, 0.4, -cw / 2, bars=False)
    window(cp, 0.28, 1.05, 0.26, 0.5, -cw / 2, bars=False)
    cprof = full_profile([(0.95, ct - cb - 0.05), (0.78, ct - cb + 0.15), (0.68, ct - cb + 0.5), (0.5, ct - cb + 0.85), (0.22, ct - cb + 1.05), (0.0, ct - cb + 1.1)], sub=2)
    cout = offset(cprof, 0.1)
    v, f = prism(cout + list(reversed(cprof)), -cw / 2 - 0.22, cw / 2 + 0.22); cp.add(v, f, 'ShingleDark')
    v, f = prism(offset(cprof, 0.24) + list(reversed(offset(cprof, -0.04))), -cw / 2 - 0.3, -cw / 2 - 0.14); cp.add(v, f, 'CreamTrim')
    shingle_roof(cp, cout, -cw / 2 - 0.22, cw / 2 + 0.22, 0.4, 0.62, 0.08, 11, scale=0.7)
    ctop = ct - cb + 1.1 + 0.1
    v, f = lathe([(0.0, ctop - 0.12), (0.16, ctop - 0.06), (0.12, ctop + 0.1), (0.0, ctop + 0.16)], 8); cp.add(v, f, 'Teal')
    cyl(cp, 'Iron', (0, 0, ctop), (0, 0, ctop + 0.95), 0.04, 6)
    for ax in ((1, 0), (0, 1)):
        a = Vector((ax[0] * 0.55, ax[1] * 0.55, ctop + 0.45))
        cyl(cp, 'Iron', -a + Vector((0, 0, 2 * a.z)), a, 0.025, 4)
        sphere(cp, 'Iron', a, (0.06, 0.06, 0.06), seg=6, rings=4)
        sphere(cp, 'Iron', Vector((-a.x, -a.y, a.z)), (0.06, 0.06, 0.06), seg=6, rings=4)
    cup = cp.build('cupola')
    tx, ty, tz = (math.radians(a) for a in P['cup_tilt'])
    cup.location = (lean_dx(cb + 0.8), P['cup_y'], cb)
    cup.rotation_euler = (tx, ty, tz)
    movers.append(cup)

    wv = Part()
    s = 1.15
    S = Matrix.Diagonal((s, s, s, 1))
    def sp(m, c, r, rot=(0, 0, 0), seg=7, rings=5):
        sphere(wv, m, Vector(c) * s, tuple(x * s for x in r), rot, seg, rings)
    # arrow
    v, f = box((0, 0, 0), (1.5, 0.05, 0.05)); wv.add(v, f, 'Iron', S)
    v, f = prism([(0.75, -0.12), (1.0, 0.0), (0.75, 0.12)], -0.025, 0.025); wv.add([(x, z, y) for x, y, z in v], f, 'Iron', S)
    v, f = prism([(-0.75, -0.18), (-0.5, -0.04), (-0.5, 0.04), (-0.75, 0.18), (-0.62, 0.0)], -0.025, 0.025)
    wv.add([(x, y, z) for x, y, z in v], f, 'Iron', S)
    # rooster
    for dy in (-0.07, 0.07):
        v, f = box((0.02, dy, 0.17), (0.04, 0.04, 0.32)); wv.add(v, f, 'RoosterGold', S)
    sp('RoosterRed', (0.0, 0, 0.55), (0.4, 0.2, 0.27), (0, math.radians(-12), 0))
    sp('RoosterRed', (0.24, 0, 0.78), (0.14, 0.13, 0.24), (0, math.radians(25), 0))
    sp('RoosterGold', (0.33, 0, 0.98), (0.15, 0.13, 0.14))
    sp('RoosterGold', (0.02, 0.15, 0.6), (0.26, 0.07, 0.15), (0, math.radians(-15), 0))
    sp('RoosterGold', (0.02, -0.15, 0.6), (0.26, 0.07, 0.15), (0, math.radians(-15), 0))
    sp('RoosterRed', (0.43, 0, 0.84), (0.05, 0.04, 0.08), seg=6, rings=4)
    for i, (x, z) in enumerate(((0.25, 1.12), (0.33, 1.16), (0.41, 1.12))):
        sp('RoosterRed', (x, 0, z), (0.06, 0.035, 0.08), seg=6, rings=4)
    v, f = lathe([(0.055, 0), (0.0, 0.16)], 6)
    wv.add(v, f, 'RoosterGold', S @ Matrix.Translation((0.45, 0, 0.96)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    for i, (ang, ln) in enumerate(((50, 0.42), (25, 0.48), (5, 0.4))):
        a = math.radians(ang)
        sp('RoosterRed' if i != 1 else 'DomeRed', (-0.38 - 0.18 * math.cos(a), 0, 0.68 + 0.26 + 0.12 * i - 0.1), (0.1, 0.045, ln), (0, -a, 0))
    vane = wv.build('weathervane')
    vane.parent = cup
    vane.location = (0, 0, ctop + 0.95)
    movers.append(vane)

    # ---- annex wing
    ax, ahw = P['ax'], P['ahw']; ay0, ay1 = P['ay']
    aprof = full_profile(P['aroof'], cx=ax)
    an = Part()
    ain = offset(aprof, -0.05)
    atop = [p for p in reversed(ain) if abs(p[0] - ax) <= ahw - 0.02]
    apts = [(ax - ahw, 0), (ax + ahw, 0), (ax + ahw, atop[0][1] - 0.12)] + atop + [(ax - ahw, atop[-1][1] - 0.12)]
    v, f = prism(apts, ay0, ay1); an.add(v, f, 'RedPlank')
    v, f = box((ax, (ay0 + ay1) / 2, 0.22), (2 * ahw + 0.14, ay1 - ay0 + 0.14, 0.44)); an.add(v, f, 'Stone')
    for sx in (-1, 1):
        v, f = box((ax + sx * (ahw + 0.02), ay0 - 0.02, 1.2), (0.2, 0.2, 2.0)); an.add(v, f, 'CreamTrim')
    adw, adh = P['adoor_w'], P['adoor_h']
    aop = roundtop(ax, 0.0, adw, adh, 8)
    v, f = prism(aop, ay0 - 0.02, ay0 + 0.3); an.add(v, f, 'DarkInterior')
    v, f = ring(roundtop(ax, 0.0, adw + 0.3, adh + 0.15, 8), aop, ay0 - 0.15, ay0); an.add(v, f, 'CreamTrim')
    window(an, ax, 2.75, 0.62, 0.62, ay0, kind='oval')
    v, f = box((ax, ay0 - 0.55, 0.05), (1.3, 0.9, 0.1)); an.add(v, f, 'DoorCoral')   # ramp
    aout = offset(aprof, 0.12)
    v, f = prism(aout + list(reversed(aprof)), ay0 - 0.28, ay1); an.add(v, f, 'ShingleDark')
    v, f = prism(offset(aprof, 0.3) + list(reversed(offset(aprof, -0.04))), ay0 - 0.36, ay0 - 0.18); an.add(v, f, 'CreamTrim')
    shingle_roof(an, aout, ay0 - 0.28, ay1, 0.5, 0.82, 0.11, 5, scale=0.9)
    a = an.build('annex'); leaners.append(a)

    # ---- silo
    sx_, sy_ = P['silo_c']; R, H, DH = P['silo_r'], P['silo_h'], P['dome_h']
    si = Part()
    prof_s = [(R * 0.98, 0.0), (R * 1.03, H * 0.25), (R * 1.05, H * 0.5), (R * 1.02, H * 0.78), (R * 0.98, H)]
    v, f = lathe(prof_s, 20, sx_, sy_); si.add(v, f, 'SiloCream')
    v, f = lathe([(R + 0.05, -0.0), (R + 0.12, 0.45), (0.0, 0.45)], 20, sx_, sy_); si.add(v, f, 'Stone')
    v, f = lathe([(R * 0.95, H - 0.1), (R + 0.2, H - 0.05), (R + 0.24, H + 0.15), (R + 0.16, H + 0.3), (R * 0.9, H + 0.3)], 20, sx_, sy_); si.add(v, f, 'Teal')
    dome = [(R + 0.08, H + 0.22)] + [(R * 1.02 * math.cos(math.pi / 2 * k / 6), H + 0.25 + DH * math.sin(math.pi / 2 * k / 6)) for k in range(1, 6)] + [(0.0, H + 0.25 + DH)]
    v, f = lathe(dome, 20, sx_, sy_); si.add(v, f, 'DomeRed')
    zt_ = H + 0.25 + DH
    v, f = lathe([(0.0, zt_ - 0.1), (0.25, zt_ + 0.05), (0.3, zt_ + 0.25), (0.18, zt_ + 0.48), (0.0, zt_ + 0.52)], 10, sx_, sy_); si.add(v, f, 'Teal')
    for z in (2.6, 5.0):
        x = sx_ + R * 1.04
        v, f = box((x, sy_, z), (0.1, 0.42, 0.62)); si.add(v, f, 'Glass')
        v, f = box((x - 0.02, sy_, z), (0.1, 0.62, 0.82)); si.add(v, f, 'RedPlank')
        v, f = box((x + 0.05, sy_, z - 0.38), (0.18, 0.66, 0.1)); si.add(v, f, 'Teal')
    silo = si.build('silo', smooth=True)

    # ---- ground: a soft wobbly grass island with a stepping-stone path and bushes
    g = Part()
    gx, gy = P['ground_c']; rx, ry = P['ground_r']
    n = 28; rnd = random.Random(3)
    wob = [1 + 0.05 * math.sin(3 * 2 * math.pi * k / n) + rnd.uniform(-0.02, 0.02) for k in range(n)]
    gv = []
    for (sc_, z) in ((1.0, 0.0), (1.0, 0.1), (0.975, 0.16)):
        for k in range(n):
            a = 2 * math.pi * k / n
            gv.append((gx + rx * wob[k] * sc_ * math.cos(a), gy + ry * wob[k] * sc_ * math.sin(a), z))
    gf = [list(range(n - 1, -1, -1)), list(range(2 * n, 3 * n))]
    for r_ in range(2):
        gf += [[r_ * n + k, r_ * n + (k + 1) % n, (r_ + 1) * n + (k + 1) % n, (r_ + 1) * n + k] for k in range(n)]
    g.add(gv, gf, 'Grass')
    for i, (x, y) in enumerate(((0.1, -4.25), (-0.3, -4.85), (0.25, -5.35))):
        v, f = lathe([(0.32, 0.0), (0.3, 0.2), (0.0, 0.21)], 8, x, y, phase=i); g.add(v, f, 'Stone')
    bush(g, (-3.0, -3.7), 0.5, 11)
    bush(g, (-3.1, 2.5), 0.55, 12)
    bush(g, (2.3, -3.85), 0.42, 13)
    bush(g, (5.75, -2.1), 0.48, 14)
    ground = g.build('ground')

    # ---- doors (moving)
    dl = door_leaf(-dw / 2, -1, dw / 2, dh, yf, 'door_left')
    dr = door_leaf(dw / 2, 1, dw / 2, dh, yf, 'door_right')
    for d in (dl, dr):
        d.location.y = yf - 0.17
    al = door_leaf(ax - adw / 2, -1, adw / 2, adh, ay0, 'annex_door_left')
    ar = door_leaf(ax + adw / 2, 1, adw / 2, adh, ay0, 'annex_door_right')
    for d in (al, ar):
        d.location.y = ay0 - 0.15
        d.scale = (1, 0.8, 1)

    for ob in leaners:
        apply_lean(ob)

    # ---- animation (frames 1..120 loop)
    def key_rot(ob, axis, keys):
        for fr, deg in keys:
            ob.rotation_euler[axis] = math.radians(deg)
            ob.keyframe_insert('rotation_euler', index=axis, frame=fr)

    def door_keys(off, ang):
        k = [(1, 0), (12 + off, 0), (38 + off, ang * 1.06), (46 + off, ang), (70 + off, ang), (96 + off, 0), (100 + off, 4 * ang / 100), (104 + off, 0), (120, 0)]
        return k
    key_rot(dl, 2, door_keys(0, -100))
    key_rot(dr, 2, door_keys(0, 100))
    key_rot(al, 2, door_keys(8, -95))
    key_rot(ar, 2, door_keys(8, 95))
    key_rot(vane, 2, [(1, 0), (24, 70), (34, 52), (62, 200), (74, 185), (100, 300), (121, 360)])
    key_rot(lant, 0, [(1, 0), (31, 7), (61, 0), (91, -7), (121, 0)])
    sc.frame_set(1)
    return sc


if __name__ == '__main__':
    build()
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_anim_scene_split_object=False, export_apply=True)
    print('wrote', OUT)

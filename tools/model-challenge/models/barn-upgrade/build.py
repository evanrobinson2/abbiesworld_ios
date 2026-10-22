"""R-02 Barn, style A (upgrade). Standalone builder: `python build.py` -> barn-upgrade.glb

Layout: Z up, metres, origin at the centre of the footprint on the ground.
Long axis is X. The hero's long side (big X-braced sliding doors) faces -Y (front).
+X gable end = hayloft door, hoist beam, man door (hero right face / mj view_back).
-X gable end = second pair of X sliding doors (mj view_front).
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'barn-upgrade.glb')

P = dict(
    L=8.4,                 # wall length (x)
    W=6.2,                 # wall width (y)
    found_h=0.5,           # stone foundation height
    found_out=0.07,        # foundation proud of the wall
    # outer roof profile (half-width y, z) from eave edge up to ridge: gambrel with a soft bellcast
    roof=[(3.72, 4.45), (3.34, 4.87), (2.76, 6.08), (2.13, 7.25), (1.12, 8.06), (0.0, 8.68)],
    roof_t=0.2,            # roof slab thickness
    gable_over=0.38,       # roof overhang past the gable walls
    course=0.32,           # shingle course exposure (along the slope)
    tab=0.62,              # shingle tab width
    shingle_t=0.09,        # shingle butt thickness
    pad=0.75,              # turf patch margin around the foundation
    batten_step=0.34,      # board-and-batten rhythm
    # long-side sliding doors (front, -Y)
    door_cx=-0.25, door_w=1.85, door_h=3.35, door_open=1.85,
    rail_x=(-4.25, 3.75),
    # -X gable sliding doors
    edoor_w=1.5, edoor_h=3.2, edoor_open=1.4,
    # cupola
    cup_w=1.3, cup_body=(8.25, 9.6), cup_roof_w=1.95, cup_roof_top=10.5,
    vane_top=11.25,
)

# colours (sRGB 0..255, sampled from the hero and lightly cleaned)
COLS = dict(
    RedPlank=(186, 64, 52), RedBatten=(158, 52, 43), TealShingle=(76, 128, 124), TealShingleLight=(86, 139, 133), TealRidge=(56, 102, 100),
    CreamTrim=(234, 225, 203), StoneGrey=(168, 156, 134), StoneWarm=(196, 174, 140), Mortar=(122, 112, 98),
    WindowGlass=(52, 66, 64), Iron=(66, 58, 52), DarkInterior=(40, 30, 26), Rope=(170, 140, 96),
    WeatheredWood=(214, 200, 170), Grass=(116, 142, 64), Turf=(132, 150, 82),
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
        b.inputs['Roughness'].default_value = 0.85 if name not in ('Iron', 'WindowGlass') else 0.7
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ mesh helpers
class MB:
    """Accumulates polygons per material, then becomes one object."""
    def __init__(self):
        self.v = []; self.f = []; self.m = []; self.names = []

    def mi(self, name):
        if name not in self.names:
            self.names.append(name)
        return self.names.index(name)

    def poly(self, pts, m):
        i = len(self.v); self.v += [tuple(p) for p in pts]
        self.f.append(list(range(i, i + len(pts)))); self.m.append(self.mi(m))

    def box(self, c, s, m, rot=None, bev=False):
        cx, cy, cz = c; hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        corners = [Vector((x, y, z)) for x in (-hx, hx) for y in (-hy, hy) for z in (-hz, hz)]
        R = rot if rot is not None else Matrix.Identity(3)
        corners = [R @ p + Vector(c) for p in corners]
        i = len(self.v); self.v += [tuple(p) for p in corners]
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            self.f.append([i + k for k in q]); self.m.append(self.mi(m))

    def beam(self, a, b, w, h, m, up=(0, 0, 1)):
        """box from point a to point b with cross-section w (side) x h (up)."""
        a = Vector(a); b = Vector(b); d = b - a; ln = d.length; x = d / ln
        u = Vector(up); y = u.cross(x)
        if y.length < 1e-6:
            y = Vector((0, 1, 0)).cross(x)
        y.normalize(); z = x.cross(y)
        R = Matrix((x, y, z)).transposed()
        self.box(tuple((a + b) / 2), (ln, w, h), m, R)

    def obj(self, name, parent=None, loc=(0, 0, 0)):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        for n in self.names:
            me.materials.append(mat(n))
        for p, mi in zip(me.polygons, self.m):
            p.material_index = mi
        me.validate(); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        if parent:
            o.parent = parent
        return o


def bevel(o, w=0.025, seg=1):
    md = o.modifiers.new('bevel', 'BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(40)
    return o


# ------------------------------------------------------------------ profile helpers
def roof_outer():
    pts = P['roof']
    return [(-y, z) for y, z in pts] + [(y, z) for y, z in reversed(pts[:-1])]   # -y eave .. ridge .. +y eave


def offset_profile(pts, d):
    """offset an open polyline (y,z) inward (downward) by d along averaged normals."""
    out = []
    n = len(pts)
    for i in range(n):
        a = Vector(pts[max(i - 1, 0)]); b = Vector(pts[min(i + 1, n - 1)])
        t = (b - a).normalized(); nrm = Vector((t.y, -t.x))      # left normal of travel (-y->+y) points down
        out.append((pts[i][0] + nrm.x * d, pts[i][1] + nrm.y * d))
    return out


def profile_z(prof, y):
    """z of a (y,z) polyline (monotonic in y on each half) at |y|."""
    y = abs(y)
    half = sorted([(abs(a), b) for a, b in prof if a >= -1e-6], key=lambda t: t[0])
    for (y0, z0), (y1, z1) in zip(half, half[1:]):
        if y0 <= y <= y1:
            return z0 + (z1 - z0) * (y - y0) / max(1e-6, y1 - y0)
    return half[-1][1] if y > half[-1][0] else half[0][1]


INNER = None


def wall_top(y):
    return profile_z(INNER, y) - 0.02


# ------------------------------------------------------------------ build
def build():
    global INNER
    random.seed(7)
    L, W = P['L'], P['W']; hx, hy = L / 2, W / 2
    outer = roof_outer()
    INNER = offset_profile(outer, P['roof_t'])
    objs = []

    # ---------------- walls (board-and-batten) + foundation, one static body
    body = MB()
    # wall prism: polygon in (y,z) = bottom corners + inner roof profile clipped to the walls
    gable = [(-hy, P['found_h'] - 0.05)]
    gable.append((-hy, wall_top(hy)))
    for y, z in INNER:
        if abs(y) < hy:
            gable.append((y, z - 0.02))
    gable.append((hy, wall_top(hy)))
    gable.append((hy, P['found_h'] - 0.05))
    n = len(gable)
    for i in range(n):
        (y0, z0), (y1, z1) = gable[i], gable[(i + 1) % n]
        body.poly([(-hx, y0, z0), (-hx, y1, z1), (hx, y1, z1), (hx, y0, z0)], 'RedPlank')
    cz = sum(z for _, z in gable) / n
    for x in (-hx, hx):
        for i in range(n):
            (y0, z0), (y1, z1) = gable[i], gable[(i + 1) % n]
            body.poly([(x, 0, cz), (x, y0, z0), (x, y1, z1)], 'RedPlank')

    # openings that battens skip: (face, a0, a1, z0, z1)
    door_lo = P['door_cx'] - P['door_w']; door_hi = P['door_cx'] + P['door_w']
    skip = {'front': [(door_lo, door_hi, 0, P['door_h'])],
            'xneg': [(-P['edoor_w'], P['edoor_w'], 0, P['edoor_h'])],
            'back': [], 'xpos': []}

    def battens(face):
        if face in ('front', 'back'):
            a0, a1 = -hx + 0.2, hx - 0.2
        else:
            a0, a1 = -hy + 0.2, hy - 0.2
        a = a0
        while a <= a1 + 1e-6:
            top = wall_top(hy) if face in ('front', 'back') else wall_top(a)
            segs = [(P['found_h'] - 0.02, top - 0.03)]
            for s0, s1, z0, z1 in skip[face]:
                if s0 - 0.05 < a < s1 + 0.05:
                    segs = [(max(z1, P['found_h']), top - 0.03)]
            for z0, z1 in segs:
                if z1 - z0 < 0.1:
                    continue
                if face == 'front':
                    body.box((a, -hy - 0.015, (z0 + z1) / 2), (0.08, 0.03, z1 - z0), 'RedBatten')
                elif face == 'back':
                    body.box((a, hy + 0.015, (z0 + z1) / 2), (0.08, 0.03, z1 - z0), 'RedBatten')
                elif face == 'xpos':
                    body.box((hx + 0.015, a, (z0 + z1) / 2), (0.03, 0.08, z1 - z0), 'RedBatten')
                else:
                    body.box((-hx - 0.015, a, (z0 + z1) / 2), (0.03, 0.08, z1 - z0), 'RedBatten')
            a += P['batten_step'] * random.uniform(0.9, 1.1)
    for f in ('front', 'back', 'xpos', 'xneg'):
        battens(f)

    # dark interiors behind the sliding doors
    body.poly([(door_lo, -hy - 0.012, 0.05), (door_hi, -hy - 0.012, 0.05), (door_hi, -hy - 0.012, P['door_h'] - 0.05),
               (door_lo, -hy - 0.012, P['door_h'] - 0.05)], 'DarkInterior')
    ew = P['edoor_w']
    body.poly([(-hx - 0.012, ew, 0.05), (-hx - 0.012, -ew, 0.05), (-hx - 0.012, -ew, P['edoor_h'] - 0.05),
               (-hx - 0.012, ew, P['edoor_h'] - 0.05)], 'DarkInterior')
    # cream door casings around the openings
    for xx in (door_lo - 0.08, door_hi + 0.08):
        body.box((xx, -hy - 0.03, P['door_h'] / 2 + 0.05), (0.16, 0.06, P['door_h'] + 0.1), 'CreamTrim')
    body.box(((door_lo + door_hi) / 2, -hy - 0.03, P['door_h'] + 0.08), (door_hi - door_lo + 0.32, 0.06, 0.16), 'CreamTrim')
    for yy in (-ew - 0.08, ew + 0.08):
        body.box((-hx - 0.03, yy, P['edoor_h'] / 2 + 0.05), (0.06, 0.16, P['edoor_h'] + 0.1), 'CreamTrim')
    body.box((-hx - 0.03, 0, P['edoor_h'] + 0.08), (0.06, 2 * ew + 0.32, 0.16), 'CreamTrim')

    # stone foundation: mortar band + chunky stones
    fo = P['found_out']; fh = P['found_h']
    body.box((0, 0, fh / 2), (L + 2 * fo, W + 2 * fo, fh), 'Mortar')

    def stones(face):
        if face in ('front', 'back'):
            a0, a1, fixed = -hx - fo, hx + fo, (-hy - fo if face == 'front' else hy + fo)
        else:
            a0, a1, fixed = -hy - fo, hy + fo, (hx + fo if face == 'xpos' else -hx - fo)
        for row, (zc, hgt) in enumerate(((fh * 0.27, fh * 0.46), (fh * 0.73, fh * 0.42))):
            a = a0 + (0.0 if row == 0 else 0.22)
            while a < a1 - 0.1:
                w = random.uniform(0.32, 0.55); w = min(w, a1 - a)
                c = a + w / 2
                skipped = False
                if face == 'front' and door_lo - 0.1 < c < door_hi + 0.1:
                    skipped = True
                if face == 'xneg' and -ew - 0.1 < c < ew + 0.1:
                    skipped = True
                if not skipped:
                    m = random.choice(('StoneGrey', 'StoneGrey', 'StoneWarm'))
                    d = random.uniform(0.05, 0.09); hh = hgt * random.uniform(0.85, 1.0)
                    if face in ('front', 'back'):
                        sgn = -1 if face == 'front' else 1
                        body.box((c, fixed + sgn * d / 2, zc), (w - 0.05, d, hh), m)
                    else:
                        sgn = 1 if face == 'xpos' else -1
                        body.box((fixed + sgn * d / 2, c, zc), (d, w - 0.05, hh), m)
                a += w
    for f in ('front', 'back', 'xpos', 'xneg'):
        stones(f)
    # stone threshold in front of the doors (door track)
    body.box((P['door_cx'] - 0.1, -hy - 0.25, 0.08), (2 * P['door_w'] * 2 + 0.3, 0.42, 0.16), 'StoneGrey')
    body.box((-hx - 0.25, 0, 0.08), (0.42, 4 * ew + 0.3, 0.16), 'StoneGrey')  # z centred below

    o_body = body.obj('walls'); objs.append(o_body)

    # ---------------- cream trim: corner posts, eave boards, gable bands
    trim = MB()
    et = wall_top(hy)
    for sx in (-1, 1):
        for sy in (-1, 1):
            trim.box((sx * (hx + 0.02), sy * (hy + 0.02), (fh + et) / 2 - 0.02), (0.26, 0.26, et - fh + 0.04), 'CreamTrim')
    for sy in (-1, 1):   # frieze board under the eaves on the long sides
        trim.box((0, sy * (hy + 0.04), et - 0.12), (L + 0.3, 0.06, 0.24), 'CreamTrim')
    # gable-end belt (where the lower roof slope meets the gable wall)
    o_trim = trim.obj('trim'); bevel(o_trim, 0.03); objs.append(o_trim)

    # ---------------- roof slab + fascia + barge boards + shingles
    roof = MB()
    x0, x1 = -hx - P['gable_over'], hx + P['gable_over']
    for i in range(len(outer) - 1):
        (ya, za), (yb, zb) = outer[i], outer[i + 1]
        (yc, zc), (yd, zd) = INNER[i], INNER[i + 1]
        roof.poly([(x0, ya, za), (x1, ya, za), (x1, yb, zb), (x0, yb, zb)], 'TealShingle')
        roof.poly([(x0, yc, zc), (x0, yd, zd), (x1, yd, zd), (x1, yc, zc)], 'CreamTrim')
        for x in (x0, x1):
            roof.poly([(x, ya, za), (x, yb, zb), (x, yd, zd), (x, yc, zc)], 'CreamTrim')
    for j in (0, len(outer) - 1):
        (ya, za), (yc, zc) = outer[j], INNER[j]
        roof.poly([(x0, ya, za), (x0, yc, zc), (x1, yc, zc), (x1, ya, za)], 'CreamTrim')
    # barge boards: cream strips hanging under the roof edge at both gable ends
    bb = offset_profile(outer, P['roof_t'] + 0.14)
    for x, sgn in ((x0, -1), (x1, 1)):
        for i in range(len(outer) - 1):
            a, b = outer[i], outer[i + 1]; c, d = bb[i], bb[i + 1]
            xo = x + sgn * 0.05
            roof.poly([(xo, a[0], a[1] + 0.02), (xo, c[0], c[1]), (xo, d[0], d[1]), (xo, b[0], b[1] + 0.02)], 'CreamTrim')
            xi = x - sgn * 0.08
            roof.poly([(xi, a[0], a[1] + 0.02), (xi, b[0], b[1] + 0.02), (xi, d[0], d[1]), (xi, c[0], c[1])], 'CreamTrim')
            roof.poly([(xi, c[0], c[1]), (xi, d[0], d[1]), (xo, d[0], d[1]), (xo, c[0], c[1])], 'CreamTrim')
    # fascia boards along the long eaves
    for sy in (-1, 1):
        ye, ze = outer[0][0] * -sy, outer[0][1]
        roof.box((0, sy * (abs(ye) + 0.02), ze - 0.1), (x1 - x0 + 0.1, 0.06, 0.24), 'CreamTrim')
    # ridge cap
    roof.box((0, 0, outer[len(P['roof']) - 1][1] + 0.05), (x1 - x0 + 0.06, 0.34, 0.14), 'TealRidge')
    o_roof = roof.obj('roof'); objs.append(o_roof)

    # shingles: overlapping courses of tabs with a hand-laid jitter
    sh = MB()
    half = list(reversed(P['roof']))   # ridge -> eave, y >= 0
    half = [(y, z) for y, z in reversed(half)]  # eave -> ridge
    seg = []; s = 0.0
    for i in range(len(half) - 1):
        a, b = Vector(half[i]), Vector(half[i + 1]); seg.append((s, a, b)); s += (b - a).length
    total = s

    def at(sv):
        sv = min(max(sv, 0.0), total)
        for s0, a, b in seg:
            ln = (b - a).length
            if sv <= s0 + ln + 1e-9:
                t = (sv - s0) / ln; p = a.lerp(b, t); d = (b - a).normalized()
                return p, Vector((d.y, -d.x))   # outward normal (up/out)
        a, b = seg[-1][1], seg[-1][2]; d = (b - a).normalized(); return b, Vector((d.y, -d.x))

    ncourse = int(total / P['course']) + 1
    for k in range(ncourse):
        s0 = k * P['course']; s1 = min(total, s0 + P['course'] * 1.25)
        if s0 >= total - 0.05:
            break
        p0, n0 = at(s0); p1, n1 = at(s1)
        x = x0 - 0.04 - (P['tab'] / 2 if k % 2 else 0)
        while x < x1 + 0.02:
            w = P['tab'] * random.uniform(0.75, 1.15)
            xa, xb = max(x, x0 - 0.04), min(x + w - 0.03, x1 + 0.04)
            if xb - xa > 0.08:
                t = P['shingle_t'] * random.uniform(0.7, 1.25); dz = random.uniform(-0.015, 0.015)
                tm = 'TealShingleLight' if random.random() < 0.18 else 'TealShingle'
                for sy in (1, -1):
                    b0 = p0 + n0 * (t + dz); b1 = p1 + n1 * 0.012
                    q = lambda xx, v: (xx, sy * v.x, v.y)
                    lo0 = p0 + n0 * 0.005
                    top = [q(xa, b0), q(xb, b0), q(xb, b1), q(xa, b1)]
                    butt = [q(xa, lo0), q(xb, lo0), q(xb, b0), q(xa, b0)]
                    if sy < 0:
                        top.reverse(); butt.reverse()
                    sh.poly(top, tm); sh.poly(butt, 'TealRidge')
            x += w
    o_sh = sh.obj('shingles'); objs.append(o_sh)

    # ---------------- windows
    win = MB()

    def window(face, a, zc, w=0.72, h=0.86, mull=True):
        # face: 'front','back','xpos','xneg'; a = position along the face
        def put(c, s):
            if face == 'front':
                return (a + c[0], -hy - c[1], zc + c[2]), (s[0], s[1], s[2])
            if face == 'back':
                return (-a + c[0], hy + c[1], zc + c[2]), (s[0], s[1], s[2])
            if face == 'xpos':
                return (hx + c[1], a + c[0], zc + c[2]), (s[1], s[0], s[2])
            return (-hx - c[1], -a + c[0], zc + c[2]), (s[1], s[0], s[2])
        fw = 0.11
        for c, s in (((0, 0.035, 0), (w, 0.02, h)),):
            cc, ss = put(c, s); win.box(cc, ss, 'WindowGlass')
        for c, s in (((-(w / 2), 0.06, 0), (fw, 0.08, h + fw)), (((w / 2), 0.06, 0), (fw, 0.08, h + fw)),
                     ((0, 0.06, h / 2), (w + fw * 2.2, 0.08, fw)), ((0, 0.075, -h / 2 - 0.02), (w + fw * 3, 0.11, fw * 1.2))):
            cc, ss = put(c, s); win.box(cc, ss, 'CreamTrim')
        if mull:
            for c, s in (((0, 0.05, 0), (0.04, 0.04, h)), ((0, 0.05, 0), (w, 0.04, 0.04))):
                cc, ss = put(c, s); win.box(cc, ss, 'CreamTrim')

    # front long side (hero): one window each side of the doors
    window('front', -3.15, 1.75, 0.66, 0.8)
    window('front', 2.75, 1.75, 0.82, 0.86)
    # back long side: three windows
    for a in (-2.6, 0.0, 2.6):
        window('back', a, 1.9, 0.72, 0.8)
    # +X gable (hero right face): two low windows, two upper windows
    window('xpos', -1.75, 1.75, 0.82, 0.86)
    window('xpos', 2.05, 1.75, 0.72, 0.86)
    window('xpos', -1.3, 6.15, 0.55, 0.85)
    window('xpos', 1.55, 6.15, 0.55, 0.85)
    # -X gable (mj view_front): one window in the peak
    window('xneg', 0.0, 6.6, 0.75, 0.8)
    o_win = win.obj('windows'); objs.append(o_win)

    # ---------------- +X gable: man door, hayloft door, hoist beam, hay hood beam
    gx = MB()
    dy = 0.6
    gx.box((hx + 0.02, dy, 1.1 + 0.02), (0.04, 0.9, 2.2), 'RedPlank')
    for c, s in (((hx + 0.06, dy - 0.5, 1.15), (0.09, 0.13, 2.3)), ((hx + 0.06, dy + 0.5, 1.15), (0.09, 0.13, 2.3)),
                 ((hx + 0.06, dy, 2.32), (0.11, 1.2, 0.15))):
        gx.box(c, s, 'CreamTrim')
    gx.box((hx + 0.06, dy - 0.32, 1.1), (0.06, 0.06, 0.06), 'Iron')  # knob
    # hayloft door (X braced) and frame
    hz0, hz1, hw = 3.0, 4.75, 1.15
    gx.box((hx + 0.03, dy, (hz0 + hz1) / 2), (0.05, hw, hz1 - hz0), 'RedPlank')
    for c, s in (((hx + 0.07, dy - hw / 2, (hz0 + hz1) / 2), (0.08, 0.13, hz1 - hz0 + 0.12)),
                 ((hx + 0.07, dy + hw / 2, (hz0 + hz1) / 2), (0.08, 0.13, hz1 - hz0 + 0.12)),
                 ((hx + 0.07, dy, hz0), (0.08, hw, 0.13)), ((hx + 0.07, dy, hz1), (0.08, hw, 0.13))):
        gx.box(c, s, 'CreamTrim')
    for sgn in (1, -1):
        gx.beam((hx + 0.075, dy - sgn * (hw / 2 - 0.08), hz0 + 0.08), (hx + 0.075, dy + sgn * (hw / 2 - 0.08), hz1 - 0.08), 0.11, 0.06,
                'CreamTrim', up=(1, 0, 0))
    # hoist beam above the hayloft door, sticking out toward +Y, with a knee brace
    gx.box((hx + 0.2, dy + 0.55, hz1 + 0.35), (0.24, 2.3, 0.22), 'WeatheredWood')
    gx.beam((hx + 0.12, dy - 0.4, hz1 + 0.24), (hx + 0.12, dy - 0.05, hz1 - 0.3), 0.12, 0.12, 'WeatheredWood', up=(1, 0, 0))
    gx.box((hx + 0.2, dy + 1.62, hz1 + 0.35), (0.3, 0.16, 0.3), 'Iron')  # pulley block
    # hay-hood beam projecting at the peak
    rz = P['roof'][-1][1]
    gx.box((hx + P['gable_over'] + 0.3, 0, rz - 0.55), (1.3, 0.24, 0.24), 'WeatheredWood')
    gx.beam((hx + 0.1, 0, rz - 1.45), (hx + 0.85, 0, rz - 0.62), 0.14, 0.14, 'WeatheredWood', up=(0, 1, 0))
    o_gx = gx.obj('gable_hoist'); bevel(o_gx, 0.015); objs.append(o_gx)

    # hook + chain on the hoist: swings (separate object)
    hook = MB()
    hook.box((0, 0, -0.7), (0.03, 0.03, 1.4), 'Iron')
    for k in range(7):
        hook.box((0, 0, -0.1 - k * 0.2), (0.07 if k % 2 else 0.025, 0.025 if k % 2 else 0.07, 0.12), 'Iron')
    hook.box((0, 0, -1.48), (0.04, 0.16, 0.16), 'Iron')
    hook.beam((0, 0.0, -1.55), (0, 0.1, -1.72), 0.04, 0.04, 'Iron', up=(1, 0, 0))
    hook.beam((0, 0.1, -1.72), (0, -0.04, -1.8), 0.04, 0.04, 'Iron', up=(1, 0, 0))
    o_hook = hook.obj('hoist_hook', loc=(hx + 0.2, dy + 1.62, hz1 + 0.22)); objs.append(o_hook)

    # ---------------- sliding door rails (front + -X gable), static
    rail = MB()
    rz_f = P['door_h'] + 0.32
    rail.box(((P['rail_x'][0] + P['rail_x'][1]) / 2, -hy - 0.28, rz_f), (P['rail_x'][1] - P['rail_x'][0], 0.07, 0.09), 'Iron')
    for xx in (P['rail_x'][0] + 0.1, -0.25, P['rail_x'][1] - 0.1, (P['rail_x'][0] - 0.25) / 2, (P['rail_x'][1] - 0.25) / 2):
        rail.box((xx, -hy - 0.15, rz_f), (0.08, 0.24, 0.06), 'Iron')
    rail.box((P['rail_x'][1] + 0.04, -hy - 0.28, rz_f), (0.08, 0.1, 0.16), 'Iron')
    rail.box((P['rail_x'][0] - 0.04, -hy - 0.28, rz_f), (0.08, 0.1, 0.16), 'Iron')
    rz_e = P['edoor_h'] + 0.3
    rail.box((-hx - 0.28, 0, rz_e), (0.07, 2 * ew * 2 - 0.2, 0.09), 'Iron')
    for yy in (-2 * ew + 0.2, 0, 2 * ew - 0.2):
        rail.box((-hx - 0.15, yy, rz_e), (0.24, 0.08, 0.06), 'Iron')
    o_rail = rail.obj('door_rails'); objs.append(o_rail)

    # ---------------- sliding doors (animated)
    def door_leaf(name, w, h, hinge_side, along):
        d = MB()
        t = 0.09
        # planks (alternating tone), local frame: width along local X, thickness along local -Y (outward)
        npl = max(4, int(w / 0.3))
        for i in range(npl):
            px = -w / 2 + (i + 0.5) * w / npl
            d.box((px, 0, h / 2), (w / npl - 0.012, t * 0.6, h - 0.05), 'RedPlank' if i % 2 else 'RedBatten')
        fw = 0.17
        # frame
        d.box((-w / 2 + fw / 2, -t * 0.3, h / 2), (fw, t * 0.5, h), 'CreamTrim')
        d.box((w / 2 - fw / 2, -t * 0.3, h / 2), (fw, t * 0.5, h), 'CreamTrim')
        d.box((0, -t * 0.3, h - fw / 2), (w, t * 0.5, fw), 'CreamTrim')
        d.box((0, -t * 0.3, fw / 2), (w, t * 0.5, fw), 'CreamTrim')
        # X brace
        for sgn in (1, -1):
            d.beam((-sgn * (w / 2 - fw), -t * 0.3, fw), (sgn * (w / 2 - fw), -t * 0.3, h - fw), 0.15, t * 0.45, 'CreamTrim', up=(0, -1, 0))
        # hangers + rollers
        for hxp in (-w / 2 + 0.25, w / 2 - 0.25):
            d.box((hxp, -0.06, h + 0.12), (0.07, 0.03, 0.42), 'Iron')
            d.box((hxp, -0.1, h + 0.32), (0.16, 0.06, 0.16), 'Iron')
        # handle
        hxp = (w / 2 - 0.3) * (1 if hinge_side > 0 else -1) * -1
        d.box((hxp, -0.1, h * 0.45), (0.05, 0.05, 0.4), 'Iron')
        o = d.obj(name)
        return o

    W2 = P['door_w']
    dl = door_leaf('door_left', W2, P['door_h'], -1, 'x')
    dr = door_leaf('door_right', W2, P['door_h'], 1, 'x')
    dl.location = (P['door_cx'] - W2 / 2, -hy - 0.21, 0.09)
    dr.location = (P['door_cx'] + W2 / 2, -hy - 0.21, 0.09)
    el = door_leaf('end_door_left', ew, P['edoor_h'], -1, 'y')
    er = door_leaf('end_door_right', ew, P['edoor_h'], 1, 'y')
    # local -Y must face -X: rotate -90 deg about Z
    for o, sy in ((el, 1), (er, -1)):
        o.rotation_euler = (0, 0, -math.pi / 2)
        o.location = (-hx - 0.21, sy * ew / 2, 0.09)
    objs += [dl, dr, el, er]

    # ---------------- cupola + weathervane
    cup = MB()
    cw = P['cup_w']; zb, zt = P['cup_body']
    cup.box((0, 0, (zb + zt) / 2 - 0.25), (cw, cw, zt - zb + 0.5), 'RedPlank')
    cup.box((0, 0, zt - 0.62), (cw + 0.12, cw + 0.12, 0.1), 'CreamTrim')
    cup.box((0, 0, zt + 0.03), (cw + 0.16, cw + 0.16, 0.12), 'CreamTrim')
    for a in range(4):
        R = Matrix.Rotation(a * math.pi / 2, 3, 'Z')
        # louver window frame on each face
        for c, s, m in (((0, -cw / 2 - 0.01, zt - 0.3), (0.72, 0.03, 0.5), 'RedBatten'),
                        ((-0.36, -cw / 2 - 0.04, zt - 0.3), (0.09, 0.06, 0.58), 'CreamTrim'),
                        ((0.36, -cw / 2 - 0.04, zt - 0.3), (0.09, 0.06, 0.58), 'CreamTrim'),
                        ((0, -cw / 2 - 0.04, zt - 0.3), (0.06, 0.06, 0.5), 'CreamTrim')):
            cup.box(tuple(R @ Vector(c)), tuple(abs(v) for v in (R @ Vector(s))), m)
        # corner posts
        cc = R @ Vector((cw / 2, cw / 2, 0))
        cup.box((cc.x, cc.y, (zb + zt) / 2 - 0.25 + 0.2), (0.1, 0.1, zt - zb - 0.1 - 0.1), 'CreamTrim')
    # flared pyramid roof: eave ring, kick, then the pyramid
    rw = P['cup_roof_w'] / 2; zr = zt + 0.09
    ring = [(-rw, -rw), (rw, -rw), (rw, rw), (-rw, rw)]
    mid = [(x * 0.62, y * 0.62) for x, y in ring]
    zm = zr + 0.28; ztop = P['cup_roof_top']
    for i in range(4):
        a, b = ring[i], ring[(i + 1) % 4]; c, d = mid[i], mid[(i + 1) % 4]
        cup.poly([(a[0], a[1], zr), (b[0], b[1], zr), (d[0], d[1], zm), (c[0], c[1], zm)], 'TealShingle')
        cup.poly([(c[0], c[1], zm), (d[0], d[1], zm), (0, 0, ztop)], 'TealShingle')
        cup.poly([(b[0], b[1], zr - 0.06), (a[0], a[1], zr - 0.06), (a[0], a[1], zr), (b[0], b[1], zr)], 'TealRidge')
    cup.poly([(x, y, zr - 0.06) for x, y in ring], 'TealRidge')
    # shingle course lines on the cupola roof (thin steps)
    for k, f in enumerate((0.8, 0.45)):
        zz = zm + (ztop - zm) * (1 - f) - 0.02
        s = 0.62 * rw * f * 2 + 0.06
        cup.box((0, 0, zz), (s, s, 0.05), 'TealRidge')
    # finial ball + pole
    cup.box((0, 0, ztop + 0.05), (0.16, 0.16, 0.16), 'Iron')
    cup.box((0, 0, (ztop + P['vane_top']) / 2), (0.07, 0.07, P['vane_top'] - ztop), 'Iron')
    cup.box((0, 0, P['vane_top'] - 0.04), (0.1, 0.1, 0.1), 'Iron')   # cap knob
    zc = P['vane_top'] - 0.55
    for a in range(2):
        R = Matrix.Rotation(a * math.pi / 2, 3, 'Z')
        cup.box((0, 0, zc), tuple(abs(v) for v in R @ Vector((0.7, 0.03, 0.03))), 'Iron')
    o_cup = cup.obj('cupola'); objs.append(o_cup)

    # vane (rooster on an arrow) rotates on the pole
    v = MB()
    zv = 0.0
    v.box((0, 0, zv), (1.0, 0.02, 0.03), 'Iron')
    v.poly([(-0.55, 0, zv - 0.11), (-0.45, 0, zv - 0.11), (-0.33, 0, zv), (-0.45, 0, zv + 0.11), (-0.55, 0, zv + 0.11), (-0.43, 0, zv)], 'Iron')
    v.poly([(0.5, 0, zv - 0.07), (0.66, 0, zv), (0.5, 0, zv + 0.07)], 'Iron')
    rooster = [(-0.3, 0.06), (0.1, 0.06), (0.18, 0.18), (0.27, 0.32), (0.3, 0.44), (0.24, 0.42), (0.2, 0.3),
               (0.12, 0.26), (-0.1, 0.28), (-0.25, 0.42), (-0.36, 0.46), (-0.3, 0.3)]
    rooster = [(x, z + 0.04) for x, z in rooster]
    for y in (-0.012, 0.012):
        pts = [(x, y, zv + z) for x, z in rooster]
        cx = sum(p[0] for p in pts) / len(pts); cz2 = sum(p[2] for p in pts) / len(pts)
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            tri = [(cx, y, cz2), a, b]
            v.poly(tri if y > 0 else list(reversed(tri)), 'Iron')
    o_vane = v.obj('weathervane', loc=(0, 0, P['vane_top'] - 0.25)); objs.append(o_vane)

    # ---------------- grass tufts along the foundation (low, ground-hugging)
    g = MB()
    for i in range(46):
        side = random.choice(('front', 'back', 'xpos', 'xneg'))
        if side in ('front', 'back'):
            x = random.uniform(-hx, hx); y = (-hy - 0.18) if side == 'front' else (hy + 0.18)
            if side == 'front' and door_lo - 0.3 < x < door_hi + 0.3:
                continue
        else:
            y = random.uniform(-hy, hy); x = (hx + 0.18) if side == 'xpos' else (-hx - 0.18)
            if side == 'xpos' and dy - 0.6 < y < dy + 0.6:
                continue
            if side == 'xneg' and -2 * ew < y < 2 * ew:
                continue
        r = random.uniform(0.12, 0.2); hh = random.uniform(0.14, 0.26)
        a0 = random.uniform(0, math.pi)
        for k in range(3):
            a = a0 + k * math.pi * 2 / 3
            g.poly([(x + r * math.cos(a), y + r * math.sin(a), 0.05), (x + r * math.cos(a + 2.1), y + r * math.sin(a + 2.1), 0.05),
                    (x + 0.1 * r * math.cos(a + 1.05), y + 0.1 * r * math.sin(a + 1.05), hh)], 'Grass')
    # low turf patch the barn sits on (irregular octagon-ish ring, 6 cm tall, bevelled edge)
    pad = P['pad']; ring = []
    for k in range(20):
        a = 2 * math.pi * k / 20
        cx, cy = math.cos(a), math.sin(a)
        # superellipse around the footprint
        ex = (hx + pad) * math.copysign(abs(cx) ** 0.35, cx); ey = (hy + pad) * math.copysign(abs(cy) ** 0.35, cy)
        j = 0.08 * math.cos(6 * a)   # gentle, deterministic wobble
        ring.append((ex + j * cx, ey + j * cy))
    top = [(x * 0.97, y * 0.97, 0.06) for x, y in ring]; bot = [(x, y, 0.0) for x, y in ring]
    g.poly(top, 'Turf')
    for i in range(len(ring)):
        a, b = i, (i + 1) % len(ring)
        g.poly([bot[a], bot[b], top[b], top[a]], 'Grass')
    o_g = g.obj('grass'); objs.append(o_g)
    return dict(dl=dl, dr=dr, el=el, er=er, vane=o_vane, hook=o_hook)


# ------------------------------------------------------------------ animation
def ease_key(o, path, idx, frames_vals):
    for f, val in frames_vals:
        getattr(o, path)[idx] = val
        o.keyframe_insert(path, index=idx, frame=f)
    act = o.animation_data.action
    try:
        curves = act.fcurves
    except AttributeError:   # Blender 4.4+/5.x layered actions
        curves = [c for layer in act.layers for strip in layer.strips for cb in strip.channelbags for c in cb.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'BEZIER'; kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'


def animate(p):
    sc = bpy.context.scene
    sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = 120
    op = P['door_open']; eo = P['edoor_open']
    # front pair: closed 1-12, slide open 12-44, hold 44-72, close 72-104, hold 104-120
    for o, sgn in ((p['dl'], -1), (p['dr'], 1)):
        x = o.location.x
        ease_key(o, 'location', 0, [(1, x), (12, x), (44, x + sgn * op), (72, x + sgn * op), (104, x), (120, x)])
    # gable pair, a few frames behind (slides along Y)
    for o, sgn in ((p['el'], 1), (p['er'], -1)):
        y = o.location.y
        ease_key(o, 'location', 1, [(1, y), (18, y), (50, y + sgn * eo), (76, y + sgn * eo), (108, y), (120, y)])
    # weathervane swings in the breeze
    ease_key(p['vane'], 'rotation_euler', 2, [(1, 0.0), (30, math.radians(28)), (60, math.radians(-8)),
                                              (90, math.radians(-30)), (120, 0.0)])
    # hoist hook sways gently
    ease_key(p['hook'], 'rotation_euler', 0, [(1, 0.0), (30, math.radians(5)), (60, 0.0), (90, math.radians(-5)), (120, 0.0)])
    sc.frame_set(1)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.name = 'barn_doors_loop'
    parts = build()
    animate(parts)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_apply=True,
                              export_anim_scene_split_object=False)
    print('wrote', OUT)


if __name__ == '__main__':
    main()

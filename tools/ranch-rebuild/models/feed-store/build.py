"""Feed store (Ranch tile). Standalone builder: `python build.py` -> feed-store.glb + variants/<state>.glb

Layout: Z up, metres, origin at the centre of the footprint on the ground.
Tall, narrow gable-front shed: the door is in the gable end, which faces -Y (front). The ridge runs along Y.
STATE: planned | foundation | frame | roof | complete (all are exported by default; `python build.py roof` builds one).
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'feed-store'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    W=2.3,            # wall width across the gable (x), outside of the planks
    D=1.85,           # wall depth (y)
    foot_h=0.24,      # stone footing height
    foot_out=0.12,    # footing proud of the wall
    foot_d=0.26,      # footing block depth
    wall_top=2.42,    # eave / tie-beam height (z)
    rise=1.15,        # ridge rise above wall_top (roof underside line at x=0)
    eave_ov=0.2,      # roof overhang past the side walls (x)
    gable_ov=0.2,     # roof overhang past the gable walls (y)
    courses=5,        # shingle courses per slope
    course_t=0.13,    # course slab thickness
    butt=0.08,        # how far each course butt kicks out
    notches=5,        # tabs (and notches) along each course butt
    ridge_r=0.16,     # ridge log radius
    ridge_ov=0.42,    # ridge log overhang past the front roof edge
    ridge_ov_back=0.12,  # ... and past the back
    post=0.19,        # corner post section
    beam=(0.15, 0.17),  # tie beam (depth, height)
    door_w=1.24, door_h=1.62, door_frame=0.11,
    lintel_z=1.95,    # top of the door lintel plank
    plank_h=0.205,    # horizontal wall plank height
    sign=(0.86, 0.34, 0.06), sign_z=2.62,
    sack_h=0.64,
)
if os.environ.get('FS_P'):          # quick parameter sweeps: FS_P='{"W": 2.0}'
    import json as _j; P.update(_j.loads(os.environ['FS_P']))

COLS = dict(
    Plank_Rose=(214, 112, 98), Plank_RoseDoor=(190, 98, 84), Plank_RoseGable=(200, 104, 92),
    Timber_Brown=(160, 102, 64), Timber_Dark=(128, 80, 50), Timber_Floor=(176, 128, 88),
    Timber_Sign=(214, 176, 136), Timber_Ink=(66, 66, 38),
    Roof_Teal=(52, 118, 112), Roof_TealLight=(64, 132, 124), Roof_TealDark=(34, 86, 82),
    Stone_Grey=(150, 136, 112), Stone_Light=(170, 156, 130),
    Cloth_Burlap=(206, 162, 122), Rope_Tie=(150, 112, 74), Rope_String=(232, 226, 210),
    Metal_Scoop=(138, 136, 130), Grain_Gold=(230, 152, 28),
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
        b.inputs['Roughness'].default_value = 0.6 if name.startswith('Metal') else 0.85
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ mesh helper
class MB:
    """Accumulates polygons for one object with one material."""
    def __init__(self, name, m):
        self.name = name; self.mname = m; self.v = []; self.f = []

    def poly(self, pts):
        i = len(self.v); self.v += [tuple(p) for p in pts]; self.f.append(list(range(i, i + len(pts))))

    def mesh(self, verts, faces):
        i = len(self.v); self.v += [tuple(p) for p in verts]; self.f += [[i + k for k in f] for f in faces]

    def box(self, c, s, R=None, jit=0.0):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = R if R is not None else Matrix.Identity(3)
        pts = []
        for x in (-hx, hx):
            for y in (-hy, hy):
                for z in (-hz, hz):
                    p = Vector((x, y, z))
                    if jit:
                        p += Vector((random.uniform(-jit, jit) for _ in range(3)))
                    pts.append(R @ p + Vector(c))
        self.mesh(pts, [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])

    def beam(self, a, b, w, h, up=(0, 0, 1)):
        a = Vector(a); b = Vector(b); d = b - a; ln = d.length; x = d / ln
        y = Vector(up).cross(x)
        if y.length < 1e-6:
            y = Vector((0, 1, 0)).cross(x)
        y.normalize(); z = x.cross(y)
        self.box(tuple((a + b) / 2), (ln, w, h), Matrix((x, y, z)).transposed())

    def cyl(self, a, b, r, n=8, r2=None):
        a = Vector(a); b = Vector(b); ax = (b - a).normalized()
        u = Vector((0, 0, 1)).cross(ax)
        if u.length < 1e-6:
            u = Vector((1, 0, 0)).cross(ax)
        u.normalize(); w = ax.cross(u); r2 = r if r2 is None else r2
        pts = []
        for c, rr in ((a, r), (b, r2)):
            for k in range(n):
                t = 2 * math.pi * k / n
                pts.append(c + (u * math.cos(t) + w * math.sin(t)) * rr)
        faces = [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
        faces += [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
        self.mesh(pts, faces)

    def lathe(self, prof, n=10, c=(0, 0, 0), R=None, wob=0.0):
        """prof: [(r, z)] bottom to top; closed with caps."""
        R = R if R is not None else Matrix.Identity(3)
        pts = []
        for r, z in prof:
            for k in range(n):
                t = 2 * math.pi * k / n
                rr = r * (1 + random.uniform(-wob, wob)) if r > 0 else 0
                pts.append(R @ Vector((rr * math.cos(t), rr * math.sin(t), z)) + Vector(c))
        faces = []
        for j in range(len(prof) - 1):
            for k in range(n):
                faces.append((j * n + k, j * n + (k + 1) % n, (j + 1) * n + (k + 1) % n, (j + 1) * n + k))
        faces += [tuple(reversed(range(n))), tuple(range((len(prof) - 1) * n, len(prof) * n))]
        self.mesh(pts, faces)

    def obj(self):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        me.materials.append(mat(self.mname))
        me.validate(); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(o)
        return o


def rot(rx=0, ry=0, rz=0):
    return (Matrix.Rotation(rz, 3, 'Z') @ Matrix.Rotation(ry, 3, 'Y') @ Matrix.Rotation(rx, 3, 'X'))


# ------------------------------------------------------------------ geometry
def roof_z(x):
    """underside line of the roof at |x| (passes through wall top at the side walls and the ridge at x=0)."""
    hw = P['W'] / 2
    return P['wall_top'] + P['rise'] * (1 - abs(x) / hw)


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    random.seed(11)
    W, D = P['W'], P['D']; hw, hd = W / 2, D / 2
    fh = P['foot_h']; wt = P['wall_top']; ps = P['post']
    ridge_z = wt + P['rise']
    st = STATES.index(state)
    parts = []

    def part(name, m):
        b = MB(name, m); parts.append(b); return b

    # ---------------- planned: corner stakes + string lines
    if state == 'planned':
        stakes = part('stakes', 'Timber_Brown'); strings = part('string_lines', 'Rope_String')
        e = 0.18
        cs = [(-hw - e, -hd - e), (hw + e, -hd - e), (hw + e, hd + e), (-hw - e, hd + e)]
        for x, y in cs:
            stakes.box((x, y, 0.22), (0.06, 0.06, 0.44), rot(random.uniform(-.05, .05), random.uniform(-.05, .05)))
            stakes.box((x, y, 0.42), (0.09, 0.09, 0.04))
        for i in range(4):
            (x0, y0), (x1, y1) = cs[i], cs[(i + 1) % 4]
            strings.beam((x0, y0, 0.36), (x1, y1, 0.36), 0.015, 0.015)
        # chalk/peg marks for the door
        for x in (-P['door_w'] / 2, P['door_w'] / 2):
            stakes.box((x, -hd - e, 0.12), (0.04, 0.04, 0.24))
        for b in parts:
            b.obj()
        return

    # ---------------- foundation: stone footing + floor
    foot = part('footing', 'Stone_Grey'); foot2 = part('footing_light', 'Stone_Light')
    fo, fd = P['foot_out'], P['foot_d']
    # ring of blocks; each side laid from corner to corner
    sides = [((-hw - fo, -hd - fo), (hw + fo, -hd - fo)), ((hw + fo, -hd - fo), (hw + fo, hd + fo)),
             ((hw + fo, hd + fo), (-hw - fo, hd + fo)), ((-hw - fo, hd + fo), (-hw - fo, -hd - fo))]
    k = 0
    for (x0, y0), (x1, y1) in sides:
        L = math.hypot(x1 - x0, y1 - y0); dx, dy = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = dy, -dx                     # outward normal (counter-clockwise ring)
        s = 0.0
        while s < L - 0.05:
            bl = min(random.uniform(0.34, 0.5), L - s)
            c = s + bl / 2
            h = fh + random.uniform(-0.03, 0.02)
            cx = x0 + dx * c - nx * (fd / 2 - 0.01); cy = y0 + dy * c - ny * (fd / 2 - 0.01)
            (foot if k % 3 else foot2).box((cx, cy, h / 2), (bl - 0.025, fd, h),
                                           rot(0, 0, math.atan2(dy, dx) + random.uniform(-.04, .04)), jit=0.018)
            s += bl; k += 1
    floor = part('floor', 'Timber_Floor')
    floor.box((0, 0, fh - 0.03), (W - 0.06, D - 0.06, 0.06))

    if st >= 2:
        # ---------------- frame: posts, tie beams, wall plates, braces, rafters, ridge log
        fr = part('frame', 'Timber_Brown')
        bd, bh = P['beam']
        for sx in (-1, 1):
            for sy in (-1, 1):
                x = sx * (hw - ps / 2 + 0.03); y = sy * (hd - ps / 2 + 0.03)
                fr.box((x, y, (fh + wt + 0.05) / 2), (ps, ps, wt + 0.05 - fh + 0.02),
                       rot(random.uniform(-.012, .012), random.uniform(-.012, .012)), jit=0.008)
        for sy in (-1, 1):   # tie beams across the gables (lintel beam under the gable)
            fr.box((0, sy * (hd + 0.02), wt + bh / 2 - 0.02), (W + 0.14, bd, bh), rot(0, random.uniform(-.01, .01)), jit=0.006)
        for sx in (-1, 1):   # wall plates along the eaves
            fr.box((sx * (hw - 0.02), 0, wt + 0.05), (0.14, D + 0.06, 0.12))
        # knee braces either side of the door (front) and on the back
        for sy in (-1, 1):
            y = sy * (hd + 0.03)
            for sx in (-1, 1):
                a = (sx * (hw - ps), y, wt - 0.5); b = (sx * (hw - ps - 0.5), y, wt)
                fr.beam(a, b, 0.09, 0.1, up=(0, sy * -1, 0) if False else (0, 0, 1))
        # door frame: jambs + lintel plank (front)
        dw, dh, df = P['door_w'], P['door_h'], P['door_frame']
        y = -hd - 0.05
        for sx in (-1, 1):
            fr.box((sx * (dw / 2 + df / 2), y, (fh + P['lintel_z']) / 2 - 0.04), (df, 0.1, P['lintel_z'] - fh - 0.1),
                   rot(0, random.uniform(-.015, .015)))
        fr.box((0, y - 0.03, P['lintel_z'] - 0.05), (dw + 0.62, 0.12, 0.11), rot(0, 0.012))
        # rafters: barge boards on each gable + one middle pair, following the roof underside
        for yy in (-hd - P['gable_ov'] + 0.04, -hd + 0.02, 0.0, hd - 0.02, hd + P['gable_ov'] - 0.04):
            barge = abs(abs(yy) - hd) > 0.1
            for sx in (-1, 1):
                x0 = sx * (hw + (P['eave_ov'] - 0.05 if barge else 0.04))
                a = (x0, yy, roof_z(abs(x0)) - 0.04); b = (0, yy, ridge_z - 0.04)
                fr.beam(a, b, 0.09 if barge else 0.08, 0.16 if barge else 0.12, up=(0, 0, 1))
        # ridge log, overhanging both ends, a touch of sag
        log = part('ridge_log', 'Timber_Brown')
        Lf = D / 2 + P['gable_ov'] + P['ridge_ov']; Lb = D / 2 + P['gable_ov'] + P['ridge_ov_back']
        rz = ridge_z + P['ridge_r'] * 0.7
        log.cyl((0, -Lf, rz + 0.05), (0, 0, rz), P['ridge_r'], 10, P['ridge_r'] * 0.96)
        log.cyl((0, 0, rz), (0, Lb, rz + 0.02), P['ridge_r'] * 0.96, 10, P['ridge_r'])
        endc = part('ridge_log_ends', 'Timber_Floor')
        for y0, y1, z in ((-Lf, -Lf - 0.012, rz + 0.05), (Lb, Lb + 0.012, rz + 0.02)):   # pale end grain
            endc.cyl((0, y0, z), (0, y1, z), P['ridge_r'] * 0.86, 10)

    if st >= 3:
        # ---------------- roof: long overlapping shingle courses, jagged butts
        edges = part('roof_edges', 'Roof_TealDark')   # undersides, butts and ends: darker teal
        for sx in (-1, 1):
            side = 'left' if sx < 0 else 'right'
            tones = [part(f'roof_{side}', 'Roof_Teal'), part(f'roof_{side}_light', 'Roof_TealLight')]
            x_e = hw + P['eave_ov']
            # slope frame: from eave (s=0) up to ridge (s=Ls) in the xz plane
            p_e = Vector((sx * x_e, 0, roof_z(x_e) + 0.04)); p_r = Vector((0, 0, ridge_z + 0.06))
            sv = p_r - p_e; Ls = sv.length; sv.normalize()
            nv = Vector((-sv.z, 0, sv.x)) if sx > 0 else Vector((sv.z, 0, -sv.x))
            if nv.z < 0:
                nv = -nv
            n = P['courses']; step = Ls / n; t = P['course_t']
            y0, y1 = -hd - P['gable_ov'], hd + P['gable_ov']
            tabs = P['notches']; seg = 3 * tabs        # per tab: two low points (flat tab butt) then a notch
            for i in range(n):
                s0 = i * step; s1 = min(Ls + 0.02, (i + 1) * step + step * 0.5)
                lift = 0.02 * i
                bot = []
                for j in range(seg + 1):
                    y = y0 + (y1 - y0) * j / seg + (random.uniform(-.03, .03) if 0 < j < seg else 0)
                    if j % 3 == 0 and 0 < j < seg:
                        drop = -random.uniform(0.07, 0.12)          # notch cut up into the course
                    else:
                        drop = random.uniform(0.0, 0.04) + 0.03
                    s_lo = s0 - drop - (0.04 if i == 0 else 0)
                    lo = p_e + sv * s_lo + nv * (P['butt'] + lift)
                    hi = p_e + sv * s1 + nv * lift
                    lo.y = hi.y = y
                    bot.append((lo, hi))
                verts = []
                for lo, hi in bot:
                    verts += [lo + nv * t, hi + nv * t, lo, hi]
                outer, dark = [], []
                for j in range(seg):
                    a_ = 4 * j; b_ = 4 * (j + 1)
                    outer.append((a_, b_, b_ + 1, a_ + 1))
                    dark += [(a_ + 2, a_ + 3, b_ + 3, b_ + 2), (a_, a_ + 2, b_ + 2, b_), (a_ + 1, b_ + 1, b_ + 3, a_ + 3)]
                e = 4 * seg
                dark += [(0, 1, 3, 2), (e, e + 2, e + 3, e + 1)]
                tones[i % 2].mesh(verts, outer)
                edges.mesh(verts, dark)
        # gable fascia triangles are closed by the gable boards in `complete`; leave the roof open below

    if st >= 4:
        # ---------------- walls: horizontal rose planks between the posts
        wl = part('walls', 'Plank_Rose')
        ph = P['plank_h']; t = 0.06
        nrows = int((wt - fh) / ph + 0.999)
        for r in range(nrows):
            z0 = fh + r * ph; z1 = min(wt, z0 + ph)
            zc = (z0 + z1) / 2; hgt = z1 - z0 - 0.012
            for sy in (-1, 1):   # gable walls (front & back)
                wl.box((0, sy * (hd - t / 2 + random.uniform(-.006, .006)), zc), (W - 0.06, t, hgt),
                       rot(sy * random.uniform(-.03, .03), 0, random.uniform(-.004, .004)), jit=0.006)
            for sx in (-1, 1):   # side walls
                wl.box((sx * (hw - t / 2 + random.uniform(-.006, .006)), 0, zc), (t, D - 0.06, hgt),
                       rot(0, sx * random.uniform(-.03, .03), random.uniform(-.004, .004)), jit=0.006)
        # gables: vertical boards up to the roof underside
        gb = part('gables', 'Plank_RoseGable')
        nb = 9; bw = (W - 0.04) / nb
        for sy in (-1, 1):
            y = sy * (hd - 0.03); yo = sy * (hd + 0.0)
            for b in range(nb):
                xa = -hw + 0.02 + b * bw; xb = xa + bw - 0.012
                za, zb = roof_z(xa) - 0.02, roof_z(xb) - 0.02
                if max(za, zb) <= wt + 0.02:
                    continue
                pts = [(xa, wt), (xb, wt), (xb, zb), (xa, za)]
                if xa < 0 < xb:
                    pts = [(xa, wt), (xb, wt), (xb, zb), (0, ridge_z - 0.02), (xa, za)]
                jy = random.uniform(-.008, .008)
                front = [(x, y + sy * 0.03 + jy, z) for x, z in pts]
                back = [(x, y - sy * 0.03 + jy, z) for x, z in pts]
                n = len(pts)
                gb.mesh(front + back, [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] +
                        [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])
        # door: big vertical planks, proud of the wall, + two ledges behind the look
        dr = part('door', 'Plank_RoseDoor')
        dw, dh = P['door_w'], P['lintel_z'] - 0.1 - fh
        nb = 4; bw = dw / nb
        for b in range(nb):
            x = -dw / 2 + bw * (b + 0.5)
            dr.box((x, -hd - 0.05, fh + dh / 2), (bw - 0.02, 0.06, dh - random.uniform(0, 0.03)),
                   rot(random.uniform(-.02, .02), random.uniform(-.01, .01)), jit=0.006)
        # sign board under the gable + raised blocky letters + hanging cords
        sg = part('sign', 'Timber_Sign'); ink = part('sign_letters', 'Timber_Ink'); cord = part('sign_cords', 'Rope_Tie')
        sw, sh, sd = P['sign']; sz = P['sign_z']; sy_ = -hd - 0.12
        R = rot(math.radians(-6), 0, math.radians(-2))   # tipped forward a little as it hangs
        cen = Vector((0, sy_, sz))
        sg.box(tuple(cen), (sw, sd, sh), R, jit=0.01)
        lt = 0.03; front = cen + R @ Vector((0, -sd / 2 - 0.01, 0))
        lw, lh, st_ = 0.15, 0.2, 0.045   # letter width, height, stroke
        gap = 0.035; x0 = -(4 * lw + 3 * gap) / 2

        def bar(x, z, w, h):
            ink.box(tuple(front + R @ Vector((x, 0, z))), (w, lt, h), R)
        for li, ch in enumerate('FEED'):
            lx = x0 + li * (lw + gap)
            bar(lx + st_ / 2, 0, st_, lh)                              # stem
            bar(lx + lw / 2, lh / 2 - st_ / 2, lw, st_)                # top
            if ch in 'FE':
                bar(lx + lw * 0.42, 0, lw * 0.8, st_ * 0.9)            # middle
            if ch == 'E':
                bar(lx + lw / 2, -lh / 2 + st_ / 2, lw, st_)           # bottom
            if ch == 'D':
                bar(lx + lw / 2 - 0.01, -lh / 2 + st_ / 2, lw - 0.02, st_)
                bar(lx + lw - st_ / 2, 0, st_, lh - 2 * st_ + 0.01)
        for sx in (-1, 1):
            a = cen + R @ Vector((sx * (sw / 2 - 0.08), 0, sh / 2)); b = Vector((sx * 0.12, -hd - 0.06, ridge_z - 0.2))
            cord.beam(a, b, 0.018, 0.018)

        # ---------------- props: grain sacks (left of door), scoop (right), spilled grain
        sk = part('sacks', 'Cloth_Burlap'); tie = part('sack_ties', 'Rope_Tie')
        H = P['sack_h']
        prof = [(0.0, 0.0), (0.22, 0.01), (0.29, 0.12), (0.30, 0.3), (0.25, 0.48), (0.12, 0.6), (0.06, 0.66), (0.11, 0.76), (0.02, 0.8)]
        for (cx, cy, sc, lean, yaw) in ((-hw + 0.02, -hd - 0.3, 1.1, -0.14, 0.4), (-hw + 0.5, -hd - 0.42, 1.0, 0.1, -0.3)):
            Rk = rot(0, lean, yaw)
            pr = [(r * sc * 1.28, z * sc * H / 0.8) for r, z in prof]
            sk.lathe(pr, 10, (cx, cy, 0), Rk @ Matrix.Diagonal((1.0, 0.85, 1.0)), wob=0.06)
            tie.cyl(Rk @ Vector((0, 0, 0.64 * sc * H / 0.8)) + Vector((cx, cy, 0)),
                    Rk @ Vector((0, 0, 0.7 * sc * H / 0.8)) + Vector((cx, cy, 0)), 0.075 * sc, 8)
        hd_ = part('scoop_handle', 'Timber_Dark'); sc_ = part('scoop', 'Metal_Scoop')
        base = Vector((dw / 2 + 0.18, -hd - 0.42, 0.07)); topp = Vector((dw / 2 + 0.36, -hd - 0.1, 1.22))
        hd_.cyl(base + (topp - base) * 0.12, topp, 0.025, 6)
        hd_.box(tuple(topp + Vector((0, 0, 0.03))), (0.14, 0.04, 0.04), rot(0, 0, 0.2))
        # scoop blade: open-ended tray resting on the ground, angled to the handle
        Rs = rot(math.radians(8), 0, math.radians(-25))
        bc = base + Vector((-0.04, -0.12, -0.04))
        for c, s in (((0, 0, 0), (0.38, 0.46, 0.025)), ((-0.19, 0, 0.07), (0.025, 0.46, 0.16)),
                     ((0.19, 0, 0.07), (0.025, 0.46, 0.16)), ((0, 0.23, 0.07), (0.38, 0.025, 0.16))):
            sc_.box(tuple(bc + Rs @ Vector(c)), s, Rs)
        gr = part('spilled_grain', 'Grain_Gold')

        def heap(cx, cy, rx, ry, h, n=12):
            pts = [Vector((cx, cy, h))]
            for k in range(n):
                t = 2 * math.pi * k / n; f = random.uniform(0.75, 1.15)
                pts.append(Vector((cx + rx * f * math.cos(t), cy + ry * f * math.sin(t), 0.004)))
            gr.mesh(pts, [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)] + [tuple(range(n, 0, -1))])
        for cx, cy, rx, ry in ((-0.7, 0.45, 0.3, 0.18), (-0.32, 0.52, 0.3, 0.2), (0.05, 0.55, 0.26, 0.17),
                               (0.4, 0.5, 0.24, 0.16), (-0.12, 0.7, 0.18, 0.1), (0.68, 0.6, 0.2, 0.14),
                               (0.95, 0.45, 0.2, 0.14), (0.85, 0.75, 0.2, 0.12), (1.15, 0.6, 0.14, 0.1)):
            heap(cx, -hd - cy, rx, ry, random.uniform(0.03, 0.05), 10)
        for _ in range(18):
            heap(random.uniform(-1.0, 1.3), -hd - random.uniform(0.35, 0.9), 0.05, 0.04, 0.015, 5)

    for b in parts:
        b.obj()


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    states = [a for a in sys.argv[1:] if a in STATES] or STATES
    os.makedirs(os.path.join(HERE, 'variants'), exist_ok=True)
    for s in states:
        build(s)
        export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'complete':
            export(os.path.join(HERE, f'{NAME}.glb'))

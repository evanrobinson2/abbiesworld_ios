"""Feed store, CHARMING style (Ranch tile). Standalone builder: `python build.py` -> feed-store-charming.glb + variants/<state>.glb

Started from models/feed-store/build.py and reshaped to the storybook-toy concept (mj/feed-store-charming/hero.png):
same layout, states, origin, orientation and material names as the normal model, so it drops in its place.

Layout: Z up, metres, origin at the centre of the footprint on the ground.
Gable-front shed: the door is in the gable end, which faces -Y (front). The ridge runs along Y.
STATE: planned | foundation | frame | roof | complete (all are exported by default; `python build.py roof` builds one).

Charming changes are mostly one idea: everything is built straight, from segmented vertical planks and posts, then
`warp()` bends it: walls bulge out at mid height and flare at the foot, the whole shed leans a little to +X, and the
roofline is crooked (front of the ridge higher than the back). The roof is a bell curve (steep at the ridge, kicked
out at the eaves) of chunky single shingles, with a lumpy teal ridge roll and a big pink ridge log whose ends curl up.
"""
import math, random, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'feed-store-charming'
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']

P = dict(
    W=2.3,            # wall width across the gable (x), outside of the planks
    D=2.0,            # wall depth (y)
    foot_h=0.26,      # stone footing height
    foot_out=0.14,    # footing proud of the wall
    foot_d=0.3,       # footing stone depth
    wall_top=2.1,     # eave / tie-beam height (z)
    rise=1.35,         # ridge rise above wall_top (roof underside at x=0)
    bell=-0.28,       # roof curve: <0 steeper at the ridge, flatter (kicked) at the eaves
    eave_ov=0.45,      # roof overhang past the side walls (x)
    gable_ov=0.28,    # roof overhang past the gable walls (y)
    courses=5,        # shingle courses per slope
    shingles=11,      # shingles per course along y (long thin shakes)
    course_t=0.1,     # shingle thickness
    butt=0.09,        # how far each course butt kicks out
    ridge_r=0.15,     # ridge log radius
    ridge_flare=0.3,  # ridge log end radius (the curled-up ends)
    ridge_ov=0.42,    # ridge log overhang past the front roof edge
    ridge_ov_back=0.26,  # ... and past the back
    roll_r=0.21,      # teal ridge roll radius
    post=0.22,        # corner post section
    beam=(0.16, 0.18),  # tie beam (depth, height)
    door_w=1.08, door_frame=0.13,
    lintel_z=1.82,     # top of the door lintel log
    planks_front=8, planks_side=7,
    win=(0.46, 0.62), win_z=1.25, win_y=0.42,   # window size (w, h), centre height, centre offset from the middle (y)
    sign=(0.92, 0.46, 0.08), sign_x=-0.14, sign_z=2.44,
    sack_h=0.78,
    bulge=0.055,      # wall bulge at mid height (fraction of the half width)
    flare=0.03,       # extra flare at the foot of the walls
    lean=0.03,        # lean of the whole shed toward +X (m per m of height)
    tilt=0.12,        # crooked roof: the front of the ridge sits this much higher than the back
)
if os.environ.get('FS_P'):          # quick parameter sweeps: FS_P='{"W": 2.0}'
    import json as _j; P.update(_j.loads(os.environ['FS_P']))

COLS = dict(
    Plank_Rose=(238, 148, 138), Plank_RoseDoor=(242, 170, 152), Plank_RoseGable=(232, 140, 130),
    Timber_Brown=(214, 132, 114), Timber_Dark=(92, 66, 44), Timber_Floor=(238, 182, 148),
    Timber_Sign=(170, 120, 88), Timber_Ink=(52, 112, 104),
    Roof_Teal=(58, 126, 118), Roof_TealLight=(80, 146, 138), Roof_TealDark=(34, 80, 74),
    Stone_Grey=(124, 114, 80), Stone_Light=(146, 138, 104),
    Cloth_Burlap=(200, 168, 128), Rope_Tie=(172, 132, 92), Rope_String=(232, 226, 210),
    Metal_Scoop=(84, 78, 72), Grain_Gold=(210, 160, 84), Glass_Window=(52, 46, 36),
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
        b.inputs['Roughness'].default_value = 0.6 if name.startswith(('Metal', 'Glass')) else 0.85
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ the toy warp
def warp(p):
    """Bulge the walls, flare their foot, lean the shed to +X and tip the roof (front higher)."""
    x, y, z = p
    fh, wt = P['foot_h'], P['wall_top']
    t = (z - fh) / (wt - fh)
    if 0 <= t <= 1:
        b = P['bulge'] * math.sin(math.pi * t) ** 0.8 + P['flare'] * (1 - t) ** 3
        x *= 1 + b; y *= 1 + b * 0.9
    if z > fh:
        x += P['lean'] * (z - fh)
    u = max(0.0, min(1.25, (z - wt + 0.15) / P['rise']))
    z += P['tilt'] * (-y / (P['D'] / 2 + P['gable_ov'])) * 0.5 * u
    return (x, y, z)


# ------------------------------------------------------------------ mesh helper
class MB:
    """Accumulates polygons for one object with one material."""
    def __init__(self, name, m, warp=True):
        self.name = name; self.mname = m; self.v = []; self.f = []; self.warp = warp

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

    def loft(self, rings, caps=True):
        """rings: list of equal-length closed point loops; joined in order, capped at both ends."""
        n = len(rings[0]); pts = [p for r in rings for p in r]
        faces = []
        for j in range(len(rings) - 1):
            for k in range(n):
                faces.append((j * n + k, j * n + (k + 1) % n, (j + 1) * n + (k + 1) % n, (j + 1) * n + k))
        if caps:
            faces += [tuple(reversed(range(n))), tuple(range((len(rings) - 1) * n, len(rings) * n))]
        self.mesh(pts, faces)

    def column(self, cx, cy, sx, sy, z0, tops, nseg=6, jit=0.0):
        """Upright board/post split into nseg rings so the warp can bend it. tops: one top z per corner
        (corners in order (-x,-y), (+x,-y), (+x,+y), (-x,+y)) or a single number."""
        tops = tops if isinstance(tops, (list, tuple)) else [tops] * 4
        cs = [(-sx / 2, -sy / 2), (sx / 2, -sy / 2), (sx / 2, sy / 2), (-sx / 2, sy / 2)]
        rings = []
        for j in range(nseg + 1):
            f = j / nseg; r = []
            for (dx, dy), zt in zip(cs, tops):
                jx = random.uniform(-jit, jit) if jit else 0
                r.append(Vector((cx + dx + jx, cy + dy + jx, z0 + f * (zt - z0))))
            rings.append(r)
        self.loft(rings)

    def tube(self, path, radii, n=8, up=(0, 0, 1), wob=0.0):
        """Round section swept along a polyline; radii one per path point."""
        path = [Vector(p) for p in path]; rings = []
        for i, c in enumerate(path):
            d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            u = Vector(up).cross(d)
            if u.length < 1e-6:
                u = Vector((1, 0, 0)).cross(d)
            u.normalize(); w = d.cross(u); r = []
            for k in range(n):
                t = 2 * math.pi * k / n; rr = radii[i] * (1 + random.uniform(-wob, wob))
                r.append(c + (u * math.cos(t) + w * math.sin(t)) * rr)
            rings.append(r)
        self.loft(rings)

    def sweep(self, path, w, h, up=(0, 0, 1)):
        """Rectangular board swept along a polyline (barge boards along the bell-curved roof)."""
        path = [Vector(p) for p in path]; rings = []
        for i, c in enumerate(path):
            d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            a = Vector(up).cross(d)
            if a.length < 1e-6:
                a = Vector((0, 1, 0)).cross(d)
            a.normalize(); b = d.cross(a)
            rings.append([c + a * sa * w / 2 + b * sb * h / 2 for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        self.loft(rings)

    def cyl(self, a, b, r, n=8, r2=None):
        self.tube([a, b], [r, r if r2 is None else r2], n)

    def lathe(self, prof, n=10, c=(0, 0, 0), R=None, wob=0.0):
        """prof: [(r, z)] bottom to top; closed with caps."""
        R = R if R is not None else Matrix.Identity(3)
        rings = []
        for r, z in prof:
            ring = []
            for k in range(n):
                t = 2 * math.pi * k / n
                rr = r * (1 + random.uniform(-wob, wob)) if r > 0 else 0
                ring.append(R @ Vector((rr * math.cos(t), rr * math.sin(t), z)) + Vector(c))
            rings.append(ring)
        self.loft(rings)

    def obj(self):
        verts = [warp(p) for p in self.v] if self.warp else self.v
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(verts, [], self.f)
        me.materials.append(mat(self.mname))
        me.validate(); me.update()
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-6)
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
    """Underside line of the bell roof at |x|: through the wall top at the side walls and the ridge at x=0,
    steeper near the ridge, flatter toward the eaves, carried straight on past the walls (the overhang)."""
    hw = P['W'] / 2; u = abs(x) / hw; r = P['rise']; k = P['bell']
    if u <= 1:
        return P['wall_top'] + r * ((1 - u) + k * (1 - u) * u)
    return P['wall_top'] - r * (1 + k) * (u - 1)


def roof_curve(sx, n=24):
    """Points (x, z) along one slope's underside from the eave tip (s=0) to the ridge; with cumulative lengths."""
    xe = P['W'] / 2 + P['eave_ov']
    pts = [Vector((sx * xe * (1 - i / n), 0, roof_z(xe * (1 - i / n)))) for i in range(n + 1)]
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + (b - a).length)
    return pts, L


def at(curve, s):
    """Point and unit tangent (toward the ridge) at arc length s along a roof curve."""
    pts, L = curve; s = max(0.0, min(L[-1], s))
    for i in range(len(L) - 1):
        if L[i + 1] >= s:
            f = (s - L[i]) / max(1e-9, L[i + 1] - L[i]); d = (pts[i + 1] - pts[i]).normalized()
            return pts[i].lerp(pts[i + 1], f), d
    return pts[-1], (pts[-1] - pts[-2]).normalized()


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    random.seed(11)
    W, D = P['W'], P['D']; hw, hd = W / 2, D / 2
    fh = P['foot_h']; wt = P['wall_top']; ps = P['post']
    ridge_z = wt + P['rise']
    st = STATES.index(state)
    parts = []

    def part(name, m, warp=True):
        b = MB(name, m, warp); parts.append(b); return b

    # ---------------- planned: chubby corner stakes + string lines
    if state == 'planned':
        stakes = part('stakes', 'Timber_Brown', False); strings = part('string_lines', 'Rope_String', False)
        e = 0.2
        cs = [(-hw - e, -hd - e), (hw + e, -hd - e), (hw + e, hd + e), (-hw - e, hd + e)]
        for x, y in cs:
            R = rot(random.uniform(-.08, .08), random.uniform(-.08, .08))
            stakes.lathe([(0.0, 0.0), (0.05, 0.03), (0.06, 0.4), (0.075, 0.42), (0.08, 0.5), (0.0, 0.53)], 8, (x, y, 0), R)
        for i in range(4):
            (x0, y0), (x1, y1) = cs[i], cs[(i + 1) % 4]
            strings.beam((x0, y0, 0.4), (x1, y1, 0.4), 0.02, 0.02)
        for x in (-P['door_w'] / 2, P['door_w'] / 2):   # pegs for the door
            stakes.lathe([(0.0, 0.0), (0.035, 0.02), (0.04, 0.24), (0.0, 0.27)], 6, (x, -hd - e, 0))
        for b in parts:
            b.obj()
        return

    # ---------------- foundation: ring of round lumpy stones + floor
    foot = part('footing', 'Stone_Grey'); foot2 = part('footing_light', 'Stone_Light')
    fo, fd = P['foot_out'], P['foot_d']
    sides = [((-hw - fo, -hd - fo), (hw + fo, -hd - fo)), ((hw + fo, -hd - fo), (hw + fo, hd + fo)),
             ((hw + fo, hd + fo), (-hw - fo, hd + fo)), ((-hw - fo, hd + fo), (-hw - fo, -hd - fo))]
    k = 0
    for (x0, y0), (x1, y1) in sides:
        L = math.hypot(x1 - x0, y1 - y0); dx, dy = (x1 - x0) / L, (y1 - y0) / L
        nx, ny = dy, -dx
        s = 0.0
        while s < L - 0.08:
            bl = min(random.uniform(0.38, 0.54), L - s)
            c = s + bl / 2; h = fh + random.uniform(-0.03, 0.04)
            cx = x0 + dx * c - nx * (fd / 2 - 0.03); cy = y0 + dy * c - ny * (fd / 2 - 0.03)
            R = rot(0, 0, math.atan2(dy, dx) + random.uniform(-.1, .1)) @ Matrix.Diagonal((1.0, fd / bl, 1.0))
            r = bl / 2 + 0.02
            (foot if k % 3 else foot2).lathe([(0.0, 0.0), (r * 0.9, 0.0), (r, h * 0.35), (r * 0.88, h * 0.8), (r * 0.5, h), (0.0, h * 1.02)],
                                             7, (cx, cy, 0), R, wob=0.08)
            s += bl; k += 1
    floor = part('floor', 'Timber_Floor')
    floor.box((0, 0, fh - 0.03), (W - 0.06, D - 0.06, 0.06))

    if st >= 2:
        # ---------------- frame: bowed corner posts, tie beams, wall plates, braces, door frame, barge boards, ridge log
        fr = part('frame', 'Timber_Brown')
        bd, bh = P['beam']
        for sx in (-1, 1):
            for sy in (-1, 1):
                x = sx * (hw - ps / 2 + 0.05); y = sy * (hd - ps / 2 + 0.05)
                fr.column(x, y, ps, ps, fh - 0.02, wt + 0.08, 6, jit=0.01)
        for sy in (-1, 1):   # tie beams across the gables, ends poking out past the posts
            fr.box((0, sy * (hd + 0.04), wt + bh / 2 - 0.02), (W + 0.3, bd, bh), rot(0, random.uniform(-.015, .015)), jit=0.01)
        for sx in (-1, 1):   # wall plates along the eaves
            fr.box((sx * (hw - 0.02), 0, wt + 0.05), (0.15, D + 0.1, 0.13))
        for sy in (-1, 1):   # knee braces from the posts up to the tie beam
            y = sy * (hd + 0.04)
            for sx in (-1, 1):
                a = (sx * (hw - ps * 0.6), y, wt - 0.62); b = (sx * (hw - ps - 0.42), y, wt)
                fr.beam(a, b, 0.1, 0.11)
        # door frame: jambs + a chunky lintel log that overhangs both jambs + a sill
        dw, df = P['door_w'], P['door_frame']
        y = -hd - 0.06
        for sx in (-1, 1):
            fr.column(sx * (dw / 2 + df / 2), y, df, 0.11, fh - 0.02, P['lintel_z'] - 0.06, 5)
        lint = part('lintel', 'Timber_Brown')
        lint.tube([(-dw / 2 - 0.3, y - 0.05, P['lintel_z'] - 0.02), (0, y - 0.06, P['lintel_z'] + 0.01),
                   (dw / 2 + 0.3, y - 0.05, P['lintel_z'] - 0.04)], [0.085, 0.09, 0.085], 8, up=(0, 0, 1))
        fr.box((0, y - 0.02, fh + 0.02), (dw + 0.3, 0.16, 0.08))
        # barge boards on both gables + one middle pair of rafters, following the bell curve
        for yy, w_, h_ in ((-hd - P['gable_ov'] + 0.05, 0.12, 0.2), (hd + P['gable_ov'] - 0.05, 0.12, 0.2), (0.0, 0.08, 0.12)):
            for sx in (-1, 1):
                pts, _ = roof_curve(sx, 10)
                path = [Vector((p.x, yy, p.z - h_ * 0.35)) for p in pts if yy != 0.0 or abs(p.x) <= hw + 0.02]
                fr.sweep(path, w_, h_, up=(0, 1, 0))
        # ridge log: sags a little in the middle and curls up into flared ends
        log = part('ridge_log', 'Timber_Brown'); endc = part('ridge_log_ends', 'Timber_Floor')
        rz = ridge_z + P['ridge_r'] * 0.55
        Lf = hd + P['gable_ov'] + P['ridge_ov']; Lb = hd + P['gable_ov'] + P['ridge_ov_back']
        ys = [-Lf, -Lf + 0.12, -Lf + 0.3, -hd, -hd * 0.4, 0.0, hd * 0.4, hd, Lb - 0.22, Lb - 0.08, Lb]
        path, radii = [], []
        for yv in ys:
            if yv < -hd:
                f = (-hd - yv) / (Lf - hd); dz = 0.36 * f ** 1.5; r = P['ridge_r'] + (P['ridge_flare'] - P['ridge_r']) * f ** 1.4
            elif yv > hd:
                f = (yv - hd) / (Lb - hd); dz = 0.26 * f ** 1.5; r = P['ridge_r'] + (P['ridge_flare'] * 0.8 - P['ridge_r']) * f ** 1.4
            else:
                dz = -0.03 * math.cos(math.pi * yv / D); r = P['ridge_r']
            path.append((0, yv, rz + dz)); radii.append(r)
        log.tube(path, radii, 10, up=(1, 0, 0), wob=0.03)
        for (p0, p1, r) in ((path[0], path[1], radii[0]), (path[-1], path[-2], radii[-1])):   # pale end grain discs
            a = Vector(p0); d = (a - Vector(p1)).normalized()
            endc.cyl(a - d * 0.005, a + d * 0.012, r * 0.86, 10)

    if st >= 3:
        # ---------------- roof: dark underboard + chunky single shingles in staggered courses, lumpy ridge roll
        under = part('roof_edges', 'Roof_TealDark')
        y0, y1 = -hd - P['gable_ov'], hd + P['gable_ov']
        for sx in (-1, 1):
            side = 'left' if sx < 0 else 'right'
            tones = [part(f'roof_{side}', 'Roof_Teal'), part(f'roof_{side}_light', 'Roof_TealLight')]
            cv = roof_curve(sx); Ls = cv[1][-1]
            pts = cv[0][::3] + ([cv[0][-1]] if (len(cv[0]) - 1) % 3 else [])
            rings = []
            for p in pts:          # thin board under the shingles so no gaps show
                rings.append([Vector((p.x, y0 + 0.02, p.z + 0.02)), Vector((p.x, y1 - 0.02, p.z + 0.02)),
                              Vector((p.x, y1 - 0.02, p.z + 0.07)), Vector((p.x, y0 + 0.02, p.z + 0.07))])
            under.loft(rings)
            n = P['courses']; step = (Ls + 0.05) / n; t = P['course_t']
            for i in range(n):
                s0 = i * step - (0.06 if i == 0 else 0); s1 = min(Ls + 0.06, (i + 1) * step + step * 0.55)
                m = P['shingles'] + (i % 2)
                cuts = [y0 - 0.03] + sorted(y0 + (y1 - y0) * (j + random.uniform(-.2, .2)) / m for j in range(1, m)) + [y1 + 0.03]
                for j in range(m):
                    ya, yb = cuts[j] + 0.012, cuts[j + 1] - 0.012
                    drop = random.uniform(0.0, 0.11); skew = random.uniform(-.04, .04); jl = random.uniform(0, 0.03)
                    corners = []
                    for yv, dr in ((ya, drop + random.uniform(-.03, .03)), (yb, drop + random.uniform(-.03, .03))):
                        plo, dlo = at(cv, s0 - dr); phi, dhi = at(cv, s1)
                        nlo = Vector((-dlo.z, 0, dlo.x)) if sx > 0 else Vector((dlo.z, 0, -dlo.x))
                        nhi = Vector((-dhi.z, 0, dhi.x)) if sx > 0 else Vector((dhi.z, 0, -dhi.x))
                        if nlo.z < 0: nlo = -nlo
                        if nhi.z < 0: nhi = -nhi
                        lift = 0.07 + 0.012 * i + jl
                        lo = plo + nlo * (lift + P['butt']); hi = phi + nhi * lift
                        lo.y = yv + skew; hi.y = yv - skew
                        corners.append((lo, hi, nlo, nhi))
                    (la, ha, na, nha), (lb, hb, nb_, nhb) = corners
                    verts = [la, lb, hb, ha, la + na * t, lb + nb_ * t, hb + nhb * t, ha + nha * t]
                    tones[(i + j) % 2].mesh(verts, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        roll = part('ridge_roll', 'Roof_TealLight')
        nr = 13; path, radii = [], []
        for i in range(nr):
            yv = y0 - 0.02 + (y1 - y0 + 0.04) * i / (nr - 1)
            path.append((0, yv, ridge_z + 0.24)); radii.append(P['roll_r'] * (0.85 + 0.2 * abs(math.sin(i * 1.3))))
        roll.tube(path, radii, 8, up=(1, 0, 0))

    if st >= 4:
        # ---------------- walls: vertical rose planks; gable planks run up to the roof line
        wl = part('walls', 'Plank_Rose'); gb = part('gables', 'Plank_RoseGable')
        t = 0.07
        nf = P['planks_front']; bw = (W - 0.04) / nf
        for sy in (-1, 1):
            y = sy * (hd - t / 2)
            for b in range(nf):
                xa = -hw + 0.02 + b * bw; xb = xa + bw - 0.014; xc = (xa + xb) / 2
                za, zb = roof_z(xa) - 0.03, roof_z(xb) - 0.03
                tops = [za, zb, zb, za]
                (gb if b % 3 == 1 else wl).column(xc + random.uniform(-.005, .005), y + random.uniform(-.008, .008),
                                                  xb - xa, t, fh, tops, 8, jit=0.006)
        ns = P['planks_side']; bw = (D - 0.04) / ns
        for sx in (-1, 1):
            x = sx * (hw - t / 2)
            for b in range(ns):
                yc = -hd + 0.02 + bw * (b + 0.5)
                wl.column(x + random.uniform(-.008, .008), yc, t, bw - 0.014, fh, wt + random.uniform(-.02, 0.0), 6, jit=0.006)
        # door: vertical planks proud of the wall, two ledges and a Z brace
        dr = part('door', 'Plank_RoseDoor'); dl = part('door_ledges', 'Timber_Brown')
        dw = P['door_w']; dtop = P['lintel_z'] - 0.1
        nb = 4; bw = dw / nb; yd = -hd - 0.07
        for b in range(nb):
            x = -dw / 2 + bw * (b + 0.5)
            dr.column(x, yd, bw - 0.02, 0.06, fh + 0.04, dtop - random.uniform(0, 0.04), 5, jit=0.006)
        for z in (fh + 0.3, dtop - 0.32):
            dl.box((0, yd - 0.05, z), (dw - 0.08, 0.05, 0.13), rot(0, random.uniform(-.03, .03)))
        dl.beam((-dw / 2 + 0.12, yd - 0.05, fh + 0.36), (dw / 2 - 0.12, yd - 0.05, dtop - 0.38), 0.05, 0.13, up=(0, 1, 0))
        # windows on both eave walls: dark glass, cross muntins, pink frame with a chunky sill and head
        gl = part('window_glass', 'Glass_Window'); mu = part('window_muntins', 'Timber_Dark')
        wf = part('window_frames', 'Timber_Brown')
        ww, wh = P['win']; wz = P['win_z']
        for sx in (-1, 1):
            xg = sx * (hw + 0.005)
            for yc in (-P['win_y'], P['win_y']):
                gl.box((xg, yc, wz), (0.03, ww, wh))
                mu.box((xg + sx * 0.02, yc, wz), (0.025, 0.035, wh))
                mu.box((xg + sx * 0.02, yc, wz + 0.04), (0.025, ww, 0.035))
                for dy in (-1, 1):
                    wf.box((xg + sx * 0.03, yc + dy * (ww / 2 + 0.04), wz), (0.06, 0.08, wh + 0.06))
                wf.box((xg + sx * 0.05, yc, wz - wh / 2 - 0.05), (0.1, ww + 0.3, 0.1), rot(random.uniform(-.04, .04)))
                wf.box((xg + sx * 0.05, yc, wz + wh / 2 + 0.05), (0.1, ww + 0.26, 0.1), rot(random.uniform(-.04, .04)))
        # sign board nailed on the gable, left of centre, a little crooked, with chunky painted FEED letters
        sg = part('sign', 'Timber_Sign'); ink = part('sign_letters', 'Timber_Ink')
        sw, sh, sd = P['sign']; sz = P['sign_z']
        R = rot(math.radians(-4), math.radians(5), 0)
        cen = Vector((P['sign_x'], -hd - 0.09, sz))
        sg.box(tuple(cen), (sw, sd, sh), R, jit=0.012)
        sg.box(tuple(cen + R @ Vector((0.02, 0.01, -0.03))), (sw + 0.1, sd * 0.6, sh * 0.6), R @ rot(0, math.radians(-3)), jit=0.01)
        lt = 0.03; front = cen + R @ Vector((0, -sd / 2 - 0.01, 0.03))
        lw, lh, st_ = 0.18, 0.26, 0.065
        gap = 0.03; x0 = -(4 * lw + 3 * gap) / 2

        def bar(x, z, w, h):
            ink.box(tuple(front + R @ Vector((x, 0, z))), (w, lt, h), R)
        for li, ch in enumerate('FEED'):
            lx = x0 + li * (lw + gap)
            bar(lx + st_ / 2, 0, st_, lh)
            bar(lx + lw / 2, lh / 2 - st_ / 2, lw, st_)
            if ch in 'FE':
                bar(lx + lw * 0.42, 0, lw * 0.8, st_ * 0.9)
            if ch == 'E':
                bar(lx + lw / 2, -lh / 2 + st_ / 2, lw, st_)
            if ch == 'D':
                bar(lx + lw / 2 - 0.01, -lh / 2 + st_ / 2, lw - 0.02, st_)
                bar(lx + lw - st_ / 2, 0, st_, lh - 2 * st_ + 0.01)

        # ---------------- props: three plump grain sacks (left of door), a big scoop (right), a little spilled grain
        sk = part('sacks', 'Cloth_Burlap', False); tie = part('sack_ties', 'Rope_Tie', False)
        gr = part('spilled_grain', 'Grain_Gold', False)
        H = P['sack_h']
        prof = [(0.0, 0.0), (0.26, 0.0), (0.32, 0.1), (0.31, 0.5), (0.26, 0.7), (0.16, 0.8), (0.12, 0.84), (0.17, 0.9), (0.11, 0.95), (0.0, 0.93)]
        for (cx, cy, sc, lean, yaw) in ((-hw - 0.05, -hd - 0.28, 1.0, -0.16, 0.4), (-hw + 0.28, -hd - 0.3, 1.15, 0.04, -0.2),
                                        (-hw + 0.55, -hd - 0.5, 0.95, 0.12, 0.3)):
            Rk = rot(0, lean, yaw)
            pr = [(r * sc * 1.25, z * sc * H / 0.8) for r, z in prof]
            sk.lathe(pr, 9, (cx, cy, 0), Rk @ Matrix.Diagonal((1.0, 0.85, 1.0)), wob=0.1)
            tie.cyl(Rk @ Vector((0, 0, 0.8 * sc * H / 0.8)) + Vector((cx, cy, 0)),
                    Rk @ Vector((0, 0, 0.86 * sc * H / 0.8)) + Vector((cx, cy, 0)), 0.13 * sc, 8)
        hd_ = part('scoop_handle', 'Timber_Dark', False); sc_ = part('scoop', 'Metal_Scoop', False)
        base = Vector((dw / 2 + 0.2, -hd - 0.5, 0.08)); topp = Vector((dw / 2 + 0.34, -hd - 0.14, 1.32))
        hd_.cyl(base + (topp - base) * 0.12, topp, 0.035, 6)
        hd_.box(tuple(topp + Vector((0, 0, 0.04))), (0.18, 0.06, 0.06), rot(0, 0, 0.2))
        Rs = rot(math.radians(10), 0, math.radians(-20))
        bc = base + Vector((-0.04, -0.14, -0.05))
        for c, s in (((0, 0, 0), (0.42, 0.5, 0.03)), ((-0.21, 0, 0.08), (0.03, 0.5, 0.18)),
                     ((0.21, 0, 0.08), (0.03, 0.5, 0.18)), ((0, 0.25, 0.08), (0.42, 0.03, 0.18))):
            sc_.box(tuple(bc + Rs @ Vector(c)), s, Rs)

        def heap(cx, cy, rx, ry, h, n=10):
            pts = [Vector((cx, cy, h))]
            for k in range(n):
                tt = 2 * math.pi * k / n; f = random.uniform(0.75, 1.15)
                pts.append(Vector((cx + rx * f * math.cos(tt), cy + ry * f * math.sin(tt), 0.004)))
            gr.mesh(pts, [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)] + [tuple(range(n, 0, -1))])
        for cx, cy, rx, ry in ((-0.55, 0.62, 0.22, 0.13), (-0.2, 0.55, 0.18, 0.12), (0.45, 0.72, 0.18, 0.12)):
            heap(cx, -hd - cy, rx, ry, random.uniform(0.03, 0.05))
        for _ in range(10):
            heap(random.uniform(-1.0, 1.0), -hd - random.uniform(0.4, 0.9), 0.05, 0.04, 0.015, 5)

    for b in parts:
        b.obj()


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def tri_count():
    n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            n += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return n


if __name__ == '__main__':
    states = [a for a in sys.argv[1:] if a in STATES] or STATES
    os.makedirs(os.path.join(HERE, 'variants'), exist_ok=True)
    for s in states:
        build(s)
        print(f'{s}: {tri_count()} triangles')
        export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'complete':
            export(os.path.join(HERE, f'{NAME}.glb'))

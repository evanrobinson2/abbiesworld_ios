"""horse-shelter-charming (game id cattle-shelter, charming set): the storybook-toy twin of models/horse-shelter.

usage: python build.py            builds every construction stage, writes horse-shelter-charming.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes horse-shelter-charming.glb)

Same conventions, states, part names and material names as the normal model, so it drops in for it:
Z up, metres, origin at the footprint centre on the ground, front (gable with the stable door) faces -Y, plan 4.6 x 5.5.
What makes it charming (all numbers in P): a steep bell-flared roof (pitch eases from PITCH_TOP at the ridge to
PITCH_EAVE at the eaves), a sagging ridge line whose chunky ridge beam kicks up at the front, walls that splay out
toward the footing (BULGE) and a slight lean (LEAN), fat timbers, chunky cobbled footing with boulders, an oversized
arched stable door whose top leaf swings open, oversized windows (gable window and arched side windows) and a toy hay rack.
States: planned (stakes + string lines), foundation (stone footing + earth floor), frame (+ timber frame),
roof (+ roof, walls still open), complete (+ plank walls, door, windows, hay rack).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'horse-shelter-charming'

P = dict(
    W=4.6,            # wall width across the gable (X) at the plate line (same plan as the normal model)
    D=5.5,            # wall depth along the ridge (Y)
    FOOT_H=0.46,      # stone footing height (chunkier than normal)
    FOOT_OUT=0.10,
    FOOT_IN=0.36,
    SILL=0.24,
    EAVE=2.45,        # top of the wall plates
    BEAM=0.28,        # fat toy timbers
    POST=0.34,
    BULGE=0.10 ,      # walls splay out toward the ground: scale grows to 1+BULGE at z=0 (soft, chubby walls)
    LEAN=0.10,        # the whole shed leans a touch toward +X at the top (m at the ridge)
    PITCH_TOP=57.0,   # bell roof: pitch at the ridge ...
    PITCH_EAVE=25.0,  # ... easing to this at the eave edge
    PROFILE_EXP=1.3,  # how fast the pitch eases (higher: steep for longer, then a late flare)
    DECK_LIFT=0.30,   # roof deck underside above the plate line at the wall
    EAVE_OH=0.75,     # side eave overhang (horizontal)
    GABLE_OH=0.40,    # roof overhang past the gable walls
    SAG=0.10,         # the ridge sags in the middle (ends this much higher)
    RIDGE_OH=0.45,    # ridge beam proud of the front roof edge
    RIDGE_SEC=(0.40, 0.30),
    RIDGE_KICK=0.60,  # the ridge beam's front end rises (crooked toy roofline)
    RIDGE_TWIST=2.0,  # deg, ridge beam yawed a little off true
    COURSE=0.56,      # shingle course spacing along the slope (fewer, bigger shakes)
    TAB_W=(0.40, 0.62),
    TAB_TH=0.06,
    TAB_LIFT=0.13,
    PLANK_W=0.30,
    PLANK_T=0.07,
    DOOR_XC=0.10,     # stable door centre (a hair right of centre, as in the hero)
    DOOR_W=1.80,      # oversized
    DOOR_TOP=3.05,    # top of the arched opening at its crown (rises above the plate line into the gable)
    ARCH_RISE=0.32,
    DOOR_SPLIT=1.75,  # top of the closed lower leaf
    LEAF_OPEN=55.0,   # deg the upper leaf is swung out
    INTERIOR_D=0.9,
    WIN_G=(0.30, 3.80, 0.62, 0.62),    # gable window: centre x, sill z, width, height
    WIN_S=(-0.10, 1.30, 0.72, 0.95),   # side windows: centre y, sill z, width, height (arched)
    RACK_XC=-1.45,    # toy hay rack left of the door on the front gable
    RACK_Z=(1.30, 1.75),
    RACK_W=0.95,
    RACK_OUT=0.38,
)

COL = {  # sRGB, sampled from the charming hero (same names and roles as the normal model; Glass_Dark is new)
    'Plank_Rose': (246, 172, 162), 'Plank_RoseLight': (250, 190, 178), 'Plank_RoseDark': (232, 150, 142),
    'Timber_Brown': (230, 118, 96), 'Timber_Dark': (186, 96, 82), 'Roof_Teal': (48, 112, 116), 'Stone_Teal': (104, 110, 96),
    'Hay_Straw': (206, 146, 72), 'Metal_Iron': (42, 37, 34), 'Plank_Shadow': (22, 16, 14),
    'Soil_Floor': (166, 134, 104), 'Rope_String': (226, 214, 180), 'Glass_Dark': (40, 58, 56),
}
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']
GROUPS = {'planned': {'stakes'}, 'foundation': {'foundation'}, 'frame': {'foundation', 'frame'},
          'roof': {'foundation', 'frame', 'roof'}, 'complete': {'foundation', 'frame', 'roof', 'walls'}}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        MATS[name] = m
    return MATS[name]


ZTOP = 6.5


def deform(v):
    """Charming squash: walls splay out toward the ground, and the whole shed leans a touch toward +X."""
    z = v.z; t = min(1.0, max(0.0, 1.0 - z / P['EAVE']))
    s = 1.0 + P['BULGE'] * t ** 1.6
    x, y = v.x * s, v.y * s
    x += P['LEAN'] * (max(z, 0.0) / ZTOP) ** 2
    return Vector((x, y, z))


class Part:
    """Collects boxes/prisms into one bmesh, becomes one object with one material."""
    def __init__(self, name, material, group):
        self.name, self.material, self.group = name, material, group
        self.bm = bmesh.new()

    def poly(self, verts, faces):
        vs = [self.bm.verts.new(Vector(v)) for v in verts]
        for f in faces:
            try:
                self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                pass

    def hexa(self, c):  # 8 corners: bottom 0-3 (ccw from above), top 4-7
        self.poly(c, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def box(self, lo, hi, rot=None, pivot=None):
        x0, y0, z0 = lo; x1, y1, z1 = hi
        c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        if rot is not None:
            pv = Vector(pivot if pivot else ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
            c = [tuple(rot @ (Vector(p) - pv) + pv) for p in c]
        self.hexa(c)

    def cbox(self, lo, hi, ch, rot=None):
        """A box with its top edges chamfered by ch (soft toy stones and blocks)."""
        x0, y0, z0 = lo; x1, y1, z1 = hi; zc = z1 - ch
        c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
             (x0, y0, zc), (x1, y0, zc), (x1, y1, zc), (x0, y1, zc),
             (x0 + ch, y0 + ch, z1), (x1 - ch, y0 + ch, z1), (x1 - ch, y1 - ch, z1), (x0 + ch, y1 - ch, z1)]
        if rot is not None:
            pv = Vector(((x0 + x1) / 2, (y0 + y1) / 2, z0))
            c = [tuple(rot @ (Vector(p) - pv) + pv) for p in c]
        self.poly(c, [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
                      (4, 5, 9, 8), (5, 6, 10, 9), (6, 7, 11, 10), (7, 4, 8, 11), (8, 9, 10, 11)])

    def beam(self, a, b, w, h, up=(0, 0, 1)):
        """A square-ish timber from point a to b, w wide (side), h tall (along up)."""
        self.loft([a, b], w, h, up)

    def loft(self, pts, w, h, up=(0, 0, 1)):
        """A timber of section w x h swept along the polyline pts (curved braces, rafters, arches)."""
        pts = [Vector(p) for p in pts]; u0 = Vector(up)
        rings = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            s = d.cross(u0)
            if s.length < 1e-6:
                s = d.cross(Vector((1, 0, 0)))
            s.normalize(); u = s.cross(d).normalized()
            rings.append([p + s * sx * w / 2 + u * sz * h / 2 for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        verts = [v for r in rings for v in r]; n = len(rings)
        faces = [(0, 1, 2, 3), (4 * n - 1, 4 * n - 2, 4 * n - 3, 4 * n - 4)]
        for i in range(n - 1):
            a, b = 4 * i, 4 * (i + 1)
            for k in range(4):
                k1 = (k + 1) % 4
                faces.append((a + k, b + k, b + k1, a + k1))
        self.poly(verts, faces)

    def blob(self, centre, radii, sub=1, jit=0.1, rnd=None, flat=None):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        cs = []
        for v in bm.verts:
            k = 1 + (rnd.uniform(-jit, jit) if rnd else 0)
            z = v.co.z if flat is None else max(v.co.z, flat)
            cs.append(Vector((centre[0] + v.co.x * radii[0] * k, centre[1] + v.co.y * radii[1] * k, centre[2] + z * radii[2] * k)))
        bm.verts.ensure_lookup_table()
        self.poly([tuple(c) for c in cs], [tuple(v.index for v in f.verts) for f in bm.faces])
        bm.free()

    def prism_xz(self, pts, y0, y1):
        """Polygon given in (x, z) (convex, ccw seen from -Y), extruded along Y."""
        n = len(pts)
        v = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def prism_yz(self, pts, x0, x1):
        n = len(pts)
        v = [(x0, y, z) for y, z in pts] + [(x1, y, z) for y, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def finish(self):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        for v in self.bm.verts:
            v.co = deform(v.co)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for poly in me.polygons:
            poly.use_smooth = False
        ob = bpy.data.objects.new(self.name, me); ob.data.materials.append(mat(self.material))
        bpy.context.scene.collection.objects.link(ob)
        return ob


def roof_profile(run):
    """Bell roof: (s, x, drop, angle) samples from the ridge (x=0) out to the eave edge (x=run)."""
    N = 40; pts = [(0.0, 0.0, 0.0)]; x = z = 0.0
    a0, a1, e = math.radians(P['PITCH_TOP']), math.radians(P['PITCH_EAVE']), P['PROFILE_EXP']
    angs = [a0 + (a1 - a0) * ((i + 0.5) / N) ** e for i in range(N)]
    for a in angs:
        x += math.cos(a) / N; z += math.sin(a) / N; pts.append((0, x, z))
    L = run / x
    S = [i / N * L for i in range(N + 1)]; X = [p[1] * L for p in pts]; Z = [p[2] * L for p in pts]
    A = [angs[0]] + [(angs[i] + angs[min(i + 1, N - 1)]) / 2 for i in range(N)]
    return S, X, Z, A, L


def interp(xs, ys, x):
    if x <= xs[0]:
        return ys[0]
    for i in range(1, len(xs)):
        if x <= xs[i]:
            f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + f * (ys[i] - ys[i - 1])
    return ys[-1] + (x - xs[-1]) * (ys[-1] - ys[-2]) / (xs[-1] - xs[-2])


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    rnd = random.Random(11)
    p = P; W, D = p['W'], p['D']; hw, hd = W / 2, D / 2
    want = GROUPS[state]
    parts = {}

    def part(name, material, group):
        if name not in parts:
            parts[name] = Part(name, material, group)
        return parts[name]

    FH, EV, BM, PO = p['FOOT_H'], p['EAVE'], p['BEAM'], p['POST']
    S, X, Z, A, L = roof_profile(hw + p['EAVE_OH'])
    Z0 = EV + p['DECK_LIFT']                        # deck underside right above the wall line
    zr = Z0 + interp(X, Z, hw)                      # deck underside at the ridge (mid-length)
    def sag(y):
        return p['SAG'] * min(1.0, (y / hd) ** 2)
    def z_under(x, y=None):                         # deck underside height at |x| (at y, default the gable ends)
        return zr - interp(X, Z, abs(x)) + sag(hd if y is None else y)
    def s_at(x):                                    # slope length from the ridge to horizontal distance |x|
        return interp(X, S, abs(x))
    yF, yB = -hd - p['GABLE_OH'], hd + p['GABLE_OH']
    DX0, DX1 = p['DOOR_XC'] - p['DOOR_W'] / 2, p['DOOR_XC'] + p['DOOR_W'] / 2
    DT, AR = p['DOOR_TOP'], p['ARCH_RISE']
    def arch_z(x):                                  # underside of the arched door head
        u = (x - p['DOOR_XC']) / (p['DOOR_W'] / 2)
        return DT - AR * min(1.0, u * u)
    ZW0 = FH + p['SILL']
    ZW1 = EV - BM
    global ZTOP
    ZTOP = zr + 0.6
    print('ridge deck underside', round(zr, 2), 'slope length', round(L, 2))

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Brown', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        corners = [(-hw - 0.15, -hd - 0.15), (hw + 0.15, -hd - 0.15), (hw + 0.15, hd + 0.15), (-hw - 0.15, hd + 0.15)]
        for x, y in corners:
            st.cbox((x - 0.08, y - 0.08, 0), (x + 0.08, y + 0.08, 0.72), 0.04, Matrix.Rotation(rnd.uniform(-0.08, 0.08), 3, 'Y'))
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            mid = ((xa + xb) / 2, (ya + yb) / 2, 0.54)
            rp.loft([(xa, ya, 0.6), mid, (xb, yb, 0.6)], 0.024, 0.024)            # a soft droop in each line
        for x in (DX0, DX1):
            st.cbox((x - 0.05, -hd - 0.2, 0), (x + 0.05, -hd - 0.1, 0.32), 0.025)
        rp.beam((-hw - 0.15, -hd - 0.15, 0.03), (hw + 0.15, hd + 0.15, 0.03), 0.02, 0.02)

    # ------------------------------------------------------------------ foundation: chunky cobbled footing, boulders, floor
    if 'foundation' in want:
        sp = part('stone_footing', 'Stone_Teal', 'foundation')
        o, i_ = p['FOOT_OUT'], p['FOOT_IN']
        runs = [('x', -hw - o, hw + o, -hd, -1), ('x', -hw - o, hw + o, hd, 1), ('y', -hd + i_ - o, hd - i_ + o, -hw, -1), ('y', -hd + i_ - o, hd - i_ + o, hw, 1)]
        for ax, a0, a1, line, sgn in runs:
            a = a0
            while a < a1 - 0.05:
                w = rnd.uniform(0.42, 0.68); b = min(a + w, a1)
                if ax == 'x' and sgn < 0 and b > DX0 + 0.02 and a < DX1 - 0.02:   # gap under the door
                    a = DX1 - 0.02 if a < DX1 else b
                    if a >= a1 - 0.05:
                        break
                    continue
                h = FH * rnd.uniform(0.86, 1.04); out = rnd.uniform(-0.02, 0.035)
                g = 0.03
                outer, inner = line + sgn * (o + out), line - sgn * (i_ - o)
                if ax == 'x':
                    lo = (a + g / 2, min(outer, inner), 0); hi = (b - g / 2, max(outer, inner), h)
                else:
                    lo = (min(outer, inner), a + g / 2, 0); hi = (max(outer, inner), b - g / 2, h)
                sp.cbox(lo, hi, 0.06, Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'Z'))
                a = b
        # big corner stones and round boulders at the foot (hero)
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hw + o * 0.5), sy * (hd + o * 0.5)
                sp.cbox((x - 0.32, y - 0.32, 0), (x + 0.32, y + 0.32, FH + 0.06), 0.09, Matrix.Rotation(rnd.uniform(-0.1, 0.1), 3, 'Z'))
        for x, y, r in ((DX0 - 0.42, -hd - 0.26, 0.2), (-1.0, -hd - 0.24, 0.16), (DX1 + 0.4, -hd - 0.25, 0.17), (hw + 0.24, -1.2, 0.17),
                        (-hw - 0.26, 0.9, 0.18), (-hw - 0.22, -1.9, 0.13), (1.4, hd + 0.24, 0.16)):
            sp.blob((x, y, 0.02), (r * 1.25, r, r * 0.85), 1, 0.12, rnd, flat=-0.1)
        # flagstone threshold in front of the door
        for k, (xa, xb) in enumerate(((DX0 - 0.15, DX0 + 0.55), (DX0 + 0.6, DX0 + 1.2), (DX0 + 1.25, DX1 + 0.2))):
            sp.cbox((xa, -hd - 0.62 + 0.05 * k, 0), (xb, -hd + 0.05, 0.07), 0.025, Matrix.Rotation(rnd.uniform(-0.06, 0.06), 3, 'Z'))
        fl = part('floor', 'Soil_Floor', 'foundation')
        fl.box((-hw + i_ - 0.05, -hd + i_ - 0.05, 0), (hw - i_ + 0.05, hd - i_ + 0.05, 0.12))
        fl.box((DX0 + 0.05, -hd - 0.05, 0), (DX1 - 0.05, -hd + i_, 0.09))

    # ------------------------------------------------------------------ frame: fat posts, sills, plates, ties, curved braces, bell rafters
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Brown', 'frame')
        po = PO / 2; pz = 0.04
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hw + pz - po), sy * (hd + pz - po)
                fr.cbox((x - po, y - po, FH), (x + po, y + po, EV + 0.06), 0.05)
        for sx in (-1, 1):                                                       # side-wall mid posts
            x = sx * (hw + pz - 0.12)
            fr.box((x - 0.12, -0.12, FH), (x + 0.12, 0.12, EV))
        for x in (DX0 - 0.13, DX1 + 0.13):                                       # tall door posts up into the gable
            fr.box((x - 0.13, -hd - pz - 0.03, 0.0), (x + 0.13, -hd - pz + 0.2, z_under(x) - 0.05))
        fr.box((-0.12, hd + pz - 0.2, FH), (0.12, hd + pz + 0.02, EV))           # back mid post
        s = p['SILL']
        fr.box((-hw + po, -hd - pz, FH), (DX0 - 0.26, -hd - pz + s, FH + s))
        fr.box((DX1 + 0.26, -hd - pz, FH), (hw - po, -hd - pz + s, FH + s))
        fr.box((-hw + po, hd + pz - s, FH), (hw - po, hd + pz, FH + s))
        for sx in (-1, 1):
            x0 = sx * (hw + pz); fr.box((min(x0, x0 - sx * s), -hd + po, FH), (max(x0, x0 - sx * s), hd - po, FH + s))
        fr.cbox((DX0 - 0.05, -hd - 0.14, 0.0), (DX1 + 0.05, -hd + 0.14, 0.12), 0.03)  # door threshold
        for sx in (-1, 1):                                                       # wall plates, proud at both ends
            x0 = sx * (hw + pz + 0.02)
            fr.box((min(x0, x0 - sx * BM), -hd - 0.2, EV - BM), (max(x0, x0 - sx * BM), hd + 0.2, EV))
        # gable tie beams: full on the back, broken by the tall door on the front
        yb0 = hd + pz + 0.05
        fr.box((-hw - 0.3, yb0 - BM, EV - BM), (hw + 0.3, yb0, EV))
        yf0 = -hd - pz - 0.05
        fr.box((-hw - 0.3, yf0, EV - BM), (DX0 - 0.2, yf0 + BM, EV))
        fr.box((DX1 + 0.2, yf0, EV - BM), (hw + 0.3, yf0 + BM, EV))
        # arched door head (a fat curved lintel) and the collar rail under the gable window
        arc = [(x, yf0 + 0.04, arch_z(x) + 0.13) for x in [DX0 - 0.26 + k * (DX1 - DX0 + 0.52) / 8 for k in range(9)]]
        fr.loft(arc, 0.32, 0.26, up=(0, -1, 0))
        zc = p['WIN_G'][1] - 0.12
        fr.box((DX0 - 0.26, yf0, zc - 0.12), (DX1 + 0.26, yf0 + 0.2, zc + 0.08))
        # curved knee braces: long walls at both ends, front gable at the corners
        def curve(a, b, bow, n=4):
            a, b = Vector(a), Vector(b); m = (a + b) / 2
            return [a.lerp(b, k / n) + bow * (4 * (k / n) * (1 - k / n)) for k in range(n + 1)]
        for sx in (-1, 1):
            x = sx * (hw + pz - 0.02)
            for sy in (-1, 1):
                a = (x, sy * (hd - 1.15), EV - BM - 0.02); b = (x, sy * (hd - 0.18), EV - BM - 1.05)
                fr.loft(curve(a, b, Vector((0, -sy * 0.12, -0.12))), 0.13, 0.16, up=(sx, 0, 0))
            for sy in (-1, 1):                                                   # long low brace toward the middle (hero, back half)
                a = (x, sy * 0.25, ZW0 + 0.08); b = (x, sy * (hd - 0.2), EV - BM - 0.05)
                if sy > 0:
                    fr.loft(curve(a, b, Vector((0, -0.14, 0.14))), 0.13, 0.16, up=(sx, 0, 0))
        for sx in (-1, 1):                                                       # back wall braces
            a = (sx * 0.2, hd + pz - 0.02, ZW0 + 0.08); b = (sx * (hw - 0.22), hd + pz - 0.02, EV - BM - 0.05)
            fr.loft(curve(a, b, Vector((-sx * 0.14, 0, 0.14))), 0.13, 0.16, up=(0, 1, 0))
        # eave corbels: chunky stepped brackets under the plates
        for sx in (-1, 1):
            for y in (-hd + 0.05, 0.0, hd - 0.05):
                x = sx * (hw + pz + 0.02)
                fr.cbox((min(x, x + sx * 0.28), y - 0.12, EV - BM - 0.32), (max(x, x + sx * 0.28), y + 0.12, EV - BM), 0.06)
        # gable principal rafters along the bell curve, king posts
        nseg = 7
        def rafter_pts(sx, y, off):
            pts = []
            for k in range(nseg + 1):
                sv = L * k / nseg; xv = interp(S, X, sv); zv = zr - interp(S, Z, sv) + sag(y) - off
                pts.append((sx * xv, y, zv))
            return pts
        for sy in (-1, 1):
            yg = sy * (hd + pz + 0.04)
            for sx in (-1, 1):
                fr.loft(rafter_pts(sx, yg, 0.16), 0.24, 0.28, up=(0, 0, 1))
            if sy > 0:
                fr.box((-0.13, yg - 0.12, EV), (0.13, yg + 0.12, z_under(0) - 0.1))
        # ridge beam and common rafters (tails show under the eaves), one purlin per side
        fr.box((-0.13, yF + 0.05, zr - 0.3 + sag(hd) * 0.5), (0.13, yB - 0.05, zr + sag(hd) * 0.5))
        for k in range(5):
            y = -hd + 0.3 + k * (D - 0.6) / 4
            for sx in (-1, 1):
                fr.loft(rafter_pts(sx, y, 0.1), 0.13, 0.17)
        for sx in (-1, 1):
            xb = hw * 0.5
            fr.loft([(sx * xb, yy, z_under(xb, yy) - 0.1) for yy in (yF + 0.12, 0, yB - 0.12)], 0.16, 0.16)

    # ------------------------------------------------------------------ roof: bell deck, big shakes, bargeboards, kicked ridge beam
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Brown', 'roof')
        def frame_at(sx, v):
            xv = interp(S, X, v); dz = interp(S, Z, v); a = interp(S, A, v)
            return Vector((sx * xv, 0, zr - dz)), Vector((sx * math.cos(a), 0, -math.sin(a))), Vector((sx * math.sin(a), 0, math.cos(a)))
        def P3(sx, u, v, w):
            o, d, n = frame_at(sx, v)
            return tuple(o + Vector((0, u, sag(u))) + n * w)
        dk = 0.12
        for sx in (-1, 1):
            nd = 8
            for k in range(nd):
                v0, v1 = L * k / nd, L * (k + 1) / nd
                # split along y too so the sag reads
                ym = 0.0
                for (ua, ub) in ((yF, ym), (ym, yB)):
                    rf.hexa([P3(sx, ua, v0, 0), P3(sx, ua, v1, 0), P3(sx, ub, v1, 0), P3(sx, ub, v0, 0),
                             P3(sx, ua, v0, dk), P3(sx, ua, v1, dk), P3(sx, ub, v1, dk), P3(sx, ub, v0, dk)])
            nC = int(math.ceil((L - 0.05) / p['COURSE']))
            for ci in range(nC):
                vb = L + 0.06 - ci * p['COURSE']
                vt = max(0.0, vb - p['COURSE'] * 1.45)
                u = yF - 0.06 + rnd.uniform(-0.15, 0.0)
                while u < yB + 0.04:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, yB + 0.07)
                    if u1 - u < 0.14:
                        break
                    g = 0.03; lift = p['TAB_LIFT'] * rnd.uniform(0.75, 1.2); th = p['TAB_TH']
                    vbb = vb + rnd.uniform(-0.05, 0.04); sk = rnd.uniform(-0.04, 0.04)
                    c = [P3(sx, u + g / 2, vt, dk), P3(sx, u + g / 2 + sk, vbb, dk + lift), P3(sx, u1 - g / 2 + sk, vbb, dk + lift), P3(sx, u1 - g / 2, vt, dk),
                         P3(sx, u + g / 2, vt, dk + th), P3(sx, u + g / 2 + sk, vbb, dk + lift + th), P3(sx, u1 - g / 2 + sk, vbb, dk + lift + th), P3(sx, u1 - g / 2, vt, dk + th)]
                    rf.hexa(c)
                    u = u1
            # ridge closing course
            for (ua, ub) in ((yF - 0.04, 0.0), (0.0, yB + 0.04)):
                rf.hexa([P3(sx, ua, -0.02, dk + 0.08), P3(sx, ua, 0.5, dk + 0.08), P3(sx, ub, 0.5, dk + 0.08), P3(sx, ub, -0.02, dk + 0.08),
                         P3(sx, ua, -0.02, dk + 0.2), P3(sx, ua, 0.5, dk + 0.16), P3(sx, ub, 0.5, dk + 0.16), P3(sx, ub, -0.02, dk + 0.2)])
            # bargeboards along the bell rakes
            for yy in (yF + 0.12, yB - 0.12):
                pts = [P3(sx, yy, L * k / 6 + (0.14 if k == 6 else 0), -0.13) for k in range(7)]
                tb.loft(pts, 0.24, 0.28, up=(0, 0, 1))
        # chunky ridge beam: sags with the roof, kicks up at the front, a little crooked
        rw, rh = p['RIDGE_SEC']; ztop = zr + 0.16
        yf = yF - p['RIDGE_OH']; k = p['RIDGE_KICK']
        def rz(y):
            f = max(0.0, (-y - hd * 0.2) / (-yf - hd * 0.2))
            return ztop + sag(y) + k * f ** 1.8
        tw = Matrix.Rotation(math.radians(p['RIDGE_TWIST']), 3, 'Z')
        pts = [tuple(tw @ Vector((0, y, rz(y)))) for y in [yB + 0.15 - i * (yB + 0.15 - yf) / 8 for i in range(9)]]
        tb.loft(pts, rw, rh, up=(0, 0, 1))
        # the big ridge-beam end block at the front gable (hero)
        tb.cbox((-0.24, yF - 0.22, zr - 0.35 + sag(hd)), (0.24, yF + 0.28, rz(yF) + 0.1), 0.06, tw)

    # ------------------------------------------------------------------ walls: planks, stable door, windows, hay rack
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose', 'walls'); pk_b = part('plank_walls_dark', 'Plank_RoseDark', 'walls')
        T = p['PLANK_T']
        def plank_run(ax, a0, a1, line, sgn, ztop_fn, skip=None, zbot=ZW0, zbot_fn=None):
            n = max(1, round((a1 - a0) / p['PLANK_W'])); w = (a1 - a0) / n
            for k in range(n):
                a, b = a0 + k * w, a0 + (k + 1) * w
                inskip = skip and b > skip[0] + 0.01 and a < skip[1] - 0.01
                if inskip and zbot_fn is None:
                    continue
                za0 = zb1 = zbot
                if inskip:
                    za0, zb1 = zbot_fn(a), zbot_fn(b)
                off = (0.016 if k % 2 else 0.0) + rnd.uniform(-0.006, 0.006)
                outer = line + sgn * off; inner = line - sgn * T
                zt0, zt1 = ztop_fn(a), ztop_fn(b)
                if zt0 <= za0 + 0.02 and zt1 <= zb1 + 0.02:
                    continue
                pts = [(a + 0.008, za0), (b - 0.008, zb1), (b - 0.008, zt1), (a + 0.008, zt0)]
                if ax == 'x':
                    (pk_b if k % 2 else pk_a).prism_xz(pts, min(outer, inner), max(outer, inner))
                else:
                    (pk_b if k % 2 else pk_a).prism_yz(pts, min(outer, inner), max(outer, inner))
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.05
        door_skip = (DX0 - 0.26, DX1 + 0.26)
        for sy in (-1, 1):
            line = sy * hd
            plank_run('x', -hw, hw, line, sy, flat, skip=door_skip if sy < 0 else None)
            if sy < 0:
                plank_run('x', -hw + 0.1, hw - 0.1, line, sy, rake, zbot=EV, skip=door_skip, zbot_fn=lambda a: max(EV, arch_z(min(max(a, DX0), DX1)) + 0.2))
            else:
                plank_run('x', -hw + 0.1, hw - 0.1, line, sy, rake, zbot=EV)
        for sx in (-1, 1):
            plank_run('y', -hd, hd, sx * hw, sx, flat)
            plank_run('y', -hd, hd, sx * (hw - 0.03), sx, lambda a: z_under(hw, a) - 0.03, zbot=EV - 0.02)
        # stable door: lower leaf closed (planks, frame, Z brace), upper leaf swung out on its right hinge
        dp = part('door', 'Plank_RoseLight', 'walls')
        y0 = -hd - 0.02; zb, zt = 0.12, p['DOOR_SPLIT']
        n = 6; w = (DX1 - DX0) / n
        for k in range(n):
            dp.box((DX0 + k * w + 0.01, y0, zb), (DX0 + (k + 1) * w - 0.01, y0 + 0.07, zt))
        for zz in (zb + 0.03, zt - 0.2):
            dp.cbox((DX0 + 0.03, y0 - 0.06, zz), (DX1 - 0.03, y0, zz + 0.17), 0.03)
        for x in (DX0 + 0.03, DX1 - 0.2):
            dp.box((x, y0 - 0.06, zb + 0.2), (x + 0.17, y0, zt - 0.2))
        dp.beam((DX0 + 0.22, y0 - 0.04, zb + 0.28), (DX1 - 0.24, y0 - 0.04, zt - 0.26), 0.06, 0.16, up=(0, -1, 0))
        dp.cbox((DX0 - 0.04, y0 - 0.08, zt - 0.02), (DX1 + 0.04, y0 + 0.1, zt + 0.07), 0.03)   # fat top rail
        # upper leaf: half the opening wide, arched top edge, swung out ~LEAF_OPEN deg on the hinge at DX1
        LW = p['DOOR_W'] * 0.52; lz0, lz1 = zt + 0.1, arch_z(DX1 - LW / 2) - 0.06
        R = Matrix.Rotation(math.radians(p['LEAF_OPEN']), 3, 'Z'); pv = Vector((DX1 - 0.02, y0 - 0.09, 0))
        def leaf(x0, x1, z0, z1, y_a, y_b, part_):
            c = [(x0, y_a, z0), (x1, y_a, z0), (x1, y_b, z0), (x0, y_b, z0), (x0, y_a, z1), (x1, y_a, z1), (x1, y_b, z1), (x0, y_b, z1)]
            part_.hexa([tuple(R @ (Vector(q) - pv) + pv) for q in c])
        nl = 3; lw = LW / nl
        for k in range(nl):
            xa_, xb_ = DX1 - LW + k * lw + 0.01, DX1 - LW + (k + 1) * lw - 0.01
            leaf(xa_, xb_, lz0, min(arch_z(xa_), arch_z(xb_)) - 0.04, y0 - 0.09, y0 - 0.02, dp)
        for zz in (lz0 + 0.04, lz1 - 0.2):
            leaf(DX1 - LW + 0.03, DX1 - 0.03, zz, zz + 0.14, y0 - 0.14, y0 - 0.09, dp)
        # the dark interior seen through the open top half
        sh = part('interior_shadow', 'Plank_Shadow', 'walls')
        x0, x1 = DX0 - 0.12, DX1 + 0.12; z0, z1 = zt - 0.15, DT + 0.12; yi = -hd + p['INTERIOR_D']
        sh.box((x0, yi, z0), (x1, yi + 0.04, z1))
        sh.box((x0 - 0.04, -hd + 0.02, z0), (x0, yi, z1)); sh.box((x1, -hd + 0.02, z0), (x1 + 0.04, yi, z1))
        sh.box((x0, -hd + 0.02, z1), (x1, yi, z1 + 0.04))
        sh.box((x0, -hd + 0.07, z0 - 0.04), (x1, yi, z0))
        # oversized strap hinges, ring handle
        ir = part('iron_fittings', 'Metal_Iron', 'walls')
        for zz in (zb + 0.16, zt - 0.4):
            ir.box((DX1 - 0.62, y0 - 0.085, zz), (DX1 + 0.1, y0 - 0.06, zz + 0.08))
        for zz in (lz0 + 0.12, lz1 - 0.28):
            c = [(DX1 - 0.62, y0 - 0.17, zz), (DX1 + 0.05, y0 - 0.17, zz), (DX1 + 0.05, y0 - 0.14, zz), (DX1 - 0.62, y0 - 0.17 + 0.03, zz)]
            ir.hexa([tuple(R @ (Vector(q) - pv) + pv) for q in c] + [tuple(R @ (Vector((q[0], q[1], q[2] + 0.08)) - pv) + pv) for q in c])
        ir.loft([(DX0 + 0.14, y0 - 0.09, 0.9), (DX0 + 0.1, y0 - 0.09, 0.98), (DX0 + 0.14, y0 - 0.09, 1.06)], 0.05, 0.025, up=(0, -1, 0))
        # windows: a deep-set gable window with a cross, and big arched windows on both long sides
        wf = part('window_frames', 'Timber_Brown', 'walls'); gl = part('window_glass', 'Glass_Dark', 'walls')
        gx, gz, gw, gh = p['WIN_G']; yw = -hd - 0.02
        gl.box((gx - gw / 2, yw - 0.01, gz), (gx + gw / 2, yw + 0.02, gz + gh))
        fw = 0.11
        wf.cbox((gx - gw / 2 - fw - 0.06, yw - 0.12, gz - 0.12), (gx + gw / 2 + fw + 0.06, yw + 0.02, gz), 0.03)   # sill
        wf.box((gx - gw / 2 - fw, yw - 0.07, gz + gh), (gx + gw / 2 + fw, yw + 0.02, gz + gh + fw))
        for xx in (gx - gw / 2 - fw, gx + gw / 2):
            wf.box((xx, yw - 0.07, gz), (xx + fw, yw + 0.02, gz + gh))
        wf.box((gx - 0.025, yw - 0.04, gz), (gx + 0.025, yw, gz + gh)); wf.box((gx - gw / 2, yw - 0.04, gz + gh / 2 - 0.025), (gx + gw / 2, yw, gz + gh / 2 + 0.025))
        sy_, sz_, sw_, sh_ = p['WIN_S']
        for sx in (-1, 1):
            xw = sx * (hw + 0.02)
            rr = sw_ / 2; zs = sz_ + sh_ - rr
            arch = [(sy_ + rr * math.cos(math.pi * k / 6), zs + rr * math.sin(math.pi * k / 6)) for k in range(7)]
            outline = [(sy_ + rr, sz_)] + arch + [(sy_ - rr, sz_)]
            gl.prism_yz(outline, min(xw, xw - sx * 0.04), max(xw, xw - sx * 0.04))
            # arched frame: loft around the arch and down the jambs
            ring = [(xw + sx * 0.04, sy_ + rr + fw / 2, sz_)] + [(xw + sx * 0.04, sy_ + (rr + fw / 2) * math.cos(math.pi * k / 6), zs + (rr + fw / 2) * math.sin(math.pi * k / 6)) for k in range(7)] + [(xw + sx * 0.04, sy_ - rr - fw / 2, sz_)]
            wf.loft(ring, fw, 0.1, up=(sx, 0, 0))
            wf.cbox((min(xw, xw + sx * 0.16), sy_ - rr - 0.16, sz_ - 0.11), (max(xw, xw + sx * 0.16), sy_ + rr + 0.16, sz_), 0.03)
            wf.box((min(xw, xw + sx * 0.06), sy_ - 0.025, sz_), (max(xw, xw + sx * 0.06), sy_ + 0.025, zs + rr))
            wf.box((min(xw, xw + sx * 0.06), sy_ - rr, zs - 0.12), (max(xw, xw + sx * 0.06), sy_ + rr, zs - 0.07))
        # toy hay rack left of the door: timber shelf and brackets, iron bars, a heap of hay
        rk = part('hay_rack', 'Timber_Brown', 'walls'); hy = part('hay', 'Hay_Straw', 'walls')
        xc = p['RACK_XC']; za, zt2 = p['RACK_Z']; out = p['RACK_OUT']; hwr = p['RACK_W'] / 2; yr = -hd - 0.05
        rk.cbox((xc - hwr - 0.06, yr - out - 0.04, za - 0.1), (xc + hwr + 0.06, yr, za), 0.03)
        for sx in (-1, 1):
            rk.loft([(xc + sx * (hwr - 0.05), yr, za - 0.42), (xc + sx * (hwr - 0.05), yr - out * 0.55, za - 0.25), (xc + sx * (hwr - 0.05), yr - out + 0.03, za - 0.1)], 0.08, 0.08, up=(1, 0, 0))
        for k in range(7):                                                      # front bars
            x = xc - hwr + 0.04 + k * (2 * hwr - 0.08) / 6
            ir.box((x - 0.022, yr - out - 0.01, za), (x + 0.022, yr - out + 0.035, zt2))
        for sx in (-1, 1):
            ir.box((xc + sx * hwr - 0.022, yr - out, za), (xc + sx * hwr + 0.022, yr, zt2))
        ir.box((xc - hwr - 0.03, yr - out - 0.02, zt2 - 0.04), (xc + hwr + 0.03, yr - out + 0.04, zt2 + 0.02))
        ir.box((xc - hwr - 0.03, yr - out - 0.02, zt2 - 0.04), (xc - hwr + 0.03, yr, zt2 + 0.02))
        ir.box((xc + hwr - 0.03, yr - out - 0.02, zt2 - 0.04), (xc + hwr + 0.03, yr, zt2 + 0.02))
        hy.blob((xc, yr - out * 0.5, za + 0.08), (hwr * 0.95, out * 0.45, 0.3), 2, 0.12, rnd, flat=-0.2)
        for k in range(9):
            x = xc + rnd.uniform(-hwr + 0.1, hwr - 0.1); a = Vector((x, yr - out * 0.45, za + 0.22))
            b = a + Vector((rnd.uniform(-0.15, 0.15), rnd.uniform(-0.25, -0.05), rnd.uniform(0.0, 0.18)))
            hy.beam(a, b, 0.025, 0.025)

    obs = [pt.finish() for pt in parts.values()]
    return obs


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
        if s == 'complete':
            export(os.path.join(HERE, f'{NAME}.glb'))


if __name__ == '__main__':
    main()

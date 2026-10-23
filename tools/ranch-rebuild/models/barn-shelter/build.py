"""barn-shelter (game id shelter): a small timber work barn with its gable end at the front (-Y).

usage: python build.py            builds every construction stage, writes barn-shelter.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes barn-shelter.glb)

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
States: planned (stakes + string lines), foundation (stone footing + floor), frame (+ bare timber frame),
roof (+ roof, walls still open), complete (+ plank walls, doorway recess with bench and tools, door leaf, hayloft).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    W=3.8,            # wall width across the gable (X), outside of the plank skin
    D=4.9,            # wall depth along the ridge (Y)
    FOOT_H=0.34,      # stone footing height
    FOOT_OUT=0.14,    # footing proud of the wall skin
    FOOT_IN=0.34,     # footing depth inwards
    SILL=0.2,         # sill beam section
    EAVE=2.6,         # top of the tie beams / wall plates
    BEAM=0.24,        # tie beam / plate section
    TIE_OUT=0.16,     # tie beam ends stick out past the corner posts (hero)
    POST=0.26,        # corner post section
    PITCH=40.0,       # roof pitch (deg)
    DECK_LIFT=0.12,   # roof deck underside above the plate line at the wall
    EAVE_OH=0.42,     # side eave overhang (horizontal)
    GABLE_OH_F=0.32,  # roof overhang past the front gable
    GABLE_OH_B=0.32,  # and past the back gable
    RIDGE_OH=0.55,    # ridge beam sticks out past the front roof edge
    RIDGE_OH_B=0.12,  # and a little past the back
    RIDGE_SEC=(0.34, 0.32),
    RIDGE_KICK=0.24,  # the ridge beam's front end rises (hero)
    RIDGE_KICK_B=0.12,
    COURSE=0.34,      # shingle course spacing along the slope
    TAB_W=(0.34, 0.52),
    TAB_TH=0.035,
    TAB_LIFT=0.085,   # butt lift of each course
    PLANK_W=0.25,
    PLANK_T=0.06,
    DOOR_XC=0.0,      # doorway centre
    DOOR_W=2.0,       # clear opening between the jambs
    LINTEL_Z=2.05,    # underside of the lintel
    LINTEL_H=0.24,
    REC_D=0.95,       # depth of the open recess behind the doorway
    LEAF_W=0.9,       # the one door leaf, hung on the right jamb
    LEAF_OPEN=10.0,   # degrees between the open leaf and the front wall
    LOFT_W=0.78, LOFT_H=0.70, LOFT_Z=0.38,   # hayloft opening (bottom above the tie beam top)
    COLLAR_Z=1.42,    # collar beam above the tie beam top
)

COL = {  # sRGB, sampled from the hero / sheet
    'Plank_Rose': (232, 136, 120), 'Plank_RoseDark': (214, 118, 104), 'Timber_Grey': (128, 113, 100),
    'Roof_Teal': (58, 122, 124), 'Stone_Teal': (104, 122, 118), 'Metal_Iron': (46, 44, 44),
    'Timber_Bench': (160, 104, 62), 'Plank_Interior': (128, 88, 64), 'Plank_Shadow': (30, 22, 18),
    'Plank_Floor': (156, 118, 84), 'Rope_String': (226, 214, 180),
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

    def obox(self, o, u, v, lo, hi):
        """Box in a local frame: origin o, horizontal axes u, v (unit), z up; lo/hi in (u, v, z)."""
        o, u, v, z = Vector(o), Vector(u), Vector(v), Vector((0, 0, 1))
        c = []
        for zz in (lo[2], hi[2]):
            for uu, vv in ((lo[0], lo[1]), (hi[0], lo[1]), (hi[0], hi[1]), (lo[0], hi[1])):
                c.append(tuple(o + u * uu + v * vv + z * zz))
        self.hexa(c)

    def beam(self, a, b, w, h, up=(0, 0, 1)):
        """A square-ish timber from point a to b, w wide (side), h tall (along up)."""
        a, b = Vector(a), Vector(b); d = (b - a).normalized(); u = Vector(up)
        s = d.cross(u)
        if s.length < 1e-6:
            s = d.cross(Vector((1, 0, 0)))
        s.normalize(); u = s.cross(d).normalized()
        c = []
        for p in (a, b):
            for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                c.append(p + s * sx * w / 2 + u * sz * h / 2)
        self.poly(c, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    def prism(self, pts, a0, a1, axis):
        """Convex polygon given in (h, z) extruded along `axis` ('y': pts are (x, z); 'x': pts are (y, z))."""
        n = len(pts)
        if axis == 'y':
            v = [(h, a0, z) for h, z in pts] + [(h, a1, z) for h, z in pts]
        else:
            v = [(a0, h, z) for h, z in pts] + [(a1, h, z) for h, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def finish(self):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for poly in me.polygons:
            poly.use_smooth = False
        ob = bpy.data.objects.new(self.name, me); ob.data.materials.append(mat(self.material))
        bpy.context.scene.collection.objects.link(ob)
        return ob


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    rnd = random.Random(11)
    p = P; W, D = p['W'], p['D']; hw, hd = W / 2, D / 2
    t = math.tan(math.radians(p['PITCH'])); ca, sa = math.cos(math.radians(p['PITCH'])), math.sin(math.radians(p['PITCH']))
    want = GROUPS[state]
    parts = {}

    def part(name, material, group):
        if name not in parts:
            parts[name] = Part(name, material, group)
        return parts[name]

    FH, EV, BM, PO = p['FOOT_H'], p['EAVE'], p['BEAM'], p['POST']
    Z0 = EV + p['DECK_LIFT']                       # roof deck underside right above the wall line
    zr = Z0 + hw * t                                # deck underside at the ridge
    def z_under(x):
        return Z0 + (hw - abs(x)) * t
    yF, yB = -hd - p['GABLE_OH_F'], hd + p['GABLE_OH_B']
    DX0, DX1 = p['DOOR_XC'] - p['DOOR_W'] / 2, p['DOOR_XC'] + p['DOOR_W'] / 2
    LZ, LH = p['LINTEL_Z'], p['LINTEL_H']
    ZW0 = FH + p['SILL']                            # planks start on the sill
    ZW1 = EV - BM                                   # planks end under the plate / tie beam
    yi = -hd + p['REC_D']                           # back of the doorway recess
    LX0, LX1 = -p['LOFT_W'] / 2, p['LOFT_W'] / 2
    LZ0 = EV + p['LOFT_Z']; LZ1 = LZ0 + p['LOFT_H']
    JW = 0.2                                        # door jamb section
    pz = 0.03                                       # frame sits proud of the planks by pz

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Grey', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        corners = [(-hw - 0.1, -hd - 0.1), (hw + 0.1, -hd - 0.1), (hw + 0.1, hd + 0.1), (-hw - 0.1, hd + 0.1)]
        for x, y in corners:
            st.box((x - 0.05, y - 0.05, 0), (x + 0.05, y + 0.05, 0.62))
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            rp.beam((xa, ya, 0.52), (xb, yb, 0.52), 0.018, 0.018)
        for x in (DX0, DX1):                         # pegs marking the doorway
            st.box((x - 0.03, -hd - 0.13, 0), (x + 0.03, -hd - 0.07, 0.25))
        rp.beam((-hw - 0.1, -hd - 0.1, 0.03), (hw + 0.1, hd + 0.1, 0.03), 0.015, 0.015)   # squaring diagonal

    # ------------------------------------------------------------------ foundation: chunky stone footing and floor
    if 'foundation' in want:
        sp = part('stone_footing', 'Stone_Teal', 'foundation')
        o, i_ = p['FOOT_OUT'], p['FOOT_IN']
        runs = [('x', -hw - o, hw + o, -hd, -1), ('x', -hw - o, hw + o, hd, 1),
                ('y', -hd + i_ - o, hd - i_ + o, -hw, -1), ('y', -hd + i_ - o, hd - i_ + o, hw, 1)]
        for ax, a0, a1, line, sgn in runs:
            a = a0
            while a < a1 - 0.05:
                w = rnd.uniform(0.44, 0.62); b = min(a + w, a1)
                if a1 - b < 0.22:
                    b = a1
                if ax == 'x' and sgn < 0 and b > DX0 - JW + 0.02 and a < DX1 + JW - 0.02:   # no stones under the doorway
                    a = DX1 + JW - 0.02 if a < DX1 + JW else b
                    continue
                h = FH * rnd.uniform(0.88, 1.06); out = rnd.uniform(-0.02, 0.03)
                g = 0.035
                outer, inner = line + sgn * (o + out), line - sgn * (i_ - o)
                if ax == 'x':
                    lo = (a + g / 2, min(outer, inner), 0); hi = (b - g / 2, max(outer, inner), h)
                else:
                    lo = (min(outer, inner), a + g / 2, 0); hi = (max(outer, inner), b - g / 2, h)
                sp.box(lo, hi, Matrix.Rotation(rnd.uniform(-0.05, 0.05), 3, 'Z'))
                a = b
        sp.box((DX0 + 0.1, -hd - 0.62, 0), (DX0 + 0.95, -hd - 0.16, 0.08), Matrix.Rotation(0.04, 3, 'Z'))   # step stones
        sp.box((DX0 + 1.05, -hd - 0.58, 0), (DX1 - 0.15, -hd - 0.16, 0.07), Matrix.Rotation(-0.05, 3, 'Z'))
        fl = part('floor', 'Plank_Floor', 'foundation')
        fl.box((-hw + i_ - 0.05, -hd + i_ - 0.05, 0), (hw - i_ + 0.05, hd - i_ + 0.05, 0.12))
        fl.box((DX0 - 0.02, -hd - 0.16, 0), (DX1 + 0.02, -hd + i_, 0.10))         # doorway floor / threshold

    # ------------------------------------------------------------------ frame
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Grey', 'frame')
        po = PO / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hw + pz - po), sy * (hd + pz - po)
                fr.box((x - po, y - po, FH), (x + po, y + po, EV - 0.02))
        for sx in (-1, 1):                              # side-wall mid posts
            x = sx * (hw + pz - 0.1)
            fr.box((x - 0.1, -0.11, FH), (x + 0.1, 0.11, EV - 0.02))
        fr.box((-0.1, hd + pz - 0.18, FH), (0.1, hd + pz + 0.02, EV - 0.02))   # back mid post
        # door jambs (to the ground) and the heavy lintel
        yj = -hd - pz - 0.05
        for x in (DX0 - JW / 2, DX1 + JW / 2):
            fr.box((x - JW / 2, yj, 0.0), (x + JW / 2, yj + 0.24, LZ))
        fr.box((DX0 - JW - 0.18, yj - 0.04, LZ), (DX1 + JW + 0.18, yj + 0.26, LZ + LH))
        # sills (broken at the doorway)
        s = p['SILL']
        fr.box((-hw + po, -hd - pz, FH), (DX0 - JW, -hd - pz + s, FH + s))
        fr.box((DX1 + JW, -hd - pz, FH), (hw - po, -hd - pz + s, FH + s))
        fr.box((-hw + po, hd + pz - s, FH), (hw - po, hd + pz, FH + s))
        for sx in (-1, 1):
            x0 = sx * (hw + pz); fr.box((min(x0, x0 - sx * s), -hd + po, FH), (max(x0, x0 - sx * s), hd - po, FH + s))
        # wall plates on the long sides, tie beams across the gables (sticking out past the posts)
        for sx in (-1, 1):
            x0 = sx * (hw + pz + 0.02)
            fr.box((min(x0, x0 - sx * BM), -hd - 0.1, EV - BM), (max(x0, x0 - sx * BM), hd + 0.1, EV))
        for sy in (-1, 1):
            y0 = sy * (hd + pz + 0.06)
            fr.box((-hw - p['TIE_OUT'], min(y0, y0 - sy * BM), EV - BM), (hw + p['TIE_OUT'], max(y0, y0 - sy * BM), EV))
        # diagonal corner braces on every wall
        bw, bh = 0.13, 0.15
        for sy in (-1, 1):                              # gable walls: knee braces at the top corners
            y = sy * (hd + pz - 0.01)
            for sx in (-1, 1):
                xa = sx * (hw - 0.12)
                span = 0.85 if sy > 0 else 0.55                 # front braces stop short of the door jambs
                fr.beam((xa, y, EV - 0.95), (sx * (hw - 0.12 - span), y, EV - BM + 0.02), bw, bh, up=(0, sy, 0))
            if sy > 0:                                  # back wall: foot braces too
                for sx in (-1, 1):
                    fr.beam((sx * (hw - 0.12), y, ZW0 + 0.9), (sx * (hw - 0.9), y, ZW0 - 0.02), bw, bh, up=(0, 1, 0))
            else:                                       # front: foot braces beside the corner posts (hero)
                for sx in (-1, 1):
                    fr.beam((sx * (hw - 0.12), y, ZW0 + 0.75), (sx * (hw - 0.67), y, ZW0 - 0.02), bw, bh, up=(0, -1, 0))
        for sx in (-1, 1):                              # long sides: top and foot braces at both corners
            x = sx * (hw + pz - 0.01)
            for sy in (-1, 1):
                fr.beam((x, sy * (hd - 0.14), EV - 1.0), (x, sy * (hd - 0.95), EV - BM + 0.02), bw, bh, up=(sx, 0, 0))
                fr.beam((x, sy * (hd - 0.14), ZW0 + 0.95), (x, sy * (hd - 0.95), ZW0 - 0.02), bw, bh, up=(sx, 0, 0))
        # gables: principal rafters, collar beam above the hayloft
        for sy in (-1, 1):
            yg = sy * (hd + pz + 0.02)
            for sx in (-1, 1):
                fr.beam((sx * (hw + 0.05), yg, z_under(hw + 0.05) - 0.12), (0, yg, zr - 0.08), 0.2, 0.22)
            zc = EV + p['COLLAR_Z']; xc = hw - (zc + 0.1 - Z0) / t
            fr.box((-xc, yg - 0.11, zc), (xc, yg + 0.11, zc + 0.2))
            if sy > 0:
                fr.box((-0.1, yg - 0.1, EV), (0.1, yg + 0.1, zc))          # back king post stub
        # ridge beam inside, common rafters and purlins
        fr.box((-0.1, -hd + 0.1, zr - 0.22), (0.1, hd - 0.1, zr))
        n = 4
        for k in range(n):
            y = -hd + 0.3 + k * (D - 0.6) / (n - 1)
            for sx in (-1, 1):
                xe = sx * (hw + p['EAVE_OH'] - 0.06)
                fr.beam((xe, y, z_under(xe) - 0.08), (0, y, zr - 0.08), 0.1, 0.15)
        for sx in (-1, 1):
            xb = sx * 1.0
            fr.box((xb - 0.08, yF + 0.1, z_under(xb) - 0.17), (xb + 0.08, yB - 0.1, z_under(xb) - 0.02))

    # ------------------------------------------------------------------ roof: deck, shingles, bargeboards, ridge beam
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Grey', 'roof')
        L = (hw + p['EAVE_OH']) / ca               # slope length ridge -> eave edge
        for sx in (-1, 1):
            o = Vector((0, 0, zr)); d = Vector((sx * ca, 0, -sa)); nrm = Vector((sx * sa, 0, ca)); e = Vector((0, 1, 0))
            def P3(u, v, w):
                return tuple(o + e * u + d * v + nrm * w)
            dk = 0.10
            rf.hexa([P3(yF, 0, 0), P3(yF, L, 0), P3(yB, L, 0), P3(yB, 0, 0), P3(yF, 0, dk), P3(yF, L, dk), P3(yB, L, dk), P3(yB, 0, dk)])
            nC = int(math.ceil((L - 0.05) / p['COURSE']))
            for ci in range(nC):
                vb = L + 0.05 - ci * p['COURSE']
                vt = max(0.0, vb - p['COURSE'] * 1.45)
                u = yF - 0.05 + rnd.uniform(-0.12, 0.0)
                while u < yB + 0.03:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, yB + 0.06)
                    if u1 - u < 0.12:
                        break
                    g = 0.02; lift = p['TAB_LIFT'] * rnd.uniform(0.75, 1.2); th = p['TAB_TH']
                    vbb = vb + rnd.uniform(-0.04, 0.035)
                    sk = rnd.uniform(-0.03, 0.03)
                    base = dk
                    rf.hexa([P3(u + g / 2, vt, base), P3(u + g / 2 + sk, vbb, base + lift), P3(u1 - g / 2 + sk, vbb, base + lift), P3(u1 - g / 2, vt, base),
                             P3(u + g / 2, vt, base + th), P3(u + g / 2 + sk, vbb, base + lift + th), P3(u1 - g / 2 + sk, vbb, base + lift + th), P3(u1 - g / 2, vt, base + th)])
                    u = u1
            rf.hexa([P3(yF - 0.03, -0.05, dk + 0.06), P3(yF - 0.03, 0.38, dk + 0.06), P3(yB + 0.03, 0.38, dk + 0.06), P3(yB + 0.03, -0.05, dk + 0.06),
                     P3(yF - 0.03, -0.05, dk + 0.16), P3(yF - 0.03, 0.38, dk + 0.13), P3(yB + 0.03, 0.38, dk + 0.13), P3(yB + 0.03, -0.05, dk + 0.16)])
            for yy in (yF + 0.09, yB - 0.09):           # bargeboards under the rake edges
                tb.beam(P3(yy, L + 0.1, -0.1), P3(yy, -0.05, -0.1), 0.18, 0.24, up=tuple(nrm))
        # ridge beam on top: a heavy log that overhangs the front, its ends kicking up (hero, sheet side view)
        rw, rh = p['RIDGE_SEC']; ztop = zr + 0.12
        yf = yF - p['RIDGE_OH']; yb = yB + p['RIDGE_OH_B']; k = p['RIDGE_KICK']; kb = p['RIDGE_KICK_B']
        prof = [(yf, k), (yF + 0.7, 0.0), (yB - 0.7, 0.0), (yb, kb)]
        for (ya, ka), (yb_, kb_) in zip(prof[:-1], prof[1:]):
            tb.hexa([(-rw / 2, ya, ztop - 0.03 + ka), (rw / 2, ya, ztop - 0.03 + ka), (rw / 2, yb_, ztop - 0.03 + kb_), (-rw / 2, yb_, ztop - 0.03 + kb_),
                     (-rw / 2, ya, ztop + rh + ka), (rw / 2, ya, ztop + rh + ka), (rw / 2, yb_, ztop + rh + kb_), (-rw / 2, yb_, ztop + rh + kb_)])
        # strut under the ridge overhang, from the gable apex out to the beam end (hero)
        tb.beam((0, -hd - 0.05, zr - 0.55), (0, yf + 0.18, ztop + k * 0.4), 0.16, 0.16, up=(0, 0, 1))

    # ------------------------------------------------------------------ walls: planks, doorway recess, bench, tools, leaf, hayloft
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose', 'walls'); pk_b = part('plank_walls_dark', 'Plank_RoseDark', 'walls')
        T = p['PLANK_T']

        def plank_run(ax, a0, a1, line, sgn, ztop_fn, zbot=ZW0, holes=()):
            n = max(1, round((a1 - a0) / p['PLANK_W'])); w = (a1 - a0) / n
            for k in range(n):
                a, b = a0 + k * w, a0 + (k + 1) * w
                off = (0.012 if k % 2 else 0.0) + rnd.uniform(-0.004, 0.004)
                outer = line + sgn * off; inner = line - sgn * T
                zt0, zt1 = ztop_fn(a), ztop_fn(b)
                segs = [(zbot, None)]
                for hx0, hx1, hz0, hz1 in holes:
                    if b > hx0 + 0.01 and a < hx1 - 0.01:
                        segs = [(zbot, hz0), (hz1, None)]
                for z0, z1 in segs:
                    if z1 is not None and z1 - z0 < 0.03:
                        continue
                    pts = [(a + 0.006, z0), (b - 0.006, z0), (b - 0.006, z1 if z1 else zt1), (a + 0.006, z1 if z1 else zt0)]
                    if z1 is None and min(zt0, zt1) - z0 < 0.03:
                        continue
                    (pk_b if k % 2 else pk_a).prism(pts, min(outer, inner), max(outer, inner), 'y' if ax == 'x' else 'x')
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.04
        door_hole = (DX0 - JW, DX1 + JW, -1.0, LZ + LH)
        loft_hole = (LX0, LX1, LZ0, LZ1)
        for sy in (-1, 1):
            line = sy * hd
            plank_run('x', -hw, hw, line, sy, flat, holes=[door_hole] if sy < 0 else [])
            plank_run('x', -hw + 0.1, hw - 0.1, line, sy, rake, zbot=EV - 0.02, holes=[loft_hole] if sy < 0 else [])
        for sx in (-1, 1):
            plank_run('y', -hd, hd, sx * hw, sx, flat)
            plank_run('y', -hd, hd, sx * (hw - 0.03), sx, lambda a: z_under(hw) - 0.02, zbot=EV - 0.04)

        # doorway recess: a real open bay 0.95 m deep, lit only from the front
        ip = part('interior', 'Plank_Interior', 'walls')
        x0, x1 = DX0 - 0.02, DX1 + 0.02
        n = 8; w = (x1 - x0) / n
        for k in range(n):                                              # back wall planks (two depths)
            dd = 0.02 if k % 2 else 0.0
            ip.box((x0 + k * w + 0.008, yi + dd, 0.08), (x0 + (k + 1) * w - 0.008, yi + 0.05 + dd, LZ + 0.02))
        ip.box((x0 - 0.05, -hd + 0.03, 0.08), (x0, yi + 0.05, LZ + 0.02))     # side walls
        ip.box((x1, -hd + 0.03, 0.08), (x1 + 0.05, yi + 0.05, LZ + 0.02))
        sh = part('interior_shadow', 'Plank_Shadow', 'walls')
        sh.box((x0 - 0.05, -hd + 0.03, LZ), (x1 + 0.05, yi + 0.05, LZ + 0.05))   # ceiling (dark)
        # tool rack on the back wall: a rail and hanging tools
        bn = part('bench', 'Timber_Bench', 'walls'); ir = part('iron', 'Metal_Iron', 'walls')
        yr = yi - 0.05
        bn.box((x0 + 0.15, yr - 0.03, 1.62), (x1 - 0.25, yr + 0.05, 1.72))
        bn.box((x0 + 0.15, yr - 0.03, 1.98), (x1 - 0.25, yr + 0.05, 2.06))
        tx = x0 + 0.3
        kinds = ['saw', 'hammer', 'axe', 'stick', 'hammer', 'saw', 'stick', 'axe', 'stick']
        for kind in kinds:
            if tx > x1 - 0.35:
                break
            if kind == 'saw':
                ir.box((tx - 0.12, yr - 0.07, 1.10), (tx + 0.10, yr - 0.05, 1.62))
                bn.box((tx - 0.06, yr - 0.09, 1.56), (tx + 0.06, yr - 0.04, 1.72))
                tx += 0.3
            else:
                ln = {'hammer': 0.45, 'axe': 0.6, 'stick': 0.75}[kind]
                bn.box((tx - 0.035, yr - 0.08, 1.68 - ln), (tx + 0.035, yr - 0.03, 1.74))
                if kind == 'hammer':
                    ir.box((tx - 0.09, yr - 0.09, 1.68 - ln - 0.06), (tx + 0.09, yr - 0.03, 1.68 - ln + 0.02))
                elif kind == 'axe':
                    ir.box((tx - 0.02, yr - 0.09, 1.68 - ln), (tx + 0.16, yr - 0.03, 1.68 - ln + 0.16))
                elif kind == 'stick':
                    ir.box((tx - 0.07, yr - 0.08, 1.68 - ln - 0.12), (tx + 0.07, yr - 0.04, 1.68 - ln))
                tx += 0.2
        # workbench in front of the rack, with a vise and a block on top
        bx0, bx1 = x0 + 0.12, x0 + 1.45; by0, by1 = yi - 0.6, yi - 0.03; zt = 0.86
        bn.box((bx0, by0, zt), (bx1, by1, zt + 0.08))
        for lx in (bx0 + 0.04, bx1 - 0.12):
            for ly in (by0 + 0.04, by1 - 0.12):
                bn.box((lx, ly, 0.1), (lx + 0.08, ly + 0.08, zt))
        bn.box((bx0 + 0.08, by0 + 0.08, 0.28), (bx1 - 0.08, by1 - 0.08, 0.33))   # lower shelf
        bn.box((bx0 + 0.15, by0 + 0.1, zt + 0.08), (bx0 + 0.5, by0 + 0.35, zt + 0.22))   # wood block
        ir.box((bx1 - 0.32, by0 - 0.06, zt - 0.06), (bx1 - 0.1, by0 + 0.12, zt + 0.16))   # vise body
        ir.box((bx1 - 0.25, by0 - 0.16, zt + 0.02), (bx1 - 0.17, by0 - 0.06, zt + 0.1))    # vise screw
        bn.box((bx1 - 0.3, by0 - 0.1, zt + 0.0), (bx1 - 0.12, by0 - 0.06, zt + 0.17))       # wooden jaw
        bn.box((x1 - 0.35, yi - 0.35, 0.1), (x1 - 0.1, yi - 0.1, 0.45))                     # stump / bucket by the bench
        # the plank door leaf, hung on the right jamb and swung open outward against the front wall
        lf = part('door_leaf', 'Plank_Rose', 'walls')
        a = math.radians(p['LEAF_OPEN'])
        hinge = Vector((DX1 + 0.02, -hd - pz - 0.08, 0.0))
        u = Vector((math.cos(a), -math.sin(a), 0)); v = Vector((math.sin(a), math.cos(a), 0))   # u along the leaf, v into the wall
        LW = p['LEAF_W']; zb, ztl = 0.14, LZ - 0.04; n = 4; pw = LW / n
        for k in range(n):
            lf.obox(hinge, u, v, (k * pw + 0.01, -0.06, zb), ((k + 1) * pw - 0.01, 0.0, ztl))
        lt = part('door_ledges', 'Timber_Grey', 'walls')
        for zz in (zb + 0.18, ztl - 0.32):
            lt.obox(hinge, u, v, (0.05, -0.11, zz), (LW - 0.05, -0.06, zz + 0.14))
        d0 = hinge + u * 0.12 + Vector((0, 0, zb + 0.32)) - v * 0.085
        d1 = hinge + u * (LW - 0.12) + Vector((0, 0, ztl - 0.34)) - v * 0.085
        lt.beam(tuple(d0), tuple(d1), 0.05, 0.13, up=tuple(-v))
        for zz in (zb + 0.22, ztl - 0.28):                               # iron strap hinges
            ir.obox(hinge, u, v, (-0.04, -0.125, zz), (0.62, -0.105, zz + 0.07))
        ir.obox(hinge, u, v, (LW - 0.16, -0.13, 1.05), (LW - 0.08, -0.06, 1.12))    # latch
        # hayloft: dark square opening with a trim frame and a little ledge
        yl = -hd - 0.01
        sh.box((LX0, -hd + 0.3, LZ0), (LX1, -hd + 0.34, LZ1))
        sh.box((LX0 - 0.03, yl + 0.02, LZ0), (LX0, -hd + 0.34, LZ1)); sh.box((LX1, yl + 0.02, LZ0), (LX1 + 0.03, -hd + 0.34, LZ1))
        sh.box((LX0, yl + 0.02, LZ1), (LX1, -hd + 0.34, LZ1 + 0.03)); sh.box((LX0, yl + 0.02, LZ0 - 0.03), (LX1, -hd + 0.34, LZ0))
        tr = part('loft_trim', 'Timber_Grey', 'walls')
        tr.box((LX0 - 0.12, yl - 0.07, LZ0 - 0.04), (LX0, yl + 0.02, LZ1 + 0.1))
        tr.box((LX1, yl - 0.07, LZ0 - 0.04), (LX1 + 0.12, yl + 0.02, LZ1 + 0.1))
        tr.box((LX0 - 0.16, yl - 0.08, LZ1), (LX1 + 0.16, yl + 0.02, LZ1 + 0.11))
        tr.box((LX0 - 0.24, yl - 0.42, LZ0 - 0.1), (LX1 + 0.24, yl + 0.02, LZ0))            # ledge board
        for sx in (-1, 1):
            tr.beam((sx * (LX1 - 0.04), yl - 0.01, LZ0 - 0.42), (sx * (LX1 - 0.04), yl - 0.3, LZ0 - 0.06), 0.06, 0.07, up=(0, -1, 0))

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
            export(os.path.join(HERE, 'barn-shelter.glb'))


if __name__ == '__main__':
    main()

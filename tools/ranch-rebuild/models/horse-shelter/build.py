"""horse-shelter (game id cattle-shelter): a wide, low timber-framed stable with its gable end at the front (-Y).

usage: python build.py            builds every construction stage, writes horse-shelter.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes horse-shelter.glb)

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
States: planned (stakes + string lines), foundation (stone footing + earth floor), frame (+ bare timber frame),
roof (+ roof, walls still open), complete (+ plank walls, Dutch door, hay rack).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    W=4.6,            # wall width across the gable (X), outside of the plank skin
    D=5.5,            # wall depth along the ridge (Y); hero ~1:1.1
    FOOT_H=0.36,      # stone footing height
    FOOT_OUT=0.07,    # footing proud of the wall skin
    FOOT_IN=0.34,     # footing depth inwards
    SILL=0.2,         # sill beam section
    EAVE=2.6,         # top of the tie beams / wall plates
    BEAM=0.22,        # tie beam / plate section
    POST=0.24,        # corner post section
    PITCH=44.0,       # roof pitch (deg), from the sheet
    DECK_LIFT=0.55,   # roof deck underside above the plate line at the wall
    EAVE_OH=0.70,     # side eave overhang (horizontal)
    GABLE_OH=0.50,    # roof overhang past the gable walls (front and back)
    RIDGE_OH=0.30,    # ridge board sticks out past the front roof edge
    RIDGE_SEC=(0.30, 0.18),
    RIDGE_KICK=0.20,  # the ridge board's front end rises a little (hero)
    COURSE=0.40,      # shingle course spacing along the slope
    TAB_W=(0.38, 0.55),
    TAB_TH=0.035,
    TAB_LIFT=0.09,    # butt lift of each course
    PLANK_W=0.25,
    PLANK_T=0.06,
    DOOR_XC=0.16,     # Dutch door centre (slightly right of centre seen from the front)
    DOOR_W=1.40,
    DOOR_SPLIT=1.42,  # top of the closed lower leaf
    INTERIOR_D=0.9,   # depth of the dark recess behind the open upper door
    RACK_XC=1.62,     # hay rack centre on the front wall
    RACK_Z=(1.45, 2.3), 
    RACK_OUT=0.50,
)

COL = {  # sRGB, sampled from the hero
    'Plank_Rose': (236, 142, 122), 'Plank_RoseLight': (246, 166, 146), 'Plank_RoseDark': (220, 124, 106), 'Timber_Brown': (136, 92, 70),
    'Timber_Dark': (104, 70, 54), 'Roof_Teal': (44, 112, 106), 'Stone_Teal': (66, 92, 84),
    'Hay_Straw': (196, 146, 72), 'Metal_Iron': (42, 37, 34), 'Plank_Shadow': (22, 16, 14),
    'Soil_Floor': (132, 104, 74), 'Rope_String': (226, 214, 180),
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
        # corners: a ring then b ring -> faces
        self.poly(c, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

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
    rnd = random.Random(7)
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
    def z_under(x):                                 # deck underside height at |x|
        return Z0 + (hw - abs(x)) * t
    yF, yB = -hd - p['GABLE_OH'], hd + p['GABLE_OH']
    DX0, DX1 = p['DOOR_XC'] - p['DOOR_W'] / 2, p['DOOR_XC'] + p['DOOR_W'] / 2
    ZW0 = FH + p['SILL']                            # planks start on the sill
    ZW1 = EV - BM                                   # planks end under the plate / tie beam

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Brown', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        corners = [(-hw - 0.1, -hd - 0.1), (hw + 0.1, -hd - 0.1), (hw + 0.1, hd + 0.1), (-hw - 0.1, hd + 0.1)]
        for x, y in corners:
            st.box((x - 0.05, y - 0.05, 0), (x + 0.05, y + 0.05, 0.62))
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            rp.beam((xa, ya, 0.52), (xb, yb, 0.52), 0.018, 0.018)
        # a few marker pegs where the door and the posts go
        for x in (DX0, DX1):
            st.box((x - 0.03, -hd - 0.13, 0), (x + 0.03, -hd - 0.07, 0.25))
        rp.beam((-hw - 0.1, -hd - 0.1, 0.03), (hw + 0.1, hd + 0.1, 0.03), 0.015, 0.015)   # squaring diagonal

    # ------------------------------------------------------------------ foundation: stone footing and floor
    if 'foundation' in want:
        sp = part('stone_footing', 'Stone_Teal', 'foundation')
        o, i_ = p['FOOT_OUT'], p['FOOT_IN']
        # each wall run: (start, end) along its axis, the wall line, and outward direction
        runs = [('x', -hw - o, hw + o, -hd, -1), ('x', -hw - o, hw + o, hd, 1), ('y', -hd + i_ - o, hd - i_ + o, -hw, -1), ('y', -hd + i_ - o, hd - i_ + o, hw, 1)]
        for ax, a0, a1, line, sgn in runs:
            a = a0
            while a < a1 - 0.05:
                w = rnd.uniform(0.32, 0.46); b = min(a + w, a1)
                if ax == 'x' and sgn < 0 and b > DX0 + 0.02 and a < DX1 - 0.02:   # gap under the door
                    a = DX1 - 0.02 if a < DX1 else b
                    if a >= a1 - 0.05:
                        break
                    continue
                h = FH * rnd.uniform(0.9, 1.0); out = rnd.uniform(-0.015, 0.02)
                g = 0.022
                outer, inner = line + sgn * (o + out), line - sgn * (i_ - o)
                if ax == 'x':
                    lo = (a + g / 2, min(outer, inner), 0); hi = (b - g / 2, max(outer, inner), h)
                else:
                    lo = (min(outer, inner), a + g / 2, 0); hi = (max(outer, inner), b - g / 2, h)
                sp.box(lo, hi, Matrix.Rotation(rnd.uniform(-0.04, 0.04), 3, 'Z'))
                a = b
        fl = part('floor', 'Soil_Floor', 'foundation')
        fl.box((-hw + i_ - 0.05, -hd + i_ - 0.05, 0), (hw - i_ + 0.05, hd - i_ + 0.05, 0.1))
        fl.box((DX0 + 0.05, -hd - 0.12, 0), (DX1 - 0.05, -hd + i_, 0.07))           # trodden threshold

    # ------------------------------------------------------------------ frame: posts, sills, plates, tie beams, truss
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Brown', 'frame')
        po = PO / 2; pz = 0.03                     # posts sit proud of the planks by pz
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hw + pz - po), sy * (hd + pz - po)
                fr.box((x - po, y - po, FH), (x + po, y + po, EV + 0.04))
        # side-wall mid posts and the front door posts, back mid post
        for sx in (-1, 1):
            x = sx * (hw + pz - 0.1)
            fr.box((x - 0.1, -0.1, FH), (x + 0.1, 0.1, EV))
        for x in (DX0 - 0.1, DX1 + 0.1):
            fr.box((x - 0.1, -hd - pz - 0.02, 0.0), (x + 0.1, -hd - pz + 0.17, EV))
        fr.box((-0.1, hd + pz - 0.18, FH), (0.1, hd + pz + 0.02, EV))
        # sill beams (broken at the door)
        s = p['SILL']
        fr.box((-hw + po, -hd - pz, FH), (DX0 - 0.2, -hd - pz + s, FH + s))
        fr.box((DX1 + 0.2, -hd - pz, FH), (hw - po, -hd - pz + s, FH + s))
        fr.box((-hw + po, hd + pz - s, FH), (hw - po, hd + pz, FH + s))
        for sx in (-1, 1):
            x0 = sx * (hw + pz); fr.box((min(x0, x0 - sx * s), -hd + po, FH), (max(x0, x0 - sx * s), hd - po, FH + s))
        fr.box((DX0 - 0.02, -hd - 0.1, 0.0), (DX1 + 0.02, -hd + 0.12, 0.09))      # door threshold
        # wall plates on the long sides, tie beams on the gables (sticking out past the posts)
        for sx in (-1, 1):
            x0 = sx * (hw + pz + 0.02)
            fr.box((min(x0, x0 - sx * BM), -hd - 0.12, EV - BM), (max(x0, x0 - sx * BM), hd + 0.12, EV))
        for sy in (-1, 1):
            y0 = sy * (hd + pz + 0.05)
            fr.box((-hw - 0.22, min(y0, y0 - sy * BM), EV - BM), (hw + 0.22, max(y0, y0 - sy * BM), EV))
        # side-wall V braces (hero): from the top corners down to the foot of the mid post
        for sx in (-1, 1):
            x = sx * (hw + pz - 0.02)
            for sy in (-1, 1):
                fr.beam((x, sy * (hd - 0.2), EV - BM - 0.02), (x, sy * 0.16, ZW0 + 0.05), 0.11, 0.15, up=(sx, 0, 0))
        # back wall: matching braces
        for sx in (-1, 1):
            fr.beam((sx * (hw - 0.2), hd + pz - 0.02, EV - BM - 0.02), (sx * 0.16, hd + pz - 0.02, ZW0 + 0.05), 0.11, 0.15, up=(0, 1, 0))
        # gable trusses (front and back): principal rafters, king post, raking braces, purlin stubs
        for sy in (-1, 1):
            yg = sy * (hd + pz + 0.03)
            for sx in (-1, 1):
                a = (sx * (hw + 0.3), yg, z_under(hw + 0.3) - 0.14)
                b = (0, yg, zr - 0.08)
                fr.beam(a, b, 0.2, 0.24, up=(0, 0, 1))
            fr.box((-0.11, yg - 0.1, EV), (0.11, yg + 0.1, zr - 0.05))                  # king post
            for sx in (-1, 1):
                xb = sx * 1.12
                fr.beam((sx * 0.1, yg, EV + 0.12), (xb, yg, z_under(xb) - 0.12), 0.15, 0.13, up=(0, 0, 1))
                # purlin stubs poke out through the gable at the brace tops
                zs = z_under(xb) - 0.03
                fr.box((xb - 0.09, yg + sy * 0.0 - (0.32 if sy < 0 else 0), zs - 0.16),
                       (xb + 0.09, yg + (0.32 if sy > 0 else 0), zs + 0.02))
        # ridge beam and common rafters (under the deck; their tails show under the eaves)
        fr.box((-0.1, yF + 0.05, zr - 0.22), (0.1, yB - 0.05, zr))
        n = 5
        for k in range(n):
            y = -hd + 0.25 + k * (D - 0.5) / (n - 1)
            for sx in (-1, 1):
                xe = sx * (hw + p['EAVE_OH'] - 0.06)
                fr.beam((xe, y, z_under(xe) - 0.08), (0, y, zr - 0.08), 0.1, 0.15)
        # purlins along the slopes (frame stage reads as a real roof frame)
        for sx in (-1, 1):
            xb = sx * 1.12
            fr.box((xb - 0.08, yF + 0.1, z_under(xb) - 0.17), (xb + 0.08, yB - 0.1, z_under(xb) - 0.02))

    # ------------------------------------------------------------------ roof: deck, shingles, bargeboards, ridge board
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Brown', 'roof')
        L = (hw + p['EAVE_OH']) / ca               # slope length ridge -> eave edge
        for sx in (-1, 1):
            o = Vector((0, 0, zr)); d = Vector((sx * ca, 0, -sa)); nrm = Vector((sx * sa, 0, ca)); e = Vector((0, 1, 0))
            def P3(u, v, w):
                return tuple(o + e * u + d * v + nrm * w)
            # deck
            dk = 0.10
            c = [P3(yF, 0, 0), P3(yF, L, 0), P3(yB, L, 0), P3(yB, 0, 0), P3(yF, 0, dk), P3(yF, L, dk), P3(yB, L, dk), P3(yB, 0, dk)]
            rf.hexa(c)
            # shingle courses from the eave up
            nC = int(math.ceil((L - 0.05) / p['COURSE']))
            for ci in range(nC):
                vb = L + 0.04 - ci * p['COURSE']          # butt (lower edge) of this course
                vt = max(0.0, vb - p['COURSE'] * 1.45)
                u = yF - 0.04 + rnd.uniform(-0.12, 0.0)
                while u < yB + 0.03:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, yB + 0.05)
                    if u1 - u < 0.12:
                        break
                    g = 0.018; lift = p['TAB_LIFT'] * rnd.uniform(0.75, 1.2); th = p['TAB_TH']
                    vbb = vb + rnd.uniform(-0.035, 0.03)
                    sk = rnd.uniform(-0.03, 0.03)
                    base = dk
                    c = [P3(u + g / 2, vt, base), P3(u + g / 2 + sk, vbb, base + lift), P3(u1 - g / 2 + sk, vbb, base + lift), P3(u1 - g / 2, vt, base),
                         P3(u + g / 2, vt, base + th), P3(u + g / 2 + sk, vbb, base + lift + th), P3(u1 - g / 2 + sk, vbb, base + lift + th), P3(u1 - g / 2, vt, base + th)]
                    rf.hexa(c)
                    u = u1
            # ridge closing course: a half-length course right at the top
            c = [P3(yF - 0.03, -0.05, dk + 0.06), P3(yF - 0.03, 0.42, dk + 0.06), P3(yB + 0.03, 0.42, dk + 0.06), P3(yB + 0.03, -0.05, dk + 0.06),
                 P3(yF - 0.03, -0.05, dk + 0.16), P3(yF - 0.03, 0.42, dk + 0.13), P3(yB + 0.03, 0.42, dk + 0.13), P3(yB + 0.03, -0.05, dk + 0.16)]
            rf.hexa(c)
            # bargeboards along the front and back rakes, under the roof edge
            for yy in (yF + 0.1, yB - 0.1):
                a = P3(yy, L + 0.12, -0.12); b = P3(yy, -0.05, -0.12)
                tb.beam(a, b, 0.2, 0.24, up=tuple(nrm))
        # ridge board on top, overhanging and kicking up at the front
        rw, rh = p['RIDGE_SEC']; ztop = zr + 0.10
        yf = yF - p['RIDGE_OH']; k = p['RIDGE_KICK']
        c = [(-rw / 2, yf, ztop - 0.04 + k), (rw / 2, yf, ztop - 0.04 + k), (rw / 2, yB + 0.08, ztop - 0.04), (-rw / 2, yB + 0.08, ztop - 0.04),
             (-rw / 2, yf, ztop + rh + k), (rw / 2, yf, ztop + rh + k), (rw / 2, yB + 0.08, ztop + rh), (-rw / 2, yB + 0.08, ztop + rh)]
        tb.hexa(c)
        # a block under the ridge board's front overhang (the ridge beam end, as in the hero)
        tb.box((-0.11, yF - 0.18, zr - 0.2), (0.11, yF + 0.15, ztop + 0.02))

    # ------------------------------------------------------------------ walls: planks, door, recess, hay rack
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose', 'walls'); pk_b = part('plank_walls_dark', 'Plank_RoseDark', 'walls')
        T = p['PLANK_T']
        def plank_run(ax, a0, a1, line, sgn, ztop_fn, skip=None, zbot=ZW0):
            n = max(1, round((a1 - a0) / p['PLANK_W'])); w = (a1 - a0) / n
            for k in range(n):
                a, b = a0 + k * w, a0 + (k + 1) * w
                if skip and b > skip[0] + 0.01 and a < skip[1] - 0.01:
                    continue
                off = (0.012 if k % 2 else 0.0) + rnd.uniform(-0.004, 0.004)
                outer = line + sgn * off; inner = line - sgn * T
                zt0, zt1 = ztop_fn(a), ztop_fn(b)
                if ax == 'x':
                    (pk_b if k % 2 else pk_a).prism_xz([(a + 0.006, zbot), (b - 0.006, zbot), (b - 0.006, zt1), (a + 0.006, zt0)], min(outer, inner), max(outer, inner))
                else:
                    (pk_b if k % 2 else pk_a).prism_yz([(a + 0.006, zbot), (b - 0.006, zbot), (b - 0.006, zt1), (a + 0.006, zt0)], min(outer, inner), max(outer, inner))
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.04
        for sy in (-1, 1):
            line = sy * hd
            plank_run('x', -hw, hw, line, sy, flat, skip=(DX0 - 0.1, DX1 + 0.1) if sy < 0 else None)
            plank_run('x', -hw + 0.1, hw - 0.1, line, sy, rake, zbot=EV)                  # gable triangle
        for sx in (-1, 1):
            plank_run('y', -hd, hd, sx * hw, sx, flat)
            plank_run('y', -hd, hd, sx * (hw - 0.03), sx, lambda a: z_under(hw) - 0.02, zbot=EV - 0.02)   # frieze up to the roof
        # planks above the door opening between the door posts (short, under the tie beam): none, the beam sits there
        # lower half of the Dutch door: planks, ledges and a Z brace
        dp = part('door', 'Plank_RoseLight', 'walls')
        y0 = -hd - 0.01; zb, zt = 0.1, p['DOOR_SPLIT']
        n = 5; w = (DX1 - DX0) / n
        for k in range(n):
            dp.box((DX0 + k * w + 0.008, y0, zb), (DX0 + (k + 1) * w - 0.008, y0 + 0.06, zt))
        for zz in (zb + 0.04, zt - 0.16):
            dp.box((DX0 + 0.03, y0 - 0.045, zz), (DX1 - 0.03, y0, zz + 0.12))
        for x in (DX0 + 0.03, DX1 - 0.15):
            dp.box((x, y0 - 0.045, zb + 0.16), (x + 0.12, y0, zt - 0.16))
        dp.beam((DX0 + 0.16, y0 - 0.03, zb + 0.22), (DX1 - 0.18, y0 - 0.03, zt - 0.2), 0.045, 0.12, up=(0, -1, 0))
        # the dark interior seen through the open upper door: an open box behind the opening
        sh = part('interior_shadow', 'Plank_Shadow', 'walls')
        x0, x1 = DX0 - 0.1, DX1 + 0.1; z0, z1 = zt - 0.15, ZW1 + 0.05; yi = -hd + p['INTERIOR_D']
        sh.box((x0, yi, z0), (x1, yi + 0.04, z1))                       # back
        sh.box((x0 - 0.04, -hd + 0.02, z0), (x0, yi, z1)); sh.box((x1, -hd + 0.02, z0), (x1 + 0.04, yi, z1))
        sh.box((x0, -hd + 0.02, z1), (x1, yi, z1 + 0.04))
        sh.box((x0, -hd + 0.06, z0 - 0.04), (x1, yi, z0))                 # floor of the recess behind the lower leaf
        # door top rail on the lower leaf (the hero's lighter cap) and iron fittings
        dp.box((DX0 - 0.02, y0 - 0.06, zt - 0.02), (DX1 + 0.02, y0 + 0.08, zt + 0.05))
        ir = part('iron_fittings', 'Metal_Iron', 'walls')
        for zz in (zb + 0.12, zt - 0.32):
            ir.box((DX1 - 0.5, y0 - 0.065, zz), (DX1 + 0.08, y0 - 0.045, zz + 0.06))     # strap hinges
        ir.beam((DX0 + 0.1, y0 - 0.07, 0.86), (DX0 + 0.1, y0 - 0.07, 1.02), 0.05, 0.02, up=(0, -1, 0))  # handle
        # wall-mounted hay rack right of the door
        rk = part('hay_rack', 'Timber_Brown', 'walls'); hy = part('hay', 'Hay_Straw', 'walls')
        xc = p['RACK_XC']; za, zt2 = p['RACK_Z']; out = p['RACK_OUT']; hwr = 0.47; yw = -hd - 0.04
        rk.box((xc - hwr, yw - out, za - 0.06), (xc + hwr, yw, za))                       # shelf
        rk.box((xc - hwr, yw - out - 0.03, za), (xc + hwr, yw - out + 0.02, za + 0.1))     # front lip
        for sx in (-1, 1):
            rk.beam((xc + sx * hwr, yw - out + 0.02, za - 0.02), (xc + sx * hwr, yw, zt2 + 0.08), 0.07, 0.07, up=(0, -1, 0))
            rk.beam((xc + sx * hwr, yw - 0.02, za - 0.08), (xc + sx * hwr, yw - out, za - 0.22), 0.05, 0.05)    # bracket
        for k in range(3):
            f = 0.3 + k * 0.28
            yy = yw - out + 0.02 + (out - 0.02) * f; zz = za + (zt2 + 0.08 - za) * f
            rk.box((xc - hwr - 0.05, yy - 0.025, zz - 0.025), (xc + hwr + 0.05, yy + 0.025, zz + 0.025))
        # hay: a lumpy mound in the rack and a few sticking-out straws
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            v.co *= rnd.uniform(0.85, 1.15)
            v.co = Vector((v.co.x * 0.46, v.co.y * 0.27, max(v.co.z, -0.3) * 0.32))
            v.co += Vector((xc, yw - out * 0.5, za + 0.2))
        for v in bm.verts:
            hy.bm.verts.new(v.co)
        hy.bm.verts.ensure_lookup_table(); base = len(hy.bm.verts) - len(bm.verts)
        bm.verts.ensure_lookup_table()
        for f in bm.faces:
            hy.bm.faces.new([hy.bm.verts[base + v.index] for v in f.verts])
        bm.free()
        for k in range(9):
            x = xc + rnd.uniform(-0.38, 0.38); a = Vector((x, yw - out * 0.45, za + 0.2))
            b = a + Vector((rnd.uniform(-0.2, 0.2), rnd.uniform(-0.3, -0.1), rnd.uniform(-0.15, 0.12)))
            hy.beam(a, b, 0.02, 0.02)

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
            export(os.path.join(HERE, 'horse-shelter.glb'))


if __name__ == '__main__':
    main()

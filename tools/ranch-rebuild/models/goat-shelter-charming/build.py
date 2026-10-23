"""goat-shelter-charming: the storybook-toy version of goat-shelter. A tall, narrow rose-pink plank shed on chunky log
stilts, a steep teal shingle roof with a sagging, crooked ridge and a round log ridge pole poking out over the front
gable, an oversized arched doorway in the front gable (-Y) with a pink plank ramp down to the ground, a round
cross-barred gable window, two big crooked windows on the +X side, and a railed plank platform along the +X side
with a little ladder and a hay rack.

usage: python build.py            builds every construction stage, writes goat-shelter-charming.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes goat-shelter-charming.glb)

Same conventions as models/goat-shelter: Z up, metres, origin at the footprint centre on the ground, front faces -Y,
the same five states, the same material names (no Plank_Teal: the hero's ramp and deck are pink) and the same part
names. All shape numbers live in P. The charming shape comes from one deform pass on the house parts (DEFORM): the
walls bulge and flare at the foot, the roof ridge sags in the middle and rises at the front, and the top leans a
little towards -X.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'goat-shelter-charming'

P = dict(
    W=2.2,            # wall width across the gable (X)
    D=2.6,            # wall depth along the ridge (Y): the hero's house is narrow and deep
    POST=0.28,        # corner log diameter (stilt + post)
    POST_PROUD=0.06,  # logs stand proud of the planks
    FLOOR0=0.58,      # underside of the sill = stilt height
    SILL=0.16,
    EAVE=2.58,        # top of plates / tie beams (tall toy walls)
    BEAM=0.18,
    PITCH=55.0,       # steep storybook roof
    DECK_LIFT=0.06,
    EAVE_OH=0.22,
    GABLE_OH_F=0.34,
    GABLE_OH_B=0.24,
    COURSE=0.44,      # shingle course spacing along the slope (big chubby slabs)
    TAB_W=(0.40, 0.62),
    TAB_TH=0.11,
    TAB_LIFT=0.13,
    BARGE=(0.20, 0.26),
    PLANK_W=0.24,
    PLANK_T=0.07,
    DOOR_X=(-0.32, 0.48),  # oversized arched doorway on the front gable
    DOOR_SPRING=1.64,      # where the arch starts
    DOOR_TOP=2.08,         # arch crown
    WINS=((-1.0, -0.32), (0.18, 0.86)),  # two big windows on the +X side (along Y)
    WIN_Z=(1.22, 1.98),
    BACK_WIN=(-0.28, 0.28, 1.40, 1.90),   # small window in the back gable wall
    GWIN=(0.0, 3.12, 0.32),               # round gable window: x, z, radius
    RIDGE_LOG=(0.15, 0.40),               # ridge log radius, how far it pokes out past the front bargeboards
    RAMP_L=1.6,
    PLAT_X=(1.24, 2.32),   # platform along the +X side
    PLAT_Y=(-1.42, 1.62),
    PLAT_Z=0.70,           # deck top (just under the floor)
    RACK=(1.78, 1.18, 0.62, 0.36, 0.52),  # hay rack: x, y centre, length (along Y... X), depth, height
    # deform (the charming pass)
    BULGE=0.07,       # wall bulge at mid height (fraction of the half width)
    FLARE=0.05,       # flare at the foot of the walls
    SAG=0.12,         # ridge sag at mid length (m)
    RISE=0.10,        # extra rise of the ridge at the front gable (m)
    LEAN=0.10,        # the top leans this far towards -X (m)
)

COL = {  # sRGB, sampled from the charming hero
    'Plank_Rose': (240, 154, 136), 'Plank_RoseDark': (222, 132, 114), 'Timber_Rose': (246, 166, 148),
    'Plank_Dark': (34, 44, 44), 'Timber_Brown': (122, 80, 46), 'Roof_Teal': (74, 142, 146),
    'Hay_Straw': (196, 156, 96), 'Stone_Grey': (160, 152, 140), 'Rope_String': (226, 214, 180),
}
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']
GROUPS = {'planned': {'stakes'}, 'foundation': {'foundation'}, 'frame': {'foundation', 'frame'},
          'roof': {'foundation', 'frame', 'roof'}, 'complete': {'foundation', 'frame', 'roof', 'walls'}}
UNDEFORMED = {'stakes', 'string_lines', 'stone_pads', 'ramp', 'ramp_timbers', 'platform_deck', 'platform_frame',
              'hay_rack', 'hay'}


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
    """Collects boxes/prisms/logs into one bmesh, becomes one object with one material."""
    def __init__(self, name, material):
        self.name, self.material = name, material
        self.bm = bmesh.new()

    def poly(self, verts, faces):
        vs = [self.bm.verts.new(Vector(v)) for v in verts]
        for f in faces:
            try:
                self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                pass

    def hexa(self, c):  # 8 corners: bottom 0-3, top 4-7
        self.poly(c, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def box(self, lo, hi, rot=None, pivot=None):
        x0, y0, z0 = lo; x1, y1, z1 = hi
        c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        if rot is not None:
            pv = Vector(pivot if pivot else ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
            c = [tuple(rot @ (Vector(p) - pv) + pv) for p in c]
        self.hexa(c)

    def frame_of(self, a, b, up):
        a, b = Vector(a), Vector(b); d = (b - a).normalized(); u = Vector(up)
        s = d.cross(u)
        if s.length < 1e-6:
            s = d.cross(Vector((1, 0, 0)))
        s.normalize(); u = s.cross(d).normalized()
        return a, b, s, u

    def beam(self, a, b, w, h, up=(0, 0, 1)):
        """A timber from point a to b, w wide (side), h tall (along up)."""
        a, b, s, u = self.frame_of(a, b, up)
        c = []
        for p in (a, b):
            for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                c.append(p + s * sx * w / 2 + u * sz * h / 2)
        self.poly(c, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)])

    def log(self, a, b, r0, r1=None, n=8, up=(0, 0, 1), rings=1):
        """A round log from a to b (n sides), radius r0 at a tapering to r1 at b, split into `rings` lengths."""
        r1 = r0 if r1 is None else r1
        a, b, s, u = self.frame_of(a, b, up)
        vs = []
        for k in range(rings + 1):
            f = k / rings; c = a.lerp(b, f); r = r0 + (r1 - r0) * f
            vs += [c + (s * math.cos(2 * math.pi * (i + 0.5) / n) + u * math.sin(2 * math.pi * (i + 0.5) / n)) * r for i in range(n)]
        f = [tuple(range(n - 1, -1, -1)), tuple(range(rings * n, rings * n + n))]
        for k in range(rings):
            for i in range(n):
                j = (i + 1) % n; f.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
        self.poly(vs, f)

    def slab(self, outline, P3, w0, th):
        """A flat slab: outline [(u, v, lift)] on a roof frame P3(u, v, w), w0 above the deck, th thick."""
        n = len(outline)
        v = [P3(u, vv, w0 + l) for u, vv, l in outline] + [P3(u, vv, w0 + l + th) for u, vv, l in outline]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, j, n + j, n + i))
        self.poly(v, f)

    def prism(self, pts, a0, a1, ax):
        """Polygon in (u, z) extruded along ax ('y': u is x, extruded over y; 'x': u is y, extruded over x)."""
        n = len(pts)
        if ax == 'y':
            v = [(u, a0, z) for u, z in pts] + [(u, a1, z) for u, z in pts]
        else:
            v = [(a0, u, z) for u, z in pts] + [(a1, u, z) for u, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def finish(self, deform=None, zcuts=(), ycuts=()):
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        if deform:
            for z in zcuts:     # extra rings so the bulge and sag bend long planks and beams instead of skewing them
                g = self.bm.verts[:] + self.bm.edges[:] + self.bm.faces[:]
                bmesh.ops.bisect_plane(self.bm, geom=g, plane_co=(0, 0, z), plane_no=(0, 0, 1))
            for y in ycuts:
                g = self.bm.verts[:] + self.bm.edges[:] + self.bm.faces[:]
                bmesh.ops.bisect_plane(self.bm, geom=g, plane_co=(0, y, 0), plane_no=(0, 1, 0))
            for v in self.bm.verts:
                v.co = deform(v.co)
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

    def part(name, material):
        if name not in parts:
            parts[name] = Part(name, material)
        return parts[name]

    PO, PP, F0, SL, EV, BM, T = p['POST'], p['POST_PROUD'], p['FLOOR0'], p['SILL'], p['EAVE'], p['BEAM'], p['PLANK_T']
    FT = F0 + SL                                     # floor top / sill top
    ZW1 = EV - BM                                    # planks end under the plate / tie beam
    Z0 = EV + p['DECK_LIFT']
    zr = Z0 + hw * t                                 # deck underside at the ridge
    def z_under(x):
        return Z0 + (hw - abs(x)) * t
    yF, yB = -hd - p['GABLE_OH_F'], hd + p['GABLE_OH_B']
    DX0, DX1 = p['DOOR_X']; DC, DR = (DX0 + DX1) / 2, (DX1 - DX0) / 2
    DS, DT = p['DOOR_SPRING'], p['DOOR_TOP']
    def z_arch(x):                                   # underside of the arched door head
        q = max(0.0, 1 - ((x - DC) / DR) ** 2)
        return DS + (DT - DS) * math.sqrt(q)
    WZ0, WZ1 = p['WIN_Z']
    po = PO / 2
    cxy = lambda sx, sy: (sx * (hw + PP - po + 0.02), sy * (hd + PP - po + 0.02))
    corners = [cxy(sx, sy) for sx in (-1, 1) for sy in (-1, 1)]
    ztop = zr + 0.4

    def deform(co):
        x, y, z = co
        zn = min(1.0, max(0.0, (z - FT) / (EV - FT)))
        b = p['BULGE'] * math.sin(math.pi * zn) + p['FLARE'] * (1 - zn) if z < EV + 0.05 else 0.0
        x *= 1 + b; y *= 1 + b * hw / hd
        if z > EV:
            h = min(1.0, (z - EV) / (zr - EV)); ly = max(-1.0, min(1.0, y / (hd + p['GABLE_OH_F'])))
            z += -p['SAG'] * h * h * (1 - ly * ly) + p['RISE'] * h * h * max(0.0, -ly) ** 2
        x -= p['LEAN'] * max(0.0, (z - FT) / (ztop - FT)) ** 1.5
        return Vector((x, y, z))

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Brown'); rp = part('string_lines', 'Rope_String')
        cs = [(-hw - 0.1, -hd - 0.1), (hw + 0.1, -hd - 0.1), (hw + 0.1, hd + 0.1), (-hw - 0.1, hd + 0.1)]
        for x, y in cs:
            st.box((x - 0.045, y - 0.045, 0), (x + 0.045, y + 0.045, 0.55))
        for i in range(4):
            (xa, ya), (xb, yb) = cs[i], cs[(i + 1) % 4]
            rp.beam((xa, ya, 0.46), (xb, yb, 0.46), 0.018, 0.018)
        for x in (DX0, DX1):                            # pegs marking the doorway
            st.box((x - 0.03, -hd - 0.14, 0), (x + 0.03, -hd - 0.08, 0.22))
        rp.beam((-hw - 0.1, -hd - 0.1, 0.03), (hw + 0.1, hd + 0.1, 0.03), 0.016, 0.016)   # squaring diagonal
        x0, x1 = p['PLAT_X']; y0, y1 = p['PLAT_Y']      # the platform's outline along the +X side
        for a, b in (((hw + 0.1, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (hw + 0.1, y1))):
            rp.beam((*a, 0.03), (*b, 0.03), 0.016, 0.016)
        for x, y in ((x1, y0), (x1, y1)):
            st.box((x - 0.035, y - 0.035, 0), (x + 0.035, y + 0.035, 0.26))

    # ------------------------------------------------------------------ foundation: stone pads, log stilts, sills, floor
    if 'foundation' in want:
        sp = part('stone_pads', 'Stone_Grey'); sl = part('stilts_sills', 'Timber_Rose')
        mids = [(sx * (hw + PP - po + 0.02), 0.0) for sx in (-1, 1)]
        for x, y in corners + mids:
            sp.log((x, y, 0), (x, y, 0.07), 0.24, 0.2, n=7)
        for x, y in corners:
            sl.log((x, y, 0.05), (x, y, FT + 0.03), po * 1.12, po, n=8)
        for x, y in mids:
            sl.log((x, y, 0.05), (x, y, FT - 0.03), 0.11, 0.1, n=8)
        for sy in (-1, 1):                              # chunky sills, proud of the plank skin
            y = sy * (hd + PP - 0.03); sl.box((-hw + po, min(y, y - sy * 0.2), F0), (hw - po, max(y, y - sy * 0.2), FT))
        for sx in (-1, 1):
            x = sx * (hw + PP - 0.03); sl.box((min(x, x - sx * 0.2), -hd + po, F0), (max(x, x - sx * 0.2), hd - po, FT))
        fl = part('floor', 'Plank_RoseDark')
        fl.box((-hw + 0.15, -hd + 0.15, FT - 0.05), (hw - 0.15, hd - 0.15, FT - 0.005))
        n = int(W / 0.3)
        for k in range(n):
            x0 = -hw + 0.15 + k * (W - 0.3) / n
            fl.box((x0 + 0.01, -hd + 0.15, FT - 0.005), (x0 + (W - 0.3) / n - 0.01, hd - 0.15, FT + 0.01))

    # ------------------------------------------------------------------ frame: log posts, plates, tie beams, rafters
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Rose')
        for x, y in corners:
            fr.log((x, y, FT + 0.03), (x, y, EV + 0.05), po, po * 0.92, n=8, rings=4)
        for x in (DX0 - 0.08, DX1 + 0.08):              # door posts
            fr.box((x - 0.08, -hd - PP, FT), (x + 0.08, -hd - PP + 0.16, ZW1))
        for wy0, wy1 in p['WINS']:                       # window posts on +X
            for y in (wy0 - 0.08, wy1 + 0.08):
                fr.box((hw + PP - 0.16, y - 0.08, FT), (hw + PP, y + 0.08, ZW1))
        fr.box((-hw - PP, -0.08, FT), (-hw - PP + 0.16, 0.08, ZW1))
        bx0, bx1, bz0, bz1 = p['BACK_WIN']
        for x in (bx0 - 0.08, bx1 + 0.08):
            fr.box((x - 0.08, hd + PP - 0.16, FT), (x + 0.08, hd + PP, ZW1))
        for sx in (-1, 1):                               # plates on the long sides
            x = sx * (hw + PP + 0.02)
            fr.box((min(x, x - sx * 0.22), -hd - 0.12, ZW1), (max(x, x - sx * 0.22), hd + 0.12, EV))
        for sy in (-1, 1):                               # tie beams on the gables, sticking out past the logs (hero)
            y = sy * (hd + PP + 0.05)
            fr.box((-hw - 0.24, min(y, y - sy * 0.22), ZW1 - 0.02), (hw + 0.24, max(y, y - sy * 0.22), EV + 0.02),
                   Matrix.Rotation(sy * 0.03, 3, 'Y'))
        for wy0, wy1 in p['WINS']:                       # window sill and head rails
            fr.box((hw + PP - 0.12, wy0 - 0.16, WZ0 - 0.1), (hw + PP + 0.04, wy1 + 0.16, WZ0))
            fr.box((hw + PP - 0.12, wy0 - 0.08, WZ1), (hw + PP + 0.0, wy1 + 0.08, WZ1 + 0.08))
        for y in (-hd + 0.1, 0.0, hd - 0.1):             # rafters, ridge beam, collar
            for sx in (-1, 1):
                xe = sx * (hw + p['EAVE_OH'] - 0.05)
                fr.beam((xe, y, z_under(xe) - 0.08), (0, y, zr - 0.08), 0.11, 0.14)
        fr.log((0, yF + 0.05, zr - 0.11), (0, yB - 0.05, zr - 0.11), 0.11, n=4, up=(0, 0, 1), rings=6)   # ridge beam, ringed for the sag
        fr.box((-0.45, -0.05, z_under(0.45) - 0.24), (0.45, 0.05, z_under(0.45) - 0.11))

    # ------------------------------------------------------------------ roof: deck, chubby shingles, bargeboards, ridge log
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal'); tb = part('roof_timbers', 'Timber_Rose'); rd = part('roof_deck', 'Plank_RoseDark')
        L = (hw + p['EAVE_OH']) / ca
        bw, bh = p['BARGE']
        for sx in (-1, 1):
            o = Vector((0, 0, zr)); d = Vector((sx * ca, 0, -sa)); nrm = Vector((sx * sa, 0, ca)); e = Vector((0, 1, 0))
            def P3(u, v, w):
                return tuple(o + e * u + d * v + nrm * w)
            dk = 0.08
            rd.hexa([P3(yF, 0, 0), P3(yF, L, 0), P3(yB, L, 0), P3(yB, 0, 0), P3(yF, 0, dk), P3(yF, L, dk), P3(yB, L, dk), P3(yB, 0, dk)])
            nC = int(math.ceil((L - 0.05) / p['COURSE']))
            for ci in range(nC):                          # chubby slabs with rounded, drooping butts
                vb = L + 0.05 - ci * p['COURSE']
                vt = max(0.0, vb - p['COURSE'] * 1.55)
                u = yF + bw * 0.5 + rnd.uniform(-0.15, 0.0)
                u = max(u, yF + bw * 0.45)
                while u < yB - bw * 0.5:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, yB - bw * 0.45)
                    if u1 - u < 0.16:
                        break
                    g = 0.035; lift = p['TAB_LIFT'] * rnd.uniform(0.7, 1.3); th = p['TAB_TH'] * rnd.uniform(0.85, 1.2)
                    vbb = vb + rnd.uniform(-0.07, 0.04); sk = rnd.uniform(-0.06, 0.06); a0, a1 = u + g / 2, u1 - g / 2
                    rr = min(0.09, (a1 - a0) * 0.22)
                    out = [(a0, vt, 0), (a0 + sk, vbb - rr, lift * 0.92), (a0 + sk + rr, vbb, lift), (a1 + sk - rr, vbb, lift),
                           (a1 + sk, vbb - rr, lift * 0.92), (a1, vt, 0)]
                    rf.slab(out, P3, dk, th)
                    u = u1
            rf.hexa([P3(yF + bw, -0.06, dk + 0.06), P3(yF + bw, 0.40, dk + 0.06), P3(yB - bw, 0.40, dk + 0.06), P3(yB - bw, -0.06, dk + 0.06),
                     P3(yF + bw, -0.06, dk + 0.17), P3(yF + bw, 0.40, dk + 0.15), P3(yB - bw, 0.40, dk + 0.15), P3(yB - bw, -0.06, dk + 0.17)])
            for yy in (yF + bw / 2, yB - bw / 2):          # thick rose bargeboards meeting under the ridge log
                a = P3(yy, L + 0.12, 0.08); b = P3(yy, -0.08, 0.08)
                tb.beam(a, b, bw, bh + 0.2, up=tuple(nrm))
        for yy in (yF + bw / 2, yB - bw / 2):              # apex blocks fill the V where the bargeboards meet
            tb.prism([(-0.26, zr - 0.05), (0.26, zr - 0.05), (0, zr + 0.34)], yy - bw / 2, yy + bw / 2, 'y')
        lr, lout = p['RIDGE_LOG']                          # round ridge log, poking out over the front gable
        tb.log((0, yF - lout, zr + 0.3), (0, yB + 0.08, zr + 0.3), lr, lr * 0.9, n=10, up=(0, 0, 1), rings=8)
        tb.box((-0.1, yF + 0.02, zr + 0.06), (0.1, yB - 0.02, zr + 0.24))   # ridge board under the log

    # ------------------------------------------------------------------ walls, doorway, windows, ramp, platform
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose'); pk_b = part('plank_walls_dark', 'Plank_RoseDark')

        def plank_run(ax, breaks, line, sgn, ztop_fn, zbot=FT, holes=(), arch=None, pw=None):
            """Vertical planks along a wall between the break points. holes: [(a0, a1, z0, z1)] windows.
            arch=(a0, a1, fn): planks inside start at fn(a) (the arched door head)."""
            for s0, s1 in zip(breaks[:-1], breaks[1:]):
                n = max(1, round((s1 - s0) / (pw or p['PLANK_W']))); w = (s1 - s0) / n
                for k in range(n):
                    a, b = s0 + k * w, s0 + (k + 1) * w
                    off = (0.014 if k % 2 else 0.0) + rnd.uniform(-0.005, 0.005)
                    outer = line + sgn * off; inner = line - sgn * T
                    pk = pk_b if (k + int(s0 * 10)) % 2 else pk_a
                    zt0, zt1 = ztop_fn(a), ztop_fn(b)
                    if arch and a >= arch[0] - 1e-6 and b <= arch[1] + 1e-6:
                        pts = [(a + 0.008, arch[2](a)), (b - 0.008, arch[2](b)), (b - 0.008, zt1), (a + 0.008, zt0)]
                        pk.prism(pts, min(outer, inner), max(outer, inner), 'y' if ax == 'x' else 'x'); continue
                    segs = [(zbot, None)]
                    for h in holes:
                        if b > h[0] + 0.01 and a < h[1] - 0.01:
                            segs = [(zbot, h[2]), (h[3], None)]
                    for z0, z1 in segs:
                        pts = [(a + 0.008, z0), (b - 0.008, z0)] + ([(b - 0.008, z1), (a + 0.008, z1)] if z1 else [(b - 0.008, zt1), (a + 0.008, zt0)])
                        pk.prism(pts, min(outer, inner), max(outer, inner), 'y' if ax == 'x' else 'x')
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.03
        bx0, bx1, bz0, bz1 = p['BACK_WIN']
        # front gable wall: planks either side of the door, short planks over the arch
        plank_run('x', [-hw, DX0 - 0.1, DX0, DX1, DX1 + 0.1, hw], -hd, -1, flat, arch=(DX0, DX1, z_arch), pw=0.2)
        plank_run('x', [-hw, bx0, bx1, hw], hd, 1, flat, holes=[(bx0, bx1, bz0, bz1)])
        for sy in (-1, 1):
            plank_run('x', [-hw + 0.06, hw - 0.06], sy * hd, sy, rake, zbot=EV - 0.02)      # gable triangles
        ws = p['WINS']
        plank_run('y', [-hd, ws[0][0], ws[0][1], ws[1][0], ws[1][1], hd], hw, 1, flat, holes=[(a, b, WZ0, WZ1) for a, b in ws])
        plank_run('y', [-hd, hd], -hw, -1, flat)
        for sx in (-1, 1):
            plank_run('y', [-hd, hd], sx * (hw - 0.02), sx, lambda a: z_under(hw) + 0.02, zbot=EV - 0.03)
        bk = part('plank_backing', 'Plank_RoseDark')
        for sy in (-1, 1):
            y = sy * (hd - T)
            bk.prism([(-hw + 0.02, EV - 0.03), (hw - 0.02, EV - 0.03), (0, z_under(0) - 0.02)], min(y, y - sy * 0.02), max(y, y - sy * 0.02), 'y')
        for sx in (-1, 1):
            x = sx * (hw - 0.02 - T)
            bk.box((min(x, x - sx * 0.02), -hd + T, EV - 0.05), (max(x, x - sx * 0.02), hd - T, z_under(hw) + 0.02))
        # dark interior liner, seen through the door and windows
        dk = part('interior', 'Plank_Dark')
        i0 = T + 0.02
        dk.box((-hw + i0, hd - i0 - 0.03, FT), (hw - i0, hd - i0, EV))
        dk.box((-hw + i0, -hd + i0, FT), (-hw + i0 + 0.03, hd - i0, EV))
        dk.box((hw - i0 - 0.03, -hd + i0, FT), (hw - i0, hd - i0, EV))
        dk.box((-hw + i0, -hd + i0, EV - 0.03), (hw - i0, hd - i0, EV))
        for x0, x1 in ((DX0 - 0.02, DX0), (DX1, DX1 + 0.02)):                            # door jamb reveals
            dk.box((x0, -hd - 0.005, FT), (x1, -hd + i0, DS))
        lt = part('interior_battens', 'Timber_Brown')
        for k in range(5):
            x = DX0 + 0.05 + k * (DX1 - DX0 - 0.1) / 4
            lt.box((x - 0.025, hd - i0 - 0.05, FT), (x + 0.025, hd - i0 - 0.03, EV - 0.03))
        tr = part('trim', 'Timber_Rose')
        # arched door: chunky jamb boards and a ring of voussoir planks round the arch (hero)
        for x in (DX0 - 0.07, DX1 + 0.07):
            tr.box((x - 0.07, -hd - 0.08, FT), (x + 0.07, -hd + 0.0, DS + 0.02))
        nA = 6; rA = DR + 0.09; hA = DT - DS + 0.09
        for k in range(nA):
            a0, a1 = math.pi * k / nA, math.pi * (k + 1) / nA
            pa = (DC + rA * math.cos(a0), -hd - 0.06, DS + hA * math.sin(a0)); pb = (DC + rA * math.cos(a1), -hd - 0.06, DS + hA * math.sin(a1))
            tr.beam(pa, pb, 0.11, 0.17, up=(0, 1, 0))
        tr.box((-hw - 0.18, -hd - 0.14, FT + 0.5), (DX0 - 0.16, -hd - 0.03, FT + 0.62))    # front rail left of the door
        tr.box((DX0 - 0.16, -hd - PP - 0.05, FT - 0.07), (DX1 + 0.16, -hd + 0.1, FT + 0.01))  # threshold
        # big crooked side windows: proud jambs, sill and head that overhang (hero)
        for k, (wy0, wy1) in enumerate(p['WINS']):
            x = hw + PP + 0.0
            for y in (wy0 - 0.06, wy1 + 0.06):
                tr.box((x - 0.04, y - 0.06, WZ0 - 0.02), (x + 0.07, y + 0.06, WZ1 + 0.02))
            tr.box((x - 0.04, wy0 - 0.2, WZ0 - 0.13), (x + 0.11, wy1 + 0.2, WZ0 - 0.02), Matrix.Rotation(0.05 * (1 if k else -1), 3, 'X'))
            tr.box((x - 0.04, wy0 - 0.16, WZ1 + 0.01), (x + 0.09, wy1 + 0.16, WZ1 + 0.11), Matrix.Rotation(-0.04 * (1 if k else -1), 3, 'X'))
            tr.box((x - 0.02, (wy0 + wy1) / 2 - 0.025, WZ0), (x + 0.03, (wy0 + wy1) / 2 + 0.025, WZ1))   # mullion
        # back window frame
        y = hd + PP
        for xx in (bx0 - 0.06, bx1 + 0.06):
            tr.box((xx - 0.06, y - 0.04, bz0 - 0.02), (xx + 0.06, y + 0.06, bz1 + 0.02))
        tr.box((bx0 - 0.16, y - 0.04, bz0 - 0.12), (bx1 + 0.16, y + 0.09, bz0 - 0.01))
        tr.box((bx0 - 0.12, y - 0.04, bz1 + 0.01), (bx1 + 0.12, y + 0.08, bz1 + 0.1))
        # round gable window: dark glass disc, chunky ring frame, cross bars, little sill
        gx, gz, gr = p['GWIN']
        dk.log((gx, -hd - 0.02, gz), (gx, -hd - 0.04, gz), gr, n=12, up=(0, 0, 1))
        nR = 12
        for k in range(nR):
            a0, a1 = 2 * math.pi * k / nR, 2 * math.pi * (k + 1) / nR
            tr.beam((gx + (gr + 0.04) * math.cos(a0), -hd - 0.06, gz + (gr + 0.04) * math.sin(a0)),
                    (gx + (gr + 0.04) * math.cos(a1), -hd - 0.06, gz + (gr + 0.04) * math.sin(a1)), 0.1, 0.1, up=(0, 1, 0))
        tr.box((gx - 0.025, -hd - 0.07, gz - gr), (gx + 0.025, -hd - 0.03, gz + gr))
        tr.box((gx - gr, -hd - 0.07, gz - 0.025), (gx + gr, -hd - 0.03, gz + 0.025))
        tr.box((gx - gr - 0.06, -hd - 0.16, gz - gr - 0.13), (gx + gr + 0.06, -hd - 0.02, gz - gr - 0.04))
        # ------------------------------------------------ ramp: crooked pink planks from the doorway to the ground
        rp = part('ramp', 'Plank_Rose'); rt = part('ramp_timbers', 'Timber_Rose')
        y_top, z_top = -hd - PP - 0.05, FT + 0.01
        y_bot, z_bot = y_top - p['RAMP_L'], 0.0
        ang = math.atan2(z_top - z_bot, y_top - y_bot)
        nP = 4; rx0, rx1 = DX0 - 0.1, DX1 + 0.1; rw = (rx1 - rx0) / nP
        for k in range(nP):
            x0 = rx0 + k * rw + 0.014; x1 = x0 + rw - 0.028
            ext = rnd.uniform(-0.08, 0.06)
            a = Vector((0, y_bot - ext, z_bot + 0.035)); b = Vector((0, y_top, z_top))
            th = 0.07; dz = Vector((0, -math.sin(ang), math.cos(ang))) * th
            sk = rnd.uniform(-0.03, 0.03)
            c = [(x0 + sk, a.y, a.z - 0.03), (x1 + sk, a.y, a.z - 0.03), (x1, b.y, b.z - 0.03), (x0, b.y, b.z - 0.03)]
            c = c + [tuple(Vector(q) + dz) for q in c]
            rp.poly(c, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        for f, tilt in ((0.12, 0.05), (0.45, -0.06), (0.8, 0.04)):                        # chunky crooked cleats
            y = y_bot + (y_top - y_bot) * f; z = z_bot + (z_top - z_bot) * f + 0.05
            rp.box((rx0 - 0.04, y - 0.06, z), (rx1 + 0.04, y + 0.06, z + 0.07), Matrix.Rotation(tilt, 3, 'Z'))
        ym = y_bot + (y_top - y_bot) * 0.62; zm = z_bot + (z_top - z_bot) * 0.62 - 0.03
        for x in (rx0 + 0.08, rx1 - 0.08):
            rt.log((x, ym, 0), (x, ym, zm), 0.06, n=6)
        rt.box((rx0 - 0.04, ym - 0.05, zm - 0.1), (rx1 + 0.04, ym + 0.05, zm))
        # ------------------------------------------------ platform along the +X side
        pl = part('platform_deck', 'Plank_Rose'); pf = part('platform_frame', 'Timber_Rose')
        X0, X1 = p['PLAT_X']; Y0, Y1 = p['PLAT_Y']; Zd = p['PLAT_Z']
        for x, y in ((X1 - 0.09, Y0 + 0.09), (X1 - 0.09, Y1 - 0.09), (X0 + 0.1, Y1 - 0.09), (X1 - 0.09, (Y0 + Y1) / 2), (X0 + 0.1, Y0 + 0.09)):
            pf.log((x, y, 0), (x, y, Zd - 0.07), 0.095, 0.085, n=8)
        pf.box((X1 - 0.12, Y0, Zd - 0.24), (X1, Y1, Zd - 0.07))                            # bearers
        pf.box((X0, Y0, Zd - 0.24), (X0 + 0.1, Y1, Zd - 0.07))
        for y in (Y0 - 0.01, Y1 - 0.09):                                                   # cross bearers, a hair proud
            pf.box((X0 - 0.01, y, Zd - 0.225), (X1 + 0.01, y + 0.1, Zd - 0.085))
        nD = 5; dw = (X1 + 0.05 - X0) / nD
        for k in range(nD):                                                                # deck planks along Y
            x0 = X0 + k * dw + 0.012
            e0, e1 = rnd.uniform(-0.1, 0.02), rnd.uniform(-0.02, 0.1)
            pl.box((x0, Y0 - 0.05 + e0, Zd - 0.07), (x0 + dw - 0.024, Y1 + 0.03 + e1, Zd + rnd.uniform(-0.01, 0.01)),
                   Matrix.Rotation(rnd.uniform(-0.015, 0.015), 3, 'Z'))
        # front rail (house corner to the platform corner) with a tall corner post, back rail with two posts
        for x, h in ((X0 + 0.42, 0.78), (X1 - 0.08, 0.66)):
            pf.log((x, Y0 + 0.08, Zd), (x, Y0 + 0.08, Zd + h), 0.065, 0.06, n=6)
        pf.log((hw + 0.02, Y0 + 0.08, Zd + 0.62), (X1 + 0.08, Y0 + 0.08, Zd + 0.6), 0.07, 0.065, n=6, up=(0, 1, 0))
        for x in (X0 + 0.2, X1 - 0.08):
            pf.log((x, Y1 - 0.08, Zd), (x, Y1 - 0.08, Zd + 0.62), 0.065, 0.06, n=6)
        pf.log((hw + 0.0, Y1 - 0.08, Zd + 0.56), (X1 + 0.12, Y1 - 0.08, Zd + 0.6), 0.07, 0.065, n=6, up=(0, 1, 0))
        pf.log((X0 + 0.2, Y1 - 0.08, Zd + 0.3), (X1 - 0.08, Y1 - 0.08, Zd + 0.32), 0.045, n=6, up=(0, 1, 0))
        # little ladder at the front of the platform (hero)
        lx = X0 + 0.42
        for xx in (lx - 0.06, lx + 0.18):
            pf.box((xx - 0.03, Y0 - 0.08, 0), (xx + 0.03, Y0 - 0.02, Zd - 0.02), Matrix.Rotation(0.08, 3, 'X'))
        for z in (0.16, 0.34):
            pf.box((lx - 0.08, Y0 - 0.1, z), (lx + 0.2, Y0 - 0.03, z + 0.05))
        # hay rack on the deck: slatted V on two splayed end frames, with a heap of hay
        cx, cy, rl, rdp, rh = p['RACK']
        cr = part('hay_rack', 'Timber_Rose'); hy = part('hay', 'Hay_Straw')
        for sy in (-1, 1):
            y = cy + sy * rl / 2
            for sx in (-1, 1):
                cr.beam((cx + sx * 0.08, y, Zd), (cx + sx * rdp / 2, y, Zd + rh), 0.05, 0.05, up=(0, 1, 0))
            cr.box((cx - rdp / 2, y - 0.025, Zd + rh - 0.05), (cx + rdp / 2, y + 0.025, Zd + rh))
        for sx in (-1, 1):
            for f in (0.35, 0.95):
                x = cx + sx * (0.08 + (rdp / 2 - 0.08) * f); z = Zd + rh * f
                cr.box((x - 0.025, cy - rl / 2 - 0.04, z - 0.025), (x + 0.025, cy + rl / 2 + 0.04, z + 0.025))
            for k in range(4):
                y = cy - rl / 2 + 0.1 + k * (rl - 0.2) / 3
                cr.beam((cx + sx * 0.08, y, Zd + 0.12), (cx + sx * rdp / 2, y, Zd + rh), 0.03, 0.03, up=(0, 1, 0))
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            v.co *= rnd.uniform(0.85, 1.15)
            v.co = Vector((v.co.x * (rdp / 2 - 0.02), v.co.y * (rl / 2 - 0.02), max(v.co.z, -0.5) * 0.2))
            v.co += Vector((cx, cy, Zd + rh - 0.02))
        base = len(hy.bm.verts)
        for v in bm.verts:
            hy.bm.verts.new(v.co)
        hy.bm.verts.ensure_lookup_table(); bm.verts.ensure_lookup_table()
        for f in bm.faces:
            hy.bm.faces.new([hy.bm.verts[base + v.index] for v in f.verts])
        bm.free()
        for k in range(9):
            a = Vector((cx + rnd.uniform(-0.15, 0.15), cy + rnd.uniform(-0.25, 0.25), Zd + rh + 0.06))
            b = a + Vector((rnd.uniform(-0.25, 0.25), rnd.uniform(-0.2, 0.2), rnd.uniform(-0.04, 0.14)))
            hy.beam(a, b, 0.028, 0.028)
        for k in range(3):
            x = cx + rnd.uniform(-0.3, 0.1); y = cy - rl / 2 - rnd.uniform(0.1, 0.35)
            hy.box((x - 0.1, y - 0.05, Zd), (x + 0.1, y + 0.05, Zd + 0.03), Matrix.Rotation(rnd.uniform(0, 3), 3, 'Z'))

    zc = [FT + (EV - FT) * k / 4 for k in range(1, 4)]          # bend rings for the wall bulge
    yc = [-hd - 0.2 + (D + 0.4) * k / 6 for k in range(1, 6)]   # and for the ridge sag
    obs = []
    for name, pt in parts.items():
        if name in UNDEFORMED:
            obs.append(pt.finish())
        elif name in ('roof_deck', 'roof_timbers'):
            obs.append(pt.finish(deform, ycuts=yc))
        elif name in ('plank_walls', 'plank_walls_dark', 'timber_frame'):
            obs.append(pt.finish(deform, zcuts=zc))
        else:
            obs.append(pt.finish(deform))
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

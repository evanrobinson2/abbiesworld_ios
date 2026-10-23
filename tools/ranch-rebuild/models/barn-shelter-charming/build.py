"""barn-shelter-charming (game id shelter, charming set): the storybook-toy version of models/barn-shelter.

usage: python build.py            builds every construction stage, writes barn-shelter-charming.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes barn-shelter-charming.glb)

Same conventions and structure as the normal barn-shelter: Z up, metres, origin at the footprint centre on the ground,
front faces -Y, ridge along Y, 3.8 x 4.9 m walls, the same STATE groups and material names.
Following the MJ hero, the wide doorway is on the -X long side (with a hayloft dormer above it), the front gable has two
big windows under a kicked ridge log, and the back gable has a small window and a hay-filled loft opening.
Charm comes from one deform pass (deform()): the roof slopes are bell-curved and flick up at the eaves, the ridge sags
mid-length and rises towards the front, the walls bulge between the corner posts, and the whole frame leans a little.
States: planned (stakes + string lines), foundation (cobble footing + floor), frame (+ bare timber frame),
roof (+ roof and dormer roof, walls still open), complete (+ plank walls, recess with bench and tools, door leaf, windows, loft).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'barn-shelter-charming'

P = dict(
    W=3.8,            # wall width across the gable (X), outside of the plank skin
    D=5.1,            # wall depth along the ridge (Y)
    FOOT_H=0.36,      # cobble footing height
    FOOT_OUT=0.16,    # footing proud of the wall skin
    FOOT_IN=0.36,     # footing depth inwards
    SILL=0.22,        # sill beam section
    EAVE=2.9,         # top of the tie beams / wall plates
    BEAM=0.28,        # tie beam / plate section
    TIE_OUT=0.24,     # tie beam log ends stick out past the corner posts
    POST=0.36,        # chunky corner posts
    PITCH=50.0,       # roof pitch at the chord (deg); the deform bells it
    DECK_LIFT=0.12,
    EAVE_OH=0.5,      # side eave overhang (horizontal)
    GABLE_OH_F=0.38,  # roof overhang past the front gable
    GABLE_OH_B=0.25,  # and past the back gable
    RIDGE_OH=0.62,    # ridge log sticks out past the front roof edge
    RIDGE_OH_B=0.16,
    RIDGE_R=0.22,     # ridge log radius
    RIDGE_KICK=0.5,  # the ridge log's front end rises (hero)
    RIDGE_KICK_B=0.14,
    COURSE=0.5,       # big chunky shingle courses
    TAB_W=(0.52, 0.8),
    TAB_TH=0.07,
    TAB_LIFT=0.13,
    PLANK_W=0.32,     # wide toy planks
    PLANK_T=0.07,
    DOOR_A=0.35,      # doorway centre along the -X wall, in the door frame (global y = -DOOR_A)
    DOOR_W=1.8,       # clear opening between the jambs
    LINTEL_Z=2.3, 
    LINTEL_H=0.28,
    REC_D=0.95,       # depth of the open recess behind the doorway
    LEAF_W=0.95,      # the door leaf, hung on the back (+Y) jamb
    LEAF_OPEN=50.0,   # degrees between the open leaf and the wall
    WIN_F=(0.88, 0.62, 0.98, 1.0, 1.98),   # front gable windows: |x| centre, width, height, sill z, head z
    WIN_L=(1.72, 0.5, 0.62),              # -X wall window: y centre, width, height (sill at 1.15)
    WIN_B=(0.0, 0.5, 0.5, 1.15),          # back gable window: x centre, width, height, sill z
    LOFT_W=0.9, LOFT_H=0.72, LOFT_Z=0.34, # back-gable hay loft opening (bottom above the tie beam top)
    COLLAR_Z=1.45,
    DORM_W=0.8,       # dormer half width (along Y), centred over the doorway
    DORM_WALL=1.5,    # dormer wall top above the eave
    DORM_RISE=0.75,   # dormer gable rise
    # charm deform
    BULGE=0.11,       # walls bulge out between the corner posts
    CONC=0.45,        # roof slope bells inward mid-slope
    FLICK=0.15,       # eave tips flick up
    RISE=0.34,        # ridge rises towards the front
    SAG=0.16,         # ridge sags mid-length
    LEAN=(0.20, 0.08),  # lean of the top (x, y) at 6 m, growing with height
)

COL = {  # sRGB, sampled from the charming hero
    'Plank_Rose': (236, 146, 128), 'Plank_RoseDark': (220, 126, 110), 'Timber_Grey': (160, 92, 66),
    'Roof_Teal': (74, 128, 132), 'Stone_Teal': (150, 150, 138), 'Metal_Iron': (46, 44, 44),
    'Timber_Bench': (150, 96, 58), 'Plank_Interior': (110, 72, 50), 'Plank_Shadow': (28, 22, 18),
    'Plank_Floor': (156, 118, 84), 'Rope_String': (226, 214, 180), 'Hay_Straw': (214, 172, 92),
}
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']
GROUPS = {'planned': {'stakes'}, 'foundation': {'foundation'}, 'frame': {'foundation', 'frame'},
          'roof': {'foundation', 'frame', 'roof'}, 'complete': {'foundation', 'frame', 'roof', 'walls'}}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}
ROT = [None]          # when set, Part geometry is rotated about Z (the door frame -> the -X wall)


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ the charm deform
def dims():
    p = P; hw, hd = p['W'] / 2, p['D'] / 2; t = math.tan(math.radians(p['PITCH']))
    return hw, hd, t, p['EAVE'], p['EAVE'] + p['DECK_LIFT']


def z_under(x):
    hw, hd, t, EV, Z0 = dims()
    return Z0 + (hw - abs(x)) * t


def deform(v):
    """storybook shape: bulging walls, bell-curved roof with flicked eaves, sagging/rising ridge, a gentle lean."""
    p = P; hw, hd, t, EV, Z0 = dims()
    x, y, z = v
    dx = dy = dz = 0.0
    zw0, zw1 = p['FOOT_H'] + p['SILL'], EV - p['BEAM']
    if zw0 - 0.1 < z < zw1 + 0.1:                       # bulge (not the -X wall: it carries the doorway)
        vv = min(1, max(0, (z - zw0) / (zw1 - zw0))); sv = math.sin(math.pi * vv)
        if x > hw - 0.4 and abs(y) < hd + 0.4:
            dx += p['BULGE'] * math.sin(math.pi * min(1, max(0, (y + hd) / (2 * hd)))) * sv
        if abs(y) > hd - 0.4 and abs(x) < hw + 0.4:
            dy += math.copysign(1, y) * p['BULGE'] * math.sin(math.pi * min(1, max(0, (x + hw) / (2 * hw)))) * sv
    if z > EV - 0.02:                                   # roof shape, faded in from the plate line
        r = min(1.0, (z - EV) / max(z_under(x) - EV, 0.3))
        s = min(1.05, abs(x) / (hw + p['EAVE_OH']))
        tt = min(1, max(0, (y + hd) / (2 * hd)))
        ridge = p['RISE'] * (1 - tt) - p['SAG'] * math.sin(math.pi * tt)
        top = ridge * max(0, 1 - s) - p['CONC'] * 4 * s * (1 - s) + p['FLICK'] * max(0, (abs(x) - hw) / p['EAVE_OH']) ** 2
        dz += r * top
    k = (max(z, 0) / 6.0) ** 1.2                        # lean
    dx += p['LEAN'][0] * k; dy += p['LEAN'][1] * k
    return (x + dx, y + dy, z + dz)


class Part:
    """Collects boxes/prisms into one bmesh, becomes one object with one material."""
    def __init__(self, name, material, group):
        self.name, self.material, self.group = name, material, group
        self.bm = bmesh.new()

    def poly(self, verts, faces):
        if ROT[0] is not None:
            verts = [tuple(ROT[0] @ Vector(v)) for v in verts]
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
        """A soft box: vertical sides, top edges chamfered by ch (a rounded cobble / pillow)."""
        x0, y0, z0 = lo; x1, y1, z1 = hi
        rings = [(0, z0), (0, z1 - ch), (ch, z1)]
        c = []
        for ins, zz in rings:
            c += [(x0 + ins, y0 + ins, zz), (x1 - ins, y0 + ins, zz), (x1 - ins, y1 - ins, zz), (x0 + ins, y1 - ins, zz)]
        if rot is not None:
            pv = Vector(((x0 + x1) / 2, (y0 + y1) / 2, z0))
            c = [tuple(rot @ (Vector(p) - pv) + pv) for p in c]
        f = [(0, 3, 2, 1), (8, 9, 10, 11)]
        for r in range(2):
            for i in range(4):
                j = (i + 1) % 4; a, b = 4 * r, 4 * (r + 1)
                f.append((a + i, a + j, b + j, b + i))
        self.poly(c, f)

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

    def log(self, a, b, r, n=8):
        """A round log (n-gon) from a to b."""
        a, b = Vector(a), Vector(b); d = (b - a).normalized()
        s = d.cross(Vector((0, 0, 1)))
        if s.length < 1e-6:
            s = d.cross(Vector((1, 0, 0)))
        s.normalize(); u = s.cross(d).normalized()
        c = []
        for p in (a, b):
            for i in range(n):
                ang = 2 * math.pi * (i + 0.5) / n
                c.append(tuple(p + s * math.cos(ang) * r + u * math.sin(ang) * r))
        f = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, j, n + j, n + i))
        self.poly(c, f)

    def prism(self, pts, a0, a1, axis):
        """Polygon given in (h, z) extruded along `axis` ('y': pts are (x, z); 'x': pts are (y, z))."""
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
        if self.group not in ('foundation', 'stakes'):
            for vt in self.bm.verts:
                vt.co = Vector(deform(tuple(vt.co)))
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for poly in me.polygons:
            poly.use_smooth = False
        ob = bpy.data.objects.new(self.name, me); ob.data.materials.append(mat(self.material))
        bpy.context.scene.collection.objects.link(ob)
        return ob


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); ROT[0] = None
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
    Z0 = EV + p['DECK_LIFT']
    zr = Z0 + hw * t
    yF, yB = -hd - p['GABLE_OH_F'], hd + p['GABLE_OH_B']
    LZ, LH = p['LINTEL_Z'], p['LINTEL_H']
    ZW0 = FH + p['SILL']
    ZW1 = EV - BM
    JW = 0.22
    pz = 0.03
    # the doorway on the -X wall, in global y; the door assembly is built in the normal model's front-wall frame
    # (wall at local y = -hw, along local x = a) and rotated so local -Y -> global -X, local +x -> global -y
    DA, DW = p['DOOR_A'], p['DOOR_W']
    DX0, DX1 = DA - DW / 2, DA + DW / 2                 # local
    DY0, DY1 = -DX1, -DX0                               # global y span of the opening
    ROTL = Matrix.Rotation(math.radians(-90), 3, 'Z')
    hdl = hw                                            # the door wall's distance from the centre
    fwx, fww, fwh, fz0, fz1 = p['WIN_F']
    lwy, lww, lwh = p['WIN_L']
    bwx, bww, bwh, bz0 = p['WIN_B']
    LX0, LX1 = -p['LOFT_W'] / 2, p['LOFT_W'] / 2
    LZ0 = EV + p['LOFT_Z']; LZ1 = LZ0 + p['LOFT_H']
    dyc = -DA; DMW = p['DORM_W']; DWZ = EV + p['DORM_WALL']; DAP = DWZ + p['DORM_RISE']
    dxf = -hw - 0.02                                    # dormer front face

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Grey', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        corners = [(-hw - 0.1, -hd - 0.1), (hw + 0.1, -hd - 0.1), (hw + 0.1, hd + 0.1), (-hw - 0.1, hd + 0.1)]
        for x, y in corners:
            st.cbox((x - 0.06, y - 0.06, 0), (x + 0.06, y + 0.06, 0.66), 0.04)
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            rp.beam((xa, ya, 0.54), (xb, yb, 0.54), 0.02, 0.02)
        for y in (DY0, DY1):                         # pegs marking the doorway on the -X side
            st.box((-hw - 0.13, y - 0.03, 0), (-hw - 0.07, y + 0.03, 0.27))
        rp.beam((-hw - 0.1, -hd - 0.1, 0.03), (hw + 0.1, hd + 0.1, 0.03), 0.016, 0.016)

    # ------------------------------------------------------------------ foundation: chunky cobble footing and floor
    if 'foundation' in want:
        sp = part('stone_footing', 'Stone_Teal', 'foundation')
        o, i_ = p['FOOT_OUT'], p['FOOT_IN']
        runs = [('x', -hw - o, hw + o, -hd, -1), ('x', -hw - o, hw + o, hd, 1),
                ('y', -hd + i_ - o, hd - i_ + o, -hw, -1), ('y', -hd + i_ - o, hd - i_ + o, hw, 1)]
        for ax, a0, a1, line, sgn in runs:
            a = a0
            while a < a1 - 0.05:
                w = rnd.uniform(0.48, 0.72); b = min(a + w, a1)
                if a1 - b < 0.25:
                    b = a1
                if ax == 'y' and sgn < 0 and b > DY0 - JW + 0.02 and a < DY1 + JW - 0.02:   # no stones under the doorway
                    a = DY1 + JW - 0.02 if a < DY1 + JW else b
                    continue
                h = FH * rnd.uniform(0.85, 1.1); out = rnd.uniform(-0.02, 0.05)
                g = 0.04
                outer, inner = line + sgn * (o + out), line - sgn * (i_ - o)
                if ax == 'x':
                    lo = (a + g / 2, min(outer, inner), 0); hi = (b - g / 2, max(outer, inner), h)
                else:
                    lo = (min(outer, inner), a + g / 2, 0); hi = (max(outer, inner), b - g / 2, h)
                sp.cbox(lo, hi, rnd.uniform(0.07, 0.11), Matrix.Rotation(rnd.uniform(-0.06, 0.06), 3, 'Z'))
                a = b
        fl = part('floor', 'Plank_Floor', 'foundation')
        fl.box((-hw + i_ - 0.05, -hd + i_ - 0.05, 0), (hw - i_ + 0.05, hd - i_ + 0.05, 0.12))
        ROT[0] = ROTL
        sp.cbox((DX0 + 0.05, -hdl - 0.7, 0), (DX0 + 0.95, -hdl - 0.18, 0.1), 0.04, Matrix.Rotation(0.05, 3, 'Z'))   # step stones
        sp.cbox((DX0 + 1.05, -hdl - 0.64, 0), (DX1 - 0.1, -hdl - 0.18, 0.09), 0.04, Matrix.Rotation(-0.06, 3, 'Z'))
        fl.box((DX0 - 0.02, -hdl - 0.18, 0), (DX1 + 0.02, -hdl + i_, 0.10))         # doorway floor / threshold
        ROT[0] = None

    # ------------------------------------------------------------------ frame
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Grey', 'frame')
        po = PO / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hw + pz - po), sy * (hd + pz - po)
                fr.cbox((x - po - 0.03, y - po - 0.03, FH), (x + po + 0.03, y + po + 0.03, FH + 0.3), 0.05)   # post feet
                fr.box((x - po, y - po, FH), (x + po, y + po, EV - 0.02))
        # sills: front, back, +X; the -X sill is broken at the doorway
        s = p['SILL']
        for sy in (-1, 1):
            y0 = sy * (hd + pz); fr.box((-hw + po, min(y0, y0 - sy * s), FH), (hw - po, max(y0, y0 - sy * s), FH + s))
        fr.box((hw + pz - s, -hd + po, FH), (hw + pz, hd - po, FH + s))
        fr.box((-hw - pz, -hd + po, FH), (-hw - pz + s, DY0 - JW, FH + s))
        fr.box((-hw - pz, DY1 + JW, FH), (-hw - pz + s, hd - po, FH + s))
        # wall plates on the long sides, tie beams (log ends) across the gables
        for sx in (-1, 1):
            x0 = sx * (hw + pz + 0.02)
            fr.box((min(x0, x0 - sx * BM), -hd - 0.12, EV - BM), (max(x0, x0 - sx * BM), hd + 0.12, EV))
        for sy in (-1, 1):
            y0 = sy * (hd + pz + 0.06)
            fr.box((-hw - p['TIE_OUT'], min(y0, y0 - sy * BM), EV - BM), (hw + p['TIE_OUT'], max(y0, y0 - sy * BM), EV))
            for sx in (-1, 1):                          # chunky log ends at the tie beam tips (hero)
                fr.log((sx * (hw + p['TIE_OUT'] - 0.1), y0 - sy * BM / 2, EV - BM / 2), (sx * (hw + p['TIE_OUT'] + 0.08), y0 - sy * BM / 2, EV - BM / 2), 0.19, 8)
        # door jambs and the heavy lintel (in the door frame)
        ROT[0] = ROTL
        yj = -hdl - pz - 0.05
        for x in (DX0 - JW / 2, DX1 + JW / 2):
            fr.box((x - JW / 2, yj, 0.0), (x + JW / 2, yj + 0.26, LZ))
        fr.box((DX0 - JW - 0.22, yj - 0.05, LZ), (DX1 + JW + 0.22, yj + 0.27, LZ + LH))
        ROT[0] = None
        # braces
        bw, bh = 0.15, 0.17
        for sy in (-1, 1):                              # gables: knee braces (short on the front, clear of the windows)
            y = sy * (hd + pz - 0.01)
            for sx in (-1, 1):
                span, drop = (0.5, 0.62) if sy < 0 else (0.85, 0.95)
                fr.beam((sx * (hw - 0.14), y, EV - drop), (sx * (hw - 0.14 - span), y, EV - BM + 0.02), bw, bh, up=(0, sy, 0))
                if sy > 0:
                    fr.beam((sx * (hw - 0.14), y, ZW0 + 0.9), (sx * (hw - 0.9), y, ZW0 - 0.02), bw, bh, up=(0, 1, 0))
        for sy in (-1, 1):                              # +X long side: top and foot braces at both corners
            x = hw + pz - 0.01
            fr.beam((x, sy * (hd - 0.16), EV - 1.0), (x, sy * (hd - 0.95), EV - BM + 0.02), bw, bh, up=(1, 0, 0))
            fr.beam((x, sy * (hd - 0.16), ZW0 + 0.95), (x, sy * (hd - 0.95), ZW0 - 0.02), bw, bh, up=(1, 0, 0))
        x = -hw - pz + 0.01                             # -X long side: braces only at the back corner (door + window)
        fr.beam((x, hd - 0.16, EV - 0.9), (x, hd - 0.9, EV - BM + 0.02), bw, bh, up=(-1, 0, 0))
        fr.beam((x, -hd + 0.16, EV - 0.55), (x, -hd + 0.6, EV - BM + 0.02), bw, bh, up=(-1, 0, 0))
        # gables: principal rafters; front gable V struts, back gable collar above the loft
        for sy in (-1, 1):
            yg = sy * (hd + pz + 0.02)
            for sx in (-1, 1):
                fr.beam((sx * (hw + 0.05), yg, z_under(hw + 0.05) - 0.12), (0, yg, zr - 0.08), 0.22, 0.24)
            if sy < 0:
                for sx in (-1, 1):
                    xe = sx * 1.05
                    fr.beam((sx * 0.18, yg, EV), (xe, yg, z_under(xe) - 0.16), 0.15, 0.17, up=(0, -1, 0))
                fr.box((-0.12, yg - 0.11, EV), (0.12, yg + 0.11, zr - 0.2))      # king post
            else:
                zc = EV + p['COLLAR_Z']; xc = hw - (zc + 0.1 - Z0) / t
                fr.box((-xc, yg - 0.11, zc), (xc, yg + 0.11, zc + 0.2))
        # ridge beam inside, common rafters and purlins
        fr.box((-0.1, -hd + 0.1, zr - 0.22), (0.1, hd - 0.1, zr))
        n = 4
        for k in range(n):
            y = -hd + 0.3 + k * (D - 0.6) / (n - 1)
            for sx in (-1, 1):
                xe = sx * (hw + p['EAVE_OH'] - 0.06)
                fr.beam((xe, y, z_under(xe) - 0.08), (0, y, zr - 0.08), 0.11, 0.16)
        for sx in (-1, 1):
            xb = sx * 1.0
            fr.box((xb - 0.08, yF + 0.1, z_under(xb) - 0.17), (xb + 0.08, yB - 0.1, z_under(xb) - 0.02))
        # dormer corner posts
        for yy in (dyc - DMW, dyc + DMW):
            fr.box((dxf - 0.05, yy - 0.09, EV), (dxf + 0.13, yy + 0.09, DWZ))

    # ------------------------------------------------------------------ roof: deck, shingles, bargeboards, ridge log, dormer roof
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Grey', 'roof')

        def slope(o, e, d, nrm, u0, u1, L, course, tabw, dk=0.10, cap=True):
            """A shingled slope: origin o at the ridge, e along the ridge (u0..u1), d down the slope (0..L), nrm out."""
            def P3(u, v, w):
                return tuple(o + e * u + d * v + nrm * w)
            nu = max(1, int(math.ceil((u1 - u0) / 0.6)))           # deck in strips so it follows the ridge sag
            for i in range(nu):
                a_, b_ = u0 + (u1 - u0) * i / nu, u0 + (u1 - u0) * (i + 1) / nu
                rf.hexa([P3(a_, 0, 0), P3(a_, L, 0), P3(b_, L, 0), P3(b_, 0, 0), P3(a_, 0, dk), P3(a_, L, dk), P3(b_, L, dk), P3(b_, 0, dk)])
            nC = int(math.ceil((L - 0.05) / course))
            for ci in range(nC):
                vb = L + 0.06 - ci * course
                vt = max(0.0, vb - course * 1.45)
                u = u0 - 0.06 + rnd.uniform(-0.15, 0.0)
                while u < u1 + 0.03:
                    w = rnd.uniform(*tabw); uu1 = min(u + w, u1 + 0.07)
                    if uu1 - u < 0.15:
                        break
                    g = 0.03; lift = p['TAB_LIFT'] * rnd.uniform(0.75, 1.2) * course / p['COURSE']; th = p['TAB_TH']
                    vbb = vb + rnd.uniform(-0.05, 0.05)
                    sk = rnd.uniform(-0.05, 0.05)
                    rf.hexa([P3(u + g / 2, vt, dk), P3(u + g / 2 + sk, vbb, dk + lift), P3(uu1 - g / 2 + sk, vbb, dk + lift), P3(uu1 - g / 2, vt, dk),
                             P3(u + g / 2, vt, dk + th), P3(u + g / 2 + sk, vbb, dk + lift + th), P3(uu1 - g / 2 + sk, vbb, dk + lift + th), P3(uu1 - g / 2, vt, dk + th)])
                    u = uu1
            return P3

        L = (hw + p['EAVE_OH']) / ca
        for sx in (-1, 1):
            o = Vector((0, 0, zr)); d = Vector((sx * ca, 0, -sa)); nrm = Vector((sx * sa, 0, ca)); e = Vector((0, 1, 0))
            P3 = slope(o, e, d, nrm, yF, yB, L, p['COURSE'], p['TAB_W'])
            dk = 0.10
            nu = 8
            for i in range(nu):                         # ridge cap, in strips
                a_, b_ = yF - 0.04 + (yB - yF + 0.08) * i / nu, yF - 0.04 + (yB - yF + 0.08) * (i + 1) / nu
                rf.hexa([P3(a_, -0.06, dk + 0.08), P3(a_, 0.42, dk + 0.08), P3(b_, 0.42, dk + 0.08), P3(b_, -0.06, dk + 0.08),
                         P3(a_, -0.06, dk + 0.2), P3(a_, 0.42, dk + 0.16), P3(b_, 0.42, dk + 0.16), P3(b_, -0.06, dk + 0.2)])
            for yy in (yF + 0.1, yB - 0.1):             # bargeboards under the rake edges
                tb.beam(P3(yy, L + 0.1, -0.1), P3(yy, -0.05, -0.1), 0.2, 0.26, up=tuple(nrm))
        # ridge log on top: overhangs the front and kicks up at both ends (hero)
        r = p['RIDGE_R']; zc = zr + 0.12 + 0.75 * r
        yf = yF - p['RIDGE_OH']; yb = yB + p['RIDGE_OH_B']
        prof = [(yf, p['RIDGE_KICK']), (yF + 0.4, 0.04)] + [(yF + 0.4 + (yB - yF - 0.9) * k / 5, 0.0) for k in range(1, 5)] + [(yB - 0.5, 0.0), (yb, p['RIDGE_KICK_B'])]
        for (ya, ka), (yb_, kb_) in zip(prof[:-1], prof[1:]):
            tb.log((0, ya - 0.02, zc + ka), (0, yb_ + 0.02, zc + kb_), r, 8)
        tb.log((0, yf - 0.02, zc + p['RIDGE_KICK']), (0, yf - 0.06, zc + p['RIDGE_KICK']), r * 0.7, 8)   # end ring
        tb.beam((0, -hd - 0.05, zr - 0.6), (0, yf + 0.25, zc + p['RIDGE_KICK'] * 0.5 - r), 0.18, 0.18)   # strut under the overhang
        # dormer roof: a little gable roof on the -X slope, ridge along X, over the doorway
        drp = math.atan2(p['DORM_RISE'], DMW); dca, dsa = math.cos(drp), math.sin(drp)
        dxb = -hw + (zr - DAP) / t + 0.25               # where the dormer ridge dies into the main roof
        DL = (DMW + 0.2) / dca
        for sy in (-1, 1):
            o = Vector((0, dyc, DAP + 0.05)); d = Vector((0, sy * dca, -dsa)); nrm = Vector((0, sy * dsa, dca)); e = Vector((1, 0, 0))
            P3 = slope(o, e, d, nrm, dxf - 0.32, dxb, DL, 0.36, (0.36, 0.5), dk=0.08)
            tb.beam(P3(dxf - 0.24, DL + 0.06, -0.08), P3(dxf - 0.24, -0.04, -0.08), 0.14, 0.18, up=tuple(nrm))
        tb.log((dxf - 0.42, dyc, DAP + 0.22), (dxb, dyc, DAP + 0.22), 0.12, 6)

    # ------------------------------------------------------------------ walls
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose', 'walls'); pk_b = part('plank_walls_dark', 'Plank_RoseDark', 'walls')
        T = p['PLANK_T']
        SPL = [ZW0 + k * (ZW1 - ZW0) / 3 for k in (1, 2)]

        def plank_run(ax, a0, a1, line, sgn, ztop_fn, zbot=ZW0, holes=(), split=False, pw=None):
            n = max(1, round((a1 - a0) / (pw or p['PLANK_W']))); w = (a1 - a0) / n
            for k in range(n):
                a, b = a0 + k * w, a0 + (k + 1) * w
                off = (0.014 if k % 2 else 0.0) + rnd.uniform(-0.005, 0.005)
                outer = line + sgn * off; inner = line - sgn * T
                zt0, zt1 = ztop_fn(a), ztop_fn(b)
                segs = [(zbot, None)]
                for hx0, hx1, hz0, hz1 in holes:
                    if b > hx0 + 0.01 and a < hx1 - 0.01:
                        hz1v = hz1(a, b) if callable(hz1) else hz1
                        segs = [(zbot, hz0), (hz1v, None)]
                cut = []
                for z0, z1 in segs:
                    zt = z1 if z1 is not None else min(zt0, zt1)
                    edges = [z0] + ([zz for zz in SPL if z0 + 0.08 < zz < zt - 0.08] if split else []) + [z1]
                    cut += list(zip(edges[:-1], edges[1:]))
                for z0, z1 in cut:
                    if z1 is not None and z1 - z0 < 0.03:
                        continue
                    if z1 is None and min(zt0, zt1) - z0 < 0.03:
                        continue
                    pts = [(a + 0.008, z0), (b - 0.008, z0), (b - 0.008, z1 if z1 else zt1), (a + 0.008, z1 if z1 else zt0)]
                    (pk_b if k % 2 else pk_a).prism(pts, min(outer, inner), max(outer, inner), 'y' if ax == 'x' else 'x')
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.04
        winF = [(sx * fwx - fww / 2 - 0.02, sx * fwx + fww / 2 + 0.02, fz0, fz1) for sx in (-1, 1)]
        winB = (bwx - bww / 2 - 0.02, bwx + bww / 2 + 0.02, bz0, bz0 + bwh)
        loft = (LX0, LX1, LZ0, LZ1)
        plank_run('x', -hw, hw, -hd, -1, flat, holes=winF, split=True)
        plank_run('x', -hw, hw, hd, 1, flat, holes=[winB], split=True)
        plank_run('x', -hw + 0.1, hw - 0.1, -hd, -1, rake, zbot=EV - 0.02)
        plank_run('x', -hw + 0.1, hw - 0.1, hd, 1, rake, zbot=EV - 0.02, holes=[loft])
        door_hole = (DY0 - JW, DY1 + JW, -1.0, LZ + LH)
        winL = (lwy - lww / 2 - 0.02, lwy + lww / 2 + 0.02, 1.15, 1.15 + lwh)
        plank_run('y', -hd, hd, -hw, -1, flat, holes=[door_hole, winL])
        plank_run('y', -hd, hd, hw, 1, flat, split=True)
        for sx in (-1, 1):
            plank_run('y', -hd, hd, sx * (hw - 0.03), sx, lambda a: z_under(hw) - 0.02, zbot=EV - 0.04)

        sh = part('interior_shadow', 'Plank_Shadow', 'walls'); tr = part('loft_trim', 'Timber_Grey', 'walls')

        def wbox(prt, wall, a0, a1, o0, o1, z0, z1):
            """box on a wall: a along the wall, o outward from the wall line (negative = inside)."""
            if wall == 'F':
                prt.box((a0, -hd - o1, z0), (a1, -hd - o0, z1))
            elif wall == 'B':
                prt.box((a0, hd + o0, z0), (a1, hd + o1, z1))
            else:   # 'L', the -X wall, a = global y
                prt.box((-hw - o1, a0, z0), (-hw - o0, a1, z1))

        def window(wall, ac, w, z0, z1, cross=True):
            """oversized storybook window: dark pane set back, chunky frame, big head and sill, cross bars."""
            a0, a1 = ac - w / 2, ac + w / 2
            wbox(sh, wall, a0, a1, -0.2, -0.16, z0, z1)
            wbox(sh, wall, a0 - 0.03, a0, -0.2, 0.0, z0, z1); wbox(sh, wall, a1, a1 + 0.03, -0.2, 0.0, z0, z1)
            wbox(sh, wall, a0, a1, -0.2, 0.0, z0 - 0.03, z0); wbox(sh, wall, a0, a1, -0.2, 0.0, z1, z1 + 0.03)
            fw = 0.11
            wbox(tr, wall, a0 - fw, a0, -0.02, 0.08, z0 - 0.02, z1 + 0.02); wbox(tr, wall, a1, a1 + fw, -0.02, 0.08, z0 - 0.02, z1 + 0.02)
            wbox(tr, wall, a0 - fw - 0.1, a1 + fw + 0.1, -0.02, 0.12, z1, z1 + 0.14)          # head
            wbox(tr, wall, a0 - fw - 0.08, a1 + fw + 0.08, -0.02, 0.16, z0 - 0.12, z0)        # sill
            if cross:
                wbox(tr, wall, ac - 0.025, ac + 0.025, -0.17, -0.12, z0, z1)
                wbox(tr, wall, a0, a1, -0.17, -0.12, (z0 + z1) / 2 - 0.025, (z0 + z1) / 2 + 0.025)

        for sx in (-1, 1):
            window('F', sx * fwx, fww, fz0, fz1)
        window('B', bwx, bww, bz0, bz0 + bwh)
        window('L', lwy, lww, 1.15, 1.15 + lwh)

        # back gable hay loft: dark opening, hay mound, trim and ledge
        yl = hd + 0.01
        sh.box((LX0, hd - 0.36, LZ0), (LX1, hd - 0.32, LZ1))
        sh.box((LX0 - 0.03, hd - 0.36, LZ0), (LX0, yl - 0.02, LZ1)); sh.box((LX1, hd - 0.36, LZ0), (LX1 + 0.03, yl - 0.02, LZ1))
        sh.box((LX0, hd - 0.36, LZ1), (LX1, yl - 0.02, LZ1 + 0.03))
        hay = part('hay', 'Hay_Straw', 'walls')
        hay.cbox((LX0 + 0.02, hd - 0.34, LZ0 - 0.02), (LX1 - 0.02, hd + 0.04, LZ0 + 0.36), 0.14)
        tr.box((LX0 - 0.13, yl - 0.02, LZ0 - 0.05), (LX0, yl + 0.08, LZ1 + 0.1))
        tr.box((LX1, yl - 0.02, LZ0 - 0.05), (LX1 + 0.13, yl + 0.08, LZ1 + 0.1))
        tr.box((LX0 - 0.18, yl - 0.02, LZ1), (LX1 + 0.18, yl + 0.1, LZ1 + 0.13))
        tr.box((LX0 - 0.2, yl - 0.02, LZ0 - 0.12), (LX1 + 0.2, yl + 0.2, LZ0))

        # dormer on the -X slope: plank front with an arched hayloft opening, plank cheeks, ledge and a fork
        ow, oz0, oz1 = 0.42, EV + 0.6, EV + 1.2          # arched opening: half width, sill, spring line
        def arch(yy):
            q = min(1.0, abs(yy - dyc) / ow)
            return oz1 + ow * 1.05 * math.sqrt(max(0.0, 1 - q * q))
        def dtop(yy):
            q = abs(yy - dyc) / DMW
            return DWZ + (DAP - DWZ) * max(0.0, 1 - q)
        n = 8; w = 2 * DMW / n
        for k in range(n):
            a, b = dyc - DMW + k * w, dyc - DMW + (k + 1) * w
            pk = pk_b if k % 2 else pk_a; off = 0.014 if k % 2 else 0.0
            x0, x1 = dxf - 0.07 - off, dxf
            segs = []
            if b > dyc - ow + 0.01 and a < dyc + ow - 0.01:
                segs.append([(a + 0.006, EV - 0.05), (b - 0.006, EV - 0.05), (b - 0.006, oz0), (a + 0.006, oz0)])
                ta, tb_ = arch(a + 0.006), arch(b - 0.006)
                pts = [(a + 0.006, ta), (b - 0.006, tb_), (b - 0.006, dtop(b)), (a + 0.006, dtop(a))]
                if a < dyc < b:
                    pts = [(a + 0.006, ta), (dyc, arch(dyc)), (b - 0.006, tb_), (b - 0.006, dtop(b)), (dyc, DAP - 0.02), (a + 0.006, dtop(a))]
                segs.append(pts)
            else:
                pts = [(a + 0.006, EV - 0.05), (b - 0.006, EV - 0.05), (b - 0.006, dtop(b)), (a + 0.006, dtop(a))]
                segs.append(pts)
            for pts in segs:
                pk.prism(pts, x0, x1, 'x')
        for sy in (-1, 1):                                  # cheek walls back into the roof
            yy = dyc + sy * DMW
            nn = 4; ww = 1.0 / nn
            for k in range(nn):
                xa, xb = dxf + k * ww, dxf + (k + 1) * ww
                (pk_b if k % 2 else pk_a).prism([(xa, EV - 0.05), (xb, EV - 0.05), (xb, DWZ), (xa, DWZ)], yy - (0.07 if sy > 0 else 0), yy + (0.07 if sy < 0 else 0), 'y')
        # dark inside behind the arch
        dbk = dxf + 0.22
        sh.box((dbk, dyc - ow - 0.04, oz0), (dbk + 0.04, dyc + ow + 0.04, oz1 + ow * 1.1))
        sh.box((dxf - 0.02, dyc - ow - 0.04, oz0 - 0.03), (dbk, dyc - ow, oz1 + ow * 1.1))
        sh.box((dxf - 0.02, dyc + ow, oz0 - 0.03), (dbk, dyc + ow + 0.04, oz1 + ow * 1.1))
        sh.box((dxf - 0.02, dyc - ow, oz1 + ow * 1.06), (dbk, dyc + ow, oz1 + ow * 1.1))
        sh.box((dxf - 0.02, dyc - ow, oz0 - 0.03), (dbk, dyc + ow, oz0))
        # arch trim
        xt = dxf - 0.12
        ring = [(dyc - ow - 0.06, oz0)] + [(dyc - (ow + 0.06) * math.cos(math.pi * k / 6), oz1 + (ow * 1.05 + 0.06) * math.sin(math.pi * k / 6)) for k in range(7)] + [(dyc + ow + 0.06, oz0)]
        for (ya, za), (yb_, zb) in zip(ring[:-1], ring[1:]):
            tr.beam((xt, ya, za), (xt, yb_, zb), 0.12, 0.12, up=(-1, 0, 0))
        tr.box((dxf - 0.52, dyc - ow - 0.2, oz0 - 0.12), (dxf, dyc + ow + 0.2, oz0 - 0.01))       # ledge board
        for sy in (-1, 1):
            tr.beam((dxf - 0.02, dyc + sy * (ow + 0.05), oz0 - 0.5), (dxf - 0.4, dyc + sy * (ow + 0.05), oz0 - 0.1), 0.07, 0.08, up=(-1, 0, 0))
        bn = part('bench', 'Timber_Bench', 'walls'); ir = part('iron', 'Metal_Iron', 'walls')
        bn.beam((dxf + 0.1, dyc - 0.12, oz0 + 0.05), (dxf - 0.62, dyc + 0.38, oz0 + 0.72), 0.06, 0.06)   # pitchfork resting on the ledge
        ir.beam((dxf - 0.6, dyc + 0.37, oz0 + 0.7), (dxf - 0.8, dyc + 0.51, oz0 + 0.9), 0.16, 0.04)

        # doorway recess on the -X wall, built in the door frame
        ROT[0] = ROTL
        ip = part('interior', 'Plank_Interior', 'walls')
        yi = -hdl + p['REC_D']
        x0, x1 = DX0 - 0.02, DX1 + 0.02
        n = 7; w = (x1 - x0) / n
        for k in range(n):
            dd = 0.02 if k % 2 else 0.0
            ip.box((x0 + k * w + 0.008, yi + dd, 0.08), (x0 + (k + 1) * w - 0.008, yi + 0.05 + dd, LZ + 0.02))
        ip.box((x0 - 0.05, -hdl + 0.03, 0.08), (x0, yi + 0.05, LZ + 0.02))
        ip.box((x1, -hdl + 0.03, 0.08), (x1 + 0.05, yi + 0.05, LZ + 0.02))
        sh.box((x0 - 0.05, -hdl + 0.03, LZ), (x1 + 0.05, yi + 0.05, LZ + 0.05))
        yr = yi - 0.05
        bn.box((x0 + 0.15, yr - 0.03, 1.62), (x1 - 0.25, yr + 0.05, 1.74))
        bn.box((x0 + 0.15, yr - 0.03, 1.98), (x1 - 0.25, yr + 0.05, 2.08))
        tx = x0 + 0.3
        for kind in ['saw', 'hammer', 'axe', 'stick', 'hammer', 'saw', 'stick', 'axe']:
            if tx > x1 - 0.35:
                break
            if kind == 'saw':
                ir.box((tx - 0.14, yr - 0.07, 1.10), (tx + 0.12, yr - 0.05, 1.62))
                bn.box((tx - 0.07, yr - 0.09, 1.56), (tx + 0.07, yr - 0.04, 1.74))
                tx += 0.32
            else:
                ln = {'hammer': 0.45, 'axe': 0.6, 'stick': 0.75}[kind]
                bn.box((tx - 0.04, yr - 0.08, 1.68 - ln), (tx + 0.04, yr - 0.03, 1.74))
                if kind == 'hammer':
                    ir.box((tx - 0.11, yr - 0.1, 1.68 - ln - 0.07), (tx + 0.11, yr - 0.03, 1.68 - ln + 0.03))
                elif kind == 'axe':
                    ir.box((tx - 0.02, yr - 0.1, 1.68 - ln), (tx + 0.19, yr - 0.03, 1.68 - ln + 0.19))
                else:
                    ir.box((tx - 0.08, yr - 0.08, 1.68 - ln - 0.14), (tx + 0.08, yr - 0.04, 1.68 - ln))
                tx += 0.22
        # chubby workbench with a vise and a block
        bx0, bx1 = x0 + 0.12, x0 + 1.4; by0, by1 = yi - 0.62, yi - 0.03; zt = 0.86
        bn.cbox((bx0 - 0.04, by0 - 0.04, zt), (bx1 + 0.04, by1, zt + 0.12), 0.04)
        for lx in (bx0 + 0.04, bx1 - 0.14):
            for ly in (by0 + 0.04, by1 - 0.14):
                bn.box((lx, ly, 0.1), (lx + 0.1, ly + 0.1, zt))
        bn.box((bx0 + 0.08, by0 + 0.08, 0.28), (bx1 - 0.08, by1 - 0.08, 0.34))
        bn.cbox((bx0 + 0.15, by0 + 0.1, zt + 0.12), (bx0 + 0.52, by0 + 0.36, zt + 0.28), 0.04)
        ir.box((bx1 - 0.32, by0 - 0.06, zt - 0.06), (bx1 - 0.1, by0 + 0.12, zt + 0.18))
        ir.box((bx1 - 0.25, by0 - 0.17, zt + 0.02), (bx1 - 0.17, by0 - 0.06, zt + 0.1))
        bn.box((x1 - 0.36, yi - 0.36, 0.1), (x1 - 0.08, yi - 0.08, 0.48))
        # the plank door leaf, hung on the back (+Y, local left) jamb and swung open outward
        lf = part('door_leaf', 'Plank_Rose', 'walls')
        a = math.radians(p['LEAF_OPEN'])
        hinge = Vector((DX0 - 0.02, -hdl - pz - 0.08, 0.0))
        u = Vector((-math.cos(a), -math.sin(a), 0)); v = Vector((-math.sin(a), math.cos(a), 0))
        LW = p['LEAF_W']; zb, ztl = 0.12, LZ - 0.02; n = 3; pw = LW / n
        for k in range(n):
            lf.obox(hinge, u, v, (k * pw + 0.012, -0.08, zb + (0.03 if k % 2 else 0)), ((k + 1) * pw - 0.012, 0.0, ztl - (0.04 if k == 1 else 0)))
        lt = part('door_ledges', 'Timber_Grey', 'walls')
        for zz in (zb + 0.2, ztl - 0.36):
            lt.obox(hinge, u, v, (0.04, -0.14, zz), (LW - 0.04, -0.08, zz + 0.17))
        d0 = hinge + u * 0.14 + Vector((0, 0, zb + 0.36)) - v * 0.11
        d1 = hinge + u * (LW - 0.14) + Vector((0, 0, ztl - 0.38)) - v * 0.11
        lt.beam(tuple(d0), tuple(d1), 0.06, 0.15, up=tuple(-v))
        for zz in (zb + 0.24, ztl - 0.32):
            ir.obox(hinge, u, v, (-0.04, -0.16, zz), (0.6, -0.14, zz + 0.08))
        ir.obox(hinge, u, v, (LW - 0.18, -0.17, 1.05), (LW - 0.08, -0.08, 1.14))
        ROT[0] = None

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

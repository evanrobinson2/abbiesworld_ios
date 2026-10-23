"""goat-house-open: Evan's goat house (Ranch remaster R3). Terracotta plank walls, a teal shingle gable over the back
half, a flat railed plank deck over the front half, a plank ramp up the open side to the deck, the back half of the
-X side left open (straw floor and a hay rack inside), a small Dutch door on the front and a brass bell beside it.

usage: python build.py            builds every construction stage, writes goat-house-open.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only

Z up, metres (= game metres for the goat-shelter family, 1.5 m per file unit), origin at the centre of the footprint
on the ground, front (door, bell) faces -Y. The whole footprint (ramp and roof overhangs included) is 3.92 x 3.24 m so
that to_game.py lands it on the old goat shelter's 2.615 x 2.16 file units. Shape numbers live in P.
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    X0=-0.46, X1=1.72,     # body (outer plank faces) along X; the ramp runs off the -X side
    Y0=-1.40, Y1=1.20,     # body along Y (front wall at Y0)
    PLATE=1.85,            # top of the wall plates
    DECK_T=0.12,           # deck joists + boards above the plates
    DECK_OH=0.07,          # deck boards overhang the walls
    DECK_Y1=-0.16,         # back edge of the deck (where the roof's front eave lands)
    PITCH=40.0,
    ROOF_OH_B=0.31,        # back eave overhang (horizontal)
    ROOF_OH_X=0.24,        # gable overhang on both ends
    POST=0.17, PLANK_W=0.25, PLANK_T=0.06,
    DOOR_X=(0.45, 1.20), DOOR_H=1.62, GATE_H=0.95,
    OPEN_Y0=-0.16,         # the -X side is open from here to the back corner
    RAMP_W=0.70, RAMP_Y=-1.00, RAMP_FOOT_X=-1.86, RAMP_FOOT_DY=0.30,
    RAIL_H=0.62,
    COURSE=0.27, TAB_W=(0.34, 0.46), TAB_TH=0.06, TAB_LIFT=0.06,
    BELL_X=1.45, BELL_Z=1.42,
)

COL = {  # sRGB
    'Wall_Terracotta': (0xc9, 0x69, 0x4f), 'Post_Terracotta': (0xb4, 0x58, 0x40), 'Door_Plank': (0xd8, 0x7e, 0x60),
    'Roof_Teal': (58, 150, 146), 'Roof_TealDark': (40, 112, 112), 'Deck_Wood': (196, 146, 100), 'Rail_Wood': (146, 98, 60),
    'Ramp_Wood': (204, 150, 98), 'Gable_Wood': (128, 84, 50), 'Straw': (214, 176, 96), 'Hay_Rack': (170, 128, 70),
    'Rack_Wood': (120, 78, 46), 'Bell_Brass': (214, 160, 52), 'Iron_Dark': (58, 46, 40), 'Rope_String': (226, 214, 180),
    'Stake_Wood': (150, 110, 70),
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
        b.inputs['Roughness'].default_value = 0.85 if 'Brass' not in name else 0.45
        if 'Brass' in name:
            b.inputs['Metallic'].default_value = 0.6
        MATS[name] = m
    return MATS[name]


class Part:
    """Boxes/prisms collected into one bmesh -> one object, one material. bevel > 0: chamfered edges with hardened
    (authored) normals, so the flat faces stay flat and the edges catch a soft highlight; smooth: shaded smooth."""
    def __init__(self, name, material, bevel=0.0, smooth=False):
        self.name, self.material, self.bevel, self.smooth = name, material, bevel, smooth
        self.bm = bmesh.new()

    def poly(self, verts, faces):
        vs = [self.bm.verts.new(Vector(v)) for v in verts]
        for f in faces:
            try:
                self.bm.faces.new([vs[i] for i in f])
            except ValueError:
                pass

    def hexa(self, c):
        self.poly(c, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])

    def box(self, lo, hi, rot=None, pivot=None):
        x0, y0, z0 = lo; x1, y1, z1 = hi
        c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        if rot is not None:
            pv = Vector(pivot if pivot else ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
            c = [tuple(rot @ (Vector(p) - pv) + pv) for p in c]
        self.hexa(c)

    def beam(self, a, b, w, h, up=(0, 0, 1)):
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

    def prism(self, pts, a0, a1, ax):
        n = len(pts)
        if ax == 'y':
            v = [(u, a0, z) for u, z in pts] + [(u, a1, z) for u, z in pts]
        else:
            v = [(a0, u, z) for u, z in pts] + [(a1, u, z) for u, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def blob(self, centre, size, subdiv=1, squash=None, rnd=None):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
        for v in bm.verts:
            co = v.co.copy()
            if rnd:
                co *= 1 + rnd.uniform(-0.08, 0.08)
            if squash:
                co = squash(co)
            v.co = Vector((centre[0] + co.x * size[0], centre[1] + co.y * size[1], centre[2] + co.z * size[2]))
        self.merge(bm)

    def cone(self, centre, r0, r1, h, n=10, cap=True):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=n, radius1=r0, radius2=r1, depth=h)
        for v in bm.verts:
            v.co += Vector(centre)
        self.merge(bm)

    def merge(self, bm):
        base = len(self.bm.verts)
        for v in bm.verts:
            self.bm.verts.new(v.co)
        self.bm.verts.ensure_lookup_table(); bm.verts.ensure_lookup_table()
        for f in bm.faces:
            self.bm.faces.new([self.bm.verts[base + v.index] for v in f.verts])
        bm.free()

    def finish(self):
        if not self.bm.faces:
            self.bm.free(); return None
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for poly in me.polygons:
            poly.use_smooth = self.smooth or self.bevel > 0
        ob = bpy.data.objects.new(self.name, me); ob.data.materials.append(mat(self.material))
        bpy.context.scene.collection.objects.link(ob)
        if self.bevel > 0:
            md = ob.modifiers.new('bevel', 'BEVEL'); md.width = self.bevel; md.segments = 1
            md.limit_method = 'ANGLE'; md.angle_limit = math.radians(40); md.harden_normals = True
            md.miter_outer = 'MITER_ARC'
        return ob


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    rnd = random.Random(7)
    p = P; want = GROUPS[state]; parts = {}

    def part(name, material, bevel=0.0, smooth=False):
        if name not in parts:
            parts[name] = Part(name, material, bevel, smooth)
        return parts[name]

    X0, X1, Y0, Y1 = p['X0'], p['X1'], p['Y0'], p['Y1']
    PO, T, PW = p['POST'], p['PLANK_T'], p['PLANK_W']
    PL = p['PLATE']; DT = PL + p['DECK_T']          # deck top
    t = math.tan(math.radians(p['PITCH']))
    yE = p['DECK_Y1']                                # roof front eave line = deck back edge
    yR = (yE + Y1) / 2                               # ridge line
    zE = DT + 0.01                                   # roof underside at the front eave
    zR = zE + (yR - yE) * t                          # roof underside at the ridge
    def zroof(y):
        return zR - abs(y - yR) * t
    zB = zroof(Y1)                                   # roof underside over the back wall
    yBE = Y1 + p['ROOF_OH_B']
    po = PO / 2
    corners = [(X0 + po, Y0 + po), (X1 - po, Y0 + po), (X1 - po, Y1 - po), (X0 + po, Y1 - po)]
    DX0, DX1 = p['DOOR_X']

    # ---------------------------------------------------------------- planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Stake_Wood'); rp = part('string_lines', 'Rope_String')
        cs = [(X0 - 0.1, Y0 - 0.1), (X1 + 0.1, Y0 - 0.1), (X1 + 0.1, Y1 + 0.1), (X0 - 0.1, Y1 + 0.1)]
        for x, y in cs:
            st.box((x - 0.04, y - 0.04, 0), (x + 0.04, y + 0.04, 0.5))
        for i in range(4):
            (xa, ya), (xb, yb) = cs[i], cs[(i + 1) % 4]
            rp.beam((xa, ya, 0.42), (xb, yb, 0.42), 0.016, 0.016)
        fx = p['RAMP_FOOT_X']; ry = p['RAMP_Y']
        rp.beam((X0 - 0.1, ry, 0.03), (fx, ry, 0.03), 0.014, 0.014)        # where the ramp will land
        st.box((fx - 0.03, ry - 0.03, 0), (fx + 0.03, ry + 0.03, 0.22))

    # ---------------------------------------------------------------- foundation: sills and the floor
    if 'foundation' in want:
        sl = part('sills', 'Post_Terracotta', bevel=0.02)
        sl.box((X0, Y0, 0), (X1, Y0 + 0.16, 0.12)); sl.box((X0, Y1 - 0.16, 0), (X1, Y1, 0.12))
        sl.box((X0, Y0 + 0.16, 0), (X0 + 0.16, Y1 - 0.16, 0.12)); sl.box((X1 - 0.16, Y0 + 0.16, 0), (X1, Y1 - 0.16, 0.12))
        fl = part('floor', 'Deck_Wood')
        fl.box((X0 + 0.16, Y0 + 0.16, 0.0), (X1 - 0.16, Y1 - 0.16, 0.08))

    # ---------------------------------------------------------------- frame: posts, plates, deck joists, rafters
    if 'frame' in want:
        fr = part('posts', 'Post_Terracotta', bevel=0.022)
        for i, (x, y) in enumerate(corners):
            fr.box((x - po - 0.02, y - po - 0.02, 0), (x + po + 0.02, y + po + 0.02, PL + (0 if i < 2 else zB - PL)))
        # mid posts on both sides where the roof meets the deck (the open side's front jamb)
        for x in (X0 + po, X1 - po):
            fr.box((x - po, yE - po, 0), (x + po, yE + po, DT if x < 0 else PL))
        # door posts
        for x in (DX0 - 0.06, DX1 + 0.06):
            fr.box((x - 0.07, Y0 - 0.03, 0), (x + 0.07, Y0 + 0.13, PL))
        pl = part('plates', 'Post_Terracotta', bevel=0.02)
        pl.box((X0 - 0.03, Y0 - 0.04, PL - 0.16), (X1 + 0.03, Y0 + 0.14, PL))                   # front plate
        pl.box((X0 - 0.04, Y0, PL - 0.16), (X0 + 0.14, Y1, PL))                                   # -X plate (open side head)
        pl.box((X1 - 0.14, Y0, PL - 0.16), (X1 + 0.04, Y1, PL))
        pl.box((X0, Y1 - 0.14, zB - 0.16), (X1, Y1 + 0.03, zB))                                   # back plate
        pl.box((X0 - 0.04, yE - 0.08, PL - 0.02), (X1 + 0.04, yE + 0.08, DT - 0.03))              # deck back beam
        # knee braces in the open side
        pl.beam((X0 + 0.02, Y1 - PO - 0.02, PL - 0.62), (X0 + 0.02, Y1 - PO - 0.5, PL - 0.12), 0.11, 0.11, (1, 0, 0))
        pl.beam((X0 + 0.02, yE + po + 0.02, PL - 0.62), (X0 + 0.02, yE + po + 0.5, PL - 0.12), 0.11, 0.11, (1, 0, 0))
        # deck joists
        dj = part('deck_joists', 'Rail_Wood')
        for x in (X0 + 0.45, X0 + 1.0, X0 + 1.55):
            dj.box((x - 0.05, Y0, PL), (x + 0.05, yE, DT - 0.04))
        # ridge beam + gable rafters (bargeboards)
        rf = part('ridge_rafters', 'Rail_Wood', bevel=0.02)
        xa, xb = X0 - p['ROOF_OH_X'], X1 + p['ROOF_OH_X']
        rf.box((X0 - 0.05, yR - 0.06, zR - 0.2), (X1 + 0.05, yR + 0.06, zR))
        for x in (X0 + 0.04, X1 - 0.04):
            rf.beam((x, yE + 0.05, zroof(yE + 0.05) - 0.09), (x, yR, zR - 0.09), 0.1, 0.16, (0, 0, 1))
            rf.beam((x, yR, zR - 0.09), (x, Y1, zB - 0.09), 0.1, 0.16, (0, 0, 1))

    # ---------------------------------------------------------------- roof: roof boards, shingles, deck boards
    if 'roof' in want:
        xa, xb = X0 - p['ROOF_OH_X'], X1 + p['ROOF_OH_X']
        rb = part('roof_boards', 'Roof_TealDark')
        ca = math.cos(math.radians(p['PITCH']))
        # two slopes as thin slabs
        for ys, ye in ((yE - 0.02, yR), (yR, yBE)):
            a = (ys, zroof(ys)); b = (ye, zroof(ye))
            nrm = Vector((0, -(b[1] - a[1]), (b[0] - a[0]))).normalized()
            if nrm.z < 0: nrm = -nrm
            off = nrm * 0.05
            pts = [(a[0], a[1]), (b[0], b[1]), (b[0] + off.y, b[1] + off.z), (a[0] + off.y, a[1] + off.z)]
            rb.prism(pts, xa, xb, 'x')
        # shingles: staggered courses of chunky tabs, laid from the eaves up
        sh = part('shingles', 'Roof_Teal'); shd = part('shingles_dark', 'Roof_TealDark')
        th, lift = p['TAB_TH'], p['TAB_LIFT']
        for ys, ye in ((yE - 0.04, yR), (yBE + 0.02, yR)):
            L = abs(ye - ys) / ca; n = max(2, round(L / p['COURSE']))
            sgn = 1 if ye > ys else -1
            ang = math.radians(p['PITCH']) * sgn
            for c in range(n):
                s0 = c * L / n; s1 = min(L, s0 + L / n + 0.1)
                y0c, y1c = ys + sgn * s0 * ca, ys + sgn * s1 * ca
                x = xa - (0.0 if c % 2 == 0 else 0.18)
                while x < xb - 0.05:
                    w = rnd.uniform(*p['TAB_W']); xe = min(x + w, xb)
                    if xe - max(x, xa) > 0.12:
                        za, zb = zroof(y0c) + 0.05, zroof(y1c) + 0.05
                        a = Vector((max(x, xa) + 0.01, y0c, za)); b = Vector((xe - 0.01, y1c, zb))
                        # a slab along the slope, butt lifted a little, a small random twist
                        mid = (a + b) / 2; dirv = Vector((0, y1c - y0c, zb - za)); Ls = dirv.length; dirv.normalize()
                        up = Vector((0, -dirv.z * sgn, dirv.y * sgn)) if sgn > 0 else Vector((0, dirv.z, -dirv.y))
                        if up.z < 0: up = -up
                        tilt = Matrix.Rotation(math.radians(rnd.uniform(-5, 5)), 3, dirv) @ Matrix.Rotation(math.radians(rnd.uniform(-3, 3)), 3, up)
                        hw2 = (b.x - a.x) / 2
                        cs = []
                        for sz in (0, 1):
                            for (sx, sl) in ((-1, 0), (1, 0), (1, 1), (-1, 1)):
                                base = Vector((mid.x + sx * hw2, 0, 0))
                                ctr = Vector((0, y0c, za)) + dirv * (sl * Ls) + up * (lift * (1 - sl))
                                v = Vector((base.x, ctr.y, ctr.z)) + up * (sz * th)
                                v = tilt @ (v - mid) + mid
                                cs.append(tuple(v))
                        (shd if rnd.random() < 0.22 else sh).hexa(cs)
                    x = xe
        # ridge cap
        rc = part('ridge_cap', 'Roof_TealDark', bevel=0.015)
        rc.beam((xa - 0.02, yR, zR + 0.13), (xb + 0.02, yR, zR + 0.13), 0.2, 0.1)
        # deck boards (planks along X) and a fascia
        dk = part('deck_boards', 'Deck_Wood', bevel=0.012)
        y = Y0 - p['DECK_OH']; k = 0
        while y < yE - 0.02:
            ye = min(yE, y + 0.25); dz = rnd.uniform(-0.008, 0.008)
            dk.box((X0 - p['DECK_OH'] + rnd.uniform(-0.03, 0.02), y + 0.006, DT - 0.05 + dz),
                   (X1 + p['DECK_OH'] + rnd.uniform(-0.02, 0.03), ye - 0.006, DT + dz))
            y = ye; k += 1

    # ---------------------------------------------------------------- complete: walls, door, rail, ramp, interior
    if 'walls' in want:
        wl = part('walls', 'Wall_Terracotta')

        def planks_x(xs, xe, y, z0, z1, skip=None):          # vertical planks along X in the plane y..y+T
            x = xs
            while x < xe - 0.03:
                w = min(PW * rnd.uniform(0.85, 1.15), xe - x)
                if xe - (x + w) < 0.1: w = xe - x
                c = x + w / 2
                if not (skip and skip[0] - 0.01 < c < skip[1] + 0.01):
                    wl.box((x + 0.008, y, z0), (x + w - 0.008, y + T, z1 + rnd.uniform(-0.03, 0.0)))
                elif skip:
                    wl.box((x + 0.008, y, skip[2]), (x + w - 0.008, y + T, z1))
                x += w

        def planks_y(ys, ye, x, z0, z1, ztop=None):
            y = ys
            while y < ye - 0.03:
                w = min(PW * rnd.uniform(0.85, 1.15), ye - y)
                if ye - (y + w) < 0.1: w = ye - y
                zt = ztop(y + w / 2) if ztop else z1
                wl.box((x, y + 0.008, z0), (x + T, y + w - 0.008, zt + rnd.uniform(-0.03, 0.0)))
                y += w

        # front wall with the doorway (planks above the door from DOOR_H)
        planks_x(X0 + 0.05, X1 - 0.05, Y0 + 0.02, 0.06, PL - 0.14, skip=(DX0, DX1, p['DOOR_H']))
        # +X side, full height under the plate (back half up to the roof)
        planks_y(Y0 + 0.05, Y1 - 0.05, X1 - T - 0.02, 0.06, PL - 0.14,
                 ztop=lambda y: PL - 0.14 if y < yE else zroof(y) - 0.02)
        # back wall
        planks_x(X0 + 0.05, X1 - 0.05, Y1 - T - 0.02, 0.06, zB - 0.14)
        # -X side: closed in front of the mid post, open behind it
        planks_y(Y0 + 0.05, yE - 0.02, X0 + 0.02, 0.06, PL - 0.14)
        # gable over the open side: dark board infill between the plate and the rafters
        gb = part('gable_boards', 'Gable_Wood')
        y = yE + 0.04
        while y < Y1 - 0.04:
            w = min(0.22, Y1 - 0.04 - y); zt = min(zroof(y), zroof(y + w)) - 0.04
            if zt > PL + 0.05:
                gb.box((X0 + 0.04, y + 0.006, PL - 0.02), (X0 + 0.04 + 0.05, y + w - 0.006, zt))
            y += w
        # Dutch door: the lower leaf closed, the upper leaf open (dark doorway above)
        dr = part('door', 'Door_Plank', bevel=0.012)
        n = 3; w = (DX1 - DX0) / n
        for i in range(n):
            dr.box((DX0 + i * w + 0.01, Y0 + 0.0, 0.1), (DX0 + (i + 1) * w - 0.01, Y0 + 0.05, p['GATE_H'] + rnd.uniform(-0.03, 0.01)))
        dr.box((DX0, Y0 - 0.04, 0.22), (DX1, Y0 + 0.0, 0.32)); dr.box((DX0, Y0 - 0.04, p['GATE_H'] - 0.2), (DX1, Y0, p['GATE_H'] - 0.1))
        dr.beam((DX0 + 0.06, Y0 - 0.03, 0.3), (DX1 - 0.06, Y0 - 0.03, p['GATE_H'] - 0.18), 0.08, 0.03, (0, -1, 0))
        dr.box((DX0 - 0.13, Y0 - 0.05, p['DOOR_H']), (DX1 + 0.13, Y0 + 0.12, p['DOOR_H'] + 0.12))     # lintel
        ir = part('door_iron', 'Iron_Dark')
        for z in (0.27, p['GATE_H'] - 0.15):
            ir.box((DX0 - 0.02, Y0 - 0.06, z - 0.025), (DX0 + 0.2, Y0 - 0.04, z + 0.025))
        ir.box((DX1 - 0.16, Y0 - 0.08, 0.55), (DX1 - 0.1, Y0 - 0.04, 0.62))                              # latch
        # bell on a bracket to the right of the door
        ir.box((p['BELL_X'] - 0.03, Y0 - 0.02, p['BELL_Z'] + 0.02), (p['BELL_X'] + 0.03, Y0 + 0.02, p['BELL_Z'] + 0.16))
        ir.box((p['BELL_X'] - 0.025, Y0 - 0.13, p['BELL_Z'] + 0.12), (p['BELL_X'] + 0.025, Y0, p['BELL_Z'] + 0.16))
        bl = part('bell', 'Bell_Brass', smooth=True)
        bx, by, bz = p['BELL_X'], Y0 - 0.11, p['BELL_Z']
        bl.cone((bx, by, bz - 0.04), 0.115, 0.06, 0.2, n=10, cap=True)
        bl.blob((bx, by, bz + 0.07), (0.065, 0.065, 0.06), subdiv=1)
        bl.blob((bx, by, bz - 0.17), (0.03, 0.03, 0.03), subdiv=1)          # clapper
        # railing: front edge and +X edge of the deck (the -X edge is left open for the ramp)
        rl = part('railing', 'Rail_Wood', bevel=0.018)
        rx0, rx1 = X0 - p['DECK_OH'] + 0.06, X1 + p['DECK_OH'] - 0.06
        ry0, ry1 = Y0 - p['DECK_OH'] + 0.06, yE - 0.06
        RH = DT + p['RAIL_H']
        for x, y, h in ((rx0, ry0, RH + 0.08), (rx1, ry0, RH + 0.08), (rx1, ry1, RH + 0.04)):
            rl.box((x - 0.065, y - 0.065, DT - 0.3), (x + 0.065, y + 0.065, h))
        rl.beam((rx0, ry0, RH - 0.05), (rx1, ry0, RH - 0.05), 0.09, 0.09)
        rl.beam((rx1, ry0, RH - 0.05), (rx1, ry1, RH - 0.05), 0.09, 0.09)
        for f in (0.33, 0.66):
            x = rx0 + (rx1 - rx0) * f; rl.box((x - 0.035, ry0 - 0.035, DT), (x + 0.035, ry0 + 0.035, RH - 0.05))
            y = ry0 + (ry1 - ry0) * f; rl.box((rx1 - 0.035, y - 0.035, DT), (rx1 + 0.035, y + 0.035, RH - 0.05))
        rl.beam((rx0, ry0, DT + 0.36), (rx1, ry0, DT + 0.36), 0.06, 0.06)
        rl.beam((rx1, ry0, DT + 0.36), (rx1, ry1, DT + 0.36), 0.06, 0.06)
        # ramp: two long planks from the deck's -X edge to the ground, with goat cleats
        rp = part('ramp', 'Ramp_Wood', bevel=0.015)
        top = Vector((X0 - p['DECK_OH'] + 0.02, p['RAMP_Y'], DT - 0.02)); foot = Vector((p['RAMP_FOOT_X'] + 0.03, p['RAMP_Y'] + p['RAMP_FOOT_DY'], 0.04))
        hwR = p['RAMP_W'] / 2
        d = (top - foot).normalized(); side = d.cross(Vector((0, 0, 1))).normalized(); nrm = side.cross(d).normalized()
        if nrm.z < 0: nrm = -nrm
        for s_, (a, b) in enumerate(((-hwR, -0.01), (0.01, hwR))):
            off = side * ((a + b) / 2); dzv = rnd.uniform(-0.01, 0.01)
            rp.beam(top + off + Vector((0, 0, dzv)), foot + off - d * (0.03 * s_), b - a, 0.07, tuple(nrm))
        cl = part('ramp_cleats', 'Rail_Wood')
        L = (top - foot).length
        for k in range(1, 6):
            c = foot + d * (L * k / 6.2) + nrm * 0.055
            cl.beam(c - side * (hwR - 0.05), c + side * (hwR - 0.05), 0.05, 0.035, tuple(nrm))
        # straw floor inside, spilling out of the open side
        st = part('straw', 'Straw', smooth=True)
        st.box((X0 + 0.08, Y0 + 0.1, 0.06), (X1 - 0.08, Y1 - 0.1, 0.11))
        for k in range(5):
            x = X0 + rnd.uniform(-0.35, 0.05); y = rnd.uniform(yE + 0.1, Y1 - 0.1)
            st.blob((x, y, 0.0), (rnd.uniform(0.2, 0.32), rnd.uniform(0.14, 0.24), 0.07), subdiv=1, rnd=rnd, squash=lambda c: Vector((c.x, c.y, max(c.z, 0.0))))
        for k in range(4):
            st.blob((X0 + rnd.uniform(0.3, 1.6), rnd.uniform(Y0 + 0.4, Y1 - 0.4), 0.08), (0.28, 0.22, 0.07), subdiv=1, rnd=rnd)
        # hay rack on the inner face of the back wall, next to the open side (seen through it, as in the hero)
        rk = part('hay_rack', 'Rack_Wood')
        yr = Y1 - T - 0.04; xc = X0 + 0.78; hwk = 0.5; zt, zb = 1.55, 0.86
        rk.box((xc - hwk, yr - 0.09, zt - 0.08), (xc + hwk, yr, zt))                       # top rail on the wall
        rk.box((xc - hwk, yr - 0.42, zb - 0.06), (xc + hwk, yr, zb))                       # trough bottom
        rk.box((xc - hwk, yr - 0.46, zb - 0.06), (xc + hwk, yr - 0.38, zb + 0.16))         # trough lip
        for sgn in (-1, 1):
            rk.box((xc + sgn * hwk - 0.04, yr - 0.46, zb - 0.06), (xc + sgn * hwk + 0.04, yr, zb + 0.18))
            rk.beam((xc + sgn * hwk, yr - 0.42, zb + 0.14), (xc + sgn * hwk, yr - 0.04, zt - 0.04), 0.06, 0.06, (1, 0, 0))
        for k in range(5):
            x = xc - hwk + 0.16 + k * (2 * hwk - 0.32) / 4
            rk.beam((x, yr - 0.38, zb + 0.02), (x, yr - 0.04, zt - 0.06), 0.035, 0.035, (1, 0, 0))
        for sgn in (-1, 1):                                                                 # legs
            rk.box((xc + sgn * hwk - 0.05, yr - 0.05, 0.06), (xc + sgn * hwk + 0.03, yr, zt))
        hy = part('hay', 'Hay_Rack', smooth=True)
        hy.blob((xc, yr - 0.22, zb + 0.24), (hwk - 0.06, 0.2, 0.28), subdiv=2, rnd=rnd,
                squash=lambda c: Vector((c.x, c.y, c.z if c.z > -0.3 else -0.3)))
        hy.blob((xc + 0.1, yr - 0.3, zb + 0.05), (0.3, 0.2, 0.1), subdiv=1, rnd=rnd)

    obs = [o for o in (pt.finish() for pt in parts.values()) if o]
    return obs


def apply_all():
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.modifiers:
            bpy.context.view_layer.objects.active = o
            for m in list(o.modifiers):
                bpy.ops.object.modifier_apply(modifier=m.name)


def tris():
    n = 0; dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return n


def bounds():
    import numpy as np
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); pts += [tuple(o.matrix_world @ v.co) for v in m.vertices]; o.evaluated_get(dg).to_mesh_clear()
    a = np.array(pts); return a.min(0), a.max(0)


def recentre(lo, hi):
    """Origin at the centre of the whole footprint on the ground (to_game.py centres on the same box)."""
    off = Vector((-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]))
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            o.data.transform(Matrix.Translation(off))


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def main():
    states = [a for a in sys.argv[1:] if a in STATES] or STATES
    ref = None
    for s in ['complete'] + [x for x in states if x != 'complete']:
        if s not in states and s != 'complete':
            continue
        build(s)
        lo, hi = bounds()
        if ref is None:
            ref = (lo, hi)
            print('footprint X %.3f Y %.3f height %.3f m' % (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))
        recentre(*ref)                          # every stage shares the complete model's origin
        print(s, 'triangles', tris())
        if s in states:
            export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'complete':
            export(os.path.join(HERE, 'goat-house-open.glb'))


if __name__ == '__main__':
    main()

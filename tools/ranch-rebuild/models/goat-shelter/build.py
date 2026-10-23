"""goat-shelter: a small rose-pink plank shed on short stilts, gable end with a tall open doorway at the front (-Y),
a teal-plank ramp down from the door, and a low brown-timber climbing platform with a hay crate beside it.

usage: python build.py            builds every construction stage, writes goat-shelter.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes goat-shelter.glb)

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
States: planned (stakes + string lines), foundation (stone pads, stilts, sills, floor), frame (+ posts, plates, tie
beams, rafters), roof (+ shingles, bargeboards, ridge board; walls still open), complete (+ plank walls, doorway
recess, window, ramp, climbing platform, hay crate).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    W=2.4,            # wall width across the gable (X), outer plank face
    D=2.2,            # wall depth along the ridge (Y); hero reads ~1 : 0.9 (compact)
    POST=0.24,        # corner post / stilt section (chunky, hero)
    POST_PROUD=0.04,  # posts stand proud of the planks
    FLOOR0=0.34,      # underside of the sill = how far the floor is raised on the stilts
    SILL=0.18,        # sill beam height (sill top = floor top)
    EAVE=1.72,        # top of the plates / tie beams
    BEAM=0.18,        # plate / tie beam height
    PITCH=45.0,       # roof pitch (deg); the sheet's ~64 deg is ignored (AD)
    DECK_LIFT=0.06,   # roof deck underside above the plate line at the wall
    EAVE_OH=0.32,     # side eave overhang (horizontal)
    GABLE_OH_F=0.30,  # roof overhang past the front gable
    GABLE_OH_B=0.24,  # and past the back gable
    COURSE=0.40,      # shingle course spacing along the slope
    TAB_W=(0.38, 0.56),
    TAB_TH=0.08,
    TAB_LIFT=0.10,    # butt lift of each course
    BARGE=(0.17, 0.22),   # bargeboard section (width, depth)
    BARGE_X=0.36,     # bargeboards run on past the apex so they cross
    BARGE_TAIL=0.10,  # and a little past the eave
    PLANK_W=0.22,
    PLANK_T=0.06,
    DOOR_X=(0.16, 0.92),  # doorway span on the gable (towards +X, as in the hero)
    WIN_Y=(-0.06, 0.50),   # window on the +X side wall, along Y
    WIN_Z=(1.00, 1.50),
    RAMP_L=1.6,       # ramp run (horizontal) from the doorway
    PLAT_X=(-1.34, -0.02),
    PLAT_D=1.25,      # platform depth in front of the gable
    PLAT_Z=0.48,      # deck top
    CRATE=(-0.42, 0.62, 0.56, 0.46, 0.32),  # x centre, distance in front of the wall, size x, size y, height
)

COL = {  # sRGB, sampled from the hero (and lifted a little where the hero is in shade)
    'Plank_Rose': (238, 142, 126), 'Plank_RoseDark': (222, 124, 110), 'Timber_Rose': (244, 154, 138),
    'Plank_Dark': (58, 34, 22), 'Timber_Brown': (122, 80, 46), 'Plank_Teal': (100, 132, 120),
    'Roof_Teal': (52, 118, 114), 'Hay_Straw': (196, 156, 84), 'Stone_Grey': (150, 146, 136), 'Rope_String': (226, 214, 180),
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

    def beam(self, a, b, w, h, up=(0, 0, 1)):
        """A timber from point a to b, w wide (side), h tall (along up)."""
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

    def part(name, material):
        if name not in parts:
            parts[name] = Part(name, material)
        return parts[name]

    PO, PP, F0, SL, EV, BM, T = p['POST'], p['POST_PROUD'], p['FLOOR0'], p['SILL'], p['EAVE'], p['BEAM'], p['PLANK_T']
    FT = F0 + SL                                     # floor top / sill top
    ZW1 = EV - BM                                    # planks end under the plate / tie beam
    Z0 = EV + p['DECK_LIFT']                         # roof deck underside right above the wall line
    zr = Z0 + hw * t                                 # deck underside at the ridge
    def z_under(x):
        return Z0 + (hw - abs(x)) * t
    yF, yB = -hd - p['GABLE_OH_F'], hd + p['GABLE_OH_B']
    DX0, DX1 = p['DOOR_X']
    WY0, WY1 = p['WIN_Y']; WZ0, WZ1 = p['WIN_Z']
    po = PO / 2
    corners = [(sx * (hw + PP - po), sy * (hd + PP - po)) for sx in (-1, 1) for sy in (-1, 1)]

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Brown'); rp = part('string_lines', 'Rope_String')
        cs = [(-hw - 0.1, -hd - 0.1), (hw + 0.1, -hd - 0.1), (hw + 0.1, hd + 0.1), (-hw - 0.1, hd + 0.1)]
        for x, y in cs:
            st.box((x - 0.04, y - 0.04, 0), (x + 0.04, y + 0.04, 0.5))
        for i in range(4):
            (xa, ya), (xb, yb) = cs[i], cs[(i + 1) % 4]
            rp.beam((xa, ya, 0.42), (xb, yb, 0.42), 0.016, 0.016)
        for x in (DX0, DX1):                            # pegs marking the doorway
            st.box((x - 0.025, -hd - 0.13, 0), (x + 0.025, -hd - 0.08, 0.2))
        rp.beam((-hw - 0.1, -hd - 0.1, 0.03), (hw + 0.1, hd + 0.1, 0.03), 0.014, 0.014)   # squaring diagonal
        x0, x1 = p['PLAT_X']                            # the platform's outline, one string at ground level
        y1 = -hd - p['PLAT_D']
        for a, b in (((x0, -hd - 0.1), (x0, y1)), ((x0, y1), (x1, y1)), ((x1, y1), (x1, -hd - 0.1))):
            rp.beam((*a, 0.03), (*b, 0.03), 0.014, 0.014)
        for x, y in ((x0, y1), (x1, y1)):
            st.box((x - 0.03, y - 0.03, 0), (x + 0.03, y + 0.03, 0.22))

    # ------------------------------------------------------------------ foundation: stone pads, stilts, sills, floor
    if 'foundation' in want:
        sp = part('stone_pads', 'Stone_Grey'); sl = part('stilts_sills', 'Timber_Rose')
        for x, y in corners + [(sx * (hw + PP - po), 0.0) for sx in (-1, 1)]:
            sp.box((x - 0.2, y - 0.2, 0), (x + 0.2, y + 0.2, 0.07), Matrix.Rotation(rnd.uniform(-0.3, 0.3), 3, 'Z'))
        for x, y in corners:
            sl.box((x - po, y - po, 0.06), (x + po, y + po, FT + 0.02))
        for sx in (-1, 1):                             # mid stilts under the long sides
            x = sx * (hw + PP - po); sl.box((x - 0.1, -0.1, 0.06), (x + 0.1, 0.1, FT + 0.02))
        # sills: proud of the plank skin, chunky (hero)
        for sy in (-1, 1):
            y = sy * (hd + PP - 0.025); sl.box((-hw + po, min(y, y - sy * 0.2), F0), (hw - po, max(y, y - sy * 0.2), FT))
        for sx in (-1, 1):
            x = sx * (hw + PP - 0.025); sl.box((min(x, x - sx * 0.2), -hd + po, F0), (max(x, x - sx * 0.2), hd - po, FT))
        # floor joists and floor deck
        fl = part('floor', 'Plank_Dark')
        fl.box((-hw + 0.15, -hd + 0.15, FT - 0.05), (hw - 0.15, hd - 0.15, FT - 0.005))
        n = int(W / 0.3)
        for k in range(n):
            x0 = -hw + 0.15 + k * (W - 0.3) / n
            fl.box((x0 + 0.01, -hd + 0.15, FT - 0.005), (x0 + (W - 0.3) / n - 0.01, hd - 0.15, FT + 0.01))

    # ------------------------------------------------------------------ frame: posts, plates, tie beams, rafters
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Rose')
        for x, y in corners:
            fr.box((x - po, y - po, FT + 0.02), (x + po, y + po, EV + 0.03))
        # door posts, window posts, back and -X mid posts
        for x in (DX0 - 0.07, DX1 + 0.07):
            fr.box((x - 0.07, -hd - PP, FT), (x + 0.07, -hd - PP + 0.16, ZW1))
        for y in (WY0 - 0.08, WY1 + 0.08):
            fr.box((hw + PP - 0.16, y - 0.08, FT), (hw + PP, y + 0.08, ZW1))
        fr.box((-hw - PP, -0.08, FT), (-hw - PP + 0.16, 0.08, ZW1))
        fr.box((-0.08, hd + PP - 0.16, FT), (0.08, hd + PP, ZW1))
        # plates on the long sides, tie beams on the gables (stick out past the posts, as in the hero)
        for sx in (-1, 1):
            x = sx * (hw + PP + 0.01)
            fr.box((min(x, x - sx * 0.2), -hd - 0.1, ZW1), (max(x, x - sx * 0.2), hd + 0.1, EV))
        for sy in (-1, 1):
            y = sy * (hd + PP + 0.03)
            fr.box((-hw - 0.16, min(y, y - sy * 0.2), ZW1), (hw + 0.16, max(y, y - sy * 0.2), EV))
        # window sill rail (frame stage shows the opening)
        fr.box((hw + PP - 0.12, WY0 - 0.16, WZ0 - 0.1), (hw + PP + 0.04, WY1 + 0.16, WZ0))
        fr.box((hw + PP - 0.12, WY0 - 0.08, WZ1), (hw + PP + 0.0, WY1 + 0.08, WZ1 + 0.08))
        # rafters (three pairs) + ridge beam + collar on the middle pair
        for y in (-hd + 0.1, 0.0, hd - 0.1):
            for sx in (-1, 1):
                xe = sx * (hw + p['EAVE_OH'] - 0.05)
                fr.beam((xe, y, z_under(xe) - 0.07), (0, y, zr - 0.07), 0.1, 0.13)
        fr.box((-0.07, yF + 0.05, zr - 0.2), (0.07, yB - 0.05, zr))
        fr.box((-0.6, -0.05, z_under(0.6) - 0.22), (0.6, 0.05, z_under(0.6) - 0.1))

    # ------------------------------------------------------------------ roof: deck, shingles, bargeboards, ridge board
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal'); tb = part('roof_timbers', 'Timber_Rose'); rd = part('roof_deck', 'Plank_RoseDark')
        L = (hw + p['EAVE_OH']) / ca                    # slope length ridge -> eave edge
        bw, bh = p['BARGE']
        for sx in (-1, 1):
            o = Vector((0, 0, zr)); d = Vector((sx * ca, 0, -sa)); nrm = Vector((sx * sa, 0, ca)); e = Vector((0, 1, 0))
            def P3(u, v, w):
                return tuple(o + e * u + d * v + nrm * w)
            dk = 0.08
            c = [P3(yF, 0, 0), P3(yF, L, 0), P3(yB, L, 0), P3(yB, 0, 0), P3(yF, 0, dk), P3(yF, L, dk), P3(yB, L, dk), P3(yB, 0, dk)]
            rd.hexa(c)                                   # boarded deck: its underside shows pink under the overhangs (hero)
            # chunky, slightly irregular shingle courses from the eave up
            nC = int(math.ceil((L - 0.05) / p['COURSE']))
            for ci in range(nC):
                vb = L + 0.03 - ci * p['COURSE']
                vt = max(0.0, vb - p['COURSE'] * 1.5)
                u = yF + bw * 0.6 + rnd.uniform(-0.12, 0.0)
                u = max(u, yF + bw * 0.55)
                while u < yB - bw * 0.6:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, yB - bw * 0.55)
                    if u1 - u < 0.14:
                        break
                    g = 0.03; lift = p['TAB_LIFT'] * rnd.uniform(0.7, 1.3); th = p['TAB_TH'] * rnd.uniform(0.85, 1.15)
                    vbb = vb + rnd.uniform(-0.05, 0.03); sk = rnd.uniform(-0.04, 0.04)
                    c = [P3(u + g / 2, vt, dk), P3(u + g / 2 + sk, vbb, dk + lift), P3(u1 - g / 2 + sk, vbb, dk + lift), P3(u1 - g / 2, vt, dk),
                         P3(u + g / 2, vt, dk + th), P3(u + g / 2 + sk, vbb, dk + lift + th), P3(u1 - g / 2 + sk, vbb, dk + lift + th), P3(u1 - g / 2, vt, dk + th)]
                    rf.hexa(c)
                    u = u1
            # top course under the ridge board
            c = [P3(yF + bw, -0.05, dk + 0.05), P3(yF + bw, 0.36, dk + 0.05), P3(yB - bw, 0.36, dk + 0.05), P3(yB - bw, -0.05, dk + 0.05),
                 P3(yF + bw, -0.05, dk + 0.14), P3(yF + bw, 0.36, dk + 0.12), P3(yB - bw, 0.36, dk + 0.12), P3(yB - bw, -0.05, dk + 0.14)]
            rf.hexa(c)
            # bargeboards: chunky rose boards on the roof edge, standing above the shingles, crossing past the apex
            for yy in (yF + bw / 2, yB - bw / 2):
                lap = 0.035 * sx * (1 if yy < 0 else -1)      # the two boards half-lap: one sits a little proud
                a = P3(yy - lap, L + p['BARGE_TAIL'], 0.08); b = P3(yy - lap, -p['BARGE_X'], 0.08)
                tb.beam(a, b, bw, bh + 0.18, up=tuple(nrm))         # covers the deck edge, stands proud of the shingles
        # apex blocks fill the V where the bargeboards cross
        for yy in (yF + bw / 2, yB - bw / 2):
            tb.prism([(-0.22, zr - 0.05), (0.22, zr - 0.05), (0, zr + 0.3)], yy - bw / 2, yy + bw / 2, 'y')
        # ridge board between the crossings
        tb.box((-0.1, yF + 0.02, zr + 0.12), (0.1, yB - 0.02, zr + 0.28))

    # ------------------------------------------------------------------ walls, doorway recess, window, ramp, platform
    if 'walls' in want:
        pk_a = part('plank_walls', 'Plank_Rose'); pk_b = part('plank_walls_dark', 'Plank_RoseDark')

        def plank_run(ax, a0, a1, line, sgn, ztop_fn, zbot=FT, skip=None, hole=None):
            """Vertical planks along a wall. skip=(a0, a1): no planks (doorway). hole=(a0, a1, z0, z1): window."""
            n = max(1, round((a1 - a0) / p['PLANK_W'])); w = (a1 - a0) / n
            for k in range(n):
                a, b = a0 + k * w, a0 + (k + 1) * w
                if skip and b > skip[0] + 0.01 and a < skip[1] - 0.01:
                    continue
                off = (0.012 if k % 2 else 0.0) + rnd.uniform(-0.004, 0.004)
                outer = line + sgn * off; inner = line - sgn * T
                pk = pk_b if k % 2 else pk_a
                zt0, zt1 = ztop_fn(a), ztop_fn(b)
                segs = [(zbot, None)]
                if hole and b > hole[0] + 0.01 and a < hole[1] - 0.01:
                    segs = [(zbot, hole[2]), (hole[3], None)]
                for z0, z1 in segs:
                    pts = [(a + 0.008, z0), (b - 0.008, z0)] + ([(b - 0.008, z1), (a + 0.008, z1)] if z1 else [(b - 0.008, zt1), (a + 0.008, zt0)])
                    pk.prism(pts, min(outer, inner), max(outer, inner), 'y' if ax == 'x' else 'x')
        flat = lambda a: ZW1
        rake = lambda a: z_under(a) - 0.03
        for sy in (-1, 1):
            plank_run('x', -hw, hw, sy * hd, sy, flat, skip=(DX0 - 0.14, DX1 + 0.14) if sy < 0 else None)
            plank_run('x', -hw + 0.06, hw - 0.06, sy * hd, sy, rake, zbot=EV - 0.02)        # gable triangle
        for sx in (-1, 1):
            plank_run('y', -hd, hd, sx * hw, sx, flat, hole=(WY0 - 0.02, WY1 + 0.02, WZ0, WZ1) if sx > 0 else None)
            plank_run('y', -hd, hd, sx * (hw - 0.02), sx, lambda a: z_under(hw) + 0.02, zbot=EV - 0.03)   # frieze to the deck
        # backing boards behind the gable triangles and the eave friezes, so plank gaps never see through the attic
        bk = part('plank_backing', 'Plank_RoseDark')
        for sy in (-1, 1):
            y = sy * (hd - T)
            bk.prism([(-hw + 0.02, EV - 0.03), (hw - 0.02, EV - 0.03), (0, z_under(0) - 0.02)], min(y, y - sy * 0.02), max(y, y - sy * 0.02), 'y')
        for sx in (-1, 1):
            x = sx * (hw - 0.02 - T)
            bk.box((min(x, x - sx * 0.02), -hd + T, EV - 0.05), (max(x, x - sx * 0.02), hd - T, z_under(hw) + 0.02))
        # dark plank interior: liner just inside the walls, seen through the doorway and the window
        dk = part('interior', 'Plank_Dark')
        i0 = T + 0.02
        dk.box((-hw + i0, hd - i0 - 0.03, FT), (hw - i0, hd - i0, EV))                   # back wall
        dk.box((-hw + i0, -hd + i0, FT), (-hw + i0 + 0.03, hd - i0, EV))                 # -X side
        dk.box((hw - i0 - 0.03, -hd + i0, FT), (hw - i0, hd - i0, EV))                   # +X side
        dk.box((-hw + i0, -hd + i0, EV - 0.03), (hw - i0, hd - i0, EV))                  # ceiling
        dk.box((DX0 - 0.14, -hd - 0.01, ZW1 - 0.01), (DX1 + 0.14, -hd + i0, ZW1 + 0.0))  # door head reveal
        for sx in (-1, 1):
            x = DX0 - 0.14 if sx < 0 else DX1 + 0.14
            dk.box((x - (0.0 if sx < 0 else 0.02), -hd - 0.005, FT), (x + (0.02 if sx < 0 else 0.0), -hd + i0, ZW1))   # door jamb reveals
        lt = part('interior_battens', 'Timber_Brown')
        for k in range(6):                                                                # back-wall battens catch light
            x = DX0 - 0.1 + k * (DX1 - DX0 + 0.2) / 5
            lt.box((x - 0.025, hd - i0 - 0.05, FT), (x + 0.025, hd - i0 - 0.03, EV - 0.03))
        lt.box((DX0 - 0.2, hd - i0 - 0.07, 1.05), (DX1 + 0.2, hd - i0 - 0.03, 1.15))
        fr2 = part('trim', 'Timber_Rose')
        fr2.box((-hw - 0.16, -hd - 0.12, FT + 0.48), (DX0 - 0.21, -hd - 0.02, FT + 0.6))    # front rail left of the door (hero)
        # door threshold
        fr2.box((DX0 - 0.14, -hd - PP - 0.04, FT - 0.06), (DX1 + 0.14, -hd + 0.1, FT + 0.01))
        # ------------------------------------------------ ramp: teal planks from the doorway to the ground
        rp = part('ramp', 'Plank_Teal'); rt = part('ramp_timbers', 'Timber_Brown')
        y_top, z_top = -hd - PP - 0.04, FT + 0.01
        y_bot, z_bot = y_top - p['RAMP_L'], 0.0
        ang = math.atan2(z_top - z_bot, y_top - y_bot)
        nP = 4; rw = (DX1 - DX0 + 0.1) / nP
        for k in range(nP):
            x0 = DX0 - 0.05 + k * rw + 0.012; x1 = x0 + rw - 0.024
            ext = rnd.uniform(-0.06, 0.04)
            a = Vector((0, y_bot - ext, z_bot + 0.035)); b = Vector((0, y_top, z_top + 0.0))
            th = 0.06; dz = Vector((0, -math.sin(ang), math.cos(ang))) * th
            for v in (a, b):
                v.z += rnd.uniform(-0.005, 0.005)
            c = [(x0, a.y, a.z - 0.03), (x1, a.y, a.z - 0.03), (x1, b.y, b.z - 0.03), (x0, b.y, b.z - 0.03)]
            c = c + [tuple(Vector(q) + dz) for q in c]
            rp.poly(c, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        for f in (0.3, 0.75):                                                             # cleats on top
            y = y_bot + (y_top - y_bot) * f; z = z_bot + (z_top - z_bot) * f + 0.04
            rp.box((DX0 - 0.04, y - 0.04, z), (DX1 + 0.04, y + 0.04, z + 0.05))
        ym = y_bot + (y_top - y_bot) * 0.62; zm = z_bot + (z_top - z_bot) * 0.62 - 0.03     # trestle under the ramp
        for x in (DX0 + 0.02, DX1 - 0.02):
            rt.box((x - 0.05, ym - 0.05, 0), (x + 0.05, ym + 0.05, zm))
        rt.box((DX0 - 0.06, ym - 0.05, zm - 0.1), (DX1 + 0.06, ym + 0.05, zm))
        # ------------------------------------------------ climbing platform beside the door
        pl = part('platform_deck', 'Plank_Teal'); pf = part('platform_frame', 'Timber_Brown')
        X0, X1 = p['PLAT_X']; Yw = -hd - PP; Y1 = Yw - p['PLAT_D']; Zd = p['PLAT_Z']
        leg = 0.12
        for x in (X0 + leg / 2, X1 - leg / 2):
            for y in (Y1 + leg / 2, Yw - leg / 2 - 0.02):
                pf.box((x - leg / 2, y - leg / 2, 0), (x + leg / 2, y + leg / 2, Zd - 0.06))
        pf.box((X0, Y1, Zd - 0.2), (X1, Y1 + 0.1, Zd - 0.06))                                # front and back bearers
        pf.box((X0, Yw - 0.12, Zd - 0.2), (X1, Yw - 0.02, Zd - 0.06))
        for x in (X0, X1 - 0.1):
            pf.box((x, Y1, Zd - 0.2), (x + 0.1, Yw - 0.02, Zd - 0.06))                       # side bearers
        pf.beam((X0 + 0.06, Y1 + 0.06, 0.12), (X0 + 0.06, Y1 + 0.5, Zd - 0.2), 0.07, 0.07)  # knee braces
        pf.beam((X1 - 0.06, Y1 + 0.06, 0.12), (X1 - 0.06, Y1 + 0.5, Zd - 0.2), 0.07, 0.07)
        nD = 5; dw = (Yw - 0.02 - Y1 + 0.06) / nD
        for k in range(nD):                                                                 # deck planks along X
            y0 = Y1 - 0.06 + k * dw + 0.012
            e0, e1 = rnd.uniform(-0.08, 0.02), rnd.uniform(-0.02, 0.06)
            pl.box((X0 - 0.06 + e0, y0, Zd - 0.06), (X1 + 0.02 + e1, y0 + dw - 0.024, Zd + rnd.uniform(-0.008, 0.008)),
                   Matrix.Rotation(rnd.uniform(-0.02, 0.02), 3, 'Z'))
        # rail along the -X edge (posts + chunky top rail)
        for y in (Y1 + 0.12, Yw - 0.12):
            pf.box((X0 + 0.01, y - 0.05, Zd), (X0 + 0.11, y + 0.05, Zd + 0.36))
        pf.box((X0 - 0.02, Y1 + 0.02, Zd + 0.30), (X0 + 0.14, Yw - 0.02, Zd + 0.40))
        # hay crate on the deck: corner posts, slats, a heap of hay
        cx, cdy, sxz, syz, chh = p['CRATE']; cy = Yw - cdy
        cr = part('hay_crate', 'Timber_Brown'); hy = part('hay', 'Hay_Straw')
        for sx in (-1, 1):
            for sy in (-1, 1):
                x = cx + sx * (sxz / 2 - 0.03); y = cy + sy * (syz / 2 - 0.03)
                cr.box((x - 0.035, y - 0.035, Zd), (x + 0.035, y + 0.035, Zd + chh + (0.14 if sy < 0 and sx > 0 else 0.05)))
        for z in (Zd + 0.07, Zd + chh - 0.05):
            cr.box((cx - sxz / 2, cy - syz / 2, z - 0.035), (cx + sxz / 2, cy - syz / 2 + 0.035, z + 0.035))
            cr.box((cx - sxz / 2, cy + syz / 2 - 0.035, z - 0.035), (cx + sxz / 2, cy + syz / 2, z + 0.035))
            cr.box((cx - sxz / 2, cy - syz / 2, z - 0.035), (cx - sxz / 2 + 0.035, cy + syz / 2, z + 0.035))
            cr.box((cx + sxz / 2 - 0.035, cy - syz / 2, z - 0.035), (cx + sxz / 2, cy + syz / 2, z + 0.035))
        cr.box((cx - sxz / 2, cy - syz / 2, Zd), (cx + sxz / 2, cy + syz / 2, Zd + 0.03))
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        for v in bm.verts:
            v.co *= rnd.uniform(0.88, 1.12)
            v.co = Vector((v.co.x * (sxz / 2 - 0.04), v.co.y * (syz / 2 - 0.04), max(v.co.z, -0.2) * 0.16))
            v.co += Vector((cx, cy, Zd + chh - 0.08))
        base = len(hy.bm.verts)
        for v in bm.verts:
            hy.bm.verts.new(v.co)
        hy.bm.verts.ensure_lookup_table(); bm.verts.ensure_lookup_table()
        for f in bm.faces:
            hy.bm.faces.new([hy.bm.verts[base + v.index] for v in f.verts])
        bm.free()
        for k in range(7):
            a = Vector((cx + rnd.uniform(-0.2, 0.2), cy + rnd.uniform(-0.15, 0.15), Zd + chh + 0.02))
            b = a + Vector((rnd.uniform(-0.22, 0.22), rnd.uniform(-0.22, 0.1), rnd.uniform(-0.05, 0.12)))
            hy.beam(a, b, 0.025, 0.025)
        # a little spilled hay on the deck
        for k in range(3):
            x = cx + sxz / 2 + rnd.uniform(0.05, 0.25); y = cy + rnd.uniform(-0.2, 0.2)
            hy.box((x - 0.09, y - 0.05, Zd), (x + 0.09, y + 0.05, Zd + 0.03), Matrix.Rotation(rnd.uniform(0, 3), 3, 'Z'))

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
            export(os.path.join(HERE, 'goat-shelter.glb'))


if __name__ == '__main__':
    main()

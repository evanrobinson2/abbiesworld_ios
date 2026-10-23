"""chicken-coop-charming: the storybook-toy chicken coop. A chubby cream plank box on six stout stone-shod legs, under a
tall bell-cast teal roof whose ridge sags and tips up at the -X end, with crossed bargeboard horns, an oversized arched
door and a bowed slatted ramp on the long front wall (-Y), a hinged nest hatch at its +X end, and a big mesh window
plus a porthole on the -X gable (the gable the hero shows).

usage: python build.py            builds every construction stage, writes chicken-coop-charming.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes chicken-coop-charming.glb)

Z up, metres, origin at the footprint centre on the ground, front faces -Y (same conventions, states, material names
and footprint as models/chicken-coop). All shape numbers live in P.
States: planned (stakes + string lines), foundation (stone shoes, legs, knee braces, floor frame and deck),
frame (+ corner posts, door posts, band, gable tie beams and king posts, curved rafters, ridge beam),
roof (+ bell-cast deck, chunky shingles, bargeboards with horns, ridge beam), complete (+ cream plank walls, door,
ramp, nest hatch, mesh window, porthole, gable braces).
One deform pass (deform()) gives the toy wobble: walls bulge between sill and band and everything above the floor
leans toward -X.
"""
import sys, os, math, random, json
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'chicken-coop-charming'

P = dict(
    L=1.60,           # eave-wall length (X), outside of the plank skin (same footprint as the normal coop)
    D=1.25,           # gable-wall width (Y); the hero's plan is a touch squarer than the normal coop's 1.6 x 1.2
    LEG_H=0.44,       # ground to the underside of the floor frame
    LEG=0.14,         # leg section (top); the foot is wider
    LEG_FOOT=0.035,   # extra half-width at the foot (stout, tapered)
    LEG_XS=(-0.66, 0.02, 0.66),   # leg centres along X (three per long side)
    LEG_IN=0.04,      # leg inset from the wall line (Y)
    SHOE=(0.22, 0.10),  # stone shoe (side, height)
    FRAME_H=0.15,     # chunky floor platform
    FRAME_OUT=0.12,   # platform projects past the walls
    WALL_H=0.88,      # floor to band top
    BAND=0.09,
    POST=0.12,        # corner post section
    BULGE=0.05,       # walls bulge out this much at mid-height
    LEAN=0.07,        # everything above the floor leans toward -X by this much at the ridge
    DECK_LIFT=0.04,
    RISE=1.08,        # roof: ridge above the deck at the wall line
    BELL=0.38,        # bell-cast mix: 1 = straight rake, 0 = fully curved (steep at the ridge, flat at the eave)
    FLICK=0.09,       # eave tips flick up
    CORNER=0.10,      # the eave corners curl up a little more (storybook roof)
    EAVE_OH=0.24,     # eave overhang beyond the long walls (horizontal)
    GABLE_OH=0.22,    # roof overhang beyond the gable walls
    SAG=0.08,         # ridge sags this much mid-length
    TILT=0.14,        # the -X end of the ridge sits this much higher than the +X end
    RIDGE_OH=0.08,
    RIDGE_SEC=(0.13, 0.12),
    BARGE=(0.12, 0.17),
    HORN=0.34,        # bargeboards run past the ridge and cross (longer at -X)
    COURSE=0.30,      # shingle course spacing along the slope
    TAB_W=(0.20, 0.30),
    TAB_TH=0.04,
    TAB_LIFT=0.06,
    PLANK_W=(0.12, 0.16),   # vertical plank widths
    PLANK_T=0.035,
    DOOR_XC=-0.16,
    DOOR_W=0.44,
    DOOR_H=0.66,      # to the top of the arch
    RAMP_W=0.50,
    RAMP_RUN=1.00,    # horizontal reach of the ramp in front of the platform
    RAMP_BOW=0.06,
    NEST_XC=0.50,     # nest hatch centre (front, +X end)
    NEST=(0.40, 0.26, 0.26),   # length (X), depth out from the wall (Y), height
    NEST_Z=0.36,      # nest hatch bottom above the floor
    WIN=(0.66, 0.38), # mesh window (w, h) on the -X gable wall
    WIN_Z=0.30,
    WIN_YC=0.0,
    PORT_R=0.14,      # porthole (outer radius) on the -X gable
    PORT_Z=0.52,      # porthole centre above the band
)

P.update(json.loads(os.environ.get('P_OVERRIDE', '{}')))   # tuning experiments: P_OVERRIDE='{"LEG_H": 0.5}'

COL = {  # sRGB, sampled from the charming hero
    'Plank_Cream': (240, 224, 192), 'Plank_CreamShade': (222, 204, 168), 'Timber_Light': (178, 134, 84),
    'Timber_Shade': (130, 94, 56), 'Roof_Teal': (58, 126, 116), 'Metal_Mesh': (58, 52, 44), 'Metal_Iron': (52, 42, 36),
    'Stone_Grey': (150, 136, 112), 'Rope_String': (226, 214, 180), 'Plank_Shadow': (40, 32, 26),
}
STATES = ['planned', 'foundation', 'frame', 'roof', 'complete']
GROUPS = {'planned': {'stakes'}, 'foundation': {'foundation'}, 'frame': {'foundation', 'frame'},
          'roof': {'foundation', 'frame', 'roof'}, 'complete': {'foundation', 'frame', 'roof', 'walls'}}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}
DEFORM = [None]


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.6 if name.startswith('Metal') else 0.85
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

    def tube(self, pts, w, h, up=(0, 0, 1)):
        """A chunky timber along a polyline (one beam per segment, overlapping a little at the joints).
        up='x' keeps the width along X (a board lying in a gable plane)."""
        for k, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
            a, b = Vector(a), Vector(b); d = (b - a).normalized() * min(w, h) * 0.35
            u = Vector((1, 0, 0)).cross(d.normalized()) if up == 'x' else up
            ww = w + 0.006 * (k % 2)                 # alternate widths so overlapping joints never share a face
            self.beam(a - d, b + d, ww, h, tuple(u))

    def prism_yz(self, pts, x0, x1):
        """Polygon in (y, z), extruded along X from x0 to x1."""
        n = len(pts)
        v = [(x0, y, z) for y, z in pts] + [(x1, y, z) for y, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def prism_xz(self, pts, y0, y1):
        """Polygon in (x, z), extruded along Y from y0 to y1."""
        n = len(pts)
        v = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def disc(self, c, r, axis, th, seg=10):
        """A round plate (porthole glass, knob) facing along axis ('x' or 'y')."""
        c = Vector(c); pts = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            if axis == 'x':
                pts.append(c + Vector((0, r * math.cos(a), r * math.sin(a))))
            else:
                pts.append(c + Vector((r * math.cos(a), 0, r * math.sin(a))))
        off = Vector((th, 0, 0)) if axis == 'x' else Vector((0, th, 0))
        self.poly([tuple(p) for p in pts] + [tuple(p + off) for p in pts],
                  [tuple(range(seg)), tuple(range(2 * seg - 1, seg - 1, -1))] + [(k, seg + k, seg + (k + 1) % seg, (k + 1) % seg) for k in range(seg)])

    def finish(self):
        if DEFORM[0]:
            for v in self.bm.verts:
                v.co = Vector(DEFORM[0](tuple(v.co)))
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
    p = P; L, D = p['L'], p['D']; hl, hd = L / 2, D / 2
    want = GROUPS[state]
    parts = {}

    def part(name, material, group):
        if name not in parts:
            parts[name] = Part(name, material, group)
        return parts[name]

    LH, FHt = p['LEG_H'], p['FRAME_H']
    ZF = LH + FHt                                   # floor level (top of the platform)
    ZS = ZF                                         # walls start on the platform
    ZE = ZS + p['WALL_H']                           # top of the band: eave line
    Zw = ZE + p['DECK_LIFT']                        # roof deck underside at the wall line
    Y = hd + p['EAVE_OH']                           # half-span of the roof (ridge -> eave edge, horizontal)
    sw = hd / Y                                     # slope parameter at the wall line
    xF, xB = -hl - p['GABLE_OH'], hl + p['GABLE_OH']   # roof ends along X
    a_ = p['BELL']

    def g(s):                                       # bell-cast profile: 0 at the ridge, steep there, flat at the eave
        return a_ * s + (1 - a_) * (1 - (1 - s) ** 2)

    def dg(s):
        return a_ + 2 * (1 - a_) * (1 - s)

    H = p['RISE'] / g(sw)
    ZR = Zw + p['RISE']

    def ridge_dz(x):                                # sag mid-length plus a tilt up toward -X
        f = max(0.0, min(1.0, abs(x) / xB))
        return -p['SAG'] * (1 - f * f) + p['TILT'] * (-x / xB) * 0.5

    def zprof(x, s):                                # roof deck underside at (x, slope parameter s)
        fl = p['FLICK'] * max(0.0, (s - sw) / (1 - sw)) ** 2
        cn = p['CORNER'] * (abs(x) / xB) ** 4 * s * s
        return ZR - H * g(s) + fl + cn + ridge_dz(x) * (1 - 0.55 * s)

    def dzds(s):
        fl = 2 * p['FLICK'] * max(0.0, (s - sw) / (1 - sw)) / (1 - sw) if s > sw else 0.0
        return -H * dg(s) + fl

    def z_under(y, x=0.0):
        return zprof(x, min(1.0, abs(y) / Y))

    ZTOP = ZR + p['TILT'] * 0.5

    def deform(v):
        x, y, z = v
        if z > ZS + 1e-4:
            f = (z - ZS) / (ZE - ZS)
            if f < 1.0:
                b = p['BULGE'] * math.sin(math.pi * f)
                x += math.copysign(b * min(1.0, abs(x) / hl), x)
                y += math.copysign(b * min(1.0, abs(y) / hd), y)
            x -= p['LEAN'] * min(1.2, (z - ZS) / (ZTOP - ZS))
        return (x, y, z)
    DEFORM[0] = deform

    DX0, DX1 = p['DOOR_XC'] - p['DOOR_W'] / 2, p['DOOR_XC'] + p['DOOR_W'] / 2
    dp_ = hd - p['LEG_IN'] - p['LEG'] / 2           # leg centre lines (Y)
    legs = [(x, sy * dp_) for x in p['LEG_XS'] for sy in (-1, 1)]

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Light', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        o = p['FRAME_OUT'] + 0.02
        corners = [(-hl - o, -hd - o), (hl + o, -hd - o), (hl + o, hd + o), (-hl - o, hd + o)]
        for x, y in corners:
            st.box((x - 0.04, y - 0.04, 0), (x + 0.04, y + 0.04, 0.40), Matrix.Rotation(rnd.uniform(-0.12, 0.12), 3, 'X'), (x, y, 0))
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            rp.beam((xa, ya, 0.33), (xb, yb, 0.33), 0.016, 0.016)
        for x, y in legs:                                                  # leg spots and the ramp foot
            st.box((x - 0.03, y - 0.03, 0), (x + 0.03, y + 0.03, 0.18))
        yf = -hd - p['FRAME_OUT'] - p['RAMP_RUN']
        for x in (p['DOOR_XC'] - p['RAMP_W'] / 2, p['DOOR_XC'] + p['RAMP_W'] / 2):
            st.box((x - 0.03, yf - 0.03, 0), (x + 0.03, yf + 0.03, 0.18))
        rp.beam((-hl - o, -hd - o, 0.02), (hl + o, hd + o, 0.02), 0.012, 0.012)

    # ------------------------------------------------------------------ foundation: shoes, legs, braces, platform, deck
    if 'foundation' in want:
        sp = part('stone_shoes', 'Stone_Grey', 'foundation'); lg = part('legs', 'Timber_Light', 'foundation')
        fs = part('floor_frame', 'Timber_Shade', 'foundation')
        g2 = p['LEG'] / 2; ft = p['LEG_FOOT']; sw_, sh_ = p['SHOE']
        for x, y in legs:
            sy = 1 if y > 0 else -1
            sp.box((x - sw_ / 2, y - sw_ / 2, 0), (x + sw_ / 2, y + sw_ / 2, sh_), Matrix.Rotation(rnd.uniform(-0.25, 0.25), 3, 'Z'))
            sp.box((x - sw_ / 2 + 0.03, y - sw_ / 2 + 0.03, sh_ - 0.01), (x + sw_ / 2 - 0.03, y + sw_ / 2 - 0.03, sh_ + 0.03))
            lg.hexa([(x - g2 - ft, y - g2 - ft, sh_), (x + g2 + ft, y - g2 - ft, sh_), (x + g2 + ft, y + g2 + ft, sh_), (x - g2 - ft, y + g2 + ft, sh_),
                     (x - g2, y - g2, ZF - 0.02), (x + g2, y - g2, ZF - 0.02), (x + g2, y + g2, ZF - 0.02), (x - g2, y + g2, ZF - 0.02)])
            zb = LH - 0.27
            if abs(x) > 0.3:                                               # corner legs: braces both ways
                sx = 1 if x > 0 else -1
                lg.beam((x - sx * g2 * 0.4, y, zb), (x - sx * 0.32, y, LH + 0.03), 0.08, 0.08, up=(0, 1, 0))
            lg.beam((x, y - sy * g2 * 0.4, zb), (x, y - sy * 0.30, LH + 0.03), 0.08, 0.08, up=(1, 0, 0))
        o = p['FRAME_OUT']
        # chunky platform: a rim of thick beams, proud of the walls, ends crossing at the corners
        for sy in (-1, 1):
            y0 = sy * (hd + o); fs.box((-hl - o - 0.04, min(y0, y0 - sy * 0.13), LH), (hl + o + 0.04, max(y0, y0 - sy * 0.13), ZF - 0.005))
        for sx in (-1, 1):
            x0 = sx * (hl + o); fs.box((min(x0, x0 - sx * 0.13), -hd - o + 0.13, LH + 0.01), (max(x0, x0 - sx * 0.13), hd + o - 0.13, ZF - 0.01))
        fs.box((-0.06, -hd, LH), (0.06, hd, ZF - 0.03))                       # mid joist
        dk = part('floor_deck', 'Timber_Light', 'foundation')
        dk.box((-hl - o + 0.01, -hd - o + 0.01, ZF - 0.04), (hl + o - 0.01, hd + o - 0.01, ZF))

    # ------------------------------------------------------------------ frame: posts, band, gable ties, curved rafters
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Light', 'frame')
        po = p['POST'] / 2; pz = 0.03
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hl + pz - po), sy * (hd + pz - po)
                fr.box((x - po, y - po, ZF), (x + po, y + po, ZE + 0.03))
        for x in (DX0 - 0.05, DX1 + 0.05):                                    # door posts and a back mid stud
            fr.box((x - 0.04, -hd - pz, ZF), (x + 0.04, -hd + 0.04, ZE))
        fr.box((-0.04, hd - 0.04, ZF), (0.04, hd + pz, ZE))
        b = p['BAND']; out = pz + 0.02
        for sy in (-1, 1):                                                   # band along the long walls
            y0 = sy * (hd + out); fr.box((-hl - out, min(y0, y0 - sy * 0.08), ZE - b), (hl + out, max(y0, y0 - sy * 0.08), ZE))
        for sx in (-1, 1):                                                   # gable tie beams, ends poking out; king posts
            xg = sx * (hl + pz + 0.01)
            fr.box((xg - 0.045, -hd - 0.14, ZE - b), (xg + 0.045, hd + 0.14, ZE))
            zp0, zp1 = ZE + p['PORT_Z'] - p['PORT_R'] - 0.01, ZE + p['PORT_Z'] + p['PORT_R'] + 0.01   # king post, broken by the porthole
            fr.box((xg - 0.04, -0.045, ZE), (xg + 0.04, 0.045, zp0))
            fr.box((xg - 0.04, -0.045, zp1), (xg + 0.04, 0.045, z_under(0, xg) - 0.02))
        # curved rafters following the bell-cast deck, and the ridge beam
        for sy in (-1, 1):
            for k in range(4):
                x = -hl + 0.07 + k * (L - 0.14) / 3
                pts = [(x, sy * s * Y, zprof(x, s) - 0.05) for s in (0.0, 0.3, 0.6, 0.85, 0.98)]
                fr.tube(pts, 0.07, 0.08)
        xs = [-hl - 0.02 + (L + 0.04) * k / 5 for k in range(6)]
        fr.tube([(x, 0, zprof(x, 0) - 0.08) for x in xs], 0.10, 0.12)

    # ------------------------------------------------------------------ roof: bell-cast deck, shingles, bargeboards, ridge
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Light', 'roof')
        NU, NV = 6, 5
        for sy in (-1, 1):
            def P3(u, s, w):                        # u along X, s down the slope (0 ridge, 1 eave edge), w off the deck
                z, dz = zprof(u, s), dzds(s)
                n = Vector((0, -dz * sy, Y)).normalized()
                return tuple(Vector((u, sy * s * Y, z)) + n * w)
            dk = 0.04
            us = [xF + (xB - xF) * k / NU for k in range(NU + 1)]
            ss = [k / NV for k in range(NV + 1)]
            for i in range(NU):
                for j in range(NV):
                    u0, u1, s0, s1 = us[i], us[i + 1], ss[j], ss[j + 1]
                    rf.hexa([P3(u0, s0, 0), P3(u0, s1, 0), P3(u1, s1, 0), P3(u1, s0, 0), P3(u0, s0, dk), P3(u0, s1, dk), P3(u1, s1, dk), P3(u1, s0, dk)])
            # slope length in s units per course (approx: arc length of the profile)
            arc = [0.0]
            for k in range(1, 41):
                s0, s1 = (k - 1) / 40, k / 40
                arc.append(arc[-1] + math.hypot(Y / 40, zprof(0, s1) - zprof(0, s0)))
            Ls = arc[-1]

            def s_at(l):
                l = max(0.0, min(Ls, l))
                for k in range(1, 41):
                    if arc[k] >= l:
                        return (k - 1 + (l - arc[k - 1]) / (arc[k] - arc[k - 1])) / 40
                return 1.0
            nC = int(math.ceil((Ls - 0.05) / p['COURSE']))
            for ci in range(nC):
                lb = Ls + 0.04 - ci * p['COURSE']
                lt = max(0.0, lb - p['COURSE'] * 1.45)
                u = xF - 0.03 - rnd.uniform(0.0, 0.10) * (ci % 2)
                while u < xB + 0.02:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, xB + 0.04)
                    if u1 - u < 0.10:
                        break
                    gp = 0.016; lift = p['TAB_LIFT'] * rnd.uniform(0.7, 1.3); th = p['TAB_TH']
                    sb = s_at(lb + rnd.uniform(-0.03, 0.03)) if lb <= Ls else 1.0 + (lb - Ls) / Y
                    st_ = s_at(lt); sk = rnd.uniform(-0.05, 0.05)
                    c = [P3(u + gp / 2, st_, dk), P3(u + gp / 2 + sk, sb, dk + lift), P3(u1 - gp / 2 + sk, sb, dk + lift), P3(u1 - gp / 2, st_, dk),
                         P3(u + gp / 2, st_, dk + th), P3(u + gp / 2 + sk, sb, dk + lift + th), P3(u1 - gp / 2 + sk, sb, dk + lift + th), P3(u1 - gp / 2, st_, dk + th)]
                    rf.hexa(c)
                    u = u1
            # bargeboards along both rakes, bowed with the bell-cast; they run past the ridge and cross as horns
            bw, bh = p['BARGE']
            for uu, horn in ((xF - bw / 2 + 0.01, p['HORN']), (xB + bw / 2 - 0.01, p['HORN'] * 0.6)):
                pts = [P3(uu, s, 0.03) for s in (1.04, 0.85, 0.65, 0.45, 0.25, 0.08)]
                top = Vector(P3(uu, 0.0, 0.03)); d = (top - Vector(pts[-1])).normalized()
                pts += [tuple(top + d * horn)]
                tb.tube(pts, bw, bh, up='x')
        # ridge beam on top, overhanging both ends, following the sag and tilt
        rw, rh = p['RIDGE_SEC']
        xs = [xF - p['RIDGE_OH'] + (xB - xF + 2 * p['RIDGE_OH']) * k / NU for k in range(NU + 1)]
        for k in range(NU):
            x0, x1 = xs[k], xs[k + 1]
            z0, z1 = zprof(x0, 0) + 0.05, zprof(x1, 0) + 0.05
            tb.hexa([(x0, -rw / 2, z0 - 0.03), (x1, -rw / 2, z1 - 0.03), (x1, rw / 2, z1 - 0.03), (x0, rw / 2, z0 - 0.03),
                     (x0, -rw / 2, z0 + rh), (x1, -rw / 2, z1 + rh), (x1, rw / 2, z1 + rh), (x0, rw / 2, z0 + rh)])

    # ------------------------------------------------------------------ walls: planks, door, ramp, nest hatch, window, porthole
    if 'walls' in want:
        pa = part('plank_walls', 'Plank_Cream', 'walls'); pb = part('plank_walls_shade', 'Plank_CreamShade', 'walls')
        tr = part('trim', 'Timber_Light', 'walls'); ir = part('iron_fittings', 'Metal_Iron', 'walls')
        T = p['PLANK_T']
        R = p['DOOR_W'] / 2; zspring = ZS + p['DOOR_H'] - R           # door arch springs here

        def door_top(x):
            dx = x - p['DOOR_XC']
            return zspring + math.sqrt(max(0.0, R * R - dx * dx))
        wy0, wy1 = p['WIN_YC'] - p['WIN'][0] / 2, p['WIN_YC'] + p['WIN'][0] / 2
        wz0, wz1 = ZS + p['WIN_Z'], ZS + p['WIN_Z'] + p['WIN'][1]

        def strips(a0, a1):
            out_, a = [], a0
            while a < a1 - 0.03:
                w = rnd.uniform(*p['PLANK_W']); b2 = min(a1, a + w)
                if a1 - b2 < 0.06:
                    b2 = a1
                out_.append((a, b2)); a = b2
            return out_
        # long walls: vertical planks (the door cuts an arch out of the front)
        for wall in ('front', 'back'):
            for k, (s0, s1) in enumerate(strips(-hl, hl)):
                pk = pb if k % 3 == 1 else pa
                off = rnd.uniform(-0.004, 0.008) + (0.008 if k % 2 else 0)
                if wall == 'back':
                    pk.box((s0 + 0.004, hd - T, ZS), (s1 - 0.004, hd + off, ZE)); continue
                if s1 <= DX0 or s0 >= DX1:
                    pk.box((s0 + 0.004, -hd - off, ZS), (s1 - 0.004, -hd + T, ZE)); continue
                if DX0 - s0 > 0.02:
                    pk.box((s0 + 0.004, -hd - off, ZS), (DX0, -hd + T, ZE))
                if s1 - DX1 > 0.02:
                    pk.box((DX1, -hd - off, ZS), (s1 - 0.004, -hd + T, ZE))
                m0, m1 = max(s0, DX0), min(s1, DX1)
                zt = max(door_top(m0), door_top(m1)) + 0.01
                pk.box((m0 + 0.004, -hd - off, zt), (m1 - 0.004, -hd + T, ZE))
        # gable walls: vertical planks running up into the gable triangle, tops cut to the bell-cast deck
        for sx in (-1, 1):
            for k, (s0, s1) in enumerate(strips(-hd, hd)):
                pk = pb if k % 3 == 1 else pa
                off = rnd.uniform(-0.004, 0.008) + (0.008 if k % 2 else 0)
                xa, xb_ = (sx * hl - T, sx * hl + off) if sx > 0 else (sx * hl - off, sx * hl + T)
                y0, y1 = s0 + 0.004, s1 - 0.004
                xg = sx * hl
                ta, tb_ = z_under(y0, xg) - 0.02, z_under(y1, xg) - 0.02
                if sx < 0 and s1 > wy0 and s0 < wy1:                        # the mesh window on the -X gable
                    pk.prism_yz([(y0, ZS), (y1, ZS), (y1, wz0), (y0, wz0)], xa, xb_)
                    pk.prism_yz([(y0, wz1), (y1, wz1), (y1, tb_), (y0, ta)], xa, xb_)
                else:
                    pk.prism_yz([(y0, ZS), (y1, ZS), (y1, tb_), (y0, ta)], xa, xb_)
        # solid core behind the planks, so the plank gaps never show daylight
        pb.box((-hl + T, -hd + T, ZS), (hl - T, hd - T, ZE))
        for sx in (-1, 1):
            xc = sx * (hl - T - 0.01)
            pb.prism_yz([(-hd + 0.01, ZE - 0.01), (hd - 0.01, ZE - 0.01), (0, z_under(0, xc) - 0.05)], min(xc, xc - sx * 0.02), max(xc, xc - sx * 0.02))
        # gable: wishbone braces from the tie beam up to the king post, porthole between them
        for sx in (-1, 1):
            xg = sx * (hl + 0.035); xa, xb_ = min(xg, xg + sx * 0.04), max(xg, xg + sx * 0.04)
            zk = z_under(0, xg)
            for sy in (-1, 1):
                pts = []
                for t in (0.0, 0.25, 0.5, 0.75, 1.0):
                    yy = sy * (hd * 0.62 * (1 - t) + 0.05 * t)
                    zz = ZE + (zk - ZE - 0.12) * (1 - (1 - t) ** 1.8)
                    pts.append((xg + sx * 0.02, yy, zz))
                tr.tube(pts, 0.05, 0.07, up=(1, 0, 0))
        # portholes on both gables (the hero shows the -X one): chunky ring, dark glass
        hole = part('interior', 'Plank_Shadow', 'walls'); rr = p['PORT_R']
        for sx in (-1, 1):
            pc = Vector((sx * (hl + 0.06), 0.0, ZE + p['PORT_Z']))
            ring = [pc + Vector((0, rr * 0.8 * math.cos(2 * math.pi * k / 10), rr * 0.8 * math.sin(2 * math.pi * k / 10))) for k in range(11)]
            tr.tube([tuple(v) for v in ring], 0.07, 0.06, up=(1, 0, 0))
            xd = sx * (hl + 0.04); hole.disc((min(xd, xd + sx * 0.02), 0.0, ZE + p['PORT_Z']), rr * 0.72, 'x', 0.02)
        # door: arched planks, chunky arched trim, strap hinges, knob
        dr = part('door', 'Plank_Cream', 'walls')
        yd = -hd - 0.005
        nb = 3; w = (DX1 - DX0) / nb
        for k in range(nb):
            xa, xb_ = DX0 + k * w + 0.008, DX0 + (k + 1) * w - 0.008
            pts = [(xa, ZS)] + [(xa + (xb_ - xa) * t, door_top(xa + (xb_ - xa) * t) - 0.01) for t in (0.0, 0.5, 1.0)] + [(xb_, ZS)]
            pts = [pts[0], pts[1], pts[2], pts[3], pts[4]]
            dr.prism_xz(pts[::-1], yd - 0.035, yd)
        arch = [(DX0 - 0.03, -hd - 0.03, ZS)] + [(p['DOOR_XC'] - (R + 0.03) * math.cos(math.pi * t / 6), -hd - 0.03, zspring + (R + 0.03) * math.sin(math.pi * t / 6)) for t in range(7)] + [(DX1 + 0.03, -hd - 0.03, ZS)]
        tr.tube(arch, 0.07, 0.07, up=(0, -1, 0))
        for zz in (ZS + 0.12, zspring - 0.02):                              # strap hinges on the left
            ir.box((DX0 + 0.0, yd - 0.05, zz), (DX0 + 0.20, yd - 0.035, zz + 0.035))
            ir.box((DX0 - 0.02, yd - 0.055, zz - 0.01), (DX0 + 0.03, yd - 0.035, zz + 0.045))
        ir.disc((DX1 - 0.09, yd - 0.035, ZS + p['DOOR_H'] * 0.48), 0.04, 'y', -0.05, seg=8)       # big round knob
        # ramp: two bowed stringers from the platform lip to the ground, chunky jittered slats across
        rp = part('ramp', 'Timber_Light', 'walls'); rs = part('ramp_rails', 'Timber_Shade', 'walls')
        rw = p['RAMP_W']; yt, zt0 = -hd - p['FRAME_OUT'] + 0.04, ZS + 0.01; yf = -hd - p["FRAME_OUT"] - p["RAMP_RUN"]; zf = 0.095

        def rpt(t, side_dz=0.0):
            y = yt + (yf - yt) * t; z = zt0 + (zf - zt0) * t - p['RAMP_BOW'] * math.sin(math.pi * t) + side_dz
            return y, z
        for sx in (-1, 1):
            xr = p['DOOR_XC'] + sx * (rw / 2 + 0.03)
            pts = []
            for t in (-0.02, 0.25, 0.5, 0.75, 1.02):
                y, z = rpt(t); pts.append((xr, y, z - 0.03))
            rs.tube(pts, 0.06, 0.10, up=(0, 0, 1))
        ns = 7
        for k in range(ns):
            t = (k + 0.5) / ns; y, z = rpt(t)
            yA, zA = rpt(t - 0.4 / ns); yB, zB = rpt(t + 0.4 / ns)
            d = Vector((0, yB - yA, zB - zA)).normalized(); n = Vector((0, -d.z, d.y))
            if n.z < 0:
                n = -n
            c = Vector((p['DOOR_XC'] + rnd.uniform(-0.02, 0.02), y, z)) + n * 0.03
            hl_s = math.hypot(yB - yA, zB - zA) / 2; rot = rnd.uniform(-0.06, 0.06)
            corners = []
            for dz in (-0.022, 0.022):
                for s_, xx in ((-1, -rw / 2 - 0.05), (1, -rw / 2 - 0.05), (1, rw / 2 + 0.05), (-1, rw / 2 + 0.05)):
                    q = c + d * (s_ * hl_s + xx * rot) + n * dz
                    corners.append((q.x + xx, q.y, q.z))
            rp.hexa(corners)
        # nest hatch at the front +X end: a box with a slatted lid hinged at the wall, tipped out and down
        nb_ = part('nest_box', 'Plank_Cream', 'walls'); lid = part('nest_lid', 'Plank_CreamShade', 'walls')
        nx, (nl, nd, nh), nz = p['NEST_XC'], p['NEST'], ZS + p['NEST_Z']
        y0, y1 = -hd - nd, -hd
        nb_.box((nx - nl / 2, y0, nz), (nx + nl / 2, y1, nz + nh))
        tr.box((nx - nl / 2 - 0.025, y0 - 0.025, nz - 0.045), (nx + nl / 2 + 0.025, y1, nz + 0.01))            # base trim
        for xx in (nx - nl / 2 - 0.025, nx + nl / 2 - 0.02):
            tr.box((xx, y0 - 0.03, nz), (xx + 0.045, y0 + 0.04, nz + nh))                                   # corner trims
        for k in range(4):                                                                                 # slatted lid
            zz = nz + nh + 0.03 + 0.11 - k * 0.045; yy0 = y1 + 0.01 - k * (nd + 0.08) / 4
            lid.box((nx - nl / 2 - 0.05, yy0 - (nd + 0.08) / 4 - 0.005, zz - 0.035), (nx + nl / 2 + 0.05, yy0, zz + 0.0),
                    Matrix.Rotation(-0.42, 3, 'X'))
        for xx in (nx - nl / 2 - 0.07, nx + nl / 2 + 0.03):                                                # lid cheeks
            tr.prism_yz([(y0 - 0.08, nz + nh - 0.03), (y1 + 0.005, nz + nh + 0.13), (y1 + 0.005, nz + nh + 0.18), (y0 - 0.08, nz + nh + 0.02)], xx, xx + 0.04)
        ir.box((nx - 0.02, y0 - 0.01, nz + nh * 0.45), (nx + 0.02, y0 + 0.01, nz + nh * 0.65))                # latch
        # mesh window with a chunky frame, a cross mullion and a sill, on the -X gable wall
        ms = part('mesh', 'Metal_Mesh', 'walls')
        ms.box((-hl + 0.02, wy0, wz0), (-hl + 0.03, wy1, wz1))
        hole.box((-hl + 0.10, wy0, wz0), (-hl + 0.12, wy1, wz1))
        fx0, fx1 = -hl - 0.05, -hl + 0.01
        tr.box((fx0, wy0 - 0.06, wz0 - 0.02), (fx1, wy0, wz1 + 0.02))
        tr.box((fx0, wy1, wz0 - 0.02), (fx1, wy1 + 0.06, wz1 + 0.02))
        tr.box((fx0 + 0.02, -0.025, wz0), (fx1, 0.025, wz1))                                                  # mullion
        tr.box((fx0 + 0.02, wy0, (wz0 + wz1) / 2 - 0.02), (fx1, wy1, (wz0 + wz1) / 2 + 0.02))                 # transom
        tr.box((fx0 - 0.03, wy0 - 0.09, wz0 - 0.07), (fx1, wy1 + 0.09, wz0))                                  # sill
        tr.box((fx0 - 0.01, wy0 - 0.10, wz1), (fx1, wy1 + 0.10, wz1 + 0.07))                                  # lintel
        # corner posts proud of the planks (charming: chunkier than the frame-stage posts)
        po = p['POST'] / 2 + 0.01
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hl + 0.03 - po + 0.01), sy * (hd + 0.03 - po + 0.01)
                tr.box((x - po, y - po, ZS), (x + po, y + po, ZE + 0.02))

    obs = [pt.finish() for pt in parts.values()]
    DEFORM[0] = None
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

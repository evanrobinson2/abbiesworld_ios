"""chicken-coop: a small boxy coop raised on four stout legs with knee braces, long eave wall at the front (-Y).

usage: python build.py            builds every construction stage, writes chicken-coop.glb and variants/<state>.glb
       python build.py complete   builds and exports one state only (complete also writes chicken-coop.glb)

Z up, metres, origin at the footprint centre on the ground, front faces -Y. All shape numbers live in P.
States: planned (stakes + string lines), foundation (stone pads, legs, knee braces, floor frame and deck),
frame (+ corner posts, sill, band, gable studs, ridge beam, rafters), roof (+ shingles, bargeboards, ridge beam),
complete (+ cream plank walls, door, ramp, nest box, mesh window).
"""
import sys, os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    L=1.60,           # eave-wall length (X), outside of the plank skin
    D=1.20,           # gable-wall width (Y)
    LEG_H=0.44,       # ground to the underside of the floor frame
    LEG=0.15,         # leg section
    LEG_IN=0.03,     # leg inset from the wall line
    FRAME_H=0.11,     # floor frame beam (projects past the walls)
    FRAME_OUT=0.05,
    SILL_H=0.08,      # sill (bottom trim of the walls)
    WALL_H=0.95,      # sill top to wall top (band)
    BAND=0.08,        # band / wall plate under the roof
    POST=0.09,        # corner post section
    PITCH=50.0,       # roof pitch (deg)
    DECK_LIFT=0.07,
    EAVE_OH=0.06,     # eave overhang beyond the long walls (horizontal)
    GABLE_OH=0.14,    # roof overhang beyond the gable walls
    SAG=0.08,         # the ridge sags this much in the middle
    RIDGE_OH=0.06,    # ridge beam pokes out past the bargeboards
    RIDGE_SEC=(0.10, 0.10),
    BARGE=(0.07, 0.11),
    COURSE=0.31,      # shingle course spacing along the slope
    TAB_W=(0.22, 0.30),
    TAB_TH=0.025,
    TAB_LIFT=0.04,
    PLANK_H=0.115,    # horizontal plank height
    PLANK_T=0.035,
    DOOR_XC=0.05,
    DOOR_W=0.38,
    DOOR_H=0.72,
    RAMP_W=0.68,
    RAMP_RUN=1.00,    # horizontal reach of the ramp in front of the sill
    NEST_XC=-0.47,    # nest box centre (front-left)
    NEST=(0.46, 0.32, 0.34),   # nest box length (X), depth out from the wall (Y), height
    NEST_Z=0.26,      # nest box bottom above the sill top
    WIN=(0.32, 0.36), # mesh window (w, h) on the +X gable wall
    WIN_Z=0.36,       # window bottom above the sill top
    WIN_YC=0.05,
)

COL = {  # sRGB, sampled from the hero
    'Plank_Cream': (240, 232, 204), 'Plank_CreamShade': (222, 212, 182), 'Timber_Light': (204, 160, 104),
    'Timber_Shade': (176, 128, 74), 'Roof_Teal': (54, 130, 126), 'Metal_Mesh': (58, 52, 44), 'Metal_Iron': (52, 42, 36),
    'Stone_Grey': (150, 144, 132), 'Rope_String': (226, 214, 180), 'Plank_Shadow': (40, 32, 26),
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

    def prism_yz(self, pts, x0, x1):
        """Polygon in (y, z), extruded along X from x0 to x1."""
        n = len(pts)
        v = [(x0, y, z) for y, z in pts] + [(x1, y, z) for y, z in pts]
        f = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        for i in range(n):
            j = (i + 1) % n; f.append((i, n + i, n + j, j))
        self.poly(v, f)

    def finish(self):
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
    p = P; L, D = p['L'], p['D']; hl, hd = L / 2, D / 2
    pr = math.radians(p['PITCH']); t, ca, sa = math.tan(pr), math.cos(pr), math.sin(pr)
    want = GROUPS[state]
    parts = {}

    def part(name, material, group):
        if name not in parts:
            parts[name] = Part(name, material, group)
        return parts[name]

    LH, FHt = p['LEG_H'], p['FRAME_H']
    ZF = LH + FHt                                   # floor level (top of the floor frame)
    ZS = ZF + p['SILL_H']                           # top of the sill: walls start here
    ZE = ZS + p['WALL_H']                           # top of the band: eave line
    Z0 = ZE + p['DECK_LIFT']                        # roof deck underside at the wall line
    zr = Z0 + hd * t                                # deck underside at the ridge
    xF, xB = -hl - p['GABLE_OH'], hl + p['GABLE_OH']   # roof ends along X

    def sag(x):                                     # roof sags towards the middle of the ridge
        f = max(0.0, min(1.0, abs(x) / (hl + p['GABLE_OH'])))
        return -p['SAG'] * (1 - f * f)

    def z_under(y, x=0.0):
        return Z0 + (hd - abs(y)) * t + sag(x) * (1 - abs(y) / (hd + p['EAVE_OH']))

    DX0, DX1 = p['DOOR_XC'] - p['DOOR_W'] / 2, p['DOOR_XC'] + p['DOOR_W'] / 2
    lp = hl - p['LEG_IN'] - p['LEG'] / 2; dp_ = hd - p['LEG_IN'] - p['LEG'] / 2   # leg centres

    # ------------------------------------------------------------------ planned: stakes and string lines
    if 'stakes' in want:
        st = part('stakes', 'Timber_Light', 'stakes'); rp = part('string_lines', 'Rope_String', 'stakes')
        corners = [(-hl - 0.06, -hd - 0.06), (hl + 0.06, -hd - 0.06), (hl + 0.06, hd + 0.06), (-hl - 0.06, hd + 0.06)]
        for x, y in corners:
            st.box((x - 0.03, y - 0.03, 0), (x + 0.03, y + 0.03, 0.36))
        for i in range(4):
            (xa, ya), (xb, yb) = corners[i], corners[(i + 1) % 4]
            rp.beam((xa, ya, 0.30), (xb, yb, 0.30), 0.012, 0.012)
        for sx in (-1, 1):                                                   # leg spots and the ramp foot
            for sy in (-1, 1):
                st.box((sx * lp - 0.02, sy * dp_ - 0.02, 0), (sx * lp + 0.02, sy * dp_ + 0.02, 0.16))
        yf = -hd - p['RAMP_RUN']
        for x in (p['DOOR_XC'] - p['RAMP_W'] / 2, p['DOOR_XC'] + p['RAMP_W'] / 2):
            st.box((x - 0.02, yf - 0.02, 0), (x + 0.02, yf + 0.02, 0.16))
        rp.beam((-hl - 0.06, -hd - 0.06, 0.02), (hl + 0.06, hd + 0.06, 0.02), 0.01, 0.01)

    # ------------------------------------------------------------------ foundation: pads, legs, braces, floor frame, deck
    if 'foundation' in want:
        sp = part('stone_pads', 'Stone_Grey', 'foundation'); lg = part('legs', 'Timber_Light', 'foundation')
        fs = part('floor_frame', 'Timber_Shade', 'foundation')
        g = p['LEG'] / 2
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * lp, sy * dp_
                sp.box((x - g - 0.04, y - g - 0.04, 0), (x + g + 0.04, y + g + 0.04, 0.04), Matrix.Rotation(rnd.uniform(-0.2, 0.2), 3, 'Z'))
                # stout leg, a touch wider at the foot
                lg.hexa([(x - g - 0.012, y - g - 0.012, 0.0), (x + g + 0.012, y - g - 0.012, 0.0), (x + g + 0.012, y + g + 0.012, 0.0), (x - g - 0.012, y + g + 0.012, 0.0),
                         (x - g, y - g, ZF - 0.01), (x + g, y - g, ZF - 0.01), (x + g, y + g, ZF - 0.01), (x - g, y + g, ZF - 0.01)])
                # knee braces in both directions, from the leg up to the floor frame
                zb = LH - 0.30
                lg.beam((x - sx * g * 0.5, y, zb), (x - sx * 0.33, y, LH + 0.02), 0.07, 0.07, up=(0, 1, 0))
                lg.beam((x, y - sy * g * 0.5, zb), (x, y - sy * 0.30, LH + 0.02), 0.07, 0.07, up=(1, 0, 0))
        o = p['FRAME_OUT']
        fs.box((-hl - o, -hd - o, LH), (hl + o, -hd - o + 0.1, ZF))           # floor frame beams, proud of the walls
        fs.box((-hl - o, hd + o - 0.1, LH), (hl + o, hd + o, ZF))
        for sx in (-1, 1):
            x0 = sx * (hl + o); fs.box((min(x0, x0 - sx * 0.1), -hd - o + 0.1, LH), (max(x0, x0 - sx * 0.1), hd + o - 0.1, ZF))
        fs.box((-0.05, -hd, LH), (0.05, hd, ZF - 0.02))                       # mid joist
        dk = part('floor_deck', 'Timber_Light', 'foundation')
        dk.box((-hl + 0.02, -hd + 0.02, ZF - 0.02), (hl - 0.02, hd - 0.02, ZF + 0.01))

    # ------------------------------------------------------------------ frame: corner posts, sill, band, gable studs, roof frame
    if 'frame' in want:
        fr = part('timber_frame', 'Timber_Light', 'frame')
        po = p['POST'] / 2; pz = 0.025
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * (hl + pz - po), sy * (hd + pz - po)
                fr.box((x - po, y - po, ZF), (x + po, y + po, ZE + 0.02))
        # door posts (front) and a back mid stud
        for x in (DX0 - 0.04, DX1 + 0.04):
            fr.box((x - 0.035, -hd - pz, ZF), (x + 0.035, -hd + 0.04, ZE))
        fr.box((-0.035, hd - 0.04, ZF), (0.035, hd + pz, ZE))
        # sill (bottom trim) all round, band at the eave line
        s, b = p['SILL_H'], p['BAND']
        for z0, z1, out in ((ZF, ZS, pz + 0.01), (ZE - b, ZE, pz + 0.015)):
            for sy in (-1, 1):
                y0 = sy * (hd + out); fr.box((-hl - out, min(y0, y0 - sy * 0.07), z0), (hl + out, max(y0, y0 - sy * 0.07), z1))
            for sx in (-1, 1):
                x0 = sx * (hl + out); fr.box((min(x0, x0 - sx * 0.07), -hd - out + 0.07, z0), (max(x0, x0 - sx * 0.07), hd + out - 0.07, z1))
        # gable: tie beam ends poke out a little, king post up to the ridge
        for sx in (-1, 1):
            xg = sx * (hl + pz + 0.01)
            fr.box((xg - 0.035, -hd - 0.10, ZE - b), (xg + 0.035, hd + 0.10, ZE))
            fr.box((xg - 0.035, -0.04, ZE), (xg + 0.035, 0.04, z_under(0, xg) - 0.02))
        # ridge beam + rafters (roof frame)
        for sy in (-1, 1):
            for k in range(4):
                x = -hl + 0.06 + k * (L - 0.12) / 3
                ye = sy * (hd + p['EAVE_OH'] - 0.03)
                fr.beam((x, ye, z_under(ye, x) - 0.05), (x, 0, zr + sag(x) - 0.05), 0.06, 0.07)
        fr.box((-hl - 0.02, -0.045, zr - 0.13), (hl + 0.02, 0.045, zr - 0.01))

    # ------------------------------------------------------------------ roof: deck, shingles, bargeboards, ridge beam
    if 'roof' in want:
        rf = part('roof_shingles', 'Roof_Teal', 'roof'); tb = part('roof_timbers', 'Timber_Light', 'roof')
        Ls = (hd + p['EAVE_OH']) / ca               # slope length ridge -> eave edge
        NU = 6                                      # deck segments along X, so it can sag
        for sy in (-1, 1):
            def P3(u, v, w):                        # u along X, v down the slope from the ridge, w off the deck
                f = 1 - v / Ls
                return (u, sy * (v * ca + w * sa), zr - v * sa + ca * w + sag(u) * f)
            dk = 0.04
            us = [xF + (xB - xF) * k / NU for k in range(NU + 1)]
            for k in range(NU):
                u0, u1 = us[k], us[k + 1]
                rf.hexa([P3(u0, 0, 0), P3(u0, Ls, 0), P3(u1, Ls, 0), P3(u1, 0, 0), P3(u0, 0, dk), P3(u0, Ls, dk), P3(u1, Ls, dk), P3(u1, 0, dk)])
            nC = int(math.ceil((Ls - 0.04) / p['COURSE']))
            for ci in range(nC):
                vb = Ls + 0.03 - ci * p['COURSE']
                vt = max(0.0, vb - p['COURSE'] * 1.4)
                u = xF - 0.03 + rnd.uniform(-0.08, 0.0)
                while u < xB + 0.02:
                    w = rnd.uniform(*p['TAB_W']); u1 = min(u + w, xB + 0.03)
                    if u1 - u < 0.08:
                        break
                    gp = 0.012; lift = p['TAB_LIFT'] * rnd.uniform(0.8, 1.2); th = p['TAB_TH']
                    vbb = vb + rnd.uniform(-0.02, 0.02); sk = rnd.uniform(-0.02, 0.02)
                    c = [P3(u + gp / 2, vt, dk), P3(u + gp / 2 + sk, vbb, dk + lift), P3(u1 - gp / 2 + sk, vbb, dk + lift), P3(u1 - gp / 2, vt, dk),
                         P3(u + gp / 2, vt, dk + th), P3(u + gp / 2 + sk, vbb, dk + lift + th), P3(u1 - gp / 2 + sk, vbb, dk + lift + th), P3(u1 - gp / 2, vt, dk + th)]
                    rf.hexa(c)
                    u = u1
            # bargeboards along both rakes; they run past the ridge and cross (hero)
            bw, bh = p['BARGE']
            for uu in (xF - bw / 2 + 0.01, xB + bw / 2 - 0.01):
                a = P3(uu, Ls + 0.05, 0.02); b2 = P3(uu, -0.24, 0.02)
                tb.beam(a, b2, bw, bh, up=(0, sy * sa, ca))
        # ridge beam on top, overhanging both ends, following the sag
        rw, rh = p['RIDGE_SEC']; ztop = zr + 0.07
        xs = [xF - p['RIDGE_OH'] + (xB - xF + 2 * p['RIDGE_OH']) * k / NU for k in range(NU + 1)]
        for k in range(NU):
            x0, x1 = xs[k], xs[k + 1]
            z0, z1 = ztop + sag(x0), ztop + sag(x1)
            tb.hexa([(x0, -rw / 2, z0 - 0.02), (x1, -rw / 2, z1 - 0.02), (x1, rw / 2, z1 - 0.02), (x0, rw / 2, z0 - 0.02),
                     (x0, -rw / 2, z0 + rh), (x1, -rw / 2, z1 + rh), (x1, rw / 2, z1 + rh), (x0, rw / 2, z0 + rh)])

        # chunky ridge-beam end blocks under the crossed bargeboards (hero)
        for sx in (-1, 1):
            xe = sx * (hl + p['GABLE_OH'] + p['RIDGE_OH'] + 0.02)
            tb.box((min(xe, xe - sx * 0.22), -0.075, zr - 0.10), (max(xe, xe - sx * 0.22), 0.075, ztop + rh * 0.6))

    # ------------------------------------------------------------------ walls: planks, door, ramp, nest box, window
    if 'walls' in want:
        pa = part('plank_walls', 'Plank_Cream', 'walls'); pb = part('plank_walls_shade', 'Plank_CreamShade', 'walls')
        T, PH = p['PLANK_T'], p['PLANK_H']
        holes = {'front': [(DX0, DX1, ZS, ZS + p['DOOR_H'])], 'xpos': [(p['WIN_YC'] - p['WIN'][0] / 2, p['WIN_YC'] + p['WIN'][0] / 2, ZS + p['WIN_Z'], ZS + p['WIN_Z'] + p['WIN'][1])]}

        def course(wall, a0, a1, z0, z1, k):
            pk = pb if k % 3 == 1 else pa
            off = rnd.uniform(-0.004, 0.006) + (0.008 if k % 2 else 0)
            segs = [(a0, a1)]
            for h0, h1, hz0, hz1 in holes.get(wall, []):
                if z1 > hz0 + 0.005 and z0 < hz1 - 0.005:
                    segs = [s for seg in segs for s in ((seg[0], min(seg[1], h0)), (max(seg[0], h1), seg[1])) if s[1] - s[0] > 0.01]
            for s0, s1 in segs:
                if wall == 'front':
                    pk.box((s0, -hd - off, z0 + 0.004), (s1, -hd + T, z1 - 0.004))
                elif wall == 'back':
                    pk.box((s0, hd - T, z0 + 0.004), (s1, hd + off, z1 - 0.004))
                elif wall == 'xpos':
                    pk.box((hl - T, s0, z0 + 0.004), (hl + off, s1, z1 - 0.004))
                else:
                    pk.box((-hl - off, s0, z0 + 0.004), (-hl + T, s1, z1 - 0.004))
        n = max(1, round((ZE - ZS) / PH)); h = (ZE - ZS) / n
        for k in range(n):
            z0, z1 = ZS + k * h, ZS + (k + 1) * h
            course('front', -hl, hl, z0, z1, k); course('back', -hl, hl, z0, z1, k + 1)
            course('xpos', -hd, hd, z0, z1, k + 2); course('xneg', -hd, hd, z0, z1, k)
        # solid core behind the planks, so the plank gaps never show daylight
        pb.box((-hl + T, -hd + T, ZS), (hl - T, hd - T, ZE))
        # gable triangles: horizontal planks cut to the rake
        for sx in (-1, 1):
            z = ZE; k = 0
            while z < zr - 0.05:
                z1 = min(z + PH, zr)
                y0 = max(0.02, hd - (z - Z0) / t - 0.01) if z > Z0 else hd
                y1 = max(0.0, hd - (z1 - Z0) / t - 0.01)
                pk = pb if k % 3 == 1 else pa
                x0, x1 = (hl - T, hl + 0.004 * (k % 2)) if sx > 0 else (-hl - 0.004 * (k % 2), -hl + T)
                pk.prism_yz([(-y0, z + 0.004), (y0, z + 0.004), (y1, z1 - 0.004), (-y1, z1 - 0.004)], x0, x1)
                z = z1; k += 1
        # door: vertical planks, ledges, trim, strap hinges, ring
        tr = part('trim', 'Timber_Light', 'walls'); ir = part('iron_fittings', 'Metal_Iron', 'walls')
        dr = part('door', 'Plank_Cream', 'walls')
        yd = -hd + 0.01; zt = ZS + p['DOOR_H']
        nb = 3; w = (DX1 - DX0) / nb
        for k in range(nb):
            dr.box((DX0 + k * w + 0.006, yd - 0.03, ZS), (DX0 + (k + 1) * w - 0.006, yd, zt))
        tr.box((DX0 + 0.02, yd - 0.05, ZS + 0.04), (DX1 - 0.02, yd - 0.03, ZS + 0.09))      # bottom ledge
        tr.box((DX0 - 0.05, -hd - 0.05, ZS), (DX0, -hd + 0.01, zt + 0.05))                  # door trim
        tr.box((DX1, -hd - 0.05, ZS), (DX1 + 0.05, -hd + 0.01, zt + 0.05))
        tr.box((DX0 - 0.06, -hd - 0.055, zt), (DX1 + 0.06, -hd + 0.01, zt + 0.06))
        for zz in (ZS + 0.12, zt - 0.14):
            ir.box((DX0 + 0.01, yd - 0.045, zz), (DX0 + 0.19, yd - 0.03, zz + 0.03))
            ir.box((DX0 + 0.17, yd - 0.045, zz - 0.007), (DX0 + 0.21, yd - 0.03, zz + 0.037))
        ring = bmesh.new(); bmesh.ops.create_circle(ring, segments=8, radius=0.036)
        cx, cz = DX1 - 0.06, ZS + p['DOOR_H'] * 0.5
        for e in ring.edges:
            a, b2 = e.verts[0].co, e.verts[1].co
            ir.beam((cx + a.x, yd - 0.05, cz + a.y), (cx + b2.x, yd - 0.05, cz + b2.y), 0.014, 0.014)
        ring.free()
        # ramp: two stringers from the sill to the ground and slats across
        rp = part('ramp', 'Timber_Light', 'walls'); rs = part('ramp_rails', 'Timber_Shade', 'walls')
        rw = p['RAMP_W']; yt, zt0 = -hd - 0.06, ZS - 0.01; yf = -hd - p['RAMP_RUN']; zf = 0.07
        dirv = Vector((0, yf - yt, zf - zt0)); ln = dirv.length; dirv.normalize(); nrm = Vector((0, -dirv.z, dirv.y))
        if nrm.z < 0:
            nrm = -nrm
        for sx in (-1, 1):
            xr = p['DOOR_XC'] + sx * (rw / 2 + 0.02)
            rs.beam((xr, yt + 0.03, zt0 - 0.03), (xr, yf - 0.02, zf - 0.03), 0.05, 0.09, up=tuple(nrm))
        ns = 9
        for k in range(ns):
            c = Vector((p['DOOR_XC'], yt, zt0)) + dirv * (ln * (k + 0.5) / ns) + nrm * 0.02
            sl = ln / ns * 0.82
            corners = []
            for dz in (-0.015, 0.015):
                for s_, xx in ((-1, -rw / 2), (1, -rw / 2), (1, rw / 2), (-1, rw / 2)):
                    q = c + dirv * (s_ * sl / 2) + nrm * dz
                    corners.append((q.x + xx + rnd.uniform(-0.01, 0.01), q.y, q.z))
            rp.hexa([corners[0], corners[1], corners[2], corners[3], corners[4], corners[5], corners[6], corners[7]])
        # nest box on the front-left: box, plank front, trim edges, sloped lid
        nb_ = part('nest_box', 'Plank_Cream', 'walls')
        nx, (nl, nd, nh), nz = p['NEST_XC'], p['NEST'], ZS + p['NEST_Z']
        y0, y1 = -hd - nd, -hd
        nb_.box((nx - nl / 2, y0, nz), (nx + nl / 2, y1, nz + nh))
        tr.box((nx - nl / 2 - 0.02, y0 - 0.02, nz - 0.04), (nx + nl / 2 + 0.02, y1, nz + 0.02))            # base trim
        for xx in (nx - nl / 2 - 0.02, nx + nl / 2 - 0.02):
            tr.box((xx, y0 - 0.028, nz + 0.005), (xx + 0.04, y0 + 0.03, nz + nh))                                    # corner trims
        lid = part('nest_lid', 'Plank_CreamShade', 'walls')
        lid.prism_yz([(y0 - 0.06, nz + nh - 0.02), (y1 + 0.005, nz + nh + 0.12), (y1 + 0.005, nz + nh + 0.155), (y0 - 0.06, nz + nh + 0.015)],
                     nx - nl / 2 - 0.05, nx + nl / 2 + 0.05)
        for xx in (nx - nl / 2 - 0.05, nx + nl / 2 + 0.01):
            tr.prism_yz([(y0 - 0.06, nz + nh + 0.015), (y1 + 0.005, nz + nh + 0.155), (y1 + 0.005, nz + nh + 0.19), (y0 - 0.06, nz + nh + 0.05)], xx, xx + 0.04)
        ir.box((nx + nl * 0.25 - 0.02, y0 - 0.008, nz + nh * 0.55), (nx + nl * 0.25 + 0.02, y0 + 0.01, nz + nh * 0.7))                # latch
        hole = part('nest_hole', 'Plank_Shadow', 'walls')                                                       # entry hole on its front
        hc = Vector((nx - nl * 0.22, y0 - 0.006, nz + nh * 0.6))
        oc = [hc + Vector((0.045 * math.cos(k * math.pi / 4), 0, 0.045 * math.sin(k * math.pi / 4))) for k in range(8)]
        hole.poly([tuple(v) for v in oc] + [tuple(v + Vector((0, 0.012, 0))) for v in oc],
                  [tuple(range(8)), tuple(range(15, 7, -1))] + [(k, 8 + k, 8 + (k + 1) % 8, (k + 1) % 8) for k in range(8)])
        # mesh window with a trimmed frame on the +X gable wall
        wy0, wy1 = p['WIN_YC'] - p['WIN'][0] / 2, p['WIN_YC'] + p['WIN'][0] / 2
        wz0, wz1 = ZS + p['WIN_Z'], ZS + p['WIN_Z'] + p['WIN'][1]
        ms = part('mesh', 'Metal_Mesh', 'walls'); sh = part('interior', 'Plank_Shadow', 'walls')
        ms.box((hl - 0.03, wy0, wz0), (hl - 0.02, wy1, wz1))
        sh.box((hl - 0.12, wy0, wz0), (hl - 0.10, wy1, wz1))
        fx0, fx1 = hl - 0.01, hl + 0.045
        tr.box((fx0, wy0 - 0.05, wz0 - 0.05), (fx1, wy0, wz1))
        tr.box((fx0, wy1, wz0 - 0.05), (fx1, wy1 + 0.05, wz1))
        tr.box((fx0, wy0 - 0.03, wz0 - 0.06), (fx1 + 0.01, wy1 + 0.03, wz0))
        tr.box((fx0, wy0 - 0.09, wz1), (fx1 + 0.02, wy1 + 0.09, wz1 + 0.07))                                  # lintel

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
            export(os.path.join(HERE, 'chicken-coop.glb'))


if __name__ == '__main__':
    main()

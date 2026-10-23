"""Lamp kit (Ranch remaster R4): four lamps in the Ranch dialect.  usage: python build.py [piece ...]

Writes crook-lantern.glb, post-lantern.glb, porch-lamp.glb and string-lights.glb next to this file.
Shapes are read off the concept sheet (../../mj/lamp-kit/sheet.png on the concept branch): every piece is drawn
front-on, so profiles are given in sheet pixels of that piece's crop (views/<piece>/view_front.png) and converted
to metres with the piece's scale (PX). Z up, metres, front faces -Y.
Origins: crook, post and string lights at the base centre on the ground; the porch lamp at the wall plate centre,
with the wall at +Y (the plate's back face is the plane y = 0).
Materials: Iron_Black (all iron, cable, sockets), Timber_Warm (posts), Glass_Warm (glass and bulbs only, base
colour and emissive #ffc56b; the game drives the emissive strength). A LightAnchor empty sits at each flame or
bulb centre (string lights: LightAnchor_1..4, left to right).
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

COL = dict(Iron_Black=(46, 37, 31), Timber_Warm=(100, 58, 36), Glass_Warm=(255, 197, 107))
SMOOTH = 50  # degrees: edges sharper than this stay hard (authored split normals)

# ---- crook lantern: crop px, pole axis x=160, ground y=1480, 1420 px = 2.2 m
CROOK = dict(
    px=2.2 / 1420, axis=159, ground=1480, sides=8,
    base=[(1480, 68), (1452, 68), (1440, 46), (1412, 40), (1398, 33), (1380, 45), (1365, 55), (1350, 63),
          (1335, 75), (1320, 84), (1295, 74), (1255, 62), (1205, 57), (1192, 66), (1176, 64),
          (1160, 50), (1140, 42), (1126, 29), (1110, 25), (1100, 37), (1068, 37), (1054, 26), (1004, 24),
          (560, 22), (556, 37), (540, 30), (528, 25), (512, 29), (498, 37), (482, 30), (472, 16)],
    crook=[(159, 472), (159, 300), (160, 225), (163, 182), (172, 146), (190, 118), (214, 94), (245, 77), (280, 72),
           (313, 79), (338, 96), (356, 118), (368, 145), (378, 172), (390, 202), (403, 232), (419, 262), (441, 285),
           (470, 297), (500, 296), (523, 284), (536, 264), (537, 242), (527, 224), (510, 215), (494, 219)],
    crook_r=15, tip_r=8, taper_from=19,  # tube radius px; tapers to tip_r over the last points from index taper_from
    link1=(470, 300, 18, 24, 6),          # centre x, y, half width, half height, wire radius (px), turned 70 deg
    link2=(476, 392, 38, 70, 6),          # big oval link in the front plane
    lx=475,                               # lantern axis x
    lantern_iron=[(470, 0), (470, 20), (456, 20), (450, 12), (440, 8), (432, 0)],   # finial (y, half width)
    roof=[(550, 76), (546, 101), (538, 101), (528, 86), (512, 78), (496, 62), (482, 50), (472, 28), (466, 22), (466, 0)],
    glass=[(712, 60), (690, 64), (660, 75), (615, 79), (585, 78), (552, 70)],
    floor=[(740, 0), (740, 14), (728, 30), (724, 52), (714, 52), (712, 58)],
    knob=(746, 11),
    bar_r=4.5,
)

# ---- post lantern: crop px, axis x=180, ground y=1508, 1448 px = 1.5 m
POST = dict(
    px=1.5 / 1448, axis=180, ground=1508,
    post_top=548, post_w_top=(132, 128), post_w_foot=(112, 110), segs=5, jitter=4,
    iron=[(548, 0), (548, 15), (530, 15), (530, 32), (515, 46), (492, 58), (478, 62), (477, 98), (458, 98), (456, 80),
          (456, 0)],
    glass=[(456, 78), (440, 96), (400, 113), (340, 118), (290, 108), (250, 88), (232, 74)],
    roof=[(232, 0), (232, 112), (224, 124), (216, 122), (205, 95), (170, 62), (148, 42), (140, 24), (128, 12), (128, 0)],
    ring=(100, 26, 34, 7),   # ring centre y, half width, half height, wire radius
    bar_r=5, flame_y=372,
)

# ---- porch lamp: metres, plate centre at the origin, wall at +Y, lantern hangs at -Y
PORCH = dict(
    plate=(0.12, 0.20, 0.03),            # width X, height Z, thickness Y
    knob=(-0.088, 0.017),                # z, radius
    boss=(0.05, 0.035, 0.06, 0.02),      # x size, y depth, z size, z centre
    arm=[(-0.045, -0.02), (-0.05, 0.13), (-0.065, 0.20), (-0.10, 0.245), (-0.145, 0.25), (-0.18, 0.225),
         (-0.197, 0.175), (-0.20, 0.115)],   # (y, z) path of the arm, plate boss to lantern finial
    arm_r=0.019,
    ly=-0.20,                            # lantern axis y
    lantern=[(0.115, 0.0), (0.115, 0.012), (0.10, 0.02), (0.075, 0.03), (0.07, 0.05), (0.075, 0.072), (0.072, 0.076),
             (0.03, 0.076), (-0.02, 0.112), (-0.028, 0.115), (-0.03, 0.115), (-0.03, 0.0)],  # roof (z, r) top down
    glass=[(-0.03, 0.078), (-0.165, 0.068)],
    floor=[(-0.165, 0.08), (-0.178, 0.08), (-0.18, 0.05), (-0.225, 0.0)],
    sides=6, bar_r=0.0055, anchor_z=-0.10,
)

# ---- string lights: metres
STRING = dict(
    span=float(os.environ.get('LAMP_SPAN', 2.5)),  # LAMP_SPAN=1.63 gives the sheet's spacing (reference score only)
    posts=[(2.42, 0.135, 0.3, 0.6), (2.38, 0.13, -0.7, -0.5)],  # height, width, lean x (deg), lean y (deg)
    segs=6, jitter=0.012, seed=4,
    cable_z=(2.17, 2.13), sag=0.32,  # metres at mid-span
    cable_r=0.013,
    bulbs=[0.10, 0.33, 0.60, 0.87], bulb_r=0.055, socket=(0.02, 0.032),
    tie_h=0.06, tie_t=0.018,
)


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85 if name != 'Glass_Warm' else 0.35
    if name == 'Iron_Black':
        b.inputs['Metallic'].default_value = 0.3; b.inputs['Roughness'].default_value = 0.7
    if name == 'Glass_Warm':
        b.inputs['Emission Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Emission Strength'].default_value = 1.0
    return m


# ------------------------------------------------------------------ geometry helpers (all write into a bmesh)
def lathe(bm, prof, n, frame=Matrix.Identity(4), rot=0.0, cap=True):
    """prof: [(r, z)] bottom-to-top or top-to-bottom; r == 0 collapses to a point. frame places the axis (local Z)."""
    rings = []
    for r, z in prof:
        if r < 1e-6:
            rings.append([bm.verts.new(frame @ Vector((0, 0, z)))])
        else:
            rings.append([bm.verts.new(frame @ Vector((r * math.cos(rot + 2 * math.pi * k / n),
                                                        r * math.sin(rot + 2 * math.pi * k / n), z))) for k in range(n)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for k in range(n):
            if len(a) == 1:
                bm.faces.new((a[0], b[k], b[(k + 1) % n]))
            elif len(b) == 1:
                bm.faces.new((a[k], a[(k + 1) % n], b[0]))
            else:
                bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if cap:
        for ring in (rings[0], rings[-1]):
            if len(ring) > 2:
                bm.faces.new(ring)
    return rings


def spline(pts, k=3):
    """Catmull-Rom resample: k points per span (keeps the ends)."""
    P = [Vector(p) for p in pts]; P = [P[0]] + P + [P[-1]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for j in range(k):
            t = j / k
            out.append(0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2]); return out


def tube(bm, pts, radii, sides=8, cap=True):
    pts = [Vector(p) for p in pts]
    tans = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        tans.append((b - a).normalized())
    up = Vector((0, 1, 0)) if abs(tans[0].y) < 0.9 else Vector((1, 0, 0))
    nrm = (up - tans[0] * up.dot(tans[0])).normalized()
    rings = []
    for i, (p, t) in enumerate(zip(pts, tans)):
        if i:
            nrm = (nrm - t * nrm.dot(t)).normalized()
        bi = t.cross(nrm)
        r = radii[i]
        rings.append([bm.verts.new(p + (nrm * math.cos(2 * math.pi * k / sides) + bi * math.sin(2 * math.pi * k / sides)) * r)
                      for k in range(sides)])
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
    if cap:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])


def torus(bm, c, u, v, ru, rv, r, segs=12, sides=6):
    c, u, v = Vector(c), Vector(u).normalized(), Vector(v).normalized()
    w = u.cross(v)
    pts = [c + u * ru * math.cos(2 * math.pi * i / segs) + v * rv * math.sin(2 * math.pi * i / segs) for i in range(segs)]
    rings = []
    for i, p in enumerate(pts):
        radial = (p - c).normalized()
        rings.append([bm.verts.new(p + (radial * math.cos(2 * math.pi * k / sides) + w * math.sin(2 * math.pi * k / sides)) * r)
                      for k in range(sides)])
    for i in range(segs):
        a, b = rings[i], rings[(i + 1) % segs]
        for k in range(sides):
            bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))


def sphere(bm, c, r, segs=10, rings=6):
    prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
    lathe(bm, prof, segs, Matrix.Translation(Vector(c)), cap=False)


def post_beam(bm, z0, z1, w0, w1, segs, jitter, rng, lean=(0, 0), top_cut=0.0):
    """Square timber with jittered corners along its length, leaning (deg about Y, deg about X), sloped top."""
    rings = []
    for i in range(segs + 1):
        t = i / segs; z = z0 + (z1 - z0) * t
        wx = w0[0] + (w1[0] - w0[0]) * t; wy = w0[1] + (w1[1] - w0[1]) * t
        ring = []
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            j = (lambda: rng.uniform(-jitter, jitter)) if 0 < i < segs else (lambda: rng.uniform(-jitter, jitter) * 0.4)
            zz = z + (top_cut * (sx * 0.5 + 0.5) if i == segs else 0)
            ring.append(Vector((sx * wx / 2 + j(), sy * wy / 2 + j(), zz)))
        rings.append(ring)
    L = Matrix.Rotation(math.radians(lean[0]), 4, 'Y') @ Matrix.Rotation(math.radians(lean[1]), 4, 'X')
    vr = [[bm.verts.new(L @ p) for p in ring] for ring in rings]
    for a, b in zip(vr, vr[1:]):
        for k in range(4):
            bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    bm.faces.new(list(reversed(vr[0]))); bm.faces.new(vr[-1])
    return L


def finish(bm, name, material, smooth=SMOOTH, bevel=0.0):
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES', profile=0.5,
                        clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(smooth))
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def anchor(name, loc):
    e = bpy.data.objects.new(name, None); e.location = loc; e.empty_display_size = 0.05
    bpy.context.scene.collection.objects.link(e); return e


# ------------------------------------------------------------------ pieces
def build_crook():
    P = CROOK; s = P['px']
    X = lambda x: (x - P['axis']) * s
    Z = lambda y: (P['ground'] - y) * s
    bm = bmesh.new()
    lathe(bm, [(r * s, Z(y)) for y, r in P['base']], P['sides'])
    n = len(P['crook']); rr = []
    for i in range(n):
        f = 0 if i < P['taper_from'] else (i - P['taper_from']) / (n - 1 - P['taper_from'])
        rr.append((P['crook_r'] + (P['tip_r'] - P['crook_r']) * f) * s)
    tube(bm, [(X(x), 0, Z(y)) for x, y in P['crook']], rr, sides=6)
    cx, cy, hw, hh, wr = P['link1']
    rot = Matrix.Rotation(math.radians(70), 3, 'Z')
    torus(bm, (X(cx), 0, Z(cy)), rot @ Vector((1, 0, 0)), (0, 0, 1), hw * s, hh * s, wr * s, 8, 5)
    cx, cy, hw, hh, wr = P['link2']
    torus(bm, (X(cx), 0, Z(cy)), (1, 0, 0), (0, 0, 1), hw * s, hh * s, wr * s, 12, 5)
    # lantern iron: finial, roof, floor and knob, corner bars
    F = Matrix.Translation((X(P['lx']), 0, 0))
    lathe(bm, [(r * s, Z(y)) for y, r in P['lantern_iron']], 6, F)
    lathe(bm, [(r * s, Z(y)) for y, r in P['roof']], 4, F, rot=-math.pi / 2)
    lathe(bm, [(r * s, Z(y)) for y, r in P['floor']], 4, F, rot=-math.pi / 2)
    ky, kr = P['knob']; sphere(bm, (X(P['lx']), 0, Z(ky)), kr * s, 8, 5)
    for k in range(4):
        a = -math.pi / 2 + k * math.pi / 2
        pts = [(X(P['lx']) + (r + 2) * s * math.cos(a), (r + 2) * s * math.sin(a), Z(y)) for y, r in P['glass']]
        tube(bm, pts, [P['bar_r'] * s] * len(pts), sides=4)
    iron = finish(bm, 'crook_iron', 'Iron_Black')
    bm = bmesh.new()
    lathe(bm, [(r * s, Z(y)) for y, r in P['glass']], 4, F, rot=-math.pi / 2)
    finish(bm, 'lantern_glass', 'Glass_Warm', smooth=60)
    gz = (Z(P['glass'][0][0]) + Z(P['glass'][-1][0])) / 2
    anchor('LightAnchor', (X(P['lx']), 0, gz))


def build_post():
    P = POST; s = P['px']
    Z = lambda y: (P['ground'] - y) * s
    rng = random.Random(2)
    bm = bmesh.new()
    post_beam(bm, 0, Z(P['post_top']), [w * s for w in P['post_w_foot']], [w * s for w in P['post_w_top']],
              P['segs'], P['jitter'] * s, rng, top_cut=-0.012)
    finish(bm, 'post', 'Timber_Warm', smooth=35, bevel=0.008)
    bm = bmesh.new()
    lathe(bm, [(r * s, Z(y)) for y, r in P['iron']], 4, rot=-math.pi / 2)
    lathe(bm, [(r * s, Z(y)) for y, r in P['roof']], 4, rot=-math.pi / 2)
    cy, hw, hh, wr = P['ring']
    torus(bm, (0, 0, Z(cy)), (1, 0, 0), (0, 0, 1), hw * s, hh * s, wr * s, 8, 5)
    for k in range(4):
        a = -math.pi / 2 + k * math.pi / 2
        pts = [((r + 2) * s * math.cos(a), (r + 2) * s * math.sin(a), Z(y)) for y, r in P['glass']]
        tube(bm, pts, [P['bar_r'] * s] * len(pts), sides=4)
    finish(bm, 'lantern_iron', 'Iron_Black')
    bm = bmesh.new()
    lathe(bm, [(r * s, Z(y)) for y, r in P['glass']], 4, rot=-math.pi / 2)
    finish(bm, 'lantern_glass', 'Glass_Warm', smooth=60)
    anchor('LightAnchor', (0, 0, Z(P['flame_y'])))


def build_porch():
    P = PORCH
    bm = bmesh.new()
    w, h, t = P['plate']
    # hexagonal back plate, long axis vertical: a 6-sided lathe around Y, squashed in X
    fr = Matrix.Translation((0, -t / 2, 0)) @ Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Diagonal((w / h, 1, 1, 1))
    lathe(bm, [(h / 2, -t / 2), (h / 2, t / 2), (h / 2 - 0.012, t / 2 + 0.008)], 6, fr, rot=math.pi / 2)
    kz, kr = P['knob']; sphere(bm, (0, -t - kr * 0.6, kz), kr, 8, 5)
    bx, by, bz, bc = P['boss']
    lathe(bm, [(bx / 2, 0), (bx / 2, by), (bx / 2 * 0.8, by + 0.006)], 6,
          Matrix.Translation((0, -t, bc)) @ Matrix.Rotation(math.radians(90), 4, 'X'))
    arm = spline([(0, y, z) for y, z in P['arm']], 2)
    tube(bm, arm, [P['arm_r']] * len(arm), sides=8)
    L = Matrix.Translation((0, P['ly'], 0))
    lathe(bm, [(r, z) for z, r in P['lantern']], P['sides'], L, rot=math.pi / 2)
    lathe(bm, [(r, z) for z, r in P['floor']], P['sides'], L, rot=math.pi / 2)
    for k in range(P['sides']):
        a = math.pi / 2 + k * 2 * math.pi / P['sides']
        pts = [((r + 0.003) * math.cos(a), P['ly'] + (r + 0.003) * math.sin(a), z) for z, r in P['glass']]
        tube(bm, pts, [P['bar_r']] * 2, sides=4)
    finish(bm, 'porch_iron', 'Iron_Black')
    bm = bmesh.new()
    lathe(bm, [(r, z) for z, r in P['glass']], P['sides'], L, rot=math.pi / 2)
    finish(bm, 'lantern_glass', 'Glass_Warm', smooth=40)
    anchor('LightAnchor', (0, P['ly'], P['anchor_z']))


def build_string():
    P = STRING; rng = random.Random(P['seed'])
    half = P['span'] / 2
    ends = []
    for i, (ph, pw, lx, ly) in enumerate(P['posts']):
        sx = -half if i == 0 else half
        bm = bmesh.new()
        L = post_beam(bm, 0, ph, (pw * 1.08, pw * 1.02), (pw * 0.92, pw * 0.9), P['segs'], P['jitter'], rng,
                      lean=(lx, ly), top_cut=-0.06 if i == 0 else 0.05)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(sx, 0, 0))
        finish(bm, f'post_{"left" if i == 0 else "right"}', 'Timber_Warm', smooth=35, bevel=0.01)
        cz = P['cable_z'][i]
        c = Matrix.Translation((sx, 0, 0)) @ L @ Vector((0, 0, cz))
        ends.append((c, pw, L))
    bm = bmesh.new()
    # ties: a square band around each post at cable height
    for (c, pw, L), side in zip(ends, (1, -1)):
        tb = bmesh.new()
        hw = pw * 0.5 + P['tie_t'] * 0.5
        pts = [Vector((x, y, 0)) for x, y in ((-hw, -hw), (hw, -hw), (hw, hw), (-hw, hw))]
        rings = []
        for dz in (-P['tie_h'] / 2, P['tie_h'] / 2):
            for o in (1.0, (hw + P['tie_t']) / hw):
                rings.append([tb.verts.new(p * o + Vector((0, 0, dz))) for p in pts])
        il, ol, iu, ou = rings
        for k in range(4):
            n = (k + 1) % 4
            tb.faces.new((ol[k], ol[n], ou[n], ou[k])); tb.faces.new((il[n], il[k], iu[k], iu[n]))
            tb.faces.new((ou[k], ou[n], iu[n], iu[k])); tb.faces.new((ol[n], ol[k], il[k], il[n]))
        M = Matrix.Translation(c) @ L.to_3x3().to_4x4() @ Matrix.Rotation(math.radians(8 * side), 4, 'Y')
        bmesh.ops.transform(tb, matrix=M, verts=tb.verts)
        me = bpy.data.meshes.new('_t'); tb.to_mesh(me); tb.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    a = ends[0][0] + Vector((ends[0][1] * 0.5, 0, 0)); b = ends[1][0] - Vector((ends[1][1] * 0.5, 0, 0))
    def cable(t):
        p = a.lerp(b, t); p.z -= P['sag'] * 4 * t * (1 - t); return p
    N = 24
    tube(bm, [cable(i / N) for i in range(N + 1)], [P['cable_r']] * (N + 1), sides=6)
    sr, sh = P['socket']
    bulbs = []
    for t in P['bulbs']:
        p = cable(t)
        lathe(bm, [(sr, -sh), (sr, 0), (sr * 0.7, 0.01)], 6, Matrix.Translation(p))
        bc = p + Vector((0, 0, -sh - P['bulb_r'] * 0.7)); bulbs.append(bc)
    finish(bm, 'cable', 'Iron_Black')
    bm = bmesh.new()
    for bc in bulbs:
        sphere(bm, bc, P['bulb_r'], 10, 6)
    finish(bm, 'bulbs', 'Glass_Warm', smooth=60)
    for i, bc in enumerate(bulbs):
        anchor(f'LightAnchor_{i + 1}', bc)


PIECES = {'crook-lantern': build_crook, 'post-lantern': build_post, 'porch-lamp': build_porch, 'string-lights': build_string}


def main(names):
    for name in names:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        PIECES[name]()
        dg = bpy.context.evaluated_depsgraph_get(); tris = 0
        for o in bpy.context.scene.objects:
            if o.type == 'MESH':
                m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
                o.evaluated_get(dg).to_mesh_clear()
        out = os.path.join(HERE, f'{name}.glb')
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_apply=True,
                                  export_extras=False)
        print(f'{name}: triangles {tris}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(PIECES))

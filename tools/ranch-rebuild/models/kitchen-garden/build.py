"""kitchen-garden (Ranch remaster R2): the crop bed and the crop kit, built from mj/kitchen-garden/sheet.png.

Pieces (one GLB each, in this folder):
  bed           raised timber bed: two planks a side, corner posts with dark iron bolts, a soil fill, six soil mounds,
                and six empties `crop_slot_1..6` on the mound centres (where a crop stage goes)
  stake         a round garden stake with a twine lashing and two loose tails
  watering-can  a grey zinc can: ten-sided body with rim bands, top handle, back handle, spout with a rose and a stay
  crop-sprout, crop-growing, crop-ripe, crop-thirsty
                the crop kit: one plant in its own soil mound. All four share the same mound and the same root origin
                (the mound's base centre, z = 0), so the game swaps one stage for another in place. Ripe carries gold
                fruit; thirsty droops, its leaves wilted brown #968241.

usage: python build.py [piece ...]      (no argument: every piece)

Z up, metres, origin at the base centre on the ground, front faces -Y. Smooth authored normals (smooth shading, plus a
weighted-normal pass on the chamfered timber and metal so flat faces stay flat and the chamfers catch the light),
flat base colours, no textures. All shape numbers live in P.
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    # bed
    BED_L=1.10, BED_D=0.80, BED_H=0.30,             # plank centrelines; the posts bring the outside to ~1.21 x 0.91
    PLANKS=2, PLANK_T=0.045, PLANK_GAP=0.008, PLANK_BEVEL=0.009,
    POST=0.085, POST_H=0.33, POST_OUT=0.022,       # corner post section, height, how far it stands proud of the planks
    BOLT_R=0.016, BOLT_T=0.012,
    SOIL_Z=0.245,                                   # soil surface inside the bed
    SLOTS_X=(-0.335, 0.0, 0.335), SLOTS_Y=(-0.17, 0.17),
    MOUND_R=0.145, MOUND_H=0.11,                    # bed mound; the crop mound is CROP_MOUND x this
    CROP_MOUND=1.05,
    # stake
    STAKE_H=1.20, STAKE_R=0.024, TWINE_Z=1.00,
    # watering can
    CAN_R=0.12, CAN_H=0.27, CAN_SIDES=10, CAN_HOLE=(0.035, 0.6),   # filler hole: offset to the back handle, radius / CAN_R
    SPOUT_BASE=(0.115, 0.07), SPOUT_TIP=(0.34, 0.21), SPOUT_R=(0.022, 0.011),   # (x out from the axis, z)
    # crops: (stem height, leaf count, leaf length)
    SPROUT=(0.15, 2, 0.085), GROWING=(0.50, 7, 0.175), RIPE=(0.76, 9, 0.20), THIRSTY=(0.74, 8, 0.205), PETIOLE=0.035,
    FRUIT_R=0.062, LEAF_W=0.82, LEAF_ROLL=0.75,   # leaf width / length; roll of the blades towards the front (rad)
)

COL = {  # sRGB, sampled from the sheet's lit faces
    'Plank_Cedar': (132, 92, 52), 'Timber_Post': (122, 84, 46), 'Metal_Iron': (52, 52, 56), 'Soil_Dark': (44, 35, 25),
    'Timber_Stake': (164, 112, 64), 'Rope_Twine': (214, 196, 160),
    'Metal_Zinc': (164, 160, 150), 'Metal_ZincDark': (70, 70, 70),
    'Leaf_Green': (92, 146, 46), 'Stem_Green': (84, 128, 44), 'Fruit_Gold': (222, 172, 50),
    'Wilted_Brown': (0x96, 0x82, 0x41),   # not named Leaf_: the seasons recolour *leaf* materials, thirst must stay brown
}


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.55 if name.startswith('Metal') else 0.85
        if name.startswith('Metal'):
            b.inputs['Metallic'].default_value = 0.35
        # leaves and twine tails are single sheets (glTF doubleSided); everything else is closed and culls its back faces
        m.use_backface_culling = not name.startswith(('Leaf', 'Wilted', 'Rope'))
        MATS[name] = m
    return MATS[name]


# ------------------------------------------------------------------ geometry helpers (all write into a bmesh)
def box(bm, lo, hi, bevel=0.0, segments=1):
    r = bmesh.ops.create_cube(bm, size=1.0)
    vs = r['verts']
    c = [(lo[i] + hi[i]) / 2 for i in range(3)]; s = [hi[i] - lo[i] for i in range(3)]
    for v in vs:
        v.co = Vector((c[0] + v.co.x * s[0], c[1] + v.co.y * s[1], c[2] + v.co.z * s[2]))
    if bevel:
        edges = list({e for v in vs for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=vs + edges, offset=bevel, segments=segments, profile=0.5, affect='EDGES')
    return vs


def cyl(bm, p0, p1, r0, r1, sides, cap0=True, cap1=True, phase=0.0):
    """A tapered prism from p0 to p1."""
    p0, p1 = Vector(p0), Vector(p1); ax = (p1 - p0).normalized()
    u = ax.orthogonal().normalized(); w = ax.cross(u)
    rings = []
    for p, r in ((p0, r0), (p1, r1)):
        rings.append([bm.verts.new(p + (u * math.cos(phase + 2 * math.pi * i / sides) + w * math.sin(phase + 2 * math.pi * i / sides)) * r)
                      for i in range(sides)])
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    if cap0:
        bm.faces.new(list(reversed(rings[0])))
    if cap1:
        bm.faces.new(rings[1])
    return rings


def tube(bm, pts, radii, sides, cap0=True, cap1=True):
    """A smooth tube along a polyline (parallel-transported rings)."""
    pts = [Vector(p) for p in pts]; rings = []
    t0 = (pts[1] - pts[0]).normalized(); u = t0.orthogonal().normalized()
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        u = (u - t * u.dot(t)).normalized(); w = t.cross(u)
        rings.append([bm.verts.new(p + (u * math.cos(2 * math.pi * i / sides) + w * math.sin(2 * math.pi * i / sides)) * radii[k])
                      for i in range(sides)])
    for a, b in zip(rings, rings[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap0:
        bm.faces.new(list(reversed(rings[0])))
    if cap1:
        tip = bm.verts.new(pts[-1] + (pts[-1] - pts[-2]).normalized() * radii[-1] * 0.6)
        for i in range(sides):
            bm.faces.new((rings[-1][i], rings[-1][(i + 1) % sides], tip))
    return rings


def torus(bm, c, R, r, seg, sides, tilt=(0.0, 0.0), squash=1.0):
    M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(tilt[0], 4, 'X') @ Matrix.Rotation(tilt[1], 4, 'Y')
    rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new(M @ Vector(((R + r * math.cos(2 * math.pi * k / sides)) * ca, (R + r * math.cos(2 * math.pi * k / sides)) * sa * squash,
                                               r * math.sin(2 * math.pi * k / sides)))) for k in range(sides)])
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for k in range(sides):
            bm.faces.new((a[k], b[k], b[(k + 1) % sides], a[(k + 1) % sides]))


def mound(bm, c, R, H, seed, seg=10):
    """A soft heap of soil: three jittered rings and an apex, open underneath (it sits on soil)."""
    rnd = random.Random(seed); c = Vector(c)
    prof = [(1.0, 0.0), (0.88, 0.42), (0.56, 0.82), (0.0, 1.0)]
    jit = [1 + rnd.uniform(-0.08, 0.08) for _ in range(seg)]
    rings = []
    for k, (fr, fz) in enumerate(prof[:-1]):
        rings.append([bm.verts.new(c + Vector((math.cos(2 * math.pi * (i + 0.5 * k) / seg) * R * fr * jit[i],
                                               math.sin(2 * math.pi * (i + 0.5 * k) / seg) * R * fr * jit[(i + k) % seg],
                                               H * fz * (1 + rnd.uniform(-0.06, 0.06)) if k else 0.0))) for i in range(seg)])
    apex = bm.verts.new(c + Vector((rnd.uniform(-0.1, 0.1) * R, rnd.uniform(-0.1, 0.1) * R, H)))
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[i])); bm.faces.new((a[j], b[j], b[i]))
    for i in range(seg):
        bm.faces.new((rings[-1][i], rings[-1][(i + 1) % seg], apex))


def leaf(bm, base, yaw, pitch, L, W, fold=0.35, droop=0.25, curl=0.0, ragged=0.0, seed=0, roll=None):
    """A pointed leaf, folded along its midrib: 3 rib points + tip, 3 points a side, 10 triangles.
    yaw: direction round the stem; pitch: up-angle of the leaf's base; droop bends the blade down towards the tip;
    curl rolls the edges down (wilting); ragged nibbles the outline (wilted leaves)."""
    rnd = random.Random(seed)
    rib = [(0.0, 0.0), (0.38, 0.0), (0.72, 0.0), (1.0, 0.0)]
    side = [(0.18, 0.36), (0.48, 0.50), (0.80, 0.28)]
    def place(x, y):
        rag = 1 - ragged * rnd.random() if y else 1.0
        y = y * W * rag; xx = x * L
        z = fold * abs(y) - droop * L * x * x - curl * (abs(y) / W) ** 2 * W
        return Vector((xx, y, z))
    roll = P['LEAF_ROLL'] * math.cos(yaw) if roll is None else roll   # tip the blade's face towards -Y (the sheet shows faces)
    M = Matrix.Translation(Vector(base)) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-pitch, 4, 'Y') @ Matrix.Rotation(roll, 4, 'X')
    r = [bm.verts.new(M @ place(x, y)) for x, y in rib]
    for sgn in (1, -1):
        s = [bm.verts.new(M @ place(x, sgn * y)) for x, y in side]
        tris = [(r[0], s[0], r[1]), (s[0], s[1], r[1]), (r[1], s[1], r[2]), (s[1], s[2], r[2]), (r[2], s[2], r[3])]
        for t in tris:
            bm.faces.new(t if sgn > 0 else (t[0], t[2], t[1]))


def fruit(bm, c, R, seed, seg=8, rings=5):
    """A slightly lumpy, squat fruit."""
    rnd = random.Random(seed); c = Vector(c)
    r = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=R)
    for v in r['verts']:
        v.co = c + Vector((v.co.x * (1 + rnd.uniform(-0.06, 0.06)), v.co.y * (1 + rnd.uniform(-0.06, 0.06)), v.co.z * 0.82))


def finish(name, bm, material, weighted=False, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    if weighted:   # flat faces stay flat, chamfers blend: the authored-normal look on hard-surface parts
        mod = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); mod.keep_sharp = True; mod.weight = 100
    if parent:
        ob.parent = parent
    return ob


# ------------------------------------------------------------------ pieces
def slot_positions():
    return [(x, y, P['SOIL_Z']) for y in reversed(P['SLOTS_Y']) for x in P['SLOTS_X']]


def build_bed():
    L, D, H, T = P['BED_L'], P['BED_D'], P['BED_H'], P['PLANK_T']
    n, g = P['PLANKS'], P['PLANK_GAP']; ph = (H - g * (n - 1)) / n
    rnd = random.Random(7)
    # planks: the long sides (front/back) run the full length between the posts; the ends sit between them
    bm = bmesh.new()
    for k in range(n):
        z0 = k * (ph + g); z1 = z0 + ph
        for sy in (-1, 1):
            j = rnd.uniform(-0.006, 0.006)
            box(bm, (-L / 2 + 0.01 + j, sy * D / 2 - T / 2, z0), (L / 2 - 0.01 + j, sy * D / 2 + T / 2, z1), P['PLANK_BEVEL'])
        for sx in (-1, 1):
            j = rnd.uniform(-0.006, 0.006)
            box(bm, (sx * L / 2 - T / 2, -D / 2 + T / 2 + j, z0), (sx * L / 2 + T / 2, D / 2 - T / 2 + j, z1), P['PLANK_BEVEL'])
    planks = finish('planks', bm, 'Plank_Cedar', weighted=True)
    # corner posts: square, standing proud of the corner so both faces show a cleat (as on the sheet)
    bm = bmesh.new(); s = P['POST']; o = P['POST_OUT']
    posts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx = sx * (L / 2 + o - s / 2 + T / 2); cy = sy * (D / 2 + o - s / 2 + T / 2)
            box(bm, (cx - s / 2, cy - s / 2, 0.0), (cx + s / 2, cy + s / 2, P['POST_H']), 0.012)
            posts.append((cx, cy))
    finish('corner_posts', bm, 'Timber_Post', weighted=True)
    # iron bolts: two on each outer face of every post, and a pair on each long side's middle (a hidden cleat)
    bm = bmesh.new(); r, t = P['BOLT_R'], P['BOLT_T']
    for (cx, cy) in posts:
        sx, sy = math.copysign(1, cx), math.copysign(1, cy)
        for z in (0.08, 0.235):
            fx = cx + sx * s / 2; cyl(bm, (fx, cy, z), (fx + sx * t, cy, z), r, r * 0.8, 6)
            fy = cy + sy * s / 2; cyl(bm, (cx, fy, z), (cx, fy + sy * t, z), r, r * 0.8, 6)
    for sy in (-1, 1):
        for z in (0.08, 0.235):
            yy = sy * (D / 2 + T / 2); cyl(bm, (0.0, yy, z), (0.0, yy + sy * t, z), r * 0.8, r * 0.65, 6)
    finish('iron_bolts', bm, 'Metal_Iron', weighted=True)
    # soil: a fill slab just under the plank tops, and six mounds
    bm = bmesh.new()
    box(bm, (-L / 2 + T / 2, -D / 2 + T / 2, 0.02), (L / 2 - T / 2, D / 2 - T / 2, P['SOIL_Z']))
    for i, (x, y, z) in enumerate(slot_positions()):
        mound(bm, (x, y, z - 0.004), P['MOUND_R'], P['MOUND_H'], seed=11 + i)
    finish('soil', bm, 'Soil_Dark')
    for i, (x, y, z) in enumerate(slot_positions()):
        e = bpy.data.objects.new(f'crop_slot_{i + 1}', None); e.location = (x, y, z); e.empty_display_size = 0.08
        bpy.context.scene.collection.objects.link(e)


def build_stake():
    H, R = P['STAKE_H'], P['STAKE_R']
    bm = bmesh.new()
    # a slightly wobbly round pole; the end cap is a low cone, so the top reads rounded
    pts = [(0.0, 0.0, 0.0), (0.002, 0.0, H * 0.35), (-0.002, 0.001, H * 0.7), (0.0, 0.0, H - 0.012)]
    tube(bm, pts, [R * 1.04, R, R * 0.98, R * 0.96], 10, cap0=True, cap1=True)
    finish('stake', bm, 'Timber_Stake')
    # twine: three wraps and a knot, two loose tails blowing to the right
    bm = bmesh.new(); z = P['TWINE_Z']
    for k, dz in enumerate((-0.022, 0.0, 0.022)):
        torus(bm, (0, 0, z + dz), R + 0.006, 0.0055, 12, 4, tilt=(0.18 * (k - 1), 0.12))
    fruit(bm, (R + 0.006, -0.004, z + 0.01), 0.013, seed=3, seg=6, rings=4)
    tube(bm, [(R + 0.01, 0, z + 0.012), (0.06, -0.005, z + 0.035), (0.10, 0.0, z + 0.07), (0.13, 0.004, z + 0.09)],
         [0.005, 0.0045, 0.004, 0.0035], 4, cap0=False)
    tube(bm, [(R + 0.01, 0, z + 0.0), (0.05, -0.004, z - 0.04), (0.075, 0.0, z - 0.09), (0.09, 0.003, z - 0.12)],
         [0.005, 0.0045, 0.004, 0.0035], 4, cap0=False)
    finish('twine', bm, 'Rope_Twine')


def build_can():
    R, H, n = P['CAN_R'], P['CAN_H'], P['CAN_SIDES']
    bm = bmesh.new()
    # body: ten flats, a touch narrower at the shoulder, open top with an inward lip
    prof = [(R * 1.02, 0.0), (R * 1.02, 0.018), (R, 0.024), (R * 0.985, H - 0.03), (R * 1.02, H - 0.024), (R * 1.02, H), (R * 0.92, H + 0.012)]
    rings = []
    for r, z in prof:
        rings.append([bm.verts.new((math.cos(2 * math.pi * i / n) * r, math.sin(2 * math.pi * i / n) * r, z)) for i in range(n)])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    # a domed top deck with the filler hole set back towards the handle, a raised lip round it, then a short sleeve
    ox, hr = P['CAN_HOLE'][0], P['CAN_HOLE'][1] * R
    lip = [bm.verts.new((ox + math.cos(2 * math.pi * i / n) * hr, math.sin(2 * math.pi * i / n) * hr, H + 0.022)) for i in range(n)]
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((rings[-1][i], rings[-1][j], lip[j], lip[i]))
    inner = [bm.verts.new((v.co.x, v.co.y, H - 0.04)) for v in lip]
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((lip[i], lip[j], inner[j], inner[i]))
    finish('body', bm, 'Metal_Zinc', weighted=True)
    bm = bmesh.new()
    c = bmesh.ops.create_circle(bm, cap_ends=True, segments=n, radius=P['CAN_HOLE'][1] * R)
    for v in c['verts']:
        v.co.x += P['CAN_HOLE'][0]; v.co.z = H - 0.04
    finish('inside', bm, 'Metal_ZincDark')
    bm = bmesh.new()
    # top handle: an arch along the spout axis, a flat strap
    arc = [(-0.085 + 0.15 * t, 0.0, H + 0.01 + 0.125 * math.sin(math.pi * t) ** 0.6) for t in [i / 8 for i in range(9)]]
    tube(bm, arc, [0.011] * 9, 6, cap0=True, cap1=False)
    # back handle (+X, opposite the spout): a loop from the shoulder down to the lower body
    back = [(R * 0.96, 0, H - 0.015), (R + 0.04, 0, H + 0.005), (R + 0.065, 0, H - 0.06), (R + 0.05, 0, H - 0.15), (R * 0.98, 0, H - 0.19)]
    tube(bm, back, [0.009] * 5, 6, cap0=False, cap1=False)
    # spout (-X): a tapered tube from low on the body, rising, with a rose on the end and a thin stay to the shoulder
    bx, bz = P['SPOUT_BASE']; tx, tz = P['SPOUT_TIP']; r0, r1 = P['SPOUT_R']
    sp = [(-bx + 0.01, 0, bz), (-(bx + (tx - bx) * 0.33), 0, bz + (tz - bz) * 0.33), (-(bx + (tx - bx) * 0.66), 0, bz + (tz - bz) * 0.66), (-tx, 0, tz)]
    tube(bm, sp, [r0, r0 * 0.8, r0 * 0.62, r1], 8, cap0=False, cap1=False)
    d = Vector((-(tx - bx), 0, tz - bz)).normalized()
    tip = Vector((-tx, 0, tz))
    cyl(bm, tip - d * 0.004, tip + d * 0.035, r1 * 1.1, 0.034, 10, cap0=False, cap1=True)
    tube(bm, [(-(bx + (tx - bx) * 0.5), 0, bz + (tz - bz) * 0.5 + 0.01), (-(R + 0.02), 0, H * 0.62), (-R * 0.97, 0, H * 0.66)], [0.004] * 3, 4, cap0=False, cap1=False)
    finish('handles_spout', bm, 'Metal_Zinc', weighted=False)


CROPS = {  # stage: (P key, leaf material, droop, fold, curl, ragged, fruit count)
    'crop-sprout': ('SPROUT', 'Leaf_Green', 0.15, 0.35, 0.0, 0.0, 0),
    'crop-growing': ('GROWING', 'Leaf_Green', 0.25, 0.35, 0.0, 0.0, 0),
    'crop-ripe': ('RIPE', 'Leaf_Green', 0.28, 0.35, 0.0, 0.0, 2),
    'crop-thirsty': ('THIRSTY', 'Wilted_Brown', 0.6, 0.15, 0.45, 0.3, 0),
}


def build_crop(stage):
    key, leafmat, droop, fold, curl, ragged, nfruit = CROPS[stage]
    Hs, nleaf, Ll = P[key]
    rnd = random.Random({'crop-sprout': 1, 'crop-growing': 2, 'crop-ripe': 3, 'crop-thirsty': 4}[stage])
    # the shared mound: same seed in every stage, a little larger than the bed's own mounds so it covers one
    bm = bmesh.new()
    mound(bm, (0, 0, 0), P['MOUND_R'] * P['CROP_MOUND'], P['MOUND_H'] * P['CROP_MOUND'], seed=99)
    finish('mound', bm, 'Soil_Dark')
    base = P['MOUND_H'] * P['CROP_MOUND'] * 0.85
    # stem: a gentle S, thicker at the foot; thirsty leans and its tip nods over
    lean = 0.06 if stage == 'crop-thirsty' else 0.0
    nseg = 3 if stage == 'crop-sprout' else 6
    pts = []
    for k in range(nseg + 1):
        t = k / nseg
        x = 0.012 * math.sin(t * 2.6) * (Hs / 0.6) + lean * t * t * Hs
        pts.append((x, 0.006 * math.sin(t * 3.5), base - 0.03 + (Hs + 0.03) * t - (lean * 0.5 * Hs * t ** 3)))
    rs = 0.006 if stage == 'crop-sprout' else 0.0105 + Hs * 0.004
    bm = bmesh.new()
    tube(bm, pts, [rs * (1 - 0.45 * k / nseg) for k in range(nseg + 1)], 5, cap0=False, cap1=True)
    finish('stem', bm, 'Stem_Green')

    def on_stem(t):
        f = t * nseg; k = min(int(f), nseg - 1); u = f - k
        return Vector(pts[k]).lerp(Vector(pts[k + 1]), u)

    bm = bmesh.new(); stalks = []
    if stage == 'crop-sprout':   # two seed leaves low, one true leaf on top
        leaf(bm, on_stem(0.55), math.pi + 0.15, 0.15, Ll * 1.1, Ll * 0.75, fold, droop, seed=1)
        leaf(bm, on_stem(0.62), 0.1, 0.35, Ll * 0.6, Ll * 0.42, fold, droop, seed=2)
        leaf(bm, on_stem(1.0), 0.25, 1.15, Ll * 1.3, Ll * 0.95, fold, 0.05, seed=3)
    else:
        for i in range(nleaf):   # alternate leaves up the stem, smaller near the top; the top pair stands up
            t = 0.22 + 0.74 * i / max(1, nleaf - 1)
            # alternate left and right (the sheet spreads its leaves sideways), each swung a little to the front or back
            yaw = (0.0 if i % 2 == 0 else math.pi) + rnd.uniform(-0.5, 0.5)
            size = Ll * (1.0 - 0.32 * t) * rnd.uniform(0.9, 1.1)
            pitch = 0.05 + 0.5 * t
            d = droop
            if stage == 'crop-thirsty':
                pitch = -1.1 + 0.75 * t                               # hanging leaves; the top ones only nod
                d = droop * (1.0 - 0.4 * t)
            # the blade starts a short stalk (petiole) out from the stem, the stalk rising a little
            p0 = on_stem(t); out = p0 + Vector((math.cos(yaw), math.sin(yaw), 0.35 if stage != 'crop-thirsty' else -0.1)) * P['PETIOLE']
            stalks.append((p0, out))
            leaf(bm, out, yaw, pitch, size, size * P['LEAF_W'], fold, d, curl, ragged, seed=10 + i)
        tip = on_stem(1.0)
        top_pitch = 0.9 if stage != 'crop-thirsty' else -0.2
        leaf(bm, tip, 0.5, top_pitch, Ll * 0.75, Ll * 0.75 * P['LEAF_W'], fold, droop * 0.5, curl * 0.5, ragged * 0.5, seed=40)
        leaf(bm, tip, 0.5 + math.pi, top_pitch + 0.15, Ll * 0.62, Ll * 0.62 * P['LEAF_W'], fold, droop * 0.5, curl * 0.5, ragged * 0.5, seed=41)
    finish('leaves', bm, leafmat)
    if stalks:
        bm = bmesh.new()
        for a, b in stalks:
            cyl(bm, a, b, 0.0045, 0.0035, 3, cap0=False, cap1=False)
        finish('petioles', bm, 'Stem_Green')
    if stage == 'crop-thirsty':   # a few green leaves still near the top (the sheet keeps its crown green)
        bm = bmesh.new()
        leaf(bm, on_stem(0.97), -0.9, 0.55, Ll * 0.8, Ll * 0.8 * P['LEAF_W'], 0.3, 0.3, seed=50)
        finish('leaves_last_green', bm, 'Leaf_Green')
    if nfruit:
        bm = bmesh.new(); R = P['FRUIT_R']
        for j, (t, side) in enumerate(((0.52, -1), (0.36, 1))[:nfruit]):
            p = on_stem(t)
            fruit(bm, p + Vector((side * (R + 0.006), -0.018, -R * 0.55)), R * (1.0 if j == 0 else 0.92), seed=60 + j, seg=7)
        finish('fruit', bm, 'Fruit_Gold')


PIECES = {'bed': build_bed, 'stake': build_stake, 'watering-can': build_can,
          **{s: (lambda s=s: build_crop(s)) for s in CROPS}}


def export(name):
    bpy.ops.wm.read_factory_settings(use_empty=True); MATS.clear()
    PIECES[name]()
    dg = bpy.context.evaluated_depsgraph_get(); tris = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    path = os.path.join(HERE, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True,
                              export_normals=True, export_extras=False)
    print(f'{name}: {tris} triangles -> {os.path.basename(path)}')
    return tris


if __name__ == '__main__':
    names = sys.argv[1:] or list(PIECES)
    for n in names:
        export(n)

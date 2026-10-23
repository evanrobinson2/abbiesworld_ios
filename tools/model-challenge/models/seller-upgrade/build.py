"""seller-upgrade: Bronze Age ranch produce seller (BA-0081, style A "upgrade").

Standalone builder: `python build.py` rebuilds seller-upgrade.glb from nothing.
Z up, metres, origin at the centre of the footprint on the ground, front faces -Y.
Rigid parts in a hierarchy (no skinning) with a 120-frame idle loop at 24 fps.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'seller-upgrade.glb')

# ------------------------------------------------------------------ shape numbers (metres)
P = dict(
    height=1.65,
    # dress skirt rings: (z, rx, ry, cy)
    skirt=[(0.215, 0.268, 0.228, 0.012), (0.36, 0.245, 0.210, 0.010), (0.55, 0.214, 0.185, 0.006),
           (0.75, 0.180, 0.148, 0.004), (0.93, 0.140, 0.100, 0.0)],
    skirt_seg=20,
    # bodice rings: (z, rx, ry, cy)
    torso=[(0.90, 0.140, 0.100, 0.0), (1.02, 0.135, 0.100, -0.005), (1.12, 0.140, 0.108, -0.012),
           (1.22, 0.135, 0.100, -0.005), (1.29, 0.125, 0.085, 0.0), (1.34, 0.090, 0.070, 0.0),
           (1.37, 0.050, 0.045, 0.0)],
    torso_seg=12,
    apron_half_deg=58,          # apron skirt wraps this far round each side of front centre
    apron_bottom=0.30,
    pocket=dict(z0=0.56, z1=0.72, a_mid=-68, a_half=17),
    belt_z=(0.90, 0.95),
    shoulder_x=0.145, shoulder_z=1.29,
    arm_L=[(0.13, 0.0, 1.29), (0.235, 0.03, 1.045), (0.165, -0.125, 0.925)],   # shoulder, elbow, wrist (+X, hanging)
    arm_R=[(-0.13, 0.0, 1.29), (-0.245, 0.04, 1.04), (-0.20, -0.09, 0.94)], # shoulder, elbow, wrist (-X, on basket)
    sleeve_r=(0.056, 0.054), forearm_r=(0.036, 0.028),
    neck=(1.30, 1.43, 0.040),
    head_c=(0.0, 0.0), head=[(1.405, 0.035, 0.040, -0.010), (1.43, 0.062, 0.066, -0.006), (1.48, 0.080, 0.088, 0.0),
                            (1.54, 0.086, 0.098, 0.005), (1.60, 0.078, 0.092, 0.008), (1.635, 0.050, 0.062, 0.010)],
    wrap=[(1.515, 0.097, 0.113, 0.014), (1.57, 0.102, 0.122, 0.022), (1.625, 0.094, 0.115, 0.030),
          (1.66, 0.064, 0.082, 0.034), (1.675, 0.022, 0.028, 0.034)],
    leg_x=(-0.12, 0.115), leg_r=(0.040, 0.047), leg_z=(0.055, 0.30),
    basket_c=(-0.275, -0.05, 0.585),  # bottom centre of the basket
    basket=[(0.0, 0.104, 0.180), (0.045, 0.128, 0.222), (0.09, 0.142, 0.246), (0.135, 0.151, 0.258), (0.18, 0.157, 0.265), (0.225, 0.160, 0.270), (0.265, 0.163, 0.273)],
    handle_top=(-0.222, -0.03, 1.03),
    basket_seg=28,
)

random.seed(81)

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, 120
sc.render.fps = 24
sc.name = 'idle'

MATS = {}


def mat(name, hexcol, rough=0.82):
    if name in MATS:
        return MATS[name]
    h = hexcol.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin, 1); b.inputs['Roughness'].default_value = rough
    MATS[name] = m
    return m


LINEN = mat('CreamSkirt', '#E8D8B6'); LINEN_SH = mat('CreamHem', '#D6C29C')
BLOUSE = mat('WhiteBlouse', '#F3EEE2'); BLOUSE_SH = mat('BlouseCuff', '#E2D9C6')
APRON = mat('OchreApron', '#C08A3E'); APRON_DK = mat('OchreApronSeam', '#9E6C2C')
SKIN = mat('Skin', '#B9805A'); SKIN_DK = mat('SkinShade', '#9C6440')
HAIR = mat('Hair', '#4A2E1C'); WRAP = mat('WrapCream', '#E8D7B0'); WRAP_LT = mat('WrapTanStripe', '#B98858')
LEATHER = mat('Leather', '#6B371D'); BRONZE = mat('Bronze', '#A9783A', 0.6)
SANDAL = mat('SandalLeather', '#8E4B27')
WICKER = mat('WickerLight', '#A87443'); WICKER_DK = mat('WickerDark', '#8A5A30'); WICKER_IN = mat('BasketInside', '#4E3119')
ONION = mat('OnionSkin', '#E4C48C'); ONION_DK = mat('OnionStreak', '#C49A62')
CARROT = mat('Carrot', '#E2661E'); LEAF = mat('LeafGreen', '#6E9C3A'); LEAF_DK = mat('LeafDark', '#4C7A2A')
EYE = mat('EyeDark', '#22160F', 0.5); BROW = mat('Brow', '#3A2416'); LIP = mat('Lip', '#8C4632')


def obj_from(name, verts, faces, mats, mat_idx=None, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate(); me.update()
    for m in mats:
        me.materials.append(m)
    if mat_idx is not None:
        for p, i in zip(me.polygons, mat_idx):
            p.material_index = i
    for p in me.polygons:
        p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    return o


def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); e.empty_display_size = 0.05
    e.location = loc; sc.collection.objects.link(e)
    if parent:
        attach(e, parent)
    return e


def attach(child, parent):
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def jit(v, a):
    return Vector((v[0] + random.uniform(-a, a), v[1] + random.uniform(-a, a), v[2] + random.uniform(-a, a) * 0.5))


def loft(name, rings, n, mats, cap_bot=True, cap_top=True, cx=0.0, jitter=0.0, a0=0.0, mat_fn=None, open_arc=None, pleat=0.0):
    """rings: (z, rx, ry, cy). Elliptic loft; angle 0 = +X, -90deg = front (-Y).
    open_arc=(start_deg, end_deg) builds only that arc (a panel, no caps)."""
    verts, faces, mi = [], [], []
    closed = open_arc is None
    cols = n if closed else n + 1
    for r, (z, rx, ry, cy) in enumerate(rings):
        for i in range(cols):
            if closed:
                a = math.radians(a0) + 2 * math.pi * i / n
            else:
                a = math.radians(open_arc[0] + (open_arc[1] - open_arc[0]) * i / n)
            f = 1.0 + pleat * (1.0 - r / max(1, len(rings) - 1)) * (1 if i % 2 else -1)
            v = (cx + rx * f * math.cos(a), cy + ry * f * math.sin(a), z)
            edge = r in (0, len(rings) - 1)
            verts.append(jit(v, jitter * (0.4 if edge else 1.0)) if jitter else Vector(v))
    for r in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % cols if closed else i + 1
            faces.append((r * cols + i, r * cols + j, (r + 1) * cols + j, (r + 1) * cols + i))
            mi.append(mat_fn(r, i) if mat_fn else 0)
    if closed and cap_bot:
        faces.append(tuple(reversed(range(0, n)))); mi.append(0)
    if closed and cap_top:
        base = (len(rings) - 1) * n
        faces.append(tuple(range(base, base + n))); mi.append(len(mats) - 1 if len(mats) > 1 and mat_fn is None else 0)
    return obj_from(name, verts, faces, mats, mi)


def tube(name, pts, radii, n, mats, cap=True, flat=1.0, side=None):
    """Tube along a polyline with per-point radii; flat<1 squashes it into a ribbon-ish strip."""
    pts = [Vector(p) for p in pts]
    verts, faces = [], []
    up_hint = Vector(side) if side else None
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        ref = up_hint if up_hint is not None else (Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0)))
        u = t.cross(ref).normalized(); w = t.cross(u).normalized()
        for i in range(n):
            a = 2 * math.pi * i / n
            verts.append(p + u * math.cos(a) * radii[k] + w * math.sin(a) * radii[k] * flat)
    for k in range(len(pts) - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    if cap:
        faces.append(tuple(reversed(range(n))))
        b = (len(pts) - 1) * n; faces.append(tuple(range(b, b + n)))
    return obj_from(name, verts, faces, mats)


def ico(name, c, r, mats, sub=1, scale=(1, 1, 1), jitter=0.0):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    verts = [Vector((v.co.x * r * scale[0], v.co.y * r * scale[1], v.co.z * r * scale[2])) + Vector(c) for v in bm.verts]
    if jitter:
        verts = [jit(v, jitter) for v in verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]; bm.free()
    return obj_from(name, verts, faces, mats)


def box(name, c, size, mats, rot=(0, 0, 0), bevel=0.0):
    sx, sy, sz = [s / 2 for s in size]
    vs = [Vector((x, y, z)) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
    R = Matrix.Rotation(rot[2], 3, 'Z') @ Matrix.Rotation(rot[1], 3, 'Y') @ Matrix.Rotation(rot[0], 3, 'X')
    vs = [R @ v + Vector(c) for v in vs]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    o = obj_from(name, vs, faces, mats)
    if bevel:
        m = o.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 1; m.limit_method = 'ANGLE'
    return o


def solidify(o, t=0.006):
    m = o.modifiers.new('solidify', 'SOLIDIFY'); m.thickness = t; m.offset = 1.0
    return o


def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    # apply modifiers first so joined parts keep them
    for o in objs:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        o.select_set(True)
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
    return o


# ------------------------------------------------------------------ hierarchy
root = empty('seller', (0, 0, 0))
hips = empty('hips', (0, 0, 0.93), root)
chest = empty('chest', (0, 0, 0.95), hips)
head_pivot = empty('head_pivot', (0, 0, 1.42), chest)

# ---------- legs and sandals (stay planted, children of root)
for side, x in (('R', P['leg_x'][0]), ('L', P['leg_x'][1])):
    turn = math.radians(8 if x > 0 else -8)
    z0, z1 = P['leg_z']
    shin = tube(f'shin_{side}', [(x, 0.0, z0), (x, 0.0, (z0 + z1) / 2), (x, 0.005, z1)],
                [P['leg_r'][0], P['leg_r'][1] * 0.95, P['leg_r'][1]], 7, [SKIN])
    fwd = Vector((math.sin(turn) * (1 if x > 0 else 1), -math.cos(turn), 0))
    sole = box(f'sole_{side}', (x - fwd.x * -0.035, -0.012, 0.010), (0.095, 0.23, 0.02), [SANDAL],
               rot=(0, 0, turn), bevel=0.004)
    foot = tube(f'foot_{side}', [(x, 0.035, 0.045), (x + fwd.x * 0.07, -0.04, 0.035), (x + fwd.x * 0.13, -0.105, 0.026)],
                [0.042, 0.040, 0.030], 6, [SKIN], flat=0.62)
    straps = [tube(f'strap{k}_{side}', [(x + fwd.x * yy * -1 - 0.044, yy, zz), (x + fwd.x * yy * -1, yy - 0.004, zz + 0.018),
                                        (x + fwd.x * yy * -1 + 0.044, yy, zz)], [0.008, 0.008, 0.008], 4, [SANDAL])
              for k, (yy, zz) in enumerate(((-0.085, 0.034), (-0.02, 0.046)))]
    ankle = loft(f'ankle_{side}', [(0.052, 0.042, 0.042, 0.0), (0.072, 0.040, 0.040, 0.0)], 8, [SANDAL],
                 cap_bot=False, cap_top=False, cx=x)
    ankle.location.y = 0.0
    sandal = join(f'sandal_{side}', [sole] + straps + [ankle])
    leg = join(f'leg_{side}', [shin, foot, sandal])
    attach(leg, root)

# ---------- dress skirt (linen) with a hem band
skirt = loft('dress_skirt', [(z, rx, ry, cy) for z, rx, ry, cy in P['skirt']], P['skirt_seg'], [LINEN],
             cap_bot=False, cap_top=True, jitter=0.005, pleat=0.035)
solidify(skirt, 0.008)
hem = loft('hem_band', [(P['skirt'][0][0] - 0.002, P['skirt'][0][1] + 0.004, P['skirt'][0][2] + 0.004, 0.0),
                        (P['skirt'][0][0] + 0.03, P['skirt'][0][1] - 0.006, P['skirt'][0][2] - 0.006, 0.0)],
           P['skirt_seg'], [LINEN_SH], cap_bot=False, cap_top=False)
solidify(hem, 0.005)
skirt = join('dress_skirt', [skirt, hem])
attach(skirt, hips)

# ---------- apron skirt: an open arc panel just outside the dress
ah = P['apron_half_deg']
ap_rings = []
for z, rx, ry, cy in P['skirt']:
    if z < P['apron_bottom'] - 0.08:
        continue
    zz = max(z, P['apron_bottom'])
    k = 1.0 + 0.012 / max(rx, ry)
    ap_rings.append((zz, rx * k + 0.008, ry * k + 0.010, cy))
apron = loft('apron_skirt', ap_rings, 10, [APRON], open_arc=(-90 - ah, -90 + ah), jitter=0.004, pleat=0.02)
solidify(apron, 0.007)
# pocket with a stitched lip
pk = P['pocket']


def ring_at(z):
    """apron surface ellipse at height z (linear between apron rings)"""
    for (za, rxa, rya, _), (zb, rxb, ryb, _) in zip(ap_rings, ap_rings[1:]):
        if za <= z <= zb:
            t = (z - za) / (zb - za); return rxa + (rxb - rxa) * t, rya + (ryb - rya) * t
    return ap_rings[-1][1], ap_rings[-1][2]


pr = []
for z in (pk['z0'], (pk['z0'] + pk['z1']) / 2, pk['z1']):
    rx, ry = ring_at(z); pr.append((z, rx + 0.004, ry + 0.006, 0.0))
pocket = loft('apron_pocket', pr, 4, [APRON_DK], open_arc=(pk['a_mid'] - pk['a_half'], pk['a_mid'] + pk['a_half']))
solidify(pocket, 0.006)
rx, ry = ring_at(pk['z1'])
lip = tube('pocket_lip', [((rx + 0.008) * math.cos(math.radians(a)), (ry + 0.010) * math.sin(math.radians(a)), pk['z1'])
                          for a in range(pk['a_mid'] - pk['a_half'], pk['a_mid'] + pk['a_half'] + 1, 6)],
           [0.006] * 6, 4, [APRON])
apron = join('apron_skirt', [apron, pocket, lip])
attach(apron, hips)

# ---------- belt, buckle, hanging ties, pouch
bz0, bz1 = P['belt_z']
belt = loft('belt', [(bz0, 0.158, 0.122, -0.002), (bz1, 0.152, 0.116, -0.002)], 14, [LEATHER], cap_bot=False, cap_top=False)
solidify(belt, 0.008)
buckle = box('buckle', (0.035, -0.128, (bz0 + bz1) / 2), (0.04, 0.012, 0.05), [BRONZE], bevel=0.004)
ties = [tube(f'tie{k}', [(x0, -0.125, bz0 + 0.01), (x0 + dx * 0.3, -0.135, 0.80), (x0 + dx, -0.15, 0.66)],
             [0.014, 0.013, 0.012], 4, [LEATHER], flat=0.35, side=(0, 1, 0))
        for k, (x0, dx) in enumerate(((0.055, 0.0), (0.075, 0.025)))]
pouch = ico('pouch', (0.145, 0.105, 0.82), 0.065, [LEATHER], sub=1, scale=(0.75, 0.6, 1.0), jitter=0.006)
pouch_flap = box('pouch_flap', (0.15, 0.135, 0.865), (0.09, 0.02, 0.05), [LEATHER], rot=(math.radians(-15), 0, math.radians(30)), bevel=0.005)
belt = join('belt', [belt, buckle] + ties + [pouch, pouch_flap])
attach(belt, hips)

# ---------- bodice (breathing), apron bib, straps
torso = loft('torso', P['torso'], P['torso_seg'], [BLOUSE], jitter=0.004)
neckline = loft('neckline', [(1.315, 0.110, 0.080, 0.0), (1.335, 0.098, 0.074, 0.0)], 12, [BLOUSE_SH], cap_bot=False, cap_top=False)
solidify(neckline, 0.005)
bib_rings = [(z, rx + 0.009, ry + 0.010, cy) for z, rx, ry, cy in P['torso'] if z <= 1.24]
bib = loft('apron_bib', bib_rings, 6, [APRON], open_arc=(-90 - 44, -90 + 44), jitter=0.002)
solidify(bib, 0.006)
straps = []
for s in (-1, 1):
    straps.append(tube(f'apron_strap_{s}', [(s * 0.088, -0.112, 1.215), (s * 0.098, -0.072, 1.30), (s * 0.095, 0.0, 1.345),
                                            (s * 0.10, 0.07, 1.31), (s * 0.12, 0.105, 1.10), (s * 0.12, 0.12, 0.96)],
                       [0.015] * 6, 4, [APRON_DK], flat=0.35, cap=False))
# crossbody basket strap: front of the right (-X) shoulder, diagonal across the back to the left hip
xstrap = tube('basket_strap', [(-0.21, -0.12, 0.88), (-0.17, -0.12, 1.08), (-0.12, -0.095, 1.27), (-0.105, 0.0, 1.36),
                                (-0.08, 0.09, 1.30), (0.0, 0.118, 1.16), (0.10, 0.122, 1.02), (0.14, 0.11, 0.93)],
              [0.016] * 8, 4, [LEATHER], flat=0.35, cap=False)
torso = join('torso', [torso, neckline, bib] + straps + [xstrap])
attach(torso, chest)
neck = tube('neck', [(0, 0.005, P['neck'][0]), (0, 0.0, P['neck'][1])], [P['neck'][2] * 1.15, P['neck'][2]], 8, [SKIN])
attach(neck, chest)


# ---------- arms (shoulder pivots, rigid sleeve + forearm + hand)
def build_arm(side, pts, hand_dir):
    sh, el, wr = [Vector(p) for p in pts]
    piv = empty(f'shoulder_{side}', sh, chest)
    cap = ico(f'shoulder_cap_{side}', sh + Vector((0, 0, -0.01)), 0.058, [BLOUSE], sub=1, scale=(1.0, 1.0, 0.95))
    sleeve = tube(f'sleeve_{side}', [sh, sh.lerp(el, 0.55), el], [P['sleeve_r'][0], P['sleeve_r'][0] + 0.002, P['sleeve_r'][1]], 8, [BLOUSE])
    d = (el - sh).normalized()
    cuff = tube(f'cuff_{side}', [el - d * 0.035, el + d * 0.02], [0.064, 0.058], 8, [BLOUSE_SH])
    fore = tube(f'forearm_{side}', [el, wr], [P['forearm_r'][0], P['forearm_r'][1]], 7, [SKIN])
    hd = Vector(hand_dir).normalized()
    hand = tube(f'hand_{side}', [wr, wr + hd * 0.05, wr + hd * 0.095], [0.03, 0.036, 0.022], 6, [SKIN], flat=0.55)
    thumb = tube(f'thumb_{side}', [wr + hd * 0.02, wr + hd * 0.05 + Vector((0, -0.025, 0))], [0.012, 0.009], 4, [SKIN])
    arm = join(f'arm_{side}', [cap, sleeve, cuff, fore, hand, thumb])
    attach(arm, piv)
    return piv


arm_L = build_arm('L', P['arm_L'], (-0.55, -0.15, -0.6))
arm_R = build_arm('R', P['arm_R'], (0.4, -0.25, -0.55))

# ---------- head, face, hair, wrap
head = loft('head', P['head'], 10, [SKIN], jitter=0.002)
face = []
for s in (-1, 1):
    face.append(ico(f'eye_{s}', (s * 0.032, -0.085, 1.503), 0.014, [EYE], sub=1, scale=(1.25, 0.5, 0.75)))
    face.append(box(f'brow_{s}', (s * 0.033, -0.090, 1.528), (0.036, 0.010, 0.008), [BROW], rot=(0, s * math.radians(-10), 0)))
    face.append(ico(f'ear_{s}', (s * 0.084, 0.005, 1.49), 0.017, [SKIN_DK], sub=1, scale=(0.5, 0.8, 1.1)))
nose = tube('nose', [(0, -0.090, 1.508), (0, -0.104, 1.476), (0, -0.108, 1.462)], [0.010, 0.014, 0.011], 3, [SKIN], side=(0, 1, 0))
mouth = box('mouth', (0, -0.084, 1.438), (0.03, 0.008, 0.008), [LIP])
hair = loft('hair', [(1.43, 0.070, 0.060, 0.045), (1.47, 0.090, 0.085, 0.030), (1.53, 0.094, 0.100, 0.018),
                     (1.56, 0.090, 0.10, 0.015)], 10, [HAIR], cap_bot=True, cap_top=False, jitter=0.004)
bun = ico('hair_bun', (0.0, 0.118, 1.44), 0.058, [HAIR], sub=1, scale=(1.1, 0.85, 0.9), jitter=0.005)
locks = [ico(f'curl_{s}_{k}', (s * (0.090 + 0.008 * (k % 2)), -0.03 + 0.017 * k, 1.515 - 0.03 * k), 0.024 - 0.002 * k, [HAIR],
              sub=1, scale=(0.9, 1.0, 1.1), jitter=0.004) for s in (-1, 1) for k in range(5)]
locks += [ico(f'nape_curl_{k}', (0.05 * (k - 1.5), 0.085, 1.42 - 0.01 * (k % 2)), 0.022, [HAIR], sub=1, jitter=0.004) for k in range(4)]
wr = []
for a, b in zip(P['wrap'], P['wrap'][1:]):
    wr += [a, tuple((x + y) / 2 for x, y in zip(a, b))]
wr.append(P['wrap'][-1])
wrap = loft('wrap', wr, 12, [WRAP, WRAP_LT], jitter=0.005, mat_fn=lambda r, i: r % 2)
band = loft('wrap_band', [(1.512, 0.099, 0.115, 0.012), (1.535, 0.100, 0.117, 0.013)], 12, [WRAP_LT], cap_bot=False, cap_top=False)
solidify(band, 0.006)
folds = [tube(f'wrap_fold{k}', [(0.104 * math.cos(math.radians(t)) * sc_, cy_ + 0.12 * math.sin(math.radians(t)) * sc_, z_ + 0.012 * math.sin(math.radians(t) * 2))
                                for t in range(-170, 1, 17)], [0.013] * 11, 4, [WRAP])
         for k, (z_, cy_, sc_) in enumerate(((1.56, 0.018, 1.0),))]
knot = ico('wrap_knot', (0.0, 0.125, 1.545), 0.038, [WRAP], sub=1, scale=(1.2, 0.8, 0.9), jitter=0.004)
wrap = join('wrap', [wrap, band, knot] + folds)
c = Vector((0, 0, 1.54))
wrap.data.transform(Matrix.Translation(c) @ Matrix.Rotation(math.radians(-24), 4, 'X') @ Matrix.Translation(-c))
fringe = loft('fringe', [(1.50, 0.090, 0.100, 0.004), (1.535, 0.093, 0.104, 0.006), (1.565, 0.090, 0.103, 0.008)], 10, [HAIR],
              open_arc=(-90 - 75, -90 + 75), jitter=0.003)
solidify(fringe, 0.006)
head = join('head', [head] + face + [nose, mouth, hair, bun, fringe] + locks + [wrap])
attach(head, head_pivot)
tail_pivot = empty('wrap_tails', (0.0, 0.13, 1.54), head_pivot)
tails = join('wrap_tails_mesh', [
    tube('tail_a', [(0.01, 0.13, 1.54), (0.035, 0.19, 1.49), (0.05, 0.205, 1.40)], [0.03, 0.028, 0.016], 4, [WRAP_LT], flat=0.4, side=(0, 1, 0)),
    tube('tail_b', [(-0.01, 0.13, 1.54), (-0.03, 0.175, 1.51), (-0.04, 0.19, 1.465)], [0.028, 0.025, 0.014], 4, [WRAP], flat=0.4, side=(0, 1, 0))])
attach(tails, tail_pivot)

# ---------- basket on the right hip (-X), with produce
bx, by, bz = P['basket_c']
basket_pivot = empty('basket_pivot', P['handle_top'], arm_R)
nb = P['basket_seg']
bw = loft('basket_weave', [(bz + z, rx, ry, by) for z, rx, ry in P['basket']], nb, [WICKER, WICKER_DK],
          cap_bot=True, cap_top=False, cx=bx, jitter=0.002, mat_fn=lambda r, i: (r + i // 2) % 2)
solidify(bw, -0.012)
top = P['basket'][-1]
rim = tube('basket_rim', [(bx + (top[1] + 0.004) * math.cos(2 * math.pi * i / 16), by + (top[2] + 0.004) * math.sin(2 * math.pi * i / 16), bz + top[0])
                          for i in range(17)], [0.017] * 17, 5, [WICKER_DK], cap=False)
fill = loft('basket_fill', [(bz + 0.215, top[1] - 0.012, top[2] - 0.012, by)], nb, [WICKER_IN], cap_bot=False, cap_top=True)
foot_ring = tube('basket_foot', [(bx + 0.088 * math.cos(2 * math.pi * i / 12), by + 0.143 * math.sin(2 * math.pi * i / 12), bz + 0.006)
                                for i in range(13)], [0.012] * 13, 4, [WICKER_DK], cap=False)
hx, hy, hz = P['handle_top']
handle = tube('basket_handle', [(bx - top[1], hy, bz + top[0]), (bx - top[1] * 0.85, hy, bz + top[0] + 0.10), (hx - 0.05, hy, hz - 0.01),
                                (hx + 0.01, hy, hz), (hx + 0.06, hy, hz - 0.03), (bx + top[1] * 0.95, hy, bz + top[0])],
              [0.013] * 6, 5, [WICKER_DK], cap=False)
basket = join('basket', [bw, rim, fill, foot_ring, handle])
attach(basket, basket_pivot)

produce = []
rim_z = bz + top[0]
onion_spots = [(-0.05, -0.17, 0.03, 0.062), (0.05, -0.16, 0.025, 0.06), (0.0, -0.08, 0.055, 0.066), (-0.07, -0.04, 0.03, 0.056),
               (0.065, -0.06, 0.035, 0.057), (0.0, -0.235, 0.0, 0.055), (-0.04, -0.28, -0.03, 0.046), (0.045, -0.26, -0.025, 0.046)]
for k, (ox, oy, oz, r) in enumerate(onion_spots):
    c = Vector((bx + ox, by + oy, rim_z + oz))
    produce.append(ico(f'onion{k}', c, r, [ONION], sub=1, scale=(1, 1, 0.92), jitter=0.003))
    produce.append(tube(f'onion_tip{k}', [c + Vector((0, 0, r * 0.75)), c + Vector((0.005, 0.0, r * 1.5))], [r * 0.32, 0.003], 4, [ONION_DK]))
# carrots: crowns above the rim, orange bodies angled down into the basket, leafy tops fanning up and out
carrot_spots = [(-0.05, 0.05, 0.15, -0.25), (-0.01, 0.10, 0.17, -0.1), (0.04, 0.07, 0.13, 0.05), (-0.04, 0.15, 0.12, -0.2), (0.02, 0.17, 0.15, -0.05)]
for k, (cx_, cy_, h_, lean) in enumerate(carrot_spots):
    crown = Vector((bx + cx_, by + cy_, rim_z + h_))
    d = Vector((-lean, -0.25, -1.0)).normalized()
    tip = crown + d * 0.22
    produce.append(tube(f'carrot{k}', [crown, crown.lerp(tip, 0.45), tip], [0.027, 0.02, 0.004], 6, [CARROT]))
    for j in range(4):
        ang = math.radians(-60 + 40 * j)
        top_pt = crown + Vector((math.sin(ang) * 0.08 + lean * 0.12, 0.05 + 0.04 * j, 0.14 + 0.05 * ((j + k) % 2)))
        produce.append(tube(f'leaf{k}_{j}', [crown, crown.lerp(top_pt, 0.5) + Vector((0, 0, 0.02)), top_pt],
                            [0.012, 0.04, 0.008], 4, [LEAF if (j + k) % 2 == 0 else LEAF_DK], flat=0.3, side=(1, 0, 0)))
produce_obj = join('produce', produce)
attach(produce_obj, basket_pivot)


# ------------------------------------------------------------------ idle animation, frames 1..120 (121 == 1)
def key_loop(ob, path, fn, step=4):
    for f in range(1, 122, step):
        t = (f - 1) / 120.0
        val = fn(t)
        if path == 'location':
            ob.location = val
        elif path == 'rotation_euler':
            ob.rotation_euler = val
        else:
            ob.scale = val
        ob.keyframe_insert(path, frame=f)


head_pivot.scale = (1.1, 1.1, 1.1); head_pivot.location.z -= 0.012
TAU = 2 * math.pi
h0 = hips.location.copy()
key_loop(hips, 'location', lambda t: (h0.x + 0.004 * math.sin(TAU * t), h0.y, h0.z + 0.006 * math.sin(2 * TAU * t)))
key_loop(hips, 'rotation_euler', lambda t: (0, math.radians(1.2) * math.sin(TAU * t), math.radians(1.5) * math.sin(TAU * t + 0.6)))
key_loop(chest, 'rotation_euler', lambda t: (math.radians(1.6) * math.sin(2 * TAU * t), 0, 0))
key_loop(torso, 'scale', lambda t: (1 + 0.012 * math.sin(2 * TAU * t), 1 + 0.022 * math.sin(2 * TAU * t), 1))
key_loop(head_pivot, 'rotation_euler', lambda t: (math.radians(3) * math.sin(2 * TAU * t + 1.0), 0, math.radians(16) * math.sin(TAU * t)))
key_loop(tail_pivot, 'rotation_euler', lambda t: (math.radians(7) * math.sin(2 * TAU * t + 2.0), math.radians(5) * math.sin(TAU * t), 0))
key_loop(basket_pivot, 'rotation_euler', lambda t: (math.radians(2.5) * math.sin(TAU * t + 1.2), math.radians(3.5) * math.sin(TAU * t + 0.5), 0))
key_loop(arm_L, 'rotation_euler', lambda t: (math.radians(4) * math.sin(TAU * t + 0.8), math.radians(-2.5) * math.sin(2 * TAU * t), 0))
key_loop(arm_R, 'rotation_euler', lambda t: (math.radians(2) * math.sin(TAU * t + 1.2), math.radians(2.5) * math.sin(TAU * t + 0.5), 0))
sc.frame_set(1)

# ------------------------------------------------------------------ export
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                          export_animation_mode='SCENE', export_apply=True,
                          export_anim_scene_split_object=False)  # one 'idle' clip, not one per node
tris = 0
dg = bpy.context.evaluated_depsgraph_get()
for o in sc.objects:
    if o.type == 'MESH':
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
print('exported', OUT, 'triangles', tris)

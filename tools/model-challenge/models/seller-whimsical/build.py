"""seller-whimsical (BA-0081, style B): a chibi produce seller about 1.2 m tall.
Big round head in a cream hood, giant floppy straw sun hat with a carrot in the band, patched cream smock
over a green skirt, stubby legs, a wooden tub of vegetables on her right hip and a satchel on her back.
Run:  python build.py   (rebuilds seller-whimsical.glb from nothing)
Z up, metres, origin at the centre of the footprint on the ground, front faces -Y.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, Euler

# ---------------------------------------------------------------- shape numbers
P = dict(
    # legs and feet
    foot_x=0.072, foot_r=0.048, foot_h=0.065, leg_r=0.052, leg_top=0.15,
    # skirt (green) and smock (cream)
    skirt_z=(0.05, 0.24), skirt_r=(0.19, 0.15), skirt_depth=0.85,
    smock_z=(0.10, 0.60), smock_r=(0.185, 0.115), smock_depth=0.78,
    # head
    head_z=0.80, head_r=(0.235, 0.20, 0.20),   # x, y, z radii
    hood_scale=1.1, carrot_scale=1.4, carrot_angle=30.0, carrot_z=0.10, carrot_lean=22.0, hat_forward=0.045,
    # hat
    hat_z=0.975, hat_tilt=(-10.0, 0.0),            # degrees about X (negative lifts the front) and Y (left side down)
    crown_r=(0.17, 0.14), crown_h=0.19,
    brim_R=0.44, brim_droop=0.16, brim_wave=0.35, brim_waves=5, brim_lift=0.03, brim_front_lift=0.11,
    # arms
    shoulder_z=0.53, shoulder_x=0.13, arm_len=0.20, arm_r=0.05,
    # tub (on the right hip, character's right is -X)
    tub_pos=(-0.21, -0.17, 0.17), tub_r=(0.15, 0.19), tub_h=0.22, tub_tilt=(-8.0, 10.0),
    # back satchel
    bag_pos=(0.06, 0.19, 0.36), bag_r=(0.15, 0.10, 0.15),
)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seller-whimsical.glb')
random.seed(81)


def srgb(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]), 1.0)


COLORS = dict(Skin=(242, 205, 170), Cheek=(232, 125, 105), EyeBlack=(40, 28, 24), Mouth=(150, 60, 50),
              Hood=(236, 222, 190), Straw=(214, 168, 108), StrawShade=(196, 140, 78), HatBand=(196, 104, 62),
              Carrot=(236, 122, 40), Leaf=(108, 150, 60), LeafDark=(70, 120, 60), Smock=(228, 206, 164),
              Patch=(214, 150, 62), SkirtGreen=(104, 140, 88), Leather=(150, 84, 44), Boot=(140, 82, 46),
              TubWood=(176, 110, 58), TubBand=(126, 72, 38), Tomato=(205, 62, 42), Onion=(230, 192, 82),
              Cabbage=(124, 164, 82), Pepper=(200, 50, 45), Pumpkin=(232, 138, 52), Cuff=(130, 160, 90))
MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = srgb(COLORS[name])
        b.inputs['Roughness'].default_value = 0.8
        MATS[name] = m
    return MATS[name]


def new_obj(name, bm, material, parent=None, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if isinstance(material, str):
        me.materials.append(mat(material))
    else:
        for m in material: me.materials.append(mat(m))
    for p in me.polygons: p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if parent: o.parent = parent
    return o


def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.empty_display_size = 0.05
    if parent: o.parent = parent
    return o


def sphere(r, seg=16, rings=10, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
                        @ Matrix.Diagonal((*r, 1)), verts=bm.verts)
    return bm


def lathe(profile, seg=16, sx=1.0, sy=1.0, cap_bottom=True, cap_top=True, jitter=0.0):
    """profile: list of (radius, z) from bottom to top."""
    bm = bmesh.new(); rings = []
    for r, z in profile:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            j = 1 + random.uniform(-jitter, jitter)
            ring.append(bm.verts.new((r * j * math.cos(a) * sx, r * j * math.sin(a) * sy, z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if cap_bottom: bm.faces.new(list(reversed(rings[0])))
    if cap_top: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def xform(bm, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
                        @ Matrix.Diagonal((*scale, 1)), verts=bm.verts)
    return bm


def merge(*bms_with_mat):
    """merge several bmeshes, each (bm, material_index) -> one bmesh with face material indices."""
    out = bmesh.new()
    for bm, mi in bms_with_mat:
        me = bpy.data.meshes.new('tmp'); bm.to_mesh(me); bm.free()
        n0 = len(out.faces)
        out.from_mesh(me)
        out.faces.ensure_lookup_table()
        for f in out.faces[n0:]: f.material_index = mi
        bpy.data.meshes.remove(me)
    return out


def leaf_blade(length, width, loc, rot, bend=0.25):
    """a folded, pointed leaf: 2 strips meeting at a mid rib, tip curved forward."""
    bm = bmesh.new(); n = 4; left = []; right = []; mid = []
    for i in range(n + 1):
        t = i / n; w = width * math.sin(math.pi * min(1, t * 1.15)) * (1 - t * 0.3)
        z = length * t; y = bend * length * t * t
        mid.append(bm.verts.new((0, y - 0.006, z)))
        left.append(bm.verts.new((-w / 2, y, z))); right.append(bm.verts.new((w / 2, y, z)))
    for i in range(n):
        bm.faces.new((left[i], mid[i], mid[i + 1], left[i + 1]))
        bm.faces.new((mid[i], right[i], right[i + 1], mid[i + 1]))
    return xform(bm, loc, rot)


def solidify(o, t, offset=0.0):
    m = o.modifiers.new('solid', 'SOLIDIFY'); m.thickness = t; m.offset = offset; m.use_even_offset = True


# ---------------------------------------------------------------- build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = 120

    root = empty('seller', (0, 0, 0))

    # feet and legs stay on the ground; everything else rides on 'body' which bounces
    for side, nm in ((-1, 'right'), (1, 'left')):
        x = side * P['foot_x']
        boot = lathe([(0.012, 0.0), (P['foot_r'] * 0.8, 0.018), (P['foot_r'], P['foot_h'] * 0.7), (P['foot_r'] * 0.95, P['foot_h'])],
                     seg=8, jitter=0.04)
        xform(boot, (x, -0.01, 0), (0, 0, 0), (1, 1.15, 1))
        leg = lathe([(P['leg_r'], P['foot_h'] - 0.01), (P['leg_r'] * 1.08, 0.10), (P['leg_r'] * 0.95, P['leg_top'])], seg=10)
        xform(leg, (x, 0, 0))
        new_obj(f'leg_{nm}', merge((boot, 0), (leg, 1)), ['Boot', 'SkirtGreen'], root)

    body = empty('body', (0, 0, 0), root)

    # skirt (green) under the smock
    z0, z1 = P['skirt_z']; r0, r1 = P['skirt_r']
    sk = lathe([(r0 * 0.92, z0), (r0, z0 + 0.03), (r1 * 1.05, (z0 + z1) / 2), (r1, z1)], seg=18, sy=P['skirt_depth'], jitter=0.03)
    new_obj('skirt', sk, 'SkirtGreen', body)

    # smock: a bell from shoulders to hem, slightly ragged hem
    z0, z1 = P['smock_z']; r0, r1 = P['smock_r']
    prof = [(r0, z0), (r0 * 0.98, z0 + 0.10), (r0 * 0.88, z0 + 0.25), (r1 * 1.12, z1 - 0.08), (r1, z1 - 0.02), (r1 * 0.55, z1 + 0.02)]
    sm = lathe(prof, seg=20, sy=P['smock_depth'], jitter=0.025)
    # ragged hem: drop alternate hem verts
    for v in sm.verts:
        if abs(v.co.z - z0) < 1e-4:
            a = math.atan2(v.co.y, v.co.x)
            v.co.z -= 0.018 * (1 + math.sin(5 * a)) * 0.6
    patch = bmesh.new()
    bmesh.ops.create_cube(patch, size=1.0)
    xform(patch, (0.07, -r0 * P['smock_depth'] * 0.93 + 0.002, z0 + 0.09), (8, 0, -6), (0.09, 0.012, 0.08))
    patch2 = bmesh.new(); bmesh.ops.create_cube(patch2, size=1.0)
    xform(patch2, (0.13, 0.05, z0 + 0.20), (0, 0, 70), (0.07, 0.012, 0.07))
    collar = lathe([(0.075, z1 - 0.03), (0.085, z1 + 0.005), (0.06, z1 + 0.02)], seg=12, cap_bottom=False, cap_top=False)
    smock = new_obj('smock', merge((sm, 0), (patch, 1), (patch2, 1), (collar, 2)), ['Smock', 'Patch', 'Hood'], body)

    # satchel strap: from the left shoulder across the chest to the right hip, plus a little pouch
    # an inclined leather band around the torso
    ring = lathe([(1.0, -0.5), (1.0, 0.5)], seg=20, cap_bottom=False, cap_top=False)
    xform(ring, (0.0, -0.005, 0.38), (0, -38, 0), (0.178, 0.152, 0.028))
    pouch = bmesh.new(); bmesh.ops.create_cube(pouch, size=1.0)
    xform(pouch, (-0.17, -0.06, 0.24), (0, 0, -25), (0.05, 0.08, 0.075))
    new_obj('strap', merge((ring, 0), (pouch, 0)), 'Leather', body)

    # back satchel with greens (the hero's bag behind the left hip)
    bag = sphere(P['bag_r'], 10, 7, P['bag_pos'])
    flap = sphere((P['bag_r'][0] * 1.02, P['bag_r'][1] * 0.8, 0.06), 10, 5, (P['bag_pos'][0], P['bag_pos'][1] + 0.015, P['bag_pos'][2] + P['bag_r'][2] * 0.6))
    greens = []
    for i in range(8):
        a = -50 + i * 14
        greens.append((leaf_blade(0.22 + 0.04 * (i % 2), 0.07, (P['bag_pos'][0] - 0.10 + i * 0.028, P['bag_pos'][1] - 0.02, P['bag_pos'][2] + 0.08),
                                  (random.uniform(-25, 10), a * 0.8, random.uniform(-30, 30)), 0.3), 1))
    satchel = new_obj('satchel', merge((bag, 0), (flap, 0), *greens), ['Leather', 'Leaf'], body)
    satchel.modifiers.new('solid', 'SOLIDIFY').thickness = 0.004

    # arms: sleeves with green cuffs and hands
    arms = {}
    for side, nm in ((-1, 'right'), (1, 'left')):
        sh = empty(f'shoulder_{nm}', (side * P['shoulder_x'], 0.0, P['shoulder_z']), body)
        L = P['arm_len']
        sleeve = lathe([(P['arm_r'] * 0.9, 0.0), (P['arm_r'], -L * 0.5), (P['arm_r'] * 1.25, -L * 0.85), (P['arm_r'] * 1.3, -L)], seg=10)
        cuff = lathe([(P['arm_r'] * 1.32, -L + 0.005), (P['arm_r'] * 1.38, -L - 0.025)], seg=10)
        hand = sphere((0.035, 0.03, 0.04), 8, 6, (0, 0, -L - 0.055))
        thumb = sphere((0.013, 0.013, 0.022), 6, 4, (0, -0.028, -L - 0.045), (30, 0, 0))
        arm = new_obj(f'arm_{nm}', merge((sleeve, 0), (cuff, 1), (hand, 2), (thumb, 2)), ['Smock', 'Cuff', 'Skin'], sh)
        arms[nm] = sh
    # right arm reaches down to the tub rim, left arm out in a cheerful A-pose
    arms['right'].rotation_euler = (math.radians(-40), math.radians(30), math.radians(0))
    arms['left'].rotation_euler = (math.radians(-10), math.radians(-34), 0)

    # ---------------- head
    neck = empty('neck', (0, 0, P['shoulder_z'] + 0.06), body)
    hz = P['head_z'] - neck.location.z
    rx, ry, rz = P['head_r']
    head = new_obj('head', sphere((rx, ry, rz), 24, 14, (0, 0, hz)), 'Skin', neck, smooth=True)
    # hood: back part of a larger sphere, framing the face
    hood = sphere((rx * P['hood_scale'], ry * P['hood_scale'], rz * P['hood_scale']), 20, 12, (0, 0.012, hz))
    kill = [f for f in hood.faces if f.calc_center_median().y < -ry * 0.35 and f.calc_center_median().z > hz - rz * 0.85]
    bmesh.ops.delete(hood, geom=kill, context='FACES')
    tail = sphere((0.06, 0.04, 0.07), 8, 6, (0.05, 0.03, hz - rz * 1.0))
    knot_a = leaf_blade(0.07, 0.03, (0.0, -ry * 0.7, hz - rz * 0.95), (200, 0, 30), 0.1)
    knot_b = leaf_blade(0.07, 0.03, (0.0, -ry * 0.7, hz - rz * 0.95), (200, 0, -30), 0.1)
    hood_o = new_obj('hood', merge((hood, 0), (tail, 0), (knot_a, 0), (knot_b, 0)), 'Hood', neck, smooth=True)
    # face: dot eyes, rosy cheeks, open smile, button nose
    fy = -ry
    face = []
    for side in (-1, 1):
        ex, ez = side * 0.08, hz + 0.015
        y = -ry * math.sqrt(max(0.0, 1 - (ex / rx) ** 2 - ((ez - hz) / rz) ** 2))
        face.append((sphere((0.03, 0.012, 0.042), 8, 6, (ex, y + 0.004, ez)), 0))
        cx, cz = side * 0.12, hz - 0.045
        y = -ry * math.sqrt(max(0.0, 1 - (cx / rx) ** 2 - ((cz - hz) / rz) ** 2))
        face.append((sphere((0.04, 0.008, 0.028), 10, 5, (cx, y + 0.003, cz), (0, 0, side * 30)), 1))
    my = -ry * math.sqrt(1 - ((-0.045) / rz) ** 2)
    face.append((sphere((0.025, 0.008, 0.014), 8, 5, (0, my + 0.001, hz - 0.045)), 2))
    face.append((sphere((0.012, 0.01, 0.01), 6, 4, (0, -ry + 0.002, hz - 0.012)), 3))
    new_obj('face', merge(*face), ['EyeBlack', 'Cheek', 'Mouth', 'Skin'], neck)

    # ---------------- hat
    hat = empty('hat', (0, -P['hat_forward'], P['hat_z'] - neck.location.z), neck)
    hat.rotation_euler = (math.radians(P['hat_tilt'][0]), math.radians(P['hat_tilt'][1]), 0)
    cr0, cr1 = P['crown_r']; ch = P['crown_h']
    crown = lathe([(cr0, -0.02), (cr0 * 0.98, ch * 0.5), (cr1, ch * 0.85), (cr1 * 0.7, ch * 1.0), (0.0, ch * 1.06)], seg=16, cap_bottom=False, cap_top=False, jitter=0.03)
    band = lathe([(cr0 * 1.03, 0.0), (cr0 * 1.02, 0.055), (cr0 * 0.99, 0.06)], seg=16, cap_bottom=False, cap_top=False)
    bow = sphere((0.035, 0.02, 0.03), 6, 4, (cr0 * 0.6, cr0 * 0.8, 0.03))
    tails = leaf_blade(0.09, 0.035, (cr0 * 0.62, cr0 * 0.82, 0.02), (180, 0, 20), 0.2)
    crown_o = new_obj('hat_crown', merge((crown, 0), (band, 1), (bow, 1), (tails, 1)), ['Straw', 'HatBand'], hat)
    solidify(crown_o, 0.01)
    # floppy brim: a wavy, drooping disc around the crown; its own object so it can flop
    brim_root = empty('hat_brim_pivot', (0, 0, 0.0), hat)
    bm = bmesh.new(); seg = 36; rings_r = [cr0 * 0.96, 0.20, 0.27, 0.34, P['brim_R']]
    grid = []
    for k, r in enumerate(rings_r):
        ring = []
        t = (r - rings_r[0]) / (rings_r[-1] - rings_r[0])
        for i in range(seg):
            a = 2 * math.pi * i / seg
            wave = 1 + P['brim_wave'] * math.sin(P['brim_waves'] * a)
            rr = r * (1 + 0.04 * math.sin(3 * a + 1.3) * t)
            z = P['brim_lift'] * t - P['brim_droop'] * (t ** 2) * wave + P['brim_front_lift'] * max(0.0, -math.sin(a)) ** 3 * t
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        grid.append(ring)
    for a_, b_ in zip(grid, grid[1:]):
        for i in range(seg):
            bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    for f in bm.faces:
        f.material_index = 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    brim = new_obj('hat_brim', bm, ['Straw'], brim_root)
    solidify(brim, 0.014, 0.0)
    bv = brim.modifiers.new('bevel', 'BEVEL'); bv.width = 0.004; bv.segments = 1; bv.limit_method = 'ANGLE'
    # carrot tucked in the band (character's right, front)
    # tucked in the band on the character's left, a little behind the side (where the hero shows it),
    # leaning out from the crown with its tip resting on the brim
    ca = math.radians(P['carrot_angle']); d = Vector((math.cos(ca), math.sin(ca), 0))
    cpos = d * (cr0 * 1.05) + Vector((0, 0, P['carrot_z']))
    car = lathe([(0.0, -0.13), (0.022, -0.09), (0.036, -0.02), (0.042, 0.03), (0.035, 0.055), (0.0, 0.06)], seg=8, jitter=0.05)
    xform(car, (0, 0, 0.0))
    leaves = [(leaf_blade(0.10 + 0.02 * (i % 2), 0.028, (0, 0, 0.05), (random.uniform(-20, 20), -30 + i * 15, i * 70), 0.15), 1) for i in range(5)]
    carrot = merge((car, 0), *leaves)
    bmesh.ops.transform(carrot, matrix=Matrix.Translation(cpos) @ Matrix.Rotation(math.radians(P['carrot_lean']), 4, Vector((0, 0, 1)).cross(d))
                        @ Matrix.Scale(P['carrot_scale'], 4), verts=carrot.verts)
    new_obj('hat_carrot', carrot, ['Carrot', 'Leaf'], hat)

    # ---------------- tub of vegetables (child of body, sways on its own pivot)
    tub = empty('tub', P['tub_pos'], body)
    tub.rotation_euler = (math.radians(P['tub_tilt'][0]), math.radians(P['tub_tilt'][1]), 0)
    rb, rt = P['tub_r']; th = P['tub_h']
    staves = lathe([(rb, 0.0), (rb * 1.1, th * 0.35), (rt, th)], seg=14, cap_bottom=True, cap_top=False, jitter=0.03)
    inner = lathe([(rb * 0.9, 0.02), (rt * 0.93, th - 0.005)], seg=14, cap_bottom=True, cap_top=False)
    for f in inner.faces: f.normal_flip()
    rim = lathe([(rt * 1.0, th - 0.005), (rt * 1.06, th - 0.01), (rt * 1.06, th + 0.012), (rt * 0.93, th + 0.012)], seg=14, cap_bottom=False, cap_top=False)
    band1 = lathe([(rb * 1.13, th * 0.25), (rb * 1.15, th * 0.33), (rb * 1.13, th * 0.42)], seg=14, cap_bottom=False, cap_top=False)
    band2 = lathe([(rb * 1.02, 0.0), (rb * 1.04, 0.035)], seg=14, cap_bottom=False, cap_top=False)
    handle = lathe([(1.0, -0.5), (1.0, 0.5)], seg=14, cap_bottom=False, cap_top=False)
    xform(handle, (0, 0, th), (90, 0, 90), (rt * 0.95, 0.13, 0.025))
    for f in list(handle.faces):
        if f.calc_center_median().z < th + 0.02: handle.faces.remove(f)
    new_obj('tub_bucket', merge((staves, 0), (inner, 0), (rim, 1), (band1, 1), (band2, 1), (handle, 1)), ['TubWood', 'TubBand'], tub)
    veg = []
    mats = ['Tomato', 'Onion', 'Cabbage', 'Pepper', 'Pumpkin', 'Leaf', 'LeafDark', 'Carrot']
    pile = [((0.06, -0.06), 0.065, 0), ((-0.07, -0.04), 0.06, 1), ((-0.02, 0.07), 0.075, 2), ((0.09, 0.05), 0.06, 4),
            ((-0.1, 0.06), 0.05, 0), ((0.0, -0.11), 0.05, 1), ((0.12, -0.03), 0.045, 2)]
    for (x, y), r, mi in pile:
        veg.append((sphere((r, r, r * 0.9), 8, 6, (x, y, th + r * 0.25), (random.uniform(0, 40), random.uniform(0, 40), 0)), mi))
    for (x, y, rot) in [(-0.09, -0.03, (-25, -15, 0)), (-0.05, -0.08, (-15, 10, 0))]:   # red peppers
        pep = lathe([(0.0, 0.0), (0.03, 0.04), (0.032, 0.09), (0.0, 0.13)], seg=6)
        veg.append((xform(pep, (x, y, th), rot), 3))
    for i in range(9):   # big leafy greens rising out of the back of the tub
        a = math.radians(70 + i * 22)
        veg.append((leaf_blade(0.26 + 0.06 * (i % 3), 0.085, (0.06 * math.cos(a), 0.06 * math.sin(a) + 0.04, th),
                               (random.uniform(-20, 5), random.uniform(-35, 35), math.degrees(a) + 90), 0.25), 5 + i % 2))
    for i in range(2):   # carrots poking out
        c = lathe([(0.0, 0.0), (0.025, 0.08), (0.02, 0.13), (0.0, 0.135)], seg=6)
        veg.append((xform(c, (0.10 - 0.06 * i, 0.02 + 0.04 * i, th - 0.02), (25 - 10 * i, 25, 0)), 7))
    v = new_obj('tub_veg', merge(*veg), mats, tub)
    v.modifiers.new('solid', 'SOLIDIFY').thickness = 0.004
    return root, body, neck, hat, brim_root, tub


# ---------------------------------------------------------------- animation: a 120-frame seamless idle loop
def animate(root, body, neck, hat, brim_root, tub):
    TAU = 2 * math.pi
    base = {o.name: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for o in (body, neck, hat, brim_root, tub)}
    for f in range(1, 121):
        t = (f - 1) / 120.0
        hop = abs(math.sin(TAU * 2 * t))                        # 4 happy hops per loop
        hop = hop ** 1.5
        # body: bounce up with a squash at the bottom
        l, r, s = base['body']
        body.location = l + Vector((0, 0, 0.035 * hop))
        sq = 1 - 0.035 * (1 - hop) ** 3
        body.scale = (2 - sq, 2 - sq, sq)
        body.rotation_euler = (r.x, r.y + math.radians(2.0 * math.sin(TAU * t)), r.z + math.radians(4 * math.sin(TAU * t)))
        for o in (body,):
            o.keyframe_insert('location', frame=f); o.keyframe_insert('rotation_euler', frame=f); o.keyframe_insert('scale', frame=f)
        # head: slow happy tilt side to side, a small nod on each landing
        l, r, s = base['neck']
        neck.rotation_euler = (r.x + math.radians(-3 * (1 - hop)), r.y + math.radians(9 * math.sin(TAU * t + 0.6)), r.z + math.radians(-6 * math.sin(TAU * t)))
        neck.keyframe_insert('rotation_euler', frame=f)
        # hat lags a touch behind the head
        l, r, s = base['hat']
        hat.rotation_euler = (r.x + math.radians(3 * math.sin(TAU * 2 * t - 0.9)), r.y + math.radians(3 * math.sin(TAU * t - 0.4)), r.z)
        hat.keyframe_insert('rotation_euler', frame=f)
        # brim flops: droop deepens when the body lands, lifts at the top of each hop
        l, r, s = base['hat_brim_pivot']
        flop = math.sin(TAU * 2 * t)                            # neutral at frame 1, deepest just after the top of each hop
        brim_root.scale = (1.0 - 0.012 * flop, 1.0 - 0.012 * flop, 1.0 + 0.24 * flop)
        brim_root.keyframe_insert('scale', frame=f)
        # tub sways on the hip
        l, r, s = base['tub']
        tub.rotation_euler = (r.x + math.radians(3 * math.sin(TAU * 2 * t - 0.5)), r.y + math.radians(4 * math.sin(TAU * t + 1.0)), r.z)
        tub.keyframe_insert('rotation_euler', frame=f)
    for o in (body, neck, hat, brim_root, tub):
        if o.animation_data and o.animation_data.action:
            act = o.animation_data.action
            act.name = 'idle'
            try:
                for fc in act.fcurves:
                    for k in fc.keyframe_points: k.interpolation = 'LINEAR'
            except AttributeError:
                pass
    bpy.context.scene.frame_set(1)


def tri_count():
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return n


if __name__ == '__main__':
    objs = build()
    animate(*objs)
    print('triangles', tri_count())
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_anim_scene_split_object=False, export_apply=True)
    print('wrote', OUT)

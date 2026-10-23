import bpy, bmesh, math, random
from mathutils import Vector

random.seed(42)

def mat(name, col, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    return m

def attach(o, p):
    # keep world placement: parent inverse cancels the parent's rest transform
    bpy.context.view_layer.update()
    o.parent = p
    o.matrix_parent_inverse = p.matrix_world.inverted()

def sphere(name, loc, sc, m, par, seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(4, seg//2), location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = sc
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    attach(o, par)
    return o

def cyl(name, loc, r, d, m, par, rot=(0, 0, 0), r2=None, v=20):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=d, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=d, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    attach(o, par)
    return o

def box(name, loc, sc, m, par):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = sc
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    attach(o, par)
    return o

def empty(name, loc, par=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.location = loc
    if par:
        attach(e, par)
    return e

def build():
    skin = mat("Skin", (0.95, 0.72, 0.55, 1))
    cream = mat("Shirt", (0.96, 0.88, 0.68, 1))
    teal = mat("Overalls", (0.05, 0.5, 0.52, 1))
    red = mat("Bandana", (0.9, 0.2, 0.12, 1))
    hair = mat("Hair", (0.25, 0.13, 0.07, 1))
    boot = mat("Boots", (0.3, 0.17, 0.09, 1))
    straw = mat("Straw", (0.9, 0.73, 0.33, 1), 0.9)
    dark = mat("Dark", (0.03, 0.02, 0.02, 1), 0.3)
    white = mat("White", (1, 1, 1, 1), 0.3)
    metal = mat("Metal", (0.5, 0.55, 0.58, 1), 0.4)
    brass = mat("Brass", (0.8, 0.6, 0.2, 1), 0.4)
    pink = mat("Cheek", (0.9, 0.45, 0.4, 1))

    root = empty("ranch_worker_root", (0, 0, 0))
    hips = empty("hips", (0, 0, 0.5), root)
    chest = empty("chest", (0, 0, 0.62), hips)
    head = empty("head", (0, 0, 0.78), chest)

    cyl("shirt_torso", (0, 0, 0.62), 0.17, 0.26, cream, hips, r2=0.15)
    cyl("overall_body", (0, 0, 0.58), 0.185, 0.2, teal, hips, r2=0.17)
    box("overall_bib", (0, -0.16, 0.7), (0.1, 0.025, 0.085), teal, hips)
    for s in (-1, 1):
        box("strap", (s * 0.09, -0.12, 0.76), (0.02, 0.03, 0.1), teal, hips)
        sphere("button", (s * 0.09, -0.15, 0.7), (0.02, 0.01, 0.02), brass, hips, 8)
    cyl("bandana", (0, 0, 0.77), 0.1, 0.05, red, chest, v=16)
    t = box("bandana_tip", (0, -0.1, 0.73), (0.06, 0.01, 0.05), red, chest)
    t.rotation_euler = (0, 0.785, 0)

    sphere("head_mesh", (0, 0, 0.98), (0.3, 0.27, 0.27), skin, head)
    sphere("hair_back", (0, 0.04, 1.03), (0.32, 0.28, 0.27), hair, head)
    sphere("fringe", (0, -0.1, 1.15), (0.3, 0.15, 0.1), hair, head)
    for s in (-1, 1):
        sphere("ear", (s * 0.29, 0, 0.97), (0.04, 0.03, 0.05), skin, head, 10)
        sphere("eye_white", (s * 0.1, -0.245, 0.98), (0.07, 0.03, 0.08), white, head, 12)
        sphere("pupil", (s * 0.1, -0.272, 0.98), (0.04, 0.015, 0.05), dark, head, 10)
        sphere("eyelid", (s * 0.1, -0.255, 1.04), (0.08, 0.03, 0.03), skin, head, 10)
        b = box("eyebrow", (s * 0.1, -0.26, 1.1), (0.06, 0.01, 0.012), hair, head)
        b.rotation_euler = (0, s * 0.2, 0)
        sphere("cheek", (s * 0.18, -0.22, 0.9), (0.04, 0.01, 0.025), pink, head, 8)
    sphere("nose", (0, -0.28, 0.93), (0.03, 0.03, 0.03), skin, head, 10)
    box("mouth", (0, -0.268, 0.86), (0.05, 0.01, 0.012), dark, head)

    arms = []
    legs = []
    for s, n in ((-1, "L"), (1, "R")):
        sh = empty("shoulder_" + n, (s * 0.21, 0, 0.72), chest)
        cyl("sleeve_" + n, (s * 0.21, 0, 0.66), 0.058, 0.16, cream, sh, r2=0.05)
        cyl("arm_" + n, (s * 0.21, 0, 0.55), 0.045, 0.1, skin, sh)
        sphere("hand_" + n, (s * 0.21, 0, 0.49), (0.06, 0.055, 0.06), skin, sh, 14)
        sphere("thumb_" + n, (s * 0.21 - s * 0.045, -0.03, 0.5), (0.02, 0.02, 0.03), skin, sh, 8)
        arms.append(sh)
        hp = empty("hip_" + n, (s * 0.09, 0, 0.47), hips)
        cyl("leg_" + n, (s * 0.09, 0, 0.37), 0.07, 0.2, teal, hp, r2=0.065)
        cyl("boot_" + n, (s * 0.09, -0.02, 0.12), 0.08, 0.16, boot, hp)
        sphere("toe_" + n, (s * 0.09, -0.07, 0.06), (0.085, 0.1, 0.06), boot, hp, 14)
        cyl("cuff_" + n, (s * 0.09, 0, 0.21), 0.085, 0.03, teal, hp)
        legs.append(hp)

    hs = empty("head_socket", (0, 0, 1.18), head)
    hat = empty("straw_hat", (0, 0, 1.18), hs)
    cyl("hat_brim", (0, 0, 1.2), 0.5, 0.025, straw, hat, r2=0.46, v=32)
    cyl("hat_crown", (0, 0, 1.34), 0.25, 0.28, straw, hat, r2=0.2, v=28)
    cyl("hat_band", (0, 0, 1.23), 0.255, 0.04, red, hat, v=28)

    hsock = empty("hand_socket", (0.21, 0, 0.47), arms[1])
    bk = empty("bucket", (0.21, 0, 0.47), hsock)
    cyl("bucket_body", (0.21, 0, 0.37), 0.1, 0.16, metal, bk, r2=0.075)
    cyl("bucket_rim", (0.21, 0, 0.455), 0.105, 0.015, brass, bk)
    bpy.ops.mesh.primitive_torus_add(location=(0.21, 0, 0.46), major_radius=0.09, minor_radius=0.006, rotation=(math.pi/2, 0, 0))
    h = bpy.context.active_object
    h.name = "bucket_handle"
    h.data.materials.append(brass)
    attach(h, bk)

    sc = bpy.context.scene
    sc.render.fps = 24
    def key(o, f, rot=None, loc=None):
        if rot is not None:
            o.rotation_euler = rot
            o.keyframe_insert("rotation_euler", frame=f)
        if loc is not None:
            o.location = loc
            o.keyframe_insert("location", frame=f)
    for o in arms + legs + [hips, head, chest]:
        o.rotation_mode = 'XYZ'
    hz = 0.5
    for f in (1, 7, 13, 19, 25):
        p = (f - 1) / 24 * 2 * math.pi
        a = math.sin(p)
        key(legs[0], f, (0.5 * a, 0, 0))
        key(legs[1], f, (-0.5 * a, 0, 0))
        key(arms[0], f, (-0.5 * a, 0, 0))
        key(arms[1], f, (0.3 * a, 0, 0))
        key(hips, f, None, (0, 0, hz + 0.02 * abs(math.cos(p))))
        key(head, f, (0, 0, 0.05 * a))
        key(chest, f, (0, 0, 0))
    for f in (31, 43, 55, 67, 79):
        p = (f - 31) / 48 * 2 * math.pi
        a = math.sin(p)
        key(legs[0], f, (0, 0, 0))
        key(legs[1], f, (0, 0, 0))
        key(arms[0], f, (0.05 * a, 0, -0.05))
        key(arms[1], f, (0.05 * a, 0, 0.05))
        key(hips, f, None, (0, 0, hz + 0.008 * a))
        key(chest, f, (0.03 * a, 0, 0))
        key(head, f, (0.03 * math.cos(p), 0, 0.04 * a))
    sc.frame_start = 1
    sc.frame_end = 79
    sc.frame_set(1)
    return {"animationRanges": {"walk": [1, 25], "idle": [31, 79]},
            "notes": "Parent inverse matrices fix double offsets; ~1.48m tall with hat, boots on ground. Empties head_socket and hand_socket; hat and bucket are separate parented groups."}
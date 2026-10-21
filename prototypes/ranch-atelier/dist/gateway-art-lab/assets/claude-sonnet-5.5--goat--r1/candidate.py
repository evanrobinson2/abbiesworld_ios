import bpy, math, random
random.seed(42)

def mat(name, col, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    return m

def prim(kind, loc, scale, rot, parent, m, name):
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1, depth=1)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=1, radius2=0.35, depth=1)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    o.parent = parent
    o.location = loc
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o

def pivot(name, loc, parent):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.parent = parent
    e.location = loc
    return e

def build():
    cream = mat("Cream", (0.9, 0.82, 0.65, 1), 0.9)
    brown = mat("Brown", (0.38, 0.2, 0.09, 1), 0.9)
    dark = mat("Dark", (0.03, 0.025, 0.02, 1), 0.5)
    horn = mat("Horn", (0.45, 0.4, 0.3, 1), 0.5)
    eyem = mat("Eye", (0.85, 0.7, 0.15, 1), 0.3)
    pink = mat("Nose", (0.5, 0.3, 0.28, 1), 0.6)
    root = pivot("GoatRoot", (0, 0, 0), None)
    R = math.radians
    prim("sphere", (0, 0, 0.64), (0.26, 0.5, 0.27), (0, 0, 0), root, cream, "Torso")
    prim("sphere", (0, -0.3, 0.67), (0.25, 0.25, 0.28), (0, 0, 0), root, cream, "Chest")
    prim("sphere", (0, 0.3, 0.63), (0.25, 0.27, 0.26), (0, 0, 0), root, cream, "Rump")
    prim("sphere", (0.12, 0.08, 0.7), (0.17, 0.25, 0.17), (0, 0, R(-15)), root, brown, "PatchA")
    prim("sphere", (-0.15, 0.32, 0.66), (0.14, 0.17, 0.17), (0, 0, 0), root, brown, "PatchB")
    prim("sphere", (-0.12, -0.28, 0.76), (0.15, 0.15, 0.12), (0, 0, 0), root, brown, "PatchC")
    neck = pivot("Neck", (0, -0.42, 0.78), root)
    prim("cone", (0, -0.1, 0.1), (0.12, 0.12, 0.34), (R(-30), 0, 0), neck, cream, "NeckMesh")
    # cone axis: flip so wide base at body
    head = pivot("Head", (0, -0.22, 0.24), neck)
    prim("sphere", (0, -0.02, 0), (0.1, 0.15, 0.1), (0, 0, 0), head, cream, "Skull")
    prim("cone", (0, -0.2, -0.04), (0.075, 0.075, 0.17), (R(90 + 12), 0, 0), head, cream, "Muzzle")
    prim("sphere", (0, -0.29, -0.06), (0.05, 0.03, 0.04), (0, 0, 0), head, pink, "Nose")
    prim("sphere", (0, -0.1, 0.07), (0.1, 0.08, 0.06), (0, 0, 0), head, brown, "Forehead")
    for s in (-1, 1):
        prim("sphere", (s * 0.085, -0.08, 0.03), (0.02, 0.03, 0.03), (0, 0, 0), head, eyem, "Eye")
        prim("sphere", (s * 0.103, -0.083, 0.03), (0.008, 0.015, 0.02), (0, 0, 0), head, dark, "Pupil")
        prim("sphere", (s * 0.17, 0.0, 0.03), (0.09, 0.04, 0.03), (0, R(s * 20), R(s * 15)), head, brown, "Ear")
        pts = [(0, 0), (0.01, 0.07), (0.0, 0.14), (-0.04, 0.2), (-0.1, 0.22)]
        cu = bpy.data.curves.new("HornC", "CURVE")
        cu.dimensions = "3D"
        sp = cu.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for i, (a, b) in enumerate(pts):
            sp.points[i].co = (s * (0.05 + 0.1 * (i / 4) ** 1.5), 0.0 + 0.1 * (i / 4) ** 2 * 1.2, 0.08 + b * 0.9 * 0 + i * 0.045, 1)
        cu.bevel_depth = 0.02
        cu.use_fill_caps = True
        cu.bevel_resolution = 3
        ho = bpy.data.objects.new("Horn", cu)
        bpy.context.collection.objects.link(ho)
        ho.parent = head
        ho.location = (0, 0, 0)
        cu.materials.append(horn)
    prim("cone", (0, -0.22, -0.15), (0.025, 0.025, 0.14), (R(180), 0, 0), head, cream, "Beard")
    tail = pivot("Tail", (0, 0.55, 0.75), root)
    prim("cone", (0, 0.05, 0.03), (0.04, 0.04, 0.14), (R(-70), 0, 0), tail, brown, "TailMesh")
    legs = []
    for nm, x, y, ph in (("FL", -0.14, -0.33, 0), ("FR", 0.14, -0.33, .5), ("RL", -0.14, 0.33, .5), ("RR", 0.14, 0.33, 0)):
        hip = pivot("Hip" + nm, (x, y, 0.6), root)
        prim("cone", (0, 0, -0.15), (0.08, 0.08, 0.32), (R(180), 0, 0), hip, cream, "Upper" + nm)
        knee = pivot("Knee" + nm, (0, 0, -0.3), hip)
        prim("cyl", (0, 0, -0.13), (0.04, 0.04, 0.27), (0, 0, 0), knee, brown if y < 0 else cream, "Lower" + nm)
        prim("sphere", (0, 0, 0), (0.05, 0.05, 0.05), (0, 0, 0), knee, cream, "Knee" + nm)
        for hx in (-0.017, 0.017):
            prim("cyl", (hx, -0.01, -0.27), (0.02, 0.035, 0.06), (0, 0, 0), knee, dark, "Hoof" + nm)
        legs.append((hip, knee, ph))
    def key(o, f, v=None):
        o.keyframe_insert("rotation_euler", frame=f)
    for f in (1, 5, 9, 13, 17, 21, 25):
        t = (f - 1) / 24 * 2 * math.pi
        for hip, knee, ph in legs:
            th = t + ph * 2 * math.pi
            hip.rotation_euler = (0.35 * math.sin(th), 0, 0)
            knee.rotation_euler = (0.7 * max(0, -math.cos(th)), 0, 0)
            key(hip, f); key(knee, f)
        neck.rotation_euler = (0.04 * math.sin(2 * t), 0, 0)
        head.rotation_euler = (0, 0, 0)
        tail.rotation_euler = (0, 0, 0.2 * math.sin(t))
        key(neck, f); key(tail, f); key(head, f)
    for i, f in enumerate((31, 43, 55, 67, 79)):
        a = math.sin(i / 4 * 2 * math.pi)
        for hip, knee, ph in legs:
            hip.rotation_euler = (0, 0, 0); knee.rotation_euler = (0, 0, 0)
            key(hip, f); key(knee, f)
        neck.rotation_euler = (0.04 * a, 0, 0)
        head.rotation_euler = (0.08 * a, 0, 0.1 * math.sin(i / 4 * 4 * math.pi))
        tail.rotation_euler = (0, 0, 0.3 * math.sin(i / 4 * 4 * math.pi))
        key(neck, f); key(head, f); key(tail, f)
    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 79
    bpy.context.scene.frame_set(1)
    return {"animationRanges": {"walk": [1, 25], "idle": [31, 79]}, "notes": "Pivot-hierarchy goat; walk uses diagonal gait with knee flexion, idle has head/neck/tail motion."}
import bpy, bmesh, math, random
from mathutils import Matrix, Vector

def build():
    random.seed(42)
    sc = bpy.context.scene
    sc.render.fps = 24
    sc.frame_start = 1
    sc.frame_end = 60

    def mat(name, col, rough, metal=0.0, alpha=1.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = col
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metal
        if alpha < 1:
            b.inputs["Alpha"].default_value = alpha
            try:
                m.surface_render_method = 'BLENDED'
            except Exception:
                pass
        return m

    m_wood = mat("Timber_Warm", (0.46, 0.27, 0.12, 1), 0.85)
    m_dark = mat("Timber_Frame", (0.32, 0.19, 0.09, 1), 0.9)
    m_zinc = mat("Galvanized", (0.58, 0.61, 0.62, 1), 0.45, 0.85)
    m_bolt = mat("Steel_Bolts", (0.25, 0.26, 0.27, 1), 0.5, 0.9)
    m_water = mat("Water", (0.22, 0.48, 0.58, 1), 0.05, 0.0, 0.65)

    def box(bm, c, s, rx=0.0):
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Diagonal((s[0], s[1], s[2], 1.0))
        bmesh.ops.create_cube(bm, size=1.0, matrix=M)

    def bolt(bm, c, axis, r=0.012, d=0.008):
        rot = Matrix.Rotation(math.radians(90), 4, 'X') if axis == 'Y' else Matrix.Rotation(math.radians(90), 4, 'Y')
        M = Matrix.Translation(Vector(c)) @ rot
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=8,
                              radius1=r, radius2=r, depth=d, matrix=M)

    def make(name, bm, material, bevel=0.0):
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.data.materials.append(material)
        if bevel:
            md = ob.modifiers.new("Bevel", 'BEVEL')
            md.width = bevel
            md.segments = 1
            md.limit_method = 'ANGLE'
        return ob

    # ---- timber basin (hollow: floor + 4 walls) ----
    bw = bmesh.new()
    box(bw, (0, 0, 0.34), (1.8, 0.70, 0.08))
    for sy in (-1, 1):
        box(bw, (0, sy * 0.315, 0.4725), (1.8, 0.07, 0.1675 * 2))
    for sx in (-1, 1):
        box(bw, (sx * 0.865, 0, 0.4725), (0.07, 0.56, 0.3350))
    for sy in (-1, 1):
        box(bw, (0, sy * 0.352, 0.47), (1.8, 0.004, 0.006))
    make("Basin_Timber", bw, m_wood, 0.004)

    # ---- frame: legs, rails, braces ----
    bf = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(bf, (sx * 0.74, sy * 0.26, 0.155), (0.09, 0.09, 0.31))
        box(bf, (sx * 0.74, 0, 0.14), (0.05, 0.43, 0.05))
        for sy in (-1, 1):
            dy, dz = 0.19, 0.24
            ln = math.hypot(dy, dz)
            box(bf, (sx * 0.74, sy * (0.24 - dy / 2), 0.04 + dz / 2),
                (0.04, 0.04, ln), rx=-sy * math.atan2(dy, dz) * -1)
    for sy in (-1, 1):
        box(bf, (0, sy * 0.26, 0.12), (1.48, 0.05, 0.05))
    box(bf, (0, 0, 0.275), (1.5, 0.08, 0.04))
    make("Frame_Timber", bf, m_dark, 0.004)

    # ---- galvanized liner + rim caps ----
    bl = bmesh.new()
    box(bl, (0, 0, 0.384), (1.73, 0.56, 0.008))
    for sy in (-1, 1):
        box(bl, (0, sy * 0.276, 0.5125), (1.73, 0.008, 0.265))
    for sx in (-1, 1):
        box(bl, (sx * 0.861, 0, 0.5125), (0.008, 0.544, 0.265))
    for sy in (-1, 1):
        box(bl, (0, sy * 0.315, 0.644), (1.82, 0.09, 0.012))
    for sx in (-1, 1):
        box(bl, (sx * 0.865, 0, 0.644), (0.09, 0.64, 0.012))
    make("Liner_Metal", bl, m_zinc, 0.002)

    # ---- straps and bolts ----
    bs = bmesh.new()
    bb = bmesh.new()
    for x in (-0.6, 0.0, 0.6):
        box(bs, (x, 0, 0.296), (0.06, 0.716, 0.008))
        for sy in (-1, 1):
            box(bs, (x, sy * 0.354, 0.465), (0.06, 0.008, 0.346))
            for z in (0.40, 0.56):
                bolt(bb, (x, sy * 0.361, z), 'Y')
    for sx in (-1, 1):
        box(bs, (sx * 0.904, 0, 0.465), (0.008, 0.07, 0.346))
        for z in (0.40, 0.56):
            bolt(bb, (sx * 0.911, 0, z), 'X')
        for sy in (-1, 1):
            for z in (0.20, 0.10):
                bolt(bb, (sx * 0.789, sy * 0.26, z), 'X', 0.012, 0.01)
    make("Straps_Metal", bs, m_zinc, 0.001)
    make("Bolts", bb, m_bolt)

    # ---- water (origin at bottom; height 0.19 at scale 1) ----
    bwtr = bmesh.new()
    box(bwtr, (0, 0, 0.095), (1.70, 0.53, 0.19))
    water = make("Water_Surface", bwtr, m_water)
    # Frame 1: full, bottom at 0.39, top at 0.58.
    water.location = (0, 0, 0.39)
    water.scale = (1, 1, 1)
    water.keyframe_insert("location", frame=1)
    water.keyframe_insert("scale", frame=1)
    # Frame 60: sunk fully inside the floor (top ~0.377 < liner floor top 0.388), so invisible.
    water.location = (0, 0, 0.375)
    water.scale = (1, 1, 0.01)
    water.keyframe_insert("location", frame=60)
    water.keyframe_insert("scale", frame=60)
    ad = water.animation_data
    if ad and ad.action:
        ad.action.name = "water_state"
        try:
            for fc in ad.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'
        except Exception:
            pass
    sc.frame_set(1)

    return {"animationRanges": {"water_state": [1, 60]},
            "notes": "Hollow timber basin with galvanized liner, rim caps, straps, bolts, braced legs. Separate water mesh drains from full (frame 1) to fully hidden below the liner floor (frame 60) via linked Z scale and location keys, always within the basin."}
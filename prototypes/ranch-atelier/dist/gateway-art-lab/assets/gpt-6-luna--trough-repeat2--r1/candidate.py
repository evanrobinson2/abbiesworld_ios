import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)

    def material(name, color, roughness=0.75, metallic=0.0):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1.0)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        return mat

    timber = material("Warm weathered timber", (0.30, 0.145, 0.065), 0.87)
    timber_light = material("Worn timber edges", (0.39, 0.215, 0.105), 0.82)
    timber_dark = material("Timber end grain", (0.22, 0.095, 0.038), 0.9)
    metal = material("Quiet galvanized steel", (0.43, 0.49, 0.50), 0.42, 0.68)
    bolt_mat = material("Darkened steel fasteners", (0.20, 0.24, 0.25), 0.4, 0.75)
    water_mat = material("Still ranch water", (0.045, 0.24, 0.28), 0.22, 0.12)

    def box(name, loc, dims, mat, bevel=0.0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.object
        obj.name = name
        obj.dimensions = dims
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(mat)
        if bevel:
            mod = obj.modifiers.new("Soft worn edges", "BEVEL")
            mod.width = bevel
            mod.segments = 1
            mod.limit_method = "ANGLE"
            obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        return obj

    def beam(name, p1, p2, width, depth, mat, bevel=0.006):
        delta = Vector(p2) - Vector(p1)
        obj = box(name, (Vector(p1) + Vector(p2)) * 0.5,
                  (width, depth, delta.length), mat, bevel)
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = delta.to_track_quat("Z", "Y")
        return obj

    def cylinder(name, loc, radius, depth, mat, axis="Y"):
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=loc)
        obj = bpy.context.object
        obj.name = name
        if axis == "Y":
            obj.rotation_euler[0] = math.pi / 2
        elif axis == "X":
            obj.rotation_euler[1] = math.pi / 2
        obj.data.materials.append(mat)
        mod = obj.modifiers.new("Fastener edge", "BEVEL")
        mod.width = 0.0015
        mod.segments = 1
        obj.modifiers.new("Fastener normals", "WEIGHTED_NORMAL")
        return obj

    # Timber shell: separate boards leave a genuinely open basin.
    box("Timber basin bottom", (0, 0, 0.345), (1.58, 0.48, 0.075), timber, 0.012)
    box("Front long timber wall", (0, -0.29, 0.505), (1.80, 0.12, 0.30), timber, 0.012)
    box("Back long timber wall", (0, 0.29, 0.505), (1.80, 0.12, 0.30), timber, 0.012)
    box("Left end timber wall", (-0.84, 0, 0.505), (0.12, 0.48, 0.30), timber_light, 0.01)
    box("Right end timber wall", (0.84, 0, 0.505), (0.12, 0.48, 0.30), timber_light, 0.01)

    # Galvanized liner across the bottom and inner faces.
    box("Liner bottom", (0, 0, 0.386), (1.60, 0.50, 0.012), metal, 0.003)
    box("Liner front inner face", (0, -0.226, 0.515), (1.60, 0.014, 0.248), metal, 0.003)
    box("Liner back inner face", (0, 0.226, 0.515), (1.60, 0.014, 0.248), metal, 0.003)
    box("Liner left inner face", (-0.786, 0, 0.515), (0.014, 0.44, 0.248), metal, 0.003)
    box("Liner right inner face", (0.786, 0, 0.515), (0.014, 0.44, 0.248), metal, 0.003)

    # Rim caps and corner straps.
    for y in (-0.29, 0.29):
        box("Long galvanized rim cap", (0, y, 0.657), (1.82, 0.132, 0.018), metal, 0.004)
    for x in (-0.84, 0.84):
        box("End galvanized rim cap", (x, 0, 0.657), (0.13, 0.50, 0.018), metal, 0.004)
    for x in (-0.84, 0.84):
        for y in (-0.353, 0.353):
            box("Outer corner binding", (x, y, 0.50), (0.055, 0.012, 0.29), metal, 0.003)

    # Splayed legs, feet, and lower cross-bracing.
    for x in (-0.70, 0.70):
        for y in (-0.245, 0.245):
            foot_x = x * 1.08
            foot_y = y * 1.22
            beam("Splayed timber leg", (foot_x, foot_y, 0.015), (x, y, 0.38),
                 0.085, 0.085, timber_light, 0.008)
            box("Leg foot pad", (foot_x, foot_y, 0.018), (0.105, 0.105, 0.035), timber_dark, 0.004)
    for y in (-0.30, 0.30):
        box("Long lower stretcher", (0, y, 0.16), (1.43, 0.065, 0.075), timber, 0.008)
    for x in (-0.70, 0.70):
        box("End lower stretcher", (x, 0, 0.16), (0.065, 0.47, 0.075), timber, 0.008)

    # Purposeful visible fasteners on walls and joints.
    for x in (-0.68, 0.0, 0.68):
        for z in (0.43, 0.58):
            for y in (-0.353, 0.353):
                cylinder("Rim-wall bolt", (x, y, z), 0.012, 0.012, bolt_mat)
    for x in (-0.905, 0.905):
        for y in (-0.12, 0.12):
            for z in (0.44, 0.57):
                cylinder("End-wall bolt", (x, y, z), 0.012, 0.012, bolt_mat, "X")
    for x in (-0.70, 0.70):
        for y in (-0.34, 0.34):
            cylinder("Stretcher fixing", (x, y, 0.16), 0.013, 0.012, bolt_mat)

    # Separate, closed water volume with a gently uneven top surface.
    nx, ny = 24, 8
    verts = []
    for j in range(ny + 1):
        y = -0.207 + 0.414 * j / ny
        for i in range(nx + 1):
            x = -0.755 + 1.51 * i / nx
            z = 0.185 + 0.004 * math.sin(i * 0.72 + j * 0.41) * math.sin(j * 0.8)
            verts.append((x, y, z))
    top_count = len(verts)
    verts.extend([(-0.755, -0.207, 0.006), (0.755, -0.207, 0.006),
                  (0.755, 0.207, 0.006), (-0.755, 0.207, 0.006)])
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    b0, b1, b2, b3 = top_count, top_count + 1, top_count + 2, top_count + 3
    for i in range(nx):
        a = i
        c = ny * (nx + 1) + i
        faces.append((b0, a + 1, a))
        faces.append((b2, c, c + 1))
    for j in range(ny):
        a = j * (nx + 1)
        c = (j + 1) * (nx + 1)
        faces.append((b3, a, c))
        a = j * (nx + 1) + nx
        c = (j + 1) * (nx + 1) + nx
        faces.append((b1, c, a))
    faces.extend([(b3, b2, b1, b0), (b0, b1, b2, b3)])
    mesh = bpy.data.meshes.new("Water surface mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(water_mat)
    mesh.update()
    water = bpy.data.objects.new("Animated trough water", mesh)
    bpy.context.collection.objects.link(water)
    water.location.z = 0.395

    # Collapse the whole water volume to a point at empty, rather than leaving a thin visible sheet.
    water.scale = (1.0, 1.0, 1.0)
    water.keyframe_insert(data_path="scale", frame=1)
    water.scale = (0.0, 0.0, 0.0)
    water.keyframe_insert(data_path="scale", frame=60)
    water.keyframe_insert(data_path="scale", frame=79)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 79
    scene.render.fps = 24
    scene.frame_set(1)
    return {
        "animationRanges": {"water_state": [1, 60]},
        "notes": "Open timber trough with a separate water volume that drains to a collapsed, empty state by frame 60."
    }
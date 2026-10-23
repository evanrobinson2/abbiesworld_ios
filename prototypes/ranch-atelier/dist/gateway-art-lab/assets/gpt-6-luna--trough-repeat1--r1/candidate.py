import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)

    def material(name, color, roughness=0.7, metallic=0.0):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1.0)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        return mat

    timber = material("Weathered warm timber", (0.29, 0.145, 0.065), 0.82)
    endgrain = material("Timber end grain", (0.36, 0.20, 0.10), 0.88)
    galvanized = material("Quiet galvanized steel", (0.43, 0.48, 0.48), 0.36, 0.72)
    boltmat = material("Darkened steel fasteners", (0.19, 0.22, 0.22), 0.42, 0.78)
    watermat = material("Trough water", (0.075, 0.26, 0.31), 0.22, 0.15)

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

    def cylinder(name, loc, radius, depth, mat, axis="Y", vertices=12):
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
        obj = bpy.context.object
        obj.name = name
        if axis == "Y":
            obj.rotation_euler[0] = math.radians(90)
        elif axis == "X":
            obj.rotation_euler[1] = math.radians(90)
        obj.data.materials.append(mat)
        return obj

    for x in (-0.68, 0.68):
        for y in (-0.265, 0.265):
            box("Square support leg", (x, y, 0.17), (0.13, 0.13, 0.34), timber, 0.012)
            box("Leg foot", (x, y, 0.025), (0.15, 0.15, 0.05), endgrain, 0.008)

    for x in (-0.68, 0.68):
        box("End support rail", (x, 0, 0.245), (0.11, 0.60, 0.09), endgrain, 0.008)
    for y in (-0.265, 0.265):
        box("Long support rail", (0, y, 0.245), (1.47, 0.09, 0.09), timber, 0.008)

    for i in range(4):
        x = -0.675 + i * 0.45
        box("Bottom timber plank", (x, 0, 0.315), (0.445, 0.63, 0.075), timber, 0.006)
    for y in (-0.315, 0.315):
        box("Long basin wall", (0, y, 0.475), (1.80, 0.09, 0.32), timber, 0.012)
    for x in (-0.855, 0.855):
        box("End basin wall", (x, 0, 0.475), (0.09, 0.54, 0.32), endgrain, 0.010)

    box("Liner bottom", (0, 0, 0.359), (1.66, 0.48, 0.012), galvanized, 0.002)
    for y in (-0.247, 0.247):
        box("Liner long inner wall", (0, y, 0.485), (1.66, 0.014, 0.25), galvanized, 0.002)
    for x in (-0.827, 0.827):
        box("Liner end inner wall", (x, 0, 0.485), (0.014, 0.47, 0.25), galvanized, 0.002)

    for y in (-0.315, 0.315):
        box("Long rim cap", (0, y, 0.642), (1.84, 0.12, 0.036), endgrain, 0.008)
    for x in (-0.855, 0.855):
        box("End rim cap", (x, 0, 0.642), (0.12, 0.54, 0.036), timber, 0.008)

    for y in (-0.369, 0.369):
        for x in (-0.79, 0.79):
            box("Corner reinforcing strap", (x, y, 0.48), (0.052, 0.018, 0.275), galvanized, 0.004)
            for z in (0.385, 0.57):
                cylinder("Strap rivet", (x, y + (0.012 if y > 0 else -0.012), z),
                         0.014, 0.018, boltmat, "Y", 12)
        for x in (-0.52, 0.0, 0.52):
            for z in (0.345, 0.595):
                cylinder("Timber wall bolt", (x, y + (0.052 if y > 0 else -0.052), z),
                         0.012, 0.018, boltmat, "Y", 10)

    for x in (-0.91, 0.91):
        for y in (-0.16, 0.16):
            for z in (0.39, 0.56):
                cylinder("End wall bolt", (x, y, z), 0.011, 0.018, boltmat, "X", 10)

    n = 5
    verts = []
    faces = []
    for j in range(n):
        for i in range(n):
            u = i / (n - 1) * 2.0 - 1.0
            v = j / (n - 1) * 2.0 - 1.0
            verts.append((u * 0.785, v * 0.225, 0.579))
    for j in range(n - 1):
        for i in range(n - 1):
            a = j * n + i
            faces.append((a, a + 1, a + 1 + n, a + n))
    mesh = bpy.data.meshes.new("Water surface grid")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    water = bpy.data.objects.new("Animated water level", mesh)
    bpy.context.collection.objects.link(water)
    water.data.materials.append(watermat)
    water.shape_key_add(name="Basis")
    empty = water.shape_key_add(name="Draw down to empty")
    for i in range(n * n):
        empty.data[i].co = (0.0, 0.0, 0.365)
    empty.value = 0.0
    empty.keyframe_insert(data_path="value", frame=1)
    empty.value = 1.0
    empty.keyframe_insert(data_path="value", frame=60)
    keys = water.data.shape_keys
    if keys.animation_data and keys.animation_data.action:
        keys.animation_data.action.name = "water_state"

    bpy.context.scene.frame_set(1)
    return {"animationRanges": {"water_state": [1, 60]}, "notes": "Separate water surface collapses to a zero-area point at the lined bottom by frame 60."}
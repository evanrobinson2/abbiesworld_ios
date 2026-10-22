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

    wood = [
        material("Timber • warm cedar", (0.31, 0.145, 0.060)),
        material("Timber • sun-worn", (0.39, 0.205, 0.092)),
        material("Timber • dark grain", (0.24, 0.105, 0.041)),
    ]
    metal = material("Galvanized steel", (0.43, 0.49, 0.51), 0.43, 0.72)
    boltmat = material("Weathered fasteners", (0.28, 0.32, 0.33), 0.42, 0.78)
    watermat = material("Quiet trough water", (0.075, 0.23, 0.27), 0.2, 0.12)

    def cube(name, loc, dims, mat, bevel=0.0):
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
            obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        return obj

    def beam(name, a, b, width, depth, mat, bevel=0.012):
        mid = (Vector(a) + Vector(b)) * 0.5
        vec = Vector(b) - Vector(a)
        obj = cube(name, mid, (width, depth, vec.length), mat, bevel)
        obj.rotation_euler[1] = math.atan2(vec.x, vec.z)
        return obj

    # Two substantial bottom rails, visible beneath the basin.
    for y in (-0.205, 0.205):
        cube("Longitudinal bottom bearer", (0, y, 0.315), (1.72, 0.105, 0.105), wood[2], 0.012)

    # Four splayed timber legs; their feet rest precisely on the ground.
    for xsign in (-1, 1):
        for ysign in (-1, 1):
            x0, x1 = xsign * 0.69, xsign * 0.77
            y0, y1 = ysign * 0.17, ysign * 0.25
            beam("Splayed corner leg", (x1, y1, 0.035), (x0, y0, 0.37), 0.105, 0.105, wood[1], 0.014)

    # Lower cross braces tie the legs together.
    for y in (-0.25, 0.25):
        cube("End cross brace", (0, y, 0.18), (1.50, 0.075, 0.075), wood[2], 0.01)
    for x in (-0.72, 0.72):
        cube("Side cross brace", (x, 0, 0.18), (0.075, 0.48, 0.075), wood[2], 0.01)

    # Timber basin walls are separate boards, leaving a genuinely open cavity.
    course_h = 0.105
    for course in range(3):
        z = 0.365 + course_h * (course + 0.5)
        plankmat = wood[(course + 1) % 2]
        for y in (-0.295, 0.295):
            cube("Long side wall plank", (0, y, z), (1.80, 0.09, course_h), plankmat, 0.009)
        for x in (-0.855, 0.855):
            cube("End wall plank", (x, 0, z), (0.09, 0.50, course_h), wood[course % 2], 0.009)

    # A thin galvanized liner follows the inside bottom and four walls.
    cube("Liner • bottom pan", (0, 0, 0.376), (1.62, 0.49, 0.018), metal, 0.004)
    for y in (-0.247, 0.247):
        cube("Liner • long inner wall", (0, y, 0.515), (1.62, 0.014, 0.266), metal, 0.003)
    for x in (-0.817, 0.817):
        cube("Liner • end inner wall", (x, 0, 0.515), (0.014, 0.47, 0.266), metal, 0.003)

    # Narrow folded metal edging around the rim.
    for y in (-0.296, 0.296):
        cube("Galvanized rim cap", (0, y, 0.684), (1.84, 0.105, 0.022), metal, 0.005)
    for x in (-0.855, 0.855):
        cube("Galvanized end rim cap", (x, 0, 0.684), (0.105, 0.49, 0.022), metal, 0.005)

    # Small exposed fasteners, set along both long outer faces and end boards.
    def bolt(loc, axis):
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.012, depth=0.009, location=loc)
        obj = bpy.context.object
        obj.name = "Liner fixing bolt"
        obj.data.materials.append(boltmat)
        if axis == "y":
            obj.rotation_euler[0] = math.pi / 2
        elif axis == "x":
            obj.rotation_euler[1] = math.pi / 2
        bevel = obj.modifiers.new("Bolt edge", "BEVEL")
        bevel.width = 0.002
        bevel.segments = 1
        obj.modifiers.new("Bolt normals", "WEIGHTED_NORMAL")

    for y in (-0.343, 0.343):
        for x in (-0.73, -0.25, 0.25, 0.73):
            for z in (0.424, 0.634):
                bolt((x, y, z), "y")
    for x in (-0.903, 0.903):
        for y in (-0.16, 0.16):
            for z in (0.424, 0.634):
                bolt((x, y, z), "x")

    # Separate water surface: it descends and contracts to zero area by frame 60.
    verts = [
        (-0.79, -0.225, 0),
        (0.79, -0.225, 0),
        (0.79, 0.225, 0),
        (-0.79, 0.225, 0),
    ]
    mesh = bpy.data.meshes.new("Water surface mesh")
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.materials.append(watermat)
    water = bpy.data.objects.new("Water • falling level", mesh)
    bpy.context.collection.objects.link(water)
    water.location.z = 0.545
    water.scale = (1.0, 1.0, 1.0)
    water.keyframe_insert(data_path="location", frame=1)
    water.keyframe_insert(data_path="scale", frame=1)

    water.location.z = 0.385
    water.scale = (0.0, 0.0, 0.0)
    water.keyframe_insert(data_path="location", frame=60)
    water.keyframe_insert(data_path="scale", frame=60)

    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60
    scene.timeline_markers.new("water_state", frame=1)
    scene.timeline_markers.new("empty", frame=60)
    scene.frame_set(1)
    return {
        "water_state": [1, 60],
        "notes": "Hollow timber trough with a separate water surface that lowers and contracts to zero area by frame 60.",
    }
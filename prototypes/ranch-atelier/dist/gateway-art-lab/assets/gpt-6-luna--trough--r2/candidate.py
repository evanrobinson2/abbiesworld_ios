import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 60
    scene.render.fps = 24

    def mat(name, color, roughness, metallic=0.0):
        m = bpy.data.materials.new(name)
        m.diffuse_color = color
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        return m

    wood = mat("Warm weathered timber", (0.34, 0.16, 0.065, 1), 0.78)
    wood_light = mat("Sunworn timber", (0.40, 0.205, 0.09, 1), 0.76)
    endgrain = mat("Timber end grain", (0.29, 0.12, 0.045, 1), 0.82)
    steel = mat("Quiet galvanized steel", (0.46, 0.51, 0.52, 1), 0.38, 0.68)
    liner = mat("Dull galvanized liner", (0.33, 0.39, 0.40, 1), 0.34, 0.62)
    water_mat = mat("Still trough water", (0.075, 0.19, 0.21, 1), 0.23, 0.16)

    def cube(name, loc, dims, material, bevel=0.0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        ob = bpy.context.object
        ob.name = name
        ob.dimensions = dims
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if bevel:
            mod = ob.modifiers.new("Small softened edges", "BEVEL")
            mod.width = min(bevel, min(dims) * 0.3)
            mod.segments = 1
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.data.materials.append(material)
        return ob

    def beam(name, start, end, width, depth, material, bevel=0.004):
        a, b = Vector(start), Vector(end)
        d = b - a
        ob = cube(name, (a + b) * 0.5, (width, depth, d.length), material, bevel)
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
        return ob

    def cylinder(name, loc, radius, depth, axis, material, vertices=12):
        direction = Vector(axis).normalized()
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=vertices, radius=radius, depth=depth, location=loc,
            rotation=Vector((0, 0, 1)).rotation_difference(direction).to_euler())
        ob = bpy.context.object
        ob.name = name
        ob.data.materials.append(material)
        for p in ob.data.polygons:
            if len(p.vertices) == 4:
                p.use_smooth = True
        return ob

    # Three stout planks make the base of the open basin.
    for i, y in enumerate((-0.235, 0.0, 0.235)):
        cube("Basin bottom plank %d" % (i + 1), (0, y, 0.225),
             (1.8, 0.23, 0.075), (wood, wood_light, wood)[i], 0.008)

    # Two courses of timber surround the basin; the center remains truly open.
    courses = (0.335, 0.525)
    for side in (-1, 1):
        for i, z in enumerate(courses):
            cube(("Front" if side < 0 else "Back") + " wall course %d" % (i + 1),
                 (0, side * 0.305, z), (1.8, 0.09, 0.19),
                 wood_light if i == 0 else wood, 0.009)
    for side in (-1, 1):
        for i, z in enumerate(courses):
            cube(("Left" if side < 0 else "Right") + " end course %d" % (i + 1),
                 (side * 0.855, 0, z), (0.09, 0.70, 0.19),
                 wood if i == 0 else wood_light, 0.009)

    # A folded-looking metal lining: floor and four interior faces, not a solid insert.
    cube("Liner floor", (0, 0, 0.268), (1.60, 0.50, 0.012), liner, 0.001)
    for side in (-1, 1):
        cube("Interior long liner %s" % side, (0, side * 0.254, 0.435),
             (1.61, 0.012, 0.32), liner, 0.001)
        cube("Interior end liner %s" % side, (side * 0.804, 0, 0.435),
             (0.012, 0.50, 0.32), liner, 0.001)

    # Wide end-grain rim caps and small metal corner straps.
    for side in (-1, 1):
        cube("End rim cap %s" % side, (side * 0.855, 0, 0.625),
             (0.10, 0.72, 0.04), endgrain, 0.006)
        for yside in (-1, 1):
            cube("Galvanized corner strap", (side * 0.855, yside * 0.305, 0.46),
                 (0.014, 0.012, 0.30), steel, 0.002)
            for z in (0.35, 0.53):
                cylinder("Corner strap rivet",
                         (side * 0.864, yside * 0.316, z),
                         0.012, 0.009, (1, 0, 0), steel, 10)

    # Four braced legs with cross stretchers. Feet stand exactly on ground.
    for x in (-0.68, 0.68):
        for y in (-0.245, 0.245):
            cube("Square timber leg", (x, y, 0.115), (0.13, 0.13, 0.23), wood, 0.008)
    for x in (-0.68, 0.68):
        beam("End diagonal brace", (x, -0.245, 0.12), (x, 0.245, 0.32),
             0.055, 0.055, wood_light)
        beam("End diagonal brace", (x, 0.245, 0.12), (x, -0.245, 0.32),
             0.055, 0.055, wood_light)
    for y in (-0.245, 0.245):
        cube("Long lower stretcher", (0, y, 0.115), (1.46, 0.065, 0.07), wood, 0.006)

    # Bolt heads on both long sides attach the two wall courses to the structure.
    for side in (-1, 1):
        for x in (-0.70, -0.25, 0.25, 0.70):
            for z in (0.35, 0.53):
                cylinder("Timber fixing bolt",
                         (x, side * 0.354, z), 0.014, 0.012,
                         (0, 1, 0), steel, 12)

    # Independent shallow grid surface. At frame 60 it descends beneath the
    # sealed liner floor, giving a genuinely empty visible trough.
    nx, ny = 12, 5
    verts = []
    faces = []
    for j in range(ny + 1):
        y = -0.235 + 0.47 * j / ny
        for i in range(nx + 1):
            x = -0.77 + 1.54 * i / nx
            z = 0.0
            verts.append((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    mesh = bpy.data.meshes.new("Water surface grid")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(water_mat)
    water = bpy.data.objects.new("Water | draining state", mesh)
    scene.collection.objects.link(water)
    water.location.z = 0.49
    for p in mesh.polygons:
        p.use_smooth = True

    water.keyframe_insert(data_path="location", frame=1)
    water.location.z = 0.235
    water.keyframe_insert(data_path="location", frame=60)
    if water.animation_data and water.animation_data.action:
        water.animation_data.action.name = "water_state"
    scene.frame_set(1)

    return {"notes": "Ranch trough with open hollow timber basin, fitted metal liner, braced legs, bolts, and a separate water surface that drains below the liner by frame 60."}
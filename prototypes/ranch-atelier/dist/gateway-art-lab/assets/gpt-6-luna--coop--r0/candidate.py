import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)

    def make_material(name, color, roughness=0.78, metallic=0.0):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1.0)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        return mat

    wood = make_material("Warm honey cedar", (0.39, 0.19, 0.085))
    wood_light = make_material("Sunlit cedar", (0.56, 0.30, 0.13))
    wood_dark = make_material("Dark timber", (0.24, 0.105, 0.045))
    wood_pale = make_material("Pale cut timber", (0.68, 0.43, 0.22))
    cream = make_material("Warm ivory trim", (0.82, 0.69, 0.46))
    teal = make_material("Ranch teal roofing", (0.035, 0.28, 0.30), roughness=0.48, metallic=0.12)
    teal_dark = make_material("Deep teal roof trim", (0.018, 0.16, 0.18), roughness=0.52, metallic=0.12)
    iron = make_material("Aged iron", (0.12, 0.15, 0.14), roughness=0.42, metallic=0.65)
    interior = make_material("Interior shadow timber", (0.13, 0.075, 0.04))
    straw = make_material("Dry straw", (0.64, 0.43, 0.15))

    def box(name, loc, dims, mat, bevel=0.0, rot=None):
        hx, hy, hz = (d * 0.5 for d in dims)
        verts = [
            (-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
            (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)
        ]
        faces = [
            (0, 3, 2, 1), (4, 5, 6, 7),
            (0, 1, 5, 4), (1, 2, 6, 5),
            (2, 3, 7, 6), (3, 0, 4, 7)
        ]
        mesh = bpy.data.meshes.new(name + " mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(mat)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        if rot is not None:
            obj.rotation_euler = rot
        if bevel > 0:
            mod = obj.modifiers.new("Small softened timber edges", "BEVEL")
            mod.width = bevel
            mod.segments = 1
            mod.limit_method = "ANGLE"
            mod.angle_limit = math.radians(30)
        return obj

    def beam(name, a, b, width, height, mat, bevel=0.0):
        va, vb = Vector(a), Vector(b)
        direction = vb - va
        obj = box(name, (va + vb) * 0.5, (width, height, direction.length), mat, bevel)
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
        return obj

    def cylinder(name, loc, radius, depth, mat, axis=(0, 0, 1), sides=12):
        verts = []
        for z in (-depth * 0.5, depth * 0.5):
            for i in range(sides):
                ang = (2.0 * math.pi * i) / sides
                verts.append((radius * math.cos(ang), radius * math.sin(ang), z))
        faces = []
        faces.append(tuple(range(sides - 1, -1, -1)))
        faces.append(tuple(range(sides, 2 * sides)))
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((i, j, j + sides, i + sides))
        mesh = bpy.data.meshes.new(name + " mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(mat)
        mesh.update()
        for poly in mesh.polygons:
            if len(poly.vertices) == 4:
                poly.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = Vector(axis).to_track_quat("Z", "Y")
        return obj

    # Raised floor frame and short, grounded timber supports.
    for x in (-0.91, 0.0, 0.91):
        for y in (-0.53, 0.53):
            box("Square post foot", (x, y, 0.04), (0.16, 0.16, 0.08), wood_dark, 0.006)
            box("Raised coop support post", (x, y, 0.325), (0.13, 0.13, 0.49), wood, 0.006)

    box("Front floor bearer", (0, -0.62, 0.57), (2.18, 0.12, 0.14), wood_dark, 0.006)
    box("Rear floor bearer", (0, 0.62, 0.57), (2.18, 0.12, 0.14), wood_dark, 0.006)
    box("Left floor bearer", (-1.03, 0, 0.57), (0.12, 1.28, 0.14), wood_dark, 0.006)
    box("Right floor bearer", (1.03, 0, 0.57), (0.12, 1.28, 0.14), wood_dark, 0.006)

    for sx in (-1, 1):
        for sy in (-1, 1):
            beam("Underfloor corner brace",
                 (sx * 0.91, sy * 0.53, 0.18),
                 (sx * 1.01, sy * 0.53, 0.49),
                 0.065, 0.065, wood_light, 0.004)
            beam("Underfloor side brace",
                 (sx * 0.91, sy * 0.44, 0.18),
                 (sx * 0.91, sy * 0.58, 0.49),
                 0.065, 0.065, wood_light, 0.004)

    floor_mats = [wood, wood_light, wood_pale]
    for i in range(7):
        y = -0.54 + i * 0.18
        box("Individual floor plank", (0, y, 0.645), (2.08, 0.165, 0.05),
            random.choice(floor_mats), 0.003)

    # Sill and sturdy corner framing.
    box("Front wall sill", (0, -0.68, 0.70), (2.10, 0.10, 0.10), wood_dark, 0.004)
    box("Rear wall sill", (0, 0.68, 0.70), (2.10, 0.10, 0.10), wood_dark, 0.004)
    box("Left wall sill", (-1.04, 0, 0.70), (0.10, 1.34, 0.10), wood_dark, 0.004)
    box("Right wall sill", (1.04, 0, 0.70), (0.10, 1.34, 0.10), wood_dark, 0.004)

    for x in (-1.01, 1.01):
        for y in (-0.64, 0.64):
            box("Structural corner post", (x, y, 1.225), (0.12, 0.12, 1.11), wood_light, 0.005)

    box("Front eave plate", (0, -0.68, 1.72), (2.16, 0.12, 0.12), wood_dark, 0.005)
    box("Rear eave plate", (0, 0.68, 1.72), (2.16, 0.12, 0.12), wood_dark, 0.005)
    box("Left eave plate", (-1.04, 0, 1.72), (0.12, 1.36, 0.12), wood_dark, 0.005)
    box("Right eave plate", (1.04, 0, 1.72), (0.12, 1.36, 0.12), wood_dark, 0.005)

    # Horizontal siding, with a real front chicken opening and a rear service-door opening.
    wall_courses = [0.755 + i * 0.12 for i in range(9)]
    wall_mats = [wood, wood_light, wood, wood_pale]

    for z in wall_courses:
        h = 0.105
        mat = random.choice(wall_mats)
        if z - h * 0.5 < 1.17 and z + h * 0.5 > 0.67:
            segments = [(-1.0, -0.235), (0.235, 1.0)]
        else:
            segments = [(-1.0, 1.0)]
        for xa, xb in segments:
            box("Front horizontal siding board", ((xa + xb) * 0.5, -0.68, z),
                (xb - xa, 0.055, h), mat, 0.002)

    for z in wall_courses:
        h = 0.105
        mat = random.choice(wall_mats)
        if z - h * 0.5 < 1.53 and z + h * 0.5 > 0.78:
            segments = [(-1.0, -0.49), (0.49, 1.0)]
        else:
            segments = [(-1.0, 1.0)]
        for xa, xb in segments:
            box("Rear horizontal siding board", ((xa + xb) * 0.5, 0.68, z),
                (xb - xa, 0.055, h), mat, 0.002)

    vent_y0, vent_y1 = -0.08, 0.34
    vent_center_y = (vent_y0 + vent_y1) * 0.5
    for side in (-1, 1):
        x = side * 1.04
        for z in wall_courses:
            h = 0.105
            mat = random.choice(wall_mats)
            if z - h * 0.5 < 1.52 and z + h * 0.5 > 1.29:
                segments = [(-0.64, vent_y0), (vent_y1, 0.64)]
            else:
                segments = [(-0.64, 0.64)]
            for ya, yb in segments:
                if yb > ya:
                    box("Side horizontal siding board", (x, (ya + yb) * 0.5, z),
                        (0.055, yb - ya, h), mat, 0.002)

    # Front entry: open through the wall, framed and joined, with a small drip canopy.
    for sx in (-1, 1):
        box("Chicken entry jamb", (sx * 0.245, -0.73, 0.935),
            (0.065, 0.075, 0.49), wood_pale, 0.004)
    box("Chicken entry header", (0, -0.73, 1.17), (0.56, 0.075, 0.075), wood_pale, 0.004)
    box("Chicken entry threshold", (0, -0.74, 0.69), (0.48, 0.10, 0.045), wood_light, 0.003)
    box("Entry drip canopy", (0, -0.82, 1.245), (0.66, 0.27, 0.055), teal_dark, 0.006,
        rot=(math.radians(9), 0, 0))
    for sx in (-1, 1):
        beam("Canopy support bracket", (sx * 0.24, -0.72, 1.17),
             (sx * 0.24, -0.88, 1.22), 0.045, 0.045, cream, 0.002)

    # Side ventilation is a genuine gap in the siding, protected by spaced louvers and a hood.
    for side in (-1, 1):
        sx = side * 1.095
        for y in (vent_y0, vent_y1):
            box("Vent vertical casing", (sx, y, 1.405), (0.065, 0.055, 0.29), wood_pale, 0.003)
        for z in (1.275, 1.535):
            box("Vent horizontal casing", (sx, vent_center_y, z),
                (0.065, 0.51, 0.055), wood_pale, 0.003)
        for z in (1.325, 1.405, 1.485):
            box("Angled ventilation louver", (side * 1.105, vent_center_y, z),
                (0.035, 0.38, 0.026), wood_dark, 0.002,
                rot=(math.radians(8), 0, 0))
        hood_angle = math.radians(12) * side
        box("Sloped vent rain hood", (side * 1.145, vent_center_y, 1.575),
            (0.18, 0.56, 0.05), teal, 0.005, rot=(0, hood_angle, 0))
        for y in (vent_y0 - 0.015, vent_y1 + 0.015):
            beam("Vent hood bracket", (side * 1.075, y, 1.515),
                 (side * 1.205, y, 1.555), 0.035, 0.035, wood_light, 0.002)

    # Rear clean-out hatch covers a matching opening and has visible frame, hinges, and latch.
    box("Rear hatch left jamb", (-0.50, 0.715, 1.155), (0.075, 0.055, 0.78), wood_pale, 0.003)
    box("Rear hatch right jamb", (0.50, 0.715, 1.155), (0.075, 0.055, 0.78), wood_pale, 0.003)
    box("Rear hatch top frame", (0, 0.715, 1.545), (1.05, 0.055, 0.07), wood_pale, 0.003)
    box("Rear hatch bottom frame", (0, 0.715, 0.765), (1.05, 0.055, 0.07), wood_pale, 0.003)

    for i in range(5):
        x = -0.36 + i * 0.18
        box("Rear hatch vertical door plank", (x, 0.75, 1.155),
            (0.17, 0.045, 0.68), [wood, wood_light, wood][i % 3], 0.002)
    for z in (0.84, 1.47):
        box("Hatch horizontal cross rail", (0, 0.78, z), (0.91, 0.04, 0.065), wood_pale, 0.003)
    for z in (0.94, 1.36):
        box("Hatch iron hinge strap", (-0.34, 0.805, z), (0.31, 0.018, 0.045), iron, 0.002)
        cylinder("Hatch hinge barrel", (-0.49, 0.815, z), 0.022, 0.12, iron)
    box("Hatch latch plate", (0.36, 0.805, 1.16), (0.10, 0.018, 0.12), iron, 0.002)
    cylinder("Hatch latch knob", (0.37, 0.825, 1.16), 0.025, 0.035, iron, axis=(0, 1, 0))

    # Interior furnishing visible through the entry; open-front nesting cubbies and roost.
    for cx in (-0.67, -0.25):
        box("Nest cubby back", (cx, 0.49, 1.00), (0.39, 0.045, 0.39), interior, 0.002)
        box("Nest cubby bottom", (cx, 0.29, 0.81), (0.40, 0.42, 0.045), wood_light, 0.002)
        box("Nest cubby roof", (cx, 0.29, 1.20), (0.40, 0.42, 0.045), wood, 0.002)
        box("Nest cubby side", (cx - 0.20, 0.29, 1.005), (0.045, 0.42, 0.39), wood_light, 0.002)
        box("Nest cubby divider", (cx + 0.20, 0.29, 1.005), (0.045, 0.42, 0.39), wood_light, 0.002)
        for i in range(3):
            box("Loose nest straw", (cx + (i - 1) * 0.07, 0.22, 0.845 + (i % 2) * 0.012),
                (0.15, 0.035, 0.012), straw, 0.001, rot=(0, 0, math.radians((i - 1) * 12)))

    cylinder("Interior roost perch", (0.45, -0.12, 0.94), 0.026, 1.05, wood_pale, axis=(1, 0, 0), sides=14)
    for x in (0.0, 0.9):
        box("Roost perch support", (x, -0.12, 0.81), (0.055, 0.055, 0.25), wood_light, 0.003)

    # Gable ends are built from separate horizontal boards, following the roof triangle.
    for y in (-0.68, 0.68):
        for i in range(6):
            z = 1.83 + i * 0.105
            h = 0.09
            half_width = max(0.035, 1.0 * (1.0 - (z + h * 0.5 - 1.78) / 0.64))
            box("Gable horizontal cedar board", (0, y, z),
                (2.0 * half_width, 0.05, h), random.choice(wall_mats), 0.002)

    # Thick, pitched teal roof panels with overhang and a finished ridge.
    def roof_surface_z(x):
        return 2.43 - 0.69 * (abs(x) / 1.25)

    for side in (-1, 1):
        x_outer = side * 1.25
        z_outer = roof_surface_z(x_outer)
        yf, yb = -0.82, 0.82
        top = [
            (0.0, yf, 2.43),
            (x_outer, yf, z_outer),
            (x_outer, yb, z_outer),
            (0.0, yb, 2.43)
        ]
        bottom = [(x, y, z - 0.06) for x, y, z in top]
        verts = top + bottom
        if side > 0:
            top_face = (0, 1, 2, 3)
        else:
            top_face = (3, 2, 1, 0)
        faces = [
            top_face,
            tuple(reversed(tuple(i + 4 for i in top_face))),
            (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)
        ]
        mesh = bpy.data.meshes.new("Pitched roof panel mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(teal)
        mesh.update()
        panel = bpy.data.objects.new("Thick teal pitched roof panel", mesh)
        bpy.context.collection.objects.link(panel)
        bevel_mod = panel.modifiers.new("Soft roof panel edges", "BEVEL")
        bevel_mod.width = 0.008
        bevel_mod.segments = 1
        bevel_mod.limit_method = "ANGLE"
        bevel_mod.angle_limit = math.radians(30)

        # Structural rafters underneath each roof slope.
        for y in (-0.68, -0.34, 0.0, 0.34, 0.68):
            beam("Roof underside rafter",
                 (0, y, 2.32), (side * 1.18, y, 1.67),
                 0.075, 0.08, wood_dark, 0.003)

        # Fine standing seams emphasize the small metal roof construction.
        for y in (-0.30, 0.30):
            x0, x1 = side * 0.08, side * 1.19
            beam("Raised teal roof seam",
                 (x0, y, roof_surface_z(x0) + 0.014),
                 (x1, y, roof_surface_z(x1) + 0.014),
                 0.018, 0.022, teal_dark, 0.002)

        box("Teal eave fascia", (side * 1.245, 0, 1.72),
            (0.075, 1.68, 0.085), teal_dark, 0.004)
        for y in (-0.82, 0.82):
            beam("Rake edge roof trim", (0, y, 2.43), (side * 1.25, y, 1.74),
                 0.07, 0.07, teal_dark, 0.003)

    # A shaped ridge cap overlaps the meeting edges of both roof planes.
    profile = [
        (-0.12, 2.36), (-0.12, 2.43), (0.0, 2.51),
        (0.12, 2.43), (0.12, 2.36)
    ]
    ridge_y0, ridge_y1 = -0.86, 0.86
    verts = [(x, ridge_y0, z) for x, z in profile] + [(x, ridge_y1, z) for x, z in profile]
    n = len(profile)
    faces = [tuple(range(n)), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, j + n, i + n))
    mesh = bpy.data.meshes.new("Ridge cap mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(teal_dark)
    mesh.update()
    ridge = bpy.data.objects.new("Continuous teal ridge cap", mesh)
    bpy.context.collection.objects.link(ridge)
    ridge_bevel = ridge.modifiers.new("Ridge cap softened edges", "BEVEL")
    ridge_bevel.width = 0.006
    ridge_bevel.segments = 1

    # Sloped, slatted chicken ramp reaches from the threshold almost to ground level.
    top_y, top_z = -0.67, 0.665
    bottom_y, bottom_z = -1.45, 0.10
    dy, dz = top_y - bottom_y, top_z - bottom_z
    ramp_len = math.sqrt(dy * dy + dz * dz)
    ramp_angle = math.atan2(dz, dy)
    mid_y = (top_y + bottom_y) * 0.5
    mid_z = (top_z + bottom_z) * 0.5
    normal_y = -math.sin(ramp_angle)
    normal_z = math.cos(ramp_angle)

    box("Continuous ramp backing board",
        (0, mid_y - normal_y * 0.025, mid_z - normal_z * 0.025),
        (0.52, ramp_len, 0.05), wood_dark, 0.004,
        rot=(ramp_angle, 0, 0))

    for side in (-1, 1):
        box("Ramp raised side rail",
            (side * 0.235, mid_y - normal_y * 0.032, mid_z - normal_z * 0.032),
            (0.045, ramp_len, 0.065), wood_light, 0.003,
            rot=(ramp_angle, 0, 0))

    for i in range(7):
        t = 0.10 + i * 0.13
        y = top_y + (bottom_y - top_y) * t
        z = top_z + (bottom_z - top_z) * t
        box("Crosswise chicken ramp cleat",
            (0, y - normal_y * 0.018, z - normal_z * 0.018),
            (0.50, 0.045, 0.035), wood_pale, 0.003,
            rot=(ramp_angle, 0, 0))

    return {"notes": "Static handcrafted raised ranch coop; front faces negative Y. Includes open chicken entry, connected cleated ramp, louvered side vents, rear access hatch, timber framing, interior nest boxes, and a thick teal pitched roof."}
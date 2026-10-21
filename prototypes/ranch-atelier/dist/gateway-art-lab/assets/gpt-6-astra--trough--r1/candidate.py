import bpy
import bmesh
import math
import random
from mathutils import Vector


def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60

    def material(name, color, roughness, metallic=0.0, alpha=1.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        m.diffuse_color = (*color, alpha)
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, alpha)
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Metallic"].default_value = metallic
        p.inputs["Alpha"].default_value = alpha
        if alpha < 1.0:
            m.surface_render_method = 'DITHERED'
        return m

    timber = material("Honey brown seasoned timber", (0.36, 0.202, 0.090), 0.79)
    timber_light = material("Warm plank variation", (0.425, 0.249, 0.119), 0.80)
    endgrain = material("Cut timber end grain", (0.285, 0.146, 0.062), 0.86)
    grain = material("Quiet grain and worn crevices", (0.227, 0.119, 0.050), 0.90)
    zinc = material("Quiet galvanized liner and fasteners", (0.445, 0.485, 0.470), 0.46, 0.72)
    iron = material("Weathered galvanized retaining straps", (0.225, 0.260, 0.250), 0.57, 0.68)
    water_mat = material("Still ranch water", (0.110, 0.235, 0.215), 0.21, 0.08, 0.86)
    p = water_mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["IOR"].default_value = 1.333
    p.inputs["Transmission Weight"].default_value = 0.16
    ripple_mat = material("Subtle water ripple highlights", (0.235, 0.365, 0.329), 0.28, 0.10, 0.48)

    def mesh_object(name, verts, faces, mats, face_mats=None, bevel=0.0):
        mesh = bpy.data.meshes.new(name + " mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
        bm.free()
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        for m in mats:
            mesh.materials.append(m)
        if face_mats:
            for poly, index in zip(mesh.polygons, face_mats):
                poly.material_index = index
        if bevel:
            mod = obj.modifiers.new("Small worked edge", 'BEVEL')
            mod.width = bevel
            mod.segments = 1
            mod.affect = 'EDGES'
        return obj

    prism_faces = [
        (0, 1, 2, 3), (7, 6, 5, 4),
        (0, 4, 5, 1), (1, 5, 6, 2),
        (2, 6, 7, 3), (3, 7, 4, 0)
    ]

    def slab(name, front, back, mat, bevel=0.0, cut_ends=False):
        mats = [mat, endgrain] if cut_ends else [mat]
        fm = [0, 0, 0, 1, 0, 1] if cut_ends else None
        return mesh_object(name, front + back, prism_faces, mats, fm, bevel)

    def box(name, center, size, mat, bevel=0.0):
        x, y, z = center
        a, b, c = [s * 0.5 for s in size]
        v = [
            (x-a, y-b, z-c), (x+a, y-b, z-c),
            (x+a, y+b, z-c), (x-a, y+b, z-c),
            (x-a, y-b, z+c), (x+a, y-b, z+c),
            (x+a, y+b, z+c), (x-a, y+b, z+c)
        ]
        return mesh_object(name, v, prism_faces, [mat], bevel=bevel)

    def beam(name, a, b, width, depth, mat, bevel=0.0):
        a, b = Vector(a), Vector(b)
        direction = (b-a).normalized()
        u = Vector((0, 1, 0))
        if abs(direction.dot(u)) > 0.9:
            u = Vector((1, 0, 0))
        u = (u - direction * u.dot(direction)).normalized()
        v = direction.cross(u).normalized()
        verts = []
        for center in (a, b):
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                verts.append(tuple(center + u * su * width / 2 + v * sv * depth / 2))
        return mesh_object(name, verts, prism_faces, [mat], bevel=bevel)

    def cylinder(name, a, b, radius, mat, sides=12, smooth=False):
        a, b = Vector(a), Vector(b)
        n = (b-a).normalized()
        ref = Vector((0, 0, 1)) if abs(n.z) < 0.85 else Vector((1, 0, 0))
        u = n.cross(ref).normalized()
        v = n.cross(u).normalized()
        verts = []
        for center in (a, b):
            for i in range(sides):
                t = 2 * math.pi * i / sides
                verts.append(tuple(center + radius * (u * math.cos(t) + v * math.sin(t))))
        faces = [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))]
        for i in range(sides):
            j = (i+1) % sides
            faces.append((i, j, j+sides, i+sides))
        obj = mesh_object(name, verts, faces, [mat])
        if smooth:
            for poly in list(obj.data.polygons)[2:]:
                poly.use_smooth = True
        return obj

    def bolt(name, position, normal, small=False):
        p = Vector(position)
        n = Vector(normal).normalized()
        radius = 0.0115 if small else 0.014
        cylinder(name + " washer", p, p+n*0.0025, radius, zinc, 10, True)
        cylinder(name + " hex head", p+n*0.002, p+n*0.010, radius*0.66, zinc, 6)

    def outer_x(z):
        return 0.823 + (z-0.265) * (0.070/0.372)

    def outer_y(z):
        return 0.263 + (z-0.265) * (0.080/0.372)

    # Three individually constructed boards on each side, with tight rebated joints.
    for sy in (-1, 1):
        for row in range(3):
            lo = 0.266 + row * 0.124
            hi = 0.266 + (row+1) * 0.124 - 0.001
            front = [
                (-outer_x(lo), sy*outer_y(lo), lo),
                (outer_x(lo), sy*outer_y(lo), lo),
                (outer_x(hi), sy*outer_y(hi), hi),
                (-outer_x(hi), sy*outer_y(hi), hi)
            ]
            back = [(x, y-sy*0.047, z) for x, y, z in front]
            mat = timber_light if (row + (sy == 1)) % 3 == 1 else timber
            slab(
                ("Front" if sy < 0 else "Back") + " side plank " + str(row+1),
                front, back, mat, 0.0018, True
            )

    # End boards fit between the long side boards rather than closing the top.
    for sx in (-1, 1):
        for row in range(3):
            lo = 0.266 + row * 0.124
            hi = 0.266 + (row+1) * 0.124 - 0.001
            front = [
                (sx*outer_x(lo), -outer_y(lo)+0.047, lo),
                (sx*outer_x(lo), outer_y(lo)-0.047, lo),
                (sx*outer_x(hi), outer_y(hi)-0.047, hi),
                (sx*outer_x(hi), -outer_y(hi)+0.047, hi)
            ]
            back = [(x-sx*0.048, y, z) for x, y, z in front]
            slab(
                "Fitted end plank %s %s" % (sx, row), front, back,
                timber_light if row == 0 else timber, 0.0018, True
            )

    box("Thick timber basin sole", (0, 0, 0.274), (1.648, 0.524, 0.040), endgrain, 0.002)

    # Two splayed trestles, with four flat-bottomed feet.
    for sx in (-1, 1):
        x = sx * 0.60
        box(
            "Transverse bearing timber %s" % sx, (x, 0, 0.226),
            (0.142, 0.610, 0.064), timber_light, 0.003
        )
        for sy in (-1, 1):
            verts = []
            for z, cy in ((0.0, sy*0.265), (0.225, sy*0.195)):
                verts.extend([
                    (x-0.05, cy-0.05, z), (x+0.05, cy-0.05, z),
                    (x+0.05, cy+0.05, z), (x-0.05, cy+0.05, z)
                ])
            mesh_object(
                "Splayed flat-foot leg %s %s" % (sx, sy),
                verts, prism_faces, [timber, endgrain],
                [1, 1, 0, 0, 0, 0], 0.0025
            )
            bolt(
                "Bearer joint %s %s" % (sx, sy),
                (x, sy*0.306, 0.226), (0, sy, 0), True
            )

    for sy in (-1, 1):
        box(
            "Lower longitudinal stretcher %s" % sy, (0, sy*0.244, 0.084),
            (1.21, 0.052, 0.060), timber, 0.002
        )
        for sx in (-1, 1):
            beam(
                "Diagonal knee brace %s %s" % (sx, sy),
                (sx*0.575, sy*0.235, 0.103),
                (sx*0.310, sy*0.235, 0.253),
                0.044, 0.048, timber_light, 0.002
            )

    # A continuous, closed-thickness metal liner: open top, real sloped walls and floor.
    def rectangular_loop(x, y, z):
        return [(-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]

    verts = []
    for x, y, z in (
        (0.781, 0.221, 0.290),
        (0.845, 0.295, 0.644),
        (0.842, 0.292, 0.644),
        (0.777, 0.217, 0.295)
    ):
        verts += rectangular_loop(x, y, z)
    faces = []
    for ring in range(3):
        for i in range(4):
            j = (i+1) % 4
            faces.append((ring*4+i, ring*4+j, (ring+1)*4+j, (ring+1)*4+i))
    faces += [(3, 2, 1, 0), (12, 13, 14, 15)]
    mesh_object("Watertight hollow galvanized basin liner", verts, faces, [zinc])

    def rectangular_ring(name, outer, inner, low, high, mat, bevel=0.0):
        verts = rectangular_loop(*outer, low) + rectangular_loop(*outer, high)
        verts += rectangular_loop(*inner, high) + rectangular_loop(*inner, low)
        faces = []
        for k in range(4):
            nxt = (k+1) % 4
            for i in range(4):
                j = (i+1) % 4
                faces.append((k*4+i, k*4+j, nxt*4+j, nxt*4+i))
        return mesh_object(name, verts, faces, [mat], bevel=bevel)

    rectangular_ring(
        "Broad folded galvanized top coping",
        (0.900, 0.350), (0.840, 0.290), 0.638, 0.650, zinc, 0.0015
    )
    rectangular_ring(
        "Downturned outer edge of coping",
        (0.898, 0.348), (0.892, 0.342), 0.619, 0.641, zinc, 0.0008
    )

    # External steel hoops tie the long planks to their supporting bearers.
    for x in (-0.63, 0.63):
        for sy in (-1, 1):
            lo, hi, w = 0.268, 0.625, 0.041
            front = [
                (x-w/2, sy*(outer_y(lo)+0.007), lo),
                (x+w/2, sy*(outer_y(lo)+0.007), lo),
                (x+w/2, sy*(outer_y(hi)+0.007), hi),
                (x-w/2, sy*(outer_y(hi)+0.007), hi)
            ]
            back = [(px, py-sy*0.005, pz) for px, py, pz in front]
            slab(
                "Vertical retaining hoop %s %s" % (x, sy),
                front, back, iron, 0.0008
            )
            for row, z in enumerate((0.324, 0.448, 0.572)):
                bolt(
                    "Hoop bolt %s %s %s" % (x, sy, row),
                    (x, sy*(outer_y(z)+0.008), z),
                    (0, sy, -0.080/0.372)
                )
        box(
            "Hoop folded under timber sole %s" % x, (x, 0, 0.252),
            (0.041, 0.534, 0.005), iron, 0.0006
        )

    # Crosswise straps on the ends bridge the plank/end-grain joints.
    for sx in (-1, 1):
        for z in (0.324, 0.572):
            lo, hi = z-0.013, z+0.013
            front = [
                (sx*(outer_x(lo)+0.006), -outer_y(lo)+0.007, lo),
                (sx*(outer_x(lo)+0.006), outer_y(lo)-0.007, lo),
                (sx*(outer_x(hi)+0.006), outer_y(hi)-0.007, hi),
                (sx*(outer_x(hi)+0.006), -outer_y(hi)+0.007, hi)
            ]
            back = [(px-sx*0.004, py, pz) for px, py, pz in front]
            slab(
                "End-board tie strap %s %s" % (sx, z),
                front, back, iron, 0.0007
            )
            for sy in (-1, 1):
                bolt(
                    "End tie bolt %s %s %s" % (sx, sy, z),
                    (sx*(outer_x(z)+0.007), sy*(outer_y(z)-0.026), z),
                    (sx, 0, -0.070/0.372), True
                )

    # Folded overlap seams remain visible when the water is drained.
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = (sx*0.7758, sy*0.2155, 0.297)
            b = (sx*0.8408, sy*0.2905, 0.642)
            verts = [
                a, (a[0]-sx*0.012, a[1], a[2]),
                (b[0]-sx*0.012, b[1], b[2]), b,
                (a[0], a[1]-sy*0.012, a[2]),
                (b[0], b[1]-sy*0.012, b[2])
            ]
            mesh_object(
                "Folded liner corner %s %s" % (sx, sy),
                verts, [(0, 1, 2, 3), (0, 3, 5, 4)], [zinc]
            )

    # A small recessed drain plate is only revealed near the empty state.
    cylinder(
        "Interior drain flange", (0.674, 0, 0.2953), (0.674, 0, 0.298),
        0.028, zinc, 16
    )
    cylinder(
        "Recessed drain plug", (0.674, 0, 0.298), (0.674, 0, 0.2988),
        0.018, iron, 12
    )
    box(
        "Drain plug screwdriver slot", (0.674, 0, 0.299),
        (0.020, 0.0025, 0.0005), grain
    )

    # Sparse mesh-authored grain follows the actual sloping faces.
    wear_verts, wear_faces, wear_mats = [], [], []

    def wear_ribbon(points, width, mapping, mat_index=0):
        start = len(wear_verts)
        count = len(points)
        for i, (u, v) in enumerate(points):
            left = Vector(points[max(0, i-1)])
            right = Vector(points[min(count-1, i+1)])
            tangent = right-left
            if tangent.length < 1e-8:
                tangent = Vector((1, 0))
            tangent.normalize()
            perp = Vector((-tangent.y, tangent.x))
            taper = 0.16 + 0.84 * math.sin(math.pi*i/(count-1))**0.7
            for sign in (-1, 1):
                q = Vector((u, v)) + perp*width*0.5*taper*sign
                wear_verts.append(mapping(q.x, q.y))
        for i in range(count-1):
            wear_faces.append((start+2*i, start+2*i+1, start+2*i+3, start+2*i+2))
            wear_mats.append(mat_index)

    for sy in (-1, 1):
        def mapping(u, v, sy=sy):
            return (u, sy*(outer_y(v)+0.00065), v)

        for row in range(3):
            for k in range(9):
                length = random.uniform(0.095, 0.32)
                x = random.uniform(-0.76, 0.73-length)
                z = 0.285 + row*0.124 + random.uniform(0.005, 0.078)
                bend = random.uniform(-0.003, 0.003)
                points = []
                for j in range(6):
                    t = j/5
                    points.append((
                        x+t*length,
                        z+bend*math.sin(t*math.pi)+0.0008*math.sin(t*9+k)
                    ))
                wear_ribbon(
                    points, random.uniform(0.0006, 0.00135), mapping,
                    1 if k % 5 == 0 else 0
                )

    for sx in (-1, 1):
        def mapping(u, v, sx=sx):
            return (sx*(outer_x(v)+0.00065), u, v)

        for row in range(3):
            for k in range(4):
                length = random.uniform(0.07, 0.18)
                y = random.uniform(-0.18, 0.18-length)
                z = 0.286 + row*0.124 + random.uniform(0.002, 0.078)
                points = [
                    (y+length*j/5, z+0.0014*math.sin(j*0.8+k))
                    for j in range(6)
                ]
                wear_ribbon(points, 0.0009, mapping, 0)

    for sx in (-1, 1):
        for sy in (-1, 1):
            def mapping(u, v, sy=sy):
                return (u, sy*(0.265-0.070*v/0.225+0.0507), v)

            for offset in (-0.022, 0.019):
                points = [
                    (sx*0.60+offset+0.0015*math.sin(j), 0.018+j*0.035)
                    for j in range(6)
                ]
                wear_ribbon(points, 0.0011, mapping, 0)

    # Two restrained elongated growth knots on the front boards.
    for cx, cz, rx, rz in (
        (-0.295, 0.450, 0.034, 0.008),
        (0.255, 0.562, 0.027, 0.0065)
    ):
        start = len(wear_verts)
        n = 18
        for i in range(n):
            t = 2*math.pi*i/n
            for scale in (1.0, 0.72):
                x = cx + rx*scale*math.cos(t)
                z = cz + rz*scale*math.sin(t)*(1+0.09*math.cos(t*3))
                wear_verts.append((x, -outer_y(z)-0.0008, z))
        for i in range(n):
            j = (i+1) % n
            wear_faces.append((start+2*i, start+2*j, start+2*j+1, start+2*i+1))
            wear_mats.append(0)

        def mapping(u, v):
            return (u, -outer_y(v)-0.0009, v)

        wear_ribbon(
            [(cx-rx*0.55, cz), (cx, cz+0.001), (cx+rx*0.55, cz)],
            rz*0.52, mapping, 0
        )

    mesh_object(
        "Subtle directional timber grain and use marks",
        wear_verts, wear_faces, [grain, timber_light], wear_mats
    )

    # All water geometry shares one meaningful animated pivot.
    water_root = bpy.data.objects.new("Water level animated pivot", None)
    scene.collection.objects.link(water_root)
    water_root.empty_display_type = 'PLAIN_AXES'
    water_root.empty_display_size = 0.08

    outline = []
    for cx, cy, start_angle in (
        (0.96, 0.92, 0), (-0.96, 0.92, 90),
        (-0.96, -0.92, 180), (0.96, -0.92, 270)
    ):
        for j in range(6):
            t = math.radians(start_angle+j*18)
            outline.append((cx+0.04*math.cos(t), cy+0.08*math.sin(t), 0))
    verts = [(0, 0, 0)] + outline
    faces = [(0, i+1, (i+1) % len(outline)+1) for i in range(len(outline))]
    surface = mesh_object("Separate contained water surface", verts, faces, [water_mat])
    surface.parent = water_root

    rv, rf = [], []
    for cx, cy, rx, ry, a0, a1 in (
        (-0.43, 0.12, 0.22, 0.34, 15, 150),
        (-0.43, 0.12, 0.28, 0.43, 25, 145),
        (0.35, -0.17, 0.28, 0.25, 190, 307)
    ):
        start = len(rv)
        steps = 15
        for i in range(steps):
            t = math.radians(a0+(a1-a0)*i/(steps-1))
            fade = math.sin(math.pi*i/(steps-1))
            thickness = 0.0025*fade
            for sign in (-1, 1):
                rv.append((
                    cx+(rx+sign*thickness)*math.cos(t),
                    cy+(ry+sign*thickness*2.4)*math.sin(t),
                    0.0007
                ))
        for i in range(steps-1):
            rf.append((start+2*i, start+2*i+1, start+2*i+3, start+2*i+2))
    ripples = mesh_object("Faint broken water ripples", rv, rf, [ripple_mat])
    ripples.parent = water_root

    def water_bounds(z):
        t = (z-0.295)/(0.644-0.295)
        return (
            0.777+(0.842-0.777)*t-0.005,
            0.217+(0.292-0.217)*t-0.005
        )

    for frame, z in ((1, 0.605), (60, 0.291)):
        x, y = water_bounds(z)
        water_root.location = (0, 0, z)
        water_root.scale = (x, y, 1)
        water_root.keyframe_insert(data_path="location", frame=frame, group="Water level")
        water_root.keyframe_insert(data_path="scale", frame=frame, group="Contained footprint")

    action = water_root.animation_data.action
    action.name = "water_state"

    # Access curves through layered-action channel bags, compatible with Blender 4.5+.
    slot = water_root.animation_data.action_slot
    for layer in action.layers:
        for strip in layer.strips:
            channelbag = strip.channelbag(slot)
            if channelbag is not None:
                for fcurve in channelbag.fcurves:
                    for key in fcurve.keyframe_points:
                        key.interpolation = 'LINEAR'

    scene.frame_set(1)
    return {
        "animationRanges": {"water_state": [1, 60]},
        "notes": "1.80 x 0.70 x 0.65 m timber trough. Continuous hollow metal liner, fitted individual planks, splayed trestles and knee braces. water_state drains the separate surface in place; its footprint follows the tapered interior, finishing concealed beneath the liner floor."
    }
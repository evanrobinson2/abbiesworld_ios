import bpy
import math
import random
from mathutils import Vector, Euler

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    body_col = bpy.data.collections.new("Character | Body")
    clothing_col = bpy.data.collections.new("Character | Clothing")
    rig_col = bpy.data.collections.new("Character | Rig")
    scene.collection.children.link(body_col)
    scene.collection.children.link(clothing_col)
    scene.collection.children.link(rig_col)

    def material(name, color, roughness=0.72, metallic=0.0):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1.0)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        return mat

    skin = material("Skin | warm peach", (0.63, 0.37, 0.23))
    skin_light = material("Skin | soft highlights", (0.72, 0.46, 0.30))
    hair = material("Hair | deep chestnut", (0.105, 0.047, 0.026))
    hair_light = material("Hair | chestnut locks", (0.16, 0.072, 0.038))
    eye_white = material("Eyes | warm ivory", (0.92, 0.84, 0.70))
    eye_dark = material("Eyes | espresso", (0.045, 0.027, 0.018), 0.5)
    mouth_mat = material("Face | muted brown", (0.24, 0.085, 0.055))
    shirt = material("Clothing | warm ochre shirt", (0.64, 0.34, 0.105))
    shirt_light = material("Clothing | ochre details", (0.79, 0.49, 0.20))
    shirt_dark = material("Clothing | shirt seams", (0.43, 0.205, 0.063))
    pants = material("Clothing | slate trousers", (0.16, 0.245, 0.27))
    pants_light = material("Clothing | trouser trim", (0.25, 0.34, 0.35))
    boot = material("Clothing | worn umber leather", (0.19, 0.105, 0.055))
    boot_light = material("Clothing | leather accents", (0.34, 0.205, 0.105))
    sole = material("Clothing | dark boot soles", (0.075, 0.067, 0.055))
    brass = material("Clothing | aged brass", (0.66, 0.41, 0.13), 0.42, 0.35)

    def link_object(obj, collection):
        collection.objects.link(obj)
        return obj

    def mesh_object(name, verts, faces, mat, smooth=True):
        mesh = bpy.data.meshes.new(name + " | mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        collection = clothing_col if name.startswith("Clothing_") else body_col
        link_object(obj, collection)
        if mat:
            mesh.materials.append(mat)
        if smooth:
            for poly in mesh.polygons:
                poly.use_smooth = True
        return obj

    def attach(obj, parent):
        if parent is not None:
            world = obj.matrix_world.copy()
            obj.parent = parent
            obj.matrix_world = world
        return obj

    def pivot(name, loc, parent=None):
        obj = bpy.data.objects.new(name, None)
        link_object(obj, rig_col)
        obj.empty_display_type = "PLAIN_AXES"
        obj.empty_display_size = 0.055
        obj.location = loc
        if parent is not None:
            attach(obj, parent)
        obj.rotation_mode = "XYZ"
        return obj

    def ellipsoid(name, center, radii, mat, parent=None, segments=12, rings=8, rotation=(0, 0, 0)):
        c = Vector(center)
        rot = Euler(rotation, "XYZ").to_matrix()
        verts = []
        for i in range(rings + 1):
            phi = math.pi * i / rings
            for j in range(segments):
                theta = 2.0 * math.pi * j / segments
                v = Vector((
                    radii[0] * math.sin(phi) * math.cos(theta),
                    radii[1] * math.sin(phi) * math.sin(theta),
                    radii[2] * math.cos(phi)
                ))
                verts.append(tuple(c + rot @ v))
        faces = []
        for j in range(segments):
            faces.append((0, 1 + j, 1 + (j + 1) % segments))
        for i in range(rings - 1):
            a = 1 + i * segments
            b = a + segments
            for j in range(segments):
                jn = (j + 1) % segments
                faces.append((a + j, a + jn, b + jn, b + j))
        last = 1 + (rings - 1) * segments
        bottom = rings * segments + 1
        for j in range(segments):
            faces.append((last + j, bottom, last + (j + 1) % segments))
        return attach(mesh_object(name, verts, faces, mat, True), parent)

    def ring_form(name, profile, mat, parent=None, segments=16):
        verts = []
        for z, rx, ry, cy in profile:
            for j in range(segments):
                a = 2.0 * math.pi * j / segments
                verts.append((rx * math.cos(a), cy + ry * math.sin(a), z))
        faces = []
        for i in range(len(profile) - 1):
            lo = i * segments
            hi = lo + segments
            for j in range(segments):
                jn = (j + 1) % segments
                faces.append((lo + j, lo + jn, hi + jn, hi + j))
        faces.append(tuple(reversed(tuple(range(segments)))))
        top = (len(profile) - 1) * segments
        faces.append(tuple(top + j for j in range(segments)))
        obj = mesh_object(name, verts, faces, mat, True)
        obj.data.polygons[-1].use_smooth = False
        obj.data.polygons[-2].use_smooth = False
        return attach(obj, parent)

    def tapered_segment(name, p1, p2, r1, r2, mat, parent=None, depth1=None, depth2=None, sides=12):
        a = Vector(p1)
        b = Vector(p2)
        axis = (b - a).normalized()
        ref = Vector((0, 1, 0))
        if abs(axis.dot(ref)) > 0.92:
            ref = Vector((1, 0, 0))
        u = axis.cross(ref).normalized()
        v = axis.cross(u).normalized()
        d1 = depth1 if depth1 is not None else r1
        d2 = depth2 if depth2 is not None else r2
        profiles = [(0.00, 0.68), (0.08, 0.94), (0.24, 1.00),
                    (0.72, 0.94), (0.92, 0.82), (1.00, 0.68)]
        verts = []
        for t, fac in profiles:
            center = a.lerp(b, t)
            rx = (r1 * (1.0 - t) + r2 * t) * fac
            ry = (d1 * (1.0 - t) + d2 * t) * fac
            for j in range(sides):
                ang = 2.0 * math.pi * j / sides
                p = center + u * (rx * math.cos(ang)) + v * (ry * math.sin(ang))
                verts.append(tuple(p))
        faces = []
        for i in range(len(profiles) - 1):
            lo = i * sides
            hi = lo + sides
            for j in range(sides):
                jn = (j + 1) % sides
                faces.append((lo + j, lo + jn, hi + jn, hi + j))
        faces.append(tuple(reversed(tuple(range(sides)))))
        top = (len(profiles) - 1) * sides
        faces.append(tuple(top + j for j in range(sides)))
        obj = mesh_object(name, verts, faces, mat, True)
        obj.data.polygons[-1].use_smooth = False
        obj.data.polygons[-2].use_smooth = False
        return attach(obj, parent)

    def torus_z(name, center, major, minor, mat, parent=None, major_steps=28, minor_steps=8):
        cx, cy, cz = center
        verts = []
        faces = []
        for i in range(major_steps):
            u = 2 * math.pi * i / major_steps
            for j in range(minor_steps):
                v = 2 * math.pi * j / minor_steps
                rr = major + minor * math.cos(v)
                verts.append((cx + rr * math.cos(u), cy + rr * math.sin(u), cz + minor * math.sin(v)))
        for i in range(major_steps):
            ni = (i + 1) % major_steps
            for j in range(minor_steps):
                nj = (j + 1) % minor_steps
                faces.append((i * minor_steps + j, ni * minor_steps + j,
                              ni * minor_steps + nj, i * minor_steps + nj))
        return attach(mesh_object(name, verts, faces, mat, True), parent)

    def tube(name, points, radius, mat, parent=None, sides=7):
        pts = [Vector(p) for p in points]
        verts = []
        for i, pt in enumerate(pts):
            if i == 0:
                tangent = (pts[1] - pt).normalized()
            elif i == len(pts) - 1:
                tangent = (pt - pts[i - 1]).normalized()
            else:
                tangent = (pts[i + 1] - pts[i - 1]).normalized()
            ref = Vector((0, 1, 0))
            if abs(tangent.dot(ref)) > 0.92:
                ref = Vector((1, 0, 0))
            u = tangent.cross(ref).normalized()
            v = tangent.cross(u).normalized()
            for j in range(sides):
                ang = 2.0 * math.pi * j / sides
                q = pt + radius * (u * math.cos(ang) + v * math.sin(ang))
                verts.append(tuple(q))
        faces = []
        for i in range(len(pts) - 1):
            for j in range(sides):
                jn = (j + 1) % sides
                faces.append((i * sides + j, i * sides + jn,
                              (i + 1) * sides + jn, (i + 1) * sides + j))
        faces.append(tuple(reversed(tuple(range(sides)))))
        start = (len(pts) - 1) * sides
        faces.append(tuple(start + j for j in range(sides)))
        return attach(mesh_object(name, verts, faces, mat, True), parent)

    root = pivot("Rig_Root", (0, 0, 0))
    pelvis = pivot("Rig_Pelvis", (0, 0, 0.90), root)
    torso = pivot("Rig_Torso", (0, 0, 0.90), pelvis)
    head_pivot = pivot("Rig_Head", (0, 0, 1.385), torso)

    ring_form("Body_Torso_Core", [
        (0.84, 0.137, 0.078, 0.005), (0.91, 0.148, 0.083, 0.005),
        (1.08, 0.150, 0.087, 0.005), (1.23, 0.178, 0.091, 0.005),
        (1.31, 0.125, 0.074, 0.005)
    ], skin, torso, 16)
    ring_form("Clothing_Shirt_Torso", [
        (0.835, 0.148, 0.087, 0.004), (0.86, 0.170, 0.097, 0.004),
        (0.97, 0.160, 0.098, 0.004), (1.11, 0.174, 0.103, 0.004),
        (1.23, 0.203, 0.109, 0.004), (1.29, 0.187, 0.099, 0.004),
        (1.335, 0.123, 0.078, 0.004)
    ], shirt, torso, 20)
    ring_form("Clothing_Shirt_Hem", [
        (0.842, 0.150, 0.089, 0.004), (0.862, 0.171, 0.098, 0.004),
        (0.883, 0.169, 0.097, 0.004)
    ], shirt_dark, torso, 20)

    torus_z("Clothing_Shirt_Collar_Rib", (0, 0.004, 1.329), 0.068, 0.008, shirt_light, torso)
    ellipsoid("Clothing_Shirt_Placket", (0, -0.107, 1.185), (0.009, 0.005, 0.086), shirt_dark, torso, 10, 8)
    for i, z in enumerate((1.235, 1.195, 1.155, 1.115)):
        ellipsoid("Clothing_Shirt_Button_%02d" % i, (0, -0.114, z), (0.006, 0.003, 0.006), brass, torso, 8, 6)
    ellipsoid("Clothing_Shirt_Pocket", (-0.126, -0.087, 1.158), (0.033, 0.006, 0.043), shirt_light, torso, 12, 8)
    tube("Clothing_Shirt_Pocket_Seam", [
        (-0.151, -0.091, 1.192), (-0.126, -0.094, 1.194), (-0.101, -0.091, 1.192)
    ], 0.0017, shirt_dark, torso, 6)

    ring_form("Clothing_Trousers_Hip", [
        (0.785, 0.145, 0.088, 0.005), (0.815, 0.163, 0.096, 0.005),
        (0.91, 0.174, 0.102, 0.005), (0.946, 0.161, 0.096, 0.005)
    ], pants, pelvis, 20)
    ring_form("Clothing_Trousers_Waistband", [
        (0.901, 0.165, 0.098, 0.005), (0.927, 0.168, 0.101, 0.005)
    ], pants_light, pelvis, 20)

    leg_controls = {}
    for side, label in ((-1, "L"), (1, "R")):
        xhip = side * 0.095
        xknee = side * 0.105
        ankle_z = 0.205
        hip_p = pivot("Rig_Leg_" + label, (xhip, 0, 0.91), pelvis)
        knee_p = pivot("Rig_Knee_" + label, (xknee, 0, 0.54), hip_p)
        ankle_p = pivot("Rig_Ankle_" + label, (xknee, 0, ankle_z), knee_p)
        leg_controls[label] = (hip_p, knee_p, ankle_p)

        tapered_segment("Body_Thigh_" + label, (xhip, 0, 0.91), (xknee, 0, 0.54),
                        0.052, 0.043, skin, hip_p, 0.050, 0.043)
        tapered_segment("Clothing_Trousers_Upper_" + label, (xhip, 0, 0.91), (xknee, 0, 0.54),
                        0.081, 0.060, pants, hip_p, 0.087, 0.064)
        ellipsoid("Body_Knee_" + label, (xknee, 0, 0.535), (0.047, 0.047, 0.052), skin, knee_p, 10, 8)
        tapered_segment("Body_Shin_" + label, (xknee, 0, 0.55), (xknee, 0, 0.205),
                        0.041, 0.045, skin, knee_p, 0.040, 0.044)
        tapered_segment("Clothing_Trousers_Lower_" + label, (xknee, 0, 0.555), (xknee, 0, 0.205),
                        0.059, 0.060, pants, knee_p, 0.063, 0.065)
        tapered_segment("Clothing_Trousers_Cuff_" + label, (xknee, 0, 0.218), (xknee, 0, 0.192),
                        0.062, 0.061, pants_light, knee_p, 0.066, 0.065)

        ellipsoid("Clothing_Boot_Sole_" + label, (xknee, -0.046, 0.031), (0.080, 0.139, 0.022), sole, ankle_p, 14, 8)
        ellipsoid("Clothing_Boot_Welt_" + label, (xknee, -0.045, 0.050), (0.080, 0.137, 0.015), boot_light, ankle_p, 14, 8)
        ellipsoid("Clothing_Boot_Toe_" + label, (xknee, -0.066, 0.090), (0.073, 0.119, 0.054), boot, ankle_p, 16, 10)
        ellipsoid("Clothing_Boot_Shaft_" + label, (xknee, 0.010, 0.151), (0.057, 0.071, 0.072), boot, ankle_p, 14, 9)
        ellipsoid("Clothing_Boot_Tongue_" + label, (xknee, -0.050, 0.145), (0.035, 0.012, 0.043), boot_light, ankle_p, 10, 8)

    arm_controls = {}
    for side, label in ((-1, "L"), (1, "R")):
        shoulder_p = pivot("Rig_Shoulder_" + label, (side * 0.218, 0, 1.255), torso)
        elbow_x = side * 0.286
        elbow_p = pivot("Rig_Elbow_" + label, (elbow_x, 0, 0.985), shoulder_p)
        wrist_x = side * 0.304
        hand_p = pivot("Rig_Hand_" + label, (wrist_x, 0, 0.785), elbow_p)
        arm_controls[label] = (shoulder_p, elbow_p, hand_p)

        tapered_segment("Clothing_Shirt_Sleeve_" + label, (side * 0.218, 0, 1.27), (side * 0.268, 0, 1.095),
                        0.073, 0.062, shirt, shoulder_p, 0.070, 0.059)
        tapered_segment("Clothing_Shirt_Sleeve_Cuff_" + label, (side * 0.265, 0, 1.105), (side * 0.270, 0, 1.088),
                        0.062, 0.060, shirt_light, shoulder_p, 0.059, 0.057)
        tapered_segment("Body_UpperArm_" + label, (side * 0.267, 0, 1.105), (elbow_x, 0, 0.985),
                        0.045, 0.043, skin, shoulder_p, 0.044, 0.042)
        ellipsoid("Body_Elbow_" + label, (elbow_x, 0, 0.982), (0.044, 0.043, 0.046), skin, elbow_p, 10, 8)
        tapered_segment("Body_Forearm_" + label, (elbow_x, 0, 0.99), (wrist_x, 0, 0.785),
                        0.044, 0.035, skin, elbow_p, 0.042, 0.034)
        ellipsoid("Body_Palm_" + label, (side * 0.307, -0.002, 0.704), (0.045, 0.034, 0.061), skin, hand_p, 12, 8)
        for finger, (offset, length) in enumerate(((-0.027, 0.060), (-0.009, 0.073), (0.010, 0.070), (0.027, 0.058))):
            fx = side * 0.307 + offset
            tapered_segment("Body_Finger_%s_%d" % (label, finger),
                            (fx, -0.006, 0.675), (fx + side * offset * 0.10, -0.008, 0.675 - length),
                            0.009, 0.0065, skin, hand_p, 0.009, 0.0065, 9)
        tapered_segment("Body_Thumb_" + label, (side * 0.273, -0.004, 0.715), (side * 0.251, -0.012, 0.666),
                        0.012, 0.008, skin, hand_p, 0.011, 0.008, 10)

    tapered_segment("Body_Neck", (0, 0, 1.335), (0, 0, 1.425), 0.048, 0.047, skin, torso, 0.045, 0.044)
    ellipsoid("Body_Head", (0, 0, 1.493), (0.119, 0.103, 0.137), skin, head_pivot, 20, 14)
    ellipsoid("Body_Ear_L", (-0.116, 0.001, 1.490), (0.026, 0.025, 0.039), skin, head_pivot, 12, 8)
    ellipsoid("Body_Ear_R", (0.116, 0.001, 1.490), (0.026, 0.025, 0.039), skin, head_pivot, 12, 8)
    for side, label in ((-1, "L"), (1, "R")):
        ellipsoid("Body_Ear_Inset_" + label, (side * 0.127, -0.018, 1.492), (0.009, 0.006, 0.021), skin_light, head_pivot, 9, 7)

    ellipsoid("Body_Hair_Cap", (0, 0.018, 1.566), (0.128, 0.108, 0.084), hair, head_pivot, 20, 12)
    ellipsoid("Body_Hair_Back", (0, 0.039, 1.518), (0.119, 0.087, 0.087), hair, head_pivot, 16, 10)
    ellipsoid("Body_Hair_Swept_Front", (0, -0.073, 1.585), (0.091, 0.034, 0.027), hair_light, head_pivot, 16, 10, (0, 0.08, 0))
    for i, x in enumerate((-0.050, -0.016, 0.023, 0.055)):
        ellipsoid("Body_Hair_Fringe_%d" % i, (x, -0.082, 1.575 + (0.006 if i in (0, 3) else 0)),
                  (0.027, 0.025, 0.025), hair if i % 2 else hair_light, head_pivot, 12, 8,
                  (0, 0, -0.12 if x < 0 else 0.12))
    for side, label in ((-1, "L"), (1, "R")):
        ellipsoid("Body_Hair_Sideburn_" + label, (side * 0.109, -0.002, 1.495), (0.018, 0.028, 0.056), hair, head_pivot, 12, 8)

    for side, label in ((-1, "L"), (1, "R")):
        x = side * 0.044
        ellipsoid("Body_Eye_White_" + label, (x, -0.092, 1.514), (0.014, 0.008, 0.016), eye_white, head_pivot, 12, 8)
        ellipsoid("Body_Eye_Pupil_" + label, (x, -0.101, 1.514), (0.0065, 0.0045, 0.009), eye_dark, head_pivot, 10, 7)
        ellipsoid("Body_Eye_Glint_" + label, (x - 0.002, -0.105, 1.518), (0.0022, 0.0018, 0.0025), eye_white, head_pivot, 8, 6)
        ellipsoid("Body_Brow_" + label, (x, -0.092, 1.540), (0.022, 0.006, 0.005), hair, head_pivot, 12, 7,
                  (0, 0, -side * 0.08))
    ellipsoid("Body_Nose", (0, -0.105, 1.484), (0.014, 0.017, 0.022), skin_light, head_pivot, 12, 8)
    tube("Body_Smile", [
        (-0.025, -0.096, 1.451), (-0.017, -0.101, 1.445),
        (0.0, -0.103, 1.443), (0.017, -0.101, 1.445),
        (0.025, -0.096, 1.451)
    ], 0.0022, mouth_mat, head_pivot, 6)

    walk_frames = (1, 7, 13, 19, 25)
    hip_values = (0.24, 0.0, -0.24, 0.0, 0.24)
    knee_left = (0.02, 0.18, 0.34, 0.16, 0.02)
    knee_right = (0.34, 0.16, 0.02, 0.18, 0.34)
    arm_values = (-0.22, 0.0, 0.22, 0.0, -0.22)
    for i, frame in enumerate(walk_frames):
        root.location.z = (0.0, 0.012, 0.0, 0.012, 0.0)[i]
        root.keyframe_insert(data_path="location", index=2, frame=frame)
        pelvis.rotation_euler.x = (0.012, -0.006, -0.012, -0.006, 0.012)[i]
        pelvis.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
        torso.rotation_euler.x = (-0.012, 0.0, 0.012, 0.0, -0.012)[i]
        torso.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
        head_pivot.rotation_euler.x = (0.012, 0.0, -0.012, 0.0, 0.012)[i]
        head_pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
        for label, sign in (("L", 1), ("R", -1)):
            hip, knee, ankle = leg_controls[label]
            hip.rotation_euler.x = sign * hip_values[i]
            hip.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            knee.rotation_euler.x = knee_left[i] if label == "L" else knee_right[i]
            knee.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            ankle.rotation_euler.x = (-0.10, 0.02, 0.08, 0.02, -0.10)[i] if label == "L" else (0.08, 0.02, -0.10, 0.02, 0.08)[i]
            ankle.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            shoulder, elbow, hand = arm_controls[label]
            shoulder.rotation_euler.x = sign * arm_values[i]
            shoulder.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            elbow.rotation_euler.x = (0.10, 0.06, 0.03, 0.06, 0.10)[i]
            elbow.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            hand.rotation_euler.x = 0.0
            hand.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)

    idle_frames = (31, 43, 55, 67, 79)
    for i, frame in enumerate(idle_frames):
        root.location.z = (0.0, 0.005, 0.0, 0.005, 0.0)[i]
        root.keyframe_insert(data_path="location", index=2, frame=frame)
        torso.rotation_euler.x = (0.0, -0.008, 0.0, -0.008, 0.0)[i]
        torso.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
        head_pivot.rotation_euler.x = (0.0, 0.006, 0.0, -0.004, 0.0)[i]
        head_pivot.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
        for label in ("L", "R"):
            hip, knee, ankle = leg_controls[label]
            hip.rotation_euler.x = 0.0
            hip.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            knee.rotation_euler.x = 0.0
            knee.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            ankle.rotation_euler.x = 0.0
            ankle.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            shoulder, elbow, hand = arm_controls[label]
            shoulder.rotation_euler.x = (0.0, -0.008 if label == "L" else 0.008, 0.0,
                                         0.008 if label == "L" else -0.008, 0.0)[i]
            shoulder.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            elbow.rotation_euler.x = 0.0
            elbow.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)
            hand.rotation_euler.x = 0.0
            hand.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)

    scene.frame_set(1)
    return {
        "animationRanges": {"walk": [1, 25], "idle": [31, 79]},
        "notes": "Articulated reusable body and separately named ochre-shirt/slate-trouser clothing meshes; in-place walk and breathing idle at 24 fps."
    }
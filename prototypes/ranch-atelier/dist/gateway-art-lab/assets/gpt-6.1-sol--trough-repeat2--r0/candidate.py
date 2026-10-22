import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60

    def material(name, color, roughness, metallic=0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Metallic"].default_value = metallic
        return m

    wood = material("Honey brown weathered timber", (0.30, 0.145, 0.058), 0.82)
    wood2 = material("Timber alternate boards", (0.39, 0.205, 0.085), 0.78)
    endwood = material("Dark end grain and checks", (0.16, 0.077, 0.029), 0.9)
    metal = material("Quiet galvanized zinc", (0.44, 0.50, 0.50), 0.57, 0.72)
    iron = material("Dull iron fasteners", (0.19, 0.23, 0.23), 0.53, 0.78)
    watermat = material("Still blue green water", (0.065, 0.23, 0.235), 0.19, 0.24)

    def mesh(name, verts, faces, mat):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        ob.data.materials.append(mat)
        return ob

    def bevel(ob, width=0.004, segments=1):
        mod = ob.modifiers.new("Softened working edges", "BEVEL")
        mod.width = width
        mod.segments = segments
        mod = ob.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        mod.keep_sharp = True
        mod.weight = 30
        return ob

    def box(name, loc, size, mat, edge=0.003):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        ob = bpy.context.object
        ob.name = name
        ob.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        ob.data.materials.append(mat)
        if edge:
            bevel(ob, edge)
        return ob

    def beam(name, a, b, width, depth, mat):
        a, b = Vector(a), Vector(b)
        ob = box(name, (a+b)/2, (width, depth, (b-a).length), mat)
        ob.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
        return ob

    def rect(x, y, z):
        return [(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]

    def closed_wedge(name, lower, upper, mat):
        return bevel(mesh(name, lower+upper,
            [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),
             (2,3,7,6),(3,0,4,7)], mat), 0.002)

    # Four independent mitered wall boards in each horizontal course.
    for course in range(3):
        z0 = 0.255 + course*0.13
        z1 = z0 + 0.128
        def outline(z, inner=False):
            t = (z-0.255)/0.39
            x = 0.82+0.08*t
            y = 0.27+0.08*t
            if inner:
                x -= 0.064
                y -= 0.064
            return rect(x,y,z)
        lo, li = outline(z0), outline(z0, True)
        hi, hii = outline(z1), outline(z1, True)
        for side in range(4):
            n = (side+1)%4
            closed_wedge("Timber wall course %d side %d" % (course+1, side+1),
                         [lo[side],lo[n],li[n],li[side]],
                         [hi[side],hi[n],hii[n],hii[side]],
                         wood if (side+course)%2 else wood2)

    # Real closed-thickness metal vessel: outer floor, outer wall, lip,
    # inner wall, and upward-facing interior floor.
    loops = [
        rect(0.761,0.211,0.284),
        rect(0.842,0.292,0.650),
        rect(0.809,0.259,0.650),
        rect(0.737,0.187,0.305)
    ]
    verts = sum(loops, [])
    faces = [(3,2,1,0)]
    for k in range(3):
        for i in range(4):
            j = (i+1)%4
            faces.append((4*k+i,4*k+j,4*(k+1)+j,4*(k+1)+i))
    faces.append((12,13,14,15))
    liner = mesh("Continuous hollow galvanized liner", verts, faces, metal)
    bevel(liner, 0.002, 2)

    # A narrow folded metal lip outlines the opening; timber remains visible.
    for sy in (-1,1):
        box("Folded long rim", (0,sy*0.276,0.653), (1.684,0.032,0.012), metal,0.004)
    for sx in (-1,1):
        box("Folded end rim", (sx*0.827,0,0.653), (0.032,0.52,0.012), metal,0.004)

    # Underside load-bearing floor planks.
    for y in (-0.18,0,0.18):
        box("Underside timber bed plank", (0,y,0.266), (1.62,0.174,0.045), wood)

    # Short, slightly splayed legs and cross ties.
    for sx in (-1,1):
        for sy in (-1,1):
            beam("Square splayed ranch leg",
                 (sx*0.685,sy*0.274,0.012),
                 (sx*0.645,sy*0.224,0.386),
                 0.098,0.098,wood2)
        box("Transverse bearing saddle", (sx*0.645,0,0.239), (0.135,0.61,0.085), wood)
        box("Lower end tie", (sx*0.669,0,0.102), (0.067,0.51,0.065), wood)
    for sy in (-1,1):
        beam("Diagonal longitudinal brace",
             (-0.65,sy*0.257,0.09),(-0.29,sy*0.257,0.281),0.052,0.046,wood)
        beam("Diagonal longitudinal brace",
             (0.65,sy*0.257,0.09),(0.29,sy*0.257,0.281),0.052,0.046,wood)

    def bolt(name, pos, axis, radius=0.012):
        # The washer and hexagonal head share a purposeful outward axis.
        axis = Vector(axis)
        for offset, r, depth, sides, mat in [
            (0, radius*1.5,0.003,12,metal),
            (0.005, radius,0.008,6,iron)
        ]:
            center = Vector(pos)+axis*offset
            bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=r, depth=depth, location=center)
            ob = bpy.context.object
            ob.name = name + (" washer" if sides==12 else " hex head")
            ob.rotation_euler = axis.to_track_quat("Z","Y").to_euler()
            ob.data.materials.append(mat)
            bevel(ob,0.001)

    # Straps lie on the sloping exterior, rather than floating vertically.
    for x in (-0.66,0.66):
        for sy in (-1,1):
            z0,z1=0.285,0.625
            y0=sy*(0.27+0.08*(z0-0.255)/0.39+0.005)
            y1=sy*(0.27+0.08*(z1-0.255)/0.39+0.005)
            beam("Galvanized retaining strap",(x,y0,z0),(x,y1,z1),0.037,0.009,metal)
            for z in (0.313,0.443,0.581):
                y=sy*(0.27+0.08*(z-0.255)/0.39+0.013)
                bolt("Wall strap bolt",(x,y,z),(0,sy,0))
    for sx in (-1,1):
        for sy in (-1,1):
            bolt("Leg joint pin",(sx*0.652,sy*0.281,0.205),(0,sy,0),0.011)

    # Sparse incised-looking grain checks on the exposed front and back boards.
    for sy in (-1,1):
        for k in range(15):
            course=k%3
            z=0.278+course*0.13+random.uniform(0.012,0.075)
            x=random.uniform(-0.72,0.60)
            length=random.uniform(0.055,0.19)
            y=sy*(0.27+0.08*(z-0.255)/0.39+0.0015)
            mesh("Fine timber weather check",
                 [(x,y,z),(min(x+length,0.79),y,z+0.001),
                  (x+length*0.61,y+sy*0.0004,z+0.0027)],
                 [(0,1,2)],endwood)

    # Separate, morph-animated water surface. Both states are contained by the
    # tapered metal walls; the empty state is concealed beneath the inner floor.
    nx,ny=16,6
    waterverts=[]
    for j in range(ny+1):
        v=j/ny*2-1
        for i in range(nx+1):
            u=i/nx*2-1
            ripple=0.0012*math.sin(u*10+v*5)*(1-u*u)*(1-v*v)
            waterverts.append((u*0.796,v*0.246,0.606+ripple))
    waterfaces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            waterfaces.append((a,a+1,a+nx+2,a+nx+1))
    water=mesh("Water level full to empty",waterverts,waterfaces,watermat)
    for p in water.data.polygons:
        p.use_smooth=True
    water.shape_key_add(name="Full basin")
    empty=water.shape_key_add(name="Empty basin")
    for j in range(ny+1):
        v=j/ny*2-1
        for i in range(nx+1):
            u=i/nx*2-1
            empty.data[j*(nx+1)+i].co=(u*0.731,v*0.181,0.298)
    empty.value=0
    empty.keyframe_insert(data_path="value",frame=1)
    empty.value=1
    empty.keyframe_insert(data_path="value",frame=60)
    action=water.data.shape_keys.animation_data.action
    if action:
        action.name="water_state"
    scene.frame_set(1)
    return {"animationRanges":{"water_state":[1,60]},
            "notes":"1.8 m timber trough with true hollow galvanized lining, grounded braced legs, and separate water mesh. Water morphs down inside the tapered vessel from full at frame 1 to hidden below its interior floor at frame 60."}
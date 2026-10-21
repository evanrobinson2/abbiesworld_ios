import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)

    def material(name, color, roughness, metallic=0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = roughness
        p.inputs["Metallic"].default_value = metallic
        return m

    wood = [
        material("Timber - honey brown", (.30, .145, .060), .78),
        material("Timber - warm weathering", (.37, .195, .088), .82),
        material("Timber - shaded grain", (.245, .109, .041), .83),
    ]
    metal = material("Quiet galvanized steel", (.43, .49, .50), .44, .72)
    iron = material("Dark galvanized fasteners", (.20, .24, .25), .48, .75)
    grain = material("Timber grain and checks", (.16, .075, .029), .9)
    watermat = material("Still trough water", (.075, .22, .245), .22, .22)

    def mesh(name, verts, faces, mat, bevel=0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ob.data.materials.append(mat)
        if bevel:
            mod = ob.modifiers.new("Soft worn edges", "BEVEL")
            mod.width = bevel
            mod.segments = 1
            mod = ob.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
            mod.keep_sharp = True
        return ob

    def box(name, loc, size, mat, bevel=.003):
        x, y, z = (s / 2 for s in size)
        verts = [
            (-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
            (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)
        ]
        ob = mesh(name, verts, [
            (0,3,2,1),(0,1,5,4),(1,2,6,5),
            (2,3,7,6),(3,0,4,7),(4,5,6,7)
        ], mat, bevel)
        ob.location = loc
        return ob

    def beam(name, a, b, width, depth, mat):
        a, b = Vector(a), Vector(b)
        ob = box(name, (a+b)/2, (width, depth, (b-a).length), mat, .004)
        ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
        return ob

    def cylinder(name, loc, radius, depth, mat, direction=(0,0,1), vertices=12):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=vertices, radius=radius, depth=depth, location=loc)
        ob = bpy.context.object
        ob.name = name
        ob.rotation_euler = Vector(direction).to_track_quat('Z', 'Y').to_euler()
        ob.data.materials.append(mat)
        be = ob.modifiers.new("Fastener edge", 'BEVEL')
        be.width = .001
        be.segments = 1
        ob.modifiers.new("Fastener normals", 'WEIGHTED_NORMAL')
        return ob

    for x in (-.64, .64):
        for y in (-.225, .225):
            box("Square timber leg", (x,y,.161), (.115,.115,.322), wood[2], .006)
        box("Under-basin saddle", (x,0,.249), (.17,.57,.085), wood[1], .005)
        beam("End diagonal brace", (x,-.205,.058), (x,.205,.267),
             .062,.055,wood[0])
    for y in (-.225,.225):
        box("Long lower stretcher", (0,y,.103), (1.34,.065,.072), wood[0], .004)
        beam("Knee brace left", (-.62,y,.12), (-.35,y,.277), .052,.052,wood[1])
        beam("Knee brace right", (.62,y,.12), (.35,y,.277), .052,.052,wood[1])

    def extent(z):
        t = (z-.245)/.397
        return .805+.095*t, .247+.103*t

    for row in range(3):
        lo = .245 + row*.132
        hi = lo+.129
        xl, yl = extent(lo)
        xh, yh = extent(hi)
        for sign in (-1,1):
            verts = [
                (-xl,sign*yl,lo),(xl,sign*yl,lo),
                (xh,sign*yh,hi),(-xh,sign*yh,hi),
                (-xl,sign*(yl-.047),lo),(xl,sign*(yl-.047),lo),
                (xh,sign*(yh-.047),hi),(-xh,sign*(yh-.047),hi)
            ]
            faces = [
                (0,1,2,3),(4,7,6,5),(0,4,5,1),
                (3,2,6,7),(0,3,7,4),(1,5,6,2)
            ]
            if sign == 1:
                faces = [tuple(reversed(f)) for f in faces]
            mesh("Long timber plank", verts, faces, wood[(row+(sign==1))%3], .002)
            verts = [
                (sign*xl,-yl+.047,lo),(sign*xl,yl-.047,lo),
                (sign*xh,yh-.047,hi),(sign*xh,-yh+.047,hi),
                (sign*(xl-.05),-yl+.047,lo),(sign*(xl-.05),yl-.047,lo),
                (sign*(xh-.05),yh-.047,hi),(sign*(xh-.05),-yh+.047,hi)
            ]
            mesh("End timber plank", verts, faces, wood[(row+1)%3], .002)

    box("Timber bottom support", (0,0,.262), (1.61,.493,.05), wood[2], .004)

    rings = [
        (.748,.190,.296),
        (.849,.299,.626),
        (.900,.350,.642),
        (.900,.350,.650),
        (.841,.291,.650),
        (.741,.183,.302),
    ]
    verts = []
    for x,y,z in rings:
        verts.extend([(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)])
    faces = []
    for k in range(len(rings)-1):
        for i in range(4):
            j = (i+1)%4
            faces.append((k*4+i,k*4+j,(k+1)*4+j,(k+1)*4+i))
    faces.extend([(0,3,2,1),(20,21,22,23)])
    mesh("Folded galvanized hollow liner and rolled lip", verts, faces, metal, .0015)

    for x in (-.67,.67):
        for sign in (-1,1):
            beam("Galvanized wall strap", (x,sign*.257,.267),
                 (x,sign*.350,.630), .043,.009,metal)
            for z in (.312,.447,.581):
                y = sign*(extent(z)[1]+.009)
                cylinder("Strap washer", (x,y,z), .013,.004,iron,(0,sign,0))
                cylinder("Hex carriage bolt", (x,y+sign*.004,z),
                         .008,.009,metal,(0,sign,0),6)
    for x in (-.64,.64):
        for y in (-.288,.288):
            cylinder("Saddle bolt", (x,y,.254), .012,.008,iron,
                     (0,1 if y>0 else -1,0),6)

    for sign in (-1,1):
        for row in range(3):
            for n in range(4):
                z = .285+row*.132+random.uniform(-.015,.025)
                y = sign*(extent(z)[1]+.001)
                x = random.uniform(-.61,.47)
                length = random.uniform(.07,.24)
                mesh("Fine timber check", [
                    (x,y,z),(x+length,y,z+.0015),
                    (x+length*.75,y,z+.003),(x+.015,y,z+.002)
                ], [(0,1,2,3)], grain)

    water = box("Water level - full to empty", (0,0,.605),
                (1.628,.521,.003), watermat, 0)

    # Bake linear descent as per-frame transform keys without accessing
    # action curves. At frame 60 all water is concealed within the solid floor.
    for frame in range(1,61):
        t = (frame-1)/59
        water.location.z = .605-.312*t
        water.scale = (1-.100*t, 1-.317*t, 1)
        water.keyframe_insert(data_path="location", frame=frame)
        water.keyframe_insert(data_path="scale", frame=frame)
    if water.animation_data and water.animation_data.action:
        water.animation_data.action.name = "water_state"

    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 60
    scene.frame_set(1)
    return {
        "animationRanges": {"water_state": [1,60]},
        "notes": "Open timber trough with solid hollow galvanized liner. Single-segment edge bevels keep geometry economical. Water descends and contracts inside the lining, ending fully concealed within its solid floor at frame 60."
    }
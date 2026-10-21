import bpy
import math
import random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    def mat(name, color, rough=0.7):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = rough
        return m

    skin = mat("Skin • warm terracotta", (0.56, 0.315, 0.19))
    skinlight = mat("Skin • ear and nose warmth", (0.63, 0.345, 0.22))
    ochre = mat("Shirt • harvest ochre", (0.61, 0.345, 0.075))
    trim = mat("Shirt • golden folded edges", (0.76, 0.465, 0.13))
    slate = mat("Trousers • blue slate", (0.105, 0.185, 0.23))
    seam = mat("Trousers • seam edging", (0.16, 0.255, 0.29))
    leather = mat("Boots and belt • oiled umber", (0.115, 0.066, 0.041), 0.52)
    sole = mat("Boots • charcoal soles", (0.042, 0.044, 0.04))
    hair = mat("Hair • dark walnut", (0.075, 0.039, 0.022), 0.63)
    hairhi = mat("Hair • sculpted warm ridges", (0.115, 0.061, 0.033), 0.67)
    white = mat("Eyes • ivory", (0.84, 0.80, 0.67), 0.4)
    dark = mat("Eyes and mouth • espresso", (0.023, 0.016, 0.012), 0.43)
    brass = mat("Hardware • aged brass", (0.57, 0.38, 0.13), 0.36)

    def smooth(obj):
        for p in obj.data.polygons:
            p.use_smooth = True

    def mesh(name, verts, faces, material):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        ob.data.materials.append(material)
        return ob

    def parent(obj, joint):
        if joint:
            bpy.context.view_layer.update()
            obj.parent = joint
            obj.matrix_parent_inverse = joint.matrix_world.inverted()
        return obj

    def joint(name, pos, par=None):
        ob = bpy.data.objects.new(name, None)
        scene.collection.objects.link(ob)
        ob.empty_display_type = 'PLAIN_AXES'
        ob.empty_display_size = 0.045
        ob.location = pos
        if par:
            bpy.context.view_layer.update()
            world = ob.matrix_world.copy()
            ob.parent = par
            ob.matrix_world = world
        return ob

    def ell(name, center, scale, material, par=None, seg=24, rings=16):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=center)
        ob = bpy.context.object
        ob.name = name
        ob.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        ob.data.materials.append(material)
        smooth(ob)
        return parent(ob, par)

    def loft(name, rows, material, par=None, n=24):
        # Rows are (center x, center y, height, horizontal radius, depth radius).
        v = []
        for x, y, z, rx, ry in rows:
            for i in range(n):
                a = 2 * math.pi * i / n
                v.append((x + rx * math.cos(a), y + ry * math.sin(a), z))
        f = [tuple(reversed(range(n)))]
        for j in range(len(rows)-1):
            for i in range(n):
                k = (i+1) % n
                f.append((j*n+i, j*n+k, (j+1)*n+k, (j+1)*n+i))
        f.append(tuple((len(rows)-1)*n+i for i in range(n)))
        ob = mesh(name, v, f, material)
        smooth(ob)
        return parent(ob, par)

    def tube(name, points, radii, material, par=None, n=12):
        v = []
        for j, co in enumerate(points):
            p = Vector(co)
            if j == 0:
                axis = Vector(points[1])-p
            elif j == len(points)-1:
                axis = p-Vector(points[j-1])
            else:
                axis = Vector(points[j+1])-Vector(points[j-1])
            axis.normalize()
            ref = Vector((0, 1, 0))
            if abs(axis.dot(ref)) > 0.95:
                ref = Vector((1, 0, 0))
            u = axis.cross(ref).normalized()
            w = axis.cross(u).normalized()
            r = radii[j]
            if isinstance(r, tuple):
                r1, r2 = r
            else:
                r1 = r2 = r
            for i in range(n):
                a = 2*math.pi*i/n
                v.append(tuple(p + u*(r1*math.cos(a)) + w*(r2*math.sin(a))))
        f = [tuple(reversed(range(n)))]
        for j in range(len(points)-1):
            for i in range(n):
                k = (i+1)%n
                f.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
        f.append(tuple((len(points)-1)*n+i for i in range(n)))
        ob = mesh(name, v, f, material)
        smooth(ob)
        return parent(ob, par)

    def box(name, loc, scale, material, par=None, bevel=0.008):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        ob = bpy.context.object
        ob.name = name
        ob.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        ob.data.materials.append(material)
        if bevel:
            m = ob.modifiers.new("Soft manufactured edges", 'BEVEL')
            m.width = bevel
            m.segments = 3
            m = ob.modifiers.new("Weighted corner normals", 'WEIGHTED_NORMAL')
        return parent(ob, par)

    root = joint("RIG • reusable ranch resident", (0,0,0))
    pelvis = joint("CTRL • pelvis", (0,0,0.85), root)
    chest = joint("CTRL • chest", (0,0,1.02), pelvis)
    head = joint("CTRL • neck and head", (0,0,1.31), chest)

    loft("BODY • neck", [(0,0.008,1.245,.057,.055),(0,0.008,1.34,.052,.052),
                         (0,0,1.38,.064,.057)], skin, head)
    loft("CLOTHING • ochre shirt torso", [
        (0,0,0.865,.155,.105),(0,0,0.89,.167,.114),
        (0,0,0.96,.16,.111),(0,0,1.08,.174,.119),
        (0,0.003,1.19,.198,.115),(0,0.006,1.245,.188,.102),
        (0,0.005,1.275,.115,.075),(0,0.005,1.29,.066,.059)
    ], ochre, chest)
    loft("CLOTHING • shirt lower stitched hem", [
        (0,0,.872,.16,.111),(0,0,.884,.169,.117),(0,0,.899,.168,.117)
    ], trim, chest)
    # Open-neck placket, two neat collar leaves, and buttons.
    box("CLOTHING • center shirt placket", (0,-.117,1.177), (.022,.011,.148), trim, chest, .004)
    for side in (-1,1):
        verts = [(side*.012,-.077,1.291),(side*.07,-.069,1.28),
                 (side*.10,-.108,1.235),(side*.04,-.128,1.21)]
        ob = mesh("CLOTHING • collar leaf "+str(side), verts, [(0,1,2,3)], trim)
        sol = ob.modifiers.new("Collar fabric thickness",'SOLIDIFY')
        sol.thickness = .006
        be = ob.modifiers.new("Rounded collar tips",'BEVEL')
        be.width = .004
        be.segments = 2
        parent(ob,chest)
    for z in (1.20,1.155,1.11):
        ell("CLOTHING • horn shirt button", (0,-.126,z), (.005,.003,.005), brass, chest,16,8)
    # A small shaped chest pocket, with a visible rolled lip.
    pocket = mesh("CLOTHING • left chest patch pocket",
        [(.065,-.121,1.19),(.134,-.111,1.19),(.13,-.117,1.122),
         (.10,-.127,1.107),(.067,-.128,1.123)], [(0,1,2,3,4)], ochre)
    so = pocket.modifiers.new("Pocket fabric", 'SOLIDIFY')
    so.thickness = .004
    parent(pocket,chest)
    tube("CLOTHING • pocket welt",[(.066,-.126,1.19),(.10,-.126,1.19),(.134,-.116,1.19)],
         [.004,.004,.004],trim,chest,8)

    loft("CLOTHING • trouser seat",[(0,0,.728,.135,.091),(0,.004,.79,.157,.108),
        (0,.003,.861,.154,.108),(0,0,.89,.149,.102)],slate,pelvis)
    loft("CLOTHING • leather belt",[(0,0,.864,.157,.111),(0,0,.891,.157,.111)],leather,pelvis)
    box("CLOTHING • belt buckle", (0,-.119,.878), (.043,.014,.034), brass,pelvis,.005)
    box("CLOTHING • buckle inset", (0,-.128,.878), (.025,.005,.018), leather,pelvis,.003)
    for x in (-.115,.115):
        box("CLOTHING • belt loop", (x,-.083,.876),(.013,.013,.045),slate,pelvis,.003)

    legs = []
    arms = []
    for sign, label in ((-1,"R"),(1,"L")):
        x = sign*.09
        hip = joint("CTRL • hip."+label,(x,0,.79),pelvis)
        knee = joint("CTRL • knee."+label,(sign*.101,0,.455),hip)
        ankle = joint("CTRL • ankle."+label,(sign*.104,0,.155),knee)
        legs.append((hip,knee,ankle))
        loft("CLOTHING • trouser thigh."+label,[
            (x,0,.815,.079,.095),(sign*.094,0,.75,.082,.091),
            (sign*.10,0,.58,.068,.078),(sign*.101,0,.445,.062,.068)
        ],slate,hip)
        loft("CLOTHING • trouser shin."+label,[
            (sign*.101,0,.478,.063,.069),(sign*.102,.003,.41,.063,.069),
            (sign*.104,.006,.25,.054,.058),(sign*.104,0,.174,.054,.057)
        ],slate,knee)
        loft("CLOTHING • trouser cuff."+label,[
            (sign*.104,0,.17,.057,.061),(sign*.104,0,.196,.058,.063),
            (sign*.104,0,.207,.056,.06)],seam,knee)
        tube("CLOTHING • outside leg seam."+label,
             [(x+sign*.075,.005,.75),(sign*.101+sign*.065,.005,.57),
              (sign*.101+sign*.061,.005,.46)],[.0025]*3,seam,hip,6)
        # The foot has a long rounded toe and a tall boot shaft.
        loft("CLOTHING • boot upper."+label,[
            (sign*.104,-.035,.048,.074,.133),
            (sign*.104,-.039,.078,.077,.131),
            (sign*.104,-.033,.112,.073,.12),
            (sign*.104,-.008,.145,.061,.081),
            (sign*.104,.006,.205,.052,.061),
            (sign*.104,.006,.221,.053,.062)
        ],leather,ankle)
        loft("CLOTHING • boot sole."+label,[
            (sign*.104,-.035,.012,.074,.131),
            (sign*.104,-.035,.023,.08,.138),
            (sign*.104,-.035,.048,.08,.138),
            (sign*.104,-.035,.056,.076,.134)
        ],sole,ankle)
        loft("CLOTHING • boot welt."+label,[
            (sign*.104,-.035,.05,.078,.135),
            (sign*.104,-.035,.059,.077,.134)],leather,ankle)
        box("CLOTHING • boot back pull."+label,(sign*.104,.063,.204),(.025,.014,.052),leather,ankle,.004)
        for z,y in ((.113,-.108),(.133,-.091),(.152,-.072)):
            tube("CLOTHING • boot lace."+label,[(sign*.104-.025,y,z),(sign*.104+.025,y,z)],
                 [.003,.003],brass,ankle,8)

        shoulder = joint("CTRL • shoulder."+label,(sign*.185,0,1.223),chest)
        elbow = joint("CTRL • elbow."+label,(sign*.267,-.002,.995),shoulder)
        wrist = joint("CTRL • wrist."+label,(sign*.294,-.012,.793),elbow)
        arms.append((shoulder,elbow,wrist))
        tube("BODY • upper arm."+label,
             [(sign*.19,0,1.225),(sign*.239,0,1.105),(sign*.267,-.002,.99)],
             [.055,.047,.039],skin,shoulder,16)
        tube("CLOTHING • short sleeve."+label,
             [(sign*.18,0,1.235),(sign*.22,0,1.202),(sign*.245,0,1.123),(sign*.25,0,1.092)],
             [.064,.065,.058,.054],ochre,shoulder,20)
        tube("CLOTHING • folded sleeve hem."+label,
             [(sign*.245,0,1.113),(sign*.252,0,1.089)],
             [.059,.057],trim,shoulder,20)
        tube("BODY • forearm."+label,
             [(sign*.266,-.002,1.016),(sign*.278,-.006,.94),
              (sign*.292,-.012,.824),(sign*.294,-.012,.786)],
             [.039,.042,.029,.027],skin,elbow,18)
        ell("BODY • palm."+label,(sign*.298,-.015,.756),(.036,.028,.054),skin,wrist)
        # Rounded finger group and an independently shaped, inward-facing thumb.
        for k in range(4):
            xx = sign*(.275+k*.015)
            length = [.045,.054,.052,.04][k]
            tube("BODY • finger %d.%s"%(k+1,label),
                 [(xx,-.018,.738),(xx+sign*.003,-.025,.718),
                  (xx+sign*.002,-.031,.738-length)],
                 [.0095,.009,.0065],skin,wrist,10)
        tube("BODY • thumb."+label,
             [(sign*.273,-.025,.775),(sign*.258,-.04,.754),(sign*.258,-.048,.734)],
             [.014,.012,.008],skin,wrist,12)

    # A generous but adult-proportioned head, with a defined chin and broad cheek plane.
    loft("BODY • head",[
        (0,-.007,1.348,.045,.043),(0,-.012,1.36,.077,.068),
        (0,-.013,1.385,.103,.084),(0,-.005,1.43,.126,.105),
        (0,.002,1.485,.131,.111),(0,.008,1.54,.127,.108),
        (0,.012,1.588,.105,.094),(0,.012,1.615,.063,.065),
        (0,.012,1.624,.012,.013)
    ],skin,head,32)
    for sign in (-1,1):
        ell("BODY • ear", (sign*.13,.001,1.469),(.029,.025,.043),skin,head,20,12)
        ell("FACE • ear inset", (sign*.144,-.018,1.469),(.013,.008,.025),skinlight,head,16,12)
        ell("FACE • ivory eye", (sign*.049,-.104,1.49),(.023,.011,.017),white,head,20,12)
        ell("FACE • dark iris", (sign*.049,-.114,1.489),(.010,.0045,.012),dark,head,18,12)
        ell("FACE • eye glint", (sign*.046,-.118,1.494),(.003,.002,.003),white,head,12,8)
        tube("FACE • upper eyelid",[
            (sign*.028,-.109,1.495),(sign*.047,-.115,1.507),(sign*.07,-.104,1.498)],
            [.0035,.004,.003],skinlight,head,10)
        tube("FACE • brow",[
            (sign*.026,-.106,1.527),(sign*.048,-.11,1.534),(sign*.076,-.097,1.528)],
            [.004,.006,.003],hair,head,10)
    ell("FACE • nose bridge",(0,-.107,1.463),(.015,.019,.031),skin,head,20,12)
    ell("FACE • rounded nose",(0,-.125,1.447),(.024,.021,.017),skinlight,head,20,12)
    for sign in (-1,1):
        ell("FACE • nostril",(sign*.012,-.14,1.44),(.004,.0025,.0025),dark,head,12,8)
    tube("FACE • easy smile",[(-.032,-.097,1.407),(-.017,-.105,1.401),
         (0,-.108,1.399),(.018,-.104,1.402),(.031,-.096,1.409)],
         [.002,.0026,.0028,.0026,.002],dark,head,10)
    tube("FACE • lower lip",[(-.015,-.104,1.392),(0,-.107,1.39),(.016,-.103,1.393)],
         [.002,.003,.002],skinlight,head,10)

    # Closed scalp cap: shorter at the forehead, long around the occiput and nape.
    v = []
    n = 40
    nr = 10
    for j in range(nr):
        t = j/(nr-1)
        for i in range(n):
            a = 2*math.pi*i/n
            front = max(0,-math.sin(a))
            bottom = 1.429 + .113*front
            # Off-center hairline and side part.
            bottom += .014*front*math.cos(a)
            theta = .045 + t*(1.76-.045)
            z = 1.523 + .128*math.cos(theta)
            if j > 4:
                blend = ((j-4)/(nr-1-4))**2
                z = z*(1-blend)+bottom*blend
            v.append((.139*math.sin(theta)*math.cos(a),
                      .015+.119*math.sin(theta)*math.sin(a),z))
    f = [tuple(reversed(range(n)))]
    for j in range(nr-1):
        for i in range(n):
            k=(i+1)%n
            f.append((j*n+i,j*n+k,(j+1)*n+k,(j+1)*n+i))
    f.append(tuple((nr-1)*n+i for i in range(n)))
    cap = mesh("HAIR • fitted sculpted scalp",v,f,hair)
    smooth(cap)
    parent(cap,head)
    # Swept locks follow the scalp instead of floating around it.
    for i in range(6):
        a = i/5
        tube("HAIR • swept fringe lock %02d"%i,
            [(.085-a*.025,-.035,1.619),
             (.043-a*.065,-.084,1.632-a*.007),
             (-.018-a*.075,-.105,1.602-a*.013),
             (-.052-a*.061,-.105+a*.014,1.552-a*.01)],
            [(.021,.012),(.026,.015),(.024,.013),(.004,.004)],
            hairhi if i in (1,4) else hair,head,12)
    for sign in (-1,1):
        tube("HAIR • tapered sideburn",
            [(sign*.124,-.025,1.547),(sign*.129,-.029,1.502),(sign*.124,-.025,1.474)],
            [.016,.014,.006],hair,head,12)

    # Fully hierarchical transforms keep all modular outfit parts attached.
    # Each sample has explicit keys so the GLB timeline carries real motion.
    animated = [pelvis,chest,head] + [j for limb in legs+arms for j in limb]
    base_locations = {o:o.location.copy() for o in animated}
    def pose(frame, phase, idle=False):
        for ob in animated:
            ob.rotation_mode = 'XYZ'
            ob.rotation_euler = (0,0,0)
            ob.location = base_locations[ob].copy()
        if not idle:
            s = math.sin(phase)
            pelvis.location.z += .012*(1-math.cos(2*phase))
            pelvis.rotation_euler[1] = .025*s
            chest.rotation_euler[2] = -.045*s
            head.rotation_euler[2] = .025*s
            for i,(hip,knee,ankle) in enumerate(legs):
                q = phase + i*math.pi
                hip.rotation_euler[0] = .32*math.sin(q)
                knee.rotation_euler[0] = -.40*max(0,-math.sin(q))
                ankle.rotation_euler[0] = -.14*math.sin(q)
            for i,(shoulder,elbow,wrist) in enumerate(arms):
                q = phase+i*math.pi
                shoulder.rotation_euler[0] = -.25*math.sin(q)
                shoulder.rotation_euler[1] = (-1 if i == 0 else 1)*-.035
                elbow.rotation_euler[0] = -.09-.09*max(0,math.sin(q))
                wrist.rotation_euler[0] = .045*math.sin(q)
        else:
            s=math.sin(phase)
            pelvis.location.z += .003*s
            chest.rotation_euler[0] = .012*s
            chest.rotation_euler[1] = .009*math.cos(phase)
            head.rotation_euler[2] = .022*s
            head.rotation_euler[0] = -.012*s
            for i,(shoulder,elbow,wrist) in enumerate(arms):
                shoulder.rotation_euler[0] = .015*s
                elbow.rotation_euler[0] = -.045 + .012*s
        for ob in animated:
            ob.keyframe_insert(data_path="location",frame=frame,group="Body motion")
            ob.keyframe_insert(data_path="rotation_euler",frame=frame,group="Body motion")
    for frame in range(1,26,3):
        pose(frame,2*math.pi*(frame-1)/24)
    for frame in range(31,80,4):
        pose(frame,2*math.pi*(frame-31)/48,True)
    scene.frame_set(1)
    return {
        "animationRanges":{"walk":[1,25],"idle":[31,79]},
        "notes":"1.65 m rounded adult ranch resident. Named BODY, CLOTHING, FACE and HAIR meshes share a reusable articulated transform hierarchy. In-place walk and breathing idle; separate sleeve, shirt, trouser, boot and accessory meshes for future outfit swaps."
    }
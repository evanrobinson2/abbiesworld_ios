import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    def mat(name, color, rough=.8):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = rough
        return m

    cream = mat("Warm ivory coat", (.82, .74, .56))
    brown = mat("Chestnut coat patches", (.27, .115, .047))
    dark = mat("Deep brown split hooves", (.065, .043, .028))
    hornmat = mat("Honey horn", (.38, .285, .16))
    pink = mat("Inner ear", (.53, .30, .23))
    nose = mat("Velvet nose", (.16, .105, .075))
    iris = mat("Amber iris", (.67, .39, .095), .35)
    black = mat("Pupils and nostrils", (.012, .009, .006), .38)
    white = mat("Eye glint", (.98, .94, .80), .25)

    def empty(name, loc, parent=None):
        o = bpy.data.objects.new(name, None)
        scene.collection.objects.link(o)
        o.location = loc
        o.parent = parent
        o.rotation_mode = 'XYZ'
        return o

    root = empty("Goat body motion", (0, 0, 0))

    def mesh(name, verts, faces, material, parent=root, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        ob.data.materials.append(material)
        ob.parent = parent
        for p in me.polygons:
            p.use_smooth = smooth
        return ob

    def loft(name, centers, widths, depths, material, parent=root, n=16):
        verts = []
        for i, c in enumerate(centers):
            c = Vector(c)
            tangent = Vector(centers[min(i+1, len(centers)-1)]) - Vector(centers[max(0, i-1)])
            tangent.normalize()
            u = Vector((1, 0, 0))
            if abs(tangent.dot(u)) > .9:
                u = Vector((0, 1, 0))
            u = (u - tangent * tangent.dot(u)).normalized()
            v = tangent.cross(u).normalized()
            for j in range(n):
                t = j * 2 * math.pi / n
                verts.append(tuple(c + u * widths[i] * math.cos(t) + v * depths[i] * math.sin(t)))
        faces = []
        for i in range(len(centers)-1):
            for j in range(n):
                a = i*n+j
                b = i*n+(j+1)%n
                faces.append((a, b, b+n, a+n))
        faces.append(tuple(reversed(range(n))))
        faces.append(tuple((len(centers)-1)*n+j for j in range(n)))
        return mesh(name, verts, faces, material, parent)

    def ell(name, loc, scale, material, parent=root, seg=20, rings=12):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=(0, 0, 0))
        o = bpy.context.object
        o.name = name
        o.parent = parent
        o.location = loc
        o.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        o.data.materials.append(material)
        for f in o.data.polygons:
            f.use_smooth = True
        return o

    body = loft("Full barrel with shoulder and rump",
        [(0,.355,.69),(0,.30,.70),(0,.16,.705),(0,-.035,.71),(0,-.22,.725),(0,-.30,.74)],
        [.035,.13,.185,.19,.16,.075],
        [.065,.15,.18,.18,.145,.07], cream, n=24)
    body.data.materials.append(brown)
    for p in body.data.polygons:
        c = p.center
    # Deliberately irregular coat islands following the barrel topology.
    for i in range(5):
        for j in range(24):
            if (i in (1,2) and j in (1,2,3,4,5,6,7,8)) or (i in (2,3) and j in (14,15,16,17,18)):
                body.data.polygons[i*24+j].material_index = 1

    loft("Rising muscular neck",
         [(0,-.20,.72),(0,-.26,.82),(0,-.31,.94),(0,-.345,1.035)],
         [.125,.117,.093,.075], [.13,.13,.105,.073], cream, n=20)
    loft("Chest bib",
         [(0,-.29,.79),(0,-.315,.70),(0,-.29,.61)],
         [.083,.064,.025],[.032,.037,.012],brown)

    headpivot = empty("Head and ears", (0,-.345,1.025), root)
    loft("Sculpted forehead and tapered muzzle",
         [(0,.035,.035),(0,-.025,.055),(0,-.105,.005),(0,-.185,-.070),(0,-.205,-.085)],
         [.060,.101,.086,.064,.047],[.065,.096,.078,.048,.030],
         cream, headpivot, 20)
    ell("Soft dark muzzle", (0,-.201,-.074), (.060,.030,.036), nose, headpivot)
    for s in (-1,1):
        ell("Nostril", (s*.033,-.225,-.067), (.012,.006,.008), black, headpivot, 12,8)
        ell("Brown eye surround", (s*.084,-.045,.045), (.027,.052,.042), brown, headpivot)
        ell("Amber lateral eye", (s*.105,-.054,.049), (.012,.029,.025), iris, headpivot)
        ell("Horizontal goat pupil", (s*.116,-.058,.049), (.004,.020,.006), black, headpivot,16,8)
        ell("Eye shine", (s*.120,-.066,.058), (.0025,.005,.005), white, headpivot,12,8)
        # Broad leaf ears, with a recessed colored inset.
        loft("Leaf ear", [(s*.073,.012,.04),(s*.145,.018,.028),(s*.237,.014,-.005),(s*.278,.012,-.005)],
             [.022,.025,.020,.002],[.028,.048,.031,.002], cream,headpivot,12)
        verts=[(s*.104,-.005,.045),(s*.17,-.025,.050),(s*.254,-.005,-.001),
               (s*.187,-.025,-.008)]
        mesh("Warm inner ear", verts, [(0,1,2,3),(3,2,1,0)],pink,headpivot)
        horncenters=[(s*.060,.005,.105),(s*.068,.018,.16),(s*.080,.043,.22),
                     (s*.088,.082,.265),(s*.090,.125,.288),(s*.088,.15,.28)]
        loft("Swept curved horn",horncenters,[.030,.028,.024,.018,.010,.0015],
             [.028,.026,.023,.017,.009,.0015],hornmat,headpivot,12)

    loft("Pointed chin beard",[(0,-.116,-.085),(0,-.125,-.13),(0,-.112,-.205),(0,-.105,-.22)],
         [.042,.036,.020,.002],[.033,.026,.014,.002],brown,headpivot,12)
    tail = empty("Tail wag pivot",(0,.31,.78),root)
    loft("Upturned short tail",[(0,0,0),(0,.065,.05),(0,.125,.09),(0,.15,.10)],
         [.044,.038,.026,.003],[.038,.033,.022,.003],cream,tail,12)
    loft("Brown tail tip",[(0,.112,.083),(0,.143,.102),(0,.158,.10)],
         [.027,.018,.001],[.023,.018,.001],brown,tail,12)

    legs = []
    for y, label in [(-.225,"Front"),(.245,"Hind")]:
        for s in (-1,1):
            hip = empty(label + (" left" if s < 0 else " right") + " hip", (s*.131,y,.66),root)
            knee = empty(label+" knee",(0,0,-.30),hip)
            foot = empty(label+" ankle",(0,0,-.29),knee)
            loft(label+" upper leg",[(0,0,.025),(0,0,-.065),(0,.002,-.20),(0,0,-.31)],
                 [.060,.053,.035,.030],[.067,.052,.031,.030],
                 brown if y > 0 else cream,hip,12)
            ell(label+" knee joint",(0,0,0),(.031,.034,.037),cream,knee,12,8)
            loft(label+" slender cannon",[(0,0,.008),(0,0,-.09),(0,0,-.235),(0,0,-.292)],
                 [.029,.024,.019,.025],[.030,.025,.022,.028],cream,knee,12)
            # Distinct paired toes, rounded in plan but with flat soles.
            for toe in (-1,1):
                verts=[]
                for z,w,front,back in [(-.075,.020,-.067,.026),(-.058,.023,-.067,.029),(.008,.018,-.037,.020)]:
                    cx=toe*.024
                    for x,yy in [(-w,front),(w,front),(w,back),(-w,back)]:
                        verts.append((cx+x,yy,z))
                faces=[(3,2,1,0),(8,9,10,11)]
                for k in range(2):
                    for j in range(4):
                        faces.append((k*4+j,k*4+(j+1)%4,(k+1)*4+(j+1)%4,(k+1)*4+j))
                ob=mesh(label+" cloven hoof toe",verts,faces,dark,foot,False)
                bevel=ob.modifiers.new("Soft hoof edges","BEVEL")
                bevel.width=.005
                bevel.segments=2
            legs.append((hip,knee,foot,y,s))

    def pose(frame, idle=False):
        phase=2*math.pi*((frame-31)/48 if idle else (frame-1)/24)
        bob=.002*math.sin(phase) if idle else .004*(1-math.cos(phase*2))
        root.location.z=bob
        root.keyframe_insert(data_path="location",frame=frame)
        for hip,knee,foot,y,s in legs:
            offset=0 if (y<0 and s<0) or (y>0 and s>0) else math.pi
            t=phase+offset
            target_y=.004*math.sin(phase) if idle else .065*math.cos(t)
            lift=0 if idle else .045*max(0,math.sin(t))**1.5
            dz=.075+lift-(.66+bob)
            distance=math.sqrt(target_y**2+dz**2)
            angle=math.atan2(target_y,-dz)
            c=max(-1,min(1,(.30**2+distance**2-.29**2)/(2*.30*distance)))
            a=angle+(1 if y<0 else -1)*math.acos(c)
            b=math.atan2(target_y-.30*math.sin(a),-(dz+.30*math.cos(a)))-a
            hip.rotation_euler.x=a
            knee.rotation_euler.x=b
            foot.rotation_euler.x=-a-b
            for obj in (hip,knee,foot):
                obj.keyframe_insert(data_path="rotation_euler",frame=frame)
        headpivot.rotation_euler.x=.018*math.sin(phase) if idle else .025*math.sin(phase)
        headpivot.rotation_euler.z=.025*math.sin(phase) if idle else 0
        headpivot.keyframe_insert(data_path="rotation_euler",frame=frame)
        tail.rotation_euler.y=.13*math.sin(phase*2)
        tail.keyframe_insert(data_path="rotation_euler",frame=frame)

    for f in range(1,26,2):
        pose(f)
    for f in range(31,80,3):
        pose(f,True)
    pose(79,True)
    for ob in bpy.data.objects:
        if ob.animation_data and ob.animation_data.action:
            action=ob.animation_data.action
            try:
                for fc in action.fcurves:
                    for key in fc.keyframe_points:
                        key.interpolation='LINEAR'
            except AttributeError:
                pass
    scene.frame_set(1)
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},
            "notes":"Cream ranch goat with topology-colored chestnut patches, lateral amber eyes, swept horns and individually split hooves. Hierarchical articulated legs use sampled two-bone IK for planted stance and lifted swing; head, ears, beard and horns inherit body/head motion."}
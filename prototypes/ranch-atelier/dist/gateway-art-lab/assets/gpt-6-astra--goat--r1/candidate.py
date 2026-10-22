import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    def material(name, color, roughness=.75):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color, 1)
        p.inputs['Roughness'].default_value = roughness
        return m

    cream = material('Warm ivory coat', (.78, .69, .49))
    brown = material('Chestnut coat markings', (.29, .115, .045))
    dark = material('Charcoal cloven horn', (.055, .042, .032))
    horn = material('Natural honey horn', (.37, .28, .15))
    inner = material('Warm ear interior', (.49, .27, .20))
    nose = material('Soft umber nose', (.14, .085, .055))
    iris = material('Amber eyes', (.68, .39, .08), .32)
    black = material('Horizontal pupils', (.012, .009, .006), .25)
    white = material('Eye glints', (.96, .92, .75), .25)

    def empty(name, parent=None, location=(0,0,0)):
        o = bpy.data.objects.new(name, None)
        scene.collection.objects.link(o)
        o.location = location
        o.parent = parent
        o.rotation_mode = 'XYZ'
        return o

    root = empty('Goat body motion')

    def mesh(name, verts, faces, mats, parent=None, inds=None):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.materials.clear()
        for m in mats:
            me.materials.append(m)
        me.update()
        o = bpy.data.objects.new(name, me)
        scene.collection.objects.link(o)
        o.parent = parent
        for i,p in enumerate(me.polygons):
            p.use_smooth = True
            if inds:
                p.material_index = inds[i]
        return o

    def ellipsoid(name, loc, scale, mat, parent=None, segments=20, rings=12):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(0,0,0))
        o = bpy.context.object
        o.name = name
        o.parent = parent
        o.location = loc
        o.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.use_smooth = True
        return o

    def tube(name, points, radii, mat, parent=None, sides=12):
        verts = []
        for i,co in enumerate(points):
            p = Vector(co)
            t = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(0,i-1)])
            t.normalize()
            axis = Vector((1,0,0))
            if abs(t.dot(axis)) > .92:
                axis = Vector((0,1,0))
            u = t.cross(axis).normalized()
            v = t.cross(u).normalized()
            r = radii[i]
            a,b = r if isinstance(r,tuple) else (r,r)
            for j in range(sides):
                th = 2*math.pi*j/sides
                verts.append(p + u*(a*math.cos(th)) + v*(b*math.sin(th)))
        faces = [tuple(reversed(range(sides)))]
        for i in range(len(points)-1):
            for j in range(sides):
                k = i*sides+j
                faces.append((k,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,k+sides))
        faces.append(tuple((len(points)-1)*sides+j for j in range(sides)))
        return mesh(name, verts, faces, [mat], parent)

    # A continuous rounded rib cage with integrated chest and rump.
    sections = [
        (-.355,.035,.06,.70),(-.315,.13,.18,.69),
        (-.25,.195,.225,.665),(-.14,.219,.239,.655),
        (0,.227,.24,.65),(.14,.223,.234,.66),
        (.265,.19,.205,.68),(.34,.12,.15,.69),(.375,.025,.055,.70)]
    n = 32
    verts = []
    for y,rx,rz,z in sections:
        for j in range(n):
            t = 2*math.pi*j/n
            verts.append((rx*math.cos(t),y,z+rz*math.sin(t)))
    faces = [tuple(reversed(range(n)))]
    inds = [0]
    for i in range(len(sections)-1):
        ym = (sections[i][0]+sections[i+1][0])/2
        for j in range(n):
            t = 2*math.pi*(j+.5)/n
            faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
            # Broad, asymmetric chestnut saddle and rump patches.
            patch = ((ym-.15)/.19)**2 + ((math.sin(t)-.33)/.94)**2 < 1
            patch = patch and math.cos(t) > -.68
            if ym < -.18 and math.cos(t) < -.35 and math.sin(t) > -.45:
                patch = True
            inds.append(1 if patch else 0)
    faces.append(tuple((len(sections)-1)*n+j for j in range(n)))
    inds.append(0)
    mesh('Continuous cream and chestnut torso', verts, faces, [cream,brown], root, inds)

    tube('Rising muscular neck',
         [(0,-.255,.66),(0,-.29,.77),(0,-.33,.88),(0,-.365,.975)],
         [(.15,.145),(.142,.132),(.112,.112),(.09,.085)],cream,root,20)
    tube('Chest throat contour',[(0,-.34,.70),(0,-.395,.80),(0,-.405,.91)],
         [.075,.077,.05],cream,root,16)

    head = empty('Head nod pivot',root,(0,-.36,.965))
    ellipsoid('Angular soft goat skull',(0,-.005,.035),(.127,.117,.145),cream,head)
    tube('Tapered face bridge',
         [(0,-.045,.075),(0,-.095,.027),(0,-.145,-.035),(0,-.17,-.065)],
         [(.097,.098),(.084,.091),(.063,.076),(.048,.062)],cream,head,20)
    ellipsoid('Muzzle soft pad',(0,-.171,-.067),(.071,.042,.045),nose,head)
    ellipsoid('Lower jaw',(0,-.11,-.083),(.067,.07,.032),cream,head)
    for s in (-1,1):
        ellipsoid('Nostril', (s*.041,-.206,-.058),(.014,.006,.009),dark,head,12,8)
        # Eyes sit on the lateral planes rather than the front of the muzzle.
        ellipsoid('Dark eye rim',(s*.111,-.048,.057),(.024,.039,.034),nose,head,16,10)
        ellipsoid('Amber lateral eye',(s*.128,-.053,.060),(.012,.029,.025),iris,head,16,10)
        ellipsoid('Horizontal rectangular pupil',(s*.139,-.057,.060),(.004,.022,.007),black,head,12,8)
        ellipsoid('Eye highlight',(s*.141,-.068,.070),(.003,.005,.005),white,head,10,6)
        tube('Raised brow',[(s*.097,-.082,.088),(s*.119,-.052,.095),(s*.112,-.022,.089)],
             [.012,.014,.009],cream,head,10)
        # Leaf-shaped ears: a convex shell and a recessed inner leaf.
        outline = [(s*.09,.012,.092),(s*.16,.01,.13),(s*.25,.025,.128),
                   (s*.292,.039,.097),(s*.248,.043,.059),(s*.17,.033,.055)]
        ev = outline + [(s*.196,-.006,.092),(s*.193,.051,.093)]
        ef = []
        for j in range(6):
            ef.append((6,j,(j+1)%6))
            ef.append((7,(j+1)%6,j))
        mesh('Leaf ear',ev,ef,[cream],head)
        vi = [(s*.139,.001,.092),(s*.186,.005,.116),(s*.257,.025,.101),
              (s*.229,.025,.075),(s*.174,.014,.074),(s*.195,-.008,.093)]
        mesh('Inset ear velvet',vi,[(5,j,(j+1)%5) for j in range(5)],[inner],head)
        tube('Swept curved horn',
             [(s*.071,.018,.137),(s*.078,.025,.19),(s*.085,.044,.25),
              (s*.09,.075,.303),(s*.092,.115,.341),(s*.09,.155,.354)],
             [.038,.034,.028,.022,.013,.0025],horn,head,14)
        # Small growth collars emphasize the horn bases.
        for k in range(3):
            ellipsoid('Horn growth ridge',(s*(.071+k*.002),.018+k*.004,.145+k*.014),
                      (.039-k*.0018,.036-k*.002,.007),horn,head,14,6)

    tube('Pointed flowing beard',
         [(0,-.112,-.095),(0,-.119,-.138),(0,-.102,-.193),(0,-.083,-.233)],
         [(.035,.045),(.032,.035),(.019,.021),.0015],brown,head,12)
    for s in (-1,1):
        tube('Beard side lock',[(s*.025,-.103,-.10),(s*.029,-.105,-.153),(s*.016,-.086,-.20)],
             [.016,.014,.0015],cream,head,8)

    tail = empty('Tail wag pivot',root,(0,.337,.762))
    tube('Upright short tail',[(0,0,0),(0,.075,.035),(0,.12,.094),(0,.135,.145)],
         [.047,.04,.028,.009],cream,tail,12)
    tube('Tail chestnut tip',[(0,.111,.082),(0,.13,.12),(0,.135,.152)],
         [.028,.02,.002],brown,tail,12)

    def hoof_piece(name,loc,parent):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.object
        o.name = name
        o.parent = parent
        o.location = loc
        o.scale = (.044,.114,.074)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o.data.materials.append(dark)
        bevel = o.modifiers.new('Rounded hoof edges','BEVEL')
        bevel.width = .009
        bevel.segments = 2
        o.modifiers.new('Weighted hoof normals','WEIGHTED_NORMAL')
        return o

    legs = []
    for front in (True,False):
        y = -.225 if front else .245
        x = .143 if front else .15
        hipz = .665
        L1,L2 = (.295,.30)
        for s in (-1,1):
            label = ('Front' if front else 'Rear')+(' left' if s<0 else ' right')
            hip = empty(label+' shoulder joint',root,(s*x,y,hipz))
            knee = empty(label+' knee joint',hip,(0,0,-L1))
            foot = empty(label+' ankle joint',knee,(0,0,-L2))
            if front:
                radii = [.075,.066,.046,.035]
            else:
                radii = [.09,.079,.05,.035]
            tube(label+' upper leg',[(0,0,.025),(0,0,-.08),(0,0,-.21),(0,0,-L1)],
                 radii,brown if not front and s==1 else cream,hip,14)
            ellipsoid(label+' knee',(0,0,0),(.038,.039,.044),cream,knee,14,8)
            tube(label+' tapered cannon',[(0,0,0),(0,0,-.08),(0,0,-.235),(0,0,-L2)],
                 [.033,.027,.023,.031],cream,knee,12)
            ellipsoid(label+' fetlock',(0,0,.006),(.038,.04,.047),cream,foot,14,8)
            for half in (-1,1):
                hoof_piece(label+' cloven toe '+str(half),(half*.025,-.017,-.037),foot)
            legs.append((hip,knee,foot,y,hipz,L1,L2,front,s))

    # Analytic two-bone IK baked to object transforms. The feet remain flat,
    # with stationary height during stance and a smooth lifted return.
    for f in list(range(1,26))+list(range(31,80)):
        walk = f<=25
        t = (f-1)/24 if walk else (f-31)/48
        bob = .004*math.cos(4*math.pi*t) if walk else .0025*math.sin(2*math.pi*t)
        root.location.z = bob
        root.keyframe_insert(data_path='location',frame=f)
        head.rotation_euler = (
            .025*math.sin(2*math.pi*t) if walk else .035*math.sin(2*math.pi*t),
            .012*math.sin(2*math.pi*t),0)
        head.keyframe_insert(data_path='rotation_euler',frame=f)
        tail.rotation_euler.y = .11*math.sin(2*math.pi*t)*(1 if walk else .55)
        tail.keyframe_insert(data_path='rotation_euler',frame=f)
        for hip,knee,foot,y,hz,a,b,front,s in legs:
            phase = (t + (0 if (front and s<0) or (not front and s>0) else .5))%1
            if walk:
                if phase<.6:
                    dy = -.083+.166*(phase/.6)
                    lift = 0
                else:
                    q = (phase-.6)/.4
                    dy = .083*math.cos(math.pi*q)
                    lift = .065*math.sin(math.pi*q)**2
            else:
                dy,lift = 0,0
            dz = .074+lift-hz-bob
            d = math.sqrt(dy*dy+dz*dz)
            d = min(d,a+b-.0001)
            along = (a*a-b*b+d*d)/(2*d)
            height = math.sqrt(max(0,a*a-along*along))
            uy,uz = dy/d,dz/d
            sign = 1 if front else -1
            ky = along*uy + sign*height*(-uz)
            kz = along*uz + sign*height*uy
            r1 = math.atan2(ky,-kz)
            r2 = math.atan2(dy-ky,-(dz-kz))
            hip.rotation_euler.x = r1
            knee.rotation_euler.x = r2-r1
            foot.rotation_euler.x = -r2
            for o in (hip,knee,foot):
                o.keyframe_insert(data_path='rotation_euler',frame=f)

    scene.frame_set(1)
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},
            "notes":"Cream ranch goat with chestnut saddle, lateral amber slit eyes, swept horns, leaf ears, beard and eight separated cloven toes. Baked two-segment leg articulation with flat planted stance feet; head and tail inherit body motion. Metres, front negative Y."}
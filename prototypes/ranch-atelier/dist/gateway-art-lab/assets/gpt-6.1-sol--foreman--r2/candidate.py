import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    def material(name, color, roughness=0.65, metallic=0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color, 1)
        p.inputs['Roughness'].default_value = roughness
        p.inputs['Metallic'].default_value = metallic
        return m

    skin = material('Sun-weathered ochre skin', (.56,.295,.155))
    shadow = material('Warm skin creases', (.32,.125,.064))
    shirt = material('Ivory cotton', (.76,.705,.535))
    stitch = material('Cotton seams and stitching', (.48,.405,.28))
    red = material('Brick red neckerchief', (.55,.067,.043))
    red_dark = material('Neckerchief fold shade', (.33,.027,.018))
    leather = material('Oxblood harness leather', (.125,.035,.021), .42)
    edge = material('Leather cut edges', (.285,.124,.057), .59)
    metal = material('Worn brass', (.53,.36,.13), .3, .72)
    pants = material('Midnight denim', (.027,.045,.066))
    denim = material('Denim raised seams', (.065,.086,.108))
    bootmat = material('Dark brown boot leather', (.073,.045,.028), .4)
    sole = material('Boot soles', (.025,.023,.021), .78)
    hair = material('Deep chestnut hair', (.053,.023,.012), .62)
    hair_high = material('Hair sculpt ridges', (.102,.044,.019), .66)
    white = material('Warm eye whites', (.79,.77,.65), .3)
    iris = material('Hazel irises', (.19,.25,.15), .35)
    pupil = material('Pupils and mouth line', (.016,.012,.009), .45)
    lip = material('Muted lips', (.41,.184,.109), .65)

    armdata = bpy.data.armatures.new('Foreman skeleton')
    rig = bpy.data.objects.new('Foreman | articulated ranch worker', armdata)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name, head, tail, parent=None):
        b = armdata.edit_bones.new(name)
        b.head, b.tail = head, tail
        if parent:
            b.parent = armdata.edit_bones[parent]
        return b

    bone('root',(0,0,.05),(0,0,.25))
    bone('pelvis',(0,0,.90),(0,0,1.04),'root')
    bone('spine',(0,0,1.04),(0,0,1.27),'pelvis')
    bone('chest',(0,0,1.27),(0,0,1.48),'spine')
    bone('neck',(0,0,1.48),(0,0,1.59),'chest')
    bone('head',(0,0,1.59),(0,0,1.82),'neck')
    for s, suffix in [(1,'L'),(-1,'R')]:
        bone('thigh.'+suffix,(s*.105,0,.96),(s*.115,.012,.55),'pelvis')
        bone('shin.'+suffix,(s*.115,.012,.55),(s*.12,0,.16),'thigh.'+suffix)
        bone('foot.'+suffix,(s*.12,0,.16),(s*.12,-.145,.065),'shin.'+suffix)
        bone('upper_arm.'+suffix,(s*.225,0,1.435),(s*.335,-.005,1.175),'chest')
        bone('forearm.'+suffix,(s*.335,-.005,1.175),(s*.388,-.018,.975),'upper_arm.'+suffix)
        bone('hand.'+suffix,(s*.388,-.018,.975),(s*.40,-.027,.888),'forearm.'+suffix)
        for j in range(4):
            y = -.063+j*.023
            x = s*(.403 + (.008 if j in [1,2] else 0))
            length = [.069,.082,.076,.059][j]
            bone('finger%d.%s'%(j,suffix),(x,y,.907),(x,y-.009,.907-length*.52),'hand.'+suffix)
            bone('tip%d.%s'%(j,suffix),(x,y-.009,.907-length*.52),(x-s*.009,y-.023,.907-length),'finger%d.%s'%(j,suffix))
        bone('thumb.'+suffix,(s*.371,-.058,.95),(s*.359,-.082,.913),'hand.'+suffix)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.show_in_front = True

    def mesh(name, verts, faces, mat, weights=None, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        ob.data.materials.append(mat)
        if smooth:
            for p in me.polygons:
                p.use_smooth = True
        if weights:
            groups = {}
            for i, w in enumerate(weights):
                if isinstance(w, str):
                    w = {w:1}
                for b, v in w.items():
                    if v > 0:
                        if b not in groups:
                            groups[b] = ob.vertex_groups.new(name=b)
                        groups[b].add([i],v,'REPLACE')
            mod = ob.modifiers.new('Deform with foreman skeleton','ARMATURE')
            mod.object = rig
        return ob

    def rigid(ob, b):
        vg = ob.vertex_groups.new(name=b)
        vg.add(list(range(len(ob.data.vertices))),1,'REPLACE')
        mod = ob.modifiers.new('Follow '+b,'ARMATURE')
        mod.object = rig
        return ob

    def loft(name, rings, mat, bind, n=12, caps=True):
        verts, faces, weights = [], [], []
        for i, r in enumerate(rings):
            x,y,z,rx,ry = r[:5]
            w = bind(i,r) if callable(bind) else bind
            for k in range(n):
                a = 2*math.pi*k/n
                verts.append((x+rx*math.sin(a),y-ry*math.cos(a),z))
                weights.append(w)
            if i:
                for k in range(n):
                    a=(i-1)*n+k
                    b=(i-1)*n+(k+1)%n
                    faces.append((a,b,i*n+(k+1)%n,i*n+k))
        if caps:
            faces.append(tuple(reversed(range(n))))
            faces.append(tuple((len(rings)-1)*n+k for k in range(n)))
        return mesh(name,verts,faces,mat,weights)

    def path(name, pts, radii, mat, b, n=7):
        verts, faces = [], []
        for i,p in enumerate(pts):
            p=Vector(p)
            tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])
            tangent.normalize()
            ref=Vector((0,1,0))
            if abs(tangent.dot(ref))>.95:
                ref=Vector((1,0,0))
            u=tangent.cross(ref).normalized()
            v=tangent.cross(u).normalized()
            rr=radii[i] if isinstance(radii,list) else radii
            for k in range(n):
                a=k*2*math.pi/n
                verts.append(p+rr*(math.cos(a)*u+math.sin(a)*v))
            if i:
                for k in range(n):
                    faces.append(((i-1)*n+k,(i-1)*n+(k+1)%n,i*n+(k+1)%n,i*n+k))
        faces.extend([tuple(reversed(range(n))),tuple((len(pts)-1)*n+k for k in range(n))])
        return mesh(name, verts, faces, mat, [b]*len(verts))

    def ellipsoid(name, loc, scale, mat, b, segments=16, rings=10):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=loc)
        ob=bpy.context.object
        ob.name=name
        ob.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ob.data.materials.append(mat)
        for p in ob.data.polygons:
            p.use_smooth=True
        if b:
            rigid(ob,b)
        return ob

    def box(name,loc,scale,mat,b,bevel=.003):
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
        ob=bpy.context.object
        ob.name=name
        ob.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ob.data.materials.append(mat)
        if bevel:
            mod=ob.modifiers.new('Soft constructed edges','BEVEL')
            mod.width=bevel
            mod.segments=2
        if b:
            rigid(ob,b)
        return ob

    def sheet(name, verts, faces, mat, b, thickness=.002):
        ob=mesh(name,verts,faces,mat,[b]*len(verts),False)
        if thickness:
            m=ob.modifiers.new('Fabric thickness','SOLIDIFY')
            m.thickness=thickness
            m=ob.modifiers.new('Soft cloth edges','BEVEL')
            m.width=.0015
            m.segments=2
        return ob

    torso=[
        (0,.005,.965,.153,.095),(0,.005,1.015,.158,.099),
        (0,.008,1.08,.157,.103),(0,.012,1.17,.171,.109),
        (0,.013,1.29,.197,.118),(0,.014,1.39,.219,.115),
        (0,.014,1.445,.215,.098),(0,.012,1.48,.158,.077),
        (0,.006,1.505,.078,.062)]
    def torso_weight(i,r):
        z=r[2]
        t=max(0,min(1,(z-1.15)/.2))
        if z<1.08:
            return {'pelvis':.35,'spine':.65}
        return {'spine':1-t,'chest':t}
    loft('Shirt | shaped cotton torso',torso,shirt,torso_weight,24)
    loft('Neck',[(0,.009,1.475,.067,.059),(0,.009,1.54,.063,.056),
                  (0,.008,1.605,.074,.061)],skin,'neck',16)
    loft('Trouser seat',[(0,.008,.885,.152,.096),(0,.006,.935,.162,.103),
                        (0,.006,1.005,.158,.1)],pants,'pelvis',20)
    loft('Leather belt',[(0,.005,.982,.160,.102),(0,.005,1.011,.160,.102)],leather,'pelvis',32)
    box('Belt buckle',(0,-.103,.998),(.046,.012,.034),metal,'pelvis')
    box('Buckle inset',(0,-.111,.998),(.030,.004,.020),leather,'pelvis',.002)
    for x in [-.125,-.068,.068,.125]:
        y=-.101*math.sqrt(max(.01,1-(x/.162)**2))
        box('Belt keeper',(x,y-.003,.997),(.013,.011,.042),pants,'pelvis',.002)

    sheet('Button placket',[(-.013,-.096,1.01),(.013,-.096,1.01),
                            (.013,-.108,1.20),(-.013,-.108,1.20),
                            (.013,-.109,1.405),(-.013,-.109,1.405)],
          [(0,1,2,3),(3,2,4,5)],shirt,'chest')
    for z in [1.075,1.17,1.265,1.355]:
        ellipsoid('Bone shirt button',(0,-.119,z),(.007,.003,.007),stitch,'chest',12,6)
    for s in [-1,1]:
        path('Shirt side seam',[(s*.153,.012,1.02),(s*.165,.015,1.15),(s*.196,.015,1.34)],
             .0018,stitch,'spine')
        for j in range(3):
            z=1.035+j*.021
            path('Gather above belt',[(s*.035,-.100,z),(s*.085,-.092,z+.012),(s*.139,-.060,z+.004)],
                 [.0008,.003,.0008],shirt,'spine')
        sheet('Pointed open collar',[(s*.062,-.041,1.536),(s*.113,-.078,1.484),
                                     (s*.083,-.127,1.414),(s*.028,-.108,1.477)],
              [(0,1,2,3)],shirt,'chest',.004)

    loft('Scarf neck wrap',[(0,.007,1.49,.070,.063),(0,.006,1.521,.069,.062)],red,'neck',20)
    for s in [-1,1]:
        path('Scarf folded collar',[(s*.063,-.026,1.519),(s*.052,-.077,1.482),(s*.014,-.117,1.453)],
             [.011,.012,.013],red,'chest',8)
    loft('Scarf knot',[(0,-.124,1.411,.018,.013),(0,-.126,1.443,.026,.018),
                       (0,-.119,1.46,.019,.013)],red,'chest',8)
    sheet('Long folded neckerchief',
          [(-.012,-.125,1.424),(.015,-.127,1.423),(.034,-.132,1.211),
           (.004,-.139,1.116),(-.042,-.128,1.167),(-.027,-.131,1.28),
           (0,-.146,1.285),(0,-.147,1.179)],
          [(0,1,6),(1,2,7,6),(2,3,7),(3,4,7),(4,5,6,7),(5,0,6)],red,'chest',.003)
    path('Scarf central fold',[(.004,-.146,1.414),(0,-.149,1.285),(.004,-.15,1.18)],
         [.001,.0025,.001],red_dark,'chest')
    sheet('Short scarf tail',[(-.015,-.12,1.422),(-.035,-.128,1.246),(-.062,-.124,1.20),
                              (-.078,-.117,1.253),(-.035,-.12,1.423)],
          [(0,1,2,3,4)],red_dark,'chest',.003)

    for s in [-1,1]:
        coords=[(s*.118,-.096,1.012),(s*.143,-.115,1.20),(s*.159,-.103,1.40),
                (s*.16,-.060,1.475),(s*.147,.019,1.493),
                (s*.124,.086,1.422),(s*.08,.113,1.20),(s*.058,.102,1.013)]
        verts=[]
        for p in coords:
            verts.extend([(p[0]-.015,p[1],p[2]),(p[0]+.015,p[1],p[2])])
        sheet('Leather suspender',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(coords)-1)],
              leather,'chest',.004)
        for off in [-.011,.011]:
            path('Suspender edge stitching',[(x+off,y-.002 if y<0 else y+.002,z) for x,y,z in coords],
                 .0009,edge,'chest',5)
        for z in [1.18,1.36]:
            x=s*(.143 if z<1.3 else .156)
            y=-.122 if z<1.3 else -.113
            for dx in [-.016,.016]:
                box('Brass buckle side',(x+dx,y,z),(.004,.006,.043),metal,'chest',.001)
            for dz in [-.021,.021]:
                box('Brass buckle crossbar',(x,y,z+dz),(.035,.006,.004),metal,'chest',.001)
            box('Buckle tongue',(x,y-.003,z),(.003,.004,.033),metal,'chest',.001)
        for z in [1.045,1.075]:
            ellipsoid('Harness rivet',(s*.123,-.109,z),(.004,.002,.004),metal,'chest',10,6)

    for s,suffix in [(1,'L'),(-1,'R')]:
        thigh='thigh.'+suffix
        shin='shin.'+suffix
        foot='foot.'+suffix
        upper='upper_arm.'+suffix
        fore='forearm.'+suffix
        hand='hand.'+suffix
        def legw(i,r):
            z=r[2]
            t=max(0,min(1,(z-.49)/.13))
            return {thigh:t,shin:1-t}
        leg_rings=[
            (s*.12,.004,.16,.054,.060),(s*.122,.004,.205,.058,.062),
            (s*.12,.006,.30,.061,.064),(s*.115,.012,.43,.065,.067),
            (s*.114,.003,.515,.069,.068),(s*.115,-.009,.555,.073,.075),
            (s*.111,.003,.60,.074,.077),(s*.108,.006,.72,.080,.085),
            (s*.100,.006,.83,.087,.092),(s*.086,.006,.935,.083,.095)]
        loft('Tailored trouser leg '+suffix,leg_rings,pants,legw,16)
        for j,z in enumerate([.235,.48,.585,.79]):
            x=s*(.12 if z<.7 else .104)
            path('Denim compression fold',[(x-s*.048,-.037,z+.012),
                 (x,-(.065 if z<.5 else .078),z),(x+s*.047,-.041,z+.019)],
                 [.001,.004,.001],denim,shin if z<.53 else thigh,6)
        path('Outer felled trouser seam',[(s*.177,.01,.21),(s*.179,.015,.43),
                                        (s*.183,.015,.60),(s*.19,.018,.85),(s*.163,.018,.97)],
             .0015,denim,thigh,5)
        path('Front pocket edge',[(s*.146,-.054,.97),(s*.146,-.079,.918),(s*.11,-.088,.883)],
             .0023,denim,'pelvis')
        sheet('Back patch pocket',[(s*.05,.105,.94),(s*.142,.075,.94),
                                   (s*.139,.088,.845),(s*.098,.11,.824),(s*.057,.111,.85)],
              [(0,1,2,3,4)],pants,'pelvis',.002)
        outline=[(-.048,.067),(.048,.067),(.058,.025),(.061,-.07),
                 (.061,-.157),(.041,-.190),(-.036,-.194),(-.06,-.169),
                 (-.064,-.064),(-.055,.029)]
        def boot_outline(name, levels, mat):
            verts=[]; faces=[]
            for z,sc,dy in levels:
                for x,y in outline:
                    verts.append((s*.12+x*sc,y*sc+dy,z))
            n=len(outline)
            for i in range(len(levels)-1):
                for k in range(n):
                    faces.append((i*n+k,i*n+(k+1)%n,(i+1)*n+(k+1)%n,(i+1)*n+k))
            faces.append(tuple(reversed(range(n))))
            faces.append(tuple((len(levels)-1)*n+k for k in range(n)))
            return mesh(name,verts,faces,mat,[foot]*len(verts))
        boot_outline('Layered boot outsole '+suffix,[(.012,1.03,0),(.031,1.04,0),(.039,1,0)],sole)
        boot_outline('Shaped boot vamp '+suffix,[(.037,.99,0),(.067,.99,.003),(.092,.89,.01),
                                               (.115,.68,.021)],bootmat)
        loft('Boot ankle shaft '+suffix,[(s*.12,.017,.077,.052,.064),(s*.12,.017,.126,.055,.064),
                                        (s*.12,.017,.18,.052,.057),(s*.12,.017,.216,.054,.058)],
             bootmat,foot,16)
        box('Stacked heel '+suffix,(s*.12,.029,.019),(.100,.073,.036),bootmat,foot,.005)
        for xx in [-.048,.048]:
            path('Boot side stitched seam',[(s*.12+xx,.015,.085),(s*.12+xx,.021,.15),(s*.12+xx,.021,.207)],
                 .0015,edge,foot)
        path('Toe cap seam',[(s*.12-.053,-.121,.073),(s*.12-.03,-.135,.091),
                            (s*.12,-.139,.096),(s*.12+.03,-.135,.091),(s*.12+.053,-.121,.073)],
             .0012,edge,foot)
        box('Boot pull tab',(s*.12,.076,.201),(.025,.009,.038),bootmat,foot,.002)

        sleeve=[(s*.222,.012,1.444,.069,.086),(s*.26,.009,1.411,.077,.085),
                (s*.284,.006,1.351,.073,.078),(s*.308,.001,1.286,.066,.070),
                (s*.321,-.002,1.235,.061,.065),(s*.335,-.004,1.195,.063,.067)]
        loft('Shirt sleeve '+suffix,sleeve,shirt,upper,16)
        loft('Rolled sleeve cuff '+suffix,[(s*.325,-.003,1.249,.066,.072),
                 (s*.335,-.004,1.215,.073,.078),(s*.340,-.004,1.183,.069,.074),
                 (s*.337,-.004,1.177,.061,.064)],shirt,upper,16)
        path('Cuff turned hem',[(s*(.337+.065*math.sin(k*math.pi/8)),
                                -.004-.073*math.cos(k*math.pi/8),1.19) for k in range(17)],
             .002,stitch,upper)
        for j in range(3):
            path('Sleeve cloth fold',[(s*.255,-.061,1.40-j*.055),(s*.282,-.079,1.38-j*.055),
                                     (s*.309,-.055,1.365-j*.055)],
                 [.001,.004,.001],shirt,upper)
        def armw(i,r):
            t=max(0,min(1,(r[2]-1.15)/.07))
            return {upper:t,fore:1-t}
        loft('Sculpted bare forearm '+suffix,[(s*.336,-.005,1.205,.052,.054),
                 (s*.344,-.01,1.16,.052,.053),(s*.359,-.017,1.108,.049,.051),
                 (s*.375,-.019,1.05,.037,.04),(s*.387,-.019,.99,.029,.031),
                 (s*.389,-.019,.968,.028,.030)],skin,armw,14)
        path('Forearm tendon '+suffix,[(s*.368,-.053,1.097),(s*.382,-.048,1.031),(s*.389,-.044,.98)],
             [.001,.003,.001],skin,fore)
        loft('Palm '+suffix,[(s*.389,-.02,.983,.028,.030),(s*.395,-.023,.949,.032,.047),
                             (s*.402,-.025,.915,.031,.049),(s*.403,-.024,.894,.026,.044)],
             skin,hand,12)
        for j in range(4):
            y=-.063+j*.023
            x=s*(.403+(.008 if j in [1,2] else 0))
            length=[.069,.082,.076,.059][j]
            pts=[(x,y,.914),(x+s*.004,y-.003,.89),
                 (x+s*.001,y-.009,.907-length*.52),
                 (x-s*.007,y-.021,.914-length),(x-s*.012,y-.023,.907-length)]
            verts=[]; faces=[]; ws=[]
            for k,p in enumerate(pts):
                rad=[.0115,.012,.0105,.009,.006][k]
                for a in range(8):
                    an=2*math.pi*a/8
                    verts.append((p[0]+rad*math.cos(an),p[1]+rad*math.sin(an),p[2]))
                    t=max(0,min(1,(k-1)/2))
                    ws.append({'finger%d.%s'%(j,suffix):1-t,'tip%d.%s'%(j,suffix):t})
                if k:
                    for a in range(8):
                        faces.append(((k-1)*8+a,(k-1)*8+(a+1)%8,k*8+(a+1)%8,k*8+a))
            faces.extend([tuple(reversed(range(8))),tuple(32+k for k in range(8))])
            mesh('Articulated finger %d %s'%(j,suffix),verts,faces,skin,ws)
            ellipsoid('Finger knuckle',(x+s*.007,y-.006,.886),(.010,.011,.010),skin,'finger%d.%s'%(j,suffix),10,6)
            ellipsoid('Fingernail',(x-s*.013,y-.027,.919-length),(.004,.007,.009),shirt,'tip%d.%s'%(j,suffix),10,6)
        path('Thumb '+suffix,[(s*.372,-.052,.955),(s*.356,-.074,.933),
                              (s*.354,-.084,.913),(s*.368,-.087,.901)],
             [.017,.015,.013,.009],skin,'thumb.'+suffix,10)
        path('Palm lifeline',[(s*.374,-.065,.946),(s*.382,-.071,.930),(s*.385,-.069,.913)],
             .0012,shadow,hand,5)

    n=20
    headrings=[
        (1.568,.052,.048,.005),(1.588,.075,.060,-.005),
        (1.613,.091,.073,-.002),(1.65,.098,.078,.002),
        (1.689,.108,.078,.004),(1.724,.105,.077,.005),
        (1.757,.103,.076,.009),(1.79,.098,.074,.012),
        (1.816,.078,.060,.014),(1.825,.035,.030,.014)]
    verts=[]; faces=[]
    for z,rx,ry,cy in headrings:
        for k in range(n):
            a=2*math.pi*k/n
            xx=rx*math.sin(a)
            yy=cy-ry*math.cos(a)
            if math.cos(a)>.80:
                yy=cy-ry*(.92+.08*math.cos(a))
            verts.append((xx,yy,z))
        i=len(verts)//n-1
        if i:
            for k in range(n):
                faces.append(((i-1)*n+k,(i-1)*n+(k+1)%n,i*n+(k+1)%n,i*n+k))
    faces.extend([tuple(reversed(range(n))),tuple((len(headrings)-1)*n+k for k in range(n))])
    mesh('Sculpted angular head',verts,faces,skin,['head']*len(verts))
    loft('Squared chin',[(0,-.049,1.581,.040,.024),(0,-.065,1.599,.052,.027),
                         (0,-.066,1.623,.053,.023),(0,-.058,1.637,.040,.018)],skin,'head',12)
    for s in [-1,1]:
        ellipsoid('High cheek plane',(s*.069,-.061,1.68),(.034,.020,.027),skin,'head',12,8)
        ellipsoid('Muzzle plane',(s*.025,-.076,1.645),(.031,.015,.023),skin,'head',12,8)
        ellipsoid('Ear outer',(s*.108,.006,1.707),(.021,.020,.037),skin,'head',14,10)
        ellipsoid('Ear concha',(s*.117,-.010,1.707),(.011,.008,.023),shadow,'head',12,8)
        path('Ear inner helix',[(s*.115,-.018,1.687),(s*.126,-.017,1.711),
                               (s*.118,-.015,1.732),(s*.109,-.017,1.723)],
             [.003,.004,.004,.002],skin,'head',7)
        ellipsoid('Ear tragus',(s*.106,-.020,1.704),(.006,.007,.011),skin,'head',10,6)
    nv=[(-.015,-.075,1.745),(.015,-.075,1.745),(-.014,-.101,1.704),(.014,-.101,1.704),
        (-.022,-.127,1.677),(.022,-.127,1.677),(-.014,-.137,1.666),(.014,-.137,1.666),
        (-.027,-.101,1.660),(.027,-.101,1.660),(0,-.12,1.655),(0,-.077,1.657)]
    nf=[(0,1,3,2),(2,3,5,4),(4,5,7,6),(0,2,4,8),(1,9,5,3),
        (8,4,6,10),(10,7,5,9),(8,10,11),(10,9,11),(6,7,10)]
    mesh('Strong sculpted nose',nv,nf,skin,['head']*len(nv))
    for s in [-1,1]:
        ellipsoid('Nostril',(s*.018,-.115,1.660),(.008,.006,.004),shadow,'head',12,6)
        cx=s*.047
        ellipsoid('Eyeball',(cx,-.075,1.716),(.027,.014,.0155),white,'head',20,12)
        ellipsoid('Hazel iris',(cx-s*.002,-.0883,1.716),(.010,.0026,.010),iris,'head',16,8)
        ellipsoid('Pupil',(cx-s*.002,-.0905,1.716),(.0048,.0015,.0065),pupil,'head',12,8)
        ellipsoid('Eye glint',(cx-s*.002-.002,-.092,1.72),(.002,.001,.002),white,'head',8,6)
        path('Upper eyelid',[(cx-.026,-.077,1.715),(cx-.014,-.086,1.727),
                             (cx+.005,-.087,1.729),(cx+.025,-.076,1.719)],
             [.003,.004,.004,.003],skin,'head',8)
        path('Lower eyelid',[(cx-.026,-.077,1.715),(cx-.009,-.085,1.705),
                             (cx+.012,-.084,1.707),(cx+.025,-.076,1.719)],
             [.0025,.003,.003,.0025],skin,'head',8)
        path('Under eye crease',[(cx-.018,-.077,1.697),(cx+.003,-.080,1.695),(cx+.022,-.073,1.701)],
             [.0007,.0013,.0005],shadow,'head',5)
        path('Heavy brow ridge',[(s*.016,-.077,1.741),(s*.045,-.082,1.747),(s*.079,-.067,1.741)],
             [.011,.013,.007],skin,'head',8)
        path('Angular dark eyebrow',[(s*.018,-.088,1.747),(s*.043,-.093,1.752),(s*.077,-.078,1.745)],
             [.004,.007,.0025],hair,'head',7)
        path('Nasolabial fold',[(s*.031,-.093,1.664),(s*.044,-.088,1.647),(s*.043,-.083,1.631)],
             [.0008,.0014,.0006],shadow,'head',5)
    path('Upper lip', [(-.038,-.087,1.631),(-.019,-.094,1.635),(0,-.095,1.632),
                       (.018,-.094,1.636),(.038,-.087,1.632)],
         [.0015,.004,.003,.004,.0015],lip,'head',8)
    path('Resolute mouth line',[(-.039,-.089,1.63),(-.017,-.098,1.629),(0,-.099,1.628),
                                (.020,-.097,1.630),(.039,-.089,1.632)],.0017,pupil,'head',6)
    path('Lower lip',[(-.03,-.09,1.626),(0,-.097,1.623),(.03,-.091,1.627)],
         [.0015,.005,.0015],lip,'head',8)
    path('Chin cleft',[(-.016,-.091,1.605),(0,-.094,1.603),(.016,-.091,1.605)],
         [.0005,.0012,.0005],shadow,'head',5)
    for s in [-1,1]:
        for j in range(12):
            x=s*(.034+(j%4)*.012)
            z=1.60+(j//4)*.012
            y=-.077+max(0,abs(x)-.04)*.38
            path('Jaw stubble',[(x,y,z),(x+s*.001,y-.0005,z+.0035)],.00065,hair,'head',4)

    verts=[]; faces=[]
    count=32
    for row in range(5):
        t=row/4
        for k in range(count):
            a=2*math.pi*k/count
            front=math.cos(a)
            hairline=1.742+.032*max(front,0)-.014*max(-front,0)
            hairline+=.008*math.sin(a*3)*max(front,0)
            z=hairline+(1.835-hairline)*math.sin(t*math.pi/2)
            r=math.cos(t*math.pi/2)
            verts.append((.108*math.sin(a)*r,.013-.081*math.cos(a)*r,z))
            if row:
                faces.append(((row-1)*count+k,(row-1)*count+(k+1)%count,row*count+(k+1)%count,row*count+k))
    mesh('Sculpted swept hair cap',verts,faces,hair,['head']*len(verts))
    def hairlock(name, points, widths, depths, mat):
        vs=[]; fs=[]
        for i,p in enumerate(points):
            for j in range(8):
                a=2*math.pi*j/8
                vs.append((p[0]+widths[i]*math.cos(a),p[1]+depths[i]*math.sin(a),p[2]+depths[i]*.5*math.sin(a)))
            if i:
                for j in range(8):
                    fs.append(((i-1)*8+j,(i-1)*8+(j+1)%8,i*8+(j+1)%8,i*8+j))
        fs.extend([tuple(reversed(range(8))),tuple((len(points)-1)*8+j for j in range(8))])
        mesh(name,vs,fs,mat,['head']*len(vs))
    for j in range(7):
        x=-.079+j*.022
        hairlock('Broad swept forelock',
                 [(x,.006,1.814),(x-.009,-.034,1.838),(x+.017,-.065,1.832),
                  (x+.038,-.077,1.801),(x+.043,-.071,1.779)],
                 [.019,.024,.023,.017,.0015],[.010,.015,.014,.011,.001],hair if j%3 else hair_high)
    for s in [-1,1]:
        hairlock('Temple sweep',[(s*.084,.045,1.789),(s*.106,.009,1.784),
                                 (s*.100,-.036,1.757),(s*.091,-.043,1.737)],
                 [.015,.014,.012,.002],[.011,.011,.009,.001],hair)
        sheet('Trimmed sideburn',[(s*.096,-.032,1.759),(s*.108,-.018,1.75),
                                  (s*.104,-.023,1.713),(s*.094,-.037,1.722)],
              [(0,1,2,3)],hair,'head',.002)
        for j in range(3):
            path('Combed side hair ridge',[(s*(.062+j*.011),.06,1.799),
                                          (s*(.088+j*.004),.039,1.785),
                                          (s*(.099+j*.001),.013,1.761)],
                 [.001,.002,.0005],hair_high,'head',5)

    for pb in rig.pose.bones:
        pb.rotation_mode='XYZ'

    def key(name, frame, rot=(0,0,0), loc=None):
        p=rig.pose.bones[name]
        p.rotation_euler=rot
        p.keyframe_insert(data_path='rotation_euler',frame=frame)
        if loc is not None:
            p.location=loc
            p.keyframe_insert(data_path='location',frame=frame)

    for frame in range(1,26,3):
        phase=2*math.pi*(frame-1)/24
        wave=math.cos(phase)
        key('pelvis',frame,(0,.025*math.sin(phase),.035*wave),(0,.008*math.cos(2*phase),0))
        key('spine',frame,(.015,0,-.022*wave))
        key('chest',frame,(.01,0,-.045*wave))
        key('neck',frame,(-.015,0,.012*wave))
        key('head',frame,(0,.016*math.sin(phase),.018*wave))
        for s,suffix in [(1,'L'),(-1,'R')]:
            w=wave*s
            key('thigh.'+suffix,frame,(.37*w,0,s*.012))
            key('shin.'+suffix,frame,(-.10-.54*max(0,-w),0,0))
            key('foot.'+suffix,frame,(.09+.16*max(0,-w)-.10*max(0,w),0,0))
            key('upper_arm.'+suffix,frame,(-.27*w,0,s*.035))
            key('forearm.'+suffix,frame,(-.11-.07*max(0,w),0,0))
            key('hand.'+suffix,frame,(.035,0,-s*.035))
            for j in range(4):
                key('finger%d.%s'%(j,suffix),frame,(.025,s*.07,0))
                key('tip%d.%s'%(j,suffix),frame,(.025,s*.12,0))
            key('thumb.'+suffix,frame,(.03,0,s*.04))

    scene.frame_set(1)
    walk_start_rotations = {}
    for pb in rig.pose.bones:
        walk_start_rotations[pb.name] = pb.rotation_euler.copy()
    walk_start_pelvis_location = rig.pose.bones['pelvis'].location.copy()
    for pb in rig.pose.bones:
        pb.rotation_euler = walk_start_rotations[pb.name]
        pb.keyframe_insert(data_path='rotation_euler',frame=25)
    rig.pose.bones['pelvis'].location = walk_start_pelvis_location
    rig.pose.bones['pelvis'].keyframe_insert(data_path='location',frame=25)

    for frame in [31,43,55,67,79]:
        phase=2*math.pi*(frame-31)/48
        breath=math.sin(phase)
        key('pelvis',frame,(0,.007*breath,.008*breath),(0,.002*breath,0))
        key('spine',frame,(.006*breath,0,-.01*breath))
        key('chest',frame,(-.012*breath,0,.012*breath))
        key('neck',frame,(.006*breath,0,0))
        key('head',frame,(.012*breath,.018*breath,-.014*breath))
        for s,suffix in [(1,'L'),(-1,'R')]:
            key('thigh.'+suffix,frame,(0,0,s*.012))
            key('shin.'+suffix,frame,(-.025,0,0))
            key('foot.'+suffix,frame,(.025,0,0))
            key('upper_arm.'+suffix,frame,(.015*breath,0,s*(.028+.007*breath)))
            key('forearm.'+suffix,frame,(-.07-.012*breath,0,0))
            key('hand.'+suffix,frame,(.015*breath,0,-s*.025))
            key('thumb.'+suffix,frame,(.02*breath,0,s*.04))
            for j in range(4):
                key('finger%d.%s'%(j,suffix),frame,(.02,s*(.055+.025*breath),0))
                key('tip%d.%s'%(j,suffix),frame,(.02,s*(.10+.035*breath),0))
    scene.frame_set(1)
    bpy.context.view_layer.objects.active=rig
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},
            "notes":"1.85 m stylized ranch foreman. Skinned FK skeleton with articulated fingers; in-place looping walk and breathing idle. Layered cotton, folded scarf, stitched leather suspenders, sculpted angular face and swept hair. Front is -Y."}
import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 79

    def mat(name, color, rough=.65, metallic=0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value = (*color, 1)
        p.inputs['Roughness'].default_value = rough
        p.inputs['Metallic'].default_value = metallic
        return m

    skin = mat('Honey peach skin', (.66,.37,.20))
    blush = mat('Warm cheeks and inner ears', (.75,.30,.20))
    cream = mat('Warm cream cotton', (.89,.81,.61))
    teal = mat('Deep teal denim', (.025,.29,.28))
    seam = mat('Light teal stitching', (.22,.52,.44))
    red = mat('Tomato red bandana', (.78,.065,.035))
    hair = mat('Chestnut hair', (.105,.037,.018))
    hairlight = mat('Chestnut lock highlights', (.20,.075,.029))
    dark = mat('Espresso facial details', (.028,.014,.009))
    white = mat('Ivory eyes', (.97,.93,.82), .32)
    iris = mat('Hazel iris', (.26,.16,.047), .35)
    leather = mat('Cognac boot leather', (.20,.075,.027))
    sole = mat('Dark rubber soles', (.045,.033,.023))
    straw = mat('Golden woven straw', (.72,.47,.17))
    gold = mat('Brass hardware', (.69,.43,.12), .32, .65)
    metal = mat('Galvanized bucket', (.36,.48,.49), .32, .7)

    def parent(o, p):
        if p:
            mw = o.matrix_world.copy()
            o.parent = p
            o.matrix_world = mw
        return o

    def empty(name, loc, p=None):
        o = bpy.data.objects.new(name, None)
        scene.collection.objects.link(o)
        o.location = loc
        bpy.context.view_layer.update()
        parent(o,p)
        return o

    root = empty('Ranch worker ROOT', (0,0,0))
    body = empty('Body breathing pivot', (0,0,.55), root)
    head = empty('Head turn pivot', (0,0,.96), body)

    def finish(o,name,m,p=None,smooth=True):
        o.name=name
        o.data.materials.append(m)
        if smooth:
            for f in o.data.polygons:
                f.use_smooth=True
        bpy.context.view_layer.update()
        parent(o,p)
        return o

    def uv(name, loc, scale, m, p=None, seg=24, rings=16):
        seg=max(8,int(seg*.65))
        rings=max(5,int(rings*.65))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
        o=bpy.context.object
        o.scale=scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        return finish(o,name,m,p)

    def box(name,loc,scale,m,p=None,bev=.018):
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
        o=bpy.context.object
        o.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if bev:
            mod=o.modifiers.new('Soft constructed edges','BEVEL')
            mod.width=bev
            mod.segments=2
            o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
        return finish(o,name,m,p,False)

    def mesh(name,verts,faces,m,p=None,smooth=True):
        me=bpy.data.meshes.new(name)
        me.from_pydata(verts,[],faces)
        me.update()
        o=bpy.data.objects.new(name,me)
        scene.collection.objects.link(o)
        return finish(o,name,m,p,smooth)

    def tube(name,points,r,m,p=None,sides=8):
        sides=max(5,int(sides*.75))
        verts=[]
        for i,pt in enumerate(points):
            tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
            tangent.normalize()
            a=tangent.cross(Vector((0,1,0)))
            if a.length<.01:
                a=tangent.cross(Vector((1,0,0)))
            a.normalize()
            b=tangent.cross(a).normalized()
            for j in range(sides):
                verts.append(Vector(pt)+r*(math.cos(j*2*math.pi/sides)*a+math.sin(j*2*math.pi/sides)*b))
        faces=[]
        for i in range(len(points)-1):
            for j in range(sides):
                faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
        faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
        return mesh(name,verts,faces,m,p)

    def profile(name, levels, m, p=None, n=32, center=(0,0), cap=True):
        n=max(12,int(n*.75))
        v=[]
        for z,rx,ry in levels:
            for i in range(n):
                a=2*math.pi*i/n
                v.append((center[0]+rx*math.cos(a),center[1]+ry*math.sin(a),z))
        f=[]
        for k in range(len(levels)-1):
            for i in range(n):
                f.append((k*n+i,k*n+(i+1)%n,(k+1)*n+(i+1)%n,(k+1)*n+i))
        if cap:
            f.extend([tuple(reversed(range(n))),tuple((len(levels)-1)*n+i for i in range(n))])
        return mesh(name,v,f,m,p)

    profile('Cream shirt shaped torso',[(.51,.15,.105),(.57,.185,.13),(.73,.18,.125),(.85,.17,.105),(.91,.10,.08)],cream,body)
    uv('Neck',(0,0,.95),(.075,.07,.10),skin,body)
    profile('Overall hip shell',[(.46,.145,.105),(.49,.18,.126),(.60,.18,.13),(.64,.17,.125)],teal,body)
    box('Thick front overall bib',(0,-.123,.717),(.245,.045,.24),teal,body,.032)
    box('Back bib',(0,.119,.73),(.24,.035,.22),teal,body,.025)
    for s in [-1,1]:
        tube('Overall shoulder strap',[(s*.104,-.151,.79),(s*.112,-.11,.87),(s*.115,-.03,.905),(s*.115,.065,.88),(s*.105,.135,.78)],.023,teal,body)
        uv('Brass strap button',(s*.104,-.156,.79),(.015,.007,.015),gold,body,16,8)
    box('Bib pocket with thickness',(0,-.152,.685),(.132,.015,.091),teal,body,.015)
    tube('Pocket stitched U',[(-.056,-.162,.72),(-.054,-.163,.659),(0,-.164,.651),(.054,-.163,.659),(.056,-.162,.72)],.0028,seam,body,6)
    tube('Pocket upper seam',[(-.055,-.164,.721),(.055,-.164,.721)],.0025,seam,body,6)

    profile('Bandana neck wrap',[(.906,.088,.078),(.935,.087,.079),(.95,.072,.065)],red,body)
    verts=[(-.09,-.081,.929),(.09,-.081,.929),(0,-.155,.813),
           (-.09,-.093,.929),(.09,-.093,.929),(0,-.166,.813)]
    mesh('Bandana triangular kerchief',verts,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],red,body)
    tube('Kerchief cream edge',[(-.072,-.100,.914),(0,-.168,.83),(.072,-.100,.914)],.0027,cream,body,6)
    uv('Scarf side knot',(.09,-.04,.93),(.029,.026,.027),red,body)
    tail=uv('Scarf tied tail',(.123,-.024,.903),(.018,.015,.058),red,body,16,10)
    tail.rotation_euler[1]=-.55

    legs=[]
    for s,side in [(-1,'L'),(1,'R')]:
        leg=empty(side+' hip pivot',(s*.095,0,.51),body)
        legs.append(leg)
        profile(side+' denim leg',[(.18,.069,.074),(.24,.071,.078),(.36,.077,.084),(.49,.082,.088),(.53,.07,.075)],teal,leg,24,(s*.095,0))
        profile(side+' rolled trouser cuff',[(.20,.073,.079),(.225,.077,.082),(.248,.075,.081)],seam,leg,24,(s*.095,0))
        box(side+' boot sole',(s*.095,-.038,.029),(.155,.245,.052),sole,leg,.018)
        box(side+' boot rounded toe',(s*.095,-.062,.089),(.151,.207,.112),leather,leg,.041)
        profile(side+' boot shaft',[(.07,.069,.073),(.13,.065,.07),(.215,.062,.065),(.225,.067,.068)],leather,leg,24,(s*.095,.012))
        tube(side+' boot welt',[(s*.095-.063,-.116,.063),(s*.095-.065,-.148,.063),(s*.095,-.162,.063),(s*.095+.065,-.148,.063),(s*.095+.063,-.116,.063)],.0035,straw,leg,6)
        box(side+' boot pull tab',(s*.095,.077,.211),(.027,.018,.05),leather,leg,.006)

    arms=[]
    for s,side in [(-1,'L'),(1,'R')]:
        arm=empty(side+' shoulder pivot',(s*.174,0,.845),body)
        arms.append(arm)
        sleeve=uv(side+' cream short sleeve',(s*.224,0,.802),(.09,.088,.112),cream,arm)
        sleeve.rotation_euler[1]=-s*.38
        tube(side+' bare forearm',[(s*.25,0,.765),(s*.291,-.006,.70),(s*.325,-.022,.634)],.047,skin,arm,12)
        cuff=uv(side+' turned sleeve cuff',(s*.253,-.003,.757),(.068,.082,.035),cream,arm,20,10)
        cuff.rotation_euler[1]=-s*.35
        uv(side+' palm',(s*.337,-.03,.604),(.050,.037,.056),skin,arm,20,12)
        for j in range(4):
            x=s*(.307+j*.018)
            uv(side+' finger '+str(j),(x,-.047,.576+(.006 if j in (0,3) else 0)),(.011,.024,.026),skin,arm,12,8)
        thumb=uv(side+' thumb',(s*.300,-.058,.612),(.022,.024,.034),skin,arm,16,10)
        thumb.rotation_euler[1]=s*.5

    uv('Oversized shaped head',(0,-.005,1.15),(.283,.231,.277),skin,head,40,24)
    for s in [-1,1]:
        uv('Ear',(s*.281,0,1.135),(.052,.039,.071),skin,head,20,12)
        uv('Ear inner fold',(s*.303,-.033,1.135),(.024,.009,.042),blush,head,16,10)
        uv('Soft cheek',(s*.164,-.199,1.078),(.050,.009,.026),blush,head,20,10)
        uv('Eye white',(s*.103,-.222,1.173),(.054,.024,.064),white,head,24,16)
        uv('Hazel iris',(s*.101,-.245,1.17),(.032,.009,.043),iris,head,20,12)
        uv('Pupil',(s*.100,-.253,1.171),(.021,.006,.031),dark,head,20,12)
        uv('Eye glint',(s*.100-.009,-.260,1.186),(.009,.0035,.011),white,head,12,8)
        tube('Upper eyelid',[(s*.103-.049,-.233,1.19),(s*.103-.033,-.244,1.224),(s*.103,-.245,1.235),(s*.103+.033,-.239,1.22),(s*.103+.049,-.228,1.192)],.0065,hair,head)
        tube('Expressive eyebrow',[(s*.103-.046,-.207,1.258),(s*.103-.015,-.218,1.274),(s*.103+.018,-.214,1.271),(s*.103+.043,-.201,1.26)],.010,hair,head)
        for j in range(3):
            uv('Freckle',(s*(.141+j*.018),-.212+j*.004,1.102+(j%2)*.008),(.004,.003,.004),hairlight,head,8,6)
    uv('Button nose',(0,-.238,1.111),(.038,.033,.032),skin,head,24,14)
    tube('Happy curved mouth',[(-.057,-.208,1.052),(-.037,-.220,1.038),(0,-.227,1.032),(.037,-.220,1.038),(.057,-.208,1.052)],.007,dark,head)
    tube('Lower lip warmth',[(-.025,-.218,1.021),(0,-.222,1.017),(.025,-.218,1.021)],.004,blush,head)

    v=[(0,.01,1.434)]
    n=28
    rows=6
    for row in range(1,rows+1):
        for j in range(n):
            a=j*2*math.pi/n
            end=1.49+.43*math.sin(a)
            t=end*row/rows
            v.append((.289*math.sin(t)*math.cos(a),.01+.239*math.sin(t)*math.sin(a),1.15+.284*math.cos(t)))
    f=[]
    for j in range(n):
        f.append((0,1+j,1+(j+1)%n))
    for k in range(rows-1):
        for j in range(n):
            a=1+k*n+j
            b=1+k*n+(j+1)%n
            f.append((a,a+n,b+n,b))
    mesh('Sculpted hair cap',v,f,hair,head)
    for i in range(5):
        x=-.19+i*.077
        lock=uv('Swept fringe lock '+str(i),(x,-.185,1.327+(.016 if i>2 else 0)),(.060,.040,.10 if i<3 else .077),hair,head,20,12)
        lock.rotation_euler[1]=.48
    for s in [-1,1]:
        uv('Sideburn',(s*.253,-.052,1.207),(.029,.06,.088),hair,head,20,12)

    socket=empty('head_socket',(0,0,1.359),head)
    hatroot=empty('Removable straw hat',(0,0,1.359),socket)
    profile('Curved thick straw brim',[(1.352,.252,.215),(1.351,.338,.284),(1.366,.397,.328),(1.379,.399,.33),(1.370,.339,.284),(1.372,.248,.211)],straw,hatroot,48,cap=False)
    profile('Hat crown',[(1.366,.253,.215),(1.395,.248,.208),(1.457,.220,.184),(1.49,.186,.158),(1.50,.10,.085),(1.501,.001,.001)],straw,hatroot,40)
    profile('Hat dark woven ribbon',[(1.377,.254,.216),(1.402,.248,.210)],leather,hatroot,40,cap=False)
    for k in range(4):
        z=1.409+k*.018
        rx=.246-k*.011
        ry=.205-k*.009
        points=[(rx*math.cos(j*2*math.pi/32),ry*math.sin(j*2*math.pi/32),z) for j in range(33)]
        tube('Crown straw course',points,.0022,cream,hatroot,5)
    points=[(.391*math.cos(j*2*math.pi/40),.323*math.sin(j*2*math.pi/40),1.376) for j in range(41)]
    tube('Bound brim edge',points,.005,cream,hatroot,6)
    for j in range(36):
        a=j*2*math.pi/36
        tube('Radial straw weave',[(.267*math.cos(a),.226*math.sin(a),1.373),(.33*math.cos(a),.277*math.sin(a),1.371),(.386*math.cos(a),.319*math.sin(a),1.378)],.0018,cream,hatroot,5)

    # The bail crest sits inside the curled fingers. Its animation pivot
    # is the grip, so swinging never pulls the handle away from the hand.
    hand_socket=empty('hand_socket',(.337,-.035,.589),arms[1])
    bucketroot=empty('Removable handheld bucket',(.337,-.035,.589),hand_socket)
    cx,cy=.337,-.035
    profile('Bucket watertight tapered wall',[(.302,.071,.071),(.312,.077,.077),(.457,.098,.098),(.463,.097,.097),(.463,.087,.087),(.322,.067,.067)],metal,bucketroot,32,(cx,cy),True)
    for z,r in [(.313,.077),(.455,.098)]:
        tube('Bucket rolled rim',[(cx+r*math.cos(j*2*math.pi/28),cy+r*math.sin(j*2*math.pi/28),z) for j in range(29)],.005,metal,bucketroot)
    pts=[]
    for i in range(17):
        t=math.pi*i/16
        pts.append((cx+.096*math.cos(t),cy,.452+.137*math.sin(t)))
    tube('Bucket swinging bail',pts,.006,metal,bucketroot)
    for s in [-1,1]:
        uv('Bucket handle rivet',(cx+s*.098,cy,.451),(.009,.012,.009),gold,bucketroot,12,8)
    tube('Wooden bail grip',[(cx-.027,cy,.5835),(cx-.014,cy,.5875),(cx,cy,.589),(cx+.014,cy,.5875),(cx+.027,cy,.5835)],.012,leather,bucketroot,10)

    base=body.location.copy()
    for frame in range(1,26,3):
        phase=2*math.pi*(frame-1)/24
        body.location=base+Vector((0,0,.010*(1-math.cos(phase*2))))
        body.rotation_euler=(0,.025*math.sin(phase),.025*math.sin(phase))
        body.keyframe_insert('location',frame=frame)
        body.keyframe_insert('rotation_euler',frame=frame)
        for i,leg in enumerate(legs):
            leg.rotation_euler[0]=.30*math.sin(phase+i*math.pi)
            leg.keyframe_insert('rotation_euler',frame=frame)
        for i,arm in enumerate(arms):
            arm.rotation_euler[0]=-.24*math.sin(phase+i*math.pi)
            arm.rotation_euler[1]=(-.06 if i==0 else .06)
            arm.keyframe_insert('rotation_euler',frame=frame)
        head.rotation_euler=(.025*math.sin(phase),0,-.035*math.sin(phase))
        head.keyframe_insert('rotation_euler',frame=frame)
        bucketroot.rotation_euler[0]=.10*math.sin(phase+.4)
        bucketroot.keyframe_insert('rotation_euler',frame=frame)
    for frame in [31,43,55,67,79]:
        t=2*math.pi*(frame-31)/48
        body.location=base+Vector((0,0,.004*math.sin(t)))
        body.rotation_euler=(0,0,.012*math.sin(t))
        body.keyframe_insert('location',frame=frame)
        body.keyframe_insert('rotation_euler',frame=frame)
        head.rotation_euler=(.018*math.sin(t),.035*math.sin(t),.035*math.sin(t))
        head.keyframe_insert('rotation_euler',frame=frame)
        for leg in legs:
            leg.rotation_euler=(0,0,0)
            leg.keyframe_insert('rotation_euler',frame=frame)
        for i,arm in enumerate(arms):
            arm.rotation_euler=(.025*math.sin(t+i),-.06 if i==0 else .06,0)
            arm.keyframe_insert('rotation_euler',frame=frame)
        bucketroot.rotation_euler=(.025*math.sin(t),0,0)
        bucketroot.keyframe_insert('rotation_euler',frame=frame)
    scene.frame_set(1)
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},"notes":"1.50 m modular ranch worker; reduced mesh tessellation and two-segment bevels. Removable hat under head_socket; hollow bucket under hand_socket swings about the handle inside the gripping hand. Hierarchical in-place walk and breathing idle at 24 fps."}
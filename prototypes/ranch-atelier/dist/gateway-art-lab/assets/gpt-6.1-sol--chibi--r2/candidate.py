import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    def mat(name,color,rough=.65,metal=0):
        m=bpy.data.materials.new(name)
        m.use_nodes=True
        p=m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value=(*color,1)
        p.inputs['Roughness'].default_value=rough
        p.inputs['Metallic'].default_value=metal
        return m
    skin=mat('Honey peach skin',(.68,.37,.19))
    blush=mat('Warm cheeks and ear interiors',(.78,.32,.23))
    cream=mat('Warm cream cotton',(.91,.82,.61))
    teal=mat('Deep teal denim',(.035,.29,.28))
    edge=mat('Teal stitching',(.23,.54,.47))
    red=mat('Tomato red kerchief',(.8,.065,.035))
    hair=mat('Chestnut hair',(.13,.045,.018))
    dark=mat('Espresso face details',(.035,.019,.012))
    white=mat('Warm eye whites',(.97,.94,.81))
    iris=mat('Hazel irises',(.23,.34,.19))
    straw=mat('Golden woven straw',(.72,.48,.19))
    strawlight=mat('Straw edge and weave',(.91,.68,.32))
    leather=mat('Saddle leather boots',(.21,.075,.03))
    sole=mat('Dark rubber soles',(.065,.04,.027))
    brass=mat('Brass fasteners',(.73,.44,.12),.35,.55)
    metal=mat('Galvanized bucket',(.39,.49,.49),.38,.65)
    def parent(o,p):
        if p:
            w=o.matrix_world.copy()
            o.parent=p
            o.matrix_world=w
        return o
    def empty(name,loc,p=None):
        o=bpy.data.objects.new(name,None)
        bpy.context.collection.objects.link(o)
        o.location=loc
        bpy.context.view_layer.update()
        return parent(o,p)
    def finish(o,name,m,p=None):
        o.name=name
        o.data.materials.append(m)
        for f in o.data.polygons:
            f.use_smooth=True
        bpy.context.view_layer.update()
        return parent(o,p)
    def ell(name,loc,scale,m,p=None,seg=20,rings=12):
        seg=max(8,int(seg*.75))
        rings=max(6,int(rings*.67))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
        o=bpy.context.object
        o.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        return finish(o,name,m,p)
    def box(name,loc,scale,m,p=None,bevel=.025):
        bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
        o=bpy.context.object
        o.scale=scale
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        finish(o,name,m,p)
        if bevel:
            mod=o.modifiers.new('Soft sewn edges','BEVEL')
            mod.width=bevel
            mod.segments=2
            o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
        return o
    def mesh(name,verts,faces,m,p=None):
        me=bpy.data.meshes.new(name)
        me.from_pydata(verts,[],faces)
        me.update()
        o=bpy.data.objects.new(name,me)
        bpy.context.collection.objects.link(o)
        return finish(o,name,m,p)
    def tube(name,points,r,m,p=None,n=8):
        n=max(5,int(n*.75))
        pts=[Vector(v) for v in points]
        verts=[]
        for i,v in enumerate(pts):
            d=pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]
            d.normalize()
            u=d.cross(Vector((0,1,0)))
            if u.length<.01:
                u=d.cross(Vector((1,0,0)))
            u.normalize()
            w=d.cross(u).normalized()
            for j in range(n):
                a=2*math.pi*j/n
                verts.append(v+r*(math.cos(a)*u+math.sin(a)*w))
        faces=[]
        for i in range(len(pts)-1):
            for j in range(n):
                a=i*n+j
                b=i*n+(j+1)%n
                faces.append((a,b,b+n,a+n))
        faces.extend([tuple(range(n-1,-1,-1)),tuple((len(pts)-1)*n+j for j in range(n))])
        return mesh(name,verts,faces,m,p)
    def lathe(name,profile,loc,m,p=None,n=48):
        n=max(16,int(n*.75))
        verts=[]
        for radius,z in profile:
            for j in range(n):
                a=2*math.pi*j/n
                verts.append((loc[0]+radius*math.cos(a),loc[1]+radius*math.sin(a),loc[2]+z))
        faces=[]
        for k in range(len(profile)-1):
            for j in range(n):
                a=k*n+j
                b=k*n+(j+1)%n
                faces.append((a,b,b+n,a+n))
        return mesh(name,verts,faces,m,p)
    root=empty('Ranch worker ROOT',(0,0,0))
    body=empty('Body motion',(0,0,.59),root)
    ell('Cotton shirt torso',(0,0,.72),(.205,.135,.225),cream,body)
    ell('Overalls seat',(0,.005,.525),(.194,.139,.12),teal,body)
    box('Thick front bib',(0,-.128,.718),(.265,.045,.235),teal,body,.035)
    box('Bib patch pocket',(0,-.159,.697),(.145,.019,.085),teal,body,.015)
    tube('Pocket sewn top',[(-.064,-.172,.728),(0,-.175,.723),(.064,-.172,.728)],.003,edge,body)
    for s in [-1,1]:
        tube('Overall shoulder strap',[(s*.118,-.15,.804),(s*.137,-.1,.879),(s*.135,.025,.898),(s*.12,.127,.77)],.023,teal,body)
        ell('Brass overall button',(s*.113,-.158,.793),(.016,.009,.016),brass,body,16,8)
    ell('Neck',(0,0,.938),(.077,.073,.09),skin,body)
    lathe('Bandana folded neck wrap',[(.078,-.024),(.091,-.014),(.087,.015),(.075,.025)],(0,0,.936),red,body,32)
    v=[(-.105,-.082,.94),(.103,-.082,.94),(0,-.163,.797),(-.105,-.09,.934),(.103,-.09,.934),(0,-.169,.797)]
    mesh('Bandana triangular double cloth',v,[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],red,body)
    ell('Bandana side knot',(.082,-.08,.937),(.033,.025,.024),red,body)
    head=empty('Head pivot',(0,0,.98),body)
    ell('Oversized sculpted head',(0,-.006,1.148),(.278,.233,.258),skin,head,36,24)
    for s in [-1,1]:
        ell('Ear',(s*.273,0,1.14),(.052,.04,.071),skin,head)
        ell('Ear inner',(s*.296,-.029,1.142),(.024,.012,.04),blush,head,16,10)
        ell('Rosy cheek',(s*.171,-.203,1.083),(.048,.012,.023),blush,head,16,8)
        x=s*.103
        ell('Eye white',(x,-.221,1.174),(.061,.025,.069),white,head)
        ell('Hazel iris',(x+s*.003,-.245,1.173),(.033,.01,.043),iris,head)
        ell('Pupil',(x+s*.003,-.254,1.174),(.021,.006,.03),dark,head,16,10)
        ell('Eye glint',(x-.009,-.261,1.192),(.009,.003,.011),white,head,12,8)
        tube('Upper eyelid',[(x-.055,-.231,1.185),(x-.04,-.244,1.221),(x,-.248,1.238),(x+.04,-.24,1.219)],.009,skin,head)
        tube('Expressive eyebrow',[(x-.047,-.212,1.267),(x-.019,-.224,1.28),(x+.017,-.224,1.279),(x+.045,-.212,1.266)],.012,hair,head)
    ell('Button nose',(0,-.239,1.108),(.035,.034,.032),skin,head)
    tube('Happy curved smile',[(-.064,-.218,1.047),(-.041,-.234,1.031),(0,-.24,1.025),(.039,-.233,1.034),(.06,-.218,1.049)],.008,dark,head)
    ell('Lower lip',(0,-.228,1.014),(.029,.009,.009),blush,head,16,8)
    ell('Hair cap',(0,.027,1.298),(.273,.212,.131),hair,head)
    for x,z,angle in [(-.197,1.297,-.35),(-.112,1.321,-.48),(-.025,1.343,-.55),(.069,1.351,-.55),(.159,1.323,-.4)]:
        o=ell('Swept sculpted fringe',(x,-.172,z),(.057,.061,.105),hair,head)
        o.rotation_euler[1]=angle
    for s in [-1,1]:
        ell('Sideburn',(s*.238,-.057,1.218),(.033,.066,.096),hair,head)
    hs=empty('head_socket',(0,0,1.351),head)
    hat=empty('Removable straw hat',(0,0,1.351),hs)
    lathe('Shaped thick straw brim',[(.195,.013),(.29,.004),(.385,.027),(.398,.044),(.385,.057),(.29,.029),(.195,.035)],(0,0,1.351),straw,hat)
    lathe('Hat crown closed',[(.211,.021),(.214,.061),(.185,.123),(.14,.146),(.075,.149),(0,.149)],(0,0,1.351),straw,hat)
    lathe('Leather hat band',[(.212,.035),(.214,.038),(.207,.066),(.204,.064)],(0,0,1.351),leather,hat)
    for r,z in [(.276,.031),(.326,.041),(.373,.054)]:
        tube('Concentric straw braid',[(r*math.cos(i*2*math.pi/48),r*math.sin(i*2*math.pi/48),1.351+z) for i in range(49)],.0035,strawlight,hat,6)
    for j in range(24):
        a=j*math.pi/12
        tube('Brim radial weave',[(r*math.cos(a),r*math.sin(a),1.351+z) for r,z in [(.225,.03),(.29,.034),(.38,.054)]],.002,strawlight,hat,5)
    legs=[]
    knees=[]
    arms=[]
    for s in [-1,1]:
        hip=empty(('Left' if s<0 else 'Right')+' hip',(s*.102,0,.535),body)
        legs.append(hip)
        ell('Overall thigh',(s*.102,0,.433),(.083,.096,.14),teal,hip)
        knee=empty('Knee pivot',(s*.102,0,.342),hip)
        knees.append(knee)
        ell('Overall lower leg',(s*.102,.002,.293),(.077,.087,.095),teal,knee)
        lathe('Rolled trouser cuff',[(.078,0),(.081,.032),(.072,.038),(.069,0)],(s*.102,0,.238),edge,knee,24)
        box('Boot shaft',(s*.102,.009,.176),(.146,.155,.18),leather,knee,.035)
        box('Boot rounded toe',(s*.102,-.055,.087),(.166,.267,.125),leather,knee,.045)
        box('Boot sole',(s*.102,-.054,.029),(.177,.277,.046),sole,knee,.018)
        tube('Boot vamp seam',[(s*.102-.067,-.085,.132),(s*.102,-.109,.146),(s*.102+.067,-.085,.132)],.004,straw,knee)
        shoulder=empty(('Left' if s<0 else 'Right')+' shoulder',(s*.181,0,.824),body)
        arms.append(shoulder)
        o=ell('Short shirt sleeve',(s*.229,0,.777),(.078,.086,.106),cream,shoulder)
        o.rotation_euler[1]=-s*.32
        ell('Rolled sleeve hem',(s*.253,-.005,.724),(.069,.078,.03),cream,shoulder)
        tube('Forearm',[(s*.25,0,.735),(s*.293,-.01,.652),(s*.333,-.024,.599)],.043,skin,shoulder,12)
        ell('Hand palm',(s*.346,-.03,.573),(.05,.033,.057),skin,shoulder)
        for j in range(4):
            x=s*(.322+j*.015)
            tube('Rounded curled finger',[(x,-.047,.57),(x,-.061,.546),(x,-.045,.533)],.009,skin,shoulder,8)
            ell('Fingertip',(x,-.045,.533),(.01,.011,.012),skin,shoulder,12,8)
        ell('Thumb',(s*.308,-.054,.578),(.019,.019,.032),skin,shoulder,16,8)
    socket=empty('hand_socket',(.35,-.03,.553),arms[1])
    bucket=empty('Separate handheld bucket',(.35,-.03,.553),socket)
    bx,by=.437,-.015
    lathe('Bucket hollow wall and solid bottom',[(0,.27),(.085,.27),(.112,.444),(.104,.45),(.096,.437),(.073,.285),(0,.285)],(bx,by,0),metal,bucket,32)
    for z,r in [(.281,.087),(.435,.108)]:
        tube('Bucket rolled rim',[(bx+r*math.cos(i*2*math.pi/32),by+r*math.sin(i*2*math.pi/32),z) for i in range(33)],.006,metal,bucket)
    tube('Bucket bail handle',[(bx+.108*math.cos(math.pi*i/20),by,.438+.13*math.sin(math.pi*i/20)) for i in range(21)],.007,metal,bucket)
    tube('Bucket wooden grip',[(bx-.034,by,.56),(bx+.034,by,.56)],.013,leather,bucket)
    for s in [-1,1]:
        ell('Handle rivet',(bx+s*.105,by-.004,.429),(.012,.012,.012),brass,bucket,12,8)
    scene=bpy.context.scene
    scene.render.fps=24
    scene.frame_start=1
    scene.frame_end=79
    def key(o,frame,rot=None,loc=None):
        if rot is not None:
            o.rotation_euler=rot
            o.keyframe_insert(data_path='rotation_euler',frame=frame)
        if loc is not None:
            o.location=loc
            o.keyframe_insert(data_path='location',frame=frame)
    bodybase=body.location.copy()
    for f in range(1,26,3):
        t=(f-1)*2*math.pi/24
        key(body,f,(0,.025*math.sin(t),.025*math.sin(t)),bodybase+Vector((0,0,.012*(1-math.cos(2*t)))))
        for i in range(2):
            phase=t+i*math.pi
            key(legs[i],f,(.48*math.sin(phase),0,0))
            key(knees[i],f,(max(0,-math.sin(phase))*.55,0,0))
            key(arms[i],f,(-.3*math.sin(phase),-.09 if i==0 else .09,0))
        key(head,f,(.025*math.sin(t),0,-.025*math.sin(t)))
    for f in [31,43,55,67,79]:
        t=(f-31)*2*math.pi/48
        key(body,f,(0,.012*math.sin(t),0),bodybase+Vector((0,0,.005*math.sin(t))))
        key(head,f,(.025*math.sin(t),.035*math.sin(t),.02*math.sin(t)))
        for i in range(2):
            key(legs[i],f,(0,0,0))
            key(knees[i],f,(0,0,0))
            key(arms[i],f,(.025*math.sin(t+i),-.09 if i==0 else .09,0))
    scene.frame_set(1)
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},"notes":"1.5 m modular ranch worker; optimized ellipsoid, bevel and tube tessellation. Articulated hip, knee, shoulder and head hierarchy. Removable straw hat under head_socket; separate hollow bucket under hand_socket. Front faces negative Y."}
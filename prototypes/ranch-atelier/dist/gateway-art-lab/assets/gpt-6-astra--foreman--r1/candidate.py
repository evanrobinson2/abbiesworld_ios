import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    mats = {}
    def mat(name, color, rough=.65, metal=0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*color, 1)
        p.inputs["Roughness"].default_value = rough
        p.inputs["Metallic"].default_value = metal
        mats[name] = m
        return m
    skin = mat("Sun weathered skin", (.52,.278,.145), .72)
    skinlight = mat("Warm facial planes", (.61,.35,.20), .72)
    shadow = mat("Skin creases", (.255,.105,.055), .83)
    lips = mat("Muted lips", (.38,.16,.105), .75)
    stubble = mat("Shaved jaw", (.345,.235,.16), .9)
    hair = mat("Chestnut hair", (.065,.029,.015), .8)
    hairhi = mat("Hair ridges", (.12,.058,.026), .77)
    shirt = mat("Heavy ivory cotton", (.78,.715,.52), .91)
    shirtshade = mat("Cotton seams", (.53,.465,.315), .91)
    scarf = mat("Red kerchief", (.51,.046,.028), .8)
    scarfhi = mat("Kerchief fold", (.68,.085,.045), .79)
    leather = mat("Oxblood suspenders", (.115,.038,.021), .62)
    stitches = mat("Saddle thread", (.63,.43,.23), .82)
    pants = mat("Midnight twill", (.027,.044,.064), .88)
    pantshi = mat("Twill seams", (.052,.073,.091), .88)
    bootmat = mat("Oiled boot leather", (.044,.035,.027), .52)
    sole = mat("Boot soles", (.018,.016,.013), .85)
    metal = mat("Brushed brass", (.45,.32,.13), .32, .75)
    white = mat("Eyes ivory", (.83,.78,.63), .3)
    eye = mat("Iris and pupils", (.035,.056,.04), .35)

    rigdata = bpy.data.armatures.new("Foreman skeleton")
    rig = bpy.data.objects.new("Foreman | articulated character", rigdata)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bones = {}
    def bone(n, h, t, parent=None):
        b = rigdata.edit_bones.new(n)
        b.head, b.tail = h, t
        if parent:
            b.parent = rigdata.edit_bones[parent]
        bones[n] = (Vector(h), Vector(t))
    bone("root", (0,0,.04), (0,0,.22))
    bone("pelvis", (0,0,.87), (0,0,1.04), "root")
    bone("spine", (0,0,1.04), (0,0,1.27), "pelvis")
    bone("chest", (0,0,1.27), (0,0,1.46), "spine")
    bone("neck", (0,0,1.46), (0,0,1.57), "chest")
    bone("head", (0,0,1.57), (0,0,1.79), "neck")
    for s, sign in [('L',1),('R',-1)]:
        bone("thigh."+s, (sign*.102,0,.97), (sign*.112,.012,.535), "pelvis")
        bone("shin."+s, (sign*.112,.012,.535), (sign*.12,0,.135), "thigh."+s)
        bone("foot."+s, (sign*.12,0,.135), (sign*.12,-.15,.065), "shin."+s)
        bone("upper_arm."+s, (sign*.218,0,1.412), (sign*.315,-.008,1.18), "chest")
        bone("forearm."+s, (sign*.315,-.008,1.18), (sign*.365,-.025,.977), "upper_arm."+s)
        bone("hand."+s, (sign*.365,-.025,.977), (sign*.383,-.04,.882), "forearm."+s)
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.select_set(False)

    def mesh(name, vs, fs, material, weights=None, smooth=True, bevel=0):
        me = bpy.data.meshes.new(name)
        me.from_pydata(vs, [], fs)
        me.materials.append(material)
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        if smooth:
            for p in me.polygons:
                p.use_smooth = True
        if weights:
            groups = {}
            for i, w in enumerate(weights):
                if isinstance(w, str):
                    w = {w:1}
                for n, val in w.items():
                    if val > 0:
                        if n not in groups:
                            groups[n] = ob.vertex_groups.new(name=n)
                        groups[n].add([i], val, 'REPLACE')
            mod = ob.modifiers.new("Deform with foreman", 'ARMATURE')
            mod.object = rig
            ob.parent = rig
        if bevel:
            b = ob.modifiers.new("Small constructed edges", 'BEVEL')
            b.width = bevel
            b.segments = 2
        return ob

    def loft(name, rings, material, n=12, smooth=True):
        # Each cross section is (center, half width, half depth, bone weights).
        vs, fs, ws = [], [], []
        for c, rx, ry, w in rings:
            for j in range(n):
                a = 2*math.pi*j/n
                vs.append((c[0]+rx*math.cos(a),c[1]+ry*math.sin(a),c[2]))
                ws.append(w)
        for k in range(len(rings)-1):
            for j in range(n):
                a=k*n+j
                b=k*n+(j+1)%n
                fs.append((a,b,b+n,a+n))
        fs += [tuple(reversed(range(n))), tuple((len(rings)-1)*n+j for j in range(n))]
        return mesh(name,vs,fs,material,ws,smooth)

    def tube(name, points, radii, material, weight, n=8):
        vs,fs,ws=[],[],[]
        for i,p in enumerate(points):
            p=Vector(p)
            if i==0: tangent=Vector(points[1])-p
            elif i==len(points)-1: tangent=p-Vector(points[i-1])
            else: tangent=Vector(points[i+1])-Vector(points[i-1])
            tangent.normalize()
            axis=Vector((0,1,0))
            if abs(axis.dot(tangent))>.9: axis=Vector((1,0,0))
            u=tangent.cross(axis).normalized()
            v=tangent.cross(u).normalized()
            r=radii[i] if isinstance(radii,list) else radii
            for j in range(n):
                a=2*math.pi*j/n
                vs.append(tuple(p+r*(u*math.cos(a)+v*math.sin(a))))
                ws.append(weight if isinstance(weight,str) or isinstance(weight,dict) else weight[i])
        for k in range(len(points)-1):
            for j in range(n):
                a=k*n+j;b=k*n+(j+1)%n
                fs.append((a,b,b+n,a+n))
        fs.extend([tuple(reversed(range(n))),tuple((len(points)-1)*n+j for j in range(n))])
        return mesh(name,vs,fs,material,ws)

    def ell(name,c,sc,material,weight, seg=12, rings=8):
        vs,fs=[],[]
        for i in range(rings+1):
            ph=math.pi*i/rings
            for j in range(seg):
                th=2*math.pi*j/seg
                vs.append((c[0]+sc[0]*math.sin(ph)*math.cos(th),
                           c[1]+sc[1]*math.sin(ph)*math.sin(th),
                           c[2]+sc[2]*math.cos(ph)))
        for i in range(rings):
            for j in range(seg):
                a=i*seg+j;b=i*seg+(j+1)%seg
                fs.append((a,b,b+seg,a+seg))
        return mesh(name,vs,fs,material,[weight]*len(vs))
    def patch(name, vertices, faces, material, weight, thickness=.002):
        ob=mesh(name,vertices,faces,material,[weight]*len(vertices),False)
        if thickness:
            so=ob.modifiers.new("Fabric thickness", 'SOLIDIFY')
            so.thickness=thickness
        return ob
    def ribbon(name, points, width, material, weights, thickness=.003):
        vs=[];ws=[]
        for i,p in enumerate(points):
            w=weights if isinstance(weights,str) else weights[i]
            vs.extend([(p[0]-width/2,p[1],p[2]),(p[0]+width/2,p[1],p[2])])
            ws.extend([w,w])
        ob=mesh(name,vs,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(points)-1)],material,ws)
        so=ob.modifiers.new("Leather thickness",'SOLIDIFY');so.thickness=thickness
        return ob

    loft("Tailored trouser seat",[
        ((0,0,.854),.161,.086,"pelvis"),((0,0,.91),.176,.105,"pelvis"),
        ((0,0,1.002),.165,.097,"pelvis"),((0,0,1.033),.154,.092,"pelvis")],pants,16)
    torso=[
        ((0,0,1.017),.155,.092,"spine"),
        ((0,0,1.066),.165,.103,{"spine":.8,"pelvis":.2}),
        ((0,0,1.14),.161,.106,"spine"),
        ((0,0,1.24),.185,.117,{"spine":.5,"chest":.5}),
        ((0,0,1.34),.222,.126,"chest"),
        ((0,0,1.415),.23,.112,"chest"),
        ((0,0,1.451),.155,.086,"chest"),
        ((0,0,1.48),.075,.062,"chest")]
    loft("Cotton shirt body",torso,shirt,20)
    loft("Neck",[((0,.005,1.445),.066,.058,"neck"),((0,.005,1.51),.059,.056,"neck"),
                 ((0,0,1.576),.071,.062,{"head":.7,"neck":.3})],skin,12)
    # Belt, buckle and reinforced center opening.
    loft("Waist belt",[((0,0,1.004),.167,.101,"pelvis"),((0,0,1.038),.164,.101,"pelvis")],leather,20)
    for x in [-.15,-.075,.075,.15]:
        ribbon("Belt keeper",[(x,-.093,1.0),(x,-.104,1.044)],.012,pants,"pelvis")
    def frame(name,c,w,h,material,weight,r=.003):
        x,y,z=c
        tube(name,[(x-w/2,y,z-h/2),(x+w/2,y,z-h/2),(x+w/2,y,z+h/2),
                   (x-w/2,y,z+h/2),(x-w/2,y,z-h/2)],r,material,weight,6)
    frame("Belt buckle",(0,-.107,1.021),.052,.032,metal,"pelvis",.004)
    tube("Buckle tongue",[(-.02,-.111,1.021),(.012,-.111,1.021)],.0025,metal,"pelvis")
    ribbon("Shirt placket",[(0,-.107,1.049),(0,-.113,1.16),(0,-.126,1.31),(0,-.104,1.43)],.022,shirt,
           ["spine","spine","chest","chest"],.002)
    for z,y,w in [(1.10,-.117,"spine"),(1.21,-.124,"spine"),(1.32,-.133,"chest")]:
        ell("Bone shirt button",(0,y,z),(.006,.003,.006),stitches,w,8,4)

    for side, s in [('L',1),('R',-1)]:
        th="thigh."+side; sh="shin."+side; ft="foot."+side
        ua="upper_arm."+side; fa="forearm."+side; ha="hand."+side
        loft("Shaped trouser leg "+side,[
            ((s*.095,0,.95),.086,.093,th),((s*.103,0,.858),.083,.091,th),
            ((s*.108,.005,.74),.072,.079,th),((s*.111,.009,.60),.056,.066,{th:.85,sh:.15}),
            ((s*.112,.012,.54),.054,.062,{th:.5,sh:.5}),
            ((s*.115,.008,.488),.051,.06,{th:.12,sh:.88}),
            ((s*.117,.006,.40),.054,.059,sh),((s*.12,0,.25),.046,.05,sh),
            ((s*.12,-.001,.17),.048,.052,sh),((s*.12,-.006,.153),.05,.054,sh)],pants,12)
        tube("Outer leg seam "+side,[(s*.18,0,.91),(s*.18,0,.82),(s*.162,.003,.65),
             (s*.164,.005,.52),(s*.17,.005,.4),(s*.167,0,.18)],.0017,pantshi,
             [th,th,th,{th:.5,sh:.5},sh,sh],6)
        for z in [.19,.215,.49,.565]:
            x=s*.12
            tube("Twill compression fold",[(x-.033,-.045,z),(x,-.059,z+.008),(x+.031,-.047,z+.002)],
                 [.001,.003,.001],pantshi,sh if z<.53 else th,6)
        # Boot geometry: shaped toe, inset welt, heel and ankle shaft.
        loft("Boot upper "+side,[
            ((s*.12,-.055,.042),.062,.132,ft),((s*.12,-.057,.067),.061,.132,ft),
            ((s*.12,-.05,.092),.057,.12,ft),((s*.12,-.018,.125),.048,.077,ft),
            ((s*.12,0,.16),.044,.048,ft),((s*.12,.003,.226),.043,.047,ft)],bootmat,16)
        loft("Layered boot sole "+side,[
            ((s*.12,-.057,.019),.063,.135,ft),((s*.12,-.057,.036),.066,.137,ft),
            ((s*.12,-.057,.045),.064,.135,ft)],sole,16)
        loft("Stacked heel "+side,[
            ((s*.12,.026,.001),.051,.049,ft),((s*.12,.026,.026),.055,.052,ft)],bootmat,10)
        pts=[]
        for j in range(17):
            a=2*math.pi*j/16
            pts.append((s*.12+.062*math.cos(a),-.057+.132*math.sin(a),.046))
        tube("Boot welt seam "+side,pts,.0018,stitches,ft,6)
        tube("Vamp seam "+side,[(s*.12-.047,-.08,.099),(s*.12-.025,-.105,.104),
              (s*.12,-.111,.107),(s*.12+.025,-.105,.104),(s*.12+.047,-.08,.099)],.002,leather,ft)
        for xx in [-1,1]:
            ribbon("Boot pull tab",[(s*.12+xx*.037,.008,.195),(s*.12+xx*.041,.008,.234)],.012,bootmat,ft)

        loft("Shirt sleeve "+side,[
            ((s*.211,0,1.418),.068,.086,ua),((s*.258,0,1.37),.074,.084,ua),
            ((s*.285,-.004,1.285),.065,.074,ua),
            ((s*.308,-.007,1.21),.06,.066,{ua:.75,fa:.25}),
            ((s*.322,-.009,1.159),.061,.061,{ua:.3,fa:.7})],shirt,14)
        loft("Thick rolled cuff "+side,[
            ((s*.313,-.009,1.207),.063,.067,{ua:.5,fa:.5}),
            ((s*.324,-.009,1.187),.071,.069,fa),
            ((s*.331,-.009,1.148),.067,.065,fa),
            ((s*.329,-.009,1.139),.056,.053,fa)],shirt,14)
        # Cuff lower seam and upper folded lip.
        for z,xx,rx,ry in [(1.15,.33,.067,.065),(1.198,.319,.066,.068)]:
            pts=[(s*xx+rx*math.cos(a*math.pi/8),-.009+ry*math.sin(a*math.pi/8),z) for a in range(17)]
            tube("Cuff stitching",pts,.0017,shirtshade,fa,6)
        loft("Anatomical forearm "+side,[
            ((s*.326,-.009,1.17),.049,.049,fa),
            ((s*.339,-.014,1.108),.048,.047,fa),
            ((s*.351,-.019,1.048),.037,.038,fa),
            ((s*.365,-.025,.978),.028,.03,{fa:.7,ha:.3}),
            ((s*.372,-.03,.95),.031,.028,ha)],skin,12)
        loft("Palm "+side,[
            ((s*.369,-.03,.968),.028,.026,ha),((s*.38,-.036,.934),.036,.027,ha),
            ((s*.384,-.039,.903),.035,.025,ha),((s*.385,-.041,.889),.029,.022,ha)],skin,12)
        # Four separate curled digits, visible knuckles, and an opposable thumb.
        for j in range(4):
            xx=s*(.36+j*.016)
            z=.902-abs(j-1.3)*.004
            length=[.041,.048,.045,.035][j]
            points=[(xx,-.045,z),(xx+s*.003,-.05,z-length*.48),
                    (xx+s*.003,-.064,z-length),(xx,-.078,z-length*.88)]
            tube("Finger %d %s"%(j+1,side),points,[.009,.009,.008,.006],skin,ha,8)
            ell("Knuckle",(xx,-.06,z-.009),(.01,.006,.009),skinlight,ha,8,4)
            tube("Finger joint crease",[(xx-.006,-.073,z-length*.83),(xx+.005,-.073,z-length*.83)],
                 .001,shadow,ha,5)
        tube("Opposed thumb "+side,[(s*.351,-.036,.934),(s*.338,-.049,.915),
             (s*.343,-.071,.9),(s*.354,-.079,.896)],[.014,.012,.01,.008],skin,ha,9)
        for j in [-1,0,1]:
            tube("Hand tendon",[(s*(.379+j*.012),-.06,.94),(s*(.383+j*.012),-.064,.909)],
                 .0015,skinlight,ha,5)
        # Shirt folds and shoulder seams.
        tube("Sleeve shoulder seam",[(s*.20,-.078,1.438),(s*.242,-.086,1.396),
              (s*.26,-.078,1.35)],.0025,shirtshade,ua,6)
        for z,x in [(1.27,.287),(1.225,.31)]:
            tube("Sleeve drape fold",[(s*(x-.036),-.049,z-.012),(s*x,-.079,z),
                  (s*(x+.039),-.048,z+.022)],[.001,.004,.001],shirt,ua,6)

    # Broad leather braces travel over both shoulders and join at rear waist.
    for s in [-1,1]:
        points=[(s*.125,-.092,1.039),(s*.144,-.111,1.16),(s*.16,-.119,1.30),
                (s*.174,-.09,1.423),(s*.163,-.035,1.454),(s*.16,.047,1.452),
                (s*.151,.096,1.397),(s*.105,.119,1.25),(s*.052,.106,1.09),(s*.045,.102,1.04)]
        weights=["spine","spine","chest","chest","chest","chest","chest","spine","spine","pelvis"]
        ribbon("Continuous leather suspender",points,.029,leather,weights,.004)
        for e in [-1,1]:
            pp=[(p[0]+e*.011,p[1]-.002 if p[1]<0 else p[1]+.002,p[2]) for p in points]
            tube("Suspender stitched edge",pp,.0009,stitches,weights,5)
        frame("Suspender adjuster",(s*.153,-.129,1.29),.03,.041,metal,"chest",.003)
        tube("Adjuster crossbar",[(s*.153-.015,-.132,1.288),(s*.153+.015,-.132,1.288)],.002,metal,"chest")
        for z in [1.063,1.101,1.19]:
            ell("Suspender rivet",(s*(.127+(z-1.039)*.15),-.12 if z>1.1 else -.104,z),
                (.003,.002,.003),metal,"spine",8,4)
        # Pointed open shirt collar.
        patch("Pointed collar",[(s*.012,-.068,1.488),(s*.067,-.056,1.482),
             (s*.114,-.087,1.427),(s*.07,-.128,1.385),(s*.032,-.104,1.443)],
              [(0,1,4),(1,2,3,4)],shirt,"chest",.005)

    # Neckerchief is a folded wrap with a knot and asymmetric tails.
    loft("Kerchief neck wrap",[((0,0,1.468),.071,.068,"neck"),
         ((0,0,1.492),.066,.063,"neck")],scarf,16)
    tube("Kerchief diagonal fold",[(-.057,-.051,1.48),(-.034,-.079,1.452),(0,-.093,1.431),
         (.03,-.078,1.455),(.058,-.05,1.482)],.012,scarf,"chest",8)
    ell("Scarf knot",(.005,-.115,1.416),(.024,.018,.028),scarfhi,"chest",10,5)
    patch("Long kerchief tail",[(-.012,-.129,1.402),(.02,-.129,1.404),(.039,-.145,1.292),
          (.027,-.142,1.103),(-.009,-.145,1.066),(-.04,-.14,1.118),(-.022,-.141,1.278),
          (0,-.156,1.25)],[(0,1,7),(1,2,7),(2,3,7),(3,4,7),(4,5,7),(5,6,7),(6,0,7)],scarf,"chest",.003)
    patch("Turned scarf fold",[(.015,-.149,1.387),(.029,-.15,1.313),(.017,-.152,1.132),
         (.005,-.157,1.253)],[(0,1,3),(1,2,3)],scarfhi,"chest",.001)

    # Angular head: custom perimeter rings, narrower temples and square masseter.
    headrings=[
        ((0,-.004,1.523),.047,.045,"head"),
        ((0,-.009,1.54),.069,.061,"head"),
        ((0,-.006,1.576),.087,.077,"head"),
        ((0,.002,1.625),.092,.087,"head"),
        ((0,.006,1.671),.103,.092,"head"),
        ((0,.009,1.717),.098,.089,"head"),
        ((0,.012,1.758),.091,.079,"head"),
        ((0,.013,1.792),.071,.062,"head"),
        ((0,.013,1.807),.035,.032,"head")]
    loft("Sculpted angular head",headrings,skin,16)
    # Jaw planes, subtle shaved chin, cheek bones.
    patch("Square shaved chin",[(-.053,-.055,1.575),(-.044,-.076,1.556),
          (0,-.084,1.547),(.044,-.076,1.556),(.053,-.055,1.575),
          (.034,-.091,1.589),(-.034,-.091,1.589)],
          [(0,1,6),(1,2,5,6),(2,3,4,5)],stubble,"head",0)
    ell("Chin plane",(0,-.076,1.565),(.035,.012,.02),skin,"head",10,5)
    for s in [-1,1]:
        ell("Ear "+str(s),(s*.104,.005,1.658),(.023,.017,.036),skin,"head",10,7)
        ell("Ear inner bowl",(s*.114,-.009,1.658),(.012,.007,.023),shadow,"head",10,6)
        tube("Ear antihelix",[(s*.113,-.018,1.642),(s*.119,-.018,1.66),(s*.113,-.016,1.676)],
             [.004,.004,.003],skinlight,"head",7)
        ell("Ear tragus",(s*.102,-.014,1.65),(.007,.007,.011),skin,"head",8,5)
        patch("Chiseled cheek",[(s*.026,-.088,1.648),(s*.054,-.101,1.661),
              (s*.085,-.073,1.655),(s*.078,-.069,1.619),(s*.046,-.084,1.604)],
              [(0,1,4),(1,2,3,4)],skinlight,"head",0)
        # Inset smaller eyes with lids hugging the globes.
        ell("Eyeball",(s*.043,-.086,1.69),(.025,.015,.014),white,"head",16,8)
        ell("Green iris",(s*.041,-.1005,1.689),(.008,.0023,.009),eye,"head",12,6)
        ell("Eye glint",(s*.038,-.1025,1.693),(.002,.001,.002),white,"head",8,4)
        tube("Upper eyelid",[(s*.019,-.091,1.688),(s*.031,-.101,1.701),
             (s*.049,-.101,1.703),(s*.066,-.089,1.696)],[.003,.004,.004,.003],skin,"head",8)
        tube("Lower eyelid",[(s*.019,-.091,1.686),(s*.039,-.101,1.678),
             (s*.055,-.095,1.679),(s*.066,-.089,1.69)],[.002,.003,.003,.002],skin,"head",8)
        tube("Under eye plane",[(s*.022,-.089,1.67),(s*.046,-.096,1.669),(s*.068,-.08,1.674)],
             [.0015,.003,.0015],skinlight,"head",6)
        tube("Heavy brow ridge",[(s*.015,-.092,1.717),(s*.035,-.106,1.721),
             (s*.06,-.099,1.718),(s*.08,-.075,1.708)],[.009,.011,.009,.004],skin,"head",8)
        tube("Expressive dark eyebrow",[(s*.017,-.102,1.723),(s*.036,-.114,1.726),
             (s*.06,-.106,1.723),(s*.079,-.084,1.715)],[.004,.006,.005,.002],hair,"head",7)
        tube("Nose to mouth crease",[(s*.024,-.109,1.635),(s*.034,-.101,1.619),
             (s*.037,-.09,1.603)],[.001,.0018,.001],shadow,"head",6)
        tube("Sideburn",[(s*.09,-.029,1.731),(s*.094,-.031,1.697),(s*.091,-.034,1.676)],
             [.011,.01,.006],hair,"head",7)
    # Strong asymmetric-looking planar nose, with distinct bridge, tip and wings.
    mesh("Sculpted nose",[
        (-.013,-.092,1.72),(.013,-.092,1.72),(-.014,-.117,1.68),(.014,-.117,1.68),
        (-.019,-.139,1.65),(.019,-.139,1.65),(0,-.15,1.648),
        (-.026,-.112,1.637),(.026,-.112,1.637),(0,-.126,1.631),
        (-.018,-.089,1.64),(.018,-.089,1.64)],
        [(0,1,3,2),(2,3,5,6,4),(0,2,4,7,10),(1,11,8,5,3),
         (4,6,9,7),(6,5,8,9),(7,9,8,11,10),(0,10,11,1)],
        skinlight,["head"]*12,False)
    for s in [-1,1]:
        ell("Nostril",(s*.017,-.126,1.637),(.007,.004,.0035),shadow,"head",10,5)
    tube("Philtrum",[(-.007,-.096,1.631),(-.007,-.104,1.612)],.002,skinlight,"head",6)
    tube("Upper lip",[(-.034,-.091,1.603),(-.016,-.105,1.608),(0,-.108,1.605),
         (.014,-.104,1.608),(.033,-.09,1.604)],[.002,.003,.003,.003,.002],lips,"head",8)
    tube("Mouth closed line",[(-.034,-.093,1.601),(-.016,-.108,1.601),(0,-.11,1.599),
         (.018,-.105,1.601),(.033,-.092,1.602)],.0017,shadow,"head",6)
    tube("Lower lip",[(-.027,-.098,1.596),(0,-.109,1.592),(.027,-.097,1.597)],
         [.002,.004,.002],lips,"head",8)
    tube("Chin crease",[(-.02,-.09,1.581),(0,-.097,1.579),(.02,-.09,1.581)],
         .0014,shadow,"head",6)
    # Sculpted hair cap with a sloping irregular hairline.
    vs=[];fs=[]
    N=24
    for k in range(5):
        t=k/4
        for j in range(N):
            a=2*math.pi*j/N
            front=max(0,-math.sin(a))
            bottom=1.712+.035*front+.012*math.cos(a)
            z=bottom+(1.824-bottom)*t
            radius=math.sqrt(max(.015,1-t*t))
            vs.append((.102*radius*math.cos(a)-.014*t,
                       .014+.091*radius*math.sin(a),z))
    for k in range(4):
        for j in range(N):
            a=k*N+j;b=k*N+(j+1)%N
            fs.append((a,b,b+N,a+N))
    fs.append(tuple(4*N+j for j in range(N)))
    mesh("Swept solid hair cap",vs,fs,hair,["head"]*len(vs))
    # Tapered, flattened crest locks, not a collection of spheres.
    def lock(name, pts, widths, depths, material):
        vs=[];fs=[]
        for i,p in enumerate(pts):
            for j in range(8):
                a=2*math.pi*j/8
                vs.append((p[0]+widths[i]*math.cos(a),p[1]+depths[i]*math.sin(a),p[2]+.35*widths[i]*math.cos(a)))
        for i in range(len(pts)-1):
            for j in range(8):
                a=i*8+j;b=i*8+(j+1)%8
                fs.append((a,b,b+8,a+8))
        fs.extend([tuple(reversed(range(8))),tuple((len(pts)-1)*8+j for j in range(8))])
        mesh(name,vs,fs,material,["head"]*len(vs))
    for i in range(7):
        x=-.075+i*.024
        lock("Swept forehead lock %02d"%i,
             [(x,.022,1.796),(x-.018,-.017,1.83-abs(i-2)*.003),
              (x-.014,-.06,1.813-abs(i-2)*.004),(x+.025,-.084,1.764+ .004*i)],
             [.018,.024,.023,.002],[.015,.017,.014,.003],hairhi if i%3==0 else hair)
    for s in [-1,1]:
        for i in range(3):
            lock("Combed side lock",[(s*.064,.04+i*.013,1.784),(s*.095,.024+i*.018,1.755),
                 (s*.098,.02+i*.02,1.708)],[.014,.012,.002],[.016,.013,.002],hair)
    # Small forehead weather lines.
    for z in [1.742,1.753]:
        tube("Forehead crease",[(-.033,-.077,z),(0,-.083,z+.002),(.032,-.076,z)],
             .0008,shadow,"head",5)

    # Working deform rig: deliberate foot swing, knee flexion, arm counter-swing and breathing.
    scene=bpy.context.scene
    scene.render.fps=24
    scene.frame_start=1
    scene.frame_end=79
    for pb in rig.pose.bones:
        pb.rotation_mode='XYZ'
    def key(n, frame, rot=(0,0,0), loc=None):
        pb=rig.pose.bones[n]
        pb.rotation_euler=rot
        pb.keyframe_insert(data_path="rotation_euler",frame=frame,group=n)
        if loc is not None:
            pb.location=loc
            pb.keyframe_insert(data_path="location",frame=frame,group=n)
    for f in range(1,26,3):
        phase=2*math.pi*(f-1)/24
        key("root",f,loc=(0,0,.009*(1-math.cos(2*phase))))
        key("pelvis",f,(0,.025*math.sin(phase),.035*math.sin(phase)))
        key("spine",f,(.018,0,-.025*math.sin(phase)))
        key("chest",f,(0,.015*math.sin(phase),-.035*math.sin(phase)))
        key("neck",f,(0,0,0))
        key("head",f,(.012,0,.025*math.sin(phase)))
        for side,off in [('L',0),('R',math.pi)]:
            p=phase+off
            stride=math.cos(p)
            knee=.10+.50*max(0,-math.sin(p))
            key("thigh."+side,f,(.34*stride,0,0))
            key("shin."+side,f,(-knee,0,0))
            key("foot."+side,f,(-.17*stride+knee*.5,0,0))
            key("upper_arm."+side,f,(-.24*stride,0,.025 if side=='L' else -.025))
            key("forearm."+side,f,(.10+.06*max(0,stride),0,0))
            key("hand."+side,f,(0,.035*math.sin(p),0))
    for f in [31,43,55,67,79]:
        p=2*math.pi*(f-31)/48
        key("root",f,loc=(0,0,.002*math.sin(p)))
        key("pelvis",f,(0,.012*math.sin(p),0))
        key("spine",f,(.008*math.sin(p),0,.008*math.sin(p)))
        key("chest",f,(.012*math.sin(p),0,0))
        key("neck",f,(0,0,0))
        key("head",f,(.012*math.sin(p),.022*math.sin(p),.018*math.sin(p)))
        for side in ['L','R']:
            key("thigh."+side,f,(0,0,0))
            key("shin."+side,f,(0,0,0))
            key("foot."+side,f,(0,0,0))
            key("upper_arm."+side,f,(.015*math.sin(p),0,0))
            key("forearm."+side,f,(.06+.018*math.sin(p),0,0))
            key("hand."+side,f,(0,0,0))
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name="Foreman | walk 01-25 | idle 31-79"
    scene.frame_set(1)
    rig.hide_render=False
    return {"animationRanges":{"walk":[1,25],"idle":[31,79]},
            "notes":"Original 1.85 m ranch foreman. Skinned custom clothing, anatomical limbs, articulated hand attachments, continuous braces, constructed boots and sculpted face/hair. Walk and breathing idle are keyed on the deform skeleton; no weapons."}
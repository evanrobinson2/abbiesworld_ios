import bpy, math, random
from mathutils import Vector

def build():
    random.seed(42)
    def material(name, color, rough=0.85):
        m=bpy.data.materials.new(name)
        m.use_nodes=True
        p=m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value=(*color,1)
        p.inputs["Roughness"].default_value=rough
        return m
    bark=material("Old warm grey bark",(.205,.153,.105))
    barklight=material("Raised bark plates",(.29,.224,.148))
    barkdark=material("Deep bark fissures",(.095,.071,.048))
    inner=material("Sheltered hollow wood",(.115,.078,.047))
    moss=material("Shade moss",(.17,.235,.068))
    mosslight=material("Moss tips",(.285,.335,.095))
    leaves=[
        material("Leaf shadow",(.075,.155,.034)),
        material("Leaf forest green",(.145,.265,.048)),
        material("Leaf olive green",(.235,.345,.072)),
        material("Leaf sunlit green",(.335,.43,.105)),
        material("Leaf fresh tips",(.405,.48,.135))]
    woodmats=[bark,barklight,barkdark,moss,mosslight]
    def mesh(name,vs,fs,mats,ids=None,smooth=True):
        me=bpy.data.meshes.new(name)
        me.from_pydata(vs,[],fs)
        me.update()
        ob=bpy.data.objects.new(name,me)
        bpy.context.collection.objects.link(ob)
        for m in mats: me.materials.append(m)
        for i,p in enumerate(me.polygons):
            p.use_smooth=smooth
            if ids: p.material_index=ids[i]
        return ob
    def tube(name,points,radii,n=12,root=False):
        pts=[Vector(p) for p in points]
        vs=[]; fs=[]; ids=[]
        for j,p in enumerate(pts):
            tangent=(pts[min(j+1,len(pts)-1)]-pts[max(j-1,0)]).normalized()
            u=tangent.cross(Vector((0,1,0))).normalized()
            if u.length<.01: u=Vector((1,0,0))
            v=tangent.cross(u).normalized()
            for k in range(n):
                a=2*math.pi*k/n
                rr=radii[j]*(1+.075*math.sin(k*4.7+j*.24)+.025*math.sin(k*9))
                q=p+rr*(math.cos(a)*u+math.sin(a)*v)
                vs.append(tuple(q))
        fs.append(tuple(reversed(range(n)))); ids.append(0)
        for j in range(len(pts)-1):
            for k in range(n):
                fs.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
                a=2*math.pi*(k+.5)/n
                upward=(math.cos(a)*u+math.sin(a)*v).z
                if root and upward>.2 and random.random()<.55:
                    ids.append(3 if random.random()<.8 else 4)
                else: ids.append(2 if k%7==2 else (1 if k%4==0 else 0))
        fs.append(tuple((len(pts)-1)*n+k for k in range(n)));ids.append(0)
        return mesh(name,vs,fs,woodmats,ids)
    # Irregular radial trunk, with a real opening and recessed interior.
    N=64
    zs=[.025,.22,.68,1.22,1.86,2.55,3.35,4.2,5.12,6.05,6.9]
    rs=[1.18,1.06,.89,.80,.75,.70,.63,.53,.43,.31,.12]
    vs=[]
    centers=[]
    for j,z in enumerate(zs):
        cx=.07*math.sin(z*1.1)-.035*z
        cy=.055*math.sin(z*.9)+.018*z
        centers.append((cx,cy))
        for k in range(N):
            a=-math.pi+2*math.pi*k/N
            lobes=.06*math.cos(a*7+.6)+.035*math.sin(a*11-1)
            flare=.22*max(0,1-z/.9)*(0.5+0.5*math.cos(a*7+.6))
            r=rs[j]*(1+lobes+.022*math.sin(a*23+z*.45))+flare
            zz=z
            if j==4 and 10<=k<=22:
                zz=1.57+.47*math.sin(math.pi*(k-10)/12)
            vs.append((cx+r*math.cos(a),cy+r*math.sin(a),zz))
    fs=[]; ids=[]
    for j in range(len(zs)-1):
        for k in range(N):
            if 1<=j<4 and 10<=k<22: continue
            fs.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
            a=-math.pi+2*math.pi*k/N
            wet=(math.sin(a)>.1 and j<5 and k%9<5)
            ids.append(3 if wet else (2 if k%8 in (1,2) else 1 if k%5==0 else 0))
    fs.append(tuple((len(zs)-1)*N+k for k in range(N)));ids.append(0)
    # Opening perimeter, threshold, jambs, vaulted roof and continuous back wall.
    boundary=[N+k for k in range(10,23)]
    boundary += [j*N+22 for j in range(2,5)]
    boundary += [4*N+k for k in range(21,9,-1)]
    boundary += [j*N+10 for j in range(3,1,-1)]
    inset=[]
    for idx in boundary:
        x,y,z=vs[idx]
        inset.append(len(vs))
        vs.append((x*.79,.24+(z-1)*.035,.24+(z-.22)*.91))
    for i in range(len(boundary)):
        ni=(i+1)%len(boundary)
        fs.append((boundary[i],boundary[ni],inset[ni],inset[i]));ids.append(5)
    center=len(vs);vs.append((-.045,.32,1.02))
    for i in range(len(inset)):
        fs.append((inset[i],inset[(i+1)%len(inset)],center));ids.append(5)
    mesh("Ancient continuous hollow trunk",vs,fs,woodmats+[inner],ids)
    # Buttresses radiate around, leaving the dwelling entrance sheltered and clear.
    for i,a in enumerate([-.30,.43,1.12,1.91,2.57,3.2,3.92,5.08,5.75]):
        d=Vector((math.cos(a),math.sin(a),0))
        side=Vector((-d.y,d.x,0))
        length=random.uniform(2.0,2.9)
        start=d*.48+Vector((-.02,.02,.66))
        pts=[start,d*.9+Vector((0,0,.43)),d*1.42+side*.10+Vector((0,0,.22)),
             d*(length*.85)+side*.22+Vector((0,0,.10)),d*length+side*.32+Vector((0,0,.015))]
        tube("Fluted buttress root %02d"%i,pts,[.48,.39,.245,.12,.018],14,True)
        for s in [-1,1]:
            p=Vector(pts[2])
            tip=d*(length+random.uniform(.1,.6))+side*(s*.65+.15)
            tube("Dividing surface root", [p,p+d*.42+side*s*.28+Vector((0,0,-.045)),
                  tip+Vector((0,0,.055)),tip+d*.23+Vector((0,0,.012))],
                 [.155,.108,.052,.009],9,True)
    # Uneven scaffold limbs; each sprouts two independently shaped secondary boughs.
    tips=[]
    specs=[
        (.15,3.5,3.05,7.15),
        (1.00,4.05,3.2,7.75),
        (1.92,3.15,3.3,6.9),
        (2.76,4.6,3.05,8.0),
        (3.60,3.85,3.4,7.35),
        (4.48,4.9,2.8,8.3),
        (5.42,4.1,3.1,7.7),
        (.55,5.75,1.6,9.05)]
    for i,(a,z,L,h) in enumerate(specs):
        d=Vector((math.cos(a),math.sin(a),0)); t=Vector((-d.y,d.x,0))
        p0=Vector((-.1,.08,z))
        p1=d*.72+Vector((-.13,.08,z+.48))
        p2=d*(L*.60)+t*.12+Vector((-.1,.1,z+(h-z)*.62))
        p3=d*L+t*.18+Vector((-.1,.1,h))
        tube("Twisting scaffold limb %02d"%i,[p0,p1,p2,p3],
             [.43 if z<4.5 else .32,.34,.22,.075],14)
        tips.append((p3, .8))
        for j,s in enumerate([-1,1]):
            base=p1.lerp(p2,.5 if s<0 else .86)
            da=a+s*.48
            dd=Vector((math.cos(da),math.sin(da),0))
            end=dd*(L+random.uniform(-.25,.25))+Vector((-.08,.1,h+random.uniform(-.1,.7)))
            mid=base.lerp(end,.58)+Vector((0,0,.25))
            tube("Secondary spreading bough",[base,mid,end],[.19,.12,.035],10)
            tips.append((end,.75))
            for q in [-1,1]:
                twigbase=mid.lerp(end,.25)
                twig= end+Vector((q*.38*math.cos(da+1.1),q*.38*math.sin(da+1.1),.45))
                tube("Crown fork",[twigbase,end,twig],[.08,.045,.009],7)
                tips.append((twig,.52))
    tube("Crooked upper leader",[(-.18,.12,5.5),(-.27,.2,6.5),(.04,.16,7.5),
          (-.25,.1,8.5),(-.1,.26,9.12)],[.33,.27,.18,.11,.025],13)
    tips.extend([(Vector((-.1,.26,9.05)),.72),(Vector((.8,-.1,8.8)),.7),
                 (Vector((-.9,.5,8.7)),.65)])
    # Coarse scalloped foliage volumes, not one continuous spherical crown.
    leafverts=[]; leaffaces=[]; leafids=[]
    def crown(c,scale,index):
        rx=scale*random.uniform(.9,1.22)
        ry=scale*random.uniform(.85,1.13)
        rz=scale*random.uniform(.62,.9)
        n=12; rings=7
        vs=[tuple(c+Vector((0,0,-rz)))]
        phase=random.random()*6.28
        for j in range(1,rings):
            lat=-math.pi/2+math.pi*j/rings
            for k in range(n):
                a=2*math.pi*k/n
                wob=1+.13*math.sin(a*3+phase+j*.7)+random.uniform(-.07,.07)
                vs.append(tuple(c+Vector((rx*math.cos(lat)*math.cos(a)*wob,
                       ry*math.cos(lat)*math.sin(a)*wob,rz*math.sin(lat)*wob))))
        top=len(vs);vs.append(tuple(c+Vector((.03,0,rz))))
        fs=[]
        for k in range(n):fs.append((0,1+(k+1)%n,1+k))
        for j in range(rings-2):
            for k in range(n):
                a=1+j*n+k;b=1+j*n+(k+1)%n
                fs.append((a,b,b+n,a+n))
        for k in range(n): fs.append((1+(rings-2)*n+k,1+(rings-2)*n+(k+1)%n,top))
        ids=[]
        for f in fs:
            z=sum(vs[q][2] for q in f)/len(f)
            ids.append(random.choices([0,1,2,3],[1,4,5,2] if z>c.z else [4,5,2,0])[0])
        mesh("Scalloped broadleaf crown %02d"%index,vs,fs,leaves,ids,False)
        # Small angular leaf fans break the silhouette and provide readable leaf scale.
        for r in range(38):
            a=random.uniform(0,2*math.pi)
            v=random.uniform(-.65,.92)
            fac=math.sqrt(1-v*v)
            p=c+Vector((rx*fac*math.cos(a),ry*fac*math.sin(a),rz*v))
            axis=Vector((math.cos(a),math.sin(a),random.uniform(-.15,.65))).normalized()
            across=Vector((-axis.y,axis.x,.1)).normalized()
            size=random.uniform(.10,.20)
            off=len(leafverts)
            leafverts.extend([tuple(p-axis*size*.3),tuple(p+across*size*.45),
                              tuple(p+axis*size),tuple(p-across*size*.45),
                              tuple(p+axis*size*.32+Vector((0,0,.025)))])
            leaffaces.extend([(off,off+1,off+4),(off+1,off+2,off+4),
                              (off+2,off+3,off+4),(off+3,off,off+4)])
            leafids.extend([random.choice([1,2,3,4])]*4)
    for i,(p,s) in enumerate(tips):
        crown(p+Vector((0,0,.16)),s,i)
    mesh("Individual broadleaf silhouette sprays",leafverts,leaffaces,leaves,leafids,False)
    # Long, shallow fissures in the lower bark emphasize its scale without textures.
    for k in range(23):
        a=2*math.pi*k/23
        if math.sin(a)<-.55: continue
        pts=[]
        for j,z in enumerate([.36,.9,1.5,2.15,2.8,3.25]):
            r=.99-.115*z
            aa=a+.018*math.sin(z*2+k)
            pts.append((-.035*z+r*math.cos(aa),.025*z+r*math.sin(aa),z))
        ob=tube("Fine longitudinal bark ridge",pts,[.025,.027,.026,.022,.016,.006],5)
        ob.data.materials.clear()
        ob.data.materials.append(barklight if k%3 else barkdark)
        for p in ob.data.polygons:p.material_index=0
    bpy.context.scene.unit_settings.system='METRIC'
    bpy.context.scene.unit_settings.scale_length=1
    return {"notes":"Static ancient broadleaf. Open recessed dwelling-sized hollow faces front; asymmetric scaffold limbs, branching ground-entering buttress roots, scalloped foliage and individual leaf sprays. No dwelling or scenery."}
import bpy
import bmesh
import math
import random
from mathutils import Vector

def build():
    random.seed(42)

    def material(name, color, roughness=0.9):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        bs = m.node_tree.nodes.get("Principled BSDF")
        bs.inputs["Base Color"].default_value = (*color, 1)
        bs.inputs["Roughness"].default_value = roughness
        return m

    bark = material("Weathered warm grey bark", (0.205, 0.145, 0.095))
    bark_light = material("Raised bark plates", (0.285, 0.211, 0.139))
    bark_dark = material("Deep bark fissures", (0.092, 0.060, 0.037))
    interior = material("Sheltered hollow heartwood", (0.115, 0.077, 0.046))
    worn = material("Worn hollow lip", (0.315, 0.228, 0.139))
    moss = material("Shade moss", (0.145, 0.219, 0.066))
    moss_light = material("Moss tips", (0.225, 0.294, 0.091))
    foliage = [
        material("Leaves deep forest", (0.075, 0.156, 0.038)),
        material("Leaves woodland green", (0.145, 0.265, 0.057)),
        material("Leaves sunward green", (0.238, 0.351, 0.085)),
        material("Leaves muted olive", (0.188, 0.284, 0.066)),
    ]
    wood_mats = [bark, bark_light, bark_dark, interior, worn]

    def mesh_obj(name, vertices, faces, mats, indices=None, smooth=False):
        me = bpy.data.meshes.new(name)
        me.from_pydata(vertices, [], faces)
        me.update()
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        for mat in mats:
            me.materials.append(mat)
        if indices is not None:
            for p, idx in zip(me.polygons, indices):
                p.material_index = idx
        for p in me.polygons:
            p.use_smooth = smooth
        return ob

    def recalc(ob):
        bm = bmesh.new()
        bm.from_mesh(ob.data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(ob.data)
        bm.free()

    def center(z):
        return Vector((0.075 * math.sin(z * 0.85) + 0.022 * z,
                       0.045 * z + 0.08 * math.sin(z * 0.7), z))

    N = 64
    heights = [0.0, 0.17, 0.57, 1.12, 1.57, 2.46, 2.85,
               3.55, 4.35, 5.15, 5.95, 6.75, 7.5, 8.05]
    radii = [1.19, 1.17, 1.04, 0.94, 0.89, 0.83, 0.80,
             0.73, 0.62, 0.52, 0.40, 0.29, 0.18, 0.035]
    half_open = 8

    def theta(j):
        return j * 2 * math.pi / N

    def angle_distance(j):
        return min(j % N, N - j % N)

    def ring_z(k, j):
        z = heights[k]
        if k == 5:
            d = angle_distance(j)
            if d <= half_open:
                z = 1.78 + 0.78 * math.sqrt(max(0, 1 - (d / half_open) ** 2))
            elif d < 14:
                z = 1.78 + (2.46 - 1.78) * (d - half_open) / 6
        return z

    def outer_pos(k, j, extra=0):
        a = theta(j)
        z = ring_z(k, j)
        flute = 0.066 + 0.115 * math.exp(-z * 1.15)
        ripple = flute * math.cos(7 * a + 0.18 * z)
        ripple += 0.033 * math.sin(13 * a - z * 0.8)
        ripple += 0.016 * math.cos(23 * a + z)
        r = radii[k] * (1 + ripple) + extra
        c = center(z)
        return (c.x + r * math.sin(a), c.y - r * math.cos(a), z)

    def inner_pos(k, j):
        a = theta(j)
        z = ring_z(k, j)
        r = [0.70, 0.74, 0.76, 0.75, 0.72, 0.64, 0.53][k]
        r *= 1 + 0.032 * math.sin(9 * a + z)
        c = center(z)
        return (c.x + r * math.sin(a), c.y - r * math.cos(a), z)

    def opening_sector(j):
        return j < half_open or j >= N - half_open

    verts = [outer_pos(k, j) for k in range(len(heights)) for j in range(N)]
    faces, ids = [], []
    for k in range(len(heights) - 1):
        for j in range(N):
            if 1 <= k < 5 and opening_sector(j):
                continue
            faces.append((k*N+j, k*N+(j+1)%N, (k+1)*N+(j+1)%N, (k+1)*N+j))
            ids.append(1 if (j * 11 + k * 3) % 19 < 3 else 0)
    inner_start = len(verts)
    verts.extend(inner_pos(k, j) for k in range(7) for j in range(N))

    def oi(k, j):
        return k*N + j%N

    def ii(k, j):
        return inner_start + k*N + j%N

    for k in range(6):
        for j in range(N):
            if 1 <= k < 5 and opening_sector(j):
                continue
            faces.append((ii(k,j+1), ii(k,j), ii(k+1,j), ii(k+1,j+1)))
            ids.append(3)
    for j in range(N):
        faces.append((oi(0,j+1), oi(0,j), ii(0,j), ii(0,j+1)))
        ids.append(0)
        if opening_sector(j):
            for k in (1, 5):
                faces.append((oi(k,j), oi(k,j+1), ii(k,j+1), ii(k,j)))
                ids.append(4 if k == 1 else 0)
    for j in (half_open, N-half_open):
        for k in range(1,5):
            faces.append((oi(k,j), ii(k,j), ii(k+1,j), oi(k+1,j)))
            ids.append(4 if k < 3 else 0)
    floor_idx = len(verts)
    verts.append((center(0).x, center(0).y, 0.025))
    roof_idx = len(verts)
    verts.append(tuple(center(2.79)))
    for j in range(N):
        faces.append((floor_idx, ii(0,j), ii(0,j+1)))
        ids.append(3)
        faces.append((roof_idx, ii(6,j+1), ii(6,j)))
        ids.append(3)
    faces.append(tuple(oi(len(heights)-1,j) for j in range(N)))
    ids.append(0)
    trunk = mesh_obj("Ancient fluted trunk with open, thick-walled dwelling hollow",
                     verts, faces, wood_mats, ids, True)
    recalc(trunk)

    def interpolated(keys, steps=3):
        result = []
        for i in range(len(keys)-1):
            p0 = Vector(keys[max(0,i-1)][:3])
            p1 = Vector(keys[i][:3])
            p2 = Vector(keys[i+1][:3])
            p3 = Vector(keys[min(len(keys)-1,i+2)][:3])
            for s in range(steps):
                t = s / steps
                p = 0.5*((2*p1) + (-p0+p2)*t +
                         (2*p0-5*p1+4*p2-p3)*t*t +
                         (-p0+3*p1-3*p2+p3)*t*t*t)
                r = keys[i][3]*(1-t) + keys[i+1][3]*t
                result.append((p,r))
        result.append((Vector(keys[-1][:3]),keys[-1][3]))
        return result

    def tube(name, keys, sides=10, root=False, grooves=False):
        samples = interpolated(keys, 3)
        vs, fs, mi, frames = [], [], [], []
        for k,(p,r) in enumerate(samples):
            tangent = samples[min(k+1,len(samples)-1)][0] - samples[max(0,k-1)][0]
            tangent.normalize()
            if root:
                u = tangent.cross(Vector((0,0,1))).normalized()
                v = u.cross(tangent).normalized()
            else:
                ref = Vector((0,1,0)) if abs(tangent.y) < .9 else Vector((1,0,0))
                u = tangent.cross(ref).normalized()
                v = tangent.cross(u).normalized()
            frames.append((u,v))
            for j in range(sides):
                a = j*2*math.pi/sides
                rr = r*(1+0.075*math.sin(j*2.7+k*.47))
                off = u*(math.cos(a)*rr) + v*(math.sin(a)*rr*(1.32 if root else 1))
                q = p + off
                if root:
                    q.z = max(0.006, q.z)
                vs.append(tuple(q))
        for k in range(len(samples)-1):
            for j in range(sides):
                fs.append((k*sides+j, k*sides+(j+1)%sides,
                           (k+1)*sides+(j+1)%sides,(k+1)*sides+j))
                mi.append(1 if j%7==3 else 0)
        fs.append(tuple(reversed(range(sides))))
        mi.append(0)
        fs.append(tuple((len(samples)-1)*sides+j for j in range(sides)))
        mi.append(0)
        ob = mesh_obj(name,vs,fs,wood_mats,mi,True)
        recalc(ob)
        if grooves:
            gv,gf = [],[]
            for a0 in (0.42,2.4,4.5):
                for k,(p,r) in enumerate(samples):
                    u,v = frames[k]
                    a = a0+0.07*math.sin(k*.7)
                    for d in (-.025,.025):
                        q = p+(u*math.cos(a+d)+v*math.sin(a+d)*(1.32 if root else 1))*(r*1.065)
                        if root:
                            q.z=max(.012,q.z)
                        gv.append(tuple(q))
                start = len(gv)-2*len(samples)
                for k in range(len(samples)-1):
                    gf.append((start+2*k,start+2*k+1,start+2*k+3,start+2*k+2))
            mesh_obj(name+" longitudinal creases",gv,gf,[bark_dark])
        return ob

    # Buttresses penetrate the flared trunk; flattened undersides meet ground.
    root_angles = [0.84,1.36,1.96,2.53,3.09,3.65,4.15,4.75,5.27,5.65]
    for n,a in enumerate(root_angles):
        length = random.uniform(2.35,3.35)
        sway = random.uniform(-.24,.24)

        def rp(rad, ang, z, r):
            return (math.sin(ang)*rad, -math.cos(ang)*rad, z, r)

        keys = [
            rp(.68,a,random.uniform(.68,1.05),.38),
            rp(1.05,a,.40,.36),
            rp(1.50,a+sway*.4,.20,.255),
            rp(length*.78,a+sway,.095,.13),
            rp(length,a+sway*1.2,.023,.014),
        ]
        tube("Root buttress %02d"%n,keys,12,True,True)
        for fork in range(2):
            sign = 1 if fork else -1
            start_rad = 1.46 if fork == 0 else length*.69
            aa = a+sway*.6
            p = Vector((math.sin(aa)*start_rad,-math.cos(aa)*start_rad,.12))
            direction = Vector((math.sin(aa+sign*.52),-math.cos(aa+sign*.52),0))
            end = p + direction*random.uniform(.82,1.33)
            tube("Branching root %02d.%d"%(n,fork),[
                (*p,.15 if fork==0 else .095),
                (*(p+direction*.40+Vector((0,0,-.055))),.085),
                (end.x,end.y,.012,.008)],8,True)
    for sign in (-1,1):
        tube("Entrance sill framing root",[
            (sign*.73,-.70,.35,.21),
            (sign*.96,-1.12,.16,.18),
            (sign*1.37,-1.73,.055,.075),
            (sign*1.74,-2.05,.012,.009)],10,True,True)

    gv,gf = [],[]
    for j in range(N):
        if j%3 == 0:
            continue
        for k in range(len(heights)-2):
            if 1 <= k < 5 and angle_distance(j) <= half_open+1:
                continue
            if random.random() < .12:
                continue
            start = len(gv)
            for kk in (k,k+1):
                p = Vector(outer_pos(kk,j,.008))
                a = theta(j)
                tangent = Vector((math.cos(a),math.sin(a),0))
                width = random.uniform(.008,.020)*(1-kk*.035)
                gv.extend([tuple(p-tangent*width),tuple(p+tangent*width)])
            gf.append((start,start+1,start+3,start+2))
    mesh_obj("Split vertical bark grain",gv,gf,[bark_dark])

    mv,mf,mm = [],[],[]
    for n in range(22):
        j = random.randint(15,51)
        endk = random.choice([2,3,4,5,6])
        start = len(mv)
        for k in range(endk+1):
            width = random.uniform(.023,.075)*(1-k/(endk+1)*.65)
            p = Vector(outer_pos(k,j,.018))
            a = theta(j)
            side = Vector((math.cos(a),math.sin(a),0))
            for s in (-1,0,1):
                q=p+side*width*s
                if s==0:
                    q += Vector((math.sin(a),-math.cos(a),0))*.012
                mv.append(tuple(q))
        for k in range(endk):
            for s in range(2):
                mf.append((start+k*3+s,start+k*3+s+1,start+(k+1)*3+s+1,start+(k+1)*3+s))
                mm.append(1 if random.random()<.24 else 0)
    mesh_obj("Damp moss following basal furrows",mv,mf,[moss,moss_light],mm)

    clusters = []
    specs = [
        (.40,3.25,3.05,7.10),
        (1.22,4.00,3.10,7.68),
        (2.05,3.70,2.92,7.92),
        (2.88,4.55,2.78,8.30),
        (3.61,4.12,3.18,7.46),
        (4.40,3.22,3.10,7.12),
        (5.19,4.62,3.00,8.00),
        (5.83,5.12,2.60,8.50),
    ]
    for n,(a,z0,span,top) in enumerate(specs):
        direction=Vector((math.sin(a),-math.cos(a),0))
        lateral=Vector((math.cos(a),math.sin(a),0))
        base=center(z0)
        elbow=base+direction*.98+Vector((0,0,.65))
        shoulder=direction*(span*.65)+Vector((.12,.16,top-1.48))
        tip=direction*span+Vector((.10,.13,top))
        tube("Heavy asymmetric bough %02d"%n,[
            (*base,.41 if z0<4.3 else .31),
            (*elbow,.32 if z0<4.3 else .26),
            (*shoulder,.22),
            (*tip,.065),
            (*(tip+direction*.17+Vector((0,0,.27))),.012)
        ],12,False,True)
        clusters.append((tip+Vector((0,0,.30)),
                         (random.uniform(.95,1.22),random.uniform(.88,1.13),random.uniform(.67,.87))))
        for fork,sgn in enumerate((-1,1)):
            attach=elbow.lerp(shoulder,.58 if fork==0 else .90)
            endpoint=direction*(span*.83)+lateral*sgn*random.uniform(.70,1.08)
            endpoint+=Vector((.10,.12,top+random.uniform(-.10,.47)))
            mid=attach.lerp(endpoint,.56)+Vector((0,0,.21))
            tube("Ascending fork %02d.%d"%(n,fork),[
                (*attach,.17),(*mid,.115),(*endpoint,.035),
                (*(endpoint+Vector((.08*sgn,0,.35))),.007)],9)
            clusters.append((endpoint+Vector((0,0,.29)),
                             (random.uniform(.85,1.11),random.uniform(.85,1.13),random.uniform(.65,.87))))
            twig_end=mid+lateral*sgn*.49+Vector((0,0,.56))
            tube("Exposed fine twig %02d.%d"%(n,fork),[
                (*mid,.054),(*(mid.lerp(twig_end,.6)),.027),(*twig_end,.006)],6)
        if n in (0,3,5):
            p=elbow.lerp(shoulder,.23)
            q=p+lateral*.53+direction*.24+Vector((0,0,.18))
            tube("Old weathered branch spur %02d"%n,[
                (*p,.115),(*(p.lerp(q,.65)),.075),(*q,.035)],8,False,True)

    for n in range(7):
        a=n*2.399+0.2
        r=random.uniform(.65,1.72)
        end=Vector((math.sin(a)*r+.1,math.cos(a)*r+.22,random.uniform(8.55,9.05)))
        start=center(random.uniform(6.0,7.15))
        mid=start.lerp(end,.57)+Vector((0,0,.22))
        tube("Upper crown leader %02d"%n,[
            (*start,.17),(*mid,.105),(*end,.018)],9)
        clusters.append((end,(random.uniform(.88,1.15),random.uniform(.85,1.12),random.uniform(.67,.90))))

    # Keep the original crown envelope and random sequence, but use coarser
    # envelope topology and retain forty of each original seventy-five leaves.
    leaf_v,leaf_f,leaf_i = [],[],[]
    for ci,(c,scale) in enumerate(clusters):
        sx,sy,sz=scale
        phase=random.uniform(0,2*math.pi)
        tilt=random.uniform(-.35,.35)

        def shape(t,p):
            rr=1+.105*math.sin(5*p+phase)*math.sin(t)**2
            rr+=.065*math.sin(3*t+2*p+phase)+.037*math.cos(9*p-4*t)
            x=sx*math.sin(t)*math.cos(p)*rr
            y=sy*math.sin(t)*math.sin(p)*rr
            z=sz*math.cos(t)*rr
            return Vector((x*math.cos(tilt)-y*math.sin(tilt),
                           x*math.sin(tilt)+y*math.cos(tilt),z))

        original_colors = []
        for k in range(6):
            row = []
            for j in range(16):
                row.append(random.choices([0,1,2,3],[14,43,16 if k<3 else 5,28])[0])
            original_colors.append(row)

        cv=[tuple(c+shape(0,0))]
        lat,lon=6,12
        for k in range(1,lat):
            for j in range(lon):
                cv.append(tuple(c+shape(math.pi*k/lat,2*math.pi*j/lon)))
        bottom=len(cv)
        cv.append(tuple(c+shape(math.pi,0)))
        cf,cm=[],[]
        for j in range(lon):
            cf.append((0,1+j,1+(j+1)%lon))
            cm.append(2 if ci%3==0 else 1)
        for k in range(lat-2):
            for j in range(lon):
                a=1+k*lon+j
                b=1+k*lon+(j+1)%lon
                d=1+(k+1)*lon+j
                e=1+(k+1)*lon+(j+1)%lon
                cf.extend([(a,d,e),(a,e,b)])
                idx=original_colors[min(5,int(k*6/4))][int(j*16/12)]
                cm.extend([idx,idx])
        for j in range(lon):
            cf.append((bottom,1+(lat-2)*lon+(j+1)%lon,1+(lat-2)*lon+j))
            cm.append(0 if j%3 else 3)
        ob=mesh_obj("Uneven leafy crown %02d"%ci,cv,cf,foliage,cm,False)
        recalc(ob)

        for li in range(75):
            z=random.uniform(-.96,.98)
            t=math.acos(z)
            p=random.uniform(0,2*math.pi)
            local=shape(t,p)
            normal=Vector((local.x/sx**2,local.y/sy**2,local.z/sz**2)).normalized()
            pos=c+local+normal*random.uniform(.015,.085)
            ref=Vector((0,0,1)) if abs(normal.z)<.9 else Vector((1,0,0))
            u=normal.cross(ref).normalized()
            v=normal.cross(u).normalized()
            rot=random.uniform(0,2*math.pi)
            long_axis=u*math.cos(rot)+v*math.sin(rot)
            side=normal.cross(long_axis).normalized()
            length=random.uniform(.105,.205)
            width=length*random.uniform(.42,.66)
            idx=random.choices([0,1,2,3],[8,40,32 if z>0 else 10,22])[0]
            if li >= 40:
                continue
            start=len(leaf_v)
            leaf_v.extend([
                tuple(pos-long_axis*length),
                tuple(pos+side*width),
                tuple(pos+long_axis*length),
                tuple(pos-side*width),
                tuple(pos+normal*.028),
            ])
            for j in range(4):
                leaf_f.append((start+j,start+(j+1)%4,start+4))
                leaf_i.append(idx)
    mesh_obj("Individual folded broadleaf edge sprays",leaf_v,leaf_f,foliage,leaf_i)
    for m in foliage:
        m.use_backface_culling=False

    bpy.context.scene.unit_settings.system='METRIC'
    bpy.context.scene.unit_settings.scale_length=1.0
    return {"notes":"Static ancient broadleaf, approximately ten metres tall. Original trunk, hollow, roots and branch geometry retained. Crown envelopes reduced to 120 triangles each and forty folded leaves per cluster, preserving crown size and placement within the 28000-triangle budget. Front hollow has thick jambs, an inner back wall, ceiling and low sill. Deeply intersecting flared buttresses split into grounded surface roots; moss follows shaded basal furrows. No scenery."}
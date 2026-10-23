# Low-poly wooden mannequin in the reference leap. Joints read off the photo (x, y in image px);
# depth recovered from true bone lengths (foreshortening). Blender: X right, Z up, +Y away from camera.
import bpy, bmesh, math, json, sys
from mathutils import Vector
S=0.01
import os
SMOOTH=os.environ.get('SMOOTH')=='1'   # fully rounded twin: same parts and pose, dense and smooth-shaded
K=3 if SMOOTH else 1
J2 = dict(hR=(232,650), hL=(292,645), kR=(213,845), aR=(195,1045), tR=(160,1112),
 kL=(205,820), aL=(350,955), tL=(392,1000), hc=(262,640), waist=(322,500), neck=(420,396), crown=(494,324),
 sR=(332,422), eR=(283,372), wR=(268,332), fR=(266,300),
 sL=(445,436), eL=(575,408), wL=(705,370), fL=(770,334))
DEPTH = dict(hR=8,hL=-8,hc=0,waist=-5,neck=0,crown=0, sR=10, sL=-6)   # px; + away from camera
# chains: (parent joint, child joint, true length px, sign of depth step)
CHAINS=[("sR","eR",128,+1),("eR","wR",124,+1),("wR","fR",58,+1),
        ("sL","eL",133,0),("eL","wL",135,0),("wL","fL",70,0),
        ("hR","kR",198,0),("kR","aR",202,0),("aR","tR",78,-1),
        ("hL","kL",198,0),("kL","aL",200,0),("aL","tL",66,+1)]
for a,b,L,sg in CHAINS:
    dx=J2[b][0]-J2[a][0]; dy=J2[b][1]-J2[a][1]; l=math.hypot(dx,dy)
    DEPTH[b]=DEPTH[a]+sg*math.sqrt(max(L*L-l*l,0))
P={k:Vector(((x)*S, DEPTH.get(k,0)*S, -(y)*S)) for k,(x,y) in J2.items()}
if os.environ.get('REST')=='1':
    # rest pose for rigging: standing A-pose, facing -Y (toward the camera), true bone lengths, feet on z=0
    import math as _m
    def V(x,y,z): return Vector((x,y,z))
    hz=0.12+2.02+1.98; P={}
    P["hc"]=V(0,0,hz); P["waist"]=V(0,0.04,hz+1.46); P["neck"]=V(0,0,hz+2.92); P["crown"]=V(0,-0.05,hz+3.95)
    a=_m.radians(22)
    for side,sx in (("R",-1),("L",1)):
        P["h"+side]=V(0.30*sx,0,hz); P["k"+side]=V(0.30*sx,-0.02,hz-1.98); P["a"+side]=V(0.30*sx,0,0.12); P["t"+side]=V(0.30*sx,-0.70,0.04)
        s_=V(0.60*sx,0.02,hz+2.72); d=V(sx*_m.sin(a),0,-_m.cos(a))
        P["s"+side]=s_; P["e"+side]=s_+d*1.30; P["w"+side]=P["e"+side]+d*1.27; P["f"+side]=P["w"+side]+d*0.62

bpy.ops.wm.read_factory_settings(use_empty=True)
mats={}
def mat(name,rgb):
    if name in mats: return mats[name]
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    b=m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value=(*rgb,1); b.inputs["Roughness"].default_value=0.55
    mats[name]=m; return m
WOOD=mat("wood_body",(0.30,0.15,0.06)); JOINT=mat("wood_joint",(0.22,0.11,0.045))
def place(obj,a,b,center_t=0.5):
    d=b-a; obj.location=a+d*center_t
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(d.normalized())
def finish(obj,name,m):
    obj.name=name; obj.data.materials.append(m)
    for p in obj.data.polygons: p.use_smooth=SMOOTH
    return obj
def ellipsoid(name,a,b,half,rx,ry,t=0.5,m=WOOD,seg=10,rings=7,taper=0.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg*K,ring_count=rings*K,radius=1)
    o=bpy.context.object
    if taper:
        for v in o.data.vertices: f=1+taper*v.co.z; v.co.x*=f; v.co.y*=f
    o.scale=(rx*S,ry*S,half*S); place(o,P[a] if isinstance(a,str) else a,P[b] if isinstance(b,str) else b,t)
    return finish(o,name,m)
def ball(name,j,r,m=JOINT):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8*K,ring_count=6*K,radius=r*S,location=P[j] if isinstance(j,str) else j)
    return finish(bpy.context.object,name,m)
def spindle(name,a,b,r0,r1,bulge,peak=0.35,m=WOOD,sides=8,rings=7,flat=1.0):
    sides*=K; rings*=K
    # mannequin limb: a lathe profile, fattest at `peak` (Bridgman: bellies high, tendons low)
    A=P[a];B=P[b]; L=(B-A).length
    me=bpy.data.meshes.new(name); bm=bmesh.new(); rows=[]
    for i in range(rings+1):
        t=i/rings; x=t/peak if t<peak else (1-t)/(1-peak)
        r=(r0+(r1-r0)*t+bulge*math.sin(x*math.pi/2))*S
        rows.append([bm.verts.new((r*math.cos(2*math.pi*k/sides), r*flat*math.sin(2*math.pi*k/sides), t*L)) for k in range(sides)])
    for i in range(rings):
        for k in range(sides): bm.faces.new((rows[i][k],rows[i][(k+1)%sides],rows[i+1][(k+1)%sides],rows[i+1][k]))
    bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1]); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o)
    o.location=A; o.rotation_mode='QUATERNION'; o.rotation_quaternion=Vector((0,0,1)).rotation_difference((B-A).normalized())
    o.data.materials.append(m)
    for p in me.polygons: p.use_smooth=SMOOTH
    return o
def limb(name,a,b,r0,r1,m=WOOD,gap=0.0):
    A=P[a];B=P[b]; d=B-A; L=d.length
    bpy.ops.mesh.primitive_cone_add(vertices=8*K,radius1=r0*S,radius2=r1*S,depth=L*(1-2*gap))
    o=bpy.context.object; place(o,A,B); return finish(o,name,m)
# torso: head, neck, chest, waist ring, abdomen, pelvis
ellipsoid("head","neck","crown",58,46,44,t=0.52,taper=0.12)
limb("neck","neck","crown",11,10)  # trimmed visually by the head
bpy.context.object.scale.z=0.35; bpy.context.object.location=P["neck"]+(P["crown"]-P["neck"])*0.08
ellipsoid("chest","waist","neck",76,66,48,t=0.53,taper=-0.15)
ball("waist_joint","waist",24)
ellipsoid("abdomen","hc","waist",66,60,44,t=0.55,taper=0.12)
pel=(P["hR"]+P["hL"])/2
ellipsoid("pelvis",pel+Vector((0,0,-0.05)),pel+(Vector((0,0,0.6)) if os.environ.get("REST")=="1" else Vector((0.18,0,0.6))),38,56,40,t=0.15)
THICK=dict(R=dict(sh=20,ua=(17,14,4),el=14,fa=(15,10,3),wr=10,hand=(15,8)),
           L=dict(sh=23,ua=(19,15,5),el=15,fa=(17,11,4),wr=11,hand=(17,8)))
for side in ("R","L"):
    T=THICK[side]
    ball(f"shoulder_{side}",f"s{side}",T["sh"]); spindle(f"upper_arm_{side}",f"s{side}",f"e{side}",*T["ua"],peak=0.3)
    ball(f"elbow_{side}",f"e{side}",T["el"]); spindle(f"forearm_{side}",f"e{side}",f"w{side}",*T["fa"],peak=0.25)
    ball(f"wrist_{side}",f"w{side}",T["wr"])
    ellipsoid(f"hand_{side}",f"w{side}",f"f{side}",(P[f"f{side}"]-P[f"w{side}"]).length/S*0.58,T["hand"][0],T["hand"][1],t=0.52,seg=8,rings=5,taper=-0.2)
    ball(f"hip_{side}",f"h{side}",24); spindle(f"thigh_{side}",f"h{side}",f"k{side}",28,19,8,peak=0.3)
    ball(f"knee_{side}",f"k{side}",19); spindle(f"shin_{side}",f"k{side}",f"a{side}",19,11,4,peak=0.25)
    ball(f"ankle_{side}",f"a{side}",12)
    ellipsoid(f"foot_{side}",f"a{side}",f"t{side}",(P[f"t{side}"]-P[f"a{side}"]).length/S*0.8,28,14,t=0.35,seg=8,rings=5,taper=-0.4)
# camera: orthographic, matching the photo frame (866 x 1290 px)
cam=bpy.data.cameras.new("cam"); cam.type='ORTHO'; cam.ortho_scale=12.90
co=bpy.data.objects.new("cam",cam); bpy.context.scene.collection.objects.link(co)
co.location=(4.33,-20,-6.45); co.rotation_euler=(math.radians(90),0,0)
sc=bpy.context.scene; sc.camera=co; sc.render.resolution_x=866; sc.render.resolution_y=1290
sc.render.engine='BLENDER_WORKBENCH'
sh=sc.display.shading
def render(path,silhouette):
    if silhouette:
        sh.light='FLAT'; sh.color_type='SINGLE'; sh.single_color=(1,1,1); sh.show_cavity=False

    else:
        sh.light='STUDIO'; sh.color_type='MATERIAL'; sh.show_cavity=True; sh.cavity_type='WORLD'
        sh.background_type='VIEWPORT'; sh.background_color=(1,1,1)
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
sh.background_type='VIEWPORT'; sh.background_color=(0,0,0)
sc.view_settings.view_transform='Standard'
render(sys.argv[-1]+"_sil.png",True)
render(sys.argv[-1]+"_shaded.png",False)
bpy.ops.wm.save_as_mainfile(filepath=sys.argv[-1]+'.blend')
for o in list(bpy.data.objects):
    if o.type=='CAMERA': bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=sys.argv[-1]+".glb",export_format='GLB',export_apply=True)
json.dump({k:[round(v.x,4),round(v.z,4),round(-v.y,4)] for k,v in P.items()},open(sys.argv[-1]+"_joints.json","w"))
print("faces",sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))

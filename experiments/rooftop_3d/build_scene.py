"""Milestone 1: editable, genuinely 3D spatial/light study, no source-image projection."""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
R = random.Random(28)
ROOT = Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
from modular_assets import assemble_modules, explode
from alcove import build_alcove
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)
base = bpy.data.collections.get('Collection'); base.name = '00 · Study'
def collection(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c
architecture=collection('01 · Deck and joinery')
tree=collection('02 · Living timber')
soft=collection('03 · Cushions')
lanterns=collection('04 · Lanterns')
flowers=collection('05 · Blossom studies')
landscape=collection('06 · Distant mountains')
lighting=collection('07 · Cameras and light')
def move(obj, col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)
    return obj

def material(name, color, rough=.6, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m
wood=material('Timber · plum and warm grain',(.23,.075,.095))
bark=material('Bark · dusky purple',(.10,.045,.07))
rose=material('Door · dusty rose',(.46,.13,.22))
trim=material('Wood edging · mulberry',(.21,.055,.072))
pink=material('Cushion · rose velvet',(.69,.21,.32),.88)
blush=material('Cushion · petal blush',(.88,.42,.48),.88)
gold=material('Lantern brass · warm',(.51,.22,.065),.34)
paper=material('Lantern paper · coral',(.95,.16,.12),.7,.3)
window=material('Window · sunset glow',(1,.59,.24),.35,1.7)
petals=[material('Petal · '+str(i),c,.75) for i,c in enumerate([(.82,.09,.25),(1,.28,.4),(.99,.47,.55),(.65,.06,.18)])]
flower_gold=material('Flower center',(1,.62,.17),.7)
# Procedural study grain: knowingly not a baked runtime material.
for mat,scale,detail in [(wood,(12,.6,5),.012),(bark,(5,5,.7),.055)]:
    nt=mat.node_tree; p=nt.nodes.get('Principled BSDF')
    coord=nt.nodes.new('ShaderNodeTexCoord'); mapping=nt.nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'; mapping.inputs[1].default_value=scale
    noise=nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=4; noise.inputs['Detail'].default_value=3
    nt.links.new(coord.outputs['Generated'],mapping.inputs[0]); nt.links.new(mapping.outputs[0],noise.inputs['Vector'])
    ramp=nt.nodes.new('ShaderNodeValToRGB')
    col=mat.diffuse_color[:3]
    ramp.color_ramp.elements[0].position=.18; ramp.color_ramp.elements[0].color=(*(v*.65 for v in col),1)
    ramp.color_ramp.elements[1].position=.82; ramp.color_ramp.elements[1].color=(*(min(v*1.35,1) for v in col),1)
    nt.links.new(noise.outputs['Fac'],ramp.inputs[0]); nt.links.new(ramp.outputs[0],p.inputs['Base Color'])
    bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.25; bump.inputs['Distance'].default_value=detail
    nt.links.new(noise.outputs['Fac'],bump.inputs['Height']); nt.links.new(bump.outputs[0],p.inputs['Normal'])

def cube(name,loc,scale,mat,col=architecture,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat: o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Soft edges','BEVEL'); b.width=bevel; b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return move(o,col)

def ball(name,loc,scale,mat,col=lanterns,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=True
    return move(o,col)

def rod(name,a,b,r,mat,col=architecture):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d.length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return move(o,col)

def limb(name,pts,radii):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=1;curve.bevel_resolution=3
    s=curve.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
    for p,co,r in zip(s.bezier_points,pts,radii):p.co=co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);tree.objects.link(obj);curve.materials.append(bark);return obj

# Deck with separate boards, real seams, fascia and structural thickness.
for i in range(17):
    o=cube('Deck plank %02d'%i,(-3+i*.375,0,-.10),(.36,5.8,.19),wood)
    o.location.z+=R.uniform(-.008,.008)
cube('Front fascia',(0,-2.94,-.22),(6.4,.18,.33),trim)
cube('Right fascia',(3.18,0,-.22),(.18,5.9,.33),trim)
for x in [-2.9,0,2.9]:cube('Under-deck joist',(x,0,-.35),(.18,5.75,.22),bark)
# Broad inset window alcove reconstructed from the source, above its own low bench.
alcove_details=build_alcove(cube,material,move,architecture)
(ROOT/'alcove-study.json').write_text(json.dumps(alcove_details,indent=2)+'\n')
cube('Low sofa base',(-2.45,-.77,.14),(1.06,2.85,.27),trim,col=soft,bevel=.10)
for y in [-1.68,-.78,.12]:
    cube('Seat cushion',(-2.42,y,.40),(1.08,.88,.29),pink,col=soft,bevel=.14)
    o=cube('Back pillow',(-2.84,y,.79),(.34,.72,.77),blush,col=soft,bevel=.15);o.rotation_euler.y=-.20
for i,(x,y) in enumerate([(-2.28,-1.73),(-2.37,.24),(-.65,2.31)]):
    o=cube('Loose soft pillow '+str(i),(x,y,.79 if i<2 else .29),(.63,.23,.57),blush,soft,.15);o.rotation_euler=(.16,-.18,.23*i)
# Balcony edge: completely modeled gaps reveal mountains from different cameras.
for x in [-.68,.28,1.24,2.20,3.14]:cube('Railing post',(x,2.62,.69),(.105,.13,1.38),trim)
rod('Top handrail',(-.83,2.62,1.35),(3.23,2.62,1.35),.085,wood)
rod('Bottom rail',(-.83,2.62,.10),(3.23,2.62,.10),.045,wood)
for i in range(19):
    x=-.75+i*.214
    rod('Baluster %02d'%i,(x,2.62,.13),(x,2.62,1.32),.028,trim)
# Tree architecture frames the left side and overhead.
limb('Main sheltering trunk',[(-3.23,-2.34,-.9),(-3.1,-2.15,.5),(-3.45,-1.8,1.9),(-3.12,-1.2,3.0),(-2.73,-.32,4.05),(-1.60,.6,4.6),(.05,1.1,4.65),(2.6,1.4,4.5)],[.55,.53,.49,.43,.40,.34,.22,.075])
limb('Door-side upright',[(-.81,2.73,-.4),(-.90,2.71,1.3),(-.74,2.64,2.7),(-1.12,2.7,4.06),(-2.25,2.0,4.48)],[.25,.22,.20,.24,.12])
limb('Roof limb',[(-2.9,-.15,3.88),(-2.4,1.0,3.91),(-1.7,2.45,3.96),(.1,2.87,4.17),(3.3,3.2,4.48)],[.26,.24,.18,.16,.045])
limb('Left upper fork',[(-3.2,-1.3,2.9),(-3.78,-.3,3.7),(-3.6,2,4.7)],[.24,.15,.045])
for i in range(9):
    x=-1.7+i*.58;y=2.8+R.uniform(-.3,.4);z=4.1+R.uniform(-.15,.3)
    limb('Blossom branch %02d'%i,[(x-.5,y-.2,z+.15),(x,y,z),(x+.34,y-.08,z-.35),(x+.57,y-.13,z-.76)],[.052,.035,.022,.009])
# A small overhead slatted shelter tucked behind the living branch.
for i in range(8):cube('Roof board',(-2.3+i*.32,1.48,3.95),(.30,2.6,.095),wood,bevel=.025)
# Lanterns have geometry, ribs, tassels and actual warm point lights.
for i,(x,y,z,r) in enumerate([(-.20,2.08,2.67,.23),(.75,2.18,2.31,.18),(1.72,2.10,2.75,.31),(2.77,2.11,2.63,.22)]):
    before_lantern=set(bpy.data.objects)
    top=4.04
    rod('Lantern cord %d'%i,(x,y,top),(x,y,z+r),.012,trim,lanterns)
    ball('Paper lantern %d'%i,(x,y,z),(r,r,r*1.07),paper)
    for j in range(12):
        a=j*math.tau/12
        pts=[]
        for k in range(17):
            t=.10+(math.pi-.20)*k/16
            pts.append((x+math.sin(t)*r*1.015*math.cos(a),y+math.sin(t)*r*1.015*math.sin(a),z+math.cos(t)*r*1.075))
        c=bpy.data.curves.new('Paper rib','CURVE');c.dimensions='3D';c.bevel_depth=.006;c.bevel_resolution=1
        s=c.splines.new('POLY');s.points.add(len(pts)-1)
        for p,co in zip(s.points,pts):p.co=(*co,1)
        ob=bpy.data.objects.new('Lantern rib',c);lanterns.objects.link(ob);c.materials.append(gold)
    rod('Lantern tassel',(x,y,z-r),(x,y,z-r-.19),.013,gold,lanterns)
    d=bpy.data.lights.new('Lantern warm light','POINT');d.energy=13;d.color=(1,.23,.055);d.shadow_soft_size=.28
    o=bpy.data.objects.new('Lantern warm light',d);lighting.objects.link(o);o.location=(x,y-.15,z)
    for part in set(bpy.data.objects)-before_lantern:part['module_key']='lantern.'+str(i)
# Shared low-detail flower geometry: a folded five-petal blossom, not a billboard.
verts=[];faces=[]
for j in range(5):
    a=j*math.tau/5; center=Vector((math.cos(a)*.65,math.sin(a)*.65,0));start=len(verts)
    verts.append((0,0,.16))
    for k in range(7):
        t=k*math.tau/7;v=center+Vector((math.cos(t)*.62,math.sin(t)*.49,.10*math.sin(t*2)))
        verts.append(tuple(v))
    for k in range(7):faces.append((start,start+1+k,start+1+(k+1)%7))
mesh=bpy.data.meshes.new('Five folded petals · shared geometry');mesh.from_pydata(verts,[],faces);mesh.materials.append(petals[0])
for i in range(800):
    x=R.uniform(-3.6,3.8);y=R.uniform(.25,3.5)
    z=R.uniform(3.94,4.85)
    if i%4==0:z-=R.uniform(.2,.9)
    o=bpy.data.objects.new('Blossom %04d'%i,mesh);flowers.objects.link(o);o.location=(x,y,z)
    o['cluster_id']=min(8,max(0,int((x+3.6)/7.4*9)))
    size=R.uniform(.045,.12);o.scale=(size,size,size)
    o.rotation_euler=(R.uniform(-1.1,1.1),R.uniform(-1.1,1.1),R.random()*math.tau)
    # Material overrides preserve shared mesh memory.
    o.material_slots[0].link='OBJECT';o.material_slots[0].material=R.choice(petals)
# Real low-detail terrain ridges behind balcony, each at a different distance.
for layer,(y,z,col) in enumerate([(18,-4.2,(.48,.29,.43)),(32,-3.2,(.69,.43,.53)),(48,-1.5,(.87,.59,.61))]):
    mat=material('Mountain haze '+str(layer),col,.9,.5+layer*.3)
    v=[];f=[]
    for i in range(26):
        x=-200+i*16;peak=z+R.uniform(.2,2.2)
        v.extend([(x,y,-10),(x,y,peak),(x,y+4,peak-.7)])
    for i in range(25):
        a=i*3;b=(i+1)*3;f.extend([(a,b,b+1,a+1),(a+1,b+1,b+2,a+2)])
    m=bpy.data.meshes.new('Distant ridge');m.from_pydata(v,[],f);m.materials.append(mat)
    o=bpy.data.objects.new('Mountain ridge '+str(layer),m);landscape.objects.link(o)
# Large emissive backdrop and world give sunset color without using the source picture.
sky=material('Sky · peach light',(1,.76,.48),1,1.2)
cube('Far sky',(0,85,12),(800,.3,400),sky,landscape,0)
# Actual area lighting creates contact and cast shadows through rails and petals.
def area(name,loc,target,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);lighting.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Sunset through blossoms',(5,8,6),(0,0,1),2200,(1,.60,.32),4)
area('Soft pink reflected light',(0,-4,5),(-1,1,1),700,(1,.53,.61),6)
area('Cool shelter fill',(-5,-2,4),(-1,1,2),650,(.46,.52,1),5)
scene=bpy.context.scene;scene.world.color=(.24,.14,.20)
def camera(name,loc,target,lens=45):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);lighting.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
main=camera('CAM 01 · Main composition',(7.2,-10.4,5.7),(-.35,.7,1.95),46)
second=camera('CAM 02 · Depth check',(3.7,-10.7,4.9),(-.25,1.0,1.9),44)
close=camera('CAM 04 · Alcove reference correction',(-.25,-6.25,2.60),(-1.85,2.4,1.91),62)
scene.camera=main
instances,assembly_manifest=assemble_modules(ROOT,(architecture,tree,soft,lanterns,flowers,lighting))
exploded_camera=camera('CAM 03 · Separate pieces',(13,-20,11),(0,.6,3.7),42)
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.cycles.max_bounces=5
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=False
# Saved file opens on the intended composition; all objects remain editable.
for screen in bpy.data.screens:
    for ar in screen.areas:
        if ar.type=='VIEW_3D':ar.spaces.active.region_3d.view_perspective='CAMERA'
scene['milestone']='1c / reference-led alcove correction — not final art'
scene['source_reference']='references/rooftop-source.png'
scene['next_gate']='Review camera, proportions and mood before detailed corner'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-study.blend'))
dg=bpy.context.evaluated_depsgraph_get();triangles=0
for entry in dg.object_instances:
    obj=entry.object
    if obj.type in {'MESH','CURVE'}:
        me=obj.to_mesh();me.calc_loop_triangles();triangles+=len(me.loop_triangles);obj.to_mesh_clear()
(ROOT/'inspection.json').write_text(json.dumps({'blender':bpy.app.version_string,'assembly_instances':len(instances),'unique_assets':len(assembly_manifest['assets']),'evaluated_triangles':triangles,'ground_petals':False,'vegetation_in_deck':False,'assets_linked_from_library':all(o.instance_collection.library is not None for o in instances),'cameras':[list(main.location),list(second.location)],'uses_reference_as_backdrop':False,'mobile_ready':False,'note':'Independent asset definitions and placement transforms. Procedural study materials still require runtime preparation.'},indent=2))
for cam,filename in [(main,'01-rooftop-study.png'),(second,'02-depth-study.png'),(close,'04-alcove-revision.png')]:
    scene.camera=cam;scene.render.filepath=str(ROOT/'renders'/filename);bpy.ops.render.render(write_still=True)
original=explode(instances)
landscape.hide_render=True
scene.camera=exploded_camera;scene.render.filepath=str(ROOT/'renders'/'03-exploded-pieces.png')
bpy.ops.render.render(write_still=True)
for o,matrix in original.items():o.matrix_world=matrix
landscape.hide_render=False
scene.camera=main
print('ROOFTOP_STUDY_COMPLETE', ROOT)

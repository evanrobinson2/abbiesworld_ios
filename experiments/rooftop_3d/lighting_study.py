"""Independent sunset lighting/background study built around the existing linked kit."""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-study.blend'))
scene=bpy.context.scene
old_environment=bpy.data.collections.get('06 · Distant mountains')
for o in list(old_environment.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.collections.remove(old_environment)
for o in list(scene.objects):
    if o.type=='LIGHT' and o.library is None:bpy.data.objects.remove(o,do_unlink=True)
environment=bpy.data.collections.new('ENVIRONMENT · sunset and distant mountains')
scene.collection.children.link(environment)
lights=bpy.data.collections.get('07 · Cameras and light')

def material(name,color,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.9
    p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m

def mesh_object(name,verts,faces,mat):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(mat)
    ob=bpy.data.objects.new(name,mesh);environment.objects.link(ob);return ob

def point_camera(name,loc,target,lens):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);lights.objects.link(o)
    o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens
    return o

camera=point_camera('CAM 05 · Sunset from the balcony',(2.1,-8.3,3.7),(-.05,1.5,2.08),45)
scene.camera=camera

# Individually removable mountain silhouettes. Profile detail changes at several scales.
# World-space spacing is small enough to form peaks, not the old near-horizontal bands.
for layer,(y,base,variation,color) in enumerate([
    (19,-4.4,2.6,(.43,.22,.41)),
    (32,-6.1,3.4,(.69,.31,.46)),
    (52,-11.0,4.5,(.9,.46,.48)),
    (82,-17.5,5.8,(1,.64,.45)),
]):
    rng=random.Random(210+layer)
    centers=[(rng.uniform(-90,90),rng.uniform(.55,1.2),rng.uniform(1.2,5.2)) for _ in range(48)]
    verts=[];faces=[]
    for i in range(601):
        x=-100+i/3
        peaks=sum(h*math.exp(-((x-c)/w)**4) for c,h,w in centers)
        z=base+variation*(.35*math.sin(x*.29+layer)+.24*math.sin(x*.91+.7*layer)+.20*peaks)
        verts.extend(((x,y,-70),(x,y,z),(x,y+2.8,z-.8)))
    for i in range(600):
        a=i*3;b=a+3;faces.extend(((a,b,b+1,a+1),(a+1,b+1,b+2,a+2)))
    m=material('Atmospheric mountain layer '+str(layer+1),color,.8)
    ob=mesh_object('Distant mountain '+str(layer+1),verts,faces,m)
    ob['independent_environment_layer']=True

# A luminous sky gradient remains background geometry; no artwork is projected over the room.
sky=material('Sunset sky · luminous honey and peach',(1,.7,.3),1)
nt=sky.node_tree;nt.nodes.clear()
geom=nt.nodes.new('ShaderNodeNewGeometry');sep=nt.nodes.new('ShaderNodeSeparateXYZ')
nt.links.new(geom.outputs['Position'],sep.inputs[0])
mapnode=nt.nodes.new('ShaderNodeMapRange');mapnode.inputs['From Min'].default_value=-12;mapnode.inputs['From Max'].default_value=55
nt.links.new(sep.outputs['Z'],mapnode.inputs['Value'])
ramp=nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=(1,.65,.28,1)
ramp.color_ramp.elements[1].position=1;ramp.color_ramp.elements[1].color=(.52,.13,.19,1)
e=ramp.color_ramp.elements.new(.28);e.color=(1,.89,.50,1)
e=ramp.color_ramp.elements.new(.61);e.color=(1,.46,.18,1)
nt.links.new(mapnode.outputs[0],ramp.inputs[0])
em=nt.nodes.new('ShaderNodeEmission');em.inputs['Strength'].default_value=5.0
nt.links.new(ramp.outputs[0],em.inputs['Color'])
out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(em.outputs[0],out.inputs['Surface'])
skyob=mesh_object('Peach sky gradient',[(-250,120,-90),(250,120,-90),(250,120,170),(-250,120,170)],[(0,1,2,3)],sky)
skyob.visible_diffuse=False;skyob.visible_glossy=False

# Small visible sun behind the canopy. The directional lamp supplies its scene lighting.
rotation=camera.rotation_euler.to_quaternion()
sun_position=camera.location+rotation @ Vector((22.3,18.3,-90))
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1.3,location=sun_position)
disc=bpy.context.object;disc.name='Sun glimpsed through blossoms'
for c in list(disc.users_collection):c.objects.unlink(disc)
environment.objects.link(disc)
sunmat=material('Sun · warm white radiance',(1,.72,.38),90)
disc.data.materials.append(sunmat);disc.visible_diffuse=False;disc.visible_glossy=False;disc.visible_shadow=False

scene.world=bpy.data.worlds.new('Rooftop · dim violet ambient')
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value=(.20,.12,.28,1);background.inputs['Strength'].default_value=.19

def light(name,kind,loc,target,energy,color,size):
    d=bpy.data.lights.new(name,kind);d.energy=energy;d.color=color
    if kind=='AREA':d.shape='DISK';d.size=size
    elif kind=='SUN':d.angle=size
    o=bpy.data.objects.new(name,d);lights.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o

light('Low warm sunset','SUN',(8,9,4.6),(-1,-1,.2),4.0,(1,.59,.38),.09)
light('Golden sky through open balcony','AREA',(3.5,6.5,4.0),(-1,-.7,1.1),2100,(1,.60,.38),5)
light('Pink reflection from floor and cushions','AREA',(-.1,-3.0,1.7),(-2,2,1.8),235,(1,.24,.37),4)
light('Violet open-sky fill','AREA',(-4,-.7,5),(-2,1,2),180,(.38,.40,1),5)

scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.cycles.max_bounces=7
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.25
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
# Blender 5.2 compositor: a small halo on genuinely bright pixels, retaining the shadows.
compositor=bpy.data.node_groups.new('Rooftop · restrained sunset glow','CompositorNodeTree')
compositor.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
render=compositor.nodes.new('CompositorNodeRLayers')
glow=compositor.nodes.new('CompositorNodeGlare')
glow.inputs['Type'].default_value='Fog Glow';glow.inputs['Quality'].default_value='High'
glow.inputs['Threshold'].default_value=3.5;glow.inputs['Strength'].default_value=.20;glow.inputs['Size'].default_value=.24
output=compositor.nodes.new('NodeGroupOutput')
compositor.links.new(render.outputs['Image'],glow.inputs['Image']);compositor.links.new(glow.outputs['Image'],output.inputs['Image'])
scene.compositing_node_group=compositor
scene['milestone']='2a / sunset, camera and background study'
scene['next_gate']='Judge the assembled still before material refinement and motion'
scene['background_method']='Independent modeled mountain profiles and emissive sky gradient; no source image projection'
scene.render.filepath=str(ROOT/'renders'/'05-sunset-study.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sunset-study.blend'))
bpy.ops.render.render(write_still=True)
(ROOT/'sunset-study.json').write_text(json.dumps({
    'milestone':'2a','geometry_source':'rooftop-study.blend','piece_library':'assets/rooftop-pieces.blend',
    'camera':{'location':list(camera.location),'target':[-.05,1.5,2.08],'lens_mm':45},
    'environment_layers':4,'lighting':'Low amber sun, golden balcony light, pink bounce and dim violet fill',
    'compositor_glow':True,'animated':False,'native_runtime_verified':False,
    'pending':['Bark and timber surfaces','Blossom density and branch placement','Final visual approval','Motion and export']
},indent=2)+'\n')
print('SUNSET_STUDY_COMPLETE')

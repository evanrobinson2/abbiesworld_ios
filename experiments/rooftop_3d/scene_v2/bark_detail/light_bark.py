"""Carry bark onto branches, then author the sunset/VFX look in Blender now."""
import bpy, math, json, random
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
bpy.ops.wm.open_mainfile(filepath=str(HERE/'rooftop-bark-study.blend'))
scene=bpy.context.scene
core=bpy.data.objects['B04 continuous enclosing tree']
mat=core.data.materials[0]
branches={
 'B Right hanging canopy':[(-2.8,.8,4.65),(-1.6,2.9,4.5),(.3,3.5,4.7),(2.4,3.8,4.9),(4.8,4.6,5.25),(7.2,4.9,5.9)],
 'B Canopy cross limb':[(-3.9,-.3,3.8),(-2.6,1.8,4.0),(-.8,2.8,4.15),(.4,2.8,4.45)],
 'B Far right drooping limb':[(1.1,3.6,4.8),(2.9,3.2,4.45),(4.4,2.9,4.1),(6,2.5,3.8)]}

def attr(o,name,data,kind='FLOAT_VECTOR'):
 a=o.data.attributes.get(name) or o.data.attributes.new(name,kind,'POINT')
 a.data.foreach_set('vector' if kind=='FLOAT_VECTOR' else 'value',np.array(data,dtype=np.float32).ravel())

for name,path in branches.items():
 o=bpy.data.objects[name]
 if o.type!='MESH':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 p=np.array([tuple(o.matrix_world@v.co) for v in o.data.vertices]);norm=np.array([tuple(o.matrix_world.to_3x3()@v.normal) for v in o.data.vertices]);pts=np.array(path)
 # A smooth centreline provides longitudinal coordinates for each curved limb.
 tangents=np.zeros_like(pts);tangents[0]=pts[1]-pts[0];tangents[-1]=pts[-1]-pts[-2];tangents[1:-1]=(pts[2:]-pts[:-2])*.5
 curve=[]
 for j in range(len(pts)-1):
  for t in np.linspace(0,1,48,endpoint=False):
   curve.append((2*t**3-3*t*t+1)*pts[j]+(t**3-2*t*t+t)*tangents[j]+(-2*t**3+3*t*t)*pts[j+1]+(t**3-t*t)*tangents[j+1])
 curve=np.array(curve+[pts[-1]]);tan=np.gradient(curve,axis=0);tan/=np.linalg.norm(tan,axis=1)[:,None]
 side=np.cross(tan,np.array((0.,0.,1.)));side/=np.linalg.norm(side,axis=1)[:,None];up=np.cross(tan,side)
 arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(curve,axis=0),axis=1))]
 ids=np.empty(len(p),dtype=int)
 for start in range(0,len(p),2048):ids[start:start+2048]=np.argmin(np.sum((p[start:start+2048,None,:]-curve[None,:,:])**2,axis=2),axis=1)
 delta=p-curve[ids];flow=np.column_stack((np.sum(delta*side[ids],axis=1),np.sum(delta*up[ids],axis=1),arc[ids]))
 normals=np.column_stack((np.sum(norm*side[ids],axis=1),np.sum(norm*up[ids],axis=1),np.sum(norm*tan[ids],axis=1)))
 attr(o,'Bark flow metres',flow);attr(o,'Bark rest normal',normals)
 radius=np.linalg.norm(flow[:,:2],axis=1);attr(o,'Bark relief allowed',np.clip((radius-.025)/.25,0,.48),'FLOAT')
 o.data.materials.clear();o.data.materials.append(mat)
 for modifier in list(o.modifiers):
  if modifier.name.startswith('Fine branch relief tessellation'):o.modifiers.remove(modifier)
 sub=o.modifiers.new('Fine branch relief tessellation','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;sub.render_levels=2

# Save a material-only comparison: same camera, lighting and grade as B06.
scene.render.filepath=str(HERE/'B07-full-scene.png')
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'rooftop-bark-study.blend'))

vfx=bpy.data.collections.new('B13 Sunset atmosphere and light');scene.collection.children.link(vfx)
def light(name,kind,location,target,energy,color,size):
 data=bpy.data.lights.new(name,kind);data.energy=energy;data.color=color
 if kind=='AREA':data.shape='DISK';data.size=size
 else:data.shadow_soft_size=size
 o=bpy.data.objects.new(name,data);vfx.objects.link(o);o.location=location
 if target is not None:o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 return o

# Strongly directional warm light reveals fissures; restrained blue fill leaves
# the sheltered side cool. These are actual scene lights, not painted accents.
light('B08 amber grazing bounce','AREA',(-.4,-1.8,3.7),(-4.0,-1.0,2.2),200,(1,.52,.28),2.2)
light('B08 sunset canopy glow','AREA',(4.8,4.4,5.6),(-2,.5,3.4),600,(1,.52,.30),3.0)
bpy.data.objects['B soft rosy foreground'].data.energy=360
bpy.data.objects['B soft rosy foreground'].data.color=(1,.32,.42)
bpy.data.objects['B cool sheltered bark fill'].data.energy=260
bpy.data.objects['B low peach sun'].data.energy=3.4
bpy.data.objects['B low peach sun'].data.color=(1,.60,.38)
bpy.data.objects['B open sky bounce'].data.color=(1,.67,.44)

# A luminous golden sky retains colour instead of clipping to plain white.
sky=bpy.data.materials['B luminous apricot sky'].node_tree
sky_ramp=next(n for n in sky.nodes if n.type=='VALTORGB').color_ramp
for e in list(sky_ramp.elements)[1:-1]:sky_ramp.elements.remove(e)
sky_ramp.elements[0].position=0;sky_ramp.elements[0].color=(1,.32,.14,1)
sky_ramp.elements[-1].position=1;sky_ramp.elements[-1].color=(.68,.13,.24,1)
e=sky_ramp.elements.new(.30);e.color=(1,.68,.22,1)
e=sky_ramp.elements.new(.62);e.color=(1,.43,.12,1)
next(n for n in sky.nodes if n.type=='EMISSION').inputs['Strength'].default_value=3.0

# Visible, suspended, glowing silk, with small warm pools on nearby surfaces.
lantern=bpy.data.materials['B01 Coral lantern silk'].node_tree.nodes.get('Principled BSDF')
lantern.inputs['Emission Color'].default_value=(1,.065,.03,1)
lantern.inputs['Emission Strength'].default_value=1.25
lantern.inputs['Subsurface Weight'].default_value=.12
for i in range(4):
 silk=bpy.data.objects['B lantern silk '+str(i)]
 loc=silk.matrix_world.translation
 lamp=light('B08 lantern glow '+str(i),'POINT',loc,None,12,(1,.24,.07),.16)
 lamp.parent=silk.parent;lamp.matrix_parent_inverse=silk.parent.matrix_world.inverted()

# Refit the fairy-light strand to the enlarged enclosing tree. Earlier bulbs
# had become buried when the trunk was rebuilt around the room.
fairies=bpy.data.collections['B11 Independent fairy lights']
for ob in list(fairies.objects):bpy.data.objects.remove(ob,do_unlink=True)
glow=bpy.data.materials['B03 fairy light glow'];gb=glow.node_tree.nodes.get('Principled BSDF')
gb.inputs['Emission Color'].default_value=(1,.38,.06,1);gb.inputs['Emission Strength'].default_value=28
tree=BVHTree.FromObject(core,bpy.context.evaluated_depsgraph_get());strand=[]
for i in range(37):
 t=i/36;z=.24+4.35*t;x=float(np.interp(z,[0,1.15,2.4,3.5,4.6],[-3.70,-3.92,-3.78,-2.90,-1.40]))+.07*math.sin(t*22)
 hit,normal,_,dist=tree.ray_cast(Vector((x,-8,z)),Vector((0,1,0)),15)
 if hit is None:continue
 pos=hit+normal*.075;strand.append(pos)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.019+(i%3)*.003,location=pos)
 o=bpy.context.object;o.name='B08 bark fairy bulb %02d'%i;o.data.materials.append(glow)
 for c in list(o.users_collection):c.objects.unlink(o)
 fairies.objects.link(o)
 if i%5==0:light('B08 fairy warm pool '+str(i),'POINT',pos+normal*.045,None,3.5,(1,.29,.055),.045)
curve=bpy.data.curves.new('B08 fitted fairy strand','CURVE');curve.dimensions='3D';curve.bevel_depth=.0028;curve.bevel_resolution=2
sp=curve.splines.new('POLY');sp.points.add(len(strand)-1)
for p,co in zip(sp.points,strand):p.co=(*co,1)
wire=bpy.data.objects.new('B08 fitted fairy strand',curve);fairies.objects.link(wire);curve.materials.append(bpy.data.materials['B01 Aged bronze fittings'])

# Distant air is an independent volume, beginning beyond the railing. It does
# not blur the foreground bark or upholstery.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,52,14));fog=bpy.context.object;fog.name='B08 distant sunset haze';fog.dimensions=(180,88,90)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for c in list(fog.users_collection):c.objects.unlink(fog)
vfx.objects.link(fog)
fm=bpy.data.materials.new('B08 golden distance haze');fm.use_nodes=True;nt=fm.node_tree;nt.nodes.clear();volume=nt.nodes.new('ShaderNodeVolumeScatter');volume.inputs['Color'].default_value=(1,.63,.43,1);volume.inputs['Density'].default_value=.0023;volume.inputs['Anisotropy'].default_value=.35
out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(volume.outputs[0],out.inputs['Volume']);fog.data.materials.append(fm)

# Blossom transmission lets backlight illuminate petals without emissive leaves.
for i in range(4):
 nt=bpy.data.materials['B01 Sakura tone '+str(i)].node_tree;bs=nt.nodes.get('Principled BSDF');out=nt.nodes.get('Material Output')
 trans=nt.nodes.new('ShaderNodeBsdfTranslucent');trans.inputs['Color'].default_value=bs.inputs['Base Color'].default_value
 mix=nt.nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.24;nt.links.new(bs.outputs[0],mix.inputs[1]);nt.links.new(trans.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],out.inputs['Surface'])

# Optical effects are visible in this Blender render, long before mobile work.
group=bpy.data.node_groups.new('B08 sunset grade and bloom','CompositorNodeTree');group.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rn=group.nodes.new('CompositorNodeRLayers')
sat=group.nodes.new('CompositorNodeHueSat');sat.inputs['Saturation'].default_value=1.12;group.links.new(rn.outputs['Image'],sat.inputs['Image'])
gl=group.nodes.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Quality'].default_value='High';gl.inputs['Threshold'].default_value=1.15;gl.inputs['Strength'].default_value=.72;gl.inputs['Size'].default_value=.38;group.links.new(sat.outputs['Image'],gl.inputs['Image'])
halo=group.nodes.new('CompositorNodeGlare');halo.inputs['Type'].default_value='Fog Glow';halo.inputs['Quality'].default_value='High';halo.inputs['Threshold'].default_value=2.5;halo.inputs['Strength'].default_value=.18;halo.inputs['Size'].default_value=.62;group.links.new(gl.outputs['Image'],halo.inputs['Image'])
out=group.nodes.new('NodeGroupOutput');group.links.new(halo.outputs['Image'],out.inputs['Image']);scene.compositing_node_group=group
scene.view_settings.exposure=.30
scene['revision']='B08 bark and sunset VFX'
scene['status']='Desktop art development; sunset bloom/grade/volume authored before iPad integration'
scene.cycles.samples=64;scene.render.resolution_percentage=100
scene.render.filepath=str(HERE/'B08-sunset-vfx.png')
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'rooftop-sunset-vfx.blend'))
bpy.ops.render.render(write_still=True)

report={'revision':'B08','bark_branches':list(branches),'fairy_bulbs':len(strand),'world_space_lighting':True,'separate_distant_volume':True,'blossom_translucency':True,'bloom_passes':2,'saturation':1.12,'exposure':.30,'mobile_integration':False}
(HERE/'sunset-settings.json').write_text(json.dumps(report,indent=2)+'\n')
print('B08_SUNSET_COMPLETE',report)

from theme_metadata import surface_metadata
import bpy, math, json, os, time
from mathutils import Vector
ROOT=os.path.dirname(__file__)
OUT=os.path.join(ROOT,'dist','simulation-assets','supplies');os.makedirs(OUT,exist_ok=True)
start=time.perf_counter()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
palette={'wood':'9C7250','end':'DDBB86','dark':'655447','cream':'E4D1AC','hay':'D5AE58','haylight':'E9CB7C','rope':'8D7654','teal':'699B95','water':'8BCED2','earth':'785C43','leaf':'7F9867','grain':'CFAB70'}
mats={}
for name,h in palette.items():
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88;mats[name]=m
def shape(name,p,s,mat,kind='box',rot=None):
 if kind=='ball':bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p)
 elif kind=='cylinder':bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=1,depth=2,location=p)
 else:bpy.ops.mesh.primitive_cube_add(size=2,location=p)
 o=bpy.context.object;o.name=name;o.scale=s
 if rot:o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat])
 if kind!='ball':
  mod=o.modifiers.new('Soft tailored edges','BEVEL');mod.width=min(s)*.28;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for face in o.data.polygons:face.use_smooth=True
 return o
def beam(name,a,b,r,mat):
 d=Vector(b)-Vector(a);o=shape(name,(Vector(a)+Vector(b))/2,(r,r,d.length/2),mat,'cylinder');o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def ring(name,p,r,minor,mat,scale=(1,1,1),rot=None):
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=p,major_radius=r,minor_radius=minor);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mats[mat])
 if rot:o.rotation_euler=rot
 for f in o.data.polygons:f.use_smooth=True
 return o
def pallet():
 for y in [-.34,.34]:shape('Low pallet runner',(0,y,.07),(.73,.07,.07),'dark')
 for x in [-.6,-.3,0,.3,.6]:shape('Rounded pallet slat',(x,0,.18),(.11,.5,.055),'wood')
def wood(state):
 if state!='carried':pallet()
 count={'full':6,'partial':2,'empty':0,'carried':2}[state]
 points=[(-.42,.0,.43),(0,.02,.43),(.42,-.02,.43),(-.22,0,.8),(.22,0,.8),(0,0,1.15)]
 for i in range(count):
  x,y,z=points[i];z=z if state!='carried' else .21
  shape('Soft bark log',(x,y,z),(.2,.2,.62),'wood','cylinder',(math.pi/2,0,0))
  for sy in [-1,1]:
   shape('Cut end',(x,y+sy*.625,z),(.174,.174,.014),'end','cylinder',(math.pi/2,0,0))
   ring('Growth ring',(x,y+sy*.642,z),.105,.009,'wood',rot=(math.pi/2,0,0))
def hay(state):
 if state=='carried':
  shape('Portable tied bale',(0,0,.26),(.48,.3,.26),'hay');
  for x in [-.28,.28]:ring('Bale binding',(x,0,.26),.28,.025,'rope',scale=(1,1.13,1),rot=(0,math.pi/2,0))
  return
 for x in [-.67,.67]:
  for y in [-.33,.33]:shape('Rack leg',(x,y,.37),(.055,.055,.37),'wood')
 shape('Rack bottom',(0,0,.28),(.72,.36,.065),'wood')
 for y in [-.39,.39]:
  beam('Top rail',(-.77,y,.95),(.77,y,.95),.05,'wood')
  for x in [-.6,-.3,0,.3,.6]:beam('Slanted feeder stave',(x,y*.7,.3),(x,y,.94),.033,'wood')
 if state!='empty':
  h=.68 if state=='full' else .37
  shape('Hay cushion',(0,0,h),(.65,.31,.25 if state=='full' else .09),'hay','ball')
  for i in range(9):
   x=-.55+i*.135;beam('Visible straw', (x,-.22,h),(x+.05,.24,h+.05),.018,'haylight')
def sack(state):
 h={'full':.66,'partial':.38,'empty':.10,'carried':.5}[state]
 shape('Padded ration sack',(0,0,h*.65),(.38,.28,h*.65),'cream','ball')
 ring('Rolled fabric mouth',(0,0,h*1.2),.24,.045,'cream',scale=(1,.75,1))
 if state!='empty':
  shape('Ration surface',(0,0,h*1.17),(.23,.17,.055),'grain','ball')
  for x,y in [(-.1,-.06),(.08,-.09),(0,.04),(.13,.06)]:shape('Grain kernel',(x,y,h*1.22),(.045,.035,.035),'haylight','ball')
 shape('Diet label',(0,-.272,h*.65),(.13,.015,min(.13,h*.35)),'teal')
 beam('Stitched sack seam',(-.26,-.18,.08),(-.29,-.18,h*.9),.013,'rope')
def trough(state):
 for x in [-.65,.65]:shape('Rounded trough foot',(x,0,.1),(.11,.36,.1),'wood')
 shape('Trough floor',(0,0,.24),(.83,.36,.07),'teal')
 for y in [-.39,.39]:shape('Trough side',(0,y,.43),(.88,.055,.23),'teal')
 for x in [-.84,.84]:shape('Trough end',(x,0,.43),(.055,.38,.23),'teal')
 if state!='empty':
  z=.55 if state=='full' else .32;shape('Water surface',(0,0,z),(.78,.33,.025),'water')
  ring('Quiet ripple',(.28,0,z+.027),.13,.008,'cream',scale=(1,.6,1))
def bucket(state):
 shape('Bucket base',(0,0,.065),(.28,.28,.055),'teal','cylinder')
 # Open container, modelled walls leave a genuine empty cavity.
 for i in range(16):
  a=i*math.tau/16;shape('Bucket wall',(math.cos(a)*.285,math.sin(a)*.285,.3),(.06,.043,.25),'teal',rot=(0,0,a+math.pi/2))
 ring('Bucket lip',(0,0,.55),.29,.035,'teal')
 if state!='empty':shape('Water',(0,0,.48 if state in ['full','carried'] else .2),(.25,.25,.02),'water','cylinder')
 # Arch handle, rather than a solid disk.
 for i in range(12):
  a=i*math.pi/12;b=(i+1)*math.pi/12;beam('Bucket handle',(math.cos(a)*.30,0,.54+math.sin(a)*.34),(math.cos(b)*.30,0,.54+math.sin(b)*.34),.019,'dark')
def compost(state):
 if state=='carried':
  shape('Cleaning basket',(0,0,.15),(.34,.25,.15),'wood')
  shape('Collected material',(0,0,.31),(.28,.2,.12),'earth','ball');return
 for z in [.12,.32,.52]:
  for y in [-.4,.4]:shape('Compost bin slat',(0,y,z),(.62,.055,.07),'wood')
  for x in [-.6,.6]:shape('Compost bin side',(x,0,z),(.055,.4,.07),'wood')
 if state!='empty':
  z=.42 if state=='full' else .14;shape('Collected compost',(0,0,z),(.54,.33,z*.7),'earth','ball')
  shape('Organic clipping',(.16,-.12,z*1.5),(.11,.055,.025),'leaf','ball')
manifest=[];timings=[]
families=[('wood','Timber',wood,['wood']),('hay','Hay feeder',hay,['forage','equine-fibre','cattle-forage','goat-forage','sheep-forage','camelid-forage','rabbit-hay-and-ration']),('ration','Ration sack',sack,['pig-ration','chicken-ration','turkey-ration','duck-ration','goose-ration','dog-food']),('water-trough','Water trough',trough,['water']),('water-bucket','Water bucket',bucket,['water']),('compost','Compost bin',compost,['manure'])]
for fi,(subject,label,build,resources) in enumerate(families):
 for si,state in enumerate(['full','partial','empty']+([] if subject=='water-trough' else ['carried'])):
  t=time.perf_counter();bpy.ops.object.select_all(action='DESELECT');before=set(bpy.data.objects);build(state);objects=[o for o in bpy.data.objects if o not in before];ident=subject+'-'+state
  col=bpy.data.collections.new(ident);bpy.context.scene.collection.children.link(col)
  for o in objects:
   for c in list(o.users_collection):c.objects.unlink(o)
   col.objects.link(o);o.select_set(True)
  bpy.context.view_layer.update()
  floor=min((o.matrix_world@v.co).z for o in objects for v in o.data.vertices)
  for o in objects:o.location.z-=floor
  bpy.context.view_layer.update()
  bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True)
  parts=[];triangles=0
  for o in objects:
   mesh=o.data;mesh.calc_loop_triangles();pos=[];norm=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
   for tri in mesh.loop_triangles:
    for vi in tri.vertices:
     p=o.matrix_world@mesh.vertices[vi].co;n=(normal_matrix@mesh.vertices[vi].normal).normalized();pos.extend([round(p.x,5),round(p.z,5),round(-p.y,5)]);norm.extend([round(n.x,5),round(n.z,5),round(-n.y,5)])
   triangles+=len(mesh.loop_triangles);parts.append({'positions':pos,'normals':norm,'color':list(o.data.materials[0].diffuse_color)[:3],**surface_metadata('supplies',o.data.materials[0].name,o.name,list(o.data.materials[0].diffuse_color)[:3])})
  with open(os.path.join(OUT,ident+'.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
  manifest.append({'id':ident,'label':label+' · '+state,'category':'supplies','subject':subject,'state':state,'json':'/simulation-assets/supplies/'+ident+'.json','glb':'/simulation-assets/supplies/'+ident+'.glb','triangles':triangles,'simulationMapping':{'resources':resources,'source':'simulation-worker.js','stockFields':['sources[].stock'] if subject=='wood' else ['careStock','habitats[].waterStock' if subject.startswith('water') else 'habitats[].foodStock'] if subject!='compost' else ['compost','cleaningJobs'],'stateRule':{'full':'stock above midpoint','partial':'stock positive below midpoint','empty':'stock zero','carried':'worker cargo positive'}[state],'note':'Visual stock thresholds are presentation choices, not new simulation mechanics.'}})
  timings.append({'id':ident,'generationAndExportSeconds':round(time.perf_counter()-t,3)})
  for o in objects:o.location.x+=si*2.7;o.location.y+=fi*2.6
  with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
  print('ASSET_READY '+ident,flush=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'supplies-editable.blend'))
with open(os.path.join(OUT,'timings.json'),'w') as f:json.dump({'assets':timings,'totalSeconds':round(time.perf_counter()-start,3),'excludes':'script authoring, visual review, deployment'},f,indent=2)
# One review sheet of every state, using the same saved meshes.
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.81,.74,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.object.light_add(type='AREA',location=(1,-3,16));bpy.context.object.data.energy=2300;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=9
bpy.ops.object.camera_add(location=(15,-16,21));cam=bpy.context.object;direction=Vector((4,6,0))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=22;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'review-sheet.png');bpy.ops.render.render(write_still=True)

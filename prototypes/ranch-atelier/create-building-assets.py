from theme_metadata import surface_metadata
import bpy, math, json, os, time
from mathutils import Vector
START=time.perf_counter()
OUT=os.path.join(os.path.dirname(__file__),'dist','simulation-assets','buildings')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
palette={'wood':'B68A5C','end':'DEBD86','wall':'D9B487','red':'BA7560','roof':'577F7C','dark':'49483B','glass':'A3C9C1','stone':'ADA993','straw':'E4C978','water':'74B7C1','green':'81946A'}
mats={}
for n,h in palette.items():
 m=bpy.data.materials.new(n);m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;mats[n]=m
def box(n,p,s,c,rot=None):
 bpy.ops.mesh.primitive_cube_add(size=2,location=p);o=bpy.context.object;o.name=n;o.scale=s
 if rot:o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[c]);mod=o.modifiers.new('Soft sewn corners','BEVEL');mod.width=min(s)*.24;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def beam(n,a,b,r,c='wood'):
 d=Vector(b)-Vector(a);return box(n,(Vector(a)+Vector(b))/2,(r,r,d.length/2),c,d.to_track_quat('Z','Y').to_euler())
def ball(n,p,s,c):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p);o=bpy.context.object;o.name=n;o.scale=s;o.data.materials.append(mats[c]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for f in o.data.polygons:f.use_smooth=True
 return o
def foundation(w,d,stage):
 if stage=='planned':
  for x in [-w,w]:
   for y in [-d,d]:box('Survey peg',(x,y,.22),(.045,.045,.22),'end')
  for y in [-d,d]:beam('Setting-out cord',(-w,y,.24),(w,y,.24),.014,'straw')
  for x in [-w,w]:beam('Setting-out cord',(x,-d,.24),(x,d,.24),.014,'straw')
  return
 box('Rounded stone footing',(0,0,.09),(w+.08,d+.08,.09),'stone')
 for y in [-d,d]:box('Sill beam',(0,y,.22),(w,.07,.08),'wood')
 for x in [-w,w]:box('Sill beam',(x,0,.22),(.07,d,.08),'wood')
 if stage=='foundation':
  for i in range(3):box('Staged lumber',(-w+.35,-.15+i*.14,.29),(.55,.045,.045),'end')
def roof(w,d,h,stage):
 for y in [-d,d]:
  for sign in [-1,1]:beam('Gable rafter',(sign*w,y,h),(0,y,h+.65),.07)
 beam('Ridge beam',(0,-d-.18,h+.65),(0,d+.18,h+.65),.07)
 if stage in ['roof','complete']:
  for sign in [-1,1]:
   angle=sign*math.atan2(.65,w)
   box('Padded roof plane',(sign*w/2,0,h+.325),(math.sqrt(w*w+.65*.65)/2+.13,d+.22,.11),'roof',(0,angle,0))
  beam('Ridge cap',(0,-d-.23,h+.76),(0,d+.23,h+.76),.085,'roof')
def window(x,y,z):
 box('Window frame',(x,y,z),(.24,.065,.28),'end');box('Blue window',(x,y-.07,z),(.18,.025,.22),'glass');box('Window mullion',(x,y-.1,z),(.022,.02,.22),'wall');box('Window sill',(x,y-.12,z-.27),(.3,.12,.035),'end')
def build(subject,stage):
 original=subject
 if subject=='kitchen-garden':
  foundation(1.5,1.15,stage)
  if stage in ['planned','foundation']:return
  for x in [-.78,.78]:
   box('Prepared soil',(x,0,.21),(.58,.92,.1),'dark')
   for y in [-.95,.95]:box('Bed end',(x,y,.28),(.65,.055,.16),'wood')
   for dx in [-.62,.62]:box('Bed side',(x+dx,0,.28),(.055,.95,.16),'wood')
  if stage in ['roof','complete']:
   for x in [-1.32,-.22]:box('Trellis upright',(x,1.04,.92),(.04,.04,.78),'end')
   for z in [.7,1.05,1.4]:beam('Trellis rail',(-1.32,1.04,z),(-.22,1.04,z),.025,'end')
  if stage=='complete':
   for x in [-.78,.78]:
    box('Bed marker',(x,-.95,.58),(.13,.035,.075),'end');beam('Marker stake',(x,-.95,.25),(x,-.95,.58),.02,'wood')
   for y in [-.75,-.25,.25,.75]:box('Stepping stone',(0,y,.21),(.12,.16,.07),'stone')
  return
 subject='shelter' if original in ['cattle-shelter','goat-shelter','chicken-coop'] else subject
 dims={'shelter':(1.6,1,1.9),'family-home':(1.3,1.12,2),'feed-store':(1,.8,1.65),'water-point':(.95,.65,1.6)}
 w,d,h=dims[subject]
 if original=='cattle-shelter':w,d,h=1.8,1.2,2.1
 if original=='goat-shelter':w,d,h=1.15,.85,1.5
 if original=='chicken-coop':w,d,h=.95,.7,1.4
 foundation(w,d,stage)
 if stage in ['planned','foundation']:return
 for x in [-w,w]:
  for y in [-d,d]:box('Corner post',(x,y,(h+.25)/2),(.085,.085,(h-.25)/2),'wood')
 if subject=='water-point':
  # A cistern is distinct from a roofed house, with open bowl, tap and service mast.
  if stage in ['roof','complete']:
   box('Trough floor',(0,0,.33),(.84,.52,.12),'stone')
   for x in [-.85,.85]:box('Trough end',(x,0,.57),(.1,.6,.28),'stone')
   for y in [-.55,.55]:box('Trough side',(0,y,.57),(.85,.1,.28),'stone')
   box('Service mast',(.64,.43,1.17),(.1,.1,.9),'roof');beam('Spout',(.64,.43,1.35),(.35,.15,1.35),.065,'roof')
  if stage=='complete':box('Water surface',(0,0,.69),(.74,.44,.035),'water');ball('Tap handle',(.68,.33,1.5),(.13,.07,.07),'red')
  return
 roof(w,d,h,stage)
 for y in [-d,d]:beam('Eave beam',(-w,y,h),(w,y,h),.085)
 if stage=='frame':beam('Temporary brace',(-w,-d,.3),(w,-d,h),.04,'end');return
 # Open shelter and store retain a usable entrance rather than solid front walls.
 box('Back panel',(0,d,(h+.25)/2),(w,.07,(h-.25)/2),'red' if subject!='family-home' else 'wall')
 for x in [-w,w]:box('Side panel',(x,0,(h+.25)/2),(.07,d,(h-.25)/2),'red' if subject!='family-home' else 'wall')
 if stage!='complete':return
 if subject=='family-home':
  box('Front wall',(0,-d,(h+.25)/2),(w,.07,(h-.25)/2),'wall');box('Door',(0,-d-.09,.85),(.3,.055,.6),'roof');ball('Door knob',(.2,-d-.16,.87),(.045,.035,.045),'end')
  for x in [-.78,.78]:window(x,-d-.09,1.22)
  box('Welcoming step',(0,-d-.3,.18),(.53,.32,.13),'stone');box('Chimney',(.65,.45,h+.57),(.16,.18,.5),'red');box('Chimney cap',(.65,.45,h+1.07),(.21,.23,.065),'end')
  for x in [-.8,.8]:box('Planter',(x,-d-.3,.36),(.25,.17,.14),'red');ball('Herb cushion',(x,-d-.3,.56),(.23,.17,.16),'green')
 elif subject=='shelter':
  box('Straw resting pad',(0,.22,.25),(w-.15,d-.27,.07),'straw')
  for x in [-1.05,0,1.05]:box('Back wall batten',(x,d-.09,1.05),(.035,.03,.72),'end')
  beam('Low side rail',(-w,-d,.92),(-w,d,.92),.055,'end')
  box('Feed manger',(w*.58,.42,.61),(.42,.3,.18),'wood');ball('Hay in manger',(w*.58,.42,.82),(.38,.28,.12),'straw')
  if original=='cattle-shelter':
   beam('Centre partition',(0,-d,.5),(0,d,.5),.06,'wood');beam('Centre partition',(0,-d,1),(0,d,1),.06,'wood')
  if original=='goat-shelter':
   box('Goat resting platform',(-.4,.2,.65),(.55,.45,.1),'end');box('Goat climbing step',(-.4,-.4,.4),(.35,.25,.16),'wood')
  if original=='chicken-coop':
   box('Secure coop front',(0,-d,.86),(w,.07,.5),'wall');box('Small pop hole',(-.25,-d-.09,.6),(.19,.025,.25),'dark');box('Nest box',(.62,0,.7),(.4,.42,.3),'end');box('Nest lid',(.62,0,1.04),(.43,.46,.06),'roof')
   box('Access ramp',(-.25,-d-.42,.3),(.24,.55,.055),'wood',(-.4,0,0))
   for y in [-1.45,-1.2,-.95]:box('Ramp tread',(-.25,y,.3+(y+1.1)*.4),(.24,.025,.025),'end')
 else:
  box('Half door',(-.5,-d,.7),(.42,.07,.47),'roof')
  for x,y,z in [(-.5,.3,.48),(.35,.35,.48),(-.25,.3,.9)]:ball('Full feed sack',(x,y,z),(.32,.29,.35),'straw');beam('Sack tie',(x-.08,y,z+.32),(x+.08,y,z+.32),.035,'dark')
  box('Feed sign',(0,-d-.11,1.42),(.46,.045,.14),'end')
  for x in [-.18,0,.18]:ball('Grain emblem',(x,-d-.17,1.42),(.035,.018,.08),'straw')
manifest=[];timings=[]
subjects=['shelter','family-home','feed-store','water-point','cattle-shelter','goat-shelter','chicken-coop','kitchen-garden']
for si,subject in enumerate(subjects):
 t=time.perf_counter()
 for st,stage in enumerate(['planned','foundation','frame','roof','complete']):
  bpy.ops.object.select_all(action='DESELECT');before=set(bpy.data.objects);build(subject,stage);objects=[o for o in bpy.data.objects if o not in before];ident=subject+'-'+stage
  col=bpy.data.collections.new(ident);bpy.context.scene.collection.children.link(col)
  for o in objects:
   for c in list(o.users_collection):c.objects.unlink(o)
   col.objects.link(o);o.select_set(True)
  bpy.context.view_layer.update();bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True)
  parts=[];triangles=0
  for o in objects:
   mesh=o.data;mesh.calc_loop_triangles();pos=[];norm=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
   for tri in mesh.loop_triangles:
    for li in tri.loops:
     p=o.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co;n=(normal_matrix@mesh.corner_normals[li].vector).normalized();pos.extend([round(p.x,5),round(p.z,5),round(-p.y,5)]);norm.extend([round(n.x,5),round(n.z,5),round(-n.y,5)])
   triangles+=len(mesh.loop_triangles);parts.append({'positions':pos,'normals':norm,'color':list(mesh.materials[0].diffuse_color)[:3],**surface_metadata('buildings',o.data.materials[0].name,o.name,list(o.data.materials[0].diffuse_color)[:3])})
  with open(os.path.join(OUT,ident+'.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
  manifest.append({'id':ident,'label':subject.replace('-',' ').title()+' · '+stage,'category':'buildings','subject':subject,'state':stage,'json':'/simulation-assets/buildings/'+ident+'.json','glb':'/simulation-assets/buildings/'+ident+'.glb','triangles':triangles,'simulationMapping':{'buildingIds':{'shelter':['shelter','build-*'],'family-home':['abbie-home','ani-home'],'feed-store':['feed'],'water-point':['water'],'cattle-shelter':['build-cow-*'],'goat-shelter':['build-goat-*'],'chicken-coop':['build-chicken-*'],'kitchen-garden':['garden']}[subject],'stage':stage,'stageNote':'Simulator roof phase means finishing trellis and bed preparation; no roof or plant growth implied' if subject=='kitchen-garden' else ''}})
  for o in objects:o.location.x+=si*5;o.location.y+=st*5
 timings.append({'family':subject,'seconds':round(time.perf_counter()-t,3),'assets':5});print('FAMILY_READY',subject,flush=True)
with open(os.path.join(OUT,'manifest.tmp'),'w') as f:json.dump(manifest,f,indent=2)
os.replace(os.path.join(OUT,'manifest.tmp'),os.path.join(OUT,'manifest.json'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'building-states.blend'))
with open(os.path.join(OUT,'timings.json'),'w') as f:json.dump({'families':timings,'generationExportSeconds':round(time.perf_counter()-START,3),'includes':'Model construction, bevel/normal evaluation, GLB and JSON export; excludes authoring and review'},f,indent=2)
# Render only the complete family row as a contact sheet for silhouette/material review.
for col in list(bpy.data.collections):
 if col.name not in [s+'-complete' for s in subjects]:
  for o in col.objects:o.hide_render=True
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1600;scene.render.resolution_y=650;scene.render.resolution_percentage=100
scene.world.color=(.55,.55,.55)
bpy.ops.object.light_add(type='SUN',rotation=(.45,-.35,-.4));bpy.context.object.data.energy=2
bpy.ops.object.light_add(type='AREA',location=(4,15,12));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=10
bpy.ops.object.camera_add(location=(20,0,18));cam=bpy.context.object;cam.rotation_euler=(Vector((17.5,20,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=42;scene.camera=cam
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'review-complete.png');bpy.ops.render.render(write_still=True)

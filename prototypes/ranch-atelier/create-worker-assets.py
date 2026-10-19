from theme_metadata import surface_metadata
import bpy,math,json,os,re,time
from mathutils import Vector
ROOT=os.path.dirname(__file__);OUT=os.path.join(ROOT,'dist','simulation-assets','workers');os.makedirs(OUT,exist_ok=True)
SOURCE=os.path.join(ROOT,'dist','simulation-characters');start=time.perf_counter()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
def material(name,h):
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;return m
def shape(name,p,s,mat,box=False):
 if box:bpy.ops.mesh.primitive_cube_add(size=2,location=p)
 else:bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p)
 o=bpy.context.object;o.name=name;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat])
 if box:
  mod=o.modifiers.new('Soft stitched edge','BEVEL');mod.width=min(s)*.45;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 return o
def limb(name,a,b,r,mat):
 d=Vector(b)-Vector(a);o=shape(name,(Vector(a)+Vector(b))/2,(r,r,d.length/2+r*.6),mat);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def person(ident,pose,hat,uniform):
 for side in [-1,1]:
  x=side*.135;shape('Rounded boot',(x,-.055,.095),(.105,.165,.095),'shoes');limb('Trouser leg',(x,0,.2),(x,0,.62),.105,'trousers')
 shape('Soft trouser seat',(0,0,.64),(.24,.16,.17),'trousers');shape('Padded shirt',(0,0,.91),(.26,.18,.32),'shirt')
 if uniform=='overalls':
  shape('Overall bib',(0,-.169,.9),(.175,.035,.2),'trousers',True)
  for side in [-1,1]:
   limb('Overall strap',(side*.15,-.15,1.16),(side*.13,-.208,.9),.027,'trousers');shape('Brass button',(side*.13,-.242,1.01),(.021,.011,.021),'accessory')
  shape('Bib pocket',(0,-.212,.9),(.07,.012,.06),'shirt',True)
 elif uniform=='apron':
  shape('Apron',(0,-.17,.81),(.195,.035,.25),'accessory',True);limb('Apron neck strap',(-.12,-.13,1.17),(.12,-.13,1.17),.023,'accessory');shape('Apron pocket',(0,-.21,.79),(.09,.015,.06),'shirt',True)
 else:
  for side in [-1,1]:limb('Suspenders',(side*.15,-.14,1.17),(side*.15,-.19,.68),.025,'accessory')
 shape('Neck',(0,0,1.22),(.09,.09,.1),'skin');shape('Head',(0,-.015,1.45),(.235,.205,.255),'skin')
 for side in [-1,1]:shape('Ear',(side*.23,-.005,1.45),(.045,.044,.075),'skin')
 # Cap-like hair covers crown and rear without swallowing the face.
 shape('Hair crown',(0,.015,1.62),(.237,.2,.12),'hair');shape('Hair back',(0,.14,1.48),(.213,.07,.19),'hair')
 for x,z,r in [(-.15,1.6,.095),(-.04,1.63,.10),(.08,1.64,.08)]:shape('Side swept fringe',(x,-.17,z),(r,.055,r*.6),'hair')
 if ident=='abbie':
  for side in [-1,1]:shape('Long side lock',(side*.205,.06,1.31),(.065,.08,.22),'hair')
 if ident in ['ani','pearl']:
  for side in [-1,1]:shape('Rounded bob',(side*.2,.08,1.39),(.07,.09,.15),'hair')
 if ident=='mommy':shape('Hair bun',(.12,.21,1.61),(.11,.09,.11),'hair')
 if ident=='alexis':shape('Ponytail',(.15,.2,1.31),(.095,.1,.25),'hair')
 for side in [-1,1]:
  shape('Button eye',(side*.082,-.208,1.48),(.018,.012,.024),'ink');shape('Eye glint',(side*.082-.004,-.22,1.49),(.005,.003,.006),'accessory')
 shape('Small nose',(0,-.225,1.43),(.031,.025,.035),'skin');limb('Gentle smile',(-.035,-.205,1.363),(.035,-.205,1.363),.008,'hair')
 if hat=='straw':
  shape('Soft straw brim',(0,0,1.69),(.34,.28,.035),'hat');shape('Straw crown',(0,.01,1.76),(.205,.18,.1),'hat');shape('Hat band',(0,-.173,1.73),(.17,.012,.023),'hair',True)
 if hat=='cap':shape('Cap crown',(0,.01,1.7),(.24,.205,.10),'hat');shape('Cap bill',(0,-.24,1.66),(.2,.15,.025),'hat')
 for side in [-1,1]:
  shoulder=(side*.25,0,1.08)
  if pose=='idle':elbow=(side*.33,-.015,.9);hand=(side*.33,-.055,.72)
  elif pose=='carry':elbow=(side*.32,-.19,.91);hand=(side*.22,-.38,.96)
  else:elbow=(side*.30,-.21,1.05);hand=(side*.12,-.39,1.09 if side<0 else 1.17)
  limb('Shirt sleeve',shoulder,elbow,.083,'shirt');limb('Forearm',elbow,hand,.061,'skin');shape('Mitten hand',hand,(.073,.065,.075),'skin')
 if pose=='carry':
  shape('Supply parcel',(0,-.38,.83),(.23,.14,.13),'accessory',True);limb('Parcel tie',(-.24,-.53,.83),(.24,-.53,.83),.012,'hair')
manifest=[];times=[]
for ci,ident in enumerate(['abbie','ani','mommy','daddy','jeff','alexis','pearl']):
 svg=open(os.path.join(SOURCE,ident+'.svg')).read();colors=dict(re.findall(r'var\(--([\w]+),#([\da-fA-F]+)\)',svg));mats={k:material(ident+'-'+k,h) for k,h in colors.items()};hat,uniform=re.search(r'data-hat="(\w+)" data-uniform="(\w+)"',svg).groups();scale=float(re.search(r'scale\(([^)]+)\)',svg).group(1))
 for pi,pose in enumerate(['idle','carry','work']):
  t=time.perf_counter();bpy.ops.object.select_all(action='DESELECT');before=set(bpy.data.objects);person(ident,pose,hat,uniform);objects=[o for o in bpy.data.objects if o not in before];assetid=ident+'-'+pose;col=bpy.data.collections.new(assetid);bpy.context.scene.collection.children.link(col)
  for o in objects:
   o.location*=scale;o.scale*=scale
   for c in list(o.users_collection):c.objects.unlink(o)
   col.objects.link(o);o.select_set(True)
  bpy.context.view_layer.update();floor=min((o.matrix_world@v.co).z for o in objects for v in o.data.vertices)
  for o in objects:o.location.z-=floor
  bpy.context.view_layer.update();bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,assetid+'.glb'),export_format='GLB',use_selection=True)
  parts=[];triangles=0
  for o in objects:
   mesh=o.data;mesh.calc_loop_triangles();pos=[];norm=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
   for tri in mesh.loop_triangles:
    for vi in tri.vertices:
     p=o.matrix_world@mesh.vertices[vi].co;n=(normal_matrix@mesh.vertices[vi].normal).normalized();pos.extend([round(p.x,5),round(p.z,5),round(-p.y,5)]);norm.extend([round(n.x,5),round(n.z,5),round(-n.y,5)])
   triangles+=len(mesh.loop_triangles);parts.append({'positions':pos,'normals':norm,'color':list(mesh.materials[0].diffuse_color)[:3],**surface_metadata('workers',o.data.materials[0].name,o.name,list(o.data.materials[0].diffuse_color)[:3])})
  with open(os.path.join(OUT,assetid+'.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
  manifest.append({'id':assetid,'label':ident.title()+' · '+pose,'category':'workers','subject':ident,'state':pose,'json':'/simulation-assets/workers/'+assetid+'.json','glb':'/simulation-assets/workers/'+assetid+'.glb','triangles':triangles,'simulationMapping':{'workerName':ident.title(),'sourceAppearance':'/simulation-characters/'+ident+'.svg','relativeHeight':scale,'pose':pose,'note':'Static pose, no rig or animation. Carry parcel is a visual placeholder for worker cargo.'}});times.append({'id':assetid,'seconds':round(time.perf_counter()-t,3)})
  for o in objects:o.location.x+=ci*1.25;o.location.y+=pi*2
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'workers-editable.blend'))
with open(os.path.join(OUT,'timings.json'),'w') as f:json.dump({'assets':times,'totalSeconds':round(time.perf_counter()-start,3),'excludes':'authoring, review, rendering and deployment'},f,indent=2)
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.6,.55,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.object.light_add(type='AREA',location=(0,-4,10));bpy.context.object.data.energy=1400;bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(11,-17,13));cam=bpy.context.object;cam.rotation_euler=(Vector((3.8,2,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=13;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.eevee.use_gtao=True;scene.eevee.gtao_distance=3;scene.view_settings.view_transform='Standard';scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'review-sheet.png');bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'manifest.tmp'),'w') as f:json.dump(manifest,f,indent=2)
os.replace(os.path.join(OUT,'manifest.tmp'),os.path.join(OUT,'manifest.json'))

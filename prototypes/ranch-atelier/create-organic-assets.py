from theme_metadata import surface_metadata
import bpy,math,json,os,time
from mathutils import Vector
ROOT=os.path.dirname(__file__);OUT=os.path.join(ROOT,'dist','simulation-assets','organics');os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
PAL={'chestnut':'BE815A','cream':'F4DEB0','mane':'654638','hoof':'4D453F','eye':'302F2C','pink':'C88F80','milk':'E8DDC6','patch':'796452','green':'7D9C65','light':'A8B67A','wood':'946C49','cut':'D1AA76','gold':'D6A45C','comb':'C66051'}
M={}
for k,h in PAL.items():
 m=bpy.data.materials.new(k);m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;M[k]=m

def ball(name,p,s,mat='chestnut',rot=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=p);o=bpy.context.object;o.name=name;o.scale=s
 if rot:o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat])
 for f in o.data.polygons:f.use_smooth=True
 return o

def beam(name,a,b,r,mat):
 d=Vector(b)-Vector(a);o=ball(name,(Vector(a)+Vector(b))/2,(r,r,d.length/2+r*.4),mat);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def cone(name,p,r,h,mat,rot=None):
 bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=r,radius2=.015,depth=h,location=p);o=bpy.context.object;o.name=name;o.data.materials.append(M[mat])
 if rot:o.rotation_euler=rot
 return o

def horse(state):
 rest=state=='rest';feed=state=='feeding';bz=.56 if rest else 1.2
 ball('Soft barrel',(0,0,bz),(.77,.33,.4));ball('Round haunch',(-.51,0,bz+.04),(.39,.35,.4))
 for x in [-.5,.48]:
  for y in [-.22,.22]:
   if rest:
    ball('Folded leg',(x+.12,y*1.55,.17),(.29,.12,.15));ball('Tucked hoof',(x+.3,y*1.55,.11),(.13,.13,.1),'hoof')
   else:
    beam('Leg',(x,y,.2),(x+.03,y,1.12),.095,'chestnut');ball('Plush hoof',(x+.04,y,.12),(.14,.12,.12),'hoof')
 if feed:
  a=(.48,0,1.3);b=(1.03,0,.75);head=(1.19,0,.53);muzzle=(1.37,0,.34);earz=.79;earx=1.01;eyez=.6;eyex=1.26
 else:
  a=(.48,0,bz+.14);b=(.81,0,bz+.72);head=(.99,0,bz+.76);muzzle=(1.25,0,bz+.65);earz=bz+1.03;earx=.8;eyez=bz+.83;eyex=1.06
 beam('Curved neck',a,b,.23,'chestnut');ball('Cheek',head,(.34,.23,.26));ball('Velvet muzzle',muzzle,(.2,.205,.17),'cream')
 for y in [-.16,.16]:
  ball('Upright ear',(earx,y,earz),(.09,.07,.2),'chestnut',(0,-.2,0));ball('Ear lining',(earx+.05,y,earz),(.035,.055,.12),'pink')
  ball('Bright eye',(eyex,y*1.43,eyez),(.038,.025,.045),'eye');ball('Eye glint',(eyex+.012,y*1.54,eyez+.015),(.012,.009,.014),'cream')
 for t in range(6):
  q=t/5;p=Vector(a).lerp(Vector(b),q);p.x-=.16;p.z+=.07;ball('Mane scallop',p,(.15,.13,.16),'mane')
 for i in range(3):ball('Forelock tuft',(earx+.12+i*.08,-.02,earz-.1),(.13,.15,.12),'mane')
 beam('Tail root',(-.72,0,bz+.12),(-.94,.03,bz-.28),.09,'chestnut');ball('Tail tassel',(-.98,.03,bz-.4),(.16,.15,.29),'mane',(0,.23,0))

def ruminant(species,state):
 goat=species=='goat';rest=state=='rest';feed=state=='feeding';body='cream' if goat else 'milk';bz=.39 if rest else .87;length=.59 if goat else .77;width=.26 if goat else .37
 ball('Rounded body',(0,0,bz),(length,width,.31 if goat else .4),body)
 for x in [-length*.7,length*.66]:
  for y in [-width*.67,width*.67]:
   if rest:ball('Folded leg',(x+.1,y*1.4,.13),(.23,.1,.12),body)
   else:beam('Short leg',(x,y,.14),(x,y,bz),.075 if goat else .095,body)
   ball('Cloven hoof',(x+.08 if rest else x,y*1.4 if rest else y,.08),(.115,.1,.085),'hoof')
 if feed:head=(length+.28,0,.35);necktop=(length*.9,0,.56)
 else:head=(length+.19,0,bz+.36);necktop=(length*.8,0,bz+.26)
 beam('Neck',(length*.55,0,bz),necktop,.18 if goat else .23,body);ball('Head',head,(.25,.18 if goat else .25,.24),body);ball('Nose',(head[0]+.18,0,head[2]-.07),(.14,.16 if goat else .25,.13),'patch' if goat else 'pink')
 for s in [-1,1]:
  ball('Ear',(head[0]-.07,s*(.25 if goat else .32),head[2]+.08),(.16,.095,.075),body,(0,0,s*.25));ball('Eye',(head[0]+.1,s*(.174 if goat else .24),head[2]+.08),(.033,.023,.04),'eye')
  beam('Horn',(head[0]-.11,s*.14,head[2]+.19),(head[0]-.26,s*.18,head[2]+.48),.045,'wood')
 if goat:
  ball('Goat beard',(head[0]+.08,0,head[2]-.25),(.1,.1,.18),'cream');beam('Upturned tail',(-length*.9,0,bz+.1),(-length-.14,0,bz+.34),.08,'cream')
  for x in [-.36,-.17,.06,.25]:ball('Wool shoulders',(x,0,bz+.27),(.17,.25,.13),'milk')
 else:
  for x,y,z,sx,sz in [(-.38,-.34,bz,.27,.23),(.2,-.35,bz+.13,.2,.19),(-.1,.35,bz-.04,.33,.22)]:ball('Brown coat patch',(x,y,z),(sx,.045,sz),'patch')
  beam('Tail',(-length,0,bz+.1),(-length-.14,0,bz-.38),.045,'milk');ball('Tail brush',(-length-.14,0,bz-.4),(.075,.07,.12),'patch')

def chicken(state):
 rest=state=='rest';feed=state=='feeding';z=.29 if rest else .5
 ball('Hen body',(0,0,z),(.35,.23,.29),'cream');ball('Near wing',(-.05,-.21,z),(.25,.07,.2),'gold');ball('Far wing',(-.05,.21,z),(.25,.07,.2),'gold')
 for i in range(3):ball('Tail feather',(-.33-i*.04,0,z+.17+i*.05),(.13,.12,.2),'gold',(0,-.6,0))
 hz=.32 if feed else z+.35;hx=.38 if feed else .22
 beam('Neck',(.16,0,z+.12),(hx,0,hz),.13,'cream');ball('Head',(hx,0,hz),(.16,.14,.17),'cream')
 cone('Beak',(hx+.18,0,hz-.03),.07,.17,'gold',(0,math.pi/2,0))
 for y in [-.13,.13]:ball('Eye',(hx+.06,y,hz+.035),(.025,.014,.03),'eye')
 for i in range(3):ball('Comb lobe',(hx-.07+i*.06,0,hz+.16),(.045,.045,.07),'comb')
 ball('Wattle',(hx+.07,0,hz-.13),(.05,.06,.08),'comb')
 if not rest:
  for y in [-.13,.13]:
   beam('Leg',(.02,y,.05),(.02,y,.32),.025,'gold')
   for dy in [-.045,0,.045]:beam('Toe',(.02,y,.035),(.16,y+dy,.025),.018,'gold')

def tree(state):
 beam('Tapering trunk',(0,0,.07),(.05,.03,.85 if state=='stump' else 1.7),.19,'wood')
 for a in [0,1.7,3.8]:beam('Root',(0,0,.17),(.42*math.cos(a),.42*math.sin(a),.05),.09,'wood')
 if state=='stump':ball('Cut surface',(.05,.03,.85),(.18,.18,.045),'cut');return
 for x,y,z,r in [(-.5,.02,1.75,.62),(.45,.16,1.94,.66),(.03,-.23,2.3,.7),(-.12,.32,2.38,.53)]:
  beam('Branch',(0,0,1),(x,y,z),.085,'wood');ball('Rounded canopy',(x,y,z),(r,r*.86,r*.9),'green' if x<.1 else 'light')

def export_asset(subject,state,build,index):
 started=time.perf_counter();bpy.ops.object.select_all(action='DESELECT');before=set(bpy.data.objects);build(state);objects=[o for o in bpy.data.objects if o not in before];ident=subject+'-'+state;col=bpy.data.collections.new(ident);bpy.context.scene.collection.children.link(col)
 for o in objects:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o);o.select_set(True)
 bpy.context.view_layer.update();bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True)
 parts=[];triangles=0
 for o in objects:
  mesh=o.data;mesh.calc_loop_triangles();pos=[];norm=[];normalMatrix=o.matrix_world.to_3x3().inverted().transposed()
  for tri in mesh.loop_triangles:
   for li,vi in zip(tri.loops,tri.vertices):
    p=o.matrix_world@mesh.vertices[vi].co;n=(normalMatrix@mesh.corner_normals[li].vector).normalized();pos.extend([round(p.x,5),round(p.z,5),round(-p.y,5)]);norm.extend([round(n.x,5),round(n.z,5),round(-n.y,5)])
  triangles+=len(mesh.loop_triangles);parts.append({'name':o.name,'positions':pos,'normals':norm,'color':list(o.data.materials[0].diffuse_color)[:3],**surface_metadata('organics',o.data.materials[0].name,o.name,list(o.data.materials[0].diffuse_color)[:3])})
 with open(os.path.join(OUT,ident+'.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
 activities={'idle':['explore','settling-in'],'feeding':['forage','browse','scratch','drink','supplemental-feeding'],'rest':['rest'],'standing':['vegetation'],'stump':['cleared']}[state]
 item={'id':ident,'label':subject.title()+' · '+state.title(),'category':'organics','subject':subject,'state':state,'json':'/simulation-assets/organics/'+ident+'.json','glb':'/simulation-assets/organics/'+ident+'.glb','triangles':triangles,'simulationMapping':{'species':subject,'activities':activities,'kind':'static-pose','note':'Static pose only; movement remains simulation-driven. Tree stump is available visual, not automatic regrowth.'},'generationSeconds':round(time.perf_counter()-started,3)}
 manifest.append(item)
 with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
 for o in objects:o.location.x+=(index%3)*3.8;o.location.y+=(index//3)*3.6
 print('ASSET_READY '+ident+' '+str(item['generationSeconds']),flush=True)
manifest=[];start=time.perf_counter()
for species in ['horse','cow','goat','chicken']:
 for state in ['idle','feeding','rest']:export_asset(species,state,horse if species=='horse' else chicken if species=='chicken' else lambda s,sp=species:ruminant(sp,s),len(manifest))
for state in ['standing','stump']:export_asset('tree',state,tree,len(manifest))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'organics-editable.blend'))
with open(os.path.join(OUT,'timings.json'),'w') as f:json.dump({'assets':len(manifest),'generationAndExportSeconds':round(time.perf_counter()-start,3),'excludes':'Script authoring, visual review and rendering','perAsset':{a['id']:a['generationSeconds'] for a in manifest}},f,indent=2)
# Render a contact sheet for anatomical and pose review.
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1400;scene.render.resolution_y=1500;scene.render.resolution_percentage=100
scene.world.color=(.65,.65,.65)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03));bpy.context.object.data.materials.append(M['cream'])
bpy.ops.object.light_add(type='AREA',location=(-4,-4,18));bpy.context.object.data.energy=2300;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=12
bpy.ops.object.camera_add(location=(18,-19,24));cam=bpy.context.object;target=Vector((3.9,7,0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=20;scene.camera=cam
scene.view_settings.view_transform='Standard';scene.render.filepath=os.path.join(OUT,'contact-sheet.png');bpy.ops.render.render(write_still=True)


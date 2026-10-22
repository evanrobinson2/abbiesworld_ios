import bpy, math, json, os
from mathutils import Vector
OUT=os.path.join(os.path.dirname(__file__),'dist','asset-studies')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
palette={'chestnut':'A76543','dark':'493C34','cream':'E9D9B7','green':'73915C','light':'99AF71','trunk':'806045','red':'B96F55','roof':'527F7C','wood':'BF9766','end':'D6B480'}
materials={}
for name,h in palette.items():
 m=bpy.data.materials.new(name); m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,); m.use_nodes=True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color; m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88; materials[name]=m
style=0
def shape(name,p,s,mat,kind='box',rot=None):
 if kind=='ball':
  if style==1: bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,location=p)
  else: bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if style==0 else 2,location=p)
 elif kind=='cylinder': bpy.ops.mesh.primitive_cylinder_add(vertices=8 if style!=1 else 12,radius=1,depth=2,location=p)
 else: bpy.ops.mesh.primitive_cube_add(size=2,location=p)
 o=bpy.context.object; o.name=name; o.scale=s
 if rot:o.rotation_euler=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(materials[mat])
 if style==1 and kind=='box':
  mod=o.modifiers.new('Soft corners','BEVEL'); mod.width=min(s)*.3; mod.segments=2; bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
 if style==1 and kind=='ball':
  for face in o.data.polygons:face.use_smooth=True
 return o
def beam(name,a,b,r,mat):
 d=Vector(b)-Vector(a);o=shape(name,(Vector(a)+Vector(b))/2,(r,r,d.length/2),mat,'cylinder' if style==1 else 'box');o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def horse():
 body='wood' if style==2 else 'chestnut'; form='box' if style==2 else 'ball'
 shape('Body',(0,0,1.22),(.78,.29,.38),body,form)
 shape('Rump',(-.55,0,1.26),(.36,.31,.36),body,form)
 beam('Neck',(.48,0,1.35),(.82,0,1.97),.23,body)
 shape('Head',(1.0,0,1.99),(.37,.21,.24),body,form, (0,.2,0))
 shape('Muzzle',(1.26,0,1.88),(.18,.19,.16),'end' if style==2 else 'dark',form)
 for y in [-.14,.14]:
  shape('Ear',(.8,y,2.25),(.075,.065,.19),body,'box', (0,-.18,0))
  shape('Eye',(1.04,y*1.48,2.06),(.035,.025,.035),'dark','ball')
 for x in [-.5,.48]:
  for y in [-.22,.22]:
   beam('Leg',(x,y,.23),(x+.04,y,1.13),.085,body)
   shape('Hoof',(x+.035,y,.12),(.12,.105,.12),'dark')
 beam('Mane',(.53,0,1.65),(.73,0,2.15),.09,'dark')
 beam('Tail',(-.72,0,1.39),(-1.0,0,.65),.09,'dark')
 if style==2:
  for x in [-.5,.48]:shape('Wooden joint',(x,-.312,1.19),(.1,.03,.1),'end','ball')
def shelter():
 wood='wood' if style==2 else 'red';roof='dark' if style==2 else 'roof'
 for x in [-1.2,1.2]:
  for y in [-.75,.75]:shape('Post',(x,y,.9),(.09,.09,.9),'wood')
 shape('Back wall',(0,.75,.75),(1.2,.06,.7),wood)
 for x in [-1.2,1.2]:shape('Side wall',(x,0,.75),(.06,.75,.7),wood)
 for sign in [-1,1]:shape('Roof',(sign*.67,0,2.03),(.77,.98,.08),roof,'box',(0,sign*.38,0))
 beam('Front lintel',(-1.25,-.77,1.72),(1.25,-.77,1.72),.09,'wood')
 for x in [-1,0,1]:shape('Wall batten',(x,.675,.75),(.025,.025,.67),'wood')
 shape('Straw bed',(0,.1,.055),(1.05,.55,.055),'cream')
def tree():
 shape('Trunk',(0,0,1.0),(.18,.17,1),'trunk','cylinder')
 if style==2:
  for i,(z,r) in enumerate([(1.35,1.0),(1.95,.78),(2.5,.5)]):
   bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=r,radius2=.08,depth=.9,location=(0,0,z));bpy.context.object.data.materials.append(materials['green' if i%2==0 else 'light'])
 else:
  for x,y,z,r in [(-.55,0,1.9,.68),(.5,.1,2.05,.76),(0,-.35,2.4,.75),(0,.38,2.5,.65)]:
   beam('Branch',(0,0,1),(x,y,z),.07,'trunk');shape('Canopy',(x,y,z),(r,r*.85,r*.85),'green' if x<.1 else 'light','ball')
manifest=[]
for style,label in enumerate(['faceted','soft-toy','wooden']):
 for subject,build in [('horse',horse),('shelter',shelter),('tree',tree)]:
  bpy.ops.object.select_all(action='DESELECT'); before=set(bpy.data.objects);build(); objects=[o for o in bpy.data.objects if o not in before]; ident=subject+'-'+label
  col=bpy.data.collections.new(ident);bpy.context.scene.collection.children.link(col)
  for o in objects:
   for c in list(o.users_collection):c.objects.unlink(o)
   col.objects.link(o);o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ident+'.glb'),export_format='GLB',use_selection=True)
  parts=[];triangles=0
  for o in objects:
   mesh=o.data;mesh.calc_loop_triangles();pos=[]
   for tri in mesh.loop_triangles:
    for i in tri.vertices:
     p=o.matrix_world@mesh.vertices[i].co;pos.extend([round(p.x,5),round(p.z,5),round(-p.y,5)])
   triangles+=len(mesh.loop_triangles);parts.append({'positions':pos,'color':list(o.data.materials[0].diffuse_color)[:3]})
  with open(os.path.join(OUT,ident+'.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
  manifest.append({'id':ident,'subject':subject,'style':label,'triangles':triangles,'bytes':os.path.getsize(os.path.join(OUT,ident+'.glb'))})
  # Arrange all nine studies in the editable source file.
  for o in objects:o.location.x+=style*5;o.location.y+=['horse','shelter','tree'].index(subject)*5
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ranch-asset-studies.blend'))

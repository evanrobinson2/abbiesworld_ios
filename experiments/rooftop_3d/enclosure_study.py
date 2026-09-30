"""Reference-led camera, living doorway surround and separate timber ceiling.
Never changes the uploaded tree, original asset library or previous review scenes.
"""
import bpy, bmesh, math, json, random
from pathlib import Path
from mathutils import Vector,Matrix,kdtree
ROOT=Path(__file__).resolve().parent
source_scene='bark-material-study.blend' if (ROOT/'bark-material-study.blend').exists() else 'bark-local-study.blend'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/source_scene));scene=bpy.context.scene
p=json.loads((ROOT/'camera-fit.json').read_text())['parameters']
camdata=bpy.data.cameras.new('CAM 07 · Sheltered reference composition');cam=bpy.data.objects.new(camdata.name,camdata);scene.collection.objects.link(cam)
cam.location=(p['cx'],p['cy'],p['cz']);forward=Vector((p['tx'],1,p['cz']))-cam.location
cam.rotation_euler=forward.to_track_quat('-Z','Y').to_euler();camdata.lens=p['lens'];camdata.shift_y=p['vertical_image_shift']*.75;scene.camera=cam
bpy.context.view_layer.update()
forward.normalize();right=forward.cross(Vector((0,0,1))).normalized();up=right.cross(forward).normalized()
def ray(u,v,depth):
 return cam.location+forward*depth+right*((u-.5)*36/p['lens']*depth)+up*((.5+p['vertical_image_shift']-v)*27/p['lens']*depth)
def ground(u,v):
 d=p['cz']*p['lens']/27/(v-.5-p['vertical_image_shift']);return ray(u,v,d)
angle=math.radians(p['door_yaw'])
arch=Matrix.Translation(Vector((-1.99+p['door_dx'],2.5+p['door_dy'],0)))@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(Vector((1.99,-2.5,0)))
# Keep the frame, rose panel, window and bench separate while moving their arrangement together.
for ob in list(scene.objects):
 if ob.name=='Meshy candidate · independent timber assembly' or ob.name.startswith('Retained ·') or ob.get('asset_id')=='bench':ob.matrix_world=arch@ob.matrix_world
# Retain the old pieces, hidden only in this arrangement.
for ob in scene.objects:
 if ob.get('asset_id') in ['deck','roof.slats','railing']:ob.hide_render=True;ob.hide_viewport=True

def collection(name,asset):
 c=bpy.data.collections.new(name);scene.collection.children.link(c);c['asset_id']=asset;c['vegetation_included']=False;c.asset_mark();return c
ceiling=collection('ASSET · timber ceiling','ceiling.timber');deck=collection('ASSET · reference deck','deck.reference');rail=collection('ASSET · angled balcony rail','railing.reference');surround=collection('ASSET · living alcove surround','tree.alcove.surround')
def material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.86;return m
wood=bpy.data.materials.get('Timber · plum and warm grain');trim=bpy.data.materials.get('Wood edging · mulberry')
if not wood:wood=material('Ceiling · dark plum timber',(.10,.034,.047))
if not trim:trim=wood

def cube(name,loc,size,mat,col,rot=None,bevel=.02):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if rot:o.rotation_euler=rot
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Worked edges','BEVEL');mod.width=bevel;mod.segments=3;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o

def beam(name,a,b,width,depth,mat,col):
 a,b=Vector(a),Vector(b);o=cube(name,(a+b)/2,(width,depth,(b-a).length),mat,col);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
# Angled rail follows the source rather than sharing the doorway's plane.
a=arch@Vector((-.49,2.62,1.35));a.z=1.25
b=Vector((3.23,p['rail_end_y'],1.27));u=(Vector((b.x,b.y,0))-Vector((a.x,a.y,0))).normalized();v=Vector((u.y,-u.x,0));length=(b-a).length
yaw=math.atan2(u.y,u.x)
beam('Continuous balcony handrail',a,b,.13,.16,wood,rail)
beam('Lower balcony rail',Vector((a.x,a.y,.12)),Vector((b.x,b.y,.12)),.075,.08,wood,rail)
for i in range(6):
 pos=a.lerp(b,i/5);beam('Balcony upright %02d'%i,(pos.x,pos.y,0),(pos.x,pos.y,1.29),.11,.13,trim,rail)
for i in range(1,26):
 pos=a.lerp(b,i/26);beam('Fine balcony baluster %02d'%i,(pos.x,pos.y,.14),(pos.x,pos.y,1.23),.042,.055,trim,rail)
# Floor boards run toward the right foreground, with thickness and real open seams.
back=Vector((a.x,a.y,0))-u*2.65-v*.16;total=length+3.0;depth=5.4;rng=random.Random(407)
# Clip parallel world-X planks to the independently staged deck footprint.
footprint=[back,back+u*total,back+u*total+v*depth,back+v*depth]
def clip_y(poly,value,above):
 result=[]
 for q,r in zip(poly,poly[1:]+poly[:1]):
  iq=q.y>=value if above else q.y<=value;ir=r.y>=value if above else r.y<=value
  if iq:result.append(q)
  if iq!=ir:result.append(q.lerp(r,(value-q.y)/(r.y-q.y)))
 return result
lo=min(q.y for q in footprint);hi=max(q.y for q in footprint)
for i in range(math.ceil((hi-lo)/.29)):
 poly=clip_y(clip_y(footprint,lo+i*.29+.004,True),lo+(i+1)*.29-.004,False)
 if len(poly)<3:continue
 count=len(poly);verts=[(q.x,q.y,z) for z in [-.2,0] for q in poly]
 faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]+[(j,(j+1)%count,(j+1)%count+count,j+count) for j in range(count)]
 mesh=bpy.data.meshes.new('Deck grain running toward foreground');mesh.from_pydata(verts,[],faces);mesh.materials.append(wood)
 ob=bpy.data.objects.new('Reference deck board %02d'%i,mesh);deck.objects.link(ob)
 bevel=ob.modifiers.new('Small plank edges','BEVEL');bevel.width=.008;bevel.segments=2;ob.modifiers.new('Weighted plank normals','WEIGHTED_NORMAL')
for side in (back+u*total,back):beam('Deck side fascia',side+Vector((0,0,-.22)),side+v*depth+Vector((0,0,-.22)),.19,.29,trim,deck)
beam('Deck front fascia',back+v*depth+Vector((0,0,-.22)),back+u*total+v*depth+Vector((0,0,-.22)),.19,.29,trim,deck)
# Sofa and every cushion retain their independent placement/pivots.
oldcenter=Vector((-2.45,-.77,0));front=ground(.245,.83);rear=ground(.143,.635);newcenter=(front+rear)/2
sofa_direction=(rear-front).normalized();sofa_yaw=math.atan2(sofa_direction.y,sofa_direction.x)-math.pi/2
sofa=Matrix.Translation(newcenter)@Matrix.Rotation(sofa_yaw,4,'Z')@Matrix.Diagonal((1,(rear-front).length/2.85,1,1))@Matrix.Translation(-oldcenter)
for ob in scene.objects:
 aid=ob.get('asset_id','')
 if aid in ['seat.base','cushion.seat','cushion.back'] or (aid=='cushion.loose' and ob.location.y<1):ob.matrix_world=sofa@ob.matrix_world
 elif aid=='cushion.loose':ob.matrix_world=arch@ob.matrix_world
# A sloped, continuous timber soffit; seams are narrow, without sky between roof boards.
# It meets the alcove high at the back and opens upward toward the foreground branch.
ceilingmat=material('Ceiling · sheltered dark heartwood',(.020,.006,.011))
for i in range(15):
 x=-3.75+(i+.5)*4.85/15
 c0=Vector((x,1.28,4.53));c1=Vector((x,2.88,3.76))
 ob=beam('Ceiling underside board %02d'%i,arch@c0,arch@c1,.325,.115,ceilingmat,ceiling)
for y,z in [(1.28,4.53),(2.02,4.16),(2.82,3.74)]:beam('Ceiling crossbeam',arch@Vector((-3.85,y,z)),arch@Vector((1.17,y,z)),.18,.24,ceilingmat,ceiling)
# Dark header wall closes the old sky strip above the frame.
header=cube('Timber infill above window',(-1.99,2.63,3.76),(2.70,.25,.36),trim,ceiling);header.matrix_world=arch@header.matrix_world

# Warp a COPY of the textured tree using its authored centerline. UVs remain attached to vertices.
# Branch profiles get a local transported frame; blending near branch junctions keeps the surface continuous.
oldpaths=[
 [(-3.28,-2.32,-.75),(-3.16,-2.13,.1),(-3.3,-1.96,1.08),(-3.45,-1.58,1.91),(-3.15,-1.18,2.73),(-2.87,-.65,3.51),(-2.43,.02,4.13),(-1.42,.64,4.49),(-.3,1.06,4.47),(1.1,1.32,4.5),(2.63,1.68,4.27),(3.5,1.94,4.08)],
 [(-.79,2.72,-.22),(-.81,2.77,.48),(-.98,2.71,1.35),(-.78,2.66,2.25),(-.84,2.64,3),(-1.06,2.56,3.83),(-1.84,1.95,4.29)],
 [(-2.73,-.2,3.88),(-2.45,.86,3.98),(-1.54,2.4,4.08),(.05,2.86,4.22),(1.96,3.19,4.5),(3.45,3.21,4.35)],
 [(-3.25,-1.32,2.52),(-3.75,-.5,3.33),(-3.77,.5,4),(-3.35,1.8,4.71),(-2.66,2.25,4.82)]]
mainuv=[(.13,1.0,6.1),(.11,.86,6.2),(.065,.64,6.8),(.035,.49,7.4),(.075,.31,7.6),(.12,.185,7.7),(.235,.095,8),(.37,.067,8.6),(.5,.067,8.7),(.63,.045,8.8),(.78,-.015,9),(.96,-.01,9.2)]
newpaths=[[ray(*pt) for pt in mainuv]]
newpaths.append([arch@Vector((x+.27,y+.24,z)) for x,y,z in oldpaths[1]])
newpaths.append([ray(*pt) for pt in [(.205,.11,8.05),(.30,.10,8.7),(.42,.085,9.8),(.62,.08,10.1),(.82,.06,10.2),(.98,.02,10.3)]])
newpaths.append([ray(*pt) for pt in [(.058,.345,7.5),(-.02,.21,8.0),(-.045,.08,8.2),(.04,-.07,8.4),(.14,-.10,8.8)]])
frames=[]
for path_id,(old,new) in enumerate(zip(oldpaths,newpaths)):
 old=list(map(Vector,old));new=list(map(Vector,new))
 for idx in range(len(old)-1):
  ot=(old[idx+1]-old[idx]).normalized();nt=(new[idx+1]-new[idx]).normalized();rotation=ot.rotation_difference(nt)
  for j in range(28):
   t=j/28;frames.append((old[idx].lerp(old[idx+1],t),new[idx].lerp(new[idx+1],t),rotation,1.72 if path_id==1 else 1.0))
kd=kdtree.KDTree(len(frames))
for i,(center,*_) in enumerate(frames):kd.insert(center,i)
kd.balance()
def warp(point):
 near=kd.find_n(point,24);result=Vector((0,0,0));total=0
 for _,idx,distance in near:
  old,new,rotation,scale=frames[idx];weight=1/(distance+.32)**3
  result+=(new+(point-old)*scale)*weight;total+=weight
 return result/total
surfaces=[ob for ob in scene.objects if ob.get('asset_id')=='tree.bare.meshy.surface']
if not surfaces:surfaces=[ob for ob in scene.objects if ob.get('asset_id')=='tree.bare.refined']
for ob in surfaces:
 ob.data=ob.data.copy();world=ob.matrix_world.copy();inv=world.inverted()
 # Weld positional duplicates on this copy before classifying loose twig components.
 # glTF splits vertices at UV seams; UV loops survive the weld. Classifying the
 # unwelded mesh would incorrectly treat bark atlas islands as separate geometry.
 bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
 visited=set();remove=[];component_sizes=[]
 for vertex in bm.verts:
  if vertex in visited:continue
  group=[];stack=[vertex];visited.add(vertex)
  while stack:
   q=stack.pop();group.append(q)
   for edge in q.link_edges:
    other=edge.other_vert(q)
    if other not in visited:visited.add(other);stack.append(other)
  component_sizes.append(len(group))
  if len(group)<750:remove.extend(group)
 if remove:bmesh.ops.delete(bm,geom=remove,context='VERTS')
 bm.to_mesh(ob.data);bm.free()
 print('TREE_COMPONENTS',sorted(component_sizes,reverse=True))
 # Cool and darken Meshy's pale streaks to fit the shaded cherry-tree reference.
 for i,mat in enumerate(ob.data.materials):
  if not mat or not mat.use_nodes:continue
  mat=mat.copy();ob.data.materials[i]=mat;nt=mat.node_tree;bs=nt.nodes.get('Principled BSDF')
  if bs and bs.inputs['Base Color'].is_linked:
   source=bs.inputs['Base Color'].links[0].from_socket
   tint=nt.nodes.new('ShaderNodeMixRGB');tint.name='Shelter bark color calibration';tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.11,.13,.23,1)
   nt.links.new(source,tint.inputs[1]);nt.links.new(tint.outputs[0],bs.inputs['Base Color'])

 for vert in ob.data.vertices:
  q=warp(world@vert.co);delta=q-cam.location;distance=delta.dot(forward)
  screen_x=.5+delta.dot(right)/distance*p['lens']/36
  # Carry the high right-hand limb upward out of the sheltered viewing opening.
  # This is a continuous branch reshape, without deleting camera-facing geometry.
  amount=max(0,min(1,(screen_x-.61)/.22));amount=amount*amount*(3-2*amount)
  q.z+=1.6*amount*max(0,min(1,(q.z-3.8)/.65))
  vert.co=inv@q
 if ob.data.has_custom_normals:ob.data.normals_split_custom_set([(0,0,0)]*len(ob.data.loops))
 ob.data.update()
 ob['arrangement_deformation']='Copied geometry, preserved UV; original submitted model unchanged'
# A second living buttress closes the space beside/behind the left jamb. Bare wood only.
# These new returns use a local procedural bark material; no additional external job.
barkmat=material('Alcove bark · flowing grain',(.045,.022,.033));nt=barkmat.node_tree;bs=nt.nodes.get('Principled BSDF')
tex=nt.nodes.new('ShaderNodeTexCoord');mul=nt.nodes.new('ShaderNodeVectorMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=(9,9,.48)
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=5;nt.links.new(tex.outputs['Generated'],mul.inputs[0]);nt.links.new(mul.outputs[0],noise.inputs[0])
ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.009,.007,.018,1);ramp.color_ramp.elements[1].color=(.095,.045,.064,1);nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],bs.inputs['Base Color'])
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.5;bump.inputs['Distance'].default_value=.048;nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs[0],bs.inputs['Normal'])
def limb(name,points,radii):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=20;c.bevel_depth=1;c.bevel_resolution=5
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for pt,co,r in zip(s.bezier_points,points,radii):pt.co=co;pt.radius=r;pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);surround.objects.link(o);c.materials.append(barkmat);return o
limb('Living bark behind left jamb',[arch@Vector(pt) for pt in [(-3.6,2.84,-.3),(-3.6,2.83,1),(-3.64,2.80,2.2),(-3.35,2.81,3.43),(-2.8,2.87,4.05)]],[.56,.48,.46,.55,.43])
# Bark shoulder behind the doorway's right edge, distinct from the wooden post in front.
limb('Living shoulder behind right jamb',[arch@Vector(pt) for pt in [(-.30,3.04,-.35),(-.28,3.09,.85),(-.42,3.07,1.9),(-.20,3.1,2.9),(-.61,3.12,3.72),(-1.4,3.01,4.13)]],[.52,.46,.48,.49,.50,.30])
# Separate small branches support the independent blossom masses.
for i in range(5):
 x=.43+i*.13
 limb('Canopy branch %02d'%i,[ray(x-.16,.025,9.1),ray(x,.055,9.4),ray(x+.08,.15,9.7),ray(x+.10,.25,10)],[.095,.07,.037,.009])
# Reposition separate vegetation clusters, using the old centroid as local anchor.
for ob in list(scene.objects):
 aid=ob.get('asset_id','')
 if aid.startswith('blossom.cluster.'):
  i=int(aid.rsplit('.',1)[-1]);ob.location=ray(-.04+i*.145,.045 if i<4 else .12,8.8+max(0,i-4)*.12);ob.scale=(.80,.80,.80)
# Smaller repeated clusters add canopy mass without welding a single blossom into the tree.
clusters=[o for o in scene.objects if o.get('asset_id','').startswith('blossom.cluster.')]
for i,(x,y) in enumerate([(.56,.03),(.63,.09),(.69,.015),(.73,.1),(.79,.09),(.84,.14),(.9,.13),(.96,.19),(1.02,.14),(.98,.28),(.8,-.01),(.48,.035)]):
 source=clusters[i%len(clusters)];ob=source.copy();scene.collection.objects.link(ob);ob.name='Independent canopy cluster %02d'%i
 ob.location=ray(x,y,9.8);ob.scale=(.62,.62,.62);ob.rotation_euler.z=.4*i
# Lantern bodies remain individual; translate their suspension pivots with each whole assembly.
lantern_points=[(.55,.36,10.0),(.62,.40,10.2),(.79,.375,10.1),(.895,.395,9.8)]
for ob in list(scene.objects):
 aid=ob.get('asset_id','')
 if aid.startswith('lantern.'):
  i=int(aid.split('.')[1]);oldz=[2.67,2.31,2.75,2.63][i];oldcenter=Vector((ob.location.x,ob.location.y,oldz));ob.location+=ray(*lantern_points[i])-oldcenter
# Keep sunset direction; add a modest bounce into the newly enclosed corner.
lightdata=bpy.data.lights.new('Soft rose ceiling bounce','AREA');lightdata.energy=100;lightdata.color=(1,.35,.45);lightdata.shape='DISK';lightdata.size=4
light=bpy.data.objects.new(lightdata.name,lightdata);scene.collection.objects.link(light);light.location=arch@Vector((-1,-.6,2.6));light.rotation_euler=(arch@Vector((-2,2.4,2.5))-light.location).to_track_quat('-Z','Y').to_euler()
# Adapt the background placement to the corrected observer while retaining separate layers.
for ob in scene.objects:
 if ob.name.startswith('Distant mountain '):
  idx=int(ob.name.rsplit(' ',1)[-1]);ob.location.z-=[2.0,3.7,5.8,9.2][idx-1]
sun=bpy.data.objects.get('Sun glimpsed through blossoms')
if sun:sun.location=ray(.82,.19,90)
# Current background remains an independent rough lighting study.
scene['milestone']='3c / camera and living enclosure correction';scene['camera_reference']='Nine annotated architectural landmarks; approximate fit, not exact reconstruction'
scene['components']='Separate bare tree, bark returns, timber ceiling, deck, railing, alcove, pillows, lanterns and blossom clusters'
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.cycles.samples=64
scene.render.filepath=str(ROOT/'renders'/'15-enclosure-review.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'enclosure-study.blend'))
bpy.ops.render.render(write_still=True)
(ROOT/'enclosure-study.json').write_text(json.dumps({'source':source_scene,'camera':{'location':list(cam.location),'lens':camdata.lens,'shift_y':camdata.shift_y,'rotation':list(cam.rotation_euler)},'new_components':['ceiling.timber','tree.alcove.surround','deck.reference','railing.reference'],'source_library_unchanged':True,'source_tree_unchanged':True,'foliage_separate':True,'native_integration':False},indent=2)+'\n')
print('ENCLOSURE_STUDY_COMPLETE')

"""B04: a single massive living tree enclosing the room and supporting the terrace."""
import bpy,bmesh,math,json,random
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b03.blend'));scene=bpy.context.scene;D=json.loads((ROOT/'design-b02.json').read_text());rng=random.Random(1803)
bark=bpy.data.materials['B01 Furrowed bark'];treecol=bpy.data.collections['B04 Living branches'];floorcol=bpy.data.collections['B01 Deck planks']
# Replace the separate rear tube and under-deck twigs with one enclosing trunk volume.
for ob in list(scene.objects):
 if ob.name=='T01 Hollow living trunk' or 'flowing bark ridge' in ob.name or ob.name in ['B Under couch supporting arm','B Under terrace bearing']:
  bpy.data.objects.remove(ob,do_unlink=True)
levels=[(-12,-3.0,2.2,3.6,5.0),(-6,-3.25,1.9,3.5,4.95),(-2.5,-3.5,1.45,3.3,4.85),(-.7,-3.8,1.5,2.95,4.75),(0,-3.9,1.55,2.8,4.65),(1.2,-4.0,1.65,2.67,4.40),(2.6,-3.75,1.8,2.75,4.05),(3.7,-3.4,1.8,2.85,3.75),(4.7,-2.85,2.1,2.85,3.5),(6.2,-2.7,2.7,2.75,3.3),(8.2,-2.9,3.0,2.5,3.1)]
verts=[];faces=[];n=128
for z,cx,cy,rx,ry in levels:
 for k in range(n):
  a=k*math.tau/n;flute=1+.026*math.sin(a*15+z*.10)+.012*math.sin(a*33-z*.18);verts.append((cx+rx*math.cos(a)*flute,cy+ry*math.sin(a)*flute,z))
for j in range(len(levels)-1):
 for k in range(n):a=j*n+k;b=j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
faces.extend([tuple(range(n-1,-1,-1)),tuple((len(levels)-1)*n+k for k in range(n))])
me=bpy.data.meshes.new('B04 giant living trunk volume');me.from_pydata(verts,[],faces);me.materials.append(bark);core=bpy.data.objects.new('B04 continuous enclosing tree',me);treecol.objects.link(core)
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
# Thick limbs are joined into this trunk and reach the actual girder bearing positions.
O=Vector(D['deck']['origin']);rot=Matrix.Rotation(math.radians(D['deck']['yaw_degrees']),3,'Z')
def deck(p):return O+rot@Vector(p)
def limb(name,points,radii):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=1;c.bevel_resolution=5;c.use_fill_caps=True;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for p,co,r in zip(s.bezier_points,points,radii):p.co=co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 ob=bpy.data.objects.new(name,c);treecol.objects.link(ob);c.materials.append(bark);return ob
merge=[core,bpy.data.objects['B foreground sheltering trunk']]
for i,(u,v) in enumerate([(3.0,-6.3),(5.55,-3.7),(5.55,-.6)]):
 end=deck((u,v,-1.12));base=Vector((-4,1.2,-2.9));mid=base.lerp(end,.55);mid.z=-1.8
 merge.append(limb('B04 integral bearing limb '+str(i),[base,mid,end-Vector((.2,.1,.18)),end],[1.25,.95,.68,.59]))
# One welded volume gives real junctions between the facade, foreground and supporting limbs.
bpy.ops.object.select_all(action='DESELECT')
for ob in merge:ob.select_set(True)
bpy.context.view_layer.objects.active=core;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();core=bpy.context.object
rem=core.modifiers.new('Continuous living wood junctions','REMESH');rem.mode='VOXEL';rem.voxel_size=.085;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
# Carve a room into the giant tree. Its left wall follows the back of the sofa.
# Rear limit leaves real wood enclosing the doorway and its right-hand jamb.
outline=[(-3.72,-6.0),(8,-6.0),(8,3.42),(-3.84,3.42),(-3.79,1.1),(-3.74,-1.0),(-3.73,-2.3)]
vs=[(x,y,-.59) for x,y in outline]+[(x,y,3.50+.26*(3.0-y)) for x,y in outline];count=len(outline);fs=[tuple(range(count-1,-1,-1)),tuple(range(count,2*count))]+[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
cm=bpy.data.meshes.new('B04 carved room void');cm.from_pydata(vs,[],fs);cutter=bpy.data.objects.new('B04 room carving tool',cm);scene.collection.objects.link(cutter)
bm=bmesh.new();bm.from_mesh(cm);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cm);bm.free()
bpy.context.view_layer.objects.active=core;m=core.modifiers.new('Room carved into living trunk','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Cull only tiny voxel fragments; inspect any substantial disconnected volume.
bm=bmesh.new();bm.from_mesh(core.data);seen=set();groups=[]
for v in bm.verts:
 if v in seen:continue
 group=[];todo=[v];seen.add(v)
 while todo:
  q=todo.pop();group.append(q)
  for e in q.link_edges:
   other=e.other_vert(q)
   if other not in seen:seen.add(other);todo.append(other)
 groups.append(group)
groups.sort(key=len,reverse=True)
print('TREE_COMPONENT_COUNTS', [len(g) for g in groups],flush=True)
for group in groups[1:]:
 print('TREE_FRAGMENT_BOUNDS', [min(v.co[i] for v in group) for i in range(3)], [max(v.co[i] for v in group) for i in range(3)],flush=True)
 if len(group)<128:bmesh.ops.delete(bm,geom=group,context='VERTS')
bm.to_mesh(core.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'b04-tree-shell-checkpoint.blend'))
for face in core.data.polygons:face.use_smooth=True
core['asset_id']='tree.continuous.enclosing';core['component']='tree';core['supports']='B02 primary girders, sofa bay and alcove';core['foliage_included']=False
# Preserve a solid bearing surface where the carved tree meets girder undersides.
# Cut timber to the actual bark volume so decking ends at the tree wall.
worldmin=Vector(tuple(min((core.matrix_world@v.co)[a] for v in core.data.vertices) for a in range(3)));worldmax=Vector(tuple(max((core.matrix_world@v.co)[a] for v in core.data.vertices) for a in range(3)))
trimmed=[]
for ob in list(floorcol.objects):
 corners=[ob.matrix_world@Vector(c) for c in ob.bound_box]
 if min(p.x for p in corners)>-.6:continue
 bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Fit plank against enclosing bark','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=core
 bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name)
 if len(ob.data.polygons)==0:bpy.data.objects.remove(ob,do_unlink=True)
 else:trimmed.append(ob.name)
# Upholstery rests against the carved bark wall instead of floating in front of it.
for ob in bpy.data.collections['B05 Independent upholstery'].objects:
 if ob.name.startswith('B back cushion'):ob.location.x-=.035
# Foreground foliage is its own removable 3D layer.
fol=bpy.data.collections.new('B12 Foreground foliage layer');scene.collection.children.link(fol);fol['independent_from_tree_and_deck']=True
leafmat=bpy.data.materials.new('B04 burgundy cherry leaves');leafmat.use_nodes=True;ps=leafmat.node_tree.nodes.get('Principled BSDF');ps.inputs['Base Color'].default_value=(.16,.026,.060,1);ps.inputs['Roughness'].default_value=.7
vs=[];fs=[]
for i in range(110):
 center=Vector((rng.uniform(-.65,.65),rng.uniform(-.40,.4),rng.uniform(-.25,.38)));r=Matrix.Rotation(rng.uniform(-1,1),3,'X')@Matrix.Rotation(rng.random()*math.tau,3,'Z');size=rng.uniform(.065,.15);shape=[(-.3,0,0),(-.42,.4,0),(0,1,.04),(.42,.4,0),(.3,0,0),(0,-.15,0),(0,.38,.14)];start=len(vs)
 vs.extend(center+r@Vector((x*size,y*size,z*size)) for x,y,z in shape)
 fs.extend((start+j,start+(j+1)%6,start+6) for j in range(6))
leafmesh=bpy.data.meshes.new('B04 reusable foreground leaf spray');leafmesh.from_pydata(vs,[],fs);leafmesh.materials.append(leafmat)
flowers=[o.data for o in bpy.data.collections['B07 Separate blossoms'].objects if o.type=='MESH']
for i,point in enumerate([(-4.45,-3.1,.2),(-4.05,-2.9,.1),(-4.65,-2.4,.55),(-4.5,-2.05,.35),(-3.8,-3.2,.06)]):
 ob=bpy.data.objects.new('B04 foreground leaf cluster '+str(i),leafmesh);fol.objects.link(ob);ob.location=point;ob['removable_foreground_layer']=True
 blooms=bpy.data.objects.new('B04 foreground blossom cluster '+str(i),flowers[i%len(flowers)]);fol.objects.link(blooms);blooms.location=Vector(point)+Vector((0,-.06,.11));blooms.scale=(.57,.57,.57)
# Measured couch-to-tree relationship at the back-cushion positions.
bpy.context.view_layer.update();contacts=[]
for ob in sorted([o for o in scene.objects if o.name.startswith('B back cushion')],key=lambda o:o.name):
 start=Vector((ob.location.x+.3,ob.location.y,ob.location.z));hit,location,normal,idx=core.ray_cast(core.matrix_world.inverted()@start,Vector((-1,0,0)),distance=2)
 assert hit,ob.name
 points=[ob.matrix_world@Vector(c) for c in ob.bound_box];back=min(p.x for p in points);gap=back-(core.matrix_world@location).x;contacts.append({'cushion':ob.name,'gap_to_bark_m':round(gap,4)})
 # Slight soft-cushion compression is intentional; no visible open space behind the seats.
 assert gap<.07,(ob.name,gap)
# The unified trunk is one connected, closed surface after carving.
bm=bmesh.new();bm.from_mesh(core.data);boundary=sum(e.is_boundary for e in bm.edges);seen=set();components=0
for v in bm.verts:
 if v in seen:continue
 components+=1;todo=[v];seen.add(v)
 while todo:
  q=todo.pop()
  for e in q.link_edges:
   n=e.other_vert(q)
   if n not in seen:seen.add(n);todo.append(n)
bm.free();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'b04-enclosure-checkpoint.blend'));assert boundary==0,boundary;assert components==1,components
D['revision']='B04';D['tree']['enclosing_levels']=levels;D['tree']['room_void_outline']=outline;D['tree']['room_void_floor_z']=-.59;D['tree']['integral_bearing_limbs']=3
(ROOT/'design-b04.json').write_text(json.dumps(D,indent=2)+'\n')
report={'revision':'B04','one_continuous_tree_component':components==1,'tree_open_boundary_edges':boundary,'couch_back_contacts':contacts,'planks_trimmed_to_tree':len(trimmed),'integral_bearing_limbs':3,'bearing_surface_z':-.59,'foreground_foliage_is_separate':True,'scope':'Geometric scene checks; final organic surface polish and native integration remain open.'}
(ROOT/'tree-enclosure-validation.json').write_text(json.dumps(report,indent=2)+'\n')
scene['revision']='B04';scene['tree_design']='One massive continuous trunk encloses the room, contacts the sofa and forms three thick deck-bearing limbs';scene.cycles.samples=48;scene.frame_set(1);scene.render.filepath=str(ROOT/'B04-assembled.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b04.blend'));bpy.ops.render.render(write_still=True)
# Show the supporting mass from outside with foliage hidden, without moving any geometry.
cam=scene.camera;cmat=cam.matrix_world.copy()
for name in ['B07 Separate blossoms','B12 Foreground foliage layer','B08 Loose petals','B11 Independent fairy lights','B09 Mountain and sky layers']:bpy.data.collections[name].hide_render=True
cam.location=(11,-14,5.5);cam.rotation_euler=(Vector((-2,.2,-.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42
scene.compositing_node_group=None;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.65,.7,.76,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.7
neutral=bpy.data.materials.new('B04 structural clay');neutral.use_nodes=True;neutral.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.48,.51,.53,1);bpy.context.view_layer.material_override=neutral
for o in scene.objects:
 if o.type=='LIGHT':o.data.color=(1,1,1)
scene.cycles.samples=24;scene.render.filepath=str(ROOT/'B04-tree-support.png');bpy.ops.render.render(write_still=True)
print('B04_ENCLOSING_TREE_COMPLETE',json.dumps(report))

"""B09: an exposed timber ceiling over the seating, fitted into the living tree."""
import bpy,bmesh,math,json,hashlib,shutil
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
baseline=ROOT/'rooftop-scene-b08.blend'
if not baseline.exists():
 shutil.copy2(ROOT/'rooftop-current.blend',baseline)
 shutil.copy2(ROOT/'current-scene.png',ROOT/'B08-assembled.png')
bpy.ops.wm.open_mainfile(filepath=str(baseline));scene=bpy.context.scene;core=bpy.data.objects['B04 continuous enclosing tree']
camera_pose=scene.camera.matrix_world.copy();camera_lens=scene.camera.data.lens
origin=Vector((-2.5,3,0));rotation=Matrix.Rotation(math.radians(6),3,'Z')
def world(p):return origin+rotation@Vector(p)
def local(p):return rotation.inverted()@(Vector(p)-origin)
def shape_hash(o):
 a=np.empty(len(o.data.vertices)*3,dtype=np.float32);o.data.vertices.foreach_get('co',a);return hashlib.sha256(a.tobytes()).hexdigest()
preserved={o.name:(shape_hash(o),o.matrix_world.copy()) for name in ['B01 Deck planks','B02 Deck framing','B03 Railing','B05 Independent upholstery','05 Window alcove'] for o in bpy.data.collections[name].objects if o.type=='MESH' and not o.name.startswith('Short high canopy brace')}
lower_before=sorted(tuple(round(v.co[i],5) for i in range(3)) for v in core.data.vertices if v.co.z<3.1)
original_surface=BVHTree.FromPolygons([v.co for v in core.data.vertices],[list(f.vertices) for f in core.data.polygons])

# Adopted architectural dimensions: wider at the outer eave, with the right
# side beam running back to the existing right-hand bearing post.
vfront,vrear=-4.0,.15
front_bearing,rear_bearing=-3.65,-.36
slope=.26;theta=math.atan(slope);cos=math.cos(theta)
def left(v):return -1.92+(v-vfront)/(vrear-vfront)*.22
def right(v):return 3.10-(v-vfront)/(vrear-vfront)*1.40
def beam_top(v):return 3.49+slope*(rear_bearing-v)
def rafter_bottom(v):return beam_top(v)-.045
def board_bottom(v):return rafter_bottom(v)+.18/cos
def board_top(v):return board_bottom(v)+.055/cos

# Remove only the superseded canopy components. The rear header and its posts
# stay where they were, retaining the alcove's original bearing relationship.
for name in ['07 Seated rafters','08 Timber canopy boarding']:
 for ob in list(bpy.data.collections[name].objects):bpy.data.objects.remove(ob,do_unlink=True)
for ob in list(scene.objects):
 if ob.name=='B02 Front canopy beam' or ob.name.startswith('Short high canopy brace'):
  bpy.data.objects.remove(ob,do_unlink=True)
roof=bpy.data.collections.new('B14 Broad timber roof');scene.collection.children.link(roof)
roof['independent_from_tree_and_foliage']=True

def mesh(name,verts,faces,material=None,collection=roof):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 o=bpy.data.objects.new(name,me);collection.objects.link(o)
 if material:me.materials.append(material)
 return o
def prism(name,outline,low,high,material=None):
 n=len(outline);verts=[world((u,v,low(v))) for u,v in outline]+[world((u,v,high(v))) for u,v in outline]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,verts,faces,material)
def finish(o,width=.006):
 b=o.modifiers.new('Soft worked timber edges','BEVEL');b.width=width;b.segments=3
 o.modifiers.new('Timber corner normals','WEIGHTED_NORMAL')
 return o
def member(name,a,b,width,depth,mat):
 a,b=world(a),world(b);mid=(a+b)/2
 bpy.ops.mesh.primitive_cube_add(size=1,location=mid);o=bpy.context.object;o.name=name;o.dimensions=(width,depth,(b-a).length)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 for c in list(o.users_collection):c.objects.unlink(o)
 roof.objects.link(o);o.data.materials.append(mat);finish(o,.012);return o

# Clear the real volume below the new roof. The cutter leaves the massive left
# trunk and rear enclosure intact; no lower couch/deck geometry is touched.
outline=[(-1.83,-4.25),(3.40,-4.25),(1.98,.60),(-1.80,.60)]
cutter=prism('B09 roof clearance tool',outline,lambda v:3.18,lambda v:board_top(v)+.115)
for m in list(core.modifiers):
 if m.type=='SUBSURF':core.modifiers.remove(m)
bm=bmesh.new();bm.from_mesh(core.data);print('ORIGINAL_TREE_SIGNED_VOLUME',bm.calc_volume(signed=True),flush=True)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(core.data);bm.free()
bpy.context.view_layer.objects.active=core
mod=core.modifiers.new('Clear timber roof underside','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;mod.use_self=True
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Tessellate long cut faces for the bark displacement without changing the
# existing sculpt or losing its rest-coordinate/contact-mask attributes.
bm=bmesh.new();bm.from_mesh(core.data)
boundary_edges=[e for e in bm.edges if e.is_boundary]
if boundary_edges:
 bounds=[[min(v.co[i] for e in boundary_edges for v in e.verts),max(v.co[i] for e in boundary_edges for v in e.verts)] for i in range(3)]
 print('BOOLEAN_SEAM_REPAIR',len(boundary_edges),bounds,flush=True)
 # Close the cut's boundary loops in the upper roof pocket. All endpoints
 # must be above the protected room; no lower opening can be filled here.
 assert bounds[2][0]>3.15,bounds
 bmesh.ops.holes_fill(bm,edges=boundary_edges,sides=0)
large=[f for f in bm.faces if f.calc_area()>.12 and min(v.co.z for v in f.verts)>3.15]
if large:bmesh.ops.triangulate(bm,faces=large)
edges=[e for e in bm.edges if e.calc_length()>.38 and min(v.co.z for v in e.verts)>3.15]
if edges:bmesh.ops.subdivide_edges(bm,edges=edges,cuts=4,use_grid_fill=True)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(core.data);bm.free();core.data.update()
normal=core.data.attributes['Bark rest normal'];normal.data.foreach_set('vector',np.array([tuple(v.normal) for v in core.data.vertices],dtype=np.float32).ravel())
sub=core.modifiers.new('Bark relief tessellation — desktop quality','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;sub.render_levels=2

# The underside's grain runs along its boards. Small colour variation and
# broad fibres avoid a perfectly uniform slab at this distance.
wood=bpy.data.materials.new('B09 weathered violet cedar ceiling');wood.use_nodes=True;nt=wood.node_tree;bs=nt.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.76
coord=nt.nodes.new('ShaderNodeTexCoord');mapping=nt.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(.42,88,8);nt.links.new(coord.outputs['Generated'],mapping.inputs[0])
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=3;noise.inputs['Detail'].default_value=5;noise.inputs['Roughness'].default_value=.72;nt.links.new(mapping.outputs[0],noise.inputs['Vector'])
ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.20;ramp.color_ramp.elements[0].color=(.026,.012,.026,1);ramp.color_ramp.elements[1].position=.80;ramp.color_ramp.elements[1].color=(.125,.049,.063,1);nt.links.new(noise.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],bs.inputs['Base Color'])
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.010;nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs[0],bs.inputs['Normal'])
timber=bpy.data.materials['B01 Deep mulberry structural wood']

# Front bearing beam: level across the roof, parallel to the rear header.
front=prism('B09 continuous front eave beam',[(left(front_bearing),front_bearing-.12),(right(front_bearing),front_bearing-.12),(right(front_bearing),front_bearing+.12),(left(front_bearing),front_bearing+.12)],lambda v:beam_top(front_bearing)-.25,lambda v:beam_top(front_bearing),timber);finish(front,.018)

# Rafters use actual horizontal seats at both bearings. Their varying front
# ends fill the trapezoid while staying parallel in the shared roof frame.
rafters=[]
us=np.arange(-1.58,3.00,.48)
for i,u in enumerate(us):
 # Wider outer strips terminate at the diagonal right-side bearer.
 end=vrear if u<=right(vrear)-.045 else vfront+(3.10-u-.045)*(vrear-vfront)/1.40
 if end<=vfront+.12:continue
 profile=[(vfront,rafter_bottom(vfront))]
 seats=[]
 for bv in [front_bearing,rear_bearing]:
  if bv+.12<end:
   lo,hi=bv-.12,bv+.12;profile.extend([(lo,rafter_bottom(lo)),(lo,beam_top(bv)),(hi,beam_top(bv)),(hi,rafter_bottom(hi))]);seats.append(bv)
 profile.extend([(end,rafter_bottom(end)),(end,board_bottom(end)),(vfront,board_bottom(vfront))]);n=len(profile)
 verts=[world((u+du,v,z)) for du in [-.047,.047] for v,z in profile]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 o=mesh('B09 seated rafter %02d'%i,verts,faces,timber);finish(o,.005);o['bearing_seats']=seats;rafters.append(o)

# A diagonal edge bearer ties the wider outer eave into the right alcove post.
# Its knee brace provides a visible triangular load path, above the window.
member('B09 right sloping edge bearer',(1.32,rear_bearing,3.38),(right(front_bearing)-.12,front_bearing,beam_top(front_bearing)-.11),.18,.22,timber)
brace_fraction=(-2.15-rear_bearing)/(front_bearing-rear_bearing)
brace_u=1.32+(right(front_bearing)-.12-1.32)*brace_fraction
brace_z=3.38+(beam_top(front_bearing)-.11-3.38)*brace_fraction-.045
member('B09 right canopy knee brace',(1.32,rear_bearing,2.94),(brace_u,-2.15,brace_z),.14,.14,timber)
member('B09 left trunk roof tie',(-1.32,rear_bearing,3.32),(left(front_bearing)+.16,front_bearing,beam_top(front_bearing)-.12),.16,.21,timber)

# Continuous board courses cross the rafters; narrow real joints remain visible.
count=17;step=(vrear-vfront)/count;boards=[]
for i in range(count):
 a=vfront+i*step+.0025;b=vfront+(i+1)*step-.0025
 o=prism('B09 underside cedar board %02d'%i,[(left(a),a),(right(a),a),(right(b),b),(left(b),b)],board_bottom,board_top,wood);finish(o,.004);boards.append(o)
 # Worn dark grain checks are shallow material detail rather than decorative
 # grooves cut through the roof; each board is an independent component.

# Exposed fascia follows the three open roof edges; the rear meets the trunk.
member('B09 outer fascia',(left(vfront),vfront,board_top(vfront)-.04),(right(vfront),vfront,board_top(vfront)-.04),.10,.19,timber)
member('B09 right fascia',(right(vrear),vrear,board_top(vrear)-.04),(right(vfront),vfront,board_top(vfront)-.04),.08,.17,timber)
member('B09 left fascia',(left(vrear),vrear,board_top(vrear)-.04),(left(vfront),vfront,board_top(vfront)-.04),.08,.17,timber)

# Remove only bulbs now inside timber; retain the visible trunk strand and its
# separate light collection. Foliage remains a separate unchanged layer.
hidden_bulbs=[]
for ob in bpy.data.collections['B11 Independent fairy lights'].objects:
 if ob.type!='MESH':continue
 q=local(ob.location)
 if vfront<q.y<vrear and left(q.y)<q.x<right(q.y) and q.z>board_bottom(q.y)-.11:
  ob.hide_render=True;hidden_bulbs.append(ob.name)

# Keep ceiling legible in the sunset, with a soft, dim bounce from below.
d=bpy.data.lights.new('B09 soft ceiling bounce','AREA');d.energy=110;d.color=(1,.42,.36);d.shape='DISK';d.size=4
o=bpy.data.objects.new('B09 soft ceiling bounce',d);bpy.data.collections['B13 Sunset atmosphere and light'].objects.link(o);o.location=(-1,-.3,1.2);o.rotation_euler=(world((.3,-1.9,4.0))-o.location).to_track_quat('-Z','Y').to_euler()

# Closure and preserved contact geometry, independent of any camera projection.
lower_after=sorted(tuple(round(v.co[i],5) for i in range(3)) for v in core.data.vertices if v.co.z<3.1)
removed=set(lower_before)-set(lower_after);added=set(lower_after)-set(lower_before)
departure=max((original_surface.find_nearest(Vector(p))[3] for p in added),default=0)
print('LOWER_TREE_CHECK',len(lower_before),len(lower_after),'removed',len(removed),'added_on_existing_surface',len(added),'max_departure_m',departure,flush=True)
assert not removed and departure<.00002,'Lower tree surface changed'
for name,(signature,pose) in preserved.items():
 ob=bpy.data.objects[name];assert shape_hash(ob)==signature and ob.matrix_world==pose,name
bm=bmesh.new();bm.from_mesh(core.data);boundary=sum(e.is_boundary for e in bm.edges);seen=set();components=0
for v in bm.verts:
 if v in seen:continue
 components+=1;stack=[v];seen.add(v)
 while stack:
  q=stack.pop()
  for e in q.link_edges:
   n=e.other_vert(q)
   if n not in seen:seen.add(n);stack.append(n)
bm.free();assert boundary==0 and components==1,(boundary,components)
assert scene.camera.matrix_world==camera_pose and scene.camera.data.lens==camera_lens
report={'revision':'B09','roof_frame_origin':list(origin),'roof_yaw_degrees':6,'roof_front_v':vfront,'roof_rear_v':vrear,'roof_projection_m':vrear-vfront,'front_width_m':right(vfront)-left(vfront),'rear_width_m':right(vrear)-left(vrear),'pitch_degrees':math.degrees(theta),'independent_boards':len(boards),'seated_rafters':len(rafters),'camera_unchanged':True,'lower_tree_original_vertices_retained':True,'lower_tree_added_vertices_on_existing_surface':len(added),'lower_tree_max_surface_departure_m':departure,'preserved_deck_furniture_alcove_objects':len(preserved),'tree_components':components,'tree_boundary_edges':boundary,'bulbs_hidden_inside_roof':hidden_bulbs,'scope':'Architectural scene model, not a certified building design'}
(ROOT/'roof-validation-b09.json').write_text(json.dumps(report,indent=2)+'\n')
scene['revision']='B09 exposed timber roof';scene['status']='Expanded roof and tree clearance; camera, lower room and sunset look preserved';scene.frame_set(1);scene.cycles.samples=48;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'B09-roof-scene.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b09.blend'));bpy.ops.render.render(write_still=True)
print('B09_COMPLETE',json.dumps(report),flush=True)

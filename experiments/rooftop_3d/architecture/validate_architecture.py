"""Verify the saved architectural model's actual geometry and export drawing footprints."""
import bpy,bmesh,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent;D=json.loads((ROOT/'design.json').read_text());A=D['alcove'];R=D['roof'];F=D['deck']
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'treehouse-architecture.blend'));scene=bpy.context.scene
rot=Matrix.Rotation(math.radians(A['yaw_degrees']),3,'Z');origin=Vector(A['origin']);checks={}
def points(o):return [o.matrix_world@v.co for v in o.data.vertices]
def bounds(o):
 ps=points(o);return [min(p[i] for p in ps) for i in range(3)],[max(p[i] for p in ps) for i in range(3)]
def near(a,b,tol=1e-5):return abs(a-b)<tol
boards=[o for o in scene.objects if o.name.startswith('D') and o.get('role')=='modeled piece']
boards=[o for o in boards if 'Deck board' in o.name]
assert boards
for ob in boards:
 lo,hi=bounds(ob);assert near(hi[2],0) and near(lo[2],-F['board_thickness']);assert hi[0]-lo[0]<=F['board_width']+1e-5
checks['deck_boards_axis_Y']=len(boards)
joists=[o for o in scene.objects if o.name.startswith('J') and ('Floor joist' in o.name or 'trimmer' in o.name)]
for ob in joists:
 lo,hi=bounds(ob);assert near(hi[1]-lo[1],F['joist_width']);assert near(hi[2],-F['board_thickness']);assert hi[0]-lo[0]>F['joist_width']
checks['joists_axis_X_and_contact_board_underside']=len(joists)
girders=[o for o in scene.objects if 'Primary girder' in o.name]
for ob in girders:
 lo,hi=bounds(ob);assert near(hi[0]-lo[0],F['girder_width']);assert near(hi[2],-F['board_thickness']-F['joist_depth'])
checks['primary_girders_axis_Y_and_contact_joists']=len(girders)
for name,axis in [('L0 Top rail',Vector((1,0,0))),('L1 Top rail',Vector((0,1,0)))]:
 ob=bpy.data.objects[name];actual=(ob.matrix_world.to_3x3()@Vector((0,0,1))).normalized();assert abs(actual.dot(axis))>1-1e-6
checks['rear_rail_perpendicular_to_boards']=True;checks['side_rail_parallel_to_boards']=True
# The one rear header is shared by the alcove and the canopy, directly over posts.
header=bpy.data.objects['B01 Rear canopy and alcove header'];header_local=[rot.inverted()@(p-origin) for p in points(header)]
header_bottom=min(p.z for p in header_local);header_v=(min(p.y for p in header_local)+max(p.y for p in header_local))/2
for name in ['P01 Alcove bearing post','P02 Alcove bearing post']:
 ob=bpy.data.objects[name];ps=[rot.inverted()@(p-origin) for p in points(ob)];assert near(max(p.z for p in ps),header_bottom);assert near((max(p.y for p in ps)+min(p.y for p in ps))/2,header_v)
checks['both_posts_bear_directly_under_shared_header']=True
# Inspect actual rafter-seat vertices over both beams, rather than accepting metadata.
rafters=[o for o in scene.objects if 'Seated canopy rafter' in o.name]
for ob in rafters:
 ps=[rot.inverted()@(p-origin) for p in points(ob)]
 for v in [R['front_beam_v'],R['rear_beam_v']]:
  z=R['rear_beam_bottom']+R['slope_dz_per_minus_v']*(R['rear_beam_v']-v)+R['beam_depth']
  for edge in [-1,1]:assert sum(near(p.y,v+edge*R['beam_width']/2) and near(p.z,z) for p in ps)>=2
checks['rafters_with_two_fitted_beam_seats']=len(rafters)
slope=R['slope_dz_per_minus_v'];upper=max((rot.inverted()@(p-origin)).z+slope*(rot.inverted()@(p-origin)).y for p in points(rafters[0]))
ceiling=[o for o in scene.objects if 'Canopy board' in o.name]
for ob in ceiling:
 ps=[rot.inverted()@(p-origin) for p in points(ob)];assert near(min(p.z+slope*p.y for p in ps),upper)
checks['ceiling_boards_contact_rafter_top_plane']=len(ceiling)
# The tree opening interrupts joists and has its own header plus doubled trimmers.
base=origin+rot@Vector(D['tree']['fork_path_uvz'][1]);half=F['tree_opening_frame_half_width']
for ob in [o for o in joists if 'Floor joist' in o.name]:
 lo,hi=bounds(ob)
 if lo[1]<base.y+half and hi[1]>base.y-half:assert lo[0]>=base.x+half+F['joist_width']-1e-5
assert len([o for o in joists if 'trimmer' in o.name])==4
checks['tree_opening_has_four_trimmers_and_inner_header']=bpy.data.objects.get('JH0 Tree-opening inner header') is not None
# Furniture/trunk clearance across the seating's height, using the evaluated branch mesh.
fork=bpy.data.objects['T02 Foreground fork'];dg=bpy.context.evaluated_depsgraph_get();evaluated=fork.evaluated_get(dg);me=evaluated.to_mesh()
near_seat=[fork.matrix_world@v.co for v in me.vertices if -.05<(fork.matrix_world@v.co).z<1.25]
seat=D['seat'];seat_left=seat['center'][0]-seat['width']/2
branch_right=max(v.x for v in near_seat if seat['center'][1]-seat['length']/2<v.y<seat['center'][1]+seat['length']/2)
clearance=seat_left-branch_right;evaluated.to_mesh_clear();assert clearance>.03,clearance
checks['measured_tree_to_seating_clearance_m']=round(clearance,4)
# A hollow tree mass should remain a closed shell after the designed openings.
bm=bmesh.new();bm.from_mesh(bpy.data.objects['T01 Hollow living trunk'].data);boundary=sum(e.is_boundary for e in bm.edges);bm.free();assert boundary==0
checks['tree_shell_open_boundary_edges']=boundary
# Camera changes must leave evaluated world-space geometry unchanged.
def signature():
 h=hashlib.sha256();dg=bpy.context.evaluated_depsgraph_get()
 for ob in sorted(scene.objects,key=lambda o:o.name):
  if ob.type not in {'MESH','CURVE'}:continue
  evalob=ob.evaluated_get(dg);mesh=evalob.to_mesh();h.update(ob.name.encode())
  for vertex in mesh.vertices:
   p=ob.matrix_world@vertex.co;h.update(struct.pack('<3f',*(round(v,5) for v in p)))
  evalob.to_mesh_clear()
 return h.hexdigest()
one=signature();scene.camera=bpy.data.objects['CAM A02 Observer'];scene.camera.location+=Vector((.73,-.21,.18));bpy.context.view_layer.update();two=signature();assert one==two
checks['geometry_unchanged_after_camera_change']=True;checks['geometry_sha256']=one
# Actual model footprints drive the dedicated framing diagram.
footprints=[]
for ob in scene.objects:
 if ob.type=='MESH' and (ob.name.startswith('J') or 'Primary girder' in ob.name):
  lo,hi=bounds(ob);footprints.append({'id':ob.name,'min':lo,'max':hi})
(ROOT/'framing-footprints.json').write_text(json.dumps(footprints,indent=2)+'\n')
report={'revision':'A01','all_checks_passed':True,'checks':checks,'scope':'Geometric architecture checks for a game model; material finish, tree joinery and real-world engineering are not established.'}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print('ARCHITECTURAL_CHECKS_PASSED',json.dumps(checks))

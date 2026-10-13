"""B09 saved-scene joint checks and two useful roof inspection renders."""
import bpy,bmesh,json,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b09.blend'))
scene=bpy.context.scene;tree=bpy.data.objects['B04 continuous enclosing tree'];report=json.loads((ROOT/'roof-validation-b09.json').read_text())
O=Vector((-2.5,3,0));R=Matrix.Rotation(math.radians(6),3,'Z')
def loc(p):return R.inverted()@(p-O)
def points(o):return [loc(o.matrix_world@v.co) for v in o.data.vertices]
def top(v):return 3.49+.26*(-.36-v)-.045+.18/math.cos(math.atan(.26))
boards=[o for o in scene.objects if o.name.startswith('B09 underside cedar board')]
for o in boards:
 residual=[p.z-top(p.y) for p in points(o)]
 assert abs(min(residual))<.00002 and abs(max(residual)-.055/math.cos(math.atan(.26)))<.00002
rafters=[o for o in scene.objects if o.name.startswith('B09 seated rafter')]
seats=0
for o in rafters:
 ps=points(o)
 for v in o['bearing_seats']:
  expected=3.49+.26*(-.36-v)
  for side in [-.12,.12]:assert any(abs(p.y-(v+side))<.00002 and abs(p.z-expected)<.00002 for p in ps)
  seats+=1
bvh=BVHTree.FromPolygons([v.co for v in tree.data.vertices],[list(f.vertices) for f in tree.data.polygons]);mask=tree.data.attributes['Bark relief allowed'];contacts=[]
for o in [o for o in scene.objects if o.name.startswith('B back cushion')]:
 hit,normal,index,distance=bvh.ray_cast(Vector((o.location.x+.35,o.location.y,o.location.z)),Vector((-1,0,0)),2);assert hit is not None
 back=min((o.matrix_world@Vector(c)).x for c in o.bound_box);gap=back-hit.x;maximum=max(mask.data[i].value for i in tree.data.polygons[index].vertices)
 assert abs(gap+.012)<.00002 and maximum<.00001
 contacts.append({'cushion':o.name,'contact_m':gap,'displacement_mask':maximum})
report.update(saved_scene_reopened=True,boards_on_rafter_plane=len(boards),actual_rafter_seats_verified=seats,couch_contacts=contacts)
(ROOT/'roof-validation-b09.json').write_text(json.dumps(report,indent=2)+'\n')

observer=scene.camera;data=bpy.data.cameras.new('B09 ceiling inspection');camera=bpy.data.objects.new('B09 ceiling inspection',data);bpy.data.collections['B10 Cameras and lights'].objects.link(camera)
camera.location=observer.location;camera.rotation_euler=(Vector((-1.2,.4,3.8))-camera.location).to_track_quat('-Z','Y').to_euler();data.lens=45;data.sensor_width=36;data.clip_end=500
scene.camera=observer;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b09.blend'))
scene.camera=camera;scene.cycles.samples=32;scene.render.resolution_x=1000;scene.render.resolution_y=752;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'B09-ceiling-detail.png');bpy.ops.render.render(write_still=True)
scene.camera=observer
for name in ['B07 Separate blossoms','B12 Foreground foliage layer']:bpy.data.collections[name].hide_render=True
scene.cycles.samples=16;scene.render.resolution_x=1280;scene.render.resolution_y=964;scene.render.resolution_percentage=60;scene.render.filepath=str(ROOT/'B09-without-foliage.png');bpy.ops.render.render(write_still=True)
print('B09_ROOF_VERIFIED',json.dumps(report),flush=True)

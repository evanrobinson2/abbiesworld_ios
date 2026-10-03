"""Current scene: finish the right bark return and verify the saved modular scene."""
import bpy,json,numpy as np,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b05.blend'));scene=bpy.context.scene;core=bpy.data.objects['B04 continuous enclosing tree']
a=np.empty(len(core.data.vertices)*3,dtype=np.float32);core.data.vertices.foreach_get('co',a);co=a.reshape(-1,3);x,y,z=co.copy().T
co[:,0]+=1.10*np.clip((x+2.7)/1.4,0,1)*np.clip((y-2.8)/.45,0,1)*np.interp(z,[-12,-1,0,2.8,3.8,5.4,8.2],[0,0,1,1,.8,0,0]);core.data.vertices.foreach_set('co',co.ravel());core.data.update()
scene['revision']='B06';scene['status']='Current assembled Blender scene; organic surface and landscape polish remain in progress';scene.frame_set(1)
# Reopenable scene, real animated transforms, and camera-independent evaluated tree geometry.
def tree_signature():
 ev=core.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();v=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',v);out=hashlib.sha256(v.tobytes()).hexdigest();ev.to_mesh_clear();return out
h1=tree_signature();cam=scene.camera;pose=cam.matrix_world.copy();cam.location+=Vector((.28,.10,0));bpy.context.view_layer.update();h2=tree_signature();assert h1==h2;cam.matrix_world=pose;bpy.context.view_layer.update()
lamp=bpy.data.objects['B lantern 0 suspension'];a0=lamp.matrix_world.copy();p0=bpy.data.objects['B drifting petal 0'].location.copy();scene.frame_set(61);assert lamp.matrix_world!=a0;assert (bpy.data.objects['B drifting petal 0'].location-p0).length>.1;scene.frame_set(1)
report=json.loads((ROOT/'tree-enclosure-validation-b05.json').read_text());report.update(revision='B06',tree_geometry_independent_of_camera=True,tree_geometry_sha256=h1,lantern_and_petal_motion_verified=True,foreground_foliage_collection='B12 Foreground foliage layer',canopy_blossom_collection='B07 Separate blossoms',right_bark_return='The continuous trunk widens behind the right jamb; facade and camera are unchanged.',scene_objects=len(scene.objects))
(ROOT/'current-validation.json').write_text(json.dumps(report,indent=2)+'\n')
D=json.loads((ROOT/'design-b05.json').read_text());D['revision']='B06';D['tree']['right_return']='Additional continuous volume behind right jamb, widening by up to 1.10 m at mid-height';(ROOT/'current-design.json').write_text(json.dumps(D,indent=2)+'\n')
scene.cycles.samples=48;scene.render.filepath=str(ROOT/'current-scene.png');bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-current.blend'));bpy.ops.render.render(write_still=True)
# Same camera, no foreground foliage or blossoms: a direct composability check.
for name in ['B07 Separate blossoms','B12 Foreground foliage layer']:bpy.data.collections[name].hide_render=True
scene.cycles.samples=20;scene.render.filepath=str(ROOT/'current-without-foliage.png');bpy.ops.render.render(write_still=True)
print('CURRENT_SCENE_SAVED_AND_VERIFIED',json.dumps(report))

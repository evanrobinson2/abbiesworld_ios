"""Apply the contact-face guard to existing studies and refresh the final view."""
import bpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent
for name in ['rooftop-bark-study.blend','rooftop-sunset-vfx.blend']:
 bpy.ops.wm.open_mainfile(filepath=str(HERE/name));scene=bpy.context.scene;tree=bpy.data.objects['B04 continuous enclosing tree']
 bvh=BVHTree.FromPolygons([v.co for v in tree.data.vertices],[list(f.vertices) for f in tree.data.polygons]);protected=set()
 for cushion in [o for o in scene.objects if o.name.startswith('B back cushion')]:
  for dy in [-.43,0,.43]:
   for dz in [-.36,0,.36]:
    hit,normal,face,distance=bvh.ray_cast(Vector((cushion.location.x+.35,cushion.location.y+dy,cushion.location.z+dz)),Vector((-1,0,0)),2)
    if hit is not None:protected.update(tree.data.polygons[face].vertices)
 for i in protected:tree.data.attributes['Bark relief allowed'].data[i].value=0
 tree.data.update();bpy.ops.wm.save_as_mainfile(filepath=str(HERE/name))
 print('CONTACT_FACES_PROTECTED',name,len(protected),flush=True)
scene.render.filepath=str(HERE/'B08-sunset-vfx.png');bpy.ops.render.render(write_still=True)
for name in ['B07 Separate blossoms','B12 Foreground foliage layer']:bpy.data.collections[name].hide_render=True
scene.cycles.samples=16;scene.render.resolution_percentage=60;scene.render.filepath=str(HERE/'B08-without-foliage.png');bpy.ops.render.render(write_still=True)

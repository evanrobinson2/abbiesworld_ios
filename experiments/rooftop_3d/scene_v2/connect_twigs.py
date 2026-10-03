"""Anchor foliage twigs to the real supporting branch surface, then save the current scene."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-current.blend'));scene=bpy.context.scene
parent=bpy.data.objects['B Right hanging canopy'];bvh=BVHTree.FromObject(parent,bpy.context.evaluated_depsgraph_get());count=0
for ob in scene.objects:
 if ob.type=='CURVE' and ob.name.startswith('B02 flower-bearing twig'):
  p=ob.data.splines[0].bezier_points[0];guess=parent.matrix_world.inverted()@(ob.matrix_world@p.co);loc,normal,index,distance=bvh.find_nearest(guess)
  assert loc is not None;p.co=ob.matrix_world.inverted()@(parent.matrix_world@(loc-normal*.025));count+=1
report=json.loads((ROOT/'current-validation.json').read_text());report['foliage_twigs_anchored_to_parent_branch']=count;(ROOT/'current-validation.json').write_text(json.dumps(report,indent=2)+'\n')
scene.render.filepath=str(ROOT/'current-scene.png');scene.cycles.samples=32;bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-current.blend'));bpy.ops.render.render(write_still=True)
for name in ['B07 Separate blossoms','B12 Foreground foliage layer']:bpy.data.collections[name].hide_render=True
scene.cycles.samples=8;scene.render.resolution_percentage=60;scene.render.filepath=str(ROOT/'current-without-foliage.png');bpy.ops.render.render(write_still=True)
print('TWIG_CONNECTIONS_VERIFIED',count)

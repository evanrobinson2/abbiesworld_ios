import bpy,json
from pathlib import Path
root=Path('/Users/evanrobinson/abbies.world.ios')
bpy.ops.wm.open_mainfile(filepath=str(root/'experiments/rooftop_3d/scene_v2/rooftop-current.blend'))
cam=bpy.data.objects['B beside-tree observer']
obs=[o for o in bpy.data.objects if o.name.startswith('B08 bark fairy bulb') and not o.hide_render]
obs.sort(key=lambda o:(o.matrix_world.translation-cam.location).length)
points=[]
for o in obs[:12]:
 p=o.matrix_world.translation
 points.append([p.x,p.z,-p.y])
(root/'abbies.world.ios/abbies.world.ios/Resources/Rooftop3D/rooftop-glows.json').write_text(json.dumps(points))

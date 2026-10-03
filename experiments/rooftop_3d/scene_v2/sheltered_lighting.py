"""B10: let the roof shade the room; preserve an on/off lighting comparison."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b09.blend'));scene=bpy.context.scene
energies={'B08 amber grazing bounce':0,'B09 soft ceiling bounce':0,'B soft rosy foreground':70,'B cool sheltered bark fill':170,'B open sky bounce':1800}
before={}
for name,energy in energies.items():
 lamp=bpy.data.objects[name];before[name]=lamp.data.energy;lamp.data.energy=energy
scene['revision']='B10 roof shelter and backlight'
scene['status']='Timber ceiling casts real shelter; interior fill reduced, exterior sunset and emissive lights retained'
scene.camera=bpy.data.objects['B beside-tree observer'];scene.frame_set(1)
scene.cycles.samples=48;scene.render.resolution_x=1280;scene.render.resolution_y=964;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'B10-sheltered-scene.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b10.blend'))
bpy.ops.render.render(write_still=True)

# Roof on/off diagnostic uses identical camera, lights, exposure and bloom.
scene.cycles.samples=16;scene.render.resolution_percentage=60
scene.render.filepath=str(ROOT/'B10-roof-on.png');bpy.ops.render.render(write_still=True)
bpy.data.collections['B14 Broad timber roof'].hide_render=True
scene.render.filepath=str(ROOT/'B10-roof-off.png');bpy.ops.render.render(write_still=True)
bpy.data.collections['B14 Broad timber roof'].hide_render=False

scene.camera=bpy.data.objects['B09 ceiling inspection'];scene.cycles.samples=32;scene.render.resolution_x=1000;scene.render.resolution_y=752;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'B10-ceiling-detail.png');bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['B beside-tree observer'];scene.render.resolution_x=1280;scene.render.resolution_y=964;scene.render.resolution_percentage=60;scene.cycles.samples=16
for name in ['B07 Separate blossoms','B12 Foreground foliage layer']:bpy.data.collections[name].hide_render=True
scene.render.filepath=str(ROOT/'B10-without-foliage.png');bpy.ops.render.render(write_still=True)

report={'revision':'B10','geometry_revision':'B09','interior_fill_before_watts':before,'interior_fill_after_watts':energies,'sun_position_and_direction_unchanged':True,'camera_unchanged':True,'exposure_and_bloom_unchanged':True,'comparison':'B10-roof-on.png versus B10-roof-off.png changes only visibility of the B14 timber roof collection','mobile_integration':False}
(ROOT/'sheltered-lighting-b10.json').write_text(json.dumps(report,indent=2)+'\n')
print('B10_SHELTERED_LIGHTING_COMPLETE',json.dumps(report),flush=True)

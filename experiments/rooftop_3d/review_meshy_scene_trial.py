"""Inspect the returned whole-scene candidate without altering its source GLB."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent / 'meshy_scene_trial'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'rooftop-meshy.glb'))
scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == 'MESH']
bpy.context.view_layer.update()
points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
low = Vector([min(v[i] for v in points) for i in range(3)])
high = Vector([max(v[i] for v in points) for i in range(3)])
center = (low + high) * .5
span = max(high - low)
report = {'mesh_objects': len(meshes), 'bounds_blender_z_up': {'min': list(low), 'max': list(high)},
          'dimensions': list(high - low), 'triangles': sum(len(o.data.polygons) for o in meshes),
          'materials': [], 'source_unmodified': True}
for mat in bpy.data.materials:
    report['materials'].append(mat.name)
for im in bpy.data.images:
    if im.source != 'VIEWER':
        im.pack()

world = bpy.data.worlds.new('Neutral studio')
scene.world = world
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs['Color'].default_value = (.12, .12, .12, 1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value = .5
for name, offset, power in [('Key', (1,-2,3), 500), ('Fill', (-2,1,1), 250)]:
    data = bpy.data.lights.new(name, 'AREA'); data.energy = power; data.shape = 'DISK'; data.size = span * 2
    obj = bpy.data.objects.new(name, data); scene.collection.objects.link(obj)
    obj.location = center + Vector(offset) * span
    obj.rotation_euler = (center-obj.location).to_track_quat('-Z', 'Y').to_euler()
camera_data = bpy.data.cameras.new('Inspection camera')
camera = bpy.data.objects.new('Inspection camera', camera_data)
scene.collection.objects.link(camera); scene.camera = camera
camera_data.type = 'ORTHO'; camera_data.ortho_scale = span * 1.22
camera.location = center + Vector((.55,-1.4,1.6))*span
camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine = 'CYCLES'; scene.cycles.samples = 16; scene.cycles.use_denoising = True
scene.render.resolution_x = 1000; scene.render.resolution_y = 800; scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = str(ROOT / 'blender-inspection.png')
(ROOT / 'blender-inspection.json').write_text(json.dumps(report, indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-meshy-inspection.blend'))
bpy.ops.render.render(write_still=True)
print('MESHY_SCENE_INSPECTION', json.dumps(report))

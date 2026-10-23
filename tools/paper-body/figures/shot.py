"""Same-camera product shot of a figure GLB, framed like its Midjourney concept (full body, front, grey studio sweep).
python shot.py FIGURE.glb OUT.png [--w 896 --h 1344 --yaw 0]
Every round of a figure is shot with this one camera, so before and after pictures line up with the concept."""
import sys, math, argparse
import bpy, mathutils
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument('glb'); ap.add_argument('out')
ap.add_argument('--w', type=int, default=896); ap.add_argument('--h', type=int, default=1344)
ap.add_argument('--yaw', type=float, default=0.0); ap.add_argument('--samples', type=int, default=64)
a = ap.parse_args()

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=a.glb)
sc = bpy.context.scene
pts = np.array([tuple(o.matrix_world @ v.co) for o in sc.objects if o.type == 'MESH' for v in o.data.vertices])
lo, hi = pts.min(0), pts.max(0); H = hi[2] - lo[2]; cz = (lo[2] + hi[2]) / 2

# studio sweep: a curved grey backdrop like the concept photo
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, lo[2]))
floor = bpy.context.object
bg = bpy.data.materials.new('Sweep'); bg.use_nodes = True
bsdf = bg.node_tree.nodes['Principled BSDF']; bsdf.inputs['Base Color'].default_value = (0.62, 0.65, 0.63, 1); bsdf.inputs['Roughness'].default_value = 1
floor.data.materials.append(bg)
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 6, lo[2] + 20), rotation=(math.radians(90), 0, 0))
bpy.context.object.data.materials.append(bg)

# camera: front, a little below chest height, long lens so proportions read like the photo
y = math.radians(a.yaw)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 85; cam.data.sensor_width = 36; cam.data.sensor_fit = 'VERTICAL'; cam.data.sensor_height = 36
dist = H * 1.08 * 85 / 36
cam.location = (math.sin(y) * dist, -math.cos(y) * dist, cz)
cam.rotation_euler = mathutils.Vector((-cam.location[0], -cam.location[1], 0)).to_track_quat('-Z', 'Y').to_euler()

# light: big soft key from the upper left front, weaker fill from the right, a rim from behind, as in a product photo
def area(name, loc, energy, size):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA')); l.data.energy = energy; l.data.size = size
    l.location = loc; sc.collection.objects.link(l)
    l.rotation_euler = (mathutils.Vector((0, 0, cz)) - mathutils.Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
area('key', (-3.4, -3.6, cz + 2.8), 560, 1.6)
area('fill', (3.5, -3.5, cz + 0.4), 45, 4.0)
area('rim', (1.5, 4.0, cz + 2.5), 160, 2.0)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.12

sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = a.samples; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = a.w, a.h; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Base Contrast'
sc.render.filepath = a.out; bpy.ops.render.render(write_still=True)

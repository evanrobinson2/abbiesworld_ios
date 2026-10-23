"""All eight body types side by side, front and three-quarter, Cycles render (top row male, bottom row female)."""
import math, bpy
import body, kit


def render(path, px=2000, samples=32):
    kit.reset()
    for i, (s, b) in enumerate(body.TYPES):
        body.build(s, b, offset=((i - 3.5) * 0.82 + (0.25 if s == 'female' else -0.25), 0, 0))
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.device = 'CPU'
    sc.render.resolution_x = px; sc.render.resolution_y = int(px * 0.42); sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.83, 0.85, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 7.6
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    co.location = (math.sin(math.radians(-20)) * 10, -math.cos(math.radians(-20)) * 10, 0.9)
    co.rotation_euler = (math.radians(90), 0, math.radians(-20))
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), math.radians(-25), math.radians(-35))
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

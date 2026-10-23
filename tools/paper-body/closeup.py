"""One dressed body type, close up, front and three-quarter: python closeup.py male average out/x.png"""
import sys, math, bpy
import dress, kit


def render(sex, build_, path, px=1200, samples=24):
    kit.reset()
    info = dress.build(sex, build_, offset=(0, 0, 0))
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = samples
    sc.render.resolution_x = px; sc.render.resolution_y = px; sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.82, 0.83, 0.85, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), math.radians(-25), math.radians(-35))
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = info['height_m'] * 1.08
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    H = info['height_m']; out = []
    for yaw in (0, -35, -90):
        a = math.radians(yaw); co.location = (math.sin(a) * 8, -math.cos(a) * 8, H / 2); co.rotation_euler = (math.radians(90), 0, a)
        p = path.replace('.png', f'_{-yaw}.png'); sc.render.filepath = p; bpy.ops.render.render(write_still=True); out.append(p)
    from PIL import Image
    ims = [Image.open(p) for p in out]; c = Image.new('RGB', (px * len(ims), px))
    for i, im in enumerate(ims):
        c.paste(im.convert('RGB'), (i * px, 0))
    c.save(path)


if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], sys.argv[3])

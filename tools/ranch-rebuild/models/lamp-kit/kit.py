"""Contact sheet: the concept sheet on top, the four built pieces below at one common scale (front camera, a little
yaw so the lanterns read as boxes).  usage: python kit.py SHEET.png [px] [samples]   -> r/kit.png"""
import os, sys, math
import bpy, mathutils
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
LAYOUT = [('crook-lantern', (0.0, 0, 0)), ('post-lantern', (1.25, 0, 0)), ('porch-lamp', (2.35, 0, 1.45)),
          ('string-lights', (4.45, 0, 0))]
BG = (0.93, 0.90, 0.84)


def main(sheet, px=1600, samples=32):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for name, off in LAYOUT:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, name + '.glb'))
        for o in set(bpy.data.objects) - before:
            if o.parent is None:
                o.location = mathutils.Vector(o.location) + mathutils.Vector(off)
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = False
    sc.render.resolution_x = px; sc.render.resolution_y = int(px * 1632 / 2912); sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*BG, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 6.2
    yaw, elev = math.radians(12), math.radians(6)
    d = mathutils.Vector((math.sin(yaw) * math.cos(elev), -math.cos(yaw) * math.cos(elev), math.sin(elev)))
    c = mathutils.Vector((2.75, 0, 1.2)); cam.location = c + d * 12
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    out = os.path.join(HERE, 'r', '_kit_render.png'); sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    a = Image.open(sheet).convert('RGB'); a = a.resize((px, int(px * a.height / a.width)))
    b = Image.open(out).convert('RGB')
    k = Image.new('RGB', (px, a.height + b.height + 8), 'white'); k.paste(a, (0, 0)); k.paste(b, (0, a.height + 8))
    k.save(os.path.join(HERE, 'r', 'kit.png')); os.remove(out)
    print('wrote r/kit.png')


if __name__ == '__main__':
    main(sys.argv[1], *(int(x) for x in sys.argv[2:]))

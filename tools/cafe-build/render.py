"""Cycles CPU preview renders for café assets: a 3/4 hero view, the same framing every time."""
import bpy, math
from mathutils import Vector
import kit

def setup(px=640, samples=32, bg='#2a0c20'):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    try:
        sc.cycles.use_denoising = True
    except Exception:
        pass
    sc.render.resolution_x = sc.render.resolution_y = px
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bgn = w.node_tree.nodes['Background']; bgn.inputs['Color'].default_value = kit.srgb('#d8d4dc'); bgn.inputs['Strength'].default_value = 0.6
    return sc

def light(name, kind, loc, energy, size=1.0, col=(1, 1, 1)):
    l = bpy.data.lights.new(name, kind); l.energy = energy; l.color = col
    if kind == 'AREA':
        l.size = size
    o = bpy.data.objects.new(name, l); bpy.context.scene.collection.objects.link(o); o.location = loc
    d = -Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o

def hero(root, path, az=-35, el=24, px=640, samples=32, floor=True, lens=50, pad=1.18):
    sc = setup(px, samples)
    lo, hi = kit.bounds(root)
    c = (lo + hi) / 2; size = (hi - lo).length
    if floor:
        f = kit.box('floor_render', (size * 6, size * 6, 0.001), 'Plaster_Cream', loc=(c.x, c.y, lo.z - 0.0005))
    cam = bpy.data.cameras.new('cam'); cam.lens = lens
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    a, e = math.radians(az), math.radians(el)
    dirv = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    fov = 2 * math.atan(36 / (2 * lens))
    dist = (size / 2) * pad / math.tan(fov / 2)
    co.location = c + dirv * dist
    co.rotation_euler = (-dirv).to_track_quat('-Z', 'Y').to_euler()
    cam.clip_end = dist * 10
    s = max(size, 0.5)
    light('key', 'AREA', c + Vector((-1.2, -1.6, 2.0)) * s, 220 * s * s, size=s)
    light('fill', 'AREA', c + Vector((1.6, -0.8, 0.8)) * s, 70 * s * s, size=s * 1.5, col=(1, 0.85, 0.95))
    light('rim', 'AREA', c + Vector((0.6, 1.8, 1.6)) * s, 120 * s * s, size=s)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

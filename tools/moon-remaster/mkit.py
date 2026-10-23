"""Shared Blender helpers for the Moon remaster models (AW-STUDY-0007, MB1-MB11). Each <asset>/build.py imports this
and stays a standalone recipe: `python build.py` rebuilds the GLB from nothing.

Conventions (same as the model challenge and the Roman kit): Z up, metres, origin at the footprint centre on the
ground, front faces -Y (glTF export turns that into +Z, the game's heading). Materials are named by what they are,
because the game reads material names as shading roles (HeadlightGlass and MeteorCrystal glow at night or pulse).
Palette from the Moon Mission pack; cyan #00ffd1 only on the meteorite and the Star Child.
"""
import math
import bpy
import bmesh
from mathutils import Vector, noise

TAU = math.tau
_specs = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mat(name, color, rough=0.8, metal=0.0, emit=None, strength=0.0, alpha=1.0):
    _specs[name] = (hexrgb(color) if isinstance(color, str) else color, rough, metal, emit, strength, alpha)
    return name


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    rgb, rough, metal, emit, strength, alpha = _specs[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[(c / 255) ** 2.2 for c in rgb], 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        e = hexrgb(emit)
        b.inputs['Emission Color'].default_value = (*[(c / 255) ** 2.2 for c in e], 1)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    return m


def assign(o, name):
    o.data.materials.clear()
    o.data.materials.append(material(name))
    return o


def active(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def apply_mods(o):
    active(o)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def shade(o, smooth=True):
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o


def box(name, size, loc, mtl, bevel=0.0, segs=2, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = segs
        m.limit_method = 'ANGLE'
        apply_mods(o)
    return assign(shade(o, False), mtl)


def cyl(name, r, depth, loc, mtl, rot=(0, 0, 0), n=24, bevel=0.0, smooth=True, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if bevel:
        m = o.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = 3
        m.limit_method = 'ANGLE'
        apply_mods(o)
    shade(o, smooth)
    return assign(o, mtl)


def tube(name, pts, r, mtl, n=10):
    """A smooth tube along a polyline of points."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = 2
    sp = curve.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(o)
    active(o)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    shade(o, True)
    return assign(o, mtl)


def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    return o


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()


def empty(name, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.location = loc
    bpy.context.scene.collection.objects.link(o)
    return o


def triangles():
    n = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            n += len(me.loop_triangles)
    return n


def bounds():
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True)


def render(path, yaw=35, pitch=22, dist=None, target=None, size=768, lens=60, world=(0.83, 0.82, 0.78), sun=3.0):
    """A quick EEVEE hero render for the review desk and scoring."""
    lo, hi = bounds()
    c = (lo + hi) / 2 if target is None else Vector(target)
    radius = (hi - lo).length / 2
    d = dist or radius * 3.2
    a, b = math.radians(yaw), math.radians(pitch)
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = lens
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = c + Vector((math.sin(a) * math.cos(b) * d, -math.cos(a) * math.cos(b) * d, math.sin(b) * d))
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    sd = bpy.data.lights.new('sun', 'SUN')
    sd.energy = sun
    s = bpy.data.objects.new('sun', sd)
    s.rotation_euler = (math.radians(50), math.radians(10), math.radians(-30))
    bpy.context.scene.collection.objects.link(s)
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (*world, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    bpy.context.scene.world = w
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.filepath = path
    sc.render.film_transparent = False
    bpy.ops.render.render(write_still=True)
    for o in (cam, s):
        bpy.data.objects.remove(o)


def arc_plate(name, center, r, a0, a1, width, thick, mtl, n=14):
    """A curved fender: a thick strip bent around the X axis (angles in degrees, 0 = straight up, + toward +Y)."""
    import bmesh as _b
    me = bpy.data.meshes.new(name)
    bm = _b.new()
    cx, cy, cz = center
    rows = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        ring = []
        for rr in (r, r + thick):
            for x in (-width / 2, width / 2):
                ring.append(bm.verts.new((cx + x, cy + math.sin(a) * rr, cz + math.cos(a) * rr)))
        rows.append(ring)
    for i in range(n):
        a, b = rows[i], rows[i + 1]
        bm.faces.new((a[0], a[1], b[1], b[0]))  # inner
        bm.faces.new((a[2], b[2], b[3], a[3]))  # outer
        bm.faces.new((a[0], b[0], b[2], a[2]))  # side -x
        bm.faces.new((a[1], a[3], b[3], b[1]))  # side +x
    bm.faces.new((rows[0][0], rows[0][2], rows[0][3], rows[0][1]))
    bm.faces.new((rows[-1][0], rows[-1][1], rows[-1][3], rows[-1][2]))
    _b.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width = min(thick * 0.4, 0.02)
    m.segments = 2
    apply_mods(o)
    shade(o, False)
    return assign(o, mtl)

"""Shared Blender helpers for the Roman kit parts. Every parts/<part>/build.py imports this and stays a standalone
recipe: `python build.py` rebuilds the GLB from nothing.

Conventions (same as the model challenge): Z up, metres, origin at the centre of the footprint on the ground,
front faces -Y. Flat shading, faceted low-poly, Principled BSDF flat colours, no image textures. Materials are named
by what they are (Ivory, Bronze, Leather) because the game reads material names as shading roles.
"""
import math
import random
import bpy
import numpy as np

TAU = math.tau


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


_mats = {}


def mat(name, rgb, rough=0.8, metal=0.0):
    """Registers a material spec and returns its name; the Blender material is made on first use (after reset)."""
    _mats[name] = (rgb, rough, metal)
    return name


def _material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    rgb, rough, metal = _mats[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[(c / 255) ** 2.2 for c in rgb], 1)
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    return m


def mesh(name, verts, faces, material=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(int(i) for i in f) for f in faces])
    me.validate(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if material is not None:
        o.data.materials.append(_material(material))
    for p in me.polygons:
        p.use_smooth = False
    return o


def loft(name, rings, material=None, closed=True, cap_start=False, cap_end=False):
    """Quads between consecutive rings (each an (n,3) array with the same n)."""
    rings = [np.asarray(r, float) for r in rings]
    n = len(rings[0]); verts = np.concatenate(rings); faces = []
    m = n if closed else n - 1
    for k in range(len(rings) - 1):
        for i in range(m):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    if cap_start:
        faces.append(tuple(reversed(range(n))))
    if cap_end:
        faces.append(tuple((len(rings) - 1) * n + i for i in range(n)))
    return mesh(name, verts, faces, material)


def ring(rx, ry, z, n, a0=0.0, a1=TAU, cx=0.0, cy=0.0, endpoint=None):
    if endpoint is None:
        endpoint = abs((a1 - a0) - TAU) > 1e-6
    a = np.linspace(a0, a1, n, endpoint=endpoint)
    return np.c_[cx + rx * np.cos(a), cy + ry * np.sin(a), np.full(n, z)]


def plate(name, outline, thickness, material=None):
    """A flat plate: a 2D outline (list of (x, y)) extruded along +Z by thickness, then placed by the caller."""
    p = np.asarray(outline, float); n = len(p)
    v = np.r_[np.c_[p, np.zeros(n)], np.c_[p, np.full(n, thickness)]]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return mesh(name, v, faces, material)


def tube(name, pts, r, n=6, material=None, caps=True):
    """Sweep a regular n-gon of radius r (scalar or per-point) along a polyline."""
    pts = np.asarray(pts, float); rs = np.broadcast_to(np.asarray(r, float), (len(pts),))
    rings = []; up = np.array([0, 0, 1.0])
    for i, p in enumerate(pts):
        t = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]; t /= np.linalg.norm(t)
        a = up if abs(t @ up) < 0.95 else np.array([1.0, 0, 0])
        u = np.cross(t, a); u /= np.linalg.norm(u); w = np.cross(t, u)
        ang = np.linspace(0, TAU, n, endpoint=False) + math.pi / n
        rings.append(p + rs[i] * (np.outer(np.cos(ang), u) + np.outer(np.sin(ang), w)))
    return loft(name, rings, material, True, caps, caps)


def box(name, size, loc=(0, 0, 0), material=None):
    sx, sy, sz = [s / 2 for s in size]
    v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    o = mesh(name, v, f, material); o.location = loc
    return o


def solidify(o, t, offset=0.0):
    m = o.modifiers.new('solid', 'SOLIDIFY'); m.thickness = t; m.offset = offset; m.use_even_offset = True
    return o


def bevel(o, w, segs=1):
    m = o.modifiers.new('bevel', 'BEVEL'); m.width = w; m.segments = segs; m.limit_method = 'ANGLE'
    return o


def place(o, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]; o.scale = scale
    return o


def jitter(o, amt, seed=1):
    """Small random vertex offsets for the hand-cut, faceted look of the concept art."""
    rnd = random.Random(seed)
    for v in o.data.vertices:
        v.co.x += rnd.uniform(-amt, amt); v.co.y += rnd.uniform(-amt, amt); v.co.z += rnd.uniform(-amt, amt)
    return o


def ground(objs=None):
    """Move everything so the lowest point sits on z = 0 and the footprint is centred on the origin."""
    bpy.context.view_layer.update()
    objs = objs or [o for o in bpy.context.scene.objects if o.type == 'MESH']
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in objs:
        e = o.evaluated_get(dg); m = e.to_mesh()
        pts += [tuple(o.matrix_world @ v.co) for v in m.vertices]; e.to_mesh_clear()
    p = np.array(pts); lo, hi = p.min(0), p.max(0)
    root = bpy.data.objects.new('root', None); bpy.context.scene.collection.objects.link(root)
    root.location = (-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2])
    for o in objs:
        if o.parent is None:
            o.parent = root
    return root


def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True)


def triangles():
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            e = o.evaluated_get(dg); m = e.to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); e.to_mesh_clear()
    return n


def facet(o, amt=0.0025, scale=0.03, levels=1, seed=0):
    """The hand-cut low-poly look: simple subdivision, then a small Voronoi displacement so every face breaks into
    flat facets. Triangulated, flat shaded; all applied on export."""
    if levels:
        s = o.modifiers.new('facet_sub', 'SUBSURF'); s.subdivision_type = 'SIMPLE'; s.levels = s.render_levels = levels
    t = bpy.data.textures.get(f'facet_{seed}') or bpy.data.textures.new(f'facet_{seed}', 'VORONOI')
    t.noise_scale = scale
    d = o.modifiers.new('facet_disp', 'DISPLACE'); d.texture = t; d.strength = amt; d.mid_level = 0.5
    d.texture_coords = 'GLOBAL'
    o.modifiers.new('tri', 'TRIANGULATE')
    return o

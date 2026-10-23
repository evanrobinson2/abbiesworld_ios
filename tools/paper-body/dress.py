"""Dress any body type in the Roman kit: python dress.py [--lineup]
Imports each part's GLB from tools/roman-kit and fits it to the body's measurements (out/<type>.json), so the same
six parts fit all eight body types. Writes out/roman-<sex>-<build>.glb and, with --lineup, out/roman-lineup.png."""
import os, sys, math, json
import numpy as np
import bpy
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import body, kit  # noqa: E402
KIT = os.path.join(HERE, '..', 'roman-kit', 'parts')


def load(part):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, part, f'{part}.glb'))
    new = [o for o in bpy.context.scene.objects if o not in before]
    for o in new:
        o.name = f'{part}:{o.name}'
    return new


import re


def named(objs, base):
    return [o for o in objs if re.search(':' + base + r'(\.\d+)?$', o.name)]


def bbox(objs):
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in objs:
        if o.type != 'MESH':
            continue
        e = o.evaluated_get(dg); m = e.to_mesh(); pts += [tuple(o.matrix_world @ v.co) for v in m.vertices]; e.to_mesh_clear()
    p = np.array(pts); return p.min(0), p.max(0)


def group(objs, name, ref=None):
    """Parent the top-level objects to a new empty at the reference objects' bbox bottom centre."""
    lo, hi = bbox(ref or objs); piv = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(piv)
    piv.location = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]); bpy.context.view_layer.update()
    for o in objs:
        if o.parent is None or o.parent not in objs:
            mw = o.matrix_world.copy(); o.parent = piv; o.matrix_world = mw
    return piv, hi - lo


def fit(piv, size, centre, bottom, target):
    """Scale the group so `size` becomes `target` (None keeps the ratio of the mean of the others) and put its bbox
    bottom centre at (centre x, centre y, bottom)."""
    r = [t / s if t else None for t, s in zip(target, size)]
    k = np.mean([x for x in r if x]); piv.scale = [x or k for x in r]
    piv.location = (centre[0], centre[1], bottom)


def dress(info):
    t, H = info['torso'], info['height_m']; hd = info['head']; so = info['sockets']; m = info['multipliers']
    # helmet: the bowl sits on the head, crest and guards follow
    objs = load('helmet'); bowl = named(objs, 'bowl')
    piv, size = group(objs, 'helmet', bowl)
    fit(piv, size, (0, hd['center'][1]), 0, (hd['half_width'] * 2.3, hd['half_depth'] * 2.2, None))
    piv.rotation_euler = (0, 0, math.pi)  # the helmet recipe faces +Y; the body faces -Y
    bpy.context.view_layer.update(); lo, _ = bbox(bowl); piv.location.z += hd['center'][2] - 0.012 - lo[2]
    # cuirass: from just below the waist to over the shoulders
    deep = max(t['chest']['half_depth'], t['belly']['half_depth'])
    objs = load('cuirass'); piv, size = group(objs, 'cuirass')
    bot = t['waist']['z'] - 0.06; top = t['shoulders']['z'] + 0.05
    fit(piv, size, (0, t['belly']['forward'] * 0.6), bot, (t['shoulders']['half_width'] * 2 * 1.32, deep * 2 * 1.28, top - bot))
    # belt: round the hips at the cuirass hem
    w = max(t['hips']['half_width'], t['waist']['half_width']); d = max(t['hips']['half_depth'], t['belly']['half_depth'])
    objs = load('belt'); piv, size = group(objs, 'belt')
    fit(piv, size, (0, t['belly']['forward'] * 0.5 - 0.012), bot - 0.045, (w * 2 + 0.06, d * 2 + 0.085, None))
    piv.scale[2] = 1.0
    # shoulder guards: one per shoulder, sized to the arm
    objs = load('shoulders')
    for side, tag in ((-1, 'l'), (1, 'r')):
        e = named(objs, f'shoulder_guard_{tag}')[0]
        mine = [e] + [o for o in objs if o.parent == e]; e.parent = None
        piv, size = group(mine, f'shoulder_{tag}')
        k = 0.52 * math.sqrt(m['li'] * m['sh']); piv.scale = (k, k, k)
        s = so[f'shoulder_{tag}']; piv.location = (s[0] + side * 0.035 * k, s[1], s[2] - 0.13 * k)
    # sandals: each on its foot
    objs = load('sandals')
    for side, tag in ((-1, 'l'), (1, 'r')):
        e = named(objs, f'sandal_{tag}')[0]; e.rotation_euler = (0, 0, 0)
        mine = [e] + [o for o in objs if o.parent == e]; e.parent = None
        piv, size = group(mine, f'sandal_{tag}')
        f = so[f'foot_{tag}']; fit(piv, size, (f[0], f[1]), 0, (None, so['foot_length'] * 1.08, None))
        piv.scale = (piv.scale[1] * (m['li'] ** 0.4),) + tuple(piv.scale[1:])
    # gladius: hangs at the right hip, point down
    objs = load('gladius'); piv, size = group(objs, 'gladius'); piv.rotation_euler = (0, math.radians(-90), 0)
    piv.scale = (H / 1.78,) * 3; bpy.context.view_layer.update()
    lo, hi = bbox(objs); piv.location += Vector((t['hips']['half_width'] + 0.035 - (lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, t['hips']['z'] + 0.14 - hi[2]))


def build(sex, build_, offset=None, export=None):
    before = set(bpy.context.scene.objects)
    info = body.build(sex, build_, offset=(0, 0, 0)) if offset is not None else None
    if info is None:
        info = body.build(sex, build_, offset=(0, 0, 0))
    dress(info)
    if offset is not None:
        new = [o for o in bpy.context.scene.objects if o not in before and o.parent is None]
        piv = bpy.data.objects.new(f'roman-{sex}-{build_}', None); bpy.context.scene.collection.objects.link(piv)
        for o in new:
            o.parent = piv
        piv.location = offset
    if export:
        kit.export(export)
    return info


if __name__ == '__main__':
    out = os.path.join(HERE, 'out')
    for s, b in body.TYPES:
        kit.reset(); build(s, b, export=os.path.join(out, f'roman-{s}-{b}.glb')); print('dressed', s, b, kit.triangles())
    if '--lineup' in sys.argv:
        import lineup
        lineup.render(os.path.join(out, 'roman-lineup.png'), builder=lambda s, b, off: build(s, b, offset=off))

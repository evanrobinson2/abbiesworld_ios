"""Moon base kit helpers (AW-STUDY-0031). Each assets/<slug>/build.py imports this and stays a standalone recipe:
`python assets/<slug>/build.py` rebuilds the GLB, its baked maps and its renders from nothing.

The look is the Moon Heroes "Faceted Hero" direction: low-poly parts with crisp chamfers, flat-shaded planes, and real
materials. Every material is a role with a procedural surface (panel seams, brushed metal, rock pits, weave) that is
baked into three maps per asset: base colour, roughness and a tangent-space normal map. So the mesh stays low poly and
the surface still has seams, rivets and grit up close in first person.

Conventions: Z up, metres, origin at the footprint centre on the ground, front faces -Y (glTF turns it into +Z).
Material names start with the game's role word (Metal_, Glass_, Stone_, Cloth_, Leaf_, Soil) or a Moon role the game
already reads (OrangeBand and DomeGlass glow as windows, HeadlightGlass as lamps). Every part carries `mass_kg` and
`density` in its glTF extras, from its volume and its material, so low-gravity physics can throw it honestly.
Palette from the Moon Mission pack; cyan #00ffd1 is reserved for the meteorite and the Star Child, gold for memory coins.
"""
import json
import math
import os
import sys

import bpy  # noqa: I001 (bpy must load first; it provides bmesh and mathutils)
import bmesh
from mathutils import Vector

TAU = math.tau

# name: base colour, roughness, metallic, surface pattern, density kg/m3 (solid material), emission colour, strength,
# alpha. Hollow parts set their own fill factor (a tank is mostly air).
ROLES = {
    'Metal_Hull':      ('#c9ced6', 0.55, 0.15, 'panels', 2700, None, 0, 1),
    'Metal_HullDark':  ('#8a929e', 0.6, 0.2, 'panels', 2700, None, 0, 1),
    'Metal_Gunmetal':  ('#3c414b', 0.45, 0.6, 'brushed', 2700, None, 0, 1),
    'Metal_Charcoal':  ('#3a4a5a', 0.55, 0.35, 'panels_small', 2700, None, 0, 1),
    'Metal_Steel':     ('#8d939c', 0.35, 0.85, 'brushed', 7850, None, 0, 1),
    'Metal_Foil':      ('#c4c8ce', 0.3, 1.0, 'crinkle', 1500, None, 0, 1),
    'Metal_Grate':     ('#565d68', 0.5, 0.7, 'grate', 2700, None, 0, 1),
    'Metal_Hazard':    ('#e9a82a', 0.5, 0.1, 'stripes', 2700, None, 0, 1),
    'Metal_SolarCell': ('#1d2c4e', 0.22, 0.5, 'cells', 2330, None, 0, 1),
    'Metal_OxygenBlue': ('#4b78c8', 0.4, 0.3, 'brushed', 2700, None, 0, 1),
    'Plastic_White':   ('#e3e6ea', 0.45, 0.0, 'grain', 1200, None, 0, 1),
    'Plastic_Dark':    ('#2b2f36', 0.6, 0.0, 'grain', 1200, None, 0, 1),
    'Rubber_Black':    ('#1d1f23', 0.92, 0.0, 'grain', 1100, None, 0, 1),
    'Cloth_Blue':      ('#4d6fa8', 0.95, 0.0, 'weave', 400, None, 0, 1),
    'Cloth_Grey':      ('#6c7480', 0.95, 0.0, 'weave', 400, None, 0, 1),
    'Cloth_Suit':      ('#9aa1ab', 0.85, 0.0, 'weave', 600, None, 0, 1),
    'Stone_Regolith':  ('#a2a5ab', 0.97, 0.0, 'rock', 1500, None, 0, 1),
    'Stone_Ground':    ('#73767d', 0.97, 0.0, 'rock', 1500, None, 0, 1),
    'Stone_Basalt':    ('#6f737a', 0.9, 0.0, 'rock', 2900, None, 0, 1),
    'Stone_BasaltDark': ('#4a4d55', 0.92, 0.0, 'rock', 2900, None, 0, 1),
    'Soil_Grow':       ('#4a3a2e', 0.95, 0.0, 'rock_fine', 1300, None, 0, 1),
    'Leaf_Green':      ('#5fae4f', 0.7, 0.0, 'none', 600, None, 0, 1),
    'Leaf_Lettuce':    ('#9bd06a', 0.7, 0.0, 'none', 600, None, 0, 1),
    'Fruit_Red':       ('#d8453a', 0.4, 0.0, 'none', 900, None, 0, 1),
    'Glass_Window':    ('#9fc3e6', 0.05, 0.0, 'none', 2500, None, 0, 0.35),
    'DomeGlass':       ('#a8c8ea', 0.05, 0.0, 'none', 2500, '#ffcf96', 0.15, 0.4),
    'OrangeBand':      ('#ff9a3c', 0.4, 0.0, 'none', 1200, '#ff9a3c', 4.0, 1),
    'Window_Warm':     ('#ff9a4a', 0.3, 0.0, 'none', 2500, '#ff8a30', 2.2, 1),
    'HeadlightGlass':  ('#f4f1e6', 0.1, 0.0, 'none', 2500, '#fff4dc', 6.0, 1),
    'Lamp_Green':      ('#59e08a', 0.2, 0.0, 'none', 2500, '#59e08a', 5.0, 1),
    'Lamp_Amber':      ('#ffb02e', 0.2, 0.0, 'none', 2500, '#ffb02e', 5.0, 1),
    'Lamp_Red':        ('#ff4d3d', 0.2, 0.0, 'none', 2500, '#ff4d3d', 5.0, 1),
    'Lamp_Grow':       ('#e48cff', 0.2, 0.0, 'none', 2500, '#e48cff', 4.0, 1),
    'LampOff_Amber':   ('#8a5a1c', 0.15, 0.0, 'none', 2500, None, 0, 1),
    'LampOff_Red':     ('#7a2620', 0.15, 0.0, 'none', 2500, None, 0, 1),
    'Screen_Earthlight': ('#1c2c4c', 0.15, 0.0, 'scanlines', 2500, '#4f6db0', 0.9, 1),
    'Paint_Dial':      ('#f1efe6', 0.5, 0.0, 'dial', 1200, None, 0, 1),
}
TOUCH_SPECIALS = {'scanlines', 'dial'}


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(h):
    return (*[c ** 2.2 for c in hexrgb(h)], 1)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _parts.clear()


# ---------------------------------------------------------------- materials (procedural, for baking)

def _pattern(nt, kind):
    """Return (height socket, grime factor socket) for a surface pattern, in object space metres."""
    n, l = nt.nodes, nt.links
    tc = n.new('ShaderNodeTexCoord')
    obj = tc.outputs['Object']
    noise = n.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.0
    noise.inputs['Detail'].default_value = 6
    l.new(obj, noise.inputs['Vector'])
    grime = noise.outputs['Fac']
    fine = n.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 140
    fine.inputs['Detail'].default_value = 2
    l.new(obj, fine.inputs['Vector'])
    fine = fine.outputs['Fac']

    def mix_add(a, b, wb):
        m = n.new('ShaderNodeMath')
        m.operation = 'MULTIPLY_ADD'
        l.new(b, m.inputs[0])
        m.inputs[1].default_value = wb
        if isinstance(a, float):
            m.inputs[2].default_value = a
        else:
            l.new(a, m.inputs[2])
        return m.outputs[0]

    def inv(x):
        m = n.new('ShaderNodeMath')
        m.operation = 'SUBTRACT'
        m.inputs[0].default_value = 1.0
        l.new(x, m.inputs[1])
        return m.outputs[0]

    def seams(scale, mortar, squash=1.0):
        b = n.new('ShaderNodeTexBrick')
        b.inputs['Scale'].default_value = scale
        b.inputs['Mortar Size'].default_value = mortar
        b.inputs['Mortar Smooth'].default_value = 0.2
        b.inputs['Brick Width'].default_value = 1.0
        b.inputs['Row Height'].default_value = squash
        b.offset = 0.0
        b.inputs['Color1'].default_value = (1, 1, 1, 1)
        b.inputs['Color2'].default_value = (1, 1, 1, 1)
        b.inputs['Mortar'].default_value = (0, 0, 0, 1)
        # Panels follow the dominant face direction: blend the brick across the three planes.
        sep = n.new('ShaderNodeSeparateXYZ')
        l.new(obj, sep.inputs[0])
        outs = []
        for a, c in (('X', 'Y'), ('Y', 'Z'), ('X', 'Z')):
            cmb = n.new('ShaderNodeCombineXYZ')
            l.new(sep.outputs[a], cmb.inputs[0])
            l.new(sep.outputs[c], cmb.inputs[1])
            bb = n.new('ShaderNodeTexBrick')
            for k in ('Scale', 'Mortar Size', 'Mortar Smooth', 'Brick Width', 'Row Height', 'Color1', 'Color2', 'Mortar'):
                bb.inputs[k].default_value = b.inputs[k].default_value
            bb.offset = 0.0
            l.new(cmb.outputs[0], bb.inputs['Vector'])
            outs.append(bb.outputs['Fac'])
        n.remove(b)
        # Triplanar: weight each projection by how squarely the face looks down that axis (|normal|^4).
        geo = n.new('ShaderNodeNewGeometry')
        vt = n.new('ShaderNodeVectorTransform')
        vt.vector_type = 'NORMAL'
        vt.convert_from = 'WORLD'
        vt.convert_to = 'OBJECT'
        l.new(geo.outputs['Normal'], vt.inputs[0])
        nsep = n.new('ShaderNodeSeparateXYZ')
        l.new(vt.outputs[0], nsep.inputs[0])
        acc = None
        wsum = None
        for out, axis in zip(outs, ('Z', 'X', 'Y')):
            ab = n.new('ShaderNodeMath')
            ab.operation = 'ABSOLUTE'
            l.new(nsep.outputs[axis], ab.inputs[0])
            pw = n.new('ShaderNodeMath')
            pw.operation = 'POWER'
            l.new(ab.outputs[0], pw.inputs[0])
            pw.inputs[1].default_value = 4.0
            mu = n.new('ShaderNodeMath')
            mu.operation = 'MULTIPLY'
            l.new(out, mu.inputs[0])
            l.new(pw.outputs[0], mu.inputs[1])
            if acc is None:
                acc, wsum = mu.outputs[0], pw.outputs[0]
            else:
                a2 = n.new('ShaderNodeMath')
                a2.operation = 'ADD'
                l.new(acc, a2.inputs[0])
                l.new(mu.outputs[0], a2.inputs[1])
                w2 = n.new('ShaderNodeMath')
                w2.operation = 'ADD'
                l.new(wsum, w2.inputs[0])
                l.new(pw.outputs[0], w2.inputs[1])
                acc, wsum = a2.outputs[0], w2.outputs[0]
        dv = n.new('ShaderNodeMath')
        dv.operation = 'DIVIDE'
        l.new(acc, dv.inputs[0])
        l.new(wsum, dv.inputs[1])
        return dv.outputs[0]  # 1 = seam (mortar), 0 = panel face

    if kind in ('panels', 'panels_small'):
        s = seams(1.6 if kind == 'panels' else 4.0, 0.012)
        h = mix_add(inv(s), fine, 0.04)
        return h, grime, 0.6
    if kind == 'brushed':
        st = n.new('ShaderNodeTexNoise')
        st.inputs['Scale'].default_value = 60
        mp = n.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1, 1, 40)
        l.new(obj, mp.inputs['Vector'])
        l.new(mp.outputs[0], st.inputs['Vector'])
        return st.outputs['Fac'], grime, 0.08
    if kind == 'crinkle':
        v = n.new('ShaderNodeTexVoronoi')
        v.feature = 'DISTANCE_TO_EDGE'
        v.inputs['Scale'].default_value = 9
        l.new(obj, v.inputs['Vector'])
        return v.outputs['Distance'], grime, 0.35
    if kind == 'grate':
        w = n.new('ShaderNodeTexWave')
        w.inputs['Scale'].default_value = 7
        w.wave_profile = 'SAW'
        l.new(obj, w.inputs['Vector'])
        return w.outputs['Fac'], grime, 0.5
    if kind == 'stripes':
        w = n.new('ShaderNodeTexWave')
        w.inputs['Scale'].default_value = 3.5
        w.bands_direction = 'DIAGONAL'
        l.new(obj, w.inputs['Vector'])
        return w.outputs['Fac'], grime, 0.05
    if kind == 'cells':
        s = seams(5.0, 0.04)
        return inv(s), grime, 0.2
    if kind in ('rock', 'rock_fine'):
        v = n.new('ShaderNodeTexVoronoi')
        v.inputs['Scale'].default_value = 2.5 if kind == 'rock' else 9
        l.new(obj, v.inputs['Vector'])
        h = mix_add(v.outputs['Distance'], noise.outputs['Fac'], 0.6)
        h = mix_add(h, fine, 0.3)
        return h, grime, 1.0
    if kind == 'weave':
        w = n.new('ShaderNodeTexWave')
        w.inputs['Scale'].default_value = 60
        l.new(obj, w.inputs['Vector'])
        return w.outputs['Fac'], grime, 0.15
    if kind == 'grain':
        return fine, grime, 0.08
    if kind == 'scanlines':
        w = n.new('ShaderNodeTexWave')
        w.inputs['Scale'].default_value = 40
        w.bands_direction = 'Z'
        l.new(obj, w.inputs['Vector'])
        return w.outputs['Fac'], grime, 0.02
    if kind == 'dial':
        return fine, grime, 0.02
    return None, grime, 0.0


def _sock(coll, ident):
    for s in coll:
        if s.identifier == ident:
            return s
    raise KeyError(ident)


def _mix(n):
    m = n.new('ShaderNodeMix')
    m.data_type = 'RGBA'
    return m, _sock(m.inputs, 'Factor_Float'), _sock(m.inputs, 'A_Color'), _sock(m.inputs, 'B_Color'), \
        _sock(m.outputs, 'Result_Color')


def material(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    col, rough, metal, pat, dens, emit, strength, alpha = ROLES[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    n, l = nt.nodes, nt.links
    b = n['Principled BSDF']
    height, grime, bump_k = _pattern(nt, pat)
    # Colour: base, darkened in the dirty patches.
    ramp, rF, rA, rB, rOut = _mix(n)
    rA.default_value = lin(col)
    dark = tuple(c * 0.72 for c in lin(col)[:3]) + (1,)
    rB.default_value = dark
    g = n.new('ShaderNodeMapRange')
    g.inputs['From Min'].default_value = 0.45
    g.inputs['From Max'].default_value = 0.8
    l.new(grime, g.inputs['Value'])
    if pat in ('rock', 'rock_fine', 'none', 'scanlines', 'dial'):
        g.inputs['To Max'].default_value = 0.5
    l.new(g.outputs[0], rF)
    colsock = rOut
    if pat == 'stripes' and height is not None:
        st, sF, sA, sB, sOut = _mix(n)
        gt = n.new('ShaderNodeMath')
        gt.operation = 'GREATER_THAN'
        gt.inputs[1].default_value = 0.5
        l.new(height, gt.inputs[0])
        l.new(gt.outputs[0], sF)
        l.new(colsock, sA)
        sB.default_value = lin('#22252a')
        colsock = sOut
    if pat == 'cells' and height is not None:
        st, sF, sA, sB, sOut = _mix(n)
        l.new(height, sF)
        sA.default_value = lin('#7f8ba0')
        l.new(colsock, sB)
        colsock = sOut
    if pat == 'panels' and height is not None:
        st, sF, sA, sB, sOut = _mix(n)
        l.new(height, sF)
        sA.default_value = tuple(c * 0.55 for c in lin(col)[:3]) + (1,)
        l.new(colsock, sB)
        colsock = sOut
    if pat == 'dial':
        # A gauge face: green safe arc and red low arc, painted on a disc in the XZ plane.
        tc = n.new('ShaderNodeTexCoord')
        sep = n.new('ShaderNodeSeparateXYZ')
        l.new(tc.outputs['Object'], sep.inputs[0])
        at = n.new('ShaderNodeMath')
        at.operation = 'ARCTAN2'
        l.new(sep.outputs['Y'], at.inputs[0])
        l.new(sep.outputs['X'], at.inputs[1])
        green = n.new('ShaderNodeMath')
        green.operation = 'GREATER_THAN'
        green.inputs[1].default_value = 0.6
        l.new(at.outputs[0], green.inputs[0])
        red = n.new('ShaderNodeMath')
        red.operation = 'LESS_THAN'
        red.inputs[1].default_value = -0.6
        l.new(at.outputs[0], red.inputs[0])
        m1, f1, a1, b1, o1 = _mix(n)
        l.new(green.outputs[0], f1)
        l.new(colsock, a1)
        b1.default_value = lin('#3fae5c')
        m2, f2, a2, b2, o2 = _mix(n)
        l.new(red.outputs[0], f2)
        l.new(o1, a2)
        b2.default_value = lin('#d9463a')
        colsock = o2
    l.new(colsock, b.inputs['Base Color'])
    rr = n.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = max(0.02, rough - 0.12)
    rr.inputs['To Max'].default_value = min(1.0, rough + 0.12)
    l.new(grime, rr.inputs['Value'])
    l.new(rr.outputs[0], b.inputs['Roughness'])
    b.inputs['Metallic'].default_value = metal
    if height is not None and bump_k > 0:
        bp = n.new('ShaderNodeBump')
        bp.inputs['Strength'].default_value = min(1.0, bump_k)
        bp.inputs['Distance'].default_value = 0.01
        l.new(height, bp.inputs['Height'])
        l.new(bp.outputs['Normal'], b.inputs['Normal'])
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit)
        b.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    m['colour_socket'] = True
    m['_col'] = colsock.node.name
    m['_colout'] = colsock.identifier
    return m


# ---------------------------------------------------------------- primitives

_parts = []


def _finish(o, mtl, bevel, segs=1, fill=1.0, smooth=False):
    o.data.materials.clear()
    o.data.materials.append(material(mtl))
    if bevel > 0:
        md = o.modifiers.new('chamfer', 'BEVEL')
        md.width = bevel
        md.segments = segs
        md.limit_method = 'ANGLE'
        md.angle_limit = math.radians(35)
        md.harden_normals = False
        apply_mods(o)
    for p in o.data.polygons:
        p.use_smooth = smooth
    o['fill'] = fill
    _parts.append(o)
    return o


def active(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def apply_mods(o):
    active(o)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def apply_tf(o):
    active(o)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def box(name, size, loc, mtl, bevel=0.02, rot=(0, 0, 0), fill=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    apply_tf(o)
    return _finish(o, mtl, bevel, fill=fill)


def cyl(name, r, depth, loc, mtl, rot=(0, 0, 0), n=12, bevel=0.01, r2=None, fill=1.0, smooth=False):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=n, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return _finish(o, mtl, bevel, fill=fill, smooth=smooth)


def sphere(name, r, loc, mtl, seg=12, rings=8, scale=(1, 1, 1), fill=1.0, smooth=False, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    apply_tf(o)
    return _finish(o, mtl, 0, fill=fill, smooth=smooth)


def ico(name, r, loc, mtl, sub=1, scale=(1, 1, 1), rot=(0, 0, 0), fill=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    apply_tf(o)
    return _finish(o, mtl, 0, fill=fill)


def torus(name, R, r, loc, mtl, rot=(0, 0, 0), n=24, m=8, fill=1.0, smooth=False):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=n, minor_segments=m,
                                     location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return _finish(o, mtl, 0, fill=fill, smooth=smooth)


def tube(name, pts, r, mtl, n=8, fill=1.0):
    """A pipe along a polyline: one cylinder per segment plus ball joints."""
    objs = []
    for i in range(len(pts) - 1):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        d = b - a
        bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=d.length, location=(a + b) / 2)
        o = bpy.context.object
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = d.to_track_quat('Z', 'Y')
        apply_tf(o)
        objs.append(o)
    for p in pts[1:-1]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=n, ring_count=n // 2, radius=r * 1.02, location=p)
        objs.append(bpy.context.object)
    o = join_raw(name, objs)
    return _finish(o, mtl, 0, fill=fill)


def bowl(name, r, depth, loc, mtl, rot=(0, 0, 0), seg=16, rings=6, thick=0.04, fill=1.0):
    """A shallow dish (comms dish, crater bowl): a sphere cap of radius r and depth, opening up +Z."""
    R = (r * r + depth * depth) / (2 * depth)
    bm = bmesh.new()
    a1 = math.asin(min(1.0, r / R))
    rows = []
    for j in range(rings + 1):
        a = a1 * j / rings
        z = R - R * math.cos(a)
        ring = []
        for i in range(seg if j else 1):
            t = TAU * i / seg
            ring.append(bm.verts.new((R * math.sin(a) * math.cos(t), R * math.sin(a) * math.sin(t), z)))
        rows.append(ring)
    for i in range(seg):
        bm.faces.new((rows[0][0], rows[1][i], rows[1][(i + 1) % seg]))
    for j in range(1, rings):
        for i in range(seg):
            bm.faces.new((rows[j][i], rows[j + 1][i], rows[j + 1][(i + 1) % seg], rows[j][(i + 1) % seg]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    md = o.modifiers.new('thick', 'SOLIDIFY')
    md.thickness = thick
    apply_mods(o)
    return _finish(o, mtl, 0, fill=fill)


def cut(o, cutter, remove=True):
    """Boolean difference: punch a doorway or porthole through a part."""
    md = o.modifiers.new('cut', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.object = cutter
    md.solver = 'EXACT'
    keep = o.data.materials[0]
    apply_mods(o)
    o.data.materials.clear()
    o.data.materials.append(keep)
    for p in o.data.polygons:
        p.material_index = 0
    if remove:
        if cutter in _parts:
            _parts.remove(cutter)
        bpy.data.objects.remove(cutter)
    return o


def cutter_cyl(r, depth, loc, rot=(0, 0, 0), n=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n, radius=r, depth=depth, location=loc, rotation=rot)
    return bpy.context.object


def cutter_box(size, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.scale = size
    return o


def join_raw(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    return o


def merge(name, objs):
    """Join finished parts that belong to one named piece (keeps their materials)."""
    for o in objs:
        _parts.remove(o)
    fill = objs[0].get('fill', 1.0)
    o = join_raw(name, objs)
    o['fill'] = fill
    _parts.append(o)
    return o


def array_ring(make, count, radius, z=0.0, start=0.0):
    """Call make(i, x, y, angle) count times around a circle."""
    out = []
    for i in range(count):
        a = start + TAU * i / count
        out.append(make(i, radius * math.cos(a), radius * math.sin(a), a))
    return out


_FACE = {'-Y': (0, 0, 0), '+Y': (0, 0, math.pi), '-X': (0, 0, -math.pi / 2), '+X': (0, 0, math.pi / 2)}


def module(name, size, loc, mtl='Metal_Hull', frame='Metal_Gunmetal', bevel=0.06, t=None, fill=0.3, rot=(0, 0, 0)):
    """The Moon base's signature block: an off-white hull box with big chamfers, held by chunky dark bumper frames
    (four corner posts, a top rim and a bottom rim). Returns the body; parts are named <name>Body, <name>Post0..3,
    <name>RimTop, <name>RimBase. rot is a Z turn only."""
    sx, sy, sz = size
    x, y, z = loc
    t = t or max(0.06, min(sx, sy, sz) * 0.09)
    cz, sz_ = math.cos(rot[2]), math.sin(rot[2])

    def at(dx, dy, dz):
        return (x + dx * cz - dy * sz_, y + dx * sz_ + dy * cz, z + dz)
    body = box(f'{name}Body', (sx - t * 0.6, sy - t * 0.6, sz), at(0, 0, 0), mtl, bevel=bevel, fill=fill, rot=rot)
    posts = [box(f'{name}Post{i}', (t * 1.3, t * 1.3, sz + t * 0.2), at(px * (sx / 2 - t * 0.35), py * (sy / 2 - t * 0.35), 0),
                 frame, bevel=t * 0.3, rot=rot) for i, (px, py) in enumerate(((1, 1), (-1, 1), (1, -1), (-1, -1)))]
    rims = []
    for tag, dz in (('Top', sz / 2), ('Base', -sz / 2)):
        parts = []
        for dx, dy, w, d in ((0, sy / 2, sx, t), (0, -sy / 2, sx, t), (sx / 2, 0, t, sy), (-sx / 2, 0, t, sy)):
            parts.append(box(f'{name}Rim{tag}_', (w + t * 0.2, d * 1.1, t * 1.1), at(dx * 0.98, dy * 0.98, dz), frame,
                             bevel=t * 0.25, rot=rot))
        rims.append(merge(f'{name}Rim{tag}', parts))
    merge(f'{name}Frame', posts + rims)
    return body


def window(name, w, h, loc, face='-Y', glow='Window_Warm', frame='Metal_Gunmetal', depth=0.08, round_=True, yaw=None):
    """A warm glowing window: a dark chamfered frame with the lit pane set into it, facing `face`, or facing outward
    along the angle `yaw` (radians from +X) for windows round a curved wall."""
    rot = _FACE[face] if yaw is None else (0, 0, yaw + math.pi / 2)
    fr = box(f'{name}Frame', (w + 0.08, depth, h + 0.08), loc, frame, bevel=min(w, h) * (0.3 if round_ else 0.1), rot=rot)
    off = {'-Y': (0, -1), '+Y': (0, 1), '-X': (-1, 0), '+X': (1, 0)}[face] if yaw is None else (math.cos(yaw), math.sin(yaw))
    pane = box(f'{name}Pane', (w, depth, h), (loc[0] + off[0] * depth * 0.2, loc[1] + off[1] * depth * 0.2, loc[2]), glow,
               bevel=min(w, h) * (0.28 if round_ else 0.08), rot=rot)
    return pane


def rock(name, r, loc, mtl='Stone_Basalt', squash=0.7, seed=0, sink=0.25, sub=1, jag=0.28):
    """An angular rock: an icosphere whose vertices are pushed in and out at random, squashed, with a flat sunk base."""
    import random
    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=(0, 0, 0))
    o = bpy.context.object
    o.name = name
    sx, sy = rnd.uniform(0.85, 1.2), rnd.uniform(0.7, 1.0)
    for v in o.data.vertices:
        k = 1 + rnd.uniform(-jag, jag)
        v.co = Vector((v.co.x * k * sx, v.co.y * k * sy, v.co.z * k * squash))
    zmin = min(v.co.z for v in o.data.vertices)
    cutz = zmin + (max(v.co.z for v in o.data.vertices) - zmin) * sink * 0.5
    for v in o.data.vertices:
        if v.co.z < cutz:
            v.co.z = cutz
    o.rotation_euler = (rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), rnd.uniform(0, TAU))
    o.location = (loc[0], loc[1], loc[2] - cutz)
    apply_tf(o)
    return _finish(o, mtl, 0)


def displace(o, strength, scale=1.0, seed=0):
    """Rough up a mesh (rocks, crater rims) with noise along normals, then keep it faceted."""
    from mathutils import noise
    for v in o.data.vertices:
        p = v.co * scale + Vector((seed * 13.1, seed * 7.7, seed * 3.3))
        v.co += v.normal * noise.noise(p) * strength
    return o


# ---------------------------------------------------------------- bake, mass, export

def mass_and_extras(asset):
    total = 0.0
    for o in _parts:
        bm = bmesh.new()
        bm.from_mesh(o.data)
        vol = abs(bm.calc_volume(signed=False))
        bm.free()
        dens = ROLES[o.data.materials[0].name][4] if o.data.materials else 1000
        if len(o.data.materials) > 1:
            dens = sum(ROLES[m.name][4] for m in o.data.materials) / len(o.data.materials)
        kg = vol * dens * o.get('fill', 1.0)
        o['mass_kg'] = round(kg, 2)
        o['density'] = round(dens * o.get('fill', 1.0), 1)
        o['material_role'] = o.data.materials[0].name if o.data.materials else ''
        total += kg
    return total


def triangles():
    t = 0
    for o in _parts:
        for p in o.data.polygons:
            t += len(p.vertices) - 2
    return t


def bounds():
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for o in _parts:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def _img(name, size, noncolor):
    im = bpy.data.images.new(name, size, size, alpha=False)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    return im


def bake(out_dir, size=1024, margin=3):
    """Lay out one UV atlas across all parts and bake base colour, roughness and normal maps from the procedural
    surfaces. Then rewire every material to read the baked maps, which is what the glTF carries."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    sc.render.bake.margin = margin
    bpy.ops.object.select_all(action='DESELECT')
    for o in _parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = _parts[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.02, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.02, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    imgs = {k: _img(f'{k}', size, k != 'base') for k in ('base', 'rough', 'normal')}
    mats = {m for o in _parts for m in o.data.materials}

    def target(key):
        for m in mats:
            nt = m.node_tree
            t = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage')
            t.name = 'BAKE'
            t.image = imgs[key]
            nt.nodes.active = t

    # Base colour through the emission pass, so metals keep their colour.
    saved = {}
    for m in mats:
        b = m.node_tree.nodes['Principled BSDF']
        saved[m.name] = (tuple(b.inputs['Emission Color'].default_value), b.inputs['Emission Strength'].default_value,
                         b.inputs['Alpha'].default_value)
        src = m.node_tree.nodes[m['_col']]
        out = _sock(src.outputs, m['_colout'])
        m.node_tree.links.new(out, b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 1.0
        b.inputs['Alpha'].default_value = 1.0
    target('base')
    bpy.ops.object.bake(type='EMIT')
    for m in mats:
        b = m.node_tree.nodes['Principled BSDF']
        for lk in list(b.inputs['Emission Color'].links):
            m.node_tree.links.remove(lk)
        c, s, a = saved[m.name]
        b.inputs['Emission Color'].default_value = c
        b.inputs['Emission Strength'].default_value = s
        b.inputs['Alpha'].default_value = a
    target('rough')
    bpy.ops.object.bake(type='ROUGHNESS')
    target('normal')
    bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
    os.makedirs(out_dir, exist_ok=True)
    for k, im in imgs.items():
        im.filepath_raw = os.path.join(out_dir, f'{k}.png')
        im.file_format = 'PNG'
        im.save()
    # Rewire: each role material = baked maps + its own metallic, emission and alpha.
    for m in mats:
        nt = m.node_tree
        b = nt.nodes['Principled BSDF']
        keep = {'Principled BSDF', 'Material Output'}
        for nd in list(nt.nodes):
            if nd.name not in keep:
                nt.nodes.remove(nd)
        tb = nt.nodes.new('ShaderNodeTexImage')
        tb.image = imgs['base']
        nt.links.new(tb.outputs['Color'], b.inputs['Base Color'])
        tr = nt.nodes.new('ShaderNodeTexImage')
        tr.image = imgs['rough']
        nt.links.new(tr.outputs['Color'], b.inputs['Roughness'])
        tn = nt.nodes.new('ShaderNodeTexImage')
        tn.image = imgs['normal']
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return imgs


def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in _parts:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_extras=True,
                              export_image_format='JPEG', export_jpeg_quality=86, export_apply=True,
                              export_yup=True)


# ---------------------------------------------------------------- renders

def _look(cam, target):
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def render(out_dir, yaw=35, pitch=22, dist=None, size=900, lens=50, fps_eye=None, samples=40, hero_cam=None,
           lights=(), sun_energy=2.2):
    """hero.png: three-quarter view under a hard white sun and blue Earthlight on a regolith floor.
    fps.png: what Abbie sees standing in front of it (eye at 1.15 m) when fps_eye is given."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    lo, hi = bounds()
    c = (lo + hi) / 2
    r = (hi - lo).length / 2
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.012, 0.016, 0.03, 1)
    bg.inputs['Strength'].default_value = 1.0
    sc.world = w
    bpy.ops.mesh.primitive_plane_add(size=max(60, r * 14), location=(c.x, c.y, lo.z - 0.002))
    floor = bpy.context.object
    floor.name = '_floor'
    floor.data.materials.append(material('Stone_Ground'))
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(52), 0, math.radians(-40)))
    sun = bpy.context.object
    sun.data.energy = sun_energy
    sun.data.angle = math.radians(0.6)
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(-60), 0, math.radians(150)))
    earth = bpy.context.object
    earth.data.energy = 0.9
    earth.data.color = (0.45, 0.58, 1.0)
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    sc.camera = cam
    cam.data.lens = lens
    if dist is None:
        dist = r * 2.8 * (lens / 50)
    yy, pp = math.radians(yaw), math.radians(pitch)
    cam.location = c + Vector((math.sin(yy) * math.cos(pp), -math.cos(yy) * math.cos(pp), math.sin(pp))) * dist
    _look(cam, c)
    if hero_cam:
        cam.location = Vector(hero_cam[0])
        _look(cam, hero_cam[1])
    extra = []
    for p, watts in lights:
        bpy.ops.object.light_add(type='POINT', location=p)
        lt = bpy.context.object
        lt.data.energy = watts
        lt.data.color = (1.0, 0.9, 0.78)
        lt.data.shadow_soft_size = 0.3
        extra.append(lt)
    os.makedirs(out_dir, exist_ok=True)
    sc.render.filepath = os.path.join(out_dir, 'hero.png')
    bpy.ops.render.render(write_still=True)
    if fps_eye:
        cam.data.lens = 24
        cam.location = Vector(fps_eye[0])
        _look(cam, fps_eye[1])
        sc.render.resolution_x, sc.render.resolution_y = size, int(size * 0.62)
        sc.render.filepath = os.path.join(out_dir, 'fps.png')
        bpy.ops.render.render(write_still=True)
    for o in (floor, sun, earth, cam, *extra):
        bpy.data.objects.remove(o)


# ---------------------------------------------------------------- one call per asset

def build(asset_dir, spec, bake_size=1024, view=None, fps_eye=None, render_it=True):
    """spec: dict(id, name, group, brief). Bakes, exports <slug>.glb, renders, writes notes stats."""
    slug = os.path.basename(asset_dir.rstrip('/'))
    total = mass_and_extras(slug)
    tris = triangles()
    lo, hi = bounds()
    bake(os.path.join(asset_dir, 'maps'), size=bake_size)
    export(os.path.join(asset_dir, f'{slug}.glb'))
    if render_it and '--norender' not in sys.argv:
        render(os.path.join(asset_dir, 'r'), fps_eye=fps_eye, **(view or {}))
    stats = {
        'id': spec['id'], 'name': spec['name'], 'triangles': tris, 'parts': len(_parts),
        'part_names': [o.name for o in _parts], 'materials': sorted({m.name for o in _parts for m in o.data.materials}),
        'mass_kg': round(total, 1), 'moon_weight_kg': round(total * 0.1654, 1),
        'size_m': [round(v, 2) for v in (hi - lo)], 'maps': f'{bake_size} px base, roughness, normal',
    }
    with open(os.path.join(asset_dir, 'stats.json'), 'w') as f:
        json.dump(stats, f, indent=1)
    print('BUILT', json.dumps(stats))
    return stats

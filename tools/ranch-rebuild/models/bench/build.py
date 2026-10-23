"""Garden bench (Ranch tile garden prop, replaces garden-assets/GF-194.glb).  usage: python build.py

A heavy, low trestle bench: a very thick two-plank seat on two splayed A-frame leg pairs, each capped by a cross-rail
under the seat and tied by a low end rail; a long stretcher between the leg pairs with a through-tenon and peg at each
end, and a diagonal brace from the stretcher up to the seat at each end.
Z up, metres, origin at the footprint centre on the ground, the long side faces front (-Y).
Two materials, two browns: Plank_Walnut (seat, legs, caps) and Timber_Dark (stretcher, end rails, braces, pegs).
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    L=1.60, D=0.42, H=0.52, seat_t=0.12,  # seat length, depth, top height, thickness
    seam=0.016,                       # gap between the two seat planks
    end_rough=0.012,                  # random push/pull of the plank-end vertices (chunky sawn ends)
    leg_x=0.58, leg_lean=0.03,        # leg pair centre lines at the cap (+-X); feet set this much further out
    leg_top_y=0.12, leg_foot_y=0.27,  # A-frame splay: leg centre at the cap and at the ground (+-Y)
    leg_top=(0.13, 0.10), leg_foot=(0.16, 0.12),  # leg section (along X, across the leg) at top / foot
    cap=(0.13, 0.44, 0.065),          # cross-rail under the seat at each end (x, y, z size)
    end_rail=(0.075, 0.34, 0.075), end_rail_z=0.17,  # low rail between the legs of a pair
    str_w=0.075, str_h=0.10, str_z=0.17, tenon=0.13,  # stretcher section, centre height, how far it pokes out
    peg=(0.05, 0.065, 0.18),          # peg through each tenon (x, y, z)
    brace_lo_x=0.50, brace_hi_x=0.24, brace_w=0.075,  # braces: from the stretcher at x to the seat at x
    bevel=0.012,
    seed=3,
)
COL = dict(Plank_Walnut=(130, 82, 52), Timber_Dark=(70, 42, 26))


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def add(bm, tmp):
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def beam(bm, a, b, s0, s1, side=(1, 0, 0), bevel=None):
    """Tapered square beam from point a (section s0 = (along side, across)) to b (section s1), bevelled."""
    a, b = Vector(a), Vector(b)
    ax = (b - a); length = ax.length; ax.normalize()
    sx = Vector(side); sx = (sx - ax * sx.dot(ax)).normalized(); sy = ax.cross(sx)
    tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        t = v.co.z + 0.5; s = s0 if t < 0.5 else s1
        v.co = a + ax * (t * length) + sx * (v.co.x * s[0]) + sy * (v.co.y * s[1])
    bv = P['bevel'] if bevel is None else bevel
    if bv:
        bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=min(bv, min(*s0, *s1) * 0.3), segments=1, affect='EDGES', profile=0.5)
    add(bm, tmp)


def box(bm, c, s, bevel=None):
    c = Vector(c)
    beam(bm, c - Vector((0, 0, s[2] / 2)), c + Vector((0, 0, s[2] / 2)), (s[0], s[1]), (s[0], s[1]), bevel=bevel)


def finish(bm, name, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def build():
    rnd = random.Random(P['seed'])
    L, D, H, T = P['L'], P['D'], P['H'], P['seat_t']
    under = H - T
    # ---- seat: two wide planks with a seam, rough chunky ends
    bm = bmesh.new()
    pw = (D - P['seam']) / 2
    for k, sy in enumerate((-1, 1)):
        tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.0)
        dl = rnd.uniform(-0.015, 0.015)
        for v in tmp.verts:
            v.co = Vector((v.co.x * (L + dl), v.co.y * pw + sy * (pw + P['seam']) / 2, under + (v.co.z + 0.5) * T))
        bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=P['bevel'], segments=1, affect='EDGES', profile=0.5)
        r = P['end_rough']
        for v in tmp.verts:
            if abs(v.co.x) > L / 2 - 0.05:
                v.co.x += rnd.uniform(-r, r); v.co.z += rnd.uniform(-r, r) * 0.5
        add(bm, tmp)
    seat = finish(bm, 'seat', 'Plank_Walnut')
    # ---- legs and caps
    bm = bmesh.new()
    cap = P['cap']
    for sx in (-1, 1):
        x = sx * P['leg_x']
        box(bm, (x, 0, under - cap[2] / 2), cap)
        for sy in (-1, 1):
            beam(bm, (x + sx * P['leg_lean'], sy * P['leg_foot_y'], 0), (x, sy * P['leg_top_y'], under - cap[2] + 0.01),
                 P['leg_foot'], P['leg_top'], side=(1, 0, 0))
    for v in bm.verts:                # feet sit flat on the ground
        v.co.z = max(0.0, v.co.z)
    legs = finish(bm, 'legs', 'Plank_Walnut')
    # ---- stretcher, end rails, pegs, braces
    bm = bmesh.new()
    xe = P['leg_x'] + P['tenon'] + P['end_rail'][0] / 2
    beam(bm, (-xe, 0, P['str_z']), (xe, 0, P['str_z']), (P['str_h'], P['str_w']), (P['str_h'], P['str_w']), side=(0, 0, 1))
    for sx in (-1, 1):
        x = sx * P['leg_x']
        box(bm, (x, 0, P['end_rail_z']), P['end_rail'])
        box(bm, (sx * (xe - P['peg'][0] * 0.9), 0, P['str_z']), P['peg'], bevel=0.008)
        lo = Vector((sx * P['brace_lo_x'], 0, P['str_z'] + P['str_h'] / 2 - 0.02))
        hi = Vector((sx * P['brace_hi_x'], 0, under + 0.02))
        beam(bm, lo, hi, (P['brace_w'], P['brace_w']), (P['brace_w'], P['brace_w']), side=(0, 1, 0))
    frame = finish(bm, 'frame', 'Timber_Dark')
    return [seat, legs, frame]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obs = build()
    dg = bpy.context.evaluated_depsgraph_get(); tris = 0
    for o in obs:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
    path = os.path.join(HERE, 'bench.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    main()

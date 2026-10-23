"""Garden bench, charming (storybook toy) version of `bench` (Ranch tile garden prop, replaces
garden-assets-charming/GF-194.glb).  usage: python build.py

Same piece as the normal bench, same footprint, origin and orientation: a thick seat on two splayed leg pairs tied by
a low stretcher with a through-tenon and peg at each end. Made toy-like: the seat is one chubby, pillow-edged slab
with a soft sag and its ends kicked up, tipped a little to one side; the legs are fat round logs that bulge in the
middle and end in rounded feet, each one leaning at its own slightly different angle; the stretcher is a wobbly
round pole with fat tenons and pegs.
Z up, metres, origin at the footprint centre on the ground, the long side faces front (-Y).
Two materials, as in the normal bench: Plank_Walnut (seat, legs) and Timber_Dark (stretcher, end rails, pegs).
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    L=1.60, D=0.44, H=0.54, seat_t=0.14,   # seat length, depth, top height (at the centre), thickness
    round=0.055, round_seg=3,         # pillowy seat edges (bevel width and segments)
    sag=0.010, kick=0.010,            # the seat sags this much in the middle and its ends kick up this much
    tilt_y=1.2, tilt_x=-1.0,          # playful tilt of the seat (deg about Y: right end up; about X: leans back)
    wobble=0.012,                     # random push/pull of the seat's edge vertices (hand-carved)
    leg_x=0.56, leg_lean=0.06,        # leg centre lines under the seat (+-X); feet set this much further out
    leg_top_y=0.10, leg_foot_y=0.22,  # A-frame splay: leg centre under the seat and at the ground (+-Y)
    leg_r_top=0.084, leg_r_mid=0.092, leg_r_foot=0.090,  # round log leg radii (chubby, bulging in the middle)
    leg_sides=10, leg_jitter=4,     # sides per log; each leg's lean varies by up to this many degrees
    end_rail_r=0.042, end_rail_z=0.19,  # low round rail between the legs of a pair
    str_r=0.045, str_z=0.19, str_bow=0.018, tenon=0.12,  # stretcher radius, height, wobble, how far it pokes out
    peg=(0.055, 0.075, 0.17),         # fat peg through each tenon (x, y, z)
    bevel=0.012,
    seed=5,
)
COL = dict(Plank_Walnut=(150, 76, 38), Timber_Dark=(84, 42, 22))


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


def log(bm, a, b, rings, sides, rnd=None, wob=0.0, cap_a=True, cap_b=True):
    """Round log from a to b. rings = [(t along 0..1, radius)], closed with flat fan caps at both ends."""
    a, b = Vector(a), Vector(b)
    ax = (b - a); length = ax.length; ax.normalize()
    ref = Vector((0, 0, 1)) if abs(ax.z) < 0.9 else Vector((1, 0, 0))
    sx = (ref - ax * ref.dot(ax)).normalized(); sy = ax.cross(sx)
    tmp = bmesh.new(); loops = []
    for t, r in rings:
        c = a + ax * (t * length); ring = []
        for i in range(sides):
            ang = 2 * math.pi * (i + 0.5) / sides
            rr = r * (1 + (rnd.uniform(-wob, wob) if rnd else 0))
            ring.append(tmp.verts.new(c + sx * (math.cos(ang) * rr) + sy * (math.sin(ang) * rr)))
        loops.append(ring)
    for r0, r1 in zip(loops, loops[1:]):
        for i in range(sides):
            j = (i + 1) % sides
            tmp.faces.new((r0[i], r0[j], r1[j], r1[i]))
    if cap_a:
        tmp.faces.new(list(reversed(loops[0])))
    if cap_b:
        tmp.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(tmp, faces=list(tmp.faces))
    add(bm, tmp)


def finish(bm, name, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def seat_tilt():
    return Matrix.Translation((0, 0, P['H'] - P['seat_t'] / 2)) @ Matrix.Rotation(math.radians(P['tilt_y']), 4, 'Y') \
        @ Matrix.Rotation(math.radians(P['tilt_x']), 4, 'X')


def seat_bottom(x, y):
    """World height of the seat underside at (x, y), for setting the leg tops into it."""
    u = 2 * x / P['L']
    z = -P['seat_t'] / 2 - P['sag'] * (1 - u * u) + P['kick'] * u ** 4
    return (seat_tilt() @ Vector((x, y, z))).z


def build():
    rnd = random.Random(P['seed'])
    L, D, T = P['L'], P['D'], P['seat_t']
    # ---- seat: one chubby slab, pillow edges, a soft sag with the ends kicked up, tilted a little
    bm = bmesh.new()
    tmp = bmesh.new(); bmesh.ops.create_cube(tmp, size=1.0)
    bmesh.ops.scale(tmp, vec=(L, D, T), verts=list(tmp.verts))
    bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=P['round'], segments=P['round_seg'], affect='EDGES', profile=0.5)
    for x in (-0.5, -0.25, 0.0, 0.25, 0.5):        # edge loops along the length so the slab can bend
        g = list(tmp.verts) + list(tmp.edges) + list(tmp.faces)
        bmesh.ops.bisect_plane(tmp, geom=g, plane_co=(x, 0, 0), plane_no=(1, 0, 0))
    w = P['wobble']
    for v in tmp.verts:
        u = 2 * v.co.x / L
        v.co.z += -P['sag'] * (1 - u * u) + P['kick'] * u ** 4
        if abs(v.co.y) > D / 2 - P['round'] or abs(v.co.x) > L / 2 - P['round']:
            v.co.y += rnd.uniform(-w, w) * 0.6; v.co.x += rnd.uniform(-w, w) * 0.6
        v.co.y *= 1 + 0.06 * (u * u)              # the ends flare a touch wider (toy plank)
    bmesh.ops.transform(tmp, matrix=seat_tilt(), verts=list(tmp.verts))
    add(bm, tmp)
    seat = finish(bm, 'seat', 'Plank_Walnut')
    # ---- legs: fat round logs, bulging in the middle, rounded feet, each leaning a little differently
    bm = bmesh.new()
    rt, rm, rf = P['leg_r_top'], P['leg_r_mid'], P['leg_r_foot']
    rings = [(0.0, rf * 0.72), (0.035, rf * 0.95), (0.10, rf), (0.5, rm), (0.92, rt), (1.0, rt)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            j = math.radians(P['leg_jitter'])
            jx, jy = rnd.uniform(-j, j), rnd.uniform(-j, j)
            tx, ty = sx * P['leg_x'], sy * P['leg_top_y']
            top = Vector((tx, ty, seat_bottom(tx, ty) + 0.03))
            foot = Vector((tx + sx * P['leg_lean'] + top.z * math.tan(jx), sy * P['leg_foot_y'] + top.z * math.tan(jy), 0))
            log(bm, foot, top, rings, P['leg_sides'], rnd, 0.06)
    for v in bm.verts:                # feet sit flat on the ground
        v.co.z = max(0.0, v.co.z)
    legs = finish(bm, 'legs', 'Plank_Walnut')
    # ---- stretcher (a slightly wobbly round pole), end rails, fat tenons and pegs
    bm = bmesh.new()
    xr = P['leg_x'] + P['leg_lean'] * (1 - P['end_rail_z'] / P['H'])   # leg centre at rail height
    xe = xr + P['tenon']
    n = 8; rings = []
    pts = []
    for i in range(n + 1):
        t = i / n; x = -xe + 2 * xe * t
        pts.append(Vector((x, P['str_bow'] * math.sin(t * math.pi * 2.0), P['str_z'] + P['str_bow'] * 0.6 * math.sin(t * math.pi))))
    for i in range(n):
        r0 = P['str_r'] * (1.18 if i in (0, n - 1) else 1.0)
        log(bm, pts[i], pts[i + 1], [(0, r0), (1, r0)], 8, cap_a=i == 0, cap_b=i == n - 1)
    for sx in (-1, 1):
        yspan = P['leg_top_y'] + (P['leg_foot_y'] - P['leg_top_y']) * (1 - P['end_rail_z'] / P['H'])
        log(bm, (sx * xr, -yspan - 0.03, P['end_rail_z']), (sx * xr, yspan + 0.03, P['end_rail_z']),
            [(0, P['end_rail_r'] * 0.85), (0.08, P['end_rail_r']), (0.92, P['end_rail_r']), (1, P['end_rail_r'] * 0.85)], 8)
        box(bm, (sx * (xe - P['peg'][0] * 1.1), 0, P['str_z']), P['peg'], bevel=0.014)
    frame = finish(bm, 'frame', 'Timber_Dark')
    return [seat, legs, frame]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obs = build()
    dg = bpy.context.evaluated_depsgraph_get(); tris = 0
    for o in obs:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
    path = os.path.join(HERE, 'bench-charming.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    main()

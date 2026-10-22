"""Compost bay (Ranch tile garden prop, replaces garden-assets/GF-019.glb).  usage: python build.py

A wide, low, slatted timber bay filled almost to the brim with lumpy dark compost and two clumps of green clippings.
Z up, metres, origin at the footprint centre on the ground, front (the open working side, one board lower) faces -Y.
Four objects, one material each: posts (Timber_Post), planks (Plank_Brown), heap (Soil_Compost), clippings (Leaf_Green).
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    W=1.80, D=1.30,              # footprint (outer faces of the corner posts)
    post=0.13, post_h=0.755,      # corner posts: square section, height
    mid_w=0.10, mid_t=0.06,      # mid posts: width along the wall, depth proud of the planks
    mids_long=2, mids_short=2,   # mid posts per long (X) / short (Y) wall
    plank_h=0.20, plank_t=0.045, gap=0.055, z0=0.025, rows=3,
    front_rows=2,                # the front (-Y) wall is one board lower: the open working side
    front_mid_h=0.49,            # front mid posts stop just above the top front board
    bevel=0.012,
    heap_base=0.685, heap_mound=0.035, heap_front=0.52, heap_lump=0.05, heap_nx=14, heap_ny=10, clods=26,
    clumps=[(-0.44, -0.04, 0.40, 0.34, 92), (0.34, 0.32, 0.44, 0.20, 76)],   # x, y, radius x, radius y, leaves
    leaf_len=(0.09, 0.15), leaf_w=0.62,
    seed=7,
)
COL = dict(Timber_Post=(112, 68, 36), Plank_Brown=(142, 86, 46), Soil_Compost=(58, 36, 24), Leaf_Green=(104, 150, 42))


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def box(bm, c, s, rot=(0, 0, 0), bevel=0.0):
    """Axis box of size s centred at c, rotated by rot (XYZ radians), optional 1-segment chamfer."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
    if bevel:
        bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=min(bevel, min(s) * 0.3), segments=1, affect='EDGES', profile=0.5)
    R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    for v in tmp.verts:
        v.co = (R @ v.co) + Vector(c)
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def finish(bm, name, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def wall_top(side):
    rows = P['front_rows'] if side == 'front' else P['rows']
    return P['z0'] + rows * P['plank_h'] + (rows - 1) * P['gap']


def build():
    rnd = random.Random(P['seed'])
    W, D, pt = P['W'], P['D'], P['post']
    hx, hy = W / 2, D / 2
    # ---- posts
    bm = bmesh.new()
    for sx in (-1, 1):
        for sy in (-1, 1):
            h = P['post_h']
            box(bm, (sx * (hx - pt / 2), sy * (hy - pt / 2), h / 2), (pt, pt, h), (0, 0, rnd.uniform(-0.03, 0.03)), P['bevel'])
    pin = P['plank_t'] + P['mid_t'] - 0.004          # planks set in so the mid posts finish flush with the corner posts
    for side, n, span, fixed, axis in (('front', P['mids_long'], W, -hy, 'x'), ('back', P['mids_long'], W, hy, 'x'),
                                       ('left', P['mids_short'], D, -hx, 'y'), ('right', P['mids_short'], D, hx, 'y')):
        inner = span - 2 * pt
        h = P['front_mid_h'] if side == 'front' else wall_top(side) + 0.005
        for i in range(n):
            t = -inner / 2 + inner * (i + 1) / (n + 1)
            off = fixed - math.copysign(pin, fixed) + math.copysign(P['plank_t'] + P['mid_t'] / 2, fixed)   # proud of the plank face
            if axis == 'x':
                c, s = (t, off, h / 2), (P['mid_w'], P['mid_t'], h)
            else:
                c, s = (off, t, h / 2), (P['mid_t'], P['mid_w'], h)
            box(bm, c, s, (0, 0, rnd.uniform(-0.02, 0.02)), P['bevel'])
    posts = finish(bm, 'posts', 'Timber_Post')
    # ---- planks: 3 rows (2 on the front) with real gaps, each board slightly skewed by hand
    bm = bmesh.new()
    for side, span, fixed, axis in (('front', W, -hy, 'x'), ('back', W, hy, 'x'), ('left', D, -hx, 'y'), ('right', D, hx, 'y')):
        rows = P['front_rows'] if side == 'front' else P['rows']
        plane = fixed - math.copysign(pin - P['plank_t'] / 2, fixed)
        L = span - 2 * pt + 0.06                     # tucked into the corner posts
        for r in range(rows):
            z = P['z0'] + r * (P['plank_h'] + P['gap']) + P['plank_h'] / 2 + rnd.uniform(-0.006, 0.006)
            tilt = rnd.uniform(-0.018, 0.018)
            if axis == 'x':
                box(bm, (rnd.uniform(-0.01, 0.01), plane, z), (L, P['plank_t'], P['plank_h']), (0, tilt, rnd.uniform(-0.006, 0.006)), P['bevel'])
            else:
                box(bm, (plane, rnd.uniform(-0.01, 0.01), z), (P['plank_t'], L, P['plank_h']), (tilt, 0, rnd.uniform(-0.006, 0.006)), P['bevel'])
    planks = finish(bm, 'planks', 'Plank_Brown')
    # ---- compost heap: a closed, faceted, displaced grid that fills the bay
    ix, iy = hx - pin - 0.004, hy - pin - 0.004
    nx, ny = P['heap_nx'], P['heap_ny']

    def height(x, y):
        u, v = x / ix, y / iy
        mound = P['heap_mound'] * max(0.0, 1 - (u * u * 0.8 + v * v * 0.8))
        z = P['heap_base'] + mound
        if v < -0.15:                                # slopes down to the low front board (the working face)
            t = min(1.0, (-0.15 - v) / 0.85)
            z = z * (1 - t ** 1.6) + P['heap_front'] * t ** 1.6
        return z

    bm = bmesh.new(); grid = {}
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = -ix + 2 * ix * i / nx; y = -iy + 2 * iy * j / ny
            edge = i in (0, nx) or j in (0, ny)
            if not edge:
                x += rnd.uniform(-0.3, 0.3) * ix / nx; y += rnd.uniform(-0.3, 0.3) * iy / ny
            z = height(x, y) + rnd.uniform(-1, 1) * P['heap_lump'] * (0.5 if edge else 1.0)
            grid[i, j] = bm.verts.new((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a, b, c, d = grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]
            if (i + j) % 2:
                bm.faces.new((a, b, c)); bm.faces.new((a, c, d))
            else:
                bm.faces.new((a, b, d)); bm.faces.new((b, c, d))
    ring = [grid[i, 0] for i in range(nx)] + [grid[nx, j] for j in range(ny)] + \
           [grid[i, ny] for i in range(nx, 0, -1)] + [grid[0, j] for j in range(ny, 0, -1)]
    low = [bm.verts.new((v.co.x, v.co.y, 0.02)) for v in ring]
    n = len(ring)
    for k in range(n):
        bm.faces.new((ring[(k + 1) % n], ring[k], low[k], low[(k + 1) % n]))
    bm.faces.new(low[::-1])
    for k in range(P['clods']):                     # loose clods: squat pyramids that break up the heap's surface
        x = rnd.uniform(-ix + 0.08, ix - 0.08); y = rnd.uniform(-iy + 0.08, iy - 0.08)
        z = height(x, y) - 0.01; r = rnd.uniform(0.04, 0.07); a0 = rnd.uniform(0, 2 * math.pi)
        base = [bm.verts.new((x + r * math.cos(a0 + t * 2.094), y + r * math.sin(a0 + t * 2.094), z)) for t in range(3)]
        top = bm.verts.new((x + rnd.uniform(-0.01, 0.01), y + rnd.uniform(-0.01, 0.01), z + r * rnd.uniform(0.7, 1.1)))
        for t in range(3):
            bm.faces.new((base[t], base[(t + 1) % 3], top))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    heap = finish(bm, 'compost', 'Soil_Compost')
    # ---- clippings: folded diamond leaf cards in two clumps, resting on the heap
    bm = bmesh.new()
    for cx, cy, rx, ry, count in P['clumps']:
        for k in range(count):
            a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random())
            x = cx + rx * r * math.cos(a); y = cy + ry * r * math.sin(a)
            x = max(-ix + 0.04, min(ix - 0.04, x)); y = max(-iy + 0.04, min(iy - 0.04, y))
            z = height(x, y) + P['heap_lump'] * 0.9
            L = rnd.uniform(*P['leaf_len']); w = L * P['leaf_w']
            yaw = rnd.uniform(0, 2 * math.pi); pitch = math.radians(rnd.uniform(5, 35)) * (1 - 0.5 * r)
            R = Matrix.Rotation(yaw, 3, 'Z') @ Matrix.Rotation(-pitch, 3, 'Y')
            fold = w * 0.35
            pts = [(0, 0, 0), (L * 0.45, w / 2, fold), (L, 0, 0.0), (L * 0.45, -w / 2, fold)]
            vs = [bm.verts.new(Vector((x, y, z)) + R @ Vector(p)) for p in pts]
            bm.faces.new((vs[0], vs[1], vs[2])); bm.faces.new((vs[0], vs[2], vs[3]))
    leaves = finish(bm, 'clippings', 'Leaf_Green')
    return [posts, planks, heap, leaves]


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    obs = build()
    dg = bpy.context.evaluated_depsgraph_get(); tris = 0
    for o in obs:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
    path = os.path.join(HERE, 'compost-bay.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    main()

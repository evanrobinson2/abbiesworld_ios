"""Compost bay, charming (storybook toy) version. Ranch tile garden prop, the charming twin of compost-bay
(replaces garden-assets-charming/GF-019.glb).  usage: python build.py

Same object, same conventions as models/compost-bay: a wide, low slatted timber bay heaped with dark compost and green
clippings. Z up, metres, origin at the footprint centre on the ground, front (the open working side, one board lower)
faces -Y. Same four objects and materials: posts (Timber_Post), planks (Plank_Brown), compost (Soil_Compost),
clippings (Leaf_Green).
Charming changes: chunky doubled corner boards (one per wall end, as in the hero) that lean out and end at uneven
heights with fat rounded tops, thick soft-edged planks that bow and wobble, walls that flare a little, a domed heap
of big clods that rises above the rim, and fat upright leaf sprigs.
"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    W=1.80, D=1.22,              # footprint at the ground; the out-leaning boards make the top 1.83 x 1.34, the normal bay ratio
    post_w=0.22, post_t=0.10,   # corner boards: width along their wall, thickness
    post_h=(1.08, 1.04, 1.16, 1.12),   # corner board heights, per corner (fl, fr, bl, br), uneven on purpose
    post_lean=0.07,              # corner boards lean out (rad)
    plank_h=0.29, plank_t=0.08, gap=0.045, z0=0.03, rows=3,
    front_rows=2,                # the front (-Y) wall is one board lower: the open working side
    flare=0.05,                 # walls lean out by this much (m) at the top row
    bow=0.025, wobble=0.045,      # plank belly (out) and random end-to-end tilt (rad)
    bevel=0.03, post_bevel=0.032,
    heap_base=0.90, heap_mound=0.08, heap_front=0.70, heap_lump=0.045, heap_nx=10, heap_ny=7, clods=40,
    clod_r=(0.05, 0.09),
    sprigs=[(-0.30, 0.22, 0.34, 0.22, 12), (0.55, 0.12, 0.18, 0.24, 7), (-0.02, -0.30, 0.16, 0.08, 4), (0.20, 0.36, 0.22, 0.10, 4)],
    blades=(4, 6), leaf_len=(0.18, 0.30), leaf_w=0.48,
    seed=11,
)
COL = dict(Timber_Post=(128, 78, 38), Plank_Brown=(156, 96, 50), Soil_Compost=(70, 46, 28), Leaf_Green=(98, 148, 40))


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def soft_box(s, bevel, cuts=0, axis=0):
    """Box of size s at the origin with a 1-segment chamfer, plus `cuts` loops across `axis` (for bending)."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
    bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=min(bevel, min(s) * 0.4), segments=1, affect='EDGES', profile=0.5)
    for k in range(cuts):
        t = -s[axis] / 2 + s[axis] * (k + 1) / (cuts + 1)
        no = Vector((0, 0, 0)); no[axis] = 1
        co = Vector((0, 0, 0)); co[axis] = t
        bmesh.ops.bisect_plane(tmp, geom=list(tmp.verts) + list(tmp.edges) + list(tmp.faces), plane_co=co, plane_no=no)
    return tmp


def place(bm, tmp, M):
    for v in tmp.verts:
        v.co = M @ v.co
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def finish(bm, name, material):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def wall_top(side):
    rows = P['front_rows'] if side == 'front' else P['rows']
    return P['z0'] + rows * P['plank_h'] + (rows - 1) * P['gap']


def flare(z):
    return P['flare'] * z / wall_top('back')


def build():
    rnd = random.Random(P['seed'])
    W, D, pw, pt = P['W'], P['D'], P['post_w'], P['post_t']
    hx, hy = W / 2, D / 2
    # ---- corner boards: two per corner, one closing each wall's end, leaning out, uneven heights
    bm = bmesh.new()
    for k, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        h = P['post_h'][k]
        for along in ('x', 'y'):
            lean = P['post_lean'] * rnd.uniform(0.6, 1.2)
            hh = h * (1.0 if along == 'x' else rnd.uniform(0.93, 0.98))
            tmp = soft_box((pw, pt, hh) if along == 'x' else (pt, pw, hh), P['post_bevel'])
            for v in tmp.verts:                     # fat soft tops: pinch the top ring a little
                if v.co.z > hh / 2 - 0.01:
                    v.co.x *= 0.88; v.co.y *= 0.88
            if along == 'x':                        # board in the X wall (front/back), at the wall's end
                c = (sx * (hx - pw / 2 - pt * 0.15), sy * (hy - pt / 2), hh / 2)
                R = Matrix.Rotation(-sy * lean, 4, 'X') @ Matrix.Rotation(sx * lean * 0.5, 4, 'Y')
            else:                                   # board in the Y wall (sides), tucked inside the X board
                c = (sx * (hx - pt / 2), sy * (hy - pt - pw / 2 + 0.01), hh / 2)
                R = Matrix.Rotation(-sx * lean, 4, 'Y') @ Matrix.Rotation(sy * lean * 0.5, 4, 'X')
            R = Matrix.Rotation(rnd.uniform(-0.05, 0.05), 4, 'Z') @ R
            for v in tmp.verts:                     # rotate about the board's foot
                v.co.z += hh / 2
            place(bm, tmp, Matrix.Translation(Vector((c[0], c[1], 0))) @ R)
    posts = finish(bm, 'posts', 'Timber_Post')
    # ---- planks: thick, bowed, wobbly, the walls flaring out towards the top
    bm = bmesh.new()
    for side, span, fixed, axis in (('front', W, -hy, 'x'), ('back', W, hy, 'x'), ('left', D, -hx, 'y'), ('right', D, hx, 'y')):
        rows = P['front_rows'] if side == 'front' else P['rows']
        plane = fixed - math.copysign(pt + P['plank_t'] / 2 - 0.02, fixed)
        L = span - 2 * pt - 0.02
        for r in range(rows):
            z = P['z0'] + r * (P['plank_h'] + P['gap']) + P['plank_h'] / 2 + rnd.uniform(-0.01, 0.01)
            out = flare(z)
            tilt = rnd.uniform(-P['wobble'], P['wobble'])
            if axis == 'x':
                tmp = soft_box((L, P['plank_t'], P['plank_h']), P['bevel'], 2, 0)
                for v in tmp.verts:                 # belly outwards
                    u = 2 * v.co.x / L; v.co.y += math.copysign(P['bow'], fixed) * (1 - u * u)
                M = Matrix.Translation(Vector((rnd.uniform(-0.015, 0.015), plane + math.copysign(out, fixed), z))) @ \
                    Matrix.Rotation(tilt, 4, 'Y') @ Matrix.Rotation(math.copysign(0.04, fixed) * -1, 4, 'X')
            else:
                tmp = soft_box((P['plank_t'], L, P['plank_h']), P['bevel'], 2, 1)
                for v in tmp.verts:
                    u = 2 * v.co.y / L; v.co.x += math.copysign(P['bow'], fixed) * (1 - u * u)
                M = Matrix.Translation(Vector((plane + math.copysign(out, fixed), rnd.uniform(-0.015, 0.015), z))) @ \
                    Matrix.Rotation(tilt, 4, 'X') @ Matrix.Rotation(math.copysign(0.04, fixed), 4, 'Y')
            place(bm, tmp, M)
    planks = finish(bm, 'planks', 'Plank_Brown')
    # ---- compost heap: a domed, faceted grid rising above the rim, plus big clods
    ix, iy = hx - pt - 0.01, hy - pt - 0.01
    nx, ny = P['heap_nx'], P['heap_ny']

    def height(x, y):
        u, v = x / ix, y / iy
        mound = P['heap_mound'] * max(0.0, 1 - (u * u * 0.7 + v * v * 0.7))
        z = P['heap_base'] + mound
        if v < -0.1:                                 # slopes down to the low front board (the working face)
            t = min(1.0, (-0.1 - v) / 0.9)
            z = z * (1 - t ** 1.5) + P['heap_front'] * t ** 1.5
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
    for k in range(P['clods']):                     # big round-ish clods: squat 4-sided pyramids
        x = rnd.uniform(-ix + 0.1, ix - 0.1); y = rnd.uniform(-iy + 0.1, iy - 0.1)
        r = rnd.uniform(*P['clod_r']); z = height(x, y) - 0.005; a0 = rnd.uniform(0, 2 * math.pi)
        base = [bm.verts.new((x + r * math.cos(a0 + t * 1.571), y + r * math.sin(a0 + t * 1.571), z)) for t in range(4)]
        top = bm.verts.new((x + rnd.uniform(-0.015, 0.015), y + rnd.uniform(-0.015, 0.015), z + r * rnd.uniform(0.8, 1.1)))
        for t in range(4):
            bm.faces.new((base[t], base[(t + 1) % 4], top))
    heap = finish(bm, 'compost', 'Soil_Compost')
    # ---- clippings: fat upright sprigs of folded blades, in the hero's four clumps
    bm = bmesh.new()
    for cx, cy, rx, ry, count in P['sprigs']:
        for k in range(count):
            a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random())
            x = cx + rx * r * math.cos(a); y = cy + ry * r * math.sin(a)
            x = max(-ix + 0.06, min(ix - 0.06, x)); y = max(-iy + 0.06, min(iy - 0.06, y))
            z = height(x, y) + 0.02
            nb = rnd.randint(*P['blades']); yaw0 = rnd.uniform(0, 2 * math.pi)
            for b in range(nb):
                L = rnd.uniform(*P['leaf_len']); w = L * P['leaf_w']
                yaw = yaw0 + 2 * math.pi * b / nb + rnd.uniform(-0.3, 0.3)
                pitch = math.radians(rnd.uniform(25, 65))          # up from the heap
                R = Matrix.Rotation(yaw, 3, 'Z') @ Matrix.Rotation(-pitch, 3, 'Y')
                fold = w * 0.3
                pts = [(0, 0, 0), (L * 0.5, w / 2, fold), (L, 0, 0.0), (L * 0.5, -w / 2, fold)]
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
        print(' ', o.name, len(m.loop_triangles))
    path = os.path.join(HERE, 'compost-bay-charming.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    main()

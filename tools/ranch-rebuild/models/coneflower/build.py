"""Coneflower (Ranch tile garden flower, replaces simulations/regional-assets/GF-679.glb): an upright clump of purple
coneflower (Echinacea), a bit taller than wide and flaring out at the top. A dense tuft of long narrow pointed leaves
splays out at the bottom third, a dozen-odd thin stems rise from it (the outer ones curving out), and 13 blooms sit at
different heights: each a raised faceted orange-brown cone over a shuttlecock skirt of drooping pink petal strips.

usage: python build.py      writes coneflower.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (plant group).
Built in plant units (top of the tallest cone ~ 1), then scaled so the top sits at HEIGHT, the old GLB's height.
Leaves and petals are cards on double-sided materials.
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'HEIGHT': 0.744,            # final top (m): the old GF-679 is 0.744 m tall and 0.41 x 0.40 m in plan
    'CAM_ELEV': 6,              # the hero's camera height (deg); cone tops are given as they appear in the hero
    # blooms: (x, v, y, R): x across, v the cone top's height in the hero, y depth (+ = back), R skirt radius
    'BLOOMS': [
        (0.124, 0.983, 0.08, 0.087), (-0.127, 0.919, 0.10, 0.080), (0.000, 0.861, 0.14, 0.084),
        (-0.294, 0.827, 0.02, 0.090), (0.328, 0.783, 0.00, 0.079), (-0.176, 0.712, 0.04, 0.079),
        (0.142, 0.728, 0.06, 0.099), (-0.198, 0.607, -0.10, 0.108), (0.000, 0.622, -0.02, 0.068),
        (0.118, 0.619, -0.08, 0.077), (-0.050, 0.449, -0.18, 0.084), (-0.207, 0.396, -0.16, 0.070),
        (0.167, 0.421, -0.14, 0.080),
    ],
    'X0': 0.0,                  # horizontal shift of the bloom table (the hero's clump axis)
    'R_SCALE': 1.32,
    'TILT_CAM': 0.12, 'TILT_OUT': 0.3,       # blooms nod a little towards the camera and out from the axis
    # bloom parts (x R)
    'CONE': (0.36, 0.32, 0.30, 0.55), 'CONE_SIDES': 5,        # base r, shoulder r, shoulder h, apex h
    'PETALS': 8, 'PETAL_ROOT': 0.26, 'PETAL_W': (0.24, 0.58),  # root radius, width at root and tip
    'PETAL_REACH': 1.0, 'PETAL_DROOP': (38, 52),              # horizontal reach and droop angle (deg)
    'PETAL_BEND': 14,                                          # extra droop on the outer half (deg)
    # stems
    'STEM_BASE_R': 0.06, 'STEM_R': (0.010, 0.006), 'STEM_SIDES': 3, 'STEM_SEGS': 3,
    'STEM_RISE': 0.55,          # how long a stem rises before it leans out to its bloom (fraction of its height)
    'STEM_LEAVES': 2, 'STEM_LEN': (0.16, 0.24), 'STEM_W': 0.028, 'STEM_AT': (0.3, 0.7),
    # base tuft
    'N_BASE': 51, 'BASE_LEN': (0.22, 0.38), 'BASE_W': 0.036, 'BASE_ELEV': (35, 75), 'BASE_Z': (0.0, 0.42),
    'BASE_R': 0.07, 'BASE_SQUASH_Y': 0.85,
    'DARK_SHARE': 0.35,
    'CORE': [], 'CORE_SIDES': 5,       # dark inner mass (off: it read as a pot)
    'SPREAD': 1.0,              # final horizontal stretch of the whole clump
    'SEED': 11,
}
COL = {'Flower_Petal_Pink': (226, 138, 184), 'Flower_Seed_Orange': (206, 92, 40), 'Stem_Green': (128, 132, 52),
       'Leaf_Green': (128, 130, 44), 'Leaf_Dark': (66, 72, 20)}
RND = random.Random(P['SEED'])


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.8
        m.use_backface_culling = False          # exported double-sided: leaf and petal cards show from both sides
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


def frame(t):
    t = t.normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
    u = up.cross(t).normalized(); return u, t.cross(u)


def tube(path, r0, r1, sides):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * i / (len(path) - 1)
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r for a in (2 * math.pi * k / sides for k in range(sides))])
    n = sides; V = [p for r in rings for p in r]; F = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        F += [(a + k, a + (k + 1) % n, b + (k + 1) % n, b + k) for k in range(n)]
    return V, F


# ------------------------------------------------------------------ blooms
def cone(c, up, R):
    """Faceted seed cone: a base ring, a narrower shoulder ring and an apex (the spiky dome, low-poly)."""
    br, sr, sh, ah = P['CONE']; u, v = frame(up); n = P['CONE_SIDES']; rot = RND.random() * 6.28
    V = []
    for k in range(n):
        a = rot + 2 * math.pi * k / n
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * br * R)
    for k in range(n):
        a = rot + 2 * math.pi * (k + 0.5) / n
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * sr * R + up * sh * R)
    V.append(c + up * ah * R); top = 2 * n
    F = []
    for k in range(n):
        F += [(k, (k + 1) % n, n + k), ((k + 1) % n, n + (k + 1) % n, n + k), (n + k, n + (k + 1) % n, top)]
    return V, F


def skirt(c, up, R):
    """A ring of drooping petal strips, each bent once: root at the cone base, tip out and down like a shuttlecock."""
    u, v = frame(up); n = P['PETALS']; rot = RND.random() * 6.28
    V, F = [], []
    for k in range(n):
        a = rot + 2 * math.pi * (k + RND.uniform(-0.15, 0.15)) / n
        out = u * math.cos(a) + v * math.sin(a); side = up.cross(out).normalized()
        dr = math.radians(RND.uniform(*P['PETAL_DROOP']))
        root = c + out * P['PETAL_ROOT'] * R
        reach = (P['PETAL_REACH'] - P['PETAL_ROOT']) * R * RND.uniform(0.88, 1.08)
        L = reach / math.cos(dr)
        d1 = out * math.cos(dr) - up * math.sin(dr)
        db = math.radians(P['PETAL_BEND']); d2 = out * math.cos(dr + db) - up * math.sin(dr + db)
        mid = root + d1 * L * 0.5; tip = mid + d2 * L * 0.55
        w0, w1 = P['PETAL_W'][0] * R / 2, P['PETAL_W'][1] * R / 2
        wm = (w0 + w1) / 2
        o = len(V)
        V += [root - side * w0, root + side * w0, mid + side * wm, mid - side * wm, tip + side * w1, tip - side * w1]
        F += [(o, o + 1, o + 2, o + 3), (o + 3, o + 2, o + 4, o + 5)]
    return V, F


def bloom_list():
    e = math.radians(P['CAM_ELEV'])
    out = []
    for x, vv, y, R in P['BLOOMS']:
        R *= P['R_SCALE']
        x += P['X0']
        top = (vv - y * math.sin(e)) / math.cos(e)
        c = Vector((x, y, top - P['CONE'][3] * R))
        h = Vector((x, y, 0))
        up = Vector((0, 0, 1)) + Vector((0, -1, 0)) * P['TILT_CAM'] + h * P['TILT_OUT']
        out.append((c, up.normalized(), R))
    return out


# ------------------------------------------------------------------ leaves
def leaf(base, d, side, L, W, droop):
    """Folded narrow lance leaf card: base, two side points (lifted along the midrib), tip dropped by droop. 2 tris."""
    nrm = d.cross(side).normalized()
    tip = base + d * L - Vector((0, 0, droop * L))
    s1 = base + d * (0.38 * L) + side * W + nrm * W * 0.35
    s2 = base + d * (0.38 * L) - side * W + nrm * W * 0.35
    return [base, s1, tip, s2], [(0, 1, 2), (0, 2, 3)]


def bez(p0, p1, p2, t):
    return p0 * (1 - t) ** 2 + p1 * 2 * t * (1 - t) + p2 * t * t


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    blooms = bloom_list()
    cones, skirts, stems = [], [], []
    leaves = {'Leaf_Green': [], 'Leaf_Dark': []}
    pick = lambda: 'Leaf_Dark' if RND.random() < P['DARK_SHARE'] else 'Leaf_Green'
    for i, (c, up, R) in enumerate(blooms):
        cones.append(cone(c, up, R)); skirts.append(skirt(c, up, R))
        h = Vector((c.x, c.y, 0)); hd = h.normalized() if h.length > 1e-3 else Vector((0, -1, 0))
        b = hd * P['STEM_BASE_R'] * RND.uniform(0.2, 1.0)
        foot = c - up * 0.01
        ctrl = Vector((b.x, b.y, foot.z * P['STEM_RISE'])) + (foot - b) * Vector((0.15, 0.15, 0))
        path = [bez(b, ctrl, foot, t / P['STEM_SEGS']) for t in range(P['STEM_SEGS'] + 1)]
        stems.append(tube(path, *P['STEM_R'], P['STEM_SIDES']))
        th = math.atan2(hd.x, -hd.y)
        for k in range(P['STEM_LEAVES']):
            t = RND.uniform(*P['STEM_AT'])
            p = bez(b, ctrl, foot, t)
            a = th + (1 if k % 2 else -1) * RND.uniform(0.6, 1.6)
            d = Vector((math.sin(a), -math.cos(a), RND.uniform(0.5, 1.1))).normalized()
            side = Vector((0, 0, 1)).cross(d).normalized()
            leaves[pick()].append(leaf(p, d, side, RND.uniform(*P['STEM_LEN']), P['STEM_W'], 0.2))
    # base tuft: long narrow pointed leaves splaying out low from the crown in every direction
    n = P['N_BASE']; ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        a = i * ga + RND.uniform(-0.2, 0.2)
        h = Vector((math.sin(a), -math.cos(a) * P['BASE_SQUASH_Y'], 0))
        z = P['BASE_Z'][0] + (P['BASE_Z'][1] - P['BASE_Z'][0]) * RND.random() ** 1.4   # more leaves low down
        base = h * RND.uniform(0.4, 1.0) * P['BASE_R'] * (1.2 - 0.5 * z / P['BASE_Z'][1]) + Vector((0, 0, z))
        el = math.radians(RND.uniform(*P['BASE_ELEV']) * (0.6 + 0.4 * z / P['BASE_Z'][1]))   # low leaves splay a little flatter
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Vector((0, 0, 1)).cross(d).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, d) @ side
        leaves[pick()].append(leaf(base, d, side, RND.uniform(*P['BASE_LEN']), P['BASE_W'], RND.uniform(0.1, 0.35)))
    # dark core that keeps the tuft solid between the cards
    ns = P['CORE_SIDES']; V = []; F = []
    for j, (z, r) in enumerate(P['CORE']):
        for k in range(ns):
            a = 2 * math.pi * (k + 0.5 * (j % 2)) / ns
            V.append(Vector((math.sin(a) * r, -math.cos(a) * r * P['BASE_SQUASH_Y'], z)))
    for j in range(len(P['CORE']) - 1):
        a0, b0 = j * ns, (j + 1) * ns
        for k in range(ns):
            F += [(a0 + k, a0 + (k + 1) % ns, b0 + k), (a0 + (k + 1) % ns, b0 + (k + 1) % ns, b0 + k)]
    if V:
        leaves['Leaf_Dark'].append((V, F))

    make('cones', *merge(*cones), 'Flower_Seed_Orange')
    make('petals', *merge(*skirts), 'Flower_Petal_Pink')
    V, F = merge(*stems); make('stems', [Vector((v[0], v[1], max(v[2], 0))) for v in V], F, 'Stem_Green')
    for name, lst in leaves.items():
        V, F = merge(*lst)
        make('leaves_' + name.split('_')[1].lower(), [Vector((v[0], v[1], max(v[2], 0.003))) for v in V], F, name)
    zmax = max((ob.matrix_world @ v.co).z for ob in bpy.context.scene.objects for v in ob.data.vertices)
    s = P['HEIGHT'] / zmax
    for ob in bpy.context.scene.objects:
        ob.data.transform(Matrix.Diagonal((s * P['SPREAD'], s * P['SPREAD'], s, 1.0)))


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'coneflower.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()

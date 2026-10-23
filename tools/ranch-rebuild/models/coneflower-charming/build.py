"""Coneflower, CHARMING (storybook toy) version of models/coneflower: the same clump, same materials and conventions,
but fewer, bigger, plumper blooms (9 instead of 13), domed seed cones, wide spoon petals with rounded tips, thicker
stems, broad ovate leaves and a soft-shaded finish, so it reads as a bouncy toy. Installs as the charming twin of
simulations/regional-assets/GF-679.glb.

Normal model notes follow. An upright clump of purple
coneflower (Echinacea), a bit taller than wide and flaring out at the top. A dense tuft of long narrow pointed leaves
splays out at the bottom third, a dozen-odd thin stems rise from it (the outer ones curving out), and 13 blooms sit at
different heights: each a raised faceted orange-brown cone over a shuttlecock skirt of drooping pink petal strips.

usage: python build.py      writes coneflower-charming.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (plant group).
Built in plant units (top of the tallest cone ~ 1), then scaled so the top sits at HEIGHT, the old GLB's height.
Leaves and petals are cards on double-sided materials.
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'HEIGHT': 0.744,            # final top (m): same as the normal model / old GF-679
    'CAM_ELEV': 6,
    # blooms measured on mj/coneflower-charming/hero.png: (x, v, y, R), units of the clump height
    'BLOOMS': [
        (-0.085, 1.000, 0.10, 0.123), (-0.266, 0.857, 0.04, 0.111), (0.038, 0.841, 0.12, 0.113),
        (0.216, 0.845, 0.08, 0.096), (-0.153, 0.735, 0.00, 0.090), (-0.028, 0.695, -0.08, 0.120),
        (-0.323, 0.616, -0.02, 0.075), (0.299, 0.666, 0.00, 0.090), (0.182, 0.498, -0.16, 0.105),
    ],
    'X0': 0.0,
    'R_SCALE': 1.42,
    'TILT_CAM': 0.15, 'TILT_OUT': 0.9,        # blooms nod towards the camera and lean well out (storybook lean)
    'CONE': (0.40, 0.42, 0.20, 0.46), 'CONE_SIDES': 6,        # plumper dome: wide shoulder, taller apex
    'PETALS': 7, 'PETAL_ROOT': 0.30, 'PETAL_W': (0.26, 0.66),  # wide spoon petals
    'PETAL_REACH': 1.0, 'PETAL_DROOP': (42, 55),
    'PETAL_BEND': 22,
    'STEM_BASE_R': 0.05, 'STEM_R': (0.020, 0.012), 'STEM_SIDES': 3, 'STEM_SEGS': 3,
    'STEM_RISE': 0.55,
    'STEM_LEAVES': 2, 'STEM_LEN': (0.24, 0.34), 'STEM_W': 0.06, 'STEM_AT': (0.3, 0.7),
    'N_BASE': 40, 'BASE_LEN': (0.22, 0.38), 'BASE_W': 0.06, 'BASE_ELEV': (52, 80), 'BASE_Z': (0.0, 0.52),
    'BASE_R': 0.05, 'BASE_SQUASH_Y': 0.85,
    'DARK_SHARE': 0.35,
    'CORE': [], 'CORE_SIDES': 5,
    'SPREAD': 1.0,
    'LEAN': 0.04,               # the whole clump leans a touch to the right as it rises (x += LEAN * z^2 / H)
    'SMOOTH': ('cones', 'petals', 'stems'),   # soft-shaded parts (the toy finish); leaves stay faceted
    'SEED': 11,
}
COL = {'Flower_Petal_Pink': (232, 132, 182), 'Flower_Seed_Orange': (214, 96, 40), 'Stem_Green': (120, 128, 44),
       'Leaf_Green': (122, 140, 52), 'Leaf_Dark': (64, 84, 28)}
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
        p.use_smooth = name in P['SMOOTH']
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
    for k in range(n):                       # rounded crown ring: the dome bulges before the apex (plump, toy-like)
        a = rot + 2 * math.pi * k / n
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * sr * 0.72 * R + up * (sh + (ah - sh) * 0.62) * R)
    V.append(c + up * ah * R); top = 3 * n
    F = []
    for k in range(n):
        k1 = (k + 1) % n
        F += [(k, k1, n + k), (k1, n + k1, n + k)]
        F += [(n + k, n + k1, 2 * n + k1), (n + k, 2 * n + k1, 2 * n + k), (2 * n + k, 2 * n + k1, top)]
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
        nose = tip + d2 * w1 * 0.8              # rounded spoon tip (charming): a short point past the tip edge
        V += [root - side * w0, root + side * w0, mid + side * wm, mid - side * wm, tip + side * w1, tip - side * w1, nose]
        F += [(o, o + 1, o + 2, o + 3), (o + 3, o + 2, o + 4, o + 5), (o + 5, o + 4, o + 6)]
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
    """Broad ovate leaf card (charming): base, a wide pair at 0.35 L, a narrower pair at 0.7 L, a soft tip, folded
    along the midrib (side points lifted) and drooping. 6 verts, 4 tris."""
    nrm = d.cross(side).normalized()
    tip = base + d * L - Vector((0, 0, droop * L))
    mid = base + d * (0.7 * L) - Vector((0, 0, droop * L * 0.5))
    s1 = base + d * (0.35 * L) + side * W + nrm * W * 0.3
    s2 = base + d * (0.35 * L) - side * W + nrm * W * 0.3
    t1 = mid + side * W * 0.62 + nrm * W * 0.2
    t2 = mid - side * W * 0.62 + nrm * W * 0.2
    return [base, s1, t1, tip, t2, s2], [(0, 1, 5), (1, 2, 4), (1, 4, 5), (2, 3, 4)]


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
        for v in ob.data.vertices:
            v.co.x += P['LEAN'] * v.co.z ** 2 / P['HEIGHT']


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'coneflower-charming.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()

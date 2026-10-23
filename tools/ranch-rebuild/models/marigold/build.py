"""Marigold (Ranch tile garden flower, replaces simulations/regional-assets/GF-250.glb): an upright bushy clump of pot
marigold, a bit taller than wide and wider at the top. A dense base of narrow pointed leaves splays out low, leafy
upright stems rise through it, and about 16 big pom-pom double blooms are held at different heights in a loose dome,
the tallest at the top centre and the outer ones leaning out.

usage: python build.py      writes marigold.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (plant group).
Built in plant units (top of the tallest bloom ~ 1), then scaled so the top sits at HEIGHT, the old GLB's height.
Each bloom is a ruffled ball: a drooping jagged orange star, a raised gold star on top, and an orange under-cone.
Leaves are folded diamond cards (2 triangles each) on double-sided materials.
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'HEIGHT': 0.315,            # final top (m): the old GF-250 is 0.315 m tall and 0.30 x 0.33 m in plan
    'CAM_ELEV': 22,             # the hero's camera height (deg); bloom heights are given as they appear in the hero
    # blooms: (x, v, y, R): x across, v the height in the hero image, y depth (+ = back), R bloom radius (plant units)
    'BLOOMS': [
        (0.03, 0.905, 0.05, 0.105), (-0.27, 0.78, 0.10, 0.095), (-0.11, 0.78, 0.16, 0.085), (0.17, 0.82, 0.12, 0.075),
        (0.26, 0.72, 0.18, 0.075), (0.185, 0.675, -0.02, 0.082), (-0.15, 0.64, -0.03, 0.082), (0.02, 0.64, -0.06, 0.088),
        (0.33, 0.585, 0.00, 0.078), (-0.37, 0.53, 0.00, 0.095), (-0.24, 0.45, -0.12, 0.088), (0.09, 0.41, -0.20, 0.088),
        (0.41, 0.43, 0.05, 0.072), (-0.09, 0.285, -0.27, 0.078), (-0.05, 0.70, 0.30, 0.085), (0.10, 0.52, 0.32, 0.08),
    ],
    'R_SCALE': 1.35,
    'FACE_CAM': 0.55,           # how far a bloom turns its face from straight up towards the camera side (-Y)
    'LEAN_OUT': 0.9,            # extra outward lean, x horizontal offset from the axis
    # three stacked jagged rings, cupped upward, each turned half a tip from the one below so the outline ruffles:
    # (tips, tip r, notch r, tip h, notch h, centre h) in x R, and the material
    'RINGS': [(7, 1.00, 0.80, 0.06, -0.04, 0.26, 'Flower_Petal_Orange'),
              (6, 0.76, 0.58, 0.38, 0.26, 0.50, 'Flower_Petal_Amber'),
              (5, 0.42, 0.26, 0.66, 0.54, 0.74, 'Flower_Petal_Gold')],
    'UNDER': 0.50,              # orange under-cone depth (x R), closes the ball from below
    'JAG': 0.14,                # random tip radius and height variation
    # stems
    'STEM_BASE_R': 0.10, 'STEM_R': (0.011, 0.007), 'STEM_SIDES': 3,
    # leaves: base rosette and leaves up the stems
    'N_BASE': 34, 'BASE_LEN': (0.26, 0.42), 'BASE_W': 0.042, 'BASE_ELEV': (10, 55),
    'STEM_LEAVES': 3, 'STEM_LEN': (0.15, 0.24), 'STEM_W': 0.032, 'STEM_AT': (0.2, 0.45),
    'N_MID': 39, 'MID_Z': (0.12, 0.46), 'MID_LEN': (0.24, 0.34), 'MID_W': 0.045,   # leaves on the core surface
    'BASE_SQUASH_Y': 0.85,
    'DARK_SHARE': 0.35,
    # dark inner leaf mass that keeps the clump solid
    'CORE': [(0.0, 0.10), (0.13, 0.24), (0.30, 0.26), (0.44, 0.17), (0.52, 0.06)], 'CORE_LUMP': 0.25, 'CORE_SIDES': 6,
    'SPREAD': 1.0,              # final horizontal stretch of the whole clump
    'SEED': 1,
}
COL = {'Flower_Petal_Orange': (236, 112, 24), 'Flower_Petal_Amber': (246, 146, 40), 'Flower_Petal_Gold': (250, 178, 50), 'Stem_Green': (104, 122, 44),
       'Leaf_Green': (98, 130, 42), 'Leaf_Dark': (40, 62, 18)}
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
        m.use_backface_culling = False          # exported double-sided: leaf cards and petal stars show from both sides
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
def star(c, up, R, tips, spec, rot):
    """A jagged star cone: tips and notches round a raised centre (one ring of petals)."""
    tr, nr, th, nh, ch = spec; u, v = frame(up)
    V = [c + up * ch * R]
    for k in range(2 * tips):
        a = rot + math.pi * k / tips
        if k % 2 == 0:
            j = RND.uniform(-P['JAG'], P['JAG'])
            r, h = tr * R * (1 + j), (th + j) * R
        else:
            r, h = nr * R, nh * R
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * r + up * h)
    m = 2 * tips
    return V, [(0, 1 + k, 1 + (k + 1) % m) for k in range(m)]


def bloom(c, up, R):
    """A ruffled pom-pom: three stacked rings, wide orange, lighter mid, small gold-orange heart, plus an under-cone.
    Returns {material: (verts, faces)} and the stem foot."""
    rot = RND.random() * 6.28; out = {}
    for i, (tips, *spec, name) in enumerate(P['RINGS']):
        V, F = star(c, up, R, tips, spec, rot + i * math.pi / tips)
        if i == 0:
            bot = len(V); V.append(c - up * P['UNDER'] * R); m = 2 * tips
            F += [(bot, 1 + (k + 2) % m, 1 + k) for k in range(1, m, 2)]
        out[name] = (V, F)
    return out, c - up * P['UNDER'] * R


def bloom_list():
    e = math.radians(P['CAM_ELEV'])
    out = []
    for x, vv, y, R in P['BLOOMS']:
        R *= P['R_SCALE']
        z = (vv - y * math.sin(e)) / math.cos(e)
        c = Vector((x + RND.uniform(-0.01, 0.01), y, z))
        h = Vector((x, y, 0))
        up = Vector((0, 0, 1)) + Vector((0, -1, 0)) * P['FACE_CAM'] + h * P['LEAN_OUT']
        out.append((c, up.normalized(), R))
    return out


# ------------------------------------------------------------------ leaves
def leaf(base, d, side, L, W, droop):
    """Folded diamond leaf card: base, two side points (lifted along the midrib), tip dropped by droop. 2 triangles."""
    nrm = d.cross(side).normalized()
    tip = base + d * L - Vector((0, 0, droop * L))
    s1 = base + d * (0.42 * L) + side * W + nrm * W * 0.35
    s2 = base + d * (0.42 * L) - side * W + nrm * W * 0.35
    return [base, s1, tip, s2], [(0, 1, 2), (0, 2, 3)]


def core_r(z):
    pr = P['CORE']
    for (z0, r0), (z1, r1) in zip(pr, pr[1:]):
        if z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return pr[-1][1]


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    blooms = bloom_list()
    petals, stems = {r[-1]: [] for r in P['RINGS']}, []
    leaves = {'Leaf_Green': [], 'Leaf_Dark': []}
    pick = lambda: 'Leaf_Dark' if RND.random() < P['DARK_SHARE'] else 'Leaf_Green'
    for i, (c, up, R) in enumerate(blooms):
        parts, foot = bloom(c, up, R)
        for name, vf in parts.items():
            petals[name].append(vf)
        h = Vector((c.x, c.y, 0)); hd = h.normalized() if h.length > 1e-3 else Vector((0, -1, 0))
        th = math.atan2(c.x, -c.y) + RND.uniform(-0.4, 0.4)
        b = Vector((math.sin(th), -math.cos(th), 0)) * P['STEM_BASE_R'] * RND.uniform(0.2, 1.0)
        mid = b.lerp(foot, 0.5) + hd * 0.03
        stems.append(tube([b, foot - up * 0.02], *P['STEM_R'], P['STEM_SIDES']))
        # leaves up the stem, angled out and up
        for k in range(P['STEM_LEAVES']):
            t = RND.uniform(*P['STEM_AT'])
            p = b.lerp(foot, t) + hd * 0.03 * math.sin(t * math.pi)
            a = th + (1 if k % 2 else -1) * RND.uniform(0.6, 1.4)
            d = Vector((math.sin(a), -math.cos(a), RND.uniform(0.4, 0.9))).normalized()
            side = Vector((0, 0, 1)).cross(d).normalized()
            leaves[pick()].append(leaf(p, d, side, RND.uniform(*P['STEM_LEN']), P['STEM_W'], 0.15))
    # base rosette: narrow leaves splaying out low from the crown in every direction
    n = P['N_BASE']; ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        a = i * ga + RND.uniform(-0.2, 0.2)
        h = Vector((math.sin(a), -math.cos(a) * P['BASE_SQUASH_Y'], 0))
        base = h * RND.uniform(0.0, 0.09) + Vector((0, 0, RND.uniform(0.0, 0.14)))
        el = math.radians(RND.uniform(*P['BASE_ELEV']))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Vector((0, 0, 1)).cross(d).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, d) @ side
        leaves[pick()].append(leaf(base, d, side, RND.uniform(*P['BASE_LEN']), P['BASE_W'], RND.uniform(0.15, 0.4)))
    # mid leaves: out of the core surface, angled out and up, so the clump reads full between the stems
    for i in range(P['N_MID']):
        a = i * ga + RND.uniform(-0.3, 0.3)
        z = RND.uniform(*P['MID_Z'])
        h = Vector((math.sin(a), -math.cos(a) * P['BASE_SQUASH_Y'], 0))
        base = h * core_r(z) * 0.7 + Vector((0, 0, z))
        el = math.radians(RND.uniform(15, 60))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
        leaves[pick()].append(leaf(base, d, side, RND.uniform(*P['MID_LEN']), P['MID_W'], RND.uniform(0.1, 0.3)))
    # dark core
    ns = P['CORE_SIDES']; V = []; F = []
    for j, (z, r) in enumerate(P['CORE']):
        for k in range(ns):
            a = 2 * math.pi * (k + 0.5 * (j % 2)) / ns
            rr = r * (1 + P['CORE_LUMP'] * math.sin(3 * a + 2.1 * j))     # lumpy, so it reads as leaf clumps
            V.append(Vector((math.sin(a) * rr, -math.cos(a) * rr * P['BASE_SQUASH_Y'], z)))
    for j in range(len(P['CORE']) - 1):
        a0, b0 = j * ns, (j + 1) * ns
        for k in range(ns):
            F += [(a0 + k, a0 + (k + 1) % ns, b0 + k), (a0 + (k + 1) % ns, b0 + (k + 1) % ns, b0 + k)]
    top = len(V); V.append(Vector((0, 0, P['CORE'][-1][0] + 0.06))); a0 = (len(P['CORE']) - 1) * ns
    F += [(a0 + k, a0 + (k + 1) % ns, top) for k in range(ns)]
    leaves['Leaf_Dark'].append((V, F))

    for name, lst in petals.items():
        make('blooms_' + name.split('_')[-1].lower(), *merge(*lst), name)
    V, F = merge(*stems); make('stems', [Vector((v[0], v[1], max(v[2], 0))) for v in V], F, 'Stem_Green')
    for name, lst in leaves.items():
        V, F = merge(*lst)
        make('leaves_' + name.split('_')[1].lower(), [Vector((v[0], v[1], max(v[2], 0.005))) for v in V], F, name)
    # scale to the old model's height
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
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'marigold.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()

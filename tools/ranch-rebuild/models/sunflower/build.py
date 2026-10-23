"""Sunflower for the Ranch tile (replaces simulations/regional-assets/GF-567.glb).

A single tall sunflower in the hero's low-poly faceted look: one thick, slightly wavy stalk (Stem_Green) on a small
irregular dirt patch (Soil_Dirt); six broad heart-shaped leaf cards (Leaf_Green, folded along the midrib, drooping,
double-sided) on short petioles alternating left and right; a big face-forward head tilted a few degrees down: a dark
domed seed disc with a raised rim (Seed_Brown) inside two rings of pointed, ridged petals (Petal_Gold in front,
Petal_Amber behind), closed at the back by a green receptacle.
Z up, metres, origin at the base on the ground, front -Y. No animation. Height and footprint follow the old GLB
(0.60 x 0.59 x 1.585 m), because to_game copies the GLB with no rescale.
usage: python build.py            (writes sunflower.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=7,
    height=1.585,                   # top of the head, as the old GF-567.glb
    # stalk centreline (x, y, z) from the hero, slightly wavy, ending inside the back of the head
    stem_path=[(-0.006, 0, 0.0), (-0.010, 0, 0.25), (-0.012, 0, 0.45), (0.004, 0, 0.66), (-0.010, 0, 0.88),
               (-0.018, 0.01, 1.04), (-0.012, 0.03, 1.20), (-0.006, 0.03, 1.27)],
    stem_r=(0.034, 0.024), stem_sides=6,
    soil_r=(0.15, 0.11), soil_h=0.008, soil_n=9,
    head_c=(-0.015, -0.045, 1.295), head_tilt=8.0,     # head centre; tilt in degrees face-down
    disc_r=0.092, disc_rim=0.030, disc_dip=0.006, disc_dome=0.024, disc_n=12,
    back=dict(n=22, r0=0.060, L=0.205, w=0.100, ridge=0.012, lift=-0.035, col='Petal_Amber', phase=0.5),
    mid=dict(n=20, r0=0.068, L=0.188, w=0.100, ridge=0.016, lift=-0.010, col='Petal_Gold', phase=0.25),
    front=dict(n=20, r0=0.066, L=0.160, w=0.095, ridge=0.018, lift=0.015, col='Petal_Gold', phase=0.75),
    petal_jit=0.12,
    petal_wide=0.48,                # widest point of a petal along its length
    recept_r=0.10, recept_d=0.075,
    # leaves: node height on the stalk, petiole end offset (x, y, dz), blade direction (x, y, z), length, width, droop
    leaves=[
        dict(z=0.97, pet=(0.075, -0.01, 0.09), d=(0.85, -0.10, -0.32), L=0.24, W=0.17, droop=0.02),   # upper right
        dict(z=0.91, pet=(-0.050, -0.05, 0.00), d=(-0.55, -0.15, -0.80), L=0.27, W=0.28, droop=0.03),  # upper left, front
        dict(z=0.95, pet=(-0.040, 0.05, 0.00), d=(-0.60, 0.20, -0.75), L=0.23, W=0.17, droop=0.03),   # upper left, behind
        dict(z=0.645, pet=(0.095, 0.00, 0.04), d=(0.74, -0.10, -0.64), L=0.26, W=0.19, droop=0.03),    # right
        dict(z=0.52, pet=(-0.105, 0.00, 0.05), d=(-0.72, -0.05, -0.58), L=0.21, W=0.19, droop=0.03),  # left
        dict(z=0.42, pet=(0.025, -0.05, 0.00), d=(0.22, -0.30, -0.93), L=0.21, W=0.21, droop=0.03),   # low, front
    ],
    leaf_face=(0.0, -1.0, 0.25),    # leaves turn their faces towards the front and a little up
    crease=0.10,                    # midrib fold depth, as a fraction of the width
    pet_r=0.008,
)

COL = {  # sRGB, sampled from the hero
    'Stem_Green': (0.38, 0.40, 0.15), 'Leaf_Green': (0.27, 0.37, 0.15),
    'Petal_Gold': (0.93, 0.67, 0.25), 'Petal_Amber': (0.82, 0.52, 0.16),
    'Seed_Brown': (0.40, 0.19, 0.05), 'Soil_Dirt': (0.68, 0.43, 0.22),
}


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.75 if name.startswith(('Leaf', 'Petal')) else 0.85
    m.use_backface_culling = False          # exported as doubleSided: leaf and petal cards render from both sides
    return m


def obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = False
    me.materials.append(material(mat))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def add(a, b, k=1.0):
    return tuple(a[i] + k * b[i] for i in range(3))


def norm(v):
    L = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / L for x in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def dot(a, b):
    return sum(a[i] * b[i] for i in range(3))


def tube(path, radii, sides, V, F, rng=None, cap=True):
    """A faceted tube along path (radius per point)."""
    base = len(V)
    for i, p in enumerate(path):
        t = norm(tuple(path[min(i + 1, len(path) - 1)][k] - path[max(i - 1, 0)][k] for k in range(3)))
        a = norm(cross(t, (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0))); b = cross(t, a)
        for j in range(sides):
            th = 2 * math.pi * j / sides + i * 0.35
            r = radii[i] * (1 + (rng.uniform(-0.08, 0.08) if rng else 0))
            V.append(add(add(p, a, r * math.cos(th)), b, r * math.sin(th)))
    for i in range(len(path) - 1):
        for j in range(sides):
            a0 = base + i * sides + j; a1 = base + i * sides + (j + 1) % sides
            F.append((a0, a1, a1 + sides)); F.append((a0, a1 + sides, a0 + sides))
    if cap:
        top = base + (len(path) - 1) * sides
        V.append(path[-1]); c = len(V) - 1
        for j in range(sides):
            F.append((top + j, top + (j + 1) % sides, c))


def stem_at(z):
    sp = P['stem_path']
    for a, b in zip(sp, sp[1:]):
        if a[2] <= z <= b[2]:
            t = (z - a[2]) / (b[2] - a[2]); return tuple(a[k] + t * (b[k] - a[k]) for k in range(3))
    return sp[-1]


def build_stem(rng):
    V, F = [], []
    sp = P['stem_path']; r0, r1 = P['stem_r']
    path = [sp[0]]
    for a, b in zip(sp, sp[1:]):
        path.append(b)
    zt = sp[-1][2]
    radii = [r1 + (r0 - r1) * (1 - p[2] / zt) ** 1.6 + (0.006 if p[2] < 0.05 else 0) for p in path]
    path[0] = (path[0][0], path[0][1], 0.0)
    tube(path, radii, P['stem_sides'], V, F, rng)
    # petioles: short tubes from the stalk to each blade
    for lf in P['leaves']:
        s = stem_at(lf['z']); e = add(s, lf['pet'])
        if math.dist(s, e) > 0.03:
            m = tuple((s[k] + e[k]) / 2 for k in range(3)); m = (m[0], m[1], m[2] + 0.012)
            tube([s, m, e], [P['pet_r'] * 1.3, P['pet_r'], P['pet_r'] * 0.8], 3, V, F)
    # green receptacle at the back of the head
    c, n, e1, e2 = head_frame()
    k = 10
    ring = [add(add(add(c, e1, P['recept_r'] * math.cos(2 * math.pi * j / k)), e2, P['recept_r'] * math.sin(2 * math.pi * j / k)), n, -0.005)
            for j in range(k)]
    b0 = len(V); V += ring; V.append(add(c, n, -P['recept_d'])); tip = len(V) - 1
    for j in range(k):
        F.append((b0 + (j + 1) % k, b0 + j, tip))
    obj('stem', V, F, 'Stem_Green')


def build_soil(rng):
    V, F = [], []
    n = P['soil_n']; rx, ry = P['soil_r']; h = P['soil_h']
    for j in range(n):
        a = 2 * math.pi * j / n + rng.uniform(-0.15, 0.15); f = rng.uniform(0.8, 1.1)
        V.append((rx * f * math.cos(a) - 0.015, ry * f * math.sin(a), 0.0))
        V.append((rx * f * 0.88 * math.cos(a) - 0.015, ry * f * 0.88 * math.sin(a), h * rng.uniform(0.7, 1.0)))
    V.append((-0.015, 0, h * 1.2)); c = len(V) - 1
    for j in range(n):
        a0, a1 = 2 * j, 2 * ((j + 1) % n)
        F.append((a0, a1, a1 + 1)); F.append((a0, a1 + 1, a0 + 1)); F.append((a0 + 1, a1 + 1, c))
    obj('soil', V, F, 'Soil_Dirt')


def build_leaves(rng):
    V, F = [], []
    # heart outline: (u along the midrib from the petiole, v as a share of the half width)
    side = [(-0.12, 0.50), (0.06, 0.95), (0.30, 1.00), (0.55, 0.80), (0.78, 0.45), (0.92, 0.16)]
    rib = [0.03, 0.25, 0.50, 0.75]
    for lf in P['leaves']:
        base = add(stem_at(lf['z']), lf['pet'])
        d = norm(lf['d']); face = norm(P['leaf_face'])
        acr = norm(cross(d, face)); nrm = norm(cross(acr, d))
        if dot(nrm, face) < 0:
            nrm = tuple(-x for x in nrm)
        L, W = lf['L'] * rng.uniform(0.97, 1.03), lf['W']

        def pt(u, v, lift=0.0):
            p = add(add(base, d, u * L), acr, v * W / 2)
            p = add(p, nrm, lift - P['crease'] * W * (1 - abs(v)) * 0.5)
            return (p[0], p[1], p[2] - lf['droop'] * max(u, 0) ** 2 * L * 4)
        R = [pt(u, 0) for u in rib] + [pt(1.0, 0)]
        b = len(V); V += R
        for sgn in (1, -1):
            s0 = len(V)
            V += [pt(u, sgn * v, rng.uniform(-0.01, 0.01)) for u, v in side]
            # rib i = b+i (0..4, 4 = tip); side j = s0+j
            tri = [(0, s0 - s0 + 0, 1), (0, 1, 'r1'), ('r1', 1, 2), ('r1', 2, 'r2'), ('r2', 2, 3), ('r2', 3, 'r3'),
                   ('r3', 3, 4), ('r3', 4, 5), ('r3', 5, 'tip')]
            for t in tri:
                if t[0] == 0 and t[1] == 0:
                    f = (b + 0, s0 + 0, s0 + 1)
                elif t[0] == 0:
                    f = (b + 0, s0 + 1, b + 1)
                else:
                    m = {'r1': b + 1, 'r2': b + 2, 'r3': b + 3, 'tip': b + 4}
                    f = tuple(m[x] if isinstance(x, str) else s0 + x for x in t)
                F.append(f if sgn > 0 else (f[0], f[2], f[1]))
    obj('leaves', V, F, 'Leaf_Green')


def head_frame():
    t = math.radians(P['head_tilt'])
    n = (0.0, -math.cos(t), -math.sin(t))
    e1 = (1.0, 0.0, 0.0); e2 = cross(n, e1)
    return P['head_c'], n, e1, e2


def build_head(rng):
    c, n, e1, e2 = head_frame()

    def hp(r, a, h):
        return add(add(add(c, e1, r * math.cos(a)), e2, r * math.sin(a)), n, h)
    for ring in ('back', 'mid', 'front'):
        R = P[ring]; V, F = [], []
        for i in range(R['n']):
            a = 2 * math.pi * (i + R['phase']) / R['n'] + rng.uniform(-0.04, 0.04)
            L = R['L'] * rng.uniform(1 - P['petal_jit'], 1 + P['petal_jit'] * 0.5); w = R['w'] * rng.uniform(0.9, 1.1)
            r0 = R['r0']; lift = R['lift'] * rng.uniform(0.6, 1.3)
            q = len(V)
            ux, uy = math.cos(a), math.sin(a)

            def P2(u, v, h):
                r = r0 + u * L
                p = add(add(c, e1, r * ux - v * uy), e2, r * uy + v * ux)
                return add(p, n, h + lift * u * u)
            V += [P2(0, 0, 0), P2(P['petal_wide'], -w / 2, 0), P2(P['petal_wide'], w / 2, 0), P2(0.22, 0, R['ridge']),
                  P2(0.66, 0, R['ridge']), P2(1.0, 0, 0), P2(0.78, -w * 0.36, 0.002), P2(0.78, w * 0.36, 0.002)]
            for f in ((0, 1, 3), (0, 3, 2), (3, 1, 4), (3, 4, 2), (1, 6, 4), (4, 7, 2), (6, 5, 4), (4, 5, 7)):
                F.append(tuple(q + k for k in f))
        obj('petals_' + ring, V, F, R['col'])
    # seed disc: domed, with a raised rim and a shallow trough inside it
    V, F = [], []
    k = P['disc_n']; rr = P['disc_r']
    rings = [(rr, 0.004), (rr * 0.93, P['disc_rim']), (rr * 0.62, P['disc_dip']), (rr * 0.30, P['disc_dome'] * 0.85)]
    for i, (r, h) in enumerate(rings):
        for j in range(k):
            V.append(hp(r * rng.uniform(0.97, 1.03), 2 * math.pi * (j + 0.5 * (i % 2)) / k, h + rng.uniform(-0.002, 0.002)))
    for i in range(len(rings) - 1):
        for j in range(k):
            a0 = i * k + j; a1 = i * k + (j + 1) % k
            b0 = (i + 1) * k + j; b1 = (i + 1) * k + (j + 1) % k
            if i % 2 == 0:
                F.append((a0, a1, b0)); F.append((a1, b1, b0))
            else:
                F.append((a0, a1, b1)); F.append((a0, b1, b0))
    V.append(add(c, n, P['disc_dome'])); cc = len(V) - 1
    last = (len(rings) - 1) * k
    for j in range(k):
        F.append((last + j, last + (j + 1) % k, cc))
    # orient faces towards the viewer (the disc faces -Y)
    F = [f if dot(cross(tuple(V[f[1]][q] - V[f[0]][q] for q in range(3)), tuple(V[f[2]][q] - V[f[0]][q] for q in range(3))), n) > 0
         else (f[0], f[2], f[1]) for f in F]
    obj('seed_disc', V, F, 'Seed_Brown')


def main(path=os.path.join(HERE, 'sunflower.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    build_soil(rng); build_stem(rng); build_leaves(rng); build_head(rng)
    # scale the whole plant uniformly so its top sits at the old GLB's height (to_game copies with no rescale)
    top = max(v.co.z for o in bpy.context.scene.objects for v in o.data.vertices)
    k = P['height'] / top
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co *= k
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    pts = [v.co for o in bpy.context.scene.objects for v in o.data.vertices]
    dims = [max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('dims %.3f x %.3f x %.3f' % tuple(dims), 'zmin %.3f' % min(p[2] for p in pts))
    print('triangles', tris)


if __name__ == '__main__':
    main()

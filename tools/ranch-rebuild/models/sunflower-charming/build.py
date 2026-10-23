"""Charming sunflower for the Ranch tile (storybook twin of models/sunflower; installs as the charming GF-567.glb).

Same structure, materials and conventions as the normal sunflower, reshaped to the charming hero: a chubby, nearly
straight stalk (Stem_Green) with a flared foot on a small dirt mound (Soil_Dirt); four big plump oval leaves
(Leaf_Green, cushioned and folded, double-sided) on stout petioles; an oversized face-forward head (about 0.70 m
across, 44 % of the height) turned a few degrees to the side: three rings of fat, blunt, cupped toy petals (Petal_Gold
in front, Petal_Amber behind), a fat Petal_Amber doughnut rim round a sunken Seed_Brown hollow, closed at the back by
a green receptacle.
Z up, metres, origin at the base on the ground, front -Y. No animation. Top at 1.585 m like the old GLB.
usage: python build.py            (writes sunflower-charming.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=11,
    height=1.585,                   # top of the head, as the old GF-567.glb and the normal sunflower
    # stalk centreline (x, y, z) from the charming hero: nearly straight, a soft bow, ending inside the back of the head
    stem_path=[(0.003, 0, 0.0), (0.016, 0, 0.20), (0.022, 0, 0.40), (0.018, 0, 0.60), (0.010, 0.01, 0.78),
               (0.008, 0.02, 0.95), (0.012, 0.03, 1.10), (0.010, 0.04, 1.20)],
    stem_r=(0.036, 0.027), stem_sides=6, foot=0.012,
    soil_r=(0.10, 0.08), soil_h=0.018, soil_n=9,
    head_c=(-0.014, -0.040, 1.262), head_tilt=4.0, head_yaw=7.0,   # head centre; tilt face-down, yaw towards +X
    rim_r=0.112, rim_in=0.058, rim_h=0.050, rim_n=14,              # the fat toy doughnut round the seed hollow
    hollow_dip=0.012,
    back=dict(n=18, r0=0.085, L=0.265, w=0.125, ridge=0.024, lift=-0.040, col='Petal_Amber', phase=0.5),
    mid=dict(n=18, r0=0.090, L=0.225, w=0.125, ridge=0.032, lift=0.010, col='Petal_Gold', phase=0.0),
    front=dict(n=16, r0=0.092, L=0.165, w=0.118, ridge=0.036, lift=0.055, col='Petal_Gold', phase=0.25),
    petal_jit=0.10, petal_twist=0.10,
    petal_wide=0.50,                # widest point of a petal along its length
    droop_low=0.10,                 # petals in the lower half hang a little longer (the hero's sagging chin)
    recept_r=0.12, recept_d=0.085,
    # leaves: node height on the stalk, petiole end offset (x, y, dz), blade direction (x, y, z), length, width, droop
    leaves=[
        dict(z=0.875, pet=(0.025, -0.05, 0.07), d=(-0.97, -0.10, -0.22), L=0.33, W=0.17, droop=0.015),  # upper left
        dict(z=0.71, pet=(0.062, -0.02, 0.13), d=(0.97, -0.05, -0.22), L=0.29, W=0.15, droop=0.015),   # upper right, long petiole
        dict(z=0.57, pet=(0.040, -0.06, 0.01), d=(-1.00, -0.10, -0.14), L=0.33, W=0.20, droop=0.015),  # big low left
        dict(z=0.44, pet=(-0.008, -0.05, 0.09), d=(0.94, -0.08, -0.34), L=0.37, W=0.21, droop=0.010),  # big low right
    ],
    leaf_face=(0.0, -1.0, 0.35),    # leaves turn their faces towards the front and up
    crease=0.08,                    # midrib fold depth, as a fraction of the width
    puff=0.05,                      # blade cushion: the middle of each half bulges up, as a fraction of the width
    pet_r=0.010,
)

COL = {  # sRGB, sampled from the charming hero
    'Stem_Green': (0.42, 0.45, 0.10), 'Leaf_Green': (0.36, 0.48, 0.16),
    'Petal_Gold': (0.98, 0.78, 0.22), 'Petal_Amber': (0.93, 0.60, 0.13),
    'Seed_Brown': (0.80, 0.45, 0.15), 'Soil_Dirt': (0.66, 0.44, 0.24),
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
    radii = [r1 + (r0 - r1) * (1 - p[2] / zt) ** 1.6 + (P['foot'] if p[2] < 0.05 else 0) for p in path]
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
        V.append((rx * f * math.cos(a) + P['stem_path'][0][0], ry * f * math.sin(a), 0.0))
        V.append((rx * f * 0.6 * math.cos(a) + P['stem_path'][0][0], ry * f * 0.6 * math.sin(a), h * rng.uniform(0.7, 1.0)))
    V.append((P['stem_path'][0][0], 0, h * 1.6)); c = len(V) - 1
    for j in range(n):
        a0, a1 = 2 * j, 2 * ((j + 1) % n)
        F.append((a0, a1, a1 + 1)); F.append((a0, a1 + 1, a0 + 1)); F.append((a0 + 1, a1 + 1, c))
    obj('soil', V, F, 'Soil_Dirt')


def build_leaves(rng):
    V, F = [], []
    # heart outline: (u along the midrib from the petiole, v as a share of the half width)
    side = [(-0.06, 0.55), (0.08, 0.92), (0.30, 1.00), (0.55, 0.90), (0.78, 0.58), (0.93, 0.24)]   # plump oval, soft heart base
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
            p = add(p, nrm, lift - P['crease'] * W * (1 - abs(v)) * 0.5 + P['puff'] * W * math.sin(math.pi * min(abs(v), 1.0)))
            return (p[0], p[1], p[2] - lf['droop'] * max(u, 0) ** 2 * L * 4)
        R = [pt(u, 0) for u in rib] + [pt(1.0, 0)]
        b = len(V); V += R
        for sgn in (1, -1):
            s0 = len(V)
            V += [pt(u, sgn * v, rng.uniform(-0.005, 0.005)) for u, v in side]
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
    t, y = math.radians(P['head_tilt']), math.radians(P['head_yaw'])
    n = (math.sin(y) * math.cos(t), -math.cos(y) * math.cos(t), -math.sin(t))
    e1 = norm((math.cos(y), math.sin(y), 0.0)); e2 = cross(n, e1)
    return P['head_c'], n, e1, e2


def facing(V, F, n):
    return [f if dot(cross(tuple(V[f[1]][q] - V[f[0]][q] for q in range(3)), tuple(V[f[2]][q] - V[f[0]][q] for q in range(3))), n) > 0
            else (f[0], f[2], f[1]) for f in F]


def build_head(rng):
    c, n, e1, e2 = head_frame()

    def hp(r, a, h):
        return add(add(add(c, e1, r * math.cos(a)), e2, r * math.sin(a)), n, h)
    # three rings of plump, rounded toy petals: a raised two-step midrib and a blunt tip (10 triangles each)
    shape = [(0, 0, 0), (0.25, -0.40, 0), (0.55, -0.50, 0), (0.84, -0.34, 0), (1.0, 0, 0),
             (0.84, 0.34, 0), (0.55, 0.50, 0), (0.25, 0.40, 0), (0.30, 0, 1), (0.66, 0, 1)]
    tris = ((0, 1, 8), (0, 8, 7), (1, 2, 8), (8, 2, 9), (7, 8, 6), (8, 9, 6), (2, 3, 9), (9, 3, 4), (6, 9, 5), (9, 4, 5))
    for ring in ('back', 'mid', 'front'):
        R = P[ring]; V, F = [], []
        for i in range(R['n']):
            a = 2 * math.pi * (i + R['phase']) / R['n'] + rng.uniform(-0.05, 0.05)
            low = max(0.0, -math.sin(a))                     # 1 at the bottom of the head
            L = R['L'] * rng.uniform(1 - P['petal_jit'], 1 + P['petal_jit'] * 0.5) * (1 + P['droop_low'] * low)
            w = R['w'] * rng.uniform(0.9, 1.1)
            r0 = R['r0']; lift = R['lift'] * rng.uniform(0.6, 1.3); tw = rng.uniform(-1, 1) * P['petal_twist']
            q = len(V)
            ux, uy = math.cos(a), math.sin(a)

            def P2(u, v, h):
                r = r0 + u * L
                p = add(add(c, e1, r * ux - v * uy), e2, r * uy + v * ux)
                return add(p, n, h + lift * u * u + tw * v)
            V += [P2(u, v * w, k * R['ridge']) for u, v, k in shape]
            F += [tuple(q + k for k in f) for f in tris]
        obj('petals_' + ring, V, facing(V, F, n), R['col'])
    # the fat doughnut rim round the seed hollow (Petal_Amber), a domed ring of 4 bands
    V, F = [], []
    k = P['rim_n']; ro, ri, hh = P['rim_r'], P['rim_in'], P['rim_h']
    rings = [(ro, 0.0), (ro * 0.97, hh * 0.65), ((ro + ri) / 2, hh), (ri * 1.04, hh * 0.65), (ri * 0.92, 0.0)]
    for i, (r, h) in enumerate(rings):
        for j in range(k):
            V.append(hp(r * rng.uniform(0.95, 1.05), 2 * math.pi * (j + 0.5 * (i % 2)) / k, h + rng.uniform(-0.004, 0.004)))
    for i in range(len(rings) - 1):
        for j in range(k):
            a0 = i * k + j; a1 = i * k + (j + 1) % k; b0 = (i + 1) * k + j; b1 = (i + 1) * k + (j + 1) % k
            if i % 2 == 0:
                F.append((a0, a1, b0)); F.append((a1, b1, b0))
            else:
                F.append((a0, a1, b1)); F.append((a0, b1, b0))
    obj('disc_rim', V, facing(V, F, n), 'Petal_Amber')
    # seed hollow (Seed_Brown): a shallow dish sunk inside the rim
    V, F = [], []
    m = 10
    for j in range(m):
        V.append(hp(ri * 0.96, 2 * math.pi * j / m, 0.004))
    V.append(hp(0, 0, -P['hollow_dip'])); cc = len(V) - 1
    for j in range(m):
        F.append((j, (j + 1) % m, cc))
    obj('seed_disc', V, facing(V, F, n), 'Seed_Brown')


def main(path=os.path.join(HERE, 'sunflower-charming.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    build_soil(rng); build_stem(rng); build_leaves(rng); build_head(rng)
    # scale the whole plant uniformly so its top sits at the old GLB's height (to_game copies with no rescale)
    top = max(v.co.z for o in bpy.context.scene.objects for v in o.data.vertices)
    k = P['height'] / top
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co *= k
    for o in bpy.context.scene.objects:          # stalk foot jitter can dip a hair below the ground
        for v in o.data.vertices:
            v.co.z = max(v.co.z, 0.0)
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

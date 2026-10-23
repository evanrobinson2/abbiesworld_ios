"""Bramble, charming (storybook toy) version, for the Ranch tile's charming set. Same game slot and conventions as
models/bramble (replaces simulations/regional-assets-charming/WW-273.glb): a chubby leafy mound sitting right of
centre, one fat green cane arching up out of it and curling over to the left, where it droops a berry and a lilac
bud, and a low runner trailing berries along the ground on the left. Oversized plump leaves, big glossy berries,
lilac flower buds.
usage: python build.py   (writes bramble-charming.glb next to this file)

Z up, metres, origin at the footprint centre on the ground, front -Y. Footprint width/depth as the normal model
(2.12 x 1.06); FIT scales each axis to the box last.
"""
import os, math
import numpy as np
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'bramble-charming.glb')

P = {
    'seed': 11,
    'fit': (2.12, 1.06, 1.30),         # final width (X), depth (Y), height (Z) of the bounding box
    # mound: ellipse footprint (right of centre, as in the hero) and a height profile along X
    'mound_c': (0.16, 0.0), 'mound_r': (0.92, 0.46),
    'mound_h': [(-0.80, 0.10), (-0.55, 0.42), (-0.35, 0.62), (-0.10, 0.60), (0.10, 0.70), (0.30, 0.68), (0.55, 0.60),
                (0.75, 0.60), (0.92, 0.48), (1.08, 0.14)],
    'core': 0.78,                       # the shade core dome sits at this fraction of the mound height
    'mound_leaves': 38,
    'crown_leaves': 13,               # leafy crown round the sprig, right of the arch's root (x, z box below)
    'crown_box': ((0.12, 0.72), (0.70, 1.12)),
    'mound_leaf_len': (0.26, 0.36),     # plump oversized leaves
    'leaf_len': (0.17, 0.24),           # leaves along the cane
    'cane_step': 0.17,
    # the big arching cane (cubic Bezier control points, base radius): rises from the mound and curls over left
    'canes': [
        [(0.26, 0.06, 0.55), (0.02, 0.04, 1.30), (-0.78, 0.0, 1.32), (-0.88, -0.06, 0.86), 0.034],
        # an upright sprig on the right crown, and the ground runner trailing left
        [(0.40, 0.04, 0.60), (0.40, 0.04, 0.85), (0.38, 0.04, 1.05), (0.34, 0.02, 1.22), 0.020],
        [(-0.40, -0.10, 0.22), (-0.62, -0.18, 0.26), (-0.86, -0.20, 0.18), (-1.02, -0.22, 0.10), 0.026],
    ],
    # berry clusters: (cane index, t) hanging from canes, then free positions (x, y, z) in the mound and on the ground
    'berries_hang': [(0, 1.0), (0, 0.48), (0, 0.30), (0, 0.15)],
    'berries_free': [(-0.24, 0.0, 1.22), (0.10, -0.22, 0.64), (0.26, -0.18, 0.84), (0.42, -0.36, 0.48), (0.66, -0.34, 0.52),
                     (-0.30, -0.36, 0.30), (-0.15, -0.46, 0.18), (-0.42, -0.44, 0.07), (-0.01, -0.50, 0.08),
                     (0.24, -0.48, 0.09), (-0.66, -0.30, 0.32), (-0.82, -0.26, 0.26), (-0.99, -0.24, 0.08)],
    'berry_r': 0.056,                   # drupelet radius: a berry is about 0.17 m across, toy-big
    # lilac buds (x, y, z, size)
    'buds': [(-0.93, -0.08, 0.92, 1.2), (-0.73, -0.06, 0.88, 0.9), (-0.82, -0.04, 1.02, 0.8), (0.06, -0.12, 0.92, 0.9),
             (0.18, -0.10, 0.94, 1.0), (0.36, -0.32, 0.66, 1.2), (0.50, -0.30, 0.66, 1.1), (0.58, -0.36, 0.45, 1.1),
             (0.58, -0.18, 0.84, 0.9), (0.30, -0.38, 0.52, 0.8), (-0.37, -0.44, 0.24, 1.0), (-0.04, -0.46, 0.24, 1.0),
             (-0.92, -0.20, 0.36, 0.9), (0.34, -0.20, 0.80, 0.8)],
    'bud_r': 0.072,
}

COL = {  # sRGB, sampled from the hero
    'Leaf_Bramble': (0.30, 0.50, 0.17),
    'Leaf_BrambleLight': (0.42, 0.62, 0.25),
    'Leaf_BrambleShade': (0.18, 0.33, 0.10),
    'Stem_Cane': (0.40, 0.55, 0.22),
    'Berry_Black': (0.13, 0.08, 0.19),
    'Flower_Lilac': (0.74, 0.60, 0.86),
}
SMOOTH = {'Flower_Lilac', 'Stem_Cane', 'Leaf_BrambleShade', 'Leaf_Bramble', 'Leaf_BrambleLight'}

rng = np.random.default_rng(P['seed'])
GEO = {k: ([], []) for k in COL}


def lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.35 if name.startswith('Berry') else (0.7 if name.startswith(('Leaf', 'Flower')) else 0.8)
    m.use_backface_culling = False          # exported as doubleSided: leaf cards render from both sides
    return m


def add(mat, verts, faces):
    V, F = GEO[mat]; o = len(V)
    V.extend([tuple(map(float, v)) for v in verts]); F.extend([tuple(i + o for i in f) for f in faces])


def unit(v):
    v = np.asarray(v, float); n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def bezier(c, t):
    p0, p1, p2, p3 = map(np.asarray, c[:4])
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def tube(pts, r0, r1, sides, mat='Stem_Cane', cap=True):
    pts = [np.asarray(p, float) for p in pts]; n = len(pts); verts = []; faces = []
    for i, p in enumerate(pts):
        t = unit(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)])
        a = unit(np.cross(t, (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0))); b = np.cross(t, a)
        r = r0 + (r1 - r0) * i / (n - 1)
        for k in range(sides):
            ang = 2 * math.pi * k / sides
            verts.append(p + r * (math.cos(ang) * a + math.sin(ang) * b))
    for i in range(n - 1):
        for k in range(sides):
            a0, a1 = i * sides + k, i * sides + (k + 1) % sides
            faces.append((a0, a1, a1 + sides)); faces.append((a0, a1 + sides, a0 + sides))
    if cap:                                  # a rounded nub at the tip: toy canes end in a bead, not a cut
        tip = pts[-1] + unit(pts[-1] - pts[-2]) * r1 * 1.2; verts.append(tip); c = len(verts) - 1; o = (n - 1) * sides
        faces += [(o + k, o + (k + 1) % sides, c) for k in range(sides)]
    add(mat, verts, faces)


# plump rounded leaf with a soft point (x across, y along), fanned from a puffed-up centre: 8 triangles
LEAF = [(0, 0), (0.42, 0.18), (0.56, 0.46), (0.40, 0.76), (0, 1.0), (-0.40, 0.76), (-0.56, 0.46), (-0.42, 0.18)]


def leaf(base, fwd, nrm, size, mat):
    f = unit(fwd); s = unit(np.cross(nrm, f))
    if np.linalg.norm(s) < 0.5:
        s = unit(np.cross((0, 0, 1), f))
    u = unit(np.cross(f, s))
    w = size * rng.uniform(0.95, 1.1)
    ring = [np.asarray(base) + size * y * f + w * x * s - (x * x) * size * 0.35 * u for x, y in LEAF]   # edges cup down
    centre = np.asarray(base) + size * 0.48 * f + size * 0.14 * u                                        # puffy middle
    verts = ring + [centre]; c = len(ring)
    add(mat, verts, [(c, i, (i + 1) % c) for i in range(c)])


def berry_cluster(p, r):
    """A chubby toy blackberry: a lumpy faceted ball (6 x 4 sphere, 36 tris) whose vertices push out and in
    alternately, so the flat facets read as plump drupelets from the game's distance."""
    p = np.asarray(p, float); R = r * 1.75; nu, nv = 6, 4; a0 = rng.uniform(0, 2 * math.pi)
    verts = [p + (0, 0, R * 1.02)]
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = a0 + 2 * math.pi * (i + 0.5 * (j % 2)) / nu
            k = 1.0 + 0.13 * (1 if (i + j) % 2 else -1) + rng.normal(0, 0.03)
            verts.append(p + R * k * np.array((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th) * 1.05)))
    verts.append(p - (0, 0, R * 0.98))
    f = [(0, 1 + i, 1 + (i + 1) % nu) for i in range(nu)]
    for j in range(nv - 2):
        for i in range(nu):
            a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu
            f += [(a, b + nu, b), (a, a + nu, b + nu)] if j % 2 == 0 else [(a, a + nu, b), (b, a + nu, b + nu)]
    bot = len(verts) - 1; o = 1 + (nv - 2) * nu
    f += [(o + i, bot, o + (i + 1) % nu) for i in range(nu)]
    add('Berry_Black', verts, f)


def bud(p, s):
    """A lilac flower bud: a plump rounded five-sided bulb (20 tris) in a three-pointed green cup (3 tris)."""
    p = np.asarray(p, float); r = P['bud_r'] * s
    tilt = unit(np.array((0, -0.3, 1.0)) + rng.normal(0, 0.35, 3))
    a = unit(np.cross(tilt, (1, 0, 0))); b = np.cross(tilt, a)
    ring = [p + r * (math.cos(k * 1.2566) * a + math.sin(k * 1.2566) * b) for k in range(5)]
    ring2 = [p + tilt * r * 0.75 + r * 0.8 * (math.cos(k * 1.2566 + 0.63) * a + math.sin(k * 1.2566 + 0.63) * b) for k in range(5)]
    top, bot = p + tilt * r * 1.25, p - tilt * r * 0.75
    f = [(k, (k + 1) % 5, 5 + k) for k in range(5)] + [((k + 1) % 5, 5 + (k + 1) % 5, 5 + k) for k in range(5)]
    f += [(5 + k, 5 + (k + 1) % 5, 10) for k in range(5)] + [((k + 1) % 5, k, 11) for k in range(5)]
    add('Flower_Lilac', ring + ring2 + [top, bot], f)
    cup = [p - tilt * r * 0.9] + [p - tilt * r * 0.1 + r * 0.95 * (math.cos(k * 2.094) * a + math.sin(k * 2.094) * b) for k in range(3)]
    add('Leaf_Bramble', cup, [(0, 1, 2), (0, 2, 3), (0, 3, 1)])


def mound_height(x, y):
    xs, hs = zip(*P['mound_h'])
    h = float(np.interp(x, xs, hs))
    cx, cy = P['mound_c']; rx, ry = P['mound_r']
    q = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2
    return h * max(q, 0) ** 0.35 / max(1 - ((x - cx) / rx) ** 2, 1e-3) ** 0.35 if q > 0 else 0.0


def build_mound():
    cx, cy = P['mound_c']; rx, ry = P['mound_r']
    # shade core: a fat dome so the mound reads solid and chubby between the leaves
    nu, nv = 12, 3; verts = []; faces = []
    for j in range(nv + 1):
        for i in range(nu):
            a = 2 * math.pi * i / nu; s = 1 - j / (nv + 0.6)
            x, y = cx + rx * 0.86 * s * math.cos(a), cy + ry * 0.84 * s * math.sin(a)
            verts.append((x, y, P['core'] * mound_height(x, y) if j else 0.0))
    top = len(verts); verts.append((cx, cy, P['core'] * mound_height(cx, cy)))
    for j in range(nv):
        for i in range(nu):
            a, b = j * nu + i, j * nu + (i + 1) % nu
            faces += [(a, b, b + nu), (a, b + nu, a + nu)]
    faces += [(nv * nu + i, nv * nu + (i + 1) % nu, top) for i in range(nu)]
    add('Leaf_BrambleShade', verts, faces)
    # big plump leaves shingled over the mound on a jittered grid, facing out and front, the upper ones light
    n = P['mound_leaves']; k = 0; tries = 0
    while k < n and tries < 5000:
        tries += 1
        x = cx + rx * rng.uniform(-1.0, 1.0); y = cy + ry * (1.0 - 2.0 * rng.random() ** 0.8)
        if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 0.92:
            continue
        z = mound_height(x, y); e = 0.02
        g = unit(np.array([-(mound_height(x + e, y) - mound_height(x - e, y)) / (2 * e),
                           -(mound_height(x, y + e) - mound_height(x, y - e)) / (2 * e), 1]))
        out = unit((x - cx, (y - cy) * 1.4, 0.0))
        nrm = unit(0.6 * g + np.array((0, -0.5, 0.5)) + rng.normal(0, 0.25, 3))
        fwd = unit(0.9 * out + np.array((0, 0, 0.55)) + rng.normal(0, 0.3, 3))
        fwd = unit(fwd - nrm * np.dot(fwd, nrm))
        size = rng.uniform(*P['mound_leaf_len'])
        base = np.array((x, y, max(z - 0.16, 0.02)))
        mat = 'Leaf_BrambleLight' if (nrm[2] > 0.55 and z > 0.45 and rng.random() < 0.45) else 'Leaf_Bramble'
        leaf(base, fwd, nrm, size, mat); k += 1
    # big skirt leaves lying out on the ground round the front and the right end (the hero's wide right flank)
    for (x, y, z, d, s) in [(0.86, -0.10, 0.30, (1, -0.2, 0.25), 0.40), (0.78, -0.32, 0.12, (0.8, -0.6, 0.1), 0.38),
                            (0.92, 0.18, 0.22, (1, 0.3, 0.2), 0.36), (0.42, -0.42, 0.06, (0.3, -1, 0.1), 0.32),
                            (-0.25, -0.40, 0.06, (-0.3, -1, 0.1), 0.30), (0.05, -0.44, 0.06, (0.1, -1, 0.1), 0.30),
                            (-0.50, -0.28, 0.10, (-0.6, -0.8, 0.3), 0.30), (-0.48, -0.20, 0.25, (-0.2, -0.3, 1.0), 0.30)]:
        dd = unit(d)
        leaf((x, y, z), dd, unit(np.array((0, -0.3, 1.0)) - dd * 0.3), s, 'Leaf_Bramble')


def build_canes():
    for ci, c in enumerate(P['canes']):
        ts = np.linspace(0, 1, 10 if ci == 0 else 5)
        pts = [bezier(c, t) for t in ts]
        tube(pts, c[4], c[4] * 0.6, 6 if ci == 0 else 4)
        L = sum(np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1))
        n = max(2, int(L / P['cane_step'])); side = 1
        for k in range(n):
            t = 0.12 + 0.78 * (k + rng.uniform(0.2, 0.6)) / n
            p = bezier(c, t); tan = unit(bezier(c, min(t + 0.01, 1)) - bezier(c, max(t - 0.01, 0)))
            up = unit(np.cross(tan, (0, 1, 0))); up = up if up[2] > 0 else -up
            if ci == 2:                       # ground runner: leaves lie low and spread
                fwd = unit(side * np.array((0, -1, 0)) + 0.6 * tan + (0, 0, 0.5)); side = -side
                nrm = unit((0, -0.3, 1))
            else:                             # arch: leaves stand up off the top on little stalks, alternating sides
                fwd = unit(up + side * 0.6 * tan + (0, -0.2, 0) + rng.normal(0, 0.2, 3)); side = -side
                nrm = unit(np.array((0, -0.8, 0.4)) + rng.normal(0, 0.25, 3))
                q = p + fwd * 0.06; tube([p, q], 0.010, 0.008, 3, cap=False); p = q
            size = rng.uniform(*P['leaf_len'])
            leaf(p, fwd, nrm, size, 'Leaf_BrambleLight' if (ci != 2 and rng.random() < 0.55) else 'Leaf_Bramble')
        if ci < 2:                            # a pair of leaves at the tip, like the hero's sprigs
            tip = bezier(c, 1.0); tan = unit(bezier(c, 1.0) - bezier(c, 0.93))
            for j in (-1, 1):
                leaf(tip, unit(tan + j * 0.9 * unit(np.cross(tan, (0, 1, 0))) + (0, 0, 0.3)), unit((0, -0.8, 0.4)),
                     rng.uniform(0.15, 0.2), 'Leaf_BrambleLight' if j > 0 else 'Leaf_Bramble')
    # the hero's leaf pair standing above the arch's crown, on a short stalk
    p = bezier(P['canes'][0], 0.40); q = p + np.array((-0.10, 0.0, 0.18))
    tube([p, q], 0.012, 0.009, 4)
    for d in ((-1, 0, 0.35), (0.5, 0, 0.8)):
        leaf(q, unit(d), unit((0, -1, 0.2)), 0.27, 'Leaf_BrambleLight' if d[0] > 0 else 'Leaf_Bramble')


def build_crown():
    (x0, x1), (z0, z1) = P['crown_box']
    for k in range(P['crown_leaves']):
        p = np.array((rng.uniform(x0, x1), rng.uniform(-0.25, 0.05), rng.uniform(z0, z1)))
        fwd = unit(np.array((p[0] - 0.4, 0, 0.6)) + rng.normal(0, 0.4, 3))
        nrm = unit(np.array((0, -0.8, 0.4)) + rng.normal(0, 0.3, 3))
        leaf(p, fwd, nrm, rng.uniform(0.18, 0.25), 'Leaf_BrambleLight' if rng.random() < 0.4 else 'Leaf_Bramble')


def build_berries():
    r = P['berry_r']
    for ci, t in P['berries_hang']:
        c = P['canes'][ci]; p = bezier(c, t)
        q = p + np.array((0, -0.06, -0.10)) if t < 1 else p + np.array((0.02, -0.02, -0.12))
        tube([p, q], 0.008, 0.006, 3, cap=False)
        berry_cluster(q + (0, 0, -r * 1.6), r)
    for x, y, z in P['berries_free']:
        berry_cluster((x, y, max(z, r * 1.9)), r)


def build_buds():
    for x, y, z, s in P['buds']:
        bud((x, y, z), s)


def fit():
    allv = np.array([v for V, _ in GEO.values() for v in V])
    lo, hi = allv.min(0), allv.max(0)
    sc = np.array(P['fit']) / (hi - lo)
    c = (lo + hi) / 2
    for k, (V, F) in GEO.items():
        GEO[k] = ([((x - c[0]) * sc[0], (y - c[1]) * sc[1], (z - lo[2]) * sc[2]) for x, y, z in V], F)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_mound(); build_canes(); build_crown(); build_berries(); build_buds(); fit()
    names = {'Leaf_Bramble': 'leaves_dark', 'Leaf_BrambleLight': 'leaves_light', 'Stem_Cane': 'canes', 'Berry_Black': 'berries',
             'Leaf_BrambleShade': 'mound_core', 'Flower_Lilac': 'buds'}
    tot = 0
    for k, (V, F) in GEO.items():
        me = bpy.data.meshes.new(names[k]); me.from_pydata(V, [], F); me.update()
        if k in SMOOTH:
            me.shade_smooth()
        me.materials.append(material(k))
        ob = bpy.data.objects.new(names[k], me); bpy.context.scene.collection.objects.link(ob)
        tot += len(F)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=False, export_apply=True)
    allv = np.array([v for V, _ in GEO.values() for v in V])
    print('triangles', tot, 'size', np.round(allv.max(0) - allv.min(0), 3), {k: len(F) for k, (V, F) in GEO.items()})


if __name__ == '__main__':
    main()

"""Bramble (blackberry) for the Ranch tile: a wide, low leafy mound with long canes arching up from the left and
down on the right, hung with blackberry clusters. Replaces simulations/regional-assets/WW-273.glb.
usage: python build.py   (writes bramble.glb next to this file)

Z up, metres, origin at the footprint centre on the ground, front -Y. Built to the old GLB's size (2.12 wide x
1.94 deep x 0.745 tall) because to_game.py copies the GLB with no rescale; FIT does that last, exactly.
"""
import os, math
import numpy as np
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'bramble.glb')

P = {
    'seed': 7,
    'fit': (2.12, 1.94, 1.06),         # final width (X), depth (Y), height (Z) of the bounding box
    'leaf_len': (0.15, 0.22),           # leaf length range on the canes (m, before FIT)
    'mound_leaf_len': (0.15, 0.21),
    # mound: ellipse footprint (pushed to the front) and a height profile along X (left side higher)
    'mound_c': (0.0, -0.08), 'mound_r': (0.98, 0.46),
    'mound_h': [(-1.05, 0.08), (-0.85, 0.44), (-0.55, 0.58), (-0.2, 0.40), (0.25, 0.31), (0.6, 0.25), (0.85, 0.18), (1.05, 0.06)],
    'core': 0.55,                       # the dark core dome sits at this fraction of the mound height,
    'mound_leaves': 62,
    'mound_up': 0.45,                   # share of mound leaves lying on top (the rest stand on the flanks),
    'cane_step': 0.075,                  # spacing of leaves along the arching canes
    'shoot_every': 8,
    'band_leaf': 1.25,                  # size of the upright leaves that thicken the arch's band                   # a side shoot at every n-th cane leaf
    # arching canes, rooted at the back of the mound: cubic Bezier control points (x, y, z) and base radius
    'canes': [
        [(-0.64, 0.10, 0.0), (-0.66, 0.10, 0.86), (0.62, 0.14, 1.12), (0.98, 0.04, 0.26), 0.016],
        [(-0.52, 0.22, 0.0), (-0.46, 0.22, 0.80), (0.70, 0.24, 1.00), (0.88, 0.18, 0.32), 0.013],
        [(-0.76, -0.04, 0.0), (-0.84, -0.04, 0.56), (-0.24, -0.06, 0.76), (-0.04, -0.10, 0.36), 0.011],
    ],
    # berry clusters: (cane index, t) for hanging ones, then free positions (x, y, z) on the mound and the ground
    'berries_hang': [(0, 0.15), (0, 0.42), (0, 0.66), (1, 0.78), (0, 0.86), (0, 1.0), (2, 0.25)],
    'berries_free': [(-0.88, -0.30, 0.24), (-0.45, -0.44, 0.24), (-0.05, -0.46, 0.20), (0.62, -0.36, 0.16),
                     (0.18, -0.66, 0.035), (0.44, -0.62, 0.035)],
    'berry_balls': (3, 5),
    'berry_r': 0.037,
}

COL = {  # sRGB, sampled from the hero
    'Leaf_Bramble': (0.25, 0.44, 0.15),
    'Leaf_BrambleLight': (0.42, 0.62, 0.24),
    'Leaf_BrambleShade': (0.12, 0.24, 0.07),
    'Stem_Cane': (0.52, 0.42, 0.17),
    'Berry_Black': (0.07, 0.05, 0.13),
}

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
    b.inputs['Roughness'].default_value = 0.45 if name.startswith('Berry') else (0.75 if name.startswith('Leaf') else 0.85)
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


def tube(pts, r0, r1, sides, mat='Stem_Cane'):
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
    add(mat, verts, faces)


# three-lobed, serrated outline (x across, y along the leaf), fanned from a raised centre: 6 triangles, faceted
LEAF = [(0, 0), (0.50, 0.32), (0.30, 0.58), (0, 1.0), (-0.30, 0.58), (-0.50, 0.32)]


def leaf(base, fwd, nrm, size, mat):
    f = unit(fwd); s = unit(np.cross(nrm, f))
    if np.linalg.norm(s) < 0.5:
        s = unit(np.cross((0, 0, 1), f))
    u = unit(np.cross(f, s))
    w = size * rng.uniform(0.9, 1.1)
    ring = [np.asarray(base) + size * y * f + w * x * s - abs(x) * size * 0.18 * u for x, y in LEAF]
    centre = np.asarray(base) + size * 0.45 * f + size * 0.07 * u
    verts = ring + [centre]; c = len(ring)
    add(mat, verts, [(c, i, (i + 1) % c) for i in range(c)])


def berry_cluster(p, nb, r):
    """A lumpy blackberry: nb jittered octahedral drupelet balls packed into a lump."""
    p = np.asarray(p, float)
    offs = [(0, 0, 0), (0.9, 0, -0.5), (-0.9, 0.2, -0.4), (0.1, -0.9, -0.6), (0.0, 0.7, -1.2), (0.5, -0.4, -1.5)]
    for k in range(nb):
        c = p + r * 1.15 * np.asarray(offs[k]) + rng.normal(0, r * 0.12, 3)
        rr = r * rng.uniform(0.9, 1.15)
        a0 = rng.uniform(0, 2 * math.pi)   # a jittered triangular bipyramid: 6 faceted triangles
        bp = [c + rr * np.array((math.cos(a0 + k2 * 2.094), math.sin(a0 + k2 * 2.094), 0)) * rng.uniform(0.9, 1.1) for k2 in range(3)]
        bp += [c + (0, 0, rr * 1.1), c - (0, 0, rr * 1.1)]
        add('Berry_Black', bp, [(0, 1, 3), (1, 2, 3), (2, 0, 3), (1, 0, 4), (2, 1, 4), (0, 2, 4)])


def mound_height(x, y):
    xs, hs = zip(*P['mound_h'])
    h = float(np.interp(x, xs, hs))
    cx, cy = P['mound_c']; rx, ry = P['mound_r']
    q = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2
    return h * max(q, 0) ** 0.45 / max(1 - ((x - cx) / rx) ** 2, 1e-3) ** 0.45 if q > 0 else 0.0


def build_mound():
    cx, cy = P['mound_c']; rx, ry = P['mound_r']
    # dark core: a low lumpy dome so the mound reads solid between the leaf cards
    nu, nv = 10, 3; verts = []; faces = []
    for j in range(nv + 1):
        for i in range(nu):
            a = 2 * math.pi * i / nu; s = 1 - j / (nv + 0.6)
            x, y = cx + rx * 0.82 * s * math.cos(a), cy + ry * 0.8 * s * math.sin(a)
            verts.append((x, y, P['core'] * mound_height(x, y) if j else 0.0))
    top = len(verts); verts.append((cx - 0.3, cy, P['core'] * mound_height(cx - 0.3, cy)))
    for j in range(nv):
        for i in range(nu):
            a, b = j * nu + i, j * nu + (i + 1) % nu
            faces += [(a, b, b + nu), (a, b + nu, a + nu)]
    faces += [(nv * nu + i, nv * nu + (i + 1) % nu, top) for i in range(nu)]
    add('Leaf_BrambleShade', verts, faces)
    # leaves on the mound surface, facing out, the upper ones light
    n = P['mound_leaves']; k = 0
    while k < n:
        x = cx + rx * rng.uniform(-1.02, 1.02); y = cy + ry * (1.04 - 2.06 * rng.random() ** 0.7)   # denser at the front
        if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1.04:
            continue
        z = mound_height(x, y); e = 0.02
        g = np.array([-(mound_height(x + e, y) - mound_height(x - e, y)) / (2 * e), -(mound_height(x, y + e) - mound_height(x, y - e)) / (2 * e), 1])
        if rng.random() < P['mound_up']:      # lie on the top of the mound, catching the light
            nrm = unit(unit(g) + np.array((0, -0.3, 0.7)) + rng.normal(0, 0.35, 3))
        else:                                  # stand up on the flanks and face out
            nrm = unit(0.4 * unit(g) + np.array((0, -0.9, 0.3)) + rng.normal(0, 0.4, 3))
        out = unit((x - cx, y - cy, 0.0))
        fwd = np.array((0, 0, 1.0)) + 0.7 * out + rng.normal(0, 0.45, 3)
        fwd = unit(fwd - nrm * np.dot(fwd, nrm))
        size = rng.uniform(*P['mound_leaf_len'])
        base = np.array((x, y, max(z - 0.07, 0.01)))
        mat = 'Leaf_BrambleLight' if (nrm[2] > 0.6 and z > 0.15 and rng.random() < 0.7) else 'Leaf_Bramble'
        leaf(base, fwd, nrm, size, mat); k += 1
    # runners trailing on the ground at both ends and at the front
    for (x, y, d) in [(-1.06, -0.30, (-1, -0.3, 0)), (-0.98, -0.55, (-0.7, -0.7, 0)), (1.02, -0.32, (1, -0.2, 0)),
                      (0.92, -0.55, (0.6, -0.8, 0))]:
        pts = [np.array((x * 0.7, y * 0.5, 0.10)) + np.array(d) * 0.13 * i + (0, 0, -0.025 * i) for i in range(3)]
        pts = [np.array((p[0], p[1], max(p[2], 0.012))) for p in pts]
        tube(pts, 0.007, 0.004, 3)
        for i in (1, 2):
            leaf(pts[i], unit(np.array(d) + rng.normal(0, 0.4, 3) * (1, 1, 0)), unit((0, -0.2, 1)), rng.uniform(0.10, 0.14), 'Leaf_Bramble')


def build_canes():
    for ci, c in enumerate(P['canes']):
        ts = np.linspace(0, 1, 9)
        pts = [bezier(c, t) for t in ts]
        tube(pts, c[4], c[4] * 0.45, 4 if ci == 0 else 3)
        # leaves along the cane, alternating sides, plus a few small side shoots carrying a leaf pair
        L = sum(np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1))
        n = int(L / P['cane_step']); side = 1
        for k in range(n):
            t = 0.12 + 0.88 * (k + rng.uniform(0, 0.6)) / n
            p = bezier(c, t); tan = unit(bezier(c, min(t + 0.01, 1)) - bezier(c, max(t - 0.01, 0)))
            out = unit(np.cross(tan, (0, 1, 0))) * side; side = -side
            if out[2] < 0 and P['canes'].index(c) < 2 and 0.3 < t < 0.85:   # under the arch: turn it forward and up
                out = unit(-out * 0.3 + (0, -0.7, 0.2))                        # so the window under the arch stays open
            elif out[2] < 0:
                out = unit(out * 0.4 + (0, -0.6, 0))
            fwd = unit(out + rng.normal(0, 0.35, 3) + (0, -0.25, 0.15))
            nrm = unit(np.array((0, -0.55, 0.85)) + rng.normal(0, 0.35, 3))
            size = rng.uniform(*P['leaf_len'])
            mat = 'Leaf_BrambleLight' if (fwd[2] > 0.25 and rng.random() < 0.65) else 'Leaf_Bramble'
            leaf(p, fwd, nrm, size, mat)
            if k % 2 == 0 and t < 0.9:   # a second leaf standing up off the top of the cane thickens the band
                up = unit(np.cross(tan, (0, 1, 0))); up = up if up[2] > 0 else -up
                leaf(p, unit(up + rng.normal(0, 0.4, 3)), unit(np.array((0, -0.7, 0.5)) + rng.normal(0, 0.3, 3)),
                     rng.uniform(*P['leaf_len']) * P['band_leaf'], 'Leaf_BrambleLight' if rng.random() < 0.6 else 'Leaf_Bramble')
            if k % P['shoot_every'] == 1:   # side shoot: a thin 3-sided twig with two leaves
                d = unit(out + (0, rng.uniform(-0.6, 0.3), 0.3)); q = p + d * 0.13
                tube([p, p + d * 0.065, q], 0.006, 0.003, 3)
                for j in (-1, 1):
                    leaf(q, unit(d + j * 0.6 * unit(np.cross(d, (0, 0, 1)))), unit((0, -0.5, 0.9)), rng.uniform(0.09, 0.13),
                         'Leaf_BrambleLight' if j > 0 else 'Leaf_Bramble')
        # a fan of three leaves at the tip
        tip = bezier(c, 1.0); tan = unit(bezier(c, 1.0) - bezier(c, 0.95))
        for j in (-1, 0, 1):
            leaf(tip, unit(tan + j * 0.7 * unit(np.cross(tan, (0, 1, 0)))), unit((0, -0.6, 0.6)), rng.uniform(0.10, 0.14), 'Leaf_Bramble')


def build_berries():
    r = P['berry_r']
    for ci, t in P['berries_hang']:
        c = P['canes'][ci]; p = bezier(c, t)
        q = p + np.array((0, -0.05, -0.07))
        tube([p, q], 0.004, 0.003, 3)
        berry_cluster(q + (0, 0, -r), int(rng.integers(P['berry_balls'][0] + 1, P['berry_balls'][1] + 1)), r)
    for p in P['berries_free']:
        x, y, z = p
        berry_cluster((x, y, max(z, r * 1.2)), int(rng.integers(*P['berry_balls'])), r)


def fit():
    allv = np.array([v for V, _ in GEO.values() for v in V])
    lo, hi = allv.min(0), allv.max(0)
    sc = np.array(P['fit']) / (hi - lo)
    sc[0] = sc[1] = min(sc[0], sc[1]) if (hi - lo)[1] * sc[0] > P['fit'][1] else sc[0]
    c = (lo + hi) / 2
    for k, (V, F) in GEO.items():
        GEO[k] = ([((x - c[0]) * sc[0], (y - c[1]) * sc[1], (z - lo[2]) * sc[2]) for x, y, z in V], F)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build_mound(); build_canes(); build_berries(); fit()
    names = {'Leaf_Bramble': 'leaves_dark', 'Leaf_BrambleLight': 'leaves_light', 'Stem_Cane': 'canes', 'Berry_Black': 'berries', 'Leaf_BrambleShade': 'mound_core'}
    tot = 0
    for k, (V, F) in GEO.items():
        me = bpy.data.meshes.new(names[k]); me.from_pydata(V, [], F); me.update()
        me.materials.append(material(k))
        ob = bpy.data.objects.new(names[k], me); bpy.context.scene.collection.objects.link(ob)
        tot += len(F)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=False, export_apply=True)
    allv = np.array([v for V, _ in GEO.values() for v in V])
    print('triangles', tot, 'size', np.round(allv.max(0) - allv.min(0), 3), {k: len(F) for k, (V, F) in GEO.items()})


if __name__ == '__main__':
    main()

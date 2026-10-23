"""Charming (storybook toy) pasture clover patch for the Ranch tile: the charming twin of models/clover
(replaces simulations/regional-assets-charming/UP-051.glb, the twin of UP-051.glb).

Same design and conventions as the normal clover: a mound of trefoils heaped over a small dark core dome, loose
trefoils around the rim, clover heads on stems above it, the same seven materials. Made charming: fewer, oversized,
round coin-like leaflets with puffed, cupped centres; 14 big plump round heads (5-sided spheroids, cream cap over a
pink drooping skirt) instead of 32 small diamonds; thicker stems that bow and splay outward with the heads nodding
outward; a plumper, rounder mound; and a slight whole-patch lean (the storybook tilt).
The footprint keeps the normal clover's ~0.42 x 0.35 m; it stands taller (heads up to about 0.25 m), like the hero.
Z up, metres, origin at the footprint centre on the ground, front -Y. No animation. Leaf cards are double-sided.
usage: python build.py            (writes clover-charming.glb next to this file)
"""
import os, math, random, json
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=23,
    lean=(0.15, 0.0),               # whole-patch lean (dx, dy per metre of height): the storybook tilt
    # mound
    mound_r=(0.180, 0.140),         # ellipse (x, y) the mound trefoils sit in
    mound_h=0.110,                  # trefoil centre height at the middle of the mound
    mound_pow=0.50,                 # dome profile (1 - r^2)^pow: plump, round-shouldered
    mound_n=35,
    layer=(0.80, 1.05),              # each trefoil sits at this fraction of the dome height (layering)
    tilt=(0.20, 1.20),              # outward tilt (rad) at the centre / at the rim of the mound
    tilt_var=0.25,
    leaflet=(0.050, 0.060),         # leaflet length range (m): oversized
    leaflet_w=0.78,                 # leaflet half-width / length (a round, coin-like leaflet)
    puff=0.16,                      # leaflet centre puffs up (fraction of length): plump, cupped
    pale=0.35,                      # fraction of trefoils in Leaf_Pale
    # loose flat trefoils around the edge
    edge_n=10, edge_r=(0.82, 1.0), edge_ell=(0.195, 0.150), edge_z=(0.006, 0.022),
    # core dome under the leaves
    core_r=(0.165, 0.125), core_h=0.092, core_segs=8,
    # flowers: fewer, much bigger, round heads on bouncy stems
    flowers=14,
    flower_ell=(0.160, 0.110),      # ellipse the heads sit over
    rise=(0.030, 0.110), rise_pow=1.0,   # head height above the leaf dome
    head_top=0.250,                 # no head above this
    head_back=0.015,                # extra height towards the back
    head_r=(0.024, 0.029),
    head_tall=1.30,                 # head height / width
    nod=0.50,                       # max head nod (rad), outward
    splay=0.55,                     # stems lean outward: head offset / base offset
    bow=0.0,                       # stem bow (fraction of length) at the knee
    stem_r=0.0040,
    pink=0.55,                      # fraction of the head (from the bottom) that is pink
    # grass
    grass=2, grass_len=(0.05, 0.07), grass_w=0.005,
)
P.update({k: tuple(v) if isinstance(v, list) else v for k, v in json.loads(os.environ.get('CLOVER_P', '{}')).items()})   # sweep overrides

COL = {  # sRGB sampled from the charming hero
    'Leaf_Green': (0.33, 0.48, 0.13), 'Leaf_Pale': (0.52, 0.66, 0.24), 'Leaf_Shade': (0.18, 0.29, 0.06),
    'Leaf_Grass': (0.42, 0.56, 0.18), 'Stem_Green': (0.45, 0.58, 0.20),
    'Petal_Cream': (0.96, 0.88, 0.84), 'Petal_Pink': (0.92, 0.56, 0.55),
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
    b.inputs['Roughness'].default_value = 0.8
    m.use_backface_culling = False          # exported as doubleSided: leaf cards render from both sides
    return m


class Part:
    """Collects triangles for one material; becomes one mesh object."""
    def __init__(self):
        self.v, self.f = [], []

    def add(self, verts, faces):
        o = len(self.v); self.v += [tuple(p) for p in verts]; self.f += [tuple(i + o for i in t) for t in faces]

    def obj(self, name, mat):
        me = bpy.data.meshes.new(name); me.from_pydata(self.v, [], self.f); me.update()
        for p in me.polygons:
            p.use_smooth = False
        o = bpy.data.objects.new(name, me); o.data.materials.append(material(mat))
        bpy.context.scene.collection.objects.link(o)
        return o


def norm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / l for c in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def frame(n, yaw):
    """Orthonormal (u, v, n) with u roughly along yaw in the plane normal to n."""
    t = (math.cos(yaw), math.sin(yaw), 0.0)
    v = norm(cross(n, t)); u = cross(v, n)
    return u, v, n


def dome(x, y):
    rx, ry = P['mound_r']; r2 = (x / rx) ** 2 + (y / ry) ** 2
    return P['mound_h'] * max(0.0, 1 - r2) ** P['mound_pow']


def leaned(p):
    """The storybook lean: everything shifts sideways in proportion to its height."""
    return (p[0] + P['lean'][0] * p[2], p[1] + P['lean'][1] * p[2], p[2])


def add(part, pts, faces):
    part.add([leaned(q) for q in pts], faces)


def trefoil(part, c, n, yaw, L, rng, droop=0.22):
    """Three round, plump leaflets. Each is a 4-triangle fan from the centre: two shoulders and a three-point rounded
    rim, with the middle of the leaflet puffed up so it reads cupped and soft."""
    u, v, nn = frame(n, yaw)
    w = P['leaflet_w'] * L; pf = P['puff']
    for k in range(3):
        a = 2 * math.pi * k / 3 + rng.uniform(-0.12, 0.12)
        d = tuple(math.cos(a) * u[i] + math.sin(a) * v[i] for i in range(3))
        s = tuple(-math.sin(a) * u[i] + math.cos(a) * v[i] for i in range(3))
        loc = [(0, 0, 0), (0.30, -0.80, pf), (0.82, -0.62, pf * 0.4 - droop * 0.4), (1.02, 0.0, pf * 0.6 - droop * 0.7),
               (0.82, 0.62, pf * 0.4 - droop * 0.4), (0.30, 0.80, pf)]
        Ls = L * rng.uniform(0.9, 1.08)
        pts = [tuple(c[i] + d[i] * al * Ls + s[i] * ac * w + nn[i] * h * Ls for i in range(3)) for al, ac, h in loc]
        pts = [(q[0], q[1], max(0.002, q[2])) for q in pts]   # never below the ground
        add(part, pts, [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5)])


def tube(part, path, r, sides=3):
    """Open 3-sided tube along a polyline (a bent stem)."""
    rings = []
    for j, c in enumerate(path):
        a, b = path[max(0, j - 1)], path[min(len(path) - 1, j + 1)]
        ax = norm(tuple(b[i] - a[i] for i in range(3)))
        u, v, _ = frame(ax, 0.3)
        rings.append([tuple(c[i] + r * (math.cos(2 * math.pi * k / sides) * u[i] + math.sin(2 * math.pi * k / sides) * v[i])
                            for i in range(3)) for k in range(sides)])
    pts = [p for ring in rings for p in ring]; f = []
    for j in range(len(path) - 1):
        o = j * sides
        for k in range(sides):
            k2 = (k + 1) % sides
            f += [(o + k, o + k2, o + sides + k2), (o + k, o + sides + k2, o + sides + k)]
    add(part, pts, f)


def head(cream, pink, c, r, axis, yaw):
    """Clover head: a plump 5-sided spheroid along `axis` (the nod). Cap and upper band cream, lower band and bottom
    fan pink, like the hero's pink-tipped outer florets."""
    u, v, ax = frame(axis, yaw); S = 5; t = P['head_tall']
    def ring(z, rr, off):
        return [tuple(c[i] + rr * (math.cos(2 * math.pi * (k + off) / S) * u[i] + math.sin(2 * math.pi * (k + off) / S) * v[i])
                      + z * ax[i] for i in range(3)) for k in range(S)]
    zp = (P['pink'] - 0.5) * 2 * r * t        # where pink starts (head-local height)
    top = tuple(c[i] + ax[i] * r * t for i in range(3))
    r1 = ring(r * t * 0.55, r * 0.86, 0.0)    # upper ring
    r2 = ring(zp, r * 1.04, 0.5)              # widest ring, where cream meets pink
    cv = r1 + r2 + [top]; cf = []
    for k in range(S):
        k2 = (k + 1) % S
        cf += [(k, k2, 2 * S), (k, S + k, k2), (k2, S + k, S + k2)]
    add(cream, cv, cf)
    r3 = ring(zp - r * 0.60, r * 0.72, 0.0)   # pink skirt ring (drooping outer florets); open underneath, the
    pv = r2 + r3; pf = []                     # stem and leaves hide it and the material is double-sided
    for k in range(S):
        k2 = (k + 1) % S
        pf += [(k, k2, S + k), (k2, S + k2, S + k)]
    add(pink, pv, pf)


def build(rng):
    parts = {k: Part() for k in COL}
    # core dome: keeps the mound solid where the leaf cards leave gaps
    rx, ry = P['core_r']; S = P['core_segs']; h = P['core_h']
    V = []
    for ring, (fr, fz) in enumerate([(1.0, 0.0), (0.72, 0.62)]):
        for k in range(S):
            a = 2 * math.pi * (k + 0.5 * ring) / S
            V.append((rx * fr * math.cos(a), ry * fr * math.sin(a), h * fz))
    V.append((0, 0.01, h)); F = []
    for k in range(S):
        k2 = (k + 1) % S
        F += [(k, k2, S + k), (k2, S + k2, S + k), (S + k, S + k2, 2 * S)]
    add(parts['Leaf_Shade'], V, F)
    # mound trefoils, outermost first so the stack builds up to the middle
    pts = []
    for i in range(P['mound_n']):
        r = math.sqrt((i + rng.random()) / P['mound_n']); a = rng.uniform(0, 2 * math.pi)
        pts.append((P['mound_r'][0] * r * math.cos(a), P['mound_r'][1] * r * math.sin(a), r))
    for x, y, r in pts:
        z = dome(x, y) * rng.uniform(*P['layer']) + 0.012
        tilt = P['tilt'][0] + (P['tilt'][1] - P['tilt'][0]) * r ** 1.5 + rng.uniform(-P['tilt_var'], P['tilt_var'])
        o = norm((x, y, 0)) if r > 0.05 else (0, 0, 0)
        n = norm((o[0] * math.sin(tilt), o[1] * math.sin(tilt), math.cos(tilt)))
        mat = 'Leaf_Pale' if rng.random() < P['pale'] else 'Leaf_Green'
        trefoil(parts[mat], (x, y, z), n, rng.uniform(0, 2 * math.pi), rng.uniform(*P['leaflet']), rng)
    # loose trefoils lying flat around the edge
    for i in range(P['edge_n']):
        a = 2 * math.pi * (i + rng.uniform(0.1, 0.9)) / P['edge_n']; r = rng.uniform(*P['edge_r'])
        x, y = P['edge_ell'][0] * r * math.cos(a), P['edge_ell'][1] * r * math.sin(a)
        n = norm((math.cos(a) * 0.2, math.sin(a) * 0.2, 1))
        mat = 'Leaf_Pale' if rng.random() < P['pale'] else 'Leaf_Green'
        trefoil(parts[mat], (x, y, rng.uniform(*P['edge_z'])), n, rng.uniform(0, 6.28), rng.uniform(*P['leaflet']) * 0.9, rng, 0.1)
    # flowers: big round heads on bowed stems that splay outward, each head nodding outward a little
    nf = P['flowers']
    for i in range(nf):
        r = math.sqrt((i + rng.random()) / nf); a = 2 * math.pi * i * 0.618034 + rng.uniform(-0.4, 0.4)
        x, y = P['flower_ell'][0] * r * math.cos(a), P['flower_ell'][1] * r * math.sin(a)
        rise = P['rise'][0] + (P['rise'][1] - P['rise'][0]) * rng.random() ** P['rise_pow'] * (1 - 0.45 * r)
        z = min(P['head_top'], dome(x, y) + rise + P['head_back'] * max(0.0, y / P['flower_ell'][1]))
        hr = rng.uniform(*P['head_r'])
        base = (x * (1 - P['splay']) + rng.uniform(-0.01, 0.01), y * (1 - P['splay']) + rng.uniform(-0.01, 0.01), 0.0)
        o = norm((x, y, 0)) if r > 0.08 else norm((rng.uniform(-1, 1), rng.uniform(-1, 1), 0))
        nod = P['nod'] * (0.4 + 0.6 * r) + rng.uniform(-0.08, 0.08)
        axis = norm((o[0] * math.sin(nod), o[1] * math.sin(nod), math.cos(nod)))
        neck = tuple((x, y, z)[i] - axis[i] * 0.8 * hr for i in range(3))
        mid = tuple(0.5 * (base[i] + neck[i]) for i in range(3))
        L = math.dist(base, neck); side = norm((-o[1], o[0], 0)); sgn = rng.choice((-1, 1))
        knee = (mid[0] + o[0] * P['bow'] * 0.25 * L + side[0] * sgn * 0.08 * L,
                mid[1] + o[1] * P['bow'] * 0.25 * L + side[1] * sgn * 0.08 * L, mid[2])
        tube(parts['Stem_Green'], [base, knee, neck] if P['bow'] else [base, neck], P['stem_r'])
        head(parts['Petal_Cream'], parts['Petal_Pink'], (x, y, z), hr, axis, rng.uniform(0, 1.26))
    # a couple of grass blades at the front base
    for i in range(P['grass']):
        x = rng.uniform(-0.12, 0.12); y = -rng.uniform(0.10, 0.13); L = rng.uniform(*P['grass_len'])
        lean = rng.uniform(-0.3, 0.3); w = P['grass_w']
        add(parts['Leaf_Grass'], [(x - w, y, 0), (x + w, y, 0), (x + lean * L, y - 0.15 * L, L)], [(0, 1, 2)])
    names = {'Leaf_Green': 'trefoils_green', 'Leaf_Pale': 'trefoils_pale', 'Leaf_Shade': 'mound_core', 'Leaf_Grass': 'grass',
             'Stem_Green': 'flower_stems', 'Petal_Cream': 'heads_cream', 'Petal_Pink': 'heads_pink'}
    for mat, p in parts.items():
        if p.f:
            p.obj(names[mat], mat)


def main(path=os.path.join(HERE, 'clover-charming.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(random.Random(P['seed']))
    tris = 0; lo = [9] * 3; hi = [-9] * 3
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for v in o.data.vertices:
            lo = [min(lo[i], v.co[i]) for i in range(3)]; hi = [max(hi[i], v.co[i]) for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('size %.3f x %.3f x %.3f' % tuple(hi[i] - lo[i] for i in range(3)), 'min', [round(c, 3) for c in lo])
    print('triangles', tris)


if __name__ == '__main__':
    main()

"""Pasture clover patch for the Ranch tile (replaces simulations/regional-assets/UP-051.glb).

A low, wide mound of trefoil leaves (three round faceted leaflets per leaf, each leaflet a 3-triangle fan) heaped
over a small dark core dome so the mound reads solid, densest and highest in the middle and spilling out flat at the
edges, with a few loose trefoils lying flat around the rim. Round clover heads (low-poly bipyramids: cream with a pink
lower half, fully cream, or fully pink) stand on thin 3-sided stems above the mound, the tallest in the middle-back.
A few grass blades poke through at the front.
The footprint keeps the old UP-051's ~0.40 x 0.36 m (to_game copies the GLB as-is, no rescale); the height follows
the hero's low mound (about half the width), so it is lower than the old 0.33 m stalks.
Z up, metres, origin at the footprint centre on the ground, front -Y. No animation. Leaf cards are double-sided.
usage: python build.py            (writes clover.glb next to this file)
"""
import os, math, random, json
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=23,
    # mound
    mound_r=(0.180, 0.140),         # ellipse (x, y) the mound trefoils sit in
    mound_h=0.120,                  # trefoil centre height at the middle of the mound
    mound_pow=0.55,                  # dome profile (1 - r^2)^pow
    mound_n=44,
    layer=(0.70, 1.0),              # each trefoil sits at this fraction of the dome height (layering)
    tilt=(0.15, 1.25),              # outward tilt (rad) at the centre / at the rim of the mound
    tilt_var=0.25,
    leaflet=(0.038, 0.048),         # leaflet length range (m)
    leaflet_w=0.95,                 # leaflet half-width at the shoulder / length
    pale=0.35,                      # fraction of trefoils in Leaf_Pale
    # loose flat trefoils around the edge
    edge_n=14, edge_r=(0.80, 1.0), edge_ell=(0.200, 0.160), edge_z=(0.004, 0.018),
    # core dome under the leaves
    core_r=(0.155, 0.115), core_h=0.095, core_segs=8,
    # flowers
    flowers=32,
    flower_ell=(0.150, 0.105),      # ellipse the heads sit over
    rise=(0.012, 0.080), rise_pow=1.3,   # head height above the leaf dome (range, skew to short)
    head_top=0.185,                 # no head above this
    head_back=0.01,                 # extra height towards the back
    head_r=(0.0125, 0.0155),
    stem_r=0.0019,
    pink_low=0.13,                  # heads below this height are mostly pink buds
    # grass
    grass=6, grass_len=(0.06, 0.10), grass_w=0.004,
)
P.update({k: tuple(v) if isinstance(v, list) else v for k, v in json.loads(os.environ.get('CLOVER_P', '{}')).items()})   # sweep overrides

COL = {  # sRGB sampled from the hero
    'Leaf_Green': (0.30, 0.50, 0.20), 'Leaf_Pale': (0.47, 0.64, 0.30), 'Leaf_Shade': (0.20, 0.33, 0.13),
    'Leaf_Grass': (0.42, 0.56, 0.20), 'Stem_Green': (0.40, 0.56, 0.24),
    'Petal_Cream': (0.92, 0.88, 0.76), 'Petal_Pink': (0.90, 0.56, 0.60),
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


def trefoil(part, c, n, yaw, L, rng, droop=0.25):
    """Three leaflets, each a 3-triangle fan from the centre: base, two shoulders, two tips (a rounded heart)."""
    u, v, nn = frame(n, yaw)
    w = P['leaflet_w'] * L
    for k in range(3):
        a = 2 * math.pi * k / 3 + rng.uniform(-0.15, 0.15)
        d = tuple(math.cos(a) * u[i] + math.sin(a) * v[i] for i in range(3))
        s = tuple(-math.sin(a) * u[i] + math.cos(a) * v[i] for i in range(3))
        loc = [(0, 0, 0), (0.40, -0.46, 0.06), (0.92, -0.32, -droop * 0.6), (0.92, 0.32, -droop * 0.6), (0.40, 0.46, 0.06)]
        Ls = L * rng.uniform(0.9, 1.08)
        pts = [tuple(c[i] + d[i] * al * Ls + s[i] * ac * w + nn[i] * h * Ls for i in range(3))
               for al, ac, h in loc]
        pts = [(q[0], q[1], max(0.002, q[2])) for q in pts]   # never below the ground
        part.add(pts, [(0, 1, 2), (0, 2, 3), (0, 3, 4)])


def prism(part, a, b, r, sides=3):
    """Open 3-sided tube from a to b."""
    ax = norm(tuple(b[i] - a[i] for i in range(3)))
    u, v, _ = frame(ax, 0.3)
    ring = lambda c: [tuple(c[i] + r * (math.cos(2 * math.pi * k / sides) * u[i] + math.sin(2 * math.pi * k / sides) * v[i])
                            for i in range(3)) for k in range(sides)]
    pts = ring(a) + ring(b); f = []
    for k in range(sides):
        k2 = (k + 1) % sides
        f += [(k, k2, sides + k2), (k, sides + k2, sides + k)]
    part.add(pts, f)


def head(top_part, bot_part, c, r, yaw):
    """Clover head: 4-sided bipyramid, slightly taller than wide; top and bottom halves can take two materials."""
    ring = [(c[0] + r * math.cos(yaw + k * math.pi / 2), c[1] + r * math.sin(yaw + k * math.pi / 2), c[2]) for k in range(4)]
    top = (c[0], c[1], c[2] + 0.95 * r); bot = (c[0], c[1], c[2] - 0.85 * r)
    top_part.add(ring + [top], [(k, (k + 1) % 4, 4) for k in range(4)])
    bot_part.add(ring + [bot], [((k + 1) % 4, k, 4) for k in range(4)])


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
    parts['Leaf_Shade'].add(V, F)
    # mound trefoils, outermost first so the stack builds up to the middle
    pts = []
    for i in range(P['mound_n']):
        r = math.sqrt((i + rng.random()) / P['mound_n']); a = rng.uniform(0, 2 * math.pi)
        x, y = P['mound_r'][0] * r * math.cos(a), P['mound_r'][1] * r * math.sin(a)
        pts.append((x, y, r))
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
        n = norm((math.cos(a) * 0.15, math.sin(a) * 0.15, 1))
        mat = 'Leaf_Pale' if rng.random() < P['pale'] else 'Leaf_Green'
        trefoil(parts[mat], (x, y, rng.uniform(*P['edge_z'])), n, rng.uniform(0, 6.28), rng.uniform(*P['leaflet']) * 0.85, rng, 0.1)
    # flowers
    nf = P['flowers']
    for i in range(nf):
        r = math.sqrt((i + rng.random()) / nf); a = rng.uniform(0, 2 * math.pi)
        x, y = P['flower_ell'][0] * r * math.cos(a), P['flower_ell'][1] * r * math.sin(a)
        # stem rise above the leaves: short buds on the mound's face, the tallest in the middle-back
        rise = P['rise'][0] + (P['rise'][1] - P['rise'][0]) * rng.random() ** P['rise_pow'] * (1 - 0.5 * r)
        z = min(P['head_top'], dome(x, y) + rise + P['head_back'] * max(0.0, y / P['flower_ell'][1]))
        hr = rng.uniform(*P['head_r'])
        base = (x * 0.7 + rng.uniform(-0.01, 0.01), y * 0.7 + rng.uniform(-0.01, 0.01), 0.0)
        prism(parts['Stem_Green'], base, (x, y, z - 0.6 * hr), P['stem_r'])
        q = rng.random()
        if z < P['pink_low']:
            top, bot = ('Petal_Pink', 'Petal_Pink') if q < 0.6 else ('Petal_Cream', 'Petal_Pink')
        else:
            top, bot = ('Petal_Cream', 'Petal_Pink') if q < 0.55 else (('Petal_Cream', 'Petal_Cream') if q < 0.85 else ('Petal_Pink', 'Petal_Pink'))
        head(parts[top], parts[bot], (x, y, z), hr, rng.uniform(0, 1.57))
    # grass blades near the front base
    for i in range(P['grass']):
        x = rng.uniform(-0.12, 0.12); y = -rng.uniform(0.06, 0.11); L = rng.uniform(*P['grass_len'])
        lean = rng.uniform(-0.25, 0.25); w = P['grass_w']
        parts['Leaf_Grass'].add([(x - w, y, 0), (x + w, y, 0), (x + lean * L, y - 0.15 * L, L)], [(0, 1, 2)])
    names = {'Leaf_Green': 'trefoils_green', 'Leaf_Pale': 'trefoils_pale', 'Leaf_Shade': 'mound_core', 'Leaf_Grass': 'grass',
             'Stem_Green': 'flower_stems', 'Petal_Cream': 'heads_cream', 'Petal_Pink': 'heads_pink'}
    for mat, p in parts.items():
        if p.f:
            p.obj(names[mat], mat)


def main(path=os.path.join(HERE, 'clover.glb')):
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

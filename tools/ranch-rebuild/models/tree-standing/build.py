"""Shade tree (Ranch tile `tree-standing`): a wide umbrella crown of lumpy two-green leaf clumps on a twisting,
forking light-brown trunk with flared root buttresses; plus the chopped `stump` state.

usage: python build.py            builds both states, writes tree-standing.glb (standing) and variants/<state>.glb
Z up, metres, origin at the trunk base on the ground, front (the hero's view) faces -Y.
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'SCALE': 0.88,              # whole model (the shape numbers below were laid out for a 6.8 m tree; this makes it 6 m)
    # trunk: centreline (x, y, z) from the ground to the fork, radius per station, twist of the lobes (deg)
    'TRUNK': [(0.0, 0.0, 0.0), (0.0, 0.0, 0.1), (0.0, 0.0, 0.25), (0.05, 0.0, 0.7), (0.08, 0.02, 1.15), (0.0, 0.03, 1.5), (-0.06, 0.0, 1.75)],
    'TRUNK_R': [0.42, 0.41, 0.36, 0.32, 0.30, 0.31, 0.33],
    'TWIST': 70.0,
    'LOBES': 5,                 # root buttresses
    'FLARE': [0.9, 0.84, 0.5, 0.24, 0.1, 0.03, 0.0],   # extra lobe reach (m) per trunk station
    'RING_N': 30,
    'LOBE_POW': 2.0,            # lower = broader buttresses
    # limbs from the fork: control points (they end inside the clumps); r0 at the fork, r1 at the tip
    'LIMBS': [
        [(-0.05, 0.0, 1.65), (-0.65, -0.05, 2.25), (-1.35, 0.0, 2.7), (-2.0, 0.1, 3.05)],
        [(-0.05, 0.0, 1.65), (-0.25, 0.0, 2.4), (-0.05, -0.2, 3.2), (-0.35, -0.1, 4.0)],
        [(-0.05, 0.0, 1.65), (0.45, 0.05, 2.3), (1.1, -0.1, 2.85), (1.7, -0.15, 3.3)],
        [(-0.05, 0.0, 1.65), (0.3, 0.45, 2.35), (0.75, 0.95, 3.0), (1.2, 1.3, 3.5)],
        [(-0.05, 0.0, 1.65), (-0.35, 0.5, 2.4), (-0.9, 1.0, 3.1), (-1.2, 1.3, 3.6)],
    ],
    'LIMB_R': (0.22, 0.07),
    # twigs: (limb index, start fraction along it, end point)
    'TWIGS': [(2, 0.55, (2.2, -0.35, 3.2)), (0, 0.6, (-1.7, -0.5, 3.6)), (1, 0.7, (0.5, -0.6, 4.1))],
    'TWIG_R': (0.07, 0.035),
    # leaf clumps: (x, y, z, radius, material) ; L = Leaf_Light (top), D = Leaf_Dark (under and sides)
    'CLUMPS': [
        (-0.3, 0.1, 5.3, 1.3, 'L'),      # crown top
        (-1.25, -0.2, 4.65, 1.0, 'L'),    # top left
        (1.4, -0.35, 4.3, 1.05, 'L'),     # big right
        (0.35, 1.05, 4.9, 1.05, 'L'),     # back top
        (-0.5, -1.0, 4.0, 0.9, 'D'),     # front centre
        (-2.25, 0.05, 3.45, 1.08, 'D'),   # far left
        (-1.95, -0.45, 3.25, 0.72, 'D'),   # low left
        (2.45, 0.05, 3.45, 0.92, 'D'),    # far right
        (1.3, 1.0, 3.6, 0.9, 'D'),        # back right
        (-1.1, 1.15, 3.25, 0.95, 'D'),    # back left
        (0.55, -0.4, 3.2, 0.9, 'D'),     # under centre
    ],
    'CROWN_SX': 1.0, 'CROWN_SY': 1.3, 'CROWN_SZ': 1.0, 'CROWN_DZ': 0.0,   # whole-crown stretch about the fork and lift
    'CLUMP_SUB': 3,             # icosphere subdivisions (Blender: 3 -> 320 tris)
    'BUMPS': 18, 'BUMP_H': 0.32, 'BUMP_K': 14.0,   # bumps per clump, height (x r), sharpness
    'JIT': 0.07,                # facet jitter (x r)
    'DECIMATE': 0.8,            # collapse ratio per clump: fewer, more irregular facets
    'SQUASH': 0.8,
    'CLUSTER': True, 'CORE': 1.0, 'SUBS': 2, 'SUB_R': 0.62, 'SUB_OFF': 0.6,   # clump = core + sub-blobs (else one decimated blob)
    # leaf plates (round 9): the clump's blobs become a coarse dark inner fill, covered by pointed leaf plates
    'LEAVES': True,
    'FILL': 0.74,               # fill blobs at this x their clump size (20-face icospheres)
    'PLATES': 46,               # plates on a clump of radius 1 (scales with surface area)
    'PLATE_MIN': 16,
    'HIDDEN': 0.8,              # skip plates deeper than this x a neighbouring clump's radius
    'PLATE_R': 0.5,             # plate half-length (m, before SCALE): 0.44 m tip to centre in the game model
    'PLATE_INSET': 0.93,        # plate centre at this x the clump surface, so tips break the outline
    'PLATE_OUT': 0.3,           # how far the plate tip leans out from the surface tangent
    'PLATE_DOWN': 0.35,         # and down
    'LIGHT_Z': 0.05,            # plates facing up more than this are Leaf_Light (plus some mixing)
    # stump
    'STUMP_H': 0.75,
    'CHIPS': [(0.75, -0.55, 25), (-0.65, -0.7, 140), (1.0, 0.45, 80), (-0.9, 0.55, 200)],
}
COL = {'Bark_Brown': (160, 112, 66), 'Leaf_Light': (132, 160, 58), 'Leaf_Dark': (76, 108, 36), 'Leaf_Deep': (48, 74, 22),
       'Timber_Cut': (228, 196, 140), 'Timber_Chip': (206, 166, 110)}
STATES = ['standing', 'stump']
RND = random.Random(7)


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False          # exported double-sided: leaf plates show from both faces
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vector(v) * P['SCALE']) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


def loft(rings, cap0=True, cap1=True):
    n = len(rings[0]); V = [tuple(p) for r in rings for p in r]; F = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        F += [(a + k, a + (k + 1) % n, b + (k + 1) % n, b + k) for k in range(n)]
    if cap0:
        F.append(tuple(range(n))[::-1])
    if cap1:
        F.append(tuple((len(rings) - 1) * n + k for k in range(n)))
    return V, F


def frame(t):
    t = t.normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
    u = up.cross(t).normalized(); return u, t.cross(u)


def bezier(pts, n):
    """Catmull-Rom through pts, n samples."""
    P_ = [Vector(p) for p in pts]; P_ = [P_[0] * 2 - P_[1]] + P_ + [P_[-1] * 2 - P_[-2]]
    out = []
    for i in range(n):
        s = i / (n - 1) * (len(pts) - 1); k = min(int(s), len(pts) - 2); t = s - k
        p0, p1, p2, p3 = P_[k], P_[k + 1], P_[k + 2], P_[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def tube(path, r0, r1, sides=6, cap0=False, cap1=True, jit=0.08):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * (i / (len(path) - 1)) ** 0.8
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r * (1 + RND.uniform(-jit, jit))
                      for a in (2 * math.pi * k / sides + i * 0.4 for k in range(sides))])
    return loft(rings, cap0, cap1)


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


# ------------------------------------------------------------------ parts
def trunk_rings(top=None):
    """Lofted trunk with lobed root buttresses that twist as they rise. top: cut height (stump) or None."""
    path = [Vector(p) for p in P['TRUNK']]; n = P['RING_N']; L = P['LOBES']; rings = []
    zs = [p.z for p in path]
    if top is not None:     # resample the stations below the cut
        stations = [z for z in zs if z < top] + [top]
    else:
        stations = zs
    for z in stations:
        # interpolate station data at height z
        j = max(0, min(len(zs) - 2, max(i for i in range(len(zs)) if zs[i] <= z)))
        f = (z - zs[j]) / (zs[j + 1] - zs[j])
        c = path[j].lerp(path[j + 1], f)
        r = P['TRUNK_R'][j] + (P['TRUNK_R'][j + 1] - P['TRUNK_R'][j]) * f
        fl = P['FLARE'][j] + (P['FLARE'][j + 1] - P['FLARE'][j]) * f
        tw = math.radians(P['TWIST']) * z / zs[-1]
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            lobe = (0.5 + 0.5 * math.cos(L * (a - tw))) ** P['LOBE_POW']   # rounded buttress ridges
            rr = r * (1 + 0.12 * math.cos(L * (a - tw))) + fl * lobe
            rr *= 1 + RND.uniform(-0.04, 0.04)
            ring.append(c + Vector((math.cos(a) * rr, math.sin(a) * rr, 0)))
        if z == 0:  # feet sit on the ground but tuck a little under
            ring = [Vector((p.x, p.y, 0.0)) for p in ring]
        rings.append(ring)
    return rings


def build_bark():
    rings = trunk_rings()
    parts = [loft(rings, True, False)]
    limbs = []
    for pts in P['LIMBS']:
        path = bezier(pts, 6); limbs.append(path)
        parts.append(tube(path, *P['LIMB_R'], sides=7))
    for li, s, end in P['TWIGS']:
        path = limbs[li]; c = path[int(s * (len(path) - 1))]
        mid = c.lerp(Vector(end), 0.5) + Vector((0, 0, 0.15))
        parts.append(tube(bezier([c, mid, Vector(end)], 4), *P['TWIG_R'], sides=5))
    make('trunk', *merge(*parts), 'Bark_Brown')


def lumpy(c, r, seed, sub=None, nb=None):
    rnd = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub or P['CLUMP_SUB'], radius=1.0)
    bumps = []
    for _ in range(P['BUMPS'] if nb is None else nb):
        d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1) * 0.7 + 0.35)).normalized()
        bumps.append((d, P['BUMP_H'] * rnd.uniform(0.6, 1.2)))
    V = []
    for v in bm.verts:
        d = v.co.normalized(); s = 1.0
        for b, h in bumps:
            s += h * max(0.0, d.dot(b)) ** P['BUMP_K']
        s *= 1 + rnd.uniform(-P['JIT'], P['JIT'])
        p = d * s * r
        if p.z < 0:
            p.z *= P['SQUASH']
        V.append(c + p)
    F = [tuple(v.index for v in f.verts) for f in bm.faces]; bm.free()
    return V, F


OTHERS = []


def build_crown():
    OTHERS[:] = [(Vector((x * P['CROWN_SX'], y * P['CROWN_SY'], 1.75 + (z - 1.75) * P['CROWN_SZ'] + P['CROWN_DZ'])), r)
                 for x, y, z, r, m in P['CLUMPS']]
    for i, (x, y, z, r, m) in enumerate(P['CLUMPS']):
        x, y = x * P['CROWN_SX'], y * P['CROWN_SY']; z = 1.75 + (z - 1.75) * P['CROWN_SZ'] + P['CROWN_DZ']
        c = Vector((x, y, z)); name = f'clump_{i:02d}'; mname = 'Leaf_Light' if m == 'L' else 'Leaf_Dark'
        if P['LEAVES']:
            leafy_clump(i, c, r, m); continue
        if P['CLUSTER']:
            # a core blob plus sub-blobs bulging out of its upper/outer surface: a bumpy cauliflower clump
            rnd = random.Random(500 + i); out = Vector((x, y, 0)); out = out.normalized() if out.length > 0.1 else Vector((0, -1, 0))
            parts = [lumpy(c, r * P['CORE'], 100 + i, 2, 5)]
            for k in range(P['SUBS']):
                a = 2 * math.pi * (k / P['SUBS'] + rnd.uniform(-0.12, 0.12)) + i
                d = (Vector((math.cos(a), math.sin(a), 0)) * 0.8 + out * 0.5 + Vector((0, 0, 0.75))).normalized()
                parts.append(lumpy(c + d * r * P['SUB_OFF'], r * P['SUB_R'] * rnd.uniform(0.85, 1.1), 300 + 10 * i + k, 2, 4))
            make(name, *merge(*parts), mname)
        else:
            ob = make(name, *lumpy(c, r, 100 + i), mname)
            md = ob.modifiers.new('dec', 'DECIMATE'); md.ratio = P['DECIMATE']


# pointed leaf plate outline: (angle deg, radius), tip along +axis; 8 triangles round a centre point
LEAF = [(0, 1.0), (32, 0.5), (75, 0.46), (125, 0.38), (180, 0.3), (-125, 0.38), (-75, 0.46), (-32, 0.5)]
GROUPS = {}


def plate(center, axis, normal, r, rnd):
    side = normal.cross(axis).normalized(); normal = axis.cross(side).normalized()
    V = [center + normal * (0.08 * r)]       # a slight ridge along the middle
    for a, k in LEAF:
        a = math.radians(a); k *= 1 + rnd.uniform(-0.1, 0.1)
        x, y = math.cos(a) * k * r, math.sin(a) * k * r
        V.append(center + axis * x + side * y - normal * (0.05 * r * abs(y) / r))
    n = len(LEAF)
    return V, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]


def blob_surface(blobs, d):
    """distance from the clump centre to the outside of its blobs (spheres) along the unit direction d"""
    best = 0.0
    for b, rb in blobs:
        t = d.dot(b); q = b.length_squared - t * t
        if q < rb * rb:
            best = max(best, t + math.sqrt(rb * rb - q))
    return best


def leafy_clump(i, c, r, m):
    rnd = random.Random(500 + i); out = Vector((c.x, c.y, 0)); out = out.normalized() if out.length > 0.1 else Vector((0, -1, 0))
    blobs = [(Vector(), r * P['CORE'])]
    fill = [lumpy(c, r * P['CORE'] * P['FILL'], 100 + i, 1, 3)]
    for k in range(P['SUBS']):
        a = 2 * math.pi * (k / P['SUBS'] + rnd.uniform(-0.12, 0.12)) + i
        d = (Vector((math.cos(a), math.sin(a), 0)) * 0.8 + out * 0.5 + Vector((0, 0, 0.75))).normalized()
        rb = r * P['SUB_R'] * rnd.uniform(0.85, 1.1); blobs.append((d * r * P['SUB_OFF'], rb))
        fill.append(lumpy(c + d * r * P['SUB_OFF'], rb * P['FILL'], 300 + 10 * i + k, 1, 3))
    GROUPS.setdefault('Leaf_Deep', []).extend(fill)
    n = max(P['PLATE_MIN'], round(P['PLATES'] * r * r)); ga = math.pi * (3 - math.sqrt(5))
    for k in range(n):       # fibonacci directions over the sphere, a little jittered
        z = 1 - 2 * (k + 0.5) / n; rho = math.sqrt(max(0.0, 1 - z * z)); th = ga * k + i
        d = Vector((rho * math.cos(th), rho * math.sin(th), z)) + Vector([rnd.uniform(-0.12, 0.12) for _ in range(3)])
        d.normalize()
        p = d * blob_surface(blobs, d) * P['PLATE_INSET']
        if d.z < 0:
            p.z *= P['SQUASH']
        if any((c + p - oc).length < orr * P['HIDDEN'] for oc, orr in OTHERS if (oc - c).length > 1e-3):
            continue        # buried inside a neighbouring clump: never seen, skip it
        # tip direction: outward and slightly down along the surface
        down = Vector((0, 0, -1)) - d * (-d.z)
        down = down.normalized() if down.length > 0.2 else Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)).normalized()
        ax = (down + d * P['PLATE_OUT'] + Vector((0, 0, -P['PLATE_DOWN']))).normalized()
        ax = Matrix.Rotation(rnd.uniform(-0.6, 0.6), 3, d) @ ax
        nrm = (d + Vector((0, 0, 0.5))).normalized()
        light = d.z + rnd.uniform(-0.25, 0.25) + (0.25 if m == 'L' else -0.15) > P['LIGHT_Z']
        GROUPS.setdefault('Leaf_Light' if light else 'Leaf_Dark', []).append(
            plate(c + p, ax, nrm, P['PLATE_R'] * rnd.uniform(0.85, 1.1), rnd))


def finish_crown():
    for name in ('Leaf_Light', 'Leaf_Dark', 'Leaf_Deep'):
        if GROUPS.get(name):
            make({'Leaf_Light': 'leaves_light', 'Leaf_Dark': 'leaves_dark', 'Leaf_Deep': 'crown_fill'}[name],
                 *merge(*GROUPS[name]), name)
    GROUPS.clear()


def build_stump():
    rings = trunk_rings(top=P['STUMP_H'])
    # slant the cut a little, as an axe leaves it
    top = rings[-1]; c = sum(top, Vector()) / len(top)
    # round the cut: the buttress ridges slope away below it, the cut face itself is a near-round disc
    rc = sum((p - c).length for p in top) / len(top) * 0.95
    def rnd(p):
        d = p - c; d.z = 0; return c + d * min(1.0, rc / max(d.length, 1e-6) * (1 + RND.uniform(-0.03, 0.03)))
    rings[-1] = [rnd(p) for p in top]; rings[-1] = [Vector((p.x, p.y, p.z + 0.08 * (p.x - c.x))) for p in rings[-1]]
    make('stump', *loft(rings, True, False), 'Bark_Brown')
    inner = [c.lerp(p, 0.93) + Vector((0, 0, 0.012)) for p in rings[-1]]
    V = inner + [c + Vector((0, 0, 0.02))]; n = len(inner)
    make('stump_cut', V, [(k, (k + 1) % n, n) for k in range(n)], 'Timber_Cut')
    for i, (x, y, rot) in enumerate(P['CHIPS']):
        # a wedge chip: flat on the ground, thin at one edge
        a = math.radians(rot); R = Matrix.Rotation(a, 3, 'Z')
        L, W, H = 0.34, 0.16, 0.07
        base = [(-L / 2, -W / 2, 0), (L / 2, -W / 2, 0), (L / 2, W / 2, 0), (-L / 2, W / 2, 0),
                (-L / 2, -W / 2, H), (L / 2, -W / 2, H * 0.3), (L / 2, W / 2, H * 0.3), (-L / 2, W / 2, H)]
        V = [R @ Vector(p) + Vector((x, y, 0)) for p in base]
        F = [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        make(f'chip_{i}', V, F, 'Timber_Chip')


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(7)
    if state == 'standing':
        build_bark(); build_crown(); finish_crown()
    else:
        build_stump()


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            dg = bpy.context.evaluated_depsgraph_get(); m = ob.evaluated_get(dg).to_mesh()
            m.calc_loop_triangles(); n += len(m.loop_triangles); ob.evaluated_get(dg).to_mesh_clear()
    return n


def main():
    for st in sys.argv[1:] or STATES:
        build(st)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'standing':
            export(os.path.join(HERE, 'tree-standing.glb'))
        print('state', st, 'triangles', tris())


if __name__ == '__main__':
    main()

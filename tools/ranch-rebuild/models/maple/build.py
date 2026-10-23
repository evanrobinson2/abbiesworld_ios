"""Maple (Ranch tile regional tree, replaces simulations/regional-assets/WW-151.glb): a young maple with a tall,
slender, straight light-brown trunk flared at the base and bare for the lower half, 5 thin limbs fanning out from
the fork, and a rounded, slightly flat-topped dome crown of layered, pointed maple-leaf plates in three greens.

usage: python build.py      writes maple.glb
Z up, metres, origin at the trunk base on the ground, front (the hero's view) faces -Y. No variants (tree group).
Leaf plates are flat-shaded 7-point maple stars with a folded midrib, on a double-sided material.
"""
import os, sys, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    # trunk stations (z, radius); the leader carries on up inside the crown
    'TRUNK': [(0.0, 0.25), (0.07, 0.20), (0.22, 0.135), (0.5, 0.098), (1.2, 0.086), (2.0, 0.079), (2.9, 0.071),
              (3.5, 0.05), (4.1, 0.03)],
    'TRUNK_SIDES': 8, 'FLARE_LOBES': 4, 'FLARE_K': 0.18,
    # limbs: control points from the trunk out into the crown
    'LIMBS': [
        [(0.0, 0.0, 2.55), (-0.35, -0.05, 3.10), (-0.75, -0.1, 3.60), (-1.15, -0.05, 3.90)],
        [(0.0, 0.0, 2.70), (0.4, -0.1, 3.15), (0.85, -0.2, 3.55), (1.3, -0.25, 3.80)],
        [(0.0, 0.0, 2.80), (-0.2, 0.35, 3.35), (-0.45, 0.75, 3.85), (-0.65, 1.05, 4.15)],
        [(0.0, 0.0, 2.85), (0.3, 0.35, 3.35), (0.65, 0.75, 3.80), (0.95, 1.05, 4.10)],
        [(0.0, 0.0, 2.95), (-0.15, -0.35, 3.55), (-0.3, -0.75, 4.05), (-0.35, -1.0, 4.40)],
    ],
    'LIMB_R': (0.058, 0.02), 'LIMB_SIDES': 5, 'LIMB_N': 4,
    'TWIGS': [(0, 0.5, (-0.95, -0.55, 3.75)), (1, 0.5, (1.05, 0.25, 4.05)), (1, 0.35, (0.8, -0.65, 3.60))],
    'TWIG_R': (0.022, 0.01),
    # crown shell profile: (z, half-width) from its underside to its top; leaves sit on this surface of revolution
    'PROFILE': [(3.48, 2.0), (3.72, 2.22), (4.05, 2.22), (4.44, 2.05), (4.78, 1.85), (5.13, 1.76), (5.43, 1.5),
                (5.69, 1.1), (5.86, 0.65)],
    'CROWN_X': -0.1,            # crown centre offset (the hero's crown sits a touch left of the trunk)
    'TOP_Z': 5.78,              # the flattish top: a cap of leaves lying near level
    # leaf clusters: (z on the shell, how many round the ring, leaf radius, droop deg, colour weights L/M/D)
    'TIERS': [
        (3.6, 8, 0.56, 44, (0.15, 0.35, 0.5)),
        (4.18, 7, 0.58, 30, (0.25, 0.45, 0.3)),
        (4.65, 7, 0.58, 22, (0.35, 0.45, 0.2)),
        (5.13, 6, 0.56, 14, (0.45, 0.4, 0.15)),
        (5.5, 4, 0.56, 8, (0.6, 0.3, 0.1)),
    ],
    'CL_LEAVES': 5,             # leaves round each cluster's centre leaf
    'CL_SPREAD': 0.62,          # how far out from the cluster centre each ring leaf sits (x leaf radius)
    'TOP_CL': 3, 'TOP_RING': 0.5, 'TOP_LR': 0.56,
    'INSET': 0.78,               # leaf centre sits at INSET x shell radius, so the tips reach the shell
    'LUMP': 0.08,               # cluster-to-cluster jitter of the shell radius: a lumpy outline
    'CORE': 0.7,                # dark inner crown body (scale of the shell) that hides gaps between plates
    'CORE_BOTTOM': 3.9,
    'FOLD': 0.28,               # midrib fold (x leaf radius per unit of half-width)
    'SEED': 11,
}
# leaf outline: (angle deg, radius) round the star, tip along +x
LEAF = [(0, 1.0), (25, 0.52), (52, 0.95), (82, 0.5), (115, 0.7), (150, 0.36), (180, 0.2),
        (-150, 0.36), (-115, 0.7), (-82, 0.5), (-52, 0.95), (-25, 0.52)]
COL = {'Bark_Brown': (150, 100, 52), 'Leaf_Light': (150, 188, 92), 'Leaf_Mid': (104, 146, 50),
       'Leaf_Dark': (64, 98, 28)}
RND = random.Random(P['SEED'])


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False          # exported as doubleSided: the leaf plates show from below too
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


def spline(pts, n):
    P_ = [Vector(p) for p in pts]; P_ = [P_[0] * 2 - P_[1]] + P_ + [P_[-1] * 2 - P_[-2]]
    out = []
    for i in range(n):
        s = i / (n - 1) * (len(pts) - 1); k = min(int(s), len(pts) - 2); t = s - k
        p0, p1, p2, p3 = P_[k], P_[k + 1], P_[k + 2], P_[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def tube(path, r0, r1, sides):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * i / (len(path) - 1)
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r for a in (2 * math.pi * k / sides for k in range(sides))])
    return loft(rings, False, True)


# ------------------------------------------------------------------ bark
def build_bark():
    n = P['TRUNK_SIDES']; rings = []
    for z, r in P['TRUNK']:
        fl = P['FLARE_K'] * max(0.0, 1 - z / 0.5)
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n + 0.2
            rr = r * (1 + fl * math.cos(P['FLARE_LOBES'] * a)) * (1 + RND.uniform(-0.03, 0.03))
            ring.append(Vector((math.cos(a) * rr, math.sin(a) * rr, z)))
        rings.append(ring)
    parts = [loft(rings, True, True)]
    limbs = []
    for pts in P['LIMBS']:
        path = spline(pts, P['LIMB_N']); limbs.append(path)
        parts.append(tube(path, *P['LIMB_R'], P['LIMB_SIDES']))
    for li, s, end in P['TWIGS']:
        c = limbs[li][int(s * (P['LIMB_N'] - 1))]
        parts.append(tube(spline([c, c.lerp(Vector(end), 0.5) + Vector((0, 0, 0.08)), Vector(end)], 3), *P['TWIG_R'], 4))
    make('trunk', *merge(*parts), 'Bark_Brown')


# ------------------------------------------------------------------ crown
def shell_r(z):
    pr = P['PROFILE']
    if z <= pr[0][0]:
        return pr[0][1]
    for (z0, r0), (z1, r1) in zip(pr, pr[1:]):
        if z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return pr[-1][1]


def leaf(center, axis, normal, r):
    """A maple-leaf plate: star outline in the plane (axis, side), midrib folded so the halves tilt up."""
    side = normal.cross(axis).normalized(); normal = axis.cross(side).normalized()
    V = [center + normal * (0.05 * r)]
    for a, k in LEAF:
        a = math.radians(a); k *= 1 + RND.uniform(-0.08, 0.08)
        x, y = math.cos(a) * k * r, math.sin(a) * k * r
        V.append(center + axis * x + side * y + normal * (abs(y) * P['FOLD'] - 0.04 * r * k))
    n = len(LEAF)
    F = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    return V, F


def pick(w):
    u = RND.random() * sum(w)
    for name, x in zip(('Leaf_Light', 'Leaf_Mid', 'Leaf_Dark'), w):
        if u < x:
            return name
        u -= x
    return 'Leaf_Dark'


def shell_n(z, h):
    dz = 0.05; dr = (shell_r(z + dz) - shell_r(z - dz)) / (2 * dz)
    return (h - Vector((0, 0, dr))).normalized() if z < P['PROFILE'][-1][0] else Vector((0, 0, 1))


def cluster(groups, c, N, lr, droop, w):
    """A rosette of maple plates: one centre leaf facing out, CL_LEAVES round it radiating and drooping."""
    t1 = Vector((0, 0, 1)).cross(N); t1 = t1.normalized() if t1.length > 1e-3 else Vector((1, 0, 0))
    t2 = N.cross(t1).normalized()      # t2 points 'up' along the shell
    m = P['CL_LEAVES']; off = RND.random() * 2 * math.pi
    for j in range(m):
        a = off + 2 * math.pi * j / m + RND.uniform(-0.2, 0.2)
        t = (t1 * math.cos(a) + t2 * math.sin(a)).normalized()
        # outward-and-down: lean the radial direction toward gravity by the droop, and away from the shell a bit
        ax = (t - Vector((0, 0, math.sin(math.radians(droop)))) * 0.8 + N * 0.12).normalized()
        nrm = (N + Vector((0, 0, 0.6))).normalized()
        nrm = Matrix.Rotation(math.radians(RND.uniform(-14, 14)), 3, ax) @ nrm
        r = lr * RND.uniform(0.85, 1.12)
        groups[pick(w)].append(leaf(c + t * (P['CL_SPREAD'] * lr) - N * 0.04, ax, nrm, r))
    ax = (t2 * 0.5 + Vector((0, 0, -0.4)) + t1 * RND.uniform(-0.4, 0.4)).normalized()
    groups[pick((w[0] + 0.2, w[1], w[2] * 0.5))].append(leaf(c + N * 0.1, ax, N, lr * 1.05))


def build_crown():
    groups = {'Leaf_Light': [], 'Leaf_Mid': [], 'Leaf_Dark': []}
    C = Vector((P['CROWN_X'], 0, 0))
    for ti, (z, cnt, lr, droop, w) in enumerate(P['TIERS']):
        off = RND.random() * 2 * math.pi
        for i in range(cnt):
            th = off + 2 * math.pi * i / cnt + RND.uniform(-0.15, 0.15)
            h = Vector((math.cos(th), math.sin(th), 0)); zz = z + RND.uniform(-0.1, 0.1)
            N = shell_n(zz, h)
            c = C + h * (shell_r(zz) * P['INSET'] * RND.uniform(1 - P['LUMP'], 1 + P['LUMP'])) + Vector((0, 0, zz))
            cluster(groups, c, N, lr, droop, w)
    for i in range(P['TOP_CL']):     # the flattish top
        th = 2 * math.pi * i / P['TOP_CL'] + RND.uniform(-0.3, 0.3)
        h = Vector((math.cos(th), math.sin(th), 0))
        N = (h * 0.25 + Vector((0, 0, 1))).normalized()
        c = C + h * P['TOP_RING'] + Vector((0, 0, P['TOP_Z']))
        cluster(groups, c, N, P['TOP_LR'], 10, (0.7, 0.3, 0.0))
    for name, lst in groups.items():
        if lst:
            make('leaves_' + name.split('_')[1].lower(), *merge(*lst), name)
    # dark inner body: a low ring-lofted dome inside the shell
    rings = []; zs = [(P['CORE_BOTTOM'], 0.55), (4.1, P['CORE']), (4.6, P['CORE']), (5.05, P['CORE']), (5.4, P['CORE']), (5.7, P['CORE'])]
    for z, k in zs:
        R = shell_r(z) * k
        rings.append([C + Vector((math.cos(a) * R, math.sin(a) * R, z)) for a in (2 * math.pi * k / 9 for k in range(9))])
    make('crown_core', *loft(rings, True, True), 'Leaf_Dark')


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    build_bark(); build_crown()


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    zmax = max((ob.matrix_world @ Vector(v.co)).z for ob in bpy.context.scene.objects for v in ob.data.vertices)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'maple.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(zmax, 2))


if __name__ == '__main__':
    main()

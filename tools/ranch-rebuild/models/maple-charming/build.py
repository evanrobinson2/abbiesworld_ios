"""Maple, charming (storybook toy) twin of models/maple. Replaces simulations/regional-assets-charming/WW-151.glb.

The same young maple as models/maple (a light trunk bare for its lower part, limbs fanning from a fork, a rounded
crown of pointed maple-leaf plates in three greens), pushed towards toy art as the charming hero draws it: a chubby,
soft, rope-twisted olive trunk with a little S-lean and a fat root flare; chunky limbs; and the crown broken into
plump cloud clumps, each a cap of soft round puffs crowned with oversized maple stars and skirted with drooping
star plates, plus one low clump hanging off a side limb on the right.

usage: python build.py      writes maple-charming.glb
Z up, metres, origin at the trunk base on the ground, front (the hero's view) faces -Y. No variants (tree group).
Materials and roles as models/maple: Bark_Brown, Leaf_Light, Leaf_Mid, Leaf_Dark (all double-sided).
"""
import os, sys, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    # trunk centreline (z, x, y): a soft S read from the hero, and radius stations (z, r): chubby, soft taper
    'TRUNK_PATH': [(0.0, 0.0, 0.0), (0.6, -0.05, 0.0), (1.2, -0.08, 0.02), (1.8, 0.07, 0.0), (2.3, 0.1, -0.04),
                   (2.9, 0.04, 0.0), (3.6, -0.05, 0.05), (4.4, -0.1, 0.1)],
    'TRUNK_R': [(0.0, 0.31), (0.12, 0.21), (0.4, 0.155), (1.5, 0.14), (2.4, 0.125), (3.0, 0.1), (3.6, 0.07),
                (4.4, 0.04)],
    'TRUNK_RINGS': 15, 'TRUNK_SIDES': 9, 'FLARE_LOBES': 4, 'FLARE_K': 0.22,
    'TWIST_LOBES': 3, 'TWIST_K': 0.11, 'TWIST_TURNS': 1.1,    # rope twist: 3 soft ridges spiralling up the trunk
    # limbs: control points from the trunk out into the clumps (chunky, 5-sided)
    'LIMBS': [
        [(0.03, 0.0, 2.0), (-0.45, -0.15, 2.5), (-0.9, -0.2, 2.85), (-1.25, -0.2, 3.05)],    # to the left clump
        [(0.08, 0.0, 2.05), (0.45, -0.15, 2.2), (0.75, -0.3, 2.35), (0.9, -0.3, 2.4)],          # to the low right clump
        [(0.07, 0.0, 2.8), (0.55, 0.0, 3.3), (1.0, -0.1, 3.75), (1.35, -0.1, 4.0)],            # up right
        [(0.03, 0.0, 2.9), (0.1, 0.55, 3.4), (0.2, 1.0, 3.8), (0.25, 1.3, 4.0)],               # back
        [(0.0, 0.0, 3.0), (-0.3, -0.55, 3.5), (-0.45, -0.95, 3.85), (-0.5, -1.2, 4.0)],       # front
        [(-0.03, 0.0, 2.5), (-0.4, 0.25, 2.95), (-0.75, 0.55, 3.2), (-0.85, 0.85, 3.4)],       # back left
    ],
    'LIMB_R': (0.075, 0.035), 'LIMB_SIDES': 5, 'LIMB_N': 5,
    # clumps: (x, y, z, radius, z squash, puffs, cap stars, skirt stars, skirt droop deg, colour weights L/M/D)
    'CLUMPS': [
        (-0.05, 0.15, 5.1, 1.0, 0.85, 4, 6, 8, 30, (0.6, 0.35, 0.05)),    # the big top clump
        (-1.1, 0.3, 4.45, 0.8, 0.85, 3, 4, 6, 35, (0.4, 0.45, 0.15)),    # upper left
        (-1.45, -0.25, 3.2, 0.9, 0.8, 3, 5, 9, 50, (0.3, 0.45, 0.25)),     # big left, low
        (-0.4, -1.2, 3.5, 0.85, 0.8, 3, 5, 7, 45, (0.4, 0.45, 0.15)),  # front centre
        (1.25, -0.15, 4.15, 1.0, 0.8, 3, 6, 8, 40, (0.5, 0.4, 0.1)),       # right
        (0.3, 1.4, 4.0, 0.92, 0.8, 3, 3, 7, 40, (0.3, 0.45, 0.25)),       # back
        (-0.65, 1.2, 2.95, 0.65, 0.8, 2, 2, 6, 45, (0.2, 0.45, 0.35)),     # back left, low
        (0.95, -0.3, 2.4, 0.8, 0.62, 2, 4, 8, 50, (0.15, 0.5, 0.35)),    # the low right clump on its own limb
    ],
    'PUFF_R': (0.68, 0.82),      # puff radius as a fraction of the clump radius
    'PUFF_SEG': 6, 'PUFF_RINGS': 5,
    'STAR_R': 0.52,             # star plate radius as a fraction of the clump radius (oversized, friendly)
    'CAP_STAR': 1.25,           # cap stars are bigger still
    'CORE': (-0.15, 0.1, 4.0, 1.25, 0.8),   # dark inner body (x, y, z, r, squash) that hides gaps
    'FOLD': 0.28,
    'SEED': 5,
}
# leaf outline: (angle deg, radius) round the star, tip along +x (the normal maple's star, lobes a touch rounder)
LEAF = [(0, 1.0), (25, 0.55), (52, 0.95), (82, 0.52), (115, 0.72), (150, 0.4), (180, 0.22),
        (-150, 0.4), (-115, 0.72), (-82, 0.52), (-52, 0.95), (-25, 0.55)]
COL = {'Bark_Brown': (118, 108, 44), 'Leaf_Light': (150, 186, 70), 'Leaf_Mid': (114, 152, 48),
       'Leaf_Dark': (70, 108, 28)}
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


def make(name, verts, faces, material, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = smooth
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


def interp(tab, z):
    if z <= tab[0][0]:
        return tab[0][1:]
    for a, b in zip(tab, tab[1:]):
        if z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0]); return tuple(x + (y - x) * t for x, y in zip(a[1:], b[1:]))
    return tab[-1][1:]


# ------------------------------------------------------------------ bark
def build_bark():
    n = P['TRUNK_SIDES']; top = P['TRUNK_PATH'][-1][0]; rings = []
    for i in range(P['TRUNK_RINGS']):
        z = top * (i / (P['TRUNK_RINGS'] - 1)) ** 1.25          # rings bunch towards the foot, where the flare is
        x, y = interp(P['TRUNK_PATH'], z); r, = interp(P['TRUNK_R'], z)
        fl = P['FLARE_K'] * max(0.0, 1 - z / 0.6); tw = 2 * math.pi * P['TWIST_TURNS'] * z / top
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n + 0.2
            rr = r * (1 + fl * math.cos(P['FLARE_LOBES'] * a)) * (1 + P['TWIST_K'] * math.cos(P['TWIST_LOBES'] * a - tw))
            ring.append(Vector((x + math.cos(a) * rr, y + math.sin(a) * rr, z)))
        rings.append(ring)
    parts = [loft(rings, True, True)]
    for pts in P['LIMBS']:
        parts.append(tube(spline(pts, P['LIMB_N']), *P['LIMB_R'], P['LIMB_SIDES']))
    make('trunk', *merge(*parts), 'Bark_Brown', smooth=True)


# ------------------------------------------------------------------ crown
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


def ball(c, r, sq, seg, rings_n, wob=0.06):
    """A soft low-poly ball (UV sphere, squashed in z, a little wobble) for the cloud puffs and the core."""
    V = [c + Vector((0, 0, -r * sq))]
    for i in range(1, rings_n):
        ph = math.pi * i / rings_n - math.pi / 2; off = (i % 2) * math.pi / seg
        for k in range(seg):
            a = 2 * math.pi * k / seg + off; w = 1 + RND.uniform(-wob, wob)
            V.append(c + Vector((math.cos(ph) * math.cos(a) * r * w, math.cos(ph) * math.sin(a) * r * w, math.sin(ph) * r * sq * w)))
    V.append(c + Vector((0, 0, r * sq)))
    F = [(0, 1 + (k + 1) % seg, 1 + k) for k in range(seg)]
    for i in range(rings_n - 2):
        a, b = 1 + i * seg, 1 + (i + 1) * seg
        F += [(a + k, a + (k + 1) % seg, b + (k + 1) % seg, b + k) for k in range(seg)]
    t = len(V) - 1; a = 1 + (rings_n - 2) * seg
    F += [(a + k, a + (k + 1) % seg, t) for k in range(seg)]
    return V, F


def build_crown():
    groups = {'Leaf_Light': [], 'Leaf_Mid': [], 'Leaf_Dark': []}; puffs = []
    for x, y, z, R, sq, npf, ncap, nsk, droop, w in P['CLUMPS']:
        C = Vector((x, y, z))
        # cloud puffs: one high in the middle, the rest round the clump's shoulder
        off = RND.random() * 2 * math.pi
        for j in range(npf):
            pr = R * RND.uniform(*P['PUFF_R'])
            if j == 0:
                pc = C + Vector((RND.uniform(-0.1, 0.1) * R, RND.uniform(-0.1, 0.1) * R, R * sq * 0.3))
            else:
                a = off + 2 * math.pi * j / (npf - 1) + RND.uniform(-0.3, 0.3)
                pc = C + Vector((math.cos(a) * R * 0.45, math.sin(a) * R * 0.45, -R * sq * 0.05))
            puffs.append(ball(pc, pr, 0.86, P['PUFF_SEG'], P['PUFF_RINGS']))
        # oversized stars pressed onto the clump's upper/outer face (a little more on the camera side), tips down
        for j in range(ncap):
            a = RND.uniform(-math.pi, math.pi) * 0.85 - math.pi / 2 if j % 2 else RND.random() * 2 * math.pi
            el = math.radians(RND.uniform(10, 65))
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            pc = C + Vector((d.x * R, d.y * R, d.z * R * sq)) * 0.98
            ax = (Vector((0, 0, -1)) - d * (-d.z)).normalized()
            ax = Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, d) @ ax
            groups[pick((w[0] + 0.3, w[1], 0))].append(leaf(pc, ax, d, R * P['STAR_R'] * P['CAP_STAR'] * RND.uniform(0.85, 1.1)))
        # a skirt of drooping star plates round the clump's lower rim
        off = RND.random() * 2 * math.pi
        for j in range(nsk):
            a = off + 2 * math.pi * j / nsk + RND.uniform(-0.2, 0.2); h = Vector((math.cos(a), math.sin(a), 0))
            pc = C + h * R * 0.95 + Vector((0, 0, -R * sq * RND.uniform(0.2, 0.45)))
            ax = (h - Vector((0, 0, math.sin(math.radians(droop))))).normalized()
            N = Matrix.Rotation(math.radians(RND.uniform(-15, 15)), 3, ax) @ (Vector((0, 0, 1)) + h * 0.3).normalized()
            groups[pick((w[0] * 0.6, w[1], w[2] + 0.15))].append(leaf(pc, ax, N, R * P['STAR_R'] * RND.uniform(0.9, 1.1)))
    make('leaves_puff', *merge(*puffs), 'Leaf_Mid', smooth=True)
    for name, lst in groups.items():
        if lst:
            make('leaves_' + name.split('_')[1].lower(), *merge(*lst), name)
    x, y, z, r, sq = P['CORE']
    make('crown_core', *ball(Vector((x, y, z)), r, sq, 9, 5, 0.04), 'Leaf_Dark', smooth=True)


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
    ws = [ob.matrix_world @ Vector(v.co) for ob in bpy.context.scene.objects for v in ob.data.vertices]
    dims = [round(max(p[i] for p in ws) - min(p[i] for p in ws), 2) for i in range(3)]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'maple-charming.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'dims', dims, 'w/d', round(dims[0] / dims[1], 3))


if __name__ == '__main__':
    main()

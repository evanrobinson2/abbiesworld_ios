"""Elder (Ranch tile hedge shrub, replaces simulations/regional-assets/GF-159.glb): an elder in flower. A full,
rounded dome of dark-green pinnate leaf sprays, dense to the ground, with reddish-brown arching stems rising from a
clustered base, and the top half crowned with big, flat-topped, creamy-white umbels.

usage: python build.py      writes elder.glb
Z up, metres, origin at the base on the ground, front (the hero's view) faces -Y. No variants (tree group).
Leaflets are folded diamond cards (2 triangles each) in 5-leaflet pinnate sprays, on double-sided materials.
Umbels are faceted, slightly domed discs with a few floret blobs on top.
"""
import os, sys, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    # dome shell: (z, half-width) from the ground to the top; leaves and umbels sit on this surface of revolution
    'PROFILE': [(0.0, 1.30), (0.4, 1.62), (1.0, 1.82), (1.5, 1.76), (2.0, 1.54), (2.4, 1.20), (2.7, 0.78),
                (2.9, 0.30)],
    'TOP': 2.9,
    'SQUASH_Y': 0.95,
    'SPREAD': 0.95,             # final horizontal stretch of the whole shrub
    'CORE': 0.74,               # dark inner body (scale of the shell) that keeps the dome solid between sprays
    'CORE_SIDES': 10, 'CORE_LUMP': 0.14,
    # stems: from a clustered base out and up to the shell, arching over at the end
    'N_STEMS': 12, 'STEM_BASE_R': 0.28, 'STEM_R': (0.07, 0.03), 'STEM_SIDES': 3, 'STEM_N': 5,
    'STEM_Z': (1.3, 2.5),       # where the stems reach the shell
    # leaf sprays
    'N_SPRAYS': 118, 'SPRAY_Z': (0.03, 2.75), 'SPRAY_IN': 0.84, 'SPRAY_TUCK': 0.28,  # upper sprays sit further in, under the umbels
     # spray base sits at SPRAY_IN x shell radius
    'LEAFLET': (0.42, 0.155),   # leaflet length and half-width (m)
    'RACHIS': 0.40,             # spray length to the terminal leaflet
    'PAIR_ANG': 52,             # leaflet angle off the rachis (deg)
    'FOLD': 0.35,               # midrib fold (x half-width)
    'MID_SHARE': 0.32,          # share of sprays in the lighter green
    # umbels: (theta deg from front -Y towards +X, z on the shell, radius); held just above the foliage
    # umbels: (theta deg from front -Y towards +X, z on the shell, radius); cauliflower heads on the upper half,
    # tilted out on the shoulders, one crowning the top and one small one low at the front left
    'UMBELS': [
        (-80, 1.75, 0.32), (-35, 1.85, 0.34), (8, 1.8, 0.33), (52, 1.75, 0.34), (98, 1.7, 0.32),
        (145, 1.8, 0.33), (192, 1.85, 0.33), (240, 1.75, 0.32), (288, 1.8, 0.32),
        (-50, 2.42, 0.34), (38, 2.48, 0.34), (128, 2.42, 0.33), (218, 2.45, 0.33),
        (0, 2.9, 0.34), (-62, 1.05, 0.22),
    ],
    'UMB_OUT': 1.10,            # head centre at this x shell radius
    'UMB_TILT': 0.55,           # how far a head leans out along the shell normal (0 = level)
    'FLORETS': (15, 19),        # blobs per head
    'FLORET_R': (0.13, 0.17),  # blob radius (m)
    'DOME': 0.55,               # head dome height as a share of its radius
    'DROOP_N': 3,
    'HEAD_CLEAR': 0.42,         # no leaf spray starts closer than this to a head centre               # edge blobs that hang down
    'TONES': (('Flower_Cream', 0.5), ('Flower_Ivory', 0.3), ('Flower_Butter', 0.2)),
    # gaps in the foliage where an arching stem shows: (theta deg, z, gap radius m)
    'GAPS': [(-28, 1.25, 0.42), (48, 1.55, 0.38), (-105, 1.2, 0.4), (112, 1.35, 0.4), (200, 1.3, 0.4)],
    'SEED': 7,
}
COL = {'Stem_Brown': (112, 60, 32), 'Leaf_Shade': (26, 38, 14), 'Leaf_Dark': (42, 58, 22), 'Leaf_Mid': (74, 94, 38),
       'Flower_Ivory': (250, 246, 226), 'Flower_Butter': (226, 212, 150),
       'Flower_Cream': (240, 230, 188)}
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
        m.use_backface_culling = False          # exported double-sided: leaf cards show from both sides
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


# ------------------------------------------------------------------ shell
def shell_r(z):
    pr = P['PROFILE']
    if z <= pr[0][0]:
        return pr[0][1]
    for (z0, r0), (z1, r1) in zip(pr, pr[1:]):
        if z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return pr[-1][1]


def on_shell(th, z, k=1.0):
    """Point at heading th (radians from -Y towards +X) and height z, at k x the shell radius."""
    r = shell_r(z) * k
    return Vector((math.sin(th) * r, -math.cos(th) * r * P['SQUASH_Y'], z))


def shell_n(th, z):
    h = Vector((math.sin(th), -math.cos(th), 0))
    dz = 0.05; dr = (shell_r(min(z + dz, P['TOP'])) - shell_r(max(z - dz, 0))) / (2 * dz)
    return (h - Vector((0, 0, dr))).normalized()


# ------------------------------------------------------------------ parts
def build_core():
    n = P['CORE_SIDES']; rings = []
    zs = [0.08, 0.5, 1.0, 1.5, 1.9, 2.22, 2.45]
    for z in zs:
        ring = []
        for k in range(n):
            th = 2 * math.pi * k / n + 0.15 * (zs.index(z) % 2)
            ring.append(on_shell(th, z, P['CORE'] * (1 + RND.uniform(-P['CORE_LUMP'], P['CORE_LUMP']))))
        rings.append(ring)
    V, F = loft(rings, True, False)
    top = len(V); V.append(Vector((0, 0, 2.55))); F += [(top - n + k, top - n + (k + 1) % n, top) for k in range(n)]
    make('foliage_core', V, F, 'Leaf_Shade')


def build_stems(umbel_pts):
    parts = []
    n = P['N_STEMS']
    for i in range(n):
        th = 2 * math.pi * (i + RND.uniform(-0.3, 0.3)) / n
        b = Vector((math.sin(th) * P['STEM_BASE_R'] * RND.uniform(0.3, 1), -math.cos(th) * P['STEM_BASE_R'] * RND.uniform(0.3, 1), 0))
        z = RND.uniform(*P['STEM_Z'])
        end = on_shell(th, z, 1.0)
        mid = on_shell(th, z * 0.55, 0.45) + Vector((0, 0, z * 0.25))
        tip = end + (end - mid).normalized() * 0.15 - Vector((0, 0, 0.12))   # arch over at the end
        parts.append(tube(spline([b, mid, end, tip], P['STEM_N']), *P['STEM_R'], P['STEM_SIDES']))
    for thd, z, gr in P['GAPS']:   # stems that arch out through the foliage gaps and over
        th = math.radians(thd)
        b = Vector((math.sin(th) * 0.18, -math.cos(th) * 0.18, 0))
        g = on_shell(th, z, 0.92)
        mid = on_shell(th, z * 0.5, 0.42) + Vector((0, 0, z * 0.2))
        out = on_shell(th + 0.12, z + 0.32, 1.06)
        tip = on_shell(th + 0.2, z + 0.12, 1.16)
        parts.append(tube(spline([b, mid, g, out, tip], 6), 0.075, 0.03, P['STEM_SIDES']))
    V, F = merge(*parts)
    V = [Vector((v[0], v[1], max(v[2], 0.0))) for v in V]
    make('stems', V, F, 'Stem_Brown')


def leaflet(base, d, nrm, L, W):
    """Folded diamond leaf card: base, two side points lifted along the midrib fold, tip. 2 triangles."""
    side = nrm.cross(d).normalized()
    tip = base + d * L
    s1 = base + d * (0.42 * L) + side * W + nrm * (W * P['FOLD'])
    s2 = base + d * (0.42 * L) - side * W + nrm * (W * P['FOLD'])
    return [base, s1, tip, s2], [(0, 1, 2), (0, 2, 3)]


def spray(c, N, droop):
    """A pinnate spray: rachis outward from c, two leaflet pairs and a terminal leaflet."""
    up = Vector((0, 0, 1))
    # sprays lie along the dome like shingles: down the surface (more at the bottom), fanned sideways, a little out
    tu = up - N * N.dot(up); tu = tu.normalized() if tu.length > 0.2 else Vector((N.x, N.y, 0)).normalized() * -1
    ts = N.cross(tu).normalized()
    phi = math.radians(RND.uniform(-75, 75) * (1 - 0.4 * droop))
    a = (-tu * math.cos(phi) + ts * math.sin(phi) + N * (0.3 + 0.3 * (1 - droop))).normalized()
    nrm = (N - a * a.dot(N)).normalized()
    nrm = Matrix.Rotation(math.radians(RND.uniform(-30, 30)), 3, a) @ nrm
    side = nrm.cross(a).normalized()
    L, W = P['LEAFLET']; s = RND.uniform(0.85, 1.15); L *= s; W *= s
    out = []
    ang = math.radians(P['PAIR_ANG'])
    for t in (0.35, 0.72):
        p = c + a * (P['RACHIS'] * t)
        for sg in (1, -1):
            d = (a * math.cos(ang) + side * sg * math.sin(ang) - nrm * 0.15).normalized()
            out.append(leaflet(p, d, nrm, L * 0.92, W))
    out.append(leaflet(c + a * P['RACHIS'], (a - nrm * 0.1).normalized(), nrm, L, W))
    return out


def build_leaves(heads=()):
    groups = {'Leaf_Dark': [], 'Leaf_Mid': []}
    z0, z1 = P['SPRAY_Z']; n = P['N_SPRAYS']
    ga = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        # stratified heights weighted by the ring circumference (shell area), golden-angle headings
        u = (i + RND.random()) / n
        z = z0 + (z1 - z0) * (1 - (1 - u) ** 1.25)
        th = i * ga + RND.uniform(-0.2, 0.2)
        c = on_shell(th, z, P['SPRAY_IN'] * RND.uniform(0.95, 1.05) * (1 - P['SPRAY_TUCK'] * max(0.0, z - 1.3) / (P['TOP'] - 1.3)))
        N = shell_n(th, z)
        if any((c - on_shell(math.radians(gt), gz, P['SPRAY_IN'])).length < gr for gt, gz, gr in P['GAPS']):
            continue
        if any((c - hc).length < P['HEAD_CLEAR'] for hc, _ in heads):   # keep the flower heads clear of leaves
            continue
        droop = 0.5 - 0.4 * z / P['TOP']
        name = 'Leaf_Mid' if RND.random() < P['MID_SHARE'] * (0.6 + z / P['TOP']) else 'Leaf_Dark'
        groups[name] += spray(c, N, droop)
    for name, lst in groups.items():
        V, F = merge(*lst)
        V = [Vector((v[0], v[1], max(v[2], 0.01))) for v in V]
        make('leaves_' + name.split('_')[1].lower(), V, F, name)


def floret(c, r, up):
    """An irregular faceted blob: a jittered triangular bipyramid, flatter on top (6 triangles)."""
    u, v = frame(up); a = RND.random() * 6.28
    k = lambda: RND.uniform(0.8, 1.15)
    eq = [c + (u * math.cos(a + t) + v * math.sin(a + t)) * r * k() for t in (0, 2.094, 4.189)]
    V = [c + up * r * 0.65 * k()] + eq + [c - up * r * 0.55 * k()]
    F = [(0, 1, 2), (0, 2, 3), (0, 3, 1), (4, 2, 1), (4, 3, 2), (4, 1, 3)]
    return V, F


def tone():
    u = RND.random()
    for name, w in P['TONES']:
        if u < w:
            return name
        u -= w
    return P['TONES'][0][0]


def umbel(groups, c, N, R):
    """A cauliflower head: a loose, slightly irregular dome of small faceted florets, a few hanging at the edge."""
    up = (Vector((0, 0, 1)) * (1 - P['UMB_TILT']) + N * P['UMB_TILT']).normalized()
    u, v = frame(up)
    n = RND.randint(*P['FLORETS']); ga = math.pi * (3 - math.sqrt(5)); off = RND.random() * 6.28
    for i in range(n):
        d = math.sqrt((i + 0.5) / n) * R * RND.uniform(0.9, 1.05)
        a = off + i * ga
        h = R * P['DOME'] * (1 - (d / R) ** 2) * RND.uniform(0.8, 1.15)
        p = c + (u * math.cos(a) + v * math.sin(a)) * d + up * h
        groups[tone()].append(floret(p, RND.uniform(*P['FLORET_R']), up))
    for j in range(P['DROOP_N']):    # florets hanging over the rim
        a = off + 2 * math.pi * (j + RND.uniform(-0.25, 0.25)) / P['DROOP_N']
        p = c + (u * math.cos(a) + v * math.sin(a)) * R * 1.02 - up * R * 0.32 - Vector((0, 0, 0.05))
        groups[tone()].append(floret(p, RND.uniform(*P['FLORET_R']) * 0.85, up))


def build_umbels():
    groups = {name: [] for name, _ in P['TONES']}
    pts = []
    for thd, z, R in P['UMBELS']:
        th = math.radians(thd + RND.uniform(-6, 6))
        top = z >= P['TOP'] - 0.05
        c = Vector((0.05, 0.1, z)) if top else on_shell(th, z, P['UMB_OUT'])
        N = Vector((0, 0, 1)) if top else shell_n(th, z)
        umbel(groups, c, N, R); pts.append((c, N))
    for name, lst in groups.items():
        if lst:
            make('umbels_' + name.split('_')[1].lower(), *merge(*lst), name)
    return pts


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    build_core()
    pts = build_umbels()
    build_leaves(pts)
    build_stems(pts)
    S = Matrix.Diagonal((P['SPREAD'], P['SPREAD'], 1.0, 1.0))
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.transform(S)


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    zs = [(ob.matrix_world @ Vector(v.co)) for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'elder.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in zs), 2),
          'width', round(max(p.x for p in zs) - min(p.x for p in zs), 2), 'depth', round(max(p.y for p in zs) - min(p.y for p in zs), 2))


if __name__ == '__main__':
    main()
